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

async function openPage(browser, file) {
  const page = await browser.newPage();
  const harness = await createHarness(page);
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page };
}

async function closePage(page) {
  await page.close();
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

async function verifyBuiltFile(browser, engine) {
  const { harness, page } = await openPage(browser, buildPath);
  try {
    await harness.expectElementVisible('#app');
    await harness.expectElementVisible('#app[data-build-state="warm-shell"]');
    await page.locator('#cold-realm-status[data-cold-state="ready"]').waitFor({ state: 'visible' });
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
    await harness.expectParentCannotReadFrame();
    await harness.expectNoConsoleErrors();
    for (const primitive of ['fetch', 'XMLHttpRequest', 'WebSocket']) {
      const result = await harness.expectNetworkPrimitiveBlocked(
        primitive,
        coldFrame,
        { requireCspViolation: true }
      );
      console.log(`${engine}: cold realm ${primitive} reported blocked (${result.signal})`);
    }
    await harness.expectCspViolationInFrame(coldFrame, 'connect-src');
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

    await harness.expectNoCspViolations();
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
    await harness.expectNoConsoleErrors();
    await harness.expectNoCspViolations();
    console.log(`${engine}: cold realm creation failure produced an explicit lockdown state`);
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
    await harness.expectNoConsoleErrors();
    await harness.expectNoCspViolations();
    console.log(`${engine}: cold realm readiness timeout removed the frame and locked down`);
  } finally {
    await page.close();
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
      const result = await harness.expectNetworkPrimitiveBlocked(primitive, frame);
      console.log(`${engine}: ${primitive} reported blocked (${result.signal})`);
    }
    await harness.expectCspViolationInFrame(frame, 'connect-src');
    console.log(`${engine}: reusable frame and viewport assertions passed`);
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
      await verifyColdRealmFailure(browser, engine);
      await verifyColdRealmTimeout(browser, engine);
      await verifyTamperedBuiltFile(browser, engine);
      await verifyCspFixture(browser, engine);
      await verifyUntamperedFixture(browser, engine);
      await verifyTamperFixture(browser, engine);
      await verifyReusableAssertions(browser, engine);
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
