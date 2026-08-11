const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function loadVerification() {
  const window = {};
  const context = vm.createContext({ window, BigInt, Uint8Array });
  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, 'src', 'address-verification.js'), 'utf8'),
    context,
    { filename: 'src/address-verification.js' }
  );
  return context.window.__coldboxAddressVerification;
}

const VALID_BECH32 = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const VALID_BECH32_UPPER = VALID_BECH32.toUpperCase();
const INVALID_BECH32_CHECKSUM = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5';
const VALID_BASE58 = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
const INVALID_BASE58_CHECKSUM = '1BoatSLRHtKNngkdXEeobR76b53LETtpyU';

test('address comparison is character-exact and reports the first middle divergence', () => {
  const verification = loadVerification();
  const recorded = `0x${'a'.repeat(40)}`;
  const candidate = `0x${'a'.repeat(20)}b${'a'.repeat(19)}`;
  const result = verification.compare(candidate, recorded);
  assert.equal(result.outcome, 'mismatch');
  assert.equal(result.divergenceIndex, 22);
});

test('bech32 and bech32m vectors validate checksums and case normalization', () => {
  const verification = loadVerification();
  assert.equal(verification.classify(VALID_BECH32).kind, 'bech32');
  assert.equal(verification.compare(VALID_BECH32_UPPER, VALID_BECH32).outcome, 'match');
  assert.notEqual(
    verification.compare(
      'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd',
      'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd'
    ).outcome,
    'match'
  );
  assert.equal(verification.compare(INVALID_BECH32_CHECKSUM, VALID_BECH32).outcome, 'checksum-invalid');
  assert.equal(
    verification.classify('bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y').kind,
    'bech32'
  );
});

test('base58check validates an independent address vector and rejects a checksum mutation', () => {
  const verification = loadVerification();
  assert.equal(verification.classify(VALID_BASE58).kind, 'base58');
  assert.equal(verification.classify(INVALID_BASE58_CHECKSUM).checksumInvalid, true);
  assert.equal(verification.compare(INVALID_BASE58_CHECKSUM, VALID_BASE58).outcome, 'checksum-invalid');
  const records = [{ id: 'base58', accountId: 'account-a', address: VALID_BASE58 }];
  assert.equal(verification.findRecord(VALID_BASE58, records).id, 'base58');
  assert.equal(verification.findRecord(INVALID_BASE58_CHECKSUM, records), null);
});

test('mixed-case EVM checksum failure is distinct from mismatch', () => {
  const verification = loadVerification();
  const valid = '0x52908400098527886E0F7030069857D2E4169EE7';
  const invalid = '0x52908400098527886E0F7030069857D2E4169Ee7';
  assert.equal(verification.compare(valid, valid).outcome, 'match');
  assert.equal(verification.compare(invalid, valid).outcome, 'checksum-invalid');
});

test('raw whitespace is never normalized into a registry match', () => {
  const verification = loadVerification();
  assert.equal(verification.compare(` ${VALID_BASE58}`, VALID_BASE58).outcome, 'unrecognised-format');
  assert.equal(verification.compare(`${VALID_BECH32} `, VALID_BECH32).outcome, 'unrecognised-format');
});

test('unrecognised formats fail closed', () => {
  const verification = loadVerification();
  assert.equal(verification.compare('not-an-address', 'not-an-address').outcome, 'unrecognised-format');
  assert.equal(verification.findRecord('not-an-address', [{ address: VALID_BASE58 }]), null);
});

test('warm handlers preserve raw candidates and render the public comparison context', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
  const start = source.indexOf('  function renderAddressVerificationComparison');
  const end = source.indexOf('  function renderRegistry()', start);
  assert.ok(start >= 0 && end > start);
  const addressFlow = source.slice(start, end);
  assert.doesNotMatch(addressFlow, /addressVerifyCandidate[^\n]*\.trim\(/);
  assert.doesNotMatch(addressFlow, /addressVerifyBatch[^\n]*\.trim\(/);
  assert.match(addressFlow, /both complete strings are shown below/);
  assert.match(addressFlow, /addressVerificationAccountLabel/);
  assert.match(addressFlow, /addressVerificationCandidateOutcome/);
});

test('cold address verification selects the chain-aware derivation helper', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');
  assert.match(source, /verification\.deriveRegistryAddress\(current\.bytes, account, wallet, address\)/);
  assert.match(source, /verification\.markAddressColdVerified\(/);
  assert.doesNotMatch(source, /verification\.deriveWalletIdentity\(current\.bytes[\s\S]{0,500}address\.index/);
});
