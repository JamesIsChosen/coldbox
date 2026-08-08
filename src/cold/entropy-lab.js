(function (global) {
  'use strict';

  // Entropy Lab (P1.1). Pure accumulation and mixing logic. No DOM access here
  // — src/cold/main.js owns wiring the buttons in src/cold/index.html to the
  // functions exposed at the bottom of this file. Keeping this file DOM-free
  // matches crypto.js/vault.js and makes it evaluable in a plain vm sandbox
  // for testing (test/entropy-lab.test.js).
  //
  // Design, and why it looks the way it does, is recorded in
  // docs/05-development/adr/0022-entropy-lab-mixing.md. Summary: manual
  // sources (dice, coins, cards, hex) are accumulated exactly, with no
  // floating-point arithmetic anywhere on this path — every "how many bits do
  // we have" answer is computed from an integer bit-length so two runs on two
  // machines can never disagree by a rounding error. The final mix step is
  // SHA-256(counter || (manualBytes XOR csprngBytes)), expanded block by
  // block, so neither a rigged die nor a rigged CSPRNG alone determines the
  // output: the CSPRNG only cancels manual bias, and the hash whitens the
  // combination and prevents feeding back a chosen CSPRNG value that would
  // let an attacker predict the digest structure of the XOR.

  var noble = global.__coldboxNobleCrypto;

  var VALID_TARGET_BITS = Object.freeze([128, 160, 192, 224, 256]);

  function isValidTargetBits(bits) {
    return VALID_TARGET_BITS.indexOf(bits) !== -1;
  }

  function bitLengthOfBigInt(value) {
    if (value < 0n) {
      throw new Error('Entropy Lab internal error: negative accumulator.');
    }
    if (value === 0n) {
      return 0;
    }
    return value.toString(2).length;
  }

  // Guaranteed (conservative) bits available from a value drawn uniformly at
  // random from [0, range). range's bit-length b means range is in
  // (2^(b-1), 2^b], so the true guessing-resistance is at least b-1 bits —
  // never inflate this to b, which would overclaim by up to one bit whenever
  // range happens to sit just above a power of two.
  function guaranteedBitsForRange(rangeBigInt) {
    var bitLength = bitLengthOfBigInt(rangeBigInt);
    return bitLength > 0 ? bitLength - 1 : 0;
  }

  function bigIntToBytes(value, byteLength) {
    if (value < 0n) {
      throw new Error('Entropy Lab internal error: negative accumulator.');
    }
    var bytes = new Uint8Array(byteLength);
    var remaining = value;
    for (var index = byteLength - 1; index >= 0; index -= 1) {
      bytes[index] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
    if (remaining !== 0n) {
      throw new Error('Entropy Lab internal error: accumulator overflowed its byte length.');
    }
    return bytes;
  }

  function bytesNeededForRange(rangeBigInt) {
    return Math.ceil(bitLengthOfBigInt(rangeBigInt) / 8);
  }

  function concatBytes() {
    var total = 0;
    for (var i = 0; i < arguments.length; i += 1) {
      total += arguments[i].length;
    }
    var output = new Uint8Array(total);
    var offset = 0;
    for (var j = 0; j < arguments.length; j += 1) {
      output.set(arguments[j], offset);
      offset += arguments[j].length;
    }
    return output;
  }

  function xorBytes(left, right) {
    if (left.length !== right.length) {
      throw new Error('Entropy Lab internal error: XOR operands must be equal length.');
    }
    var output = new Uint8Array(left.length);
    for (var i = 0; i < left.length; i += 1) {
      output[i] = left[i] ^ right[i];
    }
    return output;
  }

  function uint32BE(value) {
    var bytes = new Uint8Array(4);
    bytes[0] = (value >>> 24) & 0xff;
    bytes[1] = (value >>> 16) & 0xff;
    bytes[2] = (value >>> 8) & 0xff;
    bytes[3] = value & 0xff;
    return bytes;
  }

  function bitsToBytes(bits) {
    var byteLength = Math.ceil(bits.length / 8);
    var output = new Uint8Array(byteLength);
    for (var index = 0; index < bits.length; index += 1) {
      if (bits[index]) {
        var byteIndex = Math.floor(index / 8);
        var bitOffset = 7 - (index % 8);
        output[byteIndex] |= (1 << bitOffset);
      }
    }
    return output;
  }

  // --- Session -------------------------------------------------------------
  //
  // A session accumulates three kinds of source material -
  //   exactBits    — coin flips (1 bit), 4-outcome discard dice (2 bits),
  //                  hex nibbles (4 bits): each unit is claimed to be exactly
  //                  uniform by construction, so these bits are appended
  //                  directly with no accumulator math needed.
  //   diceBase6    — d6 rolls kept in a base-6 accumulator (mixed-radix
  //                  BigInt), because a single d6 roll is not a whole number
  //                  of bits (log2(6) ≈ 2.585).
  //   cardDraws    — cards drawn without replacement from a 52-card deck,
  //                  kept in a factorial-number-system accumulator, because
  //                  each draw's information content shrinks as the deck
  //                  empties (log2(remaining) bits).
  //
  // Every add* function returns a plain-object undo token; undo(session,
  // token) reverses exactly that call. Tokens are pushed onto session.history
  // by the caller so "undo last" is history.pop() -> undo(session, token).

  function createSession() {
    return {
      exactBits: [],
      diceDigits: [],
      diceValue: 0n,
      cardOrder: [],
      cardRemaining: Array.from({ length: 52 }, function (_, i) { return i; }),
      cardValue: 0n,
      csprngBytes: new Uint8Array(0),
      history: []
    };
  }

  function pushHistory(session, undoFn) {
    session.history.push(undoFn);
  }

  function undoLast(session) {
    var undoFn = session.history.pop();
    if (!undoFn) {
      return false;
    }
    undoFn();
    return true;
  }

  function addExactBits(session, bitArray, label) {
    var start = session.exactBits.length;
    for (var i = 0; i < bitArray.length; i += 1) {
      var bit = bitArray[i];
      if (bit !== 0 && bit !== 1) {
        throw new Error(`Entropy Lab: ${label} bits must be 0 or 1.`);
      }
      session.exactBits.push(bit);
    }
    pushHistory(session, function () {
      session.exactBits.length = start;
    });
  }

  function addCoin(session, isHeads) {
    addExactBits(session, [isHeads ? 1 : 0], 'coin flip');
  }

  // Roll a d6, keep it only if it lands 1-4 (2 bits, exactly unbiased); a
  // 5 or 6 is discarded and contributes nothing. This is the classical
  // rejection-sampling construction for turning a biased-width die into
  // exactly uniform bits without wasting the whole roll on log2(6) fractional
  // bookkeeping. Returns whether the roll was accepted.
  function addDiceDiscard(session, face) {
    if (!Number.isInteger(face) || face < 1 || face > 6) {
      throw new Error('Entropy Lab: die face must be an integer 1-6.');
    }
    if (face > 4) {
      pushHistory(session, function () {});
      return false;
    }
    var value = face - 1; // 0..3
    addExactBits(session, [(value >> 1) & 1, value & 1], 'discard-mapped die roll');
    return true;
  }

  function addHexNibble(session, nibble) {
    if (!Number.isInteger(nibble) || nibble < 0 || nibble > 15) {
      throw new Error('Entropy Lab: hex nibble must be an integer 0-15.');
    }
    addExactBits(
      session,
      [(nibble >> 3) & 1, (nibble >> 2) & 1, (nibble >> 1) & 1, nibble & 1],
      'hex nibble'
    );
  }

  // Base-6 accumulation: value = value*6 + digit. Every roll multiplies the
  // representable range by 6, so n rolls span [0, 6^n) — a range whose
  // bit-length gives the guaranteed bits via guaranteedBitsForRange, with no
  // per-roll floating point.
  function addDiceBase6(session, face) {
    if (!Number.isInteger(face) || face < 1 || face > 6) {
      throw new Error('Entropy Lab: die face must be an integer 1-6.');
    }
    var previousValue = session.diceValue;
    var previousDigits = session.diceDigits.length;
    session.diceValue = session.diceValue * 6n + BigInt(face - 1);
    session.diceDigits.push(face - 1);
    pushHistory(session, function () {
      session.diceValue = previousValue;
      session.diceDigits.length = previousDigits;
    });
  }

  // Card draw: cardId is 0-51 (a fixed index into a standard 52-card deck;
  // the UI is responsible for the suit/rank <-> index mapping shown to the
  // user). Cards cannot repeat. Accumulated with the factorial number system -
  // value = value*remainingCountBeforeDraw + rankAmongRemaining, then that
  // card is removed from the remaining pool. This is a bijection between a
  // sequence of k draws-without-replacement and an integer in
  // [0, 52!/(52-k)!), matching the "cards" source in SPEC.md 11.
  function addCard(session, cardId) {
    if (!Number.isInteger(cardId) || cardId < 0 || cardId > 51) {
      throw new Error('Entropy Lab: card id must be an integer 0-51.');
    }
    var rank = session.cardRemaining.indexOf(cardId);
    if (rank === -1) {
      throw new Error('Entropy Lab: that card was already drawn this session.');
    }
    var previousValue = session.cardValue;
    var previousOrder = session.cardOrder.length;
    var previousRemaining = session.cardRemaining.slice();
    session.cardValue = session.cardValue * BigInt(session.cardRemaining.length) + BigInt(rank);
    session.cardRemaining.splice(rank, 1);
    session.cardOrder.push(cardId);
    pushHistory(session, function () {
      session.cardValue = previousValue;
      session.cardOrder.length = previousOrder;
      session.cardRemaining = previousRemaining;
    });
  }

  function addCsprngBytes(session, bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('Entropy Lab: CSPRNG draw must be a non-empty Uint8Array.');
    }
    var previous = session.csprngBytes;
    session.csprngBytes = concatBytes(session.csprngBytes, bytes);
    pushHistory(session, function () {
      session.csprngBytes = previous;
    });
  }

  // --- Reporting -------------------------------------------------------------

  function diceGuaranteedBits(session) {
    if (session.diceDigits.length === 0) {
      return 0;
    }
    return guaranteedBitsForRange(6n ** BigInt(session.diceDigits.length));
  }

  function cardGuaranteedBits(session) {
    var drawn = session.cardOrder.length;
    if (drawn === 0) {
      return 0;
    }
    var range = 1n;
    for (var i = 0; i < drawn; i += 1) {
      range *= BigInt(52 - i);
    }
    return guaranteedBitsForRange(range);
  }

  // The conservative, hard-floor bit count the meter and the mix gate use.
  // "Guaranteed" because it is derived from the size of the possibility
  // space, never from the actual sampled value — the whole point of
  // min-entropy accounting (SPEC.md 11.1a) is that it must not depend on
  // which outcome happened to occur.
  function guaranteedBits(session) {
    return session.exactBits.length + diceGuaranteedBits(session) + cardGuaranteedBits(session);
  }

  function manualEntropyBytes(session) {
    var pieces = [bitsToBytes(session.exactBits)];
    if (session.diceDigits.length > 0) {
      pieces.push(bigIntToBytes(session.diceValue, bytesNeededForRange(6n ** BigInt(session.diceDigits.length))));
    }
    if (session.cardOrder.length > 0) {
      var range = 1n;
      for (var i = 0; i < session.cardOrder.length; i += 1) {
        range *= BigInt(52 - i);
      }
      pieces.push(bigIntToBytes(session.cardValue, bytesNeededForRange(range)));
    }
    return concatBytes.apply(null, pieces);
  }

  // --- Mixing ------------------------------------------------------------
  //
  // Fails closed (throws, produces nothing) rather than silently returning
  // fewer bits than requested, a shorter mix, or reusing stale CSPRNG bytes.

  function mix(session, targetBits) {
    if (!isValidTargetBits(targetBits)) {
      throw new Error(`Entropy Lab: targetBits must be one of ${VALID_TARGET_BITS.join(', ')}.`);
    }
    if (!noble || typeof noble.sha256 !== 'function') {
      throw new Error('Entropy Lab: SHA-256 is unavailable; refusing to mix without it.');
    }
    var available = guaranteedBits(session);
    if (available < targetBits) {
      throw new Error(`Entropy Lab: only ${available} guaranteed bits collected; ${targetBits} are required. Keep collecting before mixing.`);
    }
    var manualBytes = manualEntropyBytes(session);
    if (session.csprngBytes.length < manualBytes.length) {
      throw new Error(`Entropy Lab: need at least ${manualBytes.length} CSPRNG bytes to XOR against manual entropy; have ${session.csprngBytes.length}. Draw more CSPRNG bytes.`);
    }
    var csprngSlice = session.csprngBytes.slice(0, manualBytes.length);
    var xored = xorBytes(manualBytes, csprngSlice);

    var targetBytes = targetBits / 8;
    var output = new Uint8Array(targetBytes);
    var filled = 0;
    var counter = 0;
    while (filled < targetBytes) {
      var block = noble.sha256(concatBytes(uint32BE(counter), xored));
      var take = Math.min(block.length, targetBytes - filled);
      output.set(block.subarray(0, take), filled);
      filled += take;
      counter += 1;
    }
    return output;
  }

  global.__coldboxEntropyLab = Object.freeze({
    VALID_TARGET_BITS: VALID_TARGET_BITS,
    isValidTargetBits: isValidTargetBits,
    createSession: createSession,
    undoLast: undoLast,
    addCoin: addCoin,
    addDiceDiscard: addDiceDiscard,
    addDiceBase6: addDiceBase6,
    addHexNibble: addHexNibble,
    addCard: addCard,
    addCsprngBytes: addCsprngBytes,
    guaranteedBits: guaranteedBits,
    diceGuaranteedBits: diceGuaranteedBits,
    cardGuaranteedBits: cardGuaranteedBits,
    manualEntropyBytes: manualEntropyBytes,
    mix: mix,
    // Exposed for testing against independently-computed vectors only; not
    // used by the wiring in main.js.
    _internal: {
      bitLengthOfBigInt: bitLengthOfBigInt,
      guaranteedBitsForRange: guaranteedBitsForRange,
      bigIntToBytes: bigIntToBytes,
      bytesNeededForRange: bytesNeededForRange,
      xorBytes: xorBytes,
      concatBytes: concatBytes,
      bitsToBytes: bitsToBytes
    }
  });
}(window));
