(function (global) {
  'use strict';

  var MAX_WORDS = 24;
  var VALID_WORD_COUNTS = Object.freeze([12, 15, 18, 21, 24]);
  var VALID_ENTROPY_LENGTHS = Object.freeze([16, 20, 24, 28, 32]);

  function assertWordIndices(indices) {
    if (!Array.isArray(indices) || VALID_WORD_COUNTS.indexOf(indices.length) === -1) {
      throw new RangeError('SeedQR requires 12, 15, 18, 21, or 24 word indices.');
    }
    return indices.map(function (index) {
      if (!Number.isInteger(index) || index < 0 || index > 2047) {
        throw new RangeError('SeedQR word indices must be integers from 0 through 2047.');
      }
      return index;
    });
  }

  function assertEntropy(entropy) {
    if (!(entropy instanceof Uint8Array)
      || VALID_ENTROPY_LENGTHS.indexOf(entropy.length) === -1) {
      throw new RangeError('Compact SeedQR requires 16, 20, 24, 28, or 32 entropy bytes.');
    }
    return new Uint8Array(entropy);
  }

  function encodeSeedQr(indices) {
    return assertWordIndices(indices).map(function (index) {
      return String(index).padStart(4, '0');
    }).join('');
  }

  function encodeCompactSeedQr(entropy) {
    return String.fromCharCode.apply(null, assertEntropy(entropy));
  }

  function createCode(payload, mode, errorCorrection) {
    if (typeof global.qrcode !== 'function') {
      throw new Error('The pinned QR encoder is unavailable; refusing to generate a code.');
    }
    var code = global.qrcode(0, errorCorrection || 'M');
    code.addData(payload, mode);
    code.make();
    return code;
  }

  function createSeedQr(indices, options) {
    var settings = options || {};
    return createCode(encodeSeedQr(indices), 'Numeric', settings.errorCorrection || 'M');
  }

  function createCompactSeedQr(entropy, options) {
    var settings = options || {};
    return createCode(encodeCompactSeedQr(entropy), 'Byte', settings.errorCorrection || 'L');
  }

  function renderSvg(code, options) {
    var settings = options || {};
    if (!code || typeof code.createSvgTag !== 'function') {
      throw new TypeError('A generated QR code is required.');
    }
    return code.createSvgTag({
      cellSize: Number.isInteger(settings.cellSize) ? settings.cellSize : 4,
      margin: Number.isInteger(settings.margin) ? settings.margin : 4,
      scalable: true,
      title: settings.title || 'Coldbox QR code',
      alt: settings.alt || 'Coldbox QR code'
    });
  }

  function payloadLength(code) {
    if (!code || typeof code.getModuleCount !== 'function') {
      throw new TypeError('A generated QR code is required.');
    }
    return code.getModuleCount();
  }

  global.__coldboxQr = Object.freeze({
    MAX_WORDS: MAX_WORDS,
    VALID_WORD_COUNTS: VALID_WORD_COUNTS,
    VALID_ENTROPY_LENGTHS: VALID_ENTROPY_LENGTHS,
    encodeSeedQr: encodeSeedQr,
    encodeCompactSeedQr: encodeCompactSeedQr,
    createSeedQr: createSeedQr,
    createCompactSeedQr: createCompactSeedQr,
    renderSvg: renderSvg,
    payloadLength: payloadLength
  });
}(window));
