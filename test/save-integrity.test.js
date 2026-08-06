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

test('evaluateRollback only fires on a strictly older, successfully parsed generation', () => {
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

  const unparsed = api.evaluateRollback(generation, { counter: null, lastModified: 1700000000000 });
  assert.equal(unparsed.rollback, false, 'an unparseable filename must never produce a false rollback warning');

  const freshBrowser = api.evaluateRollback(undefined, { counter: 1, lastModified: null });
  assert.equal(freshBrowser.rollback, false, 'a browser with no recorded generation has nothing to compare against');
  assert.equal(freshBrowser.seenCounter, 0);
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
