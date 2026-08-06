# Architecture Decision Records

Short documents recording *why* a structural decision was made — what we chose, what else we considered, and what would change our mind.

They exist because six months from now, "why is there an iframe in here?" should be answerable in a paragraph rather than an archaeology project. Code shows what was decided. ADRs show why, and what the alternatives cost.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-two-realm-architecture.md) | Two-realm architecture | Accepted |
| [0002](0002-separate-vault-file.md) | Vault data lives in a separate file | Accepted |
| [0003](0003-argon2id-parameters.md) | Argon2id at 64 MiB as the default KDF | Accepted |
| [0004](0004-median-not-mean-prices.md) | Aggregate prices by median, not mean | Accepted |
| [0005](0005-no-duress-compartment.md) | No duress or decoy compartment | Accepted (rejected feature) |
| [0006](0006-companion-not-replacement.md) | A companion to hardware wallets, not a replacement | Accepted |
| [0007](0007-headless-browser-harness.md) | Headless browser harness as a dev dependency | Accepted |
| [0008](0008-csp-blocked-network-signals.md) | CSP-blocked network signals are not a throw contract | Accepted |
| [0009](0009-comic-visual-language.md) | Comic visual language, with security surfaces exempted | Accepted |
| [0010](0010-ios-local-html-execution.md) | iOS local-HTML execution is a portability gate, not a preview-equivalence claim | Accepted |
| [0011](0011-wasm-secp256k1-for-recovery.md) | WASM secp256k1 for the recovery search, with `@noble` as the authority | Accepted |
| [0012](0012-recovery-checkpoint.md) | Recovery checkpoints are a separate encrypted file, not vault records | Accepted |
## When to write one

Any decision that is structural, hard to reverse, or likely to be questioned later:

- Changing the realm boundary or message schema
- Changing the vault format
- Changing a cryptographic primitive or its parameters
- Adding or removing a `connect-src` host
- Adopting or rejecting a standard
- **Rejecting** a commonly-requested feature — often the most valuable kind, since otherwise it gets re-proposed indefinitely

Not for routine implementation choices. If reasonable people wouldn't argue about it, it doesn't need an ADR.

## Template

```markdown
# ADR-NNNN: Title

**Status:** Proposed | Accepted | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD

## Context
What problem forced a decision. Include the constraints that made it hard.

## Decision
What we chose. Be specific.

## Rationale
Why. This is the part future readers need.

## Consequences
### Positive
### Negative
### Risks

## Alternatives considered
Each with why it was rejected. Rejected options are as informative as the chosen one.

## What would change our mind
Conditions under which this should be revisited. Prevents ADRs from becoming dogma.

## References
```

## Conventions

- Numbered sequentially, never renumbered.
- Never deleted. A decision that no longer applies is marked superseded, with a link to what replaced it — the history is the value.
- Written when the decision is made, not reconstructed later.
- Short. If it exceeds two pages, it's probably a design document instead.
