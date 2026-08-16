'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');

test('UI.6 has one reusable record menu with complete-field and provenance regions', () => {
  assert.equal((html.match(/id="record-menu"/g) || []).length, 1);
  assert.match(html, /class="record-menu" id="record-menu" role="dialog" aria-modal="true"/);
  for (const id of ['record-menu-provenance', 'record-menu-fields', 'record-menu-qr', 'record-menu-edit']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} is missing`);
  }
  assert.match(js, /function openRecordMenu\(kind, id, trigger\)/);
  assert.match(js, /Object\.keys\(record\)\.sort\(\)/);
  assert.match(js, /recordMenuProvenanceItem\('Compartment', 'Public registry'\)/);
});

test('every public record list uses the same complete-record trigger', () => {
  assert.match(js, /actions\.appendChild\(recordMenuTrigger\(kind, record\.id\)\)/);
  assert.match(js, /recordNode\.appendChild\(recordMenuTrigger\('backup', evaluation\.recordId\)\)/);
  assert.match(js, /data-record-menu-trigger/);
  assert.match(js, /openRecordMenu\(\s*target\.getAttribute\('data-registry-kind'\)/);
});

test('record menu QR is public-only and rejects secret-shaped values', () => {
  assert.match(js, /function recordMenuPublicPayloads\(record\)/);
  for (const field of ['record && record.address', 'record && record.xpub', 'record && record.descriptor', 'record && record.npub']) {
    assert.match(js, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(js, /protocol\.isSecretContent\(candidate\[1\]\)/);
  assert.match(js, /record\.xpubs\.forEach/);
  assert.doesNotMatch(js, /recordMenuPublicPayloads[\s\S]{0,800}xprv/);
});

test('record menu is calm, bounded, touch-sized, and keyboard navigable', () => {
  assert.match(css, /\.record-menu-panel[\s\S]*?max-height:\s*min\(92vh/);
  assert.match(css, /\.record-menu-trigger\s*\{[^}]*min-height:\s*2\.75rem/);
  assert.match(css, /\.record-menu-fields[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /event\.key !== 'Tab'/);
  assert.match(js, /recordMenuReturnFocus\.focus/);
});
