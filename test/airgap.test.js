'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'airgap.js'), 'utf8');

function createDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    }
  };
}

function loadAirgap({ windowObject, fetch } = {}) {
  const document = createDocument();
  const window = windowObject || {};
  window.document = document;
  window.setTimeout = setTimeout;
  window.clearTimeout = clearTimeout;
  if (fetch) {
    window.fetch = fetch;
  } else if (typeof window.fetch !== 'function') {
    window.fetch = () => Promise.reject(new Error('network unavailable'));
  }
  if (!window.navigator) {
    window.navigator = { onLine: true };
  }
  vm.runInNewContext(source, { window }, { filename: 'src/airgap.js' });
  return { api: window.__coldboxAirgap, document, window };
}

function createNetworkGlobal() {
  const windowPrototype = {};
  const navigatorPrototype = {};
  const window = Object.create(windowPrototype);
  const navigator = Object.create(navigatorPrototype);
  const native = function nativeNetworkPrimitive() {
    return 'native';
  };

  Object.defineProperty(windowPrototype, 'fetch', {
    configurable: true,
    enumerable: true,
    value: native,
    writable: true
  });
  Object.defineProperty(navigatorPrototype, 'sendBeacon', {
    configurable: true,
    enumerable: true,
    value: native,
    writable: true
  });
  for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: true,
      value: native,
      writable: true
    });
  }
  Object.defineProperty(window, 'navigator', {
    configurable: true,
    enumerable: true,
    value: navigator,
    writable: true
  });
  return { window, windowPrototype, navigator, navigatorPrototype };
}

test('canary accepts only the exact URL and connect-src directive', () => {
  const { api } = loadAirgap();
  const expected = api.warmCanaryUrl;

  assert.equal(api.isCanaryViolation({
    effectiveDirective: 'connect-src',
    blockedURI: expected
  }), true);
  assert.equal(api.isCanaryViolation({
    violatedDirective: 'connect-src',
    blockedURI: expected
  }), true);

  for (const event of [
    { effectiveDirective: 'connect-src', blockedURI: `${expected}/` },
    { effectiveDirective: 'connect-src', blockedURI: `${expected}?near-miss=1` },
    { effectiveDirective: 'connect-src', blockedURI: expected.toUpperCase() },
    { effectiveDirective: 'default-src', blockedURI: expected },
    { effectiveDirective: 'connect-src ', blockedURI: expected },
    { effectiveDirective: 'connect-src', blockedURI: 'https://coldbox.invalid/other' }
  ]) {
    assert.equal(api.isCanaryViolation(event), false, JSON.stringify(event));
  }
  assert.equal(api.isCanaryViolation({
    effectiveDirective: 'connect-src',
    blockedURI: api.coldCanaryUrl
  }), false);
  assert.equal(api.isCanaryViolation({
    effectiveDirective: 'connect-src',
    blockedURI: api.coldCanaryUrl
  }, api.coldCanaryUrl), true);
});

test('runCanary ignores near-miss violations and passes on the exact event', async () => {
  const first = loadAirgap();
  const firstRun = first.api.runCanary();
  first.document.listeners.get('securitypolicyviolation')({
    effectiveDirective: 'connect-src',
    blockedURI: `${first.api.warmCanaryUrl}?near-miss=1`
  });
  const firstResult = await firstRun;
  assert.equal(firstResult.passed, false);
  assert.equal(firstResult.reason, 'rejected-without-csp');

  const second = loadAirgap();
  const secondRun = second.api.runCanary();
  second.document.listeners.get('securitypolicyviolation')({
    effectiveDirective: 'connect-src',
    blockedURI: second.api.warmCanaryUrl
  });
  const secondResult = await secondRun;
  assert.equal(secondResult.passed, true);
  assert.equal(secondResult.reason, 'csp-violation');
});

test('neuterNetwork blocks all five primitives, their prototype owners, and reports attempts', () => {
  const network = createNetworkGlobal();
  const { api } = loadAirgap({ windowObject: network.window });
  const attempts = [];
  const result = api.neuterNetwork((name) => attempts.push(name));

  assert.equal(result.installed, true);
  assert.equal(result.failed.length, 0);
  assert.throws(() => network.window.fetch('https://example.invalid'), /airgap blocked fetch/);
  assert.throws(() => network.windowPrototype.fetch.call(network.window, 'https://example.invalid'), /airgap blocked fetch/);
  assert.throws(() => network.window.XMLHttpRequest(), /airgap blocked XMLHttpRequest/);
  assert.throws(() => network.window.WebSocket(), /airgap blocked WebSocket/);
  assert.throws(() => network.window.EventSource(), /airgap blocked EventSource/);
  assert.throws(() => network.navigator.sendBeacon('https://example.invalid', 'x'), /airgap blocked sendBeacon/);
  assert.throws(() => network.navigatorPrototype.sendBeacon.call(network.navigator, 'https://example.invalid', 'x'), /airgap blocked sendBeacon/);
  for (const name of result.primitives) {
    assert.equal(attempts.includes(name), true, `${name} did not install a reporting blocker`);
  }

  for (const [target, key] of [
    [network.window, 'fetch'],
    [network.windowPrototype, 'fetch'],
    [network.window, 'XMLHttpRequest'],
    [network.window, 'WebSocket'],
    [network.window, 'EventSource'],
    [network.navigator, 'sendBeacon'],
    [network.navigatorPrototype, 'sendBeacon']
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    assert.equal(descriptor.configurable, false, `${key} remained configurable`);
    assert.equal(descriptor.writable, false, `${key} remained writable`);
  }
});

test('neuterNetwork reports an installation failure when a primitive cannot be replaced', () => {
  const network = createNetworkGlobal();
  Object.defineProperty(network.window, 'EventSource', {
    configurable: false,
    value: function nativeEventSource() {},
    writable: false
  });
  const { api } = loadAirgap({ windowObject: network.window });
  const result = api.neuterNetwork();

  assert.equal(result.installed, false);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0], 'EventSource');
});
