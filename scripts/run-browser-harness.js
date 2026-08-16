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

// UI.3 boundary regression: record every cold-to-warm MessagePort delivery in
// the warm document. The test only reads message types and enum state from the
// captured records, never printing payloads or secret-adjacent values.
const COLD_TO_WARM_CAPTURE_SCRIPT = `(${function () {
  if (window.parent !== window || typeof window.MessagePort !== 'function') {
    return;
  }
  var captured = [];
  window.__coldboxCapturedColdToWarm = captured;
  var originalAddEventListener = window.MessagePort.prototype.addEventListener;
  window.MessagePort.prototype.addEventListener = function (type, listener, options) {
    if (type !== 'message' || typeof listener !== 'function') {
      return originalAddEventListener.call(this, type, listener, options);
    }
    var wrapped = function () {
      var event = arguments[0];
      if (event && event.data && typeof event.data.type === 'string') {
        captured.push(event.data);
      }
      return listener.apply(this, arguments);
    };
    return originalAddEventListener.call(this, type, wrapped, options);
  };
}.toString()})();`;

// P2.5 stale-completion coverage: hold the next cold AES-GCM encryption after
// recovery configuration has begun. The harness can release that real
// operation after forcing the warm shell online, proving that the
// closed-session completion cannot repaint the UI as unlocked.
const RECOVERY_CONFIGURATION_GATE_SCRIPT = `(function () {
  var originalDefineProperty = Object.defineProperty;
  var armed = false;
  var held = null;
  function wrapCryptoApi(api) {
    var wrapped = Object.create(api);
    originalDefineProperty(wrapped, 'aesGcm', {
      configurable: true,
      enumerable: true,
      writable: false,
      value: function () {
        var result = api.aesGcm.apply(api, arguments);
        if (!armed || arguments[0] !== 'encrypt') {
          return result;
        }
        armed = false;
        return Promise.resolve(result).then(function (bytes) {
          return new Promise(function (resolve) {
            held = { bytes: bytes, resolve: resolve };
          });
        });
      }
    });
    return wrapped;
  };
  var cryptoApi = null;
  originalDefineProperty(window, '__coldboxCrypto', {
    configurable: true,
    enumerable: false,
    get: function () {
      return cryptoApi;
    },
    set: function (value) {
      cryptoApi = wrapCryptoApi(value);
    }
  });
  Object.defineProperty(window, '__coldboxRecoveryConfigurationGate', {
    configurable: false,
    enumerable: false,
    value: Object.freeze({
      arm: function () {
        armed = true;
      },
      held: function () {
        return held !== null;
      },
      release: function () {
        if (!held) {
          throw new Error('recovery configuration gate is not holding an operation');
        }
        var pending = held;
        held = null;
        pending.resolve(pending.bytes);
      }
    })
  });
})();`;

// P1.13 UI coverage: supplies deterministic permission and clipboard states
// before the warm shell starts. This exercises the real form controls without
// depending on an OS permission prompt or a user's physical clipboard.
const CLIPBOARD_CANARY_CONTROL_SCRIPT = `(function () {
  var state = {
    permission: 'denied',
    clipboardAvailable: true,
    text: 'baseline',
    deferNextPermission: false,
    deferNextRead: false,
    pendingPermissionResolvers: [],
    pendingReadResolvers: []
  };
  window.__coldboxClipboardCanaryTest = state;
  Object.defineProperty(Navigator.prototype, 'permissions', {
    configurable: true,
    get: function () {
      return {
        query: function () {
          if (state.deferNextPermission) {
            state.deferNextPermission = false;
            return new Promise(function (resolve) {
              state.pendingPermissionResolvers.push(resolve);
            });
          }
          return Promise.resolve({ state: state.permission });
        }
      };
    }
  });
  Object.defineProperty(Navigator.prototype, 'clipboard', {
    configurable: true,
    get: function () {
      if (!state.clipboardAvailable) {
        return undefined;
      }
      return {
        readText: function () {
          if (state.deferNextRead) {
            state.deferNextRead = false;
            return new Promise(function (resolve) {
              state.pendingReadResolvers.push(resolve);
            });
          }
          return Promise.resolve(state.text);
        }
      };
    }
  });
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
  // UI.2 added `assets`: scripts/build.js now reads the traced wordmark SVG
  // and the favicon PNGs out of assets/brand/, so a build root without that
  // directory fails closed on ENOENT in exactly the way the docs/ omission
  // described above used to.
  for (const directory of ['assets', 'scripts', 'src', 'vendor', 'docs']) {
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
    // `git log -- assets src scripts vendor` (see ADR-0015's 2026-08-06
    // amendment, and UI.2 for the assets/ addition).
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
    // A cold-local update can acknowledge asynchronously while the warm
    // warning is being displayed. Use the button's own handler once the
    // warning was observed, so a concurrent status repaint cannot make this
    // acceptance path depend on Playwright's pointer actionability check.
    await page.locator('#vault-lock-without-save').evaluate((button) => button.click());
  }
}

async function openPage(browser, file, reachabilityMode = 'reachable', options = {}) {
  const page = await browser.newPage();
  const requestLog = options.requestLog ? [] : null;
  if (requestLog) {
    page.on('request', (request) => requestLog.push(request.url()));
  }
  const reachability = await installReachabilityRoutes(page, reachabilityMode);
  const harness = await createHarness(page);
  if (options.initScript) {
    await page.addInitScript(options.initScript);
  }
  if (options.suspendReachabilityInterval) {
    await page.addInitScript(SUSPEND_REACHABILITY_INTERVAL_SCRIPT);
  }
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page, reachability, requestLog };
}

async function closePage(page) {
  await page.close();
}

async function openDashboard(page, engine) {
  const desktopRoute = page.locator('#nav-rail a[data-route="dashboard"]');
  if (await desktopRoute.isVisible()) {
    await desktopRoute.evaluate((element) => element.click());
    return;
  }
  const mobileRoute = page.locator('#mobile-tabs a[data-route="dashboard"]');
  if (await mobileRoute.isVisible()) {
    await mobileRoute.evaluate((element) => element.click());
    return;
  }
  throw new Error(`${engine}: no visible dashboard route control`);
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

const UI4_OFFICIAL_MNEMONIC = [
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
  'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
].join(' ');

async function releaseFocusedSeed(coldFrame, label, mnemonic = UI4_OFFICIAL_MNEMONIC, language = 'english') {
  if (language !== 'english') {
    await coldFrame.locator('#cold-seed-forge-language').selectOption(language);
  }
  await coldFrame.locator('#cold-seed-forge-validation-passphrase-input').fill('TREZOR');
  await coldFrame.locator('#cold-seed-forge-validation-passphrase-confirm').fill('TREZOR');
  await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(mnemonic);
  await coldFrame.locator('#cold-seed-forge-validate').click();
  await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 5000 });
  await coldFrame.locator('#cold-seed-forge-validation-release-label').fill(label);
  await coldFrame.locator('#cold-seed-forge-validation-release').click();
  await coldFrame.locator('#cold-secret-list [data-secret-id]').filter({ hasText: label }).waitFor({ state: 'visible', timeout: 5000 });
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
  const { harness, page, reachability } = await openPage(browser, buildPath);
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
    assert.equal(sandbox, 'allow-scripts allow-downloads allow-modals', `${engine}: cold frame sandbox changed`);
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
    const passphraseHealth = coldFrame.locator('#cold-vault-passphrase-health');
    assert.equal(await passphraseHealth.isVisible(), true, `${engine}: vault creation must show live passphrase guidance`);
    assert.equal(await passphraseHealth.getAttribute('data-mode'), 'creation');
    assert.match(await passphraseHealth.textContent(), /unknown entropy range|not estimated/i);
    await coldFrame.locator('#cold-vault-passphrase').fill('browser round-trip phrase');
    assert.equal(await passphraseHealth.getAttribute('data-state'), 'entered');
    assert.match(await passphraseHealth.textContent(), /unknown range.*no numeric estimate/i);
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
    assert.equal(await passphraseHealth.isHidden(), true, `${engine}: creation guidance must clear after creation`);
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
    assert.equal(await page.locator('#vault-transfer-start').isDisabled(), true, `${engine}: Saved · unverified vault must not start live transfer before its .cbx is reopened`);
    assert.equal(await page.locator('[id^="vault-transfer-download"]').count(), 0, `${engine}: live transfer must not expose a QR download action`);

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
    assert.equal(await coldFrame.locator('#cold-vault-passphrase-health').isHidden(), true, `${engine}: normal unlock must not show creation guidance`);

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
    const warmRailTouchRect = await page.locator('#nav-rail .nav-link').first().evaluate((link) => {
      const rect = link.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert.ok(warmRailTouchRect.width >= 44, `${engine}: warm rail target width is below 44 CSS px`);
    assert.ok(warmRailTouchRect.height >= 44, `${engine}: warm rail target height is below 44 CSS px`);
    assert.equal(
      await page.locator('#current-section').textContent(),
      'Dashboard',
      `${engine}: dashboard should be the default route`
    );

    const unavailablePortfolio = page.locator('#nav-rail button[data-roadmap-id="P3.4"]');
    assert.equal(await unavailablePortfolio.isDisabled(), true, `${engine}: unbuilt Portfolio must be disabled in the rail`);
    assert.equal(await unavailablePortfolio.getAttribute('aria-disabled'), 'true');
    assert.match(await unavailablePortfolio.textContent(), /P3\.4.*Phase 3/);
    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.waitForFunction(() => window.location.hash === '#registry');
    await harness.expectElementVisible('#page-registry:not([hidden])');
    assert.equal(
      await page.locator('#current-section').textContent(),
      'Registry',
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

    await harness.atViewport(1440, 900);
    const assertColdRealmTarget = async (label) => {
      await page.waitForFunction(() => window.location.hash === '#cold-realm-status');
      assert.equal(
        await page.evaluate(() => document.activeElement && document.activeElement.id),
        'cold-realm-status',
        `${engine}: ${label} did not focus the sealed-realm boundary target`
      );
    };
    await page.locator('#nav-rail .nav-group-sealed a[href="#cold-realm-status"]').click();
    await assertColdRealmTarget('sealed rail link');
    await page.locator('.realm-switcher a[href="#dashboard"]').click();
    await page.waitForFunction(() => window.location.hash === '#dashboard');
    await page.locator('.realm-switcher a[href="#cold-realm-status"]').click();
    await assertColdRealmTarget('realm switcher');
    await page.locator('.realm-switcher a[href="#dashboard"]').click();
    await page.waitForFunction(() => window.location.hash === '#dashboard');
    await page.locator('.app-bar-actions a[href="#cold-realm-status"]').click();
    await assertColdRealmTarget('app-bar quick link');
    await page.locator('#nav-rail a[data-route="dashboard"]').click();
    await page.waitForFunction(() => window.location.hash === '#dashboard');
    await coldFrame.locator('a.cold-nav-link[data-cold-more-target="cold-secret-notes"]').click();
    await coldFrame.locator('#cold-secret-notes:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await coldFrame.locator('#cold-secret-notes').getAttribute('tabindex'), '-1');
    await coldFrame.evaluate(() => { document.getElementById('cold-secret-notes').hidden = true; });
    await harness.atViewport(360, 640);

    const unavailableMoney = page.locator('#mobile-tabs button[data-roadmap-id="P3.4"]');
    assert.equal(await unavailableMoney.isDisabled(), true, `${engine}: future Money tab must be unavailable`);
    assert.equal(await unavailableMoney.getAttribute('aria-disabled'), 'true');
    assert.match(await unavailableMoney.textContent(), /Money.*P3\.4.*Phase 3/);
    await page.locator('#mobile-more-tab').click();
    assert.equal(await page.locator('#mobile-more-menu').isVisible(), true);
    const warmMoreText = await page.locator('#mobile-more-menu .mobile-more-link').allTextContents();
    for (const expected of ['Devices', 'QR Studio', 'Address bench', 'Verify this file', 'Provenance & legal', 'Learn', 'Tool map', 'Enter sealed realm', 'Prices & FX', 'Tax & exports', 'Reference']) {
      assert.ok(warmMoreText.some((item) => item.includes(expected)), `${engine}: warm More is missing ${expected}`);
    }
    for (const id of ['UI.9', 'P3.1', 'P3.9', 'P4.10']) {
      const unavailable = page.locator(`#mobile-more-menu [data-roadmap-id="${id}"]`);
      assert.equal(await unavailable.getAttribute('aria-disabled'), 'true', `${engine}: warm More future ${id} must be unavailable`);
    }
    const warmMoreTouchRects = await page.locator('#mobile-more-menu .mobile-more-link').first().evaluate((link) => {
      const linkRect = link.getBoundingClientRect();
      const closeRect = document.getElementById('mobile-more-close').getBoundingClientRect();
      return { linkHeight: linkRect.height, closeWidth: closeRect.width, closeHeight: closeRect.height };
    });
    assert.ok(warmMoreTouchRects.linkHeight >= 44, `${engine}: warm More target height is below 44 CSS px`);
    assert.ok(warmMoreTouchRects.closeWidth >= 44, `${engine}: warm More close width is below 44 CSS px`);
    assert.ok(warmMoreTouchRects.closeHeight >= 44, `${engine}: warm More close height is below 44 CSS px`);
    await coldFrame.locator('.cold-mobile-more').evaluate((details) => { details.open = true; });
    const coldMoreText = await coldFrame.locator('.cold-mobile-more-links > *').allTextContents();
    for (const expected of ['Vault session', 'Entropy Lab', 'Validate phrase', 'Child seeds', 'Passphrase Studio', 'Descriptors', 'SeedQR studio', 'Backup Health', 'Recovery Assistant', 'Verify Bench', 'Reveal hidden', 'Secret notes', 'No secret yet', 'Lock & wipe']) {
      assert.ok(coldMoreText.some((item) => item.includes(expected)), `${engine}: cold More is missing ${expected}`);
    }
    for (const id of ['P1.5', 'P4.5', 'P4.9', 'P4.3']) {
      const unavailable = coldFrame.locator(`.cold-mobile-more-links [data-roadmap-id="${id}"]`);
      assert.equal(await unavailable.getAttribute('aria-disabled'), 'true', `${engine}: cold More future ${id} must be unavailable`);
    }
    await coldFrame.evaluate(() => {
      document.querySelector('.cold-mobile-more-links a[data-cold-more-target="cold-concealment-controls"]').click();
    });
    await coldFrame.locator('#cold-concealment-controls:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await coldFrame.locator('.cold-mobile-more').getAttribute('open'), null, `${engine}: Reveal hidden did not close More`);
    assert.equal(await coldFrame.locator('#cold-vault-status').isVisible(), true);
    assert.equal(await coldFrame.locator('#cold-vault-status').getAttribute('tabindex'), '-1');
    await coldFrame.evaluate(() => {
      document.querySelector('.cold-mobile-more-links a[data-cold-more-target="cold-secret-notes"]').click();
    });
    await coldFrame.locator('#cold-secret-notes:not([hidden])').waitFor({ state: 'visible' });
    assert.equal(await coldFrame.locator('.cold-mobile-more').getAttribute('open'), null, `${engine}: Secret notes did not close More`);
    assert.equal(await coldFrame.locator('#cold-secret-notes').getAttribute('tabindex'), '-1');
    await coldFrame.evaluate(() => {
      document.querySelector('.cold-mobile-more-links a[data-cold-more-target="cold-vault-controls"]').click();
    });
    await coldFrame.locator('#cold-vault-controls').waitFor({ state: 'visible' });
    assert.equal(await coldFrame.locator('.cold-mobile-more').getAttribute('open'), null, `${engine}: Lock & wipe did not close More`);
    assert.equal(await coldFrame.locator('#cold-vault-status').isVisible(), true);
    assert.equal(await coldFrame.locator('#cold-vault-status').getAttribute('tabindex'), '-1');
    await coldFrame.evaluate(() => { document.getElementById('cold-concealment-controls').hidden = true; document.getElementById('cold-secret-notes').hidden = true; });
    await coldFrame.locator('.cold-mobile-more').evaluate((details) => { details.open = false; });
    await page.locator('#mobile-more-tab').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobile-more-menu').isVisible(), false);
    assert.equal(
      await page.evaluate(() => document.activeElement && document.activeElement.id),
      'mobile-more-tab',
      `${engine}: Escape did not return focus to the mobile overflow tab`
    );
    await page.locator('#mobile-more-tab').click();
    await page.locator('#mobile-more-menu a[href="#cold-realm-status"]').click();
    await assertColdRealmTarget('mobile More link');
    await page.locator('#mobile-tabs a[data-route="dashboard"]').click();
    await page.waitForFunction(() => window.location.hash === '#dashboard');
    await page.locator('#mobile-more-tab').click();
    await page.locator('#mobile-more-menu a[data-route="reference"]').first().click();
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

async function verifyUi2BrandAssets(browser, engine) {
  const opened = await openPage(browser, buildPath, 'reachable', { requestLog: true });
  const page = opened.page;
  try {
    const { harness, requestLog } = opened;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible' });
    await harness.atViewport(320, 640);

    const wordmark = page.locator('header.app-bar svg.brand-wordmark');
    await wordmark.waitFor({ state: 'visible' });
    const geometry = await wordmark.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        viewportWidth: window.innerWidth,
        width: rect.width
      };
    });
    assert.equal(geometry.viewportWidth, 320, `${engine}: UI.2 harness did not reach 320px`);
    assert.ok(geometry.width > 0 && geometry.height > 0, `${engine}: UI.2 wordmark has no rendered size`);
    assert.ok(geometry.left >= 0, `${engine}: UI.2 wordmark is clipped on the left`);
    assert.ok(
      geometry.right <= geometry.viewportWidth + 0.5,
      `${engine}: UI.2 wordmark is clipped at 320px (${JSON.stringify(geometry)})`
    );
    assert.ok(geometry.bottom > geometry.top, `${engine}: UI.2 wordmark has invalid vertical geometry`);
    assert.equal(await wordmark.getAttribute('role'), 'img');
    assert.equal(await wordmark.getAttribute('aria-label'), 'Coldbox');

    async function assertThemeFills(theme) {
      const colors = await page.evaluate(() => {
        const ink = document.querySelector('header.app-bar svg.brand-wordmark .wordmark-ink');
        const cyan = document.querySelector('header.app-bar svg.brand-wordmark .wordmark-cyan');
        const probe = document.createElement('span');
        probe.style.cssText = [
          'position:absolute',
          'width:1px',
          'height:1px',
          'background:var(--fill-ink)',
          'color:var(--fill-cyan)'
        ].join(';');
        document.body.appendChild(probe);
        const probeStyle = getComputedStyle(probe);
        const result = {
          actual: {
            cyan: getComputedStyle(cyan).fill,
            ink: getComputedStyle(ink).fill
          },
          expected: {
            cyan: probeStyle.color,
            ink: probeStyle.backgroundColor
          },
          theme: document.documentElement.getAttribute('data-theme')
        };
        probe.remove();
        return result;
      });
      assert.equal(colors.theme, theme, `${engine}: UI.2 theme did not settle`);
      assert.deepEqual(colors.actual, colors.expected, `${engine}: wordmark fills do not resolve from theme tokens`);
    }

    await assertThemeFills('dark');
    await page.locator('#theme-toggle').click();
    await page.locator('html[data-theme="light"]').waitFor({ state: 'attached' });
    await assertThemeFills('light');

    const faviconResults = await page.evaluate(async () => {
      const links = Array.from(document.querySelectorAll('link[rel="icon"][type="image/png"]'));
      const decode = (link) => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({
          height: image.naturalHeight,
          href: link.href,
          size: link.sizes.value,
          width: image.naturalWidth
        });
        image.onerror = () => reject(new Error(`favicon did not decode: ${link.sizes.value}`));
        image.src = link.href;
      });
      return Promise.all(links.map(decode));
    });
    assert.deepEqual(
      faviconResults,
      [16, 32, 48].map((size) => ({
        height: size,
        href: faviconResults.find((favicon) => favicon.size === `${size}x${size}`)?.href,
        size: `${size}x${size}`,
        width: size
      })),
      `${engine}: UI.2 favicon dimensions did not decode as declared`
    );
    assert.equal(faviconResults.length, 3, `${engine}: UI.2 must carry exactly three favicon links`);
    assert.ok(
      faviconResults.every(({ href }) => href.startsWith('data:image/png;base64,')),
      `${engine}: UI.2 favicon is not a data URI`
    );

    await page.waitForTimeout(100);
    const documentRequest = fileUrl(buildPath);
    const siblingFileRequests = requestLog.filter((url) => url.startsWith('file:') && url !== documentRequest);
    assert.deepEqual(siblingFileRequests, [], `${engine}: UI.2 requested a sibling file: ${siblingFileRequests.join(', ')}`);
    const iconOrManifestRequests = requestLog.filter((url) => /(?:favicon|manifest|apple-touch-icon|mask-icon)/i.test(url));
    assert.deepEqual(iconOrManifestRequests, [], `${engine}: UI.2 made an icon or manifest request`);
    console.log(`${engine}: UI.2 exact 320px wordmark and data-favicon file:// checks passed`);
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

async function verifyRegistryCrud(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    const coldFrame = await getColdFrame(page, engine);
    const phrase = 'registry browser round-trip phrase';
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await createPreparedVault(page, coldFrame, phrase, 'Registry Browser');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.locator('#page-registry:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#registry-workspace:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });

    const written = page.locator('#registry-status').filter({ hasText: /Public registry change written/ });
    await page.locator('#registry-wallet-label').fill('Browser wallet');
    await page.locator('#registry-wallet-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-wallet-list .registry-record').count(), 1, `${engine}: wallet CRUD did not render the created wallet`);

    await page.locator('#registry-account-label').fill('Browser account');
    await page.locator('#registry-account-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-account-list .registry-record').count(), 1, `${engine}: account CRUD did not render the created account`);

    await page.locator('#registry-address-value').fill('1BoatSLRHtKNngkdXEeobR76b53LETtpyT');
    await page.locator('#registry-address-label').fill('Browser address');
    await page.locator('#registry-address-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-address-list .registry-record').count(), 1, `${engine}: address CRUD did not render the created address`);

    // Empty optional text on an edit is an explicit clear, not an omitted patch.
    await page.locator('#registry-wallet-list [data-registry-action="edit"]').click();
    await page.locator('#registry-wallet-label').fill('');
    await page.locator('#registry-wallet-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await page.locator('#registry-wallet-list').textContent(), /Unlabeled wallet/);
    assert.doesNotMatch(await page.locator('#registry-wallet-list').textContent(), /Browser wallet/);

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#vault-save-download').click();
    const download = await downloadPromise;
    await page.locator('#vault-status-label').filter({ hasText: /Saved · unverified/ }).waitFor({ state: 'visible', timeout: 5000 });
    const downloadedVaultPath = await download.path();
    assert.ok(downloadedVaultPath, `${engine}: registry workflow needs the saved vault bytes for reopen coverage`);
    const canonicalFilename = download.suggestedFilename();

    await lockVaultDiscardingUnsaved(page);
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const locked = document.getElementById('registry-locked');
      return locked && locked.hidden === false;
    }, undefined, { timeout: 5000 });
    assert.equal(await page.locator('#registry-locked').getAttribute('hidden'), null, `${engine}: registry must leave the locked state visible after vault lock`);
    await page.locator('#vault-file-input').setInputFiles({
      name: canonicalFilename,
      mimeType: 'application/octet-stream',
      buffer: fs.readFileSync(downloadedVaultPath)
    });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').click();
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill(phrase);
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.locator('#page-registry:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#registry-workspace:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-wallet-list .registry-record').count(), 1, `${engine}: reopened registry lost the wallet`);
    assert.equal(await page.locator('#registry-account-list .registry-record').count(), 1, `${engine}: reopened registry lost the account`);
    assert.equal(await page.locator('#registry-address-list .registry-record').count(), 1, `${engine}: reopened registry lost the address`);
    assert.match(await page.locator('#registry-wallet-list').textContent(), /Unlabeled wallet/);
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await lockVaultDiscardingUnsaved(page);
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.locator('#page-registry:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#registry-locked:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    console.log(`${engine}: registry wallet/account/address CRUD, explicit clear, durable reopen, and lock state passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyStaleAddressDisplay(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    const coldFrame = await getColdFrame(page, engine);
    const phrase = 'stale address display harness phrase';
    const fixtureBytes = await coldFrame.evaluate(async ({ phrase: unlockPhrase }) => {
      const xpub = `xpub${'1'.repeat(107)}`;
      const bytes = await window.__coldboxVault.create({
        passphrase: unlockPhrase,
        profile: 'fast',
        publicData: {
          schema: 2,
          id: '550e8400-e29b-41d4-a716-446655440010',
          wallets: [{ id: '550e8400-e29b-41d4-a716-446655440011', label: 'Stale fixture wallet' }],
          accounts: [{
            id: '550e8400-e29b-41d4-a716-446655440012',
            walletId: '550e8400-e29b-41d4-a716-446655440011',
            xpub
          }],
          addresses: [{
            id: '550e8400-e29b-41d4-a716-446655440013',
            accountId: '550e8400-e29b-41d4-a716-446655440012',
            index: 0,
            address: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
            addressOrigin: 'derived',
            verificationState: 'cold-verified-stale',
            lastColdVerifiedAt: '2026-08-11T12:00:00.000Z',
            verifiedAgainstXpub: xpub
          }]
        }
      });
      return Array.from(bytes);
    }, { phrase });

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#vault-file-input').setInputFiles({
      name: 'stale-address-fixture--550e8400.cbx',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(fixtureBytes)
    });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').click();
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill(phrase);
    await coldFrame.locator('#cold-vault-unlock').click();
    try {
      await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      throw new Error(`${engine}: stale fixture unlock failed: ${await coldFrame.locator('#cold-vault-status').textContent()}`);
    }
    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.locator('#page-registry:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#registry-workspace:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    const verification = page.locator('#registry-address-list .registry-record-verification');
    await verification.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await verification.textContent(), 'Cold verification stale', `${engine}: stale address must render its stale label`);
    assert.notEqual(await verification.textContent(), 'Cold verified', `${engine}: stale address must never render as cold verified`);
    assert.equal(await verification.getAttribute('data-verification-state'), 'cold-verified-stale');
    console.log(`${engine}: cold-verified-stale persisted state rendered as stale, never as cold verified`);
  } finally {
    await closePage(page);
  }
}

async function verifyAddressVerification(browser, engine) {
  const { page } = await openPage(browser, buildPath, 'reachable', {
    initScript: COLD_TO_WARM_CAPTURE_SCRIPT
  });
  try {
    const coldFrame = await getColdFrame(page, engine);
    const phrase = 'address verification harness phrase';
    const mnemonic = [
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
    ].join(' ');
    const primaryAddressId = '550e8400-e29b-41d4-a716-446655440013';
    const secondaryAddressId = '550e8400-e29b-41d4-a716-446655440015';
    const fixtureBytes = await coldFrame.evaluate(async ({ unlockPhrase, seedPhrase }) => {
      const seed = window.__coldboxSeedForge.mnemonicToSeed(seedPhrase, '', 'english');
      try {
        const primary = window.__coldboxDerivation.deriveEvmFromSeed(seed, { account: 0, count: 1 });
        const secondary = window.__coldboxDerivation.deriveEvmFromSeed(seed, { account: 1, count: 1 });
        const bytes = await window.__coldboxVault.create({
          passphrase: unlockPhrase,
          profile: 'fast',
          publicData: {
            schema: 2,
            id: '550e8400-e29b-41d4-a716-446655440010',
            wallets: [{
              id: '550e8400-e29b-41d4-a716-446655440011',
              label: 'EVM verification wallet',
              type: 'singlesig',
              network: 'ethereum',
              scriptType: 'n/a',
              primaryPath: "m/44'/60'/0'",
              xpubs: [primary.xpub]
            }],
            accounts: [{
              id: '550e8400-e29b-41d4-a716-446655440012',
              walletId: '550e8400-e29b-41d4-a716-446655440011',
              asset: 'ETH',
              path: "m/44'/60'/0'",
              xpub: primary.xpub,
              label: 'Primary Ethereum'
            }, {
              id: '550e8400-e29b-41d4-a716-446655440014',
              walletId: '550e8400-e29b-41d4-a716-446655440011',
              asset: 'ETH',
              path: "m/44'/60'/1'",
              xpub: secondary.xpub,
              label: 'Trading Ethereum'
            }],
            addresses: [{
              id: '550e8400-e29b-41d4-a716-446655440013',
              accountId: '550e8400-e29b-41d4-a716-446655440012',
              index: 0,
              address: primary.addresses[0],
              label: 'Primary receive',
              isChange: false,
              used: false,
              addressOrigin: 'derived',
              verificationState: 'unverified'
            }, {
              id: '550e8400-e29b-41d4-a716-446655440015',
              accountId: '550e8400-e29b-41d4-a716-446655440014',
              index: 0,
              address: secondary.addresses[0],
              label: 'Trading receive',
              isChange: false,
              used: false,
              addressOrigin: 'derived',
              verificationState: 'unverified'
            }]
          }
        });
        return {
          bytes: Array.from(bytes),
          primary: primary.addresses[0],
          secondary: secondary.addresses[0]
        };
      } finally {
        seed.fill(0);
      }
    }, { unlockPhrase: phrase, seedPhrase: mnemonic });

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#vault-file-input').setInputFiles({
      name: 'evm-address-verification--550e8400.cbx',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(fixtureBytes.bytes)
    });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').click();
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill(phrase);
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(mnemonic);
    await coldFrame.locator('#cold-seed-forge-validate').click();
    await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('#nav-rail a[data-route="verify"]').click();
    await page.locator('#page-verify:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#address-verify-record').selectOption(primaryAddressId);
    await page.locator('#address-verify-candidate').fill(fixtureBytes.primary);
    await page.locator('#address-verify-cold').click();
    await page.locator('#address-verify-status[data-state="match"]').waitFor({ state: 'visible', timeout: 15000 });
    assert.match(await page.locator('#address-verify-status').textContent(), /cold-verified/);

    // Once the validated phrase is released, a warm-origin verification must
    // remain comparison-only. The old implementation derived the focused
    // release again, wrote verifiedAgainstXpub into public data, and emitted
    // publicData.updated; this assertion is intentionally red on that code.
    await coldFrame.locator('#cold-seed-forge-validation-release-label').fill('Address verification release');
    await coldFrame.locator('#cold-seed-forge-validation-release').click();
    await coldFrame.locator('#cold-secret-list [data-secret-id]').filter({ hasText: 'Address verification release' }).waitFor({ state: 'visible', timeout: 5000 });
    const capturedBeforeReleasedVerification = await page.evaluate(() => (
      window.__coldboxCapturedColdToWarm ? window.__coldboxCapturedColdToWarm.length : 0
    ));

    await page.locator('#address-verify-record').selectOption(secondaryAddressId);
    await page.locator('#address-verify-candidate').fill(fixtureBytes.secondary);
    await page.locator('#address-verify-cold').click();
    await page.locator('#address-verify-status[data-state="match"]').waitFor({ state: 'visible', timeout: 15000 });
    assert.doesNotMatch(await page.locator('#address-verify-status').textContent(), /cold-verified/);

    const releasedVerificationCapture = await page.evaluate((start) => {
      const messages = (window.__coldboxCapturedColdToWarm || []).slice(start);
      return {
        types: messages.map((message) => message.type),
        publicDataUpdatedCount: messages.filter((message) => message.type === 'publicData.updated').length,
        verificationStates: messages
          .filter((message) => message.type === 'address.verifyResult')
          .map((message) => message.payload && message.payload.verificationState)
      };
    }, capturedBeforeReleasedVerification);
    assert.ok(releasedVerificationCapture.types.includes('address.verifyResult'), `${engine}: released verification must return a result`);
    assert.equal(releasedVerificationCapture.publicDataUpdatedCount, 0, `${engine}: released verification must not replace public data`);
    assert.deepEqual(releasedVerificationCapture.verificationStates, ['unverified'], `${engine}: released verification must not return a persisted cold state`);

    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.locator('#page-registry:not([hidden])').waitFor({ state: 'visible' });
    const releasedSecondaryCard = page.locator('#registry-address-list .registry-record').filter({ hasText: fixtureBytes.secondary });
    await releasedSecondaryCard.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(
      await releasedSecondaryCard.locator('.registry-record-verification').getAttribute('data-verification-state'),
      'unverified',
      `${engine}: released verification must not persist a public derived state`
    );

    await page.locator('#nav-rail a[data-route="verify"]').click();
    await page.locator('#page-verify:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#address-verify-record').selectOption(primaryAddressId);
    await page.locator('#address-verify-candidate').fill(fixtureBytes.secondary);
    await page.locator('#address-verify-compare').click();
    await page.locator('#address-verify-status[data-state="different-account"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await page.locator('#address-verify-status').textContent(), /Trading Ethereum/);

    const lowerPrimary = fixtureBytes.primary.toLowerCase();
    const changedCharacter = lowerPrimary[22] === '0' ? '1' : '0';
    const mismatch = lowerPrimary.slice(0, 22) + changedCharacter + lowerPrimary.slice(23);
    await page.locator('#address-verify-candidate').fill(mismatch);
    await page.locator('#address-verify-compare').click();
    await page.locator('#address-verify-status[data-state="mismatch"]').waitFor({ state: 'visible', timeout: 5000 });
    const comparison = page.locator('#address-verify-comparison:not([hidden])');
    await comparison.waitFor({ state: 'visible', timeout: 5000 });
    const comparisonText = await comparison.textContent();
    assert.match(comparisonText, new RegExp(mismatch));
    assert.match(comparisonText, new RegExp(fixtureBytes.primary));
    assert.match(comparisonText, /\^/);

    await page.locator('#address-verify-candidate').fill(` ${fixtureBytes.primary}`);
    await page.locator('#address-verify-compare').click();
    await page.locator('#address-verify-status[data-state="unrecognised-format"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await comparison.isHidden(), true);

    const batchDetails = page.locator('details.address-batch-check');
    if (!(await batchDetails.evaluate((element) => element.open))) {
      await batchDetails.locator('summary').click();
    }
    await page.locator('#address-verify-batch').fill([
      '0x52908400098527886E0F7030069857D2E4169Ee7',
      fixtureBytes.primary,
      ` ${fixtureBytes.primary}`
    ].join('\n'));
    await page.locator('#address-verify-batch-run').click();
    const batchResults = page.locator('#address-verify-batch-results p');
    await batchResults.nth(2).waitFor({ state: 'visible', timeout: 5000 });
    const batchText = await page.locator('#address-verify-batch-results').textContent();
    assert.match(batchText, /1: Checksum-invalid address/);
    assert.match(batchText, /2: Registry match under account "Primary Ethereum"/);
    assert.match(batchText, /3: The pasted value is not a recognised address format/);
    assert.equal(await batchResults.count(), 3);
    console.log(`${engine}: EVM cold verdict/state transition, named different-account match, aligned mismatch, raw whitespace, and checksum-invalid batch rows passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyClipboardCanary(browser, engine) {
  const { page } = await openPage(browser, buildPath, 'reachable', {
    initScript: CLIPBOARD_CANARY_CONTROL_SCRIPT
  });
  try {
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="verify"]').click();
    await page.locator('#page-verify:not([hidden])').waitFor({ state: 'visible' });
    const toggle = page.locator('#clipboard-canary-toggle');
    const status = page.locator('#clipboard-canary-status');
    assert.equal(await toggle.isChecked(), false);
    assert.equal(await status.getAttribute('data-state'), 'off');
    assert.equal(await page.evaluate(() => window.__coldboxClipboardCanaryTest.text), 'baseline');

    await toggle.click();
    await status.waitFor({ state: 'visible' });
    await page.locator('#clipboard-canary-status[data-state="unavailable"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.evaluate(() => window.__coldboxClipboardCanaryTest.permission), 'denied');
    assert.equal(await toggle.isChecked(), false);
    assert.equal(await page.locator('#clipboard-canary-retry').isHidden(), false);

    await page.evaluate(() => {
      window.__coldboxClipboardCanaryTest.permission = 'granted';
    });
    await page.locator('#clipboard-canary-retry').click();
    await page.locator('#clipboard-canary-status[data-state="armed"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await toggle.isChecked(), true);

    await toggle.click();
    await page.locator('#clipboard-canary-status[data-state="off"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.evaluate(() => {
      const state = window.__coldboxClipboardCanaryTest;
      state.deferNextPermission = true;
      state.deferNextRead = true;
    });
    await toggle.click();
    await page.waitForFunction(() => window.__coldboxClipboardCanaryTest.pendingPermissionResolvers.length === 1);
    await toggle.click();
    await page.locator('#clipboard-canary-status[data-state="off"]').waitFor({ state: 'visible', timeout: 5000 });
    await toggle.click();
    await page.waitForFunction(() => window.__coldboxClipboardCanaryTest.pendingReadResolvers.length === 1);
    await page.evaluate(() => {
      const state = window.__coldboxClipboardCanaryTest;
      state.pendingPermissionResolvers.shift()({ state: state.permission });
    });
    await page.waitForTimeout(25);
    await page.evaluate(() => {
      const state = window.__coldboxClipboardCanaryTest;
      state.pendingReadResolvers.shift()(state.text);
    });
    await page.waitForFunction(() => (
      document.querySelector('#clipboard-canary-status').getAttribute('data-state') === 'armed'
      && document.querySelector('#clipboard-canary-toggle').checked
    ));

    await toggle.click();
    await page.locator('#clipboard-canary-status[data-state="off"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.evaluate(() => {
      window.__coldboxClipboardCanaryTest.clipboardAvailable = false;
    });
    await toggle.click();
    await page.locator('#clipboard-canary-status[data-state="unavailable"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#address-verify-compare').isDisabled(), false);

    await page.evaluate(() => {
      window.__coldboxClipboardCanaryTest.clipboardAvailable = true;
      window.__coldboxClipboardCanaryTest.text = 'baseline';
    });
    await page.evaluate(() => {
      const state = window.__coldboxClipboardCanaryTest;
      state.deferNextPermission = true;
      state.deferNextRead = true;
    });
    await page.locator('#clipboard-canary-retry').click();
    await page.waitForFunction(() => window.__coldboxClipboardCanaryTest.pendingPermissionResolvers.length === 1);
    await page.evaluate(() => {
      document.getElementById('clipboard-canary-retry').click();
    });
    await page.waitForFunction(() => window.__coldboxClipboardCanaryTest.pendingReadResolvers.length === 1);
    await page.evaluate(() => {
      const state = window.__coldboxClipboardCanaryTest;
      state.pendingPermissionResolvers.shift()({ state: state.permission });
    });
    await page.waitForTimeout(25);
    await page.evaluate(() => {
      const state = window.__coldboxClipboardCanaryTest;
      state.pendingReadResolvers.shift()(state.text);
    });
    await page.waitForFunction(() => (
      document.querySelector('#clipboard-canary-status').getAttribute('data-state') === 'armed'
      && document.querySelector('#clipboard-canary-toggle').checked
    ));
    await page.evaluate(() => {
      window.__coldboxClipboardCanaryTest.text = 'changed without user action';
    });
    await page.locator('#clipboard-canary-status[data-state="changed"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await status.textContent(), /clipboard managers.*sync tools.*remote-desktop clients.*malware/i);
    console.log(`${engine}: clipboard canary off-by-default, denied/retry, API-absent fallback, and affirmative change UI passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyDeviceRegistry(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    const phrase = 'device registry harness phrase';
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const coldFrame = await getColdFrame(page, engine);
    await createPreparedVault(page, coldFrame, phrase, 'Device Registry Harness Vault');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="devices"]').click();
    await page.locator('#page-devices:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#device-workspace:not([hidden])').waitFor({ state: 'visible' });

    await page.locator('#device-vendor').fill('Trezor');
    await page.locator('#device-model').fill('Safe 5');
    await page.locator('#device-serial').fill('TS5-001');
    await page.locator('#device-firmware').fill('2.8.1');
    await page.locator('#device-firmware-date').fill('2026-08-10');
    await page.locator('#device-purchased-from').fill('Authorized retailer');
    await page.locator('#device-purchased-at').fill('2026-08-10');
    await page.locator('#device-tamper-notes').fill('Seal matched the order record.');
    await page.locator('#device-pin-set-at').fill('2026-08-10');
    await page.locator('#device-pin-changed-at').fill('2026-08-10');
    await page.locator('#device-phrase-wallet-used').check();
    await page.locator('#device-location').fill('Home safe');
    await page.locator('#device-seed-fingerprints').fill('deadbeef');
    await page.locator('#device-notes').fill('Primary signing device.');
    await page.locator('#device-tamper-check').check();
    await page.locator('#device-form button[type="submit"]').click();
    await page.locator('#device-status').filter({ hasText: /written/i }).waitFor({ state: 'visible', timeout: 5000 });
    const deviceCard = page.locator('#device-list .registry-record').filter({ hasText: 'Trezor Safe 5' });
    await deviceCard.waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await deviceCard.textContent(), /in-use/i, `${engine}: new device did not show its lifecycle status`);

    await page.locator('#device-search').fill('home safe');
    await deviceCard.waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#device-search').fill('');

    // P1.8 F6: every optional Device field is cleared explicitly on edit,
    // rather than being omitted and preserved by merge-on-update semantics.
    await deviceCard.locator('[data-registry-action="edit"]').click();
    await page.locator('#device-serial').fill('');
    await page.locator('#device-firmware-date').fill('');
    await page.locator('#device-purchased-from').fill('');
    await page.locator('#device-purchased-at').fill('');
    await page.locator('#device-tamper-notes').fill('');
    await page.locator('#device-pin-set-at').fill('');
    await page.locator('#device-pin-changed-at').fill('');
    await page.locator('#device-seed-fingerprints').fill('');
    await page.locator('#device-location').fill('');
    await page.locator('#device-notes').fill('');
    await page.locator('#device-form button[type="submit"]').click();
    await page.locator('#device-status').filter({ hasText: /written/i }).waitFor({ state: 'visible', timeout: 5000 });

    await deviceCard.locator('[data-registry-action="edit"]').click();
    for (const selector of [
      '#device-serial', '#device-firmware-date', '#device-purchased-from',
      '#device-purchased-at', '#device-tamper-notes', '#device-pin-set-at',
      '#device-pin-changed-at', '#device-seed-fingerprints', '#device-location',
      '#device-notes'
    ]) {
      assert.equal(await page.locator(selector).inputValue(), '', `${engine}: ${selector} was not cleared in the Device editor`);
    }
    await page.locator('#device-cancel').click();

    // Save the cleared record, reload its durable .cbx bytes, and prove the
    // absence of each optional field survives the cold persistence boundary.
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#vault-save-download').click();
    const download = await downloadPromise;
    await page.locator('#vault-status-label').filter({ hasText: /Saved · unverified/ }).waitFor({ state: 'visible', timeout: 5000 });
    const downloadedVaultPath = await download.path();
    assert.ok(downloadedVaultPath, `${engine}: Device clear workflow needs saved vault bytes for reopen coverage`);
    const canonicalFilename = download.suggestedFilename();

    await lockVaultDiscardingUnsaved(page);
    await page.locator('#vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-file-input').setInputFiles({
      name: canonicalFilename,
      mimeType: 'application/octet-stream',
      buffer: fs.readFileSync(downloadedVaultPath)
    });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').click();
    await coldFrame.locator('#cold-vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-vault-passphrase').fill(phrase);
    await coldFrame.locator('#cold-vault-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="devices"]').click();
    await page.locator('#page-devices:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#device-workspace:not([hidden])').waitFor({ state: 'visible' });
    await deviceCard.waitFor({ state: 'visible', timeout: 5000 });
    await deviceCard.locator('[data-registry-action="edit"]').click();
    for (const selector of [
      '#device-serial', '#device-firmware-date', '#device-purchased-from',
      '#device-purchased-at', '#device-tamper-notes', '#device-pin-set-at',
      '#device-pin-changed-at', '#device-seed-fingerprints', '#device-location',
      '#device-notes'
    ]) {
      assert.equal(await page.locator(selector).inputValue(), '', `${engine}: ${selector} was restored after Device reopen`);
    }
    await page.locator('#device-status-value').selectOption('retired');
    await page.locator('#device-form button[type="submit"]').click();
    await page.locator('#device-status').filter({ hasText: /written/i }).waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await deviceCard.textContent(), /retired/i, `${engine}: device update did not show the new lifecycle status`);

    await deviceCard.locator('[data-registry-action="delete"]').click();
    await page.locator('#device-status').filter({ hasText: /written/i }).waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#device-list').filter({ hasText: /No devices recorded yet/i }).waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#device-show-hidden').check();
    await coldFrame.locator('#cold-concealment-controls').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-concealment-passphrase').fill(phrase);
    await coldFrame.locator('#cold-concealment-reveal').click();
    await deviceCard.waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await lockVaultDiscardingUnsaved(page);
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#device-workspace').getAttribute('hidden'), '', `${engine}: device workspace remained visible after lock`);
    console.log(`${engine}: device registry optional clear, durable reopen, lifecycle status, search, hidden reveal, and lock teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyNotesAndConcealment(browser, engine) {
  const { page } = await openPage(browser, buildPath, 'reachable', { suspendReachabilityInterval: true });
  try {
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    const phrase = 'notes concealment browser phrase';
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const coldFrame = await getColdFrame(page, engine);
    await createPreparedVault(page, coldFrame, phrase, 'Notes Concealment Browser');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#nav-rail a[data-route="registry"]').click();
    await page.locator('#page-registry:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#registry-workspace:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });

    const written = page.locator('#registry-status').filter({ hasText: /Public registry change written/ });
    await page.locator('#registry-wallet-label').fill('Concealment wallet');
    await page.locator('#registry-wallet-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#registry-note-title').fill('Public browser note');
    await page.locator('#registry-note-body').fill('Public note body for browser acceptance.');
    await page.locator('#registry-note-tags').fill('#BrowserTag, longterm');
    await page.locator('#registry-note-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-note-list .registry-record').count(), 1, `${engine}: public note CRUD did not render the created note`);
    assert.match(await page.locator('#registry-note-list').textContent(), /#browsertag/);
    await page.locator('#registry-search').fill('browsertag');
    assert.equal(await page.locator('#registry-note-list .registry-record').count(), 1, `${engine}: public note/tag search did not return the note`);
    await page.locator('#registry-search').fill('');

    // A hidden public record stays out of normal views and search until the
    // cold realm re-authenticates the session. The wrong phrase must not open it.
    await page.locator('#registry-wallet-list [data-registry-action="edit"]').click();
    await page.locator('#registry-wallet-hidden').check();
    await page.locator('#registry-wallet-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-wallet-list .registry-record').count(), 0, `${engine}: hidden wallet remained visible without reveal`);
    await page.locator('#registry-show-hidden').check();
    await coldFrame.locator('#cold-concealment-controls:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-concealment-passphrase').fill('wrong browser phrase');
    await coldFrame.locator('#cold-concealment-reveal').click();
    await page.locator('#registry-status').filter({ hasText: /not accepted/ }).waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await page.locator('#registry-wallet-list .registry-record').count(), 0, `${engine}: wrong reveal phrase exposed a hidden wallet`);

    // The failed acknowledgement resets the warm checkbox; start a fresh
    // cold re-authentication request before entering the correct phrase.
    await page.locator('#registry-show-hidden').check();
    await coldFrame.locator('#cold-concealment-controls:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.waitForFunction(() => {
      const input = document.getElementById('cold-concealment-passphrase');
      return input && input.value === '';
    });
    await coldFrame.locator('#cold-concealment-passphrase').fill(phrase);
    await coldFrame.locator('#cold-concealment-reveal').click();
    await page.waitForTimeout(1500);
    const revealedWallets = await page.locator('#registry-wallet-list .registry-record').count();
    assert.equal(
      revealedWallets,
      1,
      `${engine}: successful reveal did not expose the hidden wallet (warm=${await page.locator('#registry-status').textContent()}, cold=${await coldFrame.locator('#cold-concealment-status').textContent()}, controlsHidden=${await coldFrame.locator('#cold-concealment-controls').isHidden()}, checkbox=${await page.locator('#registry-show-hidden').isChecked()})`
    );
    assert.equal(await page.locator('#registry-wallet-list .registry-record[data-concealed="true"]').count(), 1, `${engine}: successful reveal did not mark the hidden wallet as concealed`);

    // P1.7 F8: editing an already-hidden record with the checkbox cleared must
    // send hidden:false instead of merging the old hidden:true value back in.
    await page.locator('#registry-wallet-list [data-registry-action="edit"]').click();
    assert.equal(await page.locator('#registry-wallet-hidden').isChecked(), true, `${engine}: hidden wallet edit did not load its concealment state`);
    await page.locator('#registry-wallet-hidden').uncheck();
    await page.locator('#registry-wallet-form button[type="submit"]').click();
    await written.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#registry-wallet-list .registry-record[data-concealed="true"]').count(), 0, `${engine}: clearing concealment did not send hidden:false`);

    console.log(`${engine}: P1.7 public notes/tags and reversible concealment passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyColdSecretNotes(browser, engine) {
  const opened = await openPage(browser, buildPath, 'reachable', { suspendReachabilityInterval: true });
  try {
    const { page, reachability } = opened;
    await page.locator('#app[data-handshake-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    const coldFrame = await getColdFrame(page, engine);

    // Keep the browser on the Vault route after the offline transition. A
    // route change from the cold iframe back to the warm shell intentionally
    // starts an online-safe reachability check; this test therefore exercises
    // the cold-only secret-note surface without crossing that boundary.
    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });
    await createPreparedVault(page, coldFrame, 'cold browser secret phrase', 'Cold Secret Browser');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);
    assert.equal(
      await coldFrame.locator('#cold-secret-notes').isHidden(),
      false,
      `${engine}: cold secret-note panel did not initialize (cold=${await coldFrame.locator('#cold-vault-status').textContent()}, mode=${await coldFrame.locator('html').getAttribute('data-warm-network-online')}, session=${await coldFrame.locator('html').getAttribute('data-cold-session-state')})`
    );

    await coldFrame.locator('#cold-secret-note-title').fill('Cold browser secret');
    await coldFrame.locator('#cold-secret-note-body').fill('Secret browser body');
    await coldFrame.locator('#cold-secret-note-tags').fill('private, browser');
    await coldFrame.locator('#cold-secret-note-save').click();
    await page.waitForTimeout(1000);
    assert.equal(
      await coldFrame.locator('#cold-secret-note-list .cold-secret-note-card').count(),
      1,
      `${engine}: cold secret-note create did not render (list=${await coldFrame.locator('#cold-secret-note-list').textContent()}, cold=${await coldFrame.locator('#cold-vault-status').textContent()}, mode=${await coldFrame.locator('html').getAttribute('data-warm-network-online')}, title=${await coldFrame.locator('#cold-secret-note-title').inputValue()}, buttonDisabled=${await coldFrame.locator('#cold-secret-note-save').isDisabled()}, form=${await coldFrame.locator('#cold-secret-note-form').count()})`
    );
    assert.equal(await page.locator('#cold-secret-note-title').count(), 0, `${engine}: secret-note title leaked into the warm document`);
    assert.equal(await page.locator('body').textContent().then((text) => text.includes('Secret browser body')), false, `${engine}: secret-note body leaked into warm text`);
    const secretCard = coldFrame.locator('#cold-secret-note-list .cold-secret-note-card').first();
    assert.match(await secretCard.locator('h3').textContent(), /Cold browser secret/);
    assert.equal((await secretCard.locator('p').first().textContent()).trim(), '\u2022\u2022\u2022\u2022\u2022\u2022', `${engine}: secret note body was not masked by default`);
    await coldFrame.locator('#cold-secret-note-search').fill('private');
    assert.equal(await coldFrame.locator('#cold-secret-note-list .cold-secret-note-card').count(), 1, `${engine}: cold-local secret-note search did not match its tag`);
    await secretCard.locator('button').click();
    assert.equal((await secretCard.locator('p').first().textContent()).trim(), 'Secret browser body', `${engine}: timed secret-note reveal did not stay cold-local`);

    await lockVaultDiscardingUnsaved(page);
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await coldFrame.locator('#cold-secret-notes').isHidden(), true, `${engine}: locking did not hide secret notes`);
    assert.equal(await coldFrame.locator('#cold-secret-note-title').inputValue(), '', `${engine}: locking did not clear the secret-note title`);
    console.log(`${engine}: P1.7 cold-local secret-note creation, search, masking, reveal, and lock cleanup passed`);
  } finally {
    await closePage(opened.page);
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
      { topic: 'glossary:cold-realm-warm-shell', anchorPrefix: 'help-glossary-cold-realm-warm-shell', route: 'dashboard' },
      { topic: 'glossary:airgapped', anchorPrefix: 'help-glossary-airgapped', route: 'dashboard' },
      { topic: 'glossary:capability-self-check', anchorPrefix: 'help-glossary-capability-self-check', route: 'dashboard' },
      { topic: 'glossary:vault', anchorPrefix: 'help-glossary-vault', route: 'vault' },
      { topic: 'glossary:provenance-panel', anchorPrefix: 'help-glossary-provenance-panel', route: 'reference' },
      { topic: 'glossary:appropriate-legal-notices', anchorPrefix: 'help-glossary-appropriate-legal-notices', route: 'reference' }
    ];
    for (const mapping of contextualHelpMappings) {
      await page.locator(`#nav-rail a[data-route="${mapping.route}"]`).click();
      const button = page.locator(`button.help-context-button[data-help-topic="${mapping.topic}"]`);
      await button.waitFor({ state: 'visible', timeout: 3000 });
      await button.click();
      await page.locator('#page-learn:not([hidden])').waitFor({ state: 'visible' });
      await page.locator(`#${mapping.anchorPrefix}`).waitFor({ state: 'visible', timeout: 3000 });
    }

    await page.locator('#nav-rail a[data-route="learn"]').click();
    await page.locator('#page-learn:not([hidden])').waitFor({ state: 'visible' });

    const glossaryTerms = page.locator('#help-glossary-list .help-glossary-term');
    const initialCount = await glossaryTerms.count();
    assert.ok(initialCount > 0, `${engine}: Learn page must render at least one glossary term`);

    // Selecting by hasText: 'Seed phrase' used to be ambiguous: Playwright's
    // hasText matches substring-anywhere-in-text-content, and "Seed phrase"
    // as a cross-referenced concept legitimately appears in the compiled
    // prose of several other glossary entries too (entropy, passphrase,
    // private key, BIP-39, BIP-85, SLIP-39, SeedQR, and the "my seed phrase
    // is my password" myth entry all mention it) - a real run against real
    // Chromium hit a strict-mode violation with 9 matching elements. The
    // compiler's own deterministic id (glossary:seed-phrase -> helpDomId ->
    // #help-glossary-seed-phrase) is exact and unambiguous; use that instead.
    const seedPhraseBody = page.locator('#help-glossary-seed-phrase .help-term-body');
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
    const inlineTerm = page.locator('#help-guides-list .glossary-term').first();
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
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('html[data-crypto-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });

    const meter = coldFrame.locator('#cold-entropy-meter');
    const mixStatus = coldFrame.locator('#cold-entropy-mix-status');
    const target = coldFrame.locator('#cold-entropy-target');
    const healthPanel = coldFrame.locator('#cold-entropy-health');
    const healthSource = coldFrame.locator('#cold-entropy-health-source');
    assert.equal(await healthPanel.getAttribute('data-state'), 'insufficient');
    assert.equal(await healthPanel.getAttribute('data-source'), 'dice-base6');
    assert.equal(await healthPanel.getAttribute('data-enforcement'), 'advisory');
    assert.match(await coldFrame.locator('#cold-entropy-health-disclosure').textContent(), /does not block.*mixing/i);
    assert.match(await coldFrame.locator('#cold-entropy-health-state').textContent(), /Insufficient/i);
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
    assert.match(await coldFrame.locator('#cold-entropy-health-samples').textContent(), /simulations excluded/i);
    await coldFrame.locator('#cold-entropy-dice-reset').click();

    // Bulk manual dice, including an invalid character, remain usable and
    // visibly provenance-labeled as physical/manual values.
    await coldFrame.locator('#cold-entropy-dice-face').fill('123456x');
    await coldFrame.locator('#cold-entropy-dice-base6-add').click();
    assert.match(await coldFrame.locator('#cold-entropy-dice-status').textContent(), /Added 6 base-6 rolls.*Ignored invalid character\(s\): x/);
    assert.ok(Number(await meter.getAttribute('data-fallback-bits')) > 0);
    assert.match(await coldFrame.locator('#cold-entropy-dice-log').textContent(), /Physical\/manual:/);
    await healthSource.selectOption('dice-base6');
    assert.equal(await coldFrame.locator('#cold-entropy-health-samples').textContent(), '6');
    assert.equal(await coldFrame.locator('#cold-entropy-health-frequency-body tr').count(), 6);
    assert.match(await coldFrame.locator('#cold-entropy-health-chi').textContent(), /expected bin|not available/i);
    await coldFrame.locator('#cold-entropy-dice-reset').click();
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');

    // Twenty-two alternating manual coin flips exercise the live runs test and
    // pattern warning. The selected source changes without reloading the
    // cold realm, and the analyzer remains an advisory diagnostic because
    // the selected 128-bit output is still insufficient.
    for (let flip = 0; flip < 22; flip += 1) {
      await coldFrame.locator(flip % 2 === 0 ? '#cold-entropy-coin-heads' : '#cold-entropy-coin-tails').click();
    }
    await healthSource.selectOption('coin');
    assert.equal(await coldFrame.locator('#cold-entropy-health-samples').textContent(), '22');
    assert.match(await coldFrame.locator('#cold-entropy-health-chi').textContent(), /chi2=/i);
    assert.match(await coldFrame.locator('#cold-entropy-health-runs').textContent(), /runs=22.*warning/i);
    assert.match(await coldFrame.locator('#cold-entropy-health-patterns').textContent(), /alternating pattern/i);
    await coldFrame.locator('#cold-entropy-coin-reset').click();
    await healthSource.selectOption('dice-base6');

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
    await healthSource.selectOption('cards');
    assert.equal(await healthPanel.getAttribute('data-state'), 'not-applicable');
    assert.equal(await coldFrame.locator('#cold-entropy-health-samples').textContent(), '1');
    assert.match(await coldFrame.locator('#cold-entropy-health-chi').textContent(), /not applicable.*without replacement/i);
    assert.equal(await coldFrame.locator('#cold-entropy-health-measured').textContent(), 'Not available');
    assert.match(await coldFrame.locator('#cold-entropy-health-disclosure').textContent(), /without-replacement permutation/i);
    await coldFrame.locator('#cold-entropy-undo').click();
    assert.equal(await firstCard.isDisabled(), false);
    assert.equal(await coldFrame.locator('#cold-entropy-card-log').textContent(), 'None yet.');
    assert.equal(await meter.getAttribute('data-fallback-bits'), '0');
    await healthSource.selectOption('dice-base6');

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

async function verifySeedForge(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-seed-forge[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });

    const language = coldFrame.locator('#cold-seed-forge-language');
    const target = coldFrame.locator('#cold-seed-forge-target');
    assert.equal(await language.locator('option').count(), 10, `${engine}: Seed Forge must expose all ten vendored BIP-39 wordlists`);
    assert.equal(await coldFrame.locator('#cold-seed-forge-word-fields .cold-seed-forge-word-field').count(), 24);
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated').isHidden(), true);

    const generatedPassphrase = coldFrame.locator('#cold-seed-forge-generated-passphrase-input');
    const generatedPassphraseConfirm = coldFrame.locator('#cold-seed-forge-generated-passphrase-confirm');
    const validationPassphrase = coldFrame.locator('#cold-seed-forge-validation-passphrase-input');
    const validationPassphraseConfirm = coldFrame.locator('#cold-seed-forge-validation-passphrase-confirm');

    // Duplicate confirmation is a hard local gate. The phrase and passphrase
    // are test fixtures only; neither enters the parent document.
    await generatedPassphrase.fill('test passphrase');
    await generatedPassphraseConfirm.fill('different passphrase');
    await coldFrame.locator('#cold-seed-forge-generate').click();
    assert.match(await coldFrame.locator('#cold-seed-forge-generated-passphrase-error').textContent(), /do not match/i);
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated').isHidden(), true);

    await generatedPassphraseConfirm.fill('test passphrase');
    await coldFrame.locator('#cold-seed-forge-generate').click();
    await coldFrame.locator('#cold-seed-forge-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated-words li').count(), 12);
    assert.match(await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent(), /^[0-9a-f]{8}$/);
    assert.match(await coldFrame.locator('#cold-seed-forge-status').textContent(), /Generated a 12-word BIP-39 phrase/i);
    assert.ok(
      (await coldFrame.locator('#cold-seed-forge-generated-words .cold-seed-forge-word-value').first().textContent()).includes('••'),
      `${engine}: generated words must be masked by default`
    );
    await coldFrame.locator('#cold-seed-forge-reveal').click();
    assert.doesNotMatch(
      await coldFrame.locator('#cold-seed-forge-generated-words .cold-seed-forge-word-value').first().textContent(),
      /••/
    );
    await coldFrame.locator('#cold-seed-forge-reveal').click();
    assert.match(
      await coldFrame.locator('#cold-seed-forge-generated-words .cold-seed-forge-word-value').first().textContent(),
      /••/
    );

    // The explicit handoff consumes the exact bytes displayed by Entropy Lab.
    // The expected phrase is calculated from the captured mixed bytes through
    // the cold frame's public Seed Forge API, so a second mix would change the
    // assertion and fail.
    await coldFrame.locator('#cold-entropy-hex-input').fill('00112233445566778899aabbccddeeff');
    await coldFrame.locator('#cold-entropy-hex-add').click();
    await coldFrame.locator('#cold-entropy-csprng-count').fill('1');
    await coldFrame.locator('#cold-entropy-csprng-draw').click();
    await coldFrame.locator('#cold-entropy-mix-run').click();
    await coldFrame.locator('#cold-entropy-mix-output:not([hidden])').waitFor({ state: 'visible' });
    const mixedHex = (await coldFrame.locator('#cold-entropy-mix-output').textContent()).trim();
    assert.match(mixedHex, /^[0-9a-f]{32}$/);
    const expectedMixedMnemonic = await coldFrame.evaluate((hexValue) => {
      const bytes = new Uint8Array(hexValue.match(/../g).map((pair) => Number.parseInt(pair, 16)));
      return window.__coldboxSeedForge.entropyToMnemonic(bytes, 'english');
    }, mixedHex);
    const useMixButton = coldFrame.locator('#cold-entropy-mix-use-seed-forge');
    assert.equal(await useMixButton.isHidden(), false);
    await useMixButton.click();
    await coldFrame.locator('#cold-seed-forge-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-seed-forge-reveal').click();
    const exactGeneratedWords = await coldFrame.locator('#cold-seed-forge-generated-words .cold-seed-forge-word-value').allTextContents();
    assert.equal(exactGeneratedWords.join(' '), expectedMixedMnemonic, `${engine}: Seed Forge must consume the exact displayed mix`);
    await coldFrame.locator('#cold-seed-forge-reveal').click();
    assert.equal(await useMixButton.isHidden(), true);
    assert.equal(await coldFrame.locator('#cold-entropy-mix-output').isHidden(), true);

    // A confirmed passphrase change re-derives the current generated phrase;
    // it does not generate new entropy or a new mnemonic. The raw seed stays
    // masked until its separate, time-limited reveal action.
    const generatedFingerprintBeforePassphrase = (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim();
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim(), 'Masked (64 bytes)');
    await generatedPassphrase.fill('dynamic passphrase');
    await generatedPassphraseConfirm.fill('dynamic passphrase');
    const generatedFingerprintAfterPassphrase = (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim();
    assert.match(generatedFingerprintAfterPassphrase, /^[0-9a-f]{8}$/);
    assert.notEqual(generatedFingerprintAfterPassphrase, generatedFingerprintBeforePassphrase);
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim(), 'Masked (64 bytes)');
    await coldFrame.locator('#cold-seed-forge-generated-seed-reveal').click();
    const generatedSeedAfterPassphrase = (await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim();
    assert.match(generatedSeedAfterPassphrase, /^[0-9a-f]{128}$/);
    await coldFrame.locator('#cold-seed-forge-generated-seed-reveal').click();
    await generatedPassphraseConfirm.fill('mismatch');
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(), 'Not calculated');
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim(), 'Not calculated');
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated-raw').isHidden(), true);
    await generatedPassphraseConfirm.fill('dynamic passphrase');

    // Official public BIP-39 vector: the Trezor/python-mnemonic vector with
    // passphrase TREZOR. This verifies validation, per-word status, NFKD
    // passphrase handling, and the cold-side fingerprint readout in a real
    // browser frame.
    await validationPassphrase.fill('TREZOR');
    await validationPassphraseConfirm.fill('TREZOR');
    const officialMnemonic = [
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
    ].join(' ');
    await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(officialMnemonic);
    await coldFrame.locator('#cold-seed-forge-validate').click();
    await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-forge-word-fields .cold-seed-forge-word-field[data-state="valid"]').count(), 12);
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(), 'b4e3f5ed');
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(),
      generatedFingerprintAfterPassphrase,
      `${engine}: validation passphrase setup changed the generated fingerprint`
    );
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim(), 'Masked (64 bytes)');
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    const validationSeedBeforePassphrase = (await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim();
    assert.match(validationSeedBeforePassphrase, /^[0-9a-f]{128}$/);
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    await coldFrame.locator('#cold-seed-forge-generated-seed-reveal').click();
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim(),
      generatedSeedAfterPassphrase,
      `${engine}: validation passphrase setup changed the generated raw seed`
    );
    await coldFrame.locator('#cold-seed-forge-generated-seed-reveal').click();
    await validationPassphrase.fill('another passphrase');
    await validationPassphraseConfirm.fill('another passphrase');
    const validationFingerprintAfterPassphrase = (await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim();
    assert.match(validationFingerprintAfterPassphrase, /^[0-9a-f]{8}$/);
    assert.notEqual(validationFingerprintAfterPassphrase, 'b4e3f5ed');
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(),
      generatedFingerprintAfterPassphrase,
      `${engine}: validation passphrase change changed the generated fingerprint`
    );
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim(), 'Masked (64 bytes)');
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    const validationSeedAfterPassphrase = (await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim();
    assert.match(validationSeedAfterPassphrase, /^[0-9a-f]{128}$/);
    assert.notEqual(validationSeedAfterPassphrase, validationSeedBeforePassphrase);
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    await validationPassphraseConfirm.fill('mismatch again');
    assert.match(await coldFrame.locator('#cold-seed-forge-validation-passphrase-error').textContent(), /for this workflow/i);
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(), 'Not calculated');
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim(), 'Not calculated');
    assert.equal(await coldFrame.locator('#cold-seed-forge-validation-raw').isHidden(), true);
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(),
      generatedFingerprintAfterPassphrase,
      `${engine}: validation passphrase mismatch changed the generated fingerprint`
    );
    await validationPassphraseConfirm.fill('another passphrase');

    // The inverse direction is isolated too: changing or mismatching the
    // Generate pair must not touch the validated phrase's seed or fingerprint.
    const validationFingerprintBeforeGeneratedChange = (await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim();
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    const validationSeedBeforeGeneratedChange = (await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim();
    assert.match(validationSeedBeforeGeneratedChange, /^[0-9a-f]{128}$/);
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    await generatedPassphrase.fill('third generated passphrase');
    await generatedPassphraseConfirm.fill('third generated passphrase');
    const generatedFingerprintAfterSecondPassphrase = (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim();
    assert.match(generatedFingerprintAfterSecondPassphrase, /^[0-9a-f]{8}$/);
    assert.notEqual(generatedFingerprintAfterSecondPassphrase, generatedFingerprintAfterPassphrase);
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(),
      validationFingerprintBeforeGeneratedChange,
      `${engine}: generated passphrase change changed the validation fingerprint`
    );
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim(),
      validationSeedBeforeGeneratedChange,
      `${engine}: generated passphrase change changed the validation raw seed`
    );
    await coldFrame.locator('#cold-seed-forge-validation-seed-reveal').click();
    await generatedPassphraseConfirm.fill('generated mismatch only');
    assert.match(await coldFrame.locator('#cold-seed-forge-generated-passphrase-error').textContent(), /for this workflow/i);
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(), 'Not calculated');
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim(), 'Not calculated');
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(),
      validationFingerprintBeforeGeneratedChange,
      `${engine}: generated passphrase mismatch changed the validation fingerprint`
    );
    await generatedPassphraseConfirm.fill('third generated passphrase');

    // Negative validation: known words with a bad checksum fail closed, and
    // an unknown word is reported inline rather than being silently accepted.
    await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(
      officialMnemonic.replace('about', 'abandon')
    );
    await coldFrame.locator('#cold-seed-forge-validate').click();
    assert.match(await coldFrame.locator('#cold-seed-forge-validation-status').textContent(), /checksum does not match/i);
    assert.equal(await coldFrame.locator('#cold-seed-forge-word-fields .cold-seed-forge-word-field[data-state="checksum"]').count(), 12);
    await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(
      officialMnemonic.replace('about', 'not-a-word')
    );
    await coldFrame.locator('#cold-seed-forge-validate').click();
    assert.match(await coldFrame.locator('#cold-seed-forge-validation-status').textContent(), /not in the selected/i);
    assert.equal(await coldFrame.locator('#cold-seed-forge-word-fields .cold-seed-forge-word-field[data-state="unknown"]').count(), 1);
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(), 'Not calculated');
    assert.equal(
      (await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(),
      generatedFingerprintAfterSecondPassphrase,
      `${engine}: validation phrase failure changed the generated fingerprint`
    );

    // The 256-bit selection produces the corresponding 24-word shape and
    // stays synchronized with Entropy Lab's target selector.
    await target.selectOption('256');
    assert.equal(await coldFrame.locator('#cold-entropy-target').inputValue(), '256');
    await generatedPassphrase.fill('');
    await generatedPassphraseConfirm.fill('');
    await coldFrame.locator('#cold-seed-forge-generate').click();
    await coldFrame.locator('#cold-seed-forge-generated-words li').nth(23).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated-words li').count(), 24);

    // Teardown is one shared cold-session boundary, but both workflow pairs
    // and both derived surfaces must be cleared through it.
    await validationPassphrase.fill('teardown validation passphrase');
    await validationPassphraseConfirm.fill('teardown validation passphrase');
    await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(officialMnemonic);
    await coldFrame.locator('#cold-seed-forge-validate').click();
    await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match((await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(), /^[0-9a-f]{8}$/);
    await generatedPassphrase.fill('teardown generated passphrase');
    await generatedPassphraseConfirm.fill('teardown generated passphrase');
    assert.match((await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(), /^[0-9a-f]{8}$/);
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-seed').textContent()).trim(), 'Masked (64 bytes)');
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-seed').textContent()).trim(), 'Masked (64 bytes)');

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated').isHidden(), true);
    assert.equal((await coldFrame.locator('#cold-seed-forge-generated-fingerprint').textContent()).trim(), 'Not calculated');
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(), 'Not calculated');
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated-raw').isHidden(), true);
    assert.equal(await coldFrame.locator('#cold-seed-forge-validation-raw').isHidden(), true);
    assert.equal(await generatedPassphrase.inputValue(), '');
    assert.equal(await generatedPassphraseConfirm.inputValue(), '');
    assert.equal(await validationPassphrase.inputValue(), '');
    assert.equal(await validationPassphraseConfirm.inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-seed-forge-generated-passphrase-error').isHidden(), true);
    assert.equal(await coldFrame.locator('#cold-seed-forge-validation-passphrase-error').isHidden(), true);

    console.log(`${engine}: Seed Forge language list, exact mix handoff, independent Generate/Validate passphrases, isolated derivations, official vectors, negative cases, and teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyReleasedSecretSwitcher(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-secret-switcher[data-state="empty"]').waitFor({ state: 'attached', timeout: 10000 });

    const officialMnemonic = [
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
    ].join(' ');

    async function releaseValidated(label) {
      await coldFrame.locator('#cold-seed-forge-validation-passphrase-input').fill('TREZOR');
      await coldFrame.locator('#cold-seed-forge-validation-passphrase-confirm').fill('TREZOR');
      await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(officialMnemonic);
      await coldFrame.locator('#cold-seed-forge-validate').click();
      await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 5000 });
      await coldFrame.locator('#cold-seed-forge-validation-release-label').fill(label);
      await coldFrame.locator('#cold-seed-forge-validation-release').click();
      await coldFrame.locator('#cold-secret-list [data-secret-id]').filter({ hasText: label }).waitFor({ state: 'visible', timeout: 5000 });
    }

    await releaseValidated('Primary backup');
    await coldFrame.locator('#cold-seed-forge-generate').click();
    await coldFrame.locator('#cold-seed-forge-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-seed-forge-generated-release-label').fill('Spare backup');
    await coldFrame.locator('#cold-seed-forge-generated-release').click();
    await coldFrame.locator('#cold-secret-list [data-secret-id]').filter({ hasText: 'Spare backup' }).waitFor({ state: 'visible', timeout: 5000 });

    const records = coldFrame.locator('#cold-secret-list [role="listitem"]');
    assert.equal(await records.count(), 2, `${engine}: two Seed Forge releases must be present in the switcher`);
    assert.equal(await coldFrame.locator('#cold-secret-list button[aria-pressed="true"]').count(), 1);
    assert.match(await coldFrame.locator('#cold-secret-list').textContent(), /Primary backup/);
    assert.match(await coldFrame.locator('#cold-secret-list').textContent(), /Spare backup/);
    assert.match(await coldFrame.locator('#cold-secret-list').textContent(), /b4e3f5ed/);
    const focusedFingerprint = (await coldFrame.locator('#cold-secret-focus-summary').textContent()).match(/[0-9a-f]{8}/i)[0];
    assert.match(focusedFingerprint, /^[0-9a-f]{8}$/);

    const focusedReadyMarker = await coldFrame.locator('#cold-ready').textContent();
    await records.nth(0).locator('button[data-secret-action="focus"]').click();
    await coldFrame.locator('#cold-secret-focus-summary').filter({ hasText: 'Primary backup' }).waitFor({ state: 'visible' });
    assert.equal(await coldFrame.locator('#cold-secret-list button[aria-pressed="true"]').count(), 1);
    assert.equal(await coldFrame.locator('#cold-ready').textContent(), focusedReadyMarker, `${engine}: focus changed without a reload`);
    for (const removedId of [
      '#cold-seed-xor-source',
      '#cold-codex32-secret-hex',
      '#cold-shamir39-source',
      '#cold-raw-sss-source',
      '#cold-slip39-seed-source'
    ]) {
      assert.equal(await coldFrame.locator(removedId).count(), 0, `${engine}: duplicate loader ${removedId} must be removed`);
    }
    assert.equal(await coldFrame.locator('#cold-qr-seed-source').count(), 0);
    assert.equal(await coldFrame.locator('[data-cold-group]').count(), 6, `${engine}: sealed realm must expose six tool groups`);
    assert.equal(await coldFrame.locator('#cold-tool-hub-link').count(), 0);
    assert.equal(await coldFrame.locator('.cold-tool-hub-link').count(), 6, `${engine}: hub must link to every sealed tool group`);
    const focusedIndicators = coldFrame.locator('[data-secret-focus-indicator][data-state="focused"]');
    assert.equal(await focusedIndicators.count(), 6, `${engine}: every destructive, splitting, or exporting panel must show focus`);
    const primaryFingerprint = (await coldFrame.locator('#cold-secret-focus-summary').textContent()).match(/[0-9a-f]{8}/i)[0];
    assert.ok((await focusedIndicators.allTextContents()).every((text) => text.includes(primaryFingerprint)));
    await coldFrame.locator('#cold-verification-wallet-use').click();
    await coldFrame.locator('#cold-verification-wallet-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await coldFrame.locator('#cold-verification-wallet-fingerprint').textContent()).trim(), primaryFingerprint);

    await records.nth(1).locator('button[data-secret-action="focus"]').click();
    await coldFrame.locator('#cold-secret-focus-summary').filter({ hasText: 'Spare backup' }).waitFor({ state: 'visible' });
    const spareFingerprint = (await coldFrame.locator('#cold-secret-focus-summary').textContent()).match(/[0-9a-f]{8}/i)[0];
    assert.notEqual(spareFingerprint, primaryFingerprint);
    assert.ok((await focusedIndicators.allTextContents()).every((text) => text.includes(spareFingerprint)));
    await coldFrame.locator('#cold-verification-wallet-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await coldFrame.locator('#cold-verification-wallet-fingerprint').textContent()).trim(), spareFingerprint);
    assert.equal(await coldFrame.locator('#cold-secret-list button[aria-pressed="true"]').count(), 1);
    assert.equal(await page.evaluate((label) => document.body.textContent.includes(label), 'Primary backup'), false, `${engine}: released labels must stay out of the warm shell`);
    assert.equal(await page.evaluate((fingerprint) => document.body.textContent.includes(fingerprint), spareFingerprint), false, `${engine}: released fingerprints must stay out of the warm shell`);

    await coldFrame.locator('#cold-secret-registry-clear').click();
    await coldFrame.locator('#cold-secret-switcher[data-state="empty"][data-released-secret-count="0"]').waitFor({ state: 'attached' });
    assert.equal(await coldFrame.locator('#cold-secret-registry-empty').isHidden(), false);
    assert.equal(await coldFrame.locator('[data-secret-focus-indicator][data-state="empty"]').count(), 6);

    await releaseValidated('Shortcut test');
    await coldFrame.locator('body').press('Control+Alt+Shift+L');
    await coldFrame.locator('#cold-secret-switcher[data-state="empty"][data-released-secret-count="0"]').waitFor({ state: 'attached' });

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await createPreparedVault(page, coldFrame, 'ui3 lock test phrase', 'UI3 Lock ' + engine + ' ' + String(Date.now()));
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await releaseValidated('Vault lock test');
    await lockVaultDiscardingUnsaved(page);
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-secret-switcher[data-state="empty"][data-released-secret-count="0"]').waitFor({ state: 'attached' });

    await coldFrame.evaluate(() => {
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = function (handler, delay) {
        return nativeSetTimeout(handler, delay === 300000 ? 2000 : delay);
      };
    });
    await createPreparedVault(page, coldFrame, 'ui3 idle test phrase', 'UI3 Idle ' + engine + ' ' + String(Date.now()));
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });
    await releaseValidated('Idle test');
    await coldFrame.locator('#cold-secret-switcher[data-state="empty"][data-released-secret-count="0"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });

    await releaseValidated('Teardown test');
    await coldFrame.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await coldFrame.locator('#cold-secret-switcher[data-state="empty"][data-released-secret-count="0"]').waitFor({ state: 'attached' });

    await releaseValidated('Panic test');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-secret-switcher[data-released-secret-count="0"]').count(), 1);

    console.log(`${engine}: released-secret registry, public switcher, focus indicators, boundary isolation, clear shortcut, realm teardown, and panic clearing passed`);
  } finally {
    await closePage(page);
  }
}

async function verifySeedXor(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-seed-xor[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });

    assert.equal(await page.evaluate(() => typeof window.__coldboxSeedXor), 'undefined');
    assert.equal(await coldFrame.locator('#cold-seed-xor-language option').count(), 10);
    assert.equal(await coldFrame.locator('#cold-seed-xor-count option').count(), 3);
    assert.equal(await coldFrame.locator('#cold-seed-xor-generated').isHidden(), true);

    const mnemonic = UI4_OFFICIAL_MNEMONIC;
    await releaseFocusedSeed(coldFrame, 'Seed XOR fixture', mnemonic);
    await coldFrame.locator('#cold-seed-xor-count').selectOption('3');
    await coldFrame.locator('#cold-seed-xor-mode').selectOption('deterministic');
    await coldFrame.locator('#cold-seed-xor-split').click();
    await coldFrame.locator('#cold-seed-xor-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-xor-generated-parts li').count(), 3);
    assert.match(
      await coldFrame.locator('#cold-seed-xor-generated-parts li').first().textContent(),
      /\u2022\u2022/
    );
    assert.match(await coldFrame.locator('#cold-seed-xor-split-status').textContent(), /Every part is required/i);

    await coldFrame.locator('#cold-seed-xor-reveal').click();
    const parts = await coldFrame.locator('#cold-seed-xor-generated-parts li').allTextContents();
    assert.equal(parts.length, 3);
    parts.forEach((part) => assert.match(part, /\b[a-z]+\b/));
    await coldFrame.locator('#cold-seed-xor-reveal').click();
    assert.match(await coldFrame.locator('#cold-seed-xor-generated-parts li').first().textContent(), /\u2022\u2022/);

    for (let index = 0; index < parts.length; index += 1) {
      await coldFrame.locator(`#cold-seed-xor-part-${index + 1}`).fill(parts[index]);
    }
    await coldFrame.locator('#cold-seed-xor-combine').click();
    assert.equal(await coldFrame.locator('#cold-seed-xor-part-1').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-seed-xor-part-2').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-seed-xor-part-3').inputValue(), '');
    assert.equal((await coldFrame.locator('#cold-seed-xor-combined').textContent()).trim(), 'Masked (12-word phrase)');
    assert.match(await coldFrame.locator('#cold-seed-xor-combine-status').textContent(), /checked BIP-39 phrase/i);
    await coldFrame.locator('#cold-seed-xor-combined-reveal').click();
    assert.equal((await coldFrame.locator('#cold-seed-xor-combined').textContent()).trim(), mnemonic);
    await coldFrame.locator('#cold-seed-xor-combined-reveal').click();
    assert.equal((await coldFrame.locator('#cold-seed-xor-combined').textContent()).trim(), 'Masked (12-word phrase)');

    // A selected part count is a hard requirement; an incomplete set is not
    // silently treated as a different scheme.
    await coldFrame.locator('#cold-seed-xor-part-1').fill(parts[0]);
    await coldFrame.locator('#cold-seed-xor-part-2').fill(parts[1]);
    await coldFrame.locator('#cold-seed-xor-combine').click();
    await coldFrame.locator('#cold-seed-xor-combine-status[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-seed-xor-combine-status').textContent(), /every selected.*required/i);
    assert.equal(await coldFrame.locator('#cold-seed-xor-part-1').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-seed-xor-part-2').inputValue(), '');

    // Random mode exercises the CSPRNG-only path and still produces complete
    // valid phrases without placing the source in the warm shell.
    await coldFrame.locator('#cold-seed-xor-count').selectOption('2');
    await coldFrame.locator('#cold-seed-xor-mode').selectOption('random');
    await coldFrame.locator('#cold-seed-xor-split').click();
    await coldFrame.locator('#cold-seed-xor-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-xor-generated-parts li').count(), 2);
    assert.equal(await page.evaluate((text) => document.body.textContent.includes(text), mnemonic), false);

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-seed-xor-generated').isHidden(), true);
    assert.equal((await coldFrame.locator('#cold-seed-xor-combined').textContent()).trim(), 'Not calculated');
    assert.equal(await coldFrame.locator('#cold-seed-xor-part-1').inputValue(), '');

    console.log(`${engine}: Seed XOR official-compatible deterministic flow, random flow, masked reveals, incomplete-set rejection, warm isolation, and teardown passed`);
  } finally {
    await closePage(page);
  }
}
async function verifyCodex32(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-codex32[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });
    assert.equal(await coldFrame.evaluate(() => typeof window.__coldboxCodex32), 'object');
    assert.equal(await page.evaluate(() => typeof window.__coldboxCodex32), 'undefined');

    await releaseFocusedSeed(coldFrame, 'Codex32 fixture');
    assert.equal(await coldFrame.locator('#cold-codex32-secret-hex').count(), 0);
    await coldFrame.locator('#cold-codex32-threshold').selectOption('3');
    await coldFrame.locator('#cold-codex32-count').fill('5');
    const identifierInput = coldFrame.locator('#cold-codex32-identifier');
    assert.equal(await identifierInput.inputValue(), '', `${engine}: codex32's ordinary identifier path must start blank`);
    await coldFrame.locator('#cold-codex32-generate').click();
    await coldFrame.locator('#cold-codex32-generate-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    const maskedShares = await coldFrame.locator('#cold-codex32-generated').inputValue();
    assert.equal(maskedShares.replace(/[\u2022\r\n]/g, ''), '');
    assert.doesNotMatch(maskedShares, /ms13cash/);

    await coldFrame.locator('#cold-codex32-reveal').click();
    const visibleSharesText = await coldFrame.locator('#cold-codex32-generated').inputValue();
    const visibleShares = visibleSharesText.split(/\r?\n/).filter(Boolean);
    assert.equal(visibleShares.length, 5);
    const generatedIdentifier = await coldFrame.evaluate((share) => window.__coldboxCodex32.decode(share).identifier, visibleShares[0]);
    assert.equal(generatedIdentifier.length, 4);
    assert.notEqual(generatedIdentifier, 'cash', `${engine}: omitted codex32 identifiers must not reuse the example value`);
    assert.match(visibleShares[0], /^ms13/);
    assert.equal(
      await coldFrame.evaluate((shares) => shares.every((share) => window.__coldboxCodex32.decode(share).threshold === 3), visibleShares),
      true
    );

    await coldFrame.locator('#cold-codex32-recovery-input').fill(visibleShares.slice(0, 3).join('\n'));
    await coldFrame.locator('#cold-codex32-recover').click();
    await coldFrame.locator('#cold-codex32-recovery-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(
      (await coldFrame.locator('#cold-codex32-recovered').textContent()).replace(/[\u2022\r\n]/g, '').trim(),
      ''
    );
    await coldFrame.locator('#cold-codex32-recovered-reveal').click();
    assert.match((await coldFrame.locator('#cold-codex32-recovered').textContent()).trim(), /^ms13/);

    const valid = 'ms10testsxxxxxxxxxxxxxxxxxxxxxxxxxx4nzvca9cmczlw';
    const corrupted = `${valid.slice(0, 20)}q${valid.slice(21)}`;
    await coldFrame.locator('#cold-codex32-correction-input').fill(corrupted);
    await coldFrame.locator('#cold-codex32-correct').click();
    await coldFrame.locator('#cold-codex32-correction-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-codex32-use-correction').isDisabled(), false);
    assert.equal(
      (await coldFrame.locator('#cold-codex32-correction-output').textContent()).replace(/[\u2022\r\n]/g, '').trim(),
      ''
    );
    await coldFrame.locator('#cold-codex32-use-correction').click();
    assert.equal(await coldFrame.locator('#cold-codex32-correction-input').inputValue(), valid);
    assert.match(await coldFrame.locator('#cold-codex32-correction-status').textContent(), /loaded after confirmation/i);

    await coldFrame.locator('#cold-codex32-recovery-input').fill(visibleShares[0]);
    await coldFrame.locator('#cold-codex32-recover').click();
    await coldFrame.locator('#cold-codex32-recovery-status[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-codex32-recovery-status').textContent(), /exactly 3 shares/i);
    assert.doesNotMatch(await page.locator('body').textContent(), new RegExp(visibleShares[0]));

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-codex32-generated').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-codex32-recovery-input').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-codex32-correction-input').inputValue(), '');
    assert.equal((await coldFrame.locator('#cold-codex32-recovered').textContent()).trim(), 'No recovered seed.');
    console.log(`${engine}: codex32 BIP-93 vectors, threshold generation/recovery, masking, confirmation-gated correction, warm isolation, and teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyShamirBackups(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-shamir[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });
    assert.equal(await page.evaluate(() => typeof window.__coldboxShamir), 'undefined');
    assert.equal(await coldFrame.locator('#cold-shamir39-language option').count(), 10);
    assert.equal(await coldFrame.locator('#cold-shamir39-combine-fields input').count(), 8);
    assert.equal(await coldFrame.locator('#cold-raw-sss-bits option').count(), 18);

    const mnemonic = UI4_OFFICIAL_MNEMONIC;
    await releaseFocusedSeed(coldFrame, 'Shamir fixture', mnemonic);
    await coldFrame.locator('#cold-shamir39-threshold').selectOption('3');
    await coldFrame.locator('#cold-shamir39-shares').selectOption('5');
    await coldFrame.locator('#cold-shamir39-split').click();
    await coldFrame.locator('#cold-shamir39-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-shamir39-generated-parts li').count(), 5);
    assert.equal(await coldFrame.locator('#cold-shamir39-generated-parts [data-secret-visible="false"]').count(), 5);
    assert.match(await coldFrame.locator('#cold-shamir39-generated-parts').textContent(), /Masked share/);
    await coldFrame.locator('#cold-shamir39-reveal').click();
    const shamirParts = await coldFrame.locator('#cold-shamir39-generated-parts .cold-shamir-share-value').allTextContents();
    assert.equal(shamirParts.length, 5);
    assert.equal(await coldFrame.locator('#cold-shamir39-generated-parts [data-secret-visible="true"]').count(), 5);
    assert.doesNotMatch(shamirParts[0], /Masked share/);
    await coldFrame.locator('#cold-shamir39-reveal').click();
    assert.equal(await coldFrame.locator('#cold-shamir39-generated-parts [data-secret-visible="false"]').count(), 5);

    for (let index = 0; index < 3; index += 1) {
      await coldFrame.locator('#cold-shamir39-combine-fields input').nth(index).fill(shamirParts[index]);
    }
    await coldFrame.locator('#cold-shamir39-combine-button').click();
    await coldFrame.locator('#cold-shamir39-combine-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await coldFrame.locator('#cold-shamir39-result').textContent()).trim(), 'Masked BIP-39 phrase');
    assert.equal(await coldFrame.locator('#cold-shamir39-result').getAttribute('data-secret-visible'), 'false');
    assert.equal(await coldFrame.locator('#cold-shamir39-combine-fields input').nth(0).inputValue(), '');
    await coldFrame.locator('#cold-shamir39-result-reveal').click();
    assert.equal((await coldFrame.locator('#cold-shamir39-result').textContent()).trim(), mnemonic);
    assert.equal(await coldFrame.locator('#cold-shamir39-result').getAttribute('data-secret-visible'), 'true');
    await coldFrame.locator('#cold-shamir39-result-reveal').click();

    const rawSecret = await coldFrame.evaluate((phrase) => {
      return Array.from(window.__coldboxSeedForge.mnemonicToSeed(phrase, 'TREZOR', 'english'))
        .map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }, mnemonic);
    await coldFrame.locator('#cold-raw-sss-bits').selectOption('8');
    await coldFrame.locator('#cold-raw-sss-threshold').selectOption('2');
    await coldFrame.locator('#cold-raw-sss-shares').selectOption('3');
    await coldFrame.locator('#cold-raw-sss-split').click();
    await coldFrame.locator('#cold-raw-sss-generated:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-raw-sss-generated-parts li').count(), 3);
    assert.equal(await coldFrame.locator('#cold-raw-sss-generated-parts [data-secret-visible="false"]').count(), 3);
    await coldFrame.locator('#cold-raw-sss-reveal').click();
    const rawParts = await coldFrame.locator('#cold-raw-sss-generated-parts .cold-shamir-share-value').allTextContents();
    assert.equal(rawParts.length, 3);
    assert.doesNotMatch(rawParts[0], /Masked share/);
    await coldFrame.locator('#cold-raw-sss-reveal').click();
    for (let index = 0; index < 2; index += 1) {
      await coldFrame.locator('#cold-raw-sss-combine-fields input').nth(index).fill(rawParts[index]);
    }
    await coldFrame.locator('#cold-raw-sss-combine-button').click();
    await coldFrame.locator('#cold-raw-sss-combine-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await coldFrame.locator('#cold-raw-sss-result').textContent()).trim(), 'Masked hexadecimal secret');
    await coldFrame.locator('#cold-raw-sss-result-reveal').click();
    assert.equal((await coldFrame.locator('#cold-raw-sss-result').textContent()).trim(), rawSecret);
    await coldFrame.locator('#cold-raw-sss-result-reveal').click();

    await coldFrame.locator('#cold-raw-sss-combine-fields input').nth(0).fill('80100');
    await coldFrame.locator('#cold-raw-sss-combine-button').click();
    assert.match(await coldFrame.locator('#cold-raw-sss-combine-status').textContent(), /did not reconstruct|at least two/i);
    assert.equal(await coldFrame.locator('#cold-raw-sss-combine-fields input').nth(0).inputValue(), '');

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-shamir39-generated').isHidden(), true);
    assert.equal(await coldFrame.locator('#cold-raw-sss-generated').isHidden(), true);
    assert.equal((await coldFrame.locator('#cold-shamir39-result').textContent()).trim(), 'Not reconstructed');
    assert.equal((await coldFrame.locator('#cold-raw-sss-result').textContent()).trim(), 'Not reconstructed');
    assert.equal(await coldFrame.locator('#cold-shamir39-source').count(), 0);
    assert.equal(await coldFrame.locator('#cold-raw-sss-source').count(), 0);

    console.log(`${engine}: Shamir39 and raw SSS official-format UI, masking, reconstruction, negative case, warm isolation, and teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifySlip39(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-slip39-lab[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });

    const generate = coldFrame.locator('#cold-slip39-generate');
    const acknowledge = coldFrame.locator('#cold-slip39-compatibility-ack');
    const output = coldFrame.locator('#cold-slip39-output');
    const reveal = coldFrame.locator('#cold-slip39-reveal');
    const recoveryDetails = coldFrame.locator('#cold-slip39-lab details');
    const recoveryInput = coldFrame.locator('#cold-slip39-recovery-input');
    const recovery = coldFrame.locator('#cold-slip39-recover');

    assert.equal(await generate.isDisabled(), true, `${engine}: SLIP-39 generation must stay gated without a valid source phrase`);
    assert.equal(await reveal.isDisabled(), true, `${engine}: SLIP-39 reveal must stay disabled without generated shares`);

    await releaseFocusedSeed(coldFrame, 'SLIP-39 fixture');
    await acknowledge.check();
    assert.equal(await generate.isDisabled(), false, `${engine}: SLIP-39 generation should enable after source and compatibility acknowledgement`);

    await generate.click();
    await coldFrame.locator('#cold-slip39-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal((await output.inputValue()).trim(), 'Masked (3 shares)', `${engine}: SLIP-39 shares must be masked by default`);
    assert.equal(await reveal.isDisabled(), false, `${engine}: generated SLIP-39 shares must expose only an explicit reveal control`);

    await reveal.click();
    const shareText = await output.inputValue();
    const shares = shareText.trim().split(/\r?\n/);
    assert.equal(shares.length, 3, `${engine}: default SLIP-39 generation must produce three shares`);
    assert.equal(shares.every((share) => share.split(' ').length === 20), true, `${engine}: 128-bit phrase entropy must produce 20-word shares`);
    const warmText = await page.locator('body').textContent();
    assert.equal(warmText.includes(shareText), false, `${engine}: generated SLIP-39 shares must not appear in the warm shell`);
    await reveal.click();
    assert.equal((await output.inputValue()).trim(), 'Masked (3 shares)');

    await recoveryDetails.locator('summary').click();
    await recoveryInput.fill([shares[0], shares[2]].join('\n'));
    await recovery.click();
    await coldFrame.locator('#cold-slip39-recovery-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 10000 });
    const recoveryStatusText = await coldFrame.locator('#cold-slip39-recovery-status').textContent();
    assert.match(recoveryStatusText, /Recovered \d+-byte phrase entropy/i, `${engine}: SLIP-39 recovery must report the recovered entropy length`);
    assert.match(recoveryStatusText, /matches the selected Seed Forge phrase/i);
    assert.doesNotMatch(recoveryStatusText, /fingerprint/i, `${engine}: P2.1 recovery must not claim to display a fingerprint`);
    assert.equal(
      await coldFrame.locator('#cold-slip39-lab button').filter({ hasText: /print|complete/i }).count(),
      0,
      `${engine}: P2.1 must not expose a print or completion control`
    );
    assert.equal(await recoveryInput.inputValue(), '', `${engine}: typed SLIP-39 shares must be cleared after recovery`);

    const corruptShare = shares[0].split(' ');
    corruptShare[0] = 'not-a-word';
    await recoveryInput.fill(corruptShare.join(' '));
    await recovery.click();
    await coldFrame.locator('#cold-slip39-recovery-status[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-slip39-recovery-status').textContent(), /share 1/i);

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal((await output.inputValue()).trim(), '', `${engine}: lock must clear generated SLIP-39 output`);
    assert.equal(await recoveryInput.inputValue(), '', `${engine}: lock must clear typed SLIP-39 recovery input`);
    assert.equal(await reveal.isDisabled(), true, `${engine}: lock must disable the SLIP-39 reveal control`);

    console.log(`${engine}: SLIP-39 cold gating, masked reveal, 20-word output, local two-share recovery, indexed checksum failure, warm-shell isolation, and teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyBackupRecordVerification(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    const coldFrame = await getColdFrame(page, engine);
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await createPreparedVault(page, coldFrame, 'backup record browser phrase', 'Backup Records Browser');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('#nav-rail a[data-route="backup"]').click();
    await page.locator('#page-backup:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#backup-workspace:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });

    await releaseFocusedSeed(coldFrame, 'Backup record fixture');
    await coldFrame.locator('#cold-slip39-compatibility-ack').check();
    await coldFrame.locator('#cold-slip39-generate').click();
    await coldFrame.locator('#cold-slip39-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    await coldFrame.locator('#cold-slip39-reveal').click();
    const shares = (await coldFrame.locator('#cold-slip39-output').inputValue()).trim().split(/\r?\n/);
    assert.equal(shares.length, 3, `${engine}: BackupRecord verification fixture must have three SLIP-39 shares`);

    await page.locator('#backup-subject-id').fill('550e8400-e29b-41d4-a716-446655440001');
    await page.locator('#backup-share-label').fill('Browser SLIP-39 record');
    await page.locator('#backup-threshold').fill('2');
    await page.locator('#backup-verify-every').fill('365');
    await page.locator('#backup-location').fill('Browser fixture safe');
    await page.locator('#backup-form button[type="submit"]').click();
    await page.locator('#backup-status').filter({ hasText: /Public registry change written/ }).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#backup-list .registry-record').count(), 1, `${engine}: BackupRecord did not render`);
    assert.match(await page.locator('#backup-list').textContent(), /Not verified/);

    await openDashboard(page, engine);
    await page.locator('#page-dashboard:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('#dashboard-backup-health-workspace:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#dashboard-backup-health-metrics .backup-health-metric').count(), 5, `${engine}: Backup Health metrics did not render`);
    assert.match(await page.locator('#dashboard-backup-health-headline').textContent(), /incomplete/);
    assert.match(await page.locator('#dashboard-backup-health-alerts').textContent(), /never passed a cold reconstruction/);
    assert.match(await page.locator('#dashboard-backup-health-alerts').textContent(), /threshold proof/);

    await page.locator('#nav-rail a[data-route="backup"]').click();
    await page.locator('#page-backup:not([hidden])').waitFor({ state: 'visible' });

    await page.locator('#backup-list [data-registry-action="verify"]').click();
    await coldFrame.locator('#cold-backup-verification:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-backup-verification-input').fill([shares[0], shares[2]].join('\n'));
    await coldFrame.locator('#cold-backup-verification-run').click();
    await page.locator('#backup-status').filter({ hasText: /backup remains incomplete/ }).waitFor({ state: 'visible', timeout: 10000 });
    assert.match(await page.locator('#backup-list').textContent(), /Not verified/);
    assert.equal((await page.locator('html').evaluate((element) => element.outerHTML)).includes(shares[0]), false, `${engine}: BackupRecord verification shares must never enter the warm DOM`);
    assert.equal(await coldFrame.locator('#cold-backup-verification-input').inputValue(), '', `${engine}: BackupRecord verification input must clear after reconstruction`);

    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });
    await lockVaultDiscardingUnsaved(page);
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    await openDashboard(page, engine);
    await page.locator('#dashboard-backup-health-locked:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#dashboard-backup-health-workspace').getAttribute('hidden'), '');
    console.log(`${engine}: unresolved BackupRecord subject failed closed, share input stayed cold-only, and teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyVerificationWorkflows(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);
    await coldFrame.locator('#cold-verification[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });
    assert.equal(await page.evaluate(() => typeof window.__coldboxVerification), 'undefined');

    const mnemonic = [
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'
    ].join(' ');
    const nativeXpub =
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
    const receiveAddress = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';
    const mixedCaseAddress = receiveAddress.slice(0, 4)
      + receiveAddress[4].toUpperCase()
      + receiveAddress.slice(5);

    const openWorkflow = async (selector) => {
      const details = coldFrame.locator(selector);
      if (!(await details.evaluate((element) => element.open))) {
        await details.locator('summary').click();
      }
      await details.locator('summary').waitFor({ state: 'visible', timeout: 5000 });
      return details;
    };

    // Seed Forge is the only mnemonic/passphrase surface. Verify Bench links
    // the validated cold-local wallet and exposes public values only.
    const validationPassphrase = coldFrame.locator('#cold-seed-forge-validation-passphrase-input');
    const validationPassphraseConfirm = coldFrame.locator('#cold-seed-forge-validation-passphrase-confirm');
    await validationPassphrase.fill('');
    await validationPassphraseConfirm.fill('');
    await coldFrame.locator('#cold-seed-forge-mnemonic-input').fill(mnemonic);
    await coldFrame.locator('#cold-seed-forge-validate').click();
    await coldFrame.locator('#cold-seed-forge-validation-status[data-state="valid"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await coldFrame.locator('#cold-seed-forge-validation-fingerprint').textContent()).trim(), '73c5da0a');
    await coldFrame.locator('#cold-seed-forge-validation-release-label').fill('Verification Bench fixture');
    await coldFrame.locator('#cold-seed-forge-validation-release').click();
    await coldFrame.locator('#cold-secret-list [data-secret-id]').filter({ hasText: 'Verification Bench fixture' }).waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-verification-wallet-use').click();
    await coldFrame.locator('#cold-verification-wallet-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    assert.match((await coldFrame.locator('#cold-verification-wallet-source').textContent()).trim(), /Verification Bench fixture Seed Forge wallet/);
    assert.equal((await coldFrame.locator('#cold-verification-wallet-fingerprint').textContent()).trim(), '73c5da0a');
    assert.equal((await coldFrame.locator('#cold-verification-wallet-path').textContent()).trim(), "m/84'/0'/0'");
    assert.equal((await coldFrame.locator('#cold-verification-wallet-xpub').textContent()).trim(), nativeXpub);
    assert.match((await coldFrame.locator('#cold-verification-wallet-receive-range').textContent()), new RegExp(receiveAddress));
    assert.equal(await coldFrame.locator('#cold-verification-wallet-families li').count(), 4);
    assert.equal((await coldFrame.locator('#cold-verification-fingerprint-expected').inputValue()), '');

    await openWorkflow('#cold-verification-fingerprint');
    await coldFrame.locator('#cold-verification-fingerprint-expected').fill('73C5DA0A');
    await coldFrame.locator('#cold-verification-fingerprint-run').click();
    await coldFrame.locator('#cold-verification-fingerprint-status[data-state="match"]').waitFor({ state: 'visible', timeout: 5000 });

    await openWorkflow('#cold-verification-receive-address');
    assert.equal(await coldFrame.locator('#cold-verification-receive-expected').inputValue(), '');
    await coldFrame.locator('#cold-verification-receive-expected').fill(mixedCaseAddress);
    await coldFrame.locator('#cold-verification-receive-run').click();
    await coldFrame.locator('#cold-verification-receive-status[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.locator('#cold-verification-receive-expected').fill(receiveAddress.toUpperCase());
    await coldFrame.locator('#cold-verification-receive-run').click();
    await coldFrame.locator('#cold-verification-receive-status[data-state="match"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-verification-receive-status').textContent(), new RegExp(receiveAddress));

    await openWorkflow('#cold-verification-xpub');
    assert.equal(await coldFrame.locator('#cold-verification-xpub-expected').inputValue(), '');
    await coldFrame.locator('#cold-verification-xpub-expected').fill(nativeXpub);
    await coldFrame.locator('#cold-verification-xpub-run').click();
    await coldFrame.locator('#cold-verification-xpub-status[data-state="match"]').waitFor({ state: 'visible', timeout: 5000 });

    await openWorkflow('#cold-verification-backup');
    assert.equal(await coldFrame.locator('#cold-verification-backup-expected').inputValue(), '');
    await coldFrame.locator('#cold-verification-backup-expected').fill('73c5da0a');
    await coldFrame.locator('#cold-verification-backup-run').click();
    await coldFrame.locator('#cold-verification-backup-status[data-state="match"]').waitFor({ state: 'visible', timeout: 5000 });

    assert.equal(await coldFrame.locator('#cold-verification-passphrase').count(), 0);
    assert.equal(await coldFrame.locator('#cold-verification input[id*="mnemonic"]').count(), 0);
    assert.equal(await coldFrame.locator('#cold-verification input[id*="passphrase"]').count(), 0);

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-verification-fingerprint-status[data-state="idle"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-verification').getAttribute('data-linked-wallet'), 'empty');
    assert.equal(await coldFrame.locator('#cold-verification-wallet-status').getAttribute('data-state'), 'empty');
    assert.equal((await coldFrame.locator('#cold-verification-wallet-fingerprint').textContent()).trim(), 'Not linked');
    assert.equal(await coldFrame.locator('#cold-verification-fingerprint-run').isDisabled(), true);
    assert.equal(await coldFrame.locator('#cold-verification-receive-run').isDisabled(), true);
    assert.equal(await coldFrame.locator('#cold-verification-xpub-run').isDisabled(), true);
    assert.equal(await coldFrame.locator('#cold-verification-backup-run').isDisabled(), true);
    assert.equal(await coldFrame.locator('#cold-verification-receive-expected').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-verification-xpub-expected').inputValue(), '');
    assert.equal(await coldFrame.locator('#cold-verification-backup-expected').inputValue(), '');

    console.log(`${engine}: cold-local Seed Forge handoff, public fingerprint/xpub/address/backup comparisons, strict external-value negatives, and lock teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyQrStudio(browser, engine) {
  const { page } = await openPage(browser, buildPath);
  try {
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible', timeout: 10000 });
    const coldFrame = await getColdFrame(page, engine);

    await page.locator('#nav-rail a[data-route="qr"]').click();
    await page.locator('#page-qr:not([hidden])').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#qr-public-address').fill('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    await page.locator('#qr-public-generate').click();
    assert.match(await page.locator('#qr-public-status').textContent(), /malformed input is rejected/i);
    assert.equal(await page.locator('#qr-public-download-svg').isDisabled(), true);
    assert.equal(await page.locator('#qr-public-output').getAttribute('data-payload'), null);

    const evmAddress = '0x000000000000000000000000000000000000dEaD';
    await page.locator('#qr-public-network').selectOption('ethereum');
    await page.locator('#qr-public-address').fill(evmAddress);
    await page.locator('#qr-public-amount').fill('1.234567890123456789');
    await page.locator('#qr-public-label').fill('');
    await page.locator('#qr-public-generate').click();
    await page.locator('#qr-public-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(
      await page.locator('#qr-public-output').getAttribute('data-payload'),
      `ethereum:${evmAddress}?value=1234567890123456789`
    );
    assert.equal(await page.locator('#qr-public-output svg').count(), 1);

    await page.locator('#qr-public-label').fill('unsupported');
    await page.locator('#qr-public-generate').click();
    await page.locator('#qr-public-status[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await page.locator('#qr-public-status').textContent(), /do not support the Bitcoin label/i);
    assert.equal(await page.locator('#qr-public-output').getAttribute('data-payload'), null);

    await page.locator('#qr-public-label').fill('');
    await page.locator('#qr-public-amount').fill('0.0000000000000000001');
    await page.locator('#qr-public-generate').click();
    assert.match(await page.locator('#qr-public-status').textContent(), /too many decimal places/i);

    await page.locator('#qr-public-network').selectOption('bitcoin');
    await page.locator('#qr-public-address').fill('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    await page.locator('#qr-public-amount').fill('0.001');
    await page.locator('#qr-public-label').fill('cold storage');
    await page.locator('#qr-public-generate').click();
    await page.locator('#qr-public-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(
      await page.locator('#qr-public-output').getAttribute('data-payload'),
      'bitcoin:bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu?amount=0.001&label=cold%20storage'
    );
    const publicSvgDownload = page.waitForEvent('download');
    await page.locator('#qr-public-download-svg').click();
    assert.equal((await publicSvgDownload).suggestedFilename(), 'coldbox-address.svg');
    const publicPngDownload = page.waitForEvent('download');
    await page.locator('#qr-public-download-png').click();
    assert.equal((await publicPngDownload).suggestedFilename(), 'coldbox-address.png');

    assert.equal(await page.locator('#cold-frame').getAttribute('sandbox'), 'allow-scripts allow-downloads allow-modals');
    await coldFrame.locator('#cold-seed-forge[data-state="ready"]').waitFor({ state: 'attached', timeout: 10000 });
    const englishMnemonic = UI4_OFFICIAL_MNEMONIC;
    await releaseFocusedSeed(coldFrame, 'QR English fixture', englishMnemonic);
    assert.equal(await coldFrame.locator('#cold-qr-standard').isDisabled(), true);
    await coldFrame.locator('#cold-qr-secret-confirm').check();
    await coldFrame.locator('#cold-qr-standard').click();
    await coldFrame.locator('#cold-qr-output-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-qr-output-status').textContent(), /SeedQR generated.*25.*25/i);
    assert.equal(await coldFrame.locator('#cold-qr-card').getAttribute('data-grid'), 'off');

    const secretSvgDownload = page.waitForEvent('download');
    await coldFrame.locator('#cold-qr-download-svg').click();
    assert.equal((await secretSvgDownload).suggestedFilename(), 'coldbox-seedqr.svg');
    const secretPngDownload = page.waitForEvent('download');
    await coldFrame.locator('#cold-qr-download-png').click();
    assert.equal((await secretPngDownload).suggestedFilename(), 'coldbox-seedqr.png');

    await coldFrame.evaluate(() => {
      window.__coldboxQrPrintCalls = 0;
      window.print = function () {
        window.__coldboxQrPrintCalls += 1;
      };
    });
    await coldFrame.locator('#cold-qr-print').click();
    assert.equal(await coldFrame.evaluate(() => window.__coldboxQrPrintCalls), 1, `${engine}: cold print button did not request printing`);

    await coldFrame.locator('#cold-seed-forge-language').selectOption('spanish');
    const spanishMnemonic = await coldFrame.evaluate(() => {
      return window.__coldboxSeedForge.entropyToMnemonic(new Uint8Array(16), 'spanish');
    });
    await releaseFocusedSeed(coldFrame, 'QR Spanish fixture', spanishMnemonic, 'spanish');
    await coldFrame.locator('#cold-qr-language').selectOption('spanish');
    await coldFrame.locator('#cold-qr-secret-confirm').check();
    await coldFrame.locator('#cold-qr-standard').click();
    await coldFrame.locator('#cold-qr-output-status[data-state="error"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-qr-output-status').textContent(), /English BIP-39 wordlist/i);
    await coldFrame.locator('#cold-qr-compact').click();
    await coldFrame.locator('#cold-qr-output-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-qr-output-status').textContent(), /Compact SeedQR generated.*21.*21/i);

    await coldFrame.locator('#cold-seed-forge-language').selectOption('english');
    const englishTwentyFour = await coldFrame.evaluate(() => {
      return window.__coldboxSeedForge.entropyToMnemonic(new Uint8Array(32), 'english');
    });
    await releaseFocusedSeed(coldFrame, 'QR 24-word fixture', englishTwentyFour);
    await coldFrame.locator('#cold-qr-language').selectOption('english');
    await coldFrame.locator('#cold-qr-layout').selectOption('wallet-24');
    await coldFrame.locator('#cold-qr-grid').check();
    await coldFrame.locator('#cold-qr-compact').click();
    await coldFrame.locator('#cold-qr-output-status[data-state="ready"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await coldFrame.locator('#cold-qr-output-status').textContent(), /Compact SeedQR generated.*25.*25/i);
    assert.equal(await coldFrame.locator('#cold-qr-card').getAttribute('data-layout'), 'wallet-24');
    assert.equal(await coldFrame.locator('#cold-qr-card').getAttribute('data-grid'), 'on');
    assert.equal(await coldFrame.locator('#cold-qr-card-grid .cold-qr-card-cell').count(), 24);

    await page.emulateMedia({ media: 'print' });
    const printCardMetrics = await coldFrame.locator('#cold-qr-card').evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return { width: styles.width, maxWidth: styles.maxWidth };
    });
    assert.notEqual(printCardMetrics.maxWidth, 'none', `${engine}: wallet print max-width was destroyed`);
    assert.ok(Number.parseFloat(printCardMetrics.width) <= 330, `${engine}: wallet print card widened unexpectedly`);
    await page.emulateMedia({ media: null });

    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('body').press('Escape');
    await coldFrame.locator('html[data-cold-session-state="locked"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-qr-card').isHidden(), true);
    assert.equal((await coldFrame.locator('#cold-qr-output').textContent()).trim(), '');
    assert.equal(await coldFrame.locator('#cold-qr-standard').isDisabled(), true);
    assert.equal(await coldFrame.locator('#cold-qr-download-svg').isDisabled(), true);

    console.log(`${engine}: QR Studio public payloads, ETH wei conversion, SeedQR gating, compact sizing, exports, print request/layout, and teardown passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyVaultRecoveryShares(browser, engine) {
  const { page, reachability } = await openPage(browser, buildPath, 'reachable', {
    initScript: RECOVERY_CONFIGURATION_GATE_SCRIPT
  });
  try {
    const coldFrame = await getColdFrame(page, engine);
    await page.locator('#nav-rail a[data-route="vault"]').click();
    await page.locator('#page-vault:not([hidden])').waitFor({ state: 'visible' });

    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });

    const normalPassphrase = 'P2.5 browser recovery phrase';
    await createPreparedVault(page, coldFrame, normalPassphrase, 'P2.5 Browser Recovery');
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 15000 });
    await coldFrame.locator('#cold-vault-recovery-passphrase').fill(normalPassphrase);
    await coldFrame.locator('#cold-vault-recovery-configure').click();
    await coldFrame.locator('#cold-vault-status').filter({ hasText: /Recovery shares generated/ }).waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-generated').isHidden(), false, `${engine}: generated recovery output must be visible in the cold realm`);
    assert.match(await coldFrame.locator('#cold-vault-recovery-output').inputValue(), /Masked recovery shares/);
    assert.equal(await coldFrame.locator('#cold-vault-recovery-reveal').isDisabled(), false);
    await coldFrame.locator('#cold-vault-recovery-reveal').click();
    const firstShares = (await coldFrame.locator('#cold-vault-recovery-output').inputValue())
      .split(/\r?\n/).map((share) => share.trim()).filter(Boolean);
    assert.equal(firstShares.length, 3, `${engine}: browser generation must produce the configured 2-of-3 set`);
    assert.ok(firstShares.every((share) => share.split(/\s+/).length >= 20), `${engine}: generated output must contain complete SLIP-39 mnemonics`);
    await coldFrame.locator('#cold-vault-recovery-reveal').click();
    assert.match(await coldFrame.locator('#cold-vault-recovery-output').inputValue(), /Masked recovery shares/);

    await coldFrame.locator('#cold-vault-recovery-passphrase').fill(normalPassphrase);
    await coldFrame.locator('#cold-vault-recovery-configure').click();
    await coldFrame.locator('#cold-vault-status').filter({ hasText: /Check the replacement box/ }).waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-replace-label').isHidden(), false, `${engine}: replacement must be an explicit UI choice`);
    await coldFrame.locator('#cold-vault-recovery-replace').check();
    await coldFrame.locator('#cold-vault-recovery-passphrase').fill(normalPassphrase);
    await coldFrame.locator('#cold-vault-recovery-configure').click();
    await coldFrame.locator('#cold-vault-status').filter({ hasText: /Recovery shares generated/ }).waitFor({ state: 'visible', timeout: 15000 });
    await coldFrame.locator('#cold-vault-recovery-reveal').click();
    const replacementShares = (await coldFrame.locator('#cold-vault-recovery-output').inputValue())
      .split(/\r?\n/).map((share) => share.trim()).filter(Boolean);
    assert.equal(replacementShares.length, 3, `${engine}: replacement must produce the configured 2-of-3 set`);
    assert.notDeepEqual(replacementShares, firstShares, `${engine}: explicit replacement must produce a new share set`);
    assert.equal(await page.evaluate(() => typeof window.__coldboxVault), 'undefined');
    const warmHtml = await page.locator('html').evaluate((element) => element.outerHTML);
    assert.equal(warmHtml.includes(firstShares[0]), false, `${engine}: generated share words must not enter the warm DOM`);
    assert.equal(warmHtml.includes(replacementShares[0]), false, `${engine}: replacement share words must not enter the warm DOM`);
    await coldFrame.locator('#cold-vault-recovery-reveal').click();

    await page.locator('#app[data-vault-persistence="unsaved"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await page.locator('#vault-save-download').isDisabled(), false, `${engine}: recovery configuration must enable the durable save action`);
    const downloadPromise = page.waitForEvent('download');
    // The harness page may not own browser focus after the cold-frame work;
    // use the same DOM event a focused user click dispatches without making
    // the test's save action itself trigger the focus-based reachability
    // recheck and intentionally lock the offline session.
    await page.locator('#vault-save-download').evaluate((button) => button.click());
    const download = await downloadPromise;
    await page.locator('#vault-status-label').filter({ hasText: /Saved.*unverified/ }).waitFor({ state: 'visible', timeout: 5000 });
    const downloadedVaultPath = await download.path();
    assert.ok(downloadedVaultPath, `${engine}: recovery flow needs the saved vault bytes for reload`);
    const canonicalFilename = download.suggestedFilename();
    const savedBytes = fs.readFileSync(downloadedVaultPath);

    reachability.setMode('reachable');
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="reachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').inputValue(), '', `${engine}: mode transition must clear entered recovery shares`);
    assert.equal(await coldFrame.locator('#cold-vault-recovery-generated').isHidden(), true, `${engine}: mode transition must clear generated recovery output`);

    await page.locator('#vault-file-input').setInputFiles({
      name: canonicalFilename,
      mimeType: 'application/octet-stream',
      buffer: savedBytes
    });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#vault-library-list [data-vault-library-index="0"]').click();
    await page.locator('#vault-status[data-state="pending"]').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').isDisabled(), true, `${engine}: recovery must be disabled while the warm shell is online`);

    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').isDisabled(), false, `${engine}: recovery must enable only after offline classification`);
    await coldFrame.locator('#cold-vault-recovery-input').fill(firstShares[0]);

    reachability.setMode('reachable');
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="reachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').inputValue(), '', `${engine}: online transition must clear entered recovery shares while a vault is pending`);
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').isDisabled(), true, `${engine}: pending recovery must disable online`);

    reachability.setMode('unreachable');
    await triggerReachabilityRound(page);
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="unreachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="false"]').waitFor({ state: 'attached', timeout: 5000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').isDisabled(), false, `${engine}: recovery must enable only after offline classification`);

    await coldFrame.locator('#cold-vault-recovery-input').fill(firstShares.slice(0, 2).join('\n'));
    await coldFrame.locator('#cold-vault-recovery-unlock').click();
    await coldFrame.locator('#cold-vault-status').filter({ hasText: /Recovery-share unlock failed/ }).waitFor({ state: 'visible', timeout: 10000 });
    await coldFrame.locator('#cold-vault-recovery-input').fill(replacementShares.slice(0, 2).join('\n'));
    await coldFrame.locator('#cold-vault-recovery-unlock').click();
    await coldFrame.locator('#cold-vault-status[data-state="unlocked"]').waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await coldFrame.locator('#cold-vault-recovery-input').inputValue(), '', `${engine}: recovery input must clear after unlock`);
    assert.equal(await coldFrame.locator('#cold-vault-recovery-generated').isHidden(), true, `${engine}: generated output must not survive recovery unlock`);

    await coldFrame.locator('#cold-vault-recovery-replace').check();
    await coldFrame.evaluate(() => window.__coldboxRecoveryConfigurationGate.arm());
    await coldFrame.locator('#cold-vault-recovery-passphrase').fill(normalPassphrase);
    await coldFrame.locator('#cold-vault-recovery-configure').click();
    await coldFrame.waitForFunction(() => window.__coldboxRecoveryConfigurationGate.held(), null, { timeout: 15000 });
    reachability.setMode('reachable');
    await triggerReachabilityRound(page);
    await page.locator('html[data-reachability-state="reachable"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('html[data-warm-network-online="true"]').waitFor({ state: 'attached', timeout: 5000 });
    await coldFrame.locator('#cold-vault-status[data-state="locked"]').waitFor({ state: 'visible', timeout: 5000 });
    await coldFrame.evaluate(() => window.__coldboxRecoveryConfigurationGate.release());
    await page.waitForTimeout(250);
    assert.equal(await coldFrame.locator('#cold-vault-status[data-state="locked"]').isVisible(), true, `${engine}: stale recovery completion must not repaint the vault as unlocked`);
    assert.equal(await coldFrame.locator('#cold-vault-recovery-generated').isHidden(), true, `${engine}: stale recovery completion must not restore generated shares`);
    assert.equal(await coldFrame.locator('#cold-vault-recovery-output').inputValue(), '', `${engine}: stale recovery completion must not restore share text`);
    console.log(`${engine}: P2.5 recovery generation, stale-completion lockout, explicit replacement, saved-vault reload, online refusal, stale-share rejection, and threshold recovery passed`);
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
      await verifyBuiltFile(browser, engine);
      await verifyUi2BrandAssets(browser, engine);
      await verifyVaultRecoveryShares(browser, engine);
      await verifyStaleReachabilityOnlineSafety(browser, engine);
      await verifyVaultLibrary(browser, engine);
      await verifyNotesAndConcealment(browser, engine);
      await verifyColdSecretNotes(browser, engine);
      await verifyRegistryCrud(browser, engine);
      await verifyStaleAddressDisplay(browser, engine);
      await verifyAddressVerification(browser, engine);
      await verifyClipboardCanary(browser, engine);
      await verifyDeviceRegistry(browser, engine);
      await verifyEntropyLab(browser, engine);
      await verifySeedForge(browser, engine);
      await verifyReleasedSecretSwitcher(browser, engine);
      await verifySeedXor(browser, engine);
      await verifyCodex32(browser, engine);
      await verifyShamirBackups(browser, engine);
      await verifySlip39(browser, engine);
      await verifyBackupRecordVerification(browser, engine);
      await verifyVerificationWorkflows(browser, engine);
      await verifyQrStudio(browser, engine);
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
