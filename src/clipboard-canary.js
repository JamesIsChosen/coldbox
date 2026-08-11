(function (global) {
  'use strict';

  function create(options) {
    var settings = options || {};
    var navigatorObject = settings.navigator || global.navigator;
    var timer = null;
    var generation = 0;
    var baseline = null;
    var state = 'off';
    var onState = typeof settings.onState === 'function' ? settings.onState : function () {};
    var onChanged = typeof settings.onChanged === 'function' ? settings.onChanged : function () {};
    var delay = Number.isInteger(settings.delayMs) && settings.delayMs > 0 ? settings.delayMs : 1500;

    function setState(next, detail) {
      state = next;
      onState(next, detail || '');
    }

    function stopTimer() {
      if (timer !== null) {
        (settings.clearTimeout || global.clearTimeout)(timer);
        timer = null;
      }
    }

    function unavailable(detail) {
      stopTimer();
      baseline = null;
      setState('unavailable', detail || 'Clipboard read is unavailable.');
      return { state: 'unavailable', detail: detail || 'Clipboard read is unavailable.' };
    }

    function readText() {
      if (!navigatorObject || !navigatorObject.clipboard
        || typeof navigatorObject.clipboard.readText !== 'function') {
        return Promise.reject(new Error('Clipboard read API is unavailable.'));
      }
      return Promise.resolve().then(function () { return navigatorObject.clipboard.readText(); })
        .then(function (value) {
          if (typeof value !== 'string') {
            throw new Error('Clipboard did not return text.');
          }
          return value;
        });
    }

    function queryPermission() {
      if (!navigatorObject || !navigatorObject.permissions
        || typeof navigatorObject.permissions.query !== 'function') {
        return Promise.resolve('unknown');
      }
      return Promise.resolve(navigatorObject.permissions.query({ name: 'clipboard-read' }))
        .then(function (permission) {
          return permission && typeof permission.state === 'string' ? permission.state : 'unknown';
        }, function () {
          return 'unknown';
        });
    }

    function schedule(currentGeneration) {
      stopTimer();
      timer = (settings.setTimeout || global.setTimeout)(function () {
        timer = null;
        if (currentGeneration !== generation || state !== 'armed') {
          return;
        }
        readText().then(function (value) {
          if (currentGeneration !== generation || state !== 'armed') {
            return;
          }
          if (value !== baseline) {
            setState('changed', 'Clipboard changed on its own. Clipboard managers, sync tools, and remote-desktop clients can cause this before malware.');
            onChanged({ state: 'changed', baseline: baseline, current: value });
            return;
          }
          setState('stable', 'Clipboard stayed unchanged during the canary check.');
        }, function () {
          if (currentGeneration === generation && state === 'armed') {
            unavailable('Clipboard read permission was not available for the canary.');
          }
        });
      }, delay);
    }

    function enable() {
      generation += 1;
      var currentGeneration = generation;
      setState('checking', 'Requesting clipboard-read permission for the opt-in canary.');
      return queryPermission().then(function (permission) {
        if (permission === 'denied') {
          return unavailable('Clipboard read permission was denied. The address comparison still works without the canary.');
        }
        return readText().then(function (value) {
          if (currentGeneration !== generation) {
            return { state: state };
          }
          baseline = value;
          setState('armed', 'Canary armed. It will re-read the clipboard once without user action.');
          schedule(currentGeneration);
          return { state: 'armed' };
        }, function () {
          return unavailable('Clipboard read permission was unavailable. The address comparison still works without the canary.');
        });
      });
    }

    function retry() {
      return enable();
    }

    function disable() {
      generation += 1;
      stopTimer();
      baseline = null;
      setState('off', 'Clipboard canary is off.');
    }

    return Object.freeze({
      enable: enable,
      retry: retry,
      disable: disable,
      stop: disable,
      state: function () { return state; }
    });
  }

  global.__coldboxClipboardCanary = Object.freeze({ create: create });
}(window));
