(function (global) {
  'use strict';

  var MASK = (1n << 64n) - 1n;
  var ROUND_CONSTANTS = [
    1n, 0x8082n, 0x800000000000808an, 0x8000000080008000n,
    0x808bn, 0x80000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x8an, 0x88n, 0x80008009n, 0x8000000an, 0x8000808bn,
    0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x800an,
    0x800000008000000an, 0x8000000080008081n, 0x8000000000008080n,
    0x80000001n, 0x8000000080008008n
  ];
  var ROTATION = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14]
  ];
  var BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  var BECH32_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  var BECH32_CONST = 1;
  var BECH32M_CONST = 0x2bc830a3;
  var BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  var BASE58_VERSIONS = [0x00, 0x05, 0x6f, 0xc4];
  var SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotate(value, count) {
    if (count === 0) {
      return value;
    }
    return ((value << BigInt(count)) | (value >> BigInt(64 - count))) & MASK;
  }

  function permute(state) {
    for (var round = 0; round < 24; round += 1) {
      var columns = [];
      var x;
      var y;
      for (x = 0; x < 5; x += 1) {
        columns[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
      }
      for (x = 0; x < 5; x += 1) {
        var delta = columns[(x + 4) % 5] ^ rotate(columns[(x + 1) % 5], 1);
        for (y = 0; y < 25; y += 5) {
          state[x + y] = (state[x + y] ^ delta) & MASK;
        }
      }
      var moved = new Array(25).fill(0n);
      for (x = 0; x < 5; x += 1) {
        for (y = 0; y < 5; y += 1) {
          moved[y + 5 * ((2 * x + 3 * y) % 5)] = rotate(state[x + 5 * y], ROTATION[x][y]);
        }
      }
      for (x = 0; x < 5; x += 1) {
        for (y = 0; y < 5; y += 1) {
          state[x + 5 * y] = (moved[x + 5 * y]
            ^ ((~moved[(x + 1) % 5 + 5 * y]) & moved[(x + 2) % 5 + 5 * y])) & MASK;
        }
      }
      state[0] = (state[0] ^ ROUND_CONSTANTS[round]) & MASK;
    }
  }

  function keccak256Ascii(text) {
    var bytes = new Uint8Array(text.length + 1);
    for (var index = 0; index < text.length; index += 1) {
      bytes[index] = text.charCodeAt(index);
    }
    bytes[text.length] = 0x01;
    var blockLength = 136;
    var paddedLength = Math.ceil((bytes.length + 1) / blockLength) * blockLength;
    var padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[padded.length - 1] |= 0x80;
    var state = new Array(25).fill(0n);
    for (var offset = 0; offset < padded.length; offset += blockLength) {
      for (var lane = 0; lane < blockLength / 8; lane += 1) {
        var value = 0n;
        for (var byte = 0; byte < 8; byte += 1) {
          value |= BigInt(padded[offset + lane * 8 + byte]) << BigInt(byte * 8);
        }
        state[lane] = (state[lane] ^ value) & MASK;
      }
      permute(state);
    }
    var output = '';
    for (var outputByte = 0; outputByte < 32; outputByte += 1) {
      var outputLane = state[Math.floor(outputByte / 8)];
      output += Number((outputLane >> BigInt((outputByte % 8) * 8)) & 0xffn).toString(16).padStart(2, '0');
    }
    return output;
  }

  function rightRotate32(value, count) {
    return (value >>> count) | (value << (32 - count));
  }

  // Base58Check is needed in the warm shell, where the cold crypto bundle is
  // deliberately unavailable. This is a small synchronous SHA-256 solely for
  // validating public address checksums; it never accepts or returns secret
  // material.
  function sha256(bytes) {
    var input = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    var bitLength = input.length * 8;
    var paddedLength = Math.ceil((input.length + 9) / 64) * 64;
    var padded = new Uint8Array(paddedLength);
    padded.set(input);
    padded[input.length] = 0x80;
    var highLength = Math.floor(bitLength / 0x100000000);
    var lowLength = bitLength >>> 0;
    for (var lengthIndex = 0; lengthIndex < 4; lengthIndex += 1) {
      padded[padded.length - 8 + lengthIndex] = (highLength >>> (24 - lengthIndex * 8)) & 0xff;
      padded[padded.length - 4 + lengthIndex] = (lowLength >>> (24 - lengthIndex * 8)) & 0xff;
    }
    var hash = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    for (var offset = 0; offset < padded.length; offset += 64) {
      var words = new Array(64);
      var wordIndex;
      for (wordIndex = 0; wordIndex < 16; wordIndex += 1) {
        var wordOffset = offset + wordIndex * 4;
        words[wordIndex] = ((padded[wordOffset] << 24)
          | (padded[wordOffset + 1] << 16)
          | (padded[wordOffset + 2] << 8)
          | padded[wordOffset + 3]) >>> 0;
      }
      for (wordIndex = 16; wordIndex < 64; wordIndex += 1) {
        var smallSigma0 = rightRotate32(words[wordIndex - 15], 7)
          ^ rightRotate32(words[wordIndex - 15], 18)
          ^ (words[wordIndex - 15] >>> 3);
        var smallSigma1 = rightRotate32(words[wordIndex - 2], 17)
          ^ rightRotate32(words[wordIndex - 2], 19)
          ^ (words[wordIndex - 2] >>> 10);
        words[wordIndex] = (words[wordIndex - 16] + smallSigma0
          + words[wordIndex - 7] + smallSigma1) >>> 0;
      }
      var a = hash[0];
      var b = hash[1];
      var c = hash[2];
      var d = hash[3];
      var e = hash[4];
      var f = hash[5];
      var g = hash[6];
      var h = hash[7];
      for (wordIndex = 0; wordIndex < 64; wordIndex += 1) {
        var bigSigma1 = rightRotate32(e, 6) ^ rightRotate32(e, 11) ^ rightRotate32(e, 25);
        var choose = (e & f) ^ (~e & g);
        var temp1 = (h + bigSigma1 + choose + SHA256_K[wordIndex] + words[wordIndex]) >>> 0;
        var bigSigma0 = rightRotate32(a, 2) ^ rightRotate32(a, 13) ^ rightRotate32(a, 22);
        var majority = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (bigSigma0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      hash[0] = (hash[0] + a) >>> 0;
      hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0;
      hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0;
      hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0;
      hash[7] = (hash[7] + h) >>> 0;
    }
    var result = new Uint8Array(32);
    for (var hashIndex = 0; hashIndex < hash.length; hashIndex += 1) {
      result[hashIndex * 4] = (hash[hashIndex] >>> 24) & 0xff;
      result[hashIndex * 4 + 1] = (hash[hashIndex] >>> 16) & 0xff;
      result[hashIndex * 4 + 2] = (hash[hashIndex] >>> 8) & 0xff;
      result[hashIndex * 4 + 3] = hash[hashIndex] & 0xff;
    }
    return result;
  }

  function equalBytes(left, right) {
    if (left.length !== right.length) {
      return false;
    }
    var equal = true;
    for (var index = 0; index < left.length; index += 1) {
      equal = equal && left[index] === right[index];
    }
    return equal;
  }

  function doubleSha256(bytes) {
    return sha256(sha256(bytes));
  }

  function isMixedCase(value) {
    return value !== value.toLowerCase() && value !== value.toUpperCase();
  }

  function validEip55(value) {
    var lower = value.slice(2).toLowerCase();
    var hash = keccak256Ascii(lower);
    var expected = '0x';
    for (var index = 0; index < lower.length; index += 1) {
      var character = lower[index];
      if (/[a-f]/.test(character) && parseInt(hash[index], 16) >= 8) {
        expected += character.toUpperCase();
      } else {
        expected += character;
      }
    }
    return value === expected;
  }

  function bech32Polymod(values) {
    var checksum = 1;
    for (var index = 0; index < values.length; index += 1) {
      var top = checksum >>> 25;
      checksum = ((checksum & 0x1ffffff) << 5) ^ values[index];
      for (var generatorIndex = 0; generatorIndex < BECH32_GENERATORS.length; generatorIndex += 1) {
        if ((top >>> generatorIndex) & 1) {
          checksum ^= BECH32_GENERATORS[generatorIndex];
        }
      }
    }
    return checksum >>> 0;
  }

  function bech32HrpExpand(hrp) {
    var expanded = [];
    for (var index = 0; index < hrp.length; index += 1) {
      expanded.push(hrp.charCodeAt(index) >>> 5);
    }
    expanded.push(0);
    for (var lowIndex = 0; lowIndex < hrp.length; lowIndex += 1) {
      expanded.push(hrp.charCodeAt(lowIndex) & 31);
    }
    return expanded;
  }

  function convertBits(values, fromBits, toBits, pad) {
    var accumulator = 0;
    var bits = 0;
    var output = [];
    var maxValue = (1 << toBits) - 1;
    var maxAccumulator = (1 << (fromBits + toBits - 1)) - 1;
    for (var index = 0; index < values.length; index += 1) {
      if (values[index] < 0 || values[index] >>> fromBits !== 0) {
        return null;
      }
      accumulator = ((accumulator << fromBits) | values[index]) & maxAccumulator;
      bits += fromBits;
      while (bits >= toBits) {
        bits -= toBits;
        output.push((accumulator >>> bits) & maxValue);
      }
    }
    if (pad) {
      if (bits > 0) {
        output.push((accumulator << (toBits - bits)) & maxValue);
      }
    } else if (bits >= fromBits || ((accumulator << (toBits - bits)) & maxValue) !== 0) {
      return null;
    }
    return output;
  }

  function decodeSegwitAddress(value) {
    if (typeof value !== 'string' || value.length < 8 || value.length > 90) {
      return { valid: false };
    }
    if (isMixedCase(value)) {
      return { valid: false };
    }
    var lower = value.toLowerCase();
    var separator = lower.lastIndexOf('1');
    if (separator < 1 || separator + 7 > lower.length) {
      return { valid: false };
    }
    var hrp = lower.slice(0, separator);
    if (hrp !== 'bc' && hrp !== 'tb' && hrp !== 'bcrt') {
      return { valid: false };
    }
    var data = [];
    for (var index = separator + 1; index < lower.length; index += 1) {
      var valueIndex = BECH32_CHARSET.indexOf(lower[index]);
      if (valueIndex < 0) {
        return { valid: false };
      }
      data.push(valueIndex);
    }
    var polymod = bech32Polymod(bech32HrpExpand(hrp).concat(data));
    if (polymod !== BECH32_CONST && polymod !== BECH32M_CONST) {
      return { checksumInvalid: true, normalized: lower };
    }
    var version = data[0];
    if (version > 16) {
      return { valid: false };
    }
    var program = convertBits(data.slice(1, -6), 5, 8, false);
    if (!program || program.length < 2 || program.length > 40) {
      return { valid: false };
    }
    var encoding = polymod === BECH32_CONST ? 'bech32' : 'bech32m';
    if (version === 0 && (encoding !== 'bech32' || (program.length !== 20 && program.length !== 32))) {
      return { valid: false };
    }
    if (version > 0 && encoding !== 'bech32m') {
      return { valid: false };
    }
    return { valid: true, normalized: lower, version: version, encoding: encoding };
  }

  function decodeBase58(value) {
    var bytes = [];
    for (var index = 0; index < value.length; index += 1) {
      var digit = BASE58_ALPHABET.indexOf(value[index]);
      if (digit < 0) {
        return null;
      }
      var carry = digit;
      for (var byteIndex = bytes.length - 1; byteIndex >= 0; byteIndex -= 1) {
        carry += bytes[byteIndex] * 58;
        bytes[byteIndex] = carry & 0xff;
        carry = Math.floor(carry / 256);
      }
      while (carry > 0) {
        bytes.unshift(carry & 0xff);
        carry = Math.floor(carry / 256);
      }
    }
    var leadingZeroes = 0;
    while (leadingZeroes < value.length && value[leadingZeroes] === '1') {
      leadingZeroes += 1;
    }
    var output = new Uint8Array(leadingZeroes + bytes.length);
    for (var outputIndex = 0; outputIndex < bytes.length; outputIndex += 1) {
      output[leadingZeroes + outputIndex] = bytes[outputIndex];
    }
    return output;
  }

  function decodeBase58CheckAddress(value) {
    var bytes = decodeBase58(value);
    if (!bytes || bytes.length !== 25 || BASE58_VERSIONS.indexOf(bytes[0]) < 0) {
      return { valid: false };
    }
    var payload = bytes.slice(0, 21);
    var checksum = bytes.slice(21);
    if (!equalBytes(checksum, doubleSha256(payload).slice(0, 4))) {
      return { checksumInvalid: true };
    }
    return { valid: true };
  }

  function classify(value) {
    if (typeof value !== 'string' || value.length === 0) {
      return { kind: 'unknown', normalized: value };
    }
    if (/^(?:bc1|tb1|bcrt1)/i.test(value)) {
      var bech32 = decodeSegwitAddress(value);
      if (bech32.checksumInvalid) {
        return { kind: 'bech32', normalized: bech32.normalized, checksumInvalid: true };
      }
      if (bech32.valid) {
        return { kind: 'bech32', normalized: bech32.normalized };
      }
      return { kind: 'unknown', normalized: value };
    }
    if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
      if (isMixedCase(value) && !validEip55(value)) {
        return { kind: 'evm', normalized: value.toLowerCase(), checksumInvalid: true };
      }
      return { kind: 'evm', normalized: value.toLowerCase() };
    }
    if (/^[123mn2][1-9A-HJ-NP-Za-km-z]{20,130}$/.test(value)) {
      var base58 = decodeBase58CheckAddress(value);
      if (base58.checksumInvalid) {
        return { kind: 'base58', normalized: value, checksumInvalid: true };
      }
      if (base58.valid) {
        return { kind: 'base58', normalized: value };
      }
    }
    return { kind: 'unknown', normalized: value };
  }

  function firstDifference(left, right) {
    var limit = Math.min(left.length, right.length);
    for (var index = 0; index < limit; index += 1) {
      if (left[index] !== right[index]) {
        return index;
      }
    }
    return left.length === right.length ? -1 : limit;
  }

  function compare(candidate, recorded) {
    var candidateInfo = classify(candidate);
    var recordedInfo = classify(recorded);
    if (candidateInfo.checksumInvalid || recordedInfo.checksumInvalid) {
      return { outcome: 'checksum-invalid', divergenceIndex: -1, candidate: candidate, recorded: recorded };
    }
    if (candidateInfo.kind === 'unknown' || recordedInfo.kind === 'unknown') {
      return { outcome: 'unrecognised-format', divergenceIndex: -1, candidate: candidate, recorded: recorded };
    }
    var divergenceIndex = firstDifference(candidateInfo.normalized, recordedInfo.normalized);
    return {
      outcome: divergenceIndex === -1 && candidateInfo.kind === recordedInfo.kind ? 'match' : 'mismatch',
      divergenceIndex: divergenceIndex,
      candidate: candidate,
      recorded: recorded,
      kind: candidateInfo.kind
    };
  }

  function findRecord(candidate, records) {
    var candidateInfo = classify(candidate);
    if (candidateInfo.kind === 'unknown' || candidateInfo.checksumInvalid) {
      return null;
    }
    var matches = (records || []).filter(function (record) {
      return record && typeof record.address === 'string'
        && compare(candidate, record.address).outcome === 'match';
    });
    return matches.length > 0 ? matches[0] : null;
  }

  global.__coldboxAddressVerification = Object.freeze({
    classify: classify,
    compare: compare,
    findRecord: findRecord
  });
}(window));
