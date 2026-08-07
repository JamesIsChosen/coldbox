'use strict';

// P0.16 - Provenance panel and self-hash verifier.
//
// Covers the build-time provenance data (embedded library list sourced from
// vendor/vendor-manifest.json, the commit-derived build date, and the
// blank-then-hash self-consistency mechanism for the drop-zone verifier) and
// the corresponding markup in the assembled document. Browser-only behavior
// (the drop zone actually hashing a dropped file) is covered separately by
// the P0.3a harness in scripts/run-browser-harness.js, per the roadmap's 🌐
// marker on this item.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');
const manifestPath = path.join(projectRoot, 'vendor', 'vendor-manifest.json');
const dependenciesDocPath = path.join(projectRoot, 'docs', '05-development', 'dependencies.md');

function runBuild(overrides = {}) {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: projectRoot,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC', ...overrides },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function createBuildRoot() {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'coldbox-provenance-'));
  for (const directory of ['scripts', 'src', 'vendor']) {
    fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
  }
  return root;
}

function blankExpectedHashMeta(text) {
  return text.replace(
    /(<meta name="coldbox-expected-hash" content=")[0-9a-f]{64}(">)/i,
    `$1${'0'.repeat(64)}$2`
  );
}

function expectedHashOf(html) {
  const match = html.match(/<meta name="coldbox-expected-hash" content="([0-9a-f]{64})">/i);
  assert.ok(match, 'built document must include the coldbox-expected-hash meta tag');
  return match[1];
}

function provenanceLibraryPayload(html) {
  const match = html.match(/var PROVENANCE_LIBRARIES = (\[[\s\S]*?\]);/);
  assert.ok(match, 'built document must embed PROVENANCE_LIBRARIES');
  return JSON.parse(match[1]);
}

function provenanceBuildDate(html) {
  const match = html.match(/var PROVENANCE_BUILD_DATE = ("(?:[^"\\]|\\.)*");/);
  assert.ok(match, 'built document must embed PROVENANCE_BUILD_DATE');
  return JSON.parse(match[1]);
}

test('embedded library list matches vendor-manifest.json exactly, sorted by name', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const expected = manifest.artifacts
    .map((artifact) => ({
      name: artifact.name,
      version: artifact.version,
      sha256: artifact.sha256,
      url: artifact.url
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const embedded = provenanceLibraryPayload(html);
  assert.deepEqual(embedded, expected);
  assert.equal(embedded.length, manifest.artifacts.length);

  const names = embedded.map((library) => library.name);
  const sortedNames = [...names].sort();
  assert.deepEqual(names, sortedNames, 'library list must be in explicit sorted order');
});

test('every embedded library hash is documented in dependencies.md, per the roadmap acceptance criterion', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dependenciesDoc = fs.readFileSync(dependenciesDocPath, 'utf8');
  const embedded = provenanceLibraryPayload(html);

  assert.ok(embedded.length > 0, 'at least one library must be embedded to make this check meaningful');
  for (const library of embedded) {
    assert.ok(
      dependenciesDoc.includes(library.sha256),
      `dependencies.md is missing the hash for ${library.name}@${library.version} (${library.sha256})`
    );
  }
});

test('build date is the commit date of HEAD, not a wall-clock build timestamp', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const buildDate = provenanceBuildDate(html);

  const gitLog = spawnSync('git', ['log', '-1', '--format=%cI', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  assert.equal(gitLog.status, 0, 'this checkout is expected to have git metadata for HEAD');
  assert.equal(buildDate, gitLog.stdout.trim());
});

test('two builds of the same commit embed an identical build date and expected hash', () => {
  runBuild({ LC_ALL: 'de-DE', TZ: 'Pacific/Honolulu' });
  const first = fs.readFileSync(htmlPath, 'utf8');
  runBuild({ LC_ALL: 'ja-JP', TZ: 'Asia/Tokyo' });
  const second = fs.readFileSync(htmlPath, 'utf8');

  assert.equal(provenanceBuildDate(first), provenanceBuildDate(second));
  assert.equal(expectedHashOf(first), expectedHashOf(second));
  assert.equal(first, second);
});

test('build date degrades to a labeled unknown value, without failing the build, when git metadata is unavailable', () => {
  const root = createBuildRoot();
  try {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const html = fs.readFileSync(path.join(root, 'build', 'coldbox.html'), 'utf8');
    assert.equal(provenanceBuildDate(html), 'unknown (no git commit metadata available)');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the expected-hash meta tag equals the SHA-256 of the document with that same tag blanked to zeros', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const declared = expectedHashOf(html);

  const blanked = blankExpectedHashMeta(html);
  assert.notEqual(blanked, html, 'blanking must actually change the document');
  const recomputed = crypto.createHash('sha256').update(Buffer.from(blanked, 'utf8')).digest('hex');
  assert.equal(recomputed, declared);
});

test('a single altered byte elsewhere in the file is caught by the blank-then-hash comparison', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const declared = expectedHashOf(html);

  const markerIndex = html.indexOf('<title>Coldbox</title>');
  assert.notEqual(markerIndex, -1);
  const tamperedBytes = Buffer.from(html, 'utf8');
  const titleByteOffset = Buffer.byteLength(html.slice(0, markerIndex), 'utf8');
  tamperedBytes[titleByteOffset] ^= 1;
  const tampered = tamperedBytes.toString('utf8');

  const blankedTampered = blankExpectedHashMeta(tampered);
  const recomputed = crypto.createHash('sha256').update(Buffer.from(blankedTampered, 'utf8')).digest('hex');
  assert.notEqual(recomputed, declared, 'a tampered file must not still match the original expected hash');
});

test('exactly one blanked expected-hash placeholder exists before substitution, or the build refuses', () => {
  const root = createBuildRoot();
  try {
    const indexPath = path.join(root, 'src', 'index.html');
    const original = fs.readFileSync(indexPath, 'utf8');
    const mutated = original.replace(
      '<meta name="coldbox-expected-hash" content="__COLDBOX_EXPECTED_HASH__">',
      '<meta name="coldbox-expected-hash" content="__COLDBOX_EXPECTED_HASH__">\n  <meta name="coldbox-expected-hash-duplicate" content="__COLDBOX_EXPECTED_HASH__">'
    );
    assert.notEqual(mutated, original, 'fixture did not introduce a second placeholder occurrence');
    fs.writeFileSync(indexPath, mutated, 'utf8');

    const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
    });
    assert.notEqual(result.status, 0, 'build accepted more than one __COLDBOX_EXPECTED_HASH__ placeholder');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the reference page states plainly that self-verification is circular and names the independent check', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /circular/i);
  assert.match(html, /verification\.md/);
  assert.match(html, /shasum|Get-FileHash|certutil/);
  assert.match(html, /GPG/i);
});

test('the CSP shown in the provenance panel is read from the live meta tag, not a second embedded copy', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  // The warm CSP is read live via document.querySelector at runtime, so the
  // only static evidence in source is the query itself plus the one real
  // meta tag already covered by test/build.test.js's CSP tests. The cold CSP
  // panel is read from the already-embedded coldRealmDocument string, so no
  // second copy of the cold policy should exist outside that string and the
  // srcdoc iframe assembly.
  assert.match(html, /provenanceCspWarm/);
  assert.match(html, /meta\[http-equiv="Content-Security-Policy"\]/);
  assert.match(html, /extractCspFromMarkup\(coldRealmDocument\)/);
});

test('provenance drop-zone markup exposes stable ids for browser-harness file-upload emulation', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const id of [
    'provenance-drop-zone',
    'provenance-drop-input',
    'provenance-drop-choose',
    'provenance-drop-result',
    'provenance-library-list',
    'provenance-build-date',
    'provenance-csp-warm',
    'provenance-csp-cold'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `missing #${id} in built document`);
  }
});
