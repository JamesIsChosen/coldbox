# ADR-0044: The calm rule is scoped to the panel, not the realm

**Status:** Accepted · amends [ADR-0009](0009-comic-visual-language.md)
**Date:** 2026-08-14

## Context

[design-system.md §6](../../01-spec/design-system.md) defines a *security surface* and bars rotation, animation, sound-effect stickers, speech bubbles and hover transforms from it. Its surface list includes the blanket entry **"Everything inside the sealed realm (`src/cold/`)"**, together with everything Phase 1 and later adds to Vault, Entropy Lab, Seed Forge, Derivation, Backup Lab, QR Studio and Recovery.

Read literally — and it is meant literally — that bars the comic language from substantially every screen the project has left to build. The sealed-realm reorganisation this repository is about to adopt (see [ADR-0045](0045-released-secret-model.md)) is built on a hub of tool cards, a floating record menu and a share deck. None of them can exist under the current wording.

The rule was never aimed at those. [ADR-0009](0009-comic-visual-language.md) records the reasoning: a rotating *KABOOM! SAFE!* sticker is funny right up until the airgap check fails, at which point the interface is making a joke at the exact moment the user needs to believe it. What the rule protects is **the credibility of an assertion**, not the realm the pixels happen to live in.

Scoping by realm was a sound proxy while the sealed realm was a single vertical stack of tools that all rendered secrets. It stops being a proxy the moment that realm gains navigation, a hub, and empty states — surfaces that assert nothing and render nothing secret.

## Decision

The calm rule attaches to the **panel**, not to the realm.

A panel is calm when either clause holds:

1. It renders, accepts, or is immediately adjacent to secret material.
2. It reports the live state of a security boundary, or is immediately adjacent to a panel that does.

**Both clauses carry the adjacency provision, deliberately.** An earlier draft attached it to clause 1 only, which would have permitted a tilting hub card immediately beside the airgap guard. Adjacency is doing the same work in both cases — a lively neighbour undercuts the panel next to it whether that panel is showing a seed word or reporting `connect-src 'none'`.

Chrome that does neither — hub, navigation, page furniture, empty states, share decks, explanatory bubbles — carries the full comic language, in both realms.

Two carve-outs are part of the decision rather than exceptions to it.

**Boundary-reporting surfaces are calm permanently**, whether or not a secret is on screen: the airgap guard, the capability self-check, the vault unlock screen and the panic screen. A tilting panel that reports `connect-src 'none'` undermines the claim it is making.

**Calm arrives on the same frame the plaintext does.** It is not an animated transition into stillness. A panel about to reveal a secret straightens, drops any sticker, and takes the red reveal border before the plaintext paints — never after an ease completes. A panel that is still rotating when a seed word appears has failed this rule even if it stops 200 ms later.

Where the two clauses are ambiguous, the tiebreaker is: **whimsy is permitted only where nothing is being asserted about security and nothing secret is rendered.** If in doubt, the panel is calm.

The normative wording, the surface list and the allowed/forbidden table live in [design-system.md §6](../../01-spec/design-system.md). This ADR does not restate them.

## Rationale

The realm is the wrong unit because the realm is a *document*, and the property being protected is a property of *claims*. Two panels in the same document can differ completely in whether they assert anything: a hub card reading "Split lab — 4 schemes" asserts nothing that could be false in a way that matters, while the panel three inches below it reporting cold isolation health asserts something a user will act on.

Scoping to the panel also makes the rule enforceable at the point of authorship. Under the realm rule, the question "may this tilt?" is answered by a file path, which is why it produced the wrong answer for a hub that happens to live in `src/cold/`. Under the panel rule the question is answered by what the panel does, which is the thing the author already knows.

The first carve-out exists because clause 1 alone would let the airgap guard animate whenever no secret was loaded — precisely the state in which a user is deciding whether to trust it.

The second carve-out exists because an animation is a promise about timing, and the reveal path cannot make timing promises. The straightening must be a state, not a transition.

## Consequences

- §6's surface list stops being realm-scoped and is re-enumerated by behaviour. `.realm-status`, `.airgap-banner`, `.capability-panel`, `.capability-row`, `.realm-status-failure` and `.protocol-warning` are unaffected: the old §6 already made anything reporting boundary state calm regardless of secret presence, and named these explicitly. That protection is carried forward, not invented here — the first carve-out restates it so it survives the rewrite rather than depending on a list that no longer exists.
- What is genuinely new, and is the whole of this decision's added protection: calm must arrive on the same frame as the plaintext rather than at the end of a transition; the tiebreaker defaults to calm where the clauses are ambiguous; adjacency binds clause 2 as well as clause 1; and the panic screen is named, which no previous list did.
- §7's former sealed-realm font exception is superseded by the UI.11 parity requirement. The same pinned face bundle is now embedded in both realms for chrome, headings and navigation; the cold document still has no runtime font dependency, and secret-bearing values remain outside the display face. The bytes are generated and hash-pinned by the existing deterministic vendor build, so the parity change does not weaken the boundary.
- Reviewers gain a harder question to ask and an easier one to answer: not "is this file under `src/cold/`?" but "does this panel assert anything, or show anything secret?"
- The risk this decision accepts is drift: a panel that is calm today because it renders no secret can acquire one later. §10's checklist gains the corresponding step, and any panel that starts rendering a value must be re-checked against §6.
- `.stage` already carries a rule of exactly this shape — it is permitted to tilt only because it renders no live data and exposes no controls, and §5 states the tilt goes if real balances ever appear on it. This decision generalises the rule the stage was already following.

## Alternatives considered

**Keep the realm rule and redesign the sealed hub flat.** Rejected, but it was close. It costs no ADR and no ambiguity, and a flat hub is not a bad hub. It was rejected because it would make the two realms look like two different applications at the exact boundary a user needs to understand as one continuous app, and because the rule would still be wrong — it would still be answering a question about assertions by consulting a file path.

**Scope by route instead of by panel.** Rejected. A single route routinely holds both an inert hub card and a live status readout, so a route-level verdict has to resolve to the stricter of the two, which reproduces the current over-broad ban at smaller granularity.

**Let authors mark panels calm with an attribute and enforce nothing.** Rejected. An opt-in marker on a security rule fails open: the panel that most needs to be calm is the one whose author did not think about it. The clauses are written so the default for anything rendering a value is calm.

**Drop the calm rule entirely and rely on taste.** Rejected outright. ADR-0009's reasoning is unchanged and this decision does not weaken it; the ban on stickers, speech bubbles and motion on any asserting or secret-rendering panel is preserved exactly, and extended with a permanence carve-out the old wording did not have.
