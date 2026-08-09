# ADR-0009: Comic visual language, with security surfaces exempted

**Status:** Accepted
**Date:** 2026-08-04

---

## Context

The warm shell shipped in P0.5 with a conventional dark developer-tool look: thin borders, soft blurred shadows, muted slate palette, system sans. It was competent and completely anonymous.

[SPEC.md §15](../../01-spec/SPEC.md) specified that look directly — "dense, monospace-leaning, high-contrast dark by default", "no decorative animation". A design mockup was then produced in a comic-book style — heavy black outlines, flat saturated fills, hard offset shadows, halftone dots, comic lettering — and adopted as the target.

That forced three decisions rather than one:

1. **Whether a playful style is appropriate at all** for a tool that handles seed phrases, where the interface's job includes being believed.
2. **How to get comic typefaces** into a build that forbids fetching anything at build or run time, under a CSP of `font-src data:`, with a lint rule that rejects external URLs.
3. **What happens to SPEC §15**, which the new direction contradicts.

The mockup itself also miscast the product — it presented Coldbox as a wallet with balances and a SIGN TRANSACTION button, which is the one thing Coldbox structurally is not ([ADR-0006](0006-companion-not-replacement.md)).

## Decision

**Adopt the comic visual language across the product, and exempt security surfaces from its behavioural elements.**

Specifically:

- Full language — outlines, hard offset shadows, flat fills, halftone field, display type, caption boxes, hover tilt — applies to navigation chrome and to the public, editorial, and reference surfaces.
- **Security surfaces get the shell and none of the behaviour.** No rotation, no animation, no sound-effect stickers, no hover transform. A surface is a security surface if it reports the state of a security boundary or renders, accepts, or sits adjacent to secret material. This covers the realm status panel, network/sealed-realm status surface (historically named the airgap banner), capability self-check, the entire sealed realm, and everything Phase 1+ adds to Vault, Entropy Lab, Seed Forge, Derivation, Backup Lab, QR Studio, and Recovery.
- **Functional transport motion is not decorative animation.** ADR-0026 permits the live vault-transfer QR square to change frames because frame changes *are the transport protocol*. No comic motion/effects are added around it, and the animation stops immediately when the transfer or vault session ends.
- **The display face never carries data.** No seed words, addresses, xpubs, fingerprints, hashes, paths, or amounts in Bangers. Those stay monospace.
- The dashboard carries a **3D card stage** — the mockup's centrepiece — rebuilt to explain the two-realm architecture rather than display fabricated balances. It renders no live data and exposes no controls, which is what keeps it on the permissive side of the calm rule. The boundary the rule actually draws is *reporting live state* versus *explaining the design*: the network/sealed-realm status surface reports, the stage explains.
- Both themes are retained. Light is the mockup's paper look; dark stays the shipped default.
- Fonts are vendored from npm as pinned tarballs and inlined as base64 `data:` URIs by the build, exactly like the `@noble` crypto artifacts.
- The full contract moves to [docs/01-spec/design-system.md](../../01-spec/design-system.md). SPEC §15 is amended to point there.

## Rationale

### Grim interfaces get skimmed

Self-custody tooling is uniformly severe, and severity produces a specific failure: users stop reading. The warnings that matter — untested backups, forgotten passphrases, undocumented derivation paths — are exactly the text people's eyes slide past on the fifteenth grey panel.

A distinctive, pleasant interface buys attention. That attention is a security property, not a vanity one. The tool's own framing in [what-is-this.md](../../00-overview/what-is-this.md) is that its job is "to make [decisions] clear rather than to hide them", and clarity includes being read.

### But tone must track stakes, which is why §6 exists

The obvious objection is that a playful interface undermines trust precisely where trust is the product. That objection is correct about a specific subset of surfaces and wrong about the rest.

The mockup's own centrepiece makes the case: a rotating, pulsing sticker reading *KABOOM! SAFE!* on the vault panel. It is funny while the check passes. When the airgap guard goes red, the same element is the interface cracking a joke at the moment the user most needs to believe it — and worse, it trains the user to read animated emphasis as decoration rather than signal.

So the split is not a compromise between "fun" and "serious". It is the recognition that motion and whimsy are *signal-carrying* on a security panel and merely *decorative* on a dashboard. Removing them where they carry signal is what makes them safe to use everywhere else.

The same logic drives the typography rule. Bangers has no lowercase and ambiguous digits. Someone transcribing 24 words onto a steel plate needs unambiguous glyphs far more than they need personality.

### Vendoring fonts is the only mechanism available

The mockup loaded Bangers and Comic Neue from Google Fonts. That violates three independent rules at once: `scripts/lint.js` rejects external URLs, the CSP permits `font-src data:` only, and [AGENTS.md](../../../AGENTS.md) forbids fetching anything at build or run time. There is no configuration that makes a CDN acceptable here.

The alternative that already exists in this repo is the vendor pipeline: a pinned tarball, an upstream SHA-256 and npm integrity value in `vendor-manifest.json`, and a build that refuses to run if verification fails. `@fontsource/bangers` and `@fontsource/comic-neue` are on npm under SIL OFL 1.1, so the fonts drop into that pipeline with no new machinery — one new bundler script, one new build token, two manifest entries.

This means a font is verified to the same standard as the AES implementation. Given that a font is parsed by a complex binary format handler in the browser, that is a defensible place to be rather than an over-application of rigour.

### Correcting the product framing

The mockup showed balances, a master vault, and a SIGN TRANSACTION button. Shipping that framing would contradict the project's central non-goal. The design system therefore carries a copy contract (§2) with an explicit say/never-say table, and the dashboard now states plainly that Coldbox is a toolkit that holds no keys and signs nothing. Vocabulary is a design constraint here, not a writing preference.

## Consequences

### Positive

- The product is visually distinctive and materially more pleasant to read.
- The calm rule gives motion and emphasis real meaning: if something moves, it is not a security surface.
- Fonts inherit the existing supply-chain guarantees — pinned, hashed, reproducible, offline.
- The copy contract makes the "not a wallet" boundary enforceable in review rather than a matter of taste.

### Negative

- ~83 KB of base64 font in the single-file output. Against a 1.7 MB budget, acceptable, but it is permanent weight in a file whose whole premise is portability.
- Two type systems to maintain: display for chrome, monospace for data.
- SPEC §15's original wording is superseded, and anything written against it needs re-reading.
- The sealed realm intentionally looks different from the shell, which will read as an inconsistency to anyone who has not read §7.

### Risks

- **Scope creep of the fun.** The pressure to add one sticker to one security panel will recur. §6 is written as a rule with a stated list precisely so the answer is "no" without relitigating.
- **Legibility on low-DPI displays.** Bangers at small sizes on a 1× screen is untested on real hardware; P0.19 device testing should check it explicitly.
- **The style will not be to everyone's taste**, and a self-custody tool has users who read whimsy as unseriousness. Mitigated by the calm rule, but not eliminated.

## Alternatives considered

**Keep the existing dark developer-tool look.** Zero cost and zero risk, and rejected because it forfeits the attention benefit that motivated the change. The look was not bad; it was invisible.

**Full comic everywhere, including security surfaces.** Maximum personality, and rejected on the failure-state argument above. Animated emphasis on a panel that reports a boundary failure is actively harmful.

**Comic chrome with neutral content panels.** Nav and buttons comic, content conventional. Rejected as the worst of both: not distinctive enough to change how the product reads, while still adding the font weight and a second type system.

**System font stack approximating the look.** Impact plus Comic Sans MS with heavy tracking. Zero bytes, zero supply chain, and rejected because the result varies wildly across platforms — Comic Sans MS is absent on most Linux systems and on iOS — so the identity would be inconsistent on exactly the portable devices the product targets.

**Vendor the display face only, system stack for body.** ~31 KB instead of ~83 KB. A reasonable fallback if the budget ever tightens, and rejected for now because Comic Neue at weight 700 is what makes the body text sit correctly against the halftone field; the system fallbacks do not.

**Light theme only, matching the mockup exactly.** Rejected: it would delete a shipped P0.5 feature and remove the dark default that SPEC §15 chose for good reason.

## What would change our mind

- Real-device testing (P0.19) showing the display face is hard to read at common sizes on low-DPI screens — the display face would narrow to headings above a size floor, or be dropped.
- The single-file budget coming under genuine pressure — drop Comic Neue first, keep Bangers.
- Evidence from actual users that the style reduces trust in the security claims. The calm rule is the mitigation; if it proves insufficient, the exempt set widens rather than the style being tuned down piecemeal.
- A Phase 1+ cold-realm screen needing real heading hierarchy would revisit §7's decision to keep the sealed realm on the system stack.

## References

- [docs/01-spec/design-system.md](../../01-spec/design-system.md) — the resulting contract
- [SPEC.md §15](../../01-spec/SPEC.md) — superseded UI wording
- [ADR-0006](0006-companion-not-replacement.md) — companion, not replacement; the source of the copy rules
- [csp-policy.md](../../02-security/csp-policy.md) — `font-src data:`
- [dependencies.md](../dependencies.md) — vendored font provenance
