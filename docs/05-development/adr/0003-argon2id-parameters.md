# ADR-0003: Argon2id at 64 MiB as the default KDF

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The vault passphrase must be converted into an encryption key. This is the single point where user-chosen entropy meets an attacker with unlimited offline guessing attempts against a file they may hold indefinitely.

The tool must also run on phones, where memory is constrained — and a vault that can't be opened on the user's phone is a serious usability failure they'd discover at the worst moment.

## Decision

**Argon2id**, with three selectable profiles:

| Profile | Memory | Iterations | Parallelism | Target |
|---|---|---|---|---|
| Fast | 19 MiB | 2 | 1 | Old phones — OWASP floor |
| **Standard** | **64 MiB** | **3** | **1** | **Default — OWASP higher-security** |
| Paranoid | 256 MiB | 4 | 1 | Desktop only |

Profile is chosen at vault creation and stored in the header. **PBKDF2-HMAC-SHA512 at ≥1,000,000 iterations** serves as a fallback only where the Argon2 WASM module fails to load.

## Rationale

Argon2id has been OWASP's top recommendation since the 2024 Password Storage Cheat Sheet update. It combines Argon2i's side-channel resistance with Argon2d's GPU resistance.

**Memory is the parameter that matters.** GPU and ASIC attacks work by running thousands of guesses in parallel. Requiring 64 MiB per guess constrains parallelism in a way iteration count alone cannot — an attacker with 24 GB of GPU memory gets ~375 parallel guesses at 64 MiB, versus effectively unlimited at PBKDF2's negligible footprint.

64 MiB with t=3 is OWASP's higher-security recommendation and costs roughly 100 ms on a modern core. That's an acceptable unlock delay and a meaningful multiplier on attack cost.

## Consequences

### Positive

- Current best-practice resistance to offline guessing.
- Meaningfully raises the cost of GPU/ASIC attacks.
- Profiles let users trade unlock time against strength knowingly.
- Parameters are stored in the header and covered by AAD, so they can't be downgraded by tampering.

### Negative

- Argon2 requires a WASM module (~60 KB base64) and `'wasm-unsafe-eval'` in the CSP.
- 256 MiB may fail to allocate on iOS, so Paranoid is desktop-only and flagged as such.
- ~100 ms unlock delay, which compounds with the mandatory verify-after-save re-open.
- The PBKDF2 fallback is genuinely weaker and must be visibly labelled rather than silently substituted.

### Mitigations

The KDF calculator benchmarks all profiles on the current device **before** vault creation. Users discover on their own hardware whether Standard is viable, rather than finding out when they can't open their vault on a phone in a hotel room.

A silent fallback to PBKDF2 would be the worst outcome — the user believes they have Argon2id protection and doesn't. So the vault details panel always shows which KDF is actually in use, and `'wasm-unsafe-eval'` being missing from the CSP is treated as a build error, not a runtime degradation.

## Alternatives considered

**scrypt.** A reasonable choice with real memory hardness. Rejected because Argon2id won the Password Hashing Competition, is the current OWASP recommendation, and has better resistance to time-memory tradeoff attacks.

**bcrypt.** Rejected. 72-byte input limit and minimal memory hardness (4 KB), which makes GPU attacks cheap.

**PBKDF2 alone.** Rejected as a primary. Negligible memory requirement makes it GPU-friendly — precisely the wrong property here. Retained only as a fallback where WASM won't load.

**Higher default (256 MiB).** Rejected as default because it may fail on iOS, and a default that breaks on a major platform isn't a default. Available as Paranoid.

**Fixed parameters, no choice.** Rejected. The device range is too wide — the same file runs on a 2017 phone and a workstation.

## What would change our mind

- OWASP revising its recommendations upward, which is likely as hardware improves. The Standard profile should be reviewed periodically rather than treated as permanent.
- A practical attack on Argon2id.
- Browser support for a native memory-hard KDF, removing the WASM dependency.

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [crypto-choices.md](../../02-security/crypto-choices.md)
- [vault-format.md](../../01-spec/vault-format.md)
