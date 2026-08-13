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
const referenceShamirSourcePath = path.join(
  projectRoot,
  'test',
  'fixtures',
  'reference',
  'ian-coleman-shamir39.js'
);
const referenceSecretsSourcePath = path.join(
  projectRoot,
  'test',
  'fixtures',
  'reference',
  'secrets.js'
);
const referenceShamirSource = fs.readFileSync(referenceShamirSourcePath, 'utf8');

const PINNED_IAN_COLEMAN_SHA256 = 'a1f822fe010d5ddbf9b33bda0eaf5152388e8700d5e35893fb8f85116ed4233c';
const PINNED_SECRETS_JS_SHA256 = '6c90ec0b0d88a8c90d08f8657448c72db6592fcec5096306c70c815e2404eee9';

function createContext(options = {}) {
  const randomValues = Array.isArray(options.randomValues) ? options.randomValues.slice() : null;
  const randomCalls = { count: 0 };
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
            randomCalls.count += 1;
            if (randomValues) {
              array.fill(randomValues.length > 0 ? randomValues.shift() : 0);
              return array;
            }
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
  context.__testRandomCalls = randomCalls;
  return context;
}

function loadReferenceShamir39() {
  const context = { console, Uint32Array, window: {} };
  vm.runInNewContext(
    `${referenceShamirSource}\nthis.__referenceShamir39 = Shamir39;`,
    context,
    { filename: referenceShamirSourcePath }
  );
  return new context.__referenceShamir39();
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function gf8Multiply(left, right) {
  let result = 0;
  let multiplicand = left;
  let multiplier = right;
  for (let bit = 0; bit < 3; bit += 1) {
    if (multiplier & 1) {
      result ^= multiplicand;
    }
    multiplier >>>= 1;
    multiplicand <<= 1;
    if (multiplicand & 8) {
      multiplicand ^= 3;
    }
  }
  return result & 7;
}

function gf8Polynomial(secret, firstCoefficient, secondCoefficient, x) {
  return gf8Multiply(gf8Multiply(secondCoefficient, x) ^ firstCoefficient, x) ^ secret;
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

const FORCED_ZERO_SHAMIR39_PARTS = Object.freeze([
  'shamir39-p1 amount abandon ability abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  'shamir39-p1 amused abandon ability abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  'shamir39-p1 analyst abandon ability abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
]);

const FORCED_ZERO_RAW_SHARES = Object.freeze([
  '8010000000000000000000000000000000182585c749a3db7f73009d0d6107dd650',
  '8020000000000000000000000000000000182585c749a3db7f73009d0d6107dd650',
  '8030000000000000000000000000000000182585c749a3db7f73009d0d6107dd650'
]);

test('pinned reference combiner fixtures retain their exact reviewed bytes', () => {
  assert.equal(sha256File(referenceShamirSourcePath), PINNED_IAN_COLEMAN_SHA256);
  assert.equal(sha256File(referenceSecretsSourcePath), PINNED_SECRETS_JS_SHA256);
});

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

test('full-uniform sampling accepts forced-zero coefficients for both formats', () => {
  const shamirContext = createContext({ randomValues: [0] });
  const shamirResult = shamirContext.__coldboxShamir.shamir39.split(VALID_12, {
    language: 'english',
    threshold: 2,
    shares: 3
  });

  assert.deepEqual([...shamirResult.parts], FORCED_ZERO_SHAMIR39_PARTS);
  assert.equal(shamirContext.__testRandomCalls.count, 13);
  assert.equal(
    shamirContext.__coldboxShamir.shamir39.combine(shamirResult.parts.slice(0, 2), { language: 'english' }).mnemonic,
    VALID_12
  );

  const rawContext = createContext({ randomValues: [0] });
  const rawResult = rawContext.__coldboxShamir.raw.split(SECRETS_JS_KNOWN_KEY, {
    bits: 8,
    shares: 3,
    threshold: 2,
    padLength: 128
  });

  assert.deepEqual([...rawResult.parts], FORCED_ZERO_RAW_SHARES);
  assert.equal(rawContext.__testRandomCalls.count, 32);
  assert.equal(rawContext.__coldboxShamir.raw.combine(rawResult.parts.slice(0, 2), { threshold: 2 }).hex, SECRETS_JS_KNOWN_KEY);
});

test('pinned reference combiners reconstruct the forced-zero vectors', () => {
  const context = createContext({ fixedRandom: true });
  const referenceShamir39 = loadReferenceShamir39();
  const referenceShamirResult = referenceShamir39.combine(
    FORCED_ZERO_SHAMIR39_PARTS.map((part) => part.split(' ')),
    context.__coldboxBip39.wordlists.english
  );
  const referenceSecrets = require(referenceSecretsSourcePath);

  assert.deepEqual(Array.from(referenceShamirResult.mnemonic), VALID_12.split(' '));
  assert.equal(referenceSecrets.combine([...FORCED_ZERO_RAW_SHARES].slice(0, 2)), SECRETS_JS_KNOWN_KEY);
});

test('GF(8) full coefficient space preserves every candidate secret below threshold', () => {
  const observedSingleShare = 5;
  const singleShareCandidates = [];
  for (let secret = 0; secret < 8; secret += 1) {
    for (let coefficient = 0; coefficient < 8; coefficient += 1) {
      if ((secret ^ coefficient) === observedSingleShare) {
        singleShareCandidates.push({ secret, coefficient });
      }
    }
  }

  assert.deepEqual(singleShareCandidates.map((entry) => entry.secret), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(singleShareCandidates.map((entry) => entry.coefficient), [5, 4, 7, 6, 1, 0, 3, 2]);

  const observedTwoShares = [
    gf8Polynomial(3, 2, 5, 1),
    gf8Polynomial(3, 2, 5, 2)
  ];
  const candidateCounts = Array(8).fill(0);
  for (let secret = 0; secret < 8; secret += 1) {
    for (let firstCoefficient = 0; firstCoefficient < 8; firstCoefficient += 1) {
      for (let secondCoefficient = 0; secondCoefficient < 8; secondCoefficient += 1) {
        if (
          gf8Polynomial(secret, firstCoefficient, secondCoefficient, 1) === observedTwoShares[0]
          && gf8Polynomial(secret, firstCoefficient, secondCoefficient, 2) === observedTwoShares[1]
        ) {
          candidateCounts[secret] += 1;
        }
      }
    }
  }

  assert.deepEqual(candidateCounts, [1, 1, 1, 1, 1, 1, 1, 1]);
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
