const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'cold', 'codex32.js'), 'utf8');

function loadApi(randomValues = true) {
  let next = 0;
  const window = {
    crypto: randomValues ? {
      getRandomValues(bytes) {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = (next * 73 + 19) & 0xff;
          next += 1;
        }
        return bytes;
      }
    } : undefined
  };
  const context = vm.createContext({ window, BigInt, Uint8Array, Object, Number, String, Error, TypeError, RangeError });
  new vm.Script(source, { filename: 'src/cold/codex32.js' }).runInContext(context);
  return window.__coldboxCodex32;
}

function bytes(hex) {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

test('BIP-93 vector 1 decodes a 128-bit unshared secret', () => {
  const api = loadApi();
  const value = 'ms10testsxxxxxxxxxxxxxxxxxxxxxxxxxx4nzvca9cmczlw';
  const parsed = api.decode(value);
  assert.equal(parsed.threshold, 0);
  assert.equal(parsed.identifier, 'test');
  assert.equal(parsed.shareIndex, 's');
  assert.deepEqual(parsed.bytes, bytes('318c6318c6318c6318c6318c6318c631'));
});

test('BIP-93 vector 2 derives and recovers the published values', () => {
  const api = loadApi();
  const shares = [
    'MS12NAMEA320ZYXWVUTSRQPNMLKJHGFEDCAXRPP870HKKQRM',
    'MS12NAMECACDEFGHJKLMNPQRSTUVWXYZ023FTR2GDZMPY6PN'
  ];
  assert.equal(api.interpolateAt(shares, 'd'), 'ms12namedll4f8jlh4e5vdvuldlfxu2jhdnlsm97xvenrxeg');
  assert.equal(api.recover(shares).value, 'ms12names6xqguzttxkeqnjsjzv4jv3nz5k3kwgsphuh6evw');
  assert.deepEqual(api.recover(shares).bytes, bytes('d1808e096b35b209ca12132b264662a5'));
  assert.throws(() => api.interpolateAt(shares.slice(0, 1), 'd'), /exactly 2 shares/);
  assert.throws(() => api.interpolateAt([shares[0], shares[0]], 'd'), /repeated/);
  assert.throws(() => api.interpolateAt(shares, 'a'), /missing share index/);
});

test('BIP-93 vectors 3, 4, and 5 decode and recover', () => {
  const api = loadApi();
  const vector3 = [
    'ms13casha320zyxwvutsrqpnmlkjhgfedca2a8d0zehn8a0t',
    'ms13cashcacdefghjklmnpqrstuvwxyz023949xq35my48dr',
    'ms13cashd0wsedstcdcts64cd7wvy4m90lm28w4ffupqs7rm'
  ];
  assert.deepEqual(api.recover(vector3).bytes, bytes('ffeeddccbbaa99887766554433221100'));
  assert.deepEqual(
    api.decode('ms10leetsllhdmn9m42vcsamx24zrxgs3qrl7ahwvhw4fnzrhve25gvezzyqqtum9pgv99ycma').bytes,
    bytes('ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100')
  );
  assert.equal(
    api.decode('MS100C8VSM32ZXFGUHPCHTLUPZRY9X8GF2TVDW0S3JN54KHCE6MUA7LQPZYGSFJD6AN074RXVCEMLH8WU3TK925ACDEFGHJKLMNPQRSTUVWXY06FHPV80UNDVARHRAK').bytes.length,
    64
  );
});

test('generation round-trips 16, 32, and 64-byte secrets with threshold enforcement', () => {
  const api = loadApi();
  for (const length of [16, 32, 64]) {
    const secret = new Uint8Array(length);
    for (let index = 0; index < secret.length; index += 1) {
      secret[index] = (index * 11 + 7) & 0xff;
    }
    const generated = api.generate(secret, { threshold: 3, count: 5, identifier: 'cash' });
    assert.equal(generated.shares.length, 5);
    assert.equal(generated.shares[0].length, length === 16 ? 48 : length === 32 ? 74 : 127);
    assert.deepEqual(api.recover(generated.shares.slice(0, 3)).bytes, secret);
    assert.throws(() => api.recover(generated.shares.slice(0, 2)), /exactly 3 shares/);
    assert.equal(api.decode(generated.secret).shareIndex, 's');
  }
});

test('invalid BIP-93 vectors fail closed and one transcription error is confirmation-gated', () => {
  const api = loadApi();
  const invalid = [
    'ms10fauxsxxxxxxxxxxxxxxxxxxxxxxxxxxve740yyge2ghq',
    'ms10fauxxxxxxxxxxxxxxxxxxxxxxxxxxxx0z26tfn0ulw3p',
    'Ms10fauxsxxxxxxxxxxxxxxxxxxxxxxxxxxuqxkk05lyf3x2'
  ];
  for (const value of invalid) {
    assert.throws(() => api.decode(value));
  }
  const valid = 'ms10testsxxxxxxxxxxxxxxxxxxxxxxxxxx4nzvca9cmczlw';
  const corrupted = `${valid.slice(0, 20)}q${valid.slice(21)}`;
  assert.throws(() => api.decode(corrupted), /checksum/);
  const correction = api.correctSingleError(corrupted);
  assert.equal(correction.changed, true);
  assert.equal(correction.corrected, valid);
});

test('generation refuses missing secure randomness and rejects invalid configurations', () => {
  const unavailable = loadApi(false);
  assert.throws(() => unavailable.generate(bytes('00112233445566778899aabbccddeeff')), /getRandomValues/);
  const api = loadApi();
  assert.throws(() => api.generate(bytes('00112233445566778899aabbccddeeff'), { threshold: 1 }), /threshold/);
  assert.throws(() => api.generate(bytes('00112233445566778899aabbccddeeff'), { threshold: 3, count: 2 }), /share count/);
  assert.throws(() => api.decode('ms10testsxxxxxxxxxxxxxxxxxxxxxxxxxx4nzvca9cmczlq'), /checksum/);
});
