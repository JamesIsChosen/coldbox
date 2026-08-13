(function (global) {
  'use strict';

  // BIP-93 codex32. The checksum constants, field arithmetic, framing, and
  // interoperability vectors are governed by the Bitcoin BIP-93 text. This
  // browser adaptation is intentionally self-contained and is loaded only in
  // the opaque cold realm; it has no network, storage, or warm-message path.
  var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  var SHARE_INDICES = 'acdefghjklmnpqrtuvwxyz023456789';
  var BECH32_INV = [
    0, 1, 20, 24, 10, 8, 12, 29, 5, 11, 4, 9, 6, 28, 26, 31,
    22, 18, 17, 23, 2, 25, 16, 19, 3, 21, 14, 30, 13, 7, 27, 15
  ];
  var REGULAR_CONST = 0x10ce0795c2fd1e62an;
  var LONG_CONST = 0x43381e570bf4798ab26n;
  var REGULAR_GEN = [
    0x19dc500ce73fde210n,
    0x1bfae00def77fe529n,
    0x1fbd920fffe7bee52n,
    0x1739640bdeee3fdadn,
    0x07729a039cfc75f5an
  ];
  var LONG_GEN = [
    0x3d59d273535ea62d897n,
    0x7a9becb6361c6c51507n,
    0x543f9b7e6c38d8a2a0en,
    0x0c577eaeccf1990d13cn,
    0x1887f74f8dc71b10651n
  ];
  var REGULAR_MASK = 0x0fffffffffffffffn;
  var LONG_MASK = 0x3fffffffffffffffffn;
  var SHARE_INDEX_VALUES = Object.freeze(SHARE_INDICES.split('').map(function (character) {
    return CHARSET.indexOf(character);
  }));

  function requireBigInt() {
    if (typeof BigInt !== 'function') {
      throw new Error('codex32 requires BigInt support; refusing to process a secret.');
    }
  }

  function requireRandomness() {
    if (!global.crypto || typeof global.crypto.getRandomValues !== 'function') {
      throw new Error('codex32 requires crypto.getRandomValues; refusing to generate secret material.');
    }
  }

  function gfMul(left, right) {
    var result = 0;
    var a = left;
    var b = right;
    for (var index = 0; index < 5; index += 1) {
      if ((b & (1 << index)) !== 0) {
        result ^= a;
      }
      a *= 2;
      if (a >= 32) {
        a ^= 41;
      }
    }
    return result;
  }

  function gfLagrange(indices, target) {
    var numerator = 1;
    var coefficients = [];
    var index;
    for (index = 0; index < indices.length; index += 1) {
      numerator = gfMul(numerator, indices[index] ^ target);
    }
    for (var i = 0; i < indices.length; i += 1) {
      var current = indices[i];
      var denominator = 1;
      for (var j = 0; j < indices.length; j += 1) {
        var other = indices[j];
        denominator = gfMul(denominator, (i === j ? target : current) ^ other);
      }
      if (denominator === 0) {
        throw new Error('codex32 share indices must be distinct.');
      }
      coefficients.push(gfMul(numerator, BECH32_INV[denominator]));
    }
    return coefficients;
  }

  function polymod(values, longChecksum) {
    requireBigInt();
    var generators = longChecksum ? LONG_GEN : REGULAR_GEN;
    var shift = longChecksum ? 70n : 60n;
    var mask = longChecksum ? LONG_MASK : REGULAR_MASK;
    var residue = 0x23181b3n;
    for (var index = 0; index < values.length; index += 1) {
      var top = residue >> shift;
      residue = ((residue & mask) << 5n) ^ BigInt(values[index]);
      for (var bit = 0; bit < 5; bit += 1) {
        if (((top >> BigInt(bit)) & 1n) !== 0n) {
          residue ^= generators[bit];
        }
      }
    }
    return residue;
  }

  function checksumLengthForDataLength(length) {
    if (length <= 93) {
      return 13;
    }
    if (length >= 96) {
      return 15;
    }
    throw new Error('codex32 data length 94 or 95 is reserved and invalid.');
  }

  function createChecksum(data) {
    requireBigInt();
    var longChecksum = data.length > 80;
    var count = longChecksum ? 15 : 13;
    var values = data.slice();
    for (var index = 0; index < count; index += 1) {
      values.push(0);
    }
    var constant = longChecksum ? LONG_CONST : REGULAR_CONST;
    var value = polymod(values, longChecksum) ^ constant;
    var checksum = [];
    for (var position = 0; position < count; position += 1) {
      checksum.push(Number((value >> BigInt(5 * (count - 1 - position))) & 31n));
    }
    return checksum;
  }

  function verifyChecksum(data) {
    requireBigInt();
    var count = checksumLengthForDataLength(data.length);
    var longChecksum = count === 15;
    var constant = longChecksum ? LONG_CONST : REGULAR_CONST;
    return polymod(data, longChecksum) === constant;
  }

  function valuesToString(values, uppercase) {
    var output = '';
    for (var index = 0; index < values.length; index += 1) {
      output += CHARSET[values[index]];
    }
    return uppercase ? output.toUpperCase() : output;
  }

  function bitsToValues(bytes) {
    var values = [];
    var accumulator = 0;
    var bits = 0;
    for (var index = 0; index < bytes.length; index += 1) {
      accumulator = (accumulator << 8) | bytes[index];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        values.push((accumulator >> bits) & 31);
      }
    }
    if (bits > 0) {
      values.push((accumulator << (5 - bits)) & 31);
    }
    return values;
  }

  function valuesToBytes(values) {
    var bytes = [];
    var accumulator = 0;
    var bits = 0;
    for (var index = 0; index < values.length; index += 1) {
      accumulator = (accumulator << 5) | values[index];
      bits += 5;
      while (bits >= 8) {
        bits -= 8;
        bytes.push((accumulator >> bits) & 255);
      }
    }
    if (bits > 4) {
      throw new Error('codex32 payload has an incomplete group larger than four bits.');
    }
    return new Uint8Array(bytes);
  }

  function copyBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError('codex32 secret must be a Uint8Array.');
    }
    if (bytes.length < 16 || bytes.length > 64) {
      throw new RangeError('codex32 secret must contain 16 through 64 bytes.');
    }
    return new Uint8Array(bytes);
  }

  function normalizeHeader(threshold, identifier, shareIndex) {
    var thresholdText = String(threshold);
    if (!/^(0|[2-9])$/.test(thresholdText)) {
      throw new RangeError('codex32 threshold must be 0 or an integer from 2 through 9.');
    }
    var id = String(identifier).toLowerCase();
    if (id.length !== 4 || id.split('').some(function (character) { return CHARSET.indexOf(character) === -1; })) {
      throw new Error('codex32 identifier must contain four bech32 characters.');
    }
    var index = String(shareIndex).toLowerCase();
    if (index.length !== 1 || CHARSET.indexOf(index) === -1) {
      throw new Error('codex32 share index must be one bech32 character.');
    }
    if (thresholdText === '0' && index !== 's') {
      throw new Error('codex32 threshold 0 is reserved for the unshared secret.');
    }
    return {
      threshold: Number(thresholdText),
      thresholdValue: CHARSET.indexOf(thresholdText),
      identifier: id,
      identifierValues: id.split('').map(function (character) { return CHARSET.indexOf(character); }),
      shareIndex: index,
      shareIndexValue: CHARSET.indexOf(index)
    };
  }

  function encodeData(threshold, identifier, shareIndex, payloadValues, uppercase) {
    var header = normalizeHeader(threshold, identifier, shareIndex);
    var data = [header.thresholdValue].concat(header.identifierValues, [header.shareIndexValue], payloadValues);
    var encoded = 'ms1' + valuesToString(data.concat(createChecksum(data)), false);
    return uppercase ? encoded.toUpperCase() : encoded;
  }

  function decode(input) {
    requireBigInt();
    if (typeof input !== 'string') {
      throw new TypeError('codex32 value must be text.');
    }
    if (input.length < 48 || input.length > 127) {
      throw new Error('codex32 value has an invalid length.');
    }
    if (input.split('').some(function (character) {
      return character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126;
    })) {
      throw new Error('codex32 value contains a non-printable character.');
    }
    if (input !== input.toLowerCase() && input !== input.toUpperCase()) {
      throw new Error('codex32 value must be entirely lowercase or uppercase.');
    }
    var uppercase = input === input.toUpperCase();
    var lower = input.toLowerCase();
    if (lower.slice(0, 3) !== 'ms1') {
      throw new Error('codex32 value must use the ms1 prefix.');
    }
    var encoded = lower.slice(3);
    var values = encoded.split('').map(function (character) {
      var value = CHARSET.indexOf(character);
      if (value < 0) {
        throw new Error('codex32 value contains a character outside the bech32 alphabet.');
      }
      return value;
    });
    var checksumLength = checksumLengthForDataLength(values.length);
    if (!verifyChecksum(values)) {
      throw new Error('codex32 checksum is invalid.');
    }
    var data = values.slice(0, values.length - checksumLength);
    var thresholdCharacter = CHARSET[data[0]];
    var header = normalizeHeader(thresholdCharacter, valuesToString(data.slice(1, 5), false), CHARSET[data[5]]);
    var payloadValues = data.slice(6);
    var bytes = valuesToBytes(payloadValues);
    if (bytes.length < 16 || bytes.length > 64) {
      throw new Error('codex32 payload must decode to 16 through 64 bytes.');
    }
    return Object.freeze({
      value: input,
      lowercase: lower,
      uppercase: uppercase,
      threshold: header.threshold,
      identifier: header.identifier,
      shareIndex: header.shareIndex,
      shareIndexValue: header.shareIndexValue,
      payloadValues: Object.freeze(payloadValues.slice()),
      dataValues: Object.freeze(data.slice()),
      checksumLength: checksumLength,
      longChecksum: checksumLength === 15,
      bytes: bytes
    });
  }

  function secureField() {
    requireRandomness();
    var sample = new Uint8Array(1);
    try {
      while (true) {
        global.crypto.getRandomValues(sample);
        if (sample[0] < 224) {
          return sample[0] & 31;
        }
      }
    } finally {
      sample.fill(0);
    }
  }

  function randomIdentifier() {
    var identifier = '';
    for (var index = 0; index < 4; index += 1) {
      identifier += CHARSET[secureField()];
    }
    return identifier;
  }

  function randomBytes(length) {
    requireRandomness();
    var bytes = new Uint8Array(length);
    global.crypto.getRandomValues(bytes);
    return bytes;
  }

  function evaluatePolynomial(constant, coefficients, x) {
    var result = constant;
    var power = 1;
    for (var degree = 0; degree < coefficients.length; degree += 1) {
      power = gfMul(power, x);
      result ^= gfMul(coefficients[degree], power);
    }
    return result;
  }

  function generate(secretBytes, options) {
    var secret = copyBytes(secretBytes);
    var config = options || {};
    var threshold = Number(config.threshold === undefined ? 2 : config.threshold);
    var count = Number(config.count === undefined ? 3 : config.count);
    if (!Number.isInteger(threshold) || threshold < 2 || threshold > 9) {
      secret.fill(0);
      throw new RangeError('codex32 threshold must be an integer from 2 through 9.');
    }
    if (!Number.isInteger(count) || count < threshold || count > 31) {
      secret.fill(0);
      throw new RangeError('codex32 share count must be between the threshold and 31.');
    }
    var identifier = config.identifier === undefined ? randomIdentifier() : String(config.identifier).toLowerCase();
    var idValues;
    try {
      idValues = normalizeHeader(threshold, identifier, 'a').identifierValues;
      var payload = bitsToValues(secret);
      var secretData = [CHARSET.indexOf(String(threshold))]
        .concat(idValues, [CHARSET.indexOf('s')], payload);
      var coefficientsByDataIndex = secretData.map(function (value, dataIndex) {
        var coefficients = [];
        if (dataIndex === 5) {
          coefficients.push(1);
        } else if (dataIndex >= 6) {
          for (var degree = 1; degree < threshold; degree += 1) {
            coefficients.push(secureField());
          }
        }
        return coefficients;
      });
      var shares = [];
      var shareIndex = 0;
      for (var shareNumber = 0; shareNumber < SHARE_INDICES.length && shares.length < count; shareNumber += 1) {
        var indexCharacter = SHARE_INDICES[shareNumber];
        var x = CHARSET.indexOf(indexCharacter);
        var data = [];
        for (var dataIndex = 0; dataIndex < secretData.length; dataIndex += 1) {
          // The index coordinate uses the identity polynomial f(x) = x. For
          // payload coordinates, shift the polynomial so f(s) is the supplied
          // secret value while the remaining coefficients stay random.
          var constant = dataIndex === 5 ? 0 : secretData[dataIndex];
          var coordinate = dataIndex >= 6 ? x ^ CHARSET.indexOf('s') : x;
          data.push(evaluatePolynomial(constant, coefficientsByDataIndex[dataIndex], coordinate));
        }
        shares.push('ms1' + valuesToString(data.concat(createChecksum(data)), false));
        shareIndex += 1;
      }
      var secretValue = 'ms1' + valuesToString(secretData.concat(createChecksum(secretData)), false);
      return Object.freeze({
        secret: secretValue,
        shares: Object.freeze(shares),
        threshold: threshold,
        count: count,
        identifier: identifier,
        bytes: new Uint8Array(secret)
      });
    } finally {
      secret.fill(0);
    }
  }

  function encodeSecret(secretBytes, options) {
    var secret = copyBytes(secretBytes);
    var config = options || {};
    try {
      var identifier = config.identifier === undefined ? randomIdentifier() : String(config.identifier).toLowerCase();
      var header = normalizeHeader(0, identifier, 's');
      return encodeData(0, header.identifier, 's', bitsToValues(secret), Boolean(config.uppercase));
    } finally {
      secret.fill(0);
    }
  }

  function recover(shareInputs) {
    if (!Array.isArray(shareInputs) || shareInputs.length === 0) {
      throw new Error('codex32 recovery needs at least two shares.');
    }
    var parsed = shareInputs.map(function (share, index) {
      try {
        return decode(share);
      } catch (error) {
        throw new Error('codex32 share ' + String(index + 1) + ' is invalid: ' + error.message);
      }
    });
    var first = parsed[0];
    if (first.threshold < 2) {
      throw new Error('codex32 recovery requires share values, not an unshared secret.');
    }
    if (parsed.length !== first.threshold) {
      throw new Error('codex32 recovery needs exactly ' + String(first.threshold) + ' shares.');
    }
    var indices = [];
    for (var index = 0; index < parsed.length; index += 1) {
      if (parsed[index].threshold !== first.threshold
        || parsed[index].identifier !== first.identifier
        || parsed[index].dataValues.length !== first.dataValues.length) {
        throw new Error('codex32 shares do not belong to one threshold, identifier, and length.');
      }
      if (parsed[index].shareIndex === 's' || indices.indexOf(parsed[index].shareIndexValue) !== -1) {
        throw new Error('codex32 shares contain a repeated or reserved share index.');
      }
      indices.push(parsed[index].shareIndexValue);
    }
    var coefficients = gfLagrange(indices, CHARSET.indexOf('s'));
    var data = [];
    for (var dataIndex = 0; dataIndex < first.dataValues.length; dataIndex += 1) {
      var value = 0;
      for (var shareIndex = 0; shareIndex < parsed.length; shareIndex += 1) {
        value ^= gfMul(coefficients[shareIndex], parsed[shareIndex].dataValues[dataIndex]);
      }
      data.push(value);
    }
    var secret = encodeData(first.threshold, first.identifier, 's', data.slice(6), false);
    var decoded = decode(secret);
    return Object.freeze({ value: secret, bytes: decoded.bytes, threshold: first.threshold, identifier: first.identifier });
  }

  function interpolateAt(shareInputs, targetIndex) {
    var target = String(targetIndex).toLowerCase();
    if (target.length !== 1 || CHARSET.indexOf(target) === -1) {
      throw new Error('codex32 target index must be one bech32 character.');
    }
    if (!Array.isArray(shareInputs) || shareInputs.length === 0) {
      throw new Error('codex32 interpolation needs a complete threshold set.');
    }
    var parsed = shareInputs.map(function (share, index) {
      try {
        return decode(share);
      } catch (error) {
        throw new Error('codex32 interpolation share ' + String(index + 1) + ' is invalid: ' + error.message);
      }
    });
    var first = parsed[0];
    if (first.threshold < 2) {
      throw new Error('codex32 interpolation requires share values, not an unshared secret.');
    }
    if (parsed.length !== first.threshold) {
      throw new Error('codex32 interpolation needs exactly ' + String(first.threshold) + ' shares.');
    }
    var indices = [];
    for (var index = 0; index < parsed.length; index += 1) {
      if (parsed[index].threshold !== first.threshold
        || parsed[index].identifier !== first.identifier
        || parsed[index].dataValues.length !== first.dataValues.length) {
        throw new Error('codex32 interpolation shares do not belong to one threshold, identifier, and length.');
      }
      if (parsed[index].shareIndex === 's' || indices.indexOf(parsed[index].shareIndexValue) !== -1) {
        throw new Error('codex32 interpolation shares contain a repeated or reserved share index.');
      }
      if (parsed[index].shareIndex === target) {
        throw new Error('codex32 interpolation target must be a missing share index.');
      }
      indices.push(parsed[index].shareIndexValue);
    }
    var coefficients = gfLagrange(indices, CHARSET.indexOf(target));
    var data = [];
    for (var dataIndex = 0; dataIndex < first.dataValues.length; dataIndex += 1) {
      var value = 0;
      for (var shareIndex = 0; shareIndex < parsed.length; shareIndex += 1) {
        value ^= gfMul(coefficients[shareIndex], parsed[shareIndex].dataValues[dataIndex]);
      }
      data.push(value);
    }
    return encodeData(first.threshold, first.identifier, target, data.slice(6), false);
  }

  function correctSingleError(input) {
    if (typeof input !== 'string') {
      throw new TypeError('codex32 value must be text.');
    }
    try {
      decode(input);
      return Object.freeze({ corrected: input, changed: false, position: null, from: null, to: null });
    } catch (originalError) {
      // Correction is deliberately confirmation-based: callers receive a
      // candidate and must show it to the human before using it for recovery.
    }
    if (input.length < 48 || input.length > 127 || input.slice(0, 3).toLowerCase() !== 'ms1') {
      throw new Error('codex32 correction supports only a single data-character error.');
    }
    if (input !== input.toLowerCase() && input !== input.toUpperCase()) {
      throw new Error('codex32 value must be entirely lowercase or uppercase before correction.');
    }
    var uppercase = input === input.toUpperCase();
    var alphabet = uppercase ? CHARSET.toUpperCase() : CHARSET;
    var candidates = [];
    for (var position = 3; position < input.length; position += 1) {
      var original = input[position];
      var replacements = original === '?' ? alphabet.split('') : alphabet.split('').filter(function (character) {
        return character !== original;
      });
      for (var replacementIndex = 0; replacementIndex < replacements.length; replacementIndex += 1) {
        var candidate = input.slice(0, position) + replacements[replacementIndex] + input.slice(position + 1);
        try {
          decode(candidate);
          candidates.push({ value: candidate, position: position, from: original, to: replacements[replacementIndex] });
          if (candidates.length > 1) {
            throw new Error('codex32 correction is ambiguous; enter the share again from the paper copy.');
          }
        } catch (error) {
          if (error.message.indexOf('ambiguous') !== -1) {
            throw error;
          }
        }
      }
    }
    if (candidates.length !== 1) {
      throw new Error('codex32 could not identify one unambiguous single-character correction.');
    }
    return Object.freeze({
      corrected: candidates[0].value,
      changed: true,
      position: candidates[0].position,
      from: candidates[0].from,
      to: candidates[0].to
    });
  }

  global.__coldboxCodex32 = Object.freeze({
    charset: CHARSET,
    shareIndices: SHARE_INDICES,
    encodeSecret: encodeSecret,
    generate: generate,
    decode: decode,
    recover: recover,
    interpolateAt: interpolateAt,
    correctSingleError: correctSingleError,
    gfMul: gfMul
  });
}(window));
