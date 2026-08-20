'use strict';

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
const SCREEN_ID = /^(?:[a-z][A-Za-z0-9]*|flow:[a-z][a-z0-9]*)$/;
const DEVIATION_ID = /^PAR-\d{3}$/;

// UI.10a's parity owner map. A screen is PARITY only when at least one owner is
// independently complete. Empty owner arrays are shared shell and always PARITY.
//
// D1 in docs/05-development/maintainer-decisions.md is load-bearing here:
// P1.4/P1.5 own the already-complete derivation engines. P1.4a owns the
// user-facing derivation-path and address-derivation surfaces. Until P1.4a is
// independently [x], the approved `flow:paths` and `flow:addresses` states are
// UNAVAILABLE.
const SCREEN_OWNERS = Object.freeze({
  home: [],
  wallets: ['P1.6'],
  walletDetail: ['P1.6'],
  seeds: ['UI.3', 'SEED.1'],
  seedDetail: ['UI.3', 'SEED.1', 'SEED.2'],
  seedqr: ['P1.10', 'SEED.3'],
  backup: ['P2.6', 'P2.7'],
  portfolio: ['P3.4'],
  security: ['P1.8', 'P1.9'],
  reference: ['P0.17', 'P4.10'],
  advanced: ['UI.9'],
  vault: ['P0.13'],
  create: ['UI.10'],
  lock: ['P0.13'],
  'flow:entropy': ['P1.1', 'P1.2'],
  'flow:transfer': ['P0.13'],
  'flow:settings': [],
  'flow:forge': ['P1.3'],
  'flow:passphrase': ['P4.5'],
  'flow:notes': ['P1.7'],
  'flow:paths': ['P1.4a'],
  'flow:addresses': ['P1.4a'],
  'flow:children': ['P4.6'],
  'flow:descriptors': ['P4.9'],
  'flow:shares': ['P2.1', 'P2.2', 'P2.3', 'P2.4', 'P2.5'],
  'flow:combine': ['P2.6'],
  'flow:qrstudio': ['P1.10', 'SEED.3'],
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

const VAULT_NAMING_SCREENS = new Set(['vault', 'create', 'flow:unlock']);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assertPositiveInteger(value, label) {
  assert.ok(Number.isInteger(value) && value > 0, `${label} must be a positive integer`);
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
  assertPositiveInteger(reference.bytes, `${where} byte length`);
  assert.match(reference.sha256, /^[0-9a-f]{64}$/, `${where} hash is not a lowercase sha256`);
  assertPositiveInteger(reference.renderViewport.width, `${where} render viewport width`);
  assertPositiveInteger(reference.renderViewport.height, `${where} render viewport height`);
  assert.ok(
    ['full-viewport', 'product-frame'].includes(reference.comparisonRegion.kind),
    `${where} comparison region kind is unknown`
  );
  assertPositiveInteger(reference.comparisonRegion.width, `${where} comparison region width`);
  assertPositiveInteger(reference.comparisonRegion.height, `${where} comparison region height`);
  assertUniqueScreens(reference.screens, `${where} screens`);
}

function assertShellScreenMetadata(set) {
  if (set.shellScreens === undefined) {
    return;
  }
  assert.ok(Array.isArray(set.shellScreens), `Reference set ${set.id} shellScreens must be an array`);
  const ids = [];
  for (const entry of set.shellScreens) {
    assert.ok(entry && typeof entry === 'object', `Reference set ${set.id} has an invalid shellScreens entry`);
    assert.match(entry.id, /^[a-z][A-Za-z0-9]*$/, `Reference set ${set.id} has an unsafe shell screen id`);
    assert.ok(
      Array.isArray(entry.prototypeRoadmapTags),
      `Reference set ${set.id}/${entry.id} prototypeRoadmapTags must be an array`
    );
    for (const tag of entry.prototypeRoadmapTags) {
      assert.equal(typeof tag, 'string', `${set.id}/${entry.id} prototype roadmap tag must be a string`);
      assert.match(
        tag,
        /^(?:P\d+\.\d+[a-z]?|UI\.\d+[a-z]?|SEC\.\d+[a-z]?|SEED(?:\.\d+)?|WAL\.\d+|all)$/,
        `${set.id}/${entry.id} has an unsafe prototype roadmap tag: ${tag}`
      );
    }
    assert.equal(
      new Set(entry.prototypeRoadmapTags).size,
      entry.prototypeRoadmapTags.length,
      `${set.id}/${entry.id} repeats a prototype roadmap tag`
    );
    ids.push(entry.id);
  }
  assert.equal(new Set(ids).size, ids.length, `Reference set ${set.id} repeats shell screen metadata`);

  const shellScreens = Object.values(set.references)
    .flatMap((reference) => reference.screens)
    .filter((screen) => !screen.startsWith('flow:'));
  const expected = [...new Set(shellScreens)].sort();
  assert.deepEqual(
    [...ids].sort(),
    expected,
    `Reference set ${set.id} shellScreens metadata does not cover exactly its shell screens`
  );
}

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
      assert.ok(ids.includes(set.supersededBy), `Superseded set ${set.id} does not name a set that replaced it`);
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
    assertShellScreenMetadata(set);
  }

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

function readManifest() {
  return validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), listReferenceFiles());
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

function verifyReferenceBytes(manifest) {
  for (const set of manifest.sets) {
    for (const [viewportId, reference] of Object.entries(set.references)) {
      const bytes = fs.readFileSync(path.join(referenceRoot, reference.file));
      assert.equal(bytes.length, reference.bytes, `${set.id}/${viewportId} reference length changed`);
      assert.equal(sha256(bytes), reference.sha256, `${set.id}/${viewportId} reference hash changed`);
    }
  }
}

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

function createStateMatrix(manifest) {
  const set = currentSet(manifest);
  const statuses = parseRoadmapStatuses();
  const rows = [];

  for (const [viewportId, reference] of Object.entries(set.references)) {
    for (const screen of reference.screens) {
      const classification = classifyScreen(screen, statuses);
      const realm = realmOfScreen(screen, set);

      // All currently enumerated states are dark-theme states. PAR-001 is a
      // light-theme deviation and therefore must not be attached to these rows.
      const deviations = realm === 'cold'
        ? ['PAR-003', 'PAR-005', 'PAR-007']
        : ['PAR-002', 'PAR-005', 'PAR-007'];

      // PAR-004 is specifically the approved vault naming / placement
      // difference. Apply it only to the states it governs.
      if (VAULT_NAMING_SCREENS.has(screen)) {
        deviations.push('PAR-004');
      }
      if (viewportId === 'mobile') {
        deviations.push('PAR-008');
      }
      if (classification === 'UNAVAILABLE') {
        deviations.push('PAR-009');
      }

      for (const id of deviations) {
        assert.ok(manifest.allowedDeviationIds.includes(id), `State matrix applied unregistered deviation ${id}`);
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

  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length, 'State matrix contains duplicate rows');
  for (const row of rows) {
    if (row.owner.length === 0) {
      assert.equal(row.classification, 'PARITY', `Shared-shell state ${row.id} classified ${row.classification}`);
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
