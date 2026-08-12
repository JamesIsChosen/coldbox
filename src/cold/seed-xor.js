(function (global) {
  'use strict';

  var seedForge = global.__coldboxSeedForge;
  var noble = global.__coldboxNobleCrypto;
  var entropyBytesByWordCount = Object.freeze({
    12: 16,
    18: 24,
    24: 32
  });
  var deterministicPrefix = 'Batshitoshi ';

  function zeroBytes(bytes) {
    if (bytes && typeof bytes.fill === 'function') {
      bytes.fill(0);
    }
  }

  function requireCrypto() {
    if (!seedForge || !noble
      || typeof seedForge.validateMnemonic !== 'function'
      || typeof seedForge.splitMnemonic !== 'function'
      || typeof seedForge.mnemonicToEntropy !== 'function'
      || typeof seedForge.entropyToMnemonic !== 'function'
      || !Array.isArray(seedForge.languages)
      || typeof noble.sha256 !== 'function'
      || typeof noble.utf8ToBytes !== 'function') {
      throw new Error('Seed XOR crypto bundle is unavailable; refusing to process a phrase.');
    }
  }

  function languageIsAvailable(language) {
    return typeof language === 'string'
      && seedForge.languages.some(function (record) { return record.id === language; });
  }

  function requireLanguage(language) {
    requireCrypto();
    if (!languageIsAvailable(language)) {
      throw new Error('Unsupported BIP-39 language: ' + String(language) + '.');
    }
    return language;
  }

  function wordCountForEntropyLength(length) {
    if (length === 16) {
      return 12;
    }
    if (length === 24) {
      return 18;
    }
    if (length === 32) {
      return 24;
    }
    throw new RangeError('Seed XOR supports only 12-, 18-, and 24-word BIP-39 phrases.');
  }

  function parseMnemonic(mnemonic, language) {
    requireLanguage(language);
    if (typeof mnemonic !== 'string' || mnemonic.trim() === '') {
      throw new TypeError('Seed XOR mnemonic must be non-empty text.');
    }
    var validation = seedForge.validateMnemonic(mnemonic, language);
    if (!validation || validation.valid !== true) {
      throw new Error('Cannot process an invalid BIP-39 mnemonic ('
        + (validation && validation.reason ? validation.reason : 'invalid') + ').');
    }
    var words = seedForge.splitMnemonic(mnemonic);
    if (!words || !Object.prototype.hasOwnProperty.call(entropyBytesByWordCount, words.length)) {
      throw new RangeError('Seed XOR supports only 12-, 18-, and 24-word BIP-39 phrases.');
    }
    var entropy = seedForge.mnemonicToEntropy(mnemonic, language);
    if (!(entropy instanceof Uint8Array)) {
      throw new TypeError('Seed Forge returned an invalid entropy value.');
    }
    var expectedLength = entropyBytesByWordCount[words.length];
    if (entropy.length !== expectedLength) {
      zeroBytes(entropy);
      throw new RangeError('BIP-39 entropy length does not match its word count.');
    }
    return new Uint8Array(entropy);
  }

  function xorInto(target, value) {
    if (!(target instanceof Uint8Array) || !(value instanceof Uint8Array)
      || target.length !== value.length) {
      throw new RangeError('Seed XOR values must have equal byte lengths.');
    }
    for (var index = 0; index < target.length; index += 1) {
      target[index] ^= value[index];
    }
  }

  function concatBytes(first, second, third) {
    var result = new Uint8Array(first.length + second.length + third.length);
    result.set(first, 0);
    result.set(second, first.length);
    result.set(third, first.length + second.length);
    return result;
  }

  function doubleSha256(bytes) {
    var first = null;
    var second = null;
    try {
      first = new Uint8Array(noble.sha256(bytes));
      second = new Uint8Array(noble.sha256(first));
      return second;
    } finally {
      zeroBytes(first);
    }
  }

  function randomMask(length) {
    if (!global.crypto || typeof global.crypto.getRandomValues !== 'function') {
      throw new Error('crypto.getRandomValues is unavailable; refusing random Seed XOR.');
    }
    var random = new Uint8Array(length);
    var digest = null;
    try {
      var filled = global.crypto.getRandomValues(random);
      if (filled !== undefined && filled !== random) {
        throw new Error('crypto.getRandomValues returned an unexpected value.');
      }
      digest = doubleSha256(random);
      return new Uint8Array(digest.subarray(0, length));
    } finally {
      zeroBytes(random);
      zeroBytes(digest);
    }
  }

  function deterministicMask(entropy, index, count) {
    var prefix = noble.utf8ToBytes(deterministicPrefix);
    var suffix = noble.utf8ToBytes(String(index) + ' of ' + String(count) + ' parts');
    var message = null;
    var digest = null;
    try {
      message = concatBytes(prefix, entropy, suffix);
      digest = doubleSha256(message);
      return new Uint8Array(digest.subarray(0, entropy.length));
    } finally {
      zeroBytes(prefix);
      zeroBytes(suffix);
      zeroBytes(message);
      zeroBytes(digest);
    }
  }

  function normalizeCount(value) {
    var count = Number(value);
    if (!Number.isInteger(count) || count < 2 || count > 4) {
      throw new RangeError('Seed XOR requires 2 through 4 parts.');
    }
    return count;
  }

  function normalizeMode(value) {
    var mode = value === undefined ? 'deterministic' : value;
    if (mode !== 'deterministic' && mode !== 'random') {
      throw new RangeError('Seed XOR mode must be deterministic or random.');
    }
    return mode;
  }

  function combine(mnemonics, options) {
    requireCrypto();
    options = options || {};
    var language = requireLanguage(options.language || 'english');
    if (!Array.isArray(mnemonics)) {
      throw new TypeError('Seed XOR parts must be an array.');
    }
    var count = normalizeCount(mnemonics.length);
    var entropies = [];
    var combined = null;
    try {
      for (var index = 0; index < count; index += 1) {
        var entropy = parseMnemonic(mnemonics[index], language);
        if (entropies.length > 0 && entropy.length !== entropies[0].length) {
          zeroBytes(entropy);
          throw new RangeError('All Seed XOR parts must use the same word count.');
        }
        entropies.push(entropy);
      }
      var wordCount = wordCountForEntropyLength(entropies[0].length);
      combined = new Uint8Array(entropies[0]);
      for (var xorIndex = 1; xorIndex < entropies.length; xorIndex += 1) {
        xorInto(combined, entropies[xorIndex]);
      }
      var mnemonic = seedForge.entropyToMnemonic(combined, language);
      return Object.freeze({
        mnemonic: mnemonic,
        entropy: new Uint8Array(combined),
        language: language,
        wordCount: wordCount,
        parts: count
      });
    } finally {
      entropies.forEach(zeroBytes);
      zeroBytes(combined);
    }
  }

  function split(mnemonic, options) {
    requireCrypto();
    options = options || {};
    var language = requireLanguage(options.language || 'english');
    var count = normalizeCount(options.count);
    var mode = normalizeMode(options.mode);
    var sourceEntropy = parseMnemonic(mnemonic, language);
    var partEntropies = [];
    var partMnemonics = [];
    try {
      for (var index = 0; index < count - 1; index += 1) {
        var mask = mode === 'random'
          ? randomMask(sourceEntropy.length)
          : deterministicMask(sourceEntropy, index, count);
        var part = new Uint8Array(mask);
        zeroBytes(mask);
        partEntropies.push(part);
      }
      var finalPart = new Uint8Array(sourceEntropy);
      partEntropies.forEach(function (partEntropy) { xorInto(finalPart, partEntropy); });
      partEntropies.push(finalPart);
      partEntropies.forEach(function (partEntropy) {
        partMnemonics.push(seedForge.entropyToMnemonic(partEntropy, language));
      });
      return Object.freeze({
        parts: Object.freeze(partMnemonics.slice()),
        language: language,
        wordCount: wordCountForEntropyLength(sourceEntropy.length),
        count: count,
        mode: mode
      });
    } finally {
      zeroBytes(sourceEntropy);
      partEntropies.forEach(zeroBytes);
    }
  }

  global.__coldboxSeedXor = Object.freeze({
    combine: combine,
    split: split
  });
}(window));
