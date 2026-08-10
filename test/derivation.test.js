'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const derivationSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'cold', 'derivation.js'),
  'utf8'
);

function createContext() {
  const context = {
    ArrayBuffer,
    BigInt,
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
  vm.runInNewContext(derivationSource, context, { filename: 'src/cold/derivation.js' });
  return context;
}

function bytes(hex) {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

const BIP32_VECTOR_1_SEED = bytes('000102030405060708090a0b0c0d0e0f');
const BIP39_ZERO_ENTROPY_SEED = bytes(
  '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19'
  + 'a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4'
);

// BIP-32 vector 1, copied from the published bitcoin/bips test vector.
const BIP32_VECTOR_1 = [
  {
    path: 'm',
    xpub: 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
    xprv: 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi'
  },
  {
    path: "m/0'",
    xpub: 'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw',
    xprv: 'xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7'
  },
  {
    path: "m/0'/1",
    xpub: 'xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ',
    xprv: 'xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLnvSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs'
  },
  {
    path: "m/0'/1/2'",
    // The published bitcoin/bips row has a checksum-invalid ext pub. Keep it
    // as a negative fixture; the ext prv and independent Node public-key
    // calculation below still verify this derivation step.
    xpub: 'xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5',
    invalidXpub: true,
    xprv: 'xprv9z4pot5VBttmtdRTWfWQmoH1taj2axGVzFqSb8C9xaxKymcFzXBDptWmT7FwuEzG3ryjH4ktypQSAewRiNMjANTtpgP4mLTj34bhnZX7UiM'
  },
  {
    path: "m/0'/1/2'/2",
    xpub: 'xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBqaGJAyiLjTAwm6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV',
    xprv: 'xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb2Tyh8RfQMuPh7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334'
  },
  {
    path: "m/0'/1/2'/2/1000000000",
    xpub: 'xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy',
    xprv: 'xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76'
  }
];

test('BIP-32 vector 1 matches the published extended private and public keys', () => {
  const context = createContext();
  const derivation = context.__coldboxDerivation;

  for (const vector of BIP32_VECTOR_1) {
    const node = derivation.deriveNode(BIP32_VECTOR_1_SEED, vector.path, {
      network: 'mainnet',
      scriptType: 'p2pkh'
    });
    try {
      if (vector.invalidXpub) {
        assert.throws(
          () => context.__coldboxBase.base58check.decode(vector.xpub),
          /checksum/i,
          vector.path
        );
      } else {
        assert.equal(node.publicExtendedKey, vector.xpub, vector.path);
      }
      assert.equal(node.privateExtendedKey, vector.xprv, vector.path);
      const privatePayload = context.__coldboxBase.base58check.decode(vector.xprv);
      const ecdh = crypto.createECDH('secp256k1');
      ecdh.setPrivateKey(Buffer.from(privatePayload.slice(46, 78)));
      assert.deepEqual(Buffer.from(node.publicKey), ecdh.getPublicKey(null, 'compressed'), vector.path);
    } finally {
      node.wipePrivateData();
    }
  }
});

test('BIP-49 and BIP-84 published vectors produce the expected account keys and addresses', () => {
  const derivation = createContext().__coldboxDerivation;

  const nested = derivation.deriveBitcoinFromSeed(BIP39_ZERO_ENTROPY_SEED, {
    network: 'testnet',
    scriptType: 'p2sh-p2wpkh',
    count: 1
  });
  assert.equal(
    nested.xpub,
    'upub5EFU65HtV5TeiSHmZZm7FUffBGy8UKeqp7vw43jYbvZPpoVsgU93oac7Wk3u6moKegAEWtGNF8DehrnHtv21XXEMYRUocHqguyjknFHYfgY'
  );
  assert.deepEqual([...nested.addresses], ['2Mww8dCYPUpKHofjgcXcBCEGmniw9CoaiD2']);

  const native = derivation.deriveBitcoinFromSeed(BIP39_ZERO_ENTROPY_SEED, {
    network: 'mainnet',
    scriptType: 'p2wpkh',
    count: 2
  });
  assert.equal(
    native.xpub,
    'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs'
  );
  assert.deepEqual([...native.addresses], [
    'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
    'bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g'
  ]);

  const watchOnly = derivation.deriveBitcoinFromXpub(native.xpub, { count: 2 });
  assert.deepEqual([...watchOnly.addresses], [...native.addresses]);
  assert.equal(watchOnly.fingerprint, null);
  assert.equal(typeof watchOnly.accountFingerprint, 'string');
  assert.throws(
    () => derivation.deriveBitcoinFromXpub(native.xpub, { network: 'testnet' }),
    /network does not match/i
  );
});

test('BIP-86 published vector produces the expected Taproot output address', () => {
  const derivation = createContext().__coldboxDerivation;
  const result = derivation.deriveBitcoinFromSeed(BIP39_ZERO_ENTROPY_SEED, {
    network: 'mainnet',
    scriptType: 'p2tr',
    count: 1
  });

  assert.equal(
    result.xpub,
    'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ'
  );
  assert.deepEqual([...result.addresses], [
    'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr'
  ]);

  const child = derivation.deriveNode(
    BIP39_ZERO_ENTROPY_SEED,
    "m/86'/0'/0'/0/0",
    { network: 'mainnet', scriptType: 'p2tr' }
  );
  try {
    assert.equal(
      Buffer.from(derivation.taprootOutputKey(child.publicKey)).toString('hex'),
      'a60869f0dbcf1dc659c9cecbaf8050135ea9e8cdc487053f1dc6880949dc684c'
    );
  } finally {
    child.wipePrivateData();
  }
});

test('Bitcoin derivation returns a public projection and rejects unsafe inputs', () => {
  const derivation = createContext().__coldboxDerivation;
  const result = derivation.deriveBitcoinFromSeed(BIP32_VECTOR_1_SEED, { count: 1 });
  const serialized = JSON.stringify(result);

  assert.equal(result.addresses.length, 1);
  assert.equal(result.addresses[0].startsWith('bc1q'), true);
  assert.equal(serialized.includes('seed'), false);
  assert.equal(serialized.includes('private'), false);
  assert.equal(serialized.includes('xprv'), false);

  assert.equal(derivation.parsePath("M/84'/0'/0'/0/0").normalized, "m/84'/0'/0'/0/0");
  assert.throws(() => derivation.parsePath("m/84'/01'/0'/0/0"), /leading zero/i);
  assert.throws(() => derivation.parsePath("m/84'/2147483648'/0'/0/0"), /outside/i);
  assert.throws(() => derivation.parsePath("m/84'/0'/0'/0/0/"), /decimal indices/i);
  assert.throws(
    () => derivation.deriveBitcoinFromSeed(new Uint8Array(15), { count: 1 }),
    /between 16 and 64 bytes/i
  );
  assert.throws(
    () => derivation.deriveBitcoinFromSeed(BIP32_VECTOR_1_SEED, { count: 1001 }),
    /between 1 and 1000/i
  );
  assert.throws(
    () => derivation.deriveBitcoinFromSeed(BIP32_VECTOR_1_SEED, {
      start: 0x7fffffff,
      count: 2
    }),
    /start plus count/i
  );
  assert.throws(
    () => derivation.deriveBitcoinFromSeed(BIP32_VECTOR_1_SEED, { network: 'regtest' }),
    /unsupported Bitcoin network/i
  );
  assert.throws(
    () => derivation.addressFromPublicKey(new Uint8Array(33), 'p2wpkh', 'mainnet'),
    /compressed secp256k1/i
  );

  const root = derivation.deriveNode(BIP32_VECTOR_1_SEED, 'm', {
    network: 'mainnet',
    scriptType: 'p2pkh'
  });
  try {
    assert.throws(
      () => derivation.deriveBitcoinFromXpub(root.publicExtendedKey),
      /account-level/i
    );
  } finally {
    root.wipePrivateData();
  }
  assert.throws(
    () => derivation.deriveBitcoinFromXpub('xpub-not-valid'),
    /extended|base58|checksum|unknown letter/i
  );

  const account = derivation.deriveNode(BIP32_VECTOR_1_SEED, "m/44'/0'/0'", {
    network: 'mainnet',
    scriptType: 'p2pkh'
  });
  try {
    const publicAccount = createContext().__coldboxBip32.HDKey.fromExtendedKey(
      account.publicExtendedKey
    );
    assert.throws(
      () => publicAccount.deriveChild(0x80000000),
      /hardened|private/i
    );
  } finally {
    account.wipePrivateData();
  }
});
