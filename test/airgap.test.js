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

function createProviderGlobal() {
  const windowPrototype = {};
  // Mirrors createNetworkGlobal above: a pre-existing property on the
  // prototype chain (the shape an extension-injected accessor takes) forces
  // findPropertyOwner to resolve the prototype as the owner, so the "both the
  // exposed object and its owning prototype" installation is actually
  // exercised rather than trivially satisfied by target === owner.
  Object.defineProperty(windowPrototype, 'ethereum', {
    configurable: true,
    enumerable: true,
    value: undefined,
    writable: true
  });
  const window = Object.create(windowPrototype);
  const listeners = [];
  window.addEventListener = function addEventListener(type, listener, useCapture) {
    listeners.push({ type, listener, useCapture });
  };
  window.dispatchEvent = function dispatchEvent(event) {
    let stopped = false;
    const wrapped = Object.assign({}, event, {
      stopImmediatePropagation() {
        stopped = true;
      }
    });
    for (const entry of listeners) {
      if (entry.type === event.type) {
        entry.listener(wrapped);
        if (stopped) {
          break;
        }
      }
    }
    return !stopped;
  };
  return { window, windowPrototype, listeners };
}

test('neuterProviders blocks window.ethereum on the target and its prototype owner, and reports assignment attempts', () => {
  const network = createProviderGlobal();
  const { api } = loadAirgap({ windowObject: network.window });
  const attempts = [];
  const result = api.neuterProviders((name) => attempts.push(name));

  assert.equal(result.installed, true);
  assert.equal(result.failed.length, 0);
  assert.equal(result.primitives.length, 2);
  assert.equal(result.primitives[0], 'window.ethereum');
  assert.equal(result.primitives[1], 'eip6963:announceProvider');

  // Assignment (the shape an injected extension uses) does not throw and does
  // not install a provider - it is silently denied, and the attempt is
  // reported so the caller can enter lockdown.
  network.window.ethereum = { isMetaMask: true };
  assert.equal(network.window.ethereum, undefined);
  assert.equal(attempts.includes('window.ethereum'), true);

  for (const [target, key] of [
    [network.window, 'ethereum'],
    [network.windowPrototype, 'ethereum']
  ]) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    assert.equal(descriptor.configurable, false, `${key} remained configurable`);
    assert.equal(typeof descriptor.set, 'function', `${key} lost its blocking setter`);
  }
});

test('neuterProviders survives an attempt to redefine or delete window.ethereum', () => {
  const network = createProviderGlobal();
  const { api } = loadAirgap({ windowObject: network.window });
  const attempts = [];
  api.neuterProviders((name) => attempts.push(name));

  assert.throws(() => {
    'use strict';
    delete network.window.ethereum;
  });
  assert.throws(() => {
    Object.defineProperty(network.window, 'ethereum', {
      configurable: true,
      value: { isMetaMask: true }
    });
  });
  assert.equal(network.window.ethereum, undefined);
});

test('neuterProviders detects an eip6963:announceProvider dispatch and reports it', () => {
  const network = createProviderGlobal();
  const { api } = loadAirgap({ windowObject: network.window });
  const attempts = [];
  api.neuterProviders((name) => attempts.push(name));

  const propagated = network.window.dispatchEvent({ type: 'eip6963:announceProvider', detail: {} });

  assert.equal(attempts.includes('eip6963:announceProvider'), true);
  assert.equal(propagated, false, 'the announcement should have its propagation stopped');
});

test('neuterProviders does not report unrelated events', () => {
  const network = createProviderGlobal();
  const { api } = loadAirgap({ windowObject: network.window });
  const attempts = [];
  api.neuterProviders((name) => attempts.push(name));

  network.window.dispatchEvent({ type: 'some-other-event' });

  assert.equal(attempts.length, 0);
});

test('neuterProviders reports an installation failure when window.ethereum cannot be replaced', () => {
  const network = createProviderGlobal();
  Object.defineProperty(network.window, 'ethereum', {
    configurable: false,
    value: { isNativeProvider: true },
    writable: false
  });
  const { api } = loadAirgap({ windowObject: network.window });
  const result = api.neuterProviders();

  assert.equal(result.installed, false);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0], 'window.ethereum');
});

test('neuterProviders treats a provider already present at install time as an isolation violation (F1 regression)', () => {
  // P0.21 review, F1: an extension that injected before Coldbox's own
  // script runs leaves window.ethereum already populated by the time
  // neuterProviders() installs. That must be reported as an isolation
  // violation - not silently overwritten while installation reports plain
  // success - and detection must never call into the provider object
  // itself (no invoking provider-controlled methods).
  const network = createProviderGlobal();
  let requestCalls = 0;
  const preexistingProvider = {
    isMetaMask: true,
    request: function () {
      requestCalls += 1;
      return Promise.resolve();
    }
  };
  Object.defineProperty(network.window, 'ethereum', {
    configurable: true,
    enumerable: true,
    value: preexistingProvider,
    writable: true
  });
  const { api } = loadAirgap({ windowObject: network.window });
  const attempts = [];
  const result = api.neuterProviders((name) => attempts.push(name));

  // Reported as a violation at install time, before any assignment.
  assert.equal(attempts.includes('window.ethereum'), true, 'a preexisting provider was not reported');
  assert.equal(result.preexisting, true);
  // The guard itself still installs successfully over the top of it.
  assert.equal(result.installed, true);
  assert.equal(result.failed.length, 0);
  // The provider is neutered (reads back as undefined) and, critically, was
  // never called into during detection or replacement.
  assert.equal(network.window.ethereum, undefined);
  assert.equal(requestCalls, 0, 'detection must not invoke methods on the provider it is inspecting');
});

test('neuterProviders does not report a violation when window.ethereum is undefined (the default, no-extension case)', () => {
  // Negative counterpart to the F1 regression above: createProviderGlobal()'s
  // default fixture (ethereum defined as undefined on the prototype, the
  // "no wallet extension installed" case every other test in this file
  // relies on) must not trip the isolation-violation path by itself.
  const defaultCase = createProviderGlobal();
  const { api: defaultApi } = loadAirgap({ windowObject: defaultCase.window });
  const defaultAttempts = [];
  const defaultResult = defaultApi.neuterProviders((name) => defaultAttempts.push(name));
  assert.equal(defaultResult.preexisting, false);
  assert.equal(defaultAttempts.length, 0);

  const explicitUndefined = createProviderGlobal();
  Object.defineProperty(explicitUndefined.window, 'ethereum', {
    configurable: true,
    enumerable: true,
    value: undefined,
    writable: true
  });
  const { api: explicitApi } = loadAirgap({ windowObject: explicitUndefined.window });
  const explicitAttempts = [];
  const explicitResult = explicitApi.neuterProviders((name) => explicitAttempts.push(name));
  assert.equal(explicitResult.preexisting, false);
  assert.equal(explicitAttempts.length, 0);
});

test('neuterProviders reports an installation failure when addEventListener is unavailable', () => {
  const network = createProviderGlobal();
  delete network.window.addEventListener;
  const { api } = loadAirgap({ windowObject: network.window });
  const result = api.neuterProviders();

  assert.equal(result.installed, false);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0], 'eip6963:announceProvider');
});
