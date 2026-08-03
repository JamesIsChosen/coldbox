'use strict';

const fs = require('node:fs');
const path = require('node:path');

const vendorRoot = path.resolve(__dirname, '..', 'vendor');
const entries = fs.readdirSync(vendorRoot, { withFileTypes: true })
  .filter((entry) => entry.name !== '.gitkeep')
  .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);

if (entries.length !== 0) {
  const names = entries.map((entry) => entry.name).join(', ');
  throw new Error(`Vendored artifacts require the P0.2 manifest verifier: ${names}`);
}

console.log('Vendor verification passed: no runtime artifacts are vendored yet.');
