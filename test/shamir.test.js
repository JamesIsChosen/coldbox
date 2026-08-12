'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const seedForgeSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'seed-forge.js'),
  'utf8'
);
const shamirSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'shamir.js'),
  'utf8'
);

function createContext(options = {}) {
  const context = {
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    Uint32Array,
    WebAssembly,
    atob,
    console,
    crypto: options.randomness === false
      ? {}
      : {
          getRandomValues(array) {
            if (options.fixedRandom) {
              array.fill(123456789);
              return array;
            }
            return crypto.webcrypto.getRandomValues(array);
          }
        }
  };
  context.window = context;
  context.self = context;
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(seedForgeSource, context, { filename: 'src/cold/seed-forge.js' });
  vm.runInNewContext(shamirSource, context, { filename: 'src/cold/shamir.js' });
  return context;
}

const VALID_12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const OFFICIAL_SHAMIR39_PARTS = Object.freeze([
  'shamir39-p1 army abandon ability abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  'shamir39-p1 around abandon sock soda soda soda soda soda soda soda soda soda soda soda soft',
  'shamir39-p1 arrange abandon sock soda soda soda soda soda soda soda soda soda soda soda soft',
  'shamir39-p1 arrest abandon pizza pitch pitch pitch pitch pitch pitch pitch pitch pitch pitch pitch planet',
  'shamir39-p1 arrive abandon pizza pitch pitch pitch pitch pitch pitch pitch pitch pitch pitch pitch planet'
]);

const SECRETS_JS_KNOWN_KEY = '82585c749a3db7f73009d0d6107dd650';
const SECRETS_JS_KNOWN_SHARES = Object.freeze([
  '80111001e523b02029c58aceebead70329000',
  '802eeb362b5be82beae3499f09bd7f9f19b1c',
  '803d5f7e5216d716a172ebe0af46ca81684f4',
  '804e1fa5670ee4c919ffd9f8c71f32a7bfbb0',
  '8050bd6ac05ceb3eeffcbbe251932ece37657',
  '8064bb52a3db02b1962ff879d32bc56de4455',
  '8078a5f11d20cbf8d907c1d295bbda1ee900a',
  '808808ff7fae45529eb13b1e9d78faeab435f',
  '809f3b0585740fd80830c355fa501a8057733',
  '80aeca744ec715290906c995aac371ed118c2'
]);

test('Shamir39 combines the published current-format mnemonic shares', () => {
  const context = createContext({ fixedRandom: true });
  const result = context.__coldboxShamir.shamir39.combine(OFFICIAL_SHAMIR39_PARTS, {
    language: 'english'
  });

  assert.equal(result.mnemonic, VALID_12);
  assert.equal(result.threshold, 3);
  assert.equal(result.parts, 5);
});

test('Shamir39 accepts the legacy marker at the pinned specification compatibility boundary', () => {
  const context = createContext({ fixedRandom: true });
  const legacyParts = OFFICIAL_SHAMIR39_PARTS.map((part) => part.replace('shamir39-p1', 'shamir39'));
  const result = context.__coldboxShamir.shamir39.combine(legacyParts, {
    language: 'english'
  });

  assert.equal(result.mnemonic, VALID_12);
  assert.equal(result.threshold, 3);
  assert.equal(result.parts, 5);
});

test('Shamir39 deterministic fixture matches Ian Coleman source and threshold order is irrelevant', () => {
  const context = createContext({ fixedRandom: true });
  const shamir39 = context.__coldboxShamir.shamir39;
  const result = shamir39.split(VALID_12, {
    language: 'english',
    threshold: 3,
    shares: 5
  });

  assert.deepEqual([...result.parts], OFFICIAL_SHAMIR39_PARTS);
  assert.equal(
    shamir39.combine([result.parts[4], result.parts[1], result.parts[3]], { language: 'english' }).mnemonic,
    VALID_12
  );
});

test('Shamir39 rejects insufficient, malformed, duplicate, and mixed-parameter shares', () => {
  const context = createContext({ fixedRandom: true });
  const shamir39 = context.__coldboxShamir.shamir39;

  assert.throws(
    () => shamir39.combine(OFFICIAL_SHAMIR39_PARTS.slice(0, 2), { language: 'english' }),
    /not enough|threshold/i
  );
  assert.throws(
    () => shamir39.combine(OFFICIAL_SHAMIR39_PARTS.concat(OFFICIAL_SHAMIR39_PARTS[0]), { language: 'english' }),
    /duplicate|order/i
  );
  assert.throws(
    () => shamir39.combine([OFFICIAL_SHAMIR39_PARTS[0].replace('army', 'around'), OFFICIAL_SHAMIR39_PARTS[1], OFFICIAL_SHAMIR39_PARTS[2]], { language: 'english' }),
    /duplicate|order|share|reconstruct|checksum/i
  );
  assert.throws(
    () => shamir39.split('abandon abandon abandon', { language: 'english', threshold: 2, shares: 3 }),
    /invalid|word-count|mnemonic/i
  );
});

test('raw SSS combines the published secrets.js compatibility shares', () => {
  const context = createContext({ fixedRandom: true });
  const result = context.__coldboxShamir.raw.combine(SECRETS_JS_KNOWN_SHARES.slice(1, 6));

  assert.equal(result.hex, SECRETS_JS_KNOWN_KEY);
  assert.equal(result.bits, 8);
});

test('raw SSS deterministic fixture matches secrets.js share formatting and threshold reconstruction', () => {
  const context = createContext({ fixedRandom: true });
  const raw = context.__coldboxShamir.raw;
  const result = raw.split(SECRETS_JS_KNOWN_KEY, {
    bits: 8,
    shares: 3,
    threshold: 2,
    padLength: 128
  });

  assert.deepEqual([...result.parts], [
    '80115151515151515151515151515151514974d49618f28a2e2251cc5c30568c345',
    '8022a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2ba872765eb0179ddd1a23fafc3a57fc7a',
    '8033f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3ebd67634ba50288c80f36efe92f42e96f'
  ]);
  assert.equal(raw.combine(result.parts.slice(0, 2), { threshold: 2 }).hex, SECRETS_JS_KNOWN_KEY);
});

test('raw SSS supports arbitrary bytes, configurable fields, and fails closed on invalid sets', () => {
  const context = createContext();
  const raw = context.__coldboxShamir.raw;
  const source = '00010203040506070809aabbccddeeff';
  const generated = raw.split(source, { bits: 8, shares: 5, threshold: 3 });

  assert.equal(generated.parts.length, 5);
  assert.equal(raw.combine([generated.parts[4], generated.parts[0], generated.parts[2]], { threshold: 3 }).hex, source);
  assert.throws(() => raw.combine(generated.parts.slice(0, 2), { threshold: 3 }), /threshold/i);
  assert.throws(() => raw.combine([generated.parts[0], generated.parts[0]], { threshold: 2 }), /duplicate/i);
  assert.throws(() => raw.combine([generated.parts[0], '70100'], { threshold: 2 }), /invalid|mismatch/i);
  assert.throws(() => raw.split(source, { bits: 2, shares: 3, threshold: 2 }), /bits/i);
  assert.throws(() => raw.split(source, { bits: 3, shares: 8, threshold: 2 }), /shares|bits/i);
});

test('both Shamir implementations refuse missing randomness and expose no warm or persistence surface', () => {
  const context = createContext({ randomness: false });
  const api = context.__coldboxShamir;

  assert.throws(
    () => api.shamir39.split(VALID_12, { language: 'english', threshold: 2, shares: 3 }),
    /getRandomValues|randomness/i
  );
  assert.throws(
    () => api.raw.split(SECRETS_JS_KNOWN_KEY, { bits: 8, shares: 3, threshold: 2 }),
    /getRandomValues|randomness/i
  );

  const source = shamirSource;
  assert.doesNotMatch(source, /postMessage|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /Math\.random|eval\s*\(|new\s+Function/);
});
