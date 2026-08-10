(function (global) {
  'use strict';

  // P1.9 is deliberately a cold-local API. The warm shell does not receive
  // any of the inputs or results from this module; the UI renders its public
  // verdict directly in the opaque frame. Keep this module independent from
  // vault state so a user can verify a backup or device before opening a
  // vault.
  var seedForge = global.__coldboxSeedForge;
  var derivation = global.__coldboxDerivation;

  function requireLayers() {
    if (!seedForge || typeof seedForge.mnemonicToSeed !== 'function'
      || typeof seedForge.masterFingerprint !== 'function'
      || !derivation || typeof derivation.deriveBitcoinFromSeed !== 'function'
      || typeof derivation.deriveBitcoinFromXpub !== 'function') {
      throw new Error('Verification crypto is unavailable; refusing to verify.');
    }
  }

  function zeroBytes(bytes) {
    if (bytes && typeof bytes.fill === 'function') {
      bytes.fill(0);
    }
  }

  function text(value, label, maximum) {
    if (typeof value !== 'string') {
      throw new TypeError(label + ' must be text.');
    }
    var normalized = value.normalize('NFKD').trim();
    if (normalized.length === 0 || normalized.length > maximum) {
      throw new RangeError(label + ' must be between 1 and ' + String(maximum) + ' characters.');
    }
    return normalized;
  }

  function optionalText(value, label, maximum) {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value !== 'string') {
      throw new TypeError(label + ' must be text.');
    }
    var normalized = value.normalize('NFKD');
    if (normalized.length > maximum) {
      throw new RangeError(label + ' is too long.');
    }
    return normalized;
  }

  function expectedFingerprint(value) {
    var normalized = text(value, 'Expected fingerprint', 8).toLowerCase();
    if (!/^[0-9a-f]{8}$/.test(normalized)) {
      throw new TypeError('Expected fingerprint must be exactly 8 hexadecimal characters.');
    }
    return normalized;
  }

  function expectedPublicValue(value, label, maximum) {
    return text(value, label, maximum);
  }

  function compare(actual, expected) {
    return actual === expected ? 'match' : 'mismatch';
  }

  function result(workflow, verdict, fields) {
    var output = {
      workflow: workflow,
      verdict: verdict
    };
    Object.keys(fields || {}).forEach(function (key) {
      output[key] = fields[key];
    });
    return Object.freeze(output);
  }

  function fingerprintForMnemonic(mnemonic, passphrase, language) {
    requireLayers();
    var phrase = text(mnemonic, 'Mnemonic', 1024);
    var password = optionalText(passphrase, 'Passphrase', 1024);
    var languageId = language === undefined ? 'english' : text(language, 'BIP-39 language', 64);
    try {
      return seedForge.masterFingerprint(phrase, password, languageId);
    } finally {
      // Strings are immutable, but dropping the local references immediately
      // makes the intended lifetime explicit. No caller receives either.
      phrase = '';
      password = '';
      languageId = '';
    }
  }

  function verifyFingerprint(options) {
    var settings = options || {};
    var expected = expectedFingerprint(settings.expectedFingerprint);
    var actual = fingerprintForMnemonic(
      settings.mnemonic,
      settings.passphrase,
      settings.language
    );
    return result('fingerprint', compare(actual, expected), {
      fingerprint: actual,
      expectedFingerprint: expected
    });
  }

  function verifyBackup(options) {
    var settings = options || {};
    var expected = expectedFingerprint(settings.expectedFingerprint);
    var actual = fingerprintForMnemonic(
      settings.mnemonic,
      settings.passphrase,
      settings.language
    );
    return result('backup', compare(actual, expected), {
      fingerprint: actual,
      expectedFingerprint: expected
    });
  }

  function verifyPassphrase(options) {
    var settings = options || {};
    var expected = expectedFingerprint(settings.expectedFingerprint);
    var passphrase = text(settings.passphrase, 'Passphrase', 1024);
    var actual;
    try {
      actual = fingerprintForMnemonic(settings.mnemonic, passphrase, settings.language);
    } finally {
      passphrase = '';
    }
    return result('passphrase', compare(actual, expected), {
      fingerprint: actual,
      expectedFingerprint: expected
    });
  }

  function bitcoinSettings(settings) {
    var source = settings || {};
    return {
      network: source.network === undefined ? 'mainnet' : source.network,
      scriptType: source.scriptType === undefined ? 'p2wpkh' : source.scriptType,
      account: source.account === undefined ? 0 : source.account,
      change: source.change === undefined ? 0 : source.change,
      start: source.start === undefined ? 0 : source.start,
      count: source.count === undefined ? 1 : source.count
    };
  }

  function verifyXpub(options) {
    var settings = options || {};
    requireLayers();
    var expected = expectedPublicValue(settings.expectedXpub, 'Expected account xpub', 200);
    if (!/^(xpub|tpub|ypub|upub|zpub|vpub)/.test(expected)) {
      throw new TypeError('Expected account xpub has an unsupported extended public-key version.');
    }
    var phrase = text(settings.mnemonic, 'Mnemonic', 1024);
    var password = optionalText(settings.passphrase, 'Passphrase', 1024);
    var languageId = settings.language === undefined ? 'english' : text(settings.language, 'BIP-39 language', 64);
    var seed = null;
    var derived = null;
    try {
      seed = new Uint8Array(seedForge.mnemonicToSeed(phrase, password, languageId));
      derived = derivation.deriveBitcoinFromSeed(seed, bitcoinSettings(settings));
      return result('xpub', compare(derived.xpub, expected), {
        xpub: derived.xpub,
        expectedXpub: expected,
        fingerprint: derived.fingerprint
      });
    } finally {
      zeroBytes(seed);
      seed = null;
      derived = null;
      phrase = '';
      password = '';
      languageId = '';
    }
  }

  function normalizeReceiveAddress(value, network) {
    var normalized = expectedPublicValue(value, 'Expected receive address', 200);
    // Bech32 is case-insensitive. Base58 and EIP-55 are not normalized here;
    // later address-verification work owns checksum-aware comparison.
    if (network === 'mainnet' && /^bc1/i.test(normalized)) {
      return normalized.toLowerCase();
    }
    if (network === 'testnet' && /^tb1/i.test(normalized)) {
      return normalized.toLowerCase();
    }
    return normalized;
  }

  function verifyReceiveAddress(options) {
    var settings = options || {};
    var bitcoin = bitcoinSettings(settings);
    var expected = normalizeReceiveAddress(settings.expectedAddress, bitcoin.network);
    var xpub = expectedPublicValue(settings.xpub, 'Account xpub', 200);
    var derived = derivation.deriveBitcoinFromXpub(xpub, bitcoin);
    var actual = derived.addresses[0];
    var comparableActual = normalizeReceiveAddress(actual, bitcoin.network);
    return result('receive-address', compare(comparableActual, expected), {
      address: actual,
      expectedAddress: expected,
      path: 'account-xpub/' + String(bitcoin.change) + '/' + String(bitcoin.start),
      network: bitcoin.network,
      scriptType: bitcoin.scriptType
    });
  }

  global.__coldboxVerification = Object.freeze({
    verifyFingerprint: verifyFingerprint,
    verifyReceiveAddress: verifyReceiveAddress,
    verifyXpub: verifyXpub,
    verifyBackup: verifyBackup,
    verifyPassphrase: verifyPassphrase
  });
}(window));
