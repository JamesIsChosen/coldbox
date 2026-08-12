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
      || typeof derivation.deriveBitcoinFromXpub !== 'function'
      || typeof derivation.deriveEvmFromSeed !== 'function') {
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

  function isEvmAccount(account, wallet) {
    var walletNetwork = wallet && typeof wallet.network === 'string'
      ? wallet.network.toLowerCase()
      : '';
    var asset = account && typeof account.asset === 'string'
      ? account.asset.toLowerCase()
      : '';
    return walletNetwork === 'ethereum'
      || walletNetwork === 'evm'
      || asset === 'eth'
      || asset === 'ethereum'
      || asset === 'evm'
      || (account && typeof account.path === 'string'
        && /^m\/44'\/60'\/\d+'$/.test(account.path));
  }

  function evmAccountIndex(path) {
    if (typeof path !== 'string') {
      throw new TypeError('EVM account path is required for cold verification.');
    }
    var match = /^m\/44'\/60'\/(\d+)'$/.exec(path);
    if (!match) {
      throw new TypeError('EVM account path is not canonical.');
    }
    return Number(match[1]);
  }

  function bitcoinAccountIndex(path) {
    if (typeof path !== 'string') {
      return 0;
    }
    var match = path.match(/\/(\d+)'?$/);
    return match ? Number(match[1]) : 0;
  }

  function deriveRegistryAddress(seed, account, wallet, address) {
    requireLayers();
    if (!account || typeof account !== 'object' || !address || typeof address !== 'object') {
      throw new TypeError('A public account and address record are required.');
    }
    if (!Number.isInteger(address.index) || address.index < 0) {
      throw new TypeError('The recorded address index is invalid.');
    }
    var change = address.isChange === true ? 1 : 0;
    var index = address.index;
    if (isEvmAccount(account, wallet)) {
      var evm = derivation.deriveEvmFromSeed(seed, {
        account: evmAccountIndex(account.path),
        change: change,
        start: index,
        count: 1
      });
      if (evm.accountPath !== account.path || (account.xpub && account.xpub !== evm.xpub)) {
        throw new Error('The recorded EVM account does not match the current seed.');
      }
      return Object.freeze({
        network: 'evm',
        address: evm.addresses[0],
        path: evm.paths[0],
        xpub: evm.xpub
      });
    }

    var identity = deriveWalletIdentity(seed, {
      network: wallet && wallet.network === 'testnet' ? 'testnet' : 'mainnet',
      account: bitcoinAccountIndex(account.path),
      count: Math.max(5, index + 1)
    });
    var family = account.xpub
      ? identity.families.filter(function (entry) { return entry.xpub === account.xpub; })[0]
      : familyFor(identity, wallet && wallet.scriptType ? wallet.scriptType : 'p2wpkh');
    var addresses = family && (change === 1 ? family.changeAddresses : family.receiveAddresses);
    if (!family || !addresses || !addresses[index]) {
      throw new Error('The recorded Bitcoin address is outside the derived range.');
    }
    return Object.freeze({
      network: 'bitcoin',
      address: addresses[index],
      path: family.accountPath + '/' + String(change) + '/' + String(index),
      xpub: family.xpub
    });
  }

  function markAddressColdVerified(publicData, addressId, verifiedAt, xpub) {
    if (!publicData || typeof publicData !== 'object' || typeof addressId !== 'string'
      || typeof verifiedAt !== 'string' || typeof xpub !== 'string') {
      throw new TypeError('Cold verification evidence is incomplete.');
    }
    var nextPublicData = JSON.parse(JSON.stringify(publicData));
    var nextAddress = Array.isArray(nextPublicData.addresses)
      ? nextPublicData.addresses.filter(function (record) { return record.id === addressId; })[0]
      : null;
    if (!nextAddress) {
      throw new Error('The recorded address disappeared before verification could be saved.');
    }
    nextAddress.verificationState = 'cold-verified';
    nextAddress.addressOrigin = 'derived';
    nextAddress.lastColdVerifiedAt = verifiedAt;
    nextAddress.verifiedAgainstXpub = xpub;
    return nextPublicData;
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
    deriveRegistryAddress: deriveRegistryAddress,
    markAddressColdVerified: markAddressColdVerified,
    familyFor: familyFor,
    compareFingerprint: compareFingerprint,
    compareXpub: compareXpub,
    compareAddress: compareAddress
  });
}(window));
