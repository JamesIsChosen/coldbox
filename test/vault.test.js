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
      activeProfile = profileName === 'fallback' ? 'fallback' : profileName || 'fast';
      const pass = typeof passphrase === 'string' ? passphrase : Buffer.from(passphrase).toString('hex');
      const digest = crypto.createHash('sha256')
        .update(pass)
        .update(Buffer.from(salt))
        .digest();
      return toFakeBytes(digest);
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
  assert.equal(typeof nobleLayer.hkdf, 'function');
  vm.runInNewContext(vaultSource, context);
  return context;
}

function cloneBytes(value) {
  return new Uint8Array(value);
}

async function expectAuthenticationFailure(operation) {
  await assert.rejects(operation, (error) => error && error.message === 'Vault authentication failed.');
}

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
