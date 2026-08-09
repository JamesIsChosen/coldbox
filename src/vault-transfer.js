(function (global) {
  'use strict';

  // Warm-shell-only framing for live Coldbox-to-Coldbox vault transfer.
  // The payload is already-encrypted .cbx bytes encoded as base64. Nothing in
  // this module handles plaintext vault records or secret material.
  // Frames are ephemeral presentation/transport data; .cbx remains the only
  // durable vault file format.

  var VERSION = 1;
  var PREFIX = 'CBX-VT/' + String(VERSION) + '/';
  var DEFAULT_PAYLOAD_LENGTH = 650;
  var MAX_FRAMES = 4096;
  var TRANSFER_ID_PATTERN = /^[0-9a-f]{32}$/i;
  var VAULT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var HASH_PATTERN = /^[0-9a-f]{64}$/i;
  var BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

  function cleanName(value) {
    if (typeof value !== 'string') {
      return null;
    }
    var trimmed = value.trim();
    return trimmed && trimmed.length <= 80 ? trimmed : null;
  }

  function encodeName(value) {
    var name = cleanName(value);
    return name ? encodeURIComponent(name) : null;
  }

  function decodeName(value) {
    try {
      return cleanName(decodeURIComponent(value));
    } catch (error) {
      return null;
    }
  }

  function cleanTotal(value) {
    return Number.isSafeInteger(value) && value >= 1 && value <= MAX_FRAMES ? value : null;
  }

  function cleanBase64(value) {
    if (typeof value !== 'string') {
      return null;
    }
    var normalized = value.replace(/\s+/g, '');
    return normalized && normalized.length % 4 === 0 && BASE64_PATTERN.test(normalized)
      ? normalized
      : null;
  }

  function createFrames(base64, metadata) {
    var payload = cleanBase64(base64);
    var meta = metadata || {};
    var transferId = typeof meta.transferId === 'string' && TRANSFER_ID_PATTERN.test(meta.transferId)
      ? meta.transferId.toLowerCase()
      : null;
    var vaultId = typeof meta.vaultId === 'string' && VAULT_UUID_PATTERN.test(meta.vaultId)
      ? meta.vaultId.toLowerCase()
      : null;
    var hash = typeof meta.hash === 'string' && HASH_PATTERN.test(meta.hash)
      ? meta.hash.toLowerCase()
      : null;
    var encodedName = encodeName(meta.name);
    var payloadLength = Number.isSafeInteger(meta.payloadLength) && meta.payloadLength >= 128 && meta.payloadLength <= 900
      ? meta.payloadLength
      : DEFAULT_PAYLOAD_LENGTH;
    if (!payload || !transferId || !vaultId || !hash || !encodedName) {
      throw new Error('Invalid live vault transfer metadata.');
    }
    var total = Math.ceil(payload.length / payloadLength);
    if (!cleanTotal(total)) {
      throw new Error('Vault is too large for live QR transfer. Use the canonical .cbx file instead.');
    }
    var frames = [
      PREFIX + 'M/' + transferId + '/' + vaultId + '/' + String(total) + '/' + hash + '/' + encodedName
    ];
    for (var index = 0; index < total; index += 1) {
      frames.push(
        PREFIX + 'D/' + transferId + '/' + String(index + 1) + '/' + String(total) + '/'
          + payload.slice(index * payloadLength, (index + 1) * payloadLength)
      );
    }
    return Object.freeze(frames);
  }

  function parseFrame(value) {
    if (typeof value !== 'string' || value.length > 2048) {
      return null;
    }
    var manifest = /^CBX-VT\/1\/M\/([0-9a-f]{32})\/([0-9a-f-]{36})\/(\d{1,4})\/([0-9a-f]{64})\/([^/]+)$/i.exec(value);
    if (manifest) {
      var manifestTotal = cleanTotal(Number(manifest[3]));
      var manifestName = decodeName(manifest[5]);
      if (!TRANSFER_ID_PATTERN.test(manifest[1])
        || !VAULT_UUID_PATTERN.test(manifest[2])
        || !manifestTotal
        || !HASH_PATTERN.test(manifest[4])
        || !manifestName) {
        return null;
      }
      return Object.freeze({
        kind: 'manifest',
        transferId: manifest[1].toLowerCase(),
        vaultId: manifest[2].toLowerCase(),
        total: manifestTotal,
        hash: manifest[4].toLowerCase(),
        name: manifestName
      });
    }
    var data = /^CBX-VT\/1\/D\/([0-9a-f]{32})\/(\d{1,4})\/(\d{1,4})\/([A-Za-z0-9+/=]+)$/i.exec(value);
    if (!data) {
      return null;
    }
    var index = Number(data[2]);
    var total = cleanTotal(Number(data[3]));
    if (!TRANSFER_ID_PATTERN.test(data[1])
      || !total
      || !Number.isSafeInteger(index)
      || index < 1
      || index > total
      || data[4].length > 900
      || !BASE64_PATTERN.test(data[4])) {
      return null;
    }
    return Object.freeze({
      kind: 'data',
      transferId: data[1].toLowerCase(),
      index: index,
      total: total,
      chunk: data[4]
    });
  }

  function createCollector() {
    return {
      transferId: null,
      vaultId: null,
      name: null,
      total: null,
      hash: null,
      chunks: [],
      received: 0
    };
  }

  function collectorProgress(state) {
    var total = state && cleanTotal(state.total) ? state.total : null;
    var received = state && Number.isSafeInteger(state.received) && state.received >= 0 ? state.received : 0;
    return Object.freeze({
      transferId: state && state.transferId ? state.transferId : null,
      received: received,
      total: total,
      hasManifest: Boolean(state && state.vaultId && state.hash && state.name),
      complete: Boolean(total && state && state.vaultId && state.hash && state.name && received === total)
    });
  }

  function acceptFrame(state, value) {
    if (!state || typeof state !== 'object') {
      throw new Error('Missing transfer collector.');
    }
    var frame = parseFrame(value);
    if (!frame) {
      return Object.freeze({ accepted: false, reason: 'invalid', progress: collectorProgress(state) });
    }
    if (state.transferId && state.transferId !== frame.transferId) {
      return Object.freeze({ accepted: false, reason: 'foreign-transfer', progress: collectorProgress(state) });
    }
    if (!state.transferId) {
      state.transferId = frame.transferId;
    }
    if (frame.kind === 'manifest') {
      if ((state.total !== null && state.total !== frame.total)
        || (state.vaultId && state.vaultId !== frame.vaultId)
        || (state.hash && state.hash !== frame.hash)
        || (state.name && state.name !== frame.name)) {
        return Object.freeze({ accepted: false, reason: 'conflict', progress: collectorProgress(state) });
      }
      state.total = frame.total;
      state.vaultId = frame.vaultId;
      state.hash = frame.hash;
      state.name = frame.name;
      return Object.freeze({ accepted: true, reason: 'manifest', progress: collectorProgress(state) });
    }
    if (state.total !== null && state.total !== frame.total) {
      return Object.freeze({ accepted: false, reason: 'conflict', progress: collectorProgress(state) });
    }
    state.total = frame.total;
    if (state.chunks[frame.index - 1]) {
      return Object.freeze({ accepted: false, reason: 'duplicate', progress: collectorProgress(state) });
    }
    state.chunks[frame.index - 1] = frame.chunk;
    state.received += 1;
    return Object.freeze({ accepted: true, reason: 'data', progress: collectorProgress(state) });
  }

  function assemble(state) {
    var progress = collectorProgress(state);
    if (!progress.complete) {
      throw new Error('Live vault transfer is incomplete.');
    }
    var chunks = [];
    for (var index = 0; index < state.total; index += 1) {
      if (!state.chunks[index]) {
        throw new Error('Live vault transfer is incomplete.');
      }
      chunks.push(state.chunks[index]);
    }
    var base64 = chunks.join('');
    if (!cleanBase64(base64)) {
      throw new Error('Live vault transfer payload is invalid.');
    }
    return Object.freeze({
      base64: base64,
      transferId: state.transferId,
      vaultId: state.vaultId,
      name: state.name,
      hash: state.hash
    });
  }

  var api = Object.freeze({
    version: VERSION,
    prefix: PREFIX,
    defaultPayloadLength: DEFAULT_PAYLOAD_LENGTH,
    maxFrames: MAX_FRAMES,
    createFrames: createFrames,
    parseFrame: parseFrame,
    createCollector: createCollector,
    acceptFrame: acceptFrame,
    collectorProgress: collectorProgress,
    assemble: assemble
  });

  Object.defineProperty(global, '__coldboxLiveTransfer', {
    configurable: false,
    enumerable: false,
    value: api,
    writable: false
  });
}(window));
