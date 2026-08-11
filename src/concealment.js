(function (global) {
  'use strict';

  var STORAGE_KEY = 'coldbox-privacy-blur';
  var REVEAL_DURATION_MS = 30000;

  function readStoredBlur(storage) {
    try {
      return storage && storage.getItem(STORAGE_KEY) === 'on';
    } catch (error) {
      return false;
    }
  }

  function writeStoredBlur(storage, enabled) {
    try {
      if (storage) {
        storage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
      }
    } catch (error) {
      // Privacy mode still applies to this session when storage is unavailable.
    }
  }

  function createController(options) {
    var settings = options || {};
    var documentObject = settings.document || global.document;
    var root = settings.root || (documentObject && documentObject.documentElement);
    var storage = settings.storage;
    if (storage === undefined) {
      try {
        storage = global.localStorage;
      } catch (error) {
        storage = null;
      }
    }
    var privacyBlur = readStoredBlur(storage);
    var revealTimers = [];

    function applyRootState() {
      if (!root) {
        return;
      }
      root.setAttribute('data-privacy-blur', privacyBlur ? 'on' : 'off');
      if (root.classList) {
        root.classList.toggle('privacy-blur', privacyBlur);
      }
    }

    function updateSensitiveState() {
      if (!root || !documentObject || typeof documentObject.querySelectorAll !== 'function') {
        return;
      }
      var visible = documentObject.querySelectorAll('[data-secret-visible="true"]').length > 0;
      root.setAttribute('data-secret-visible', visible ? 'true' : 'false');
    }

    function clearReveal(node) {
      if (!node) {
        return;
      }
      node.removeAttribute('data-secret-visible');
      if (node.classList) {
        node.classList.remove('secret-visible');
      }
      updateSensitiveState();
    }

    function reveal(node, duration) {
      if (!node) {
        return;
      }
      var timeout = duration === undefined ? REVEAL_DURATION_MS : duration;
      node.setAttribute('data-secret-visible', 'true');
      if (node.classList) {
        node.classList.add('secret-visible');
      }
      var timer = global.setTimeout(function () {
        clearReveal(node);
      }, timeout);
      revealTimers.push({ node: node, timer: timer });
      updateSensitiveState();
    }

    function panicHide() {
      revealTimers.forEach(function (entry) {
        global.clearTimeout(entry.timer);
        clearReveal(entry.node);
      });
      revealTimers = [];
      if (documentObject && typeof documentObject.querySelectorAll === 'function') {
        Array.prototype.forEach.call(
          documentObject.querySelectorAll('[data-sensitive="true"]'),
          function (node) {
            node.setAttribute('data-concealed', 'true');
            clearReveal(node);
          }
        );
      }
      updateSensitiveState();
    }

    function setPrivacyBlur(enabled) {
      privacyBlur = enabled === true;
      writeStoredBlur(storage, privacyBlur);
      applyRootState();
      return privacyBlur;
    }

    applyRootState();
    updateSensitiveState();

    return Object.freeze({
      isPrivacyBlurred: function () { return privacyBlur; },
      setPrivacyBlur: setPrivacyBlur,
      togglePrivacyBlur: function () { return setPrivacyBlur(!privacyBlur); },
      reveal: reveal,
      clearReveal: clearReveal,
      panicHide: panicHide,
      constants: Object.freeze({
        storageKey: STORAGE_KEY,
        revealDurationMs: REVEAL_DURATION_MS
      })
    });
  }

  Object.defineProperty(global, '__coldboxConcealment', {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ createController: createController }),
    writable: false
  });
}(window));
