(function (global) {
  'use strict';

  var CANARY_URL = 'https://coldbox.invalid/csp-canary';
  var NETWORK_PRIMITIVES = Object.freeze([
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'sendBeacon'
  ]);

  function isConnectViolation(event) {
    if (!event) {
      return false;
    }
    return event.effectiveDirective === 'connect-src'
      || event.violatedDirective === 'connect-src';
  }

  function isCanaryViolation(event) {
    return isConnectViolation(event)
      && String(event.blockedURI || '') === CANARY_URL;
  }

  function runCanary() {
    return new Promise(function (resolve) {
      var settled = false;
      var sawViolation = false;
      var timeout = null;
      var rejectionTimer = null;

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
        document.removeEventListener('securitypolicyviolation', onViolation, true);
        resolve({ passed: passed, reason: reason });
      }

      function onViolation(event) {
        if (!isCanaryViolation(event)) {
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

      document.addEventListener('securitypolicyviolation', onViolation, true);
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
        var request = global.fetch(CANARY_URL, {
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

  function defineBlocked(target, key, name, onAttempt) {
    try {
      Object.defineProperty(target, key, {
        configurable: false,
        enumerable: false,
        value: createBlocker(name, onAttempt),
        writable: false
      });
      return true;
    } catch (error) {
      return false;
    }
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
    canaryUrl: CANARY_URL,
    getNetworkSnapshot: getNetworkSnapshot,
    isConnectViolation: isConnectViolation,
    networkPrimitives: NETWORK_PRIMITIVES,
    neuterNetwork: neuterNetwork,
    runCanary: runCanary
  });

  Object.defineProperty(global, '__coldboxAirgap', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
