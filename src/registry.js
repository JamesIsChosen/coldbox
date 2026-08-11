(function (global) {
  'use strict';

  var protocol = global.__coldboxProtocol;
  var COLLECTIONS = Object.freeze(['wallets', 'accounts', 'addresses']);
  var REQUIRED_FIELDS = Object.freeze({
    wallets: Object.freeze(['id']),
    accounts: Object.freeze(['id', 'walletId']),
    addresses: Object.freeze(['id', 'accountId', 'index', 'address'])
  });
  var ALLOWED_FIELDS = Object.freeze({
    wallets: Object.freeze([
      'id', 'label', 'seedId', 'fingerprint', 'type', 'network', 'scriptType',
      'primaryPath', 'xpubs', 'deviceIds', 'status', 'notes', 'tags', 'hidden'
    ]),
    accounts: Object.freeze([
      'id', 'walletId', 'asset', 'path', 'xpub', 'label', 'notes', 'tags', 'hidden'
    ]),
    addresses: Object.freeze([
      'id', 'accountId', 'index', 'address', 'label', 'isChange', 'used',
      'balanceSnapshot', 'notes', 'tags', 'hidden'
    ])
  });
  var RELATION_PLACEHOLDER_ID = '550e8400-e29b-41d4-a716-446655440000';

  if (!protocol || typeof protocol.validateMessage !== 'function'
    || typeof protocol.isSecretContent !== 'function') {
    throw new Error('The public registry requires the validated protocol.');
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function isRecord(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      throw new Error('The public registry contains an unserializable value.');
    }
  }

  function secureUuid() {
    if (!global.crypto || typeof global.crypto.getRandomValues !== 'function') {
      throw new Error('Secure randomness is unavailable for registry IDs.');
    }
    var bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);
    try {
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = Array.prototype.map.call(bytes, function (value) {
        return value.toString(16).padStart(2, '0');
      }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-'
        + hex.slice(16, 20) + '-' + hex.slice(20);
    } finally {
      bytes.fill(0);
    }
  }

  function validateCompartment(value) {
    var message = protocol.validateMessage('cold-to-warm', {
      id: 'registry-store-validation',
      type: 'vault.opened',
      payload: { publicCompartment: value }
    });
    if (!message) {
      throw new Error('The public registry rejected the record.');
    }
    return clone(message.payload.publicCompartment);
  }

  function emptyCollections(value) {
    COLLECTIONS.forEach(function (collection) {
      if (!hasOwn(value, collection)) {
        value[collection] = [];
      }
    });
    return value;
  }

  function findInCollection(value, collection, id) {
    return Array.isArray(value[collection]) && value[collection].some(function (record) {
      return isRecord(record) && record.id === id;
    });
  }

  function validateRelationships(value) {
    if (Array.isArray(value.accounts) && value.accounts.some(function (account) {
      return !isRecord(account) || !findInCollection(value, 'wallets', account.walletId);
    })) {
      throw new Error('The registry relationship does not exist in the public compartment.');
    }
    if (Array.isArray(value.addresses) && value.addresses.some(function (address) {
      return !isRecord(address) || !findInCollection(value, 'accounts', address.accountId);
    })) {
      throw new Error('The registry relationship does not exist in the public compartment.');
    }
  }

  function checkAllowedFields(value, collection) {
    if (!isRecord(value)) {
      throw new Error('A registry record must be an object.');
    }
    var allowed = ALLOWED_FIELDS[collection];
    Object.keys(value).forEach(function (key) {
      if (allowed.indexOf(key) === -1) {
        throw new Error('The registry field is not supported.');
      }
    });
  }

  function validateClearFields(collection, clearFields) {
    if (clearFields === undefined) {
      return [];
    }
    if (!Array.isArray(clearFields)) {
      throw new Error('Registry clearFields must be an array.');
    }
    var allowed = ALLOWED_FIELDS[collection];
    var required = REQUIRED_FIELDS[collection];
    var seen = Object.create(null);
    return clearFields.map(function (field) {
      if (typeof field !== 'string' || allowed.indexOf(field) === -1
        || required.indexOf(field) !== -1 || seen[field]) {
        throw new Error('The registry field cannot be cleared.');
      }
      seen[field] = true;
      return field;
    });
  }

  function clearFieldsForUpdate(collection, options) {
    if (options === undefined) {
      return [];
    }
    if (!isRecord(options) || Object.keys(options).some(function (key) {
      return key !== 'clearFields';
    })) {
      throw new Error('Registry update options are not supported.');
    }
    return validateClearFields(collection, options.clearFields);
  }

  function prepareRecord(collection, value, existing, clearFields) {
    var source = value || {};
    var fieldsToClear = clearFields || [];
    checkAllowedFields(source, collection);
    var candidate = existing ? clone(existing) : {};
    Object.keys(source).forEach(function (key) {
      candidate[key] = source[key];
    });
    fieldsToClear.forEach(function (field) {
      delete candidate[field];
    });
    if (!hasOwn(candidate, 'id')) {
      candidate.id = secureUuid();
    }
    var compartment = {};
    compartment[collection] = [candidate];
    if (collection === 'accounts') {
      compartment.wallets = [{ id: candidate.walletId }];
    } else if (collection === 'addresses') {
      compartment.wallets = [{ id: RELATION_PLACEHOLDER_ID }];
      compartment.accounts = [{ id: candidate.accountId, walletId: RELATION_PLACEHOLDER_ID }];
    }
    var clean = validateCompartment(compartment);
    var record = clean[collection][0];
    REQUIRED_FIELDS[collection].forEach(function (field) {
      if (!hasOwn(record, field)) {
        throw new Error('The registry record is missing a required field.');
      }
    });
    return record;
  }

  function findRecord(state, collection, id) {
    return state[collection].filter(function (record) {
      return record.id === id;
    })[0] || null;
  }

  function requireRelation(state, collection, id) {
    if (!findRecord(state, collection, id)) {
      throw new Error('The registry relationship does not exist.');
    }
  }

  function createStore(publicCompartment) {
    var source = publicCompartment || {};
    validateRelationships(source);
    var state = emptyCollections(validateCompartment(source));
    validateRelationships(state);
    var vaultId = state.id;

    function replace(nextCompartment) {
      var source = nextCompartment || {};
      validateRelationships(source);
      var next = emptyCollections(validateCompartment(source));
      validateRelationships(next);
      if (vaultId !== undefined || next.id !== undefined) {
        if (vaultId !== next.id) {
          throw new Error('The registry cannot change the authenticated Vault ID.');
        }
      }
      state = next;
      return snapshot();
    }

    function snapshot() {
      return clone(state);
    }

    function list(collection, includeHidden) {
      if (COLLECTIONS.indexOf(collection) === -1) {
        throw new Error('The registry collection is not supported.');
      }
      return state[collection]
        .filter(function (record) { return includeHidden === true || record.hidden !== true; })
        .map(clone);
    }

    function find(collection, id) {
      if (COLLECTIONS.indexOf(collection) === -1) {
        throw new Error('The registry collection is not supported.');
      }
      var record = findRecord(state, collection, id);
      return record ? clone(record) : null;
    }

    function counts() {
      var result = {};
      COLLECTIONS.forEach(function (collection) {
        result[collection] = list(collection).length;
      });
      return result;
    }

    function insert(collection, value) {
      var record = prepareRecord(collection, value);
      if (findRecord(state, collection, record.id)) {
        throw new Error('The registry ID is already in use.');
      }
      if (collection === 'accounts') {
        requireRelation(state, 'wallets', record.walletId);
      }
      if (collection === 'addresses') {
        requireRelation(state, 'accounts', record.accountId);
      }
      state[collection].push(record);
      return clone(record);
    }

    function update(collection, id, patch, options) {
      var existing = findRecord(state, collection, id);
      if (!existing) {
        throw new Error('The registry record was not found.');
      }
      var record = prepareRecord(collection, patch, existing, clearFieldsForUpdate(collection, options));
      if (record.id !== id) {
        throw new Error('The registry ID cannot change.');
      }
      if (collection === 'accounts') {
        requireRelation(state, 'wallets', record.walletId);
      }
      if (collection === 'addresses') {
        requireRelation(state, 'accounts', record.accountId);
      }
      state[collection][state[collection].indexOf(existing)] = record;
      return clone(record);
    }

    function softDelete(collection, id) {
      return update(collection, id, { hidden: true });
    }

    return Object.freeze({
      replace: replace,
      snapshot: snapshot,
      list: list,
      find: find,
      counts: counts,
      createWallet: function (value) { return insert('wallets', value); },
      updateWallet: function (id, value, options) { return update('wallets', id, value, options); },
      deleteWallet: function (id) { return softDelete('wallets', id); },
      createAccount: function (value) { return insert('accounts', value); },
      updateAccount: function (id, value, options) { return update('accounts', id, value, options); },
      deleteAccount: function (id) { return softDelete('accounts', id); },
      createAddress: function (value) { return insert('addresses', value); },
      updateAddress: function (id, value, options) { return update('addresses', id, value, options); },
      deleteAddress: function (id) { return softDelete('addresses', id); }
    });
  }

  Object.defineProperty(global, '__coldboxRegistry', {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ createStore: createStore, secureUuid: secureUuid }),
    writable: false
  });
}(window));
