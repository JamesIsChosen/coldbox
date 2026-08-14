'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const slip39Source = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'slip39.js'), 'utf8');
const SAFE_ID = '550e8400-e29b-41d4-a716-446655440000';
const SAFE_FINGERPRINT = 'deadbeef';
const SAFE_XPUB = `xpub${'1'.repeat(107)}`;
const SAFE_ADDRESS = `bc1q${'q'.repeat(56)}`;
// Independent public fixtures. These are the same published vectors used by
// the cold combiners; they are boundary probes only and are never logged.
const OFFICIAL_SLIP39_20 = 'duckling enlarge academic academic agency result length solution fridge kidney coal piece deal husband erode duke ajar critical decision keyboard';
const OFFICIAL_SLIP39_20_OMITTED_WORD = 'enemy favorite academic acid cowboy phrase havoc level response walnut budget painting inside trash adjust froth kitchen learn tidy punish';
const OFFICIAL_SLIP39_33 = 'western apart academic always artist resident briefing sugar woman oven coding club ajar merit pecan answer prisoner artist fraction amount desktop mild false necklace muscle photo wealthy alpha category unwrap spew losing making';
const OFFICIAL_CODEX32 = 'MS12NAMEA320ZYXWVUTSRQPNMLKJHGFEDCAXRPP870HKKQRM';
const OFFICIAL_SHAMIR39 = 'shamir39-p1 army abandon ability abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const OFFICIAL_RAW_SSS = '80111001e523b02029c58aceebead70329000';
const OFFICIAL_SEED_XOR = 'romance wink lottery autumn shop bring dawn tongue range crater truth ability miss spice fitness easy legal release recall obey exchange recycle dragon room';

function loadProtocol() {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'protocol.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, { window }, { filename: 'src/protocol.js' });
  return window.__coldboxProtocol;
}

function loadPublicSlip39WordList() {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'protocol.js'), 'utf8');
  const startMarker = 'var SLIP39_WORD_SET = makeSet(';
  const endMarker = '.split(/\\s+/));';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, 'public SLIP-39 word set was not found');
  assert.notEqual(end, -1, 'public SLIP-39 word set terminator was not found');
  const expression = source.slice(start + startMarker.length, end);
  return vm.runInNewContext(expression).trim().split(/\s+/);
}

function loadCanonicalSlip39WordList() {
  const context = {
    ArrayBuffer,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    WebAssembly,
    atob,
    crypto: crypto.webcrypto,
    console
  };
  context.window = context;
  context.self = context;
  vm.runInNewContext(createCryptoVendorSource(projectRoot), context);
  vm.runInNewContext(slip39Source, context, { filename: 'src/cold/slip39.js' });
  return Array.from(context.__coldboxSlip39.wordList);
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
    'address.verifyRequest',
    'backup.verifyRequest',
    'publicData.request',
    'publicData.replace',
    'concealment.reveal',
    'ui.navigate'
  ]);
  assert.deepEqual(Array.from(protocol.messageTypes('cold-to-warm')), [
    'ready',
    'vault.opened',
    'vault.bytes',
    'vault.lockRequest',
    'derive.result',
    'address.verifyResult',
    'backup.verifyResult',
    'publicData.updated',
    'concealment.revealed',
    'secretData.updated',
    'vault.dirty',
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
    payload: { publicCompartment: { schema: 2, id: SAFE_ID, wallets: [{ id: SAFE_ID, fingerprint: SAFE_FINGERPRINT }] } }
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
      type: 'vault.dirty',
      payload: { dirty: true, shareMaterial: ['discarded'] }
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

test('registry records use collection-specific public schemas for both write and acknowledgement', () => {
  const protocol = loadProtocol();
  const walletId = SAFE_ID;
  const accountId = '550e8400-e29b-41d4-a716-446655440001';
  const addressId = '550e8400-e29b-41d4-a716-446655440002';
  const publicCompartment = {
    id: SAFE_ID,
    wallets: [{
      id: walletId,
      label: 'Cold wallet',
      network: 'bitcoin',
      scriptType: 'p2wpkh',
      xpubs: [SAFE_XPUB],
      tags: ['savings'],
      hidden: false,
      unknownNumber: 7
    }],
    accounts: [{
      id: accountId,
      walletId,
      asset: 'BTC',
      path: "m/84'/0'/0'",
      label: 'Savings account'
    }],
    addresses: [{
      id: addressId,
      accountId,
      index: 0,
      address: SAFE_ADDRESS,
      isChange: false,
      used: false,
      balanceSnapshot: {
        amount: 1.25,
        asOf: '2026-08-10T12:00:00.000Z',
        source: 'manual'
      }
    }]
  };
  const written = protocol.validateMessage('warm-to-cold', {
    id: 'registry-write-1',
    type: 'publicData.replace',
    payload: { publicCompartment }
  });
  assert.equal(written.payload.publicCompartment.wallets[0].unknownNumber, undefined);
  assert.equal(written.payload.publicCompartment.accounts[0].walletId, walletId);
  assert.equal(written.payload.publicCompartment.addresses[0].balanceSnapshot.source, 'manual');
  assert.equal(
    JSON.stringify(protocol.validateMessage('cold-to-warm', {
      id: 'registry-write-1',
      type: 'publicData.updated',
      payload: { publicCompartment: written.payload.publicCompartment }
    })),
    JSON.stringify({
      id: 'registry-write-1',
      type: 'publicData.updated',
      payload: { publicCompartment: written.payload.publicCompartment }
    })
  );
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'registry-secret-1',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        wallets: [{ id: walletId, label: 'public', xprv: 'must not cross' }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'registry-unknown-text',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        wallets: [{ id: walletId, arbitraryText: 'must not cross' }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'registry-bad-date',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        addresses: [{
          id: addressId,
          accountId,
          index: 0,
          address: SAFE_ADDRESS,
          balanceSnapshot: { amount: 1, asOf: 'not-a-date', source: 'manual' }
        }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'registry-orphan-account',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        accounts: [{ id: accountId, walletId: '550e8400-e29b-41d4-a716-446655440009' }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'registry-orphan-address',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        addresses: [{ id: addressId, accountId: '550e8400-e29b-41d4-a716-446655440009', index: 0, address: SAFE_ADDRESS }]
      }
    }
  }), null);
});

test('public schema projection defaults legacy address verification without inferring it', () => {
  const protocol = loadProtocol();
  const legacy = protocol.validateMessage('warm-to-cold', {
    id: 'legacy-public-schema',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        schema: 1,
        wallets: [{ id: '550e8400-e29b-41d4-a716-446655440003' }],
        accounts: [{
          id: '550e8400-e29b-41d4-a716-446655440001',
          walletId: '550e8400-e29b-41d4-a716-446655440003'
        }],
        addresses: [{
          id: SAFE_ID,
          accountId: '550e8400-e29b-41d4-a716-446655440001',
          index: 0,
          address: SAFE_ADDRESS
        }]
      }
    }
  });
  assert.ok(legacy);
  assert.equal(legacy.payload.publicCompartment.schema, 2);
  assert.equal(legacy.payload.publicCompartment.addresses[0].addressOrigin, 'manual');
  assert.equal(legacy.payload.publicCompartment.addresses[0].verificationState, 'unverified');
  assert.equal('lastColdVerifiedAt' in legacy.payload.publicCompartment.addresses[0], false);
  assert.equal('verifiedAgainstXpub' in legacy.payload.publicCompartment.addresses[0], false);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'future-public-schema',
    type: 'publicData.replace',
    payload: { publicCompartment: { schema: 3 } }
  }), null);
});

test('cold acknowledgements accept only the documented address verification state model', () => {
  const protocol = loadProtocol();
  const result = protocol.validateMessage('cold-to-warm', {
    id: 'verified-address-schema',
    type: 'publicData.updated',
    payload: {
      publicCompartment: {
        wallets: [{ id: '550e8400-e29b-41d4-a716-446655440003' }],
        accounts: [{
          id: '550e8400-e29b-41d4-a716-446655440001',
          walletId: '550e8400-e29b-41d4-a716-446655440003'
        }],
        addresses: [{
          id: SAFE_ID,
          accountId: '550e8400-e29b-41d4-a716-446655440001',
          index: 0,
          address: SAFE_ADDRESS,
          addressOrigin: 'derived',
          verificationState: 'cold-verified',
          lastColdVerifiedAt: '2026-08-10T12:00:00.000Z',
          verifiedAgainstXpub: SAFE_XPUB
        }]
      }
    }
  });
  assert.equal(result.payload.publicCompartment.addresses[0].verificationState, 'cold-verified');
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'invalid-address-state',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        addresses: [{
          id: SAFE_ID,
          accountId: '550e8400-e29b-41d4-a716-446655440001',
          index: 0,
          address: SAFE_ADDRESS,
          verificationState: 'verified'
        }]
      }
    }
  }), null);
});

test('address verification messages carry enum fields only', () => {
  const protocol = loadProtocol();
  const addressId = SAFE_ID;
  const accountId = '550e8400-e29b-41d4-a716-446655440001';
  const request = protocol.validateMessage('warm-to-cold', {
    id: 'address-request-1',
    type: 'address.verifyRequest',
    payload: { addressId, accountRef: accountId, index: 0, candidate: SAFE_ADDRESS, note: 'discarded prose' }
  });
  assert.equal(JSON.stringify(request.payload), JSON.stringify({ addressId, accountRef: accountId, index: 0, candidate: SAFE_ADDRESS }));
  const whitespaceRequest = protocol.validateMessage('warm-to-cold', {
    id: 'address-request-whitespace',
    type: 'address.verifyRequest',
    payload: { addressId, accountRef: accountId, index: 0, candidate: ` ${SAFE_ADDRESS} ` }
  });
  assert.equal(whitespaceRequest.payload.candidate, ` ${SAFE_ADDRESS} `);
  const result = protocol.validateMessage('cold-to-warm', {
    id: 'address-result-1',
    type: 'address.verifyResult',
    payload: {
      addressId,
      outcome: 'mismatch',
      divergenceIndex: 12,
      verificationState: 'unverified',
      reason: 'free-form text must not cross'
    }
  });
  assert.equal(result.payload.reason, undefined);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'address-result-bad',
    type: 'address.verifyResult',
    payload: { addressId, outcome: 'no-match', verificationState: 'unverified' }
  }), null);
});

test('public notes are bounded, public-only records with canonical tags', () => {
  const protocol = loadProtocol();
  const noteId = '550e8400-e29b-41d4-a716-446655440003';
  const result = protocol.validateMessage('warm-to-cold', {
    id: 'public-note-1',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        notes: [{
          id: noteId,
          title: 'Exchange receive note',
          body: 'This account receives withdrawals.',
          visibility: 'public',
          tags: ['#Coinbase', 'taxlot-2024', 'coinbase'],
          linkedIds: []
        }]
      }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.payload.publicCompartment.notes[0])), {
    id: noteId,
    title: 'Exchange receive note',
    body: 'This account receives withdrawals.',
    visibility: 'public',
    tags: ['coinbase', 'taxlot-2024'],
    linkedIds: []
  });
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'secret-note-1',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        notes: [{
          id: noteId,
          title: 'Secret',
          body: 'passphrase hint is the street we grew up on',
          visibility: 'secret'
        }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'reveal-1',
    type: 'concealment.revealed',
    payload: { revealed: true, phrase: 'discarded' }
  }).payload.revealed, true);
});

test('device records accept bounded lifecycle fields and reject unsafe shapes', () => {
  const protocol = loadProtocol();
  const deviceId = '550e8400-e29b-41d4-a716-446655440004';
  const device = protocol.validateMessage('warm-to-cold', {
    id: 'device-write-1',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        devices: [{
          id: deviceId,
          vendor: 'Trezor',
          model: 'Safe 5',
          serial: 'TS5-001',
          firmware: '2.8.1',
          firmwareDate: '2026-08-10T00:00:00.000Z',
          purchasedFrom: 'Authorized retailer',
          purchasedAt: '2026-08-10T00:00:00.000Z',
          tamperCheckPassed: true,
          tamperCheckNotes: 'Seal matched.',
          pinSetAt: '2026-08-10T00:00:00.000Z',
          pinChangedAt: '2026-08-10T00:00:00.000Z',
          passphraseUsed: true,
          seedFingerprints: [SAFE_FINGERPRINT],
          location: 'Home safe',
          status: 'in-use',
          notes: 'Primary device.',
          hidden: false,
          unknownNumber: 7
        }]
      }
    }
  });
  assert.ok(device);
  assert.equal(device.payload.publicCompartment.devices[0].unknownNumber, undefined);
  assert.equal(device.payload.publicCompartment.devices[0].seedFingerprints[0], SAFE_FINGERPRINT);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'device-bad-status',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        devices: [{ id: deviceId, vendor: 'Trezor', model: 'Safe 5', firmware: '2.8.1', status: 'active' }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'device-bad-date',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        devices: [{ id: deviceId, vendor: 'Trezor', model: 'Safe 5', firmware: '2.8.1', firmwareDate: 'not-a-date', status: 'in-use' }]
      }
    }
  }), null);
});

test('BackupRecords are public metadata and verification results carry no share material', () => {
  const protocol = loadProtocol();
  const backupId = SAFE_ID;
  const subjectId = '550e8400-e29b-41d4-a716-446655440001';
  const backup = {
    id: backupId,
    subjectId,
    method: 'slip39',
    shareLabel: 'Home safe set',
    threshold: 2,
    groupConfig: { groups: [{ threshold: 2, count: 3 }] },
    location: 'Home safe',
    custodian: 'Owner',
    createdAt: '2026-08-13T00:00:00.000Z',
    verifyEveryDays: 365,
    hidden: false
  };
  const publicMessage = protocol.validateMessage('warm-to-cold', {
    id: 'backup-write-1',
    type: 'publicData.replace',
    payload: { publicCompartment: { backups: [backup] } }
  });
  assert.ok(publicMessage);
  assert.equal(
    JSON.stringify(publicMessage.payload.publicCompartment.backups[0]),
    JSON.stringify(backup)
  );
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'backup-secret-1',
    type: 'publicData.replace',
    payload: { publicCompartment: { backups: [{ ...backup, shareMaterial: ['secret'] }] } }
  }), null);
  assert.equal(JSON.stringify(protocol.validateMessage('warm-to-cold', {
    id: 'backup-request-1',
    type: 'backup.verifyRequest',
    payload: { backupId, shareMaterial: ['never accepted'] }
  })?.payload), JSON.stringify({ backupId }));
  assert.equal(JSON.stringify(protocol.validateMessage('cold-to-warm', {
    id: 'backup-result-1',
    type: 'backup.verifyResult',
    payload: {
      backupId,
      outcome: 'verified',
      verifiedAt: '2026-08-13T12:00:00.000Z',
      shares: ['never accepted'],
      reason: 'never accepted'
    }
  })?.payload), JSON.stringify({ backupId, outcome: 'verified', verifiedAt: '2026-08-13T12:00:00.000Z' }));
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'backup-result-invalid-timestamp',
    type: 'backup.verifyResult',
    payload: { backupId, outcome: 'verified' }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'backup-result-forged-timestamp',
    type: 'backup.verifyResult',
    payload: { backupId, outcome: 'invalid', verifiedAt: '2026-08-13T12:00:00.000Z' }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'backup-result-invalid-outcome',
    type: 'backup.verifyResult',
    payload: { backupId, outcome: 'completed', verifiedAt: '2026-08-13T12:00:00.000Z' }
  }), null);
});

test('public SLIP-39 guard mechanically covers the canonical 1024-word list', () => {
  const protocol = loadProtocol();
  const canonicalWords = loadCanonicalSlip39WordList();
  const publicWords = loadPublicSlip39WordList();
  assert.equal(canonicalWords.length, 1024);
  assert.equal(new Set(canonicalWords).size, 1024);
  assert.deepEqual(publicWords, canonicalWords);
  assert.equal(protocol.isSecretContent(OFFICIAL_SLIP39_20_OMITTED_WORD), true);
});

test('public BackupRecord text rejects every supported share encoding in both directions', () => {
  const protocol = loadProtocol();
  const subjectId = '550e8400-e29b-41d4-a716-446655440001';
  const shares = [
    OFFICIAL_SLIP39_20,
    OFFICIAL_SLIP39_20_OMITTED_WORD,
    OFFICIAL_SLIP39_33,
    OFFICIAL_CODEX32,
    OFFICIAL_SHAMIR39,
    OFFICIAL_RAW_SSS,
    OFFICIAL_SEED_XOR
  ];
  const textFields = ['shareLabel', 'location', 'custodian', 'notes'];

  shares.forEach((share) => {
    assert.equal(protocol.isSecretContent(share), true, 'share encoding was not classified as secret text');
    textFields.forEach((field) => {
      const backup = {
        id: SAFE_ID,
        subjectId,
        method: 'slip39',
        shareLabel: 'Home safe set',
        threshold: 2,
        groupConfig: { groupThreshold: 1, groups: [{ threshold: 2, count: 3 }] },
        location: 'Home safe',
        custodian: 'Owner',
        createdAt: '2026-08-13T00:00:00.000Z',
        verifyEveryDays: 365,
        hidden: false,
        [field]: share
      };
      assert.equal(protocol.validateMessage('warm-to-cold', {
        id: `backup-share-warm-${field}`,
        type: 'publicData.replace',
        payload: { publicCompartment: { backups: [backup] } }
      }), null, `warm-to-cold accepted ${field}`);
      assert.equal(protocol.validateMessage('cold-to-warm', {
        id: `backup-share-cold-${field}`,
        type: 'vault.opened',
        payload: { publicCompartment: { backups: [backup] } }
      }), null, `cold-to-warm accepted ${field}`);
    });
  });
});

test('BackupRecord group configuration accepts realizable boundaries and rejects impossible thresholds', () => {
  const protocol = loadProtocol();
  const subjectId = '550e8400-e29b-41d4-a716-446655440001';
  const base = {
    id: SAFE_ID,
    subjectId,
    method: 'slip39',
    shareLabel: 'Home safe set',
    threshold: 1,
    location: 'Home safe',
    custodian: 'Owner',
    createdAt: '2026-08-13T00:00:00.000Z',
    verifyEveryDays: 365,
    hidden: false
  };
  const validate = (groupConfig) => protocol.validateMessage('warm-to-cold', {
    id: 'backup-group-config',
    type: 'publicData.replace',
    payload: { publicCompartment: { backups: [{ ...base, groupConfig }] } }
  });

  assert.ok(validate({ groupThreshold: 1, groups: [{ threshold: 1, count: 1 }] }));
  assert.ok(validate({
    groupThreshold: 2,
    groups: [{ threshold: 1, count: 1 }, { threshold: 2, count: 3 }]
  }));
  assert.equal(validate({ groupThreshold: 2, groups: [{ threshold: 1, count: 1 }] }), null);
  assert.equal(validate({ groupThreshold: 3, groups: [{ threshold: 1, count: 1 }, { threshold: 1, count: 1 }] }), null);
});

test('public notes are bounded, public-only records with canonical tags', () => {
  const protocol = loadProtocol();
  const noteId = '550e8400-e29b-41d4-a716-446655440003';
  const result = protocol.validateMessage('warm-to-cold', {
    id: 'public-note-1',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        notes: [{
          id: noteId,
          title: 'Exchange receive note',
          body: 'This account receives withdrawals.',
          visibility: 'public',
          tags: ['#Coinbase', 'taxlot-2024', 'coinbase'],
          linkedIds: []
        }]
      }
    }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.payload.publicCompartment.notes[0])), {
    id: noteId,
    title: 'Exchange receive note',
    body: 'This account receives withdrawals.',
    visibility: 'public',
    tags: ['coinbase', 'taxlot-2024'],
    linkedIds: []
  });
  assert.equal(protocol.validateMessage('warm-to-cold', {
    id: 'secret-note-1',
    type: 'publicData.replace',
    payload: {
      publicCompartment: {
        notes: [{
          id: noteId,
          title: 'Secret',
          body: 'passphrase hint is the street we grew up on',
          visibility: 'secret'
        }]
      }
    }
  }), null);
  assert.equal(protocol.validateMessage('cold-to-warm', {
    id: 'reveal-1',
    type: 'concealment.revealed',
    payload: { revealed: true, phrase: 'discarded' }
  }).payload.revealed, true);
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
