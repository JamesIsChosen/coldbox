'use strict';

// UI.10a - the maintainer-approved self-custody-workstation references are
// imported, the toolkit references stay as audit evidence, and the manifest
// answers "which set is current" exactly once.
//
// test/ui.4a-approved-mock-parity.test.js remains the frozen regression for the
// superseded toolkit set. This file covers the replacement set and the
// selection machinery that now sits between them.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const zlib = require('node:zlib');

const {
  SCREEN_OWNERS,
  classifyScreen,
  createStateMatrix,
  currentSet,
  parseRoadmapStatuses,
  readManifest,
  referenceRoot,
  supersededSets,
  validateManifest,
  verifyReferenceBytes
} = require('../scripts/ui-reference-manifest.js');
const { findApprovedReferenceBuildInputs } = require('../scripts/build-input-graph.js');

const projectRoot = path.resolve(__dirname, '..');
const manifest = readManifest();

const CURRENT_SET_ID = 'workstation-2026-08-19';

// The maintainer's approved artifacts, recorded here so the manifest cannot
// quietly re-point at different bytes. These values come from the approved
// handoff's own DELIVERABLES table and were re-derived from the imported files.
const EXPECTED_CURRENT = Object.freeze({
  desktop: Object.freeze({
    file: 'coldbox-workstation-desktop-mockup.html.reference',
    bytes: 397090,
    sha256: 'e657a14d86428f5558bf5655b12d05d3e9b732ac403c5344f73e60dd1d85066c',
    renderViewport: Object.freeze({ width: 1440, height: 940 }),
    comparisonRegion: Object.freeze({ kind: 'full-viewport', width: 1440, height: 940 })
  }),
  mobile: Object.freeze({
    file: 'coldbox-workstation-mobile-mockup.html.reference',
    bytes: 353595,
    sha256: 'f4deca09c69151985e9e960282999bed0bb8c4828b2718cc573a02d2d811e2aa',
    renderViewport: Object.freeze({ width: 880, height: 1000 }),
    comparisonRegion: Object.freeze({ kind: 'product-frame', width: 390, height: 844 })
  })
});

// The approved rail taxonomy, warm groups then cold groups.
const EXPECTED_GROUPS = Object.freeze([
  Object.freeze({ realm: 'warm', label: 'Workspace' }),
  Object.freeze({ realm: 'warm', label: 'Records' }),
  Object.freeze({ realm: 'warm', label: 'Trust & reference' }),
  Object.freeze({ realm: 'warm', label: 'Vault & settings' }),
  Object.freeze({ realm: 'warm', label: 'Sealed work' }),
  Object.freeze({ realm: 'cold', label: 'Seeds & lineage' }),
  Object.freeze({ realm: 'cold', label: 'Forge' }),
  Object.freeze({ realm: 'cold', label: 'Derive' }),
  Object.freeze({ realm: 'cold', label: 'Split & carry' }),
  Object.freeze({ realm: 'cold', label: 'Recover & verify' }),
  Object.freeze({ realm: 'cold', label: 'Session' })
]);

// Objects, not tools - and one realm-independent bar, because the realm now
// changes the More sheet rather than the bar.
const EXPECTED_MOBILE_TABS = Object.freeze(['Home', 'Wallets', 'Seeds', 'Backup', 'More']);

const EXPECTED_SHELL_SCREENS = Object.freeze([
  'home', 'wallets', 'walletDetail', 'seeds', 'seedDetail', 'seedqr', 'backup',
  'portfolio', 'security', 'reference', 'advanced', 'vault', 'create', 'lock'
]);

// The six flows whose owning roadmap item is unbuilt. Each must be reachable in
// navigation and shown as unavailable, never as a working surface (PAR-009).
const EXPECTED_ROADMAP_OWNED_FLOWS = Object.freeze([
  'send', 'signing', 'broadcast', 'psbt', 'coincontrol', 'source'
]);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function onDiskFiles() {
  return fs.readdirSync(referenceRoot)
    .filter((name) => name.endsWith('.html.reference'));
}

// Reads the reference's inert bundler payload. Nothing here executes the
// artifact: the template is parsed as a JSON string and the shared flow model is
// gunzipped out of the bundler manifest and read as text.
function readInertTemplate(referenceFile) {
  const wrapper = fs.readFileSync(path.join(referenceRoot, referenceFile), 'utf8');
  const match = /<script type="__bundler\/template">([\s\S]*?)<\/script>/.exec(wrapper);
  assert.ok(match, `${referenceFile} has no inert bundler template payload`);
  return JSON.parse(match[1]);
}

function readInertFlowSource(referenceFile) {
  const wrapper = fs.readFileSync(path.join(referenceRoot, referenceFile), 'utf8');
  const match = /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/.exec(wrapper);
  assert.ok(match, `${referenceFile} has no inert bundler resource manifest`);
  for (const resource of Object.values(JSON.parse(match[1]))) {
    if (resource.mime !== 'application/javascript') {
      continue;
    }
    const raw = Buffer.from(resource.data, 'base64');
    const source = (resource.compressed ? zlib.gunzipSync(raw) : raw).toString('utf8');
    if (source.includes('window.CBX')) {
      return source;
    }
  }
  assert.fail(`${referenceFile} carries no shared flow model`);
  return '';
}

// The flow ids in the artifact, in declaration order, read as text rather than
// evaluated. `FLOWS` entries open `['<id>', '<realm>', '<family>', ...` at a
// known indentation, which is enough to enumerate them without running the
// quarantined prototype.
function flowIdsFromInertSource(source) {
  const start = source.indexOf('\nFLOWS: [');
  assert.notEqual(start, -1, 'The inert flow model has no FLOWS array');
  const end = source.indexOf('\n  ],', start);
  assert.notEqual(end, -1, 'The inert FLOWS array has no closing delimiter');
  return Array.from(
    source.slice(start, end).matchAll(/^ {4}\['([a-z][a-z0-9]*)','(warm|cold)',/gm),
    (match) => ({ id: match[1], realm: match[2] })
  );
}

function screenKeysFromTemplate(template) {
  const lines = template.split('\n');
  const start = lines.indexOf('    const SCREENS = {');
  assert.notEqual(start, -1, 'SCREENS is absent from the approved template');
  const keys = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index] === '    };') {
      return keys;
    }
    const match = /^ {6}([A-Za-z][A-Za-z0-9]*): \[/.exec(lines[index]);
    if (match) {
      keys.push(match[1]);
    }
  }
  assert.fail('SCREENS has no closing delimiter in the approved template');
  return keys;
}

test('the workstation references are imported as new immutable byte-exact evidence', () => {
  const set = currentSet(manifest);
  assert.equal(set.id, CURRENT_SET_ID);
  assert.equal(set.productIdentity, 'Self-Custody Security Workstation');
  assert.deepEqual(set.approval, {
    authority: 'maintainer',
    date: '2026-08-19',
    adr: '../../adr/0059-self-custody-workstation-product-identity.md',
    changeControl: '../../../01-spec/ui-parity.md#61-product-identity-redesign-before-ui11-resumes'
  });
  assert.ok(
    fs.existsSync(path.resolve(referenceRoot, set.approval.adr)),
    'The approving ADR path does not resolve'
  );

  for (const [id, expected] of Object.entries(EXPECTED_CURRENT)) {
    const declared = set.references[id];
    assert.equal(declared.file, expected.file, `${id} reference filename drifted`);
    assert.equal(declared.bytes, expected.bytes, `${id} byte length drifted in manifest`);
    assert.equal(declared.sha256, expected.sha256, `${id} hash drifted in manifest`);
    assert.deepEqual(declared.renderViewport, expected.renderViewport, `${id} render viewport drifted`);
    assert.deepEqual(declared.comparisonRegion, expected.comparisonRegion, `${id} comparison region drifted`);

    const bytes = fs.readFileSync(path.join(referenceRoot, declared.file));
    assert.equal(bytes.length, expected.bytes, `${id} reference changed length`);
    assert.equal(sha256(bytes), expected.sha256, `${id} reference changed bytes`);
  }

  // Bytes on disk are checked for every set, not only the current one.
  assert.doesNotThrow(() => verifyReferenceBytes(manifest));

  const attributes = fs.readFileSync(path.join(projectRoot, '.gitattributes'), 'utf8');
  assert.match(
    attributes,
    /^\*\.html\.reference binary$/m,
    'Approved reference bytes are no longer protected from line-ending conversion'
  );
});

test('the superseded toolkit set is retained and can never become current', () => {
  const superseded = supersededSets(manifest);
  assert.equal(superseded.length, 1, 'Exactly one retired reference set is expected at UI.10a');
  assert.equal(superseded[0].id, 'toolkit-2026-08-15');
  assert.equal(superseded[0].supersededBy, CURRENT_SET_ID);

  for (const reference of Object.values(superseded[0].references)) {
    assert.ok(
      fs.existsSync(path.join(referenceRoot, reference.file)),
      `Retired audit artifact ${reference.file} was deleted`
    );
  }

  // Two sets may never share an artifact: that is how a retired reference stays
  // live through the back door.
  const files = manifest.sets.flatMap(
    (set) => Object.values(set.references).map((reference) => reference.file)
  );
  assert.equal(new Set(files).size, files.length);

  // Only the current set produces comparison rows.
  assert.ok(createStateMatrix(manifest).every((row) => row.set === CURRENT_SET_ID));
});

test('an ambiguous or retired current selection fails closed', () => {
  const files = onDiskFiles();
  assert.doesNotThrow(() => validateManifest(clone(manifest), files));

  const twoCurrent = clone(manifest);
  twoCurrent.sets[0].status = 'current';
  delete twoCurrent.sets[0].supersededBy;
  assert.throws(
    () => validateManifest(twoCurrent, files),
    /Exactly one reference set may be current/
  );

  const retiredNamedCurrent = clone(manifest);
  retiredNamedCurrent.current = 'toolkit-2026-08-15';
  assert.throws(
    () => validateManifest(retiredNamedCurrent, files),
    /manifest\.current does not name the set marked current/
  );

  const noCurrent = clone(manifest);
  noCurrent.sets[1].status = 'superseded';
  noCurrent.sets[1].supersededBy = 'toolkit-2026-08-15';
  assert.throws(
    () => validateManifest(noCurrent, files),
    /Exactly one reference set may be current/
  );

  const sharedArtifact = clone(manifest);
  sharedArtifact.sets[0].references.desktop.file = EXPECTED_CURRENT.desktop.file;
  assert.throws(
    () => validateManifest(sharedArtifact, files),
    /A reference file is declared by more than one set/
  );

  const droppedSet = clone(manifest);
  droppedSet.sets = droppedSet.sets.filter((set) => set.id === CURRENT_SET_ID);
  assert.throws(
    () => validateManifest(droppedSet, files),
    /must retain the superseded set/
  );

  const undeclaredOnDisk = clone(manifest);
  assert.throws(
    () => validateManifest(undeclaredOnDisk, [...files, 'coldbox-smuggled-mockup.html.reference']),
    /undeclared or missing snapshot/
  );

  const brokenSupersededBy = clone(manifest);
  brokenSupersededBy.sets[0].supersededBy = 'a-set-that-never-existed';
  assert.throws(
    () => validateManifest(brokenSupersededBy, files),
    /does not name a set that replaced it/
  );

  const maskedPixels = clone(manifest);
  maskedPixels.allowedPixelMasks = [{ x: 0, y: 0, width: 4, height: 4 }];
  assert.throws(
    () => validateManifest(maskedPixels, files),
    /Pixel masks are forbidden/
  );

  const inventedDeviation = clone(manifest);
  inventedDeviation.allowedDeviationIds.push('PAR-CLOSE-ENOUGH');
  assert.throws(
    () => validateManifest(inventedDeviation, files),
    /is not a registered PAR id/
  );
});

test('the manifest inventory and navigation match the inert approved payloads', () => {
  const set = currentSet(manifest);
  const desktopTemplate = readInertTemplate(EXPECTED_CURRENT.desktop.file);
  const mobileTemplate = readInertTemplate(EXPECTED_CURRENT.mobile.file);

  // Shell screens come from each viewport's own SCREENS map.
  assert.deepEqual(screenKeysFromTemplate(desktopTemplate), EXPECTED_SHELL_SCREENS);
  assert.deepEqual(screenKeysFromTemplate(mobileTemplate), EXPECTED_SHELL_SCREENS);

  // Flow screens come from the shared flow model, which both viewports read.
  const desktopFlows = flowIdsFromInertSource(readInertFlowSource(EXPECTED_CURRENT.desktop.file));
  const mobileFlows = flowIdsFromInertSource(readInertFlowSource(EXPECTED_CURRENT.mobile.file));
  assert.deepEqual(desktopFlows, mobileFlows, 'The two viewports carry different flow models');
  assert.equal(desktopFlows.length, 32);

  const expectedScreens = EXPECTED_SHELL_SCREENS.concat(desktopFlows.map((flow) => `flow:${flow.id}`));
  assert.deepEqual(set.references.desktop.screens, expectedScreens);
  assert.deepEqual(set.references.mobile.screens, expectedScreens);

  // Every flow the manifest describes matches the artifact's own declaration.
  assert.deepEqual(set.flows.map((flow) => flow.id), desktopFlows.map((flow) => flow.id));
  assert.deepEqual(set.flows.map((flow) => flow.realm), desktopFlows.map((flow) => flow.realm));
  assert.deepEqual(
    set.flows.filter((flow) => flow.availability === 'roadmap-owned').map((flow) => flow.id),
    EXPECTED_ROADMAP_OWNED_FLOWS
  );

  assert.deepEqual(set.navigation.groups, EXPECTED_GROUPS);
  const desktopNav = desktopTemplate.slice(
    desktopTemplate.indexOf('    const WARM_NAV = ['),
    desktopTemplate.indexOf('\n    const navSrc')
  );
  for (const group of EXPECTED_GROUPS) {
    assert.ok(
      desktopNav.includes(`['${group.label}', [`),
      `Desktop approved navigation lost ${group.realm}/${group.label}`
    );
  }

  assert.deepEqual(set.navigation.mobileBottomBar, EXPECTED_MOBILE_TABS);
  const mobileTabLine = mobileTemplate.split('\n').find((line) => line.includes('const TABS = ['));
  for (const label of EXPECTED_MOBILE_TABS) {
    assert.ok(mobileTabLine.includes(`'${label}'`), `Mobile bottom bar lost ${label}`);
  }

  // The More sheet is realm-aware: a sealed capability is never reached through
  // a warm destination.
  assert.ok(set.navigation.mobileMore.warm.length > 0);
  assert.ok(set.navigation.mobileMore.cold.length > 0);
  assert.deepEqual(
    set.navigation.mobileMore.warm.filter((label) => set.navigation.mobileMore.cold.includes(label)),
    [],
    'A destination appears in both the warm and the sealed More sheet'
  );
});

test('every manifest state is classified exactly once and names only registered deviations', () => {
  const rows = createStateMatrix(manifest);
  const set = currentSet(manifest);

  assert.equal(
    rows.length,
    set.references.desktop.screens.length + set.references.mobile.screens.length
  );
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  assert.ok(rows.every((row) => ['PARITY', 'UNAVAILABLE'].includes(row.classification)));
  assert.ok(rows.every((row) => ['warm', 'cold'].includes(row.realm)));
  assert.ok(rows.every((row) => row.deviations.length > 0));
  assert.ok(
    rows.every((row) => row.deviations.every((id) => manifest.allowedDeviationIds.includes(id))),
    'A state applied a deviation that is not in the register'
  );
  assert.ok(
    rows.every((row) => new Set(row.deviations).size === row.deviations.length),
    'A state listed the same deviation twice'
  );

  // Every mobile row unwraps the presentation board (PAR-008); no desktop row
  // may claim it.
  assert.ok(rows.filter((row) => row.viewport === 'mobile').every((row) => row.deviations.includes('PAR-008')));
  assert.ok(rows.filter((row) => row.viewport === 'desktop').every((row) => !row.deviations.includes('PAR-008')));

  // ui-parity.md section 4.2: the shared shell can never be unavailable.
  assert.ok(
    rows.filter((row) => row.owner.length === 0).every((row) => row.classification === 'PARITY')
  );
  assert.ok(rows.some((row) => row.owner.length === 0), 'No state is classified as shared shell');

  // Every roadmap-owned wallet flow is present, unavailable, and carries PAR-009.
  for (const id of EXPECTED_ROADMAP_OWNED_FLOWS) {
    const flowRows = rows.filter((row) => row.screen === `flow:${id}`);
    assert.equal(flowRows.length, 2, `flow:${id} is missing from a viewport`);
    for (const row of flowRows) {
      assert.equal(row.classification, 'UNAVAILABLE', `flow:${id} is not shown as unavailable`);
      assert.ok(row.deviations.includes('PAR-009'));
    }
  }

  // Every screen the manifest lists has an owner mapping, and every owner
  // mapping is used - a stale entry is as much a defect as a missing one.
  const listed = new Set(rows.map((row) => row.screen));
  assert.deepEqual(
    Object.keys(SCREEN_OWNERS).filter((screen) => !listed.has(screen)),
    [],
    'SCREEN_OWNERS carries an entry no manifest state uses'
  );
});

test('classification follows ROADMAP.md status and refuses an unknown owner', () => {
  const statuses = parseRoadmapStatuses();

  // A dependency edge names an item without claiming its status. UI.11 is
  // referenced as a dependency by P2.8 and must not inherit that line's marker.
  assert.equal(statuses.get('UI.11'), ' ');
  assert.equal(statuses.get('P1.6'), 'x');
  assert.equal(statuses.get('WAL.9'), ' ');

  assert.equal(classifyScreen('wallets', new Map([['P1.6', 'x']])), 'PARITY');
  assert.equal(classifyScreen('wallets', new Map([['P1.6', ' ']])), 'UNAVAILABLE');

  // `[~]` means implemented and awaiting independent review. That is not
  // verified, so it cannot certify a screen.
  assert.equal(classifyScreen('wallets', new Map([['P1.6', '~']])), 'UNAVAILABLE');

  // Any one built owner is enough; the later item enriches an existing screen.
  assert.equal(
    classifyScreen('seedqr', new Map([['P1.10', 'x'], ['SEED.3', ' ']])),
    'PARITY'
  );

  assert.throws(
    () => classifyScreen('wallets', new Map()),
    /Owner P1\.6 for wallets is absent from ROADMAP\.md/
  );
  assert.throws(
    () => classifyScreen('a-screen-nobody-declared', statuses),
    /No UI\.11 owner mapping for manifest screen/
  );
});

test('roadmap ownership comes from ROADMAP.md, not from the prototype tags', () => {
  const set = currentSet(manifest);
  const byId = new Map(set.flows.map((flow) => [flow.id, flow]));

  // The prototype's own tags are transcribed so the correction stays auditable
  // against the reference bytes rather than being applied silently (PAR-005).
  const corrections = {
    send: { prototype: 'WAL.5', owners: ['WAL.9'] },
    signing: { prototype: 'WAL.6', owners: ['WAL.8'] },
    broadcast: { prototype: 'WAL.7', owners: ['WAL.10', 'WAL.11', 'WAL.12'] },
    psbt: { prototype: 'WAL.10', owners: ['WAL.13'] },
    coincontrol: { prototype: 'WAL.4', owners: ['WAL.5'] },
    recovery: { prototype: 'P4.3', owners: ['P4.3a', 'P4.3b', 'P4.3c', 'P4.3d', 'P4.3e'] }
  };
  const statuses = parseRoadmapStatuses();

  for (const [id, expected] of Object.entries(corrections)) {
    assert.equal(byId.get(id).prototypeRoadmapTag, expected.prototype, `${id} prototype tag drifted`);
    assert.deepEqual(SCREEN_OWNERS[`flow:${id}`], expected.owners, `${id} corrected owner drifted`);
    assert.notDeepEqual(
      SCREEN_OWNERS[`flow:${id}`],
      [expected.prototype],
      `${id} silently adopted the prototype's own tag`
    );
  }

  // The bare P4.3 the prototype names is not a roadmap item at all.
  assert.equal(statuses.has('P4.3'), false);

  // Every corrected owner does exist.
  for (const owners of Object.values(SCREEN_OWNERS)) {
    for (const owner of owners) {
      assert.ok(statuses.has(owner), `Owner ${owner} is absent from ROADMAP.md`);
    }
  }
});

test('the workstation references stay outside every product build input', () => {
  assert.deepEqual(
    findApprovedReferenceBuildInputs(projectRoot),
    [],
    'Approved prototype evidence entered the transitive product build-input graph'
  );

  const product = fs.readFileSync(path.join(projectRoot, 'build', 'coldbox.html'), 'utf8');
  // The sentinel has to be copy that exists ONLY in the reference. UI.10b ships
  // the approved Home heading as real product copy, so a phrase like "Your
  // self-custody system" now appears legitimately in the build and cannot
  // distinguish a leak. The mobile reference's outer annotation board is
  // presentation context that PAR-008 unwraps and that no product surface may
  // ever contain.
  assert.doesNotMatch(
    product,
    /fully clickable/i,
    'Approved mobile presentation board leaked into build/coldbox.html'
  );
  assert.doesNotMatch(
    product,
    /BOTTOM BAR TAXONOMY/i,
    'Approved reviewer annotation leaked into build/coldbox.html'
  );
  assert.doesNotMatch(
    product,
    /__bundler_(?:thumbnail|template|loading)/,
    'Approved bundler payload leaked into build/coldbox.html'
  );
});

test('UI.10a and UI.10b gate UI.11, and the frozen dependency edges are unchanged', () => {
  const roadmap = fs.readFileSync(
    path.join(projectRoot, 'docs', '05-development', 'ROADMAP.md'),
    'utf8'
  );

  // The author leaves UI.10a at [~]; the independent reviewer closes it at [x].
  assert.match(
    roadmap,
    /- \[(?:~|x)\] \*\*UI\.10a Product identity and replacement approved mock design\*\*[\s\S]*?\*Deps: UI\.8, UI\.9, UI\.10\*/
  );
  assert.match(
    roadmap,
    /- \[(?: |~|x)\] \*\*UI\.10b Self-custody workstation shell and workflow implementation\*\*[\s\S]*?\*Deps: UI\.10a\*/
  );
  // ADR-0059: the historical UI.11 and P2.8 dependency lines are not rewritten.
  assert.match(
    roadmap,
    /- \[(?: |~|x)\] \*\*UI\.11 Approved desktop\/mobile visual parity certification\*\*[\s\S]*?\*Deps: UI\.8, UI\.9, UI\.10\*/
  );
  assert.match(roadmap, /- \[(?: |~|x)\] P2\.8 Printable cards[\s\S]*?\*Deps: P2\.7, UI\.11\*/);
});

test('the deviation register is finite, synchronized and still forbids masks', () => {
  const contract = fs.readFileSync(
    path.join(projectRoot, 'docs', '01-spec', 'ui-parity.md'),
    'utf8'
  );
  const registered = Array.from(
    contract.matchAll(/^\| \*\*(PAR-\d{3})\*\* \|/gm),
    (match) => match[1]
  );
  assert.deepEqual(registered, manifest.allowedDeviationIds);
  assert.deepEqual(manifest.allowedPixelMasks, []);
  assert.match(contract, /Anything not listed in this table is not an allowed difference/);

  // The change-control section records that this import happened, so a reader of
  // the contract is never left to infer which set is live.
  assert.match(contract, /coldbox-workstation-desktop-mockup\.html\.reference/);
  assert.match(contract, /coldbox-workstation-mobile-mockup\.html\.reference/);
});
