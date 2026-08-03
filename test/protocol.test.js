'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

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
    'vault.saveRequest',
    'vault.lock',
    'mode.set',
    'derive.request',
    'publicData.request',
    'ui.navigate'
  ]);
  assert.deepEqual(Array.from(protocol.messageTypes('cold-to-warm')), [
    'ready',
    'vault.opened',
    'vault.bytes',
    'derive.result',
    'status',
    'error'
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
        wallets: [{ id: 'wallet-1', label: 'Public', mnemonic: 'discarded' }],
        secretCompartment: 'discarded',
        unknownCollection: [{ privateKey: 'discarded' }]
      },
      passphrase: 'discarded'
    }
  });

  assert.equal(JSON.stringify(publicData), JSON.stringify({
    id: 'opened-1',
    type: 'vault.opened',
    payload: { publicCompartment: { wallets: [{ id: 'wallet-1', label: 'Public' }] } }
  }));
  assert.equal(containsSensitiveKey(publicData), false);
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
      payload: { publicCompartment: { notes: [{ passphrase: 'discarded' }] } }
    },
    {
      type: 'vault.bytes',
      payload: { bytes: new Uint8Array([1, 2, 3]), xprv: 'discarded' }
    },
    {
      type: 'derive.result',
      payload: { addresses: ['bc1public'], xpub: 'xpub-public', fingerprint: '1234', privateKey: 'discarded' }
    },
    {
      type: 'status',
      payload: { locked: true, mode: 'cold', warnings: [], secretPlaintext: 'discarded' }
    },
    {
      type: 'error',
      payload: { code: 'operation-failed', message: 'discarded', storedSecret: 'discarded' }
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
