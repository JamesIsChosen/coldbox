'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium, firefox } = require('playwright');

const { createHarness } = require(path.join(__dirname, '..', 'test', 'browser', 'harness.js'));

const projectRoot = path.resolve(__dirname, '..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const buildPath = path.join(projectRoot, 'build', 'coldbox.html');
const fixtureRoot = path.join(projectRoot, 'test', 'browser', 'fixtures');
const CANARY_ERROR_FRAGMENT = 'coldbox.invalid/csp-canary';
const COLD_CANARY_ERROR_FRAGMENT = 'localhost:9/cold-csp-canary';
const WARM_CANARY_URL = 'https://coldbox.invalid/csp-canary';
const COLD_CANARY_URL = 'http://localhost:9/cold-csp-canary';
const REACHABILITY_PRIMARY_URL = 'https://api.coinbase.com/v2/time';
const REACHABILITY_BACKUP_URL = 'https://mempool.space/api/blocks/tip/height';

// P0.19 F3: tests that deliberately hold an offline-classified secret
// session open must not race the product's ten-second periodic tick while a
// real Argon2 operation is running. The explicit offline/focus events and the
// held-probe regression below still exercise the production transition. This
// init script only suspends the periodic timer in those deterministic test
// pages; it does not alter the shipped application.
const SUSPEND_REACHABILITY_INTERVAL_SCRIPT = `(${function () {
  var originalSetInterval = window.setInterval;
  window.setInterval = function (callback, delay) {
    if (delay === 10000 && callback && /runReachabilityCheck/.test(String(callback))) {
      return originalSetInterval.call(window, function () {}, 2147483647);
    }
    return originalSetInterval.apply(window, arguments);
  };
}.toString()})();`;

// F1 regression support: patches window.FileReader.prototype.readAsArrayBuffer
// inside every document/frame this init script runs in (including the cold
// realm's srcdoc iframe) so a per-filename artificial completion delay can be
// requested via window.__coldboxTestReadDelays. A delayed read is proxied
// through a real, undelayed shadow FileReader so the underlying bytes are
// genuinely read from disk; only the *delivery* of onload/onerror to the
// caller-visible reader is deferred. This lets a test force two real
// FileReader reads (started in a chosen order) to *complete* in the opposite
// order, which is what F1's stale-callback protection must survive.
const FILE_READER_ORDER_CONTROL_SCRIPT = `(function () {
  var originalRead = window.FileReader.prototype.readAsArrayBuffer;
  window.__coldboxTestReadDelays = window.__coldboxTestReadDelays || {};
  window.FileReader.prototype.readAsArrayBuffer = function (file) {
    var reader = this;
    var delay = window.__coldboxTestReadDelays[file.name] || 0;
    if (!delay) {
      return originalRead.call(reader, file);
    }
    var shadow = new window.FileReader();
    shadow.onload = function () {
      var shadowResult = shadow.result;
      window.setTimeout(function () {
        Object.defineProperty(reader, 'result', { value: shadowResult, configurable: true });
        Object.defineProperty(reader, 'readyState', { value: 2, configurable: true });
        if (typeof reader.onload === 'function') {
          reader.onload({ target: reader });
        }
      }, delay);
    };
    shadow.onerror = function () {
      window.setTimeout(function () {
        if (typeof reader.onerror === 'function') {
          reader.onerror({ target: reader });
        }
      }, delay);
    };
    originalRead.call(shadow, file);
  };
})();`;

function fileUrl(file) {
  return pathToFileURL(file).href;
}

function cspHash(block) {
  return `'sha256-${crypto.createHash('sha256').update(Buffer.from(block, 'utf8')).digest('base64')}'`;
}

function escapedRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runBuild() {
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`Build failed with exit code ${result.status}`);
  }
}

function requireBrowserBinaries() {
  const missing = [];
  if (!fs.existsSync(chromium.executablePath())) {
    missing.push('chromium');
  }
  if (!fs.existsSync(firefox.executablePath())) {
    missing.push('firefox');
  }
  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Playwright browser binaries are missing (${missing.join(', ')}). `
    + 'Run "npx playwright install chromium firefox" after npm ci.'
  );
}

// R2-F1 remediation: the P0.17 build now reads docs/00-overview/glossary.md
// and docs/03-guides/*.md (see scripts/help-content.js), so every temporary
// build root this harness creates - not just the one
// verifyDevOnlyDependency() builds - needs docs/ copied alongside
// scripts/src/vendor or its build.js invocation fails closed on ENOENT
// before the fixture's actual point is reached. The prior remediation fixed
// only verifyDevOnlyDependency() by hand, missed the other three build-root
// creators, and the reviewer caught it. Routing every temporary build root
// through this one helper is the fix the reviewer explicitly asked for:
// there is now exactly one place that knows the full build input list, so
// it cannot drift out of sync with scripts/build.js's actual dependencies
// again.
function copyBuildInputsInto(temporaryRoot, { includeGit = false } = {}) {
  for (const directory of ['scripts', 'src', 'vendor', 'docs']) {
    fs.cpSync(
      path.join(projectRoot, directory),
      path.join(temporaryRoot, directory),
      { recursive: true }
    );
  }
  // P0.20: build.js reads the repository LICENSE file directly.
  fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(temporaryRoot, 'LICENSE'));
  if (includeGit) {
    // P0.16 F4 fallout: scripts/build.js derives the embedded build date from
    // `git log -- src scripts vendor` (see ADR-0015's 2026-08-06 amendment).
    // Fixtures proving "no devDependency required" would otherwise fall back
    // to the "unknown (no git commit metadata available)" branch while the
    // real build embeds an actual date, diverging for a reason unrelated to
    // what the fixture is meant to prove.
    fs.cpSync(
      path.join(projectRoot, '.git'),
      path.join(temporaryRoot, '.git'),
      { recursive: true }
    );
  }
}

function createTamperedFixture() {
  const originalPath = path.join(fixtureRoot, 'tamper.html');
  const original = fs.readFileSync(originalPath, 'utf8');
  const script = 'window.__coldboxTamperScriptRan = true;';
  const occurrences = original.split(script).length - 1;
  assert.equal(occurrences, 1, 'Tamper fixture must contain one target script');

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-tamper-'));
  const tamperedPath = path.join(temporaryRoot, 'tampered.html');
  fs.writeFileSync(tamperedPath, original.replace(script, `${script} `), 'utf8');
  return { path: tamperedPath, temporaryRoot };
}

function createTamperedBuildFixture() {
  const original = fs.readFileSync(buildPath);
  const scriptStartMarker = Buffer.from('<script>');
  const scriptEndMarker = Buffer.from('</script>');
  const scriptStart = original.indexOf(scriptStartMarker);
  assert.notEqual(scriptStart, -1, 'Built artifact must contain an inline script');
  const bodyStart = scriptStart + scriptStartMarker.length;
  const scriptEnd = original.indexOf(scriptEndMarker, bodyStart);
  assert.notEqual(scriptEnd, -1, 'Built artifact must close its inline script');

  const tamperTarget = Buffer.from('warm-shell');
  const relativeTarget = original.subarray(bodyStart, scriptEnd).indexOf(tamperTarget);
  assert.notEqual(relativeTarget, -1, 'Built warm shell script must contain its state marker');
  const targetOffset = bodyStart + relativeTarget;
  const tampered = Buffer.from(original);
  tampered[targetOffset] ^= 1;

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-built-tamper-'));
  const tamperedPath = path.join(temporaryRoot, 'coldbox.html');
  fs.writeFileSync(tamperedPath, tampered);
  return { path: tamperedPath, temporaryRoot };
}

function createColdReadySuppressedFixture() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-timeout-'));
  copyBuildInputsInto(temporaryRoot);

  const coldMainPath = path.join(temporaryRoot, 'src', 'cold', 'main.js');
  const original = fs.readFileSync(coldMainPath, 'utf8');
  const readySignal = "window.parent.postMessage({ type: 'cold.ready' }, '*');";
  const occurrences = original.split(readySignal).length - 1;
  assert.equal(occurrences, 1, 'Built cold realm must contain one readiness signal');
  fs.writeFileSync(
    coldMainPath,
    original.replace(readySignal, "window.parent.postMessage({ type: 'cold.not-ready' }, '*');"),
    'utf8'
  );

  const result = spawnSync(process.execPath, [path.join(temporaryRoot, 'scripts', 'build.js')], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
  });
  if (result.status !== 0) {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
    throw new Error(`Cold readiness-timeout fixture build failed: ${result.stdout}\n${result.stderr}`);
  }
  return {
    path: path.join(temporaryRoot, 'build', 'coldbox.html'),
    temporaryRoot
  };
}

function createHandshakeResponseSuppressedFixture() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-handshake-timeout-'));
  copyBuildInputsInto(temporaryRoot);

  const coldMainPath = path.join(temporaryRoot, 'src', 'cold', 'main.js');
  const original = fs.readFileSync(coldMainPath, 'utf8');
  const readyResponse = 'messagePort.postMessage(readyMessage);';
  const occurrences = original.split(readyResponse).length - 1;
  assert.equal(occurrences, 1, 'Cold realm must contain one typed ready response');
  fs.writeFileSync(coldMainPath, original.replace(readyResponse, 'void readyMessage;'), 'utf8');

  const result = spawnSync(process.execPath, [path.join(temporaryRoot, 'scripts', 'build.js')], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
  });
  if (result.status !== 0) {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
    throw new Error(`Handshake-timeout fixture build failed: ${result.stdout}\n${result.stderr}`);
  }
  return {
    path: path.join(temporaryRoot, 'build', 'coldbox.html'),
    temporaryRoot
  };
}

function stripWarmCsp(document) {
  // Scoped to before the first <script> tag, i.e. the document's <head>,
  // where the one real warm CSP <meta> tag lives. P0.16's provenance panel
  // added extractCspFromMarkup() to src/main.js, whose own regex literal -
  // /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/i - is
  // legitimate JavaScript source text that ends up embedded verbatim inside
  // the built document's inline <script> block. A document-wide match on
  // this same pattern finds that regex literal as a spurious second "meta
  // tag", even though it's JS code describing a tag, not a tag. Scoping the
  // search to head-only content finds exactly the one real tag regardless
  // of what later inline script code says about meta tags as text.
  const headEndIndex = document.indexOf('<script');
  const searchRegion = headEndIndex === -1 ? document : document.slice(0, headEndIndex);
  const matches = searchRegion.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/g) || [];
  assert.equal(matches.length, 1, 'Expected exactly one warm CSP meta tag');
  return document.replace(matches[0], '');
}

function stripColdCsp(document) {
  let stripped = document;
  const childStart = '\\u003cmeta http-equiv=\\"Content-Security-Policy\\" content=\\"';
  const childEnd = '\\"\\u003e';
  const childStartIndex = stripped.indexOf(childStart);
  assert.notEqual(childStartIndex, -1, 'Embedded cold CSP was not found');
  const childEndIndex = stripped.indexOf(childEnd, childStartIndex + childStart.length);
  assert.notEqual(childEndIndex, -1, 'Embedded cold CSP end was not found');
  stripped = stripped.slice(0, childStartIndex)
    + stripped.slice(childEndIndex + childEnd.length);
  return stripped;
}

function refreshWarmScriptHash(document) {
  const scriptMatches = [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(scriptMatches.length, 1, 'Expected exactly one warm inline script');
  const warmMeta = document.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
  assert.ok(warmMeta, 'Warm CSP meta tag was required for hash refresh');
  const refreshedPolicy = warmMeta[1].replace(
    /(script-src\s+)'sha256-[^']+'/,
    `$1${cspHash(scriptMatches[0][1])}`
  );
  assert.notEqual(refreshedPolicy, warmMeta[1], 'Warm script hash was not found');
  return document.replace(warmMeta[1], refreshedPolicy);
}

function createCspStrippedFixture(kind) {
  const original = fs.readFileSync(buildPath, 'utf8');
  let stripped = original;
  if (kind === 'warm-only' || kind === 'both') {
    stripped = stripWarmCsp(stripped);
  }
  if (kind === 'cold-only' || kind === 'both') {
    stripped = stripColdCsp(stripped);
  }
  if (kind === 'cold-only') {
    stripped = refreshWarmScriptHash(stripped);
  }
  assert.notEqual(stripped, original, `${kind} CSP fixture did not remove a policy`);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `coldbox-browser-csp-${kind}-`));
  const strippedPath = path.join(temporaryRoot, 'coldbox.html');
  fs.writeFileSync(strippedPath, stripped, 'utf8');
  return { kind, path: strippedPath, temporaryRoot };
}

function createMissingRandomnessFixture() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-capability-'));
  copyBuildInputsInto(temporaryRoot);
  const capabilityPath = path.join(temporaryRoot, 'src', 'capabilities.js');
  const original = fs.readFileSync(capabilityPath, 'utf8');
  const disabled = original.replace(
    /  function hasRandomValues\(\) \{[\s\S]*?^  \}\r?\n\r?\n  function hasSubtle/m,
    '  function hasRandomValues() {\n    return false;\n  }\n\n  function hasSubtle'
  );
  assert.notEqual(disabled, original, 'Missing-randomness fixture did not alter the capability probe');
  fs.writeFileSync(capabilityPath, disabled, 'utf8');
  const result = spawnSync(process.execPath, [path.join(temporaryRoot, 'scripts', 'build.js')], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return {
    path: path.join(temporaryRoot, 'build', 'coldbox.html'),
    temporaryRoot
  };
}

// F1 remediation (P0.21 review): simulates a wallet extension that injected
// window.ethereum into the cold realm before Coldbox's own bootstrap script
// runs its guard - the exact timing the review found untested. Patches the
// cold-realm source (not just injects via addInitScript) so the assignment
// executes as the very first statement inside the cold IIFE, strictly
// before neuterProviders() is ever called.
function createPreexistingProviderFixture() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-preexisting-provider-'));
  copyBuildInputsInto(temporaryRoot);
  const coldMainPath = path.join(temporaryRoot, 'src', 'cold', 'main.js');
  const original = fs.readFileSync(coldMainPath, 'utf8');
  const injected = original.replace(
    "(function () {\n  'use strict';\n",
    "(function () {\n  'use strict';\n"
      + "  // P0.21 review fixture: simulates an extension that injected a\n"
      + "  // provider before this script's own guard installs.\n"
      + "  window.ethereum = { isMetaMask: true, request: function () {\n"
      + "    throw new Error('P0.21 fixture: provider.request should never be called by Coldbox');\n"
      + "  } };\n"
  );
  assert.notEqual(injected, original, 'Preexisting-provider fixture did not alter the cold bootstrap script');
  fs.writeFileSync(coldMainPath, injected, 'utf8');
  const result = spawnSync(process.execPath, [path.join(temporaryRoot, 'scripts', 'build.js')], {
    cwd: temporaryRoot,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return {
    path: path.join(temporaryRoot, 'build', 'coldbox.html'),
    temporaryRoot
  };
}

async function installReachabilityRoutes(page, initialMode = 'reachable') {
  let mode = initialMode;
  const requests = [];
  const heldProbeResolvers = [];
  const handler = async (route) => {
    requests.push(route.request().url());
    if (mode === 'reachable') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (mode === 'holding') {
      await new Promise((resolve) => heldProbeResolvers.push(resolve));
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.abort('failed');
  };
  await page.route(REACHABILITY_PRIMARY_URL, handler);
  await page.route(REACHABILITY_BACKUP_URL, handler);
  return Object.freeze({
    setMode(nextMode) {
      assert.ok(['reachable', 'unreachable', 'holding'].includes(nextMode), 'invalid reachability fixture mode');
      mode = nextMode;
    },
    heldRequestCount() {
      return heldProbeResolvers.length;
    },
    releaseHeldProbe() {
      assert.ok(heldProbeResolvers.length > 0, 'no reachability probe is currently held');
      heldProbeResolvers.shift()();
    },
    requests() {
      return requests.slice();
    }
  });
}

async function triggerReachabilityRound(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.waitForTimeout(75);
  await page.waitForFunction(() => document.documentElement.getAttribute('data-reachability-checking') === 'false');
}

async function beginHeldReachabilityRound(page, reachability) {
  reachability.setMode('holding');
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.waitForFunction(() => (
    document.documentElement.getAttribute('data-reachability-state') === 'unknown'
      && document.documentElement.getAttribute('data-reachability-checking') === 'true'
  ));
  for (let attempt = 0; attempt < 40 && reachability.heldRequestCount() === 0; attempt += 1) {
    await page.waitForTimeout(25);
  }
  assert.ok(reachability.heldRequestCount() > 0, 'reachability fixture did not hold an active probe');
}

async function prepareVaultCreation(page, coldFrame, name) {
  await page.locator('#vault-create-name').fill(name);
  await page.locator('#vault-create-prepare').click();
  await coldFrame.locator('#cold-vault-create-confirmation:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
}

async function createPreparedVault(page, coldFrame, phrase, name) {
  await prepareVaultCreation(page, coldFrame, name);
  await coldFrame.locator('#cold-vault-passphrase').fill(phrase);
  await coldFrame.locator('#cold-vault-passphrase-confirm').fill(phrase);
  await coldFrame.locator('#cold-vault-create').click();
}

async function lockVaultDiscardingUnsaved(page) {
  await page.locator('#vault-lock').click();
  const warning = page.locator('#vault-lock-warning');
  if (await warning.isVisible()) {
    await page.locator('#vault-lock-without-save').click();
  }
}

async function openVaultManualHandoff(page) {
  const details = page.locator('#page-vault .vault-tool-details');
  if (await details.getAttribute('open') === null) {
    await details.locator('summary').click();
  }
  await details.locator('#vault-manual-data').waitFor({ state: 'visible' });
}

async function openPage(browser, file, reachabilityMode = 'reachable', options = {}) {
  const page = await browser.newPage();
  const reachability = await installReachabilityRoutes(page, reachabilityMode);
  const harness = await createHarness(page);
  if (options.suspendReachabilityInterval) {
    await page.addInitScript(SUSPEND_REACHABILITY_INTERVAL_SCRIPT);
  }
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page, reachability };
}

async function closePage(page) {
  await page.close();
}

// F1 support: same as openPage, but injects FILE_READER_ORDER_CONTROL_SCRIPT
// before the document (and every child frame, including the cold realm's
// srcdoc iframe) first runs, so the page's own FileReader usage is wrapped
// from the very first read.
async function openPageWithFileReaderControl(browser, file, reachabilityMode = 'reachable') {
  const page = await browser.newPage();
  const reachability = await installReachabilityRoutes(page, reachabilityMode);
  const harness = await createHarness(page);
  await page.addInitScript(FILE_READER_ORDER_CONTROL_SCRIPT);
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page, reachability };
}

async function getColdFrame(page, engine) {
  await page.waitForFunction(() => {
    const iframe = document.querySelector('#cold-frame');
    return iframe && iframe.contentWindow;
  });
  const frames = page.frames().filter((candidate) => candidate.parentFrame());
  assert.equal(frames.length, 1, `${engine}: built app should have exactly one child frame`);
  const frame = frames[0];
  await frame.locator('#cold-ready').waitFor({ state: 'visible' });
  return frame;
}

async function createCspProbeFrame(page, engine) {
  const frameId = 'csp-probe-frame';
  await page.evaluate((id) => {
    const iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', 'CSP probe frame');
    iframe.srcdoc = [
      '<!doctype html><html><head>',
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; connect-src \'none\'">',
      '</head><body><p id="csp-probe-ready">CSP probe ready</p></body></html>'
    ].join('');
    document.body.appendChild(iframe);
  }, frameId);
  await page.waitForFunction((id) => {
    const iframe = document.getElementById(id);
    return iframe && iframe.contentWindow;
  }, frameId);
  let frame = null;
  for (let attempt = 0; attempt < 100 && !frame; attempt += 1) {
    for (const candidate of page.frames()) {
      if (candidate.parentFrame() && await candidate.locator('#csp-probe-ready').count()) {
        frame = candidate;
        break;
      }
    }
    if (!frame) {
      await page.waitForTimeout(50);
    }
  }
  assert.ok(frame, `${engine}: CSP probe frame was not created`);
  await frame.locator('#csp-probe-ready').waitFor({ state: 'visible' });
  return { frame, frameId };
}

async function verifyUiShellWalkthrough(browser, engine) {
  const { harness, page } = await openPage(browser, buildPath);
  const routeIds = [
    'dashboard', 'vault', 'portfolio', 'prices', 'registry', 'devices', 'entropy',
    'seed-forge', 'derivation', 'backup', 'qr', 'recovery', 'verify', 'reference',
    'learn', 'system-health'
  ];
  try {
    await harness.expectElementVisible('#app');
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('img.brand-wordmark[alt="Coldbox"]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.preview-badge').isVisible(), true, `${engine}: design-shell badge must be visible`);

    await page.locator('#theme-toggle').click();
    await page.locator('html[data-theme="light"]').waitFor({ state: 'attached' });
    await page.locator('#theme-toggle').click();
    await page.locator('html[data-theme="dark"]').waitFor({ state: 'attached' });

    const systemHealthTrigger = page.locator('[data-popup-open="popup-system-health"]').first();
    await systemHealthTrigger.click();
    await page.locator('#floating-menu-dialog:not([hidden])').waitFor({ state: 'visible' });
    assert.match(await page.locator('#floating-menu-title').textContent(), /System health/i);
    assert.equal(await page.locator('#floating-menu-close').isVisible(), true);
    assert.equal(await page.locator('#floating-menu-close').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(224, 32, 32)');
    await page.locator('#floating-menu-close').click();
    await page.locator('#floating-menu-dialog[hidden]').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-popup-open')), 'popup-system-health');

    const capabilityTrigger = page.locator('#capability-row-random-values');
    await capabilityTrigger.press('Enter');
    await page.locator('#floating-menu-dialog:not([hidden])').waitFor({ state: 'visible' });
    assert.match(await page.locator('#floating-menu-summary').textContent(), /Current result:/);
    await page.locator('#floating-menu-close').press('Escape');
    await page.locator('#floating-menu-dialog[hidden]').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'capability-row-random-values');

    for (const routeId of routeIds) {
      await page.locator(`#nav-rail a[data-route="${routeId}"]`).click();
      await page.locator(`#page-${routeId}:not([hidden])`).waitFor({ state: 'visible' });
      assert.equal(await page.locator(`#page-${routeId} h1`).count(), 1, `${engine}: ${routeId} must have a primary heading`);
    }
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('.vault-cold-realm-panel #cold-frame').waitFor({ state: 'visible' });
    const vaultColdFrame = await getColdFrame(page, engine);
    assert.equal(await vaultColdFrame.locator('html').getAttribute('data-cold-view'), 'vault', `${engine}: Vault route must show the sealed Vault view`);
    await page.locator('#nav-rail a[data-route="entropy"]').click();
    await page.locator('#page-entropy:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('.entropy-lab-panel #cold-frame').waitFor({ state: 'visible' });
    assert.equal(await vaultColdFrame.locator('html').getAttribute('data-cold-view'), 'entropy', `${engine}: Entropy route must show only the sealed Entropy view`);
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#page-system-health #cold-frame').count(), 0, `${engine}: System Health must not render the Vault/Entropy frame`);
    await page.locator('#nav-rail a[data-route="dashboard"]').click();
    await page.locator('#page-dashboard:not([hidden])').waitFor({ state: 'visible' });
    await harness.expectNoConsoleErrors({ allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT] });
  } finally {
    await closePage(page);
  }
}

async function verifyBuiltFile(browser, engine) {
  const { harness, page, reachability } = await openPage(browser, buildPath);
  try {
    await harness.expectElementVisible('#app');
    await harness.expectElementVisible('#app[data-build-state="warm-shell"]');
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible' });
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible' });
    await page.locator('#airgap-banner[data-airgap-state="amber"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#capability-panel[data-capability-state="ready"], #capability-panel[data-capability-state="ready-with-warnings"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('html').getAttribute('data-csp-canary'), 'passed');
    assert.ok(['ready', 'ready-with-warnings'].includes(await page.locator('html').getAttribute('data-capability-state')));
    assert.equal(await page.locator('html').getAttribute('data-capability-warm-randomValues'), 'true');
    assert.equal(await page.locator('html').getAttribute('data-capability-cold-randomValues'), 'true');
    await page.locator('#capability-row-random-values[data-state="available"]').waitFor({ state: 'visible' });
    await page.locator('#capability-row-save-paths[data-state="available"]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#app').getAttribute('data-lockdown-state'), 'none');
    assert.equal(await page.locator('#app').getAttribute('data-vault-operations'), 'guarded');
    const sandbox = await page.locator('#cold-frame').getAttribute('sandbox');
    assert.equal(sandbox, 'allow-scripts allow-downloads', `${engine}: cold frame sandbox changed`);
    assert.equal(
      sandbox.includes('allow-same-origin'),
      false,
      `${engine}: cold frame must remain opaque`
    );
    const coldFrame = await getColdFrame(page, engine);
    const coldPolicy = await coldFrame.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    const coldScript = await coldFrame.locator('script').textContent();
    const coldStyle = await coldFrame.locator('style').textContent();
    assert.match(coldPolicy, /connect-src 'none'/, `${engine}: cold CSP lacks connect-src 'none'`);
    assert.match(coldPolicy, new RegExp(escapedRegExp(cspHash(coldScript))));
    assert.match(coldPolicy, new RegExp(escapedRegExp(cspHash(coldStyle))));
    assert.equal(await coldFrame.locator('html').getAttribute('data-csp-canary'), 'passed');
    assert.equal(await coldFrame.locator('html').getAttribute('data-runtime-neutering'), 'installed');
    assert.equal(await page.evaluate(() => typeof window.__coldboxCrypto), 'undefined');
    assert.equal(await coldFrame.evaluate(() => typeof window.__coldboxCrypto.benchmarkProfiles), 'function');
    assert.equal(await coldFrame.locator('html').getAttribute('data-vault-operations'), 'guarded');
    assert.equal(await page.evaluate(() => typeof window.__coldboxVault), 'undefined');
    assert.equal(await coldFrame.evaluate(() => typeof window.__coldboxVault), 'object');
    assert.equal(await coldFrame.evaluate(() => window.__coldboxVault.formatVersion), 1);
    assert.equal(await coldFrame.evaluate(() => typeof window.__coldboxVault.healthReady), 'function');
    assert.equal(await coldFrame.evaluate(() => window.__coldboxVault.healthReady()), true);
    assert.equal(await coldFrame.evaluate(() => typeof window.__coldboxVault.openSession), 'function');
    assert.equal(await coldFrame.evaluate(() => typeof window.__coldboxVault.deriveSecretSubkey), 'undefined');
    assert.equal(await coldFrame.locator('html').getAttribute('data-crypto-state'), 'ready');
    assert.equal(await coldFrame.locator('html').getAttribute('data-kdf-active'), 'argon2id-standard');
    await coldFrame.locator('#cold-kdf-details[data-kdf-active="argon2id-standard"]').waitFor({ state: 'visible' });
    assert.match(await coldFrame.locator('#cold-kdf-active').textContent(), /Argon2id WASM/);
    assert.match(await coldFrame.locator('#cold-crypto-path').textContent(), /RFC 9106/);
    assert.equal(await coldFrame.locator('#cold-kdf-benchmark-run').isDisabled(), false);
    assert.equal(await coldFrame.locator('#cold-kdf-benchmark-result').textContent(), 'Benchmark not run.');
    await page.locator('#capability-crypto-summary').waitFor({ state: 'visible' });
    assert.match(await page.locator('#capability-crypto-summary').textContent(), /argon2id-standard/);
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'visible' });
    // Make the P0.19 Windows regression deterministic: the cold frame's native
    // browser-interface hint remains optimistic while warm active probes are
    // later forced unreachable. Vault mode must follow validated mode.set, not
    // this stale navigator.onLine value.
    await coldFrame.evaluate(() => {
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get() { return true; }
      });
    });
    assert.equal(await coldFrame.evaluate(() => navigator.onLine), true);
    await harness.expectParentCannotReadFrame();
    await harness.expectCspViolation('connect-src', { blockedURI: WARM_CANARY_URL });
    await harness.expectCspViolationInFrame(
      coldFrame,
      'connect-src',
      { blockedURI: COLD_CANARY_URL }
    );
    await harness.expectNoConsoleErrors({
      allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT]
    });
    await page.locator('html[data-reachability-state="reachable"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.ok(
      reachability.requests().includes(REACHABILITY_PRIMARY_URL),
      `${engine}: active reachability monitor never called the primary warm-shell probe`
    );

    // Browser interface signals are hints only. Force both allowlisted active
    // probes to fail twice while leaving navigator.onLine untouched; only the
    // consecutive active failures may establish offline mode.
    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unknown"]').waitFor({ state: 'attached', timeout: 5000 });
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await page.locator('#airgap-banner[data-airgap-state="green"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(
      await coldFrame.evaluate(() => navigator.onLine),
      true,
      `${engine}: test must preserve the stale navigator.onLine=true disagreement`
    );
    assert.match(await page.locator('#warm-reachability-status').textContent(), /not proof.*physically airgapped/i);

    // Any probe success flips online-safe immediately.
    reachability.setMode('reachable');
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="reachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await page.locator('#airgap-banner[data-airgap-state="amber"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'attached', timeout: 5000 });

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('#airgap-banner[data-airgap-state="green"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });

    // A new probe makes an offline classification online-safe immediately,
    // including when a normal parent-shell action causes a focus-triggered
    // check. Re-establish reachable mode before exercising the durable save
    // flow so this test does not ask an intentionally sealed session to save
    // after the security transition has already locked it.
    reachability.setMode('reachable');
    await triggerReachabilityRound(page);
    await page.locator('#airgap-banner[data-airgap-state="amber"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'attached', timeout: 5000 });

    // Creation confirmation is creation-only: a mismatch must create nothing,
    // then the same prepared vault can succeed when confirmation matches.
    await prepareVaultCreation(page, coldFrame, 'Browser Round Trip');
    await coldFrame.locator('#cold-vault-passphrase').fill('browser round-trip phrase');
    await coldFrame.locator('#cold-vault-passphrase-confirm').fill('browser round-trip typo');
    await coldFrame.locator('#cold-vault-create').click();
    await coldFrame.locator('#cold-vault-status').filter({ hasText: /do not match/ }).waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-create-error:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-vault-create-error').textContent(), /do not match/i);
    assert.notEqual(await coldFrame.locator('#cold-vault-status').getAttribute('data-state'), 'unlocked');
    assert.equal(await coldFrame.locator('#cold-vault-passphrase-confirm').inputValue(), '');
    await coldFrame.locator('#cold-vault-passphrase-confirm').fill('browser round-trip phrase');
    await coldFrame.locator('#cold-vault-create').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await coldFrame.locator('#cold-vault-passphrase').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-vault-passphrase-confirm').inputValue(), '');
    const activeVaultIdText = (await page.locator('#vault-active-id').textContent()).trim();
    const activeVaultIdMatch = /^Vault ID ([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(activeVaultIdText);
    assert.ok(activeVaultIdMatch, `${engine}: created vault must expose a valid authenticated random UUID as public metadata`);
    const activeVaultId = activeVaultIdMatch[1];

    // The cold frame's visible normal lock must not bypass the warm dirty
    // warning. It sends vault.lockRequest and leaves the session unlocked
    // until the user chooses from the warm confirmation surface.
    await coldFrame.locator('#cold-vault-lock').click();
    await page.locator('#vault-lock-warning:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-status').getAttribute('data-state'), 'unlocked');
    assert.match(await page.locator('#vault-lock-warning').textContent(), /never completed a durable save|unsaved/i);
    await page.locator('#vault-lock-cancel').click();
    await page.locator('#vault-lock-warning[hidden]').waitFor({ state: 'hidden' });
    assert.equal(await coldFrame.locator('#cold-vault-status').getAttribute('data-state'), 'unlocked');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#vault-save-download').click();
    const download = await downloadPromise;
    const canonicalFilename = `Browser-Round-Trip--${activeVaultId.replace(/-/g, '').slice(0, 8).toLowerCase()}.cbx`;
    assert.equal(
      download.suggestedFilename(),
      canonicalFilename,
      `${engine}: canonical save filename must bind public name + short authenticated Vault ID without a visible generation suffix`
    );
    await page.locator('#vault-status-label').filter({ hasText: /Saved · unverified/ }).waitFor({ state: 'visible', timeout: 5000 });
    const downloadedVaultPath = await download.path();
    assert.ok(downloadedVaultPath, `${engine}: browser harness needs the downloaded canonical .cbx to exercise durable-source live transfer`);
    assert.equal((await page.locator('#vault-active-id').textContent()).trim(), activeVaultIdText, `${engine}: download save must not change Vault ID`);
    assert.equal(await page.locator('#vault-save-primary').isDisabled(), true, `${engine}: unchanged saved vault must not be saved again as another look-alike copy`);
    assert.equal(await page.locator('#vault-save-download').isDisabled(), true, `${engine}: unchanged canonical download action must disable after save`);

    // Advanced Base64 is a handoff surface, not another save and not a QR
    // backup/export route. It remains usable without changing save status.
    await openVaultManualHandoff(page);
    await page.locator('#vault-save-manual').click();
    await page.waitForFunction(() => document.querySelector('#vault-manual-data').value.length > 0);
    const manualVaultText = await page.locator('#vault-manual-data').inputValue();
    assert.ok(manualVaultText.length > 100, `${engine}: encrypted-text handoff should contain encrypted vault bytes`);
    assert.equal(await page.locator('#vault-manual-copy').isDisabled(), false);
    assert.equal(await page.locator('#vault-manual-share').isDisabled(), true);
    assert.equal(await page.locator('[id^="vault-manual-qr-"]').count(), 0, `${engine}: old downloadable/numbered vault QR export controls must not exist`);
    await page.locator('#vault-status-label').filter({ hasText: /Saved · unverified/ }).waitFor({ state: 'visible', timeout: 5000 });

    // A download-only save is unverified and therefore is NOT eligible to
    // become the sender for live QR. This keeps QR from becoming the sender's
    // first/only persistence path and also proves unchanged re-save remains
    // disabled rather than creating another look-alike file.
    await page.locator('#nav-rail a[data-route="qr"]').click();
    await page.locator('#page-qr:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#vault-transfer-start').isDisabled(), true, `${engine}: Saved · unverified vault must not start live transfer before its .cbx is reopened`);
    assert.equal(await page.locator('[id^="vault-transfer-download"]').count(), 0, `${engine}: live transfer must not expose a QR download action`);

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#vault-lock').click();
    await page.locator('#vault-lock-warning:not([hidden])').waitFor({ state: 'visible' });
    assert.match(
      await page.locator('#vault-lock-warning').textContent(),
      /could not verify|unverified/i,
      `${engine}: an exported-but-unverified canonical vault must warn about verification`
    );
    assert.equal(await page.locator('#vault-lock-save').isVisible(), false, `${engine}: unchanged Saved · unverified vault must not offer another Save-first copy`);
    assert.equal((await page.locator('#vault-lock-without-save').textContent()).trim(), 'Lock anyway');
    await page.locator('#vault-lock-without-save').click();
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible' });

    // Reopen the downloaded canonical .cbx. Once its authenticated Vault ID
    // is loaded from durable storage, the live-transfer sender becomes
    // eligible. The animation remains ephemeral and has no downloadable QR
    // artifact.
    // Playwright stores downloads under an opaque temporary basename, so
    // passing download.path() directly would present a non-.cbx filename to
    // the product and the Vault Library would correctly refuse it. Re-inject
    // the exact downloaded bytes under the browser-suggested canonical name
    // to model what the user actually has on disk.
    await page.locator('#vault-file-input').setInputFiles({
      name: canonicalFilename,
      mimeType: 'application/octet-stream',
      buffer: fs.readFileSync(downloadedVaultPath)
    });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').click();
    await page.locator('#vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill('browser round-trip phrase');
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status-label').filter({ hasText: /Loaded/ }).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await page.locator('#vault-active-id').textContent()).trim(), activeVaultIdText, `${engine}: reopening canonical .cbx must preserve Vault ID`);
    await page.locator('#nav-rail a[data-route="qr"]').click();
    await page.locator('#page-qr:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#vault-transfer-start').isDisabled(), false, `${engine}: durable loaded vault should enable live device transfer`);

    await page.locator('#vault-transfer-start').click();
    await page.locator('#vault-transfer-sender:not([hidden])').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const image = document.querySelector('#vault-transfer-image');
      return image && /^CBX-VT\/1\/(?:M|D)\//.test(image.getAttribute('data-transfer-frame') || '');
    });
    const transferFrameOne = await page.locator('#vault-transfer-image').getAttribute('data-transfer-frame');
    assert.match(transferFrameOne, /^CBX-VT\/1\/(?:M|D)\//);
    await page.waitForFunction((first) => {
      const image = document.querySelector('#vault-transfer-image');
      const value = image && image.getAttribute('data-transfer-frame');
      return value && value !== first;
    }, transferFrameOne, { timeout: 5000 });
    await page.locator('#vault-transfer-pause').click();
    assert.equal((await page.locator('#vault-transfer-pause').textContent()).trim(), 'Resume');
    const pausedFrame = await page.locator('#vault-transfer-image').getAttribute('data-transfer-frame');
    await page.waitForTimeout(650);
    assert.equal(await page.locator('#vault-transfer-image').getAttribute('data-transfer-frame'), pausedFrame, `${engine}: paused animated QR frame must remain stable`);
    await page.locator('#vault-transfer-stop').click();
    await page.locator('#vault-transfer-sender[hidden]').waitFor({ state: 'hidden', timeout: 5000 });
    assert.equal(await page.locator('#vault-transfer-image').getAttribute('data-transfer-frame'), null, `${engine}: stopping live transfer must clear the ephemeral frame`);

    // Loaded durable vault has no dirty warning; lock normally before testing
    // the advanced Base64 handoff as an intentionally-unsaved local receipt.
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#vault-lock').click();
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });

    // Re-enter a genuinely offline-classified state while no secret session
    // is open. The manual-text receipt below can then be unlocked offline and
    // the restoration round proves that the new stale/checking transition
    // immediately seals it again.
    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });

    // Manual encrypted text can still be imported as an advanced fallback,
    // but doing so creates an unsaved local working copy and requires the
    // ordinary passphrase. It is not a QR reassembly path.
    await page.locator('#vault-manual-data').fill(manualVaultText);
    await page.locator('#vault-load-manual').click();
    await page.locator('#vault-status[data-state="pending"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-passphrase').fill('browser round-trip phrase');
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status-label').filter({ hasText: /Not saved/ }).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-passphrase-confirm').isVisible(), false, `${engine}: normal unlock must not show creation confirmation`);

    reachability.setMode('reachable');
    await triggerReachabilityRound(page);
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('html').getAttribute('data-cold-working-bytes'), 'cleared');
    console.log(`${engine}: active reachability, visible creation mismatch, immutable Vault ID, truthful save status, cold/warm lock warning, round-trip unlock, and online-transition zeroization passed`);
    await page.locator('#nav-rail .nav-link[data-route="dashboard"]').click();
    await page.waitForFunction(() => window.location.hash === '#dashboard');

    await page.evaluate(() => {
      window.postMessage({
        id: 'injected-global-1',
        type: 'vault.open',
        payload: { bytes: new Uint8Array([1]), mnemonic: 'must-be-discarded' }
      }, '*');
    });
    await page.waitForFunction(() => (
      document.documentElement.getAttribute('data-global-message-anomalies') === '1'
    ));
    await harness.expectElementVisible('#protocol-warning');
    await harness.expectConsoleWarning('discarded a global message after handshake');
    await coldFrame.evaluate(() => {
      window.postMessage({
        id: 'injected-global-2',
        type: 'private.key',
        payload: { privateKey: 'must-be-discarded' }
      }, '*');
    });
    await coldFrame.waitForFunction(() => (
      document.documentElement.getAttribute('data-global-message-anomalies') === '1'
    ));
    await coldFrame.locator('#cold-protocol-warning').waitFor({ state: 'visible' });
    await harness.expectConsoleWarning('discarded a global message after handshake');
    const cspProbe = await createCspProbeFrame(page, engine);
    for (const primitive of ['fetch', 'XMLHttpRequest', 'WebSocket']) {
      const result = await harness.expectNetworkPrimitiveBlocked(
        primitive,
        cspProbe.frame,
        { requireCspViolation: true }
      );
      console.log(`${engine}: CSP probe ${primitive} reported blocked (${result.signal})`);
    }
    await page.locator(`#${cspProbe.frameId}`).evaluate((iframe) => iframe.remove());
    for (const primitive of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon']) {
      const result = await harness.expectNetworkPrimitiveBlocked(
        primitive,
        coldFrame,
        { requireRuntimeBlock: true }
      );
      assert.equal(result.signal, 'threw', `${engine}: ${primitive} did not satisfy the literal throw contract`);
      console.log(`${engine}: cold realm ${primitive} reported blocked (${result.signal})`);
      console.log(`${engine}: cold realm ${primitive} reported runtime-blocked (${result.signal})`);
    }
    const prototypeResults = await coldFrame.evaluate(() => {
      const deepestOwner = (target, key) => {
        let owner = null;
        let current = target;
        while (current) {
          if (Object.prototype.hasOwnProperty.call(current, key)) {
            owner = current;
          }
          current = Object.getPrototypeOf(current);
        }
        return owner;
      };
      const result = {};
      const fetchOwner = deepestOwner(window, 'fetch');
      const beaconOwner = deepestOwner(navigator, 'sendBeacon');
      try {
        fetchOwner.fetch.call(window, 'https://coldbox.invalid/prototype-fetch');
        result.fetch = { blocked: false, error: '' };
      } catch (error) {
        result.fetch = { blocked: true, error: String(error) };
      }
      try {
        beaconOwner.sendBeacon.call(navigator, 'https://coldbox.invalid/prototype-beacon', 'coldbox');
        result.sendBeacon = { blocked: false, error: '' };
      } catch (error) {
        result.sendBeacon = { blocked: true, error: String(error) };
      }
      return result;
    });
    assert.equal(prototypeResults.fetch.blocked, true, `${engine}: prototype fetch restoration bypassed the guard`);
    assert.match(prototypeResults.fetch.error, /Coldbox airgap blocked fetch/);
    assert.equal(prototypeResults.sendBeacon.blocked, true, `${engine}: prototype sendBeacon restoration bypassed the guard`);
    assert.match(prototypeResults.sendBeacon.error, /Coldbox airgap blocked sendBeacon/);
    await page.locator('#airgap-banner[data-airgap-state="red"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#app').getAttribute('data-vault-operations'), 'refused');
    assert.equal(await coldFrame.locator('html').getAttribute('data-vault-operations'), 'refused');
    assert.equal(await coldFrame.evaluate(() => window.__coldboxVault.healthReady()), false);
    assert.equal(
      await coldFrame.locator('#cold-kdf-benchmark-run').isDisabled(),
      true,
      `${engine}: F3 regression - benchmark stayed usable after the cold realm refused vault operations`
    );
    console.log(`${engine}: F3 benchmark control disabled after runtime airgap lockdown`);
    await harness.expectCspViolationInFrame(
      coldFrame,
      'connect-src',
      { blockedURI: COLD_CANARY_URL }
    );
    await harness.expectElementVisible('#nav-rail');
    await harness.expectElementVisible('#theme-toggle');
    await harness.expectElementVisible('#nav-rail .nav-link[aria-current="page"]');
    assert.equal(
      await page.locator('#current-section').textContent(),
      'Dashboard',
      `${engine}: dashboard should be the default route`
    );

    await page.locator('#nav-rail a[data-route="portfolio"]').click();
    await page.waitForFunction(() => window.location.hash === '#portfolio');
    await harness.expectElementVisible('#page-portfolio:not([hidden])');
    assert.equal(
      await page.locator('#current-section').textContent(),
      'Portfolio',
      `${engine}: route navigation did not update the current section`
    );

    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');

    await harness.atViewport(1440, 900);
    assert.equal(await page.locator('#nav-rail').isVisible(), true);
    assert.equal(await page.locator('#mobile-tabs').isVisible(), false);

    await harness.atViewport(360, 640);
    const benchmarkTouchRect = await coldFrame.locator('#cold-kdf-benchmark-run').evaluate((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert.ok(benchmarkTouchRect.width >= 44, `${engine}: benchmark mobile target width is below 44 CSS px`);
    assert.ok(benchmarkTouchRect.height >= 44, `${engine}: benchmark mobile target height is below 44 CSS px`);
    assert.equal(await page.locator('#nav-rail').isVisible(), false);
    assert.equal(await page.locator('#mobile-tabs').isVisible(), true);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${engine}: warm shell overflows horizontally at 360px`
    );
    await page.locator('#mobile-tabs a[data-route="prices"]').click();
    await page.waitForFunction(() => window.location.hash === '#prices');
    await harness.expectElementVisible('#page-prices:not([hidden])');
    await page.locator('#mobile-more-tab').click();
    assert.equal(await page.locator('#mobile-more-menu').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobile-more-menu').isVisible(), false);
    assert.equal(
      await page.evaluate(() => document.activeElement && document.activeElement.id),
      'mobile-more-tab',
      `${engine}: Escape did not return focus to the mobile overflow tab`
    );
    await page.locator('#mobile-more-tab').click();
    await page.locator('#mobile-more-menu a[data-route="reference"]').click();
    await page.waitForFunction(() => window.location.hash === '#reference');
    await harness.expectElementVisible('#page-reference:not([hidden])');
    assert.equal(await page.locator('#mobile-more-menu').isVisible(), false);

    await harness.expectOnlyCspViolations(['connect-src']);
    await harness.expectCspViolationInFrame(
      coldFrame,
      'connect-src',
      { blockedURI: COLD_CANARY_URL }
    );
    console.log(`${engine}: warm shell routes, theme switch, responsive navigation, and cold boundary passed over file://`);
  } finally {
    await closePage(page);
  }
}

async function verifyStaleReachabilityOnlineSafety(browser, engine) {
  const opened = await openPage(browser, buildPath, 'reachable', { suspendReachabilityInterval: true });
  try {
    const { page, reachability } = opened;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const coldFrame = await getColdFrame(page, engine);

    // Establish a real offline-classified session first. The next round is
    // then held before either endpoint resolves, reproducing the stale-state
    // interval found by independent review.
    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });

    await createPreparedVault(page, coldFrame, 'held reachability regression phrase', 'Held Reachability Vault');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await beginHeldReachabilityRound(page, reachability);
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('html').getAttribute('data-reachability-state'), 'unknown');
    assert.equal(await page.locator('html').getAttribute('data-reachability-checking'), 'true');
    assert.equal(await coldFrame.locator('html').getAttribute('data-cold-working-bytes'), 'cleared');

    // Release the held primary probe. It resolves as reachable and completes
    // the same round; this also proves the fixture did not leave a request or
    // a timer behind after the in-flight safety assertion.
    reachability.releaseHeldProbe();
    await page.waitForFunction(() => document.documentElement.getAttribute('data-reachability-checking') === 'false');
    await page.locator('html[data-reachability-state="reachable"]').waitFor({ state: 'attached', timeout: 5000 });
    console.log(`${engine}: stale offline reachability became online-safe immediately and locked the in-flight secret session`);
  } finally {
    await closePage(opened.page);
  }
}

async function verifyVaultLibrary(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const coldFrame = await getColdFrame(page, engine);

    async function createExport(name, phrase) {
      await createPreparedVault(page, coldFrame, phrase, name);
      await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
      const idText = (await page.locator('#vault-active-id').textContent()).trim();
      const idMatch = /^Vault ID ([0-9a-f-]{36})$/i.exec(idText);
      assert.ok(idMatch, `${engine}: ${name} did not receive a Vault ID`);
      assert.equal(
        await page.locator('#vault-manual-data').inputValue(),
        '',
        `${engine}: switching to ${name} left a stale manual export from the previous vault`
      );
      await openVaultManualHandoff(page);
      await page.locator('#vault-save-manual').click();
      await page.waitForFunction(() => document.querySelector('#vault-manual-data').value.length > 0);
      const base64 = await page.locator('#vault-manual-data').inputValue();
      await lockVaultDiscardingUnsaved(page);
      await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
      return { id: idMatch[1], name, phrase, bytes: Buffer.from(base64, 'base64') };
    }

    const alpha = await createExport('Alpha Savings', 'alpha library phrase');
    const beta = await createExport('Beta Travel', 'beta library phrase');
    assert.notEqual(alpha.id, beta.id, `${engine}: two vaults created on one device must never share identity`);

    function fileName(record) {
      return `${record.name.replace(/\s+/g, '-')}--${record.id.replace(/-/g, '').slice(0, 8).toLowerCase()}.cbx`;
    }

    await page.locator('#vault-file-input').setInputFiles([
      { name: fileName(alpha), mimeType: 'application/octet-stream', buffer: alpha.bytes },
      { name: fileName(beta), mimeType: 'application/octet-stream', buffer: beta.bytes }
    ]);
    const libraryItems = page.locator('#vault-library-list [data-vault-library-index]');
    await libraryItems.nth(1).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await libraryItems.count(), 2, `${engine}: two user-granted vaults must render as two selectable library entries`);
    assert.match(await page.locator('#vault-library-list').textContent(), /Alpha Savings/);
    assert.match(await page.locator('#vault-library-list').textContent(), /Beta Travel/);

    // Only durable/granted vault identities reserve public names. Alpha and
    // Beta were intentionally discarded while unsaved above, so their names
    // were reusable until these canonical .cbx files entered the library.
    // Now a different Vault ID may not claim Alpha's known public name.
    await page.locator('#vault-create-name').fill('Alpha Savings');
    await page.locator('#vault-create-prepare').click();
    const duplicateNameNotice = page.locator('#vault-status-copy');
    await duplicateNameNotice.filter({ hasText: /different vault already uses that public name/i }).waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await duplicateNameNotice.textContent(), /different vault already uses that public name/i);
    assert.equal(await coldFrame.locator('#cold-vault-status').getAttribute('data-state'), 'locked', `${engine}: granted duplicate public name must not prepare a new cold vault`);

    async function selectUnlock(record) {
      const item = page.locator('#vault-library-list [data-vault-library-index]', { hasText: record.name });
      await item.click();
      await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await coldFrame.locator('#cold-vault-passphrase-confirm').isVisible(), false, `${engine}: existing-vault library unlock must never ask for confirmation`);
      await coldFrame.locator('#cold-vault-passphrase').fill(record.phrase);
      await coldFrame.locator('#cold-vault-unlock').click();
      await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
      assert.equal((await page.locator('#vault-active-name').textContent()).trim(), record.name);
      assert.match((await page.locator('#vault-active-id').textContent()).trim(), new RegExp(record.id, 'i'));
    }

    await selectUnlock(beta);
    await lockVaultDiscardingUnsaved(page);
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await selectUnlock(alpha);

    console.log(`${engine}: two named portable Vault IDs were independently selectable and unlockable from the user-granted Vault Library`);
  } finally {
    await closePage(page);
  }
}

async function verifyColdRealmFailure(browser, engine) {
  const page = await browser.newPage();
  await installReachabilityRoutes(page);
  await page.addInitScript(() => {
    const createElement = Document.prototype.createElement;
    Document.prototype.createElement = function createElementWithColdFrameFailure(name) {
      if (String(name).toLowerCase() === 'iframe') {
        throw new Error('deliberate cold iframe creation failure');
      }
      return createElement.apply(this, arguments);
    };
  });
  const harness = await createHarness(page);
  try {
    await page.goto(fileUrl(buildPath), { waitUntil: 'load' });
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#cold-realm-status[data-cold-state="failed"]').waitFor({ state: 'visible' });
    await harness.expectElementVisible('#cold-realm-failure');
    assert.equal(await page.locator('#cold-frame').count(), 0, `${engine}: failed bootstrap left a frame active`);
    assert.equal(
      await page.locator('#app').getAttribute('data-cold-state'),
      'failed',
      `${engine}: failed bootstrap did not lock the app`
    );
    await harness.expectCspViolation('connect-src', { blockedURI: WARM_CANARY_URL });
    await harness.expectNoConsoleErrors({
      allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT]
    });
    console.log(`${engine}: cold realm creation failure produced an explicit lockdown state`);
  } finally {
    await closePage(page);
  }
}

async function verifyUnlockedRuntimeHealthLockdown(browser, engine) {
  let opened = await openPage(browser, buildPath);
  try {
    let page = opened.page;
    let harness = opened.harness;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    let coldFrame = await getColdFrame(page, engine);
    await createPreparedVault(page, coldFrame, 'runtime violation unlocked phrase', 'Runtime Violation Vault');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    const runtimeResult = await harness.expectNetworkPrimitiveBlocked(
      'fetch',
      coldFrame,
      { requireRuntimeBlock: true }
    );
    assert.equal(runtimeResult.signal, 'threw', `${engine}: unlocked runtime airgap probe did not throw`);
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('html').getAttribute('data-cold-working-bytes'), 'cleared');
    assert.equal(await coldFrame.locator('#cold-vault-passphrase').inputValue(), '');
    assert.equal(await coldFrame.locator('html').getAttribute('data-airgap-state'), 'red');
    assert.equal(await coldFrame.locator('html').getAttribute('data-lockdown-state'), 'full');
    assert.equal(await coldFrame.locator('html').getAttribute('data-vault-operations'), 'refused');
    console.log(`${engine}: unlocked runtime airgap violation closed and zeroized the active vault session`);

    await closePage(page);
    opened = await openPage(browser, buildPath);
    page = opened.page;
    harness = opened.harness;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    coldFrame = await getColdFrame(page, engine);
    await createPreparedVault(page, coldFrame, 'save health drift phrase', 'Save Health Vault');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await coldFrame.locator('html').evaluate((root) => root.setAttribute('data-airgap-state', 'red'));
    await openVaultManualHandoff(page);
    await page.locator('#vault-save-manual').click();
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('html').getAttribute('data-cold-working-bytes'), 'cleared');
    assert.equal(await coldFrame.locator('#cold-vault-passphrase').inputValue(), '');
    console.log(`${engine}: unlocked save-time health failure closed and zeroized the active vault session`);
  } finally {
    if (opened && opened.page) {
      await closePage(opened.page);
    }
  }
}
async function verifyPanicHide(browser, engine) {
  const { harness, page } = await openPage(browser, buildPath);
  try {
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    let coldFrame = await getColdFrame(page, engine);
    await createPreparedVault(page, coldFrame, 'panic session phrase', 'Warm Panic Vault');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.locator('#panic-screen:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#app').isHidden(), true, `${engine}: panic hide left the warm app visible`);
    assert.equal(await page.locator('#panic-screen').isVisible(), true, `${engine}: panic hide did not show its recovery screen`);
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached' });
    assert.equal(
      await coldFrame.locator('html').getAttribute('data-cold-working-bytes'),
      'cleared',
      `${engine}: warm panic did not clear cold working bytes`
    );
    assert.equal(
      await coldFrame.locator('#cold-vault-passphrase').inputValue(),
      '',
      `${engine}: warm panic did not clear the cold passphrase field`
    );

    await page.reload({ waitUntil: 'load' });
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    coldFrame = await getColdFrame(page, engine);
    await createPreparedVault(page, coldFrame, 'cold panic session phrase', 'Cold Panic Vault');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await page.locator('#panic-screen:not([hidden])').waitFor({ state: 'visible' });
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached' });
    assert.equal(
      await coldFrame.locator('html').getAttribute('data-cold-working-bytes'),
      'cleared',
      `${engine}: cold panic did not clear cold working bytes`
    );
    assert.equal(
      await coldFrame.locator('#cold-vault-passphrase').inputValue(),
      '',
      `${engine}: cold panic did not clear the cold passphrase field`
    );
    await harness.expectCspViolation('connect-src', { blockedURI: WARM_CANARY_URL });
    await harness.expectNoConsoleErrors({
      allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT]
    });
    console.log(`${engine}: warm and cold Escape Escape paths locked, cleared, and concealed the app`);
  } finally {
    await closePage(page);
  }
}

async function verifyColdRealmTimeout(browser, engine) {
  const fixture = createColdReadySuppressedFixture();
  const page = await browser.newPage();
  await installReachabilityRoutes(page);
  const harness = await createHarness(page);
  try {
    await page.goto(fileUrl(fixture.path), { waitUntil: 'load' });
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#cold-realm-status[data-cold-state="failed"]').waitFor({ state: 'visible' });
    await harness.expectElementVisible('#cold-realm-failure');
    assert.equal(
      await page.locator('#cold-frame').count(),
      0,
      `${engine}: readiness timeout left a cold frame attached`
    );
    assert.equal(
      await page.locator('#app').getAttribute('data-cold-state'),
      'failed',
      `${engine}: readiness timeout did not lock the app`
    );
    await harness.expectNoConsoleErrors({
      allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT]
    });
    await harness.expectOnlyCspViolations(['connect-src']);
    await harness.expectCspViolation('connect-src', { blockedURI: WARM_CANARY_URL });
    console.log(`${engine}: cold realm readiness timeout removed the frame and locked down`);
  } finally {
    await page.close();
    fs.rmSync(fixture.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyHandshakeTimeout(browser, engine) {
  const fixture = createHandshakeResponseSuppressedFixture();
  const page = await browser.newPage();
  await installReachabilityRoutes(page);
  const harness = await createHarness(page);
  try {
    await page.goto(fileUrl(fixture.path), { waitUntil: 'load' });
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#cold-realm-status[data-cold-state="failed"]').waitFor({ state: 'visible' });
    assert.match(
      await page.locator('#cold-realm-status-copy').textContent(),
      /private channel did not complete/,
      `${engine}: handshake timeout used the boot-failure copy`
    );
    await harness.expectElementVisible('#cold-realm-failure');
    assert.equal(
      await page.locator('#cold-frame').count(),
      0,
      `${engine}: handshake timeout left a cold frame attached`
    );
    await harness.expectNoConsoleErrors({
      allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT]
    });
    await harness.expectOnlyCspViolations(['connect-src']);
    await harness.expectCspViolation('connect-src', { blockedURI: WARM_CANARY_URL });
    console.log(`${engine}: typed handshake timeout used distinct copy and locked down`);
  } finally {
    await page.close();
    fs.rmSync(fixture.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyCspStrippedLockdown(browser, engine, kind) {
  const stripped = createCspStrippedFixture(kind);
  try {
    const { harness, page } = await openPage(browser, stripped.path);
    try {
      await page.locator('#nav-rail a[data-route="system-health"]').click();
      await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
      await page.locator('#app[data-lockdown-state="full"]').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#airgap-banner[data-airgap-state="red"]').waitFor({ state: 'visible' });
      assert.equal(
        await page.locator('#app').getAttribute('data-vault-operations'),
        'refused',
        `${engine}: ${kind} CSP build did not refuse vault operations`
      );
      assert.equal(
        await page.locator('#cold-frame').count(),
        0,
        `${engine}: ${kind} CSP build left a cold frame active`
      );
      if (kind === 'cold-only') {
        assert.equal(
          await page.locator('html').getAttribute('data-csp-canary'),
          'passed',
          `${engine}: warm canary did not remain healthy when only the cold CSP was stripped`
        );
        await harness.expectCspViolation('connect-src', { blockedURI: WARM_CANARY_URL });
      } else {
        await page.locator('html[data-csp-canary="failed"]').waitFor({ state: 'attached', timeout: 5000 });
        assert.equal(
          await page.locator('html').getAttribute('data-csp-canary'),
          'failed',
          `${engine}: ${kind} warm canary did not fail closed`
        );
        assert.deepEqual(await page.evaluate(() => window.__coldboxCspViolations || []), []);
      }
      await harness.expectNoConsoleErrors({
        allowedFragments: [
          CANARY_ERROR_FRAGMENT,
          COLD_CANARY_ERROR_FRAGMENT,
          'ERR_NAME_NOT_RESOLVED',
          'NS_ERROR_UNKNOWN_HOST',
          'ERR_CONNECTION_REFUSED',
          'net::ERR_',
          'Failed to load resource'
        ]
      });
      console.log(`${engine}: ${kind} CSP build entered full lockdown and refused vault operations`);
    } finally {
      await closePage(page);
    }
  } finally {
    fs.rmSync(stripped.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyProviderNeutering(browser, engine) {
  // P0.21: window.ethereum and eip6963:announceProvider are the two
  // observable surfaces of an injected wallet provider inside the cold
  // realm. Neither is reachable through connect-src, so this is the
  // isolation-failure counterpart to the network-primitive checks above.
  let opened = await openPage(browser, buildPath);
  try {
    let page = opened.page;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    let coldFrame = await getColdFrame(page, engine);

    const survivalResult = await coldFrame.evaluate(() => {
      const result = {};
      try {
        Object.defineProperty(window, 'ethereum', { value: { isMetaMask: true }, configurable: true });
        result.redefine = { threw: false };
      } catch (error) {
        result.redefine = { threw: true, error: String(error) };
      }
      try {
        result.deleteReturned = delete window.ethereum;
      } catch (error) {
        result.deleteReturned = null;
        result.deleteThrew = String(error);
      }
      result.ethereumAfter = window.ethereum;
      return result;
    });
    assert.equal(survivalResult.redefine.threw, true, `${engine}: window.ethereum accessor was not redefine-resistant`);
    assert.equal(survivalResult.ethereumAfter, undefined, `${engine}: window.ethereum returned a value after a redefine attempt`);
    assert.equal(await coldFrame.locator('html').getAttribute('data-airgap-state'), 'green', `${engine}: a blocked redefine attempt should not itself count as an observed provider`);
    console.log(`${engine}: window.ethereum accessor survived a redefine/delete attempt (negative test)`);

    await coldFrame.evaluate(() => {
      window.ethereum = { isMetaMask: true };
    });
    await coldFrame.locator('html[data-airgap-state="red"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('html').getAttribute('data-lockdown-state'), 'full');
    assert.equal(await coldFrame.locator('html').getAttribute('data-vault-operations'), 'refused');
    assert.equal(await coldFrame.locator('html').getAttribute('data-provider-neutering-violations'), '1');
    const coldDetailsText = await coldFrame.locator('#cold-realm-details').textContent();
    assert.match(coldDetailsText, /isolation failure/i, `${engine}: provider violation text did not identify itself as an isolation failure`);
    assert.doesNotMatch(coldDetailsText, /content security policy|csp/i, `${engine}: provider isolation text should not be phrased as a CSP/policy violation`);
    await page.locator('#app[data-vault-operations="refused"]').waitFor({ state: 'visible', timeout: 5000 });
    const warmStatusText = await page.locator('#cold-realm-status-copy').textContent();
    assert.match(warmStatusText, /isolation failure/i, `${engine}: warm shell did not surface the provider isolation failure`);
    console.log(`${engine}: window.ethereum assignment attempt entered full lockdown as an isolation failure, distinct from a policy violation`);
  } finally {
    if (opened && opened.page) {
      await closePage(opened.page);
    }
  }

  opened = await openPage(browser, buildPath);
  try {
    const page = opened.page;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    const coldFrame = await getColdFrame(page, engine);

    await coldFrame.evaluate(() => {
      window.dispatchEvent(new CustomEvent('some-unrelated-event', { detail: { info: 'noop' } }));
    });
    assert.equal(await coldFrame.locator('html').getAttribute('data-airgap-state'), 'green', `${engine}: an unrelated event should not trip the provider guard`);

    await coldFrame.evaluate(() => {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: { info: { uuid: 'test-uuid', name: 'Test Wallet' }, provider: {} }
      }));
    });
    await coldFrame.locator('html[data-airgap-state="red"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('html').getAttribute('data-lockdown-state'), 'full');
    assert.equal(await coldFrame.locator('html').getAttribute('data-vault-operations'), 'refused');
    assert.equal(await coldFrame.locator('html').getAttribute('data-provider-neutering-violations'), '1');
    const coldDetailsText = await coldFrame.locator('#cold-realm-details').textContent();
    assert.match(coldDetailsText, /isolation failure/i, `${engine}: eip6963 announcement text did not identify itself as an isolation failure`);
    console.log(`${engine}: a dispatched eip6963:announceProvider event inside the cold realm was detected and triggered full lockdown`);
  } finally {
    if (opened && opened.page) {
      await closePage(opened.page);
    }
  }
}

async function verifyPreexistingProviderLockdown(browser, engine) {
  // F1 remediation (P0.21 review): a provider present before Coldbox's own
  // guard installs - the timing an injected extension would actually use -
  // must be treated as an isolation failure and block readiness entirely,
  // not be silently neutered while bootstrap reports success.
  const fixture = createPreexistingProviderFixture();
  try {
    const { page } = await openPage(browser, fixture.path);
    try {
      await page.locator('#app[data-handshake-state="failed"]').waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.locator('#app').getAttribute('data-vault-operations'), 'refused');
      assert.equal(await page.locator('#app').getAttribute('data-lockdown-state'), 'full');
      assert.notEqual(
        await page.locator('#app').getAttribute('data-cold-state'),
        'ready',
        `${engine}: a preexisting provider must not let the cold realm reach ready`
      );
      console.log(`${engine}: a provider present before cold bootstrap triggered full lockdown instead of reaching ready`);
    } finally {
      await closePage(page);
    }
  } finally {
    fs.rmSync(fixture.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyMissingRandomnessLockdown(browser, engine) {
  const fixture = createMissingRandomnessFixture();
  try {
    const { harness, page } = await openPage(browser, fixture.path);
    try {
      await page.locator('#nav-rail a[data-route="system-health"]').click();
      await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
      await page.locator('#app[data-capability-state="failed"]').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#capability-panel[data-capability-state="failed"]').waitFor({ state: 'visible' });
      assert.equal(
        await page.locator('html').getAttribute('data-capability-warm-randomValues'),
        'false',
        `${engine}: missing-randomness fixture did not fail the warm capability check`
      );
      assert.equal(
        await page.locator('#app').getAttribute('data-lockdown-state'),
        'full',
        `${engine}: missing-randomness fixture did not enter full lockdown`
      );
      assert.equal(
        await page.locator('#app').getAttribute('data-vault-operations'),
        'refused',
        `${engine}: missing-randomness fixture did not refuse vault operations`
      );
      assert.equal(await page.locator('#cold-frame').count(), 0, `${engine}: missing-randomness fixture left a cold frame active`);
      await harness.expectCspViolation('connect-src');
      await harness.expectNoConsoleErrors({
        allowedFragments: [CANARY_ERROR_FRAGMENT, COLD_CANARY_ERROR_FRAGMENT]
      });
      const failureText = await page.locator('#cold-realm-failure').textContent();
      assert.match(failureText, /never substitutes Math\.random/);
      console.log(`${engine}: missing getRandomValues entered full lockdown and refused vault operations`);
    } finally {
      await closePage(page);
    }
  } finally {
    fs.rmSync(fixture.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyTamperedBuiltFile(browser, engine) {
  const tampered = createTamperedBuildFixture();
  try {
    const { harness, page } = await openPage(browser, tampered.path);
    try {
      await harness.expectCspViolation('script-src');
      const shellMatches = await page.locator('#app[data-build-state="warm-shell"]').count();
      assert.equal(
        shellMatches,
        0,
        `${engine}: tampered built script ran and set the warm-shell state`
      );
      console.log(`${engine}: built-artifact byte tampering triggered script-src and prevented execution`);
    } finally {
      await closePage(page);
    }
  } finally {
    fs.rmSync(tampered.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyCspFixture(browser, engine) {
  const fixture = path.join(fixtureRoot, 'csp-violation.html');
  const { harness, page } = await openPage(browser, fixture);
  try {
    await harness.expectCspViolation('script-src');
    console.log(`${engine}: detected deliberate CSP violation`);
  } finally {
    await closePage(page);
  }
}

async function verifyTamperFixture(browser, engine) {
  const tampered = createTamperedFixture();
  try {
    const { harness, page } = await openPage(browser, tampered.path);
    try {
      await harness.expectScriptRejected();
      console.log(`${engine}: reported byte-tampered inline script rejection`);
    } finally {
      await closePage(page);
    }
  } finally {
    fs.rmSync(tampered.temporaryRoot, { force: true, recursive: true });
  }
}

async function verifyUntamperedFixture(browser, engine) {
  const fixture = path.join(fixtureRoot, 'tamper.html');
  const { harness, page } = await openPage(browser, fixture);
  try {
    const markerValue = await page.evaluate(() => window.__coldboxTamperScriptRan);
    assert.equal(markerValue, true, `${engine}: untampered inline script did not run`);
    await harness.expectNoConsoleErrors();
    await harness.expectNoCspViolations();
    console.log(`${engine}: confirmed untampered inline script control`);
  } finally {
    await closePage(page);
  }
}

async function verifyReusableAssertions(browser, engine) {
  const fixture = path.join(fixtureRoot, 'harness-target.html');
  const { harness, page } = await openPage(browser, fixture);
  try {
    await harness.expectElementVisible('#fixture-visible');
    await harness.atViewport(360, 640);
    await harness.expectElementVisible('#fixture-visible');

    await page.waitForFunction(() => {
      const iframe = document.querySelector('#cold-frame');
      return iframe && iframe.contentWindow;
    });
    const frame = page.frames().find((candidate) => candidate.parentFrame());
    assert.ok(frame, `${engine}: harness target did not create a child frame`);
    await frame.locator('#cold-ready').waitFor({ state: 'visible' });
    await harness.expectParentCannotReadFrame();
    for (const primitive of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon']) {
      const result = await harness.expectNetworkPrimitiveBlocked(
        primitive,
        frame,
        { requireCspViolation: true }
      );
      assert.equal(result.cspViolation, true, `${engine}: standalone native CSP probe lost exact evidence for ${primitive}`);
      console.log(`${engine}: ${primitive} reported blocked (${result.signal})`);
    }
    await harness.expectCspViolationInFrame(
      frame,
      'connect-src',
      { blockedURI: 'https://coldbox.invalid/network-primitive-test' }
    );
    console.log(`${engine}: reusable frame and viewport assertions passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyKeyfileUiAndRegressions(browser, engine) {
  // F3: keyfile toggle/warning/input UI requirements, executed against the
  // real built file:// artifact, plus the F1 (stale FileReader ordering) and
  // F2 (lock leaves stale keyfile UI) regressions. Runs in both Chromium and
  // Firefox via the normal per-engine loop in run().
  const { page } = await openPageWithFileReaderControl(browser, buildPath);
  try {
    // The keyfile controls live inside the cold iframe, which is reachable
    // regardless of warm-shell routing - but #vault-save-manual and the
    // other warm-shell save/lock/status controls this test also drives live
    // inside #page-vault, which is `hidden` until the vault route is
    // navigated to (matching the existing round-trip test's sequencing).
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });

    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-vault-passphrase:not([disabled])').waitFor({ state: 'attached', timeout: 10000 });

    const toggle = coldFrame.locator('#cold-vault-keyfile-toggle');
    const warning = coldFrame.locator('#cold-vault-keyfile-warning');
    const keyfileInput = coldFrame.locator('#cold-vault-keyfile-input');
    const keyfileStatus = coldFrame.locator('#cold-vault-keyfile-status');
    const passphraseInput = coldFrame.locator('#cold-vault-passphrase');

    // --- F3: fresh load / off-by-default / warning wiring ---
    assert.equal(await toggle.isChecked(), false, `${engine}: keyfile toggle must be unchecked on fresh load`);
    assert.equal(await toggle.isDisabled(), false, `${engine}: keyfile toggle should be enabled once the cold realm is ready`);
    assert.equal(await keyfileInput.isDisabled(), true, `${engine}: keyfile input must stay disabled before opt-in`);
    assert.equal(await warning.isHidden(), true, `${engine}: keyfile warning must be hidden before opt-in`);

    await toggle.check();
    assert.equal(await warning.isVisible(), true, `${engine}: checking the toggle must immediately reveal the warning`);
    const warningText = (await warning.textContent()) || '';
    assert.match(
      warningText,
      /permanent(ly)?[\s\S]*unrecoverabl[ey]/i,
      `${engine}: warning text must plainly state that loss/alteration causes permanent, unrecoverable loss`
    );
    assert.match(warningText, /los(ing|t|es)/i, `${engine}: warning text must mention losing the keyfile`);
    assert.match(warningText, /byte/i, `${engine}: warning text must mention byte-level alteration`);
    assert.equal(await keyfileInput.isDisabled(), false, `${engine}: keyfile input must become usable once the toggle is enabled`);
    console.log(`${engine}: fresh-load off-by-default state and warning wiring verified`);

    // --- F1: two out-of-order FileReader completions; only the latest
    // active selection may ever be committed ---
    const staleName = 'coldbox-f1-stale-a.bin';
    const freshName = 'coldbox-f1-fresh-b.bin';
    const staleBytes = Buffer.alloc(128, 0xa1);
    const freshBytes = Buffer.alloc(64, 0xb2);
    await coldFrame.evaluate(({ stale, fresh }) => {
      window.__coldboxTestReadDelays = {};
      window.__coldboxTestReadDelays[stale] = 400;
      window.__coldboxTestReadDelays[fresh] = 0;
    }, { stale: staleName, fresh: freshName });

    // Select the slow file A first (read will not complete for ~400ms)...
    await keyfileInput.setInputFiles({ name: staleName, mimeType: 'application/octet-stream', buffer: staleBytes });
    // ...then, before A's read can complete, select the fast file B.
    await keyfileInput.setInputFiles({ name: freshName, mimeType: 'application/octet-stream', buffer: freshBytes });
    await coldFrame.locator('#cold-vault-keyfile-status')
      .filter({ hasText: /^Keyfile loaded \(64 bytes\)/ })
      .waitFor({ state: 'visible', timeout: 10000 });

    // Wait well past A's artificial delay. If F1 regresses, A's stale onload
    // lands here and silently replaces B's already-committed selection.
    await page.waitForTimeout(700);
    assert.match(
      (await keyfileStatus.textContent()) || '',
      /^Keyfile loaded \(64 bytes\)/,
      `${engine}: F1 regression - a stale keyfile read overwrote the current selection's status`
    );

    // Prove it at the cryptographic layer, not just in the status text: only
    // B's bytes may actually unlock the vault this selection creates.
    await prepareVaultCreation(page, coldFrame, 'Keyfile Regression Vault');
    await passphraseInput.fill('browser f1 regression phrase');
    await coldFrame.locator('#cold-vault-passphrase-confirm').fill('browser f1 regression phrase');
    await coldFrame.locator('#cold-vault-create').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await openVaultManualHandoff(page);
    await page.locator('#vault-save-manual').click();
    await page.waitForFunction(() => document.querySelector('#vault-manual-data').value.length > 0);
    const f1VaultText = await page.locator('#vault-manual-data').inputValue();

    await lockVaultDiscardingUnsaved(page);
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible' });

    await page.locator('#vault-manual-data').fill(f1VaultText);
    await page.locator('#vault-load-manual').click();
    await page.locator('#vault-status[data-state="pending"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible' });

    // Wrong (stale A) bytes must fail...
    await toggle.check();
    await passphraseInput.fill('browser f1 regression phrase');
    await keyfileInput.setInputFiles({ name: staleName, mimeType: 'application/octet-stream', buffer: staleBytes });
    await coldFrame.locator('#cold-vault-keyfile-status')
      .filter({ hasText: /^Keyfile loaded \(128 bytes\)/ })
      .waitFor({ state: 'visible', timeout: 10000 });
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status').filter({ hasText: /Unlock failed/ }).waitFor({ state: 'visible', timeout: 10000 });
    assert.notEqual(
      await coldFrame.locator('#cold-vault-status').getAttribute('data-state'),
      'unlocked',
      `${engine}: F1 regression - the vault unlocked with the stale (never-committed) keyfile bytes`
    );

    // ...and the actually-committed fresh (B) bytes must succeed.
    await keyfileInput.setInputFiles({ name: freshName, mimeType: 'application/octet-stream', buffer: freshBytes });
    await coldFrame.locator('#cold-vault-keyfile-status')
      .filter({ hasText: /^Keyfile loaded \(64 bytes\)/ })
      .waitFor({ state: 'visible', timeout: 10000 });
    await passphraseInput.fill('browser f1 regression phrase');
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    console.log(`${engine}: F1 stale FileReader ordering could not replace or clear the active keyfile selection`);

    // --- F2: lock destroys keyfile bytes and must also clear the visible
    // file-input/status UI, then re-selecting the same file must work ---
    await lockVaultDiscardingUnsaved(page);
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible' });

    await coldFrame.locator('#cold-vault-keyfile-status')
      .filter({ hasText: /^No keyfile selected/ })
      .waitFor({ state: 'visible', timeout: 10000 });
    const keyfileInputValueAfterLock = await keyfileInput.evaluate((element) => element.value);
    assert.equal(
      keyfileInputValueAfterLock,
      '',
      `${engine}: F2 regression - lock left the keyfile file input's value stale`
    );

    // Reload the encrypted vault first (this itself funnels through
    // clearVaultSession a second time, per handleVaultMessage's
    // 'vault.open' handling - the point is that keyfile re-selection below
    // must still work after that, not just after the manual lock above).
    await page.locator('#vault-manual-data').fill(f1VaultText);
    await page.locator('#vault-load-manual').click();
    await page.locator('#vault-status[data-state="pending"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible' });

    // Re-select the exact same file (name + bytes) that was active before
    // lock. The input's value was cleared by every intervening
    // clearVaultSession call specifically so this new selection is
    // guaranteed to register as a change.
    await toggle.check();
    await keyfileInput.setInputFiles({ name: freshName, mimeType: 'application/octet-stream', buffer: freshBytes });
    await coldFrame.locator('#cold-vault-keyfile-status')
      .filter({ hasText: /^Keyfile loaded \(64 bytes\)/ })
      .waitFor({ state: 'visible', timeout: 10000 });
    await passphraseInput.fill('browser f1 regression phrase');
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    console.log(`${engine}: F2 lock cleared keyfile status/input, and re-selecting the same file worked normally`);
  } finally {
    await closePage(page);
  }
}

async function verifyProvenancePanel(browser, engine) {
  // P0.16: the Reference route's provenance panel and self-hash drop zone.
  // The drop zone is exercised with real file bytes via Playwright's
  // setInputFiles, which is the file-upload emulation the roadmap's 🌐
  // marker on this item calls for.
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#nav-rail a[data-route="reference"]').click();
    await page.locator('#page-reference:not([hidden])').waitFor({ state: 'visible' });

    const libraryRows = page.locator('#provenance-library-list .provenance-library-row');
    const manifest = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'vendor', 'vendor-manifest.json'), 'utf8')
    );
    assert.equal(
      await libraryRows.count(),
      manifest.artifacts.length,
      `${engine}: provenance panel must list every vendor-manifest artifact`
    );
    const nobleHashesRow = page.locator('#provenance-library-list .provenance-library-row', {
      hasText: '@noble/hashes'
    });
    await nobleHashesRow.waitFor({ state: 'visible' });
    const nobleHashesArtifact = manifest.artifacts.find((artifact) => artifact.name === '@noble/hashes');
    assert.match(await nobleHashesRow.textContent(), new RegExp(escapedRegExp(nobleHashesArtifact.sha256)));

    const buildDateText = await page.locator('#provenance-build-date').textContent();
    assert.notEqual(buildDateText.trim(), 'Loading…', `${engine}: build date did not render`);
    assert.notEqual(buildDateText.trim(), '', `${engine}: build date is empty`);

    const warmCspText = await page.locator('#provenance-csp-warm').textContent();
    assert.match(warmCspText, /connect-src/, `${engine}: warm CSP panel text missing connect-src`);
    assert.match(warmCspText, /api\.coingecko\.com/, `${engine}: warm CSP panel text missing the documented allowlist`);

    const coldCspText = await page.locator('#provenance-csp-cold').textContent();
    assert.match(coldCspText, /connect-src 'none'/, `${engine}: cold CSP panel text missing connect-src 'none'`);

    assert.match(
      await page.locator('.provenance-section', { hasText: 'Verify this file' }).textContent(),
      /circular/i,
      `${engine}: drop zone must state plainly that self-verification is circular`
    );

    // --- F1: the compiled expected hash must be visible in the panel, and
    // must equal the value in the document's own coldbox-expected-hash meta
    // tag (the same quantity the drop zone compares against). ---
    const declaredExpectedHash = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="coldbox-expected-hash"]');
      return meta ? meta.getAttribute('content') : null;
    });
    assert.match(declaredExpectedHash || '', /^[0-9a-f]{64}$/, `${engine}: running copy has no readable expected-hash meta value`);
    const visibleExpectedHashText = (await page.locator('#provenance-expected-hash').textContent()).trim();
    assert.equal(
      visibleExpectedHashText,
      declaredExpectedHash,
      `${engine}: visible expected-hash value must equal the build's expected-hash meta value`
    );

    // --- self-drop: the exact built file must report a match ---
    const builtBytes = fs.readFileSync(buildPath);
    await page.locator('#provenance-drop-input').setInputFiles({
      name: 'coldbox.html',
      mimeType: 'text/html',
      buffer: builtBytes
    });
    await page.locator('#provenance-drop-result[data-state="match"]').waitFor({ state: 'visible', timeout: 5000 });

    // --- a one-byte-tampered copy of the same file must report a mismatch ---
    const tamperedBytes = Buffer.from(builtBytes);
    const titleIndex = tamperedBytes.indexOf(Buffer.from('<title>Coldbox</title>', 'utf8'));
    assert.notEqual(titleIndex, -1, `${engine}: fixture could not locate a byte to tamper`);
    tamperedBytes[titleIndex] ^= 1;
    await page.locator('#provenance-drop-input').setInputFiles({
      name: 'coldbox-tampered.html',
      mimeType: 'text/html',
      buffer: tamperedBytes
    });
    await page.locator('#provenance-drop-result[data-state="mismatch"]').waitFor({ state: 'visible', timeout: 5000 });

    // --- F2: a byte flipped *inside the declared expected-hash field itself*
    // must also report a mismatch. This is the adversarial case the P0.16
    // review proved false-PASSed under the old blank-then-hash-only
    // comparison, because blanking the field before hashing erases the very
    // byte that was corrupted. ---
    const hashFieldTamperedBytes = Buffer.from(builtBytes);
    const declaredHashBuffer = Buffer.from(declaredExpectedHash, 'utf8');
    const hashFieldIndex = hashFieldTamperedBytes.indexOf(declaredHashBuffer);
    assert.notEqual(hashFieldIndex, -1, `${engine}: fixture could not locate the declared expected-hash bytes to tamper`);
    const originalFirstNibble = String.fromCharCode(hashFieldTamperedBytes[hashFieldIndex]);
    const replacementNibble = originalFirstNibble === '0' ? '1' : '0';
    hashFieldTamperedBytes[hashFieldIndex] = replacementNibble.charCodeAt(0);
    await page.locator('#provenance-drop-input').setInputFiles({
      name: 'coldbox-hashfield-tampered.html',
      mimeType: 'text/html',
      buffer: hashFieldTamperedBytes
    });
    await page.locator('#provenance-drop-result[data-state="mismatch"]').waitFor({ state: 'visible', timeout: 5000 });

    // --- an unrelated file must fail closed with a clear error, never a false match ---
    await page.locator('#provenance-drop-input').setInputFiles({
      name: 'not-coldbox.html',
      mimeType: 'text/html',
      buffer: Buffer.from('<html><body>not a build</body></html>', 'utf8')
    });
    await page.locator('#provenance-drop-result[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });

    console.log(`${engine}: provenance panel library list, CSP text, build date, visible expected hash, and self-hash drop zone (match/mismatch/hash-field-tamper/error) verified`);
  } finally {
    await closePage(page);
  }
}

async function verifyLegalNotices(browser, engine) {
  // P0.20: AGPLv3 §5(d) requires an interactive UI to display Appropriate
  // Legal Notices, and the roadmap's own acceptance criterion is that they
  // are "reachable from the app's own UI without a network connection and
  // without leaving the file" - a browser-only property this Node-side
  // test suite (test/legal-notices.test.js) cannot itself observe, since it
  // only inspects the static built markup. This check drives a real page,
  // with the network disabled, to confirm a user can actually reach and
  // read every element §0 requires.
  const { page } = await openPage(browser, buildPath);
  try {
    // Real offline emulation, not just "the CSP would have blocked it" -
    // belt and suspenders for "reachable... without a network connection".
    // Matches the pattern used elsewhere in this harness (e.g.
    // verifyBuiltFile's airgap-banner checks above).
    await page.context().setOffline(true);

    await page.locator('#nav-rail a[data-route="reference"]').click();
    await page.locator('#page-reference:not([hidden])').waitFor({ state: 'visible' });

    const noticesSection = page.locator('#provenance-legal-notices');
    await noticesSection.waitFor({ state: 'visible' });
    const noticesText = await noticesSection.textContent();

    assert.match(noticesText, /Copyright \(C\) \d{4} James Kent/, `${engine}: copyright notice must be visible`);
    assert.match(noticesText, /ABSOLUTELY NO WARRANTY/i, `${engine}: no-warranty statement must be visible`);
    assert.match(
      noticesText,
      /convey.{0,80}under the same licence|redistribute.{0,80}under the same licence/i,
      `${engine}: statement that recipients may convey the work under the same licence must be visible`
    );

    const spdxText = (await page.locator('#provenance-license-spdx').textContent()).trim();
    assert.equal(spdxText, 'AGPL-3.0-only', `${engine}: SPDX identifier must read exactly AGPL-3.0-only`);

    // The full licence text must be reachable from here - via the disclosure
    // widget - without a network request and without navigating away from
    // this document. It must already be present in the DOM (not fetched on
    // expand), so also assert its content before ever opening the <details>.
    const licensePre = page.locator('#provenance-license-text');
    const licenseTextBeforeExpand = await licensePre.textContent();
    assert.match(
      licenseTextBeforeExpand,
      /GNU AFFERO GENERAL PUBLIC LICENSE/,
      `${engine}: full licence text must already be present in the DOM before the disclosure is opened`
    );
    assert.match(licenseTextBeforeExpand, /TERMS AND CONDITIONS/);
    assert.match(licenseTextBeforeExpand, /END OF TERMS AND CONDITIONS/);

    // Now actually open it via the UI, as a real user would, and confirm it
    // becomes visible (not just present-but-hidden in a way no user could
    // reach).
    await page.locator('#provenance-license-details summary').click();
    await page.locator('#provenance-license-details[open]').waitFor({ state: 'attached' });
    await licensePre.waitFor({ state: 'visible' });

    console.log(`${engine}: Appropriate Legal Notices (copyright, no-warranty, convey-under-licence, SPDX identifier, full licence text) verified reachable offline with networking disabled`);
  } finally {
    await closePage(page);
  }
}

async function verifyHelpFramework(browser, engine) {
  // P0.17: the Learn route's three-depth switcher, offline search, and
  // contextual '?' help. Per the roadmap's 🌐 marker, depth rendering and
  // switching are verified here; the actual glossary/guide content is
  // covered by test/help-content.test.js (Node-side), so this only checks
  // that the compiled content actually reaches the DOM and responds to
  // interaction in a real browser.
  const { page } = await openPage(browser, buildPath);
  try {
    // R2-F2 regression: cold-realm-status, airgap-banner, and vault-status
    // each rewrite their <h2> title's .textContent as the app settles
    // (starting -> ready, checking -> amber/green, and so on). Before the
    // fix, that wholesale rewrite deleted the contextual help button
    // nested inside the same <h2>, so a check that only ever looked at the
    // five buttons in the *static* pre-render markup would have missed the
    // defect entirely - three of the five were gone by the time a real user
    // could ever click one. Waiting for the app to fully settle first, then
    // counting, is the only way this check can catch a regression here.
    await page.locator('#nav-rail a[data-route="system-health"]').click();
    await page.locator('#page-system-health:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#airgap-banner[data-airgap-state="amber"], #airgap-banner[data-airgap-state="green"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#capability-panel[data-capability-state="ready"], #capability-panel[data-capability-state="ready-with-warnings"]').waitFor({ state: 'visible', timeout: 5000 });

    const settledButtonCount = await page.locator('button.help-context-button[data-help-topic]').count();
    assert.equal(settledButtonCount, 6, `${engine}: all six contextual help buttons must survive app initialization, found ${settledButtonCount}`);

    // Exercise every one of the six mappings, not just two of them - each
    // must land on real, rendered glossary content, proving the button
    // both still exists in the settled DOM and still resolves correctly.
    // P0.20 added the sixth (glossary:appropriate-legal-notices) inside the
    // same Provenance panel as glossary:provenance-panel - it needs its own
    // entry here, not just a bumped count, or a future R2-F2-style bug that
    // wipes the new button's <h2> content would go undetected exactly the
    // way the reviewer's F1 finding described.
    const contextualHelpMappings = [
      { topic: 'glossary:cold-realm-warm-shell', route: 'system-health' },
      { topic: 'glossary:airgapped', route: 'system-health' },
      { topic: 'glossary:capability-self-check', route: 'system-health' },
      { topic: 'glossary:vault', route: 'vault' },
      { topic: 'glossary:provenance-panel', route: 'reference' },
      { topic: 'glossary:appropriate-legal-notices', route: 'reference' }
    ];
    for (const mapping of contextualHelpMappings) {
      await page.locator(`#nav-rail a[data-route="${mapping.route}"]`).click();
      const button = page.locator(`button.help-context-button[data-help-topic="${mapping.topic}"]`);
      await button.waitFor({ state: 'visible', timeout: 3000 });
      await button.click();
      await page.locator('#page-learn:not([hidden])').waitFor({ state: 'visible' });
      await page.locator(`#help-detail-card:not([hidden])[data-help-active-id="${mapping.topic}"]`).waitFor({ state: 'visible', timeout: 3000 });
    }

    await page.locator('#nav-rail a[data-route="learn"]').click();
    await page.locator('#page-learn:not([hidden])').waitFor({ state: 'visible' });

    assert.equal(await page.locator('#help-empty-state').isVisible(), true, `${engine}: Learn should start with the compact glossary prompt`);
    await page.locator('#help-search-input').fill('seed phrase');
    await page.locator('.help-search-result').first().click();
    await page.locator('#help-detail-card:not([hidden])').waitFor({ state: 'visible' });
    const seedPhraseBody = page.locator('#help-detail-body');
    const plainText = (await seedPhraseBody.textContent()).trim();
    assert.match(plainText, /12 or 24 ordinary words/i, `${engine}: plain depth should be showing by default`);

    // Switch to technical depth and confirm the *content itself* changes,
    // not just the pressed-state of the button - a stale render that only
    // updates aria-pressed would otherwise pass a shallower check.
    await page.locator('#help-depth-technical').click();
    await page.locator('#help-depth-technical[aria-pressed="true"]').waitFor({ state: 'visible' });
    const technicalText = (await seedPhraseBody.textContent()).trim();
    assert.match(technicalText, /PBKDF2-HMAC-SHA512/, `${engine}: technical depth did not render distinct content`);
    assert.notEqual(technicalText, plainText, `${engine}: switching depth must change the rendered text`);

    // The depth preference must be a UI preference (see CONTRIBUTING.md's
    // "no localStorage for secrets" rule - this is explicitly allowed) and
    // must survive a reload, per SPEC.md #18.1 ("remembered").
    await page.reload();
    await page.locator('#nav-rail a[data-route="learn"]').click();
    await page.locator('#help-depth-technical[aria-pressed="true"]').waitFor({ state: 'visible' });

    // Offline search: no network request should be made while typing, and a
    // result must be clickable to jump to the matching entry.
    let networkRequestSeen = false;
    const onRequest = () => {
      networkRequestSeen = true;
    };
    page.on('request', onRequest);
    await page.locator('#help-search-input').fill('xpub');
    await page.locator('.help-search-result', { hasText: 'xpub' }).first().waitFor({ state: 'visible', timeout: 3000 });
    page.off('request', onRequest);
    assert.equal(networkRequestSeen, false, `${engine}: offline search must not trigger any network request`);

    await page.locator('.help-search-result', { hasText: 'xpub' }).first().click();
    await page.locator('#help-detail-card:not([hidden])').waitFor({ state: 'visible', timeout: 3000 });

    // Contextual '?' help for all five panels, including that each button
    // survives real app initialization, was already exercised in full at
    // the top of this function (R2-F2 regression coverage) - not repeated
    // here.

    // A contextual button pointed at content that genuinely doesn't exist
    // must still fail closed into the documented fallback notice rather
    // than silently no-op - proven directly against the runtime function
    // rather than against a UI button, since every shipped button now
    // resolves to real content.
    await page.evaluate(() => {
      window.location.hash = 'learn/glossary%3Athis-topic-does-not-exist';
    });
    await page.locator('#help-fallback-notice:not([hidden])').waitFor({ state: 'visible', timeout: 3000 });

    // Inline glossary: a term inside the rendered guide body must be
    // tappable for a definition without leaving the page.
    await page.locator('#nav-rail a[data-route="learn"]').click();
    await page.locator('#help-search-input').fill('vault');
    await page.locator('.help-search-result').first().click();
    const inlineTerm = page.locator('#help-detail-body .glossary-term').first();
    await inlineTerm.waitFor({ state: 'visible' });
    await inlineTerm.click();
    await page.locator('.glossary-tooltip').first().waitFor({ state: 'visible', timeout: 3000 });

    console.log(`${engine}: Learn page depth switching (persisted across reload), offline search, contextual help, fallback-on-missing-topic, and inline glossary verified`);
  } finally {
    await closePage(page);
  }
}

async function verifyEntropyLab(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#nav-rail a[data-route="entropy"]').click();
    await page.locator('#page-entropy:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#app[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('html[data-crypto-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });
    assert.equal(await coldFrame.locator('html').getAttribute('data-cold-view'), 'entropy', `${engine}: Entropy Lab did not activate the entropy view`);
    assert.equal(await coldFrame.locator('#cold-realm-shell-status').isVisible(), false, `${engine}: Entropy Lab must not repeat the generic sealed-realm shell`);
    assert.equal(await coldFrame.locator('#cold-kdf-details').isVisible(), false, `${engine}: Entropy Lab must hide Vault details`);
    assert.equal(await coldFrame.locator('#cold-vault-controls').isVisible(), false, `${engine}: Entropy Lab must hide Vault session controls`);
    await coldFrame.locator('#cold-entropy-lab').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(
      (await coldFrame.locator('#cold-entropy-lab > .eyebrow').textContent()).trim(),
      'Entropy Lab / P1.1',
      `${engine}: Entropy Lab must retain the pre-mock P1.1 shell label`
    );

    for (const toolId of [
      'cold-entropy-meter',
      'cold-entropy-dice-face',
      'cold-entropy-coin-heads',
      'cold-entropy-card-grid',
      'cold-entropy-hex-input',
      'cold-entropy-csprng-draw',
      'cold-entropy-mix-run'
    ]) {
      await coldFrame.locator(`#${toolId}`).waitFor({ state: 'visible', timeout: 5000 });
    }

    const meter = coldFrame.locator('#cold-entropy-meter');
    const mixStatus = coldFrame.locator('#cold-entropy-mix-status');
    const target = coldFrame.locator('#cold-entropy-target');
    assert.match(await coldFrame.locator('#cold-entropy-dice-random').textContent(), /device RNG/i);
    assert.match(await coldFrame.locator('#cold-entropy-coin-random').textContent(), /device RNG/i);
    assert.match(await coldFrame.locator('#cold-entropy-card-random').textContent(), /device RNG/i);
    assert.match(await coldFrame.locator('#cold-entropy-hex-random').textContent(), /device RNG/i);

    // The sticky meter separates the selected normal output strength from the
    // fallback that survives a completely compromised device RNG.
    assert.equal(await meter.getAttribute('data-output-strength-bits'), '128');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');
    assert.equal(await meter.getAttribute('data-full-two-source-protection'), 'false');
    assert.match(await coldFrame.locator('#cold-entropy-fallback-strength').textContent(), /0 bits.*CSPRNG-only security/i);

    // Generated dice are auditable simulations, never independent entropy.
    await coldFrame.locator('#cold-entropy-dice-random-count').fill('20');
    await coldFrame.locator('#cold-entropy-dice-random').click();
    assert.equal(await meter.getAttribute('data-guaranteed-bits'), '0');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');
    assert.equal(await meter.getAttribute('data-device-rng-values'), '20');
    assert.match(await coldFrame.locator('#cold-entropy-dice-log').textContent(), /Device RNG:/);
    assert.doesNotMatch(await coldFrame.locator('#cold-entropy-dice-log').textContent(), /Physical\/manual:/);
    await coldFrame.locator('#cold-entropy-dice-reset').click();

    // Bulk manual dice, including an invalid character, remain usable and
    // visibly provenance-labeled as physical/manual values.
    await coldFrame.locator('#cold-entropy-dice-face').fill('123456x');
    await coldFrame.locator('#cold-entropy-dice-base6-add').click();
    assert.match(await coldFrame.locator('#cold-entropy-dice-status').textContent(), /Added 6 base-6 rolls.*Ignored invalid character\(s\): x/);
    assert.ok(Number(await meter.getAttribute('data-fallback-bits')) > 0);
    assert.match(await coldFrame.locator('#cold-entropy-dice-log').textContent(), /Physical\/manual:/);
    await coldFrame.locator('#cold-entropy-dice-reset').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');

    // Partial real manual entropy: 8 hex digits = 32 independent bits. Adding
    // generated simulations must not change that fallback.
    await coldFrame.locator('#cold-entropy-hex-input').fill('01234567');
    await coldFrame.locator('#cold-entropy-hex-add').click();
    assert.equal(await meter.getAttribute('data-guaranteed-bits'), '32');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '32');
    assert.equal(await meter.getAttribute('data-full-two-source-protection'), 'false');
    assert.match(await coldFrame.locator('#cold-entropy-fallback-strength').textContent(), /~32 bits.*partial independent fallback/i);
    assert.match(await coldFrame.locator('#cold-entropy-hex-log').textContent(), /Physical\/manual:/);

    await coldFrame.locator('#cold-entropy-coin-random-count').fill('10');
    await coldFrame.locator('#cold-entropy-coin-random').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '32');
    assert.match(await coldFrame.locator('#cold-entropy-coin-log').textContent(), /Device RNG:/);
    await coldFrame.locator('#cold-entropy-undo').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '32', 'undoing a generated value must not alter independent fallback');
    await coldFrame.locator('#cold-entropy-coin-reset').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '32', 'resetting generated-only coin values must not alter manual hex fallback');

    // A genuine manual Undo decreases fallback; Reset removes the remainder.
    await coldFrame.locator('#cold-entropy-undo').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '28');
    await coldFrame.locator('#cold-entropy-hex-reset').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');

    // Card grid remains 52 stable >=44px targets; click/Undo updates state and
    // fallback without layout removal.
    const cardButtons = coldFrame.locator('#cold-entropy-card-grid button');
    assert.equal(await cardButtons.count(), 52);
    const firstCard = cardButtons.nth(0);
    const firstCardBox = await firstCard.boundingBox();
    assert.ok(firstCardBox && firstCardBox.width >= 44 && firstCardBox.height >= 44,
      `${engine}: card tap target must be at least 44 x 44 CSS pixels`);
    await firstCard.click();
    assert.equal(await firstCard.isDisabled(), true);
    assert.ok(Number(await meter.getAttribute('data-fallback-bits')) > 0);
    assert.match(await coldFrame.locator('#cold-entropy-card-log').textContent(), /Physical\/manual:/);
    await coldFrame.locator('#cold-entropy-undo').click();
    assert.equal(await firstCard.isDisabled(), false);
    assert.equal(await coldFrame.locator('#cold-entropy-card-log').textContent(), 'None yet.');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');

    const randomCountBox = await coldFrame.locator('#cold-entropy-dice-random-count').boundingBox();
    assert.ok(randomCountBox && randomCountBox.height >= 44,
      `${engine}: random-count input tap target must be at least 44 CSS pixels high`);

    // Reach the 128-bit independent target and verify the full-protection state.
    await coldFrame.locator('#cold-entropy-hex-input').fill('0123456789abcdef0123456789abcdef');
    await coldFrame.locator('#cold-entropy-hex-add').click();
    assert.equal(await meter.getAttribute('data-guaranteed-bits'), '128');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '128');
    assert.equal(await meter.getAttribute('data-full-two-source-protection'), 'true');
    assert.match(await coldFrame.locator('#cold-entropy-fallback-strength').textContent(), /full two-source protection/i);

    // Target changes recalculate fallback/full-protection messaging without
    // altering the underlying independent count.
    await target.selectOption('256');
    assert.equal(await meter.getAttribute('data-output-strength-bits'), '256');
    assert.equal(await meter.getAttribute('data-guaranteed-bits'), '128');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '128');
    assert.equal(await meter.getAttribute('data-full-two-source-protection'), 'false');
    assert.match(await mixStatus.textContent(), /not full two-source protection/i);
    await target.selectOption('128');
    assert.equal(await meter.getAttribute('data-full-two-source-protection'), 'true');

    // Full manual + CSPRNG mix: 32 fresh bytes are drawn, 16 consumed for the
    // 128-bit full-length source, and strength copy remains current post-mix.
    await coldFrame.locator('#cold-entropy-csprng-count').fill('1');
    await coldFrame.locator('#cold-entropy-csprng-draw').click();
    assert.match(await coldFrame.locator('#cold-entropy-csprng-status').textContent(), /32 fresh CSPRNG bytes available/);
    assert.match(await mixStatus.textContent(), /full two-source protection/i);
    await coldFrame.locator('#cold-entropy-mix-run').click();
    await coldFrame.locator('#cold-entropy-mix-output:not([hidden])').waitFor({ state: 'visible' });
    assert.match(await coldFrame.locator('#cold-entropy-mix-output').textContent(), /^[0-9a-f]{32}$/);
    assert.match(await mixStatus.textContent(), /Full two-source protection/i);
    assert.equal(await meter.getAttribute('data-csprng-bits'), '128');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '128');
    assert.match(await coldFrame.locator('#cold-entropy-csprng-status').textContent(), /16 fresh CSPRNG bytes available/);

    // Reset clears the old output and immediately removes the old fallback/full
    // protection claim instead of leaving stale strength text behind.
    await coldFrame.locator('#cold-entropy-hex-reset').click();
    assert.equal(await coldFrame.locator('#cold-entropy-mix-output').isHidden(), true);
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');
    assert.equal(await meter.getAttribute('data-full-two-source-protection'), 'false');

    // Generated-only sources remain CSPRNG-only security but may still produce
    // the selected normal output when enough fresh CSPRNG bytes are available.
    await coldFrame.locator('#cold-entropy-dice-random-count').fill('1');
    await coldFrame.locator('#cold-entropy-dice-random').click();
    assert.match(await coldFrame.locator('#cold-entropy-dice-status').textContent(), /Generated 1 base-6 dice roll.*device RNG.*0 independent-manual credit/i);
    await coldFrame.locator('#cold-entropy-coin-random-count').fill('1');
    await coldFrame.locator('#cold-entropy-coin-random').click();
    assert.match(await coldFrame.locator('#cold-entropy-coin-status').textContent(), /Generated 1 coin flip.*device RNG.*0 independent-manual credit/i);
    await coldFrame.locator('#cold-entropy-card-random-count').fill('1');
    await coldFrame.locator('#cold-entropy-card-random').click();
    assert.match(await coldFrame.locator('#cold-entropy-card-log').textContent(), /Device RNG:/);
    await coldFrame.locator('#cold-entropy-hex-random-count').fill('1');
    await coldFrame.locator('#cold-entropy-hex-random').click();
    assert.match(await coldFrame.locator('#cold-entropy-hex-status').textContent(), /Generated 1 hex digit.*device RNG.*0 independent-manual credit/i);
    assert.equal(await meter.getAttribute('data-guaranteed-bits'), '0');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');
    assert.equal(await meter.getAttribute('data-device-rng-values'), '4');
    assert.match(await mixStatus.textContent(), /CSPRNG-only security/i);
    assert.doesNotMatch(await mixStatus.textContent(), /full two-source protection/i);
    await coldFrame.locator('#cold-entropy-mix-run').click();
    await coldFrame.locator('#cold-entropy-mix-output:not([hidden])').waitFor({ state: 'visible' });
    assert.match(await mixStatus.textContent(), /CSPRNG-only security.*fallback is 0 bits/i);

    // Clearing simulations and drawing fresh bytes restores the explicit direct
    // CSPRNG-only path with the same 0-bit independent fallback semantics.
    await coldFrame.locator('#cold-entropy-dice-reset').click();
    await coldFrame.locator('#cold-entropy-coin-reset').click();
    await coldFrame.locator('#cold-entropy-card-reset').click();
    await coldFrame.locator('#cold-entropy-hex-reset').click();
    await coldFrame.locator('#cold-entropy-csprng-count').fill('1');
    await coldFrame.locator('#cold-entropy-csprng-draw').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');
    assert.match(await mixStatus.textContent(), /Ready for a 128-bit CSPRNG-only draw/);
    await coldFrame.locator('#cold-entropy-mix-run').click();
    await coldFrame.locator('#cold-entropy-mix-output:not([hidden])').waitFor({ state: 'visible' });
    assert.match(await coldFrame.locator('#cold-entropy-mix-output').textContent(), /^[0-9a-f]{32}$/);

    console.log(`${engine}: Entropy Lab normal-vs-fallback strength, provenance, bulk input, grid/undo/reset, CSPRNG burn, mix, and touch targets passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyDevOnlyDependency() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.dependencies?.playwright, undefined);
  assert.equal(typeof packageJson.devDependencies?.playwright, 'string');

  const built = fs.readFileSync(buildPath);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coldbox-browser-build-'));
  try {
    copyBuildInputsInto(temporaryRoot, { includeGit: true });
    assert.equal(fs.existsSync(path.join(temporaryRoot, 'node_modules')), false);

    const result = spawnSync(
      process.execPath,
      [path.join(temporaryRoot, 'scripts', 'build.js')],
      {
        cwd: temporaryRoot,
        encoding: 'utf8',
        env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
      }
    );
    if (result.error || result.status !== 0) {
      throw new Error(
        `Dependency-free build failed: ${result.error?.message || result.status}\n`
        + `${result.stdout}\n${result.stderr}`
      );
    }

    const dependencyFreeBuild = fs.readFileSync(
      path.join(temporaryRoot, 'build', 'coldbox.html')
    );
    assert.deepEqual(
      dependencyFreeBuild,
      built,
      'Build with node_modules absent differs from the normal build'
    );
    const digest = crypto.createHash('sha256').update(built).digest('hex');
    console.log(`Playwright is dev-only; dependency-free build matches byte-for-byte (${digest})`);
  } finally {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

async function run() {
  requireBrowserBinaries();
  runBuild();
  await verifyDevOnlyDependency();

  for (const [engine, browserType] of [['Chromium', chromium], ['Firefox', firefox]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      await verifyUiShellWalkthrough(browser, engine);
      await verifyBuiltFile(browser, engine);
      await verifyStaleReachabilityOnlineSafety(browser, engine);
      await verifyVaultLibrary(browser, engine);
      await verifyEntropyLab(browser, engine);
      await verifyUnlockedRuntimeHealthLockdown(browser, engine);
      await verifyProviderNeutering(browser, engine);
      await verifyPreexistingProviderLockdown(browser, engine);
      await verifyPanicHide(browser, engine);
      await verifyColdRealmFailure(browser, engine);
      await verifyColdRealmTimeout(browser, engine);
      await verifyHandshakeTimeout(browser, engine);
      await verifyCspStrippedLockdown(browser, engine, 'cold-only');
      await verifyCspStrippedLockdown(browser, engine, 'warm-only');
      await verifyCspStrippedLockdown(browser, engine, 'both');
      await verifyMissingRandomnessLockdown(browser, engine);
      await verifyTamperedBuiltFile(browser, engine);
      await verifyCspFixture(browser, engine);
      await verifyUntamperedFixture(browser, engine);
      await verifyTamperFixture(browser, engine);
      await verifyReusableAssertions(browser, engine);
      await verifyKeyfileUiAndRegressions(browser, engine);
      await verifyProvenancePanel(browser, engine);
      await verifyLegalNotices(browser, engine);
      await verifyHelpFramework(browser, engine);
    } finally {
      await browser.close();
    }
  }

  console.log('Browser harness passed in Chromium and Firefox.');
}

async function main(execute = run) {
  try {
    await execute();
    return 0;
  } catch (error) {
    console.error(`Browser harness failed: ${error.stack || error.message}`);
    return 1;
  }
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = Object.freeze({ main });
