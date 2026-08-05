'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const cryptoSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'crypto.js'), 'utf8');
const vaultSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'vault.js'), 'utf8');

function baseContext() {
  const nodes = new Map();
  const document = {
    documentElement: { setAttribute() {} },
    getElementById(id) {
      if (!nodes.has(id)) {
        nodes.set(id, { textContent: '', setAttribute() {} });
      }
      return nodes.get(id);
    }
  };
  const context = {
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    atob,
    clearTimeout,
    console,
    crypto: crypto.webcrypto,
    document,
    navigator: { onLine: false },
    setTimeout
  };
  context.window = context;
  context.self = context;
  return context;
}

function createRealContext() {
  const context = baseContext();
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(cryptoSource, context);
  vm.runInNewContext(vaultSource, context);
  return context;
}

function createFormatContext() {
  const context = baseContext();
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  const nobleLayer = context.__coldboxNobleCrypto;
  const realContext = createRealContext();
  const realCrypto = realContext.__coldboxCrypto;
  let activeProfile = 'fast';
  // When set, deriveKey silently derives with this profile instead of the one
  // requested - the shape of a real Argon2id-to-PBKDF2 fallback. getKdfDetails()
  // is deliberately left reporting the stale value so a regression that reads
  // module state instead of the derivation's own result is caught.
  let deriveOverride = null;
  const profileDetails = {
    fast: { id: 'argon2id-fast', memoryKiB: 19456, iterations: 2, parallelism: 1 },
    standard: { id: 'argon2id-standard', memoryKiB: 65536, iterations: 3, parallelism: 1 },
    paranoid: { id: 'argon2id-paranoid', memoryKiB: 262144, iterations: 4, parallelism: 1 },
    fallback: { id: 'pbkdf2-sha512-fallback', memoryKiB: 0, iterations: 1000000, parallelism: 1 }
  };
  const toFakeBytes = (value) => new context.Uint8Array(value);
  const fakeCrypto = {
    randomBytes(length) {
      return toFakeBytes(realCrypto.randomBytes(length));
    },
    async deriveKey(passphrase, salt, profileName) {
      const requested = profileName === 'fallback' ? 'fallback' : profileName || 'fast';
      const used = deriveOverride || requested;
      // Module state records the REQUESTED profile, mirroring the real layer,
      // where setActiveKdf() runs before an Argon2id failure falls through to
      // PBKDF2. When an override is active these deliberately diverge, which is
      // precisely the condition the header must not be built from.
      activeProfile = requested;
      const pass = typeof passphrase === 'string' ? passphrase : Buffer.from(passphrase).toString('hex');
      const digest = crypto.createHash('sha256')
        .update(pass)
        .update(Buffer.from(salt))
        .digest();
      // Reports the profile actually used, exactly as the real layer does.
      // An unknown override name passes through verbatim so the strict header
      // path can be exercised.
      return { key: toFakeBytes(digest), profileId: (profileDetails[used] || { id: used }).id };
    },
    getKdfDetails() {
      return { ...profileDetails[activeProfile] };
    },
    aesGcm(operation, key, nonce, input, aad) {
      return realCrypto.aesGcm(
        operation,
        new Uint8Array(key),
        new Uint8Array(nonce),
        new Uint8Array(input),
        new Uint8Array(aad),
        'noble'
      ).then(toFakeBytes);
    }
  };
  context.__coldboxCrypto = fakeCrypto;
  context.__forceDerivedProfile = (name) => { deriveOverride = name; };
  assert.equal(typeof nobleLayer.hkdf, 'function');
  vm.runInNewContext(vaultSource, context);
  return context;
}

function createTrackingContext() {
  const context = baseContext();
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(cryptoSource, context);
  const originalNoble = context.__coldboxNobleCrypto;
  const infos = [];
  const trackedNoble = Object.create(originalNoble);
  Object.defineProperty(trackedNoble, 'hkdf', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function () {
      infos.push(new TextDecoder().decode(new Uint8Array(arguments[3])));
      return originalNoble.hkdf.apply(this, arguments);
    }
  });
  context.__coldboxNobleCrypto = trackedNoble;
  vm.runInNewContext(vaultSource, context);
  return { context, infos };
}

function cloneBytes(value) {
  return new Uint8Array(value);
}

function compartmentNonce(vault, header, secret) {
  const publicNonceOffset = header.wrappedDekLength + 65;
  const secretNonceOffset = publicNonceOffset + 12 + header.publicLength;
  const offset = secret ? secretNonceOffset : publicNonceOffset;
  return vault.slice(offset, offset + 12);
}

async function expectAuthenticationFailure(operation) {
  await assert.rejects(operation, (error) => error && error.message === 'Vault authentication failed.');
}

test('header records the KDF that actually derived the key, not module state', async () => {
  const context = createFormatContext();
  const vaultApi = context.__coldboxVault;

  // Request paranoid, but make the derivation silently fall back to PBKDF2 -
  // the shape of a real Argon2id allocation failure. getKdfDetails() is left
  // reporting the stale paranoid values on purpose.
  context.__forceDerivedProfile('fallback');
  const vault = await vaultApi.create({
    passphrase: 'correct horse battery staple',
    publicData: { note: 'kdf provenance' },
    profile: 'paranoid'
  });
  context.__forceDerivedProfile(null);

  const header = vaultApi.inspectHeader(vault);
  assert.equal(header.kdfId, 2, 'header must record PBKDF2, the KDF actually used');
  assert.equal(header.memoryKiB, 0);
  assert.equal(header.iterations, 1000000);
  assert.notEqual(header.memoryKiB, 262144, 'must not record the requested paranoid profile');

  // The decisive property: a vault whose header disagrees with its key is
  // unopenable forever, so prove it still opens.
  context.__forceDerivedProfile('fallback');
  const opened = await vaultApi.open(vault, 'correct horse battery staple');
  context.__forceDerivedProfile(null);
  // Compared field-wise: publicData is constructed inside the VM context, so
  // deepEqual fails on prototype identity rather than on content.
  assert.equal(opened.publicData.note, 'kdf provenance');
});

test('an unrecognized derived profile fails closed instead of defaulting', async () => {
  const context = createFormatContext();
  context.__forceDerivedProfile('argon2id-nonexistent');
  await assert.rejects(
    context.__coldboxVault.create({ passphrase: 'pw', publicData: {} }),
    (error) => error && error.message === 'Vault serialization failed.'
  );
  context.__forceDerivedProfile(null);
});

test('P0.11 vault round-trip uses real P0.10 crypto and 64 KiB compartments', async () => {
  const context = createRealContext();
  const publicData = { wallets: [{ id: 'public-wallet', label: 'Offline wallet' }] };
  const secretData = { seeds: [{ id: 'secret-seed', storedSecret: { mnemonic: 'test only' } }] };
  const vault = await context.__coldboxVault.create({
    passphrase: 'correct horse battery staple',
    profile: 'fast',
    publicData,
    secretData
  });
  const header = context.__coldboxVault.inspectHeader(vault);
  assert.equal(header.formatVersion, 1);
  assert.equal(header.kdfId, 1);
  assert.equal(header.cipherId, 1);
  assert.equal((header.publicLength - 16) % (64 * 1024), 0);
  assert.equal((header.secretLength - 16) % (64 * 1024), 0);

  const opened = await context.__coldboxVault.open(vault, 'correct horse battery staple');
  assert.equal(JSON.stringify(opened.publicData), JSON.stringify(publicData));
  assert.equal(JSON.stringify(opened.secretData), JSON.stringify(secretData));

  const publicOnly = await context.__coldboxVault.create({
    passphrase: 'correct horse battery staple',
    profile: 'fast',
    publicData
  });
  const publicOnlyHeader = context.__coldboxVault.inspectHeader(publicOnly);
  assert.equal(publicOnlyHeader.secretLength, 0);
  const publicOnlyOpened = await context.__coldboxVault.open(publicOnly, 'correct horse battery staple');
  assert.equal(publicOnlyOpened.secretData, null);
});

test('P0.11 online opening never derives or decrypts the secret compartment', async () => {
  const tracked = createTrackingContext();
  const context = tracked.context;
  const passphrase = 'online mode passphrase';
  const vault = await context.__coldboxVault.create({
    passphrase,
    profile: 'fallback',
    publicData: { wallets: [] },
    secretData: { seeds: [{ mnemonic: 'test only' }] }
  });
  context.navigator.onLine = true;
  tracked.infos.length = 0;
  const opened = await context.__coldboxVault.open(vault, passphrase);
  assert.equal(opened.secretData, null);
  assert.deepEqual(tracked.infos, ['cbx/public/v1']);
  await expectAuthenticationFailure(
    () => context.__coldboxVault.open(vault, passphrase, 'offline')
  );
});

test('P0.13 vault sessions rotate re-encrypted nonces and preserve online secret bytes', async () => {
  const context = createFormatContext();
  const passphrase = 'session save passphrase';
  const vault = await context.__coldboxVault.create({
    passphrase,
    profile: 'fallback',
    publicData: { wallets: [{ id: 'public' }] },
    secretData: { seeds: [{ mnemonic: 'test only' }] }
  });
  const header = context.__coldboxVault.inspectHeader(vault);

  const offlineSession = await context.__coldboxVault.openSession(vault, passphrase, 'offline');
  const offlineFirst = await offlineSession.save();
  const offlineSecond = await offlineSession.save();
  assert.notDeepEqual(
    compartmentNonce(offlineFirst, header, false),
    compartmentNonce(offlineSecond, header, false)
  );
  assert.notDeepEqual(
    compartmentNonce(offlineFirst, header, true),
    compartmentNonce(offlineSecond, header, true)
  );
  offlineSession.close();

  context.navigator.onLine = true;
  const onlineSession = await context.__coldboxVault.openSession(vault, passphrase, 'online');
  const onlineSaved = await onlineSession.save();
  const secretOffset = 65 + header.wrappedDekLength + 12 + header.publicLength;
  assert.deepEqual(onlineSaved.slice(secretOffset), vault.slice(secretOffset));
  onlineSession.close();
});

test('P0.11 authenticates every header byte and keeps corruption errors indistinguishable', async () => {
  const context = createFormatContext();
  const vault = await context.__coldboxVault.create({
    passphrase: 'right passphrase',
    profile: 'fallback',
    publicData: { records: [{ value: 1 }] },
    secretData: { records: [{ value: 2 }] }
  });
  const header = context.__coldboxVault.inspectHeader(vault);

  for (let index = 0; index < 65; index += 1) {
    const tamperedHeader = cloneBytes(vault);
    tamperedHeader[index] ^= 1;
    await expectAuthenticationFailure(() => context.__coldboxVault.open(tamperedHeader, 'right passphrase'));
  }

  await expectAuthenticationFailure(() => context.__coldboxVault.open(vault, 'wrong passphrase'));
  const corrupted = cloneBytes(vault);
  const ciphertextOffset = 65 + header.wrappedDekLength + 12;
  corrupted[ciphertextOffset + 3] ^= 1;
  await expectAuthenticationFailure(() => context.__coldboxVault.open(corrupted, 'right passphrase'));
  await expectAuthenticationFailure(() => context.__coldboxVault.open(vault, 'wrong passphrase'));
});

test('P0.11 exposes the vault API only in the cold layer and never exports secret-subkey derivation', () => {
  const warmSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
  const warmTemplate = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
  assert.doesNotMatch(warmSource, /__coldboxVault|deriveSecretSubkey|cbx\/secret\/v1/);
  assert.doesNotMatch(warmTemplate, /__COLDBOX_VAULT_LAYER__/);

  const context = createFormatContext();
  assert.equal(typeof context.__coldboxVault, 'object');
  assert.equal(typeof context.__coldboxVault.deriveSecretSubkey, 'undefined');
  assert.match(vaultSource, /cbx\/secret\/v1/);
});
