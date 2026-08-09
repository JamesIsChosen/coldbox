'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
const mainSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(projectRoot, 'src', 'styles.css'), 'utf8');
const buildSource = fs.readFileSync(path.join(projectRoot, 'scripts', 'build.js'), 'utf8');
const buildPath = path.join(projectRoot, 'build', 'coldbox.html');

const routeIds = Object.freeze([
  'dashboard', 'vault', 'portfolio', 'prices', 'registry', 'devices', 'entropy',
  'seed-forge', 'derivation', 'backup', 'qr', 'recovery', 'verify', 'reference',
  'learn', 'system-health'
]);

const approvedPopupIds = Object.freeze([
  'popup-dashboard-backup',
  'popup-portfolio-asset',
  'popup-portfolio-export',
  'popup-portfolio-transaction-detail',
  'popup-portfolio-transfer',
  'popup-price-source-coingecko',
  'popup-price-source-coinbase',
  'popup-price-source-kraken',
  'popup-price-source-paprika',
  'popup-price-source-dia',
  'popup-registry-coldcard',
  'popup-registry-trezor',
  'popup-registry-reserve',
  'popup-registry-balance',
  'popup-device-verify',
  'popup-vault-details'
]);

const brandAssets = Object.freeze([
  ['src/assets/brand/coldbox-wordmark.png', 'image/png'],
  ['src/assets/brand/favicon-c-lower.ico', 'image/x-icon'],
  ['src/assets/brand/favicon-c-lower-16x16.png', 'image/png'],
  ['src/assets/brand/favicon-c-lower-32x32.png', 'image/png'],
  ['src/assets/brand/favicon-c-lower-48x48.png', 'image/png'],
  ['src/assets/brand/favicon-c-lower-64x64.png', 'image/png']
]);

function popupTriggerIds() {
  return [...indexSource.matchAll(/data-popup-open="([^"]+)"/g)].map((match) => match[1]);
}

test('the UI shell covers every stable route and popup trigger', () => {
  for (const routeId of routeIds) {
    assert.match(indexSource, new RegExp(`data-page="${routeId}"`), `missing route page ${routeId}`);
    assert.match(indexSource, new RegExp(`data-route="${routeId}"`), `missing route link ${routeId}`);
  }

  const popupIds = popupTriggerIds();
  assert.ok(popupIds.length >= 60, 'expected the full UI popup map, found ' + popupIds.length);
  for (const popupId of approvedPopupIds) {
    assert.ok(popupIds.includes(popupId), 'missing approved floating-card trigger ' + popupId);
  }
  for (const popupId of popupIds) {
    assert.match(mainSource, new RegExp(`['"]${popupId}['"]\\s*:\\s*popup\\(`), `missing popup content for ${popupId}`);
  }
  assert.match(indexSource, /id="floating-menu-layer"/);
  assert.match(indexSource, /id="floating-menu-dialog"[^>]*role="dialog"/);
  assert.match(indexSource, /class="floating-menu-close"[^>]*data-popup-close/);
  assert.match(stylesSource, /\.floating-menu-close\s*\{[\s\S]*?background:\s*var\(--fill-red\)/);
  assert.match(indexSource, /id="page-system-health" data-page="system-health"/);
  assert.match(indexSource, /<div class="nav-footer">[\s\S]*?<section class="airgap-banner airgap-banner-compact" id="airgap-banner"/);
  assert.match(indexSource, /id="help-search-input"/);
  assert.match(indexSource, /id="help-detail-card"/);
  assert.match(indexSource, /id="help-empty-state"/);
  assert.match(stylesSource, /\.panic-screen::before\s*\{[\s\S]*?background:\s*var\(--fill-red\)/);
  const dashboardSource = indexSource.slice(
    indexSource.indexOf('<section class="page" id="page-dashboard"'),
    indexSource.indexOf('<section class="page" id="page-vault"')
  );
  assert.doesNotMatch(dashboardSource, /popup-system-health|Check system health|<dt>System health<\/dt>/);
  assert.doesNotMatch(indexSource, /style\s*=/i, 'UI shell must not use inline style attributes');
});

test('supplied brand artwork is local build input and all sizes are embedded', () => {
  for (const [relativePath, mime] of brandAssets) {
    const absolutePath = path.join(projectRoot, relativePath);
    const bytes = fs.readFileSync(absolutePath);
    assert.ok(bytes.length > 0, `${relativePath} must not be empty`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').length, 64);
    assert.equal(buildSource.includes(relativePath.replace('src/', '')), true, `build manifest must include ${relativePath}`);
    assert.match(mime, /^image\//);
  }

  const built = fs.readFileSync(buildPath, 'utf8');
  assert.doesNotMatch(built, /__COLDBOX_(?:WORDMARK|FAVICON)_/);
  assert.match(built, /<img class="brand-wordmark" src="data:image\/png;base64,[A-Za-z0-9+/]+=*" alt="Coldbox">/);
  assert.equal((built.match(/<link rel="icon"/g) || []).length, 5);
});

test('the popup contract is centered, modal, keyboard-closeable, and sample-free', () => {
  assert.match(indexSource, /aria-modal="true"/);
  assert.match(mainSource, /event\.key === 'Escape'/);
  assert.match(mainSource, /floatingMenuPreviousFocus\.focus\(\)/);
  assert.match(stylesSource, /\.floating-menu-layer\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(stylesSource, /\.floating-menu-layer\s*\{[\s\S]*?place-items:\s*center/);
  assert.match(indexSource, /Design shell · no sample data/);
  assert.doesNotMatch(indexSource, /Seeded UI preview|>Sample data<|sample data in (?:this|the)/);
  assert.doesNotMatch(mainSource, /seeded UI walkthrough|Sample data|sample data|Sample source card|Sample totals/);
});
