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

function createContext(withArgon2 = true, navigatorValue, performanceValue = performance) {
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
    performance: performanceValue,
    navigator: navigatorValue,
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

  const derived = await context.__coldboxCrypto.deriveKey('test passphrase', new Uint8Array(16), 'fallback');
  assert.equal(derived.key.length, 32);
  // deriveKey reports the KDF it actually used, so callers never have to read
  // mutable module state to build a vault header.
  assert.equal(derived.profileId, 'pbkdf2-sha512-fallback');
  assert.equal(context.__coldboxCrypto.getKdfDetails().id, 'pbkdf2-sha512-fallback');
});

test('KDF benchmark reports meaningful positive ordered timings and the vault Argon2 call shape', async () => {
  const context = createContext();
  await context.__coldboxCrypto.selfTest();

  const originalHash = context.argon2.hash;
  const calls = [];
  context.argon2.hash = function trackedHash(options) {
    calls.push({ ...options });
    return originalHash.call(this, options);
  };

  const report = await context.__coldboxCrypto.benchmarkProfiles();
  assert.deepEqual(Array.from(report.profiles, (profile) => profile.profile), ['fast', 'standard', 'paranoid']);
  for (const profile of report.profiles) {
    assert.equal(profile.status, 'passed');
    assert.equal(typeof profile.durationMs, 'number');
    assert.ok(profile.durationMs > 0, `${profile.profile} benchmark must be meaningfully positive`);
  }
  assert.ok(report.profiles[0].durationMs < report.profiles[1].durationMs, 'Fast must time below Standard');
  assert.ok(report.profiles[1].durationMs < report.profiles[2].durationMs, 'Standard must time below Paranoid');
  assert.match(report.profiles[2].warning, /256 MiB/);
  assert.match(report.profiles[2].warning, /iOS/);

  await context.__coldboxCrypto.deriveKey('benchmark call-shape check', new Uint8Array(16).fill(0x55), 'fast');
  const deriveCall = calls[calls.length - 1];
  const deriveKeys = Object.keys(deriveCall).sort();
  assert.deepEqual(deriveKeys, ['hashLen', 'mem', 'parallelism', 'pass', 'salt', 'time', 'type']);
  for (const benchmarkCall of calls.slice(0, 3)) {
    assert.deepEqual(Object.keys(benchmarkCall).sort(), deriveKeys);
    assert.equal('secret' in benchmarkCall, false);
    assert.equal('ad' in benchmarkCall, false);
  }
});

test('KDF benchmark coalesces concurrent requests and never overlaps profile allocations', async () => {
  const context = createContext();
  await context.__coldboxCrypto.selfTest();

  const originalHash = context.argon2.hash;
  let active = 0;
  let maxActive = 0;
  context.argon2.hash = function trackedHash(options) {
    active += 1;
    maxActive = Math.max(maxActive, active);
    return Promise.resolve(originalHash.call(this, options)).then(
      (result) => {
        active -= 1;
        return result;
      },
      (error) => {
        active -= 1;
        throw error;
      }
    );
  };

  const first = context.__coldboxCrypto.benchmarkProfiles();
  const second = context.__coldboxCrypto.benchmarkProfiles();
  assert.strictEqual(second, first, 'overlapping benchmark requests must share one in-flight promise');
  const [firstReport, secondReport] = await Promise.all([first, second]);
  assert.strictEqual(secondReport, firstReport);
  assert.equal(maxActive, 1, 'only one Argon2 profile allocation may be active at a time');
});

test('KDF benchmark rejects a broken zero-duration clock instead of reporting a fake timing', async () => {
  const context = createContext(true, undefined, { now: () => 100 });
  const report = await context.__coldboxCrypto.benchmarkProfiles();

  assert.deepEqual(Array.from(report.profiles, (profile) => profile.profile), ['fast', 'standard', 'paranoid']);
  for (const profile of report.profiles) {
    assert.equal(profile.status, 'unavailable');
    assert.equal(profile.durationMs, null);
  }
});

test('KDF benchmark skips the Paranoid allocation on a likely iOS device', async () => {
  const context = createContext(true, {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    platform: 'iPhone',
    maxTouchPoints: 5
  });
  const report = await context.__coldboxCrypto.benchmarkProfiles();
  const paranoid = report.profiles.find((profile) => profile.profile === 'paranoid');

  assert.equal(paranoid.status, 'skipped');
  assert.equal(paranoid.durationMs, null);
  assert.match(paranoid.warning, /skipped/);
  assert.match(paranoid.warning, /iOS/);
});
