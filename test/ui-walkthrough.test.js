'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(projectRoot, 'src', 'index.html'), 'utf8');
const mainSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
const coldIndexSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'index.html'), 'utf8');
const coldMainSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'main.js'), 'utf8');
const coldStylesSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'styles.css'), 'utf8');
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
  'popup-vault-details',
  'popup-vault-tools',
  'popup-vault-session',
  'popup-entropy-session',
  'popup-qr-transfer'
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
  assert.match(indexSource, /<header class="app-bar">[\s\S]*?<section class="airgap-banner airgap-banner-navbar" id="airgap-banner"/);
  assert.doesNotMatch(indexSource, /<div class="nav-footer">[\s\S]*?id="airgap-banner"/);
  assert.match(indexSource, /id="help-search-input"/);
  assert.match(indexSource, /id="help-detail-card"/);
  assert.match(indexSource, /id="help-empty-state"/);
  assert.match(stylesSource, /\.panic-screen::before\s*\{[\s\S]*?background:\s*var\(--fill-red\)/);
  assert.match(stylesSource, /\.panic-screen\[hidden\]\s*\{[\s\S]*?display:\s*none\s*!important/);
  assert.match(stylesSource, /\.panic-screen::before\s*\{[\s\S]*?left:\s*50%[\s\S]*?transform:\s*translate\(-50%,\s*-50%\)/);
  assert.match(stylesSource, /\.panic-screen\s*\{[\s\S]*?background-color:\s*var\(--bg\)/);
  const vaultSource = indexSource.slice(
    indexSource.indexOf('<section class="page" id="page-vault"'),
    indexSource.indexOf('<section class="page" id="page-portfolio"')
  );
  const entropySource = indexSource.slice(
    indexSource.indexOf('<section class="page" id="page-entropy"'),
    indexSource.indexOf('<section class="page" id="page-seed-forge"')
  );
  const systemHealthSource = indexSource.slice(
    indexSource.indexOf('<section class="page" id="page-system-health"'),
    indexSource.indexOf('<div class="floating-menu-layer"')
  );
  assert.match(vaultSource, /id="cold-realm-host"/);
  assert.match(vaultSource, /data-popup-open="popup-vault-details"/);
  assert.match(vaultSource, /id="vault-tools-panel"|class="vault-tools-panel"/);
  assert.match(vaultSource, /id="vault-file-input"/);
  assert.match(vaultSource, /id="vault-save-file-system"/);
  assert.match(vaultSource, /id="vault-manual-data"/);
  assert.match(vaultSource, /data-popup-open="popup-vault-session"/);
  assert.doesNotMatch(vaultSource, /id="vault-transfer-card"|id="vault-transfer-start"/);
  assert.match(entropySource, /id="entropy-cold-realm-slot"/);
  assert.match(entropySource, /data-popup-open="popup-entropy-session"/);
  assert.match(entropySource, /id="entropy-lab-panel-title"/);
  assert.doesNotMatch(entropySource, /Entropy Lab is not built yet|Measurement appears only after a real sealed-realm sample/);
  assert.doesNotMatch(entropySource, /Sealed realm \/ (?:Vault tools|Entropy Lab)/);
  for (const toolId of [
    'cold-entropy-dice-face', 'cold-entropy-coin-heads', 'cold-entropy-card-grid',
    'cold-entropy-hex-input', 'cold-entropy-csprng-draw', 'cold-entropy-meter',
    'cold-entropy-fallback-strength', 'cold-entropy-mix-run'
  ]) {
    assert.match(coldIndexSource, new RegExp(`id="${toolId}"`), `missing entropy tool ${toolId}`);
  }
  assert.doesNotMatch(systemHealthSource, /id="cold-realm-host"|id="entropy-cold-realm-slot"/);
  const qrSource = indexSource.slice(
    indexSource.indexOf('<section class="page" id="page-qr"'),
    indexSource.indexOf('<section class="page" id="page-recovery"')
  );
  assert.match(qrSource, /id="vault-transfer-card"/);
  assert.match(qrSource, /id="vault-transfer-start"/);
  assert.match(qrSource, /data-popup-open="popup-qr-transfer"/);
  assert.match(mainSource, /function placeColdRealm\(route\)/);
  assert.match(mainSource, /'ui\.navigate'/);
  assert.match(coldMainSource, /message\.type === 'ui\.navigate'/);
  assert.match(coldMainSource, /kdfDetails\.hidden = !showVault/);
  assert.match(coldMainSource, /entropyLabSection\.hidden = !showEntropy/);
  assert.match(coldIndexSource, /id="cold-realm-shell-status"/);
  assert.match(coldStylesSource, /html\[data-cold-view="entropy"\] \.cold-realm-shell-status\s*\{[\s\S]*?display:\s*none/);
  assert.match(coldStylesSource, /html\[data-cold-view="entropy"\] #cold-entropy-lab\s*\{/);
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
