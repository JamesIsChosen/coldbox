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

function createContext(withArgon2 = true) {
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
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  if (!withArgon2) {
    context.argon2 = undefined;
  }
  vm.runInNewContext(cryptoSource, context);
  return context;
}

function zeroBytes(length) {
  return new Uint8Array(length);
}

test('pure-JS and affirmative WebCrypto AES-GCM paths pass the NIST vector', async () => {
  const context = createContext();
  const layer = context.__coldboxCrypto;
  const key = zeroBytes(16);
  const nonce = zeroBytes(12);
  const plaintext = zeroBytes(16);
  const aad = zeroBytes(0);

  await assert.rejects(
    layer.aesGcm('encrypt', key, nonce, plaintext, aad, 'webcrypto'),
    /known-answer test passes/
  );

  const report = await layer.selfTest();
  assert.equal(report.nobleAesGcm, true);
  assert.equal(report.argon2id.passed, true);
  assert.equal(report.webCrypto.passed, true);

  const nobleCiphertext = await layer.aesGcm('encrypt', key, nonce, plaintext, aad, 'noble');
  const webCryptoCiphertext = await layer.aesGcm('encrypt', key, nonce, plaintext, aad, 'webcrypto');
  assert.deepEqual([...nobleCiphertext], [...webCryptoCiphertext]);
  const decrypted = await layer.aesGcm('decrypt', key, nonce, webCryptoCiphertext, aad, 'webcrypto');
  assert.deepEqual([...decrypted], [...plaintext]);
});

test('RFC 9106 Argon2id failure is visible as an explicit PBKDF2 fallback', async () => {
  const context = createContext(false);
  const report = await context.__coldboxCrypto.selfTest();
  assert.equal(report.nobleAesGcm, true);
  assert.equal(report.argon2id.passed, false);
  assert.equal(report.kdf.id, 'pbkdf2-sha512-fallback');
  assert.match(report.kdf.label, /PBKDF2-HMAC-SHA512/);

  const derived = await context.__coldboxCrypto.deriveKey('test passphrase', new Uint8Array(16));
  assert.equal(derived.length, 32);
  assert.equal(context.__coldboxCrypto.getKdfDetails().id, 'pbkdf2-sha512-fallback');
});
