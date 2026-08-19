'use strict';

// UI.10a - the single place that answers "which approved references are
// current?".
//
// Before this item the approved package held exactly one reference set, so
// "the manifest" and "the current set" were the same object and every consumer
// could reach straight into `manifest.references`. ADR-0059 ended that: the
// maintainer approved a replacement self-custody-workstation design, the
// superseded toolkit references stay in the package as byte-identical audit
// evidence, and the package now holds two sets at once.
//
// Two sets means a selection, and a selection that lives in more than one file
// eventually disagrees with itself. UI.11's pixel harness, the reference
// integrity suite and any later consumer all read the current set from here so
// that a superseded artifact cannot become current by being read through a
// different code path.
//
// This module never renders a reference. It reads bytes, validates the
// manifest's shape and fails closed. The parity harness that drives browsers is
// UI.11's, and it consumes `createStateMatrix()` from here.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const referenceRoot = path.join(
  projectRoot,
  'docs',
  '05-development',
  'ui-reference',
  'approved'
);
const manifestPath = path.join(referenceRoot, 'manifest.json');
const roadmapPath = path.join(projectRoot, 'docs', '05-development', 'ROADMAP.md');

const SCHEMA = 'coldbox.approved-ui-reference.v2';

// A manifest screen id is either a shell screen (`walletDetail`) or a flow
// screen (`flow:entropy`). The v1 grammar allowed neither camelCase nor the
// flow prefix, so it is stated here rather than inherited.
const SCREEN_ID = /^(?:[a-z][A-Za-z0-9]*|flow:[a-z][a-z0-9]*)$/;
const DEVIATION_ID = /^PAR-\d{3}$/;

// Which roadmap items own each manifest screen.
//
// This mapping is deliberately NOT read out of the approved artifacts. The
// prototype carries its own per-flow roadmap tags and five of the six
// wallet-owned tags are wrong against the accepted roadmap - it labels
// Send & review WAL.5 (actually UTXO management), Level 3 signing WAL.6
// (actually the fee engine), Broadcast/RBF/CPFP WAL.7 (actually the cold
// transaction builder), the PSBT inspector WAL.10 (actually exact-byte
// broadcast), Coin control WAL.4 (actually the receive workflow), and it names
// a bare `P4.3` that the roadmap does not define at all - it is split into
// P4.3a..P4.3e. PAR-005 already governs exactly this: availability and phase
// come from the current roadmap at build time, not from the frozen prototype's
// statuses. The prototype's own tags stay recorded in the manifest under
// `prototypeRoadmapTag` so the correction remains auditable against the
// reference bytes rather than being silently applied.
//
// An empty owner list means the shared shell, which ui-parity.md section 4.2
// forbids from ever classifying UNAVAILABLE.
const SCREEN_OWNERS = Object.freeze({
  // Shell screens.
  home: [],
  wallets: ['P1.6'],
  walletDetail: ['P1.6'],
  seeds: ['UI.3', 'SEED.1'],
  seedDetail: ['UI.3', 'SEED.1', 'SEED.2'],
  seedqr: ['P1.10', 'SEED.3'],
  backup: ['P2.6', 'P2.7'],
  portfolio: ['P3.4'],
  security: ['P1.8', 'P1.9'],
  reference: ['P4.10'],
  advanced: ['UI.9'],
  vault: ['P0.13'],
  create: ['UI.10'],
  lock: ['P0.13'],
  // Flow screens.
  'flow:entropy': ['P1.1', 'P1.2'],
  'flow:transfer': ['P0.13'],
  'flow:settings': [],
  'flow:forge': ['P1.3'],
  'flow:passphrase': ['P4.5'],
  'flow:notes': ['P1.7'],
  'flow:paths': ['P1.4', 'P1.5'],
  'flow:addresses': ['P1.4', 'P1.5'],
  'flow:children': ['P4.6'],
  'flow:descriptors': ['P4.9'],
  'flow:shares': ['P2.1', 'P2.2', 'P2.3', 'P2.4', 'P2.5'],
  'flow:combine': ['P2.6'],
  'flow:qrstudio': ['P1.10'],
  'flow:recovery': ['P4.3a', 'P4.3b', 'P4.3c', 'P4.3d', 'P4.3e'],
  'flow:verifybench': ['P1.9', 'P4.4'],
  'flow:registry': ['P1.6', 'P1.7'],
  'flow:devices': ['P1.8'],
  'flow:prices': ['P3.1', 'P3.2', 'P3.3'],
  'flow:taxes': ['P3.7', 'P3.8', 'P3.9'],
  'flow:backuphealth': ['P2.6', 'P2.7'],
  'flow:verifyfile': ['P0.16'],
  'flow:provenance': ['P0.16', 'P0.20'],
  'flow:learn': ['P0.17'],
  'flow:toolmap': ['UI.9'],
  'flow:empty': ['UI.3', 'UI.4'],
  'flow:unlock': ['P0.13', 'UI.10'],
  'flow:send': ['WAL.9'],
  'flow:signing': ['WAL.8'],
  'flow:broadcast': ['WAL.10', 'WAL.11', 'WAL.12'],
  'flow:psbt': ['WAL.13'],
  'flow:coincontrol': ['WAL.5'],
  'flow:source': ['WAL.2']
});

// Which realm owns each shell screen. Flow screens declare their own realm in
// the manifest, so only the shell needs a table.
const SHELL_SCREEN_REALM = Object.freeze({
  home: 'warm',
  wallets: 'warm',
  walletDetail: 'warm',
  seeds: 'cold',
  seedDetail: 'cold',
  seedqr: 'cold',
  backup: 'warm',
  portfolio: 'warm',
  security: 'warm',
  reference: 'warm',
  advanced: 'warm',
  vault: 'warm',
  create: 'warm',
  lock: 'warm'
});

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assertUniqueScreens(screens, label) {
  assert.ok(Array.isArray(screens) && screens.length > 0, `${label} must be a non-empty array`);
  for (const screen of screens) {
    assert.equal(typeof screen, 'string', `${label} must contain only strings`);
    assert.match(screen, SCREEN_ID, `${label} contains an unsafe screen id: ${screen}`);
  }
  assert.equal(new Set(screens).size, screens.length, `${label} contains a duplicate screen`);
}

function assertReferenceShape(setId, viewportId, reference) {
  const where = `${setId}/${viewportId}`;
  assert.match(reference.file, /^[a-z0-9-]+\.html\.reference$/, `${where} reference filename is unsafe`);
  assert.ok(Number.isInteger(reference.bytes) && reference.bytes > 0, `${where} byte length is not a positive integer`);
  assert.match(reference.sha256, /^[0-9a-f]{64}$/, `${where} hash is not a lowercase sha256`);
  assert.ok(Number.isInteger(reference.renderViewport.width), `${where} render viewport width is not an integer`);
  assert.ok(Number.isInteger(reference.renderViewport.height), `${where} render viewport height is not an integer`);
  assert.ok(
    ['full-viewport', 'product-frame'].includes(reference.comparisonRegion.kind),
    `${where} comparison region kind is unknown`
  );
  assertUniqueScreens(reference.screens, `${where} screens`);
}

// Structurally validates an already-parsed manifest against the list of
// reference files actually present in the approved package. Every rule here
// exists to make "which set is current" a question with exactly one answer.
//
// It is separated from the file reading so the negative suite can hand it a
// deliberately broken manifest - two current sets, a retired set named current,
// two sets sharing one artifact - and prove each one fails, without writing a
// fake approved package to disk.
function validateManifest(manifest, onDiskFiles) {
  assert.equal(manifest.schema, SCHEMA, 'Approved reference manifest schema is not the UI.10a two-set schema');
  assert.equal(
    path.resolve(referenceRoot, manifest.contract),
    path.join(projectRoot, 'docs', '01-spec', 'ui-parity.md'),
    'Manifest contract path no longer resolves to the canonical parity document'
  );
  assert.deepEqual(manifest.allowedPixelMasks, [], 'Pixel masks are forbidden by the parity contract');
  assert.ok(manifest.allowedDeviationIds.length > 0, 'The deviation register cannot be empty');
  for (const id of manifest.allowedDeviationIds) {
    assert.match(id, DEVIATION_ID, `Deviation id ${id} is not a registered PAR id`);
  }
  assert.equal(
    new Set(manifest.allowedDeviationIds).size,
    manifest.allowedDeviationIds.length,
    'The deviation register lists a duplicate id'
  );

  assert.ok(Array.isArray(manifest.sets) && manifest.sets.length >= 2, 'The manifest must retain the superseded set');

  const ids = manifest.sets.map((set) => set.id);
  assert.equal(new Set(ids).size, ids.length, 'Two reference sets share an id');

  const currentSets = manifest.sets.filter((set) => set.status === 'current');
  assert.equal(currentSets.length, 1, 'Exactly one reference set may be current');
  assert.equal(currentSets[0].id, manifest.current, 'manifest.current does not name the set marked current');

  const declaredFiles = [];
  for (const set of manifest.sets) {
    assert.match(set.id, /^[a-z][a-z0-9-]*$/, `Reference set id ${set.id} is unsafe`);
    assert.ok(['current', 'superseded'].includes(set.status), `Reference set ${set.id} has an unknown status`);
    if (set.status === 'superseded') {
      assert.ok(
        ids.includes(set.supersededBy),
        `Superseded set ${set.id} does not name a set that replaced it`
      );
      assert.notEqual(set.supersededBy, set.id, `Superseded set ${set.id} cannot supersede itself`);
    } else {
      assert.equal(set.supersededBy, undefined, 'The current set cannot carry supersededBy');
    }
    assert.equal(set.approval.authority, 'maintainer', `Reference set ${set.id} was not approved by the maintainer`);
    assert.match(set.approval.date, /^\d{4}-\d{2}-\d{2}$/, `Reference set ${set.id} has no approval date`);
    assert.deepEqual(
      Object.keys(set.references).sort(),
      ['desktop', 'mobile'],
      `Reference set ${set.id} must declare exactly a desktop and a mobile reference`
    );
    for (const [viewportId, reference] of Object.entries(set.references)) {
      assertReferenceShape(set.id, viewportId, reference);
      declaredFiles.push(reference.file);
    }
  }

  // A reference file belongs to exactly one set. Sharing bytes between the
  // superseded and current sets is how a retired artifact silently stays live.
  assert.equal(
    new Set(declaredFiles).size,
    declaredFiles.length,
    'A reference file is declared by more than one set'
  );

  assert.deepEqual(
    [...onDiskFiles].sort(),
    [...declaredFiles].sort(),
    'The approved reference directory contains an undeclared or missing snapshot'
  );

  return manifest;
}

function listReferenceFiles() {
  return fs.readdirSync(referenceRoot, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith('.html.reference'))
    .map((entry) => {
      assert.ok(entry.isFile(), `${entry.name} must be a regular immutable file`);
      return entry.name;
    });
}

// Reads the manifest from the approved package and validates it.
function readManifest() {
  return validateManifest(
    JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
    listReferenceFiles()
  );
}

function currentSet(manifest) {
  const set = manifest.sets.find((entry) => entry.id === manifest.current);
  assert.ok(set, `manifest.current names a set that does not exist: ${manifest.current}`);
  assert.equal(set.status, 'current', `${set.id} is named current but is not marked current`);
  return set;
}

function supersededSets(manifest) {
  return manifest.sets.filter((set) => set.status === 'superseded');
}

// Every set's bytes are verified, not just the current one. The superseded
// artifacts are audit evidence and the contract calls them immutable, so drift
// in a retired reference is as much a failure as drift in a live one.
function verifyReferenceBytes(manifest) {
  for (const set of manifest.sets) {
    for (const [viewportId, reference] of Object.entries(set.references)) {
      const bytes = fs.readFileSync(path.join(referenceRoot, reference.file));
      assert.equal(
        bytes.length,
        reference.bytes,
        `${set.id}/${viewportId} reference length changed`
      );
      assert.equal(
        sha256(bytes),
        reference.sha256,
        `${set.id}/${viewportId} reference hash changed`
      );
    }
  }
}

// Roadmap statuses, read only from bullet lines that carry a checkbox.
//
// `*Deps: ...*` is stripped first: a dependency edge names another item without
// making any claim about that item's status, and letting it set one made UI.11
// read as complete on a line that only mentioned it.
function parseRoadmapStatuses() {
  const roadmap = fs.readFileSync(roadmapPath, 'utf8');
  const idPattern = /\b(?:P\d+\.\d+[a-z]?|UI\.\d+[a-z]?|SEC\.\d+[a-z]?|SEED\.\d+|WAL\.\d+)\b/g;
  const statuses = new Map();
  for (const line of roadmap.split(/\r?\n/)) {
    const marker = /^\s*- \[([ x~])\]/.exec(line);
    if (!marker) {
      continue;
    }
    const body = line.slice(marker[0].length).replace(/\*Deps:[^*]*\*/g, '');
    for (const id of body.match(idPattern) || []) {
      if (!statuses.has(id)) {
        statuses.set(id, marker[1]);
      }
    }
  }
  return statuses;
}

// PARITY when at least one owning roadmap item is independently verified `[x]`;
// UNAVAILABLE otherwise. `[~]` is deliberately not enough: it means implemented
// and awaiting review, and certifying a screen against work that has not passed
// review is exactly the claim this contract exists to prevent.
function classifyScreen(screen, statuses) {
  const owners = SCREEN_OWNERS[screen];
  assert.ok(owners, `No UI.11 owner mapping for manifest screen ${screen}`);
  for (const owner of owners) {
    assert.ok(statuses.has(owner), `Owner ${owner} for ${screen} is absent from ROADMAP.md`);
  }
  if (owners.length === 0) {
    return 'PARITY';
  }
  return owners.some((owner) => statuses.get(owner) === 'x') ? 'PARITY' : 'UNAVAILABLE';
}

function realmOfScreen(screen, set) {
  if (screen.startsWith('flow:')) {
    const flow = (set.flows || []).find((entry) => `flow:${entry.id}` === screen);
    assert.ok(flow, `Manifest screen ${screen} has no flow entry in set ${set.id}`);
    assert.ok(['warm', 'cold'].includes(flow.realm), `Flow ${flow.id} declares an unknown realm`);
    return flow.realm;
  }
  const realm = SHELL_SCREEN_REALM[screen];
  assert.ok(realm, `No realm mapping for manifest shell screen ${screen}`);
  return realm;
}

// The deterministic state matrix UI.11 enumerates, built from the current set
// only. A superseded set never produces a row: it is evidence, not a target.
function createStateMatrix(manifest) {
  const set = currentSet(manifest);
  const statuses = parseRoadmapStatuses();
  const rows = [];

  for (const [viewportId, reference] of Object.entries(set.references)) {
    for (const screen of reference.screens) {
      const classification = classifyScreen(screen, statuses);
      const realm = realmOfScreen(screen, set);
      const deviations = realm === 'cold'
        ? ['PAR-003', 'PAR-005', 'PAR-007']
        : ['PAR-001', 'PAR-002', 'PAR-005', 'PAR-007'];
      if (viewportId === 'mobile') {
        deviations.push('PAR-008');
      }
      if (classification === 'UNAVAILABLE') {
        deviations.push('PAR-009');
      }
      for (const id of deviations) {
        assert.ok(
          manifest.allowedDeviationIds.includes(id),
          `State matrix applied unregistered deviation ${id}`
        );
      }
      rows.push({
        id: `${viewportId}/${screen}`,
        set: set.id,
        viewport: viewportId,
        screen,
        realm,
        theme: 'dark',
        focus: 'none',
        reveal: 'masked',
        menu: 'closed',
        owner: Object.freeze([...SCREEN_OWNERS[screen]]),
        classification,
        deviations: [...new Set(deviations)]
      });
    }
  }

  assert.equal(
    new Set(rows.map((row) => row.id)).size,
    rows.length,
    'State matrix contains duplicate rows'
  );

  // ui-parity.md section 4.2: the shared shell can never be unavailable.
  for (const row of rows) {
    if (row.owner.length === 0) {
      assert.equal(
        row.classification,
        'PARITY',
        `Shared-shell state ${row.id} classified ${row.classification}`
      );
    }
  }

  return rows;
}

module.exports = Object.freeze({
  SCHEMA,
  SCREEN_OWNERS,
  classifyScreen,
  createStateMatrix,
  currentSet,
  manifestPath,
  parseRoadmapStatuses,
  readManifest,
  referenceRoot,
  supersededSets,
  validateManifest,
  verifyReferenceBytes
});
