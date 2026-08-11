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

test('address comparison is character-exact and reports the first middle divergence', () => {
  const verification = loadVerification();
  const recorded = `1${'A'.repeat(20)}B${'C'.repeat(20)}`;
  const candidate = `1${'A'.repeat(20)}D${'C'.repeat(20)}`;
  const result = verification.compare(candidate, recorded);
  assert.equal(result.outcome, 'mismatch');
  assert.equal(result.divergenceIndex, 21);
});

test('bech32 is case-insensitive while base58 remains case-sensitive', () => {
  const verification = loadVerification();
  assert.equal(
    verification.compare('BC1Q' + 'A'.repeat(30), 'bc1q' + 'a'.repeat(30)).outcome,
    'match'
  );
  assert.equal(
    verification.compare('1' + 'A'.repeat(25), '1' + 'a'.repeat(25)).outcome,
    'mismatch'
  );
});

test('mixed-case EVM checksum failure is distinct from mismatch', () => {
  const verification = loadVerification();
  const valid = '0x52908400098527886E0F7030069857D2E4169EE7';
  const invalid = '0x52908400098527886E0F7030069857D2E4169Ee7';
  assert.equal(verification.compare(valid, valid).outcome, 'match');
  assert.equal(verification.compare(invalid, valid).outcome, 'checksum-invalid');
});

test('unrecognised formats and registry matches fail closed', () => {
  const verification = loadVerification();
  assert.equal(verification.compare('not-an-address', 'not-an-address').outcome, 'unrecognised-format');
  const records = [{ id: 'first', accountId: 'account-a', address: '1' + 'A'.repeat(25), verificationState: 'unverified' }];
  assert.equal(verification.findRecord(records[0].address, records).id, 'first');
  assert.equal(verification.findRecord('1' + 'B'.repeat(25), records), null);
});
