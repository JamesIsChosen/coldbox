'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');
const hashPath = path.join(projectRoot, 'build', 'coldbox.html.sha256');

function runBuild(overrides = {}) {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: projectRoot,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC', ...overrides },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('build assembles one HTML file and emits its SHA-256 sidecar', () => {
  runBuild();

  const html = fs.readFileSync(htmlPath);
  const sidecar = fs.readFileSync(hashPath, 'utf8');
  const digest = crypto.createHash('sha256').update(html).digest('hex');

  assert.match(html.toString('utf8'), /<title>Coldbox<\/title>/);
  assert.doesNotMatch(html.toString('utf8'), /__COLDBOX_/);
  assert.equal(sidecar, `${digest}  build/coldbox.html\n`);
  assert.doesNotMatch(html.toString('utf8'), /[A-Za-z]:\\|\/Users\/|\/home\//);
  assert.equal(html.includes(0x0d), false, 'generated HTML must use LF line endings');
  assert.equal(Buffer.from(sidecar, 'utf8').includes(0x0d), false, 'sidecar must use LF line endings');
});

test('two builds are byte-identical regardless of caller locale and timezone', () => {
  runBuild({ LC_ALL: 'de-DE', TZ: 'Pacific/Honolulu' });
  const firstHtml = fs.readFileSync(htmlPath);
  const firstSidecar = fs.readFileSync(hashPath);

  runBuild({ LC_ALL: 'ja-JP', TZ: 'Asia/Tokyo' });
  const secondHtml = fs.readFileSync(htmlPath);
  const secondSidecar = fs.readFileSync(hashPath);

  assert.deepEqual(secondHtml, firstHtml);
  assert.deepEqual(secondSidecar, firstSidecar);
});
