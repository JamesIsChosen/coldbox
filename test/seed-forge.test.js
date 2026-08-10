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

function createContext() {
  const context = {
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    atob,
    crypto: crypto.webcrypto,
    console
  };
  context.window = context;
  context.self = context;
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(seedForgeSource, context, { filename: 'src/cold/seed-forge.js' });
  return context;
}

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

const BIP39_ZERO_ENTROPY_MNEMONIC = [
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
].join(' ');
const BIP39_ZERO_ENTROPY = '00000000000000000000000000000000';
const BIP39_ZERO_ENTROPY_TREZOR_SEED =
  'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e534955'
  + '31f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04';

test('Seed Forge matches the official BIP-39 English vector, including NFKD passphrase derivation', () => {
  const context = createContext();
  const forge = context.__coldboxSeedForge;

  assert.equal(
    forge.entropyToMnemonic(new Uint8Array(16), 'english'),
    BIP39_ZERO_ENTROPY_MNEMONIC
  );
  assert.deepEqual(
    [...forge.mnemonicToEntropy(BIP39_ZERO_ENTROPY_MNEMONIC, 'english')],
    [...new Uint8Array(16)]
  );
  assert.equal(
    forge.validateMnemonic(BIP39_ZERO_ENTROPY_MNEMONIC, 'english').valid,
    true
  );
  assert.equal(
    hex(forge.mnemonicToSeed(BIP39_ZERO_ENTROPY_MNEMONIC, 'TREZOR', 'english')),
    BIP39_ZERO_ENTROPY_TREZOR_SEED
  );
});

test('Seed Forge derives the master fingerprint with an independent Node reference', () => {
  const context = createContext();
  const forge = context.__coldboxSeedForge;
  const actual = forge.masterFingerprint(BIP39_ZERO_ENTROPY_MNEMONIC, 'TREZOR', 'english');

  // Independent reference: the official BIP-39 seed is passed through the
  // BIP-32 HMAC-SHA512 master step and Node/OpenSSL's secp256k1 + HASH160.
  const seed = Buffer.from(BIP39_ZERO_ENTROPY_TREZOR_SEED, 'hex');
  const master = crypto.createHmac('sha512', 'Bitcoin seed').update(seed).digest();
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.setPrivateKey(master.subarray(0, 32));
  const publicKey = ecdh.getPublicKey(null, 'compressed');
  const expected = crypto.createHash('ripemd160')
    .update(crypto.createHash('sha256').update(publicKey).digest())
    .digest()
    .subarray(0, 4)
    .toString('hex');

  assert.equal(expected, 'b4e3f5ed');
  assert.equal(actual, expected);
});

test('Seed Forge rejects malformed words, word counts, checksums, entropy sizes, and unavailable languages', () => {
  const context = createContext();
  const forge = context.__coldboxSeedForge;

  const badWord = forge.validateMnemonic(
    BIP39_ZERO_ENTROPY_MNEMONIC.replace('about', 'not-a-word'),
    'english'
  );
  assert.equal(badWord.valid, false);
  assert.equal(badWord.reason, 'unknown-word');
  assert.equal(badWord.words[11].state, 'unknown');

  const badChecksum = forge.validateMnemonic(
    BIP39_ZERO_ENTROPY_MNEMONIC.replace('about', 'abandon'),
    'english'
  );
  assert.equal(badChecksum.valid, false);
  assert.equal(badChecksum.reason, 'checksum');

  const badCount = forge.validateMnemonic('abandon abandon', 'english');
  assert.equal(badCount.valid, false);
  assert.equal(badCount.reason, 'word-count');

  assert.throws(
    () => forge.entropyToMnemonic(new Uint8Array(17), 'english'),
    /invalid entropy length/i
  );
  assert.throws(
    () => forge.entropyToMnemonic(new Uint8Array(16), 'not-a-language'),
    /unsupported BIP-39 language/i
  );
  assert.equal(
    hex(forge.mnemonicToSeed(BIP39_ZERO_ENTROPY_MNEMONIC, '\u212b', 'english')),
    hex(forge.mnemonicToSeed(BIP39_ZERO_ENTROPY_MNEMONIC, '\u00c5', 'english'))
  );
});

test('Seed Forge round-trips all vendored official BIP-39 wordlists and preserves Japanese separators', () => {
  const context = createContext();
  const forge = context.__coldboxSeedForge;
  const entropy = Uint8Array.from([
    0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
    0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff
  ]);

  for (const language of forge.languages) {
    const mnemonic = forge.entropyToMnemonic(entropy, language.id);
    const validation = forge.validateMnemonic(mnemonic, language.id);
    assert.equal(validation.valid, true, language.id);
    assert.deepEqual([...forge.mnemonicToEntropy(mnemonic, language.id)], [...entropy], language.id);
    if (language.id === 'japanese') {
      assert.match(mnemonic, /\u3000/);
    }
  }
});
