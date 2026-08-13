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
const seedXorSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'seed-xor.js'),
  'utf8'
);

function createContext(options = {}) {
  const context = {
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    atob,
    crypto: options.randomness === false ? {} : crypto.webcrypto,
    console
  };
  context.window = context;
  context.self = context;
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(seedForgeSource, context, { filename: 'src/cold/seed-forge.js' });
  vm.runInNewContext(seedXorSource, context, { filename: 'src/cold/seed-xor.js' });
  return context;
}

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function xorAll(values) {
  const result = new Uint8Array(values[0].length);
  for (const value of values) {
    for (let index = 0; index < result.length; index += 1) {
      result[index] ^= value[index];
    }
  }
  return result;
}

function sha256d(bytes) {
  const first = crypto.createHash('sha256').update(bytes).digest();
  return crypto.createHash('sha256').update(first).digest();
}

function officialDeterministicParts(entropy, count) {
  const parts = [];
  for (let index = 0; index < count - 1; index += 1) {
    const prefix = Buffer.from('Batshitoshi ', 'utf8');
    const suffix = Buffer.from(`${index} of ${count} parts`, 'utf8');
    const maskSource = Buffer.concat([prefix, Buffer.from(entropy), suffix]);
    parts.push(new Uint8Array(sha256d(maskSource).subarray(0, entropy.length)));
  }
  parts.push(xorAll([entropy, ...parts]));
  return parts;
}

const BIP39_ZERO_ENTROPY_MNEMONIC = [
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
].join(' ');

// Independent public example from Coldcard's Seed XOR documentation. The
// expected result is not produced by Coldbox and is kept as an interop gate.
const COLDCARD_THREE_PART_VECTOR = Object.freeze({
  parts: Object.freeze([
    'romance wink lottery autumn shop bring dawn tongue range crater truth ability miss spice fitness easy legal release recall obey exchange recycle dragon room',
    'lion misery divide hurry latin fluid camp advance illegal lab pyramid unaware eager fringe sick camera series noodle toy crowd jeans select depth lounge',
    'vault nominee cradle silk own frown throw leg cactus recall talent worry gadget surface shy planet purpose coffee drip few seven term squeeze educate'
  ]),
  result: 'silent toe meat possible chair blossom wait occur this worth option bag nurse find fish scene bench asthma bike wage world quit primary indoor'
});

test('Seed XOR matches the independent Coldcard three-part 24-word vector', () => {
  const context = createContext();
  const seedXor = context.__coldboxSeedXor;
  const forge = context.__coldboxSeedForge;
  const result = seedXor.combine(COLDCARD_THREE_PART_VECTOR.parts, { language: 'english' });

  assert.equal(result.mnemonic, COLDCARD_THREE_PART_VECTOR.result);
  assert.equal(result.wordCount, 24);
  assert.equal(result.parts, 3);
  assert.equal(forge.validateMnemonic(result.mnemonic, 'english').valid, true);
  result.entropy.fill(0);
});

test('Seed XOR combines in any order and preserves the entropy XOR', () => {
  const context = createContext();
  const seedXor = context.__coldboxSeedXor;
  const forge = context.__coldboxSeedForge;
  const entropy = new Uint8Array(32);
  entropy.forEach((_, index) => { entropy[index] = index * 7; });
  const source = forge.entropyToMnemonic(entropy, 'english');
  const split = seedXor.split(source, { language: 'english', count: 4, mode: 'deterministic' });
  const combined = seedXor.combine([split.parts[2], split.parts[0], split.parts[3], split.parts[1]], { language: 'english' });

  assert.equal(combined.mnemonic, source);
  assert.deepEqual([...combined.entropy], [...entropy]);
  split.parts.forEach((part) => {
    assert.equal(forge.validateMnemonic(part, 'english').valid, true);
  });
  entropy.fill(0);
  combined.entropy.fill(0);
});

test('Seed XOR deterministic masks match an independent Node SHA-256 reference', () => {
  const context = createContext();
  const seedXor = context.__coldboxSeedXor;
  const forge = context.__coldboxSeedForge;

  for (const wordCount of [12, 18, 24]) {
    const entropy = new Uint8Array({ 12: 16, 18: 24, 24: 32 }[wordCount]);
    entropy.forEach((_, index) => { entropy[index] = (index * 29 + 3) & 0xff; });
    const source = forge.entropyToMnemonic(entropy, 'english');
    const actual = seedXor.split(source, { language: 'english', count: 3, mode: 'deterministic' });
    const expectedEntropyParts = officialDeterministicParts(entropy, 3);
    const expected = expectedEntropyParts.map((part) => forge.entropyToMnemonic(part, 'english'));

    assert.deepEqual([...actual.parts], expected, `${wordCount}-word deterministic interop`);
    assert.equal(seedXor.combine(actual.parts, { language: 'english' }).mnemonic, source);
    entropy.fill(0);
    expectedEntropyParts.forEach((part) => part.fill(0));
  }
});

test('Seed XOR random mode round-trips 12, 18, and 24 words for 2 through 4 parts', () => {
  const context = createContext();
  const seedXor = context.__coldboxSeedXor;
  const forge = context.__coldboxSeedForge;

  for (const wordCount of [12, 18, 24]) {
    const entropy = new Uint8Array({ 12: 16, 18: 24, 24: 32 }[wordCount]);
    entropy.fill(wordCount);
    const source = forge.entropyToMnemonic(entropy, 'english');
    for (const count of [2, 3, 4]) {
      const split = seedXor.split(source, { language: 'english', count, mode: 'random' });
      assert.equal(split.parts.length, count);
      split.parts.forEach((part) => {
        assert.equal(forge.validateMnemonic(part, 'english').valid, true);
      });
      assert.equal(seedXor.combine(split.parts, { language: 'english' }).mnemonic, source);
    }
    entropy.fill(0);
  }
});

test('Seed XOR rejects malformed sets, unsupported lengths, and missing randomness', () => {
  const context = createContext();
  const seedXor = context.__coldboxSeedXor;

  assert.throws(
    () => seedXor.combine([BIP39_ZERO_ENTROPY_MNEMONIC], { language: 'english' }),
    /2 through 4/i
  );
  assert.throws(
    () => seedXor.combine([
      BIP39_ZERO_ENTROPY_MNEMONIC,
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'
    ], { language: 'english' }),
    /checksum|invalid/i
  );
  assert.throws(
    () => seedXor.combine([
      BIP39_ZERO_ENTROPY_MNEMONIC,
      COLDCARD_THREE_PART_VECTOR.parts[0]
    ], { language: 'english' }),
    /same word count/i
  );
  assert.throws(
    () => seedXor.split(BIP39_ZERO_ENTROPY_MNEMONIC, { language: 'english', count: 5, mode: 'random' }),
    /2 through 4/i
  );
  assert.throws(
    () => seedXor.split(BIP39_ZERO_ENTROPY_MNEMONIC, { language: 'english', count: 2, mode: 'unsupported' }),
    /mode/i
  );

  const noRandomContext = createContext({ randomness: false });
  assert.throws(
    () => noRandomContext.__coldboxSeedXor.split(BIP39_ZERO_ENTROPY_MNEMONIC, {
      language: 'english',
      count: 2,
      mode: 'random'
    }),
    /getRandomValues|randomness/i
  );
  assert.equal(
    noRandomContext.__coldboxSeedXor.split(BIP39_ZERO_ENTROPY_MNEMONIC, {
      language: 'english',
      count: 2,
      mode: 'deterministic'
    }).parts.length,
    2
  );
});

test('Seed XOR exposes no warm-boundary or persistence surface', () => {
  const source = seedXorSource;
  assert.doesNotMatch(source, /postMessage|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /Math\.random|eval\s*\(|new\s+Function/);
});
