(function (global) {
  'use strict';

  // Warm-shell-only save-integrity helpers for P0.14.
  //
  // Nothing here ever touches vault plaintext or a key of any kind - it
  // only reasons about already-encrypted vault bytes (which are safe to hold
  // in the warm shell, same as the existing vault.bytes/vault.open messages)
  // plus local advisory bookkeeping (a legacy counter and timestamp) that never
  // crosses the realm boundary and is not part of the vault format. See
  // ADR-0013 for why this lives here instead of in the vault header or the
  // public compartment.
  //
  // Rollback history is therefore advisory, not
  // a cryptographic guarantee - exactly as docs/01-spec/vault-format.md and
  // docs/02-security/threat-model.md already describe them. A renamed file
  // or a fresh browser profile silently loses the check; it never produces a
  // false rollback warning.

  var GENERATION_STORAGE_KEY = 'coldbox-vault-generation';
  var GENERATION_STORAGE_PREFIX = 'coldbox-vault-generation:';
  var NAME_REGISTRY_STORAGE_KEY = 'coldbox-vault-name-registry:v1';
  var FILENAME_PATTERN = /^coldbox-vault-(\d{4,9})\.cbx$/;
  var CANONICAL_VAULT_FILENAME_PATTERN = /^coldbox--([0-9a-f]{8})\.cbx$/i;
  var HISTORICAL_CANONICAL_VAULT_FILENAME_PATTERN = /^(.+?)--([0-9a-f]{8})\.cbx$/i;
  var LEGACY_GENERATIONAL_VAULT_FILENAME_PATTERN = /^(.+?)--([0-9a-f]{8})--(\d{4,9})\.cbx$/i;
  var VAULT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var LEGACY_SALT_OFFSET = 21;
  var LEGACY_SALT_LENGTH = 32;
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

  function normalizeNamespace(value) {
    if (typeof value !== 'string') {
      return null;
    }
    var trimmed = value.trim();
    return trimmed && trimmed.length <= 160 ? trimmed : null;
  }

  function storageKeyForNamespace(namespace) {
    var normalized = normalizeNamespace(namespace);
    return normalized ? GENERATION_STORAGE_PREFIX + encodeURIComponent(normalized) : null;
  }

  function vaultNamespace(vaultId) {
    return typeof vaultId === 'string' && VAULT_UUID_PATTERN.test(vaultId)
      ? 'vault:' + vaultId.toLowerCase()
      : null;
  }

  function id8(vaultId) {
    var namespace = vaultNamespace(vaultId);
    return namespace ? vaultId.replace(/-/g, '').slice(0, 8).toLowerCase() : null;
  }

  function bytesToHex(bytes) {
    var result = '';
    for (var index = 0; index < bytes.length; index += 1) {
      result += Number(bytes[index]).toString(16).padStart(2, '0');
    }
    return result;
  }

  function legacyNamespaceFromBytes(bytes) {
    if (!bytes || typeof bytes.length !== 'number' || bytes.length < LEGACY_SALT_OFFSET + LEGACY_SALT_LENGTH) {
      return null;
    }
    return 'legacy-salt:' + bytesToHex(Array.prototype.slice.call(
      bytes,
      LEGACY_SALT_OFFSET,
      LEGACY_SALT_OFFSET + LEGACY_SALT_LENGTH
    ));
  }

  function sanitizeVaultName(value) {
    if (typeof value !== 'string') {
      return '';
    }
    var trimmed = value.trim().slice(0, 80);
    return trimmed
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/[^A-Za-z0-9._ -]+/g, '-')
      .replace(/[ _-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 48);
  }

  function normalizedVaultNameKey(value) {
    var safe = sanitizeVaultName(value);
    return safe ? safe.toLowerCase() : null;
  }

  function readVaultNameRegistry(storage) {
    var result = {};
    try {
      if (!storage || typeof storage.getItem !== 'function') {
        return result;
      }
      var raw = storage.getItem(NAME_REGISTRY_STORAGE_KEY);
      if (!raw) {
        return result;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return result;
      }
      Object.keys(parsed).forEach(function (key) {
        if (normalizedVaultNameKey(key) === key
          && typeof parsed[key] === 'string'
          && VAULT_UUID_PATTERN.test(parsed[key])) {
          result[key] = parsed[key].toLowerCase();
        }
      });
      return result;
    } catch (error) {
      return result;
    }
  }

  function vaultNameOwner(storage, name) {
    var key = normalizedVaultNameKey(name);
    if (!key) {
      return null;
    }
    var registry = readVaultNameRegistry(storage);
    return registry[key] || null;
  }

  function claimVaultName(storage, name, vaultId) {
    var key = normalizedVaultNameKey(name);
    var namespace = vaultNamespace(vaultId);
    var normalizedId = namespace ? vaultId.toLowerCase() : null;
    if (!key || !normalizedId) {
      return false;
    }
    try {
      if (!storage || typeof storage.setItem !== 'function') {
        return false;
      }
      var registry = readVaultNameRegistry(storage);
      if (registry[key] && registry[key] !== normalizedId) {
        return false;
      }
      registry[key] = normalizedId;
      storage.setItem(NAME_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Reads advisory per-vault history recorded by this browser profile (legacy counter and/or current timestamp).
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

  function readGenerationFor(storage, namespace) {
    var key = storageKeyForNamespace(namespace);
    if (!key) {
      return defaultGeneration();
    }
    try {
      if (!storage || typeof storage.getItem !== 'function') {
        return defaultGeneration();
      }
      var raw = storage.getItem(key);
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
      return { counter: parsed.counter, savedAt: parsed.savedAt === undefined ? null : parsed.savedAt };
    } catch (error) {
      return defaultGeneration();
    }
  }

  function writeGenerationFor(storage, namespace, counter, savedAt) {
    var key = storageKeyForNamespace(namespace);
    try {
      if (!key
        || !storage
        || typeof storage.setItem !== 'function'
        || !isSafeCounter(counter)
        || !isIsoDate(savedAt)) {
        return false;
      }
      storage.setItem(key, JSON.stringify({ counter: counter, savedAt: savedAt }));
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

  function filenameForVault(name, vaultId) {
    var shortId = id8(vaultId);
    if (!shortId) {
      throw new Error('Invalid vault filename metadata.');
    }
    return 'coldbox--' + shortId + '.cbx';
  }

  function parseVaultFilename(name) {
    if (typeof name !== 'string') {
      return null;
    }
    var trimmed = name.trim();
    var canonical = CANONICAL_VAULT_FILENAME_PATTERN.exec(trimmed);
    if (canonical) {
      return Object.freeze({
        legacy: false,
        canonical: true,
        name: null,
        id8: canonical[1].toLowerCase(),
        counter: null
      });
    }
    var historicalCanonical = HISTORICAL_CANONICAL_VAULT_FILENAME_PATTERN.exec(trimmed);
    if (historicalCanonical) {
      return Object.freeze({
        legacy: true,
        canonical: false,
        name: historicalCanonical[1],
        id8: historicalCanonical[2].toLowerCase(),
        counter: null
      });
    }
    var generational = LEGACY_GENERATIONAL_VAULT_FILENAME_PATTERN.exec(trimmed);
    if (generational) {
      var counter = Number(generational[3]);
      if (!isSafeCounter(counter)) {
        return null;
      }
      return Object.freeze({
        legacy: true,
        canonical: false,
        name: generational[1],
        id8: generational[2].toLowerCase(),
        counter: counter
      });
    }
    var legacyCounter = parseFilename(trimmed);
    if (legacyCounter !== null) {
      return Object.freeze({ legacy: true, canonical: false, name: 'Coldbox vault', id8: null, counter: legacyCounter });
    }
    return null;
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

  // Compares a loaded file against the highest local history this browser has
  // recorded for its authenticated Vault ID. Historical generational filenames
  // retain the P0.14 counter check; canonical filenames have no visible counter,
  // so their best-effort advisory signal is only the filesystem timestamp.
  function evaluateRollback(generation, file) {
    var seenCounter = generation && isSafeCounter(generation.counter) ? generation.counter : 0;
    var seenSavedAt = generation && (generation.savedAt === null || isIsoDate(generation.savedAt))
      ? generation.savedAt
      : null;
    var fileCounter = file && isSafeCounter(file.counter) ? file.counter : null;
    var fileLastModified = file && typeof file.lastModified === 'number' && Number.isFinite(file.lastModified)
      ? file.lastModified
      : null;
    var timestampRollback = Boolean(
      fileCounter === null
      && seenSavedAt
      && fileLastModified !== null
      && fileLastModified < Date.parse(seenSavedAt)
    );
    return Object.freeze({
      rollback: (fileCounter !== null && fileCounter < seenCounter) || timestampRollback,
      reason: fileCounter !== null && fileCounter < seenCounter ? 'legacy-generation' : (timestampRollback ? 'timestamp' : null),
      seenCounter: seenCounter,
      seenSavedAt: seenSavedAt,
      fileCounter: fileCounter,
      fileLastModified: fileLastModified
    });
  }

  // The remembered history must be the newest this browser profile has seen,
  // not merely the latest save it initiated. Legacy files can advance the old
  // numeric high-water counter; canonical files can only advance the timestamp.
  // Call this after evaluateRollback() so the comparison uses the OLD history.
  function advanceGenerationOnOpen(generation, file) {
    var seenCounter = generation && isSafeCounter(generation.counter) ? generation.counter : 0;
    var seenSavedAt = generation && (generation.savedAt === null || isIsoDate(generation.savedAt))
      ? generation.savedAt
      : null;
    var fileCounter = file && isSafeCounter(file.counter) ? file.counter : null;
    if (fileCounter !== null && fileCounter > seenCounter) {
      var openedLegacyAt = file && typeof file.lastModified === 'number' && Number.isFinite(file.lastModified)
        ? new Date(file.lastModified).toISOString()
        : new Date().toISOString();
      return Object.freeze({ counter: fileCounter, savedAt: openedLegacyAt });
    }
    if (fileCounter === null && file && typeof file.lastModified === 'number' && Number.isFinite(file.lastModified)) {
      var openedAt = new Date(file.lastModified).toISOString();
      if (!seenSavedAt || Date.parse(openedAt) > Date.parse(seenSavedAt)) {
        return Object.freeze({ counter: seenCounter, savedAt: openedAt });
      }
    }
    return Object.freeze({ counter: seenCounter, savedAt: seenSavedAt });
  }

  // The verify-after-save orchestration itself, decoupled from any specific
  // save path so it can be exercised with fake write/readBack callbacks. A
  // deliberately truncated or corrupted readBack fails verification; only a
  // caller that receives { verified: true } may clear the dirty flag or
  // advance the browser-local advisory history.
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
    generationStoragePrefix: GENERATION_STORAGE_PREFIX,
    nameRegistryStorageKey: NAME_REGISTRY_STORAGE_KEY,
    maxCounter: MAX_COUNTER,
    readGeneration: readGeneration,
    writeGeneration: writeGeneration,
    readGenerationFor: readGenerationFor,
    writeGenerationFor: writeGenerationFor,
    storageKeyForNamespace: storageKeyForNamespace,
    vaultNamespace: vaultNamespace,
    legacyNamespaceFromBytes: legacyNamespaceFromBytes,
    id8: id8,
    sanitizeVaultName: sanitizeVaultName,
    normalizedVaultNameKey: normalizedVaultNameKey,
    readVaultNameRegistry: readVaultNameRegistry,
    vaultNameOwner: vaultNameOwner,
    claimVaultName: claimVaultName,
    nextCounter: nextCounter,
    filenameForCounter: filenameForCounter,
    filenameForVault: filenameForVault,
    parseFilename: parseFilename,
    parseVaultFilename: parseVaultFilename,
    bytesEqual: bytesEqual,
    evaluateRollback: evaluateRollback,
    advanceGenerationOnOpen: advanceGenerationOnOpen,
    verifyAfterSave: verifyAfterSave
  });

  Object.defineProperty(global, '__coldboxSaveIntegrity', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
