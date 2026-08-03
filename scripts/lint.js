'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const javascriptFiles = Object.freeze([
  path.join(projectRoot, 'scripts', 'build.js'),
  path.join(projectRoot, 'scripts', 'lint.js'),
  path.join(projectRoot, 'scripts', 'verify-vendor.js'),
  path.join(projectRoot, 'src', 'main.js')
]);
const textFiles = Object.freeze([
  path.join(projectRoot, 'src', 'index.html'),
  path.join(projectRoot, 'src', 'main.js'),
  path.join(projectRoot, 'src', 'styles.css'),
  path.join(projectRoot, 'vendor', 'vendor-manifest.json')
]);

for (const file of javascriptFiles) {
  const source = fs.readFileSync(file, 'utf8');
  new vm.Script(source, { filename: path.relative(projectRoot, file) });
}

for (const file of textFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('\r')) {
    throw new Error(`CRLF line ending found in ${path.relative(projectRoot, file)}`);
  }
  if (file.endsWith('vendor-manifest.json')) {
    JSON.parse(source);
  }
}

console.log('Lint passed: JavaScript syntax and LF source line endings are valid.');
