(function (global) {
  'use strict';

  // This module is intentionally cold-realm only. Its low-level node API can
  // hold private key material, while the high-level Bitcoin helpers return a
  // public projection suitable for the existing protocol schema.
  var bip32 = global.__coldboxBip32;
  var noble = global.__coldboxNobleCrypto;
  var base = global.__coldboxBase;
  var secp = global.__coldboxSecp256k1;

  if (!bip32 || !bip32.HDKey || !noble || typeof noble.sha256 !== 'function'
    || typeof noble.ripemd160 !== 'function' || typeof noble.utf8ToBytes !== 'function'
    || typeof noble.keccak256 !== 'function'
    || !base || !base.base58check
    || !base.bech32 || !base.bech32m || !secp || !secp.Point) {
    throw new Error('Coldbox derivation engine dependencies are unavailable.');
  }

  var HARDENED_OFFSET = 0x80000000;
  var MAX_INDEX = HARDENED_OFFSET - 1;
  var MAX_BATCH = 1000;
  var EVM_COIN_TYPE = 60;
  var EVM_PURPOSE = 44;
  var EVM_ACCOUNT_DEPTH = 3;
  var SCRIPT_TYPES = Object.freeze([
    'p2pkh',
    'p2sh-p2wpkh',
    'p2wpkh',
    'p2tr'
  ]);
  var SCRIPT_SET = Object.freeze({
    p2pkh: true,
    'p2sh-p2wpkh': true,
    p2wpkh: true,
    p2tr: true
  });
  var NETWORKS = Object.freeze({
    mainnet: Object.freeze({
      id: 'mainnet',
      coinType: 0,
      hrp: 'bc',
      p2pkhVersion: 0x00,
      p2shVersion: 0x05,
      wifVersion: 0x80
    }),
    testnet: Object.freeze({
      id: 'testnet',
      coinType: 1,
      hrp: 'tb',
      p2pkhVersion: 0x6f,
      p2shVersion: 0xc4,
      wifVersion: 0xef
    })
  });
  var PURPOSES = Object.freeze({
    p2pkh: 44,
    'p2sh-p2wpkh': 49,
    p2wpkh: 84,
    p2tr: 86
  });
  var VERSION_BYTES = Object.freeze({
    mainnet: Object.freeze({
      p2pkh: Object.freeze({ private: 0x0488ade4, public: 0x0488b21e }),
      'p2sh-p2wpkh': Object.freeze({ private: 0x049d7878, public: 0x049d7cb2 }),
      p2wpkh: Object.freeze({ private: 0x04b2430c, public: 0x04b24746 }),
      p2tr: Object.freeze({ private: 0x0488ade4, public: 0x0488b21e })
    }),
    testnet: Object.freeze({
      p2pkh: Object.freeze({ private: 0x04358394, public: 0x043587cf }),
      'p2sh-p2wpkh': Object.freeze({ private: 0x044a4e28, public: 0x044a5262 }),
      p2wpkh: Object.freeze({ private: 0x045f18bc, public: 0x045f1cf6 }),
      p2tr: Object.freeze({ private: 0x04358394, public: 0x043587cf })
    })
  });
  var SECP256K1_ORDER = secp.Point.Fn.ORDER;

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isBytes(value) {
    return Object.prototype.toString.call(value) === '[object Uint8Array]';
  }

  function copyBytes(value, label, minimum, maximum) {
    if (!isBytes(value) || value.length < minimum || value.length > maximum) {
      throw new TypeError(label + ' must be a Uint8Array between ' + String(minimum)
        + ' and ' + String(maximum) + ' bytes.');
    }
    return new Uint8Array(value);
  }

  function zeroBytes(value) {
    if (value && typeof value.fill === 'function') {
      value.fill(0);
    }
  }

  function concatBytes() {
    var total = 0;
    var values = Array.prototype.slice.call(arguments);
    values.forEach(function (value) {
      total += value.length;
    });
    var result = new Uint8Array(total);
    var offset = 0;
    values.forEach(function (value) {
      result.set(value, offset);
      offset += value.length;
    });
    return result;
  }

  function networkFor(value) {
    var network = value === undefined ? 'mainnet' : value;
    if (!hasOwn(NETWORKS, network)) {
      throw new RangeError('Unsupported Bitcoin network: ' + String(network) + '.');
    }
    return NETWORKS[network];
  }

  function scriptTypeFor(value) {
    var scriptType = value === undefined ? 'p2wpkh' : value;
    if (!hasOwn(SCRIPT_SET, scriptType)) {
      throw new RangeError('Unsupported Bitcoin script type: ' + String(scriptType) + '.');
    }
    return scriptType;
  }

  function integerOption(value, name, minimum, maximum, defaultValue) {
    var result = value === undefined ? defaultValue : value;
    if (!Number.isInteger(result) || result < minimum || result > maximum) {
      throw new RangeError(name + ' must be an integer between ' + String(minimum)
        + ' and ' + String(maximum) + '.');
    }
    return result;
  }

  function assertBatchFits(start, count) {
    if (start > MAX_INDEX - (count - 1)) {
      throw new RangeError('start plus count exceeds the non-hardened derivation range.');
    }
  }

  function parseFullPath(path) {
    if (typeof path !== 'string' || !/^(?:m|M)(?:\/[0-9]+(?:')?)*$/.test(path)) {
      throw new TypeError('BIP-32 path must start at m and contain decimal indices.');
    }
    var parts = path.split('/');
    var segments = [];
    var normalized = ['m'];
    for (var index = 1; index < parts.length; index += 1) {
      var component = parts[index];
      var hardened = component.endsWith("'");
      var digits = hardened ? component.slice(0, -1) : component;
      if (digits.length > 1 && digits[0] === '0') {
        throw new RangeError('BIP-32 path contains a non-canonical leading zero.');
      }
      var child = Number(digits);
      if (!Number.isSafeInteger(child) || child < 0 || child > MAX_INDEX) {
        throw new RangeError('BIP-32 path index is outside the valid range.');
      }
      segments.push(hardened ? child + HARDENED_OFFSET : child);
      normalized.push(String(child) + (hardened ? "'" : ''));
    }
    return Object.freeze({ segments: Object.freeze(segments), normalized: normalized.join('/') });
  }

  function accountPath(network, scriptType, account) {
    var purpose = PURPOSES[scriptType];
    return "m/" + String(purpose) + "'/" + String(network.coinType) + "'/" + String(account) + "'";
  }

  function versionBytes(network, scriptType) {
    return VERSION_BYTES[network.id][scriptType];
  }

  function createRoot(seed, network, scriptType) {
    var seedCopy = copyBytes(seed, 'BIP-32 seed', 16, 64);
    try {
      return bip32.HDKey.fromMasterSeed(seedCopy, versionBytes(network, scriptType));
    } finally {
      zeroBytes(seedCopy);
    }
  }

  function wipeNode(node) {
    if (node && typeof node.wipePrivateData === 'function') {
      node.wipePrivateData();
    }
  }

  function deriveSegments(root, segments) {
    var current = root;
    for (var index = 0; index < segments.length; index += 1) {
      var next;
      try {
        next = current.deriveChild(segments[index]);
      } catch (error) {
        wipeNode(current);
        throw error;
      }
      wipeNode(current);
      current = next;
    }
    return current;
  }

  function formatFingerprint(value) {
    return (value >>> 0).toString(16).padStart(8, '0');
  }

  function hash160(bytes) {
    return noble.ripemd160(noble.sha256(bytes));
  }

  function checksumAddressFromHex(hex) {
    if (typeof hex !== 'string' || !/^[0-9a-f]{40}$/.test(hex)) {
      throw new TypeError('EVM addresses must contain exactly 20 bytes of hexadecimal data.');
    }
    var hashInput = noble.utf8ToBytes(hex);
    var checksum = noble.keccak256(hashInput);
    var result = '';
    try {
      for (var index = 0; index < hex.length; index += 1) {
        var character = hex[index];
        if (character >= 'a' && character <= 'f') {
          var nibble = (checksum[Math.floor(index / 2)]
            >> (index % 2 === 0 ? 4 : 0)) & 0x0f;
          result += nibble >= 8 ? character.toUpperCase() : character;
        } else {
          result += character;
        }
      }
      return '0x' + result;
    } finally {
      zeroBytes(hashInput);
      zeroBytes(checksum);
    }
  }

  function eip55Address(publicKey) {
    if (!isBytes(publicKey) || (publicKey.length !== 33 && publicKey.length !== 65)) {
      throw new TypeError('EVM public keys must be compressed or uncompressed secp256k1 points.');
    }
    var point = secp.Point.fromBytes(publicKey);
    var uncompressed = point.toBytes(false);
    var keyBytes = uncompressed.slice(1);
    var digest = noble.keccak256(keyBytes);
    var addressBytes = digest.slice(-20);
    try {
      return checksumAddressFromHex(bytesToHex(addressBytes));
    } finally {
      zeroBytes(uncompressed);
      zeroBytes(keyBytes);
      zeroBytes(digest);
      zeroBytes(addressBytes);
    }
  }

  function isEvmAddress(value) {
    if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      return false;
    }
    var body = value.slice(2);
    if (body === body.toLowerCase() || body === body.toUpperCase()) {
      return true;
    }
    return checksumAddressFromHex(body.toLowerCase()) === value;
  }

  function bytesToHex(bytes) {
    var result = '';
    for (var index = 0; index < bytes.length; index += 1) {
      result += bytes[index].toString(16).padStart(2, '0');
    }
    return result;
  }

  function bytesToBigInt(bytes) {
    var result = 0n;
    for (var index = 0; index < bytes.length; index += 1) {
      result = (result << 8n) | BigInt(bytes[index]);
    }
    return result;
  }

  function taggedHash(tag, message) {
    var tagBytes = noble.utf8ToBytes(tag);
    var tagHash = noble.sha256(tagBytes);
    var input = concatBytes(tagHash, tagHash, message);
    try {
      return noble.sha256(input);
    } finally {
      zeroBytes(tagBytes);
      zeroBytes(tagHash);
      zeroBytes(input);
    }
  }

  function taprootOutputKey(publicKey) {
    if (typeof BigInt !== 'function') {
      throw new Error('Taproot derivation requires BigInt support.');
    }
    var point = secp.Point.fromBytes(publicKey);
    if (!point.hasEvenY()) {
      point = point.negate();
    }
    var uncompressed = point.toBytes(false);
    var internalKey = uncompressed.slice(1, 33);
    var tweakHash = taggedHash('TapTweak', internalKey);
    var tweak = bytesToBigInt(tweakHash);
    try {
      if (tweak >= SECP256K1_ORDER) {
        throw new Error('Taproot tweak is outside the secp256k1 order.');
      }
      var outputPoint = point.add(secp.Point.BASE.multiply(tweak));
      if (outputPoint.is0()) {
        throw new Error('Taproot output key is the point at infinity.');
      }
      return outputPoint.toBytes(false).slice(1, 33);
    } finally {
      zeroBytes(uncompressed);
      zeroBytes(internalKey);
      zeroBytes(tweakHash);
    }
  }

  function witnessAddress(hrp, version, program, encoding) {
    var words = encoding.toWords(program);
    return encoding.encode(hrp, [version].concat(words));
  }

  function addressFromPublicKey(publicKey, scriptType, networkName) {
    var network = networkFor(networkName);
    var type = scriptTypeFor(scriptType);
    if (!isBytes(publicKey) || publicKey.length !== 33
      || (publicKey[0] !== 2 && publicKey[0] !== 3)) {
      throw new TypeError('Bitcoin public keys must be 33-byte compressed secp256k1 points.');
    }
    // Hashing a syntactically compressed byte string is not enough: every
    // script family must reject bytes that are not a real secp256k1 point.
    secp.Point.fromBytes(publicKey);
    var keyHash = hash160(publicKey);
    if (type === 'p2pkh') {
      return base.base58check.encode(concatBytes(new Uint8Array([network.p2pkhVersion]), keyHash));
    }
    if (type === 'p2sh-p2wpkh') {
      var redeemScript = concatBytes(new Uint8Array([0x00, 0x14]), keyHash);
      var scriptHash = hash160(redeemScript);
      zeroBytes(redeemScript);
      return base.base58check.encode(concatBytes(new Uint8Array([network.p2shVersion]), scriptHash));
    }
    if (type === 'p2wpkh') {
      return witnessAddress(network.hrp, 0, keyHash, base.bech32);
    }
    return witnessAddress(network.hrp, 1, taprootOutputKey(publicKey), base.bech32m);
  }

  function nodeProjection(node, path) {
    var publicKey = new Uint8Array(node.publicKey);
    return Object.freeze({
      path: path,
      depth: node.depth,
      index: node.index,
      fingerprint: formatFingerprint(node.fingerprint),
      xpub: node.publicExtendedKey,
      publicKey: publicKey,
      publicKeyHex: bytesToHex(publicKey)
    });
  }

  function deriveNode(seed, path, options) {
    var settings = options || {};
    var network = networkFor(settings.network);
    var scriptType = scriptTypeFor(settings.scriptType === undefined ? 'p2pkh' : settings.scriptType);
    var parsed = parseFullPath(path);
    var root = null;
    try {
      root = createRoot(seed, network, scriptType);
      return deriveSegments(root, parsed.segments);
    } catch (error) {
      wipeNode(root);
      throw error;
    }
  }

  function deriveNodeProjection(seed, path, options) {
    var node = deriveNode(seed, path, options);
    try {
      return nodeProjection(node, parseFullPath(path).normalized);
    } finally {
      wipeNode(node);
    }
  }

  function wifFromPrivateKey(privateKey, network) {
    if (!isBytes(privateKey) || privateKey.length !== 32) {
      throw new TypeError('WIF conversion requires a 32-byte private key.');
    }
    var payload = concatBytes(
      new Uint8Array([network.wifVersion]),
      privateKey,
      new Uint8Array([1])
    );
    try {
      return base.base58check.encode(payload);
    } finally {
      zeroBytes(payload);
    }
  }

  function deriveArbitraryFromSeed(seed, path, options) {
    var settings = options || {};
    var network = networkFor(settings.network);
    var parsed = parseFullPath(path);
    var node = deriveNode(seed, parsed.normalized, {
      network: network.id,
      scriptType: 'p2pkh'
    });
    var privateKey = null;
    var publicKey = null;
    var succeeded = false;
    try {
      if (!node.privateKey || node.privateKey.length !== 32) {
        throw new Error('Arbitrary derivation did not produce a private key.');
      }
      privateKey = new Uint8Array(node.privateKey);
      publicKey = new Uint8Array(node.publicKey);
      var result = Object.freeze({
        network: network.id,
        path: parsed.normalized,
        depth: node.depth,
        index: node.index,
        fingerprint: formatFingerprint(node.fingerprint),
        xprv: node.privateExtendedKey,
        xpub: node.publicExtendedKey,
        privateKey: privateKey,
        privateKeyHex: bytesToHex(privateKey),
        publicKey: publicKey,
        publicKeyHex: bytesToHex(publicKey),
        wif: wifFromPrivateKey(privateKey, network)
      });
      succeeded = true;
      return result;
    } finally {
      if (!succeeded && privateKey) {
        zeroBytes(privateKey);
      }
      if (!succeeded && publicKey) {
        zeroBytes(publicKey);
      }
      wipeNode(node);
    }
  }

  function deriveBitcoinFromSeed(seed, options) {
    var settings = options || {};
    var network = networkFor(settings.network);
    var scriptType = scriptTypeFor(settings.scriptType);
    var account = integerOption(settings.account, 'account', 0, MAX_INDEX, 0);
    var change = integerOption(settings.change, 'change', 0, 1, 0);
    var start = integerOption(settings.start, 'start', 0, MAX_INDEX, 0);
    var count = integerOption(settings.count, 'count', 1, MAX_BATCH, 20);
    assertBatchFits(start, count);
    var accountRootPath = accountPath(network, scriptType, account);
    var root = null;
    var accountNode = null;
    var chainNode = null;
    var addresses = [];
    try {
      root = createRoot(seed, network, scriptType);
      var fingerprint = formatFingerprint(root.fingerprint);
      accountNode = deriveSegments(root, parseFullPath(accountRootPath).segments);
      var xpub = accountNode.publicExtendedKey;
      chainNode = accountNode.deriveChild(change);
      wipeNode(accountNode);
      accountNode = null;
      for (var offset = 0; offset < count; offset += 1) {
        var index = start + offset;
        var child = chainNode.deriveChild(index);
        try {
          var publicKey = new Uint8Array(child.publicKey);
          try {
            addresses.push(addressFromPublicKey(publicKey, scriptType, network.id));
          } finally {
            zeroBytes(publicKey);
          }
        } finally {
          wipeNode(child);
        }
      }
      return Object.freeze({
        network: network.id,
        scriptType: scriptType,
        account: account,
        change: change,
        accountPath: accountRootPath,
        fingerprint: fingerprint,
        xpub: xpub,
        addresses: Object.freeze(addresses)
      });
    } finally {
      wipeNode(chainNode);
      wipeNode(accountNode);
      wipeNode(root);
    }
  }

  var VERSION_PREFIXES = Object.freeze({
    xpub: Object.freeze({ network: 'mainnet', scriptType: 'p2pkh' }),
    tpub: Object.freeze({ network: 'testnet', scriptType: 'p2pkh' }),
    ypub: Object.freeze({ network: 'mainnet', scriptType: 'p2sh-p2wpkh' }),
    upub: Object.freeze({ network: 'testnet', scriptType: 'p2sh-p2wpkh' }),
    zpub: Object.freeze({ network: 'mainnet', scriptType: 'p2wpkh' }),
    vpub: Object.freeze({ network: 'testnet', scriptType: 'p2wpkh' })
  });

  function publicVersionInfo(xpub) {
    if (typeof xpub !== 'string') {
      throw new TypeError('Extended public key must be text.');
    }
    var prefix = xpub.slice(0, 4);
    if (!hasOwn(VERSION_PREFIXES, prefix)) {
      throw new TypeError('Unsupported extended public-key version.');
    }
    return VERSION_PREFIXES[prefix];
  }

  function deriveBitcoinFromXpub(xpub, options) {
    var settings = options || {};
    var detected = publicVersionInfo(xpub);
    var network = networkFor(settings.network === undefined ? detected.network : settings.network);
    var scriptType = scriptTypeFor(settings.scriptType === undefined ? detected.scriptType : settings.scriptType);
    var change = integerOption(settings.change, 'change', 0, 1, 0);
    var start = integerOption(settings.start, 'start', 0, MAX_INDEX, 0);
    var count = integerOption(settings.count, 'count', 1, MAX_BATCH, 20);
    assertBatchFits(start, count);
    if (settings.network !== undefined && network.id !== detected.network) {
      throw new RangeError('Extended public-key network does not match the requested network.');
    }
    if (settings.scriptType !== undefined
      && detected.scriptType !== 'p2pkh' && scriptType !== detected.scriptType) {
      throw new RangeError('Extended public-key version does not match the requested script type.');
    }
    var accountNode = null;
    var chainNode = null;
    var addresses = [];
    try {
      accountNode = bip32.HDKey.fromExtendedKey(xpub, versionBytes(network, detected.scriptType));
      if (accountNode.depth !== 3 || accountNode.index < HARDENED_OFFSET) {
        throw new TypeError('Watch-only Bitcoin derivation requires a depth-3 hardened account-level extended public key.');
      }
      chainNode = deriveSegments(accountNode, [change]);
      wipeNode(accountNode);
      accountNode = null;
      for (var offset = 0; offset < count; offset += 1) {
        var index = start + offset;
        var child = chainNode.deriveChild(index);
        try {
          addresses.push(addressFromPublicKey(child.publicKey, scriptType, network.id));
        } finally {
          wipeNode(child);
        }
      }
      return Object.freeze({
        network: network.id,
        scriptType: scriptType,
        account: null,
        change: change,
        accountPath: null,
        xpub: xpub,
        fingerprint: null,
        accountFingerprint: formatFingerprint(chainNode.parentFingerprint),
        addresses: Object.freeze(addresses)
      });
    } finally {
      wipeNode(chainNode);
      wipeNode(accountNode);
    }
  }

  function evmAccountPath(account) {
    return 'm/' + String(EVM_PURPOSE) + "'/" + String(EVM_COIN_TYPE) + "'/"
      + String(account) + "'";
  }

  function deriveEvmFromSeed(seed, options) {
    var settings = options || {};
    var network = NETWORKS.mainnet;
    var account = integerOption(settings.account, 'account', 0, MAX_INDEX, 0);
    var change = integerOption(settings.change, 'change', 0, MAX_INDEX, 0);
    var start = integerOption(settings.start, 'start', 0, MAX_INDEX, 0);
    var count = integerOption(settings.count, 'count', 1, MAX_BATCH, 20);
    assertBatchFits(start, count);
    var accountRootPath = evmAccountPath(account);
    var root = null;
    var accountNode = null;
    var chainNode = null;
    var addresses = [];
    var paths = [];
    try {
      root = createRoot(seed, network, 'p2pkh');
      var fingerprint = formatFingerprint(root.fingerprint);
      accountNode = deriveSegments(root, parseFullPath(accountRootPath).segments);
      var xpub = accountNode.publicExtendedKey;
      chainNode = accountNode.deriveChild(change);
      wipeNode(accountNode);
      accountNode = null;
      for (var offset = 0; offset < count; offset += 1) {
        var index = start + offset;
        var child = chainNode.deriveChild(index);
        try {
          var publicKey = new Uint8Array(child.publicKey);
          try {
            addresses.push(eip55Address(publicKey));
            paths.push(accountRootPath + '/' + String(change) + '/' + String(index));
          } finally {
            zeroBytes(publicKey);
          }
        } finally {
          wipeNode(child);
        }
      }
      return Object.freeze({
        network: 'evm',
        account: account,
        change: change,
        accountPath: accountRootPath,
        fingerprint: fingerprint,
        xpub: xpub,
        addresses: Object.freeze(addresses),
        paths: Object.freeze(paths)
      });
    } finally {
      wipeNode(chainNode);
      wipeNode(accountNode);
      wipeNode(root);
    }
  }

  function deriveEvmFromXpub(xpub, options) {
    var settings = options || {};
    if (typeof xpub !== 'string' || xpub.slice(0, 4) !== 'xpub') {
      throw new TypeError('EVM watch-only derivation requires a mainnet xpub.');
    }
    var change = integerOption(settings.change, 'change', 0, MAX_INDEX, 0);
    var start = integerOption(settings.start, 'start', 0, MAX_INDEX, 0);
    var count = integerOption(settings.count, 'count', 1, MAX_BATCH, 20);
    assertBatchFits(start, count);
    var accountNode = null;
    var chainNode = null;
    var addresses = [];
    var paths = [];
    try {
      accountNode = bip32.HDKey.fromExtendedKey(
        xpub,
        versionBytes(NETWORKS.mainnet, 'p2pkh')
      );
      if (accountNode.depth !== EVM_ACCOUNT_DEPTH || accountNode.index < HARDENED_OFFSET) {
        throw new TypeError('EVM watch-only derivation requires a depth-3 hardened account-level xpub.');
      }
      var accountFingerprint = formatFingerprint(accountNode.fingerprint);
      var account = accountNode.index >= HARDENED_OFFSET
        ? accountNode.index - HARDENED_OFFSET
        : accountNode.index;
      chainNode = accountNode.deriveChild(change);
      wipeNode(accountNode);
      accountNode = null;
      for (var offset = 0; offset < count; offset += 1) {
        var index = start + offset;
        var child = chainNode.deriveChild(index);
        try {
          var publicKey = new Uint8Array(child.publicKey);
          try {
            addresses.push(eip55Address(publicKey));
            paths.push(evmAccountPath(account) + '/' + String(change) + '/' + String(index));
          } finally {
            zeroBytes(publicKey);
          }
        } finally {
          wipeNode(child);
        }
      }
      return Object.freeze({
        network: 'evm',
        account: null,
        change: change,
        accountPath: null,
        fingerprint: null,
        accountFingerprint: accountFingerprint,
        xpub: xpub,
        addresses: Object.freeze(addresses),
        paths: Object.freeze(paths)
      });
    } finally {
      wipeNode(chainNode);
      wipeNode(accountNode);
    }
  }

  function deriveArbitraryFromXpub(xpub, path, options) {
    var settings = options || {};
    var detected = publicVersionInfo(xpub);
    var network = networkFor(settings.network === undefined ? detected.network : settings.network);
    if (network.id !== detected.network) {
      throw new RangeError('Extended public-key network does not match the requested network.');
    }
    var parsed = parseFullPath(path);
    if (parsed.segments.some(function (segment) { return segment >= HARDENED_OFFSET; })) {
      throw new RangeError('Arbitrary watch-only derivation cannot include hardened children.');
    }
    var node = null;
    try {
      node = bip32.HDKey.fromExtendedKey(xpub, versionBytes(network, detected.scriptType));
      var result = deriveSegments(node, parsed.segments);
      node = null;
      try {
        return nodeProjection(result, parsed.normalized);
      } finally {
        wipeNode(result);
      }
    } finally {
      wipeNode(node);
    }
  }

  // P1.4a: the Derivation paths surface must show a chain's SLIP-44 coin type
  // and its default account path without re-implementing either fact. These
  // three wrappers expose the existing internals rather than letting the UI
  // carry a second copy of the purpose and coin-type tables, which would be
  // free to drift away from the tables the derivation itself uses.
  function bitcoinAccountPathFor(networkName, scriptType, account) {
    return accountPath(
      networkFor(networkName),
      scriptTypeFor(scriptType),
      integerOption(account, 'account', 0, MAX_INDEX, 0)
    );
  }

  function evmAccountPathFor(account) {
    return evmAccountPath(integerOption(account, 'account', 0, MAX_INDEX, 0));
  }

  function coinTypeFor(networkName) {
    return networkFor(networkName).coinType;
  }

  var api = Object.freeze({
    constants: Object.freeze({
      hardenedOffset: HARDENED_OFFSET,
      maxBatch: MAX_BATCH,
      scriptTypes: SCRIPT_TYPES,
      networks: Object.freeze(['mainnet', 'testnet']),
      evmCoinType: EVM_COIN_TYPE
    }),
    bitcoinAccountPath: bitcoinAccountPathFor,
    evmAccountPath: evmAccountPathFor,
    coinType: coinTypeFor,
    parsePath: parseFullPath,
    deriveNode: deriveNode,
    deriveNodeProjection: deriveNodeProjection,
    addressFromPublicKey: addressFromPublicKey,
    taprootOutputKey: taprootOutputKey,
    deriveBitcoinFromSeed: deriveBitcoinFromSeed,
    deriveBitcoinFromXpub: deriveBitcoinFromXpub,
    deriveArbitraryFromSeed: deriveArbitraryFromSeed,
    deriveArbitraryFromXpub: deriveArbitraryFromXpub,
    checksumEvmAddress: checksumAddressFromHex,
    eip55Address: eip55Address,
    isEvmAddress: isEvmAddress,
    deriveEvmFromSeed: deriveEvmFromSeed,
    deriveEvmFromXpub: deriveEvmFromXpub
  });

  Object.defineProperty(global, '__coldboxDerivation', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
