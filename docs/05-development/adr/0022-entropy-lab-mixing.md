# ADR-0022: Entropy Lab accumulation and mixing — integer accounting, XOR-then-hash

**Status:** Accepted
**Date:** 2026-08-07

## Context

[SPEC.md §11](../../01-spec/SPEC.md) and [entropy-and-strength.md](../../04-reference/entropy-and-strength.md) describe Entropy Lab (P1.1): dice (base-6 and a 4-outcome discard mapping), coin flips, playing cards, hex, and CSPRNG, combined by "mixing" — XOR the manually-recorded entropy with CSPRNG output, then hash — so a rigged die or a rigged CSPRNG alone cannot determine the seed. Those documents were written before this item was implemented and already fix the headline construction; this ADR records the parts they leave open: how "how many bits do we have" is computed without floating point, how mixed-radix sources (dice, cards) are serialized to bytes, and what happens when the requested output is longer than one hash block.

Two properties are non-negotiable given AGENTS.md's "fail closed" rule and SPEC §11.1a's insistence that entropy claims never exceed what was actually delivered:

1. **No floating-point arithmetic on the path that decides whether generation is allowed to proceed.** `Math.log2(6) * n` accumulates rounding error, and on a security gate ("have we collected 128 bits?") an off-by-a-fraction answer that rounds the wrong way is a real bug, not a cosmetic one.
2. **Reproducible, byte-for-byte serialization**, because the mix step needs a manual-entropy byte string of a specific length to XOR against an equal-length CSPRNG slice, and that length must be derivable the same way on every run for the accompanying tests to pin it down with independent vectors.

## Decision

**Guaranteed bits are computed from the size of the possibility space via `BigInt`, never from a sampled value or a float.**

- `n` base-6 dice rolls span a range of exactly `6^n` possible sequences. `guaranteedBits = bitLength(6^n) - 1` (the `-1` is deliberate: a range of size `R` sits in `(2^(b-1), 2^b]` where `b = bitLength(R)`, so only `b - 1` bits are guaranteed regardless of where in that interval `R` falls — rounding up would overclaim by up to one bit).
- `k` card draws without replacement from a 52-card deck span `52 · 51 · … · (52-k+1)` sequences (a falling factorial), accumulated the same way: `guaranteedBits = bitLength(range) - 1`.
- Coin flips, the 4-outcome discard dice mapping, and hex nibbles are each claimed to be exactly uniform per unit (1, 2, and 4 bits respectively) and are appended directly as bits — no accumulator needed, and nothing to round.

This matches the worked example already in entropy-and-strength.md (50 base-6 rolls ≈ 129.2 bits by the `n·log2(6)` estimate used for the user-facing "how many more rolls" copy) while keeping the actual pass/fail gate on integer arithmetic. The two numbers can differ by a fraction of a bit; the gate always uses the conservative integer one.

**Serialization for mixing:** the base-6 accumulator and the card accumulator are each independent `BigInt`s. Each is serialized to the minimum number of *whole bytes* that can hold its declared range (`ceil(bitLength(range) / 8)`), big-endian, zero-padded. Exact bits (coins, discard-mode dice, hex) are packed MSB-first into their own byte string. `manualEntropyBytes = exactBitsBytes ‖ diceBytes ‖ cardBytes` (any source not used contributes zero bytes). This ordering is fixed and load-bearing for the test vectors in `test/entropy-lab.test.js` — changing it is a breaking change to anyone who has recorded a mix and needs to reproduce it.

Using whole-byte serialization sized off the *declared range* rather than the *sampled value* means the accumulator's actual value does not need to be uniformly distributed over those bytes — a base-6 accumulator's range `[0, 6^n)` is not a power of two, so its raw byte representation is measurably non-uniform. That non-uniformity is exactly what the hash step exists to erase (see below); the byte-length choice only needs to be *reproducible and long enough*, not uniform.

**Mixing:** `manualBytes` is XORed against the first `len(manualBytes)` bytes of the collected CSPRNG buffer. If fewer CSPRNG bytes are available than that, the mix refuses (fail closed) rather than reusing bytes or padding with zero. The XOR result is expanded to the requested output length (128/160/192/224/256 bits — the five BIP-39 `ENT` sizes, since the only known consumer is the not-yet-built Seed Forge) by counter-mode SHA-256: `output = SHA-256(0 ‖ xored) ‖ SHA-256(1 ‖ xored) ‖ …`, truncated to the requested length. A single 256-bit request needs exactly one block; 128/160/192/224-bit requests take the leading bytes of that same first block.

**Alternative considered and rejected: HKDF.** `@noble/hashes/hkdf` is already vendored and used elsewhere in the cold realm (crypto.js). HKDF-Extract-then-Expand with `IKM = manualBytes`, `salt = csprngBytes`, would be a more standard construction and get the "XOR-then-hash" property implicitly through HMAC. It was rejected here because the shipped user- and reference-docs (entropy-and-strength.md, first-wallet.md) already commit to the literal formula `SHA-256(user_entropy XOR csprng_output)` as the explainable, hand-verifiable construction — a user with a calculator and a hex dump can reproduce it, which HMAC's inner/outer padding makes harder to walk through by hand. If a future review finds a cryptographic reason to prefer HKDF (e.g., need for domain separation across multiple simultaneous sessions), that is a breaking change to the format and needs its own ADR, not a quiet substitution.

**Undo is a per-operation history stack of closures**, each capturing the exact prior state (previous `BigInt` value, previous array length, previous CSPRNG buffer reference) rather than a generic snapshot/diff system. Given realistic session sizes (at most a few hundred manual entries before mixing), this is simpler to audit than a diffing scheme and every `add*` function owns writing its own correct inverse next to the forward operation, so a reviewer can check each pair together.

## Consequences

- The "claimed bits" figure shown to the user for in-progress collection (e.g., "50 rolls ≈ 129 bits, keep going") can legitimately use the friendlier floating-point estimate from entropy-and-strength.md's table; the code in `src/cold/entropy-lab.js` only needs to and does use the integer floor for the actual gate. Whoever builds P1.2's Entropy Health Meter should keep that distinction visible rather than silently switching the gate to the friendlier number.
- Mixed output is capped at the five BIP-39 `ENT` sizes. If a future consumer other than Seed Forge needs a different length, this ADR's `VALID_TARGET_BITS` restriction will need revisiting.
- Because manual-entropy byte length depends on how many rolls/draws were made (not a fixed size), the CSPRNG-bytes-needed number the UI displays changes as the user adds more manual entropy. This is visible in the UI copy ("Draw more CSPRNG bytes") rather than hidden, per the fail-closed rule.
