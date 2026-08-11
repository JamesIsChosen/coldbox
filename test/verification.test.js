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
const derivationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'derivation.js'),
  'utf8'
);
const verificationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'verification.js'),
  'utf8'
);

function createContext() {
  const context = {
    ArrayBuffer,
    BigInt,
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
  vm.runInNewContext(derivationSource, context, { filename: 'src/cold/derivation.js' });
  vm.runInNewContext(verificationSource, context, { filename: 'src/cold/verification.js' });
  return context;
}

const OFFICIAL_MNEMONIC = [
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
].join(' ');
const OFFICIAL_TREZOR_FINGERPRINT = 'b4e3f5ed';
const OFFICIAL_NO_PASSPHRASE_FINGERPRINT = '73c5da0a';
const OFFICIAL_NATIVE_XPUB =
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
const OFFICIAL_RECEIVE_ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

function officialWallet() {
  const context = createContext();
  const seed = new Uint8Array(
    context.__coldboxSeedForge.mnemonicToSeed(OFFICIAL_MNEMONIC, '', 'english')
  );
  try {
    return {
      context,
      wallet: context.__coldboxVerification.deriveWalletIdentity(seed, {
        network: 'mainnet',
        account: 0,
        count: 5
      })
    };
  } finally {
    seed.fill(0);
  }
}

test('P1.9 derives the active Seed Forge wallet into a public identity only', () => {
  const { wallet } = officialWallet();
  const native = wallet.families.find((family) => family.scriptType === 'p2wpkh');

  assert.equal(wallet.fingerprint, OFFICIAL_NO_PASSPHRASE_FINGERPRINT);
  assert.equal(native.xpub, OFFICIAL_NATIVE_XPUB);
  assert.equal(native.receiveAddresses[0], OFFICIAL_RECEIVE_ADDRESS);
  assert.equal(native.receiveAddresses.length, 5);
  assert.equal(native.changeAddresses.length, 5);
  assert.equal(wallet.families.length, 4);

  const serialized = JSON.stringify(wallet);
  assert.equal(serialized.includes('abandon'), false);
  assert.equal(serialized.includes('TREZOR'), false);
  assert.equal(serialized.includes('mnemonic'), false);
  assert.equal(serialized.includes('passphrase'), false);
  assert.equal(serialized.includes('privateKey'), false);
});

test('P1.9 compares current public identity with independent fingerprint, xpub, and address values', () => {
  const { context, wallet } = officialWallet();
  const verification = context.__coldboxVerification;
  const native = verification.familyFor(wallet, 'p2wpkh');

  const fingerprint = verification.compareFingerprint(wallet.fingerprint, '73C5DA0A');
  const xpub = verification.compareXpub(native.xpub, OFFICIAL_NATIVE_XPUB, {
    network: 'mainnet',
    scriptType: 'p2wpkh'
  });
  const address = verification.compareAddress(native.receiveAddresses[0], OFFICIAL_RECEIVE_ADDRESS.toUpperCase(), {
    network: 'mainnet',
    scriptType: 'p2wpkh',
    path: native.accountPath + '/0/0'
  });

  assert.equal(fingerprint.verdict, 'match');
  assert.equal(xpub.verdict, 'match');
  assert.equal(address.verdict, 'match');
  assert.equal(address.expectedAddress, OFFICIAL_RECEIVE_ADDRESS);
});

test('P1.9 keeps every BIP-39 passphrase code point significant through Seed Forge', () => {
  const context = createContext();
  const seedForge = context.__coldboxSeedForge;
  const baseline = seedForge.masterFingerprint(OFFICIAL_MNEMONIC, 'TREZOR', 'english');
  const leading = seedForge.masterFingerprint(OFFICIAL_MNEMONIC, ' TREZOR', 'english');
  const trailing = seedForge.masterFingerprint(OFFICIAL_MNEMONIC, 'TREZOR ', 'english');
  const internal = seedForge.masterFingerprint(OFFICIAL_MNEMONIC, 'T REZOR', 'english');

  assert.equal(baseline, OFFICIAL_TREZOR_FINGERPRINT);
  assert.notEqual(leading, baseline);
  assert.notEqual(trailing, baseline);
  assert.notEqual(internal, baseline);
  assert.notEqual(leading, trailing);
});

test('P1.9 rejects compatibility characters, mixed-case Bech32, bad checksums, and invalid xpubs', () => {
  const { context, wallet } = officialWallet();
  const verification = context.__coldboxVerification;
  const native = verification.familyFor(wallet, 'p2wpkh');
  const mixedCaseAddress = OFFICIAL_RECEIVE_ADDRESS.slice(0, 4)
    + OFFICIAL_RECEIVE_ADDRESS[4].toUpperCase()
    + OFFICIAL_RECEIVE_ADDRESS.slice(5);

  assert.throws(
    () => verification.compareFingerprint(wallet.fingerprint, 'ｂ４ｅ３ｆ５ｅｄ'),
    /printable ASCII/i
  );
  assert.throws(
    () => verification.compareXpub(native.xpub, ' ' + native.xpub, { network: 'mainnet', scriptType: 'p2wpkh' }),
    /printable ASCII/i
  );
  assert.throws(
    () => verification.compareXpub(native.xpub, native.xpub.slice(0, -1) + '1', { network: 'mainnet', scriptType: 'p2wpkh' }),
    /checksum|extended|invalid/i
  );
  assert.throws(
    () => verification.compareAddress(native.receiveAddresses[0], mixedCaseAddress, {
      network: 'mainnet',
      scriptType: 'p2wpkh'
    }),
    /mixed Bech32 case/i
  );
  assert.throws(
    () => verification.compareAddress(native.receiveAddresses[0], OFFICIAL_RECEIVE_ADDRESS.slice(0, -1) + 'x', {
      network: 'mainnet',
      scriptType: 'p2wpkh'
    }),
    /checksum|invalid/i
  );
});

test('P1.9 rejects an invalid Seed Forge seed instead of producing a public identity', () => {
  const verification = createContext().__coldboxVerification;
  assert.throws(
    () => verification.deriveWalletIdentity(new Uint8Array(32), { network: 'mainnet' }),
    /exactly 64 bytes/i
  );
});

test('P1.9 verification source is public-only and has no warm channel or duplicate secret-entry API', () => {
  assert.doesNotMatch(verificationSource, /postMessage|window\.parent|messagePort/);
  assert.doesNotMatch(verificationSource, /mnemonic|passphrase|xprv|privateKey/);
});
