'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const derivationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'derivation.js'),
  'utf8'
);
const verificationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'verification.js'),
  'utf8'
);
const addressVerificationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'address-verification.js'),
  'utf8'
);

function loadColdContext() {
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
  vm.runInNewContext(derivationSource, context, { filename: 'src/cold/derivation.js' });
  vm.runInNewContext(verificationSource, context, { filename: 'src/cold/verification.js' });
  vm.runInNewContext(addressVerificationSource, context, { filename: 'src/address-verification.js' });
  return context;
}

test('EVM cold verification derives the selected chain and transitions public registry state', () => {
  const context = loadColdContext();
  const derivation = context.__coldboxDerivation;
  const verification = context.__coldboxVerification;
  const addressVerification = context.__coldboxAddressVerification;
  const seed = Uint8Array.from(Buffer.from(
    '747f302d9c916698912d5f70be53a6cf53bc495803a5523d3a7c3afa2afba94e'
      + 'c3803f838b3e1929ab5481f9da35441372283690fdcf27372c38f40ba134fe03',
    'hex'
  ));
  const evm = derivation.deriveEvmFromSeed(seed, { count: 1 });
  const account = {
    id: 'account-evm',
    asset: 'ETH',
    path: "m/44'/60'/0'",
    xpub: evm.xpub
  };
  const wallet = { id: 'wallet-evm', network: 'ethereum' };
  const address = {
    id: 'address-evm',
    accountId: account.id,
    index: 0,
    isChange: false,
    address: evm.addresses[0],
    verificationState: 'unverified'
  };
  const derived = verification.deriveRegistryAddress(seed, account, wallet, address);
  assert.equal(derived.network, 'evm');
  assert.equal(derived.address, address.address);
  assert.equal(derived.path, "m/44'/60'/0'/0/0");
  assert.equal(addressVerification.compare(derived.address, address.address).outcome, 'match');

  const updated = verification.markAddressColdVerified(
    { wallets: [wallet], accounts: [account], addresses: [address] },
    address.id,
    '2026-08-11T00:00:00.000Z',
    derived.xpub
  );
  assert.equal(updated.addresses[0].verificationState, 'cold-verified');
  assert.equal(updated.addresses[0].addressOrigin, 'derived');
  assert.equal(updated.addresses[0].verifiedAgainstXpub, evm.xpub);
  assert.equal(address.verificationState, 'unverified');
});

test('EVM cold verification fails closed when Bitcoin metadata is supplied for an EVM path', () => {
  const context = loadColdContext();
  const verification = context.__coldboxVerification;
  const seed = new Uint8Array(64);
  const address = { id: 'address', index: 0, isChange: false, address: '0x0000000000000000000000000000000000000000' };
  assert.throws(
    () => verification.deriveRegistryAddress(
      seed,
      { asset: 'ETH', path: "m/84'/0'/0'" },
      { network: 'bitcoin', scriptType: 'p2wpkh' },
      address
    ),
    /EVM account path|seed|crypto/i
  );
});
