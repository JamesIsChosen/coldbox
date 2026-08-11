'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const qrSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'qr.js'),
  'utf8'
);

function createContext() {
  const context = { Uint8Array, Number };
  context.window = context;
  vm.runInNewContext(qrSource, context, { filename: 'src/cold/qr.js' });
  return context.__coldboxQr;
}

test('standard SeedQR uses four decimal digits per validated word index', () => {
  const qr = createContext();
  const indices = [0, 1, 16, 255, 256, 2047, 7, 8, 9, 10, 11, 12];
  assert.equal(
    qr.encodeSeedQr(indices),
    '000000010016025502562047000700080009001000110012'
  );
});

test('Compact SeedQR preserves raw entropy bytes in byte mode payload form', () => {
  const qr = createContext();
  const entropy = Uint8Array.from([0, 1, 2, 127, 128, 254, 255, 42, 99, 17, 18, 19, 20, 21, 22, 23]);
  const payload = qr.encodeCompactSeedQr(entropy);
  assert.equal(payload.length, entropy.length);
  assert.deepEqual(
    Array.from(payload, (value) => value.charCodeAt(0)),
    Array.from(entropy)
  );
});

test('SeedQR encoders fail closed for unsupported sizes and out-of-range indices', () => {
  const qr = createContext();
  assert.throws(() => qr.encodeSeedQr([0]), /12, 15, 18, 21, or 24/);
  assert.throws(() => qr.encodeSeedQr(Array(12).fill(2048)), /0 through 2047/);
  assert.throws(() => qr.encodeCompactSeedQr(new Uint8Array(15)), /16, 20, 24, 28, or 32/);
});
