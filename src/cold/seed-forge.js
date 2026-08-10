(function (global) {
  'use strict';

  var bip39 = global.__coldboxBip39;
  var bip32 = global.__coldboxBip32;
  var noble = global.__coldboxNobleCrypto;

  var languages = Object.freeze([
    Object.freeze({ id: 'english', label: 'English', wordlistKey: 'english' }),
    Object.freeze({ id: 'czech', label: 'Czech', wordlistKey: 'czech' }),
    Object.freeze({ id: 'french', label: 'French', wordlistKey: 'french' }),
    Object.freeze({ id: 'italian', label: 'Italian', wordlistKey: 'italian' }),
    Object.freeze({ id: 'japanese', label: 'Japanese', wordlistKey: 'japanese' }),
    Object.freeze({ id: 'korean', label: 'Korean', wordlistKey: 'korean' }),
    Object.freeze({ id: 'portuguese', label: 'Portuguese', wordlistKey: 'portuguese' }),
    Object.freeze({ id: 'simplified-chinese', label: 'Simplified Chinese', wordlistKey: 'simplifiedChinese' }),
    Object.freeze({ id: 'spanish', label: 'Spanish', wordlistKey: 'spanish' }),
    Object.freeze({ id: 'traditional-chinese', label: 'Traditional Chinese', wordlistKey: 'traditionalChinese' })
  ]);
  var validWordCounts = Object.freeze([12, 15, 18, 21, 24]);

  function requireCrypto() {
    if (!bip39 || !bip32 || !noble
      || typeof bip39.entropyToMnemonic !== 'function'
      || typeof bip39.mnemonicToEntropy !== 'function'
      || typeof bip39.validateMnemonic !== 'function'
      || typeof bip32.HDKey !== 'function'
      || typeof noble.pbkdf2 !== 'function'
      || typeof noble.sha512 !== 'function'
      || typeof noble.utf8ToBytes !== 'function') {
      throw new Error('Seed Forge crypto bundle is unavailable; refusing to process a phrase.');
    }
  }

  function languageRecord(languageId) {
    for (var index = 0; index < languages.length; index += 1) {
      if (languages[index].id === languageId) {
        return languages[index];
      }
    }
    throw new Error('Unsupported BIP-39 language: ' + String(languageId) + '.');
  }

  function wordlistFor(languageId) {
    requireCrypto();
    var record = languageRecord(languageId);
    var wordlist = bip39.wordlists && bip39.wordlists[record.wordlistKey];
    if (!Array.isArray(wordlist) || wordlist.length !== 2048) {
      throw new Error('BIP-39 wordlist is unavailable for ' + record.label + '.');
    }
    return wordlist;
  }

  function isJapanese(languageId) {
    return languageId === 'japanese';
  }

  function normalizePhraseText(mnemonic) {
    if (typeof mnemonic !== 'string') {
      throw new TypeError('Seed Forge mnemonic must be text.');
    }
    return mnemonic.normalize('NFKD').trim();
  }

  function splitMnemonic(mnemonic) {
    var normalized = normalizePhraseText(mnemonic);
    if (!normalized) {
      return [];
    }
    return normalized.split(/[\u0020\t\r\n\u3000]+/).filter(function (word) {
      return word.length > 0;
    });
  }

  function validWordCount(count) {
    return validWordCounts.indexOf(count) !== -1;
  }

  function libraryMnemonic(words) {
    // @scure/bip39's Japanese generator uses U+3000, while its decoder takes
    // the same word list with ordinary spaces. The word indexes and checksum
    // are separator-independent, so use one canonical decoder separator.
    return words.join(' ');
  }

  function seedMnemonic(words, languageId) {
    return words.join(isJapanese(languageId) ? '\u3000' : ' ');
  }

  function wordIndex(wordlist, word) {
    return wordlist.indexOf(word);
  }

  function validateMnemonic(mnemonic, languageId) {
    var wordlist = wordlistFor(languageId);
    var words = splitMnemonic(mnemonic);
    var statuses = words.map(function (word) {
      return wordIndex(wordlist, word) === -1
        ? { word: word, state: 'unknown' }
        : { word: word, state: 'known' };
    });

    if (!validWordCount(words.length)) {
      return {
        valid: false,
        reason: 'word-count',
        words: statuses,
        normalized: seedMnemonic(words, languageId)
      };
    }
    if (statuses.some(function (entry) { return entry.state === 'unknown'; })) {
      return {
        valid: false,
        reason: 'unknown-word',
        words: statuses,
        normalized: seedMnemonic(words, languageId)
      };
    }

    var checksumValid = bip39.validateMnemonic(libraryMnemonic(words), wordlist);
    return {
      valid: checksumValid,
      reason: checksumValid ? 'valid' : 'checksum',
      words: statuses.map(function (entry) {
        return { word: entry.word, state: checksumValid ? 'valid' : 'known' };
      }),
      normalized: seedMnemonic(words, languageId)
    };
  }

  function assertEntropy(entropy) {
    if (!(entropy instanceof Uint8Array)) {
      throw new TypeError('Seed Forge entropy must be a byte array.');
    }
    if ([16, 20, 24, 28, 32].indexOf(entropy.length) === -1) {
      throw new RangeError('invalid entropy length');
    }
  }

  function entropyToMnemonic(entropy, languageId) {
    assertEntropy(entropy);
    return bip39.entropyToMnemonic(new Uint8Array(entropy), wordlistFor(languageId));
  }

  function mnemonicToEntropy(mnemonic, languageId) {
    var validation = validateMnemonic(mnemonic, languageId);
    if (!validation.valid) {
      throw new Error('Cannot decode an invalid BIP-39 mnemonic (' + validation.reason + ').');
    }
    return bip39.mnemonicToEntropy(libraryMnemonic(splitMnemonic(mnemonic)), wordlistFor(languageId));
  }

  function zeroBytes(bytes) {
    if (bytes && typeof bytes.fill === 'function') {
      bytes.fill(0);
    }
  }

  function mnemonicToSeed(mnemonic, passphrase, languageId) {
    var language = languageRecord(languageId);
    var validation = validateMnemonic(mnemonic, language.id);
    if (!validation.valid) {
      throw new Error('Cannot derive a seed from an invalid BIP-39 mnemonic (' + validation.reason + ').');
    }
    if (passphrase === undefined) {
      passphrase = '';
    }
    if (typeof passphrase !== 'string') {
      throw new TypeError('Seed Forge passphrase must be text.');
    }

    requireCrypto();
    // Japanese keeps U+3000 as its canonical display separator, but BIP-39
    // applies NFKD to the complete password before PBKDF2. That final
    // normalization converts the separator to the ASCII space required by
    // the published Japanese vectors.
    var mnemonicText = seedMnemonic(splitMnemonic(mnemonic), language.id).normalize('NFKD');
    var mnemonicBytes = noble.utf8ToBytes(mnemonicText);
    var saltBytes = noble.utf8ToBytes(('mnemonic' + passphrase).normalize('NFKD'));
    try {
      return noble.pbkdf2(noble.sha512, mnemonicBytes, saltBytes, { c: 2048, dkLen: 64 });
    } finally {
      zeroBytes(mnemonicBytes);
      zeroBytes(saltBytes);
    }
  }

  function masterFingerprintFromSeed(seed) {
    requireCrypto();
    if (!(seed instanceof Uint8Array) || seed.length !== 64) {
      throw new TypeError('BIP-39 seed must be exactly 64 bytes');
    }
    var root = null;
    try {
      root = bip32.HDKey.fromMasterSeed(seed);
      var fingerprint = root.fingerprint >>> 0;
      return fingerprint.toString(16).padStart(8, '0');
    } finally {
      if (root) {
        zeroBytes(root.privateKey);
        zeroBytes(root.chainCode);
      }
    }
  }

  function deriveMnemonic(mnemonic, passphrase, languageId) {
    var seed = mnemonicToSeed(mnemonic, passphrase, languageId);
    try {
      return {
        seed: new Uint8Array(seed),
        fingerprint: masterFingerprintFromSeed(seed)
      };
    } finally {
      zeroBytes(seed);
    }
  }

  function masterFingerprint(mnemonic, passphrase, languageId) {
    var seed = mnemonicToSeed(mnemonic, passphrase, languageId);
    try {
      return masterFingerprintFromSeed(seed);
    } finally {
      zeroBytes(seed);
    }
  }

  global.__coldboxSeedForge = Object.freeze({
    languages: languages,
    validWordCounts: validWordCounts,
    splitMnemonic: splitMnemonic,
    validateMnemonic: validateMnemonic,
    entropyToMnemonic: entropyToMnemonic,
    mnemonicToEntropy: mnemonicToEntropy,
    mnemonicToSeed: mnemonicToSeed,
    deriveMnemonic: deriveMnemonic,
    masterFingerprint: masterFingerprint
  });
}(window));
