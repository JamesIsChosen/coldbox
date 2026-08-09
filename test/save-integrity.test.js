'use strict';

// P0.14 - Save integrity.
//
// This roadmap item carries no browser-only (🌐) acceptance criteria, so
// both criteria - "a deliberately truncated save is caught before the dirty
// flag clears" and "opening an older vault warns with both dates and
// counters" - must be provable in Node. That is the point of pulling the
// decision logic out of src/main.js into src/save-integrity.js: it is pure,
// has no DOM dependency, and can be exercised directly here with real
// (fake) write/readBack callbacks rather than only pattern-matched.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'src', 'save-integrity.js'), 'utf8');

function load() {
  const window = {};
  vm.runInNewContext(source, { window }, { filename: 'src/save-integrity.js' });
  return window.__coldboxSaveIntegrity;
}

function fakeStorage(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    dump() {
      return Object.fromEntries(store);
    }
  };
}

function throwingStorage() {
  return {
    getItem() {
      throw new Error('storage unavailable');
    },
    setItem() {
      throw new Error('storage unavailable');
    }
  };
}

// api.* return values are constructed inside the vm context, so their
// prototype is that realm's Object.prototype rather than this file's -
// assert.deepEqual/deepStrictEqual treat that as inequality even when every
// field matches. Compare field-by-field instead, same convention as
// test/vault.test.js.
function assertGeneration(actual, expected, message) {
  assert.equal(actual.counter, expected.counter, message);
  assert.equal(actual.savedAt, expected.savedAt, message);
}

function assertVerifyResult(actual, expected, message) {
  assert.equal(actual.verified, expected.verified, message);
}

test('module never references document, DOM APIs, or secret-shaped identifiers', () => {
  assert.doesNotMatch(source, /\bdocument\b/);
  assert.doesNotMatch(source, /passphrase|mnemonic|privateKey|xprv/i);
});

test('readGeneration degrades silently to the default on every unusable input', () => {
  const api = load();
  const fallback = { counter: 0, savedAt: null };

  assertGeneration(api.readGeneration(null), fallback);
  assertGeneration(api.readGeneration(undefined), fallback);
  assertGeneration(api.readGeneration({}), fallback, 'storage without getItem must degrade, not throw');
  assertGeneration(api.readGeneration(throwingStorage()), fallback, 'a throwing storage must degrade, not throw');
  assertGeneration(api.readGeneration(fakeStorage({})), fallback, 'missing key degrades to default');
  assertGeneration(
    api.readGeneration(fakeStorage({ 'coldbox-vault-generation': 'not json' })),
    fallback,
    'corrupt JSON degrades to default'
  );
  assertGeneration(
    api.readGeneration(fakeStorage({ 'coldbox-vault-generation': JSON.stringify({ counter: -1, savedAt: null }) })),
    fallback,
    'a negative counter is rejected, not trusted'
  );
  assertGeneration(
    api.readGeneration(fakeStorage({ 'coldbox-vault-generation': JSON.stringify({ counter: 1.5, savedAt: null }) })),
    fallback,
    'a non-integer counter is rejected'
  );
  assertGeneration(
    api.readGeneration(fakeStorage({ 'coldbox-vault-generation': JSON.stringify({ counter: 3, savedAt: 'not a date' }) })),
    fallback,
    'an unparsable savedAt is rejected'
  );
  assertGeneration(
    api.readGeneration(fakeStorage({ 'coldbox-vault-generation': JSON.stringify([1, 2, 3]) })),
    fallback,
    'a non-object shape is rejected'
  );
});

test('readGeneration/writeGeneration round-trip a valid record', () => {
  const api = load();
  const storage = fakeStorage({});
  const savedAt = new Date('2026-08-06T12:00:00.000Z').toISOString();

  const wrote = api.writeGeneration(storage, 47, savedAt);
  assert.equal(wrote, true);
  assertGeneration(api.readGeneration(storage), { counter: 47, savedAt: savedAt });
});

test('writeGeneration never throws and never writes an invalid record', () => {
  const api = load();

  assert.equal(api.writeGeneration(null, 1, new Date().toISOString()), false);
  assert.equal(api.writeGeneration({}, 1, new Date().toISOString()), false, 'storage without setItem');
  assert.equal(api.writeGeneration(throwingStorage(), 1, new Date().toISOString()), false);

  const storage = fakeStorage({});
  assert.equal(api.writeGeneration(storage, -1, new Date().toISOString()), false, 'negative counter rejected');
  assert.equal(api.writeGeneration(storage, 1.5, new Date().toISOString()), false, 'non-integer counter rejected');
  assert.equal(api.writeGeneration(storage, 1, 'not a date'), false, 'unparsable date rejected');
  assert.deepEqual(storage.dump(), {}, 'no partial/garbage record was ever persisted');
});

test('nextCounter starts at 1 and increments the highest seen counter', () => {
  const api = load();
  assert.equal(api.nextCounter({ counter: 0, savedAt: null }), 1);
  assert.equal(api.nextCounter({ counter: 46, savedAt: null }), 47);
  assert.equal(api.nextCounter(undefined), 1, 'a missing generation record still yields a safe first counter');
  assert.equal(api.nextCounter({ counter: -5, savedAt: null }), 1, 'an invalid counter never produces a negative suggestion');
});

test('filenameForCounter and parseFilename round-trip, and reject foreign names', () => {
  const api = load();

  for (const counter of [0, 1, 47, 9999, 123456789]) {
    const name = api.filenameForCounter(counter);
    assert.match(name, /^coldbox-vault-\d{4,9}\.cbx$/);
    assert.equal(api.parseFilename(name), counter);
  }

  assert.equal(api.filenameForCounter(47), 'coldbox-vault-0047.cbx');

  assert.throws(() => api.filenameForCounter(-1));
  assert.throws(() => api.filenameForCounter(1.5));
  assert.throws(() => api.filenameForCounter(api.maxCounter + 1));

  assert.equal(api.parseFilename('my-renamed-backup.cbx'), null, 'a renamed file cannot be checked, not misread');
  assert.equal(api.parseFilename('coldbox-vault-47.cbx'), null, 'fewer than 4 digits is not the generated shape');
  assert.equal(api.parseFilename('coldbox-vault-0047.txt'), null, 'wrong extension');
  assert.equal(api.parseFilename('COLDBOX-VAULT-0047.cbx'), null, 'case is not normalized - avoids over-matching');
  assert.equal(api.parseFilename(null), null);
  assert.equal(api.parseFilename(42), null);
});

test('bytesEqual catches truncation, single-byte corruption, and type mismatches', () => {
  const api = load();
  const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

  assert.equal(api.bytesEqual(original, new Uint8Array(original)), true);
  assert.equal(api.bytesEqual(new Uint8Array(0), new Uint8Array(0)), true);

  const truncated = original.slice(0, 5);
  assert.equal(api.bytesEqual(truncated, original), false, 'a shorter read-back must not equal the written bytes');
  assert.equal(api.bytesEqual(original, truncated), false, 'must not equal in either argument order');

  const singleBitFlipped = new Uint8Array(original);
  singleBitFlipped[3] ^= 1;
  assert.equal(api.bytesEqual(original, singleBitFlipped), false);

  const longer = new Uint8Array([...original, 9]);
  assert.equal(api.bytesEqual(original, longer), false);

  assert.equal(api.bytesEqual(null, original), false);
  assert.equal(api.bytesEqual(original, undefined), false);
  assert.equal(api.bytesEqual('12345678', original), false, 'strings are not accepted as byte-like');
});

test('evaluateRollback preserves legacy counters and uses timestamp-only advisory checks for canonical files', () => {
  const api = load();
  const generation = { counter: 5, savedAt: '2026-08-01T00:00:00.000Z' };

  const older = api.evaluateRollback(generation, { counter: 3, lastModified: 1700000000000 });
  assert.equal(older.rollback, true);
  assert.equal(older.seenCounter, 5);
  assert.equal(older.seenSavedAt, generation.savedAt);
  assert.equal(older.fileCounter, 3);
  assert.equal(older.fileLastModified, 1700000000000);

  const same = api.evaluateRollback(generation, { counter: 5, lastModified: null });
  assert.equal(same.rollback, false, 'the highest-seen generation itself is not a rollback');

  const newer = api.evaluateRollback(generation, { counter: 9, lastModified: null });
  assert.equal(newer.rollback, false);

  const canonicalOlder = api.evaluateRollback(generation, { counter: null, lastModified: Date.parse('2026-07-31T00:00:00.000Z') });
  assert.equal(canonicalOlder.rollback, true, 'canonical files have no visible counter, so an older trustworthy timestamp is advisory rollback evidence');
  assert.equal(canonicalOlder.reason, 'timestamp');

  const canonicalNewer = api.evaluateRollback(generation, { counter: null, lastModified: Date.parse('2026-08-02T00:00:00.000Z') });
  assert.equal(canonicalNewer.rollback, false);

  const noTimestamp = api.evaluateRollback(generation, { counter: null, lastModified: null });
  assert.equal(noTimestamp.rollback, false, 'canonical history degrades silently when no trustworthy timestamp exists');

  const freshBrowser = api.evaluateRollback(undefined, { counter: 1, lastModified: null });
  assert.equal(freshBrowser.rollback, false, 'a browser with no recorded generation has nothing to compare against');
  assert.equal(freshBrowser.seenCounter, 0);
});

// Independent-review finding F1: the remembered generation must be the
// highest this browser has ever SEEN (opened or saved), not only the
// highest it has SAVED - otherwise opening a newer file, then an older one
// after a reload, evades rollback detection because the stale record never
// learned about the newer file in between.
test('advanceGenerationOnOpen raises the high-water mark for a newer opened file', () => {
  const api = load();
  const generation = { counter: 47, savedAt: '2026-08-01T00:00:00.000Z' };

  const advanced = api.advanceGenerationOnOpen(generation, { counter: 100, lastModified: 1754400000000 });
  assert.equal(advanced.counter, 100);
  assert.equal(advanced.savedAt, new Date(1754400000000).toISOString(), 'prefers the file\'s own last-modified date');
});

test('advanceGenerationOnOpen never lowers the recorded generation', () => {
  const api = load();
  const generation = { counter: 100, savedAt: '2026-08-01T00:00:00.000Z' };

  const olderOpen = api.advanceGenerationOnOpen(generation, { counter: 80, lastModified: null });
  assert.equal(olderOpen.counter, 100, 'opening an older file must not regress the high-water mark');
  assert.equal(olderOpen.savedAt, generation.savedAt);

  const sameOpen = api.advanceGenerationOnOpen(generation, { counter: 100, lastModified: null });
  assert.equal(sameOpen.counter, 100);
  assert.equal(sameOpen.savedAt, generation.savedAt);
});

test('advanceGenerationOnOpen records a newer timestamp for canonical files without changing the legacy counter', () => {
  const api = load();
  const generation = { counter: 47, savedAt: '2026-08-01T00:00:00.000Z' };
  const openedAt = Date.parse('2026-08-05T12:00:00.000Z');

  const canonical = api.advanceGenerationOnOpen(generation, { counter: null, lastModified: openedAt });
  assert.equal(canonical.counter, 47);
  assert.equal(canonical.savedAt, new Date(openedAt).toISOString());

  const withoutTimestamp = api.advanceGenerationOnOpen(canonical, { counter: null, lastModified: null });
  assert.equal(withoutTimestamp.counter, 47);
  assert.equal(withoutTimestamp.savedAt, canonical.savedAt);
});

test('advanceGenerationOnOpen still advances, using now, when the file exposes no last-modified time', () => {
  const api = load();
  const before = Date.now();
  const advanced = api.advanceGenerationOnOpen({ counter: 0, savedAt: null }, { counter: 5, lastModified: null });
  const after = Date.now();

  assert.equal(advanced.counter, 5);
  const parsed = Date.parse(advanced.savedAt);
  assert.ok(Number.isFinite(parsed), 'savedAt must always be a valid date so the advance can be persisted');
  assert.ok(parsed >= before && parsed <= after, 'falls back to the current time, not an unparseable placeholder');
});

// Reproduces the exact failing sequence independent review finding F1
// described: 47 -> open 100 -> reload -> open 80 must warn, using the same
// pure functions and call order src/main.js's handleVaultOpened() uses -
// evaluateRollback() against the OLD generation, then
// advanceGenerationOnOpen(), with the result persisted and reloaded through
// a real fake localStorage in between.
test('regression: 47 -> open 100 -> reload -> open 80 warns with both counters and dates (F1)', () => {
  const api = load();
  const storage = fakeStorage({});
  api.writeGeneration(storage, 47, '2026-08-01T00:00:00.000Z');

  // --- Session 1: open generation 100 ---
  let generation = api.readGeneration(storage);
  const openHundred = { counter: 100, lastModified: 1754400000000 };
  const evalHundred = api.evaluateRollback(generation, openHundred);
  assert.equal(evalHundred.rollback, false, 'a newer generation is never itself a rollback');
  generation = api.advanceGenerationOnOpen(generation, openHundred);
  api.writeGeneration(storage, generation.counter, generation.savedAt);
  assert.equal(generation.counter, 100, 'the high-water mark must advance within session 1');

  // --- "Reload": a fresh read from storage, exactly like a new page load ---
  generation = api.readGeneration(storage);
  assert.equal(generation.counter, 100, 'the advance from session 1 must survive a reload');

  // --- Session 2: open the older generation 80 ---
  const openEighty = { counter: 80, lastModified: 1700000000000 };
  const evalEighty = api.evaluateRollback(generation, openEighty);
  assert.equal(evalEighty.rollback, true, 'must warn - this browser has already recorded a newer generation');
  assert.equal(evalEighty.seenCounter, 100);
  assert.equal(evalEighty.fileCounter, 80);
  assert.equal(typeof evalEighty.seenSavedAt, 'string', 'both counters AND dates must be available to the warning');
  assert.equal(typeof evalEighty.fileLastModified, 'number');

  // The next suggested save filename must also stay above the highest seen
  // generation, not regress to one above the stale 47.
  assert.equal(api.nextCounter(generation), 101);
});

test('verifyAfterSave: exact write/read-back agreement verifies', async () => {
  const api = load();
  const bytes = new Uint8Array([10, 20, 30, 40]);
  let written = null;

  const result = await api.verifyAfterSave({
    bytes,
    write(writeBytes) {
      written = new Uint8Array(writeBytes);
      return Promise.resolve();
    },
    readBack() {
      return Promise.resolve(new Uint8Array(written));
    }
  });

  assertVerifyResult(result, { verified: true });
});

test('verifyAfterSave: a truncated read-back is caught and reported unverified', async () => {
  const api = load();
  const bytes = new Uint8Array(200000);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = index % 256;
  }
  let written = null;

  const result = await api.verifyAfterSave({
    bytes,
    write(writeBytes) {
      written = new Uint8Array(writeBytes);
      return Promise.resolve();
    },
    readBack() {
      // Simulates an interrupted disk write: only part of the file landed.
      return Promise.resolve(written.slice(0, written.length - 1));
    }
  });

  assertVerifyResult(result, { verified: false });
});

test('verifyAfterSave: a bit-flipped read-back is caught and reported unverified', async () => {
  const api = load();
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);

  const result = await api.verifyAfterSave({
    bytes,
    write() {
      return Promise.resolve();
    },
    readBack() {
      const corrupted = new Uint8Array(bytes);
      corrupted[2] ^= 0xff;
      return Promise.resolve(corrupted);
    }
  });

  assertVerifyResult(result, { verified: false });
});

test('verifyAfterSave: a failed write rejects rather than reporting a false verification', async () => {
  const api = load();
  await assert.rejects(
    () => api.verifyAfterSave({
      bytes: new Uint8Array([1]),
      write() {
        return Promise.reject(new Error('disk full'));
      },
      readBack() {
        throw new Error('must not be called when write failed');
      }
    }),
    /disk full/
  );
});

test('verifyAfterSave: a failed read-back rejects rather than reporting a false verification', async () => {
  const api = load();
  await assert.rejects(
    () => api.verifyAfterSave({
      bytes: new Uint8Array([1]),
      write() {
        return Promise.resolve();
      },
      readBack() {
        return Promise.reject(new Error('handle revoked'));
      }
    }),
    /handle revoked/
  );
});

test('verifyAfterSave requires both callbacks rather than silently skipping verification', async () => {
  const api = load();
  await assert.rejects(() => api.verifyAfterSave({ bytes: new Uint8Array([1]) }));
  await assert.rejects(() => api.verifyAfterSave(null));
});

test('the whole record is frozen and cannot be mutated by a caller after the fact', () => {
  const api = load();
  const evaluation = api.evaluateRollback({ counter: 1, savedAt: null }, { counter: 1, lastModified: null });
  assert.throws(() => { evaluation.rollback = true; }, TypeError);
});

test('P0.19 vault IDs create portable per-vault advisory-history namespaces', () => {
  const api = load();
  const firstId = '550e8400-e29b-41d4-a716-446655440000';
  const secondId = '123e4567-e89b-42d3-a456-426614174000';
  const firstNamespace = api.vaultNamespace(firstId);
  const secondNamespace = api.vaultNamespace(secondId);

  assert.equal(firstNamespace, `vault:${firstId}`);
  assert.equal(secondNamespace, `vault:${secondId}`);
  assert.notEqual(firstNamespace, secondNamespace);
  assert.equal(api.id8(firstId), '550e8400');
  assert.equal(api.vaultNamespace('same-device-fingerprint'), null, 'device identity must never become vault identity');

  const storage = fakeStorage({});
  assert.equal(api.writeGenerationFor(storage, firstNamespace, 7, '2026-08-08T12:00:00.000Z'), true);
  assert.equal(api.writeGenerationFor(storage, secondNamespace, 2, '2026-08-08T13:00:00.000Z'), true);
  assertGeneration(api.readGenerationFor(storage, firstNamespace), { counter: 7, savedAt: '2026-08-08T12:00:00.000Z' });
  assertGeneration(api.readGenerationFor(storage, secondNamespace), { counter: 2, savedAt: '2026-08-08T13:00:00.000Z' });
});

test('P0.19 canonical filenames carry public name and id8 without a user-visible generation', () => {
  const api = load();
  const vaultId = '550e8400-e29b-41d4-a716-446655440000';

  assert.equal(api.sanitizeVaultName('  Bitcoin Savings / 2026  '), 'Bitcoin-Savings-2026');
  assert.equal(api.filenameForVault('Bitcoin Savings / 2026', vaultId), 'Bitcoin-Savings-2026--550e8400.cbx');

  const parsed = api.parseVaultFilename('Bitcoin-Savings-2026--550e8400.cbx');
  assert.equal(parsed.legacy, false);
  assert.equal(parsed.canonical, true);
  assert.equal(parsed.name, 'Bitcoin-Savings-2026');
  assert.equal(parsed.id8, '550e8400');
  assert.equal(parsed.counter, null);

  const historicalGeneration = api.parseVaultFilename('Bitcoin-Savings-2026--550e8400--0007.cbx');
  assert.equal(historicalGeneration.legacy, true);
  assert.equal(historicalGeneration.canonical, false);
  assert.equal(historicalGeneration.counter, 7);

  const legacy = api.parseVaultFilename('coldbox-vault-0047.cbx');
  assert.equal(legacy.legacy, true);
  assert.equal(legacy.counter, 47);
  assert.equal(legacy.id8, null);
});

test('P0.19 public vault-name registry refuses one name being claimed by two Vault IDs', () => {
  const api = load();
  const storage = fakeStorage({});
  const firstId = '550e8400-e29b-41d4-a716-446655440000';
  const secondId = '123e4567-e89b-42d3-a456-426614174000';

  assert.equal(api.claimVaultName(storage, 'Test', firstId), true);
  assert.equal(api.vaultNameOwner(storage, ' test '), firstId);
  assert.equal(api.claimVaultName(storage, 'Test', firstId), true, 'same identity may reaffirm its own public name');
  assert.equal(api.claimVaultName(storage, 'TEST', secondId), false, 'different identity must not take the same normalized public name');
  assert.equal(api.vaultNameOwner(storage, 'Test'), firstId);
  assert.equal(api.claimVaultName(throwingStorage(), 'Other', secondId), false, 'registry is best effort and never throws');
});

test('P0.19 legacy vault namespace is stable from the public v1 header salt', () => {
  const api = load();
  const bytes = new Uint8Array(80);
  for (let index = 0; index < 32; index += 1) {
    bytes[21 + index] = index + 1;
  }
  const first = api.legacyNamespaceFromBytes(bytes);
  const copy = new Uint8Array(bytes);
  const second = api.legacyNamespaceFromBytes(copy);

  assert.match(first, /^legacy-salt:[0-9a-f]{64}$/);
  assert.equal(second, first);
  copy[21] ^= 0xff;
  assert.notEqual(api.legacyNamespaceFromBytes(copy), first);
  assert.equal(api.legacyNamespaceFromBytes(new Uint8Array(52)), null, 'truncated headers do not invent a namespace');
});
