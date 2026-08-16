'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { compileToolMap, parseRoadmap } = require('../scripts/tool-map.js');

const projectRoot = path.resolve(__dirname, '..');

test('the real roadmap compiles into a complete deterministic tool map', () => {
  const first = compileToolMap(projectRoot);
  const second = compileToolMap(projectRoot);
  assert.deepEqual(first, second);
  assert.ok(first.items.length > 20);
  const ui9 = first.items.find((item) => item.id === 'UI.9');
  assert.ok(ui9);
  assert.ok(['not-started', 'in-progress', 'complete'].includes(ui9.status));
  assert.ok(first.items.every((item) => item.id && item.title && item.phase));
});

test('malformed roadmap item fails closed', () => {
  assert.throws(
    () => parseRoadmap('# Roadmap\n\n- [ ] **P0.1**\n', 'fixture ROADMAP.md'),
    /Cannot parse roadmap item at fixture ROADMAP\.md:3/
  );
});

test('duplicate roadmap IDs fail closed', () => {
  assert.throws(
    () => parseRoadmap(
      '# Roadmap\n\n- [ ] **P0.1 — One**\n- [x] **P0.1 — Again**\n',
      'fixture ROADMAP.md'
    ),
    /Duplicate roadmap item P0\.1/
  );
});

test('changing only a roadmap marker changes the compiled map', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-tool-map-'));
  try {
    const roadmapDirectory = path.join(root, 'docs', '05-development');
    fs.mkdirSync(roadmapDirectory, { recursive: true });
    const roadmap = '# Roadmap\n\n- [ ] **P0.1 — Foundation**\n';
    fs.writeFileSync(path.join(roadmapDirectory, 'ROADMAP.md'), roadmap, 'utf8');
    const before = compileToolMap(root);
    fs.writeFileSync(path.join(roadmapDirectory, 'ROADMAP.md'), roadmap.replace('[ ]', '[x]'), 'utf8');
    const after = compileToolMap(root);
    assert.equal(before.items[0].id, after.items[0].id);
    assert.equal(before.items[0].status, 'not-started');
    assert.equal(after.items[0].status, 'complete');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
