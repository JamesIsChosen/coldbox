(function (global) {
  'use strict';

  var PROTOCOL_VERSION = 1;
  var SECRET_KEYS = Object.freeze({
    mnemonic: true,
    privateKey: true,
    xprv: true,
    passphrase: true,
    secretCompartment: true,
    secretPlaintext: true,
    storedSecret: true,
    shareMaterial: true
  });
  var COLLECTIONS = Object.freeze([
    'wallets',
    'accounts',
    'addresses',
    'notes',
    'devices',
    'transactions',
    'lots',
    'prices',
    'backups',
    'settings',
    'auditLog'
  ]);
  var SECTIONS = Object.freeze([
    'vault',
    'dashboard',
    'portfolio',
    'prices',
    'registry',
    'devices',
    'entropy',
    'seed-forge',
    'derivation',
    'backup',
    'qr',
    'recovery',
    'verify',
    'reference',
    'learn'
  ]);
  var COLLECTION_SET = makeSet(COLLECTIONS);
  var SECTION_SET = makeSet(SECTIONS);
  var WARNING_CODES = Object.freeze([
    'csp-active',
    'online',
    'offline',
    'webcrypto-unavailable',
    'worker-unavailable'
  ]);
  var WARNING_SET = makeSet(WARNING_CODES);
  var ERROR_MESSAGES = Object.freeze({
    'invalid-message': 'The cold realm rejected a message.',
    'operation-failed': 'The requested operation failed.',
    'vault-locked': 'The vault is locked.',
    'vault-corrupt': 'The vault could not be authenticated.',
    unsupported: 'The requested operation is unsupported.'
  });

  function makeSet(values) {
    var result = Object.create(null);
    values.forEach(function (value) {
      result[value] = true;
    });
    return Object.freeze(result);
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isRecord(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function cleanText(value, maximum) {
    if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
      return null;
    }
    return value;
  }

  function cleanOptionalText(value, maximum) {
    if (value === undefined) {
      return undefined;
    }
    return cleanText(value, maximum);
  }

  function cleanNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function cleanInteger(value, minimum, maximum) {
    return Number.isInteger(value) && value >= minimum && value <= maximum ? value : null;
  }

  function cleanBoolean(value) {
    return typeof value === 'boolean' ? value : null;
  }

  function cleanEnum(value, set, maximum) {
    var text = cleanText(value, maximum);
    return text !== null && hasOwn(set, text) ? text : null;
  }

  function cleanStringArray(value, maximumItems, maximumLength) {
    if (!Array.isArray(value) || value.length > maximumItems) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var item = cleanText(value[index], maximumLength);
      if (item === null) {
        return null;
      }
      result.push(item);
    }
    return result;
  }

  function cleanBytes(value) {
    var tag = Object.prototype.toString.call(value);
    if (tag === '[object Uint8Array]') {
      return new Uint8Array(value);
    }
    if (tag === '[object ArrayBuffer]') {
      return new Uint8Array(value.slice(0));
    }
    return null;
  }

  function cleanEmptyPayload(value) {
    return isRecord(value) ? {} : null;
  }

  function cleanCapabilities(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    ['messageChannel', 'cryptoSubtle', 'wasm', 'workers', 'opaqueOrigin'].forEach(function (key) {
      if (typeof value[key] === 'boolean') {
        result[key] = value[key];
      }
    });
    return result;
  }

  var PUBLIC_FIELD_RULES = Object.freeze({
    id: 'text',
    type: 'text',
    name: 'text',
    label: 'text',
    tags: 'strings',
    notes: 'text',
    address: 'text',
    addresses: 'strings',
    chain: 'text',
    network: 'text',
    accountRef: 'text',
    scriptType: 'text',
    fingerprint: 'text',
    xpub: 'text',
    asOf: 'text',
    amount: 'number',
    quantity: 'number',
    costBasis: 'number',
    price: 'number',
    timestamp: 'text',
    createdAt: 'text',
    updatedAt: 'text',
    location: 'text',
    status: 'text',
    vendor: 'text',
    model: 'text',
    serial: 'text',
    firmware: 'text',
    lifecycle: 'text'
  });

  function cleanPublicRecord(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    Object.keys(PUBLIC_FIELD_RULES).forEach(function (key) {
      if (!hasOwn(value, key) || hasOwn(SECRET_KEYS, key)) {
        return;
      }
      var rule = PUBLIC_FIELD_RULES[key];
      var cleaned;
      if (rule === 'text') {
        cleaned = cleanText(value[key], 512);
      } else if (rule === 'strings') {
        cleaned = cleanStringArray(value[key], 64, 128);
      } else {
        cleaned = cleanNumber(value[key]);
      }
      if (cleaned !== null) {
        result[key] = cleaned;
      }
    });
    return result;
  }

  function cleanPublicRecordArray(value) {
    if (!Array.isArray(value) || value.length > 10000) {
      return null;
    }
    var result = [];
    for (var index = 0; index < value.length; index += 1) {
      var record = cleanPublicRecord(value[index]);
      if (record === null) {
        return null;
      }
      result.push(record);
    }
    return result;
  }

  function cleanPublicCompartment(value) {
    if (!isRecord(value)) {
      return null;
    }
    var result = {};
    COLLECTIONS.forEach(function (collection) {
      if (!hasOwn(value, collection) || hasOwn(SECRET_KEYS, collection)) {
        return;
      }
      var cleaned = collection === 'settings'
        ? cleanPublicRecord(value[collection])
        : cleanPublicRecordArray(value[collection]);
      if (cleaned !== null) {
        result[collection] = cleaned;
      }
    });
    return result;
  }

  function cleanRange(value) {
    if (!isRecord(value)) {
      return null;
    }
    var start = cleanInteger(value.start, 0, 1000000);
    var count = cleanInteger(value.count, 1, 1000);
    if (start === null || count === null) {
      return null;
    }
    return { start: start, count: count };
  }

  function cleanVaultBytes(value) {
    if (!isRecord(value)) {
      return null;
    }
    var bytes = cleanBytes(value.bytes);
    return bytes === null ? null : { bytes: bytes };
  }

  function cleanModeSet(value) {
    if (!isRecord(value)) {
      return null;
    }
    var online = cleanBoolean(value.online);
    return online === null ? null : { online: online };
  }

  function cleanDeriveRequest(value) {
    if (!isRecord(value)) {
      return null;
    }
    var accountRef = cleanText(value.accountRef, 128);
    var scriptType = cleanText(value.scriptType, 64);
    var range = cleanRange(value.range);
    if (accountRef === null || scriptType === null || range === null) {
      return null;
    }
    return { accountRef: accountRef, scriptType: scriptType, range: range };
  }

  function cleanPublicDataRequest(value) {
    if (!isRecord(value)) {
      return null;
    }
    var collections = cleanStringArray(value.collections, COLLECTIONS.length, 64);
    if (collections === null) {
      return null;
    }
    for (var index = 0; index < collections.length; index += 1) {
      if (!hasOwn(COLLECTION_SET, collections[index])) {
        return null;
      }
    }
    return { collections: collections };
  }

  function cleanUiNavigate(value) {
    if (!isRecord(value)) {
      return null;
    }
    var section = cleanEnum(value.section, SECTION_SET, 64);
    return section === null ? null : { section: section };
  }

  function cleanReady(value) {
    if (!isRecord(value) || !hasOwn(value, 'capabilities')) {
      return null;
    }
    var capabilities = cleanCapabilities(value.capabilities);
    return capabilities === null ? null : { capabilities: capabilities };
  }

  function cleanVaultOpened(value) {
    if (!isRecord(value) || !hasOwn(value, 'publicCompartment')) {
      return null;
    }
    var publicCompartment = cleanPublicCompartment(value.publicCompartment);
    return publicCompartment === null ? null : { publicCompartment: publicCompartment };
  }

  function cleanDeriveResult(value) {
    if (!isRecord(value)) {
      return null;
    }
    var addresses = cleanStringArray(value.addresses, 10000, 256);
    var xpub = cleanText(value.xpub, 512);
    var fingerprint = cleanText(value.fingerprint, 64);
    if (addresses === null || xpub === null || fingerprint === null) {
      return null;
    }
    return { addresses: addresses, xpub: xpub, fingerprint: fingerprint };
  }

  function cleanStatus(value) {
    if (!isRecord(value)) {
      return null;
    }
    var locked = cleanBoolean(value.locked);
    var mode = cleanEnum(value.mode, makeSet(['cold', 'warm']), 16);
    var warnings = cleanStringArray(value.warnings, WARNING_CODES.length, 64);
    if (locked === null || mode === null || warnings === null) {
      return null;
    }
    for (var index = 0; index < warnings.length; index += 1) {
      if (!hasOwn(WARNING_SET, warnings[index])) {
        return null;
      }
    }
    return { locked: locked, mode: mode, warnings: warnings };
  }

  function cleanError(value) {
    if (!isRecord(value)) {
      return null;
    }
    var code = cleanEnum(value.code, ERROR_MESSAGES, 64);
    if (code === null) {
      return null;
    }
    return { code: code, message: ERROR_MESSAGES[code] };
  }

  var WARM_TO_COLD = Object.freeze({
    'vault.open': cleanVaultBytes,
    'vault.saveRequest': cleanEmptyPayload,
    'vault.lock': cleanEmptyPayload,
    'mode.set': cleanModeSet,
    'derive.request': cleanDeriveRequest,
    'publicData.request': cleanPublicDataRequest,
    'ui.navigate': cleanUiNavigate
  });
  var COLD_TO_WARM = Object.freeze({
    ready: cleanReady,
    'vault.opened': cleanVaultOpened,
    'vault.bytes': cleanVaultBytes,
    'derive.result': cleanDeriveResult,
    status: cleanStatus,
    error: cleanError
  });
  var DIRECTIONS = Object.freeze({
    'warm-to-cold': WARM_TO_COLD,
    'cold-to-warm': COLD_TO_WARM
  });

  function cleanMessageId(value) {
    var id = cleanText(value, 96);
    return id !== null && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) ? id : null;
  }

  function validateMessage(direction, raw) {
    var definitions = DIRECTIONS[direction];
    if (!definitions || !isRecord(raw)) {
      return null;
    }
    var id = cleanMessageId(raw.id);
    var type = cleanText(raw.type, 64);
    if (id === null || type === null || !hasOwn(definitions, type)) {
      return null;
    }
    var payload = definitions[type](raw.payload);
    return payload === null ? null : { id: id, type: type, payload: payload };
  }

  function createMessage(direction, id, type, payload) {
    return validateMessage(direction, { id: id, type: type, payload: payload });
  }

  function isReadySignal(value) {
    return isRecord(value)
      && value.type === 'cold.ready'
      && Object.keys(value).length === 1;
  }

  function handshakeMessage() {
    return { type: 'cold.handshake', payload: { version: PROTOCOL_VERSION } };
  }

  function isHandshakeMessage(value) {
    return isRecord(value)
      && value.type === 'cold.handshake'
      && isRecord(value.payload)
      && value.payload.version === PROTOCOL_VERSION
      && Object.keys(value).length === 2
      && Object.keys(value.payload).length === 1;
  }

  function messageTypes(direction) {
    var definitions = DIRECTIONS[direction];
    return definitions ? Object.keys(definitions) : [];
  }

  var api = Object.freeze({
    version: PROTOCOL_VERSION,
    validateMessage: validateMessage,
    createMessage: createMessage,
    isReadySignal: isReadySignal,
    handshakeMessage: handshakeMessage,
    isHandshakeMessage: isHandshakeMessage,
    messageTypes: messageTypes
  });

  Object.defineProperty(global, '__coldboxProtocol', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
