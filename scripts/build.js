'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { createCryptoVendorSource } = require('./crypto-bundle.js');
const { createFontFaceSource } = require('./font-bundle.js');

// These values are part of the reproducibility contract. Set them rather than
// trusting the caller's environment, so the build behaves the same everywhere.
process.env.LC_ALL = 'C';
process.env.TZ = 'UTC';

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src');
const buildRoot = path.join(projectRoot, 'build');
const qrVendorTarball = path.join(
  projectRoot,
  'vendor',
  'npm',
  'qrcode-generator',
  '1.4.4',
  'package.tgz'
);

// Keep the assembly manifest explicit and ordered. The output must never depend
// on filesystem enumeration order.
const sourceManifest = Object.freeze([
  Object.freeze({ file: 'index.html', token: '__COLDBOX_STYLES__', content: 'styles.css' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_SCRIPT__', content: 'main.js' })
]);

const coldRealmManifest = Object.freeze([
  Object.freeze({ file: 'index.html', token: '__COLDBOX_CRYPTO_VENDOR_SOURCE__', content: 'crypto-vendor.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_CRYPTO_LAYER__', content: 'crypto.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_VAULT_LAYER__', content: 'vault.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_COLD_STYLES__', content: 'styles.css' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_COLD_SCRIPT__', content: 'main.js' })
]);

function readSource(file) {
  const contents = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
  return normalizeLineEndings(contents);
}

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
      return normalizeLineEndings(archive.subarray(contentStart, contentStart + size).toString('utf8'));
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  throw new Error(`Missing ${target} in ${qrVendorTarball}`);
}

function normalizeLineEndings(contents) {
  return contents.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function injectOnce(template, token, contents) {
  const occurrences = template.split(token).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one ${token} placeholder, found ${occurrences}`);
  }
  return template.replace(token, () => contents);
}

function assemble() {
  let document = readSource('index.html');
  const protocolSource = readSource('protocol.js');
  const airgapSource = readSource('airgap.js');
  const capabilitiesSource = readSource('capabilities.js');
  const coldRealmDocument = injectColdCspHashes(
    assembleColdRealm(protocolSource, airgapSource, capabilitiesSource)
  );
  let mainScript = injectOnce(readSource('main.js'), '__COLDBOX_QR_ENCODER__', readQrEncoderSource());
  mainScript = injectOnce(mainScript, '__COLDBOX_PROTOCOL__', protocolSource);
  mainScript = injectOnce(mainScript, '__COLDBOX_AIRGAP__', airgapSource);
  mainScript = injectOnce(mainScript, '__COLDBOX_CAPABILITIES__', capabilitiesSource);
  mainScript = injectOnce(
    mainScript,
    '__COLDBOX_COLD_REALM_DOCUMENT__',
    JSON.stringify(coldRealmDocument)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
  );
  const warmStyles = injectOnce(
    readSource('styles.css'),
    '__COLDBOX_FONT_FACES__',
    createFontFaceSource(projectRoot)
  );
  const components = new Map([
    ['styles.css', warmStyles],
    ['main.js', mainScript]
  ]);

  for (const entry of sourceManifest) {
    const component = components.get(entry.content);
    if (component === undefined) {
      throw new Error(`Missing source component: ${entry.content}`);
    }
    document = injectOnce(document, entry.token, component);
  }

  document = injectOnce(
    document,
    '__COLDBOX_FRAME_SCRIPT_HASHES__',
    hashInlineBlocks(coldRealmDocument, 'script')
  );
  document = injectOnce(
    document,
    '__COLDBOX_FRAME_STYLE_HASHES__',
    hashInlineBlocks(coldRealmDocument, 'style')
  );

  for (const placeholder of [
    '__COLDBOX_STYLES__',
    '__COLDBOX_SCRIPT__',
    '__COLDBOX_FONT_FACES__',
    '__COLDBOX_FRAME_SCRIPT_HASHES__',
    '__COLDBOX_FRAME_STYLE_HASHES__'
  ]) {
    if (document.includes(placeholder)) {
      throw new Error(`Unresolved source placeholder in assembled document: ${placeholder}`);
    }
  }

  return ensureTrailingLf(document);
}

function assembleColdRealm(protocolSource, airgapSource, capabilitiesSource) {
  let document = readSource('cold/index.html');
  const coldMainScript = injectOnce(
    injectOnce(
      injectOnce(readSource('cold/main.js'), '__COLDBOX_AIRGAP__', airgapSource),
      '__COLDBOX_CAPABILITIES__',
      capabilitiesSource
    ),
    '__COLDBOX_PROTOCOL__',
    protocolSource
  );
  const components = new Map([
    ['crypto-vendor.js', createCryptoVendorSource(projectRoot)],
    ['crypto.js', readSource('cold/crypto.js')],
    ['vault.js', readSource('cold/vault.js')],
    ['styles.css', readSource('cold/styles.css')],
    ['main.js', coldMainScript]
  ]);

  for (const entry of coldRealmManifest) {
    const component = components.get(entry.content);
    if (component === undefined) {
      throw new Error(`Missing cold-realm source component: ${entry.content}`);
    }
    document = injectOnce(document, entry.token, component);
  }

  for (const placeholder of [
    '__COLDBOX_COLD_STYLES__',
    '__COLDBOX_COLD_SCRIPT__',
    '__COLDBOX_CRYPTO_VENDOR_SOURCE__',
    '__COLDBOX_CRYPTO_LAYER__',
    '__COLDBOX_VAULT_LAYER__',
    '__COLDBOX_PROTOCOL__',
    '__COLDBOX_AIRGAP__',
    '__COLDBOX_CAPABILITIES__'
  ]) {
    if (document.includes(placeholder)) {
      throw new Error(`Unresolved cold-realm source placeholder: ${placeholder}`);
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

function injectColdCspHashes(document) {
  let result = document;
  result = injectOnce(
    result,
    '__COLDBOX_COLD_SCRIPT_HASHES__',
    hashInlineBlocks(document, 'script')
  );
  result = injectOnce(
    result,
    '__COLDBOX_COLD_STYLE_HASHES__',
    hashInlineBlocks(document, 'style')
  );
  return result;
}

function assertNoUnresolvedPlaceholders(document) {
  if (/__COLDBOX_/.test(document)) {
    throw new Error('Unresolved source placeholder in final document');
  }
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
const document = injectCspHashes(assemble());
assertNoUnresolvedPlaceholders(document);
const result = writeBuild(document);
console.log(`Built build/coldbox.html (${result.digest})`);
