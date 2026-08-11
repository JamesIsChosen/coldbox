'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { createCryptoVendorSource } = require('./crypto-bundle.js');
const { createFontFaceSource } = require('./font-bundle.js');
const { compileHelpContent } = require('./help-content.js');

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
const vendorManifestPath = path.join(projectRoot, 'vendor', 'vendor-manifest.json');
const licensePath = path.join(projectRoot, 'LICENSE');

// The self-hash meta tag cannot contain the hash of a document that includes
// its own final value, so the build hashes the document with this fixed,
// same-length placeholder in place of the real digest, then substitutes the
// real digest in afterward (see injectExpectedHash below). The in-app drop
// zone reproduces the identical blank-then-hash procedure, so the check is
// an honest self-consistency check rather than a claim of independent proof.
const EXPECTED_HASH_PLACEHOLDER = '0'.repeat(64);
const EXPECTED_HASH_META_BLANK = `<meta name="coldbox-expected-hash" content="${EXPECTED_HASH_PLACEHOLDER}">`;

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
  Object.freeze({ file: 'index.html', token: '__COLDBOX_ENTROPY_LAB_LAYER__', content: 'entropy-lab.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_ENTROPY_HEALTH_LAYER__', content: 'entropy-health.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_SEED_FORGE_LAYER__', content: 'seed-forge.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_DERIVATION_LAYER__', content: 'derivation.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_VERIFICATION_LAYER__', content: 'verification.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_ADDRESS_VERIFICATION_LAYER__', content: 'address-verification.js' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_COLD_STYLES__', content: 'styles.css' }),
  Object.freeze({ file: 'index.html', token: '__COLDBOX_COLD_SCRIPT__', content: 'main.js' })
]);

function readSource(file) {
  const contents = fs.readFileSync(path.join(sourceRoot, file), 'utf8');
  return normalizeLineEndings(contents);
}

// Single source of truth for the in-app provenance panel: the same manifest
// `npm run verify-vendor` checks against real upstream release bytes. Sorted
// explicitly rather than trusting JSON key order, per the no-unsorted-
// iteration determinism rule.
function readVendorManifestLibraries() {
  const manifest = JSON.parse(fs.readFileSync(vendorManifestPath, 'utf8'));
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  return artifacts
    .map((artifact) => Object.freeze({
      name: artifact.name,
      version: artifact.version,
      sha256: artifact.sha256,
      url: artifact.url
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// P0.20 - AGPLv3 Section 5(d) requires an interactive UI to display
// Appropriate Legal Notices, including "how to view a copy of [the]
// License". The embedded copy must be byte-identical to the repository's
// own LICENSE file (test/legal-notices.test.js asserts this), so this reads
// the file's raw bytes with no normalization of any kind - not even the
// BOM-strip / CRLF-to-LF pass readSource() applies to every other source
// file, since that pass could quietly turn "byte-identical" into "identical
// after this build script's own opinion about line endings", defeating the
// point of the test. Read as UTF-8 text (LICENSE is spec'd - see the
// AGPLv3 text itself - to be ASCII, so this is lossless in practice) so it
// can be embedded as a JSON string literal like every other provenance
// value.
function readLicenseText() {
  return fs.readFileSync(licensePath, 'utf8');
}

// Deliberately not a wall-clock build timestamp - see build.md's "no
// timestamps in output" determinism requirement and the note this same
// string carries in the provenance panel itself.
//
// ADR-0015 originally used the date of literal HEAD. That broke down in
// practice (see the ADR-0015 amendment dated 2026-08-06 / the P0.16 review
// F4 finding): a commit that touches only governance paths - a PR packet
// under docs/05-development/packets/, the roadmap checkbox, the changelog -
// still moves HEAD, and HEAD's date fed straight into this field. That
// makes the build's own bytes change every time the packet describing those
// bytes is committed, so the packet can never truthfully describe the tip
// it ships on.
//
// Fixed by scoping the git-log query to the paths that actually feed the
// build: everything readSource()/the vendor manifest/the vendor tarball
// draw from. A commit touching only docs/, test/, or top-level metadata
// files is invisible to this query, so the build date - and therefore every
// other build output - stays fixed across governance-only commits. It only
// advances when a commit that could actually change the product is made.
//
// Still degrades to a labeled "unknown" rather than failing the build when
// git metadata is unavailable (e.g. a source tarball without history),
// since this field is informational and not a security boundary.
const BUILD_DATE_SOURCE_PATHS = Object.freeze(['src', 'scripts', 'vendor']);

function readBuildCommitDate() {
  const result = spawnSync(
    'git',
    ['log', '-1', '--format=%cI', 'HEAD', '--', ...BUILD_DATE_SOURCE_PATHS],
    { cwd: projectRoot, encoding: 'utf8' }
  );
  if (!result.error && result.status === 0 && result.stdout && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return 'unknown (no git commit metadata available)';
}

// P0.17 - Help framework. Compiles docs/00-overview/glossary.md and
// docs/03-guides/*.md into the three-depth content model and embeds the
// result into the build, per docs/01-spec/SPEC.md #18. A guide or glossary
// term missing one or more ::: plain/working/technical blocks is reported
// as a build warning (see the roadmap's P0.17 acceptance criterion) rather
// than failing the build - the gap is visible without blocking unrelated
// work, and doc-hygiene.md's own automated CI check (P0.18) is what turns
// "help content missing a depth block" into a hard failure once wired up.
let cachedHelpContent = null;

function readHelpContent() {
  if (cachedHelpContent) {
    return cachedHelpContent.content;
  }
  const { content, warnings } = compileHelpContent(projectRoot);
  for (const warning of warnings) {
    console.warn(`Help content warning: ${warning}`);
  }
  if (warnings.length > 0) {
    console.warn(`Help content warning: ${warnings.length} gap(s) found — see docs/05-development/ROADMAP.md P0.17 backfill obligation.`);
  }
  cachedHelpContent = { content, warnings };
  return content;
}

function jsonScriptLiteral(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function injectExpectedHash(document) {
  const occurrences = document.split(EXPECTED_HASH_META_BLANK).length - 1;
  if (occurrences !== 1) {
    throw new Error('Expected exactly one blanked provenance expected-hash meta tag');
  }
  const blankedDigest = crypto.createHash('sha256').update(Buffer.from(document, 'utf8')).digest('hex');
  return document.replace(
    EXPECTED_HASH_META_BLANK,
    `<meta name="coldbox-expected-hash" content="${blankedDigest}">`
  );
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
  document = injectOnce(document, '__COLDBOX_EXPECTED_HASH__', EXPECTED_HASH_PLACEHOLDER);
  const protocolSource = readSource('protocol.js');
  const airgapSource = readSource('airgap.js');
  const capabilitiesSource = readSource('capabilities.js');
  const coldRealmDocument = injectColdCspHashes(
    assembleColdRealm(protocolSource, airgapSource, capabilitiesSource)
  );
  const saveIntegritySource = readSource('save-integrity.js');
  const vaultTransferSource = readSource('vault-transfer.js');
  const registrySource = readSource('registry.js');
  const concealmentSource = readSource('concealment.js');
  let mainScript = injectOnce(readSource('main.js'), '__COLDBOX_QR_ENCODER__', readQrEncoderSource());
  mainScript = injectOnce(mainScript, '__COLDBOX_ADDRESS_VERIFICATION__', readSource('address-verification.js'));
  mainScript = injectOnce(mainScript, '__COLDBOX_PROTOCOL__', protocolSource);
  mainScript = injectOnce(mainScript, '__COLDBOX_REGISTRY__', registrySource);
  mainScript = injectOnce(mainScript, '__COLDBOX_CONCEALMENT__', concealmentSource);
  mainScript = injectOnce(mainScript, '__COLDBOX_AIRGAP__', airgapSource);
  mainScript = injectOnce(mainScript, '__COLDBOX_CAPABILITIES__', capabilitiesSource);
  mainScript = injectOnce(mainScript, '__COLDBOX_SAVE_INTEGRITY__', saveIntegritySource);
  mainScript = injectOnce(mainScript, '__COLDBOX_VAULT_TRANSFER__', vaultTransferSource);
  mainScript = injectOnce(
    mainScript,
    '__COLDBOX_COLD_REALM_DOCUMENT__',
    jsonScriptLiteral(coldRealmDocument)
  );
  mainScript = injectOnce(
    mainScript,
    '__COLDBOX_PROVENANCE_LIBRARIES__',
    jsonScriptLiteral(readVendorManifestLibraries())
  );
  mainScript = injectOnce(
    mainScript,
    '__COLDBOX_BUILD_DATE__',
    jsonScriptLiteral(readBuildCommitDate())
  );
  mainScript = injectOnce(
    mainScript,
    '__COLDBOX_HELP_CONTENT__',
    jsonScriptLiteral(readHelpContent())
  );
  mainScript = injectOnce(
    mainScript,
    '__COLDBOX_LICENSE_TEXT__',
    jsonScriptLiteral(readLicenseText())
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
    '__COLDBOX_FRAME_STYLE_HASHES__',
    '__COLDBOX_HELP_CONTENT__',
    '__COLDBOX_LICENSE_TEXT__',
    '__COLDBOX_ADDRESS_VERIFICATION__'
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
    ['entropy-lab.js', readSource('cold/entropy-lab.js')],
    ['entropy-health.js', readSource('cold/entropy-health.js')],
    ['seed-forge.js', readSource('cold/seed-forge.js')],
    ['derivation.js', readSource('cold/derivation.js')],
    ['verification.js', readSource('cold/verification.js')],
    ['address-verification.js', readSource('address-verification.js')],
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
    '__COLDBOX_ENTROPY_LAB_LAYER__',
    '__COLDBOX_ENTROPY_HEALTH_LAYER__',
    '__COLDBOX_SEED_FORGE_LAYER__',
    '__COLDBOX_DERIVATION_LAYER__',
    '__COLDBOX_VERIFICATION_LAYER__',
    '__COLDBOX_ADDRESS_VERIFICATION_LAYER__',
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

// Writes a file "atomically": write the full contents to a process-unique
// temp file in the same directory, then rename it over the real path.
//
// The guarantee this actually provides, and that is actually tested: a
// concurrent READER of targetPath, with a SINGLE writer in flight, can only
// ever observe the previous complete file or the new complete file - never
// a half-written one. That's what matters for this project's own usage: a
// plain fs.writeFileSync(htmlPath, ...) opens the destination with O_TRUNC
// and then writes in one or more syscalls, so a reader could previously
// land on a truncated or doubly-truncated file if it read mid-write
// (reproduced locally by hammering concurrent builds + reads against the
// same path - see docs/05-development/packets/p0.18-ci.md §14, R2-F1).
// Writing to a unique temp name first and renaming into place removes that
// reader-sees-partial-file window entirely.
//
// What this does NOT guarantee: safety under multiple concurrent WRITERS
// racing each other to the same targetPath. POSIX rename(2) is atomic with
// no failure mode of this kind, but on Windows, renaming onto a destination
// that another process (or even the OS's own file-close bookkeeping, an
// antivirus scanner, etc.) has momentarily open can fail with EPERM/EBUSY-
// shaped errors - confirmed by an independent reviewer, who reproduced a
// real `EPERM: operation not permitted, rename` from this line under six
// concurrent real `node scripts/build.js` processes targeting one shared
// path on Windows (docs/05-development/packets/p0.18-ci.md §15, R3-F1).
// This function does not retry or otherwise paper over that failure - it
// fails closed (throws) rather than silently succeeding with a partial
// write, which is the correct behavior given it isn't attempted here, but
// it means writeFileAtomic/writeBuild is not safe to call from more than
// one process against the same targetPath at the same time.
//
// This project's actual usage never triggers that scenario: `npm test`
// runs with `--test-concurrency=1` (serializing test files, so their
// spawned build child processes never race each other), and a normal
// `node scripts/build.js` invocation is a single process. Multi-writer
// robustness was deliberately left out of scope rather than built and left
// untested - see the R3-F1 remediation in the packet for the reasoning.
function writeFileAtomic(targetPath, data) {
  const uniqueSuffix = `${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const tempPath = `${targetPath}.tmp-${uniqueSuffix}`;
  fs.writeFileSync(tempPath, data);
  fs.renameSync(tempPath, targetPath);
}

function writeBuild(document) {
  const output = Buffer.from(document, 'utf8');
  const digest = crypto.createHash('sha256').update(output).digest('hex');
  const htmlPath = path.join(buildRoot, 'coldbox.html');
  const hashPath = path.join(buildRoot, 'coldbox.html.sha256');

  fs.mkdirSync(buildRoot, { recursive: true });
  writeFileAtomic(htmlPath, output);
  writeFileAtomic(hashPath, `${digest}  build/coldbox.html\n`);

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
const assembled = injectCspHashes(assemble());
assertNoUnresolvedPlaceholders(assembled);
const document = injectExpectedHash(assembled);
const result = writeBuild(document);
console.log(`Built build/coldbox.html (${result.digest})`);
