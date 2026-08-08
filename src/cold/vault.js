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
    var airgap = global.__coldboxAirgap;
    if (!airgap || typeof airgap.getNetworkSnapshot !== 'function') {
      return 'unknown';
    }
    var snapshot = airgap.getNetworkSnapshot();
    if (!snapshot || snapshot.online === null || snapshot.online === undefined) {
      return 'unknown';
    }
    return snapshot.online === true ? 'online' : (snapshot.online === false ? 'offline' : 'unknown');
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
  function makeHeader(profileId, salt, wrappedLength, publicLength, secretLength) {
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
    writeUint32(header, 53, wrappedLength);
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
    var header = {
      formatVersion: readUint16(bytes, 8),
      kdfId: bytes[10],
      memoryKiB: readUint32(bytes, 11),
      iterations: readUint32(bytes, 15),
      parallelism: bytes[19],
      cipherId: bytes[20],
      salt: bytes.slice(21, 53),
      wrappedDekLength: readUint32(bytes, 53),
      publicLength: readUint32(bytes, 57),
      secretLength: readUint32(bytes, 61)
    };
    if (header.formatVersion !== FORMAT_VERSION
      || header.cipherId !== CIPHER_AES_GCM
      || header.wrappedDekLength < 4 + 60
      || header.wrappedDekLength > 65535
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
      publicLength: header.publicLength,
      secretLength: header.secretLength
    });
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
      if (recordLength < 60 || cursor + 4 + recordLength > end) {
        throw authenticationError();
      }
      var methodDataLength = recordLength - 60;
      var recordStart = cursor + 4;
      var nonceStart = recordStart + methodDataLength;
      var wrappedStart = nonceStart + NONCE_LENGTH;
      records.push({
        methodId: methodId,
        flags: flags,
        methodData: bytes.slice(recordStart, nonceStart),
        nonce: bytes.slice(nonceStart, wrappedStart),
        wrappedDek: bytes.slice(wrappedStart, wrappedStart + WRAPPED_DEK_LENGTH)
      });
      cursor += 4 + recordLength;
    }
    if (records.length === 0 || cursor !== end) {
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
          return dek;
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

  // Tries every wrapped-DEK record this vault carries against every unlock
  // credential this caller supplied. A vault created without a keyfile has no
  // method-2 record, so supplying one is simply never consulted - passphrase-
  // only vaults are unaffected by this function existing. A vault created
  // with a keyfile has no method-1 record, so passphrase alone can never
  // unwrap it. Every failure path - wrong passphrase, missing keyfile, or a
  // byte-altered keyfile - converges on the same authenticationError(), never
  // revealing which credential or which record was wrong.
  async function unwrapDek(records, passphrase, header, keyfile) {
    if (!cryptoLayer || typeof cryptoLayer.deriveKey !== 'function') {
      throw authenticationError();
    }
    var profileName = profileFromHeader(header);
    var passphraseKek = null;
    var keyfileKek = null;
    var keyMaterial = null;
    try {
      var hasPassphraseRecord = records.some(isPassphraseRecord);
      if (hasPassphraseRecord) {
        var derivedPassphrase = await cryptoLayer.deriveKey(passphrase, header.salt, profileName);
        passphraseKek = derivedPassphrase.key;
        var dek = await tryUnwrapWithKey(records, isPassphraseRecord, passphraseKek, header);
        if (dek) {
          return dek;
        }
      }

      var hasKeyfileRecord = records.some(isKeyfileRecord);
      if (hasKeyfileRecord && keyfile) {
        keyMaterial = combinePassphraseKeyfile(passphrase, keyfile, authenticationError);
        var derivedKeyfile = await cryptoLayer.deriveKey(keyMaterial, header.salt, profileName);
        keyfileKek = derivedKeyfile.key;
        var keyfileDek = await tryUnwrapWithKey(records, isKeyfileRecord, keyfileKek, header);
        if (keyfileDek) {
          return keyfileDek;
        }
      }

      throw authenticationError();
    } finally {
      zeroBytes(passphraseKek);
      zeroBytes(keyfileKek);
      zeroBytes(keyMaterial);
    }
  }

  async function openVault(value, passphrase, mode, keyfile) {
    var dek = null;
    var publicKey = null;
    var secretKey = null;
    var publicPlain = null;
    var secretPlain = null;
    try {
      var resolvedMode = resolveMode(mode);
      var bytes = ensureVaultBytes(value);
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
      header.bytes = bytes.slice(0, HEADER_LENGTH);
      var records = parseWrappedRecords(bytes, HEADER_LENGTH, header.wrappedDekLength);
      var publicNonceOffset = HEADER_LENGTH + header.wrappedDekLength;
      var publicNonce = bytes.slice(publicNonceOffset, publicNonceOffset + NONCE_LENGTH);
      var publicCipherOffset = publicNonceOffset + NONCE_LENGTH;
      var publicCiphertext = bytes.slice(publicCipherOffset, publicCipherOffset + header.publicLength);
      var secretNonceOffset = publicCipherOffset + header.publicLength;
      var secretNonce = bytes.slice(secretNonceOffset, secretNonceOffset + NONCE_LENGTH);
      var secretCiphertext = bytes.slice(secretNonceOffset + NONCE_LENGTH);
      dek = await unwrapDek(records, passphrase, header, keyfile);
      publicKey = hkdfSubkey(dek, 'cbx/public/v1');
      publicPlain = await aesGcm('decrypt', publicKey, publicNonce, publicCiphertext, header.bytes);
      var publicData = parsePaddedJson(publicPlain);
      var secretData = null;
      if (resolvedMode === 'offline' && header.secretLength > 0) {
        secretKey = hkdfSubkey(dek, 'cbx/secret/v1');
        secretPlain = await aesGcm('decrypt', secretKey, secretNonce, secretCiphertext, header.bytes);
        secretData = parsePaddedJson(secretPlain);
      }
      return Object.freeze({
        formatVersion: FORMAT_VERSION,
        header: publicHeader(header),
        publicData: publicData,
        secretData: secretData
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
    }
  }

  async function openPublicVault(value, passphrase, keyfile) {
    return openVault(value, passphrase, 'online', keyfile);
  }

  function createVaultSession(state) {
    var closed = false;
    var saving = false;

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
      state.publicKey = null;
      state.secretKey = null;
      state.publicPlain = null;
      state.secretPlain = null;
      state.secretNonce = null;
      state.secretCiphertext = null;
      state.headerBytes = null;
      state.wrappedBlock = null;
    }

    async function save() {
      if (closed || saving) {
        throw serializationError();
      }
      saving = true;
      var publicNonce = null;
      var publicCiphertext = null;
      var secretNonce = null;
      var secretCiphertext = null;
      try {
        requireVaultHealth(serializationError);
        if (networkState() !== state.mode) {
          close();
          throw serializationError();
        }

        publicNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
        publicCiphertext = await aesGcm(
          'encrypt',
          state.publicKey,
          publicNonce,
          state.publicPlain,
          state.headerBytes
        );

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
              state.headerBytes
            );
          } else {
            secretCiphertext = new Uint8Array(0);
          }
        }

        var vault = concatBytes([
          state.headerBytes,
          state.wrappedBlock,
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
        zeroBytes(publicNonce);
        zeroBytes(publicCiphertext);
        zeroBytes(secretNonce);
        zeroBytes(secretCiphertext);
      }
    }

    return Object.freeze({
      formatVersion: FORMAT_VERSION,
      header: state.header,
      publicData: state.publicData,
      save: save,
      close: close
    });
  }

  async function openVaultSession(value, passphrase, mode, keyfile) {
    var bytes = null;
    var headerBytes = null;
    var wrappedBlock = null;
    var dek = null;
    var publicKey = null;
    var secretKey = null;
    var publicPlain = null;
    var secretPlain = null;
    var secretNonce = null;
    var secretCiphertext = null;
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
      wrappedBlock = bytes.slice(HEADER_LENGTH, HEADER_LENGTH + header.wrappedDekLength);
      var publicNonceOffset = HEADER_LENGTH + header.wrappedDekLength;
      var publicNonce = bytes.slice(publicNonceOffset, publicNonceOffset + NONCE_LENGTH);
      var publicCipherOffset = publicNonceOffset + NONCE_LENGTH;
      var publicCiphertext = bytes.slice(publicCipherOffset, publicCipherOffset + header.publicLength);
      var secretNonceOffset = publicCipherOffset + header.publicLength;
      secretNonce = bytes.slice(secretNonceOffset, secretNonceOffset + NONCE_LENGTH);
      secretCiphertext = bytes.slice(secretNonceOffset + NONCE_LENGTH);
      dek = await unwrapDek(records, passphrase, header, keyfile);
      publicKey = hkdfSubkey(dek, 'cbx/public/v1');
      publicPlain = await aesGcm('decrypt', publicKey, publicNonce, publicCiphertext, headerBytes);
      var publicData = parsePaddedJson(publicPlain);
      if (resolvedMode === 'offline' && header.secretLength > 0) {
        secretKey = hkdfSubkey(dek, 'cbx/secret/v1');
        secretPlain = await aesGcm('decrypt', secretKey, secretNonce, secretCiphertext, headerBytes);
        parsePaddedJson(secretPlain);
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
        publicPlain: publicPlain,
        publicKey: publicKey,
        secretLength: header.secretLength,
        secretNonce: secretNonce,
        secretCiphertext: secretCiphertext,
        secretPlain: secretPlain,
        secretKey: secretKey
      });

      headerBytes = null;
      wrappedBlock = null;
      publicKey = null;
      publicPlain = null;
      secretKey = null;
      secretPlain = null;
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
      zeroBytes(secretNonce);
      zeroBytes(secretCiphertext);
    }
  }

  async function openSession(value, passphrase, mode, keyfile) {
    return openVaultSession(value, passphrase, mode, keyfile);
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
      methodPassphraseKeyfile: METHOD_PASSPHRASE_KEYFILE
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
