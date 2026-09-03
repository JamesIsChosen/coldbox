# ADR-0047: Brand artwork is traced once, committed as source, and embedded from `assets/`

**Status:** Accepted
**Date:** 2026-08-15

## Context

[UI.2](../ROADMAP.md) replaces the CSS text wordmark in `.app-bar` with the
supplied Coldbox logo and adds favicons. The maintainer supplied
`coldbox-logo.png` (1494×514 RGBA, two flat colours over transparency) and a
set of `favicon-c-lower-*.png` files on 2026-08-14.

Three things about this repository make that a structural decision rather than
an asset drop.

**Nothing may be fetched at build or run time**, and the artifact is a single
HTML file that must work from `file://`. So the artwork has to be embedded,
which means the question is *in what form*.

**The build must be reproducible.** Anything generated at build time by a tool
outside the repository — a tracer, a rasteriser, an optimiser — is a new
version-dependent input, and a different version of it produces different
bytes.

**`scripts/lint.js` reads every file under `src/` as UTF-8 text** and fails on
a CR byte, a forbidden construct, or a syntax error. That is the correct
behaviour for a source tree. Binary artwork committed into `src/` would fail
it immediately, and the only ways out are to weaken the lint or to put the
artwork somewhere else.

## Decision

**1. The wordmark ships as SVG traced from the PNG, and the trace is committed.**

`assets/brand/coldbox-wordmark.svg` is a committed source asset. The build
inlines it verbatim. `potrace` is not a build dependency, is not invoked by
`scripts/build.js`, and is not required to build the project.

Two masks are traced with `potrace --flat -O 1.0 -t 8 -a 1.3 -u 10`: the
silhouette (every pixel with alpha ≥ 128) and the cyan fill. The results are
composed into one two-path document, cyan painted over silhouette. The ink
mask is the silhouette rather than the black-only region because two
independently-fitted curves along the same black/cyan boundary disagree by
fractions of a unit and show the page through as a hairline; painting over a
solid silhouette cannot produce a seam.

**2. `scripts/trace-brand-wordmark.js` regenerates it, and can prove it.**

A maintenance script, never run by the build or by CI.
`node scripts/trace-brand-wordmark.js --check` re-traces from the PNG and
compares byte-for-byte against the committed SVG, so the committed 15 KB of
path data is checkable rather than taken on trust.

**3. The favicons are the committed PNGs, base64-encoded into `data:` URIs at
build time.** No re-rendering, no resizing, no optimisation — the build encodes
bytes it does not modify, and a test asserts the embedded bytes equal the
committed file.

**4. Binary brand artwork lives in `assets/`, not `src/`.** `assets/` is a
build input directory in the same category as `vendor/`: read by the build,
never treated as UTF-8 source, never shipped as a separate file. `scripts/lint.js`
performs a binary-safe side scan of textual SVG files under `assets/brand/` for
external and protocol-relative URLs; the build validator remains responsible
for the SVG's full structural/content checks and for decoding PNGs. `assets` is
added to `BUILD_DATE_SOURCE_PATHS` so a change to the artwork moves the build
date with it.

**5. The SVG is validated at build time, and the build fails closed.**
`scripts/brand-assets.js` rejects `<script>`, `<foreignObject>`, `<image>`,
`<use>`, `<style>`, `<a>`, `href`, `xlink:href`, inline event handlers,
`url()`, entity declarations, a DOCTYPE, a literal hex colour, and any
URI-shaped string other than the single SVG namespace declaration. The
namespace name is permitted because it is a name and not a location — nothing
dereferences it — and keeping it makes the committed file valid as a standalone
document, which is what makes the trace independently checkable.

## Rationale

**Why trace rather than embed the PNG.** 419,715 bytes of PNG becomes ~560 KB
as base64. The traced SVG is 15,757 bytes — a factor of 35 — and unlike a
raster it stays sharp at every display density and follows the theme, because
its two fills are `var(--fill-cyan)` and `var(--fill-ink)` rather than baked
colour. A raster wordmark would be a fixed pair of hex values in an interface
whose entire colour system is tokenised.

**Why commit the trace instead of tracing at build time.** Reproducibility.
`potrace` 1.16 and `potrace` 1.17 need not agree to the last control point, and
a build whose output depends on a locally-installed binary is a build nobody
can independently reproduce. Committing the output makes the artwork a fixed
input like every vendored tarball; the regeneration script keeps it honest
without making it load-bearing.

**Why validate an asset the CSP already constrains.** The cold realm's CSP
would block script execution from an inline SVG, and `script-src` is
hash-pinned in both realms. That is a good reason to be confident and a bad
reason to skip the check: a content type that has never been in this document
before is being introduced, the check costs a few dozen lines, and "a later
layer would have caught it" is an argument that only works until the layer
moves. The build refusing to emit is a stronger property than the browser
refusing to execute.

**Why not `src/assets/`.** It would put binary files inside the tree
`scripts/lint.js` treats as source, forcing the lint to skip files by
extension. Trading a real guard on the source tree for a directory name is a
bad trade, and the guard is one of the P0.3 constraints the project's own
threat model leans on. The separate asset side scan preserves that source-tree
guard while making the roadmap's literal lint criterion true for textual
brand assets; `assertSafeSvg()` and the PNG decoder add the deeper structural
checks and their negative tests prove that the build fails closed.

## Consequences

### Positive

- The wordmark is ~15.4 KB in the artifact instead of ~560 KB, and it is
  resolution-independent and themed.
- The build gains no new tool dependency, and `npm run build` on a machine
  without `potrace` works exactly as before.
- The committed artwork is verifiable: `--check` re-derives it, and the
  favicons' embedded bytes are asserted equal to the committed files.
- A change to brand artwork moves the build date, so provenance cannot claim a
  fixed date across an artwork change.

### Negative

- Regenerating the wordmark needs `potrace` 1.16 installed, and a different
  potrace version may not reproduce the committed bytes. This is a maintenance
  inconvenience rather than a build failure, since the build never traces.
- `assets/` is a fourth build-input directory, and every place that constructs
  a temporary build root has to know about it. Four test files and
  `scripts/run-browser-harness.js`'s `copyBuildInputsInto()` were updated;
  `copyBuildInputsInto()` remains the single list the harness uses.
- The trace is an approximation of the artwork, not the artwork. It is faithful
  at the sizes the app bar uses (see the packet's pixel diff) but it is not the
  supplied PNG.

### Risks

- **A future contributor adds a build input outside the four known directories**
  and does not add it to `BUILD_DATE_SOURCE_PATHS` or to the temporary-build-root
  lists. This is the same hand-maintained-list risk ADR-0015's amendment
  already carries forward; `test/brand-assets.test.js` pins `assets` into the
  path list so removing it is a deliberate, reviewed change.
- **The SVG validator is a denylist**, and a denylist can be incomplete. It is
  backed by the CSP rather than replacing it, and by the constraint that this
  asset changes only when brand artwork changes — which is rare and reviewed.

## Alternatives considered

### Embed the PNG as a base64 `data:` URI

Rejected. ~560 KB against a 4 MB budget for one decorative element, fixed
colours that ignore the theme, and soft edges on high-density displays.

### Trace at build time with `potrace`

Rejected. It makes `potrace` a build dependency and makes the artifact's bytes
depend on which version of it is installed, which breaks the reproducibility
claim the project's trust model rests on.

### Hand-author an SVG wordmark from the display face

Rejected. The supplied artwork is drawn, not set: it has irregular outlines,
interior crack detail, and per-letter tilts that no font-plus-text-shadow
reproduction gets right. The five-layer `text-shadow` this item removes was
exactly that attempt.

### Keep the CSS text wordmark and add only favicons

Rejected. It is half the roadmap item, and the item exists because the
approximation was never the intended mark.

## What would change our mind

Artwork that changes often enough that a committed trace goes stale would argue
for a build-time pipeline with a pinned, vendored tracer. Neither exists today,
and a brand mark that changes often is a different problem.

## References

- [UI.2 roadmap item](../ROADMAP.md)
- [ADR-0009](0009-comic-visual-language.md) — the visual language the mark belongs to
- [ADR-0015](0015-provenance-build-date-and-self-hash.md) — the build-date path list this adds to
- [design-system.md §5 — App bar](../../01-spec/design-system.md) — the component this changes
- [dependencies.md — Bundle budget](../dependencies.md#bundle-budget) — the size delta
- [UI.2 PR packet](../packets/ui.2-brand-assets.md)
- `scripts/brand-assets.js`, `scripts/trace-brand-wordmark.js`, `test/brand-assets.test.js`
