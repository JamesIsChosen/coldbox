# ADR-0038: Shamir39 and raw SSS are cold-only inline adaptations

**Status:** Accepted
**Date:** 2026-08-12

## Context

Phase 2 needs threshold recovery formats in addition to the interoperable
SLIP-39 and hand-verifiable codex32 work. The roadmap names two different
non-standard cases: Shamir39, which splits a BIP-39 phrase into mnemonic
shares, and raw SSS, which splits arbitrary hexadecimal data over a binary
finite field.

Both formats carry secret material. The two-realm architecture therefore
requires their source input, share strings, reconstructed candidate, and
transient state to remain inside the opaque cold frame. The project also has a
zero-runtime-dependency rule, so adding a general-purpose package to the
browser bundle would needlessly expand the trusted code surface.

The primary references were reviewed on 2026-08-12:

- [Ian Coleman `specification.md`](https://github.com/iancoleman/shamir39/blob/30d17d8921200afd1c6365140ee1defead11386a/specification.md), commit `30d17d8921200afd1c6365140ee1defead11386a`, Git blob `8be52ecd5d7700bf68086dccff7851dee3670074`, exact LF-byte SHA-256 `979d15d588adf80b27d515dbaf97a8a9f97766395289632142bef78614f77c62`.
- Ian Coleman `src/js/shamir39.js`, the same commit, Git blob `4b0aae2cc63ac588326037e1718f7d888c21d269`, exact LF-byte SHA-256 `a1f822fe010d5ddbf9b33bda0eaf5152388e8700d5e35893fb8f85116ed4233c`.
- [secrets.js `README.md`](https://github.com/grempe/secrets.js/blob/14a4b682a28242b1dbe5506674b5d5f476b78dbf/README.md), commit `14a4b682a28242b1dbe5506674b5d5f476b78dbf`, Git blob `a4f1b45a96de9ab9c6a86f6927d3657b417cb643`, exact LF-byte SHA-256 `56d52d02a32735a5858bf7e6ffb2b95544c6a761906a4594cd438ffbbf125914`.
- secrets.js `secrets.js`, the same commit, Git blob `2eb1360d61d99f5cee46ebb2aaf1f938b065069`, exact LF-byte SHA-256 `6c90ec0b0d88a8c90d08f8657448c72db6592fcec5096306c70c815e2404eee9`.
- secrets.js fixture `spec/secrets/SecretsSpec.js`, the same commit, Git blob `8986699144de4d25623217ac4377f85a4042f945`, exact LF-byte SHA-256 `b6f843bc4c40f268c175b0c49564fb5be43e1187e4216c33efd6b3559040db0f`.

## Decision

### Shamir39

- The pinned specification uses the legacy `shamir39` marker in its prototype
  example, while the pinned implementation emits `shamir39-p1`. Implement the
  pinned implementation's `shamir39-p1` encoding and accept the legacy marker
  when combining for compatibility. This is an explicit compatibility
  boundary, not a claim that the pinned specification describes `p1`.
- Split valid 12-, 15-, 18-, 21-, and 24-word BIP-39 phrases using the
  selected official wordlist. The input is validated before any polynomial
  work begins.
- Encode threshold and share order in the parameter words and share data over
  GF(2^11), with a practical maximum of 2047 shares or threshold values.
- Validate the reconstructed result as a BIP-39 phrase and checksum before
  returning it.

### Raw SSS

- Inline the secrets.js-compatible share shape: a base-36 field-size marker,
  hexadecimal share identifier, and hexadecimal field data.
- Support GF(2^n) field sizes from 3 through 20 bits, with 8 bits and 128 bits
  of padding as the UI/API compatibility default. The field size limits the
  maximum share count.
- Require a leading reconstruction marker and a complete hexadecimal result;
  reject mismatched fields, identifiers, lengths, thresholds, and malformed
  data.

### Shared boundary and randomness

- Put the implementation in `src/cold/shamir.js` and load it before the cold
  realm main script. No Shamir API, input, share, or result is exposed through
  the warm message protocol.
- Use only `crypto.getRandomValues` for non-constant polynomial coefficients.
  Missing randomness is a hard error; `Math.random` is forbidden.
- The current nonconstant coefficient sampler excludes zero. Until a
  maintainer decides whether compatibility or full information-theoretic
  below-threshold secrecy governs this format, no below-threshold secrecy
  guarantee is authorized. P2.4 remains blocked; this item does not change
  the sampler or invent a compatibility policy.
- Mask generated shares and reconstructed results by default. A user-initiated
  reveal lasts 30 seconds or until hidden manually. Lock, panic hide, and
  session teardown clear inputs, arrays, results, and timers.
- Do not add clipboard, download, print, storage, passphrase, or wallet-device
  transport behavior to this item.

The implementation is an inline, reviewed adaptation rather than a runtime
dependency. The upstream commit references and independent compatibility
vectors are recorded in the P2.4 packet and dependency notes.

## Rationale

The two schemes solve different input problems and must not be presented as
interchangeable. Shamir39 preserves mnemonic-shaped shares for a BIP-39
phrase; raw SSS preserves arbitrary bytes expressed as hexadecimal. Keeping
both implementations in one cold layer makes their shared boundary and
teardown behavior auditable without adding a package tree.

The implementation tests the published Shamir39 fixture and the published
secrets.js compatibility shares, then checks deterministic formatting against
the respective reference behavior. A BIP-39 checksum check is required after
Shamir39 interpolation because a mathematically reconstructed candidate is not
alone proof that the entered shares were the intended set.

## Consequences

### Positive

- Threshold recovery can be used for BIP-39 phrases or raw hexadecimal data
  while the warm realm remains unable to read either.
- The browser artifact has no new runtime dependency or network behavior.
- The UI makes the separate formats, masked output, passphrase boundary, and
  independent verification requirement visible.
- Published reference vectors provide byte/word compatibility evidence rather
  than only round-trip tests generated by Coldbox.

### Negative

- Shamir39 is not SLIP-39 and raw SSS is not a wallet backup interchange
  standard. Users must check the restore path they intend to use.
- Neither format authenticates an arbitrary share set. A changed or malicious
  share can produce a wrong candidate, so the result needs independent
  verification.
- The UI exposes only eight share fields even though the underlying fields can
  represent more; larger sets require a separate reviewed UI decision.
- The passphrase remains a separate secret and can still be omitted or lost.

### Risks

- A future change to the upstream share encoding, primitive polynomial table,
  version marker, or padding would break compatibility. The pinned fixture
  tests and review date are the change detector.
- A future feature could accidentally move a share or result into the warm
  message schema. The cold-only API and source lint assertions are guardrails,
  not permission to weaken the boundary.

## Alternatives considered

### Add `secrets.js` as a browser runtime dependency

Rejected. The needed raw field operations are small enough to review inline,
and a package dependency would enlarge the trusted runtime surface while
conflicting with the zero-runtime-dependency rule.

### Implement a new proprietary mnemonic share format

Rejected. It would provide no interoperability evidence and would make a
recovery failure harder to diagnose. The current Shamir39 format is already
documented and has an independent reference implementation.

### Treat Shamir39 as SLIP-39

Rejected. The formats have different wordlists, metadata, checks, and wallet
support. The UI and guide name the distinction every time.

### Carry shares through the warm shell for storage or export

Rejected. A share is secret-compartment material, and this item has no storage
or export requirement. A future encrypted backup record needs its own data
model, threat analysis, and roadmap item.

## What would change our mind

An official reference change, a demonstrated compatibility failure, or a
review finding that the finite-field implementation is not equivalent to the
published vectors would require new vectors and an ADR amendment before code
changes. A request for wallet-native or durable share storage requires a new
roadmap item and a separate boundary review.

## References

- [Ian Coleman Shamir39 specification](https://github.com/iancoleman/shamir39/blob/master/specification.md)
- [Ian Coleman Shamir39 source](https://github.com/iancoleman/shamir39)
- [secrets.js README](https://github.com/grempe/secrets.js/blob/master/README.md)
- [secrets.js source](https://github.com/grempe/secrets.js/blob/master/secrets.js)
- [P2.4 guide](../../03-guides/backup-shamir.md)
- [P2.4 packet](../packets/p2.4-shamir39.md)
