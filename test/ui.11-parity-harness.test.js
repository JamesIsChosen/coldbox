'use strict';

// UI.11 - the comparison harness's own guards.
//
// None of these tests launches a browser. They cover the half of the harness
// that decides *what* is compared and *what may differ*, which is the half a
// green browser run cannot vouch for: a driver can capture 92 screenshots
// perfectly and still be comparing the wrong states, tolerating differences
// nobody registered, or quietly skipping the rows it cannot reach.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  NORMALIZERS,
  PRODUCT_NAV,
  RESULTS_SCHEMA,
  assertNoMasks,
  assertNormalizerCoverage,
  assertProductNavCoverage,
  buildReferenceIndex,
  compareImages,
  cropPng,
  decodePng,
  encodePng,
  parseArguments,
  pendingDeviations,
  rowNormalizers
} = require('../scripts/ui11-parity.js');

const {
  createStateMatrix,
  currentSet,
  readManifest
} = require('../scripts/ui-reference-manifest.js');

const projectRoot = path.resolve(__dirname, '..');
const manifest = readManifest();
const set = currentSet(manifest);
const rows = createStateMatrix(manifest);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('the harness decides nothing the approved-reference module already decides', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'ui11-parity.js'), 'utf8');

  // Before UI.10a this file carried its own SCREEN_OWNERS, its own roadmap
  // parser and its own state matrix. Two copies of a decision eventually
  // disagree, and the copy that decides which screens UI.11 certifies is the
  // worst one to have twice.
  for (const forbidden of ['SCREEN_OWNERS', 'parseRoadmapStatuses', 'classifyScreen']) {
    assert.equal(
      source.includes(`function ${forbidden}`) || source.includes(`const ${forbidden} =`),
      false,
      `ui11-parity.js redefines ${forbidden} instead of reading it from ui-reference-manifest.js`
    );
  }
  assert.match(source, /require\('\.\/ui-reference-manifest\.js'\)/);
  assert.equal(RESULTS_SCHEMA, 'coldbox.ui11.parity-results.v2');
});

test('pixel masks and percentage thresholds are refused', () => {
  assert.doesNotThrow(() => assertNoMasks(manifest));
  const masked = clone(manifest);
  masked.allowedPixelMasks = [{ x: 0, y: 0, width: 1, height: 1 }];
  assert.throws(() => assertNoMasks(masked), /refuses to run with a pixel mask/);

  // The comparison has no tolerance parameter to pass. A single differing
  // channel in a single pixel is a difference.
  const reference = { width: 2, height: 1, pixels: Buffer.from([255, 255, 255, 255, 0, 0, 0, 255]) };
  const nudged = Buffer.from(reference.pixels);
  nudged[1] = 254;
  assert.equal(compareImages(reference, { ...reference, pixels: nudged }).changedPixels, 1);
});

test('every deviation the state matrix emits has exactly one normalizer', () => {
  assert.doesNotThrow(() => assertNormalizerCoverage(manifest, rows));

  const declared = NORMALIZERS.map((normalizer) => normalizer.deviation);
  assert.equal(new Set(declared).size, declared.length, 'A deviation has two normalizers');
  for (const normalizer of NORMALIZERS) {
    assert.match(normalizer.deviation, /^PAR-\d{3}$/);
    assert.ok(manifest.allowedDeviationIds.includes(normalizer.deviation));
    assert.equal(typeof normalizer.appliesTo, 'function');
    assert.ok(normalizer.summary.length > 0);
    assert.equal(
      normalizer.implemented === true || typeof normalizer.pendingReason === 'string',
      true,
      `${normalizer.deviation} is unimplemented without saying why`
    );
  }

  // A state that applies a deviation nobody wrote a normalizer for is a
  // difference tolerated by omission - a mask by another name.
  const invented = rows.map((row, index) => (
    index === 0 ? { ...row, deviations: [...row.deviations, 'PAR-006'] } : row
  ));
  assert.throws(
    () => assertNormalizerCoverage(manifest, invented),
    /emits deviations with no normalizer: PAR-006/
  );
});

test('a row whose deviations are not all neutralised cannot be certified', () => {
  // Today every row depends on at least one unimplemented normalizer, so the
  // harness must not be able to report a pass for any of them. This test is
  // written to stay meaningful as normalizers land: it asserts the
  // relationship, not the current count.
  for (const row of rows) {
    const applied = rowNormalizers(row).map((normalizer) => normalizer.deviation);
    const pending = pendingDeviations(row);
    for (const id of pending) {
      assert.ok(applied.includes(id), `${row.id} reports ${id} pending without applying it`);
      const normalizer = NORMALIZERS.find((entry) => entry.deviation === id);
      assert.equal(normalizer.implemented, false);
    }
  }
  const certifiable = rows.filter((row) => pendingDeviations(row).length === 0);
  assert.deepEqual(
    certifiable.map((row) => row.id),
    [],
    'A row became certifiable without its normalizers being implemented; update this test deliberately when that changes'
  );
});

test('PAR-008 is implemented, geometric, and the only normalizer that is', () => {
  const frame = NORMALIZERS.find((normalizer) => normalizer.deviation === 'PAR-008');
  assert.equal(frame.implemented, true);
  assert.equal(typeof frame.measureReferenceCrop, 'function');
  assert.equal(frame.appliesTo({ viewport: 'mobile' }), true);
  assert.equal(frame.appliesTo({ viewport: 'desktop' }), false);
  assert.deepEqual(
    NORMALIZERS.filter((normalizer) => normalizer.implemented).map((normalizer) => normalizer.deviation),
    ['PAR-008'],
    'Implemented normalizers changed; the packet and the PENDING accounting must change with them'
  );
});

test('the product navigation table covers every manifest screen exactly once', () => {
  assert.doesNotThrow(() => assertProductNavCoverage(set));
  assert.equal(Object.keys(PRODUCT_NAV).length, set.references.desktop.screens.length);
  for (const [screen, entry] of Object.entries(PRODUCT_NAV)) {
    assert.equal(
      Boolean(entry.nav) !== Boolean(entry.pending),
      true,
      `${screen} must declare a handle or a pending reason, never both and never neither`
    );
    if (entry.nav) {
      // Handles are UI.10b's stable contract. A route driven by visible text
      // would silently follow a copy change.
      assert.match(entry.nav, /^[a-z][a-z0-9-]*$/);
    }
  }

  // Every shipped handle must actually exist in the built shell's source.
  const warmShell = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
  for (const [screen, entry] of Object.entries(PRODUCT_NAV)) {
    if (!entry.nav) {
      continue;
    }
    assert.ok(
      warmShell.includes(`data-nav="${entry.nav}"`),
      `PRODUCT_NAV maps ${screen} to data-nav="${entry.nav}", which src/index.html does not carry`
    );
  }
});

test('a screen the manifest adds and the tables do not fails closed', () => {
  const widened = clone(set);
  widened.references.desktop.screens.push('somethingNew');
  assert.throws(() => assertProductNavCoverage(widened), /PRODUCT_NAV has no entry for: somethingNew/);

  const narrowed = clone(set);
  narrowed.references.desktop.screens = narrowed.references.desktop.screens.filter((screen) => screen !== 'home');
  assert.throws(() => assertProductNavCoverage(narrowed), /entries no manifest screen uses: home/);
});

test('every manifest screen has a reference route on both viewports', () => {
  for (const viewportId of ['desktop', 'mobile']) {
    const { routes, moreTabLabel } = buildReferenceIndex(set, viewportId);
    assert.equal(routes.size, set.references[viewportId].screens.length);
    for (const screen of set.references[viewportId].screens) {
      const route = routes.get(screen);
      assert.ok(route, `${viewportId}/${screen} has no reference route`);
      assert.ok(
        ['rail', 'tab', 'more', 'flow-index', 'entry-point', 'unresolved'].includes(route.via),
        `${viewportId}/${screen} has an unknown route kind ${route.via}`
      );
      if (route.via === 'unresolved') {
        assert.ok(route.reason.length > 0, `${viewportId}/${screen} is unresolved without a reason`);
      }
    }
    assert.equal(moreTabLabel, 'More');
  }
});

test('the reference route index re-verifies the manifest navigation against the artifact', () => {
  // This is the check that makes the harness independent evidence rather than
  // a consumer of the manifest's word: it re-derives the approved navigation
  // from the reference bytes on every run and refuses to proceed if the two
  // disagree.
  const groupsChanged = clone(set);
  groupsChanged.navigation.groups[0].label = 'Renamed group';
  assert.throws(
    () => buildReferenceIndex(groupsChanged, 'desktop'),
    /artifact rail groups disagree with the manifest navigation/
  );

  const barChanged = clone(set);
  barChanged.navigation.mobileBottomBar[1] = 'Renamed tab';
  assert.throws(
    () => buildReferenceIndex(barChanged, 'mobile'),
    /artifact bottom bar disagrees with the manifest navigation/
  );

  const warmMoreChanged = clone(set);
  warmMoreChanged.navigation.mobileMore.warm[0] = 'Renamed destination';
  assert.throws(
    () => buildReferenceIndex(warmMoreChanged, 'mobile'),
    /artifact warm More sheet disagrees with the manifest navigation/
  );

  const coldMoreChanged = clone(set);
  coldMoreChanged.navigation.mobileMore.cold[0] = 'Renamed destination';
  assert.throws(
    () => buildReferenceIndex(coldMoreChanged, 'mobile'),
    /artifact sealed More sheet disagrees with the manifest navigation/
  );

  const flowTitleChanged = clone(set);
  flowTitleChanged.flows[0].title = 'Renamed flow';
  assert.throws(
    () => buildReferenceIndex(flowTitleChanged, 'desktop'),
    /title drifted from the artifact/
  );
});

test('the PNG pipeline round-trips and crops only inside the capture', () => {
  const image = {
    width: 3,
    height: 2,
    pixels: Buffer.from([
      1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255,
      10, 11, 12, 255, 13, 14, 15, 255, 16, 17, 18, 255
    ])
  };
  const roundTrip = decodePng(encodePng(image));
  assert.equal(roundTrip.width, image.width);
  assert.equal(roundTrip.height, image.height);
  assert.deepEqual(roundTrip.pixels, image.pixels);

  const cropped = cropPng(image, { x: 1, y: 1, width: 2, height: 1 }, 'fixture');
  assert.equal(cropped.width, 2);
  assert.equal(cropped.height, 1);
  assert.deepEqual(cropped.pixels, Buffer.from([13, 14, 15, 255, 16, 17, 18, 255]));

  assert.throws(() => cropPng(image, { x: 2, y: 0, width: 2, height: 1 }, 'fixture'), /exceeds capture width/);
  assert.throws(() => cropPng(image, { x: 0, y: 1, width: 1, height: 2 }, 'fixture'), /exceeds capture height/);
  assert.throws(() => cropPng(image, { x: 0.5, y: 0, width: 1, height: 1 }, 'fixture'), /crop x is not a non-negative integer/);
});

test('captures of unequal size are a failure, not a resize', () => {
  const wide = { width: 2, height: 1, pixels: Buffer.alloc(8) };
  const narrow = { width: 1, height: 1, pixels: Buffer.alloc(4) };
  assert.throws(() => compareImages(wide, narrow), /capture widths differ/);
  assert.throws(
    () => compareImages({ width: 1, height: 2, pixels: Buffer.alloc(8) }, narrow),
    /capture heights differ/
  );
});

test('the command line refuses anything it does not understand', () => {
  assert.deepEqual(parseArguments(['node', 'ui11-parity.js']).engines, ['chromium', 'firefox']);
  assert.deepEqual(parseArguments(['node', 'x', '--engine', 'firefox']).engines, ['firefox']);
  assert.equal(parseArguments(['node', 'x', '--reference-only']).referenceOnly, true);
  assert.deepEqual(parseArguments(['node', 'x', '--rows', 'desktop/home, mobile/home']).rows, ['desktop/home', 'mobile/home']);
  assert.throws(() => parseArguments(['node', 'x', '--engine', 'safari']), /--engine must be one of/);
  assert.throws(() => parseArguments(['node', 'x', '--nope']), /Unknown argument: --nope/);
  assert.throws(() => parseArguments(['node', 'x', '--out']), /--out requires a directory/);
});

test('the committed harness requires both engines and carries no local escape hatch', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'scripts', 'ui11-parity.js'), 'utf8');
  assert.match(source, /const ENGINES = Object\.freeze\(\{ chromium, firefox \}\)/);
  // The campaign's Chromium-only workaround is an environment fix and must
  // never reach a commit; a harness that reads an executable path from the
  // environment can be pointed anywhere.
  assert.equal(source.includes('executablePath'), false, 'ui11-parity.js pins a browser executable path');
  assert.equal(source.includes('CBX_CHROMIUM'), false, 'ui11-parity.js carries the local Chromium escape hatch');
  assert.equal(source.includes('--no-sandbox'), false, 'ui11-parity.js disables the browser sandbox');
});
