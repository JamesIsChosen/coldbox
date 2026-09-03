# ADR-0053: Cold-owned transaction construction and strict spending envelope

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

A valid Bitcoin signature proves that a key authorized transaction bytes. It
does not prove the user understood those bytes, that a claimed change output
belongs to the wallet, or that the fee was sensible.

Strict payload schema validation is valuable, but schema validity alone cannot
establish transaction intent.

## Decision

Coldbox v1 has a **strict spending envelope**.

Warm supplies bounded public chain evidence and fee suggestions. Cold
constructs the authoritative transaction and independently derives its meaning.

The cold spending envelope verifies at least:

- selected wallet/account and network;
- every input outpoint/value/script used for spending;
- supported script/signature form;
- recipient address/network and exact integer-satoshi amount;
- change ownership derived from authenticated wallet descriptors;
- final fee and fee rate;
- sequence/locktime/RBF policy;
- allowed sighash form;
- spending-policy limits;
- coin-control/privacy constraints.

Unknown fields, unsupported script types, unsupported sighash modes,
unrecognized PSBT extensions, duplicate/conflicting data and ambiguous ownership
fail closed.

Money is represented as integer satoshis internally.

The review screen is generated from the exact cold transaction object that will
be signed. Approval records a digest of that exact transaction state. Any
meaningful mutation clears approval.

Wallet security-policy changes are separately reauthenticated. The spend
warning itself does not contain a convenience override that weakens the policy.

RBF and CPFP have dedicated constrained flows rather than generic transaction
editing.

## Rationale

The dangerous failure is not merely malformed input. It is "valid transaction,
wrong intent."

Cold ownership of construction, change and final fee calculation makes the
security boundary understandable: warm can provide facts, but cannot choose the
final payment.

Integer satoshis eliminate floating-point rounding from money movement.

## Consequences

### Positive

- Review and signing operate on one canonical transaction.
- Malicious change substitution is detectable.
- Fee-policy enforcement cannot be bypassed by a provider's displayed estimate.
- Imported PSBTs are treated as untrusted transaction proposals rather than as
  commands.

### Negative

- The cold realm must implement consensus-correct transaction serialization and
  sighash preparation for every supported v1 spend type.
- Coin selection and transaction construction become audit-critical code.
- More complex Bitcoin features require explicit envelope expansion.

### Risks

- UI review could still mislead if it displays a secondary summary instead of
  the canonical transaction.
- An overly broad "advanced" mode could become a bypass around the envelope.
- Incorrect previous-output validation could make fee/change reasoning wrong.

## Alternatives considered

**Warm construction plus cold schema validation.** Rejected as the primary
wallet path. It leaves transaction meaning under control of the networked side.

**Generic expert override.** Rejected. Unsupported money-movement semantics are
a refusal, not a warning dialog.

## What would change our mind

Nothing about the review/sign binding. Individual allowed transaction forms can
expand only after their parser, serializer, vectors and UX are independently
reviewed.

## References

- [v1 security and Bitcoin-wallet contract](../../01-spec/v1-security-wallet-contract.md)
- [BIP-174 PSBT](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
- [BIP-370 PSBTv2](https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki)