'use strict';

const assert = require('node:assert/strict');
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
