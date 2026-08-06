(function (global) {
  'use strict';

  // Warm-shell-only save-integrity helpers for P0.14.
  //
  // Nothing here ever touches vault plaintext or a key of any kind - it
  // only reasons about already-encrypted vault bytes (which are safe to hold
  // in the warm shell, same as the existing vault.bytes/vault.open messages)
  // plus local bookkeeping (a save counter and a timestamp) that never
  // crosses the realm boundary and is not part of the vault format. See
  // ADR-0013 for why this lives here instead of in the vault header or the
  // public compartment.
  //
  // Rollback and generational-filename tracking are therefore advisory, not
  // a cryptographic guarantee - exactly as docs/01-spec/vault-format.md and
  // docs/02-security/threat-model.md already describe them. A renamed file
  // or a fresh browser profile silently loses the check; it never produces a
  // false rollback warning.

  var GENERATION_STORAGE_KEY = 'coldbox-vault-generation';
  var FILENAME_PATTERN = /^coldbox-vault-(\d{4,9})\.cbx$/;
  var MAX_COUNTER = 999999999;
  var MAX_ISO_LENGTH = 64;

  function isSafeCounter(value) {
    return Number.isInteger(value) && value >= 0 && value <= MAX_COUNTER;
  }

  function isIsoDate(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ISO_LENGTH) {
      return false;
    }
    return Number.isFinite(Date.parse(value));
  }

  function defaultGeneration() {
    return { counter: 0, savedAt: null };
  }

  // Reads the highest save generation this browser profile has recorded.
  // Missing storage, a throwing storage implementation, corrupt JSON, or a
  // value outside the expected shape all degrade silently to the default -
  // never throws, never blocks a vault operation.
  function readGeneration(storage) {
    try {
      if (!storage || typeof storage.getItem !== 'function') {
        return defaultGeneration();
      }
      var raw = storage.getItem(GENERATION_STORAGE_KEY);
      if (!raw) {
        return defaultGeneration();
      }
      var parsed = JSON.parse(raw);
      if (!parsed
        || typeof parsed !== 'object'
        || !isSafeCounter(parsed.counter)
        || (parsed.savedAt !== null && !isIsoDate(parsed.savedAt))) {
        return defaultGeneration();
      }
      return {
        counter: parsed.counter,
        savedAt: parsed.savedAt === undefined ? null : parsed.savedAt
      };
    } catch (error) {
      return defaultGeneration();
    }
  }

  // Best-effort persistence of a verified save's generation. Returns whether
  // it actually wrote, so a caller can decide whether to mention the gap -
  // but a failure here must never itself fail the save or the dirty-flag
  // transition, since localStorage is explicitly non-essential (SPEC.md).
  function writeGeneration(storage, counter, savedAt) {
    try {
      if (!storage
        || typeof storage.setItem !== 'function'
        || !isSafeCounter(counter)
        || !isIsoDate(savedAt)) {
        return false;
      }
      storage.setItem(GENERATION_STORAGE_KEY, JSON.stringify({ counter: counter, savedAt: savedAt }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function nextCounter(generation) {
    var current = generation && isSafeCounter(generation.counter) ? generation.counter : 0;
    return current + 1;
  }

  function pad4(value) {
    var text = String(value);
    while (text.length < 4) {
      text = '0' + text;
    }
    return text;
  }

  function filenameForCounter(counter) {
    if (!isSafeCounter(counter)) {
      throw new Error('Invalid save counter.');
    }
    return 'coldbox-vault-' + pad4(counter) + '.cbx';
  }

  // Returns the counter embedded in a Coldbox-generated filename, or null if
  // the name does not match - a renamed or foreign file simply cannot be
  // checked, which is the documented degrade-silently behaviour.
  function parseFilename(name) {
    if (typeof name !== 'string') {
      return null;
    }
    var match = FILENAME_PATTERN.exec(name.trim());
    if (!match) {
      return null;
    }
    var counter = Number(match[1]);
    return isSafeCounter(counter) ? counter : null;
  }

  // Constant-time-shaped comparison of two byte-like values. Used to confirm
  // a file read back from disk is identical to what was written - the core
  // of verify-after-save. Any length mismatch (the shape a truncated write
  // takes) or content mismatch reports false.
  function bytesEqual(a, b) {
    if (typeof a === 'string' || typeof b === 'string') {
      return false;
    }
    if (!a || !b || typeof a.length !== 'number' || typeof b.length !== 'number' || a.length !== b.length) {
      return false;
    }
    var mismatch = 0;
    for (var index = 0; index < a.length; index += 1) {
      mismatch |= (a[index] ^ b[index]);
    }
    return mismatch === 0;
  }

  // Compares a loaded file's embedded generation (from its filename and, for
  // context only, its filesystem last-modified time) against the highest
  // generation this browser has ever recorded. Only fires when the filename
  // parses AND is strictly older than what has been seen - an unparseable
  // filename never produces a false positive.
  function evaluateRollback(generation, file) {
    var seenCounter = generation && isSafeCounter(generation.counter) ? generation.counter : 0;
    var seenSavedAt = generation && (generation.savedAt === null || isIsoDate(generation.savedAt))
      ? generation.savedAt
      : null;
    var fileCounter = file && isSafeCounter(file.counter) ? file.counter : null;
    var fileLastModified = file && typeof file.lastModified === 'number' && Number.isFinite(file.lastModified)
      ? file.lastModified
      : null;
    return Object.freeze({
      rollback: fileCounter !== null && fileCounter < seenCounter,
      seenCounter: seenCounter,
      seenSavedAt: seenSavedAt,
      fileCounter: fileCounter,
      fileLastModified: fileLastModified
    });
  }

  // The verify-after-save orchestration itself, decoupled from any specific
  // save path so it can be exercised with fake write/readBack callbacks. A
  // deliberately truncated or corrupted readBack fails verification; only a
  // caller that receives { verified: true } may clear the dirty flag or
  // advance the save generation.
  function verifyAfterSave(options) {
    if (!options || typeof options.write !== 'function' || typeof options.readBack !== 'function') {
      return Promise.reject(new Error('verifyAfterSave requires write and readBack callbacks.'));
    }
    var bytes = options.bytes;
    return Promise.resolve()
      .then(function () {
        return options.write(bytes);
      })
      .then(function () {
        return options.readBack();
      })
      .then(function (readBackBytes) {
        return Object.freeze({ verified: bytesEqual(readBackBytes, bytes) });
      });
  }

  var api = Object.freeze({
    generationStorageKey: GENERATION_STORAGE_KEY,
    maxCounter: MAX_COUNTER,
    readGeneration: readGeneration,
    writeGeneration: writeGeneration,
    nextCounter: nextCounter,
    filenameForCounter: filenameForCounter,
    parseFilename: parseFilename,
    bytesEqual: bytesEqual,
    evaluateRollback: evaluateRollback,
    verifyAfterSave: verifyAfterSave
  });

  Object.defineProperty(global, '__coldboxSaveIntegrity', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
