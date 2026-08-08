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
function referenceMix(sourceBytes, csprngBytes, targetBits) {
  const targetBytes = targetBits / 8;
  const mixLength = Math.max(targetBytes, sourceBytes.length);
  assert.ok(csprngBytes.length >= mixLength, 'reference CSPRNG must cover the full XOR input');
  const sourceForMix = Buffer.alloc(mixLength);
  Buffer.from(sourceBytes).copy(sourceForMix);
  const xored = Buffer.alloc(mixLength);
  for (let i = 0; i < mixLength; i += 1) {
    xored[i] = sourceForMix[i] ^ csprngBytes[i];
  }
  const digest = crypto.createHash('sha256').update(xored).digest();
  return digest.subarray(0, targetBytes);
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
    lab.addCoin(session, ((manual[0] >> bit) & 1) === 1);
  }
  while (session.coinBits.length < 128) {
    lab.addCoin(session, false);
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
      lab.addCoin(session, ((manual[byteIndex] >> bit) & 1) === 1);
    }
  }
  while (session.coinBits.length < 256) {
    lab.addCoin(session, false);
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
  assert.equal(lab.availableCsprngBytes(session).length, 0);
  assert.throws(() => lab.mix(session, 128), /need at least 16 fresh csprng bytes/i);

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
  assert.equal(lab.sourceEntropyBytes(session).length, 0);
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
  assert.equal(lab.availableCsprngBytes(session).length, 0, 'the bytes used must be burned');
  assert.throws(() => lab.mix(session, 128), /need 16 csprng bytes/i);
});

test('undoing a draw can never resurrect CSPRNG bytes a mix() already spent (round-2 review repro)', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 128; i += 1) {
    lab.addCoin(session, i % 2 === 0);
  }
  // Draw A (16 bytes), draw B (16 more bytes) — exactly the reviewer's
  // repro sequence: two separate CSPRNG draws, then a mix that consumes
  // only the first draw's worth of bytes.
  lab.addCsprngBytes(session, new Uint8Array(16).fill(0xaa)); // draw A
  lab.addCsprngBytes(session, new Uint8Array(16).fill(0xbb)); // draw B
  assert.equal(lab.availableCsprngBytes(session).length, 32);

  lab.mix(session, 128); // consumes exactly A's 16 bytes (sourceEntropyBytes is 16 bytes for 128 exact coin bits)
  assert.equal(lab.availableCsprngBytes(session).length, 16);
  assert.deepEqual([...lab.availableCsprngBytes(session)], new Array(16).fill(0xbb));

  // Now undo draw B (the most recent history entry). Before the fix, the
  // undo closure for a draw restored a captured *reference* to
  // session.csprngBytes as it was right before that draw — which, after
  // mix() had since replaced session.csprngBytes with a shorter
  // post-consumption array, was a stale pre-mix snapshot that still
  // contained A's already-spent bytes. Popping it silently resurrected A.
  // After the fix, undoing B only ever truncates the array back to "the
  // length before B was appended" (the end of A) and clamps
  // csprngConsumed down to at most that length — it can never move
  // csprngConsumed backward past where it already was, so A stays spent.
  lab.undoLast(session); // undoes draw B
  assert.equal(lab.availableCsprngBytes(session).length, 0, 'A must still be unavailable; nothing was un-spent');
  assert.throws(() => lab.mix(session, 128), /csprng bytes/i, 'mixing again must not succeed using resurrected bytes');

  // Confirm the fix isn't merely refusing on principle: a fresh draw after
  // the undo behaves normally.
  lab.addCsprngBytes(session, new Uint8Array(16).fill(0xcc));
  const secondMix = lab.mix(session, 128);
  assert.equal(secondMix.length, 16);
});

test('guaranteedBits() (manual) is 0 for a CSPRNG-only session, but csprngGuaranteedBits() reports the CSPRNG bytes on hand', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCsprngBytes(session, new Uint8Array(32));
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.csprngGuaranteedBits(session), 256);
});

test('mix() preserves selected normal output strength with partial independent entropy by consuming at least targetBytes of fresh CSPRNG', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 32; i += 1) {
    lab.addCoin(session, i % 2 === 0); // 32 conservative independent bits
  }
  const source = lab.sourceEntropyBytes(session);
  assert.equal(source.length, 4);
  const csprng = new Uint8Array(32).fill(0x5a);
  lab.addCsprngBytes(session, csprng);
  const expected = referenceMix(Buffer.from(source), Buffer.from(csprng), 256);
  const actual = lab.mix(session, 256);
  assert.equal(actual.length, 32);
  assert.equal(hex(actual), hex(expected));
  assert.equal(lab.availableCsprngBytes(session).length, 0, 'partial-source 256-bit output must consume all 32 fresh CSPRNG bytes');
  assert.deepEqual(JSON.parse(JSON.stringify(lab.strengthSummary(session, 256))), {
    normalOutputBits: 256,
    independentBits: 32,
    fallbackBits: 32,
    fullTwoSourceProtection: false,
    mode: 'partial-independent-fallback'
  });
});

test('mix() fails closed when the CSPRNG buffer is shorter than the manual entropy it must XOR against', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 128; i += 1) {
    lab.addCoin(session, i % 2 === 0);
  }
  lab.addCsprngBytes(session, new Uint8Array(4)); // 16 bytes of manual entropy, only 4 CSPRNG bytes
  assert.throws(() => lab.mix(session, 128), /need at least 16 fresh csprng bytes/i);
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
    assert.deepEqual([...fresh.discardDiceBits], bits);
    assert.equal(lab.guaranteedBits(fresh), 2);
  }

  const rejected5 = lab.addDiceDiscard(session, 5);
  const rejected6 = lab.addDiceDiscard(session, 6);
  assert.equal(rejected5, false);
  assert.equal(rejected6, false);
  assert.equal(session.discardDiceBits.length, 0);
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
  assert.deepEqual([...session.hexBits], [1, 0, 1, 0]);
  lab.addHexNibble(session, 0x5); // 0101
  assert.deepEqual([...session.hexBits], [1, 0, 1, 0, 0, 1, 0, 1]);
  assert.equal(lab.guaranteedBits(session), 8);
});

test('sourceEntropyBytes concatenates exact-bit, dice, and card material in a fixed, testable order', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addHexNibble(session, 0xf); // hexBits: 1111 -> 1 byte 0xf0 (padded)
  lab.addDiceBase6(session, 1); // digit 0, range 6, 1 byte needed
  lab.addCard(session, 51); // rank 51 of 52, 1 byte needed
  const bytes = lab.sourceEntropyBytes(session);
  // hexBits (4 bits -> 1 byte, 0xf0) + dice byte (0x00, value 0 in a
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

// The reset*() functions (added for the per-source Reset buttons in the UI
// overhaul) must not only clear a source's data, but also purge any history
// entries for that source so a stale undo can never resurrect what the
// reset just deliberately discarded — the same class of bug the round-2
// review found in the CSPRNG burn/undo interaction (addCsprngBytes'
// undo closure surviving a later mutation). Each test below resets a source
// and then confirms undo() has nothing left to reverse for it, and that
// other sources' history and data are completely unaffected.

test('resetCoin clears coin bits and purges only coin history entries', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);
  lab.addHexNibble(session, 0xa);
  lab.addCoin(session, false);
  assert.equal(session.history.length, 3);

  lab.resetCoin(session);
  assert.deepEqual([...session.coinBits], []);
  assert.equal(session.hexBits.length, 4);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].kind, 'hex');

  // Undoing now can only reverse the surviving hex entry, never resurrect
  // a coin flip a stale closure might otherwise have captured.
  assert.equal(lab.undoLast(session), true);
  assert.equal(session.hexBits.length, 0);
  assert.equal(lab.undoLast(session), false);
  assert.deepEqual([...session.coinBits], []);
});

test('resetDice clears both base-6 and discard-mode dice state and purges dice history', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addDiceBase6(session, 3);
  lab.addDiceDiscard(session, 2);
  lab.addCoin(session, true);

  lab.resetDice(session);
  assert.deepEqual([...session.diceDigits], []);
  assert.equal(session.diceValue, 0n);
  assert.deepEqual([...session.discardDiceBits], []);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].kind, 'coin');
  assert.equal(lab.guaranteedBits(session), 1);

  assert.equal(lab.undoLast(session), true);
  assert.equal(session.coinBits.length, 0);
  assert.equal(lab.undoLast(session), false);
});

test('resetHex clears hex bits and purges only hex history entries', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addHexNibble(session, 0x1);
  lab.addCoin(session, true);
  lab.addHexNibble(session, 0x2);

  lab.resetHex(session);
  assert.deepEqual([...session.hexBits], []);
  assert.equal(session.coinBits.length, 1);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].kind, 'coin');
});

test('resetCards clears the draw accumulator, refills the pool, and purges card history without affecting other sources', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCard(session, 5);
  lab.addCard(session, 10);
  lab.addCoin(session, false);

  lab.resetCards(session);
  assert.deepEqual([...session.cardOrder], []);
  assert.equal(session.cardValue, 0n);
  assert.deepEqual([...session.cardDrawPoolSizes], []);
  assert.equal(session.cardRemaining.length, 52);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].kind, 'coin');

  // A card id drawn before the reset must be drawable again post-reset,
  // proving cardRemaining was genuinely refilled rather than left stale.
  lab.addCard(session, 5);
  assert.equal(session.cardOrder.length, 1);
});

test('resetCsprng clears both csprngBytes and the consumed offset, and purges only csprng history entries', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCsprngBytes(session, new Uint8Array(32).fill(7));
  lab.addCoin(session, true);
  assert.equal(lab.availableCsprngBytes(session).length, 32);

  lab.resetCsprng(session);
  assert.equal(session.csprngBytes.length, 0);
  assert.equal(session.csprngConsumed, 0);
  assert.equal(lab.availableCsprngBytes(session).length, 0);
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].kind, 'coin');

  // Round-2-style regression check: undoing the surviving coin entry must
  // never bring back csprng bytes the reset already discarded, since only
  // the coin history entry remains to be undone at all.
  assert.equal(lab.undoLast(session), true);
  assert.equal(session.csprngBytes.length, 0);
  assert.equal(lab.undoLast(session), false);
});

test('resetting one source never disturbs a different source\'s guaranteed-bit accounting', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true); // 1 bit
  lab.addHexNibble(session, 0xf); // 4 bits
  lab.addDiceBase6(session, 6); // guaranteedBitsForRange(6) = 2 bits

  const before = lab.guaranteedBits(session);
  lab.resetHex(session);
  const after = lab.guaranteedBits(session);
  assert.equal(before - after, 4);
  assert.equal(after, lab.guaranteedBits(session));
});

test('device-RNG-generated dice alone contribute zero independent fallback while normal CSPRNG-backed generation remains available', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 60; i += 1) {
    lab.addDiceBase6(session, (i % 6) + 1, lab.PROVENANCE_DEVICE_RNG);
  }
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.deviceRngDerivedValueCount(session), 60);
  assert.deepEqual(JSON.parse(JSON.stringify(lab.strengthSummary(session, 128))), {
    normalOutputBits: 128,
    independentBits: 0,
    fallbackBits: 0,
    fullTwoSourceProtection: false,
    mode: 'csprng-only'
  });
  const needed = Math.max(16, lab.sourceEntropyBytes(session).length);
  lab.addCsprngBytes(session, new Uint8Array(needed).fill(0xa5));
  assert.equal(lab.mix(session, 128).length, 16);
});

test('device-RNG-generated coins alone contribute zero independent-manual bits', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 256; i += 1) {
    lab.addCoin(session, i % 2 === 0, lab.PROVENANCE_DEVICE_RNG);
  }
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.deviceRngDerivedValueCount(session), 256);
});

test('device-RNG-generated cards alone contribute zero independent-manual bits', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let card = 0; card < 52; card += 1) {
    lab.addCard(session, card, lab.PROVENANCE_DEVICE_RNG);
  }
  assert.equal(lab.cardGuaranteedBits(session), 0);
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.deviceRngDerivedValueCount(session), 52);
});

test('device-RNG-generated hex alone contributes zero independent-manual bits', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 64; i += 1) {
    lab.addHexNibble(session, i % 16, lab.PROVENANCE_DEVICE_RNG);
  }
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.deviceRngDerivedValueCount(session), 64);
});

test('any combination of device-RNG-generated source values still has zero independent-manual security credit', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addDiceBase6(session, 6, lab.PROVENANCE_DEVICE_RNG);
  lab.addCoin(session, true, lab.PROVENANCE_DEVICE_RNG);
  lab.addCard(session, 0, lab.PROVENANCE_DEVICE_RNG);
  lab.addHexNibble(session, 0xf, lab.PROVENANCE_DEVICE_RNG);
  assert.equal(lab.guaranteedBits(session), 0);
  assert.equal(lab.deviceRngDerivedValueCount(session), 4);
  assert.ok(lab.sourceEntropyBytes(session).length > 0, 'simulated values remain auditable source material');
  const strength = lab.strengthSummary(session, 128);
  assert.equal(strength.normalOutputBits, 128);
  assert.equal(strength.fallbackBits, 0);
  assert.equal(strength.fullTwoSourceProtection, false);
  const needed = Math.max(16, lab.sourceEntropyBytes(session).length);
  lab.addCsprngBytes(session, new Uint8Array(needed).fill(0x3c));
  assert.equal(lab.mix(session, 128).length, 16, 'generated-only simulations may be transformed, but remain CSPRNG-only security');
});

test('actual manually entered values still receive independent-manual credit while generated values receive none', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true); // 1 independent bit
  lab.addHexNibble(session, 0xa); // 4 independent bits
  lab.addDiceBase6(session, 1); // floor(log2(6)) = 2 independent bits
  lab.addCard(session, 0); // floor(log2(52)) = 5 independent bits
  const manualOnly = lab.guaranteedBits(session);
  assert.equal(manualOnly, 12);

  lab.addCoin(session, false, lab.PROVENANCE_DEVICE_RNG);
  lab.addHexNibble(session, 0xb, lab.PROVENANCE_DEVICE_RNG);
  lab.addDiceBase6(session, 2, lab.PROVENANCE_DEVICE_RNG);
  lab.addCard(session, 1, lab.PROVENANCE_DEVICE_RNG);
  assert.equal(lab.guaranteedBits(session), manualOnly);
  assert.equal(lab.deviceRngDerivedValueCount(session), 4);
});

test('mixing succeeds with sufficient real manual entropy even when device-RNG simulated values are also present', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 32; i += 1) {
    lab.addHexNibble(session, i % 16); // 128 independent bits
  }
  lab.addDiceBase6(session, 6, lab.PROVENANCE_DEVICE_RNG);
  lab.addCoin(session, true, lab.PROVENANCE_DEVICE_RNG);
  assert.equal(lab.guaranteedBits(session), 128);
  assert.equal(lab.deviceRngDerivedValueCount(session), 2);
  const sourceBytes = lab.sourceEntropyBytes(session);
  lab.addCsprngBytes(session, new Uint8Array(sourceBytes.length).fill(0xa5));
  const mixed = lab.mix(session, 128);
  assert.equal(mixed.length, 16);
});

test('CSPRNG-only generation still works when no dice/coin/card/hex values were recorded', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  const bytes = new Uint8Array(16).fill(0x5a);
  lab.addCsprngBytes(session, bytes);
  assert.equal(hex(lab.mix(session, 128)), hex(bytes));
});


test('strengthSummary distinguishes normal output strength from independent-source fallback across CSPRNG-only, partial, and full states', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();

  assert.deepEqual(JSON.parse(JSON.stringify(lab.strengthSummary(session, 256))), {
    normalOutputBits: 256,
    independentBits: 0,
    fallbackBits: 0,
    fullTwoSourceProtection: false,
    mode: 'csprng-only'
  });

  for (let i = 0; i < 32; i += 1) lab.addCoin(session, i % 2 === 0);
  assert.equal(lab.strengthSummary(session, 256).fallbackBits, 32);
  assert.equal(lab.strengthSummary(session, 256).fullTwoSourceProtection, false);

  for (let i = 32; i < 256; i += 1) lab.addCoin(session, i % 2 === 0);
  const full = lab.strengthSummary(session, 256);
  assert.equal(full.independentBits, 256);
  assert.equal(full.fallbackBits, 256);
  assert.equal(full.fullTwoSourceProtection, true);
  assert.equal(full.mode, 'full-two-source');
});

test('generated simulations never increase independent fallback, including when mixed with genuine manual values', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 20; i += 1) lab.addCoin(session, i % 2 === 0);
  const before = lab.strengthSummary(session, 256);

  for (let i = 0; i < 100; i += 1) lab.addCoin(session, i % 2 === 0, lab.PROVENANCE_DEVICE_RNG);
  for (let i = 0; i < 10; i += 1) lab.addHexNibble(session, i, lab.PROVENANCE_DEVICE_RNG);
  const after = lab.strengthSummary(session, 256);
  assert.equal(after.independentBits, before.independentBits);
  assert.equal(after.fallbackBits, before.fallbackBits);
  assert.equal(lab.deviceRngDerivedValueCount(session), 110);
});

test('Undo decreases fallback only when the undone operation carried genuine manual entropy', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true); // +1 independent bit
  lab.addCoin(session, false, lab.PROVENANCE_DEVICE_RNG); // +0 independent bits
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 1);
  assert.equal(lab.undoLast(session), true); // generated coin
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 1);
  assert.equal(lab.undoLast(session), true); // manual coin
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 0);
});

test('per-source Reset decreases fallback for genuine manual data but generated-value Reset cannot remove nonexistent independent credit', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 16; i += 1) lab.addHexNibble(session, i % 16); // 64 manual bits
  for (let i = 0; i < 40; i += 1) lab.addCoin(session, i % 2 === 0, lab.PROVENANCE_DEVICE_RNG);
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 64);
  lab.resetCoin(session);
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 64);
  lab.resetHex(session);
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 0);
});

test('changing the selected target recalculates fallback cap and full-two-source readiness without altering collected independent entropy', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 160; i += 1) lab.addCoin(session, i % 2 === 0);
  const at128 = lab.strengthSummary(session, 128);
  const at256 = lab.strengthSummary(session, 256);
  assert.equal(at128.independentBits, 160);
  assert.equal(at128.fallbackBits, 128, 'fallback cannot exceed the selected output size');
  assert.equal(at128.fullTwoSourceProtection, true);
  assert.equal(at256.independentBits, 160, 'independent count is not artificially capped to the target');
  assert.equal(at256.fallbackBits, 160);
  assert.equal(at256.fullTwoSourceProtection, false);
});

test('post-mix strength accounting stays tied to source provenance while Reset removes stale fallback credit', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  for (let i = 0; i < 32; i += 1) lab.addCoin(session, i % 2 === 0);
  lab.addCsprngBytes(session, new Uint8Array(16).fill(0x7e));
  lab.mix(session, 128);
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 32, 'mixing burns CSPRNG but does not erase the physical source record');
  lab.resetCoin(session);
  assert.equal(lab.strengthSummary(session, 128).fallbackBits, 0, 'reset must immediately remove the old fallback claim');
});

test('coin + hex exact-bit serialization crosses the source boundary without inserting padding', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);       // 1
  lab.addHexNibble(session, 0x8);   // 1000 => combined 11000... => c0
  assert.equal(hex(lab.sourceEntropyBytes(session)), 'c0');
});

test('coin + discard-dice + hex exact-bit serialization pads only once across all three sources', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);       // 1
  lab.addDiceDiscard(session, 2);   // 01
  lab.addHexNibble(session, 0x8);   // 1000 => 1011000... => b0
  assert.equal(hex(lab.sourceEntropyBytes(session)), 'b0');
});

test('exact-bit serialization preserves chronological ordering across source types', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const coinThenHex = lab.createSession();
  lab.addCoin(coinThenHex, true);
  lab.addHexNibble(coinThenHex, 0x8);

  const hexThenCoin = lab.createSession();
  lab.addHexNibble(hexThenCoin, 0x8);
  lab.addCoin(hexThenCoin, true);

  assert.equal(hex(lab.sourceEntropyBytes(coinThenHex)), 'c0');
  assert.equal(hex(lab.sourceEntropyBytes(hexThenCoin)), '88');
  assert.notEqual(hex(lab.sourceEntropyBytes(coinThenHex)), hex(lab.sourceEntropyBytes(hexThenCoin)));
});

test('reset removes one exact-bit source while preserving surviving event order and one-time padding', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);       // survives
  lab.addHexNibble(session, 0xf);   // removed
  lab.addDiceDiscard(session, 2);   // survives: 01
  lab.addCoin(session, false);      // survives: 0 => 1 01 0 => a0
  lab.resetHex(session);
  assert.equal(hex(lab.sourceEntropyBytes(session)), 'a0');
});

test('undo after mixed-source exact-bit operations removes the exact event without corrupting earlier source ordering', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);
  lab.addHexNibble(session, 0x8);
  lab.addCoin(session, false);
  assert.equal(hex(lab.sourceEntropyBytes(session)), 'c0'); // 1 1000 0 = 110000
  assert.equal(lab.undoLast(session), true); // remove last coin
  assert.equal(hex(lab.sourceEntropyBytes(session)), 'c0'); // 1 1000 = 11000
  assert.equal(lab.undoLast(session), true); // remove hex
  assert.equal(hex(lab.sourceEntropyBytes(session)), '80');
});

test('resetting one exact-bit source does not break a surviving source history entry', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);
  lab.addHexNibble(session, 0xa);
  lab.resetCoin(session);
  assert.equal(hex(lab.sourceEntropyBytes(session)), 'a0');
  assert.equal(lab.undoLast(session), true, 'surviving hex history entry remains undoable');
  assert.equal(lab.sourceEntropyBytes(session).length, 0);
});

test('provenance rejects unknown values instead of silently treating them as manual', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  assert.throws(() => lab.addCoin(session, true, 'mystery'), /provenance must be manual or device-rng/);
  assert.throws(() => lab.addDiceBase6(session, 1, 'mystery'), /provenance must be manual or device-rng/);
  assert.throws(() => lab.addHexNibble(session, 0, 'mystery'), /provenance must be manual or device-rng/);
  assert.throws(() => lab.addCard(session, 0, 'mystery'), /provenance must be manual or device-rng/);
  assert.equal(lab.guaranteedBits(session), 0);
});

test('corrupted stored exact-bit provenance fails closed before reporting, serialization, status, or mix output', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;
  const session = lab.createSession();
  lab.addCoin(session, true);
  lab.addCsprngBytes(session, new Uint8Array(16).fill(0xa5));

  session.exactBitEvents[0].provenance = 'mystery';
  const consumedBefore = session.csprngConsumed;

  assert.throws(() => lab.guaranteedBits(session), /invalid stored provenance/i);
  assert.throws(() => lab.strengthSummary(session, 128), /invalid stored provenance/i);
  assert.throws(() => lab.deviceRngDerivedValueCount(session), /invalid stored provenance/i);
  assert.throws(() => lab.sourceEntropyBytes(session), /invalid stored provenance/i);
  assert.throws(() => lab.mix(session, 128), /invalid stored provenance/i);
  assert.equal(session.csprngConsumed, consumedBefore, 'failed provenance validation must burn no CSPRNG bytes');
});

test('corrupted stored base-6 dice and card provenance fail closed before security claims', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;

  const dice = lab.createSession();
  lab.addDiceBase6(dice, 6);
  dice.diceProvenance[0] = 'mystery';
  assert.throws(() => lab.diceGuaranteedBits(dice), /invalid stored provenance/i);
  assert.throws(() => lab.strengthSummary(dice, 128), /invalid stored provenance/i);

  const cards = lab.createSession();
  lab.addCard(cards, 0);
  cards.cardProvenance[0] = 'mystery';
  assert.throws(() => lab.cardGuaranteedBits(cards), /invalid stored provenance/i);
  assert.throws(() => lab.strengthSummary(cards, 128), /invalid stored provenance/i);
});

test('valid provenance values that disagree between exact-bit mirrors fail closed as ambiguous state', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;

  const coin = lab.createSession();
  lab.addCoin(coin, true, lab.PROVENANCE_MANUAL);
  coin.exactBitEvents[0].provenance = lab.PROVENANCE_DEVICE_RNG;
  assert.throws(() => lab.guaranteedBits(coin), /stored provenance state is inconsistent/i);

  const hexSession = lab.createSession();
  lab.addHexNibble(hexSession, 0xa, lab.PROVENANCE_MANUAL);
  hexSession.hexProvenance[0] = lab.PROVENANCE_DEVICE_RNG;
  assert.throws(() => lab.sourceEntropyBytes(hexSession), /stored provenance state is inconsistent/i);
});

test('provenance/state length inconsistencies fail closed for exact-bit, base-6 dice, and cards', () => {
  const context = createContext();
  const lab = context.__coldboxEntropyLab;

  const discard = lab.createSession();
  lab.addDiceDiscard(discard, 2);
  discard.discardDiceProvenance.pop();
  assert.throws(() => lab.sourceEntropyBytes(discard), /stored provenance state is inconsistent/i);

  const dice = lab.createSession();
  lab.addDiceBase6(dice, 2);
  dice.diceProvenance.pop();
  assert.throws(() => lab.guaranteedBits(dice), /stored provenance state is inconsistent/i);

  const cards = lab.createSession();
  lab.addCard(cards, 0);
  cards.cardDrawPoolSizes.pop();
  assert.throws(() => lab.strengthSummary(cards, 128), /stored provenance state is inconsistent/i);

  const coin = lab.createSession();
  lab.addCoin(coin, false);
  coin.exactBitEvents.pop();
  assert.throws(() => lab.sourceEntropyBytes(coin), /stored provenance state is inconsistent/i);
});