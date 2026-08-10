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

// First vectors from python-mnemonic's vendored official vectors.json. The
// seeds are independent fixtures for the PBKDF2 boundary, not values derived
// by this implementation.
const OFFICIAL_FIRST_LANGUAGE_VECTORS = [
  {
    language: 'english',
    mnemonic: BIP39_ZERO_ENTROPY_MNEMONIC,
    seed: BIP39_ZERO_ENTROPY_TREZOR_SEED
  },
  {
    language: 'czech',
    mnemonic: Array(11).fill('abdikace').join(' ') + ' agrese',
    seed: '872501bed75c98fbf943a67907bf394995f337e9adfa23687282d1135c262421'
      + '715a0bcccfe2d3f5f8b72c8e2fa12a7a7267f8047b744557f4a9d49d11ccc75f'
  },
  {
    language: 'french',
    mnemonic: Array(11).fill('abaisser').join(' ') + ' abeille',
    seed: '3bf3366c40256d7e2fca716fddf8673425c7c7e444af290ee1edf1bbf095e6e7'
      + '8a7190253f3e46f1e2069345d4b05ac17b242faa225c0a3e4d268976744e0698'
  },
  {
    language: 'italian',
    mnemonic: Array(11).fill('abaco').join(' ') + ' abete',
    seed: 'd2ae4bbd4efc4aba345b66dc2bfa4ea280d85810945ba4e100707694d5731c5a'
      + '42ac0d0308ba9ad176966879328f1aa014fbcbeb46d671d9475c38254bf1eeb7'
  },
  {
    language: 'japanese',
    mnemonic: Array(11).fill('あいこくしん').join('\u3000') + '\u3000あおそ\u3099ら',
    seed: '5a6c23b5abdd5c3e1f7d77ad25ecd715647bdafb44dab324c730a76a45d7421d'
      + 'accee1a4ff0739715a2c56a8a9f1e527a5e3496224d91293bfcd9b5393bfff83'
  },
  {
    language: 'korean',
    mnemonic: Array(11).fill('가격').join(' ') + ' 가능',
    seed: 'a253d07f616223e337b6fa257632a2cc37e1ba36ff0bc7cf5a943366fa1b9ef0'
      + '2d6aa0333da51c17902951634b8aa81b6692a194b07f4f8c542335d73c96aad3'
  },
  {
    language: 'portuguese',
    mnemonic: Array(11).fill('abacate').join(' ') + ' abater',
    seed: 'ab9742b024a1e8bd241b76f8b3a157e9d442da60277bc8f36b8b23afe163de79'
      + '414fb49fd1a8dd26f4ea7f0dc965c760b3b80727557bdca61e1f0b0f069952f2'
  },
  {
    language: 'simplified-chinese',
    mnemonic: Array(11).fill('的').join(' ') + ' 在',
    seed: '7f7c7f91ef81f0fb6a3b95b346c50e6472c1d554f8ba90637bad8afce4a4de87'
      + 'c322c1acafa2f6f5e9a8f9b2d2c40e9d389efdc2adbe4445c21a0939fb39e91f'
  },
  {
    language: 'spanish',
    mnemonic: Array(11).fill('a\u0301baco').join(' ') + ' abierto',
    seed: '29a2ee16de47d07025de37e7d9c596869439f9bcd26a702d2bae64db2bf0f683'
      + '83841c5444b5b3bd39dd720d2ebe59969e110e5955c8e6d32c6c3294fd87439b'
  },
  {
    language: 'traditional-chinese',
    mnemonic: Array(11).fill('的').join(' ') + ' 在',
    seed: '7f7c7f91ef81f0fb6a3b95b346c50e6472c1d554f8ba90637bad8afce4a4de87'
      + 'c322c1acafa2f6f5e9a8f9b2d2c40e9d389efdc2adbe4445c21a0939fb39e91f'
  }
];

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

  const derived = forge.deriveMnemonic(BIP39_ZERO_ENTROPY_MNEMONIC, 'TREZOR', 'english');
  assert.equal(hex(derived.seed), BIP39_ZERO_ENTROPY_TREZOR_SEED);
  assert.equal(derived.fingerprint, 'b4e3f5ed');
  derived.seed.fill(0);
});

test('Seed Forge matches the independent first PBKDF2 vector for every supported language', () => {
  const context = createContext();
  const forge = context.__coldboxSeedForge;

  for (const vector of OFFICIAL_FIRST_LANGUAGE_VECTORS) {
    const validation = forge.validateMnemonic(vector.mnemonic, vector.language);
    assert.equal(validation.valid, true, vector.language);
    assert.equal(
      hex(forge.mnemonicToSeed(vector.mnemonic, 'TREZOR', vector.language)),
      vector.seed,
      vector.language
    );
  }
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
