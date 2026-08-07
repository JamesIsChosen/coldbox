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
  for (const directory of ['scripts', 'src', 'vendor']) {
    fs.cpSync(
      path.join(projectRoot, directory),
      path.join(temporaryRoot, directory),
      { recursive: true }
    );
  }

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
  for (const directory of ['scripts', 'src', 'vendor']) {
    fs.cpSync(
      path.join(projectRoot, directory),
      path.join(temporaryRoot, directory),
      { recursive: true }
    );
  }

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
  for (const directory of ['scripts', 'src', 'vendor']) {
    fs.cpSync(
      path.join(projectRoot, directory),
      path.join(temporaryRoot, directory),
      { recursive: true }
    );
  }
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

async function openPage(browser, file) {
  const page = await browser.newPage();
  const harness = await createHarness(page);
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page };
}

async function closePage(page) {
  await page.close();
}

// F1 support: same as openPage, but injects FILE_READER_ORDER_CONTROL_SCRIPT
// before the document (and every child frame, including the cold realm's
// srcdoc iframe) first runs, so the page's own FileReader usage is wrapped
// from the very first read.
async function openPageWithFileReaderControl(browser, file) {
  const page = await browser.newPage();
  const harness = await createHarness(page);
  await page.addInitScript(FILE_READER_ORDER_CONTROL_SCRIPT);
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page };
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

async function verifyBuiltFile(browser, engine) {
  const { harness, page } = await openPage(browser, buildPath);
  try {
    await harness.expectElementVisible('#app');
    await harness.expectElementVisible('#app[data-build-state="warm-shell"]');
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
    await page.context().setOffline(true);
    await page.locator('#airgap-banner[data-airgap-state="green"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('html').getAttribute('data-network-online'), 'false');
    await page.context().setOffline(false);
    await page.locator('#airgap-banner[data-airgap-state="amber"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('html').getAttribute('data-network-online'), 'true');

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await page.context().setOffline(true);
    await page.locator('#airgap-banner[data-airgap-state="green"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill('browser round-trip phrase');
    await coldFrame.locator('#cold-vault-create').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await coldFrame.locator('#cold-vault-passphrase').inputValue(), '');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#vault-save-download').click();
    const download = await downloadPromise;
    // P0.14: saves are named with a zero-padded generational counter so they
    // accumulate history instead of clobbering (vault-format.md's
    // "Generational filenames"). This is a fresh page/context with no prior
    // localStorage save-generation record, so the first save in it is
    // always generation 1.
    assert.equal(download.suggestedFilename(), 'coldbox-vault-0001.cbx');

    await page.locator('#vault-save-manual').click();
    await page.waitForFunction(() => document.querySelector('#vault-manual-data').value.length > 0);
    const manualVaultText = await page.locator('#vault-manual-data').inputValue();
    assert.ok(manualVaultText.length > 100, `${engine}: manual export should contain encrypted vault bytes`);
    assert.equal(await page.locator('#vault-manual-copy').isDisabled(), false);
    assert.equal(await page.locator('#vault-manual-share').isDisabled(), true);
    await page.locator('#vault-manual-qr-data').waitFor({ state: 'visible' });
    assert.match(await page.locator('#vault-manual-qr-data').inputValue(), /^CBX-QR\/1\/1\/\d+\//);
    const qrCountText = await page.locator('#vault-manual-qr-count').textContent();
    const qrCountMatch = /^QR frame 1 of (\d+)\./.exec(qrCountText);
    assert.ok(qrCountMatch, `${engine}: QR frame count should be rendered`);
    const qrFrameCount = Number(qrCountMatch[1]);
    assert.ok(qrFrameCount > 1, `${engine}: offline vault should exercise multipart QR output`);
    await page.locator('#vault-manual-qr-image').waitFor({ state: 'visible' });

    await page.locator('#vault-save-manual').click();
    await page.waitForFunction((previous) => {
      const value = document.querySelector('#vault-manual-data').value;
      return value.length > 0 && value !== previous;
    }, manualVaultText);
    const secondManualVaultText = await page.locator('#vault-manual-data').inputValue();
    assert.notEqual(secondManualVaultText, manualVaultText, `${engine}: repeated saves must rotate the public nonce`);

    await page.locator('#vault-lock').click();
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible' });
    const qrFrames = await page.evaluate((value) => {
      const payloadLength = 650;
      const total = Math.ceil(value.length / payloadLength);
      return Array.from({ length: total }, (_, index) => (
        'CBX-QR/1/' + String(index + 1) + '/' + String(total) + '/'
          + value.slice(index * payloadLength, (index + 1) * payloadLength)
      ));
    }, manualVaultText);
    assert.equal(qrFrames.length, qrFrameCount, `${engine}: QR frame count should match reassembly input`);
    const incompleteQrFrames = qrFrames.slice();
    incompleteQrFrames.splice(1, 1);
    await page.locator('#vault-manual-data').fill(incompleteQrFrames.join('\n'));
    await page.locator('#vault-load-manual').click();
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible' });
    await page.locator('#vault-manual-data').fill(qrFrames.join('\n'));
    await page.locator('#vault-load-manual').click();
    await page.locator('#vault-status[data-state="pending"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible' });
    await coldFrame.locator('#cold-vault-passphrase').fill('browser round-trip phrase');
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    console.log(`${engine}: blob download and manual base64 load/save round-tripped through the cold realm`);
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

async function verifyColdRealmFailure(browser, engine) {
  const page = await browser.newPage();
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
    await coldFrame.locator('#cold-vault-passphrase').fill('runtime violation unlocked phrase');
    await coldFrame.locator('#cold-vault-create').click();
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
    await page.context().setOffline(true);
    await page.locator('#airgap-banner[data-airgap-state="green"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill('save health drift phrase');
    await coldFrame.locator('#cold-vault-create').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await coldFrame.locator('html').evaluate((root) => root.setAttribute('data-airgap-state', 'red'));
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
    await coldFrame.locator('#cold-vault-passphrase').fill('panic session phrase');
    await coldFrame.locator('#cold-vault-create').click();
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
    await coldFrame.locator('#cold-vault-passphrase').fill('cold panic session phrase');
    await coldFrame.locator('#cold-vault-create').click();
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
  const harness = await createHarness(page);
  try {
    await page.goto(fileUrl(fixture.path), { waitUntil: 'load' });
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
  const harness = await createHarness(page);
  try {
    await page.goto(fileUrl(fixture.path), { waitUntil: 'load' });
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

async function verifyMissingRandomnessLockdown(browser, engine) {
  const fixture = createMissingRandomnessFixture();
  try {
    const { harness, page } = await openPage(browser, fixture.path);
    try {
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
    await passphraseInput.fill('browser f1 regression phrase');
    await coldFrame.locator('#cold-vault-create').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('#vault-save-manual').click();
    await page.waitForFunction(() => document.querySelector('#vault-manual-data').value.length > 0);
    const f1VaultText = await page.locator('#vault-manual-data').inputValue();

    await page.locator('#vault-lock').click();
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
    await page.locator('#vault-lock').click();
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

async function verifyHelpFramework(browser, engine) {
  // P0.17: the Learn route's three-depth switcher, offline search, and
  // contextual '?' help. Per the roadmap's 🌐 marker, depth rendering and
  // switching are verified here; the actual glossary/guide content is
  // covered by test/help-content.test.js (Node-side), so this only checks
  // that the compiled content actually reaches the DOM and responds to
  // interaction in a real browser.
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#nav-rail a[data-route="learn"]').click();
    await page.locator('#page-learn:not([hidden])').waitFor({ state: 'visible' });

    const glossaryTerms = page.locator('#help-glossary-list .help-glossary-term');
    const initialCount = await glossaryTerms.count();
    assert.ok(initialCount > 0, `${engine}: Learn page must render at least one glossary term`);

    const seedPhraseBody = page.locator('#help-glossary-list .help-glossary-term', { hasText: 'Seed phrase' })
      .locator('.help-term-body');
    await seedPhraseBody.waitFor({ state: 'visible' });
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
    await page.locator('#help-glossary-xpub').waitFor({ state: 'visible', timeout: 3000 });

    // Contextual '?' help: clicking the cold-realm panel's help button must
    // land on its mapped glossary entry, not just switch routes.
    await page.locator('#nav-rail a[data-route="dashboard"]').click();
    await page.locator('button.help-context-button[data-help-topic^="glossary:cold-realm-warm-shell"]').click();
    await page.locator('#page-learn:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('[id^="help-glossary-cold-realm-warm-shell"]').waitFor({ state: 'visible', timeout: 3000 });

    // A contextual button pointed at content that doesn't exist yet (the
    // capability panel, honestly not backfilled - see the roadmap) must
    // fail closed into the documented fallback notice, not silently no-op.
    await page.locator('#nav-rail a[data-route="dashboard"]').click();
    await page.locator('button.help-context-button[data-help-topic="guide:capability-self-check"]').click();
    await page.locator('#help-fallback-notice:not([hidden])').waitFor({ state: 'visible', timeout: 3000 });

    // Inline glossary: a term inside the rendered guide body must be
    // tappable for a definition without leaving the page.
    await page.locator('#nav-rail a[data-route="learn"]').click();
    const inlineTerm = page.locator('#help-guides-list .glossary-term').first();
    await inlineTerm.waitFor({ state: 'visible' });
    await inlineTerm.click();
    await page.locator('.glossary-tooltip').first().waitFor({ state: 'visible', timeout: 3000 });

    console.log(`${engine}: Learn page depth switching (persisted across reload), offline search, contextual help, fallback-on-missing-topic, and inline glossary verified`);
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
    for (const directory of ['scripts', 'src', 'vendor']) {
      fs.cpSync(
        path.join(projectRoot, directory),
        path.join(temporaryRoot, directory),
        { recursive: true }
      );
    }
    // P0.16 F4 fallout: scripts/build.js now derives the embedded build date
    // from `git log -- src scripts vendor` (see ADR-0015's 2026-08-06
    // amendment). This fixture's whole point is proving the build needs no
    // devDependency (in particular, no Playwright) - it was never meant to
    // prove the build needs no *git checkout*, and a real "node_modules
    // absent" checkout still has its .git directory. Without copying it, the
    // dependency-free build fell back to the "unknown (no git commit
    // metadata available)" branch while the real build embedded an actual
    // date, so the two byte-identical builds legitimately diverged - not a
    // regression in build.js, but this fixture no longer modeling a real
    // checkout. Copying .git restores that fidelity.
    fs.cpSync(
      path.join(projectRoot, '.git'),
      path.join(temporaryRoot, '.git'),
      { recursive: true }
    );
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
      await verifyBuiltFile(browser, engine);
      await verifyUnlockedRuntimeHealthLockdown(browser, engine);
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
