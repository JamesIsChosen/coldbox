(function (global) {
  'use strict';

  var cryptoLayer = global.__coldboxCrypto;
  var noble = global.__coldboxNobleCrypto;
  var MAGIC = new Uint8Array([67, 66, 88, 86, 65, 85, 76, 84]);
  var FORMAT_VERSION = 1;
  var HEADER_LENGTH = 65;
  var PADDING_BLOCK = 64 * 1024;
  var SALT_LENGTH = 32;
  var NONCE_LENGTH = 12;
  var TAG_LENGTH = 16;
  var DEK_LENGTH = 32;
  var WRAPPED_DEK_LENGTH = DEK_LENGTH + TAG_LENGTH;
  var MAX_VAULT_BYTES = 64 * 1024 * 1024;
  var KDF_ARGON2ID = 1;
  var KDF_PBKDF2 = 2;
  var CIPHER_AES_GCM = 1;
  var METHOD_PASSPHRASE = 1;
  var METHOD_PASSPHRASE_KEYFILE = 2;
  var METHOD_RECOVERY_SHARES = 3;
  var RECOVERY_METHOD_DATA_VERSION = 1;
  var RECOVERY_METHOD_DATA_PREFIX_LENGTH = 8;
  var MAX_RECOVERY_GROUPS = 16;
  var RECOVERY_HEADER_MARKER = 0x80000000;
  var MAX_WRAPPED_BLOCK_LENGTH = 65535;
  var PUBLIC_SCHEMA_VERSION = 2;
  var MAX_VAULT_NAME_LENGTH = 80;
  var ERROR_MESSAGE = 'Vault authentication failed.';
  var SERIALIZE_ERROR = 'Vault serialization failed.';
  var SIZE_LIMIT_ERROR = 'Vault exceeds the 64 MiB size limit.';
  // Implementation limits, not wire-format fields, matching the pattern the
  // vault-size limit already establishes (vault-format.md's "Implementation
  // size limit"). See ADR-0014 for why these two numbers were chosen.
  var MAX_KEYFILE_BYTES = 64 * 1024 * 1024;
  var MAX_KEYFILE_HINT_BYTES = 255;
  var PROFILES = cryptoLayer && cryptoLayer.profiles;

  function authenticationError() {
    return new Error(ERROR_MESSAGE);
  }

  function serializationError() {
    return new Error(SERIALIZE_ERROR);
  }

  function sizeLimitError() {
    var error = new Error(SIZE_LIMIT_ERROR);
    error.code = 'VAULT_SIZE_LIMIT';
    return error;
  }

  function isSizeLimitError(error) {
    return Boolean(error && error.code === 'VAULT_SIZE_LIMIT');
  }

  function isBytes(value) {
    var tag = Object.prototype.toString.call(value);
    return tag === '[object Uint8Array]' || tag === '[object ArrayBuffer]';
  }

  function copyBytes(value) {
    if (!isBytes(value)) {
      throw new Error('Expected bytes.');
    }
    if (Object.prototype.toString.call(value) === '[object ArrayBuffer]') {
      return new Uint8Array(value.slice(0));
    }
    return new Uint8Array(value);
  }

  function concatBytes(parts) {
    var total = 0;
    parts.forEach(function (part) {
      total += part.length;
    });
    var output = new Uint8Array(total);
    var offset = 0;
    parts.forEach(function (part) {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function zeroBytes(value) {
    if (value && typeof value.fill === 'function') {
      value.fill(0);
    }
  }

  function rootAttribute(name) {
    var documentObject = global.document;
    var root = documentObject && documentObject.documentElement;
    if (!root || typeof root.getAttribute !== 'function') {
      return null;
    }
    return root.getAttribute(name);
  }

  function vaultHealthReady() {
    var cryptoState = rootAttribute('data-crypto-state');
    return rootAttribute('data-cold-state') === 'ready'
      && rootAttribute('data-csp-canary') === 'passed'
      && rootAttribute('data-runtime-neutering') === 'installed'
      && rootAttribute('data-provider-neutering') === 'installed'
      && rootAttribute('data-capability-randomValues') === 'true'
      && (cryptoState === 'ready' || cryptoState === 'fallback')
      && rootAttribute('data-airgap-state') === 'green'
      && rootAttribute('data-lockdown-state') === 'none'
      && rootAttribute('data-vault-operations') === 'guarded';
  }

  function requireVaultHealth(errorFactory) {
    if (!vaultHealthReady()) {
      throw errorFactory();
    }
  }

  function networkState() {
    // P0.19: vault mode authority comes only from the validated warm-shell
    // mode.set message that cold main records on the document root. The cold
    // vault layer must not independently reinterpret navigator.onLine (or any
    // other browser interface hint), because warm active reachability probes
    // are deliberately the authoritative classification. Missing/invalid
    // state remains unknown and therefore fails closed for secret-capable use.
    var warmOnline = rootAttribute('data-warm-network-online');
    if (warmOnline === 'true') {
      return 'online';
    }
    if (warmOnline === 'false') {
      return 'offline';
    }
    return 'unknown';
  }

  function resolveMode(mode) {
    requireVaultHealth(authenticationError);
    if (mode === 'online') {
      return 'online';
    }
    if (mode === 'offline') {
      if (networkState() !== 'offline') {
        throw authenticationError();
      }
      return 'offline';
    }
    return networkState() === 'offline' ? 'offline' : 'online';
  }

  function writeUint16(output, offset, value) {
    output[offset] = (value >>> 8) & 0xff;
    output[offset + 1] = value & 0xff;
  }

  function writeUint32(output, offset, value) {
    output[offset] = (value >>> 24) & 0xff;
    output[offset + 1] = (value >>> 16) & 0xff;
    output[offset + 2] = (value >>> 8) & 0xff;
    output[offset + 3] = value & 0xff;
  }

  function readUint16(input, offset) {
    return (input[offset] << 8) | input[offset + 1];
  }

  function readUint32(input, offset) {
    return ((input[offset] * 0x1000000)
      + (input[offset + 1] << 16)
      + (input[offset + 2] << 8)
      + input[offset + 3]);
  }

  function textEncoder() {
    if (typeof global.TextEncoder !== 'function') {
      throw new Error('UTF-8 encoding is unavailable.');
    }
    return new global.TextEncoder();
  }

  function textDecoder() {
    if (typeof global.TextDecoder !== 'function') {
      throw new Error('UTF-8 decoding is unavailable.');
    }
    return new global.TextDecoder('utf-8', { fatal: true });
  }

  function jsonBytes(value) {
    var serialized = JSON.stringify(value);
    if (typeof serialized !== 'string') {
      throw new Error('Vault data is not JSON serializable.');
    }
    return textEncoder().encode(serialized);
  }

  function paddedJson(value) {
    var content = jsonBytes(value);
    if (content.length > 0xffffffff - 4) {
      throw new Error('Vault compartment is too large.');
    }
    var paddedLength = Math.ceil((content.length + 4) / PADDING_BLOCK) * PADDING_BLOCK;
    if (paddedLength > MAX_VAULT_BYTES) {
      throw sizeLimitError();
    }
    var output = new Uint8Array(paddedLength);
    writeUint32(output, 0, content.length);
    output.set(content, 4);
    if (paddedLength > content.length + 4) {
      output.set(cryptoLayer.randomBytes(paddedLength - content.length - 4), content.length + 4);
    }
    return output;
  }

  function paddedJsonAtLength(value, length) {
    var content = jsonBytes(value);
    if (content.length + 4 > length || length % PADDING_BLOCK !== 0) {
      throw serializationError();
    }
    var output = new Uint8Array(length);
    writeUint32(output, 0, content.length);
    output.set(content, 4);
    if (length > content.length + 4) {
      output.set(cryptoLayer.randomBytes(length - content.length - 4), content.length + 4);
    }
    return output;
  }

  function parsePaddedJson(value) {
    if (!value || value.length === 0 || value.length % PADDING_BLOCK !== 0) {
      throw authenticationError();
    }
    var contentLength = readUint32(value, 0);
    if (contentLength > value.length - 4) {
      throw authenticationError();
    }
    var serialized = textDecoder().decode(value.subarray(4, contentLength + 4));
    try {
      return JSON.parse(serialized);
    } catch (error) {
      throw authenticationError();
    }
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isRecord(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function normalizeVaultName(value, errorFactory) {
    if (typeof value !== 'string') {
      throw errorFactory();
    }
    var name = value.trim();
    if (!name || name.length > MAX_VAULT_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) {
      throw errorFactory();
    }
    return name;
  }

  function migratePublicData(value) {
    if (!isRecord(value)) {
      throw authenticationError();
    }
    var schema = hasOwn(value, 'schema') ? value.schema : 1;
    if (schema !== 1 && schema !== PUBLIC_SCHEMA_VERSION) {
      throw authenticationError();
    }
    var migrated;
    try {
      migrated = JSON.parse(JSON.stringify(value));
    } catch (error) {
      throw authenticationError();
    }
    if (schema === 1) {
      migrated.schema = PUBLIC_SCHEMA_VERSION;
      if (Array.isArray(migrated.addresses)) {
        migrated.addresses.forEach(function (address) {
          if (!isRecord(address)) {
            throw authenticationError();
          }
          // Schema 1 had no provenance fields. Every legacy address therefore
          // starts at the explicit manual/unverified boundary; no old field is
          // permitted to smuggle in a verification claim during migration.
          address.addressOrigin = 'manual';
          address.verificationState = 'unverified';
          delete address.lastColdVerifiedAt;
          delete address.verifiedAgainstXpub;
        });
      }
    }
    return migrated;
  }

  function normalizedProfile(value) {
    if (value === 'fast' || value === 'standard' || value === 'paranoid' || value === 'fallback') {
      return value;
    }
    if (value === 'argon2id-fast') {
      return 'fast';
    }
    if (value === 'argon2id-standard') {
      return 'standard';
    }
    if (value === 'argon2id-paranoid') {
      return 'paranoid';
    }
    if (value === 'pbkdf2-sha512-fallback') {
      return 'fallback';
    }
    throw serializationError();
  }

  function requireProfiles(errorFactory) {
    if (!PROFILES || !PROFILES.fast || !PROFILES.standard || !PROFILES.paranoid || !PROFILES.fallback) {
      throw errorFactory();
    }
  }

  function profileFromHeader(header) {
    requireProfiles(authenticationError);
    if (header.kdfId === KDF_PBKDF2
      && header.memoryKiB === 0
      && header.iterations === PROFILES.fallback.iterations
      && header.parallelism === PROFILES.fallback.parallelism) {
      return 'fallback';
    }
    var names = ['fast', 'standard', 'paranoid'];
    for (var index = 0; index < names.length; index += 1) {
      var profile = PROFILES[names[index]];
      if (header.kdfId === KDF_ARGON2ID
        && header.memoryKiB === profile.memoryKiB
        && header.iterations === profile.iterations
        && header.parallelism === profile.parallelism) {
        return names[index];
      }
    }
    throw authenticationError();
  }

  // profileId is the KDF identifier reported by the derivation that produced
  // the key this header will authenticate. It is never inferred from module
  // state. An unrecognized id is a serialization failure, not a default.
  function makeHeader(profileId, salt, wrappedLength, publicLength, secretLength, hasRecoveryShares) {
    requireProfiles(serializationError);
    var profileName = normalizedProfile(profileId);
    var profile = PROFILES[profileName];
    var header = new Uint8Array(HEADER_LENGTH);
    header.set(MAGIC, 0);
    writeUint16(header, 8, FORMAT_VERSION);
    header[10] = profileName === 'fallback' ? KDF_PBKDF2 : KDF_ARGON2ID;
    writeUint32(header, 11, profile.memoryKiB);
    writeUint32(header, 15, profile.iterations);
    header[19] = profile.parallelism;
    header[20] = CIPHER_AES_GCM;
    header.set(salt, 21);
    writeUint32(header, 53, wrappedLength + (hasRecoveryShares ? RECOVERY_HEADER_MARKER : 0));
    writeUint32(header, 57, publicLength);
    writeUint32(header, 61, secretLength);
    return header;
  }

  function parseHeader(value) {
    var bytes = copyBytes(value);
    if (bytes.length < HEADER_LENGTH) {
      throw authenticationError();
    }
    for (var index = 0; index < MAGIC.length; index += 1) {
      if (bytes[index] !== MAGIC[index]) {
        throw authenticationError();
      }
    }
    var wrappedDekLengthRaw = readUint32(bytes, 53);
    var hasRecoveryMarker = wrappedDekLengthRaw >= RECOVERY_HEADER_MARKER;
    var wrappedDekLength = hasRecoveryMarker
      ? wrappedDekLengthRaw - RECOVERY_HEADER_MARKER
      : wrappedDekLengthRaw;
    var header = {
      formatVersion: readUint16(bytes, 8),
      kdfId: bytes[10],
      memoryKiB: readUint32(bytes, 11),
      iterations: readUint32(bytes, 15),
      parallelism: bytes[19],
      cipherId: bytes[20],
      salt: bytes.slice(21, 53),
      wrappedDekLength: wrappedDekLength,
      hasRecoveryMarker: hasRecoveryMarker,
      publicLength: readUint32(bytes, 57),
      secretLength: readUint32(bytes, 61)
    };
    if (header.formatVersion !== FORMAT_VERSION
      || header.cipherId !== CIPHER_AES_GCM
      || header.wrappedDekLength < 4 + 60
      || header.wrappedDekLength > MAX_WRAPPED_BLOCK_LENGTH
      || header.publicLength < TAG_LENGTH
      || header.publicLength > MAX_VAULT_BYTES
      || (header.secretLength !== 0 && (header.secretLength < TAG_LENGTH || header.secretLength > MAX_VAULT_BYTES))) {
      throw authenticationError();
    }
    profileFromHeader(header);
    return header;
  }

  function publicHeader(header) {
    return Object.freeze({
      formatVersion: header.formatVersion,
      kdfId: header.kdfId,
      memoryKiB: header.memoryKiB,
      iterations: header.iterations,
      parallelism: header.parallelism,
      cipherId: header.cipherId,
      salt: new Uint8Array(header.salt),
      wrappedDekLength: header.wrappedDekLength,
      hasRecoveryShares: header.hasRecoveryMarker === true,
      publicLength: header.publicLength,
      secretLength: header.secretLength
    });
  }

  function recoveryMetadata(value, errorFactory) {
    if (!isRecord(value)
      || value.version !== RECOVERY_METHOD_DATA_VERSION
      || value.dekLength !== DEK_LENGTH
      || !Number.isInteger(value.identifier)
      || value.identifier < 0
      || value.identifier >= 32768
      || (value.extendableBackupFlag !== 0 && value.extendableBackupFlag !== 1)
      || !Number.isInteger(value.iterationExponent)
      || value.iterationExponent < 0
      || value.iterationExponent > 15
      || !Number.isInteger(value.groupThreshold)
      || value.groupThreshold < 1
      || !Array.isArray(value.groups)
      || value.groups.length < 1
      || value.groups.length > MAX_RECOVERY_GROUPS
      || value.groupThreshold > value.groups.length) {
      throw errorFactory();
    }
    var groups = value.groups.map(function (group) {
      if (!isRecord(group)
        || !Number.isInteger(group.threshold)
        || !Number.isInteger(group.count)
        || group.threshold < 1
        || group.threshold > group.count
        || group.count > 16
        || (group.threshold === 1 && group.count > 1)) {
        throw errorFactory();
      }
      return Object.freeze({ threshold: group.threshold, count: group.count });
    });
    return Object.freeze({
      version: RECOVERY_METHOD_DATA_VERSION,
      dekLength: DEK_LENGTH,
      identifier: value.identifier,
      extendableBackupFlag: value.extendableBackupFlag,
      iterationExponent: value.iterationExponent,
      groupThreshold: value.groupThreshold,
      groups: Object.freeze(groups)
    });
  }

  function encodeRecoveryMethodData(value) {
    var metadata = recoveryMetadata(value, serializationError);
    var output = new Uint8Array(RECOVERY_METHOD_DATA_PREFIX_LENGTH + (metadata.groups.length * 2));
    output[0] = metadata.version;
    output[1] = metadata.dekLength;
    writeUint16(output, 2, metadata.identifier);
    output[4] = metadata.extendableBackupFlag;
    output[5] = metadata.iterationExponent;
    output[6] = metadata.groupThreshold;
    output[7] = metadata.groups.length;
    metadata.groups.forEach(function (group, index) {
      output[RECOVERY_METHOD_DATA_PREFIX_LENGTH + (index * 2)] = group.threshold;
      output[RECOVERY_METHOD_DATA_PREFIX_LENGTH + (index * 2) + 1] = group.count;
    });
    return output;
  }

  function decodeRecoveryMethodData(value) {
    var data = copyBytes(value);
    if (data.length < RECOVERY_METHOD_DATA_PREFIX_LENGTH
      || data[0] !== RECOVERY_METHOD_DATA_VERSION
      || data[1] !== DEK_LENGTH) {
      throw authenticationError();
    }
    var groupCount = data[7];
    if (groupCount < 1
      || groupCount > MAX_RECOVERY_GROUPS
      || data.length !== RECOVERY_METHOD_DATA_PREFIX_LENGTH + (groupCount * 2)) {
      throw authenticationError();
    }
    var groups = [];
    for (var index = 0; index < groupCount; index += 1) {
      groups.push({
        threshold: data[RECOVERY_METHOD_DATA_PREFIX_LENGTH + (index * 2)],
        count: data[RECOVERY_METHOD_DATA_PREFIX_LENGTH + (index * 2) + 1]
      });
    }
    return recoveryMetadata({
      version: data[0],
      dekLength: data[1],
      identifier: readUint16(data, 2),
      extendableBackupFlag: data[4],
      iterationExponent: data[5],
      groupThreshold: data[6],
      groups: groups
    }, authenticationError);
  }

  function recoveryRecord(methodData) {
    if (methodData.length > 255) {
      throw serializationError();
    }
    var recordLength = methodData.length + 60;
    var record = new Uint8Array(4 + recordLength);
    record[0] = METHOD_RECOVERY_SHARES;
    record[1] = 0;
    writeUint16(record, 2, recordLength);
    record.set(methodData, 4);
    // Method 3 reconstructs the DEK directly. The ordinary nonce/wrapped-DEK
    // tail remains present for the v1 record grammar but is reserved and must
    // stay zero. Recovery metadata is authenticated as compartment AAD below.
    return record;
  }

  function isAllZero(value) {
    for (var index = 0; index < value.length; index += 1) {
      if (value[index] !== 0) {
        return false;
      }
    }
    return true;
  }

  function compartmentAad(headerBytes, methodData) {
    return methodData ? concatBytes([headerBytes, methodData]) : copyBytes(headerBytes);
  }

  function recoveryRecordFor(records) {
    for (var index = 0; index < records.length; index += 1) {
      if (records[index].methodId === METHOD_RECOVERY_SHARES) {
        return records[index];
      }
    }
    return null;
  }

  function validateRecordSet(records, hasRecoveryMarker) {
    var normalCount = 0;
    var recoveryCount = 0;
    records.forEach(function (record) {
      if (record.methodId === METHOD_PASSPHRASE || record.methodId === METHOD_PASSPHRASE_KEYFILE) {
        normalCount += 1;
      } else if (record.methodId === METHOD_RECOVERY_SHARES) {
        recoveryCount += 1;
      }
    });
    if (normalCount !== 1 || recoveryCount > 1 || (hasRecoveryMarker === true) !== (recoveryCount === 1)) {
      throw authenticationError();
    }
    return recoveryRecordFor(records);
  }

  function parseWrappedRecords(bytes, offset, length) {
    var end = offset + length;
    var cursor = offset;
    var records = [];
    while (cursor < end) {
      if (end - cursor < 4) {
        throw authenticationError();
      }
      var methodId = bytes[cursor];
      var flags = bytes[cursor + 1];
      var recordLength = readUint16(bytes, cursor + 2);
      if (recordLength < 60 || cursor + 4 + recordLength > end
        || (methodId !== METHOD_PASSPHRASE
          && methodId !== METHOD_PASSPHRASE_KEYFILE
          && methodId !== METHOD_RECOVERY_SHARES)
        || flags !== 0) {
        throw authenticationError();
      }
      var methodDataLength = recordLength - 60;
      var recordStart = cursor + 4;
      var nonceStart = recordStart + methodDataLength;
      var wrappedStart = nonceStart + NONCE_LENGTH;
      var methodData = bytes.slice(recordStart, nonceStart);
      var recoveryMetadataValue = null;
      if (methodId === METHOD_PASSPHRASE && methodData.length !== 0) {
        throw authenticationError();
      }
      if (methodId === METHOD_RECOVERY_SHARES) {
        recoveryMetadataValue = decodeRecoveryMethodData(methodData);
        if (!isAllZero(bytes.slice(nonceStart, wrappedStart + WRAPPED_DEK_LENGTH))) {
          throw authenticationError();
        }
      }
      records.push({
        methodId: methodId,
        flags: flags,
        methodData: methodData,
        recoveryMetadata: recoveryMetadataValue,
        nonce: bytes.slice(nonceStart, wrappedStart),
        wrappedDek: bytes.slice(wrappedStart, wrappedStart + WRAPPED_DEK_LENGTH),
        raw: bytes.slice(cursor, cursor + 4 + recordLength)
      });
      cursor += 4 + recordLength;
    }
    if (records.length === 0 || cursor !== end) {
      throw authenticationError();
    }
    var normalCount = records.filter(function (record) {
      return record.methodId === METHOD_PASSPHRASE || record.methodId === METHOD_PASSPHRASE_KEYFILE;
    }).length;
    var recoveryCount = records.filter(function (record) {
      return record.methodId === METHOD_RECOVERY_SHARES;
    }).length;
    if (normalCount !== 1 || recoveryCount > 1) {
      throw authenticationError();
    }
    return records;
  }

  function passphraseRecord(nonce, wrappedDek) {
    var record = new Uint8Array(4 + 60);
    record[0] = METHOD_PASSPHRASE;
    record[1] = 0;
    writeUint16(record, 2, 60);
    record.set(nonce, 4);
    record.set(wrappedDek, 4 + NONCE_LENGTH);
    return record;
  }

  function keyfileHintBytes(hint) {
    if (hint === undefined || hint === null || hint === '') {
      return new Uint8Array(0);
    }
    if (typeof hint !== 'string') {
      throw serializationError();
    }
    if (!noble || typeof noble.utf8ToBytes !== 'function') {
      throw new Error('UTF-8 encoding is unavailable.');
    }
    var encoded = noble.utf8ToBytes(hint);
    if (encoded.length > MAX_KEYFILE_HINT_BYTES) {
      // The hint is filename-only, display metadata, never security-relevant -
      // truncating rather than refusing keeps a long filename from blocking
      // vault creation. See ADR-0014.
      encoded = encoded.slice(0, MAX_KEYFILE_HINT_BYTES);
    }
    return encoded;
  }

  function keyfileRecord(nonce, wrappedDek, hintBytes) {
    var recordLength = hintBytes.length + 60;
    var record = new Uint8Array(4 + recordLength);
    record[0] = METHOD_PASSPHRASE_KEYFILE;
    record[1] = 0;
    writeUint16(record, 2, recordLength);
    record.set(hintBytes, 4);
    record.set(nonce, 4 + hintBytes.length);
    record.set(wrappedDek, 4 + hintBytes.length + NONCE_LENGTH);
    return record;
  }

  function normalizeKeyfileBytes(value) {
    if (value === undefined || value === null) {
      return null;
    }
    if (!isBytes(value)) {
      throw serializationError();
    }
    var bytes = copyBytes(value);
    if (bytes.length === 0) {
      // An empty keyfile provides no protection at all and almost certainly
      // means the caller passed the wrong value. Fail closed rather than
      // silently deriving from zero bytes.
      throw serializationError();
    }
    if (bytes.length > MAX_KEYFILE_BYTES) {
      throw serializationError();
    }
    return bytes;
  }

  function requireDigest(errorFactory) {
    if (!noble || typeof noble.sha512 !== 'function' || typeof noble.utf8ToBytes !== 'function') {
      throw errorFactory();
    }
  }

  // KEK material for method 2 per vault-format.md: Argon2id(passphrase ||
  // SHA-512(keyfile), salt, params). The keyfile's own bytes never leave this
  // function - only their digest is combined with the passphrase, and the
  // combined material is zeroed by the caller once the derivation returns.
  function combinePassphraseKeyfile(passphrase, keyfileBytes, errorFactory) {
    requireDigest(errorFactory);
    var passphraseBytes = typeof passphrase === 'string'
      ? noble.utf8ToBytes(passphrase)
      : copyBytes(passphrase);
    var digest = noble.sha512(keyfileBytes);
    var combined = concatBytes([passphraseBytes, digest]);
    zeroBytes(passphraseBytes);
    zeroBytes(digest);
    return combined;
  }

  function hkdfSubkey(dek, info) {
    if (!noble || typeof noble.hkdf !== 'function' || typeof noble.sha512 !== 'function'
      || typeof noble.utf8ToBytes !== 'function') {
      throw new Error('HKDF-SHA-512 is unavailable.');
    }
    return noble.hkdf(
      noble.sha512,
      dek,
      new Uint8Array(0),
      noble.utf8ToBytes(info),
      32
    );
  }

  function aesGcm(operation, key, nonce, input, aad) {
    if (!cryptoLayer || typeof cryptoLayer.aesGcm !== 'function') {
      throw new Error('AES-GCM is unavailable.');
    }
    return cryptoLayer.aesGcm(operation, key, nonce, input, aad, 'noble');
  }

  function ensureVaultBytes(value) {
    if (isBytes(value) && value.byteLength > MAX_VAULT_BYTES) {
      throw sizeLimitError();
    }
    var bytes = copyBytes(value);
    if (bytes.length > MAX_VAULT_BYTES) {
      throw sizeLimitError();
    }
    if (bytes.length < HEADER_LENGTH) {
      throw authenticationError();
    }
    return bytes;
  }

  async function createVault(options) {
    var dek = null;
    var kek = null;
    var publicKey = null;
    var secretKey = null;
    var publicPlain = null;
    var secretPlain = null;
    var keyMaterial = null;
    var keyfileBytes = null;
    try {
      requireVaultHealth(serializationError);
      if (!options || options.passphrase === undefined || !cryptoLayer
        || typeof cryptoLayer.deriveKey !== 'function') {
        throw serializationError();
      }
      requireProfiles(serializationError);
      var publicData = options.publicData === undefined ? {} : options.publicData;
      if (!isRecord(publicData)) {
        throw serializationError();
      }
      if (hasOwn(publicData, 'name')) {
        var namedPublicData;
        try {
          namedPublicData = JSON.parse(JSON.stringify(publicData));
        } catch (error) {
          throw serializationError();
        }
        namedPublicData.name = normalizeVaultName(namedPublicData.name, serializationError);
        publicData = namedPublicData;
      }
      var hasSecret = options.secretData !== undefined && options.secretData !== null;
      if (hasSecret && networkState() !== 'offline') {
        throw serializationError();
      }
      var requestedProfile = options.profile !== undefined ? options.profile : options.profileName;
      var profileName = requestedProfile === undefined ? 'standard' : normalizedProfile(requestedProfile);
      keyfileBytes = normalizeKeyfileBytes(options.keyfile);
      var hintBytes = keyfileBytes ? keyfileHintBytes(options.keyfileHint) : new Uint8Array(0);
      var salt = cryptoLayer.randomBytes(SALT_LENGTH);
      dek = cryptoLayer.randomBytes(DEK_LENGTH);
      publicPlain = paddedJson(publicData);
      secretPlain = hasSecret ? paddedJson(options.secretData) : null;
      var publicNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
      var secretNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
      keyMaterial = keyfileBytes
        ? combinePassphraseKeyfile(options.passphrase, keyfileBytes, serializationError)
        : options.passphrase;
      // The header records the KDF the derivation actually used, reported by
      // deriveKey itself. Reading cryptoLayer.getKdfDetails() here would read
      // mutable module state that a concurrent derivation or a silent PBKDF2
      // fallback can change, producing a header that disagrees with the key
      // and therefore a permanently unopenable vault.
      var derived = await cryptoLayer.deriveKey(keyMaterial, salt, profileName);
      kek = derived.key;
      var recordLength = keyfileBytes ? (4 + hintBytes.length + 60) : 64;
      var header = makeHeader(
        derived.profileId,
        salt,
        recordLength,
        publicPlain.length + TAG_LENGTH,
        secretPlain ? secretPlain.length + TAG_LENGTH : 0
      );
      var wrappedNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
      var wrappedDek = await aesGcm('encrypt', kek, wrappedNonce, dek, header);
      publicKey = hkdfSubkey(dek, 'cbx/public/v1');
      var publicCiphertext = await aesGcm('encrypt', publicKey, publicNonce, publicPlain, header);
      var secretCiphertext = new Uint8Array(0);
      if (secretPlain) {
        secretKey = hkdfSubkey(dek, 'cbx/secret/v1');
        secretCiphertext = await aesGcm('encrypt', secretKey, secretNonce, secretPlain, header);
      }
      var wrappedRecord = keyfileBytes
        ? keyfileRecord(wrappedNonce, wrappedDek, hintBytes)
        : passphraseRecord(wrappedNonce, wrappedDek);
      var vault = concatBytes([
        header,
        wrappedRecord,
        publicNonce,
        publicCiphertext,
        secretNonce,
        secretCiphertext
      ]);
      if (vault.length > MAX_VAULT_BYTES) {
        throw sizeLimitError();
      }
      return vault;
    } catch (error) {
      if (isSizeLimitError(error)) {
        throw error;
      }
      throw serializationError();
    } finally {
      zeroBytes(dek);
      zeroBytes(kek);
      zeroBytes(publicKey);
      zeroBytes(secretKey);
      zeroBytes(publicPlain);
      zeroBytes(secretPlain);
      if (options && keyMaterial !== options.passphrase) {
        zeroBytes(keyMaterial);
      }
      zeroBytes(keyfileBytes);
    }
  }

  async function tryUnwrapWithKey(records, matchesRecord, kek, header) {
    for (var index = 0; index < records.length; index += 1) {
      var record = records[index];
      if (!matchesRecord(record)) {
        continue;
      }
      try {
        var dek = await aesGcm('decrypt', kek, record.nonce, record.wrappedDek, header.bytes);
        if (dek.length === DEK_LENGTH) {
          return { dek: dek, wrappingKey: new Uint8Array(kek) };
        }
        zeroBytes(dek);
      } catch (error) {
        // Try the next supported record without exposing which record failed.
      }
    }
    return null;
  }

  function isPassphraseRecord(record) {
    return record.methodId === METHOD_PASSPHRASE && record.flags === 0 && record.methodData.length === 0;
  }

  function isKeyfileRecord(record) {
    return record.methodId === METHOD_PASSPHRASE_KEYFILE && record.flags === 0;
  }

  function recoveryDekForRecord(record, recoveryShares) {
    var slip39 = global.__coldboxSlip39;
    if (!record || !Array.isArray(recoveryShares) || recoveryShares.length === 0
      || recoveryShares.length > 256 || !slip39
      || typeof slip39.decode !== 'function' || typeof slip39.recover !== 'function') {
      return null;
    }
    var metadata = record.recoveryMetadata;
    var seen = Object.create(null);
    var groups = Object.create(null);
    try {
      recoveryShares.forEach(function (share) {
        if (typeof share !== 'string' || share.length === 0) {
          throw authenticationError();
        }
        var decoded = slip39.decode(share);
        var group = metadata.groups[decoded.groupIndex];
        if (!group
          || decoded.identifier !== metadata.identifier
          || decoded.extendableBackupFlag !== metadata.extendableBackupFlag
          || decoded.iterationExponent !== metadata.iterationExponent
          || decoded.groupThreshold !== metadata.groupThreshold
          || decoded.groupCount !== metadata.groups.length
          || decoded.memberThreshold !== group.threshold
          || decoded.memberIndex < 0
          || decoded.memberIndex >= group.count) {
          throw authenticationError();
        }
        var key = decoded.groupIndex + ':' + decoded.memberIndex;
        if (seen[key]) {
          throw authenticationError();
        }
        seen[key] = true;
        if (!groups[decoded.groupIndex]) {
          groups[decoded.groupIndex] = [];
        }
        groups[decoded.groupIndex].push({ mnemonic: share, memberIndex: decoded.memberIndex });
      });
      var suppliedGroupIndexes = Object.keys(groups).map(function (index) {
        return Number(index);
      }).sort(function (left, right) { return left - right; });
      if (suppliedGroupIndexes.length !== metadata.groupThreshold) {
        throw authenticationError();
      }
      suppliedGroupIndexes.forEach(function (groupIndex) {
        if (groups[groupIndex].length !== metadata.groups[groupIndex].threshold) {
          throw authenticationError();
        }
      });
      var usableShares = [];
      suppliedGroupIndexes.forEach(function (groupIndex) {
        groups[groupIndex].sort(function (left, right) { return left.memberIndex - right.memberIndex; });
        groups[groupIndex].forEach(function (entry) {
          usableShares.push(entry.mnemonic);
        });
      });
      var recoveredValue = slip39.recover(usableShares, '');
      var recovered;
      if (Array.isArray(recoveredValue)) {
        if (recoveredValue.some(function (value) {
          return !Number.isInteger(value) || value < 0 || value > 255;
        })) {
          throw authenticationError();
        }
        recovered = new Uint8Array(recoveredValue);
      } else {
        recovered = copyBytes(recoveredValue);
      }
      if (recovered.length !== DEK_LENGTH) {
        zeroBytes(recovered);
        throw authenticationError();
      }
      return recovered;
    } catch (error) {
      throw authenticationError();
    }
  }

  // Tries every wrapped-DEK record this vault carries against every unlock
  // credential this caller supplied. A vault created without a keyfile has no
  // method-2 record, so supplying one is simply never consulted - passphrase-
  // only vaults are unaffected by this function existing. A vault created
  // with a keyfile has no method-1 record, so passphrase alone can never
  // unwrap it. Every failure path - wrong passphrase, missing keyfile, or a
  // byte-altered keyfile - converges on the same authenticationError(), never
  // revealing which credential or which record was wrong.
  async function unwrapDek(records, passphrase, header, keyfile, recoveryShares, allowRecovery) {
    if (!cryptoLayer || typeof cryptoLayer.deriveKey !== 'function') {
      throw authenticationError();
    }
    var profileName = profileFromHeader(header);
    var passphraseKek = null;
    var keyfileKek = null;
    var keyMaterial = null;
    try {
      var hasPassphraseRecord = records.some(isPassphraseRecord);
      if (hasPassphraseRecord && passphrase !== undefined && passphrase !== null) {
        var derivedPassphrase = await cryptoLayer.deriveKey(passphrase, header.salt, profileName);
        passphraseKek = derivedPassphrase.key;
        var passphraseResult = await tryUnwrapWithKey(records, isPassphraseRecord, passphraseKek, header);
        if (passphraseResult) {
          return passphraseResult;
        }
      }

      var hasKeyfileRecord = records.some(isKeyfileRecord);
      if (hasKeyfileRecord && keyfile && passphrase !== undefined && passphrase !== null) {
        keyMaterial = combinePassphraseKeyfile(passphrase, keyfile, authenticationError);
        var derivedKeyfile = await cryptoLayer.deriveKey(keyMaterial, header.salt, profileName);
        keyfileKek = derivedKeyfile.key;
        var keyfileResult = await tryUnwrapWithKey(records, isKeyfileRecord, keyfileKek, header);
        if (keyfileResult) {
          return keyfileResult;
        }
      }

      var recoveryRecord = recoveryRecordFor(records);
      if (allowRecovery && recoveryRecord && recoveryShares !== undefined && recoveryShares !== null) {
        var recoveredDek = recoveryDekForRecord(recoveryRecord, recoveryShares);
        if (recoveredDek) {
          return { dek: recoveredDek, wrappingKey: null };
        }
      }

      throw authenticationError();
    } finally {
      zeroBytes(passphraseKek);
      zeroBytes(keyfileKek);
      zeroBytes(keyMaterial);
    }
  }

  async function openVault(value, passphrase, mode, keyfile, recoveryShares) {
    var bytes = null;
    var headerBytes = null;
    var dek = null;
    var wrappingKey = null;
    var publicKey = null;
    var secretKey = null;
    var publicPlain = null;
    var secretPlain = null;
    var publicNonce = null;
    var publicCiphertext = null;
    var secretNonce = null;
    var secretCiphertext = null;
    var aad = null;
    try {
      var resolvedMode = resolveMode(mode);
      bytes = ensureVaultBytes(value);
      var header = parseHeader(bytes);
      var expectedLength = HEADER_LENGTH
        + header.wrappedDekLength
        + NONCE_LENGTH
        + header.publicLength
        + NONCE_LENGTH
        + header.secretLength;
      if (expectedLength !== bytes.length || expectedLength > MAX_VAULT_BYTES) {
        throw authenticationError();
      }
      headerBytes = bytes.slice(0, HEADER_LENGTH);
      header.bytes = headerBytes;
      var records = parseWrappedRecords(bytes, HEADER_LENGTH, header.wrappedDekLength);
      var recoveryRecord = validateRecordSet(records, header.hasRecoveryMarker);
      aad = compartmentAad(header.bytes, recoveryRecord ? recoveryRecord.methodData : null);
      var publicNonceOffset = HEADER_LENGTH + header.wrappedDekLength;
      publicNonce = bytes.slice(publicNonceOffset, publicNonceOffset + NONCE_LENGTH);
      var publicCipherOffset = publicNonceOffset + NONCE_LENGTH;
      publicCiphertext = bytes.slice(publicCipherOffset, publicCipherOffset + header.publicLength);
      var secretNonceOffset = publicCipherOffset + header.publicLength;
      secretNonce = bytes.slice(secretNonceOffset, secretNonceOffset + NONCE_LENGTH);
      secretCiphertext = bytes.slice(secretNonceOffset + NONCE_LENGTH);
      var unlockResult = await unwrapDek(
        records,
        passphrase,
        header,
        keyfile,
        recoveryShares,
        resolvedMode === 'offline'
      );
      dek = unlockResult.dek;
      wrappingKey = unlockResult.wrappingKey;
      publicKey = hkdfSubkey(dek, 'cbx/public/v1');
      publicPlain = await aesGcm('decrypt', publicKey, publicNonce, publicCiphertext, aad);
      var publicData = migratePublicData(parsePaddedJson(publicPlain));
      var secretData = null;
      if (resolvedMode === 'offline' && header.secretLength > 0) {
        secretKey = hkdfSubkey(dek, 'cbx/secret/v1');
        secretPlain = await aesGcm('decrypt', secretKey, secretNonce, secretCiphertext, aad);
        secretData = parsePaddedJson(secretPlain);
      }
      return Object.freeze({
        formatVersion: FORMAT_VERSION,
        header: publicHeader(header),
        publicData: publicData,
        secretData: secretData,
        recoveryShareMetadata: recoveryRecord ? recoveryRecord.recoveryMetadata : null
      });
    } catch (error) {
      if (isSizeLimitError(error)) {
        throw error;
      }
      throw authenticationError();
    } finally {
      zeroBytes(dek);
      zeroBytes(publicKey);
      zeroBytes(secretKey);
      zeroBytes(publicPlain);
      zeroBytes(secretPlain);
      zeroBytes(bytes);
      zeroBytes(headerBytes);
      zeroBytes(publicNonce);
      zeroBytes(publicCiphertext);
      zeroBytes(secretNonce);
      zeroBytes(secretCiphertext);
      zeroBytes(aad);
      zeroBytes(wrappingKey);
    }
  }

  async function openPublicVault(value, passphrase, keyfile) {
    return openVault(value, passphrase, 'online', keyfile);
  }

  function createVaultSession(state) {
    var closed = false;
    var saving = false;
    var operationInFlight = false;

    function clonePublicData(value) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        throw serializationError();
      }
    }

    function getPublicData() {
      return closed || !state.publicData ? null : clonePublicData(state.publicData);
    }

    function getSecretData() {
      return closed || state.mode !== 'offline' || !state.secretData
        ? null
        : clonePublicData(state.secretData);
    }

    function getRecoveryShareMetadata() {
      if (closed || !state.recoveryMetadata) {
        return null;
      }
      return {
        version: state.recoveryMetadata.version,
        dekLength: state.recoveryMetadata.dekLength,
        identifier: state.recoveryMetadata.identifier,
        extendableBackupFlag: state.recoveryMetadata.extendableBackupFlag,
        iterationExponent: state.recoveryMetadata.iterationExponent,
        groupThreshold: state.recoveryMetadata.groupThreshold,
        groups: state.recoveryMetadata.groups.map(function (group) {
          return { threshold: group.threshold, count: group.count };
        })
      };
    }

    function canConfigureRecoveryShares() {
      return !closed && state.mode === 'offline' && Boolean(state.headerBytes && state.wrappedBlock);
    }

    function findAddress(addresses, id) {
      if (!Array.isArray(addresses)) {
        return null;
      }
      for (var index = 0; index < addresses.length; index += 1) {
        if (isRecord(addresses[index]) && addresses[index].id === id) {
          return addresses[index];
        }
      }
      return null;
    }

    function findRecord(records, id) {
      if (!Array.isArray(records)) {
        return null;
      }
      for (var index = 0; index < records.length; index += 1) {
        if (isRecord(records[index]) && records[index].id === id) {
          return records[index];
        }
      }
      return null;
    }

    function byteSequencesEqual(left, right) {
      if (!isBytes(left) || !isBytes(right)) {
        return false;
      }
      var leftBytes = left instanceof Uint8Array ? left : new Uint8Array(left);
      var rightBytes = right instanceof Uint8Array ? right : new Uint8Array(right);
      var difference = leftBytes.length ^ rightBytes.length;
      var length = Math.max(leftBytes.length, rightBytes.length);
      for (var index = 0; index < length; index += 1) {
        difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
      }
      return difference === 0;
    }

    function backupSubjectSeed(backup) {
      if (!isRecord(backup) || typeof backup.subjectId !== 'string'
        || !state.secretData || !Array.isArray(state.secretData.seeds)) {
        return null;
      }
      var references = [];
      function addReference(value) {
        if (typeof value === 'string' && references.indexOf(value) === -1) {
          references.push(value);
        }
      }
      if (state.secretData.seeds.some(function (seed) {
        return isRecord(seed) && seed.id === backup.subjectId;
      })) {
        addReference(backup.subjectId);
      }
      [
        { records: state.publicData && state.publicData.seeds, kind: 'seed' },
        { records: state.publicData && state.publicData.wallets, kind: 'wallet' }
      ].forEach(function (source) {
        var records = source.records;
        if (!Array.isArray(records)) {
          return;
        }
        records.forEach(function (record) {
          if (!isRecord(record) || record.id !== backup.subjectId) {
            return;
          }
          if (typeof record.seedId === 'string') {
            addReference(record.seedId);
          } else if (source.kind === 'seed') {
            addReference(record.id);
          }
        });
      });
      if (references.length !== 1) {
        return null;
      }
      var matches = state.secretData.seeds.filter(function (seed) {
        return isRecord(seed) && seed.id === references[0];
      });
      return matches.length === 1 ? matches[0] : null;
    }

    function backupCandidateMatchesSubject(backup, method, candidateBytes) {
      if (!isRecord(backup) || backup.method !== method || !isBytes(candidateBytes)
        || candidateBytes.length === 0 || state.mode !== 'offline') {
        return false;
      }
      var seedRecord = backupSubjectSeed(backup);
      var storedSecret = seedRecord && seedRecord.storedSecret;
      var seedForge = global.__coldboxSeedForge;
      if (!isRecord(storedSecret) || typeof storedSecret.mnemonic !== 'string'
        || (storedSecret.passphrase !== undefined
          && typeof storedSecret.passphrase !== 'string')
        || !seedForge || !Array.isArray(seedForge.languages)
        || typeof seedForge.mnemonicToEntropy !== 'function'
        || typeof seedForge.mnemonicToSeed !== 'function') {
        return false;
      }
      var entropyMethods = ['slip39', 'seedxor', 'shamir39', 'sss'];
      var masterSeedMethods = ['codex32', 'sss'];
      var compareEntropy = entropyMethods.indexOf(method) !== -1;
      var compareMasterSeed = masterSeedMethods.indexOf(method) !== -1;
      if (!compareEntropy && !compareMasterSeed) {
        return false;
      }
      var passphrase = storedSecret.passphrase === undefined ? '' : storedSecret.passphrase;
      var matched = false;
      for (var languageIndex = 0;
        languageIndex < seedForge.languages.length && !matched;
        languageIndex += 1) {
        var language = seedForge.languages[languageIndex];
        var expected = null;
        try {
          if (compareEntropy) {
            expected = new Uint8Array(seedForge.mnemonicToEntropy(
              storedSecret.mnemonic,
              language.id
            ));
            matched = byteSequencesEqual(candidateBytes, expected);
          }
          if (!matched && compareMasterSeed) {
            zeroBytes(expected);
            expected = new Uint8Array(seedForge.mnemonicToSeed(
              storedSecret.mnemonic,
              passphrase,
              language.id
            ));
            matched = byteSequencesEqual(candidateBytes, expected);
          }
        } catch (error) {
          // A subject with no valid cold mnemonic representation is unresolved.
          matched = false;
        } finally {
          zeroBytes(expected);
        }
      }
      passphrase = '';
      return matched;
    }

    function resetVerification(address, stateName) {
      address.verificationState = stateName === 'unverifiable' ? 'unverifiable' : 'unverified';
      delete address.lastColdVerifiedAt;
      delete address.verifiedAgainstXpub;
    }

    function preserveColdVerificationAuthority(current, next) {
      if (!isRecord(next)) {
        return;
      }
      if (Array.isArray(next.addresses)) {
        var currentAddresses = current && current.addresses;
        next.addresses.forEach(function (address) {
          if (!isRecord(address)) {
            return;
          }
          var previous = findAddress(currentAddresses, address.id);
          var requestedState = address.verificationState || 'unverified';
          var previousState = previous && previous.verificationState
            ? previous.verificationState
            : 'unverified';
          var samePublicIdentity = previous
            && previous.address === address.address
            && previous.accountId === address.accountId
            && previous.index === address.index;

          // publicData.replace is a warm-origin mutation. It may carry forward
          // an authenticated state, or record the derived stale transition, but
          // it can never create either verification claim from public input.
          if (!previous || !samePublicIdentity) {
            if (requestedState === 'cold-verified' || requestedState === 'cold-verified-stale') {
              resetVerification(address);
            }
            return;
          }
          var previousAccount = findRecord(current && current.accounts, previous.accountId);
          var nextAccount = findRecord(next.accounts, address.accountId);
          var verifiedAgainstXpub = previous.verifiedAgainstXpub;
          var xpubEvidenceChanged = previousState === 'cold-verified'
            && (typeof verifiedAgainstXpub !== 'string'
              || !previousAccount
              || !nextAccount
              || previousAccount.xpub !== verifiedAgainstXpub
              || nextAccount.xpub !== verifiedAgainstXpub);
          if (xpubEvidenceChanged) {
            address.verificationState = 'cold-verified-stale';
            address.lastColdVerifiedAt = previous.lastColdVerifiedAt;
            address.verifiedAgainstXpub = previous.verifiedAgainstXpub;
            return;
          }
          if (previousState === 'cold-verified' && requestedState === 'cold-verified-stale') {
            address.verificationState = 'cold-verified';
            address.lastColdVerifiedAt = previous.lastColdVerifiedAt;
            address.verifiedAgainstXpub = previous.verifiedAgainstXpub;
            return;
          }
          if (requestedState === 'cold-verified' && previousState !== 'cold-verified') {
            if (previousState === 'cold-verified-stale') {
              address.verificationState = 'cold-verified-stale';
              address.lastColdVerifiedAt = previous.lastColdVerifiedAt;
              address.verifiedAgainstXpub = previous.verifiedAgainstXpub;
            } else {
              resetVerification(address, previousState);
            }
            return;
          }
          if (requestedState === 'cold-verified-stale' && previousState !== 'cold-verified'
            && previousState !== 'cold-verified-stale') {
            resetVerification(address, previousState);
            return;
          }
          if ((previousState === 'cold-verified' || previousState === 'cold-verified-stale')
            && requestedState !== 'cold-verified'
            && requestedState !== 'cold-verified-stale') {
            address.verificationState = previousState;
            address.lastColdVerifiedAt = previous.lastColdVerifiedAt;
            address.verifiedAgainstXpub = previous.verifiedAgainstXpub;
            return;
          }
          if (previousState === 'cold-verified' && requestedState === 'cold-verified') {
            address.lastColdVerifiedAt = previous.lastColdVerifiedAt;
            address.verifiedAgainstXpub = previous.verifiedAgainstXpub;
          } else if (previousState === 'cold-verified-stale'
            && requestedState === 'cold-verified-stale') {
            address.lastColdVerifiedAt = previous.lastColdVerifiedAt;
            address.verifiedAgainstXpub = previous.verifiedAgainstXpub;
          }
        });
      }
      if (!Array.isArray(next.backups)) {
        return;
      }
      var currentBackups = current && current.backups;
      next.backups.forEach(function (backup) {
        if (!isRecord(backup)) {
          return;
        }
        var previous = findRecord(currentBackups, backup.id);
        var sameBackupIdentity = previous
          && previous.subjectId === backup.subjectId
          && previous.method === backup.method
          && previous.threshold === backup.threshold
          && JSON.stringify(previous.groupConfig || null) === JSON.stringify(backup.groupConfig || null);
        if (!sameBackupIdentity || !previous.lastVerifiedAt) {
          delete backup.lastVerifiedAt;
          return;
        }
        backup.lastVerifiedAt = previous.lastVerifiedAt;
      });
    }

    function replacePublicData(publicData) {
      if (closed || saving || operationInFlight || !publicData
        || Object.prototype.toString.call(publicData) !== '[object Object]') {
        throw serializationError();
      }
      requireVaultHealth(serializationError);
      if (networkState() !== state.mode) {
        close();
        throw serializationError();
      }
      // The durable name is cold-owned. Warm registry edits must omit it;
      // accepting an inbound name would let the warm realm rewrite metadata
      // it is deliberately forbidden to receive.
      if (hasOwn(publicData, 'name')) {
        throw serializationError();
      }
      var currentId = state.publicData && state.publicData.id;
      var nextId = publicData.id;
      if (currentId !== undefined || nextId !== undefined) {
        if (currentId !== nextId) {
          throw serializationError();
        }
      }
      var nextPublicData = migratePublicData(clonePublicData(publicData));
      if (state.publicData && hasOwn(state.publicData, 'name')) {
        nextPublicData.name = state.publicData.name;
      }
      preserveColdVerificationAuthority(state.publicData, nextPublicData);
      var nextPublicPlain = paddedJson(nextPublicData);
      zeroBytes(state.publicPlain);
      state.publicData = nextPublicData;
      state.publicPlain = nextPublicPlain;
      return getPublicData();
    }

    function renameVault(name) {
      if (closed || saving || operationInFlight || !state.publicData) {
        throw serializationError();
      }
      requireVaultHealth(serializationError);
      if (networkState() !== state.mode) {
        close();
        throw serializationError();
      }
      var nextName = normalizeVaultName(name, serializationError);
      var nextPublicData = clonePublicData(state.publicData);
      nextPublicData.name = nextName;
      var nextPublicPlain = paddedJson(nextPublicData);
      zeroBytes(state.publicPlain);
      state.publicData = nextPublicData;
      state.publicPlain = nextPublicPlain;
      return nextName;
    }

    function markBackupVerified(backupId, method, candidateBytes, verifiedAt) {
      if (closed || saving || operationInFlight || !state.publicData
        || typeof backupId !== 'string' || typeof method !== 'string'
        || !isBytes(candidateBytes) || candidateBytes.length === 0
        || typeof verifiedAt !== 'string') {
        throw serializationError();
      }
      requireVaultHealth(serializationError);
      if (networkState() !== state.mode
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(verifiedAt)
        || new Date(verifiedAt).toISOString() !== verifiedAt) {
        throw serializationError();
      }
      var nextPublicData = clonePublicData(state.publicData);
      var backup = findRecord(nextPublicData.backups, backupId);
      if (!backup || !backupCandidateMatchesSubject(backup, method, candidateBytes)) {
        throw serializationError();
      }
      backup.lastVerifiedAt = verifiedAt;
      var nextPublicPlain = paddedJson(nextPublicData);
      zeroBytes(state.publicPlain);
      state.publicData = nextPublicData;
      state.publicPlain = nextPublicPlain;
      return getPublicData();
    }

    function replaceSecretData(secretData) {
      if (closed || saving || operationInFlight || state.mode !== 'offline' || !state.secretKey
        || !state.secretPlain || state.secretLength === 0
        || !secretData || Object.prototype.toString.call(secretData) !== '[object Object]') {
        throw serializationError();
      }
      requireVaultHealth(serializationError);
      if (networkState() !== state.mode) {
        close();
        throw serializationError();
      }
      var nextSecretData = clonePublicData(secretData);
      var nextSecretPlain = paddedJsonAtLength(nextSecretData, state.secretPlain.length);
      zeroBytes(state.secretPlain);
      state.secretData = nextSecretData;
      state.secretPlain = nextSecretPlain;
      return getSecretData();
    }

    async function configureRecoveryShares(options) {
      if (closed || operationInFlight || state.mode !== 'offline') {
        throw serializationError();
      }
      operationInFlight = true;
      var value = options || {};
      var reauthKeyfile = null;
      var localDek = null;
      var wrappingKey = null;
      var headerBytesSnapshot = null;
      var wrappedBlockSnapshot = null;
      var methodData = null;
      var nextRecord = null;
      var nextHeaderBytes = null;
      var wrapNonce = null;
      var wrappedDek = null;
      var nextNormalRecord = null;
      var nextWrappedBlock = null;
      try {
        requireVaultHealth(serializationError);
        if (networkState() !== state.mode
          || typeof value.normalPassphrase !== 'string'
          || (value.passphrase !== undefined && value.passphrase !== '')) {
          throw serializationError();
        }
        if (state.recoveryMetadata && value.replace !== true) {
          throw serializationError();
        }
        reauthKeyfile = normalizeKeyfileBytes(value.keyfile);
        headerBytesSnapshot = new Uint8Array(state.headerBytes);
        wrappedBlockSnapshot = new Uint8Array(state.wrappedBlock);
        var header = parseHeader(headerBytesSnapshot);
        header.bytes = headerBytesSnapshot;
        var records = parseWrappedRecords(wrappedBlockSnapshot, 0, wrappedBlockSnapshot.length);
        var existingRecoveryRecord = validateRecordSet(records, header.hasRecoveryMarker);
        var normalRecord = records.filter(function (record) {
          return record.methodId === METHOD_PASSPHRASE || record.methodId === METHOD_PASSPHRASE_KEYFILE;
        })[0];
        if (!normalRecord || (existingRecoveryRecord && value.replace !== true)) {
          throw serializationError();
        }
        var unlockResult = await unwrapDek(
          records,
          value.normalPassphrase,
          header,
          reauthKeyfile,
          null,
          false
        );
        localDek = unlockResult.dek;
        wrappingKey = unlockResult.wrappingKey;
        if (!localDek || !wrappingKey) {
          throw serializationError();
        }
        if (closed || !vaultHealthReady() || networkState() !== state.mode) {
          throw serializationError();
        }
        var slip39 = global.__coldboxSlip39;
        if (!slip39 || typeof slip39.generate !== 'function') {
          throw serializationError();
        }
        var generated;
        try {
          generated = slip39.generate(localDek, {
            identifier: value.identifier,
            extendableBackupFlag: value.extendableBackupFlag === undefined ? 1 : value.extendableBackupFlag,
            iterationExponent: value.iterationExponent === undefined ? 0 : value.iterationExponent,
            groupThreshold: value.groupThreshold === undefined ? 1 : value.groupThreshold,
            groups: value.groups === undefined ? [{ threshold: 2, count: 3 }] : value.groups,
            passphrase: ''
          });
        } catch (error) {
          throw serializationError();
        }
        var metadata = recoveryMetadata({
          version: RECOVERY_METHOD_DATA_VERSION,
          dekLength: DEK_LENGTH,
          identifier: generated.identifier,
          extendableBackupFlag: generated.extendableBackupFlag,
          iterationExponent: generated.iterationExponent,
          groupThreshold: generated.groupThreshold,
          groups: generated.groups
        }, serializationError);
        methodData = encodeRecoveryMethodData(metadata);
        nextRecord = recoveryRecord(methodData);
        var nextBlockLength = normalRecord.raw.length + nextRecord.length;
        nextHeaderBytes = new Uint8Array(headerBytesSnapshot);
        writeUint32(nextHeaderBytes, 53, nextBlockLength + RECOVERY_HEADER_MARKER);
        var nextHeader = parseHeader(nextHeaderBytes);
        wrapNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
        wrappedDek = await aesGcm('encrypt', wrappingKey, wrapNonce, localDek, nextHeaderBytes);
        if (closed || !vaultHealthReady() || networkState() !== state.mode) {
          throw serializationError();
        }
        if (!wrappedDek || wrappedDek.length !== WRAPPED_DEK_LENGTH) {
          throw serializationError();
        }
        nextNormalRecord = normalRecord.methodId === METHOD_PASSPHRASE
          ? passphraseRecord(wrapNonce, wrappedDek)
          : keyfileRecord(wrapNonce, wrappedDek, normalRecord.methodData);
        nextWrappedBlock = concatBytes([nextNormalRecord, nextRecord]);
        if (nextWrappedBlock.length !== nextBlockLength) {
          throw serializationError();
        }
        if (closed || !vaultHealthReady() || networkState() !== state.mode) {
          throw serializationError();
        }
        var previousHeaderBytes = state.headerBytes;
        var previousWrappedBlock = state.wrappedBlock;
        var previousMethodData = state.recoveryMethodData;
        state.headerBytes = nextHeaderBytes;
        state.header = publicHeader(nextHeader);
        state.wrappedBlock = nextWrappedBlock;
        state.recoveryMetadata = metadata;
        state.recoveryMethodData = methodData;
        zeroBytes(previousHeaderBytes);
        zeroBytes(previousWrappedBlock);
        zeroBytes(previousMethodData);
        nextHeaderBytes = null;
        methodData = null;
        nextRecord = null;
        nextNormalRecord = null;
        nextWrappedBlock = null;
        return {
          metadata: getRecoveryShareMetadata(),
          shares: generated.shares.map(function (share) { return share.mnemonic; })
        };
      } catch (error) {
        throw serializationError();
      } finally {
        operationInFlight = false;
        zeroBytes(reauthKeyfile);
        zeroBytes(localDek);
        zeroBytes(wrappingKey);
        zeroBytes(headerBytesSnapshot);
        zeroBytes(wrappedBlockSnapshot);
        zeroBytes(wrapNonce);
        zeroBytes(wrappedDek);
        zeroBytes(nextHeaderBytes);
        zeroBytes(methodData);
        zeroBytes(nextRecord);
        zeroBytes(nextNormalRecord);
        zeroBytes(nextWrappedBlock);
      }
    }

    function close() {
      if (closed) {
        return;
      }
      closed = true;
      zeroBytes(state.publicKey);
      zeroBytes(state.secretKey);
      zeroBytes(state.publicPlain);
      zeroBytes(state.secretPlain);
      zeroBytes(state.secretNonce);
      zeroBytes(state.secretCiphertext);
      zeroBytes(state.headerBytes);
      zeroBytes(state.wrappedBlock);
      zeroBytes(state.recoveryMethodData);
      state.publicKey = null;
      state.secretKey = null;
      state.publicData = null;
      state.secretData = null;
      state.publicPlain = null;
      state.secretPlain = null;
      state.secretNonce = null;
      state.secretCiphertext = null;
      state.headerBytes = null;
      state.wrappedBlock = null;
      state.recoveryMethodData = null;
      state.recoveryMetadata = null;
    }

    async function save() {
      if (closed || saving || operationInFlight) {
        throw serializationError();
      }
      saving = true;
      operationInFlight = true;
      var headerBytesSnapshot = null;
      var wrappedBlockSnapshot = null;
      var recoveryMethodDataSnapshot = null;
      var publicNonce = null;
      var publicCiphertext = null;
      var secretNonce = null;
      var secretCiphertext = null;
      var aad = null;
      try {
        requireVaultHealth(serializationError);
        if (networkState() !== state.mode) {
          close();
          throw serializationError();
        }

        headerBytesSnapshot = new Uint8Array(state.headerBytes);
        wrappedBlockSnapshot = new Uint8Array(state.wrappedBlock);
        recoveryMethodDataSnapshot = state.recoveryMethodData
          ? new Uint8Array(state.recoveryMethodData)
          : null;
        aad = compartmentAad(headerBytesSnapshot, recoveryMethodDataSnapshot);
        publicNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
        publicCiphertext = await aesGcm(
          'encrypt',
          state.publicKey,
          publicNonce,
          state.publicPlain,
          aad
        );
        if (closed || !vaultHealthReady() || networkState() !== state.mode) {
          throw serializationError();
        }

        if (state.mode === 'online') {
          secretNonce = new Uint8Array(state.secretNonce);
          secretCiphertext = new Uint8Array(state.secretCiphertext);
        } else {
          secretNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
          if (state.secretLength > 0) {
            if (!state.secretKey || !state.secretPlain) {
              close();
              throw serializationError();
            }
            secretCiphertext = await aesGcm(
              'encrypt',
              state.secretKey,
              secretNonce,
              state.secretPlain,
              aad
            );
          } else {
            secretCiphertext = new Uint8Array(0);
          }
        }
        if (closed || !vaultHealthReady() || networkState() !== state.mode) {
          throw serializationError();
        }

        var vault = concatBytes([
          headerBytesSnapshot,
          wrappedBlockSnapshot,
          publicNonce,
          publicCiphertext,
          secretNonce,
          secretCiphertext
        ]);
        if (vault.length > MAX_VAULT_BYTES) {
          throw sizeLimitError();
        }
        return vault;
      } catch (error) {
        if (!closed && (!vaultHealthReady() || networkState() !== state.mode)) {
          close();
        }
        if (isSizeLimitError(error)) {
          throw error;
        }
        throw serializationError();
      } finally {
        saving = false;
        operationInFlight = false;
        zeroBytes(headerBytesSnapshot);
        zeroBytes(wrappedBlockSnapshot);
        zeroBytes(recoveryMethodDataSnapshot);
        zeroBytes(publicNonce);
        zeroBytes(publicCiphertext);
        zeroBytes(secretNonce);
        zeroBytes(secretCiphertext);
        zeroBytes(aad);
      }
    }

    return Object.freeze({
      formatVersion: FORMAT_VERSION,
      get header() { return state.header; },
      get publicData() { return getPublicData(); },
      getPublicData: getPublicData,
      replacePublicData: replacePublicData,
      renameVault: renameVault,
      markBackupVerified: markBackupVerified,
      getSecretData: getSecretData,
      replaceSecretData: replaceSecretData,
      getRecoveryShareMetadata: getRecoveryShareMetadata,
      canConfigureRecoveryShares: canConfigureRecoveryShares,
      configureRecoveryShares: configureRecoveryShares,
      save: save,
      close: close
    });
  }

  async function openVaultSession(value, passphrase, mode, keyfile, recoveryShares) {
    var bytes = null;
    var headerBytes = null;
    var wrappedBlock = null;
    var dek = null;
    var wrappingKey = null;
    var publicKey = null;
    var secretKey = null;
    var publicPlain = null;
    var secretPlain = null;
    var publicNonce = null;
    var publicCiphertext = null;
    var secretNonce = null;
    var secretCiphertext = null;
    var secretData = null;
    var aad = null;
    var session = null;
    try {
      var resolvedMode = resolveMode(mode);
      bytes = ensureVaultBytes(value);
      var header = parseHeader(bytes);
      var expectedLength = HEADER_LENGTH
        + header.wrappedDekLength
        + NONCE_LENGTH
        + header.publicLength
        + NONCE_LENGTH
        + header.secretLength;
      if (expectedLength !== bytes.length || expectedLength > MAX_VAULT_BYTES) {
        throw authenticationError();
      }
      headerBytes = bytes.slice(0, HEADER_LENGTH);
      header.bytes = headerBytes;
      var records = parseWrappedRecords(bytes, HEADER_LENGTH, header.wrappedDekLength);
      var recoveryRecord = validateRecordSet(records, header.hasRecoveryMarker);
      aad = compartmentAad(headerBytes, recoveryRecord ? recoveryRecord.methodData : null);
      wrappedBlock = bytes.slice(HEADER_LENGTH, HEADER_LENGTH + header.wrappedDekLength);
      var publicNonceOffset = HEADER_LENGTH + header.wrappedDekLength;
      publicNonce = bytes.slice(publicNonceOffset, publicNonceOffset + NONCE_LENGTH);
      var publicCipherOffset = publicNonceOffset + NONCE_LENGTH;
      publicCiphertext = bytes.slice(publicCipherOffset, publicCipherOffset + header.publicLength);
      var secretNonceOffset = publicCipherOffset + header.publicLength;
      secretNonce = bytes.slice(secretNonceOffset, secretNonceOffset + NONCE_LENGTH);
      secretCiphertext = bytes.slice(secretNonceOffset + NONCE_LENGTH);
      var unlockResult = await unwrapDek(
        records,
        passphrase,
        header,
        keyfile,
        recoveryShares,
        resolvedMode === 'offline'
      );
      dek = unlockResult.dek;
      wrappingKey = unlockResult.wrappingKey;
      publicKey = hkdfSubkey(dek, 'cbx/public/v1');
      publicPlain = await aesGcm('decrypt', publicKey, publicNonce, publicCiphertext, aad);
      var publicData = migratePublicData(parsePaddedJson(publicPlain));
      if (resolvedMode === 'offline' && header.secretLength > 0) {
        secretKey = hkdfSubkey(dek, 'cbx/secret/v1');
        secretPlain = await aesGcm('decrypt', secretKey, secretNonce, secretCiphertext, aad);
        secretData = parsePaddedJson(secretPlain);
      }

      requireVaultHealth(authenticationError);
      if (networkState() !== resolvedMode) {
        throw authenticationError();
      }

      session = createVaultSession({
        mode: resolvedMode,
        header: publicHeader(header),
        headerBytes: headerBytes,
        wrappedBlock: wrappedBlock,
        publicData: publicData,
        secretData: secretData,
        publicPlain: publicPlain,
        publicKey: publicKey,
        secretLength: header.secretLength,
        secretNonce: secretNonce,
        secretCiphertext: secretCiphertext,
        secretPlain: secretPlain,
        secretKey: secretKey,
        recoveryMetadata: recoveryRecord ? recoveryRecord.recoveryMetadata : null,
        recoveryMethodData: recoveryRecord ? new Uint8Array(recoveryRecord.methodData) : null
      });

      headerBytes = null;
      wrappedBlock = null;
      publicKey = null;
      publicPlain = null;
      secretKey = null;
      secretPlain = null;
      secretData = null;
      secretNonce = null;
      secretCiphertext = null;
      return session;
    } catch (error) {
      if (isSizeLimitError(error)) {
        throw error;
      }
      throw authenticationError();
    } finally {
      zeroBytes(bytes);
      zeroBytes(headerBytes);
      zeroBytes(wrappedBlock);
      zeroBytes(dek);
      zeroBytes(publicKey);
      zeroBytes(secretKey);
      zeroBytes(publicPlain);
      zeroBytes(secretPlain);
      zeroBytes(publicNonce);
      zeroBytes(publicCiphertext);
      zeroBytes(secretNonce);
      zeroBytes(secretCiphertext);
      zeroBytes(aad);
      zeroBytes(wrappingKey);
    }
  }

  async function openSession(value, passphrase, mode, keyfile, recoveryShares) {
    return openVaultSession(value, passphrase, mode, keyfile, recoveryShares);
  }

  function inspectHeader(value) {
    try {
      requireVaultHealth(authenticationError);
      return publicHeader(parseHeader(ensureVaultBytes(value)));
    } catch (error) {
      if (isSizeLimitError(error)) {
        throw error;
      }
      throw authenticationError();
    }
  }

  var api = Object.freeze({
    formatVersion: FORMAT_VERSION,
    constants: Object.freeze({
      headerLength: HEADER_LENGTH,
      paddingBlock: PADDING_BLOCK,
      saltLength: SALT_LENGTH,
      nonceLength: NONCE_LENGTH,
      tagLength: TAG_LENGTH,
      maxVaultBytes: MAX_VAULT_BYTES,
      maxKeyfileBytes: MAX_KEYFILE_BYTES,
      maxKeyfileHintBytes: MAX_KEYFILE_HINT_BYTES,
      kdfArgon2id: KDF_ARGON2ID,
      kdfPbkdf2: KDF_PBKDF2,
      cipherAesGcm: CIPHER_AES_GCM,
      methodPassphrase: METHOD_PASSPHRASE,
      methodPassphraseKeyfile: METHOD_PASSPHRASE_KEYFILE,
      methodRecoveryShares: METHOD_RECOVERY_SHARES,
      recoveryMethodDataVersion: RECOVERY_METHOD_DATA_VERSION,
      recoveryHeaderMarker: RECOVERY_HEADER_MARKER
    }),
    create: createVault,
    serialize: createVault,
    open: openVault,
    openPublic: openPublicVault,
    openSession: openSession,
    parse: openVault,
    inspectHeader: inspectHeader,
    healthReady: vaultHealthReady
  });

  Object.defineProperty(global, '__coldboxVault', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
