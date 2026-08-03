'use strict';

const assert = require('node:assert/strict');
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

function ensureBrowserBinaries() {
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

  console.log(`Installing missing Playwright browsers: ${missing.join(', ')}`);
  const cli = path.join(projectRoot, 'node_modules', 'playwright', 'cli.js');
  const result = spawnSync(process.execPath, [cli, 'install', ...missing], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(
      `Playwright browser installation failed with exit code ${result.status}`
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

async function openPage(browser, file) {
  const page = await browser.newPage();
  const harness = await createHarness(page);
  await page.goto(fileUrl(file), { waitUntil: 'load' });
  return { harness, page };
}

async function closePage(page) {
  await page.close();
}

async function verifyBuiltFile(browser, engine) {
  const { harness, page } = await openPage(browser, buildPath);
  try {
    await harness.expectElementVisible('#app');
    await harness.expectNoConsoleErrors();
    await harness.expectNoCspViolations();
    await harness.atViewport(360, 640);
    await harness.expectElementVisible('#app');
    console.log(`${engine}: loaded build/coldbox.html over file://`);
  } finally {
    await closePage(page);
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
    await harness.expectNetworkPrimitiveThrows('fetch', frame);
    await harness.expectNetworkPrimitiveThrows('XMLHttpRequest', frame);
    await harness.expectNetworkPrimitiveThrows('WebSocket', frame);
    console.log(`${engine}: reusable frame and viewport assertions passed`);
  } finally {
    await closePage(page);
  }
}

async function verifyDevOnlyDependency() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  assert.equal(packageJson.dependencies?.playwright, undefined);
  assert.equal(typeof packageJson.devDependencies?.playwright, 'string');
  const built = fs.readFileSync(buildPath, 'utf8');
  assert.doesNotMatch(built, /playwright/i);
  console.log('Playwright is dev-only and contributes 0 bytes to build/coldbox.html');
}

async function run() {
  runBuild();
  ensureBrowserBinaries();
  await verifyDevOnlyDependency();

  for (const [engine, browserType] of [['Chromium', chromium], ['Firefox', firefox]]) {
    const browser = await browserType.launch({ headless: true });
    try {
      await verifyBuiltFile(browser, engine);
      await verifyCspFixture(browser, engine);
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
