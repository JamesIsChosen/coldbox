'use strict';

// P0.20 - In-app Appropriate Legal Notices (AGPLv3 §5(d)).
//
// AGPLv3 §0 defines "Appropriate Legal Notices" as a convenient and
// prominently visible feature that (1) displays an appropriate copyright
// notice, (2) displays notice that there is no warranty for the program
// (or, if the interactive interface displays a list of user commands,
// includes a command to display this notice), (3) tells the user that they
// may convey the work under this License, and (4) tells the user how to
// view a copy of this License. §5(d) requires an interactive UI to display
// them; the provenance panel is that UI (see ADR-0018 and ADR-0015).
//
// This suite covers the one criterion that is fundamentally a byte-for-byte
// comparison (the embedded licence text must be identical to the
// repository's own LICENSE, so the two can never quietly drift), plus the
// build-time wiring that makes that guarantee real rather than incidental,
// plus the markup-level presence of the other three §0 elements. The
// "reachable from the app's own UI without a network connection" criterion
// is a browser-only property and is covered separately by
// scripts/run-browser-harness.js's verifyLegalNotices(), per the roadmap's
// 🌐 marker on this item.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');
const licensePath = path.join(projectRoot, 'LICENSE');
const packageJsonPath = path.join(projectRoot, 'package.json');

function runBuild(cwd = projectRoot, overrides = {}) {
  const result = spawnSync(process.execPath, [path.join(cwd, 'scripts', 'build.js')], {
    cwd,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC', ...overrides },
    encoding: 'utf8'
  });
  return result;
}

function createBuildRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-legal-notices-'));
  for (const directory of ['scripts', 'src', 'vendor', 'docs']) {
    fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
  }
  fs.copyFileSync(licensePath, path.join(root, 'LICENSE'));
  return root;
}

// Mirrors provenance.test.js's provenanceBuildDate()-style extraction: reads
// the embedded value straight out of the built document's own source, not
// out of a parallel re-implementation, so a bug in how the value is
// embedded can't be masked by the test computing the same wrong thing.
function embeddedLicenseText(html) {
  const match = html.match(/var PROVENANCE_LICENSE_TEXT = ("(?:[^"\\]|\\.)*");/);
  assert.ok(match, 'built document must embed PROVENANCE_LICENSE_TEXT');
  return JSON.parse(match[1]);
}

test('build succeeds from a clean checkout copy', () => {
  assert.equal(runBuild().status, 0);
});

test('embedded licence text is byte-identical to the repository LICENSE file', () => {
  assert.equal(runBuild().status, 0);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const embedded = embeddedLicenseText(html);
  const repoLicense = fs.readFileSync(licensePath, 'utf8');

  // Byte-for-byte, not just string-equal-after-some-normalization: compare
  // UTF-8 buffers directly, since a subtle whitespace/encoding difference
  // could pass a naive `===` on two JS strings that decoded slightly
  // differently and still not be the acceptance criterion's "byte-identical".
  assert.deepEqual(
    Buffer.from(embedded, 'utf8'),
    Buffer.from(repoLicense, 'utf8'),
    'embedded PROVENANCE_LICENSE_TEXT must be byte-identical to the repository LICENSE file'
  );
});

test('negative: a build against a deliberately modified LICENSE embeds the modified text, not the real one (proves the comparison is meaningful)', () => {
  const root = createBuildRoot();
  try {
    const tamperedLicense = `${fs.readFileSync(licensePath, 'utf8')}\nTAMPERED FOR TEST\n`;
    fs.writeFileSync(path.join(root, 'LICENSE'), tamperedLicense, 'utf8');

    const result = runBuild(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const html = fs.readFileSync(path.join(root, 'build', 'coldbox.html'), 'utf8');
    const embedded = embeddedLicenseText(html);

    assert.equal(embedded, tamperedLicense, 'build must embed exactly the LICENSE bytes it was given');
    assert.notEqual(
      embedded,
      fs.readFileSync(licensePath, 'utf8'),
      'sanity: the tampered copy must actually differ from the real repository LICENSE, or this test proves nothing'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('negative: build refuses if the __COLDBOX_LICENSE_TEXT__ placeholder is missing from main.js', () => {
  const root = createBuildRoot();
  try {
    const mainJsPath = path.join(root, 'src', 'main.js');
    const original = fs.readFileSync(mainJsPath, 'utf8');
    const mutated = original.replace('__COLDBOX_LICENSE_TEXT__', '"placeholder removed by test"');
    assert.notEqual(mutated, original, 'fixture did not actually remove the placeholder');
    fs.writeFileSync(mainJsPath, mutated, 'utf8');

    const result = runBuild(root);
    assert.notEqual(result.status, 0, 'build must fail closed when the licence-text placeholder is absent');
    assert.match(result.stderr + result.stdout, /__COLDBOX_LICENSE_TEXT__/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('negative: build refuses if the __COLDBOX_LICENSE_TEXT__ placeholder appears more than once', () => {
  const root = createBuildRoot();
  try {
    const mainJsPath = path.join(root, 'src', 'main.js');
    const original = fs.readFileSync(mainJsPath, 'utf8');
    const mutated = original.replace(
      'var PROVENANCE_LICENSE_TEXT = __COLDBOX_LICENSE_TEXT__;',
      'var PROVENANCE_LICENSE_TEXT = __COLDBOX_LICENSE_TEXT__;\n  var PROVENANCE_LICENSE_TEXT_DUP = __COLDBOX_LICENSE_TEXT__;'
    );
    assert.notEqual(mutated, original, 'fixture did not introduce a second placeholder occurrence');
    fs.writeFileSync(mainJsPath, mutated, 'utf8');

    const result = runBuild(root);
    assert.notEqual(result.status, 0, 'build accepted more than one __COLDBOX_LICENSE_TEXT__ placeholder');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the provenance panel states the SPDX identifier AGPL-3.0-only, matching package.json\'s license field', () => {
  assert.equal(runBuild().status, 0);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(packageJson.license, 'AGPL-3.0-only', 'package.json is the canonical source of the SPDX identifier');
  assert.match(html, /id="provenance-license-spdx">AGPL-3\.0-only</);
});

test('the provenance panel states the copyright notice, the no-warranty statement, and the may-convey-under-this-licence statement (AGPLv3 §0)', () => {
  assert.equal(runBuild().status, 0);
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /id="provenance-legal-notices"/, 'legal notices section must exist');
  assert.match(html, /Copyright \(C\) \d{4} James Kent/, 'copyright notice must be present');
  assert.match(html, /ABSOLUTELY NO WARRANTY/i, 'no-warranty statement must be present');
  assert.match(
    html,
    /convey.{0,80}under the same licence|redistribute.{0,80}under the same licence/i,
    'statement that recipients may convey the work under the same licence must be present'
  );
  assert.match(html, /GNU Affero General Public License/, 'licence name must be present');
});

test('the full licence text is reachable in the DOM without a further network request or navigation', () => {
  assert.equal(runBuild().status, 0);
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Wired to a <details> disclosure, not a link to an external URL - the
  // roadmap explicitly rules out a URL, since it would be unreachable
  // offline and would itself be an outbound network reference.
  assert.match(html, /<details class="provenance-license-details" id="provenance-license-details">/);
  assert.match(html, /<pre class="provenance-license-text" id="provenance-license-text">/);
  assert.doesNotMatch(html, /href="https?:\/\/[^"]*\/licenses\//i);
  assert.match(html, /provenanceLicenseText = document\.getElementById\('provenance-license-text'\)/);
  assert.match(html, /renderProvenanceLicenseText/);
  assert.match(html, /provenanceLicenseText\.textContent = typeof PROVENANCE_LICENSE_TEXT/);
});

test('two builds of the same commit embed identical licence text', () => {
  assert.equal(runBuild(projectRoot, { LC_ALL: 'de-DE', TZ: 'Pacific/Honolulu' }).status, 0);
  const first = embeddedLicenseText(fs.readFileSync(htmlPath, 'utf8'));
  assert.equal(runBuild(projectRoot, { LC_ALL: 'ja-JP', TZ: 'Asia/Tokyo' }).status, 0);
  const second = embeddedLicenseText(fs.readFileSync(htmlPath, 'utf8'));

  assert.equal(first, second);
});
