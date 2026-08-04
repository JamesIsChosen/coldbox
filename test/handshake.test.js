'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const warmSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
const coldSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');

function assertHandshakeGuards(warm, cold) {
  assert.match(
    warm,
    /if \(handshakeState === 'ready'\)\s*\{\s*recordGlobalMessageAnomaly\(\);\s*return;\s*\}/,
    'Warm global post-handshake discard guard is missing'
  );
  assert.match(warm, /event\.source !== coldFrame\.contentWindow/);
  assert.match(warm, /event\.ports\.length !== 0/);
  assert.match(warm, /protocol\.validateMessage\('cold-to-warm', event\.data\)/);
  assert.match(
    cold,
    /if \(handshakeState === 'ready'\)\s*\{\s*recordGlobalMessageAnomaly\(\);\s*return;\s*\}/,
    'Cold global post-handshake discard guard is missing'
  );
  assert.match(cold, /event\.ports\.length !== 1/);
  assert.match(cold, /typeof candidatePort\.postMessage !== 'function'/);
}

test('handshake source retains source, port-count, validator, and post-handshake guards', () => {
  assertHandshakeGuards(warmSource, coldSource);
});

test('handshake guard mutation fixtures fail the Node contract', () => {
  const warmWithoutDiscard = warmSource.replace(
    /if \(handshakeState === 'ready'\)\s*\{\s*recordGlobalMessageAnomaly\(\);\s*return;\s*\}/,
    ''
  );
  assert.throws(() => assertHandshakeGuards(warmWithoutDiscard, coldSource));

  const coldWithoutPortCheck = coldSource.replace('event.ports.length !== 1', 'false');
  assert.throws(() => assertHandshakeGuards(warmSource, coldWithoutPortCheck));
});
