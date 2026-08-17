'use strict';

// UI.11 owns the visual proof pipeline. The approved references are untrusted
// evidence: this module copies each immutable byte stream to a disposable
// .html path, blocks every non-file request, and never exposes the reference
// source to the product build.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { pathToFileURL } = require('node:url');
const { chromium, firefox } = require('playwright');

const projectRoot = path.resolve(__dirname, '..');
const buildPath = path.join(projectRoot, 'build', 'coldbox.html');
const manifestPath = path.join(
  projectRoot,
  'docs',
  '05-development',
  'ui-reference',
  'approved',
  'manifest.json'
);
const referenceRoot = path.dirname(manifestPath);
const artifactRoot = path.join(projectRoot, 'test', 'output', 'ui11');

const SCREEN_OWNERS = Object.freeze({
  dashboard: [],
  portfolio: ['P3.4'],
  qrpublic: ['P1.10'],
  addrbench: ['P1.9', 'P1.11', 'P1.12'],
  registry: ['P1.6', 'P1.7', 'P1.11'],
  devices: ['P1.8'],
  vault: ['P0.13', 'UI.10'],
  unlock: ['P0.13', 'UI.10'],
  learn: ['P0.17'],
  empty: ['UI.3', 'UI.4'],
  entropy: ['P1.1', 'P1.2'],
  forge: ['P1.3'],
  secret: ['UI.3'],
  paths: ['P1.4', 'P1.5'],
  addresses: ['P1.4', 'P1.5'],
  children: ['P4.6'],
  shares: ['P2.1', 'P2.2', 'P2.3', 'P2.4', 'P2.5'],
  qr: ['P1.10'],
  lock: ['P0.13'],
  map: ['UI.9'],
  prices: ['P3.1', 'P3.2', 'P3.3'],
  taxes: ['P3.7', 'P3.8', 'P3.9'],
  reference: ['P4.10'],
  settings: [],
  verifyfile: ['P0.16'],
  provenance: ['P0.16', 'P0.20'],
  passphrase: ['P4.5'],
  conceal: ['P1.7'],
  notes: ['P1.7'],
  descriptors: ['P4.9'],
  backuphealth: ['P2.6', 'P2.7'],
  recovery: ['P4.3a', 'P4.3b', 'P4.3c', 'P4.3d', 'P4.3e'],
  verifybench: ['P1.9'],
  hub: ['UI.4'],
  validate: ['P1.3']
});

const SCREEN_REALM = Object.freeze({
  dashboard: 'warm', qrpublic: 'warm', addrbench: 'warm', registry: 'warm',
  devices: 'warm', vault: 'warm', learn: 'warm', map: 'warm', settings: 'warm',
  verifyfile: 'warm', provenance: 'warm', backuphealth: 'warm',
  portfolio: 'warm', prices: 'warm', taxes: 'warm', reference: 'warm',
  unlock: 'cold', empty: 'cold', entropy: 'cold', forge: 'cold', secret: 'cold',
  paths: 'cold', addresses: 'cold', children: 'cold', shares: 'cold', qr: 'cold',
  lock: 'cold', passphrase: 'cold', conceal: 'cold', notes: 'cold', descriptors: 'cold',
  recovery: 'cold', verifybench: 'cold', hub: 'cold', validate: 'cold'
});

// The shipped Backup Health calculation is warm-owned, while the approved
// prototype places its visual lens in the cold rail. Keep both facts explicit
// so the product is not moved across the realm boundary just to copy the
// quarantined prototype.
const REFERENCE_REALM = Object.freeze({ backuphealth: 'cold' });

const PRODUCT_WARM_ROUTES = Object.freeze({
  dashboard: 'dashboard', qrpublic: 'qr', addrbench: 'verify', registry: 'registry',
  devices: 'devices', vault: 'vault', learn: 'learn', map: 'tool-map',
  verifyfile: 'reference', provenance: 'reference', backuphealth: 'dashboard',
  portfolio: 'portfolio', prices: 'prices', taxes: 'prices', reference: 'reference',
  settings: 'dashboard'
});

const REFERENCE_LABELS = Object.freeze({
  dashboard: 'Dashboard', qrpublic: 'QR Studio', addrbench: 'Address bench',
  registry: 'Registry', devices: 'Devices', vault: 'Vault files', learn: 'Learn',
  map: 'Tool map', verifyfile: 'Verify this file', provenance: 'Provenance & legal',
  backuphealth: 'Backup Health', portfolio: 'Portfolio', prices: 'Prices & FX',
  taxes: 'Tax & exports', reference: 'Reference', settings: 'Settings',
  unlock: 'Vault session', empty: 'Tool hub', entropy: 'Entropy Lab', forge: 'Seed Forge',
  secret: 'Active secret', paths: 'Derivation paths', addresses: 'Addresses',
  children: 'Child seeds', shares: 'Split lab', qr: 'SeedQR studio', lock: 'Lock all',
  passphrase: 'Passphrase Studio', conceal: 'Reveal hidden', notes: 'Secret notes',
  descriptors: 'Descriptors', recovery: 'Recovery Assistant', verifybench: 'Verify Bench',
  hub: 'Tool hub', validate: 'Seed Forge'
});

const REFERENCE_MOBILE_LABELS = Object.freeze({
  dashboard: 'Home', settings: 'Set', secret: 'Secret', forge: 'Forge',
  paths: 'Derivation paths', addresses: 'Addresses', children: 'Child seeds',
  shares: 'Split', entropy: 'Forge', hub: 'Hub', registry: 'Records',
  empty: 'No secret yet',
  devices: 'Devices', vault: 'Vault', learn: 'Learn', verifyfile: 'Verify this file',
  provenance: 'Provenance & legal', qrpublic: 'QR Studio', addrbench: 'Address bench',
  backuphealth: 'Backup Health', qr: 'SeedQR studio', conceal: 'Reveal hidden',
  notes: 'Secret notes', lock: 'Lock & wipe', unlock: 'Vault session',
  verifybench: 'Verify Bench', validate: 'Validate'
});

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schema, 'coldbox.approved-ui-reference.v1');
  assert.deepEqual(manifest.allowedPixelMasks, []);
  for (const id of manifest.allowedDeviationIds) {
    assert.match(id, /^PAR-00[1-9]$/);
  }
  return manifest;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function verifyReferenceBytes(manifest) {
  for (const [id, reference] of Object.entries(manifest.references)) {
    const file = path.join(referenceRoot, reference.file);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, reference.bytes, `${id} reference length changed`);
    assert.equal(sha256(bytes), reference.sha256, `${id} reference hash changed`);
  }
}

function parseRoadmapStatuses() {
  const roadmap = fs.readFileSync(path.join(projectRoot, 'docs', '05-development', 'ROADMAP.md'), 'utf8');
  const statuses = new Map();
  for (const line of roadmap.split(/\r?\n/)) {
    const match = /^\s*- \[([ x~])\]/.exec(line);
    if (!match) {
      continue;
    }
    const ids = line.match(/\b(?:P\d+(?:\.\d+)?[a-z]?|UI\.\d+[a-z]?)\b/g) || [];
    for (const id of ids) {
      statuses.set(id, match[1]);
    }
  }
  return statuses;
}

function classifyScreen(screen, statuses) {
  const owners = SCREEN_OWNERS[screen];
  assert.ok(owners, `No UI.11 owner mapping for manifest screen ${screen}`);
  for (const owner of owners) {
    assert.ok(statuses.has(owner), `UI.11 owner ${owner} for ${screen} is absent from ROADMAP.md`);
  }
  if (owners.length === 0) {
    return 'PARITY';
  }
  return owners.some((owner) => statuses.get(owner) === 'x') ? 'PARITY' : 'UNAVAILABLE';
}

function createStateMatrix(manifest) {
  const statuses = parseRoadmapStatuses();
  const rows = [];
  for (const [viewportId, reference] of Object.entries(manifest.references)) {
    for (const screen of reference.screens) {
      const classification = classifyScreen(screen, statuses);
      const realm = SCREEN_REALM[screen];
      assert.ok(realm, `No realm mapping for manifest screen ${screen}`);
      const deviations = realm === 'cold' ? ['PAR-003', 'PAR-005', 'PAR-007'] : ['PAR-001', 'PAR-002', 'PAR-005', 'PAR-007'];
      if (REFERENCE_REALM[screen] && REFERENCE_REALM[screen] !== realm) {
        deviations.push('PAR-003');
      }
      if (classification === 'UNAVAILABLE') {
        deviations.push('PAR-009');
      }
      rows.push({
        id: `${viewportId}/${screen}`,
        viewport: viewportId,
        theme: realm === 'cold' ? 'dark' : 'dark',
        screen,
        realm,
        focus: 'none',
        reveal: 'masked',
        menu: 'closed',
        owner: Object.freeze([...(SCREEN_OWNERS[screen] || [])]),
        classification,
        deviations: [...new Set(deviations)]
      });
    }
  }
  const ids = new Set(rows.map((row) => row.id));
  assert.equal(ids.size, rows.length, 'State matrix contains duplicate rows');
  return rows;
}

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

function fileUrl(file) {
  return pathToFileURL(file).href;
}

async function createReferencePage(browser, referenceId, manifest, temporaryRoot) {
  const reference = manifest.references[referenceId];
  const source = path.join(referenceRoot, reference.file);
  const disposable = path.join(temporaryRoot, `${referenceId}.html`);
  fs.copyFileSync(source, disposable);
  const viewport = reference.renderViewport;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.route('**/*', (route) => {
    if (route.request().url().startsWith('file:')) {
      return route.continue();
    }
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(fileUrl(disposable), { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { context, page };
}

async function createProductPage(browser, referenceId, manifest) {
  const viewport = referenceId === 'mobile'
    ? { width: 390, height: 844 }
    : manifest.references[referenceId].renderViewport;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(fileUrl(buildPath), { waitUntil: 'load' });
  await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
  return { context, page };
}

async function selectReferenceRealm(page, realm) {
  const controls = page.locator('button').filter({ hasText: /warm(?: shell)?|sealed(?: realm)?/i });
  const active = await controls.evaluateAll((elements) => elements
    .map((element, index) => {
      const box = element.getBoundingClientRect();
      const text = element.innerText.toLowerCase();
      const style = getComputedStyle(element);
      return { index, text, box, background: style.backgroundColor };
    })
    .filter(({ box }) => box.width > 0 && box.height > 0 && box.y < 220));
  assert.ok(active.length === 1 || active.length === 2, 'Reference realm controls must be one mobile toggle or two desktop segments');
  const current = active.length === 1
    ? (active[0].text.includes('warm') ? 'warm' : 'cold')
    : (active.find(({ background }) => background === 'rgb(0, 240, 255)' || background === 'rgb(255, 0, 122)')?.text.includes('warm') ? 'warm' : 'cold');
  if (current === realm) {
    return;
  }
  const target = active.length === 1
    ? active[0]
    : active.find(({ text }) => realm === 'warm' ? text.includes('warm') : text.includes('sealed'));
  assert.ok(target, `Reference realm target ${realm} is not present in the masthead`);
  await controls.nth(target.index).evaluate((element) => element.click());
  await page.waitForTimeout(150);
}

async function selectProductRealm(page, row) {
  if (row.realm === 'cold') {
    await page.evaluate(() => {
      window.location.hash = '#cold-realm-status';
    });
    await page.waitForTimeout(120);
    await page.evaluate(() => window.scrollTo(0, 0));
    const coldFrame = page.frameLocator('#cold-frame');
    await prepareColdFixture(coldFrame, row);
    const coldTargets = Object.freeze({
      unlock: '#cold-group-session', empty: '#cold-tool-hub', entropy: '#cold-group-entropy',
      forge: '#cold-group-seed-forge', validate: '#cold-group-seed-forge', secret: '#cold-secret-switcher',
      paths: '#cold-verification', addresses: '#cold-verification', shares: '#cold-group-backups',
      qr: '#cold-group-qr', lock: '#cold-group-session', conceal: '#cold-group-session',
      notes: '#cold-group-session', verifybench: '#cold-verification', hub: '#cold-tool-hub'
    });
    const target = row.classification === 'UNAVAILABLE'
      ? '#cold-tool-hub'
      : (coldTargets[row.screen] || '#cold-tool-hub');
    await coldFrame.locator('body').evaluate((body, nextTarget) => {
      window.location.hash = nextTarget;
    }, target);
    await page.waitForTimeout(80);
    await coldFrame.locator('.cold-app-layout > main').evaluate((element) => {
      element.scrollTop = 0;
    });
    await coldFrame.locator('.cold-nav-scroll').evaluate((element) => {
      element.scrollTop = 0;
    });
    return;
  }
  const route = row.classification === 'UNAVAILABLE'
    ? 'dashboard'
    : (PRODUCT_WARM_ROUTES[row.screen] || 'dashboard');
  await page.evaluate((value) => {
    window.location.hash = `#${value}`;
  }, route);
  await page.waitForFunction((value) => window.location.hash === `#${value}`, route);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('[data-scroll-region]').forEach((region) => {
      region.scrollTop = 0;
    });
  });
}

async function selectReferenceScreen(page, row) {
  // The initial reference state is the cold hub. The baseline driver proves
  // the capture path before screen-specific selectors are added. Full runs
  // must set this flag only after the exact screen control has been selected.
  if (row.baseline) {
    return;
  }
  // Each manifest row is an independent deterministic state. Resetting the
  // disposable prototype also clears any prior lens selection that may have
  // removed the rail control needed by the next row.
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await selectReferenceRealm(page, REFERENCE_REALM[row.screen] || row.realm);
  if (row.classification === 'UNAVAILABLE') {
    const referenceRealm = REFERENCE_REALM[row.screen] || row.realm;
    if (referenceRealm === 'warm') {
      const dashboardLabel = row.viewport === 'mobile' ? 'Home' : 'Dashboard';
      const dashboard = page.locator('button').filter({ hasText: dashboardLabel });
      const visible = await dashboard.evaluateAll((elements) => elements
        .map((element, index) => ({ index, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0 && box.left < 280));
      assert.equal(visible.length, 1, `Reference unavailable warm reset for ${row.screen} was not unique`);
      await dashboard.nth(visible[0].index).evaluate((element) => element.click());
      await page.waitForTimeout(150);
    }
    return;
  }
  const label = row.viewport === 'mobile'
    ? (REFERENCE_MOBILE_LABELS[row.screen] || REFERENCE_LABELS[row.screen])
    : REFERENCE_LABELS[row.screen];
  assert.ok(label, `No reference selector mapping for ${row.screen}`);
  const findCandidates = async (target) => page.locator('button').evaluateAll((elements, wanted) => elements
    .map((element, index) => {
      const box = element.getBoundingClientRect();
      const text = (element.innerText || '').replace(/\s+/g, ' ').trim();
      const visible = box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden';
      const matches = text.toLowerCase().includes(wanted.toLowerCase());
      const desktopRail = box.left < 280;
      const mobileBar = box.top > 780;
      return { index, text, box, visible, matches, score: (desktopRail ? 10 : 0) + (mobileBar ? 5 : 0) };
    })
    .filter((candidate) => candidate.visible && candidate.matches)
    .sort((left, right) => right.score - left.score), target);
  let candidates = await findCandidates(label);
  if (candidates.length === 0 && row.viewport === 'mobile') {
    const more = page.locator('button').filter({ hasText: /^(?:•••|SET|MORE)$/i });
    const moreCandidates = await more.evaluateAll((elements) => elements
      .map((element, index) => ({ index, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0));
    assert.equal(moreCandidates.length, 1, `Reference More control for ${row.screen} was not unique`);
    await more.nth(moreCandidates[0].index).evaluate((element) => element.click());
    await page.waitForTimeout(150);
    candidates = await findCandidates(label);
  }
  assert.ok(candidates.length > 0, `Reference selector for ${row.id} did not match a visible control`);
  const bestScore = candidates[0].score;
  const preferred = candidates.filter((candidate) => candidate.score === bestScore);
  assert.equal(preferred.length, 1, `Reference selector for ${row.id} did not have exact cardinality`);
  await page.locator('button').nth(preferred[0].index).evaluate((element) => element.click());
  await page.waitForTimeout(150);
}

const ACTIVE_COLD_FIXTURE_SCREENS = new Set([
  'hub', 'secret', 'entropy', 'forge', 'paths', 'addresses', 'shares', 'qr',
  'lock', 'conceal', 'notes', 'verifybench', 'validate'
]);

async function prepareColdFixture(coldFrame, row) {
  const switcher = coldFrame.locator('#cold-secret-switcher');
  const count = Number(await switcher.getAttribute('data-released-secret-count') || '0');
  if (row.screen === 'empty') {
    if (count > 0) {
      await coldFrame.locator('#cold-secret-registry-clear').evaluate((button) => button.click());
      await coldFrame.locator('#cold-secret-switcher[data-released-secret-count="0"]').waitFor({ state: 'attached' });
    }
    return;
  }
  if (!ACTIVE_COLD_FIXTURE_SCREENS.has(row.screen) || count > 0) {
    return;
  }
  await coldFrame.locator('body').evaluate(() => {
    window.location.hash = '#cold-group-seed-forge';
  });
  await coldFrame.locator('#cold-seed-forge[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });
  await coldFrame.locator('#cold-seed-forge-validation-passphrase-input').fill('TREZOR');
  await coldFrame.locator('#cold-seed-forge-validation-passphrase-confirm').fill('TREZOR');
  await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  );
  await coldFrame.locator('#cold-seed-forge-validate').click();
  await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 5000 });
  for (const label of ['Steel plate', 'Multisig 2', 'Child #3']) {
    await coldFrame.locator('#cold-seed-forge-validation-release-label').fill(label);
    await coldFrame.locator('#cold-seed-forge-validation-release').click();
  }
  await coldFrame.locator('#cold-secret-switcher[data-released-secret-count="3"]').waitFor({ state: 'attached', timeout: 5000 });
  await coldFrame.locator('#cold-secret-list [data-secret-id]').first()
    .locator('button[data-secret-action="focus"]')
    .evaluate((button) => button.click());
}

function decodePng(bytes) {
  assert.equal(bytes.readUInt32BE(0), 0x89504e47);
  let offset = 8;
  const idat = [];
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      assert.equal(bitDepth, 8, 'UI.11 only supports 8-bit screenshot PNGs');
      assert.ok([2, 6].includes(colorType), 'UI.11 expects RGB/RGBA screenshot PNGs');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const sourceStride = width * (colorType === 6 ? 4 : 3);
  const stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  let previousFiltered = Buffer.alloc(sourceStride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * stride;
    const filtered = Buffer.alloc(sourceStride);
    for (let x = 0; x < sourceStride; x += 1) {
      const value = raw[sourceOffset + x];
      const left = x >= (colorType === 6 ? 4 : 3) ? filtered[x - (colorType === 6 ? 4 : 3)] : 0;
      const above = y > 0 ? previousFiltered[x] : 0;
      const upperLeft = y > 0 && x >= (colorType === 6 ? 4 : 3)
        ? previousFiltered[x - (colorType === 6 ? 4 : 3)]
        : 0;
      let result = value;
      if (filter === 1) result = (value + left) & 0xff;
      if (filter === 2) result = (value + above) & 0xff;
      if (filter === 3) result = (value + Math.floor((left + above) / 2)) & 0xff;
      if (filter === 4) {
        const predictor = left + above - upperLeft;
        const pa = Math.abs(predictor - left);
        const pb = Math.abs(predictor - above);
        const pc = Math.abs(predictor - upperLeft);
        const nearest = pa <= pb && pa <= pc ? left : (pb <= pc ? above : upperLeft);
        result = (value + nearest) & 0xff;
      }
      assert.ok(filter >= 0 && filter <= 4, `Unsupported PNG filter ${filter}`);
      filtered[x] = result;
    }
    for (let x = 0; x < width; x += 1) {
      const source = x * (colorType === 6 ? 4 : 3);
      const target = x * 4;
      pixels[rowOffset + target] = filtered[source];
      pixels[rowOffset + target + 1] = filtered[source + 1];
      pixels[rowOffset + target + 2] = filtered[source + 2];
      pixels[rowOffset + target + 3] = colorType === 6 ? filtered[source + 3] : 255;
    }
    previousFiltered = filtered;
    sourceOffset += sourceStride;
  }
  return { width, height, pixels };
}

function cropPng(image, region, referenceId) {
  const x = referenceId === 'mobile' ? 48 : 0;
  const y = referenceId === 'mobile' ? 113 : 0;
  assert.equal(image.width, referenceId === 'mobile' ? 880 : 1440);
  assert.equal(image.height, referenceId === 'mobile' ? 1000 : 940);
  const pixels = Buffer.alloc(region.width * region.height * 4);
  for (let row = 0; row < region.height; row += 1) {
    const from = ((y + row) * image.width + x) * 4;
    const to = row * region.width * 4;
    image.pixels.copy(pixels, to, from, from + region.width * 4);
  }
  return { width: region.width, height: region.height, pixels };
}

function compareImages(reference, product) {
  assert.equal(reference.width, product.width, 'Reference/product capture widths differ');
  assert.equal(reference.height, product.height, 'Reference/product capture heights differ');
  let changedPixels = 0;
  const diff = Buffer.alloc(reference.pixels.length);
  for (let i = 0; i < reference.pixels.length; i += 4) {
    const changed = reference.pixels[i] !== product.pixels[i]
      || reference.pixels[i + 1] !== product.pixels[i + 1]
      || reference.pixels[i + 2] !== product.pixels[i + 2]
      || reference.pixels[i + 3] !== product.pixels[i + 3];
    if (changed) {
      changedPixels += 1;
      diff[i] = 255;
      diff[i + 1] = 0;
      diff[i + 2] = 0;
      diff[i + 3] = 255;
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
  const typeBytes = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBytes, data]);
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
    pngChunk('IDAT', zlib.deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

async function runParity({ baseline = false } = {}) {
  const manifest = readManifest();
  verifyReferenceBytes(manifest);
  fs.rmSync(artifactRoot, { recursive: true, force: true });
  fs.mkdirSync(artifactRoot, { recursive: true });
  const rows = createStateMatrix(manifest).map((row) => ({ ...row, baseline }));
  fs.writeFileSync(path.join(artifactRoot, 'state-matrix.json'), `${JSON.stringify(rows, null, 2)}\n`);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-ui11-reference-'));
  const totals = [];
  try {
    for (const [engineId, browserType] of [['chromium', chromium], ['firefox', firefox]]) {
      const browser = await browserType.launch({ headless: true });
      try {
        for (const referenceId of Object.keys(manifest.references)) {
          const reference = manifest.references[referenceId];
          const referencePage = await createReferencePage(browser, referenceId, manifest, temporaryRoot);
          const productPage = await createProductPage(browser, referenceId, manifest);
          try {
            for (const row of rows.filter((candidate) => candidate.viewport === referenceId)) {
              if (row.baseline) {
                await selectReferenceRealm(referencePage.page, REFERENCE_REALM[row.screen] || row.realm);
              }
              await selectReferenceScreen(referencePage.page, row);
              await selectProductRealm(productPage.page, row);
              const referenceShot = await referencePage.page.screenshot();
              const productShot = await productPage.page.screenshot();
              const referenceImage = cropPng(decodePng(referenceShot), reference.comparisonRegion, referenceId);
              const productImage = referenceId === 'mobile'
                ? decodePng(productShot)
                : cropPng(decodePng(productShot), reference.comparisonRegion, referenceId);
              const result = compareImages(referenceImage, productImage);
              const prefix = `${engineId}-${referenceId}-${safeName(row.screen)}`;
              fs.writeFileSync(path.join(artifactRoot, `${prefix}-reference.png`), encodePng(referenceImage));
              fs.writeFileSync(path.join(artifactRoot, `${prefix}-product.png`), encodePng(productImage));
              fs.writeFileSync(path.join(artifactRoot, `${prefix}-diff.png`), encodePng({
                width: referenceImage.width,
                height: referenceImage.height,
                pixels: result.diff
              }));
              totals.push({
                engine: engineId,
                ...row,
                width: referenceImage.width,
                height: referenceImage.height,
                changedPixels: result.changedPixels,
                totalPixels: result.totalPixels,
                unexpectedChangedPixels: result.changedPixels,
                referenceArtifact: `${prefix}-reference.png`,
                productArtifact: `${prefix}-product.png`,
                diffArtifact: `${prefix}-diff.png`
              });
            }
          } finally {
            await referencePage.context.close();
            await productPage.context.close();
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

  const aggregate = totals.reduce((sum, row) => sum + row.unexpectedChangedPixels, 0);
  const report = { schema: 'coldbox.ui11.parity-results.v1', baseline, allowedPixelMasks: [], rows: totals, aggregate: { rows: totals.length, unexpectedChangedPixels: aggregate } };
  fs.writeFileSync(path.join(artifactRoot, 'totals.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`UI.11 ${baseline ? 'baseline' : 'parity'} captured ${totals.length} rows; unexpected changed pixels: ${aggregate}`);
  if (!baseline) {
    assert.equal(aggregate, 0, 'UI.11 parity has unexpected changed pixels');
  }
  return report;
}

if (require.main === module) {
  const baseline = process.argv.includes('--baseline');
  runParity({ baseline }).catch((error) => {
    console.error(`UI.11 parity failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ runParity, createStateMatrix, decodePng, compareImages, encodePng });
