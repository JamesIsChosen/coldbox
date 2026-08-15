'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const coldSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');
const coldHtml = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'index.html'), 'utf8');

function extractFunctionDeclaration(source, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const match = declaration.exec(source);
  assert.ok(match, `function ${name} not found in source`);
  let depth = 0;
  let index = match.index + match[0].length - 1;
  for (; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  throw new Error(`Unbalanced function ${name}`);
}

function createRegistry(zeroize) {
  const declaration = extractFunctionDeclaration(coldSource, 'createReleasedSecretRegistry');
  const factory = vm.runInNewContext('(' + declaration + ')', { Uint8Array });
  return factory(zeroize);
}

test('UI.3 registry keeps several cold-local records, copies bytes, and focuses exactly one', () => {
  const registry = createRegistry((bytes) => bytes.fill(0));
  const firstBytes = new Uint8Array([1, 2, 3, 4]);
  const secondBytes = new Uint8Array([5, 6, 7, 8]);

  const first = registry.release({
    mnemonic: 'first phrase',
    language: 'english',
    seedBytes: firstBytes,
    fingerprint: 'a1b2c3d4',
    label: 'Primary'
  });
  const second = registry.release({
    mnemonic: 'second phrase',
    language: 'english',
    seedBytes: secondBytes,
    fingerprint: 'e5f60718',
    label: 'Spare'
  });

  assert.equal(registry.count(), 2);
  assert.deepEqual(Array.from(registry.listPublic(), (record) => record.label), ['Primary', 'Spare']);
  assert.equal(registry.listPublic().filter((record) => record.focused).length, 1);
  assert.equal(registry.getFocusedPublic().id, second.id);
  assert.notEqual(registry.getFocused().seedBytes, secondBytes);
  assert.deepEqual(Array.from(registry.getFocused().seedBytes), [5, 6, 7, 8]);

  assert.equal(registry.focus(first.id), true);
  assert.equal(registry.getFocusedPublic().fingerprint, 'a1b2c3d4');
  assert.equal(registry.listPublic().filter((record) => record.focused).length, 1);
  assert.equal(registry.focus('missing'), false);
  assert.equal(registry.getFocusedPublic().id, first.id);
});

test('UI.3 registry clears references and zeroizes every released byte buffer', () => {
  const registry = createRegistry((bytes) => bytes.fill(0));
  registry.release({
    mnemonic: 'first phrase',
    language: 'english',
    seedBytes: new Uint8Array([9, 10, 11]),
    fingerprint: '11223344',
    label: 'One'
  });
  registry.release({
    mnemonic: 'second phrase',
    language: 'english',
    seedBytes: new Uint8Array([12, 13, 14]),
    fingerprint: '55667788',
    label: 'Two'
  });
  registry.focus('released-secret-1');
  const firstRecord = registry.getFocused();
  const firstBuffer = firstRecord.seedBytes;
  registry.focus('released-secret-2');
  const secondRecord = registry.getFocused();
  const secondBuffer = secondRecord.seedBytes;

  registry.clear();

  assert.deepEqual(Array.from(firstBuffer), [0, 0, 0]);
  assert.deepEqual(Array.from(secondBuffer), [0, 0, 0]);
  assert.equal(firstRecord.mnemonic, '');
  assert.equal(secondRecord.mnemonic, '');
  assert.equal(registry.count(), 0);
  assert.equal(registry.getFocusedPublic(), null);
  assert.equal(registry.listPublic().length, 0);
});

test('UI.3 teardown and boundary wiring clear the registry without persistence or warm messages', () => {
  const registry = extractFunctionDeclaration(coldSource, 'createReleasedSecretRegistry');
  assert.doesNotMatch(registry, /postMessage|localStorage|sessionStorage|vaultCompartment|storage/i);
  assert.match(coldSource, /function clearReleasedSecrets\(reason\)/);
  assert.match(extractFunctionDeclaration(coldSource, 'clearVaultSession'), /clearReleasedSecrets\(/);
  assert.match(extractFunctionDeclaration(coldSource, 'scheduleIdleLock'), /clearVaultSession\(false\)/);
  assert.match(coldSource, /window\.addEventListener\('pagehide', function \(\) \{[\s\S]*clearReleasedSecrets\('realm teardown'\)/);
  assert.match(coldSource, /clearReleasedSecrets\('the keyboard shortcut'\)/);
  assert.match(coldSource, /event\.key !== 'Escape'/);
  assert.match(coldHtml, /id="cold-secret-switcher"/);
  assert.match(coldHtml, /id="cold-secret-registry-empty"/);
  assert.match(coldHtml, /aria-keyshortcuts="Control\+Alt\+Shift\+L"/);
  assert.match(coldHtml, /data-secret-focus-indicator="seed-xor"/);
  assert.match(coldHtml, /data-secret-focus-indicator="codex32"/);
  assert.match(coldHtml, /data-secret-focus-indicator="shamir"/);
  assert.match(coldHtml, /data-secret-focus-indicator="seedqr"/);
  assert.match(coldHtml, /data-secret-focus-indicator="slip39"/);
  assert.match(coldHtml, /data-secret-focus-indicator="verification"/);
  assert.doesNotMatch(coldSource, /releasedSecretRegistry\.release\([\s\S]{0,400}postMessage/);
});
