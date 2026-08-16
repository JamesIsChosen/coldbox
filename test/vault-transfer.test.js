'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'src', 'vault-transfer.js'), 'utf8');

function load() {
  const window = {};
  vm.runInNewContext(source, { window }, { filename: 'src/vault-transfer.js' });
  return window.__coldboxLiveTransfer;
}

const META = Object.freeze({
  transferId: '0123456789abcdef0123456789abcdef',
  vaultId: '550e8400-e29b-41d4-a716-446655440000',
  hash: 'a'.repeat(64)
});

function base64(size = 65536) {
  return Buffer.alloc(size, 0x5a).toString('base64');
}

test('module is warm-only framing and contains no DOM or secret-field handling', () => {
  assert.doesNotMatch(source, /\bdocument\b|passphrase|mnemonic|privateKey|xprv/i);
});

test('a large encrypted vault becomes one manifest plus many repeating live QR data frames', () => {
  const api = load();
  const frames = api.createFrames(base64(), META);
  assert.ok(frames.length > 100, 'fixture should exercise the user-reported ~135-frame scale');
  assert.match(frames[0], /^CBX-VT\/1\/M\/0123456789abcdef0123456789abcdef\//);
  assert.match(frames[1], /^CBX-VT\/1\/D\/0123456789abcdef0123456789abcdef\/1\//);
  assert.equal(Object.isFrozen(frames), true);
});

test('collector accepts out-of-order data, ignores duplicates, and reconstructs exact base64', () => {
  const api = load();
  const payload = base64(8192);
  const frames = Array.from(api.createFrames(payload, META));
  const collector = api.createCollector();

  // Data may arrive before the manifest and out of order.
  api.acceptFrame(collector, frames[3]);
  api.acceptFrame(collector, frames[1]);
  const duplicate = api.acceptFrame(collector, frames[1]);
  assert.equal(duplicate.reason, 'duplicate');
  api.acceptFrame(collector, frames[0]);
  for (let index = 2; index < frames.length; index += 1) {
    api.acceptFrame(collector, frames[index]);
  }

  const progress = api.collectorProgress(collector);
  assert.equal(progress.complete, true);
  const assembled = api.assemble(collector);
  assert.equal(assembled.base64, payload);
  assert.equal(assembled.vaultId, META.vaultId);
  assert.equal(Object.prototype.hasOwnProperty.call(assembled, 'name'), false);
  assert.equal(assembled.hash, META.hash);
});

test('collector refuses frames from a different transfer ID instead of mixing sessions', () => {
  const api = load();
  const payload = base64(2048);
  const first = api.createFrames(payload, META);
  const second = api.createFrames(payload, {
    ...META,
    transferId: 'fedcba9876543210fedcba9876543210'
  });
  const collector = api.createCollector();
  assert.equal(api.acceptFrame(collector, first[0]).accepted, true);
  const foreign = api.acceptFrame(collector, second[1]);
  assert.equal(foreign.accepted, false);
  assert.equal(foreign.reason, 'foreign-transfer');
});

test('incomplete or conflicting live transfers fail closed', () => {
  const api = load();
  const payload = base64(4096);
  const frames = Array.from(api.createFrames(payload, META));
  const collector = api.createCollector();
  api.acceptFrame(collector, frames[0]);
  for (let index = 1; index < frames.length - 1; index += 1) {
    api.acceptFrame(collector, frames[index]);
  }
  assert.equal(api.collectorProgress(collector).complete, false);
  assert.throws(() => api.assemble(collector), /incomplete/i);

  const conflicting = frames[0].replace(`/${frames.length - 1}/`, `/${frames.length}/`);
  const result = api.acceptFrame(collector, conflicting);
  assert.equal(result.accepted, false);
});

test('invalid transfer metadata and oversized sessions are rejected', () => {
  const api = load();
  assert.throws(() => api.createFrames(base64(100), { ...META, transferId: 'bad' }), /invalid/i);
  assert.throws(() => api.createFrames(base64(100), { ...META, vaultId: 'bad' }), /invalid/i);
  assert.throws(() => api.createFrames(base64(100), { ...META, hash: 'bad' }), /invalid/i);
  assert.equal(api.parseFrame('CBX-QR/1/1/2/abc'), null, 'legacy numbered export frames are not live-transfer frames');
});
