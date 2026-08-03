'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

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

  for (const placeholder of ['__COLDBOX_STYLES__', '__COLDBOX_SCRIPT__']) {
    if (document.includes(placeholder)) {
      throw new Error(`Unresolved source placeholder in assembled document: ${placeholder}`);
    }
  }

  return ensureTrailingLf(document);
}

function inlineBlockContents(document, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return [...document.matchAll(pattern)].map((match) => match[1]);
}

function hashInlineBlocks(document, tagName) {
  const blocks = inlineBlockContents(document, tagName);
  if (blocks.length === 0) {
    throw new Error(`No inline ${tagName} block found for CSP hash-pinning`);
  }

  return blocks.map((block) => {
    const digest = crypto.createHash('sha256').update(Buffer.from(block, 'utf8')).digest('base64');
    return `'sha256-${digest}'`;
  }).join(' ');
}

function injectCspHashes(document) {
  let result = document;
  result = injectOnce(result, '__COLDBOX_SCRIPT_HASHES__', hashInlineBlocks(document, 'script'));
  result = injectOnce(result, '__COLDBOX_STYLE_HASHES__', hashInlineBlocks(document, 'style'));
  return result;
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

function verifyVendorOffline() {
  const verifier = path.join(__dirname, 'verify-vendor.js');
  const result = spawnSync(process.execPath, [verifier, '--offline'], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error('Build refused: vendored artifacts failed offline verification');
  }
}

function verifyForbiddenConstructLint() {
  const lint = path.join(__dirname, 'lint.js');
  const result = spawnSync(process.execPath, [lint], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error('Build refused: source failed forbidden-construct lint');
  }
}

verifyVendorOffline();
verifyForbiddenConstructLint();
const result = writeBuild(injectCspHashes(assemble()));
console.log(`Built build/coldbox.html (${result.digest})`);
