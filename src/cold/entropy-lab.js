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
  // A session accumulates five kinds of source material, one per Entropy Lab
  // fieldset in the UI, each independently resettable (resetDice/resetCoin/
  // resetHex/resetCards/resetCsprng below) —
  //   coinBits        — coin flips: 1 bit each, exactly uniform by
  //                     construction, appended directly.
  //   discardDiceBits — 4-outcome discard dice: 2 bits per accepted roll,
  //                     also appended directly.
  //   hexBits         — typed hex digits: 4 bits each, appended directly.
  //   diceDigits/     — base-6 d6 rolls kept in a base-6 accumulator
  //   diceValue         (mixed-radix BigInt), because a single d6 roll is
  //                     not a whole number of bits (log2(6) ≈ 2.585).
  //   cardOrder/      — cards drawn without replacement from a 52-card
  //   cardValue         deck, kept in a factorial-number-system accumulator,
  //                     because each draw's information content shrinks as
  //                     the deck empties (log2(remaining) bits).
  //
  // These were originally one shared exactBits array for coin/discard-dice/
  // hex combined; a round of hands-on testing after the second review round
  // found that sharing state made a per-source Reset button impossible to
  // implement without also wiping the other two sources sharing the array,
  // so they were split. manualEntropyBytes' concatenation order (below) is
  // fixed and load-bearing for test vectors, same as before the split.
  //
  // Every add*/reset* function pushes a {kind, undo} entry onto
  // session.history; undo(session) pops and calls the top entry's undo().
  // reset*(session) additionally *purges* every history entry whose kind
  // matches the source being reset (see purgeHistoryKind) — without that,
  // a stale undo closure captured before the reset could restore state the
  // reset just deliberately discarded, the same class of bug the CSPRNG
  // burn-survives-undo fix (csprngConsumed, above) exists to prevent.

  function createSession() {
    return {
      coinBits: [],
      discardDiceBits: [],
      hexBits: [],
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
      // csprngBytes holds every byte ever drawn this session, in draw order,
      // and is *never shrunk* except by undoing the draw that appended a
      // given tail (see addCsprngBytes). csprngConsumed is a byte offset
      // that only ever moves forward (mix() advances it; nothing moves it
      // backward) marking how many leading bytes are already spent and
      // therefore permanently unavailable — see availableCsprngBytes() and
      // the comment on addCsprngBytes's undo closure for why this two-part
      // design exists: a review round found that treating csprngBytes as a
      // single mutable buffer that mix() shortens from the front let an
      // earlier draw's undo closure (which had captured a pre-mix snapshot)
      // silently restore already-spent bytes when popped after the mix.
      // Tracking "spent" as a monotonic offset instead of a destructive
      // slice makes that resurrection structurally impossible: undoing a
      // draw can only ever truncate the array (removing bytes, including
      // ones already marked spent), never regrow it.
      csprngBytes: new Uint8Array(0),
      csprngConsumed: 0,
      history: []
    };
  }

  // Bytes not yet used by any mix() call. Always csprngBytes.subarray(from
  // csprngConsumed onward) — never a separately mutated buffer, so there is
  // exactly one place that decides what's available.
  function availableCsprngBytes(session) {
    return session.csprngBytes.subarray(session.csprngConsumed);
  }

  function pushHistory(session, kind, undoFn) {
    session.history.push({ kind: kind, undo: undoFn });
  }

  function undoLast(session) {
    var entry = session.history.pop();
    if (!entry) {
      return false;
    }
    entry.undo();
    return true;
  }

  // Discards every history entry of the given kind, wherever it sits in the
  // stack (not just the top) — used by reset*() so a Reset button's effect
  // can never be undone piecemeal via the *other* source's undo entries
  // popping past it, nor can a stale pre-reset closure for this source
  // resurface later. Entries for other sources keep their relative order.
  function purgeHistoryKind(session, kind) {
    session.history = session.history.filter(function (entry) {
      return entry.kind !== kind;
    });
  }

  function addBitsToArray(session, array, bitArray, label) {
    var start = array.length;
    for (var i = 0; i < bitArray.length; i += 1) {
      var bit = bitArray[i];
      if (bit !== 0 && bit !== 1) {
        throw new Error(`Entropy Lab: ${label} bits must be 0 or 1.`);
      }
      array.push(bit);
    }
  }

  function addCoin(session, isHeads) {
    var start = session.coinBits.length;
    addBitsToArray(session, session.coinBits, [isHeads ? 1 : 0], 'coin flip');
    pushHistory(session, 'coin', function () {
      session.coinBits.length = start;
    });
  }

  function resetCoin(session) {
    session.coinBits = [];
    purgeHistoryKind(session, 'coin');
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
      pushHistory(session, 'dice', function () {});
      return false;
    }
    var value = face - 1; // 0..3
    var start = session.discardDiceBits.length;
    addBitsToArray(session, session.discardDiceBits, [(value >> 1) & 1, value & 1], 'discard-mapped die roll');
    pushHistory(session, 'dice', function () {
      session.discardDiceBits.length = start;
    });
    return true;
  }

  function addHexNibble(session, nibble) {
    if (!Number.isInteger(nibble) || nibble < 0 || nibble > 15) {
      throw new Error('Entropy Lab: hex nibble must be an integer 0-15.');
    }
    var start = session.hexBits.length;
    addBitsToArray(
      session,
      session.hexBits,
      [(nibble >> 3) & 1, (nibble >> 2) & 1, (nibble >> 1) & 1, nibble & 1],
      'hex nibble'
    );
    pushHistory(session, 'hex', function () {
      session.hexBits.length = start;
    });
  }

  function resetHex(session) {
    session.hexBits = [];
    purgeHistoryKind(session, 'hex');
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
    pushHistory(session, 'dice', function () {
      session.diceValue = previousValue;
      session.diceDigits.length = previousDigits;
    });
  }

  // Clears *both* dice sub-modes (base-6 and 4-outcome-discard) — the UI
  // presents them as one "Dice" fieldset with one Reset button, since a
  // user switching between the two modes mid-collection is exactly the
  // case a single combined reset needs to handle cleanly.
  function resetDice(session) {
    session.diceDigits = [];
    session.diceValue = 0n;
    session.discardDiceBits = [];
    purgeHistoryKind(session, 'dice');
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
    pushHistory(session, 'card', function () {
      session.cardValue = previousValue;
      session.cardOrder.length = previousOrder;
      session.cardDrawPoolSizes.length = previousPoolSizes;
      session.cardRemaining = previousRemaining;
    });
  }

  function resetCards(session) {
    session.cardOrder = [];
    session.cardValue = 0n;
    session.cardDrawPoolSizes = [];
    session.cardRemaining = Array.from({ length: 52 }, function (_, i) { return i; });
    purgeHistoryKind(session, 'card');
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
    pushHistory(session, 'card', function () {
      session.cardRemaining = previousRemaining;
    });
  }

  function addCsprngBytes(session, bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('Entropy Lab: CSPRNG draw must be a non-empty Uint8Array.');
    }
    var previousLength = session.csprngBytes.length;
    session.csprngBytes = concatBytes(session.csprngBytes, bytes);
    pushHistory(session, 'csprng', function () {
      // Truncate back to the length this draw appended to, rather than
      // restoring a captured array reference. Truncation can only remove
      // bytes (including ones mix() has since marked spent), never regrow
      // ones that were removed — see createSession's comment on
      // csprngConsumed for why that distinction is the actual fix for the
      // undo-resurrects-spent-bytes finding. csprngConsumed is clamped down
      // (never up) so it never exceeds the now-shorter array.
      session.csprngBytes = session.csprngBytes.slice(0, previousLength);
      session.csprngConsumed = Math.min(session.csprngConsumed, previousLength);
    });
  }

  function resetCsprng(session) {
    session.csprngBytes = new Uint8Array(0);
    session.csprngConsumed = 0;
    purgeHistoryKind(session, 'csprng');
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
  // Counts only *available* (unspent) bytes — see availableCsprngBytes.
  function csprngGuaranteedBits(session) {
    return availableCsprngBytes(session).length * 8;
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
    return session.coinBits.length + session.discardDiceBits.length + session.hexBits.length
      + diceGuaranteedBits(session) + cardGuaranteedBits(session);
  }

  // Concatenation order is fixed and load-bearing for test/entropy-lab.test.js's
  // vectors: coin bits, then discard-dice bits, then hex bits, then the
  // base-6 dice accumulator, then the card accumulator. Any source not used
  // contributes zero bytes at its position, same as before the exactBits
  // split — three separate (possibly empty) bit arrays packed independently
  // is equivalent to packing one concatenated array, since bitsToBytes pads
  // each to a whole byte boundary the same way whichever way it's split.
  function manualEntropyBytes(session) {
    var pieces = [
      bitsToBytes(session.coinBits),
      bitsToBytes(session.discardDiceBits),
      bitsToBytes(session.hexBits)
    ];
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
  // Every CSPRNG byte actually used by a mix() call is marked spent by
  // advancing session.csprngConsumed (never by shortening session.csprngBytes
  // itself — see createSession's comment), so a second mix() call with no
  // intervening CSPRNG draw fails the same way running out of CSPRNG bytes
  // always fails, and undoing an earlier draw can never bring spent bytes
  // back into availableCsprngBytes()'s view.

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
      var availableForDirect = availableCsprngBytes(session);
      if (availableForDirect.length < targetBytes) {
        throw new Error(`Entropy Lab: need ${targetBytes} CSPRNG bytes for a ${targetBits}-bit CSPRNG-only draw; have ${availableForDirect.length}. Draw more CSPRNG bytes, or record some manual (dice/coin/card/hex) entropy to mix instead.`);
      }
      var direct = new Uint8Array(availableForDirect.slice(0, targetBytes));
      // Advancing the offset, never shortening session.csprngBytes itself,
      // is what makes this consumption survive undo of an earlier draw —
      // see createSession's comment on csprngConsumed.
      session.csprngConsumed += targetBytes;
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
    var availableForMix = availableCsprngBytes(session);
    if (availableForMix.length < manualBytes.length) {
      throw new Error(`Entropy Lab: need at least ${manualBytes.length} CSPRNG bytes to XOR against manual entropy; have ${availableForMix.length}. Draw more CSPRNG bytes.`);
    }
    var csprngSlice = availableForMix.slice(0, manualBytes.length);
    var xored = xorBytes(manualBytes, csprngSlice);
    // A single SHA-256 block is 32 bytes, which already covers the largest
    // valid target (256 bits = 32 bytes), so the digest is truncated
    // directly rather than expanded — matching the literal
    // SHA-256(manual XOR csprng) formula in entropy-and-strength.md and
    // first-wallet.md, with no block-counter construction of our own.
    var digest = noble.sha256(xored);
    var output = new Uint8Array(digest.slice(0, targetBytes));
    session.csprngConsumed += manualBytes.length;
    return output;
  }

  global.__coldboxEntropyLab = Object.freeze({
    VALID_TARGET_BITS: VALID_TARGET_BITS,
    isValidTargetBits: isValidTargetBits,
    createSession: createSession,
    undoLast: undoLast,
    addCoin: addCoin,
    resetCoin: resetCoin,
    addDiceDiscard: addDiceDiscard,
    addDiceBase6: addDiceBase6,
    resetDice: resetDice,
    addHexNibble: addHexNibble,
    resetHex: resetHex,
    addCard: addCard,
    startNewCardShuffle: startNewCardShuffle,
    resetCards: resetCards,
    addCsprngBytes: addCsprngBytes,
    resetCsprng: resetCsprng,
    guaranteedBits: guaranteedBits,
    diceGuaranteedBits: diceGuaranteedBits,
    cardGuaranteedBits: cardGuaranteedBits,
    csprngGuaranteedBits: csprngGuaranteedBits,
    availableCsprngBytes: availableCsprngBytes,
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
