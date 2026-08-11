const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function loadConcealment() {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'concealment.js'), 'utf8');
  const attributes = new Map();
  const classes = new Set();
  const root = {
    setAttribute(name, value) { attributes.set(name, value); },
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
    }
  };
  const nodes = [];
  const document = {
    documentElement: root,
    querySelectorAll(selector) {
      if (selector === '[data-secret-visible="true"]') {
        return nodes.filter((node) => node.attributes.get('data-secret-visible') === 'true');
      }
      if (selector === '[data-sensitive="true"]') {
        return nodes;
      }
      return [];
    }
  };
  const storageValues = new Map();
  const storage = {
    getItem(key) { return storageValues.get(key) || null; },
    setItem(key, value) { storageValues.set(key, value); }
  };
  const timers = [];
  const context = vm.createContext({
    window: {
      document,
      localStorage: storage,
      setTimeout(callback) { timers.push(callback); return timers.length - 1; },
      clearTimeout() {}
    }
  });
  vm.runInContext(source, context, { filename: 'src/concealment.js' });
  return { api: context.window.__coldboxConcealment, root, document, classes, storage, nodes, timers };
}

function nodeStub() {
  const attributes = new Map();
  const classes = new Set();
  return {
    attributes,
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); }
    }
  };
}

test('privacy blur persists, reveal is timed, and panic hide clears sensitive state', () => {
  const loaded = loadConcealment();
  const controller = loaded.api.createController({
    root: loaded.root,
    document: loaded.document,
    storage: loaded.storage
  });
  assert.equal(controller.isPrivacyBlurred(), false);
  assert.equal(controller.togglePrivacyBlur(), true);
  assert.equal(loaded.classes.has('privacy-blur'), true);
  assert.equal(loaded.storage.getItem('coldbox-privacy-blur'), 'on');
  const sensitive = nodeStub();
  loaded.nodes.push(sensitive);
  controller.reveal(sensitive, 1000);
  assert.equal(sensitive.attributes.get('data-secret-visible'), 'true');
  controller.panicHide();
  assert.equal(sensitive.attributes.has('data-secret-visible'), false);
  assert.equal(sensitive.attributes.get('data-concealed'), 'true');
});
