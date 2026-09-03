# ADR-0011: WASM secp256k1 for the recovery search, with `@noble` as the authority

**Status:** Accepted
**Date:** 2026-08-06

---

## Context

Recovery search is dominated by elliptic curve arithmetic, not by the key derivation function most people assume is the bottleneck.

Measured against the vendored `@noble/curves` 2.2.0 on a desktop-class CPU, verifying one checksum-valid candidate at one derivation path and twenty addresses costs 5.56 ms. PBKDF2-HMAC-SHA512 accounts for 870 µs of that — 16%. Twenty-two secp256k1 scalar multiplications at roughly 200 µs each account for 79%. Below about three addresses the KDF dominates; above it, the curve does, and the search's realistic configuration is well above it.

So the only remaining large lever on recovery throughput is faster curve arithmetic. A `libsecp256k1` build compiled to WebAssembly is the obvious candidate.

The reason this was initially assumed to be off the table is that it appeared to require adding `'wasm-unsafe-eval'` to the cold realm's CSP — a policy this project describes as load-bearing.

**That assumption was wrong.** `'wasm-unsafe-eval'` is already present in the cold realm policy and is documented as mandatory, because Argon2id is a WASM module and `WebAssembly.instantiate` is blocked without it. See [csp-policy.md](../../02-security/csp-policy.md) and SPEC §6.1. There is no new concession to make; it was already made, deliberately, and its scope is documented — it permits WASM compilation only and does not re-enable `eval()` or `new Function()`.

## Decision

**Adopt a WASM secp256k1 implementation for the recovery search only, and keep `@noble/curves` as the authority for every result the user sees.**

Specifically:

1. The recovery search may use the WASM implementation to screen candidates.
2. **Any candidate the WASM path reports as a hit is re-derived with `@noble` before it is shown to the user.** A hit is rare by definition, so the cost of confirming it is irrelevant.
3. Nothing outside the recovery search uses the WASM curve. Address display, xpub derivation, verification workflows, and QR generation continue to use `@noble` exclusively.
4. Adoption is **gated on a measured benchmark** landing in the P4.3a harness. The expected gain is 3–5×; that figure is an estimate and has not been verified. If the measured gain is under 2×, this ADR is withdrawn rather than implemented.

## Rationale

### The CSP objection does not survive contact with the policy

The concession exists. Declining to use it for a second purpose does not make the cold realm safer — it is exactly as permissive either way. The remaining costs are bundle size and vendoring burden, which are ordinary engineering costs, not security ones.

### Two implementations, one authority, is a fail-closed arrangement

The obvious objection to a second curve implementation is that a defect in it produces wrong keys. In a general derivation path that would be serious: a user could be shown an address that is not theirs.

Restricting WASM to screening removes that class of failure entirely. A false *negative* in the screening path costs search coverage, which is a performance regression, not a correctness one. A false *positive* is caught by the `@noble` re-derivation before anything reaches the user. There is no path by which the WASM implementation alone can cause a wrong address to be displayed.

This is the same shape as the two-stage screen-then-verify pipeline the search already uses, applied to implementations rather than to work.

### The gain is worth having, but only for the hard cases

At the measured 3–5×, three missing words in a 24-word phrase moves from roughly 6.5 hours to under 2. Two missing words moves from 50 seconds to 13, which no user will notice. The lever matters only in the band where searches run for hours, which is precisely the band where users are most likely to give up.

## Consequences

- A second cryptographic dependency enters the cold realm, vendored, pinned and hashed per the existing process. It must appear in `dependencies.md` and the Provenance panel like everything else.
- Bundle size grows. The budget in SPEC §16 needs revisiting when the real artifact exists.
- The recovery engine carries two code paths, and the harness must test both — including a deliberate mismatch fixture proving the `@noble` confirmation actually rejects a bad WASM hit.
- If `WebAssembly.instantiate` fails at runtime, the search falls back to `@noble` and reports a slower estimate. It does not fail; it gets slower and says so. This mirrors the existing Argon2id fallback behaviour.

## Alternatives rejected

**`multiplyUnsafe` instead of constant-time multiplication.** Measured at 192 µs against 201 µs — within noise. `@noble`'s constant-time path costs almost nothing here, so there is nothing to trade away.

**Batched promise scheduling around WebCrypto.** Measured across 16-, 64- and 256-wide batches; all within noise of sequential. No gain.

**WebGPU compute.** Unreliable under `file://`, and would not survive the portability contract in SPEC §3.

**Doing nothing and conceding speed entirely.** Defensible, and was the prior position. It was based on the belief that GPUs made the contest hopeless — but btcrecover's own published benchmarks show GPU acceleration is worth only 1.11× for BIP-39 seed recovery on comparable hardware, because the workload is PBKDF2 and curve arithmetic rather than plain hashing. The contest is closer than assumed, which makes the lever worth pulling.

## What would reverse this

A measured gain under 2×. A defect found in any candidate WASM implementation that `@noble` confirmation would not catch. Or a bundle size increase that forces a portability compromise — the single-file contract outranks recovery throughput.
