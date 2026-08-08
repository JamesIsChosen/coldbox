'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createCryptoVendorSource } = require('../scripts/crypto-bundle.js');

const projectRoot = path.resolve(__dirname, '..');
const entropyLabSource = fs.readFileSync(path.join(projectRoot, 'src', 'cold', 'entropy-lab.js'), 'utf8');

function createContext() {
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
  vm.runInNewContext(entropyLabSource, context);
  return context;
}

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

// Independent reference implementation of the mix step, built from Node's
// built-in (OpenSSL-backed) crypto module rather than the @noble/hashes
// implementation the production code uses. This is a different SHA-256
// implementation from a different codebase, so a match is not circular in
// the way "checked against my own code" would be. There is no published
// spec for this bespoke construction (it isn't a BIP/SLIP/RFC), so this
// cross-implementation check is the strongest available independent vector;
// see docs/05-development/adr/0022-entropy-lab-mixing.md.
//
// This is the literal formula documented in entropy-and-strength.md and
// first-wallet.md: SHA-256(manualBytes XOR csprngBytes), truncated to the
// requested length. No counter, no block expansion — a review round on the
// first version of this file caught that the production code had added a
// 4-byte counter prefix that does not match this formula, and this
// reference function is deliberately as literal as possible so a mismatch
// like that cannot slip past it again.
function referenceMix(manualBytes, csprngBytes, targetBits) {
  const xored = Buffer.alloc(manualBytes.length);
  for (let i = 0; i < manualBytes.length; i += 1) {
    xored[i] = manualBytes[i] ^ csprngBytes[i];
  }
  const digest = crypto.createHash('sha256').update(xored).digest();
  return digest.subarray(0, targetBits / 8);
}

test('mix() matches an independent Node-crypto reimplementation of literal SHA-256(manual XOR csprng), single byte', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  const manual = Buffer.from([0xab]);
  const csprng = Buffer.from([0x11]);
  const paddedManual = Buffer.concat([manual, Buffer.alloc(15)]);
  const csprngBuffer = Buffer.concat([csprng, Buffer.alloc(15)]);
  const expected = referenceMix(paddedManual, csprngBuffer, 128);
  // Hand-verifiable: 0xab XOR 0x11 = 0xba (the rest of both 16-byte buffers
  // is zero, so the rest of the XOR is zero too), and this exact digest was
  // independently computed with `node -e` using node:crypto before this
  // test was written (see the packet's remediation section for the
  // transcript) — not derived from entropy-lab.js or this test file.
  assert.equal(hex(expected), 'd9767ebda5c2860ea7d035cb7146741a');

  for (let bit = 7; bit >= 0; bit -= 1) {
    session.exactBits.push((manual[0] >> bit) & 1);
  }
  while (session.exactBits.length < 128) {
    session.exactBits.push(0);
  }
  lab.addCsprngBytes(session, new Uint8Array(csprngBuffer));
  const actual = lab.mix(session, 128);
  assert.equal(hex(actual), hex(expected));
});

test('mix() matches an independent Node-crypto reimplementation, multi-byte XOR, full 256-bit digest', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  const manual = Buffer.from([0x00, 0xff, 0x7a]);
  const csprng = Buffer.from([0xff, 0x00, 0x7a]);
  const paddedManual = Buffer.concat([manual, Buffer.alloc(29)]);
  const csprngBuffer = Buffer.concat([csprng, Buffer.alloc(29)]);
  const expected = referenceMix(paddedManual, csprngBuffer, 256);
  assert.equal(expected.length, 32);
  assert.equal(hex(expected), '29e5e39c8605b7433b59c0b8268fcc2c6e85709319ead6b8eba0791d6057e043');

  for (let byteIndex = 0; byteIndex < manual.length; byteIndex += 1) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      session.exactBits.push((manual[byteIndex] >> bit) & 1);
    }
  }
  while (session.exactBits.length < 256) {
    session.exactBits.push(0);
  }
  lab.addCsprngBytes(session, new Uint8Array(csprngBuffer));
  const actual = lab.mix(session, 256);
  assert.equal(actual.length, 32);
  assert.equal(hex(actual), hex(expected));
});

test('mix() consumes ("burns") the CSPRNG bytes it used, so a second mix() without a new draw fails closed rather than reusing them', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 128; i += 1) {
    lab.addCoin(session, i % 2 === 0);
  }
  lab.addCsprngBytes(session, new Uint8Array(16)); // exactly enough for one 128-bit mix
  const first = lab.mix(session, 128);
  assert.equal(first.length, 16);
  assert.equal(session.csprngBytes.length, 0);
  assert.throws(() => lab.mix(session, 128), /need at least 16 csprng bytes/i);

  // Confirm it is not merely refusing on principle: drawing fresh bytes lets
  // it proceed again, and the new output differs from the first (different
  // CSPRNG input XORed against the same manual entropy).
  lab.addCsprngBytes(session, new Uint8Array(16).fill(0xff));
  const second = lab.mix(session, 128);
  assert.notEqual(hex(first), hex(second));
});

test('mix() falls back to a direct CSPRNG-only draw when no manual entropy is recorded, and burns those bytes too', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  assert.equal(lab.manualEntropyBytes(session).length, 0);
  assert.throws(() => lab.mix(session, 128), /need 16 csprng bytes/i);

  const fresh = new Uint8Array(16);
  crypto.webcrypto.getRandomValues(fresh);
  lab.addCsprngBytes(session, fresh);
  const output = lab.mix(session, 128);
  assert.equal(output.length, 16);
  // Pure-CSPRNG mode returns the bytes directly (no hash): entropy-and-
  // strength.md describes CSPRNG output as already "256 bits by
  // definition," so hashing it would add nothing and would contradict that
  // literal description.
  assert.deepEqual([...output], [...fresh]);
  assert.equal(session.csprngBytes.length, 0, 'the bytes used must be burned');
  assert.throws(() => lab.mix(session, 128), /need 16 csprng bytes/i);
});

test('guaranteedBits() (manual) is 0 for a CSPRNG-only session, but csprngGuaranteedBits() reports the CSPRNG bytes on hand', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCsprngBytes(session, new Uint8Array(32));
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.csprngGuaranteedBits(session), 256);
});

test('mix() fails closed when manual guaranteed bits are short of the target (mixed path)', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 100; i += 1) {
    lab.addCoin(session, i % 2 === 0);
  }
  lab.addCsprngBytes(session, new Uint8Array(32));
  assert.throws(() => lab.mix(session, 128), /only 100 guaranteed manual bits/);
});

test('mix() fails closed when the CSPRNG buffer is shorter than the manual entropy it must XOR against', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 128; i += 1) {
    lab.addCoin(session, i % 2 === 0);
  }
  lab.addCsprngBytes(session, new Uint8Array(4)); // 16 bytes of manual entropy, only 4 CSPRNG bytes
  assert.throws(() => lab.mix(session, 128), /need at least 16 csprng bytes/i);
});

test('mix() rejects a target bit count outside the BIP-39 ENT sizes', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  assert.throws(() => lab.mix(session, 100), /targetBits must be one of/);
});

test('4-outcome discard mapping keeps rolls 1-4 as exactly 2 unbiased bits and rejects 5 and 6', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();

  // The mapping is roll-1 written as 2 bits, MSB first: 1->00 2->01 3->10 4->11.
  const cases = [[1, [0, 0]], [2, [0, 1]], [3, [1, 0]], [4, [1, 1]]];
  for (const [face, bits] of cases) {
    const fresh = lab.createSession();
    const accepted = lab.addDiceDiscard(fresh, face);
    assert.equal(accepted, true);
    assert.deepEqual([...fresh.exactBits], bits);
    assert.equal(lab.guaranteedBits(fresh), 2);
  }

  const rejected5 = lab.addDiceDiscard(session, 5);
  const rejected6 = lab.addDiceDiscard(session, 6);
  assert.equal(rejected5, false);
  assert.equal(rejected6, false);
  assert.equal(session.exactBits.length, 0);
  assert.equal(lab.guaranteedBits(session), 0);
});

test('base-6 dice accumulator reports conservative (floor) guaranteed bits, never rounded up', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  // 6^1 = 6, binary '110' -> bit-length 3 -> guaranteed = 3 - 1 = 2 bits,
  // *not* log2(6) = 2.585 rounded to 3. This is the conservative floor the
  // spec (SPEC.md 11.1a) requires for min-entropy accounting.
  lab.addDiceBase6(session, 1);
  assert.equal(lab.diceGuaranteedBits(session), 2);

  // 6^10 = 60466176, which in binary is 26 bits long (2^25 < 6^10 < 2^26),
  // so guaranteed bits = 25. Verified independently: Math.log2(60466176)
  // ~= 25.848, floor = 25, matching bit-length-minus-one exactly here.
  const fresh = lab.createSession();
  for (let i = 0; i < 10; i += 1) {
    lab.addDiceBase6(fresh, 6);
  }
  assert.equal(fresh.diceValue, (6n ** 10n) - 1n);
  assert.equal(lab.diceGuaranteedBits(fresh), 25);
});

test('card draws use a factorial-number-system accumulator and reject repeats within a shuffle', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCard(session, 0);
  assert.throws(() => lab.addCard(session, 0), /already drawn this shuffle/);
  // First draw from 52: range is 52, bit-length of 52 (110100) is 6, so
  // guaranteed = 5 bits. floor(log2(52)) = 5, independently confirming it.
  assert.equal(lab.cardGuaranteedBits(session), 5);

  const fresh = lab.createSession();
  for (let card = 0; card < 52; card += 1) {
    lab.addCard(fresh, card);
  }
  assert.throws(() => lab.addCard(fresh, 0), /already drawn this shuffle/);
  // Full deck: range = 52!. log2(52!) ~= 225.58 (a standard, independently
  // checkable combinatorial fact - e.g. via Stirling's approximation or any
  // calculator's 52! bit-length), so guaranteed bits = 225.
  assert.equal(lab.cardGuaranteedBits(fresh), 225);
});

test('startNewCardShuffle() refuses while cards remain, and compounds a second shuffle onto the same accumulator (entropy-and-strength.md\'s "2 shuffles" path)', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();

  lab.addCard(session, 0);
  assert.throws(() => lab.startNewCardShuffle(session), /card\(s\) remain in the current shuffle/);

  // Draw the remaining 51 cards to exhaust the first shuffle.
  for (let card = 1; card < 52; card += 1) {
    lab.addCard(session, card);
  }
  assert.equal(session.cardRemaining.length, 0);
  assert.equal(lab.cardGuaranteedBits(session), 225);

  lab.startNewCardShuffle(session);
  assert.equal(session.cardRemaining.length, 52);
  // The same card id can be drawn again now that the pool has been refilled
  // — it is a fresh shuffle, not a duplicate within the same one.
  lab.addCard(session, 0);
  // Range is now 52! * 52 (first shuffle's full range, times the first draw
  // of the second shuffle), independently: bit-length(52! * 52) - 1.
  const expectedRange = (() => {
    let range = 1n;
    for (let i = 0; i < 52; i += 1) { range *= 52n - BigInt(i); }
    range *= 52n; // one draw into the second shuffle, pool size 52
    return range;
  })();
  const expectedBits = expectedRange.toString(2).length - 1;
  assert.equal(lab.cardGuaranteedBits(session), expectedBits);
  assert.ok(expectedBits > 225, 'a second shuffle must add to the first, not replace it');

  // Undo of the reshuffle itself must restore the exhausted-pool state
  // exactly (not just "some" prior state), so a user can back out of an
  // accidental "start new shuffle" click.
  lab.undoLast(session); // undoes the addCard(session, 0) above
  lab.undoLast(session); // undoes startNewCardShuffle
  assert.equal(session.cardRemaining.length, 0);
  assert.equal(lab.cardGuaranteedBits(session), 225);
});

test('undo reverses exactly the last operation for every source type, including a rejected discard roll', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();

  lab.addCoin(session, true);
  assert.equal(lab.guaranteedBits(session), 1);
  assert.equal(lab.undoLast(session), true);
  assert.equal(lab.guaranteedBits(session), 0);

  lab.addDiceBase6(session, 3);
  assert.equal(session.diceDigits.length, 1);
  lab.undoLast(session);
  assert.equal(session.diceDigits.length, 0);
  assert.equal(session.diceValue, 0n);

  lab.addCard(session, 5);
  lab.undoLast(session);
  assert.equal(session.cardOrder.length, 0);
  assert.equal(session.cardRemaining.length, 52);
  assert.equal(session.cardRemaining.includes(5), true);

  // A rejected discard roll (5 or 6) is a no-op, but it must still be
  // undoable as a step so the UI's undo button and the session's history
  // stay in lockstep with every button press, not just the ones that
  // changed the accumulator.
  lab.addDiceDiscard(session, 6);
  assert.equal(session.history.length, 1);
  assert.equal(lab.undoLast(session), true);
  assert.equal(session.history.length, 0);

  assert.equal(lab.undoLast(session), false);
});

test('hex nibbles append exactly 4 MSB-first bits per digit', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addHexNibble(session, 0xa); // 1010
  assert.deepEqual([...session.exactBits], [1, 0, 1, 0]);
  lab.addHexNibble(session, 0x5); // 0101
  assert.deepEqual([...session.exactBits], [1, 0, 1, 0, 0, 1, 0, 1]);
  assert.equal(lab.guaranteedBits(session), 8);
});

test('manualEntropyBytes concatenates exact-bit, dice, and card material in a fixed, testable order', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addHexNibble(session, 0xf); // exactBits: 1111 -> 1 byte 0xf0 (padded)
  lab.addDiceBase6(session, 1); // digit 0, range 6, 1 byte needed
  lab.addCard(session, 51); // rank 51 of 52, 1 byte needed
  const bytes = lab.manualEntropyBytes(session);
  // exactBits (4 bits -> 1 byte, 0xf0) + dice byte (0x00, value 0 in a
  // 1-byte field since bit-length(6)=3 -> 1 byte) + card byte (rank 51,
  // bit-length(52)=6 -> 1 byte, value 51 = 0x33).
  assert.equal(bytes.length, 3);
  assert.equal(bytes[0], 0xf0);
  assert.equal(bytes[1], 0x00);
  assert.equal(bytes[2], 0x33);
});

test('rejects malformed inputs (fail closed on out-of-range dice, card, and hex values)', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  assert.throws(() => lab.addDiceBase6(session, 0));
  assert.throws(() => lab.addDiceBase6(session, 7));
  assert.throws(() => lab.addDiceDiscard(session, 0));
  assert.throws(() => lab.addHexNibble(session, -1));
  assert.throws(() => lab.addHexNibble(session, 16));
  assert.throws(() => lab.addCard(session, -1));
  assert.throws(() => lab.addCard(session, 52));
  assert.throws(() => lab.addCsprngBytes(session, new Uint8Array(0)));
  assert.throws(() => lab.addCsprngBytes(session, 'not bytes'));
});
