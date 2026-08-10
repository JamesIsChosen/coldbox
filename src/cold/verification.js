(function (global) {
  'use strict';

  // P1.9 is deliberately a cold-local public comparison API. Secret bytes are
  // borrowed from Seed Forge by the caller, used to derive public identity,
  // and never returned or retained by this module.
  var base = global.__coldboxBase;
  var derivation = global.__coldboxDerivation;

  var SCRIPT_TYPES = Object.freeze([
    'p2pkh',
    'p2sh-p2wpkh',
    'p2wpkh',
    'p2tr'
  ]);

  function requireLayers() {
    if (!base || !base.base58check || !base.bech32 || !base.bech32m
      || !derivation || typeof derivation.deriveBitcoinFromSeed !== 'function'
      || typeof derivation.deriveBitcoinFromXpub !== 'function') {
      throw new Error('Verification crypto is unavailable; refusing to verify.');
    }
  }

  function strictAscii(value, label, maximum) {
    if (typeof value !== 'string') {
      throw new TypeError(label + ' must be text.');
    }
    if (value.length === 0 || value.length > maximum || !/^[\x21-\x7e]+$/.test(value)) {
      throw new TypeError(label + ' must be printable ASCII text without surrounding whitespace.');
    }
    return value;
  }

  function expectedFingerprint(value) {
    var normalized = strictAscii(value, 'Expected fingerprint', 8);
    if (!/^[0-9a-fA-F]{8}$/.test(normalized)) {
      throw new TypeError('Expected fingerprint must be exactly 8 hexadecimal characters.');
    }
    return normalized.toLowerCase();
  }

  function expectedPublicValue(value, label, maximum) {
    return strictAscii(value, label, maximum);
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

  function walletSettings(options) {
    var settings = options || {};
    return {
      network: settings.network === undefined ? 'mainnet' : settings.network,
      account: settings.account === undefined ? 0 : settings.account,
      count: settings.count === undefined ? 5 : settings.count
    };
  }

  function deriveWalletIdentity(seed, options) {
    requireLayers();
    if (!(seed instanceof Uint8Array) || seed.length !== 64) {
      throw new TypeError('Seed Forge wallet seed must be exactly 64 bytes.');
    }
    var settings = walletSettings(options);
    var families = [];
    var fingerprint = null;
    try {
      SCRIPT_TYPES.forEach(function (scriptType) {
        var receive = derivation.deriveBitcoinFromSeed(seed, {
          network: settings.network,
          scriptType: scriptType,
          account: settings.account,
          change: 0,
          start: 0,
          count: settings.count
        });
        var change = derivation.deriveBitcoinFromSeed(seed, {
          network: settings.network,
          scriptType: scriptType,
          account: settings.account,
          change: 1,
          start: 0,
          count: settings.count
        });
        if (fingerprint === null) {
          fingerprint = receive.fingerprint;
        }
        families.push(Object.freeze({
          scriptType: scriptType,
          accountPath: receive.accountPath,
          xpub: receive.xpub,
          receiveAddresses: receive.addresses,
          changeAddresses: change.addresses
        }));
      });
      return Object.freeze({
        network: settings.network,
        account: settings.account,
        count: settings.count,
        fingerprint: fingerprint,
        families: Object.freeze(families)
      });
    } finally {
      families = [];
      fingerprint = null;
    }
  }

  function familyFor(wallet, scriptType) {
    if (!wallet || !Array.isArray(wallet.families)) {
      throw new TypeError('A current Seed Forge wallet is required.');
    }
    for (var index = 0; index < wallet.families.length; index += 1) {
      if (wallet.families[index].scriptType === scriptType) {
        return wallet.families[index];
      }
    }
    throw new RangeError('The requested Bitcoin script family is unavailable.');
  }

  function compareFingerprint(actual, expectedValue) {
    var expected = expectedFingerprint(expectedValue);
    if (typeof actual !== 'string' || !/^[0-9a-f]{8}$/.test(actual)) {
      throw new TypeError('The current wallet fingerprint is invalid.');
    }
    return result('fingerprint', compare(actual, expected), {
      fingerprint: actual,
      expectedFingerprint: expected
    });
  }

  function compareXpub(actual, expectedValue, options) {
    requireLayers();
    var settings = walletSettings(options);
    var expected = expectedPublicValue(expectedValue, 'Expected account xpub', 200);
    if (!/^(xpub|tpub|ypub|upub|zpub|vpub)[1-9A-HJ-NP-Za-km-z]+$/.test(expected)) {
      throw new TypeError('Expected account xpub is not canonical Base58 text.');
    }
    derivation.deriveBitcoinFromXpub(expected, {
      network: settings.network,
      scriptType: options && options.scriptType,
      change: 0,
      start: 0,
      count: 1
    });
    return result('xpub', compare(actual, expected), {
      xpub: actual,
      expectedXpub: expected
    });
  }

  function expectedNetworkValues(network) {
    if (network === 'mainnet') {
      return { hrp: 'bc', p2pkh: 0x00, p2sh: 0x05 };
    }
    if (network === 'testnet') {
      return { hrp: 'tb', p2pkh: 0x6f, p2sh: 0xc4 };
    }
    throw new RangeError('Unsupported Bitcoin network.');
  }

  function rejectMixedCase(value, label) {
    var hasLower = value !== value.toUpperCase();
    var hasUpper = value !== value.toLowerCase();
    if (hasLower && hasUpper) {
      throw new TypeError(label + ' must not use mixed Bech32 case.');
    }
  }

  function validateExpectedAddress(value, network, scriptType) {
    requireLayers();
    var expected = expectedPublicValue(value, 'Expected receive address', 200);
    var networkValues = expectedNetworkValues(network);
    if (scriptType === 'p2wpkh' || scriptType === 'p2tr') {
      rejectMixedCase(expected, 'Expected receive address');
      var lower = expected.toLowerCase();
      var decoder = scriptType === 'p2tr' ? base.bech32m : base.bech32;
      var decoded = decoder.decode(lower, 90);
      if (decoded.prefix !== networkValues.hrp || decoded.words.length < 1) {
        throw new TypeError('Expected receive address has the wrong network prefix.');
      }
      var witnessVersion = decoded.words[0];
      var program = decoder.fromWords(decoded.words.slice(1));
      var expectedVersion = scriptType === 'p2tr' ? 1 : 0;
      var expectedLength = scriptType === 'p2tr' ? 32 : 20;
      if (witnessVersion !== expectedVersion || program.length !== expectedLength) {
        throw new TypeError('Expected receive address does not match the selected script type.');
      }
      return lower;
    }

    var decodedBase58 = base.base58check.decode(expected);
    var expectedPrefix = scriptType === 'p2sh-p2wpkh'
      ? networkValues.p2sh
      : networkValues.p2pkh;
    if (decodedBase58.length !== 21 || decodedBase58[0] !== expectedPrefix) {
      throw new TypeError('Expected receive address does not match the selected network or script type.');
    }
    return expected;
  }

  function compareAddress(actual, expectedValue, options) {
    var settings = options || {};
    var expected = validateExpectedAddress(expectedValue, settings.network, settings.scriptType);
    var comparableActual = settings.scriptType === 'p2wpkh' || settings.scriptType === 'p2tr'
      ? actual.toLowerCase()
      : actual;
    return result('receive-address', compare(comparableActual, expected), {
      address: actual,
      expectedAddress: expected,
      path: settings.path,
      network: settings.network,
      scriptType: settings.scriptType
    });
  }

  global.__coldboxVerification = Object.freeze({
    deriveWalletIdentity: deriveWalletIdentity,
    familyFor: familyFor,
    compareFingerprint: compareFingerprint,
    compareXpub: compareXpub,
    compareAddress: compareAddress
  });
}(window));
