(function (global) {
  'use strict';

  // Entropy Lab (P1.1). Pure accumulation and mixing logic. No DOM access here
  // — src/cold/main.js owns wiring the buttons in src/cold/index.html to the
  // functions exposed at the bottom of this file. Keeping this file DOM-free
  // matches crypto.js/vault.js and makes it evaluable in a plain vm sandbox
  // for testing (test/entropy-lab.test.js).
  //
  // Design, and why it looks the way it does, is recorded in
  // docs/05-development/adr/0022-entropy-lab-mixing.md (revised after the
  // P1.1 review round — see that ADR's amendment note). Summary: manual
  // sources (dice, coins, cards, hex) are accumulated exactly, with no
  // floating-point arithmetic anywhere on this path — every "how many bits do
  // we have" answer is computed from an integer bit-length so two runs on two
  // machines can never disagree by a rounding error.
  //
  // Two mix paths, both fail-closed and both consume ("burn") the CSPRNG
  // bytes they use so a second mix() call can never silently replay them -
  //   - No manual entropy recorded: CSPRNG is a source in its own right per
  //     entropy-and-strength.md ("256 bits by definition"), so the requested
  //     number of fresh CSPRNG bytes is returned directly.
  //   - Manual entropy recorded: output is exactly SHA-256(manualBytes XOR
  //     csprngBytes) truncated to the requested length, matching the literal
  //     formula documented in entropy-and-strength.md and first-wallet.md. A
  //     single SHA-256 block is 32 bytes, which already covers every valid
  //     target size (128-256 bits = 16-32 bytes), so no block-counter
  //     expansion is needed and none is used. The manual side must
  //     independently reach the requested bit count before mixing is
  //     allowed — defense in depth, so a compromised or backdoored CSPRNG
  //     cannot reduce security below the target even though it also
  //     contributes to the output.

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
      // Pool size recorded *before* each draw, in draw order. Kept separate
      // from cardOrder.length because a reshuffle (startNewCardShuffle)
      // resets cardRemaining back to 52 without resetting cardOrder or
      // cardValue, so a second (or third...) pass through the deck keeps
      // compounding entropy into the same factorial-number-system
      // accumulator rather than starting over. cardGuaranteedBits/
      // manualEntropyBytes multiply this array, not a formula assuming a
      // single unbroken 52-down-to-0 sequence.
      cardDrawPoolSizes: [],
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
  // user). A card cannot repeat *within the current shuffle* (i.e. since the
  // pool was last full) — see startNewCardShuffle below for drawing more
  // than 52 cards' worth of entropy. Accumulated with the factorial number
  // system - value = value*remainingCountBeforeDraw + rankAmongRemaining,
  // then that card is removed from the remaining pool. This is a bijection
  // between a sequence of k draws-without-replacement (within one shuffle)
  // and an integer in [0, 52!/(52-k)!), matching the "cards" source in
  // SPEC.md 11; chaining shuffles multiplies further ranges into the same
  // accumulator, matching entropy-and-strength.md's "1 shuffle ~= 225 bits,
  // 2 shuffles" row for a 256-bit target.
  function addCard(session, cardId) {
    if (!Number.isInteger(cardId) || cardId < 0 || cardId > 51) {
      throw new Error('Entropy Lab: card id must be an integer 0-51.');
    }
    var rank = session.cardRemaining.indexOf(cardId);
    if (rank === -1) {
      throw new Error('Entropy Lab: that card was already drawn this shuffle.');
    }
    var previousValue = session.cardValue;
    var previousOrder = session.cardOrder.length;
    var previousPoolSizes = session.cardDrawPoolSizes.length;
    var previousRemaining = session.cardRemaining.slice();
    var remainingCountBeforeDraw = session.cardRemaining.length;
    session.cardValue = session.cardValue * BigInt(remainingCountBeforeDraw) + BigInt(rank);
    session.cardRemaining.splice(rank, 1);
    session.cardOrder.push(cardId);
    session.cardDrawPoolSizes.push(remainingCountBeforeDraw);
    pushHistory(session, function () {
      session.cardValue = previousValue;
      session.cardOrder.length = previousOrder;
      session.cardDrawPoolSizes.length = previousPoolSizes;
      session.cardRemaining = previousRemaining;
    });
  }

  // Once a shuffle's pool is exhausted (all 52 drawn since the last full
  // pool), this refills it to draw further cards, compounding entropy into
  // the same accumulator rather than resetting it — see addCard's comment
  // and ADR-0022's amendment. Refuses (fails closed) to reshuffle early: a
  // partial pool means the current shuffle's information content hasn't
  // been fully realized yet, and refilling mid-shuffle would let the same
  // remaining cards be redrawn while double-counting the pool size in
  // cardGuaranteedBits.
  function startNewCardShuffle(session) {
    if (session.cardRemaining.length !== 0) {
      throw new Error(`Entropy Lab: ${session.cardRemaining.length} card(s) remain in the current shuffle; draw them before starting a new one.`);
    }
    var previousRemaining = session.cardRemaining;
    session.cardRemaining = Array.from({ length: 52 }, function (_, i) { return i; });
    pushHistory(session, function () {
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

  function cardRange(session) {
    var range = 1n;
    for (var i = 0; i < session.cardDrawPoolSizes.length; i += 1) {
      range *= BigInt(session.cardDrawPoolSizes[i]);
    }
    return range;
  }

  function cardGuaranteedBits(session) {
    if (session.cardOrder.length === 0) {
      return 0;
    }
    return guaranteedBitsForRange(cardRange(session));
  }

  // CSPRNG bytes are "256 bits by definition" (entropy-and-strength.md) —
  // full guaranteed entropy per byte, whether they end up used alone (no
  // manual entropy recorded) or XORed against manual entropy during mixing.
  function csprngGuaranteedBits(session) {
    return session.csprngBytes.length * 8;
  }

  // The conservative, hard-floor bit count the meter and the mix gate use
  // for *manually recorded* entropy (dice, coins, cards, hex) only —
  // "guaranteed" because it is derived from the size of the possibility
  // space, never from the actual sampled value, per SPEC.md 11.1a's
  // min-entropy accounting. CSPRNG bits are reported separately
  // (csprngGuaranteedBits) rather than summed in here: see mix()'s comment
  // for why a CSPRNG-only session and a manual+CSPRNG mix use different
  // gates rather than one combined total.
  function guaranteedBits(session) {
    return session.exactBits.length + diceGuaranteedBits(session) + cardGuaranteedBits(session);
  }

  function manualEntropyBytes(session) {
    var pieces = [bitsToBytes(session.exactBits)];
    if (session.diceDigits.length > 0) {
      pieces.push(bigIntToBytes(session.diceValue, bytesNeededForRange(6n ** BigInt(session.diceDigits.length))));
    }
    if (session.cardOrder.length > 0) {
      pieces.push(bigIntToBytes(session.cardValue, bytesNeededForRange(cardRange(session))));
    }
    return concatBytes.apply(null, pieces);
  }

  // --- Mixing ------------------------------------------------------------
  //
  // Fails closed (throws, produces nothing) rather than silently returning
  // fewer bits than requested, a shorter mix, or reusing stale CSPRNG bytes.
  // Every CSPRNG byte actually used by a mix() call is removed from
  // session.csprngBytes before returning, so a second mix() call with no
  // intervening CSPRNG draw fails the same way running out of CSPRNG bytes
  // always fails, rather than silently reusing them.

  function mix(session, targetBits) {
    if (!isValidTargetBits(targetBits)) {
      throw new Error(`Entropy Lab: targetBits must be one of ${VALID_TARGET_BITS.join(', ')}.`);
    }
    var targetBytes = targetBits / 8;
    var manualBytes = manualEntropyBytes(session);

    if (manualBytes.length === 0) {
      // Pure-CSPRNG path (SPEC.md 11: CSPRNG is a source in its own right,
      // not only a mixing ingredient; entropy-and-strength.md: "256 bits by
      // definition"). No manual entropy means there is nothing to XOR
      // against, so the requested number of fresh bytes is used directly
      // rather than hashed — hashing CSPRNG output would not add security
      // and would contradict that section's literal description.
      if (session.csprngBytes.length < targetBytes) {
        throw new Error(`Entropy Lab: need ${targetBytes} CSPRNG bytes for a ${targetBits}-bit CSPRNG-only draw; have ${session.csprngBytes.length}. Draw more CSPRNG bytes, or record some manual (dice/coin/card/hex) entropy to mix instead.`);
      }
      var direct = session.csprngBytes.slice(0, targetBytes);
      session.csprngBytes = session.csprngBytes.slice(targetBytes);
      return direct;
    }

    // Mixed path. The manual side must independently reach the target
    // *before* CSPRNG is allowed to help — defense in depth, so a
    // compromised/backdoored CSPRNG cannot pull security below the target
    // even though it also contributes to the final output (ADR-0022).
    var available = guaranteedBits(session);
    if (available < targetBits) {
      throw new Error(`Entropy Lab: only ${available} guaranteed manual bits collected; ${targetBits} are required before mixing. Keep collecting, or clear manual entropy to use a CSPRNG-only draw instead.`);
    }
    if (!noble || typeof noble.sha256 !== 'function') {
      throw new Error('Entropy Lab: SHA-256 is unavailable; refusing to mix without it.');
    }
    if (session.csprngBytes.length < manualBytes.length) {
      throw new Error(`Entropy Lab: need at least ${manualBytes.length} CSPRNG bytes to XOR against manual entropy; have ${session.csprngBytes.length}. Draw more CSPRNG bytes.`);
    }
    var csprngSlice = session.csprngBytes.slice(0, manualBytes.length);
    var xored = xorBytes(manualBytes, csprngSlice);
    // A single SHA-256 block is 32 bytes, which already covers the largest
    // valid target (256 bits = 32 bytes), so the digest is truncated
    // directly rather than expanded — matching the literal
    // SHA-256(manual XOR csprng) formula in entropy-and-strength.md and
    // first-wallet.md, with no block-counter construction of our own.
    var digest = noble.sha256(xored);
    var output = new Uint8Array(digest.slice(0, targetBytes));
    session.csprngBytes = session.csprngBytes.slice(manualBytes.length);
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
    startNewCardShuffle: startNewCardShuffle,
    addCsprngBytes: addCsprngBytes,
    guaranteedBits: guaranteedBits,
    diceGuaranteedBits: diceGuaranteedBits,
    cardGuaranteedBits: cardGuaranteedBits,
    csprngGuaranteedBits: csprngGuaranteedBits,
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
