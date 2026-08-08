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
  const attributes = new Map([
    ['data-cold-state', 'ready'],
    ['data-csp-canary', 'passed'],
    ['data-runtime-neutering', 'installed'],
    ['data-provider-neutering', 'installed'],
    ['data-capability-randomValues', 'true'],
    ['data-crypto-state', 'ready'],
    ['data-airgap-state', 'green'],
    ['data-lockdown-state', 'none'],
    ['data-vault-operations', 'guarded'],
    ['data-warm-network-online', 'false']
  ]);
  const document = {
    documentElement: {
      getAttribute(name) {
        return attributes.has(name) ? attributes.get(name) : null;
      },
      setAttribute(name, value) {
        attributes.set(name, String(value));
      }
    },
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
  context.__setVaultHealth = (name, value) => {
    attributes.set(name, String(value));
  };
  context.__setWarmNetworkOnline = (value) => {
    if (value === null || value === undefined) {
      attributes.delete('data-warm-network-online');
      return;
    }
    attributes.set('data-warm-network-online', String(value));
  };
  context.__resetVaultHealth = () => {
    attributes.set('data-cold-state', 'ready');
    attributes.set('data-csp-canary', 'passed');
    attributes.set('data-runtime-neutering', 'installed');
    attributes.set('data-provider-neutering', 'installed');
    attributes.set('data-capability-randomValues', 'true');
    attributes.set('data-crypto-state', 'ready');
    attributes.set('data-airgap-state', 'green');
    attributes.set('data-lockdown-state', 'none');
    attributes.set('data-vault-operations', 'guarded');
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
    profiles: Object.freeze(profileDetails),
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

function createPublicTrackingContext() {
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
      const info = arguments[3];
      infos.push(new TextDecoder().decode(new Uint8Array(info)));
      return originalNoble.hkdf.apply(this, arguments);
    }
  });
  context.__coldboxNobleCrypto = trackedNoble;
  vm.runInNewContext(vaultSource, context);
  return { context, infos };
}

function createTrackingContext() {
  return createPublicTrackingContext();
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

function secretRegion(vault, header) {
  const publicNonceOffset = header.wrappedDekLength + 65;
  const secretNonceOffset = publicNonceOffset + 12 + header.publicLength;
  return vault.slice(secretNonceOffset);
}

async function expectAuthenticationFailure(operation) {
  await assert.rejects(operation, (error) => error && error.message === 'Vault authentication failed.');
}

async function expectSerializationFailure(operation) {
  await assert.rejects(operation, (error) => error && error.message === 'Vault serialization failed.');
}

async function expectSizeLimitFailure(operation) {
  await assert.rejects(operation, (error) => (
    error
    && error.code === 'VAULT_SIZE_LIMIT'
    && error.message === 'Vault exceeds the 64 MiB size limit.'
  ));
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

test('unrecognized requested and derived KDF profiles fail closed instead of defaulting', async () => {
  const requestedContext = createFormatContext();
  await expectSerializationFailure(
    () => requestedContext.__coldboxVault.create({
      passphrase: 'pw',
      publicData: {},
      profile: 'paranoyd'
    })
  );

  const derivedContext = createFormatContext();
  derivedContext.__forceDerivedProfile('argon2id-nonexistent');
  await expectSerializationFailure(
    () => derivedContext.__coldboxVault.create({ passphrase: 'pw', publicData: {} })
  );
  derivedContext.__forceDerivedProfile(null);
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

test('P0.13 public-only unlock never derives the secret subkey', async () => {
  const tracked = createPublicTrackingContext();
  const context = tracked.context;
  const vault = await context.__coldboxVault.create({
    passphrase: 'online public passphrase',
    profile: 'fast',
    publicData: { wallets: [] },
    secretData: { seeds: [{ storedSecret: { mnemonic: 'test only' } }] }
  });
  tracked.infos.length = 0;
  const opened = await context.__coldboxVault.openPublic(vault, 'online public passphrase');
  assert.equal(JSON.stringify(opened.publicData), JSON.stringify({ wallets: [] }));
  assert.equal(opened.secretData, null);
  assert.deepEqual(tracked.infos, ['cbx/public/v1']);
});

test('P0.12 all Argon2id profiles round-trip and remain stored in the header', async () => {
  const context = createRealContext();
  const expected = {
    fast: { memoryKiB: 19456, iterations: 2, parallelism: 1 },
    standard: { memoryKiB: 65536, iterations: 3, parallelism: 1 },
    paranoid: { memoryKiB: 262144, iterations: 4, parallelism: 1 }
  };

  for (const profile of Object.keys(expected)) {
    const vault = await context.__coldboxVault.create({
      passphrase: 'profile round-trip passphrase',
      profile,
      publicData: { profile }
    });
    const header = context.__coldboxVault.inspectHeader(vault);
    assert.equal(header.kdfId, 1);
    assert.equal(header.memoryKiB, expected[profile].memoryKiB);
    assert.equal(header.iterations, expected[profile].iterations);
    assert.equal(header.parallelism, expected[profile].parallelism);
    const opened = await context.__coldboxVault.open(vault, 'profile round-trip passphrase');
    assert.equal(opened.publicData.profile, profile);
    assert.equal(opened.secretData, null);
  }
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
  context.navigator.onLine = false;
  context.__setWarmNetworkOnline(true);
  tracked.infos.length = 0;
  const opened = await context.__coldboxVault.open(vault, passphrase);
  assert.equal(opened.secretData, null);
  assert.deepEqual(tracked.infos, ['cbx/public/v1']);
  await expectAuthenticationFailure(
    () => context.__coldboxVault.open(vault, passphrase, 'offline')
  );
});

test('P0.13 vault sessions rotate nonces, preserve online secret bytes, and close on mode or health drift', async () => {
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

  context.__setWarmNetworkOnline(true);
  await expectSerializationFailure(() => offlineSession.save());
  await expectSerializationFailure(() => offlineSession.save());

  const onlineSession = await context.__coldboxVault.openSession(vault, passphrase, 'online');
  const onlineFirst = await onlineSession.save();
  const onlineSecond = await onlineSession.save();
  assert.notDeepEqual(
    compartmentNonce(onlineFirst, header, false),
    compartmentNonce(onlineSecond, header, false)
  );
  assert.deepEqual(secretRegion(onlineFirst, header), secretRegion(vault, header));
  assert.deepEqual(secretRegion(onlineSecond, header), secretRegion(vault, header));

  context.__setVaultHealth('data-vault-operations', 'refused');
  await expectSerializationFailure(() => onlineSession.save());
  context.__resetVaultHealth();
  await expectSerializationFailure(() => onlineSession.save());
});

test('P0.11 refuses every vault entry point unless the cold health gate is proven', async () => {
  const context = createFormatContext();
  const passphrase = 'health gate passphrase';
  const vault = await context.__coldboxVault.create({
    passphrase,
    profile: 'fallback',
    publicData: { wallets: [] }
  });

  const failures = [
    ['data-cold-state', 'failed'],
    ['data-csp-canary', 'failed'],
    ['data-runtime-neutering', 'failed'],
    ['data-provider-neutering', 'failed'],
    ['data-capability-randomValues', 'false'],
    ['data-crypto-state', 'failed'],
    ['data-airgap-state', 'red'],
    ['data-lockdown-state', 'full'],
    ['data-vault-operations', 'refused']
  ];

  assert.equal(context.__coldboxVault.healthReady(), true);
  for (const [name, value] of failures) {
    context.__resetVaultHealth();
    context.__setVaultHealth(name, value);
    assert.equal(context.__coldboxVault.healthReady(), false, `${name} must close the shared vault-health gate`);
    await expectSerializationFailure(
      () => context.__coldboxVault.create({ passphrase, profile: 'fallback', publicData: {} })
    );
    await expectAuthenticationFailure(() => context.__coldboxVault.open(vault, passphrase));
    await expectAuthenticationFailure(() => context.__coldboxVault.openPublic(vault, passphrase));
    await expectAuthenticationFailure(() => context.__coldboxVault.openSession(vault, passphrase, 'online'));
    assert.throws(
      () => context.__coldboxVault.inspectHeader(vault),
      (error) => error && error.message === 'Vault authentication failed.'
    );
  }

  context.__resetVaultHealth();
  context.__setVaultHealth('data-crypto-state', 'fallback');
  assert.equal(context.__coldboxVault.healthReady(), true, 'explicit fallback remains a valid vault-health state');
  const fallbackOpened = await context.__coldboxVault.open(vault, passphrase);
  assert.equal(JSON.stringify(fallbackOpened.publicData), JSON.stringify({ wallets: [] }));

  context.__resetVaultHealth();
  const opened = await context.__coldboxVault.open(vault, passphrase);
  assert.equal(JSON.stringify(opened.publicData), JSON.stringify({ wallets: [] }));
});

test('P0.19 vault mode follows validated warm mode.set state, ignores navigator.onLine, and fails closed on unknown', async () => {
  const context = createFormatContext();

  // Browser interface signal says offline, but validated warm reachability says
  // online. Secret-capable creation must remain sealed.
  context.navigator.onLine = false;
  context.__setWarmNetworkOnline(true);
  await expectSerializationFailure(
    () => context.__coldboxVault.create({
      passphrase: 'mode gate online',
      profile: 'fallback',
      publicData: {},
      secretData: { mnemonic: 'test only' }
    })
  );

  // The inverse disagreement is the Windows P0.19 regression: navigator stays
  // true while active warm probes establish no external reachability. The
  // validated warm classification is authoritative, so offline secret use is
  // allowed even though navigator.onLine remains true.
  context.navigator.onLine = true;
  context.__setWarmNetworkOnline(false);
  const secretVault = await context.__coldboxVault.create({
    passphrase: 'mode gate offline',
    profile: 'fallback',
    publicData: {},
    secretData: { mnemonic: 'test only' }
  });
  const secretOpened = await context.__coldboxVault.open(secretVault, 'mode gate offline');
  assert.equal(JSON.stringify(secretOpened.secretData), JSON.stringify({ mnemonic: 'test only' }));

  // No accepted mode.set yet (or malformed state) is unknown. Unknown remains
  // online-safe: public-only work can proceed, but explicit offline unlock is
  // refused and secret-capable creation cannot occur.
  context.__setWarmNetworkOnline(null);
  await expectSerializationFailure(
    () => context.__coldboxVault.create({
      passphrase: 'mode gate unknown secret',
      profile: 'fallback',
      publicData: {},
      secretData: { mnemonic: 'test only' }
    })
  );
  const publicOnly = await context.__coldboxVault.create({
    passphrase: 'mode gate unknown public',
    profile: 'fallback',
    publicData: {}
  });
  const opened = await context.__coldboxVault.open(publicOnly, 'mode gate unknown public');
  assert.equal(opened.secretData, null);
  await expectAuthenticationFailure(
    () => context.__coldboxVault.open(publicOnly, 'mode gate unknown public', 'offline')
  );
});

test('P0.11 uses the crypto-layer KDF profile table as the single runtime source', () => {
  const context = createRealContext();
  assert.equal(context.__coldboxCrypto.profiles.fallback.memoryKiB, 0);
  assert.equal(context.__coldboxVault.constants.maxVaultBytes, 64 * 1024 * 1024);
});

test('P0.11 reports the public 64 MiB file-size refusal distinctly from authentication failure', async () => {
  const context = createFormatContext();
  const overLimit = new context.Uint8Array(context.__coldboxVault.constants.maxVaultBytes + 1);
  await expectSizeLimitFailure(() => context.__coldboxVault.open(overLimit, 'irrelevant'));
  assert.throws(
    () => context.__coldboxVault.inspectHeader(overLimit),
    (error) => (
      error
      && error.code === 'VAULT_SIZE_LIMIT'
      && error.message === 'Vault exceeds the 64 MiB size limit.'
    )
  );
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

test('P0.11/P0.13 keeps the vault API cold-only while exposing only the bounded session surface', () => {
  const warmSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
  const warmTemplate = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
  assert.doesNotMatch(warmSource, /__coldboxVault|deriveSecretSubkey|cbx\/secret\/v1/);
  assert.doesNotMatch(warmSource, /passphrase|cold-vault-passphrase/);
  assert.doesNotMatch(warmTemplate, /__COLDBOX_VAULT_LAYER__|cold-vault-passphrase/);

  const context = createFormatContext();
  assert.equal(typeof context.__coldboxVault, 'object');
  assert.equal(typeof context.__coldboxVault.deriveSecretSubkey, 'undefined');
  assert.equal(typeof context.__coldboxVault.openSession, 'function');
  assert.match(vaultSource, /function createVaultSession/);
  assert.match(vaultSource, /function openVaultSession/);
  assert.match(vaultSource, /function openSession/);
  assert.match(vaultSource, /cbx\/secret\/v1/);
});

// --- P0.15 keyfile unlock (wrapped-DEK method 2) ---

function methodIdOf(vault) {
  // The wrapped-DEK block starts immediately after the fixed 65-byte header.
  return vault[65];
}

test('P0.15 a vault created without a keyfile is byte-identical in shape to a method-1-only vault', async () => {
  const context = createRealContext();
  const vault = await context.__coldboxVault.create({
    passphrase: 'no keyfile here',
    profile: 'fast',
    publicData: { note: 'passphrase only' }
  });
  const header = context.__coldboxVault.inspectHeader(vault);
  assert.equal(header.wrappedDekLength, 64, 'off by default: no keyfile means the historic 64-byte method-1 record');
  assert.equal(methodIdOf(vault), 1, 'method id 1 (passphrase) when no keyfile is supplied');
});

test('P0.15 keyfile unlock: correct passphrase and correct keyfile unlocks; wraps as method 2', async () => {
  const context = createRealContext();
  const keyfile = context.__coldboxCrypto.randomBytes(4096);
  const publicData = { wallets: [{ id: 'kf-wallet' }] };
  const secretData = { seeds: [{ id: 'kf-seed', storedSecret: { mnemonic: 'test only' } }] };

  const vault = await context.__coldboxVault.create({
    passphrase: 'keyfile vault passphrase',
    profile: 'fast',
    publicData,
    secretData,
    keyfile,
    keyfileHint: 'my-keyfile.bin'
  });

  const header = context.__coldboxVault.inspectHeader(vault);
  assert.equal(methodIdOf(vault), 2, 'method id 2 (passphrase+keyfile) when a keyfile is supplied');
  assert.equal(header.wrappedDekLength, 4 + 'my-keyfile.bin'.length + 60);

  const opened = await context.__coldboxVault.open(vault, 'keyfile vault passphrase', undefined, keyfile);
  assert.equal(JSON.stringify(opened.publicData), JSON.stringify(publicData));
  assert.equal(JSON.stringify(opened.secretData), JSON.stringify(secretData));
});

test('P0.15 keyfile unlock fails closed with the exact original passphrase but no keyfile supplied', async () => {
  const context = createRealContext();
  const keyfile = context.__coldboxCrypto.randomBytes(2048);
  const vault = await context.__coldboxVault.create({
    passphrase: 'requires a keyfile',
    profile: 'fast',
    publicData: { wallets: [] },
    keyfile
  });

  await expectAuthenticationFailure(
    () => context.__coldboxVault.open(vault, 'requires a keyfile')
  );
});

test('P0.15 keyfile unlock fails closed on a one-byte-altered keyfile, indistinguishably from a wrong passphrase', async () => {
  const context = createRealContext();
  const keyfile = context.__coldboxCrypto.randomBytes(8192);
  const vault = await context.__coldboxVault.create({
    passphrase: 'byte altered keyfile test',
    profile: 'fast',
    publicData: { wallets: [] },
    keyfile
  });

  // Sanity: the untouched keyfile unlocks.
  const opened = await context.__coldboxVault.open(vault, 'byte altered keyfile test', undefined, keyfile);
  assert.equal(JSON.stringify(opened.publicData), JSON.stringify({ wallets: [] }));

  const alteredKeyfile = new Uint8Array(keyfile);
  alteredKeyfile[0] ^= 1;
  let alteredError;
  try {
    await context.__coldboxVault.open(vault, 'byte altered keyfile test', undefined, alteredKeyfile);
  } catch (error) {
    alteredError = error;
  }
  let wrongPassphraseError;
  try {
    await context.__coldboxVault.open(vault, 'wrong passphrase entirely', undefined, keyfile);
  } catch (error) {
    wrongPassphraseError = error;
  }
  assert.ok(alteredError, 'a one-byte-altered keyfile must fail closed, not throw silently or open');
  assert.equal(alteredError.message, 'Vault authentication failed.');
  assert.equal(wrongPassphraseError.message, 'Vault authentication failed.');
  assert.equal(
    alteredError.message,
    wrongPassphraseError.message,
    'a byte-altered keyfile and a wrong passphrase must be indistinguishable errors'
  );
  assert.equal(alteredError.code, wrongPassphraseError.code);
});

test('P0.15 regression: passphrase-only vaults are unaffected by the keyfile feature existing', async () => {
  const context = createRealContext();
  const passphrase = 'passphrase only regression';
  const publicData = { wallets: [{ id: 'plain' }] };
  const secretData = { seeds: [{ storedSecret: { mnemonic: 'test only' } }] };
  const vault = await context.__coldboxVault.create({
    passphrase,
    profile: 'fast',
    publicData,
    secretData
  });

  // Opens exactly as before - no keyfile argument at all.
  const opened = await context.__coldboxVault.open(vault, passphrase);
  assert.equal(JSON.stringify(opened.publicData), JSON.stringify(publicData));
  assert.equal(JSON.stringify(opened.secretData), JSON.stringify(secretData));

  // Erroneously supplying a keyfile to a passphrase-only vault does not break it -
  // there is no method-2 record to consult, so the extra credential is ignored.
  const strayKeyfile = context.__coldboxCrypto.randomBytes(256);
  const openedWithStrayKeyfile = await context.__coldboxVault.open(vault, passphrase, undefined, strayKeyfile);
  assert.equal(JSON.stringify(openedWithStrayKeyfile.publicData), JSON.stringify(publicData));

  await expectAuthenticationFailure(() => context.__coldboxVault.open(vault, 'wrong passphrase'));
});

test('P0.15 openSession round-trips a keyfile vault and save() preserves the wrapped-DEK block', async () => {
  const context = createRealContext();
  const keyfile = context.__coldboxCrypto.randomBytes(1024);
  const passphrase = 'keyfile session passphrase';
  const vault = await context.__coldboxVault.create({
    passphrase,
    profile: 'fast',
    publicData: { wallets: [{ id: 'session' }] },
    secretData: { seeds: [{ storedSecret: { mnemonic: 'test only' } }] },
    keyfile
  });

  const session = await context.__coldboxVault.openSession(vault, passphrase, 'offline', keyfile);
  assert.equal(JSON.stringify(session.publicData), JSON.stringify({ wallets: [{ id: 'session' }] }));
  const saved = await session.save();
  assert.equal(methodIdOf(saved), 2, 'a re-saved keyfile vault keeps its method-2 wrapped-DEK record');

  const reopened = await context.__coldboxVault.open(saved, passphrase, undefined, keyfile);
  assert.equal(JSON.stringify(reopened.publicData), JSON.stringify({ wallets: [{ id: 'session' }] }));
  await expectAuthenticationFailure(() => context.__coldboxVault.open(saved, passphrase));
});

test('P0.15 create() rejects an empty keyfile and an oversized keyfile, failing closed rather than deriving from weak material', async () => {
  const context = createFormatContext();
  await expectSerializationFailure(() => context.__coldboxVault.create({
    passphrase: 'pw',
    publicData: {},
    keyfile: new context.Uint8Array(0)
  }));

  const maxKeyfileBytes = context.__coldboxVault.constants.maxKeyfileBytes;
  const oversized = new context.Uint8Array(maxKeyfileBytes + 1);
  await expectSerializationFailure(() => context.__coldboxVault.create({
    passphrase: 'pw',
    publicData: {},
    keyfile: oversized
  }));
});

test('P0.15 the keyfile hint is filename-only display metadata, never the keyfile bytes', async () => {
  const tracked = createPublicTrackingContext();
  const context = tracked.context;
  const keyfile = context.__coldboxCrypto.randomBytes(512);
  const vault = await context.__coldboxVault.create({
    passphrase: 'hint test passphrase',
    profile: 'fast',
    publicData: {},
    keyfile,
    keyfileHint: 'wallet-keyfile.bin'
  });
  const recordLength = vault[65 + 2] << 8 | vault[65 + 3];
  const hintBytes = vault.slice(65 + 4, 65 + 4 + (recordLength - 60));
  const hintText = new TextDecoder().decode(hintBytes);
  assert.equal(hintText, 'wallet-keyfile.bin');
  // The hint never contains the keyfile's own bytes.
  assert.notEqual(hintText.length, keyfile.length);
});
