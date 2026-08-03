'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// These values are part of the reproducibility contract. Set them rather than
// trusting the caller's environment, so the build behaves the same everywhere.
process.env.LC_ALL = 'C';
process.env.TZ = 'UTC';

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const buildRoot = path.join(projectRoot, 'build');

// Keep the assembly manifest explicit and ordered. The output must never depend
// on filesystem enumeration order.
const sourceManifest = Object.freeze([
  Object.freeze({ file: 'index.html', token: '__COLDBOX_STYLES__', content: 'styles.css' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_SCRIPT__', content: 'main.js' })
]);

function readSource(file) {
  const contents = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
  return normalizeLineEndings(contents);
}

function normalizeLineEndings(contents) {
  return contents.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function injectOnce(template, token, contents) {
  const occurrences = template.split(token).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one ${token} placeholder, found ${occurrences}`);
  }
  return template.replace(token, contents);
}

function assemble() {
  let document = readSource('index.html');
  const components = new Map([
    ['styles.css', readSource('styles.css')],
    ['main.js', readSource('main.js')]
  ]);

  for (const entry of sourceManifest) {
    const component = components.get(entry.content);
    if (component === undefined) {
      throw new Error(`Missing source component: ${entry.content}`);
    }
    document = injectOnce(document, entry.token, component);
  }

  if (document.includes('__COLDBOX_')) {
    throw new Error('Unresolved source placeholder in assembled document');
  }

  return ensureTrailingLf(document);
}

function ensureTrailingLf(contents) {
  return `${contents.replace(/\n*$/, '')}\n`;
}

function writeBuild(document) {
  const output = Buffer.from(document, 'utf8');
  const digest = crypto.createHash('sha256').update(output).digest('hex');
  const htmlPath = path.join(buildRoot, 'coldbox.html');
  const hashPath = path.join(buildRoot, 'coldbox.html.sha256');

  fs.mkdirSync(buildRoot, { recursive: true });
  fs.writeFileSync(htmlPath, output);
  fs.writeFileSync(hashPath, `${digest}  build/coldbox.html\n`, 'utf8');

  return { digest, htmlPath, hashPath };
}

const result = writeBuild(assemble());
console.log(`Built build/coldbox.html (${result.digest})`);
