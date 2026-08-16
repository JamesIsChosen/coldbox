(function (global) {
  'use strict';

  var WASM_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
  var WORKER_SOURCE = 'self.onmessage = function () { self.postMessage("ready"); };';

  function hasRandomValues() {
    var cryptoObject = global.crypto;
    if (!cryptoObject || typeof cryptoObject.getRandomValues !== 'function') {
      return false;
    }
    try {
      var sample = new Uint8Array(1);
      cryptoObject.getRandomValues(sample);
      return sample.length === 1 && sample[0] >= 0 && sample[0] <= 255;
    } catch (error) {
      return false;
    }
  }

  function hasSubtle() {
    var cryptoObject = global.crypto;
    return Boolean(
      cryptoObject
      && cryptoObject.subtle
      && typeof cryptoObject.subtle.digest === 'function'
    );
  }

  function probeWasm() {
    if (!global.WebAssembly || typeof global.WebAssembly.instantiate !== 'function') {
      return Promise.resolve(false);
    }
    try {
      var result = global.WebAssembly.instantiate(WASM_PROBE);
      if (!result || typeof result.then !== 'function') {
        return Promise.resolve(false);
      }
      return result.then(function () { return true; }, function () { return false; });
    } catch (error) {
      return Promise.resolve(false);
    }
  }

  function probeWorkers() {
    if (typeof global.Worker !== 'function'
      || typeof global.Blob !== 'function'
      || !global.URL
      || typeof global.URL.createObjectURL !== 'function'
      || typeof global.URL.revokeObjectURL !== 'function') {
      return Promise.resolve(false);
    }

    return new Promise(function (resolve) {
      var worker = null;
      var objectUrl = null;
      var timer = null;
      var settled = false;

      function finish(available) {
        if (settled) {
          return;
        }
        settled = true;
        if (timer !== null) {
          global.clearTimeout(timer);
        }
        if (worker) {
          try {
            worker.terminate();
          } catch (error) {
            // Worker cleanup is best effort after the capability result exists.
          }
        }
        if (objectUrl) {
          global.URL.revokeObjectURL(objectUrl);
        }
        resolve(available);
      }

      try {
        var blob = new global.Blob([WORKER_SOURCE], { type: 'application/javascript' });
        objectUrl = global.URL.createObjectURL(blob);
        worker = new global.Worker(objectUrl);
        worker.onmessage = function (event) {
          finish(event && event.data === 'ready');
        };
        worker.onerror = function () {
          finish(false);
        };
        timer = global.setTimeout(function () {
          finish(false);
        }, 500);
        worker.postMessage('probe');
      } catch (error) {
        finish(false);
      }
    });
  }

  function hasCamera() {
    var navigatorObject = global.navigator || {};
    var mediaDevices = navigatorObject.mediaDevices;
    return Boolean(
      mediaDevices
      && typeof mediaDevices.getUserMedia === 'function'
    ) || typeof navigatorObject.getUserMedia === 'function'
      || typeof navigatorObject.webkitGetUserMedia === 'function'
      || typeof navigatorObject.mozGetUserMedia === 'function';
  }

  function detectSavePaths() {
    var documentObject = global.document;
    var anchor = null;
    var textarea = null;
    if (documentObject && typeof documentObject.createElement === 'function') {
      anchor = documentObject.createElement('a');
      textarea = documentObject.createElement('textarea');
      textarea.setAttribute('data-input-surface', 'public');
    }
    return {
      fileSystemAccess: typeof global.showSaveFilePicker === 'function',
      blobDownload: Boolean(
        typeof global.Blob === 'function'
        && global.URL
        && typeof global.URL.createObjectURL === 'function'
        && anchor
        && typeof anchor.download === 'string'
      ),
      manualExport: Boolean(
        textarea
        && typeof textarea.select === 'function'
      )
    };
  }

  function detect() {
    var savePaths = detectSavePaths();
    return Promise.all([probeWasm(), probeWorkers()]).then(function (results) {
      return Object.freeze({
        randomValues: hasRandomValues(),
        cryptoSubtle: hasSubtle(),
        wasm: results[0],
        workers: results[1],
        camera: hasCamera(),
        fileSystemAccess: savePaths.fileSystemAccess,
        blobDownload: savePaths.blobDownload,
        manualExport: savePaths.manualExport
      });
    }, function () {
      return Object.freeze({
        randomValues: hasRandomValues(),
        cryptoSubtle: hasSubtle(),
        wasm: false,
        workers: false,
        camera: hasCamera(),
        fileSystemAccess: savePaths.fileSystemAccess,
        blobDownload: savePaths.blobDownload,
        manualExport: savePaths.manualExport
      });
    });
  }

  var api = Object.freeze({ detect: detect });

  Object.defineProperty(global, '__coldboxCapabilities', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
