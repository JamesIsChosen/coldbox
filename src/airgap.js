(function (global) {
  'use strict';

  var WARM_CANARY_URL = 'https://coldbox.invalid/csp-canary';
  var COLD_CANARY_URL = 'http://localhost:9/cold-csp-canary';
  var NETWORK_PRIMITIVES = Object.freeze([
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'sendBeacon'
  ]);
  var PROVIDER_ANNOUNCEMENT_EVENT = 'eip6963:announceProvider';
  var PROVIDER_PRIMITIVES = Object.freeze([
    'window.ethereum',
    PROVIDER_ANNOUNCEMENT_EVENT
  ]);

  function isConnectViolation(event) {
    if (!event) {
      return false;
    }
    return event.effectiveDirective === 'connect-src'
      || event.violatedDirective === 'connect-src';
  }

  function isCanaryViolation(event, expectedUrl) {
    var canaryUrl = expectedUrl || WARM_CANARY_URL;
    return isConnectViolation(event)
      && String(event.blockedURI || '') === canaryUrl;
  }

  function runCanary(expectedUrl) {
    var canaryUrl = expectedUrl || WARM_CANARY_URL;
    return new Promise(function (resolve) {
      var settled = false;
      var sawViolation = false;
      var timeout = null;
      var rejectionTimer = null;
      var documentObject = global.document;

      function finish(passed, reason) {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout !== null) {
          global.clearTimeout(timeout);
        }
        if (rejectionTimer !== null) {
          global.clearTimeout(rejectionTimer);
        }
        if (documentObject && typeof documentObject.removeEventListener === 'function') {
          documentObject.removeEventListener('securitypolicyviolation', onViolation, true);
        }
        resolve({ passed: passed, reason: reason });
      }

      function onViolation(event) {
        if (!isCanaryViolation(event, canaryUrl)) {
          return;
        }
        sawViolation = true;
        finish(true, 'csp-violation');
      }

      function finishAfterRejection() {
        rejectionTimer = global.setTimeout(function () {
          finish(
            sawViolation,
            sawViolation ? 'csp-violation' : 'rejected-without-csp'
          );
        }, 100);
      }

      if (!documentObject || typeof documentObject.addEventListener !== 'function') {
        finish(false, 'document-unavailable');
        return;
      }
      documentObject.addEventListener('securitypolicyviolation', onViolation, true);
      timeout = global.setTimeout(function () {
        finish(
          sawViolation,
          sawViolation ? 'csp-violation' : 'canary-timeout-without-csp'
        );
      }, 1250);

      if (!global.fetch || typeof global.fetch !== 'function') {
        finish(false, 'fetch-unavailable');
        return;
      }

      try {
        var request = global.fetch(canaryUrl, {
          method: 'GET',
          cache: 'no-store'
        });
        if (!request || typeof request.then !== 'function') {
          finish(false, 'fetch-returned-no-promise');
          return;
        }
        request.then(function () {
          finish(false, 'request-resolved');
        }, function () {
          finishAfterRejection();
        });
      } catch (error) {
        finishAfterRejection();
      }
    });
  }

  function createBlocker(name, onAttempt) {
    var blocker = function () {
      if (typeof onAttempt === 'function') {
        onAttempt(name);
      }
      throw new Error('Coldbox airgap blocked ' + name + '.');
    };
    return Object.freeze(blocker);
  }

  function findPropertyOwner(target, key) {
    var current = target;
    while (current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        return current;
      }
      try {
        current = Object.getPrototypeOf(current);
      } catch (error) {
        return target;
      }
    }
    return target;
  }

  function defineOwnBlocked(target, key, blocker) {
    try {
      Object.defineProperty(target, key, {
        configurable: false,
        enumerable: false,
        value: blocker,
        writable: false
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function defineBlocked(target, key, name, onAttempt) {
    var blocker = createBlocker(name, onAttempt);
    var owner = findPropertyOwner(target, key);
    var installedOnTarget = defineOwnBlocked(target, key, blocker);
    var installedOnOwner = owner === target
      ? installedOnTarget
      : defineOwnBlocked(owner, key, blocker);
    return installedOnTarget && installedOnOwner;
  }

  function neuterNetwork(onAttempt) {
    var navigatorObject = global.navigator;
    var results = [
      { name: 'fetch', installed: defineBlocked(global, 'fetch', 'fetch', onAttempt) },
      { name: 'XMLHttpRequest', installed: defineBlocked(global, 'XMLHttpRequest', 'XMLHttpRequest', onAttempt) },
      { name: 'WebSocket', installed: defineBlocked(global, 'WebSocket', 'WebSocket', onAttempt) },
      { name: 'EventSource', installed: defineBlocked(global, 'EventSource', 'EventSource', onAttempt) },
      {
        name: 'sendBeacon',
        installed: Boolean(navigatorObject)
          && defineBlocked(navigatorObject, 'sendBeacon', 'sendBeacon', onAttempt)
      }
    ];
    return {
      failed: results.filter(function (result) { return !result.installed; }).map(function (result) {
        return result.name;
      }),
      installed: results.every(function (result) { return result.installed; }),
      primitives: NETWORK_PRIMITIVES.slice()
    };
  }

  // P0.21: sandboxed srcdoc frames are not reliably excluded from extension
  // injection - that is a browser implementation detail, not a guarantee
  // (ADR-0020). window.ethereum and eip6963:announceProvider are the two
  // observable surfaces of an injected wallet provider, and neither is
  // reachable through the CSP that blocks the five network primitives above,
  // so this guard is defence in depth with nothing in front of it.
  function defineOwnProviderAccessor(target, key, name, onAttempt) {
    try {
      Object.defineProperty(target, key, {
        configurable: false,
        enumerable: false,
        get: function () {
          return undefined;
        },
        set: function () {
          if (typeof onAttempt === 'function') {
            onAttempt(name);
          }
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // F1 remediation (P0.21 review): a provider can already be sitting at
  // window.ethereum by the time this guard installs - an extension that
  // injected before Coldbox's own script ran. That is itself the isolation
  // failure ADR-0020 requires full lockdown for, not merely a thing to
  // silently overwrite. Detection reads only the property descriptor, never
  // the provider object itself: a data descriptor's `value` is inspected
  // without a call, and an accessor (get/set) descriptor - which could only
  // belong to something other than Coldbox, since this runs before Coldbox
  // installs its own - is treated as present without invoking the getter,
  // so no extension-controlled code ever runs during detection.
  function inspectExistingValue(target, key) {
    var current = target;
    while (current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        var descriptor;
        try {
          descriptor = Object.getOwnPropertyDescriptor(current, key);
        } catch (error) {
          return { present: true };
        }
        if (!descriptor) {
          return { present: true };
        }
        if (Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          return { present: descriptor.value !== undefined };
        }
        return { present: true };
      }
      try {
        current = Object.getPrototypeOf(current);
      } catch (error) {
        return { present: true };
      }
    }
    return { present: false };
  }

  function defineProviderBlocked(target, key, name, onAttempt) {
    var existing = inspectExistingValue(target, key);
    if (existing.present && typeof onAttempt === 'function') {
      onAttempt(name);
    }
    var owner = findPropertyOwner(target, key);
    var installedOnTarget = defineOwnProviderAccessor(target, key, name, onAttempt);
    var installedOnOwner = owner === target
      ? installedOnTarget
      : defineOwnProviderAccessor(owner, key, name, onAttempt);
    return {
      installed: installedOnTarget && installedOnOwner,
      preexisting: existing.present
    };
  }

  function installProviderAnnouncementGuard(target, onAttempt) {
    if (!target || typeof target.addEventListener !== 'function') {
      return false;
    }
    try {
      target.addEventListener(PROVIDER_ANNOUNCEMENT_EVENT, function (event) {
        if (typeof onAttempt === 'function') {
          onAttempt(PROVIDER_ANNOUNCEMENT_EVENT);
        }
        if (event && typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
      }, true);
      return true;
    } catch (error) {
      return false;
    }
  }

  function neuterProviders(onAttempt) {
    var ethereumResult = defineProviderBlocked(global, 'ethereum', 'window.ethereum', onAttempt);
    var results = [
      {
        name: 'window.ethereum',
        installed: ethereumResult.installed
      },
      {
        name: PROVIDER_ANNOUNCEMENT_EVENT,
        installed: installProviderAnnouncementGuard(global, onAttempt)
      }
    ];
    return {
      failed: results.filter(function (result) { return !result.installed; }).map(function (result) {
        return result.name;
      }),
      installed: results.every(function (result) { return result.installed; }),
      // F1 remediation (P0.21 review): true if window.ethereum already held
      // a provider when this guard installed. onAttempt() has already fired
      // for this above (via defineProviderBlocked), driving the isolation-
      // failure lockdown; callers must also treat this as blocking readiness
      // even though the guard itself installed successfully.
      preexisting: ethereumResult.preexisting,
      primitives: PROVIDER_PRIMITIVES.slice()
    };
  }

  function getNetworkSnapshot() {
    var navigatorObject = global.navigator || {};
    var connection = navigatorObject.connection
      || navigatorObject.mozConnection
      || navigatorObject.webkitConnection
      || null;
    var connectionName = 'unknown';
    if (connection) {
      connectionName = connection.effectiveType
        || connection.type
        || connection.connectionType
        || 'available';
    }
    return {
      online: typeof navigatorObject.onLine === 'boolean'
        ? navigatorObject.onLine
        : null,
      connection: String(connectionName)
    };
  }

  var api = Object.freeze({
    canaryUrl: WARM_CANARY_URL,
    warmCanaryUrl: WARM_CANARY_URL,
    coldCanaryUrl: COLD_CANARY_URL,
    canaryUrls: Object.freeze({ warm: WARM_CANARY_URL, cold: COLD_CANARY_URL }),
    getNetworkSnapshot: getNetworkSnapshot,
    isConnectViolation: isConnectViolation,
    isCanaryViolation: isCanaryViolation,
    networkPrimitives: NETWORK_PRIMITIVES,
    neuterNetwork: neuterNetwork,
    neuterProviders: neuterProviders,
    providerAnnouncementEvent: PROVIDER_ANNOUNCEMENT_EVENT,
    providerPrimitives: PROVIDER_PRIMITIVES,
    runCanary: runCanary
  });

  Object.defineProperty(global, '__coldboxAirgap', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
