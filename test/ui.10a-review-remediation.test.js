'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  SCREEN_OWNERS,
  classifyScreen,
  createStateMatrix,
  currentSet,
  parseRoadmapStatuses,
  readManifest,
  referenceRoot,
  validateManifest
} = require('../scripts/ui-reference-manifest.js');

const projectRoot = path.resolve(__dirname, '..');
const manifest = readManifest();
const set = currentSet(manifest);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function onDiskFiles() {
  return fs.readdirSync(referenceRoot)
    .filter((name) => name.endsWith('.html.reference'));
}

function readInertTemplate(referenceFile) {
  const wrapper = fs.readFileSync(path.join(referenceRoot, referenceFile), 'utf8');
  const match = /<script type="__bundler\/template">([\s\S]*?)<\/script>/.exec(wrapper);
  assert.ok(match, `${referenceFile} has no inert bundler template payload`);
  return JSON.parse(match[1]);
}

function arraySource(template, constantName) {
  const escapedName = constantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaration = new RegExp(`(?:^|\\n)\\s*(?:const\\s+)?${escapedName}\\s*=\\s*\\[`);
  const marker = declaration.exec(template);
  assert.ok(marker, `${constantName} is absent from approved template`);
  const start = marker.index + marker[0].lastIndexOf('[');

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < template.length; index += 1) {
    const ch = template[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '\'' || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return template.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${constantName} has no closing array bracket`);
  return '';
}

function decodeSingleQuoted(value) {
  return value
    .replace(/\\'/g, '\'')
    .replace(/\\\\/g, '\\');
}

function tripleLabelArray(template, constantName) {
  const source = arraySource(template, constantName);
  return Array.from(
    source.matchAll(/\[\s*'((?:\\.|[^'\\])*)'\s*,\s*'((?:\\.|[^'\\])*)'\s*,\s*'((?:\\.|[^'\\])*)'\s*\]/g),
    (match) => decodeSingleQuoted(match[2])
  );
}

function desktopGroups(template) {
  const result = [];
  for (const [constantName, realm] of [['WARM_NAV', 'warm'], ['COLD_NAV', 'cold']]) {
    const source = arraySource(template, constantName);
    for (const match of source.matchAll(/^ {6}\['([^']+)', \[$/gm)) {
      result.push({ realm, label: match[1] });
    }
  }
  return result;
}

function shellPrototypeTags(template) {
  const tags = new Map();
  for (const constantName of ['WARM_NAV', 'COLD_NAV']) {
    const source = arraySource(template, constantName);
    for (const match of source.matchAll(
      /^ {8}\['([^']+)',\s*'[^']*',\s*'[^']*',\s*'([^']*)'\]\s*,?$/gm
    )) {
      const [id, tag] = [match[1], match[2]];
      if (id.startsWith('flow:') || !tag) {
        continue;
      }
      const values = tags.get(id) || [];
      if (!values.includes(tag)) {
        values.push(tag);
      }
      tags.set(id, values);
    }
  }
  return tags;
}

function currentShellTagsById() {
  return new Map(set.shellScreens.map((entry) => [entry.id, entry.prototypeRoadmapTags]));
}

function ownerDivergences() {
  const result = {};
  const validRoadmapTag = /^(?:P\d+\.\d+[a-z]?|UI\.\d+[a-z]?|SEC\.\d+[a-z]?|SEED\.\d+|WAL\.\d+)$/;

  function record(screen, tags) {
    const owners = SCREEN_OWNERS[screen];
    const mismatches = tags.filter((tag) => tag !== 'all' && (!validRoadmapTag.test(tag) || !owners.includes(tag)));
    if (mismatches.length > 0) {
      result[screen] = { prototype: mismatches, owners: [...owners] };
    }
  }

  for (const entry of set.shellScreens) {
    record(entry.id, entry.prototypeRoadmapTags);
  }
  for (const flow of set.flows) {
    record(`flow:${flow.id}`, flow.prototypeRoadmapTag ? [flow.prototypeRoadmapTag] : []);
  }
  return result;
}

test('UI.10a remediation: navigation metadata is exact, order-sensitive approved-byte evidence', () => {
  const desktop = readInertTemplate(set.references.desktop.file);
  const mobile = readInertTemplate(set.references.mobile.file);

  const groups = desktopGroups(desktop);
  assert.equal(groups.length, 11, 'Approved desktop artifact no longer declares exactly 11 rail groups');
  assert.deepEqual(set.navigation.groups, groups);

  const tabs = tripleLabelArray(mobile, 'TABS');
  assert.equal(tabs.length, 5, 'Approved mobile artifact no longer declares exactly five bottom-bar slots');
  assert.deepEqual(set.navigation.mobileBottomBar, tabs);

  const moreWarm = tripleLabelArray(mobile, 'MORE_WARM');
  const moreCold = tripleLabelArray(mobile, 'MORE_COLD');
  assert.equal(moreWarm.length, 10, 'Approved mobile warm More sheet no longer has 10 entries');
  assert.equal(moreCold.length, 16, 'Approved mobile cold More sheet no longer has 16 entries');
  assert.deepEqual(set.navigation.mobileMore.warm, moreWarm);
  assert.deepEqual(set.navigation.mobileMore.cold, moreCold);
  assert.deepEqual(
    moreWarm.filter((label) => moreCold.includes(label)),
    [],
    'Approved mobile More sheets are no longer realm-disjoint'
  );
});

test('UI.10a remediation: every shell prototype tag is transcribed and every owner override is pinned', () => {
  const desktop = readInertTemplate(set.references.desktop.file);
  const artifactTags = shellPrototypeTags(desktop);
  const manifestTags = currentShellTagsById();

  for (const screen of set.references.desktop.screens.filter((id) => !id.startsWith('flow:'))) {
    assert.ok(manifestTags.has(screen), `Manifest does not transcribe shell screen ${screen}`);
    assert.deepEqual(
      manifestTags.get(screen),
      artifactTags.get(screen) || [],
      `Manifest prototype tags drifted from approved artifact for ${screen}`
    );
  }

  assert.deepEqual(ownerDivergences(), {
    seeds: { prototype: ['SEED'], owners: ['UI.3', 'SEED.1'] },
    seedqr: { prototype: ['SEED.4'], owners: ['P1.10', 'SEED.3'] },
    'flow:paths': { prototype: ['P1.4'], owners: ['P1.4a'] },
    'flow:addresses': { prototype: ['P1.4'], owners: ['P1.4a'] },
    'flow:recovery': {
      prototype: ['P4.3'],
      owners: ['P4.3a', 'P4.3b', 'P4.3c', 'P4.3d', 'P4.3e']
    },
    'flow:send': { prototype: ['WAL.5'], owners: ['WAL.9'] },
    'flow:signing': { prototype: ['WAL.6'], owners: ['WAL.8'] },
    'flow:broadcast': { prototype: ['WAL.7'], owners: ['WAL.10', 'WAL.11', 'WAL.12'] },
    'flow:psbt': { prototype: ['WAL.10'], owners: ['WAL.13'] },
    'flow:coincontrol': { prototype: ['WAL.4'], owners: ['WAL.5'] }
  });
});

test('UI.10a remediation: D1 assigns derivation surfaces to open P1.4a', () => {
  const statuses = parseRoadmapStatuses();
  assert.equal(statuses.get('P1.4'), 'x', 'P1.4 engine must remain complete');
  assert.equal(statuses.get('P1.5'), 'x', 'P1.5 engine must remain complete');
  assert.equal(statuses.get('P1.4a'), ' ', 'P1.4a surface item must remain open');
  assert.deepEqual(SCREEN_OWNERS['flow:paths'], ['P1.4a']);
  assert.deepEqual(SCREEN_OWNERS['flow:addresses'], ['P1.4a']);
  assert.equal(classifyScreen('flow:paths', new Map([['P1.4a', ' ']])), 'UNAVAILABLE');
  assert.equal(classifyScreen('flow:addresses', new Map([['P1.4a', '~']])), 'UNAVAILABLE');
  assert.equal(classifyScreen('flow:paths', new Map([['P1.4a', 'x']])), 'PARITY');

  const rows = createStateMatrix(manifest);
  for (const screen of ['flow:paths', 'flow:addresses']) {
    const screenRows = rows.filter((row) => row.screen === screen);
    assert.equal(screenRows.length, 2, `${screen} is missing a viewport`);
    assert.ok(screenRows.every((row) => row.classification === 'UNAVAILABLE'));
    assert.ok(screenRows.every((row) => row.deviations.includes('PAR-009')));
  }
});

test('UI.10a remediation: reference geometry fails closed on non-positive comparison dimensions', () => {
  const files = onDiskFiles();

  const zeroWidth = clone(manifest);
  zeroWidth.sets[1].references.desktop.comparisonRegion.width = 0;
  assert.throws(
    () => validateManifest(zeroWidth, files),
    /comparison region width must be a positive integer/
  );

  const negativeHeight = clone(manifest);
  negativeHeight.sets[1].references.mobile.comparisonRegion.height = -844;
  assert.throws(
    () => validateManifest(negativeHeight, files),
    /comparison region height must be a positive integer/
  );

  const zeroRenderWidth = clone(manifest);
  zeroRenderWidth.sets[1].references.mobile.renderViewport.width = 0;
  assert.throws(
    () => validateManifest(zeroRenderWidth, files),
    /render viewport width must be a positive integer/
  );
});

test('UI.10a remediation: deviation applicability matches the dark state matrix', () => {
  const rows = createStateMatrix(manifest);

  assert.ok(rows.every((row) => row.theme === 'dark'));
  assert.ok(
    rows.every((row) => !row.deviations.includes('PAR-001')),
    'PAR-001 is light-theme-only and must not be assigned to dark rows'
  );

  const vaultNamingScreens = new Set(['vault', 'create', 'flow:unlock']);
  for (const row of rows) {
    assert.equal(
      row.deviations.includes('PAR-004'),
      vaultNamingScreens.has(row.screen),
      `PAR-004 applicability drifted for ${row.id}`
    );
  }
});

test('UI.10a remediation: CI secret scan is manifest-driven and fail-closed', () => {
  const workflow = fs.readFileSync(path.join(projectRoot, '.github', 'workflows', 'ci.yml'), 'utf8');

  assert.match(workflow, /approved-ui-reference-secret-scan:/);
  assert.match(workflow, /ConvertFrom-Json/);
  assert.match(workflow, /\$manifest\.sets/);
  assert.match(workflow, /\.references\.PSObject\.Properties/);
  assert.match(workflow, /Get-ChildItem[\s\S]*?\.html\.reference/);
  assert.match(workflow, /Compare-Object[\s\S]*?declared/i);
  assert.doesNotMatch(
    workflow,
    /\$expected\s*=\s*@\(\s*'coldbox-desktop-mockup\.html\.reference',\s*'coldbox-mobile-mockup\.html\.reference'\s*\)/s,
    'CI regressed to the two-file UI.4a literal list'
  );
});
