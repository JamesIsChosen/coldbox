'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  assertNoApprovedReferenceBuildInputs,
  collectProductBuildInputFiles,
  collectTransitiveModules,
  findApprovedReferenceBuildInputs
} = require('../scripts/build-input-graph.js');

const projectRoot = path.resolve(__dirname, '..');
const referenceRoot = path.join(
  projectRoot,
  'docs',
  '05-development',
  'ui-reference',
  'approved'
);
const manifestPath = path.join(referenceRoot, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const EXPECTED_REFERENCES = Object.freeze({
  desktop: Object.freeze({
    file: 'coldbox-desktop-mockup.html.reference',
    bytes: 526996,
    sha256: 'fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9',
    renderViewport: Object.freeze({ width: 1440, height: 940 }),
    comparisonRegion: Object.freeze({ kind: 'full-viewport', width: 1440, height: 940 })
  }),
  mobile: Object.freeze({
    file: 'coldbox-mobile-mockup.html.reference',
    bytes: 322927,
    sha256: 'af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8',
    renderViewport: Object.freeze({ width: 880, height: 1000 }),
    comparisonRegion: Object.freeze({ kind: 'product-frame', width: 390, height: 844 })
  })
});

const EXPECTED_GROUPS = Object.freeze([
  Object.freeze({ realm: 'cold', label: 'Forge' }),
  Object.freeze({ realm: 'cold', label: 'Derive' }),
  Object.freeze({ realm: 'cold', label: 'Split' }),
  Object.freeze({ realm: 'cold', label: 'Carry' }),
  Object.freeze({ realm: 'cold', label: 'Recover' }),
  Object.freeze({ realm: 'cold', label: 'Verify' }),
  Object.freeze({ realm: 'warm', label: 'Records' }),
  Object.freeze({ realm: 'warm', label: 'Money' }),
  Object.freeze({ realm: 'warm', label: 'Vault files' }),
  Object.freeze({ realm: 'warm', label: 'Reference' })
]);

const EXPECTED_MOBILE_TABS = Object.freeze({
  cold: Object.freeze(['Forge', 'Derive', 'Split', 'Secret', 'Hub']),
  warm: Object.freeze(['Home', 'Money', 'Records', 'Vault', 'Set'])
});

const EXPECTED_DEVIATIONS = Object.freeze([
  'PAR-001',
  'PAR-002',
  'PAR-003',
  'PAR-004',
  'PAR-005',
  'PAR-006',
  'PAR-007',
  'PAR-008',
  'PAR-009'
]);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assertReferenceEvidence(id, declared, expected, bytes) {
  assert.equal(declared.file, expected.file, `${id} reference filename drifted`);
  assert.equal(declared.bytes, expected.bytes, `${id} byte length drifted in manifest`);
  assert.equal(declared.sha256, expected.sha256, `${id} hash drifted in manifest`);
  assert.deepEqual(declared.renderViewport, expected.renderViewport, `${id} render viewport drifted`);
  assert.deepEqual(declared.comparisonRegion, expected.comparisonRegion, `${id} comparison region drifted`);
  assert.equal(bytes.length, expected.bytes, `${id} approved reference changed length`);
  assert.equal(sha256(bytes), expected.sha256, `${id} approved reference changed bytes`);
}

function assertUniqueStrings(values, label) {
  assert.ok(Array.isArray(values), `${label} must be an array`);
  assert.ok(values.length > 0, `${label} must not be empty`);
  for (const value of values) {
    assert.equal(typeof value, 'string', `${label} must contain only strings`);
    assert.match(value, /^[a-z][a-z0-9]*$/, `${label} contains an unsafe screen id`);
  }
  assert.equal(new Set(values).size, values.length, `${label} contains a duplicate`);
}

function readInertTemplate(referenceFile) {
  const wrapper = fs.readFileSync(path.join(referenceRoot, referenceFile), 'utf8');
  const match = /<script type="__bundler\/template">([\s\S]*?)<\/script>/.exec(wrapper);
  assert.ok(match, `${referenceFile} has no inert bundler template payload`);
  return JSON.parse(match[1]);
}

function objectKeysFromTemplate(template, constantName) {
  const lines = template.split('\n');
  const start = lines.indexOf(`const ${constantName} = {`);
  assert.notEqual(start, -1, `${constantName} is absent from approved template`);

  const keys = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index] === '};') {
      return keys;
    }
    const match = /^  ([a-z][a-z0-9]*): \{/.exec(lines[index]);
    if (match) {
      keys.push(match[1]);
    }
  }
  assert.fail(`${constantName} has no closing delimiter in approved template`);
}

function constantBlock(template, constantName) {
  const startMarker = `const ${constantName} = {`;
  const start = template.indexOf(startMarker);
  assert.notEqual(start, -1, `${constantName} is absent from approved template`);
  const end = template.indexOf('\n};', start);
  assert.notEqual(end, -1, `${constantName} has no closing delimiter`);
  return template.slice(start, end + 3);
}

test('approved desktop and mobile references are immutable byte-exact evidence', () => {
  assert.equal(manifest.schema, 'coldbox.approved-ui-reference.v1');
  assert.deepEqual(manifest.approval, {
    authority: 'maintainer',
    date: '2026-08-15',
    contract: '../../../01-spec/ui-parity.md'
  });
  assert.equal(
    path.resolve(referenceRoot, manifest.approval.contract),
    path.join(projectRoot, 'docs', '01-spec', 'ui-parity.md'),
    'Manifest contract path no longer resolves to the canonical parity document'
  );
  assert.deepEqual(Object.keys(manifest.references).sort(), ['desktop', 'mobile']);

  for (const [id, expected] of Object.entries(EXPECTED_REFERENCES)) {
    const declared = manifest.references[id];
    const bytes = fs.readFileSync(path.join(referenceRoot, declared.file));
    assertReferenceEvidence(id, declared, expected, bytes);
  }

  const actualReferenceFiles = fs.readdirSync(referenceRoot, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith('.html.reference'))
    .map((entry) => {
      assert.ok(entry.isFile(), `${entry.name} must be a regular immutable file`);
      return entry.name;
    })
    .sort();
  assert.deepEqual(
    actualReferenceFiles,
    Object.values(EXPECTED_REFERENCES).map((entry) => entry.file).sort(),
    'Approved reference directory contains an undeclared or missing snapshot'
  );

  const attributes = fs.readFileSync(path.join(projectRoot, '.gitattributes'), 'utf8');
  assert.match(attributes, /^\*\.html\.reference binary$/m,
    'Approved reference bytes are no longer protected from line-ending conversion');
});

test('reference integrity guard rejects byte and manifest mutation fixtures', () => {
  const expected = EXPECTED_REFERENCES.desktop;
  const declared = manifest.references.desktop;
  const bytes = fs.readFileSync(path.join(referenceRoot, declared.file));
  const mutatedBytes = Buffer.from(bytes);
  mutatedBytes[Math.floor(mutatedBytes.length / 2)] ^= 0x01;

  assert.throws(
    () => assertReferenceEvidence('desktop', declared, expected, mutatedBytes),
    /desktop approved reference changed bytes/
  );
  assert.throws(
    () => assertReferenceEvidence('desktop', { ...declared, bytes: declared.bytes + 1 }, expected, bytes),
    /desktop byte length drifted in manifest/
  );
});

test('manifest screen inventories and navigation match the inert approved payloads', () => {
  const desktop = readInertTemplate(EXPECTED_REFERENCES.desktop.file);
  const mobile = readInertTemplate(EXPECTED_REFERENCES.mobile.file);

  for (const id of ['desktop', 'mobile']) {
    assertUniqueStrings(manifest.references[id].screens, `${id} screens`);
  }
  assert.deepEqual(objectKeysFromTemplate(desktop, 'SCREENS'), manifest.references.desktop.screens);
  assert.deepEqual(objectKeysFromTemplate(mobile, 'SCREENS'), manifest.references.mobile.screens);

  assert.deepEqual(manifest.navigation.groups, EXPECTED_GROUPS);
  const desktopItems = desktop.slice(
    desktop.indexOf('const ITEMS = ['),
    desktop.indexOf('\n];', desktop.indexOf('const ITEMS = [')) + 3
  );
  for (const group of EXPECTED_GROUPS) {
    assert.match(
      desktopItems,
      new RegExp(`\\['${group.realm}', '${group.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}', \\[`),
      `Desktop approved navigation lost ${group.realm}/${group.label}`
    );
  }

  assert.deepEqual(manifest.navigation.mobileBottomBar, EXPECTED_MOBILE_TABS);
  const mobileTabs = constantBlock(mobile, 'TABS');
  for (const [realm, labels] of Object.entries(EXPECTED_MOBILE_TABS)) {
    assert.match(mobileTabs, new RegExp(`  ${realm}: \\[`), `Mobile ${realm} tab row is absent`);
    for (const label of labels) {
      assert.match(mobileTabs, new RegExp(`'${label}'`), `Mobile ${realm} tabs lost ${label}`);
    }
  }
});

test('the deviation register is finite, synchronized and cannot hide pixels', () => {
  assert.deepEqual(manifest.allowedDeviationIds, EXPECTED_DEVIATIONS);
  assert.deepEqual(manifest.allowedPixelMasks, [], 'Pixel masks are forbidden by the parity contract');

  const contract = fs.readFileSync(
    path.join(projectRoot, 'docs', '01-spec', 'ui-parity.md'),
    'utf8'
  );
  const registered = Array.from(contract.matchAll(/^\| \*\*(PAR-\d{3})\*\* \|/gm), (match) => match[1]);
  assert.deepEqual(registered, EXPECTED_DEVIATIONS);
  assert.match(contract, /zero unexpected changed pixels/);
  assert.match(contract, /Pixel masks are[\s\S]{0,80}forbidden/);
  assert.match(contract, /Anything not listed in this table is not an allowed difference/);
});

test('approved prototype payloads stay outside every product build input', () => {
  const graph = collectProductBuildInputFiles(projectRoot);
  assert.ok(
    graph.some((file) => path.relative(projectRoot, file).replace(/\\/g, '/') === 'scripts/brand-assets.js'),
    'The transitive product build-input graph must include the imported brand-assets helper'
  );
  assert.deepEqual(
    findApprovedReferenceBuildInputs(projectRoot),
    [],
    'Approved prototype evidence entered the transitive product build-input graph'
  );
  assert.doesNotThrow(
    () => assertNoApprovedReferenceBuildInputs(projectRoot),
    'The centralized build-input isolation guard rejected the clean product graph'
  );

  const build = spawnSync(process.execPath, [path.join('scripts', 'build.js')], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(build.status, 0, `Build failed while proving reference isolation:\n${build.stderr}`);
  const product = fs.readFileSync(path.join(projectRoot, 'build', 'coldbox.html'), 'utf8');
  assert.doesNotMatch(product, /__bundler_(?:thumbnail|template|loading)/,
    'Approved bundler payload leaked into build/coldbox.html');
  assert.doesNotMatch(product, /Coldbox mobile — 390 × 844, fully clickable/,
    'Approved mobile presentation board leaked into build/coldbox.html');
});

test('an imported helper consuming an approved reference fails the guard non-zero', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-ui4a-build-graph-'));
  try {
    const fixtureScripts = path.join(fixtureRoot, 'scripts');
    const fixtureReference = path.join(
      fixtureRoot,
      'docs',
      '05-development',
      'ui-reference',
      'approved',
      'coldbox-desktop-mockup.html.reference'
    );
    fs.mkdirSync(fixtureScripts, { recursive: true });
    fs.mkdirSync(path.dirname(fixtureReference), { recursive: true });
    fs.copyFileSync(
      path.join(referenceRoot, EXPECTED_REFERENCES.desktop.file),
      fixtureReference
    );
    fs.writeFileSync(
      path.join(fixtureScripts, 'build.js'),
      "require('./brand-assets.js');\n",
      'utf8'
    );
    fs.writeFileSync(
      path.join(fixtureScripts, 'brand-assets.js'),
      "const fs = require('node:fs');\nconst path = require('node:path');\nmodule.exports = fs.readFileSync(path.join(__dirname, '..', 'docs', '05-development', 'ui-reference', 'approved', 'coldbox-desktop-mockup.html.reference'));\n",
      'utf8'
    );

    const graphModule = path.join(projectRoot, 'scripts', 'build-input-graph.js');
    const probe = spawnSync(
      process.execPath,
      [
        '-e',
        `const { assertNoApprovedReferenceBuildInputs } = require(${JSON.stringify(graphModule)}); assertNoApprovedReferenceBuildInputs(${JSON.stringify(fixtureRoot)}, { dataInputs: [] });`
      ],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );

    assert.notEqual(probe.status, 0, 'A transitive approved-reference violation must exit non-zero');
    assert.match(
      `${probe.stdout}\n${probe.stderr}`,
      /brand-assets\.js/,
      'The non-zero fixture failure must identify the imported consuming helper'
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('the transitive graph rejects a symlinked local helper', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-ui4a-symlink-'));
  const fixtureEntry = path.join(fixtureRoot, 'scripts', 'build.js');
  const fixtureHelper = path.join(fixtureRoot, 'scripts', 'helper.js');
  fs.mkdirSync(path.dirname(fixtureEntry), { recursive: true });
  fs.writeFileSync(fixtureEntry, "require('./helper.js');\n", 'utf8');
  fs.writeFileSync(fixtureHelper, 'module.exports = true;\n', 'utf8');

  const originalLstatSync = fs.lstatSync;
  fs.lstatSync = function patchedLstatSync(target, ...args) {
    if (path.resolve(target) === fixtureHelper) {
      return { isSymbolicLink: () => true };
    }
    return originalLstatSync.call(fs, target, ...args);
  };

  try {
    assert.throws(
      () => collectTransitiveModules(fixtureRoot, 'scripts/build.js'),
      /contains a symlink: scripts[\\/]helper\.js/
    );
  } finally {
    fs.lstatSync = originalLstatSync;
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('roadmap dependencies cannot bypass the parity contract or final gate', () => {
  const roadmap = fs.readFileSync(
    path.join(projectRoot, 'docs', '05-development', 'ROADMAP.md'),
    'utf8'
  );

  assert.match(roadmap, /- \[~\] \*\*UI\.4a Approved desktop\/mobile mock parity contract\*\*[\s\S]*?\*Deps: UI\.4\*/);
  assert.match(roadmap, /- \[ \] \*\*UI\.5 Shared shell chrome[\s\S]*?\*Deps: UI\.4a\*/);
  assert.match(roadmap, /- \[ \] \*\*UI\.10 Vault naming[\s\S]*?\*Deps: UI\.4a\*/);
  assert.match(roadmap, /- \[ \] \*\*UI\.11 Approved desktop\/mobile visual parity certification\*\*[\s\S]*?\*Deps: UI\.8, UI\.9, UI\.10\*/);
  assert.match(roadmap, /- \[ \] P2\.8 Printable cards[\s\S]*?\*Deps: P2\.7, UI\.11\*/);
});
