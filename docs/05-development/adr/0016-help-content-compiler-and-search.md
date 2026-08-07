# ADR-0016: Help content is compiled from block-scoped markdown, and search text is derived at runtime, not precomputed

**Status:** Accepted
**Date:** 2026-08-07

## Context

P0.17 needed a build-time compiler turning `docs/00-overview/glossary.md` and `docs/03-guides/*.md` into the three-depth (plain/working/technical) content model described in [SPEC.md §18](../../01-spec/SPEC.md) and already partially specified in [docs/03-guides/README.md](../../03-guides/README.md)'s `::: plain` / `::: working` / `::: technical` block syntax — that syntax existed in prose before this item, but no parser or compiler for it did.

Two design questions weren't settled by the existing docs:

1. **Granularity.** Does a `:::` group cover an entire document, or can shared (depth-invariant) content and depth-scoped explanations be interleaved within one file? Guides are mostly procedural ("click this, then this") with occasional concept explanations ("here's why address-swapping malware works") embedded in them — forcing the *whole* guide into three parallel rewritten copies would triple the guide-writing burden for content (steps, tables) that doesn't actually vary by reading level.
2. **Search index cost.** An offline search index needs plain text to match against. The straightforward approach — precompute and embed a flattened plain-text copy of every depth, for every term and guide — turned out to cost roughly as much bundle size as the actual content itself.

## Decision

**Granularity:** a `:::` group is scoped to whatever markdown it wraps, not the whole file. Everything in a source file *outside* a group is "shared" content, rendered identically at every depth; only text actually wrapped in a `::: plain` / `::: working` / `::: technical` trio varies. A guide can mix procedural shared content with a handful of depth-scoped explanatory passages. A missing depth within an otherwise-started group falls back in a fixed order that always prefers `plain` first (nobody is worse off being shown less jargon than they asked for), and is reported as a build warning, never silently dropped or hidden as an error.

A document or glossary term with **zero** `:::` groups anywhere is not a build failure — the roadmap's own P0.17 acceptance criterion is a warning, not a hard failure — but it is still reported, by name, so an incomplete backfill is visible in build output rather than discovered later.

**Search index:** the compiled JSON does not carry a separately precomputed plain-text search field. Search text is derived once, lazily, in the browser at first search, by stripping HTML tags from the `byDepth` content that's already embedded for rendering (`stripHtmlToText` in `src/main.js`), across all three depths so a technical-only term is still findable while reading at "plain." This still satisfies "searchable help index, fully offline" (SPEC.md §18.2) — nothing is fetched, and the index is fully available after the first keystroke, not lazily downloaded from anywhere — it just isn't computed twice.

## Rationale

Per-file granularity matches how the guides are actually written today: procedural, second-person, with embedded explanatory asides. Forcing whole-file triplication would have meant either (a) rewriting entire guides three times, most of which is identical step-by-step instruction regardless of reading level, or (b) writing degenerate "plain"/"technical" copies that just restate the same steps in slightly different words to satisfy the model, which teaches readers nothing and rots the moment one copy is edited and the others aren't.

The search-index change was a direct response to measurement, not speculation: an early draft that duplicated a full plain-text copy of every depth (see the removed `searchTextOf` in `scripts/help-content.js`, kept only in git history) added roughly 170 KB beyond the already-large compiled HTML — for text that already existed one paragraph away. Recomputing it at runtime from data already sent to the browser costs a handful of `textContent` reads on first search, not a network round trip or a parsing step over raw markdown, and the compiler stays entirely build-time.

## Consequences

### Positive

- Guide authors only wrap the passages that actually need three voices; procedural content is written once.
- A missing or partial depth block is visible in build output by file and (for the glossary) by term name, supporting an incremental backfill rather than an all-or-nothing rewrite.
- Bundle size for help content dropped roughly a third (measured: ~520 KB → ~347 KB for the current `docs/` tree) by removing the duplicated search-text field.

### Negative

- *(Historical, true only of an intermediate draft of this branch, corrected here after independent review flagged it as stale — see ROADMAP.md P0.17 and the PR packet for the final state.)* At the point this ADR was first written, the per-file backfill obligation recorded on P0.17 in the roadmap was not yet fully met — 7 of 9 guides and all of the P0.1–P0.16 in-app-copy backfill were still plain-only, each producing the documented build warning. That gap was closed before this branch was submitted for review: the final branch state carries three-depth content across all nine guides and all 51 compiled glossary terms, and `npm run build` emits zero help-content warnings. This ADR's actual subject — the compiler mechanism and the runtime search-derivation decision — is unaffected either way.
- Runtime search-text derivation means the Learn page does slightly more work on first search (walking every compiled entry once, caching the result) than a precomputed index would. Given the corpus size (dozens of terms/guides, not thousands), this is not expected to be perceptible, but it hasn't been measured on a low-end device.

### Risks

- The remaining ~350 KB help-content weight is still well over the 180 KB figure in SPEC.md's bundle table (flagged there directly, and expected to grow further as the backfill continues). Most of it comes from `jsonScriptLiteral()`'s blanket `<`/`>`/`&` → `\uXXXX` escaping, shared with `PROVENANCE_LIBRARIES` and the cold-realm document — a narrower escape (only sequences that could form `</script`) would recover more space but touches a shared, security-relevant helper and needs its own review rather than being folded into this item.

## Alternatives considered

**Whole-file three-depth guides** (rejected): tried mentally against `verify-a-hardware-wallet.md` — a 130-line procedural guide — and would have produced three ~130-line files whose only real differences are a handful of paragraphs, with the actual steps duplicated verbatim three times and guaranteed to drift.

**A general external markdown parser vendored in** (rejected): the project's "no runtime dependencies" and "nothing vendored except audited crypto" constraints apply at build time too by convention (`scripts/` has none today); a small, purpose-built parser covering exactly the markdown subset the docs use is easier to review in full and cannot inherit an upstream parser's unrelated attack surface or bugs.

**Precomputed search index with the plain-text stripped at build time but stored more compactly (e.g. one combined field instead of one per depth)** (rejected for now): still duplicates content that's already present; deriving it at runtime removes the duplication entirely rather than shrinking it. Revisit only if runtime derivation proves too slow on real low-end hardware, which hasn't been measured.

## What would change our mind

If a future content type genuinely needs whole-document depth variation (unlikely given how guides are written, but conceivable for a short reference page), per-file granularity could be added as an opt-in alongside the current per-passage model without breaking existing content, since a file with exactly one group spanning the whole body already behaves that way.

If runtime search-corpus construction is measured to be slow on real low-end/mobile hardware once the full backfill lands (much larger corpus), reintroduce a precomputed index, but compressed (e.g. deduplicated against the `byDepth` text via a shared string table) rather than the naive triplicated copy this ADR removes.

## References

- [SPEC.md §18](../../01-spec/SPEC.md) — three depth levels and delivery mechanisms
- [docs/03-guides/README.md](../../03-guides/README.md) — pre-existing `:::` block syntax documentation
- [ROADMAP.md](../ROADMAP.md) — P0.17 entry, including the backfill obligation this ADR does not resolve
- `scripts/help-content.js`, `test/help-content.test.js`
