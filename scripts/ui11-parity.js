'use strict';

// UI.11 - the dedicated approved-mock comparison harness.
//
// This file drives two pages side by side: the maintainer-approved reference
// artifact, rendered in a disposable network-blocked context, and the built
// product. For every row of the UI.10a state matrix it captures both at the
// manifest's comparison region, applies the registered normalizers, and
// requires the two captures to have equal dimensions and zero unexpected
// changed pixels.
//
// Three rules govern everything below, and each one is enforced rather than
// documented:
//
//   1. NOTHING IS DECIDED HERE THAT ui-reference-manifest.js ALREADY DECIDES.
//      Which set is current, which screens exist, who owns them, how they
//      classify and which deviations apply are all read from that module. The
//      pre-UI.10a version of this harness carried its own copies of
//      SCREEN_OWNERS, parseRoadmapStatuses() and createStateMatrix(), and two
//      copies of a decision eventually disagree. There is now one.
//
//   2. NO PIXEL MASKS AND NO PERCENTAGE THRESHOLDS. A difference is either
//      permitted by a registered PAR deviation and removed by a deterministic
//      normalizer before comparison, or it is a failure. `assertNoMasks()`
//      re-checks the manifest at run time so the rule cannot be relaxed by
//      editing data instead of code.
//
//   3. NO ROW IS EVER SKIPPED. A screen whose product surface does not exist
//      yet fails with `product surface not shipped`. A suite that self-skips
//      the unbuilt half of a comparison reports success while checking
//      nothing, which is the exact failure mode the parity contract exists to
//      prevent. Such a row is recorded as PENDING with the reason it could not
//      be compared, and the run still exits non-zero: an incomplete shell
//      produces a readable report, never a green one.
//
// Selector discipline: every locator this file uses asserts its own
// cardinality. A selector that matches two elements, or none, throws rather
// than picking one. The approved artifacts carry no stable handles, so the
// reference side is driven by its own navigation tables, parsed out of the
// inert bundler template as data and cross-checked against the manifest's
// recorded navigation before a single click happens.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { pathToFileURL } = require('node:url');
const { chromium, firefox } = require('playwright');

const {
  createStateMatrix,
  currentSet,
  readManifest,
  referenceRoot,
  verifyReferenceBytes
} = require('./ui-reference-manifest.js');

const projectRoot = path.resolve(__dirname, '..');
const buildPath = path.join(projectRoot, 'build', 'coldbox.html');
const defaultArtifactRoot = path.join(projectRoot, 'test', 'output', 'ui11');

const RESULTS_SCHEMA = 'coldbox.ui11.parity-results.v2';

// How long the inert prototype is given to mount before it is read. The
// artifacts carry a React runtime and render synchronously after load; this is
// a settle margin, not a race the harness depends on winning - every read
// after it asserts what it found.
const REFERENCE_SETTLE_MS = 1500;
const INTERACTION_SETTLE_MS = 250;

// ---------------------------------------------------------------------------
// The reference's own navigation, read out of the artifact as data.
//
// The approved artifacts carry no stable handles - they are a frozen React
// prototype whose buttons are styled inline - so the harness cannot select by
// id. What it can do is read the prototype's own navigation tables out of the
// inert bundler template, exactly as UI.10a's reference test reads the flow
// model, and use them as the selector table.
//
// Nothing here is executed. The template is a JSON string inside a
// `<script type="__bundler/template">` element that no browser runs, and the
// shared flow model is gunzipped out of the resource manifest. Both are read
// as text, per the reference handling rule.
//
// Every table parsed here is then cross-checked against the navigation the
// manifest records (ui-parity.md section 1: the manifest is the authority, the
// artifact is the evidence). A disagreement between the two fails the run
// before any capture happens - which also means this harness independently
// re-verifies the manifest's navigation metadata on every execution.
// ---------------------------------------------------------------------------

const SCREEN_TOKEN = String.raw`(?:[a-z][A-Za-z0-9]*|flow:[a-z][a-z0-9]*)`;
const QUOTED = String.raw`'([^']*)'`;

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

// Slices `<name> = [ ... ];` out of the template. Deliberately exact about its
// delimiters: a table this cannot find unambiguously is a table the harness
// must not guess at.
function tableBlock(template, name) {
  const opener = new RegExp(String.raw`(?:^|\n)\s*(?:const\s+)?${name}\s*=\s*\[`);
  const start = opener.exec(template);
  assert.ok(start, `The approved template has no ${name} table`);
  const from = start.index + start[0].length - 1;
  let depth = 0;
  for (let index = from; index < template.length; index += 1) {
    const character = template[index];
    if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return template.slice(from, index + 1);
      }
    }
  }
  return assert.fail(`The approved template's ${name} table is unterminated`);
}

// `['<Group label>', [ ['<screen>', '<icon>', '<label>', '<tag>'], ... ]]`
function parseRailTable(template, name, realm) {
  const block = tableBlock(template, name);
  const groups = [];
  const groupPattern = new RegExp(String.raw`\[${QUOTED},\s*\[`, 'g');
  const itemPattern = new RegExp(
    String.raw`\['(${SCREEN_TOKEN})',\s*${QUOTED},\s*${QUOTED},\s*${QUOTED}\]`,
    'g'
  );
  let group = groupPattern.exec(block);
  while (group) {
    const nextGroup = groupPattern.exec(block);
    const slice = block.slice(group.index, nextGroup ? nextGroup.index : block.length);
    const items = [];
    itemPattern.lastIndex = 0;
    let item = itemPattern.exec(slice);
    while (item) {
      items.push({ screen: item[1], label: item[3], prototypeRoadmapTag: item[4] || null });
      item = itemPattern.exec(slice);
    }
    assert.ok(items.length > 0, `${name} group ${group[1]} declares no destinations`);
    groups.push({ realm, label: group[1], items });
    group = nextGroup;
  }
  assert.ok(groups.length > 0, `${name} declares no groups`);
  return groups;
}

// `const TABS = [['<icon>', '<label>', '<target>'], ...]`
function parseTabTable(template) {
  const block = tableBlock(template, 'TABS');
  const pattern = new RegExp(String.raw`\[${QUOTED},\s*${QUOTED},\s*${QUOTED}\]`, 'g');
  const tabs = [];
  let match = pattern.exec(block);
  while (match) {
    tabs.push({ label: match[2], target: match[3] });
    match = pattern.exec(block);
  }
  assert.ok(tabs.length > 0, 'The approved mobile template declares no bottom-bar tabs');
  return tabs;
}

// `['<tag>', '<label>', '<screen>']`
function parseMoreTable(template, name) {
  const block = tableBlock(template, name);
  const pattern = new RegExp(String.raw`\[${QUOTED},\s*${QUOTED},\s*'(${SCREEN_TOKEN})'\]`, 'g');
  const entries = [];
  let match = pattern.exec(block);
  while (match) {
    entries.push({ label: match[2], screen: match[3] });
    match = pattern.exec(block);
  }
  assert.ok(entries.length > 0, `The approved mobile template's ${name} sheet is empty`);
  return entries;
}

// `FLOWS: [ ['<id>','<realm>','<family>','<tag>','<title>', ...`
function parseFlowTitles(source) {
  const start = source.indexOf('\nFLOWS: [');
  assert.notEqual(start, -1, 'The inert flow model has no FLOWS array');
  const end = source.indexOf('\n  ],', start);
  assert.notEqual(end, -1, 'The inert FLOWS array has no closing delimiter');
  const titles = new Map();
  const pattern = /^ {4}\['([a-z][a-z0-9]*)','(warm|cold)','([^']*)','([^']*)','([^']*)'/gm;
  const block = source.slice(start, end);
  let match = pattern.exec(block);
  while (match) {
    assert.equal(titles.has(match[1]), false, `The flow model declares ${match[1]} twice`);
    titles.set(match[1], { realm: match[2], title: match[5] });
    match = pattern.exec(block);
  }
  assert.ok(titles.size > 0, 'The inert flow model declares no flows');
  return titles;
}

// Screens the approved artifacts do not put on a rail, a bottom bar or a More
// sheet, and the deterministic control that opens each one. Every entry names
// the screen it starts from and the exact control to activate; `expected` is
// the cardinality that control must have, so an artifact change that adds or
// removes a candidate fails the run instead of silently selecting a different
// element.
//
// This table is small on purpose. Everything else - 32 flow screens through the
// flow index, and every shell screen the artifact navigates to directly - is
// derived from the artifact's own tables above. `buildReferenceIndex()` asserts
// that between them they cover every screen the manifest lists, on both
// viewports, so a screen that loses its route fails loudly rather than
// vanishing from the run.
const REFERENCE_ENTRY_POINTS = Object.freeze({
  desktop: Object.freeze({
    walletDetail: Object.freeze({
      unresolved: 'The desktop wallet list exposes no clickable record row (zero elements >=240x56 with cursor:pointer), so the object view has no confirmed entry point yet.'
    }),
    create: Object.freeze({
      unresolved: 'Vault creation is reached from a quick action whose control has not been confirmed by measurement.'
    })
  }),
  mobile: Object.freeze({
    walletDetail: Object.freeze({
      unresolved: 'Same as desktop: no confirmed record-row control on the wallets list.'
    }),
    seedDetail: Object.freeze({
      from: 'seeds',
      control: Object.freeze({ kind: 'record', expected: 4, index: 0 })
    }),
    seedqr: Object.freeze({
      from: 'seedDetail',
      control: Object.freeze({ kind: 'text', text: 'Show SeedQR (secret)' })
    }),
    create: Object.freeze({
      unresolved: 'Vault creation is reached from a quick action whose control has not been confirmed by measurement.'
    })
  })
});

// Builds, for one viewport, the route to every screen the manifest lists.
// Cross-checks the artifact's own navigation against the navigation the
// manifest records before returning, so the two can never drift apart
// unnoticed.
function buildReferenceIndex(set, viewportId) {
  const desktopTemplate = readInertTemplate(set.references.desktop.file);
  const mobileTemplate = readInertTemplate(set.references.mobile.file);
  const flowTitles = parseFlowTitles(readInertFlowSource(set.references[viewportId].file));

  const rails = [
    ...parseRailTable(desktopTemplate, 'WARM_NAV', 'warm'),
    ...parseRailTable(desktopTemplate, 'COLD_NAV', 'cold')
  ];
  const tabs = parseTabTable(mobileTemplate);
  const moreWarm = parseMoreTable(mobileTemplate, 'MORE_WARM');
  const moreCold = parseMoreTable(mobileTemplate, 'MORE_COLD');

  // ui-parity.md section 1: the manifest is the authority and the artifact is
  // the evidence. If they disagree the harness must not proceed - it would be
  // certifying pixels against a navigation nobody approved.
  assert.deepEqual(
    rails.map((group) => ({ realm: group.realm, label: group.label })),
    set.navigation.groups,
    'The artifact rail groups disagree with the manifest navigation'
  );
  assert.deepEqual(
    tabs.map((tab) => tab.label),
    set.navigation.mobileBottomBar,
    'The artifact bottom bar disagrees with the manifest navigation'
  );
  assert.deepEqual(
    moreWarm.map((entry) => entry.label),
    set.navigation.mobileMore.warm,
    'The artifact warm More sheet disagrees with the manifest navigation'
  );
  assert.deepEqual(
    moreCold.map((entry) => entry.label),
    set.navigation.mobileMore.cold,
    'The artifact sealed More sheet disagrees with the manifest navigation'
  );
  assert.deepEqual(
    [...flowTitles.keys()],
    set.flows.map((flow) => flow.id),
    'The artifact flow model disagrees with the manifest flow list'
  );
  for (const flow of set.flows) {
    assert.equal(flowTitles.get(flow.id).title, flow.title, `Flow ${flow.id} title drifted from the artifact`);
    assert.equal(flowTitles.get(flow.id).realm, flow.realm, `Flow ${flow.id} realm drifted from the artifact`);
  }

  const routes = new Map();
  const add = (screen, route) => {
    if (!routes.has(screen)) {
      routes.set(screen, route);
    }
  };

  if (viewportId === 'desktop') {
    for (const group of rails) {
      for (const item of group.items) {
        add(item.screen, { via: 'rail', realm: group.realm, group: group.label, label: item.label });
      }
    }
  } else {
    for (const tab of tabs) {
      if (tab.target !== 'more') {
        add(tab.target, { via: 'tab', realm: 'warm', label: tab.label });
      }
    }
    for (const [realm, entries] of [['warm', moreWarm], ['cold', moreCold]]) {
      for (const entry of entries) {
        add(entry.screen, { via: 'more', realm, label: entry.label });
      }
    }
  }

  // Every flow is reachable from the flow index on both viewports, which is
  // what "moving a tool out of the top level never removed it" means in
  // practice. Rail and More routes win where they exist because they are the
  // approved primary location.
  for (const flow of set.flows) {
    add(`flow:${flow.id}`, { via: 'flow-index', realm: flow.realm, title: flow.title });
  }

  for (const [screen, entry] of Object.entries(REFERENCE_ENTRY_POINTS[viewportId])) {
    add(screen, entry.unresolved
      ? { via: 'unresolved', reason: entry.unresolved }
      : { via: 'entry-point', from: entry.from, control: entry.control });
  }

  const missing = set.references[viewportId].screens.filter((screen) => !routes.has(screen));
  assert.deepEqual(
    missing,
    [],
    `No reference route for ${viewportId} screens: ${missing.join(', ')}`
  );

  // The More sheet's own control label comes from the approved bottom bar, not
  // from a literal in this file, so renaming it in the mock renames it here.
  const moreTab = tabs.filter((tab) => tab.target === 'more');
  assert.equal(moreTab.length, 1, 'The approved bottom bar must declare exactly one More slot');
  return { routes, moreTabLabel: moreTab[0].label };
}

// ---------------------------------------------------------------------------
// PNG pipeline. Pure functions over buffers, no browser, no dependencies.
// Screenshot PNGs only: 8-bit, RGB or RGBA, which is what Playwright emits.
// ---------------------------------------------------------------------------

function decodePng(bytes) {
  assert.equal(bytes.readUInt32BE(0), 0x89504e47, 'Not a PNG');
  let offset = 8;
  const idat = [];
  let width = 0;
  let height = 0;
  let colorType = 0;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'UI.11 only supports 8-bit screenshot PNGs');
      colorType = data[9];
      assert.ok([2, 6].includes(colorType), 'UI.11 expects RGB/RGBA screenshot PNGs');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const sourceStride = width * channels;
  const stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  let previous = Buffer.alloc(sourceStride);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    assert.ok(filter >= 0 && filter <= 4, `Unsupported PNG filter ${filter}`);
    cursor += 1;
    const filtered = Buffer.alloc(sourceStride);
    for (let x = 0; x < sourceStride; x += 1) {
      const value = raw[cursor + x];
      const left = x >= channels ? filtered[x - channels] : 0;
      const above = y > 0 ? previous[x] : 0;
      const upperLeft = y > 0 && x >= channels ? previous[x - channels] : 0;
      let result = value;
      if (filter === 1) result = (value + left) & 0xff;
      if (filter === 2) result = (value + above) & 0xff;
      if (filter === 3) result = (value + Math.floor((left + above) / 2)) & 0xff;
      if (filter === 4) {
        const predictor = left + above - upperLeft;
        const pa = Math.abs(predictor - left);
        const pb = Math.abs(predictor - above);
        const pc = Math.abs(predictor - upperLeft);
        result = (value + (pa <= pb && pa <= pc ? left : (pb <= pc ? above : upperLeft))) & 0xff;
      }
      filtered[x] = result;
    }
    const rowOffset = y * stride;
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = x * 4;
      pixels[rowOffset + target] = filtered[source];
      pixels[rowOffset + target + 1] = filtered[source + 1];
      pixels[rowOffset + target + 2] = filtered[source + 2];
      pixels[rowOffset + target + 3] = channels === 4 ? filtered[source + 3] : 255;
    }
    previous = filtered;
    cursor += sourceStride;
  }
  return { width, height, pixels };
}

// Crops to an explicit device-pixel box. The box always comes from a measured
// element rect - never from a constant - so a change in the reference's
// presentation board moves the crop instead of silently mis-aligning it.
function cropPng(image, box, label) {
  assert.ok(Number.isInteger(box.x) && box.x >= 0, `${label} crop x is not a non-negative integer`);
  assert.ok(Number.isInteger(box.y) && box.y >= 0, `${label} crop y is not a non-negative integer`);
  assert.ok(Number.isInteger(box.width) && box.width > 0, `${label} crop width is not a positive integer`);
  assert.ok(Number.isInteger(box.height) && box.height > 0, `${label} crop height is not a positive integer`);
  assert.ok(box.x + box.width <= image.width, `${label} crop exceeds capture width`);
  assert.ok(box.y + box.height <= image.height, `${label} crop exceeds capture height`);
  const pixels = Buffer.alloc(box.width * box.height * 4);
  for (let row = 0; row < box.height; row += 1) {
    const from = ((box.y + row) * image.width + box.x) * 4;
    image.pixels.copy(pixels, row * box.width * 4, from, from + box.width * 4);
  }
  return { width: box.width, height: box.height, pixels };
}

// Exact comparison. Every differing pixel counts. There is no tolerance
// parameter to pass and no mask to consult: the parity contract's "zero
// unexpected changed pixels" is only meaningful if "unexpected" means "not
// removed by a registered deviation's normalizer before this ran".
function compareImages(reference, product) {
  assert.equal(reference.width, product.width, 'Reference/product capture widths differ');
  assert.equal(reference.height, product.height, 'Reference/product capture heights differ');
  let changedPixels = 0;
  const diff = Buffer.alloc(reference.pixels.length);
  for (let index = 0; index < reference.pixels.length; index += 4) {
    const changed = reference.pixels[index] !== product.pixels[index]
      || reference.pixels[index + 1] !== product.pixels[index + 1]
      || reference.pixels[index + 2] !== product.pixels[index + 2]
      || reference.pixels[index + 3] !== product.pixels[index + 3];
    if (changed) {
      changedPixels += 1;
      diff[index] = 255;
      diff[index + 3] = 255;
    } else {
      diff[index] = reference.pixels[index];
      diff[index + 1] = reference.pixels[index + 1];
      diff[index + 2] = reference.pixels[index + 2];
      diff[index + 3] = 40;
    }
  }
  return { changedPixels, totalPixels: reference.width * reference.height, diff };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  payload.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(payload), 8 + data.length);
  return chunk;
}

function encodePng(image) {
  const rows = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let row = 0; row < image.height; row += 1) {
    const target = row * (image.width * 4 + 1);
    rows[target] = 0;
    image.pixels.copy(rows, target + 1, row * image.width * 4, (row + 1) * image.width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------
// Normalizers.
//
// A normalizer removes a difference the deviation register already permits, so
// that what reaches compareImages() is only difference nobody has authorised.
// Each one names exactly ONE registered PAR id. Each one is deterministic:
// same inputs, same output, no sampling, no tolerance. Each one asserts the
// cardinality of what it selects and throws when it is not what it expects.
//
// A normalizer that is declared but not yet implemented is marked
// `implemented: false`. A row carrying a deviation whose normalizer is not
// implemented is reported PENDING and **cannot pass** - the run exits non-zero.
// This is the difference between "we know this difference is permitted" and
// "we have neutralised it", and collapsing the two is how a parity harness
// starts certifying screens it has not actually compared.
//
// PAR-004 and PAR-006 are registered deviations that the state matrix never
// emits, so they need no normalizer here; `assertNormalizerCoverage()` checks
// the relationship in the direction that matters - every deviation the matrix
// emits has an entry.
// ---------------------------------------------------------------------------

const NORMALIZERS = Object.freeze([
  Object.freeze({
    deviation: 'PAR-008',
    implemented: true,
    summary: 'Unwrap the mobile presentation board to the manifest comparison region.',
    appliesTo: (row) => row.viewport === 'mobile',
    // Geometric and self-locating: the product frame is the unique element
    // whose CSS content box is exactly the comparison region the manifest
    // declares. No offset is hard-coded, so a change to the board's padding
    // moves the crop rather than misaligning every mobile capture. Two
    // candidates, or none, is a failure.
    async measureReferenceCrop(page, comparisonRegion) {
      const boxes = await page.evaluate((region) => {
        const found = [];
        for (const element of document.querySelectorAll('*')) {
          const style = getComputedStyle(element);
          if (Math.round(parseFloat(style.width)) !== region.width) continue;
          if (Math.round(parseFloat(style.height)) !== region.height) continue;
          const rect = element.getBoundingClientRect();
          found.push({
            x: rect.x + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
            y: rect.y + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop)
          });
        }
        return found;
      }, comparisonRegion);
      assert.equal(
        boxes.length,
        1,
        `PAR-008 expects exactly one ${comparisonRegion.width}x${comparisonRegion.height} product frame in the mobile reference, found ${boxes.length}`
      );
      const [box] = boxes;
      for (const [axis, value] of [['x', box.x], ['y', box.y]]) {
        assert.ok(
          Math.abs(value - Math.round(value)) < 1e-6,
          `PAR-008 product frame ${axis} is not on a whole device pixel (${value}); a fractional crop is not deterministic`
        );
      }
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: comparisonRegion.width,
        height: comparisonRegion.height
      };
    }
  }),
  Object.freeze({
    deviation: 'PAR-001',
    implemented: false,
    summary: 'Substitute the shipped light-theme token values for the three superseded handoff values.',
    appliesTo: (row) => row.realm === 'warm',
    pendingReason: 'The state matrix emits only dark-theme rows today, so there is no light-theme capture for this to act on. Resolve alongside the matrix\'s theme axis.'
  }),
  Object.freeze({
    deviation: 'PAR-002',
    implemented: false,
    summary: 'Truthful product language and final brand assets replace mock-only wording and art.',
    appliesTo: (row) => row.realm === 'warm',
    pendingReason: 'Needs the shipped warm shell to compare against; the substitution table is defined by what UI.10b renders.'
  }),
  Object.freeze({
    deviation: 'PAR-003',
    implemented: false,
    summary: 'Realm isolation, secret handling, calm-panel behaviour and accessibility override unsafe prototype treatment, including the cold realm\'s reviewed system font.',
    appliesTo: (row) => row.realm === 'cold',
    pendingReason: 'Needs the shipped sealed shell; UI.10b pass 2 has not composed the sealed screens.'
  }),
  Object.freeze({
    deviation: 'PAR-005',
    implemented: false,
    summary: 'Availability labels and roadmap phases come from ROADMAP.md at build time, not the frozen prototype\'s statuses.',
    appliesTo: () => true,
    pendingReason: 'The substitution needs both sides: the corrected owner is known from the manifest module, the rendered target format is whatever UI.10b ships.'
  }),
  Object.freeze({
    deviation: 'PAR-007',
    implemented: false,
    summary: 'Demo names, times, balances, addresses and fingerprints are replaced by the same deterministic public fixture on both sides.',
    appliesTo: () => true,
    pendingReason: 'A fixture substitution is only meaningful when both sides can be driven to the same fixture; the product half does not exist yet.'
  }),
  Object.freeze({
    deviation: 'PAR-009',
    implemented: false,
    summary: 'An unbuilt later-roadmap screen shows its approved unavailable treatment rather than a fake working surface.',
    appliesTo: (row) => row.classification === 'UNAVAILABLE',
    pendingReason: 'Comparing the unavailable treatment needs the shipped disabled navigation state from UI.10b.'
  })
]);

function assertNoMasks(manifest) {
  assert.deepEqual(
    manifest.allowedPixelMasks,
    [],
    'UI.11 refuses to run with a pixel mask declared: the contract forbids masks and thresholds'
  );
}

// The registry and the state matrix must agree in the direction that matters:
// nothing the matrix emits may be unaccounted for. A deviation with no entry
// here would silently become "difference we tolerate because nobody wrote it
// down", which is a mask by another name.
function assertNormalizerCoverage(manifest, rows) {
  const declared = NORMALIZERS.map((normalizer) => normalizer.deviation);
  assert.equal(new Set(declared).size, declared.length, 'Two normalizers claim the same deviation id');
  for (const normalizer of NORMALIZERS) {
    assert.equal(typeof normalizer.deviation, 'string', 'A normalizer does not name a deviation');
    assert.ok(
      manifest.allowedDeviationIds.includes(normalizer.deviation),
      `Normalizer names unregistered deviation ${normalizer.deviation}`
    );
    assert.equal(
      typeof normalizer.summary === 'string' && normalizer.summary.length > 0,
      true,
      `Normalizer ${normalizer.deviation} has no summary`
    );
  }
  const emitted = new Set(rows.flatMap((row) => row.deviations));
  const uncovered = [...emitted].filter((id) => !declared.includes(id)).sort();
  assert.deepEqual(
    uncovered,
    [],
    `The state matrix emits deviations with no normalizer: ${uncovered.join(', ')}`
  );
}

// The deviations a row depends on, and whether all of them are neutralised.
function rowNormalizers(row) {
  return NORMALIZERS.filter(
    (normalizer) => row.deviations.includes(normalizer.deviation) && normalizer.appliesTo(row)
  );
}

function pendingDeviations(row) {
  return rowNormalizers(row)
    .filter((normalizer) => !normalizer.implemented)
    .map((normalizer) => normalizer.deviation);
}

// ---------------------------------------------------------------------------
// The product side.
//
// UI.10b gives the warm shell stable `data-nav` handles on `#nav-rail` and
// `#route/section` deep links, so the product is driven by handle and never by
// visible text. Screens whose surface UI.10b has not composed yet carry an
// explicit `pending` reason instead of a handle: those rows are reported
// PENDING and fail. They are never skipped, and the reason travels into the
// report so the remaining work is legible from the artifacts alone.
// ---------------------------------------------------------------------------

const COLD_SHELL_PENDING = 'UI.10b pass 2 has not composed the sealed screens; no stable handle exists yet.';
const UNAVAILABLE_PENDING = 'Needs the shipped disabled-navigation treatment for a roadmap-owned destination.';

const PRODUCT_NAV = Object.freeze({
  home: Object.freeze({ realm: 'warm', nav: 'home' }),
  wallets: Object.freeze({ realm: 'warm', nav: 'wallets' }),
  walletDetail: Object.freeze({ realm: 'warm', pending: 'The wallet detail object view is not a routed destination yet.' }),
  seeds: Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  seedDetail: Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  seedqr: Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  backup: Object.freeze({ realm: 'warm', nav: 'backup' }),
  portfolio: Object.freeze({ realm: 'warm', nav: 'portfolio' }),
  security: Object.freeze({ realm: 'warm', nav: 'security' }),
  reference: Object.freeze({ realm: 'warm', nav: 'reference' }),
  advanced: Object.freeze({ realm: 'warm', nav: 'all-flows' }),
  vault: Object.freeze({ realm: 'warm', nav: 'vault-files' }),
  create: Object.freeze({ realm: 'warm', pending: 'Vault creation is a sealed-realm flow; UI.10b has not composed it.' }),
  lock: Object.freeze({ realm: 'warm', pending: 'The lock/panic end state is not a routed destination yet.' }),
  'flow:entropy': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:transfer': Object.freeze({ realm: 'warm', nav: 'vault-transfer' }),
  'flow:settings': Object.freeze({ realm: 'warm', nav: 'settings' }),
  'flow:forge': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:passphrase': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:notes': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:paths': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:addresses': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:children': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:descriptors': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:shares': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:combine': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:qrstudio': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:recovery': Object.freeze({ realm: 'cold', pending: COLD_SHELL_PENDING }),
  'flow:verifybench': Object.freeze({ realm: 'warm', nav: 'security-verify-bench' }),
  'flow:registry': Object.freeze({ realm: 'warm', nav: 'registry' }),
  'flow:devices': Object.freeze({ realm: 'warm', nav: 'devices' }),
  'flow:prices': Object.freeze({ realm: 'warm', nav: 'prices' }),
  'flow:taxes': Object.freeze({ realm: 'warm', nav: 'taxes' }),
  'flow:backuphealth': Object.freeze({ realm: 'warm', nav: 'backup-health' }),
  'flow:verifyfile': Object.freeze({ realm: 'warm', nav: 'verify-file' }),
  'flow:provenance': Object.freeze({ realm: 'warm', nav: 'provenance' }),
  'flow:learn': Object.freeze({ realm: 'warm', nav: 'learn' }),
  'flow:toolmap': Object.freeze({ realm: 'warm', nav: 'tool-map' }),
  'flow:empty': Object.freeze({ realm: 'warm', pending: 'The first-run empty state needs a deterministic empty registry fixture.' }),
  'flow:unlock': Object.freeze({ realm: 'warm', nav: 'vault-session' }),
  'flow:send': Object.freeze({ realm: 'warm', pending: UNAVAILABLE_PENDING }),
  'flow:signing': Object.freeze({ realm: 'cold', pending: UNAVAILABLE_PENDING }),
  'flow:broadcast': Object.freeze({ realm: 'warm', pending: UNAVAILABLE_PENDING }),
  'flow:psbt': Object.freeze({ realm: 'warm', pending: UNAVAILABLE_PENDING }),
  'flow:coincontrol': Object.freeze({ realm: 'warm', pending: UNAVAILABLE_PENDING }),
  'flow:source': Object.freeze({ realm: 'warm', pending: UNAVAILABLE_PENDING })
});

// A screen the manifest lists and this table does not is a screen the harness
// would quietly not compare. Both directions are checked.
function assertProductNavCoverage(set) {
  const screens = set.references.desktop.screens;
  const missing = screens.filter((screen) => !Object.hasOwn(PRODUCT_NAV, screen));
  assert.deepEqual(missing, [], `PRODUCT_NAV has no entry for: ${missing.join(', ')}`);
  const stale = Object.keys(PRODUCT_NAV).filter((screen) => !screens.includes(screen));
  assert.deepEqual(stale, [], `PRODUCT_NAV carries entries no manifest screen uses: ${stale.join(', ')}`);
  for (const [screen, entry] of Object.entries(PRODUCT_NAV)) {
    assert.ok(['warm', 'cold'].includes(entry.realm), `PRODUCT_NAV ${screen} declares an unknown realm`);
    assert.equal(
      Boolean(entry.nav) !== Boolean(entry.pending),
      true,
      `PRODUCT_NAV ${screen} must declare exactly one of nav or pending`
    );
  }
}

// ---------------------------------------------------------------------------
// Browser drivers.
// ---------------------------------------------------------------------------

function fileUrl(file) {
  return pathToFileURL(file).href;
}

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

// Clicks exactly one visible control, or throws. `predicate` runs in the page
// and must be a pure function of the element. Every reference-side click in
// this file goes through here so that "fails on unexpected selector
// cardinality" is a property of the harness rather than of each call site.
async function clickUnique(page, description, matcher) {
  const outcome = await page.evaluate(({ kind, argument }) => {
    const collapse = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const visible = [...document.querySelectorAll('button, [role="button"]')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    });
    let hits = [];
    if (kind === 'rail-item') {
      // A rail entry is a control whose label span matches and whose group
      // container opens with the approved group title. Both halves come from
      // the artifact's own navigation table, so this cannot drift from the
      // approved grouping - and it separates the rail entry from a summary
      // card on the landing screen that happens to carry the same word.
      hits = visible.filter((element) => {
        if (![...element.children].some((child) => collapse(child.textContent) === argument.label)) {
          return false;
        }
        const group = element.parentElement;
        return Boolean(group) && collapse(group.textContent).startsWith(argument.group);
      });
    } else if (kind === 'child-label') {
      hits = visible.filter((element) => [...element.children]
        .some((child) => collapse(child.textContent) === argument.label));
    } else if (kind === 'own-text') {
      hits = visible.filter((element) => element.children.length === 0
        && collapse(element.textContent).toLowerCase() === argument.text.toLowerCase());
    } else if (kind === 'text') {
      hits = visible.filter((element) => collapse(element.innerText).toLowerCase() === argument.text.toLowerCase());
    } else if (kind === 'realm') {
      const wanted = argument.realm === 'warm' ? 'warm shell' : 'sealed realm';
      hits = visible.filter((element) => {
        const text = collapse(element.innerText).toLowerCase();
        return element.children.length === 0 && text.endsWith(wanted);
      });
    } else if (kind === 'flow-entry') {
      // The flow index composes each entry differently on the two viewports -
      // desktop leads with the roadmap tag, mobile with the family - so the
      // match is on any child element whose text ends with the approved flow
      // title, not on a fixed child position. Two entries ending in the same
      // title would fail on cardinality rather than pick one.
      const wantedTitle = argument.title.toLowerCase();
      const titleMatches = (value) => {
        const text = collapse(value).toLowerCase();
        return text.endsWith(wantedTitle) || text.includes(`${wantedTitle} \u203a`);
      };
      hits = visible.filter((element) => [...element.children].some((child) => titleMatches(child.textContent)));
    } else if (kind === 'record') {
      // A record row is an outermost pointer-cursor region big enough to be a
      // list row. Selecting by geometry and interactivity rather than by demo
      // text keeps the choice independent of PAR-007 fixture content, which is
      // exactly the text a normalizer will later replace. "Outermost" avoids
      // selecting a control nested inside the row.
      const clickable = [...document.querySelectorAll('*')].filter((element) => {
        const rect = element.getBoundingClientRect();
        return getComputedStyle(element).cursor === 'pointer' && rect.width >= 240 && rect.height >= 56;
      });
      hits = clickable.filter((element) => !clickable.some((other) => other !== element && other.contains(element)));
    }
    if (argument.index !== undefined) {
      // Ordered selection still asserts the whole set's size; the caller says
      // how many rows it expects to exist before picking one.
      if (argument.expected !== null && argument.expected !== undefined && hits.length !== argument.expected) {
        return {
          count: hits.length,
          seen: hits.map((element) => collapse(element.innerText).slice(0, 44))
        };
      }
      const sorted = hits.sort((left, right) => left.getBoundingClientRect().y - right.getBoundingClientRect().y);
      const chosen = sorted[argument.index];
      if (!chosen) {
        return { count: hits.length, seen: hits.map((element) => collapse(element.innerText).slice(0, 44)) };
      }
      chosen.click();
      return { count: 1 };
    }
    if (hits.length !== 1) {
      return {
        count: hits.length,
        // A harness that only says "0" makes every failure a fresh
        // investigation. Saying what it did see turns it into a fix.
        seen: visible.slice(0, 40).map((element) => collapse(element.innerText).slice(0, 44))
      };
    }
    hits[0].click();
    return { count: 1 };
  }, matcher);
  assert.equal(
    outcome.count,
    1,
    `${description} did not select exactly one control (matched ${outcome.count}); visible controls: ${JSON.stringify(outcome.seen || [])}`
  );
  await page.waitForTimeout(INTERACTION_SETTLE_MS);
}

async function openReferencePage(browser, set, viewportId, temporaryRoot) {
  const reference = set.references[viewportId];
  // The artifacts use a non-HTML final extension deliberately, so a browser
  // will not parse them in place. A disposable copy under a .html name is the
  // only way to render one, and it is deleted with the temporary root.
  const disposable = path.join(temporaryRoot, `${viewportId}.html`);
  fs.copyFileSync(path.join(referenceRoot, reference.file), disposable);
  const context = await browser.newContext({
    viewport: reference.renderViewport,
    deviceScaleFactor: 1,
    offline: true,
    reducedMotion: 'reduce'
  });
  // The reference handling rule: rendered only with network access blocked.
  await context.route('**/*', (route) => (
    route.request().url().startsWith('file:') ? route.continue() : route.abort()
  ));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(fileUrl(disposable), { waitUntil: 'load' });
  await page.waitForTimeout(REFERENCE_SETTLE_MS);
  assert.deepEqual(errors, [], `The ${viewportId} reference raised page errors while rendering`);
  return { context, page, url: fileUrl(disposable) };
}

// Every row starts from a reloaded document. The prototype keeps selection
// state - a chosen lens can remove the control the next row needs - so a fresh
// mount is the only way each row is an independent deterministic state.
async function resetReference(reference) {
  await reference.page.goto(reference.url, { waitUntil: 'load' });
  await reference.page.waitForTimeout(REFERENCE_SETTLE_MS);
}

// The approved masthead states the realm two different ways: desktop carries a
// two-segment control, mobile a single pill that shows the realm you are in.
// Both are handled here, and both assert their cardinality - one segment on
// desktop, or three pills on mobile, means the masthead changed and the
// harness must stop rather than guess which control moves realms.
async function selectReferenceRealm(page, realm) {
  const wanted = realm === 'warm' ? 'warm shell' : 'sealed realm';
  const outcome = await page.evaluate((target) => {
    const collapse = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    // The masthead sits at the top of the composition on both viewports. The
    // flow index renders realm *filter* chips with the same words further down
    // the page, so the search is bounded to the masthead band rather than
    // relying on the chips never matching.
    const controls = [...document.querySelectorAll('button, [role="button"]')].filter((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.y > 220) return false;
      const text = collapse(element.innerText);
      return text.endsWith('warm shell') || text.endsWith('sealed realm');
    });
    if (controls.length === 2) {
      const segment = controls.filter((element) => collapse(element.innerText).endsWith(target));
      if (segment.length !== 1) return { kind: 'segment', count: segment.length };
      segment[0].click();
      return { kind: 'ok' };
    }
    if (controls.length === 1) {
      if (collapse(controls[0].innerText).endsWith(target)) return { kind: 'ok' };
      controls[0].click();
      return { kind: 'ok' };
    }
    return {
      kind: 'masthead',
      count: controls.length,
      seen: [...document.querySelectorAll('button, [role="button"]')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.y <= 260;
        })
        .map((element) => collapse(element.innerText).slice(0, 40))
    };
  }, wanted);
  assert.equal(
    outcome.kind,
    'ok',
    `Reference realm control for ${realm} did not resolve (${outcome.kind} cardinality ${outcome.count}); masthead-band controls seen: ${JSON.stringify(outcome.seen || [])}`
  );
  await page.waitForTimeout(INTERACTION_SETTLE_MS);
}

async function selectReferenceScreen(page, viewportId, row, route, index, depth = 0) {
  const { routes, moreTabLabel } = index;
  assert.ok(depth <= 3, `Reference route for ${row.id} nests entry points more than three deep`);
  if (route.via === 'rail') {
    if (route.realm !== 'warm') {
      await selectReferenceRealm(page, route.realm);
    }
    await clickUnique(page, `Reference rail entry ${route.group} / ${route.label} for ${row.id}`, {
      kind: 'rail-item',
      argument: { label: route.label, group: route.group }
    });
    return;
  }
  if (route.via === 'tab') {
    await clickUnique(page, `Reference bottom-bar tab ${route.label} for ${row.id}`, {
      kind: 'child-label',
      argument: { label: route.label }
    });
    return;
  }
  if (route.via === 'more') {
    if (route.realm === 'cold') {
      await selectReferenceRealm(page, 'cold');
    }
    await clickUnique(page, `Reference More control for ${row.id}`, {
      kind: 'child-label',
      argument: { label: moreTabLabel }
    });
    await clickUnique(page, `Reference More entry ${route.label} for ${row.id}`, {
      kind: 'child-label',
      argument: { label: route.label }
    });
    return;
  }
  if (route.via === 'flow-index') {
    const index = viewportId === 'desktop'
      ? { kind: 'child-label', argument: { label: 'All flows index' } }
      : { kind: 'child-label', argument: { label: 'Every flow' } };
    if (viewportId === 'mobile') {
      await clickUnique(page, `Reference More control for ${row.id}`, {
        kind: 'child-label',
        argument: { label: moreTabLabel }
      });
    }
    await clickUnique(page, `Reference flow index for ${row.id}`, index);
    await clickUnique(page, `Reference flow entry ${route.title} for ${row.id}`, {
      kind: 'flow-entry',
      argument: { title: route.title }
    });
    return;
  }
  assert.equal(route.via, 'entry-point', `Unknown reference route kind ${route.via} for ${row.id}`);
  const parent = routes.get(route.from);
  assert.ok(parent, `Reference entry point for ${row.id} starts from unknown screen ${route.from}`);
  await selectReferenceScreen(page, viewportId, row, parent, index, depth + 1);
  const control = route.control;
  if (control.kind === 'text') {
    await clickUnique(page, `Reference entry-point control for ${row.id}`, {
      kind: 'text',
      argument: { text: control.text }
    });
    return;
  }
  assert.equal(control.kind, 'record', `Unknown entry-point control kind for ${row.id}`);
  await clickUnique(page, `Reference record row for ${row.id}`, {
    kind: 'record',
    argument: { index: control.index, expected: control.expected }
  });
}

async function openProductPage(browser, set, viewportId) {
  assert.ok(
    fs.existsSync(buildPath),
    'build/coldbox.html is missing. UI.11 compares the built artifact, so run `npm run build` first.'
  );
  const viewport = viewportId === 'mobile'
    ? { ...set.references.mobile.comparisonRegion }
    : { ...set.references.desktop.renderViewport };
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  await page.goto(fileUrl(buildPath), { waitUntil: 'load' });
  // The boot self-check must have established the cold realm before anything
  // is captured; a product screenshot taken mid-bootstrap is not a state the
  // reference has a counterpart for.
  await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 20000 });
  return { context, page };
}

async function selectProductScreen(page, row) {
  const entry = PRODUCT_NAV[row.screen];
  assert.ok(entry, `No product route for ${row.screen}`);
  assert.ok(entry.nav, `Product route for ${row.screen} is pending and must not be captured`);
  const rail = page.locator(`#nav-rail [data-nav="${entry.nav}"]`);
  const count = await rail.count();
  assert.equal(count, 1, `Product handle data-nav="${entry.nav}" for ${row.id} matched ${count} elements`);
  await rail.click();
  await page.waitForTimeout(INTERACTION_SETTLE_MS);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('[data-scroll-region]').forEach((region) => {
      region.scrollTop = 0;
    });
  });
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

const ENGINES = Object.freeze({ chromium, firefox });

function parseArguments(argv) {
  const options = {
    engines: ['chromium', 'firefox'],
    out: defaultArtifactRoot,
    referenceOnly: false,
    rows: null
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--engine') {
      const value = argv[index + 1];
      assert.ok(Object.hasOwn(ENGINES, value), `--engine must be one of ${Object.keys(ENGINES).join(', ')}`);
      options.engines = [value];
      index += 1;
    } else if (argument === '--out') {
      const value = argv[index + 1];
      assert.ok(value, '--out requires a directory');
      options.out = path.resolve(value);
      index += 1;
    } else if (argument === '--rows') {
      const value = argv[index + 1];
      assert.ok(value, '--rows requires a comma-separated list of row ids');
      options.rows = value.split(',').map((entry) => entry.trim()).filter(Boolean);
      index += 1;
    } else if (argument === '--reference-only') {
      options.referenceOnly = true;
    } else {
      assert.fail(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

async function runParity(options = {}) {
  const settings = { engines: ['chromium', 'firefox'], out: defaultArtifactRoot, referenceOnly: false, rows: null, ...options };
  const manifest = readManifest();
  verifyReferenceBytes(manifest);
  assertNoMasks(manifest);
  const set = currentSet(manifest);
  assertProductNavCoverage(set);

  const allRows = createStateMatrix(manifest);
  assertNormalizerCoverage(manifest, allRows);
  const rows = settings.rows
    ? allRows.filter((row) => settings.rows.includes(row.id))
    : allRows;
  if (settings.rows) {
    const unknown = settings.rows.filter((id) => !allRows.some((row) => row.id === id));
    assert.deepEqual(unknown, [], `--rows names states that are not in the matrix: ${unknown.join(', ')}`);
  }

  fs.rmSync(settings.out, { recursive: true, force: true });
  fs.mkdirSync(settings.out, { recursive: true });
  fs.writeFileSync(path.join(settings.out, 'state-matrix.json'), `${JSON.stringify(allRows, null, 2)}\n`);

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-ui11-reference-'));
  const results = [];
  try {
    for (const engineId of settings.engines) {
      const browser = await ENGINES[engineId].launch({ headless: true });
      try {
        for (const viewportId of ['desktop', 'mobile']) {
          const viewportRows = rows.filter((row) => row.viewport === viewportId);
          if (viewportRows.length === 0) {
            continue;
          }
          const reference = await openReferencePage(browser, set, viewportId, temporaryRoot);
          const index = buildReferenceIndex(set, viewportId);
          const routes = index.routes;
          let product = null;
          try {
            for (const row of viewportRows) {
              const pending = pendingDeviations(row);
              const productEntry = PRODUCT_NAV[row.screen];
              const route = routes.get(row.screen);
              assert.ok(route, `No reference route for ${row.id}`);
              const blockers = [
                ...pending.map((id) => `normalizer for ${id} is not implemented`),
                ...(productEntry.pending ? [`product surface not shipped: ${productEntry.pending}`] : []),
                ...(route.via === 'unresolved' ? [`reference entry point not resolved: ${route.reason}`] : [])
              ];

              if (route.via === 'unresolved') {
                results.push({
                  engine: engineId,
                  ...row,
                  captureWidth: null,
                  captureHeight: null,
                  referenceArtifact: null,
                  appliedNormalizers: rowNormalizers(row).map((entry) => entry.deviation),
                  pendingNormalizers: pending,
                  status: 'PENDING',
                  blockers,
                  changedPixels: null,
                  totalPixels: null
                });
                continue;
              }

              await resetReference(reference);
              await selectReferenceScreen(reference.page, viewportId, row, route, index);

              const cropBox = viewportId === 'mobile'
                ? await NORMALIZERS.find((entry) => entry.deviation === 'PAR-008')
                  .measureReferenceCrop(reference.page, set.references.mobile.comparisonRegion)
                : { x: 0, y: 0, ...set.references.desktop.comparisonRegion };
              const referenceImage = cropPng(
                decodePng(await reference.page.screenshot()),
                { x: cropBox.x, y: cropBox.y, width: cropBox.width, height: cropBox.height },
                `${row.id} reference`
              );

              const prefix = `${engineId}-${safeName(row.id)}`;
              fs.writeFileSync(path.join(settings.out, `${prefix}-reference.png`), encodePng(referenceImage));

              const record = {
                engine: engineId,
                ...row,
                captureWidth: referenceImage.width,
                captureHeight: referenceImage.height,
                referenceArtifact: `${prefix}-reference.png`,
                appliedNormalizers: rowNormalizers(row).map((entry) => entry.deviation),
                pendingNormalizers: pending
              };

              if (settings.referenceOnly || blockers.length > 0) {
                results.push({
                  ...record,
                  status: settings.referenceOnly && blockers.length === 0 ? 'REFERENCE-ONLY' : 'PENDING',
                  blockers,
                  changedPixels: null,
                  totalPixels: referenceImage.width * referenceImage.height
                });
                continue;
              }

              if (!product) {
                product = await openProductPage(browser, set, viewportId);
              }
              await selectProductScreen(product.page, row);
              const productImage = decodePng(await product.page.screenshot());
              const comparison = compareImages(referenceImage, productImage);
              fs.writeFileSync(path.join(settings.out, `${prefix}-product.png`), encodePng(productImage));
              fs.writeFileSync(path.join(settings.out, `${prefix}-diff.png`), encodePng({
                width: referenceImage.width,
                height: referenceImage.height,
                pixels: comparison.diff
              }));
              results.push({
                ...record,
                status: comparison.changedPixels === 0 ? 'PASS' : 'FAIL',
                blockers: [],
                productArtifact: `${prefix}-product.png`,
                diffArtifact: `${prefix}-diff.png`,
                changedPixels: comparison.changedPixels,
                totalPixels: comparison.totalPixels
              });
            }
          } finally {
            await reference.context.close();
            if (product) {
              await product.context.close();
            }
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

  const counts = results.reduce((totals, row) => {
    totals[row.status] = (totals[row.status] || 0) + 1;
    return totals;
  }, {});
  const unexpectedChangedPixels = results.reduce((sum, row) => sum + (row.changedPixels || 0), 0);
  const report = Object.freeze({
    schema: RESULTS_SCHEMA,
    currentSet: set.id,
    engines: settings.engines,
    referenceOnly: settings.referenceOnly,
    allowedPixelMasks: manifest.allowedPixelMasks,
    deviationRegister: manifest.allowedDeviationIds,
    normalizers: NORMALIZERS.map((entry) => ({
      deviation: entry.deviation,
      implemented: entry.implemented,
      summary: entry.summary,
      pendingReason: entry.pendingReason || null
    })),
    counts,
    unexpectedChangedPixels,
    rows: results
  });
  fs.writeFileSync(path.join(settings.out, 'totals.json'), `${JSON.stringify(report, null, 2)}\n`);

  const summary = Object.entries(counts).map(([status, value]) => `${status}=${value}`).join(' ');
  console.log(`UI.11 parity: ${results.length} row(s) [${summary}]; unexpected changed pixels: ${unexpectedChangedPixels}`);
  for (const row of results.filter((entry) => entry.status === 'PENDING')) {
    console.log(`  PENDING ${row.engine}/${row.id}: ${row.blockers.join('; ')}`);
  }

  if (settings.referenceOnly) {
    // Reference-only proves the reference half: every row reached its state and
    // captured at the manifest region. It never certifies parity.
    assert.equal(counts.FAIL || 0, 0, 'UI.11 reference-only run recorded a failing row');
    return report;
  }
  assert.equal(unexpectedChangedPixels, 0, 'UI.11 parity has unexpected changed pixels');
  assert.equal(counts.FAIL || 0, 0, 'UI.11 parity has failing rows');
  assert.equal(
    counts.PENDING || 0,
    0,
    `UI.11 parity has ${counts.PENDING || 0} row(s) that could not be compared; the item cannot close until every row is certified`
  );
  return report;
}

if (require.main === module) {
  const options = parseArguments(process.argv);
  runParity(options).catch((error) => {
    console.error(`UI.11 parity failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({
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
  rowNormalizers,
  runParity
});
