'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  compareImages,
  createStateMatrix,
  decodePng,
  encodePng
} = require('../scripts/ui11-parity.js');

const manifest = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'docs', '05-development', 'ui-reference', 'approved', 'manifest.json'),
  'utf8'
));

test('UI.11 state matrix is manifest-driven and unique across both viewports', () => {
  const rows = createStateMatrix(manifest);
  assert.equal(rows.length, manifest.references.desktop.screens.length + manifest.references.mobile.screens.length);
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  assert.ok(rows.every((row) => ['PARITY', 'UNAVAILABLE'].includes(row.classification)));
  assert.ok(rows.every((row) => row.deviations.every((id) => /^PAR-00[1-9]$/.test(id))));
});

test('UI.11 pixel comparison is exact and the PNG artifact round-trips', () => {
  const reference = {
    width: 2,
    height: 1,
    pixels: Buffer.from([255, 255, 255, 255, 0, 0, 0, 255])
  };
  const same = compareImages(reference, { ...reference, pixels: Buffer.from(reference.pixels) });
  assert.equal(same.changedPixels, 0);
  const changedPixels = Buffer.from(reference.pixels);
  changedPixels[0] = 0;
  const changed = compareImages(reference, { ...reference, pixels: changedPixels });
  assert.equal(changed.changedPixels, 1);
  const roundTrip = decodePng(encodePng(reference));
  assert.equal(roundTrip.width, reference.width);
  assert.equal(roundTrip.height, reference.height);
  assert.deepEqual(roundTrip.pixels, reference.pixels);
});

