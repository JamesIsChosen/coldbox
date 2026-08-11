'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const zlib = require('node:zlib');

const projectRoot = path.resolve(__dirname, '..');
const qrSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'qr.js'),
  'utf8'
);
const qrVendorTarball = path.join(
  projectRoot,
  'vendor',
  'npm',
  'qrcode-generator',
  '1.4.4',
  'package.tgz'
);

function readQrEncoderSource() {
  const archive = zlib.gunzipSync(fs.readFileSync(qrVendorTarball));
  const target = 'package/qrcode.js';
  for (let offset = 0; offset + 512 <= archive.length; ) {
    const name = archive.subarray(offset, offset + 100).toString('utf8').replace(/\0.*$/, '');
    if (!name) {
      break;
    }
    const sizeText = archive.subarray(offset + 124, offset + 136)
      .toString('ascii')
      .replace(/\0.*$/, '')
      .trim();
    const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
    const contentStart = offset + 512;
    if (name === target) {
      return archive.subarray(contentStart, contentStart + size).toString('utf8').replace(/\r\n?/g, '\n');
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  throw new Error(`Missing ${target} in ${qrVendorTarball}`);
}

function createContext({ includeEncoder = false } = {}) {
  const context = { Uint8Array, Number };
  context.window = context;
  if (includeEncoder) {
    vm.runInNewContext(readQrEncoderSource(), context, { filename: 'vendor/qrcode-generator/qrcode.js' });
  }
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

test('Compact SeedQR defaults to low correction for SeedSigner compact template sizes', () => {
  const qr = createContext({ includeEncoder: true });
  assert.equal(qr.payloadLength(qr.createCompactSeedQr(new Uint8Array(16))), 21);
  assert.equal(qr.payloadLength(qr.createCompactSeedQr(new Uint8Array(32))), 25);
  assert.equal(qr.payloadLength(qr.createCompactSeedQr(new Uint8Array(16), { errorCorrection: 'M' })), 25);
});

test('SeedQR encoders fail closed for unsupported sizes and out-of-range indices', () => {
  const qr = createContext();
  assert.throws(() => qr.encodeSeedQr([0]), /12, 15, 18, 21, or 24/);
  assert.throws(() => qr.encodeSeedQr(Array(12).fill(2048)), /0 through 2047/);
  assert.throws(() => qr.encodeCompactSeedQr(new Uint8Array(15)), /16, 20, 24, 28, or 32/);
});
