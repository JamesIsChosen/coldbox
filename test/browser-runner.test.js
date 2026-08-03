'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const runnerPath = path.resolve(__dirname, '..', 'scripts', 'run-browser-harness.js');

test('browser harness reports a failed check with a non-zero result', () => {
  const script = [
    `const { main } = require(${JSON.stringify(runnerPath)});`,
    "main(async () => { throw new Error('deliberate harness failure'); })",
    '.then((exitCode) => { process.exitCode = exitCode; });'
  ].join(' ');
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /Browser harness failed:.*deliberate harness failure/s);
});

test('browser harness reports the explicit browser-install prerequisite', () => {
  const browserCache = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-no-browsers-'));
  try {
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browserCache }
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /Playwright browser binaries are missing/);
    assert.match(result.stderr, /npx playwright install chromium firefox/);
  } finally {
    fs.rmSync(browserCache, { force: true, recursive: true });
  }
});
