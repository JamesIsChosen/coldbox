const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function loadCanary() {
  const window = { setTimeout, clearTimeout };
  const context = vm.createContext({ window, Promise, setTimeout, clearTimeout });
  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, 'src', 'clipboard-canary.js'), 'utf8'),
    context,
    { filename: 'src/clipboard-canary.js' }
  );
  return context.window.__coldboxClipboardCanary;
}

test('canary is off by default and only reads after explicit enable', async () => {
  const canary = loadCanary();
  let reads = 0;
  const navigatorObject = { clipboard: { readText: async () => { reads += 1; return 'same'; } } };
  const states = [];
  const controller = canary.create({ navigator: navigatorObject, delayMs: 1000, onState: (state) => states.push(state) });
  assert.equal(controller.state(), 'off');
  assert.equal(reads, 0);
  const result = await controller.enable();
  assert.equal(result.state, 'armed');
  assert.equal(reads, 1);
  assert.deepEqual(states.slice(0, 2), ['checking', 'armed']);
  controller.disable();
});

test('permission denied and absent APIs are visibly unavailable, with retry support', async () => {
  const canary = loadCanary();
  const deniedNavigator = {
    permissions: { query: async () => ({ state: 'denied' }) },
    clipboard: { readText: async () => 'never' }
  };
  const denied = canary.create({ navigator: deniedNavigator });
  const deniedResult = await denied.enable();
  assert.equal(deniedResult.state, 'unavailable');
  assert.equal(denied.state(), 'unavailable');
  const absent = canary.create({ navigator: {} });
  const absentResult = await absent.enable();
  assert.equal(absentResult.state, 'unavailable');
  assert.equal(absent.state(), 'unavailable');
});

test('canary treats an unattended clipboard change as affirmative detection', async () => {
  const canary = loadCanary();
  let timerCallback = null;
  let readCount = 0;
  let changed = null;
  const navigatorObject = { clipboard: { readText: async () => { readCount += 1; return readCount === 1 ? 'baseline' : 'rewritten'; } } };
  const controller = canary.create({
    navigator: navigatorObject,
    setTimeout: (callback) => { timerCallback = callback; return 1; },
    clearTimeout: () => {},
    onChanged: (event) => { changed = event; }
  });
  await controller.enable();
  assert.equal(controller.state(), 'armed');
  timerCallback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.state(), 'changed');
  assert.equal(changed.baseline, 'baseline');
  assert.equal(changed.current, 'rewritten');
});

test('unchanged clipboard becomes stable without claiming a hijacker', async () => {
  const canary = loadCanary();
  let timerCallback = null;
  const controller = canary.create({
    navigator: { clipboard: { readText: async () => 'stable' } },
    setTimeout: (callback) => { timerCallback = callback; return 1; },
    clearTimeout: () => {}
  });
  await controller.enable();
  timerCallback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.state(), 'stable');
});
