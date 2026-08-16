'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

const canonicalDocs = [
  'docs/00-overview/faq.md',
  'docs/00-overview/glossary.md',
  'docs/00-overview/quick-start.md',
  'docs/01-spec/SPEC.md',
  'docs/01-spec/architecture.md',
  'docs/01-spec/vault-format.md',
  'docs/02-security/threat-model.md',
  'docs/03-guides/going-airgapped.md',
  'docs/05-development/ROADMAP.md',
  'docs/05-development/testing.md',
  'docs/05-development/adr/0026-canonical-vault-save-and-live-transfer.md',
  'docs/05-development/packets/p0.19-device-matrix.md'
];

test('P0.19 canonical docs agree that .cbx is durable and vault QR is live-transfer only', () => {
  for (const relative of canonicalDocs) {
    const body = read(relative);
    assert.doesNotMatch(
      body,
      /(?:current|new|canonical)[^\n]{0,100}(?:filename|save)[^\n]{0,100}(?:--\d{4}\.cbx|per-vault generation|generation filename)/i,
      `${relative}: current behavior must not reintroduce visible save generations`
    );
  }

  const spec = read('docs/01-spec/SPEC.md');
  const quickStart = read('docs/00-overview/quick-start.md');
  const adr = read('docs/05-development/adr/0026-canonical-vault-save-and-live-transfer.md');
  const roadmap = read('docs/05-development/ROADMAP.md');

  for (const [name, body] of [['SPEC', spec], ['quick-start', quickStart], ['ADR-0026', adr], ['ROADMAP', roadmap]]) {
    if (name !== 'ROADMAP') {
      assert.match(body, /coldbox--<id8>\.cbx/i, `${name}: name-free canonical filename must be documented`);
    }
    assert.match(body, /live[^\n]{0,320}(?:device-to-device|device transfer|another[^\n]{0,80}device|receiv[^\n]{0,80}device)|device-to-device[^\n]{0,160}live/i, `${name}: live QR transfer must be documented`);
  }

  assert.match(adr, /no QR (?:file|download|backup)|QR[^\n]{0,80}(?:not|never)[^\n]{0,40}(?:backup|download)/i);
  assert.match(adr, /normal[^\n]{0,80}(?:passphrase|unlock phrase)/i);
  assert.match(roadmap, /coldbox--<id8>\.cbx/i);
});

test('historical P0.13/P0.14 author packets explicitly point to ADR-0026 supersession', () => {
  const p013 = read('docs/05-development/packets/p0.13-lock-save-load.md');
  const p014 = read('docs/05-development/packets/p0.14-save-integrity.md');

  assert.match(p013, /Historical implementation record[\s\S]{0,500}ADR-0026/i);
  assert.match(p013, /CBX-QR\/1/);
  assert.match(p014, /Historical implementation record[\s\S]{0,500}ADR-0026/i);
  assert.match(p014, /generational filenames/i);
});

test('current P0.19 packet directly states canonical-save/live-transfer behavior', () => {
  const packet = read('docs/05-development/packets/p0.19-device-matrix.md');
  assert.match(packet, /Canonical save identity/);
  assert.match(packet, /one canonical `<name>--<id8>\.cbx`/i);
  assert.match(packet, /Vault QR is live device transfer only/i);
  assert.match(packet, /There is no QR download\/backup artifact/i);
  assert.doesNotMatch(packet, /^6\. \*\*Per-vault generations:/m);
});
