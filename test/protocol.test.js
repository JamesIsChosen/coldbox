'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const SAFE_ID = '550e8400-e29b-41d4-a716-446655440000';
const SAFE_FINGERPRINT = 'deadbeef';
const SAFE_XPUB = `xpub${'1'.repeat(107)}`;
const SAFE_ADDRESS = `bc1q${'q'.repeat(56)}`;

function loadProtocol() {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'protocol.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, { window }, { filename: 'src/protocol.js' });
  return window.__coldboxProtocol;
}

function containsSensitiveKey(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const sensitiveKeys = new Set([
    'mnemonic',
    'privateKey',
    'xprv',
    'passphrase',
    'secretCompartment',
    'secretPlaintext',
    'storedSecret',
    'shareMaterial'
  ]);
  if (Object.keys(value).some((key) => sensitiveKeys.has(key))) {
    return true;
  }
  return Object.values(value).some((child) => containsSensitiveKey(child));
}

test('protocol exposes only the documented message whitelist', () => {
  const protocol = loadProtocol();

  assert.deepEqual(Array.from(protocol.messageTypes('warm-to-cold')), [
    'vault.open',
    'vault.create.prepare',
    'vault.saveRequest',
    'vault.lock',
    'panic.hide',
    'mode.set',
    'derive.request',
    'publicData.request',
    'ui.navigate'
  ]);
  assert.deepEqual(Array.from(protocol.messageTypes('cold-to-warm')), [
    'ready',
    'vault.opened',
    'vault.bytes',
    'vault.lockRequest',
    'derive.result',
    'status',
    'error',
    'panic.hide'
  ]);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'unknown-1',
    type: 'secret.export',
    payload: { mnemonic: 'never accepted' }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'unknown-2',
    type: 'private.key',
    payload: { privateKey: 'never accepted' }
  }), null);
});

test('vault creation preparation is strictly payload-free', () => {
  const protocol = loadProtocol();

  const prepared = protocol.validateMessage('warm-to-cold', {
    id: 'create-prepare-1',
    type: 'vault.create.prepare',
    payload: {}
  });
  assert.equal(JSON.stringify(prepared), JSON.stringify({
    id: 'create-prepare-1',
    type: 'vault.create.prepare',
    payload: {}
  }));
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'create-prepare-name',
    type: 'vault.create.prepare',
    payload: { name: 'Warm-only name' }
  }), null);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'create-prepare-secret',
    type: 'vault.create.prepare',
    payload: { passphrase: 'must never cross' }
  }), null);
});

test('cold view navigation is an allowlisted section-only message', () => {
  const protocol = loadProtocol();

  assert.equal(JSON.stringify(protocol.validateMessage('warm-to-cold', {
    id: 'view-entropy',
    type: 'ui.navigate',
    payload: { section: 'entropy', passphrase: 'must never cross' }
  })), JSON.stringify({
    id: 'view-entropy',
    type: 'ui.navigate',
    payload: { section: 'entropy' }
  }));
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'view-secret',
    type: 'ui.navigate',
    payload: { section: 'cold-private-view' }
  }), null);
});


test('cold normal-lock request is strictly payload-free', () => {
  const protocol = loadProtocol();
  const request = protocol.validateMessage('cold-to-warm', {
    id: 'lock-request-1',
    type: 'vault.lockRequest',
    payload: {}
  });
  assert.equal(JSON.stringify(request), JSON.stringify({
    id: 'lock-request-1',
    type: 'vault.lockRequest',
    payload: {}
  }));
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'lock-request-secret',
    type: 'vault.lockRequest',
    payload: { reason: 'user text must not cross' }
  }), null);
});

test('protocol strips unknown fields and preserves only safe values', () => {
  const protocol = loadProtocol();
  const sanitized = protocol.validateMessage('warm-to-cold', {
    id: 'mode-1',
    type: 'mode.set',
    payload: {
      online: true,
      extra: 'discarded',
      passphrase: 'discarded'
    },
    unknownEnvelopeField: 'discarded'
  });

  assert.equal(JSON.stringify(sanitized), JSON.stringify({
    id: 'mode-1',
    type: 'mode.set',
    payload: { online: true }
  }));

  const publicData = protocol.validateMessage('cold-to-warm', {
    id: 'opened-1',
    type: 'vault.opened',
    payload: {
      publicCompartment: {
        id: SAFE_ID,
        wallets: [{ id: SAFE_ID, fingerprint: SAFE_FINGERPRINT, unknownNumber: 7 }],
        unknownCollection: [{ privateKey: 'discarded' }]
      },
      passphrase: 'discarded'
    }
  });

  assert.equal(JSON.stringify(publicData), JSON.stringify({
    id: 'opened-1',
    type: 'vault.opened',
    payload: { publicCompartment: { id: SAFE_ID, wallets: [{ id: SAFE_ID, fingerprint: SAFE_FINGERPRINT }] } }
  }));
  assert.equal(containsSensitiveKey(publicData), false);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'opened-unsafe',
    type: 'vault.opened',
    payload: { publicCompartment: { wallets: [{ label: 'Public' }] } }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'opened-bad-vault-id',
    type: 'vault.opened',
    payload: { publicCompartment: { id: 'device-fingerprint-not-a-uuid', wallets: [] } }
  }), null);
});

test('every cold-to-warm message rejects secret-bearing fields', () => {
  const protocol = loadProtocol();
  const cases = [
    {
      type: 'ready',
      payload: { capabilities: { messageChannel: true, mnemonic: 'discarded' } }
    },
    {
      type: 'vault.opened',
      payload: { publicCompartment: { wallets: [{ id: SAFE_ID }] } }
    },
    {
      type: 'vault.bytes',
      payload: { bytes: new Uint8Array([1, 2, 3]), xprv: 'discarded' }
    },
    {
      type: 'derive.result',
      payload: { addresses: [SAFE_ADDRESS], xpub: SAFE_XPUB, fingerprint: SAFE_FINGERPRINT, privateKey: 'discarded' }
    },
    {
      type: 'status',
      payload: { locked: true, mode: 'cold', warnings: [], secretPlaintext: 'discarded' }
    },
    {
      type: 'error',
      payload: { code: 'operation-failed', message: 'discarded', storedSecret: 'discarded' }
    },
    {
      type: 'panic.hide',
      payload: { secretPlaintext: 'discarded' }
    }
  ];

  for (const item of cases) {
    const result = protocol.validateMessage('cold-to-warm', {
      id: `safe-${item.type}`,
      type: item.type,
      payload: item.payload
    });
    assert.ok(result, `${item.type} should remain valid after stripping unknown fields`);
    assert.equal(containsSensitiveKey(result), false, `${item.type} retained sensitive fields`);
  }
});

test('bootstrap signals and handshake controls are exact and payload-free', () => {
  const protocol = loadProtocol();
  const handshake = protocol.handshakeMessage();

  assert.equal(JSON.stringify(handshake), JSON.stringify({
    type: 'cold.handshake',
    payload: { version: 1 }
  }));
  assert.equal(protocol.isHandshakeMessage(handshake), true);
  assert.equal(protocol.isHandshakeMessage({
    type: 'cold.handshake',
    payload: { version: 1, passphrase: 'discarded' }
  }), false);
  assert.equal(protocol.isReadySignal({ type: 'cold.ready' }), true);
  assert.equal(protocol.isReadySignal({ type: 'cold.ready', mnemonic: 'discarded' }), false);
  assert.equal(protocol.isReadySignal({ type: 'cold.ready', payload: {} }), false);
});

test('public collection allowlist matches the documented data model', () => {
  const protocol = loadProtocol();

  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'collections-1',
    type: 'publicData.request',
    payload: {
      collections: [
        'seeds',
        'wallets',
        'accounts',
        'addresses',
        'notes',
        'devices',
        'transactions',
        'lots',
        'disposals',
        'basisAllocations',
        'prices',
        'backups',
        'contacts',
        'auditLog'
      ]
    }
  })?.payload.collections.length, 14);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'collections-2',
    type: 'publicData.request',
    payload: { collections: ['settings'] }
  }), null);
});

test('recognizable secret content is rejected from allowed public fields', () => {
  const protocol = loadProtocol();
  const xprv = `xprv${'1'.repeat(107)}`;
  const wif = `5${'K'.repeat(50)}`;
  const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  assert.equal(protocol.isSecretContent(xprv), true);
  assert.equal(protocol.isSecretContent(wif), true);
  assert.equal(protocol.isSecretContent(mnemonic), true);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'content-1',
    type: 'derive.result',
    payload: { addresses: [SAFE_ADDRESS], xpub: xprv, fingerprint: SAFE_FINGERPRINT }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'content-2',
    type: 'derive.result',
    payload: { addresses: [wif], xpub: SAFE_XPUB, fingerprint: SAFE_FINGERPRINT }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'content-3',
    type: 'vault.opened',
    payload: { publicCompartment: { notes: [{ notes: mnemonic }] } }
  }), null);
});

test('public projection rejects every free-form text carrier structurally', () => {
  const protocol = loadProtocol();
  const carriers = [
    ['id', 'TREZOR'],
    ['name', 'correct horse battery staple'],
    ['label', 'my secret note from the decrypted compartment'],
    ['tags', ['TREZOR']],
    ['notes', 'my secret note from the decrypted compartment'],
    ['address', 'correct horse battery staple'],
    ['addresses', ['correct horse battery staple']],
    ['chain', 'TREZOR'],
    ['network', 'correct horse battery staple'],
    ['accountRef', 'my secret note from the decrypted compartment'],
    ['scriptType', 'TREZOR'],
    ['fingerprint', 'correct horse battery staple'],
    ['xpub', 'a'.repeat(64)],
    ['location', 'my secret note from the decrypted compartment'],
    ['vendor', 'TREZOR'],
    ['model', 'correct horse battery staple'],
    ['serial', 'my secret note from the decrypted compartment'],
    ['firmware', 'TREZOR'],
    ['lifecycle', 'correct horse battery staple']
  ];

  for (const [field, value] of carriers) {
    assert.equal(protocol.validateMessage('cold-to-warm', {
      id: `carrier-${field}`,
      type: 'vault.opened',
      payload: { publicCompartment: { notes: [{ [field]: value }] } }
    }), null, `${field} remained a free-form cold-to-warm carrier`);
  }
});

test('protocol rejects aggregate payloads above the documented limits', () => {
  const protocol = loadProtocol();
  assert.equal(protocol.limits.maxVaultBytes, 64 * 1024 * 1024);
  assert.equal(protocol.limits.maxPublicPayloadBytes, 4 * 1024 * 1024);

  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'size-1',
    type: 'vault.open',
    payload: { bytes: new Uint8Array(protocol.limits.maxVaultBytes + 1) }
  }), null);

  const oversizedNotes = Array.from({ length: 10000 }, () => ({ notes: 'x'.repeat(512) }));
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'size-2',
    type: 'vault.opened',
    payload: { publicCompartment: { notes: oversizedNotes } }
  }), null);
});

test('airgap capabilities and runtime violation status use the typed schema', () => {
  const protocol = loadProtocol();
  const ready = protocol.validateMessage('cold-to-warm', {
    id: 'airgap-ready-1',
    type: 'ready',
    payload: {
      capabilities: {
        messageChannel: true,
        cryptoSubtle: false,
        wasm: true,
        workers: false,
        opaqueOrigin: true,
        cspCanary: true,
        runtimeNeutering: true,
        randomValues: true,
        camera: true,
        fileSystemAccess: false,
        blobDownload: true,
        manualExport: true,
        unknown: 'discarded'
      }
    }
  });
  assert.equal(JSON.stringify(ready), JSON.stringify({
    id: 'airgap-ready-1',
    type: 'ready',
    payload: {
      capabilities: {
        messageChannel: true,
        cryptoSubtle: false,
        wasm: true,
        workers: false,
        opaqueOrigin: true,
        cspCanary: true,
        runtimeNeutering: true,
        randomValues: true,
        camera: true,
        fileSystemAccess: false,
        blobDownload: true,
        manualExport: true
      }
    }
  }));

  const cryptoReady = protocol.validateMessage('cold-to-warm', {
    id: 'crypto-ready-1',
    type: 'ready',
    payload: {
      capabilities: {
        nobleAesGcm: true,
        argon2id: true,
        webCryptoKat: true,
        kdfActive: 'argon2id-standard',
        unknownKdf: 'discarded'
      }
    }
  });
  assert.equal(JSON.stringify(cryptoReady.payload.capabilities), JSON.stringify({
    nobleAesGcm: true,
    argon2id: true,
    webCryptoKat: true,
    kdfActive: 'argon2id-standard'
  }));

  const violation = protocol.validateMessage('cold-to-warm', {
    id: 'airgap-violation-1',
    type: 'status',
    payload: {
      locked: true,
      mode: 'cold',
      warnings: ['airgap-violation']
    }
  });
  assert.ok(violation);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'airgap-violation-2',
    type: 'status',
    payload: {
      locked: true,
      mode: 'cold',
      warnings: ['network-leak']
    }
  }), null);
});
