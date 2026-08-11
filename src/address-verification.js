(function (global) {
  'use strict';

  var MASK = (1n << 64n) - 1n;
  var ROUND_CONSTANTS = [
    1n, 0x8082n, 0x800000000000808an, 0x8000000080008000n,
    0x808bn, 0x80000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x8an, 0x88n, 0x80008009n, 0x8000000an,
    0x8000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x800an, 0x800000008000000an,
    0x8000000080008081n, 0x8000000000008080n, 0x80000001n, 0x8000000080008008n
  ];
  var ROTATION = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14]
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

  function classify(value) {
    if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
      return { kind: 'unknown', normalized: value };
    }
    if (/^(?:bc1|tb1|bcrt1)[0-9ac-hj-np-z]+$/i.test(value)) {
      if (isMixedCase(value)) {
        return { kind: 'unknown', normalized: value };
      }
      return { kind: 'bech32', normalized: value.toLowerCase() };
    }
    if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
      if (isMixedCase(value) && !validEip55(value)) {
        return { kind: 'evm', normalized: value.toLowerCase(), checksumInvalid: true };
      }
      return { kind: 'evm', normalized: value.toLowerCase() };
    }
    if (/^[123mn2][1-9A-HJ-NP-Za-km-z]{20,130}$/.test(value)) {
      return { kind: 'base58', normalized: value };
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
      var result = compare(candidate, record.address);
      return result.outcome === 'match';
    });
    return matches.length > 0 ? matches[0] : null;
  }

  global.__coldboxAddressVerification = Object.freeze({
    classify: classify,
    compare: compare,
    findRecord: findRecord
  });
}(window));
