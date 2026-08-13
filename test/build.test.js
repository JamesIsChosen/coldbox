'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');
const hashPath = path.join(projectRoot, 'build', 'coldbox.html.sha256');

// P0.17 review F2 remediation: scripts/build.js's jsonScriptLiteral() emits
// exactly three JSON-escape sequences - \u003c, \u003e, \u0026 - as literal
// six-character source text when it embeds guide/glossary prose (see
// scripts/build.js's jsonScriptLiteral). A sentence that ends a word right
// before an escaped tag (e.g. "...can't confuse anyone later.<strong>...")
// compiles to "...later.\u003cstrong\u003e...", and "r.\u003c" spells
// "letter, colon, backslash" - the exact shape this leak check looks for in
// a Windows drive-letter path.
//
// An earlier draft of this check excluded *any* "letter:\" followed by a
// lowercase 'u' plus four hex digits, on the theory that real absolute
// paths are never followed by that shape. That theory is false: a real path
// like `C:\u1234\repo\file.js` (a directory literally named "u1234") would
// legitimately leak past that check undetected. The exclusion must instead
// name the exact three escape sequences jsonScriptLiteral produces, so any
// other "letter:\u" shape - including a coincidental real path - still gets
// flagged.
const NO_MACHINE_PATHS = /[A-Za-z]:\\(?!u003c|u003e|u0026)|\/Users\/|\/home\//;

// P0.20: PROVENANCE_LICENSE_TEXT is the first embedded value that is raw
// multi-line prose rather than single-line HTML, so it is the first value
// whose JSON.stringify() encoding can legitimately contain the plain
// control-character escape `\n` mid-sentence. The real repository LICENSE
// has several sentences that end a line with a colon (e.g. "...supplement
// the terms of this License with terms:\n"), which is "letter, colon,
// backslash, n" - the same shape this check looks for, and unlike F2's
// \u003c/\u003e/\u0026 case there is no way to extend the exclusion to
// cover it without also blinding the check to real "C:\temp",
// "C:\repo", "C:\node_modules"-shaped absolute paths (those are exactly as
// plausible as this collision, so excluding bare "n"/"r"/"t" after a drive
// letter would be a net loss of real detection power, not a fix).
//
// Resolved by excluding only the one substring the *whole-document* scan
// cannot usefully evaluate - the JSON-encoded licence assignment, whose
// escaped `\n` sequences are what collides with the drive-letter shape - and
// separately scanning the licence text's actual, unescaped bytes (see
// extractEmbeddedLicenseText() and its use below) with the same
// NO_MACHINE_PATHS rule. Byte-identity to the repository's LICENSE
// (test/legal-notices.test.js) proves the embedded text matches its input;
// it does not prove that input is itself path-free, so this file must check
// that independently rather than lean on identity as a substitute (P0.20
// review F2). Once unescaped, real licence prose never produces the
// "letter:\" + escape-sequence shape that motivated the strip in the first
// place - that collision is an artefact of JSON-string escaping, not of the
// text itself - so scanning the raw text directly does not reintroduce the
// original false positive. Every other byte of the build - including the
// surrounding assignment statement, every other embedded value, and the
// rest of the document - is still checked in full via the strip below.
function stripEmbeddedLicenseText(html) {
  return html.replace(
    /var PROVENANCE_LICENSE_TEXT = "(?:[^"\\]|\\.)*";/,
    'var PROVENANCE_LICENSE_TEXT = "";'
  );
}

function extractEmbeddedLicenseText(html) {
  const match = html.match(/var PROVENANCE_LICENSE_TEXT = ("(?:[^"\\]|\\.)*");/);
  assert.ok(match, 'built artifact must embed PROVENANCE_LICENSE_TEXT');
  return JSON.parse(match[1]);
}

// The cold document is JSON-encoded inside the warm script. Its source
// comments contain ordinary JavaScript escape-looking text such as
// `license:\n`; scanning that encoded representation would mistake the
// escaped newline for a Windows drive path (`e:\`). Decode it before scanning
// and scan the decoded document independently, just as the licence text above
// is scanned independently of the surrounding document.
function stripEmbeddedColdRealmDocument(html) {
  return html.replace(
    /var coldRealmDocument = "(?:[^"\\]|\\.)*";/,
    'var coldRealmDocument = "";'
  );
}

function extractEmbeddedColdRealmDocument(html) {
  const match = html.match(/var coldRealmDocument = ("(?:[^"\\]|\\.)*");/);
  assert.ok(match, 'built artifact must embed coldRealmDocument');
  return JSON.parse(match[1]);
}

// Mirrors scripts/build.js's jsonScriptLiteral() exactly. Not imported
// directly because build.js runs its build as top-level side effects on
// require (it's a CLI script, not a library module) - requiring it here
// would trigger a second, unwanted build. Keep this in sync if
// jsonScriptLiteral's escape set ever changes.
function jsonScriptLiteral(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function cspHash(block) {
  return `'sha256-${crypto.createHash('sha256').update(Buffer.from(block, 'utf8')).digest('base64')}'`;
}

function inlineBlocks(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function cspPolicy(html) {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
  assert.ok(match, 'built document must include a CSP meta tag');
  return match[1];
}

function cspDirective(policy, directive) {
  const match = policy.match(new RegExp(`(?:^|;)\\s*${directive}\\s+([^;]+)`));
  assert.ok(match, `CSP must include ${directive}`);
  return match[1];
}

function coldSandboxToken(html) {
  const match = html.match(/coldFrame\.setAttribute\('sandbox', '([^']+)'\)/);
  assert.ok(match, 'Built artifact must set the cold iframe sandbox explicitly');
  return match[1];
}

function assertExactColdSandbox(html) {
  assert.equal(coldSandboxToken(html), 'allow-scripts allow-downloads allow-modals');
}

function provenanceBuildDate(html) {
  const match = html.match(/<p class="provenance-value" id="provenance-build-date">([^<]+)<\/p>/);
  assert.ok(match, 'built document must expose the provenance build date');
  return match[1];
}

function createBuildRoot() {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'coldbox-csp-'));
  for (const directory of ['scripts', 'src', 'vendor', 'docs']) {
    fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
  }
  // P0.20: build.js now reads the repository LICENSE file directly (see
  // readLicenseText()), so every isolated build root needs a copy or the
  // build fails with ENOENT before assembling anything.
  fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(root, 'LICENSE'));
  return root;
}

function runBuildAt(root) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return fs.readFileSync(path.join(root, 'build', 'coldbox.html'), 'utf8');
}

function runBuildProcessAt(root) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
    cwd: root,
    encoding: 'utf8'
  });
}

function runBuild(overrides = {}) {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: projectRoot,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC', ...overrides },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('build assembles one HTML file and emits its SHA-256 sidecar', () => {
  runBuild();

  const html = fs.readFileSync(htmlPath);
  const sidecar = fs.readFileSync(hashPath, 'utf8');
  const digest = crypto.createHash('sha256').update(html).digest('hex');

  assert.match(html.toString('utf8'), /<title>Coldbox<\/title>/);
  assert.doesNotMatch(html.toString('utf8'), /__COLDBOX_/);
  assert.equal(sidecar, `${digest}  build/coldbox.html\n`);
  // P0.20 review F2: the whole-document scan below excludes the JSON-encoded
  // PROVENANCE_LICENSE_TEXT assignment (its escaping is what collides with
  // NO_MACHINE_PATHS), so the licence text's actual bytes must be checked
  // independently, unescaped, or a machine path introduced via LICENSE would
  // pass unnoticed - which is exactly what the reviewer demonstrated. See the
  // negative regression below for proof this still catches it.
  assert.doesNotMatch(
    extractEmbeddedLicenseText(html.toString('utf8')),
    NO_MACHINE_PATHS,
    'embedded licence text leaked a machine-specific path'
  );
  const document = html.toString('utf8');
  assert.doesNotMatch(extractEmbeddedColdRealmDocument(document), NO_MACHINE_PATHS);
  assert.doesNotMatch(stripEmbeddedColdRealmDocument(stripEmbeddedLicenseText(document)), NO_MACHINE_PATHS);
  assert.equal(html.includes(0x0d), false, 'generated HTML must use LF line endings');
  assert.equal(Buffer.from(sidecar, 'utf8').includes(0x0d), false, 'sidecar must use LF line endings');
});

test('the no-machine-paths guard flags real absolute paths, including ones shaped like a JSON escape, but not the actual JSON escapes jsonScriptLiteral emits (P0.17 review F2)', () => {
  const shouldFlag = {
    'ordinary Windows user path': String.raw`C:\Users\jkent\repo\file.js`,
    'ordinary Windows build path': String.raw`D:\build\coldbox\file.js`,
    'macOS user path': '/Users/jkent/repo/file.js',
    'Linux home path': '/home/jkent/repo/file.js',
    'a real Windows path that happens to start with u + 4 hex digits': String.raw`C:\u1234\repo\file.js`
  };
  for (const [label, text] of Object.entries(shouldFlag)) {
    assert.match(text, NO_MACHINE_PATHS, `expected to flag: ${label}`);
  }

  const shouldNotFlag = {
    'a literal <': jsonScriptLiteral('one.<strong>two'),
    'a literal >': jsonScriptLiteral('one.</strong>two'),
    'a literal &': jsonScriptLiteral('one & two'),
    'all three together': jsonScriptLiteral('<p>one &amp; two</p>')
  };
  for (const [label, text] of Object.entries(shouldNotFlag)) {
    assert.doesNotMatch(text, NO_MACHINE_PATHS, `expected not to flag: ${label}`);
  }
});

// P0.20 review F2: the reviewer proved that appending a literal Windows path
// to a disposable copy of LICENSE got 21/21 green under the pre-remediation
// version of this file, because stripEmbeddedLicenseText() removed the whole
// embedded assignment before NO_MACHINE_PATHS ever ran, and byte-identity to
// LICENSE (test/legal-notices.test.js) says nothing about whether LICENSE
// itself is path-free. This test reproduces that exact attack end-to-end -
// a self-contained copy of the repository's build inputs and test suite,
// with a machine path smuggled into LICENSE - and requires the copied
// build.test.js to fail non-zero, not merely requires our own assertion
// above to fire in-process. If someone reverts the extractEmbeddedLicenseText
// check and reintroduces the blind spot, this is the test that catches it.
test('a machine path smuggled in through LICENSE makes the build test suite fail non-zero (P0.20 review F2 negative regression)', () => {
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'coldbox-license-leak-'));
  try {
    for (const directory of ['scripts', 'src', 'vendor', 'docs']) {
      fs.cpSync(path.join(projectRoot, directory), path.join(root, directory), { recursive: true });
    }
    const originalLicense = fs.readFileSync(path.join(projectRoot, 'LICENSE'), 'utf8');
    const sentinelPath = String.raw`C:\Users\reviewer\coldbox\secret`;
    fs.writeFileSync(
      path.join(root, 'LICENSE'),
      `${originalLicense}\nREVIEW MACHINE PATH SENTINEL: ${sentinelPath}\n`,
      'utf8'
    );

    // A standalone check file, not a copy of this file. Copying build.test.js
    // itself into `root/test` and running it with `node --test` would embed
    // this very test inside the child process, which would then spawn its
    // own child, and so on - unbounded recursive builds until the sandbox
    // kills the process (observed: SIGKILL after ~60s during development of
    // this test). Extracting only the two real assertions under test avoids
    // that, while still exercising the actual build pipeline and the actual
    // NO_MACHINE_PATHS/extractEmbeddedLicenseText logic against a real build
    // produced from the tampered LICENSE - not a mocked or hand-simulated
    // version of either.
    const checkScript = [
      "'use strict';",
      "const assert = require('node:assert/strict');",
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const { spawnSync } = require('node:child_process');",
      `const NO_MACHINE_PATHS = ${NO_MACHINE_PATHS.toString()};`,
      `const projectRoot = ${JSON.stringify(root)};`,
      "const buildScript = path.join(projectRoot, 'scripts', 'build.js');",
      "const htmlPath = path.join(projectRoot, 'build', 'coldbox.html');",
      "const buildResult = spawnSync(process.execPath, [buildScript], { cwd: projectRoot, encoding: 'utf8' });",
      "assert.equal(buildResult.status, 0, `build failed: ${buildResult.stdout}\\n${buildResult.stderr}`);",
      "const html = fs.readFileSync(htmlPath, 'utf8');",
      "const match = html.match(/var PROVENANCE_LICENSE_TEXT = (\"(?:[^\"\\\\]|\\\\.)*\");/);",
      "assert.ok(match, 'built artifact must embed PROVENANCE_LICENSE_TEXT');",
      "const embeddedLicenseText = JSON.parse(match[1]);",
      "assert.doesNotMatch(embeddedLicenseText, NO_MACHINE_PATHS, 'embedded licence text leaked a machine-specific path');"
    ].join('\n');
    const checkScriptPath = path.join(root, 'license-leak-check.js');
    fs.writeFileSync(checkScriptPath, checkScript, 'utf8');

    const result = spawnSync(process.execPath, [checkScriptPath], { cwd: root, encoding: 'utf8' });

    assert.notEqual(
      result.status,
      0,
      'expected the licence-text machine-path check to fail closed on a machine path smuggled in via ' +
      `LICENSE, but it exited ${result.status}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
    );
    assert.match(
      result.stdout + result.stderr,
      /embedded licence text leaked a machine-specific path/,
      'expected the failure to be the licence-text machine-path assertion, not an unrelated error'
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test('two builds are byte-identical regardless of caller locale and timezone', () => {
  runBuild({ LC_ALL: 'de-DE', TZ: 'Pacific/Honolulu' });
  const firstHtml = fs.readFileSync(htmlPath);
  const firstSidecar = fs.readFileSync(hashPath);

  runBuild({ LC_ALL: 'ja-JP', TZ: 'Asia/Tokyo' });
  const secondHtml = fs.readFileSync(htmlPath);
  const secondSidecar = fs.readFileSync(hashPath);

  assert.deepEqual(secondHtml, firstHtml);
  assert.deepEqual(secondSidecar, firstSidecar);
});

// P0.16 F4 remediation fallout, caught by the real browser-harness run on a
// machine with actual network access (the harness's own copy of this check,
// scripts/run-browser-harness.js's verifyDevOnlyDependency, requires
// Playwright and could not run in every environment this branch was
// developed in). scripts/build.js derives its embedded build date from
// `git log -- src scripts vendor` against the checkout it's run from. A
// "dependency-free" build - node_modules absent, everything else present,
// which is what a real checkout with npm ci skipped looks like - still has
// its .git directory. createBuildRoot() here does not copy .git, so it does
// not model that scenario faithfully; this test copies .git explicitly to
// prove the build is genuinely independent of node_modules while still
// resolving a real commit date, without requiring Playwright to catch a
// regression in this property.
test('a build with node_modules absent but .git present matches the real build byte-for-byte', () => {
  runBuild();
  const realBuild = fs.readFileSync(htmlPath);

  const root = createBuildRoot();
  try {
    fs.cpSync(path.join(projectRoot, '.git'), path.join(root, '.git'), { recursive: true });
    assert.equal(fs.existsSync(path.join(root, 'node_modules')), false);

    const result = runBuildProcessAt(root);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const dependencyFreeBuild = fs.readFileSync(path.join(root, 'build', 'coldbox.html'));
    assert.deepEqual(dependencyFreeBuild, realBuild);
    assert.notEqual(
      provenanceBuildDate(dependencyFreeBuild.toString('utf8')),
      'unknown (no git commit metadata available)',
      'a checkout with .git present must resolve a real build date, not the no-metadata fallback'
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test('CSP hashes match every inline script and style block', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const policy = cspPolicy(html);
  const scripts = inlineBlocks(html, 'script');
  const styles = inlineBlocks(html, 'style');
  const scriptDirective = cspDirective(policy, 'script-src');
  const styleDirective = cspDirective(policy, 'style-src');

  assert.equal(scripts.length, 1);
  assert.equal(styles.length, 1);
  for (const block of scripts) {
    assert.match(scriptDirective, new RegExp(cspHash(block).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const block of styles) {
    assert.match(styleDirective, new RegExp(cspHash(block).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(policy, /__COLDBOX_/);
  assert.doesNotMatch(policy, /'unsafe-inline'/);
});

test('warm shell CSP preserves the documented network allowlist', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const policy = cspPolicy(html);
  const connectSources = cspDirective(policy, 'connect-src');
  const expectedHosts = [
    'https://api.coingecko.com',
    'https://api.coinbase.com',
    'https://api.kraken.com',
    'https://api.coinpaprika.com',
    'https://api.diadata.org',
    'https://api.frankfurter.app',
    'https://mempool.space',
    'https://blockstream.info',
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com',
    'https://api.mainnet-beta.solana.com',
    'https://lcd.osmosis.zone',
    'http://localhost:*',
    'https://localhost:*',
    'http://127.0.0.1:*'
  ];

  assert.deepEqual(connectSources.split(/\s+/), expectedHosts);
  assert.match(policy, /frame-src 'self' blob:/);
  assert.match(policy, /worker-src blob:/);
  assert.match(policy, /form-action 'none'/);
  assert.match(policy, /base-uri 'none'/);
  assert.match(policy, /object-src 'none'/);
});

test('cold realm policy is embedded and remains opaque', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');

  assertExactColdSandbox(html);
  assert.equal(coldSandboxToken(html).includes('allow-same-origin'), false);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /frame-src 'none'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /worker-src blob:/);
  assert.doesNotMatch(html, /__COLDBOX_/);
});

test('cold iframe sandbox rejects an extra permission token in a negative fixture', () => {
  const root = createBuildRoot();
  try {
    const mainPath = path.join(root, 'src', 'main.js');
    const main = fs.readFileSync(mainPath, 'utf8')
      .replace(
        "coldFrame.setAttribute('sandbox', 'allow-scripts allow-downloads allow-modals')",
        "coldFrame.setAttribute('sandbox', 'allow-scripts allow-downloads allow-modals allow-top-navigation')"
      );
    fs.writeFileSync(mainPath, main, 'utf8');

    const html = runBuildAt(root);
    assert.throws(() => assertExactColdSandbox(html));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('randomness fallback mutation fails the capability lint and build', () => {
  const root = createBuildRoot();
  try {
    const capabilityPath = path.join(root, 'src', 'capabilities.js');
    const original = fs.readFileSync(capabilityPath, 'utf8');
    const mutated = original.replace(
      'cryptoObject.getRandomValues(sample);',
      'sample[0] = Math.floor(Math.random() * 256);'
    );
    assert.notEqual(mutated, original, 'Randomness mutation fixture did not replace getRandomValues');
    fs.writeFileSync(capabilityPath, mutated, 'utf8');

    const lint = spawnSync(process.execPath, [path.join(root, 'scripts', 'lint.js'), '--root', root], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.notEqual(lint.status, 0, 'Capability lint accepted an executable Math.random fallback');
    assert.match(`${lint.stdout}\n${lint.stderr}`, /Forbidden construct "Math\.random"/);

    const build = runBuildProcessAt(root);
    assert.notEqual(build.status, 0, 'Build accepted an executable Math.random fallback');
    assert.match(`${build.stdout}\n${build.stderr}`, /Math\.random/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('randomness fallback mutation in cold backup security modules fails the lint and build', () => {
  for (const coldModule of ['shamir.js', 'slip39.js']) {
    const root = createBuildRoot();
    try {
      const coldModulePath = path.join(root, 'src', 'cold', coldModule);
      fs.appendFileSync(coldModulePath, '\nvoid Math.random();\n', 'utf8');

      const lint = spawnSync(process.execPath, [path.join(root, 'scripts', 'lint.js'), '--root', root], {
        cwd: root,
        encoding: 'utf8'
      });
      assert.notEqual(lint.status, 0, `Cold security-module lint accepted executable Math.random in ${coldModule}`);
      assert.match(`${lint.stdout}\n${lint.stderr}`, /Forbidden construct "Math\.random"/);

      const build = runBuildProcessAt(root);
      assert.notEqual(build.status, 0, `Build accepted executable Math.random in ${coldModule}`);
      assert.match(`${build.stdout}\n${build.stderr}`, /Math\.random/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('airgap canary and lockdown markers are embedded in both realms', () => {
  runBuild();
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok((html.match(/coldbox\.invalid\/csp-canary/g) || []).length >= 2);
  assert.ok((html.match(/localhost:9\/cold-csp-canary/g) || []).length >= 2);
  assert.match(html, /data-csp-canary/);
  assert.match(html, /data-runtime-neutering/);
  assert.match(html, /data-vault-operations/);
  assert.match(html, /data-capability-state/);
  assert.match(html, /crypto\.getRandomValues/);
  assert.match(html, /worker-src blob:/);
  assert.match(html, /navigatorObject\.onLine/);
  assert.match(html, /navigatorObject\.connection/);
});

test('CSP hash injection covers multiple inline blocks and detects script tampering', () => {
  const root = createBuildRoot();
  try {
    const templatePath = path.join(root, 'src', 'index.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    template = template.replace('</head>', '  <style>\n    body { border: 0; }\n  </style>\n</head>');
    template = template.replace('</body>', '  <script>\n    document.body.dataset.fixture = \'csp\';\n  </script>\n</body>');
    fs.writeFileSync(templatePath, template, 'utf8');

    const html = runBuildAt(root);
    const policy = cspPolicy(html);
    const scripts = inlineBlocks(html, 'script');
    const styles = inlineBlocks(html, 'style');
    const scriptDirective = cspDirective(policy, 'script-src');
    const styleDirective = cspDirective(policy, 'style-src');
    assert.equal(scripts.length, 2);
    assert.equal(styles.length, 2);
    for (const block of scripts) {
      assert.match(scriptDirective, new RegExp(cspHash(block).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    for (const block of styles) {
      assert.match(styleDirective, new RegExp(cspHash(block).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    const alteredScriptBytes = Buffer.from(scripts[0], 'utf8');
    const tamperOffset = alteredScriptBytes.indexOf(Buffer.from('warm-shell', 'utf8'));
    assert.notEqual(tamperOffset, -1);
    alteredScriptBytes[tamperOffset] ^= 1;
    const alteredScript = alteredScriptBytes.toString('utf8');
    assert.notEqual(cspHash(alteredScript), cspHash(scripts[0]));
    assert.doesNotMatch(scriptDirective, new RegExp(cspHash(alteredScript).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a stray final-document placeholder fails the build before creating output', () => {
  const root = createBuildRoot();
  try {
    const templatePath = path.join(root, 'src', 'index.html');
    const template = fs.readFileSync(templatePath, 'utf8')
      .replace('<title>Coldbox</title>', '<title>__COLDBOX_TYPO__</title>');
    fs.writeFileSync(templatePath, template, 'utf8');

    const result = runBuildProcessAt(root);
    const output = `${result.stdout}\n${result.stderr}`;
    assert.notEqual(result.status, 0, output);
    assert.match(output, /Unresolved source placeholder in final document/);
    assert.equal(fs.existsSync(path.join(root, 'build')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
