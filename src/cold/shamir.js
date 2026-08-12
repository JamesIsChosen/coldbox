(function (global) {
  'use strict';

  var seedForge = global.__coldboxSeedForge;
  var bip39 = global.__coldboxBip39;
  var primitivePolynomials = [
    null, null, 1, 3, 3, 5, 3, 3, 29, 17, 9,
    5, 83, 27, 43, 3, 45, 9, 39, 39, 9
  ];
  var shamir39Versions = Object.freeze({
    'shamir39-p1': true,
    shamir39: true
  });
  var validMnemonicWordCounts = Object.freeze([12, 15, 18, 21, 24]);

  function requireCrypto() {
    if (!seedForge || !bip39
      || typeof seedForge.splitMnemonic !== 'function'
      || typeof seedForge.validateMnemonic !== 'function'
      || typeof seedForge.mnemonicToWordIndices !== 'function'
      || !Array.isArray(seedForge.languages)
      || !bip39.wordlists) {
      throw new Error('Shamir crypto bundle is unavailable; refusing to process secret material.');
    }
  }

  function zeroBytes(bytes) {
    if (bytes && typeof bytes.fill === 'function') {
      bytes.fill(0);
    }
  }

  function languageRecord(language) {
    requireCrypto();
    for (var index = 0; index < seedForge.languages.length; index += 1) {
      if (seedForge.languages[index].id === language) {
        return seedForge.languages[index];
      }
    }
    throw new Error('Unsupported BIP-39 language: ' + String(language) + '.');
  }

  function wordlistFor(language) {
    var record = languageRecord(language);
    var wordlist = bip39.wordlists[record.wordlistKey];
    if (!Array.isArray(wordlist) || wordlist.length !== 2048) {
      throw new Error('BIP-39 wordlist is unavailable for ' + record.label + '.');
    }
    return wordlist;
  }

  function joinWords(words, language) {
    return words.join(language === 'japanese' ? '\u3000' : ' ');
  }

  function parseBip39Mnemonic(mnemonic, language) {
    var words;
    var validation;
    var indices;
    requireCrypto();
    wordlistFor(language);
    if (typeof mnemonic !== 'string') {
      throw new TypeError('BIP-39 mnemonic must be text.');
    }
    words = seedForge.splitMnemonic(mnemonic);
    validation = seedForge.validateMnemonic(mnemonic, language);
    if (!validation.valid) {
      throw new Error('Cannot split an invalid BIP-39 mnemonic (' + validation.reason + ').');
    }
    if (validMnemonicWordCounts.indexOf(words.length) === -1) {
      throw new RangeError('Shamir39 supports 12-, 15-, 18-, 21-, and 24-word BIP-39 phrases.');
    }
    indices = seedForge.mnemonicToWordIndices(mnemonic, language);
    return {
      words: words,
      indices: indices
    };
  }

  function leftPad(value, length) {
    var result = String(value);
    while (result.length < length) {
      result = '0' + result;
    }
    return result;
  }

  function numberBits(value, width) {
    return leftPad(value.toString(2), width);
  }

  function bitsToHex(bits) {
    var padded = bits;
    var output = '';
    var index;
    if (padded.length % 4 !== 0) {
      padded = leftPad(padded, padded.length + (4 - (padded.length % 4)));
    }
    for (index = padded.length; index > 0; index -= 4) {
      output = parseInt(padded.slice(index - 4, index), 2).toString(16) + output;
    }
    return output;
  }

  function hexToBits(hex) {
    var bits = '';
    var index;
    var nibble;
    if (typeof hex !== 'string' || !/^[0-9a-f]+$/i.test(hex)) {
      throw new Error('Secret/share data must be hexadecimal.');
    }
    for (index = 0; index < hex.length; index += 1) {
      nibble = parseInt(hex[index], 16);
      bits += numberBits(nibble, 4);
    }
    return bits;
  }

  function splitBitSegments(bits, width) {
    var segments = [];
    var end = bits.length;
    var start;
    while (end > width) {
      start = end - width;
      segments.push(parseInt(bits.slice(start, end), 2));
      end = start;
    }
    segments.push(parseInt(bits.slice(0, end), 2));
    return segments;
  }

  function createField(bits) {
    var size;
    var max;
    var primitive;
    var exps = [];
    var logs = [];
    var value = 1;
    var index;
    if (!Number.isInteger(bits) || bits < 3 || bits > 20) {
      throw new RangeError('Field size must be an integer between 3 and 20 bits.');
    }
    primitive = primitivePolynomials[bits];
    if (!primitive) {
      throw new RangeError('No pinned primitive polynomial exists for this field size.');
    }
    size = Math.pow(2, bits);
    max = size - 1;
    for (index = 0; index < size; index += 1) {
      exps[index] = value;
      logs[value] = index;
      value <<= 1;
      if (value >= size) {
        value ^= primitive;
        value &= max;
      }
    }
    return {
      bits: bits,
      size: size,
      max: max,
      exps: exps,
      logs: logs
    };
  }

  function fieldMultiply(field, left, right) {
    if (left === 0 || right === 0) {
      return 0;
    }
    return field.exps[(field.logs[left] + field.logs[right]) % field.max];
  }

  function fieldDivide(field, numerator, denominator) {
    var exponent;
    if (denominator === 0) {
      throw new Error('Cannot divide by zero in the finite field.');
    }
    if (numerator === 0) {
      return 0;
    }
    exponent = (field.logs[numerator] - field.logs[denominator] + field.max) % field.max;
    return field.exps[exponent];
  }

  function randomFieldElement(field) {
    var cryptoObject = global.crypto;
    var sample;
    var value;
    if (!cryptoObject || typeof cryptoObject.getRandomValues !== 'function') {
      throw new Error('crypto.getRandomValues is unavailable; refusing Shamir generation.');
    }
    sample = new Uint32Array(1);
    try {
      do {
        cryptoObject.getRandomValues(sample);
        value = sample[0] & field.max;
      } while (value === 0);
      return value;
    } finally {
      zeroBytes(sample);
    }
  }

  function evaluatePolynomial(field, x, coefficients) {
    var result = 0;
    var index;
    for (index = coefficients.length - 1; index >= 0; index -= 1) {
      result = fieldMultiply(field, result, x) ^ coefficients[index];
    }
    return result;
  }

  function interpolateAtZero(field, xValues, yValues) {
    var result = 0;
    var i;
    var j;
    var coefficient;
    var numerator;
    var denominator;
    for (i = 0; i < xValues.length; i += 1) {
      coefficient = 1;
      for (j = 0; j < xValues.length; j += 1) {
        if (i !== j) {
          numerator = xValues[j];
          denominator = xValues[i] ^ xValues[j];
          coefficient = fieldMultiply(field, coefficient, fieldDivide(field, numerator, denominator));
        }
      }
      result ^= fieldMultiply(field, yValues[i], coefficient);
    }
    return result;
  }

  function validateShareCounts(field, shares, threshold) {
    if (!Number.isInteger(shares) || shares < 2 || shares > field.max) {
      throw new RangeError('Number of shares must be an integer between 2 and ' + field.max + '.');
    }
    if (!Number.isInteger(threshold) || threshold < 2 || threshold > shares) {
      throw new RangeError('Threshold must be an integer between 2 and the number of shares.');
    }
  }

  function randomShareSegments(field, segments, shares, threshold) {
    var y = [];
    var segmentIndex;
    var shareIndex;
    var coefficients;
    var value;
    for (shareIndex = 0; shareIndex < shares; shareIndex += 1) {
      y[shareIndex] = '';
    }
    for (segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      coefficients = [segments[segmentIndex]];
      for (shareIndex = 1; shareIndex < threshold; shareIndex += 1) {
        coefficients.push(randomFieldElement(field));
      }
      for (shareIndex = 0; shareIndex < shares; shareIndex += 1) {
        value = evaluatePolynomial(field, shareIndex + 1, coefficients);
        y[shareIndex] = numberBits(value, field.bits) + y[shareIndex];
      }
      coefficients.length = 0;
    }
    return y;
  }

  function parseRawShare(share) {
    var bits;
    var idLength;
    var maximum;
    var match;
    if (typeof share !== 'string') {
      throw new TypeError('Raw SSS share must be text.');
    }
    bits = parseInt(share.slice(0, 1), 36);
    if (!Number.isInteger(bits) || bits < 3 || bits > 20) {
      throw new Error('Invalid raw SSS share field size.');
    }
    maximum = Math.pow(2, bits) - 1;
    idLength = maximum.toString(16).length;
    match = new RegExp('^([3-9a-kA-K])([0-9a-fA-F]{' + idLength + '})([0-9a-fA-F]+)$').exec(share);
    if (!match) {
      throw new Error('Invalid raw SSS share format.');
    }
    if (share.length < 1 + idLength + 2 || (match[3].length % 2) !== 0) {
      throw new Error('Invalid raw SSS share data.');
    }
    if (match[3].length * 4 < bits) {
      throw new Error('Raw SSS share data is too short.');
    }
    return {
      bits: bits,
      id: parseInt(match[2], 16),
      data: match[3].toLowerCase()
    };
  }

  function rawSplit(secret, options) {
    var bits = options && options.bits === undefined ? 8 : (options && options.bits);
    var shares = options && options.shares;
    var threshold = options && options.threshold;
    var padLength = options && options.padLength;
    var field;
    var marked;
    var segments;
    var data;
    var y;
    var output = [];
    var index;
    if (typeof secret !== 'string' || secret.length === 0 || secret.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(secret)) {
      throw new TypeError('Raw SSS secret must be a non-empty even-length hexadecimal string.');
    }
    field = createField(bits);
    validateShareCounts(field, shares, threshold);
    padLength = padLength || 128;
    if (!Number.isInteger(padLength) || padLength < 0 || padLength > 1024) {
      throw new RangeError('Raw SSS padding must be an integer from 0 through 1024 bits.');
    }
    marked = '1' + hexToBits(secret);
    if (padLength > 0 && marked.length % padLength !== 0) {
      marked = leftPad(marked, marked.length + (padLength - (marked.length % padLength)));
    }
    segments = splitBitSegments(marked, field.bits);
    y = randomShareSegments(field, segments, shares, threshold);
    for (index = 0; index < shares; index += 1) {
      data = bitsToHex(y[index]);
      output.push(
        field.bits.toString(36).toUpperCase()
        + leftPad((index + 1).toString(16), field.max.toString(16).length)
        + data
      );
      y[index] = '';
    }
    return Object.freeze({
      parts: Object.freeze(output),
      bits: field.bits,
      shares: shares,
      threshold: threshold,
      padLength: padLength
    });
  }

  function rawCombine(parts, options) {
    var parsed = [];
    var first;
    var field;
    var xValues = [];
    var yValues = [];
    var seen = Object.create(null);
    var index;
    var segmentIndex;
    var segments;
    var resultBits = '';
    var marker;
    var secretBits;
    var threshold = options && options.threshold;
    if (!Array.isArray(parts) || parts.length < 2) {
      throw new TypeError('Raw SSS combine requires at least two shares.');
    }
    for (index = 0; index < parts.length; index += 1) {
      parsed.push(parseRawShare(parts[index]));
    }
    first = parsed[0];
    field = createField(first.bits);
    if (threshold !== undefined) {
      validateShareCounts(field, parts.length, threshold);
      if (parts.length < threshold) {
        throw new Error('Not enough raw SSS shares for the requested threshold.');
      }
    }
    for (index = 0; index < parsed.length; index += 1) {
      if (parsed[index].bits !== first.bits) {
        throw new Error('Mismatched raw SSS shares use different fields.');
      }
      if (parsed[index].id < 1 || parsed[index].id > field.max || seen[parsed[index].id]) {
        throw new Error('Duplicate or invalid raw SSS share id.');
      }
      if (parsed[index].data.length !== first.data.length) {
        throw new Error('Mismatched raw SSS shares have different data lengths.');
      }
      seen[parsed[index].id] = true;
      xValues.push(parsed[index].id);
      segments = splitBitSegments(hexToBits(parsed[index].data), field.bits);
      for (segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        yValues[segmentIndex] = yValues[segmentIndex] || [];
        yValues[segmentIndex][index] = segments[segmentIndex];
      }
    }
    for (segmentIndex = 0; segmentIndex < yValues.length; segmentIndex += 1) {
      resultBits = numberBits(interpolateAtZero(field, xValues, yValues[segmentIndex]), field.bits) + resultBits;
    }
    marker = resultBits.indexOf('1');
    if (marker === -1) {
      throw new Error('Raw SSS reconstruction marker is missing.');
    }
    secretBits = resultBits.slice(marker + 1);
    if (secretBits.length === 0 || secretBits.length % 4 !== 0) {
      throw new Error('Raw SSS reconstruction has an invalid secret length.');
    }
    return Object.freeze({
      hex: bitsToHex(secretBits).toLowerCase(),
      bits: field.bits,
      shares: parsed.length
    });
  }

  function shamir39Parameters(threshold, order) {
    var thresholdBits = threshold.toString(2);
    var orderBits = order.toString(2);
    var width = Math.max(
      Math.ceil(thresholdBits.length / 5) * 5,
      Math.ceil(orderBits.length / 5) * 5
    );
    var result = '';
    var index;
    thresholdBits = leftPad(thresholdBits, width);
    orderBits = leftPad(orderBits, width);
    for (index = 0; index < width; index += 5) {
      result += (index + 5 === width ? '0' : '1')
        + thresholdBits.slice(index, index + 5)
        + orderBits.slice(index, index + 5);
    }
    return result;
  }

  function bitsToWords(bits, wordlist) {
    var padded = bits;
    var words = [];
    var index;
    var wordIndex;
    if (padded.length % 11 !== 0) {
      padded = leftPad(padded, padded.length + (11 - (padded.length % 11)));
    }
    for (index = 0; index < padded.length; index += 11) {
      wordIndex = parseInt(padded.slice(index, index + 11), 2);
      if (wordIndex < 0 || wordIndex >= wordlist.length) {
        throw new Error('Shamir39 word index is outside the selected wordlist.');
      }
      words.push(wordlist[wordIndex]);
    }
    return words;
  }

  function parseShamir39Part(part, wordlist) {
    var words = seedForge.splitMnemonic(part);
    var version = words[0];
    var thresholdBits = '';
    var orderBits = '';
    var end = -1;
    var index;
    var wordIndex;
    var wordBits;
    var dataBits;
    var dataHex;
    var threshold;
    var order;
    if (words.length < 3 || !shamir39Versions[version]) {
      throw new Error('Invalid Shamir39 version or share length.');
    }
    for (index = 1; index < words.length; index += 1) {
      wordIndex = wordlist.indexOf(words[index]);
      if (wordIndex < 0) {
        throw new Error('Shamir39 word is not in the selected wordlist.');
      }
      wordBits = numberBits(wordIndex, 11);
      thresholdBits += wordBits.slice(1, 6);
      orderBits += wordBits.slice(6, 11);
      if (wordBits[0] === '0') {
        end = index;
        break;
      }
    }
    if (end === -1 || thresholdBits.length === 0 || orderBits.length === 0 || end === words.length - 1) {
      throw new Error('Shamir39 parameters are incomplete.');
    }
    threshold = parseInt(thresholdBits, 2);
    order = parseInt(orderBits, 2);
    if (!Number.isInteger(threshold) || threshold < 2 || threshold > 2047) {
      throw new Error('Shamir39 threshold is outside the GF(2^11) field.');
    }
    if (!Number.isInteger(order) || order < 0 || order >= 2047) {
      throw new Error('Shamir39 share order is outside the GF(2^11) field.');
    }
    dataBits = words.slice(end + 1).map(function (word) {
      wordIndex = wordlist.indexOf(word);
      if (wordIndex < 0) {
        throw new Error('Shamir39 share word is not in the selected wordlist.');
      }
      return numberBits(wordIndex, 11);
    }).join('');
    if (dataBits.length < 11) {
      throw new Error('Shamir39 share data is empty.');
    }
    dataBits = dataBits.slice(dataBits.length % 4);
    dataHex = bitsToHex(dataBits);
    return {
      version: version,
      threshold: threshold,
      order: order,
      data: dataHex
    };
  }

  function shamir39Split(mnemonic, options) {
    var language = options && options.language ? options.language : 'english';
    var threshold = options && options.threshold;
    var shares = options && options.shares;
    var parsed = parseBip39Mnemonic(mnemonic, language);
    var wordlist = wordlistFor(language);
    var field = createField(11);
    validateShareCounts(field, shares, threshold);
    var sourceBits = parsed.indices.map(function (index) { return numberBits(index, 11); }).join('');
    if (sourceBits.length % 4 !== 0) {
      sourceBits = leftPad(sourceBits, sourceBits.length + (4 - (sourceBits.length % 4)));
    }
    var segments = splitBitSegments('1' + sourceBits, field.bits);
    var data = randomShareSegments(field, segments, shares, threshold);
    var output = [];
    var index;
    var words;
    var dataBits;
    for (index = 0; index < shares; index += 1) {
      dataBits = hexToBits(bitsToHex(data[index]));
      words = ['shamir39-p1']
        .concat(bitsToWords(shamir39Parameters(threshold, index), wordlist))
        .concat(bitsToWords(dataBits, wordlist));
      output.push(joinWords(words, language));
      data[index] = '';
    }
    sourceBits = '';
    return Object.freeze({
      parts: Object.freeze(output),
      language: language,
      threshold: threshold,
      shares: shares,
      wordCount: parsed.words.length,
      version: 'shamir39-p1'
    });
  }

  function shamir39Combine(parts, options) {
    var language = options && options.language ? options.language : 'english';
    var wordlist = wordlistFor(language);
    var parsed = [];
    var first;
    var field = createField(11);
    var xValues = [];
    var yValues = [];
    var seen = Object.create(null);
    var index;
    var segmentIndex;
    var segments;
    var resultBits = '';
    var marker;
    var sourceBits;
    var sourceWords;
    var sourcePhrase;
    var validation;
    if (!Array.isArray(parts) || parts.length < 2) {
      throw new TypeError('Shamir39 combine requires at least two shares.');
    }
    for (index = 0; index < parts.length; index += 1) {
      parsed.push(parseShamir39Part(parts[index], wordlist));
    }
    first = parsed[0];
    if (parts.length < first.threshold) {
      throw new Error('Not enough Shamir39 shares for threshold ' + first.threshold + '.');
    }
    for (index = 0; index < parsed.length; index += 1) {
      if (parsed[index].threshold !== first.threshold) {
        throw new Error('Inconsistent Shamir39 thresholds.');
      }
      if (seen[parsed[index].order]) {
        throw new Error('Duplicate Shamir39 share order.');
      }
      if (parsed[index].data.length !== first.data.length) {
        throw new Error('Mismatched Shamir39 share data lengths.');
      }
      seen[parsed[index].order] = true;
      xValues.push(parsed[index].order + 1);
      segments = splitBitSegments(hexToBits(parsed[index].data), field.bits);
      for (segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        yValues[segmentIndex] = yValues[segmentIndex] || [];
        yValues[segmentIndex][index] = segments[segmentIndex];
      }
    }
    for (segmentIndex = 0; segmentIndex < yValues.length; segmentIndex += 1) {
      resultBits = numberBits(interpolateAtZero(field, xValues, yValues[segmentIndex]), field.bits) + resultBits;
    }
    marker = resultBits.indexOf('1');
    if (marker === -1) {
      throw new Error('Shamir39 reconstruction marker is missing.');
    }
    sourceBits = resultBits.slice(marker + 1);
    if (sourceBits.length % 11 !== 0) {
      throw new Error('Shamir39 reconstruction has an invalid word length.');
    }
    sourceWords = [];
    for (index = 0; index < sourceBits.length; index += 11) {
      sourceWords.push(wordlist[parseInt(sourceBits.slice(index, index + 11), 2)]);
    }
    if (validMnemonicWordCounts.indexOf(sourceWords.length) === -1) {
      throw new Error('Shamir39 reconstruction has an unsupported BIP-39 word count.');
    }
    sourcePhrase = joinWords(sourceWords, language);
    validation = seedForge.validateMnemonic(sourcePhrase, language);
    if (!validation.valid) {
      throw new Error('Shamir39 reconstruction failed BIP-39 checksum validation.');
    }
    return Object.freeze({
      mnemonic: validation.normalized,
      language: language,
      threshold: first.threshold,
      parts: parsed.length,
      wordCount: sourceWords.length
    });
  }

  global.__coldboxShamir = Object.freeze({
    shamir39: Object.freeze({
      split: shamir39Split,
      combine: shamir39Combine,
      parse: function (part, options) {
        var language = options && options.language ? options.language : 'english';
        return Object.freeze(parseShamir39Part(part, wordlistFor(language)));
      }
    }),
    raw: Object.freeze({
      split: function (secret, options) { return rawSplit(secret, options || {}); },
      combine: function (parts, options) { return rawCombine(parts, options || {}); },
      parse: function (share) { return Object.freeze(parseRawShare(share)); }
    })
  });
}(window));
