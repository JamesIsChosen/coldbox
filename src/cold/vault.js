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
  var ERROR_MESSAGE = 'Vault authentication failed.';
  var SERIALIZE_ERROR = 'Vault serialization failed.';
  var PROFILES = Object.freeze({
    fast: Object.freeze({ id: 'argon2id-fast', memoryKiB: 19456, iterations: 2, parallelism: 1 }),
    standard: Object.freeze({ id: 'argon2id-standard', memoryKiB: 65536, iterations: 3, parallelism: 1 }),
    paranoid: Object.freeze({ id: 'argon2id-paranoid', memoryKiB: 262144, iterations: 4, parallelism: 1 }),
    fallback: Object.freeze({ id: 'pbkdf2-sha512-fallback', memoryKiB: 0, iterations: 1000000, parallelism: 1 })
  });

  function authenticationError() {
    return new Error(ERROR_MESSAGE);
  }

  function serializationError() {
    return new Error(SERIALIZE_ERROR);
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
      throw new Error('Vault compartment exceeds the size limit.');
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
    return 'standard';
  }

  function profileFromDetails(details) {
    if (!details || typeof details.id !== 'string') {
      throw serializationError();
    }
    return normalizedProfile(details.id);
  }

  function profileFromHeader(header) {
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

  function makeHeader(details, salt, wrappedLength, publicLength, secretLength) {
    var profileName = profileFromDetails(details);
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
    var bytes = copyBytes(value);
    if (bytes.length > MAX_VAULT_BYTES || bytes.length < HEADER_LENGTH) {
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
    try {
      if (!options || options.passphrase === undefined || !cryptoLayer
        || typeof cryptoLayer.deriveKey !== 'function'
        || typeof cryptoLayer.getKdfDetails !== 'function') {
        throw serializationError();
      }
      var publicData = options.publicData === undefined ? {} : options.publicData;
      var hasSecret = options.secretData !== undefined && options.secretData !== null;
      var profileName = normalizedProfile(options.profile || options.profileName);
      var salt = cryptoLayer.randomBytes(SALT_LENGTH);
      dek = cryptoLayer.randomBytes(DEK_LENGTH);
      publicPlain = paddedJson(publicData);
      secretPlain = hasSecret ? paddedJson(options.secretData) : null;
      var publicNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
      var secretNonce = cryptoLayer.randomBytes(NONCE_LENGTH);
      kek = await cryptoLayer.deriveKey(options.passphrase, salt, profileName);
      var details = cryptoLayer.getKdfDetails();
      var header = makeHeader(
        details,
        salt,
        64,
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
      var vault = concatBytes([
        header,
        passphraseRecord(wrappedNonce, wrappedDek),
        publicNonce,
        publicCiphertext,
        secretNonce,
        secretCiphertext
      ]);
      if (vault.length > MAX_VAULT_BYTES) {
        throw serializationError();
      }
      return vault;
    } catch (error) {
      throw serializationError();
    } finally {
      zeroBytes(dek);
      zeroBytes(kek);
      zeroBytes(publicKey);
      zeroBytes(secretKey);
      zeroBytes(publicPlain);
      zeroBytes(secretPlain);
    }
  }

  async function unwrapDek(records, passphrase, header) {
    if (!cryptoLayer || typeof cryptoLayer.deriveKey !== 'function') {
      throw authenticationError();
    }
    var profileName = profileFromHeader(header);
    var kek = null;
    try {
      kek = await cryptoLayer.deriveKey(passphrase, header.salt, profileName);
      for (var index = 0; index < records.length; index += 1) {
        var record = records[index];
        if (record.methodId !== METHOD_PASSPHRASE || record.flags !== 0 || record.methodData.length !== 0) {
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
      throw authenticationError();
    } finally {
      zeroBytes(kek);
    }
  }

  async function openVault(value, passphrase, includeSecret) {
    var dek = null;
    var publicKey = null;
    var secretKey = null;
    var publicPlain = null;
    var secretPlain = null;
    try {
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
      dek = await unwrapDek(records, passphrase, header);
      publicKey = hkdfSubkey(dek, 'cbx/public/v1');
      publicPlain = await aesGcm('decrypt', publicKey, publicNonce, publicCiphertext, header.bytes);
      var publicData = parsePaddedJson(publicPlain);
      var secretData = null;
      if (includeSecret !== false && header.secretLength > 0) {
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
      throw authenticationError();
    } finally {
      zeroBytes(dek);
      zeroBytes(publicKey);
      zeroBytes(secretKey);
      zeroBytes(publicPlain);
      zeroBytes(secretPlain);
    }
  }

  async function openPublicVault(value, passphrase) {
    return openVault(value, passphrase, false);
  }

  function inspectHeader(value) {
    try {
      return publicHeader(parseHeader(ensureVaultBytes(value)));
    } catch (error) {
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
      kdfArgon2id: KDF_ARGON2ID,
      kdfPbkdf2: KDF_PBKDF2,
      cipherAesGcm: CIPHER_AES_GCM
    }),
    create: createVault,
    serialize: createVault,
    open: openVault,
    openPublic: openPublicVault,
    parse: openVault,
    inspectHeader: inspectHeader
  });

  Object.defineProperty(global, '__coldboxVault', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
