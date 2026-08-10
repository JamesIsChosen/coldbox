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
const OFFICIAL_NATIVE_XPUB =
  'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
const OFFICIAL_RECEIVE_ADDRESS = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

test('P1.9 verifies the independent BIP-39 fingerprint vector and returns public data only', () => {
  const verification = createContext().__coldboxVerification;
  const result = verification.verifyFingerprint({
    mnemonic: OFFICIAL_MNEMONIC,
    passphrase: 'TREZOR',
    expectedFingerprint: OFFICIAL_TREZOR_FINGERPRINT,
    language: 'english'
  });

  assert.equal(result.workflow, 'fingerprint');
  assert.equal(result.verdict, 'match');
  assert.equal(result.fingerprint, OFFICIAL_TREZOR_FINGERPRINT);
  assert.equal(result.expectedFingerprint, OFFICIAL_TREZOR_FINGERPRINT);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('abandon'), false);
  assert.equal(serialized.includes('TREZOR'), false);
  assert.equal(serialized.includes('seed'), false);
  assert.equal(serialized.includes('passphrase'), false);
});

test('P1.9 verifies a full receive address from an account xpub, including Bech32 case normalization', () => {
  const verification = createContext().__coldboxVerification;
  const result = verification.verifyReceiveAddress({
    xpub: OFFICIAL_NATIVE_XPUB,
    network: 'mainnet',
    scriptType: 'p2wpkh',
    change: 0,
    start: 0,
    expectedAddress: OFFICIAL_RECEIVE_ADDRESS.toUpperCase()
  });

  assert.equal(result.workflow, 'receive-address');
  assert.equal(result.verdict, 'match');
  assert.equal(result.address, OFFICIAL_RECEIVE_ADDRESS);
  assert.equal(result.path, 'account-xpub/0/0');
  assert.equal(JSON.stringify(result).includes('private'), false);
});

test('P1.9 verifies an account xpub from the official BIP-39 phrase', () => {
  const verification = createContext().__coldboxVerification;
  const result = verification.verifyXpub({
    mnemonic: OFFICIAL_MNEMONIC,
    passphrase: '',
    network: 'mainnet',
    scriptType: 'p2wpkh',
    account: 0,
    expectedXpub: OFFICIAL_NATIVE_XPUB,
    language: 'english'
  });

  assert.equal(result.workflow, 'xpub');
  assert.equal(result.verdict, 'match');
  assert.equal(result.xpub, OFFICIAL_NATIVE_XPUB);
  assert.equal(result.fingerprint, '73c5da0a');
  assert.equal(JSON.stringify(result).includes(OFFICIAL_MNEMONIC), false);
});

test('P1.9 backup and passphrase workflows distinguish matching and mismatching public fingerprints', () => {
  const verification = createContext().__coldboxVerification;
  const backup = verification.verifyBackup({
    mnemonic: OFFICIAL_MNEMONIC,
    passphrase: 'TREZOR',
    expectedFingerprint: OFFICIAL_TREZOR_FINGERPRINT,
    language: 'english'
  });
  const passphrase = verification.verifyPassphrase({
    mnemonic: OFFICIAL_MNEMONIC,
    passphrase: 'TREZOR',
    expectedFingerprint: OFFICIAL_TREZOR_FINGERPRINT,
    language: 'english'
  });
  const mismatch = verification.verifyFingerprint({
    mnemonic: OFFICIAL_MNEMONIC,
    passphrase: 'TREZOR',
    expectedFingerprint: '00000000',
    language: 'english'
  });

  assert.equal(backup.verdict, 'match');
  assert.equal(passphrase.verdict, 'match');
  assert.equal(mismatch.verdict, 'mismatch');
  assert.equal(mismatch.fingerprint, OFFICIAL_TREZOR_FINGERPRINT);
});

test('P1.9 rejects invalid or incomplete verification inputs instead of producing a false match', () => {
  const verification = createContext().__coldboxVerification;

  assert.throws(
    () => verification.verifyFingerprint({
      mnemonic: OFFICIAL_MNEMONIC.replace('about', 'abandon'),
      passphrase: '',
      expectedFingerprint: OFFICIAL_TREZOR_FINGERPRINT
    }),
    /invalid BIP-39 mnemonic|checksum/i
  );
  assert.throws(
    () => verification.verifyFingerprint({
      mnemonic: OFFICIAL_MNEMONIC,
      passphrase: '',
      expectedFingerprint: 'b4e3'
    }),
    /exactly 8 hexadecimal/i
  );
  assert.throws(
    () => verification.verifyPassphrase({
      mnemonic: OFFICIAL_MNEMONIC,
      passphrase: '',
      expectedFingerprint: OFFICIAL_TREZOR_FINGERPRINT
    }),
    /Passphrase must be between/i
  );
  assert.throws(
    () => verification.verifyXpub({
      mnemonic: OFFICIAL_MNEMONIC,
      expectedXpub: 'not-an-xpub'
    }),
    /extended public-key version|unsupported/i
  );
  const addressMismatch = verification.verifyReceiveAddress({
      xpub: OFFICIAL_NATIVE_XPUB,
      network: 'mainnet',
      scriptType: 'p2wpkh',
      expectedAddress: OFFICIAL_RECEIVE_ADDRESS.slice(0, -1) + 'x'
    });
  assert.equal(addressMismatch.verdict, 'mismatch');
});

test('P1.9 verification source has no channel or warm-realm dependency', () => {
  assert.doesNotMatch(verificationSource, /postMessage|window\.parent|messagePort/);
  assert.doesNotMatch(verificationSource, /xprv|privateKey|mnemonic.*result|passphrase.*result/);
});
