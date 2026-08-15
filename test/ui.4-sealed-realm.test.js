'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const coldHtml = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'index.html'), 'utf8');
const coldSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');
const coldDocumentIds = new Set(
  Array.from(coldHtml.matchAll(/\bid="([^"]+)"/g), (match) => match[1])
);

function extractRegistry(source) {
  const marker = 'var COLD_SECRET_INPUT_REGISTRY = Object.freeze(';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, 'ADR-0045 registry declaration is missing');
  const arrayStart = source.indexOf('[', start + marker.length);
  assert.ok(arrayStart >= 0, 'ADR-0045 registry array is missing');

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = arrayStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(source.slice(arrayStart, index + 1));
      }
    }
  }
  throw new Error('ADR-0045 registry array is unbalanced');
}

function expandRegistry(registry) {
  const declared = new Map();
  for (const entry of registry) {
    assert.equal(typeof entry.category, 'string');
    for (const id of entry.ids || []) {
      assert.equal(declared.has(id), false, `duplicate registry declaration for ${id}`);
      declared.set(id, entry.category);
    }
    for (const prefix of entry.prefixes || []) {
      assert.match(coldSource, new RegExp(`['"]${prefix}`), `dynamic ${prefix} inputs must be assigned an ID`);
      const count = prefix === 'cold-seed-forge-word-'
        ? 24
        : (prefix === 'cold-seed-xor-part-' ? 4 : 8);
      for (let index = 1; index <= count; index += 1) {
        const id = `${prefix}${index}`;
        assert.equal(declared.has(id), false, `duplicate registry declaration for ${id}`);
        declared.set(id, entry.category);
      }
    }
  }
  return declared;
}

test('UI.4 keeps one declared seed-entry surface and declares every secret input', () => {
  const registry = extractRegistry(coldSource);
  const seedEntries = registry.filter((entry) => entry.category === 'seed-entry');
  assert.equal(seedEntries.length, 1, 'exactly one registry entry may carry category seed-entry');
  assert.deepEqual(Array.from(seedEntries[0].ids), ['cold-seed-forge-mnemonic-input']);
  assert.equal(seedEntries[0].prefixes, undefined);

  const declared = expandRegistry(registry);
  const staticSecretCandidates = new Set();
  for (const match of coldHtml.matchAll(/<(input|textarea)\b[^>]*>/g)) {
    const tag = match[0];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (!id || /\breadonly\b/.test(tag) || id === 'cold-slip39-groups') continue;
    if (/\btype="(?:password|file)"/.test(tag) || match[1] === 'textarea') {
      staticSecretCandidates.add(id);
    }
  }
  for (const id of [
    'cold-secret-note-search',
    'cold-secret-note-title',
    'cold-secret-note-tags',
    'cold-entropy-dice-face',
    'cold-entropy-hex-input'
  ]) {
    staticSecretCandidates.add(id);
  }

  const dynamicSecretIds = [
    ...Array.from({ length: 24 }, (_, index) => `cold-seed-forge-word-${index + 1}`),
    ...Array.from({ length: 4 }, (_, index) => `cold-seed-xor-part-${index + 1}`),
    ...Array.from({ length: 8 }, (_, index) => `cold-shamir39-combine-${index + 1}`),
    ...Array.from({ length: 8 }, (_, index) => `cold-raw-sss-combine-${index + 1}`)
  ];
  for (const id of dynamicSecretIds) {
    assert.equal(declared.has(id), true, `${id} must be declared in the registry`);
  }
  for (const id of staticSecretCandidates) {
    assert.equal(declared.has(id), true, `${id} is a secret-accepting input without a registry category`);
  }

  for (const id of declared.keys()) {
    if (coldDocumentIds.has(id)) continue;
    assert.ok(dynamicSecretIds.includes(id), `${id} is declared but no longer exists in the cold source`);
  }
  assert.equal(declared.get('cold-seed-forge-mnemonic-input'), 'seed-entry');
  assert.equal(coldDocumentIds.has('cold-seed-forge-mnemonic-input'), true);
  for (const removedId of [
    'cold-seed-xor-source',
    'cold-codex32-secret-hex',
    'cold-shamir39-source',
    'cold-raw-sss-source',
    'cold-slip39-seed-source'
  ]) {
    assert.equal(coldDocumentIds.has(removedId), false);
    assert.equal(coldSource.includes(removedId), false, `${removedId} must not remain in cold code`);
  }
});

test('UI.4 creates six sealed groups and leaves the cold CSP network rule unchanged', () => {
  const groups = Array.from(coldHtml.matchAll(/<section\b[^>]*data-cold-group="([^"]+)"/g), (match) => match[1]);
  assert.deepEqual(groups, ['session', 'entropy', 'seed-forge', 'backups', 'qr', 'recovery']);
  const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i.exec(coldHtml);
  assert.ok(policy, 'cold CSP meta tag is missing');
  assert.equal(
    policy[1],
    "default-src 'none'; script-src __COLDBOX_COLD_SCRIPT_HASHES__ 'wasm-unsafe-eval'; style-src __COLDBOX_COLD_STYLE_HASHES__; img-src data: blob:; media-src blob:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; worker-src blob:;"
  );
  assert.equal(coldHtml.includes('id="cold-tool-hub"'), true);
  const hubTargets = Array.from(
    coldHtml.matchAll(/<a\b[^>]*class="cold-tool-hub-link"[^>]*href="#([^"]+)"/g),
    (match) => match[1]
  );
  assert.deepEqual(hubTargets, groups.map((group) => `cold-group-${group}`));
});
