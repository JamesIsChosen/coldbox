const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const VAULT_ID = '550e8400-e29b-41d4-a716-446655440000';
const XPUB = `xpub${'1'.repeat(107)}`;
const ADDRESS = `bc1q${'q'.repeat(56)}`;

function loadRegistry(disableRandomness = false) {
  const window = {
    crypto: disableRandomness ? {} : {
      getRandomValues(bytes) {
        crypto.randomFillSync(bytes);
        return bytes;
      }
    }
  };
  const protocolSource = fs.readFileSync(path.join(projectRoot, 'src', 'protocol.js'), 'utf8');
  const registrySource = fs.readFileSync(path.join(projectRoot, 'src', 'registry.js'), 'utf8');
  const context = vm.createContext({ window, Uint8Array });
  vm.runInContext(protocolSource, context, { filename: 'src/protocol.js' });
  vm.runInContext(registrySource, context, { filename: 'src/registry.js' });
  return context.window.__coldboxRegistry;
}

test('registry CRUD preserves relationships, clones values, and soft-deletes', () => {
  const registry = loadRegistry();
  const store = registry.createStore({ id: VAULT_ID });
  const wallet = store.createWallet({
    label: 'Savings',
    network: 'bitcoin',
    scriptType: 'p2wpkh',
    xpubs: [XPUB]
  });
  const secondWallet = store.createWallet({ label: 'Second' });
  assert.match(wallet.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(wallet.id, secondWallet.id);

  const account = store.createAccount({
    walletId: wallet.id,
    asset: 'BTC',
    path: "m/84'/0'/0'",
    label: 'Main'
  });
  const address = store.createAddress({
    accountId: account.id,
    index: 0,
    address: ADDRESS,
    label: 'Receive'
  });
  assert.equal(store.find('accounts', account.id).walletId, wallet.id);
  assert.equal(store.find('addresses', address.id).accountId, account.id);
  assert.equal(JSON.stringify(store.counts()), JSON.stringify({ wallets: 2, accounts: 1, addresses: 1, devices: 0, notes: 0 }));

  const external = store.snapshot();
  external.wallets[0].label = 'mutated outside store';
  assert.equal(store.find('wallets', wallet.id).label, 'Savings');
  store.updateWallet(wallet.id, { label: 'Retitled' });
  assert.equal(store.find('wallets', wallet.id).label, 'Retitled');
  store.deleteWallet(secondWallet.id);
  assert.equal(store.list('wallets').some((item) => item.id === secondWallet.id), false);
  assert.equal(store.list('wallets', true).some((item) => item.id === secondWallet.id && item.hidden), true);
  assert.equal(store.updateWallet(secondWallet.id, { hidden: false }).hidden, false);
  assert.equal(store.deleteAccount(account.id).hidden, true);
  assert.equal(store.updateAccount(account.id, { hidden: false }).hidden, false);
  assert.equal(store.deleteAddress(address.id).hidden, true);
  assert.equal(store.updateAddress(address.id, { hidden: false }).hidden, false);
  assert.equal(store.find('addresses', address.id).address, ADDRESS);
});

test('registry rejects missing relationships, secret-shaped text, and arbitrary fields', () => {
  const registry = loadRegistry();
  const store = registry.createStore({ id: VAULT_ID });
  assert.throws(
    () => store.createAccount({ walletId: '550e8400-e29b-41d4-a716-446655440001', asset: 'BTC' }),
    /relationship/
  );
  assert.throws(
    () => store.createWallet({ label: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' }),
    /public registry rejected/
  );
  assert.throws(
    () => store.createWallet({ label: 'safe', arbitraryText: 'not part of the model' }),
    /registry field/
  );
  const wallet = store.createWallet({ label: 'Safe' });
  assert.throws(
    () => store.createAddress({ accountId: wallet.id, index: 0, address: ADDRESS }),
    /relationship/
  );
  assert.throws(
    () => store.replace({ id: '550e8400-e29b-41d4-a716-446655440001', wallets: [] }),
    /authenticated Vault ID/
  );
});

test('registry snapshots and replacements enforce whole-compartment relationships', () => {
  const registry = loadRegistry();
  const orphanAccount = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    walletId: '550e8400-e29b-41d4-a716-446655440002'
  };
  assert.throws(
    () => registry.createStore({ accounts: [orphanAccount] }),
    /relationship|public registry rejected/
  );

  const store = registry.createStore({ id: VAULT_ID });
  const wallet = store.createWallet({ label: 'Whole compartment' });
  const account = store.createAccount({ walletId: wallet.id, asset: 'BTC' });
  const address = store.createAddress({ accountId: account.id, index: 0, address: ADDRESS });
  const orphanedAccount = store.snapshot();
  orphanedAccount.accounts[0].walletId = '550e8400-e29b-41d4-a716-446655440002';
  assert.throws(() => store.replace(orphanedAccount), /relationship|public registry rejected/);
  const orphanedAddress = store.snapshot();
  orphanedAddress.addresses[0].accountId = '550e8400-e29b-41d4-a716-446655440002';
  assert.throws(() => store.replace(orphanedAddress), /relationship|public registry rejected/);
  assert.equal(store.find('addresses', address.id).accountId, account.id);
});

test('registry optional fields can be explicitly cleared with schema-safe update options', () => {
  const registry = loadRegistry();
  const store = registry.createStore({ id: VAULT_ID });
  const wallet = store.createWallet({
    label: 'Clear me',
    network: 'bitcoin',
    primaryPath: "m/84'/0'/0'",
    tags: ['temporary']
  });
  const account = store.createAccount({
    walletId: wallet.id,
    asset: 'BTC',
    path: "m/84'/0'/0'",
    label: 'Account label',
    tags: ['temporary']
  });
  const address = store.createAddress({
    accountId: account.id,
    index: 0,
    address: ADDRESS,
    label: 'Address label',
    tags: ['temporary']
  });

  store.updateWallet(wallet.id, { label: 'Set again', tags: ['set'] });
  store.updateAccount(account.id, { label: 'Set again', tags: ['set'] });
  store.updateAddress(address.id, { label: 'Set again', tags: ['set'] });
  store.updateWallet(wallet.id, {}, { clearFields: ['label', 'network', 'primaryPath', 'tags'] });
  store.updateAccount(account.id, {}, { clearFields: ['asset', 'path', 'label', 'tags'] });
  store.updateAddress(address.id, {}, { clearFields: ['label', 'tags'] });

  assert.equal('label' in store.find('wallets', wallet.id), false);
  assert.equal('network' in store.find('wallets', wallet.id), false);
  assert.equal('primaryPath' in store.find('wallets', wallet.id), false);
  assert.equal('tags' in store.find('wallets', wallet.id), false);
  assert.equal('label' in store.find('accounts', account.id), false);
  assert.equal('path' in store.find('accounts', account.id), false);
  assert.equal('tags' in store.find('addresses', address.id), false);
  assert.throws(
    () => store.updateWallet(wallet.id, {}, { clearFields: ['id'] }),
    /cannot be cleared/
  );
  assert.throws(
    () => store.updateWallet(wallet.id, {}, { clearFields: ['unsupported'] }),
    /cannot be cleared/
  );
});

test('registry fails closed when secure randomness is unavailable', () => {
  const registry = loadRegistry(true);
  const store = registry.createStore({ id: VAULT_ID });
  assert.throws(() => store.createWallet({ label: 'No fallback' }), /Secure randomness/);
});

test('registry module is warm-only and does not own secret or DOM handling', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'registry.js'), 'utf8');
  assert.doesNotMatch(source, /document\./);
  assert.doesNotMatch(source, /['"](?:mnemonic|privateKey|xprv|passphrase|secretPlaintext)['"]/i);
});

test('registry supports linked public notes, canonical tags, search, and soft hide', () => {
  const registry = loadRegistry();
  const store = registry.createStore({ id: VAULT_ID });
  const wallet = store.createWallet({ label: 'Long term', tags: ['#LONGTERM'] });
  const note = store.createNote({
    title: 'Withdrawal route',
    body: 'Use this account for exchange withdrawals.',
    visibility: 'public',
    linkedIds: [wallet.id],
    tags: ['#Coinbase', 'taxlot-2024']
  });
  assert.deepEqual(JSON.parse(JSON.stringify(note.tags)), ['coinbase', 'taxlot-2024']);
  assert.equal(store.search('coinbase')[0].record.id, note.id);
  assert.deepEqual(JSON.parse(JSON.stringify(store.tags())), ['coinbase', 'longterm', 'taxlot-2024']);
  store.deleteNote(note.id);
  assert.equal(store.list('notes').some((item) => item.id === note.id), false);
  assert.equal(store.list('notes', true).some((item) => item.id === note.id && item.hidden), true);
  assert.equal(store.updateNote(note.id, { hidden: false }).hidden, false);
  assert.throws(
    () => store.createNote({
      title: 'Broken link', body: 'Public', visibility: 'public', linkedIds: [
        '550e8400-e29b-41d4-a716-446655440099'
      ]
    }),
    /relationship/
  );
});

test('device registry stores lifecycle metadata, fingerprint links, and soft hide', () => {
  const registry = loadRegistry();
  const store = registry.createStore({ id: VAULT_ID });
  const device = store.createDevice({
    vendor: 'Trezor',
    model: 'Safe 5',
    serial: 'TS5-001',
    firmware: '2.8.1',
    firmwareDate: '2026-08-10T00:00:00.000Z',
    purchasedFrom: 'Authorized retailer',
    purchasedAt: '2026-08-10T00:00:00.000Z',
    tamperCheckPassed: true,
    tamperCheckNotes: 'Seal matched the order record.',
    pinSetAt: '2026-08-10T00:00:00.000Z',
    pinChangedAt: '2026-08-10T00:00:00.000Z',
    passphraseUsed: true,
    seedFingerprints: ['deadbeef'],
    location: 'Home safe',
    status: 'in-use',
    notes: 'Primary signing device.'
  });
  assert.match(device.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(device.seedFingerprints[0], 'deadbeef');
  assert.equal(device.status, 'in-use');
  assert.equal(store.find('devices', device.id).vendor, 'Trezor');
  store.updateDevice(device.id, { status: 'retired', location: 'Archive safe' });
  assert.equal(store.find('devices', device.id).status, 'retired');
  assert.equal(store.find('devices', device.id).location, 'Archive safe');
  store.updateDevice(device.id, {}, {
    clearFields: [
      'serial', 'firmwareDate', 'purchasedFrom', 'purchasedAt',
      'tamperCheckNotes', 'pinSetAt', 'pinChangedAt',
      'seedFingerprints', 'location', 'notes'
    ]
  });
  const clearedDevice = store.find('devices', device.id);
  assert.equal('serial' in clearedDevice, false);
  assert.equal('firmwareDate' in clearedDevice, false);
  assert.equal('purchasedFrom' in clearedDevice, false);
  assert.equal('purchasedAt' in clearedDevice, false);
  assert.equal('tamperCheckNotes' in clearedDevice, false);
  assert.equal('pinSetAt' in clearedDevice, false);
  assert.equal('pinChangedAt' in clearedDevice, false);
  assert.equal(clearedDevice.passphraseUsed, true);
  assert.equal('seedFingerprints' in clearedDevice, false);
  assert.equal('location' in clearedDevice, false);
  assert.equal('notes' in clearedDevice, false);
  assert.throws(
    () => store.updateDevice(device.id, {}, { clearFields: ['vendor'] }),
    /cannot be cleared/
  );
  assert.equal(store.deleteDevice(device.id).hidden, true);
  assert.equal(store.list('devices').some((item) => item.id === device.id), false);
  assert.equal(store.list('devices', true).some((item) => item.id === device.id), true);
  assert.throws(
    () => store.createDevice({ vendor: 'Trezor', model: 'Bad', firmware: '1.0', status: 'active' }),
    /public registry rejected/
  );
  assert.throws(
    () => store.createDevice({ vendor: 'Trezor', model: 'Bad', firmware: '1.0', status: 'in-use', seedFingerprints: ['not-a-fingerprint'] }),
    /public registry rejected/
  );
  assert.throws(
    () => store.createDevice({ vendor: 'Trezor', model: 'Bad', firmware: '1.0', status: 'in-use', secretPlaintext: 'never' }),
    /registry field/
  );
});
