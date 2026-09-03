# ADR-0023: Entropy Lab's deliverable is raw entropy bytes, not a hand-off to Seed Forge

**Status:** Accepted · amended by [ADR-0045](0045-released-secret-model.md)
**Date:** 2026-08-07

## Context

[SPEC.md §11.1](../../01-spec/SPEC.md) originally described Entropy Lab's mixing step as producing "128–256 bits **to Seed Forge**." P1.1 (Entropy Lab) and P1.3 (Seed Forge) are separate roadmap items, with P1.3 sequenced after P1.1 and not yet built. AGENTS.md requires exactly one roadmap item per PR.

An independent review of P1.1's implementation ([PR #33](../packets/p1.1-entropy-lab.md)) correctly found that "outputs ... to Seed Forge" was literally unmet: there is no Seed Forge to hand anything to, so nothing is output "to" it. The review protocol does not permit a reviewer to reinterpret an unmet criterion as satisfied, and the author's packet had flagged the gap rather than claiming it resolved — but flagging a spec/roadmap contradiction is not the same as resolving it, and the reviewer correctly declined to resolve a wording problem on the author's behalf.

The actual question this ADR answers: **does "Entropy Lab outputs bits to Seed Forge" describe one item's deliverable, or a property of the finished multi-item pipeline?** The spec's original wording didn't distinguish these, and the roadmap's own "one item per PR" rule makes the distinction load-bearing — if it's the former, P1.1 cannot be built (by any implementation) until P1.3 exists first, which contradicts the roadmap's own ordering putting P1.1 before P1.3.

## Decision

**Entropy Lab's deliverable, for P1.1's purposes, is a well-defined buffer of raw entropy bytes of the requested length (128–256 bits, the five BIP-39 `ENT` sizes) — full stop.** "To Seed Forge" describes what a *later* item does with that buffer, not something P1.1 itself can be responsible for delivering, because the receiving end doesn't exist yet and building it is explicitly out of this item's scope.

SPEC.md §11.1 is revised to say Entropy Lab "produces 128–256 bits of raw entropy, in the same form Seed Forge will consume once it exists," replacing the literal "outputs ... to Seed Forge" phrasing that implied a completed hand-off.

This is a maintainer decision, not an implementation detail: it resolves a genuine disagreement between what SPEC.md's original wording said and what a single roadmap item can actually deliver, and it is recorded here (rather than silently edited) specifically so it doesn't need to be re-litigated by the next reviewer who reads the literal spec text.

**What P1.3 (Seed Forge) is obligated to do because of this decision:** consume a plain byte buffer of one of the five valid lengths, produced however the caller obtained it (Entropy Lab being the only current source). Nothing about Entropy Lab's internal design — the accumulation math, the mixing construction, the CSPRNG-only fallback — should need to change once Seed Forge exists; only a new call site consuming `entropyLab.mix()`'s return value is expected to be added.

## Amendment (2026-08-10)

P1.3 now closes that loop. Seed Forge calls `entropyLab.mix()` inside the
cold document, and no byte-buffer, mnemonic, passphrase, or fingerprint crosses
the realm boundary. The original decision remains intact: Entropy Lab owns the
raw-byte contract, while Seed Forge owns BIP-39 conversion and the generation
UI. The implementation choice is recorded in [ADR-0028](0028-cold-only-bip39-seed-forge.md).

The completed UI contract is deliberately one-shot: a successful Entropy Lab
Mix copies its exact result into cold-local pending state, and **Use this mix
in Seed Forge** consumes that copy without calling `mix()` again. Any later
Entropy Lab input or target-size change invalidates the pending result. This
does not move the bytes across the realm boundary or add metadata to the raw
byte contract; it makes the local consumer's lifetime explicit.

## Consequences

- P1.1 can be marked complete (once its remaining, unrelated review findings are resolved) without P1.3 existing. The roadmap's sequencing (P1.1 before P1.3) is now internally consistent with what a single-item PR can deliver.
- P1.3's acceptance criteria, when that item is picked up, should explicitly state it consumes Entropy Lab's output — closing the loop this ADR opens, rather than assuming it implicitly.
- If a future review of P1.3 finds the byte-buffer contract insufficient (e.g., needs accompanying metadata about which sources contributed), that is a breaking change to this ADR's decision and needs its own ADR or a revision here, not a silent reinterpretation.

## Alternatives considered

**Leave P1.1 open (`[~]`, never `[x]`) until P1.3 ships**, treating "to Seed Forge" as accurate and simply unsatisfiable early. Rejected: this would make every roadmap item whose description mentions a downstream consumer permanently unmergeable until that consumer exists, which contradicts the roadmap's entire premise of shipping items in dependency order and reviewing each independently.

**Build a minimal Seed Forge stub inside this PR** just to have something to hand off to. Rejected explicitly in the original packet and again here: a stub built only to satisfy a literal reading of one phrase is exactly the "plausible-looking but hollow" outcome AGENTS.md §8 warns is worse than an honestly disclosed gap, and it would violate "one roadmap item per PR."

## References

- [SPEC.md §11.1](../../01-spec/SPEC.md)
- [docs/05-development/packets/p1.1-entropy-lab.md](../packets/p1.1-entropy-lab.md), §13 (F2)
- [docs/05-development/packets/p1.1-entropy-lab.review.md](../packets/p1.1-entropy-lab.review.md)
