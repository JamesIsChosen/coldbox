# PR packet — UI.2 Brand assets: wordmark and favicons

**Branch:** `ui.2-brand-assets` · **Base:** `main` · **Item:** [UI.2](../ROADMAP.md)
**Author:** agent session, 2026-08-15

---

## 1. Summary

The `.app-bar` masthead now carries the supplied Coldbox logo as an inline two-path SVG
traced once from the artwork and committed as a source asset, replacing the five-layer
`text-shadow` treatment that approximated it with display-face text. Favicons at 16, 32
and 48 px are embedded as `data:` PNG URIs. Both are embedded, both are offline, and
neither is generated at build time, so the artifact does not depend on any tool outside
the repository.

---

## 2. Scope

**In:**

- `assets/brand/` — a new top-level build-input directory holding the supplied wordmark
  PNG, the three favicon PNGs, and the traced `coldbox-wordmark.svg`.
- `scripts/brand-assets.js` — reads and validates both asset kinds, fails closed.
- `scripts/trace-brand-wordmark.js` — maintenance regeneration, with a `--check` mode.
  Never invoked by the build or by CI.
- `scripts/build.js` — two new injections; `assets` added to `BUILD_DATE_SOURCE_PATHS`.
- `src/index.html`, `src/styles.css` — the app-bar markup and the wordmark rules.
- `test/brand-assets.test.js` — 15 tests, including truncated-PNG and CRC-corruption regressions.
- `scripts/lint.js` and `test/lint.test.js` — a binary-safe textual SVG side scan and
  its external-URL regression.
- Docs: ADR-0047 (new), ADR-0015 amendment, ADR index, design-system §5, build.md,
  dependencies.md bundle budget, CHANGELOG, roadmap acceptance, and the standing
  browser-verification rule.

**Touched outside the item, and why:**

- `scripts/run-browser-harness.js` `copyBuildInputsInto()` and the temporary-build-root
  lists in `test/build.test.js`, `test/help-content.test.js`, `test/legal-notices.test.js`
  and `test/provenance.test.js` each gained `'assets'`. After P0.22 merged, its new `test/build-date.test.js` end-to-end scratch build was added to the same list during reconciliation. These construct a scratch project
  root and run the real `scripts/build.js` in it; without the new directory they fail
  closed on ENOENT. This is not optional cleanup — it is the same drift the comment above
  `copyBuildInputsInto()` was written to warn about, and leaving it would have broken six
  existing tests. Verified by the failure being reproduced first (see §6) and then fixed.

- `docs/05-development/packets/ui.2-brand-assets.review.md` — the independent FAIL report
  supplied for this remediation, preserved unchanged as the reviewer-owned record.

**Deliberately not in:**

- No change to either realm's CSP, to the message schema, to the vault format, to
  derivation, or to randomness.
- No change to `src/cold/`. The sealed realm gets no favicon and no wordmark; it is a
  `srcdoc` frame with no `<head>` chrome of its own.
- The supplied `favicon-c-lower-64x64.png` and `favicon-c-lower.ico` are **not** committed.
  The item asks for 16, 32 and 48; carrying unused bytes into a budgeted artifact needs a
  reason and there isn't one. They remain available from the maintainer.
- The pre-existing 1 px horizontal overflow at a 320 px viewport (`scrollWidth` 321 vs
  `clientWidth` 320) is **not** fixed here. Measured on `main` before this change and
  found identical; it is not this item's and bundling it would put two things in one
  branch.

---

## 3. How to verify

Post-P0.22 regeneration environment: Node **v24.16.0** on Windows x64, `npm ci` from the committed `package-lock.json`.

```
$ node --version
v24.16.0

$ npm run verify-vendor
Local vendor verified: @fontsource/bangers@5.3.0
... (10 artifacts)
Upstream release verified: qrcode-generator@1.4.4
Vendor verification passed against local files and upstream releases.

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 224 markdown file(s) checked, 0 warning(s).

$ Remove-Item build -Recurse -Force; npm run build; Get-FileHash build/coldbox.html
Built build/coldbox.html (ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83)
SHA256  ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83  build/coldbox.html

$ Remove-Item build -Recurse -Force; $env:LC_ALL='fr_FR.UTF-8'; $env:TZ='Asia/Tokyo'; npm run build; Get-FileHash build/coldbox.html
Built build/coldbox.html (ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83)
SHA256  ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83  build/coldbox.html

$ (Get-Item build/coldbox.html).Length
2622481 build/coldbox.html

$ npm test
ℹ tests 402
ℹ pass 402
ℹ fail 0
```

**Which product commit that hash belongs to, and when it moves.** `readBuildCommitDate()` resolves
`git log -1 --format=%ct %ci HEAD -- assets src scripts vendor`; `scripts/build-date.js` owns the
canonical ISO rendering. The current product commit is `18218c0` (`test(UI.2): close browser
harness page safely`), which is the latest commit touching `scripts/` and therefore fixes the
embedded build date for this packet. The subsequent packet/report commit touches only governance
and review paths, so it does not move the artifact. The final reproducible hash is `ba94ee70…`.

### The trace is reproducible, not asserted

```
$ potrace --version
potrace 1.16. Copyright (C) 2001-2019 Peter Selinger.

$ node scripts/trace-brand-wordmark.js --check
Traced wordmark matches the committed asset byte for byte.
```

`--check` re-decodes `assets/brand/coldbox-wordmark.png`, rebuilds both masks, re-runs
`potrace --flat -O 1.0 -t 8 -a 1.3 -u 10`, recomposes the document, and byte-compares
against the committed file. It is the reason 15 KB of path data does not have to be taken
on trust. It is a maintenance tool: `npm run build` never calls it, and the build succeeds
on a machine with no `potrace` installed.

### Current merged-main baseline after P0.22

A detached worktree at merged `main` `be11564` was rebuilt with the same
Node/npm toolchain used for this regeneration:

```
$ npm run build
Built build/coldbox.html (da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562)
$ sha256(build/coldbox.html)
da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562
$ byte-count(build/coldbox.html)
2597939
```

The current merged-main baseline is **2,597,939 bytes**. The reconciled UI.2 artifact
is **2,622,481 bytes**, a measured delta of **+24,542 bytes**.
This comparison is against merged P0.22 main, not the stale pre-P0.22 branch base.

---

## 4. Acceptance criteria

Criteria copied verbatim from the roadmap item, split at the semicolons.

| Criterion | How satisfied | Test |
|---|---|---|
| the wordmark is an inline SVG carrying `--fill-cyan` and `--fill-ink` rather than literal hex, so it follows the theme and §3's no-inline-hex rule | Two paths, `fill="var(--fill-ink)"` and `fill="var(--fill-cyan)"` as presentation attributes, with matching `.wordmark-ink`/`.wordmark-cyan` rules in `src/styles.css` that win the cascade. No hex in either place. Computed fills in Chromium: `rgb(18, 18, 18)` = `--fill-ink` `#121212`, `rgb(0, 240, 255)` = `--fill-cyan` `#00f0ff`, identical in both themes. | `brand-assets.test.js` "the committed wordmark is a two-path SVG carrying the fill tokens and no literal colour"; "the wordmark is themed through tokens in the stylesheet, with no hex in the rule"; build-time `assertSafeSvg()` rejects a hex colour |
| it renders legibly at app-bar height and at 320px viewport width | Rendered from `file://` in Chromium. 1280 px: 127.9 × 44.0 px. 320 px: 88.3 × 30.4 px. Screenshots in §6; legible at both, in both themes. The height clamp is deliberately the `clamp(1.9rem, 4vw, 2.75rem)` the replaced text carried, so the masthead's rendered height is unchanged — measured at 1280/720/400/320 px against `main` (§6). | Browser evidence in §6; the clamp value is pinned by the stylesheet test |
| it carries an accessible name of `Coldbox` | `role="img"` plus `aria-label="Coldbox"` on the `<svg>`, and a `<title>Coldbox</title>`. `focusable="false"` so it is not a tab stop. | `brand-assets.test.js` "the app bar holds the inline wordmark with an accessible name of Coldbox"; `assertSafeSvg()` fails the build if either attribute is missing |
| the favicons are `data:` URIs at 16, 32 and 48 px | Three `<link rel="icon" type="image/png" sizes="NxN" href="data:image/png;base64,…">` in `<head>`, emitted in fixed order. Each decodes to a PNG whose IHDR dimensions equal the declared size, and whose bytes equal the committed source file. | "the built document carries data: favicons at 16, 32 and 48 px and nothing else"; "each embedded favicon decodes to a PNG of the size it declares" |
| and resolve with no network and no sibling file from `file://` | Loaded from `file://` with request interception on: zero requests outside the document itself and the pre-existing warm reachability monitor (ADR-0024, `api.coinbase.com` / `mempool.space`, unrelated to this change). No `favicon.ico` sibling request. In-page `new Image()` against the 32 px `href` resolved to `32x32` under the document's own CSP. A negative markup assertion rejects any icon `href` that is not `data:`, and any `apple-touch-icon` / `shortcut icon` / `mask-icon` / `manifest` relationship that could reach for a file. | §6 browser evidence; "the built document carries data: favicons … and nothing else" |
| `scripts/lint.js` passes, which means no external URL and no fetched asset | Lint now scans textual SVG files under `assets/brand/` through a binary-safe side path, allowing only the standalone SVG namespace declaration. The build embeds only committed local PNG bytes as `data:` URIs; its structural SVG/PNG validators fail closed before emission. | `test/lint.test.js` external-URL regression; `scripts/brand-assets.js` structural checks and `test/brand-assets.test.js` negative regressions |
| the build remains reproducible across two runs | Two builds, second under a different locale and timezone and after removing `build`: identical SHA-256 `ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83`. | §3; `test/build.test.js` "two builds are byte-identical regardless of caller locale and timezone" |
| the size delta is recorded against dependencies.md#bundle-budget | +24,542 bytes (+23.97 KB) recorded there with its component breakdown and its provenance, without overwriting the CI-measured absolute figure. | §11 |
| design-system.md §5 `.app-bar` is updated to describe the logo rather than the five-layer text-shadow wordmark it replaces | §5 rewritten: the logo, its two token-filled paths, the accessible name, the clamp, the no-rotation decision, and the favicons. The stale `.brand-name` reference is gone. | `npm run check-docs`; "the replaced text wordmark is gone from source and from the artifact" |
| the `Pre-release · Not audited` badge and §2's copy rules are untouched | `.brand-badge` markup, CSS and copy are byte-unchanged; the diff for `src/index.html` is 3 lines, none of them the badge. No UI copy is added by this change at all — the wordmark is artwork and its accessible name is the product name. | "the app bar holds the inline wordmark…" asserts the badge element verbatim |
| the SVG contains no `<script>`, no `<foreignObject>`, no `href`/`xlink:href`, and no external reference of any kind | Asserted directly against the committed asset, and enforced at build time by `assertSafeSvg()`, which additionally rejects `<image>`, `<use>`, `<style>`, `<a>`, inline event handlers, `url()`, entity declarations and a DOCTYPE. The only URI-shaped string in the asset is the SVG namespace declaration — see the note below. | "the wordmark contains no script, no foreignObject, no href, and no external reference"; "the SVG validator rejects each forbidden construct rather than passing it through" (14 mutations); "a wordmark that grew a script tag fails the build closed with a non-zero exit" |

**The binary/source boundary is deliberate, but no longer leaves a lint blind spot.**
`assets/brand/` remains outside the UTF-8 source walk so PNGs do not force `scripts/lint.js`
to weaken its source-tree guard. The lint now separately walks textual `.svg` files there,
rejecting external and protocol-relative URLs except for the one standalone SVG namespace
declaration. `assertSafeSvg()` still owns the full SVG content contract, and the PNG parser
owns chunk, CRC, decompression, scanline and dimension validation. The negative tests prove
both paths fail closed.

**The SVG contains exactly one URI-shaped string:** `xmlns="http://www.w3.org/2000/svg"`.
It is a namespace *name*, not a location — nothing dereferences it, and the mark renders
identically without it, since the HTML parser puts `<svg>` in the SVG namespace anyway. It
is kept so the committed file is a valid standalone SVG that opens correctly on its own,
which is what makes `--check` and manual inspection of the trace possible. The validator
allowlists that exact declaration, requires it to appear exactly once, and treats any other
scheme-and-authority string as a finding; a test asserts the full set of URI-shaped matches
in the asset is `['http://www.w3.org/2000/svg']` and nothing else. If a reviewer reads
"no external reference of any kind" as excluding a namespace declaration, the fix is to
drop the attribute from the composed document — one line in
`scripts/trace-brand-wordmark.js` — at the cost of the file no longer standing alone.

---

## 5. Security impact

| Surface | Touched? |
|---|---|
| Realm boundary | No |
| Message schema | No — no message type added, changed, or removed |
| CSP (either realm) | No — both policies are byte-identical to `main` |
| Vault format | No |
| Derivation | No |
| Randomness | No |
| New `connect-src` host | No |

**If this implementation is wrong, what does an attacker gain?** The realistic failure is
active content entering the warm document through a content type that has never been in it
before. An SVG can carry `<script>`, `<foreignObject>` with embedded HTML, `href`
navigation, event-handler attributes, and external references through `url()`, `<use>` or
`<image>`. The warm shell holds no secret material, but it does hold the registry, the
save path, and the parent frame of the sealed realm — so script in the warm document is a
serious position from which to attack the boundary, even though it cannot read across it.

Three things stand between that and reality, in order: the build refuses to emit an SVG
carrying any of those constructs; the warm CSP is `script-src` hash-pinned, so an injected
inline script has no matching hash and does not execute; and `default-src 'none'` with
`img-src data: blob:` means no external reference resolves. I am asserting the first, and
tests prove it fires. The second and third are unchanged by this PR and are P0.4's and
P0.8's to hold.

**The honest uncertainty:** `assertSafeSvg()` is a denylist, and denylists are incomplete
by construction. I chose it over an allowlist parser because a correct SVG allowlist
parser is considerably more code than the asset it guards, and because the asset changes
only when brand artwork changes — which is rare, reviewed, and regenerated by a script
whose output shape is fixed. I do not claim it would stop a determined adversary who can
already commit to `assets/brand/`; someone with that access can change `scripts/` too. It
is a guard against a mistake, layered under a CSP that is the actual control.

**Favicons.** A `data:` URI cannot be a network beacon; the byte ceiling, complete PNG
chunk/CRC structure, zlib decode, scanline validation and dimension check exist so that a
corrupted, truncated or swapped file stops the build rather than shipping. The bytes are
the committed PNGs, unmodified, asserted by test.

---

## 6. Test evidence

**New tests: 15** in `test/brand-assets.test.js`, plus one lint regression in
`test/lint.test.js`. The full suite is 402 tests after this remediation, all passing.

What each group proves:

- **Asset shape (2 tests).** The committed SVG is LF-only, starts with `<svg`, has exactly
  two paths carrying the two fill tokens, has no hex, has the expected `viewBox`, and
  contains no `<script>`, `<foreignObject>`, `<image>`, `<use>`, `<style>`, `<!ENTITY>`,
  DOCTYPE, `href`, `xlink:href`, event handler or `url()`. The URI-shaped-string set is
  asserted to be exactly the namespace declaration.
- **Negative: validator (1 test, 14 mutations).** Each forbidden construct is injected into
  a copy of the real asset and `assertSafeSvg()` must throw. This is the test that matters:
  without it, the positive assertions above only prove the current file is clean, not that
  anything would notice if it stopped being.
- **Negative: build fails closed (5 tests).** A temporary project root is built with (a) a
  wordmark carrying `<script>1</script>`, (b) the 48 px artwork copied over the 16 px file,
  (c) a favicon that is not a PNG, (d) a valid PNG signature and IHDR truncated before
  IDAT/IEND, and (e) a valid PNG with a corrupted IDAT CRC. Each must exit non-zero with
  the specific message, and
  the script case additionally asserts **no `build/coldbox.html` is written** — a build that
  fails after emitting an artifact is not failing closed. Observed failures:
  `Brand SVG coldbox-wordmark.svg contains a forbidden construct: <script>`,
  `Favicon favicon-c-lower-16x16.png is 48x48, expected 16x16`,
  `Favicon favicon-c-lower-32x32.png is not a PNG`, a truncated-PNG message naming the
  missing or incomplete IDAT/IEND structure, and an invalid-IDAT-CRC message.
- **Favicons in the artifact (2 tests).** Exactly three icon links, right sizes, right
  order, `data:` scheme; each base64 payload decodes to a PNG whose complete source
  structure is accepted by the build parser, whose IDAT inflates, and whose bytes equal
  the committed file. Plus the negative markup assertions for non-`data:` hrefs and
  sibling-seeking relationships.
- **Lint asset coverage (1 test).** A temporary textual SVG under `assets/brand/` carrying
  an external URL is rejected by `scripts/lint.js`, while the real namespace declaration
  remains allowed.
- **App bar (3 tests).** The inlined markup is byte-identical to `createWordmarkMarkup()`
  (so the artifact cannot drift from the asset), carries `role`/`aria-label`/`<title>`/
  `focusable`, sits inside `<header class="app-bar">`, and the badge element is asserted
  verbatim. The replaced treatment is gone from `src/index.html`, `src/styles.css` and the
  artifact.
- **Provenance and determinism (2 tests).** `assets` is pinned into
  `BUILD_DATE_SOURCE_PATHS`. Both injections are byte-stable across repeated reads and the
  favicon order is fixed, so neither can depend on filesystem enumeration order.

**Vector sources.** There is no cryptographic content here, so "independent vectors" does
not apply in its usual sense. The closest equivalent is that the trace is checked against
an independent renderer rather than against itself: `potrace` produced the paths, Chromium
rasterised them, and the result was compared to the maintainer's original PNG:

| Threshold | Pixels differing | Share of 1494×514 |
|---|---|---|
| > 16/255 | 19,779 | 2.576% |
| > 64/255 | 4,312 | 0.562% |
| > 128/255 | 1,319 | 0.172% |

Mean absolute per-channel difference 1.481/255. The differences are edge pixels where the
fitted curve lands inside or outside the antialiased boundary; there is no structural
difference. Composited over white, both at 1494×514, source alpha flattened.

**Browser evidence (Chromium and Firefox, from `file://`, against the built artifact).**

Masthead height, measured against a `main` build in the same session:

| Viewport | `main` bar height | This branch | Δ |
|---|---|---|---|
| 1280 px | 74.19 px | 74.19 px | 0.00 |
| 720 px | 65.38 px | 65.38 px | 0.00 |
| 400 px | 105.38 px | 105.36 px | −0.02 |
| 320 px | 105.38 px | 105.36 px | −0.02 |

The −0.02 px is sub-pixel rounding between a `1.9rem` box and a `1.9rem` line box. An
earlier iteration of this change used a different clamp and shrank the bar by 2.4 px at
1280 px; that was caught by this measurement and fixed by matching the replaced clamp
exactly, because §5's contract is that the bar's height and the nav rail's `top` derive
from one token.

Wordmark geometry and computed fills at the exact UI.2 viewport were checked by the
committed harness in both engines: 320 px × 640 px, visible, inside the viewport, with
`role="img"` and `aria-label="Coldbox"`; each path's computed fill was compared with a
browser-resolved `--fill-ink`/`--fill-cyan` probe in both dark and light themes. The same
run decoded all three favicon `data:` payloads through `new Image()` as 16×16, 32×32 and
48×48, and recorded no sibling file, favicon, manifest or apple-touch-icon request. The
existing general responsive check remains at 360 px; the new UI.2 check is deliberately
the literal 320 px condition.

The committed harness produced these lines in the final exact-tip run:

```
$ npm run test:browser
Playwright is dev-only; dependency-free build matches byte-for-byte (ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83)
Chromium: UI.2 exact 320px wordmark and data-favicon file:// checks passed
Firefox: UI.2 exact 320px wordmark and data-favicon file:// checks passed
Browser harness passed in Chromium and Firefox.
```

Safari/WebKit and physical devices were not run. They are not UI.2 acceptance conditions:
the item is explicitly browser-verifiable, and the standing definition of done now
requires its committed browser harness conditions rather than adding a physical-device
gate. P0.19 remains the separate release/device matrix.

---

## 7. Device matrix

| Platform | Result | Notes |
|---|---|---|
| Linux Chromium | **PASS** | Committed harness, `file://`, exact 320×640 UI.2 assertions plus the existing general suite |
| Linux Firefox | **PASS** | Committed harness, `file://`, exact 320×640 UI.2 assertions plus the existing general suite |
| Physical mobile / Safari / WebKit | NOT A UI.2 CONDITION | The roadmap acceptance is browser-verifiable; P0.19 owns the separate physical-device release matrix |

The exact viewport/file condition is covered in both required desktop browser engines by
the committed harness. No physical-mobile deferral is claimed, and ADR-0043 remains scoped
to P2.7; the UI.2 item does not borrow it.

---

## 8. Assumptions made

1. **`assets/brand/coldbox-wordmark.png` is the `coldbox-logo.png` the item names.** The
   item specifies 1494×514 RGBA, two flat colours, and 419,715 bytes. The file committed on
   branch `ui-seeded-app-walkthrough` (`8212575`, "Add seeded UI walkthrough and local
   brand assets", authored by the maintainer 2026-08-08) is 1494×514 RGBA, two flat colours,
   and 419,715 bytes, under the name `coldbox-wordmark.png`. All four match. I took the
   assets from that commit rather than the walkthrough branch's implementation, none of
   which is included here. **If this is the wrong file, the wordmark is wrong** — but the
   byte count in the roadmap is an exact match, which is hard to hit by accident.
2. **The ink mask is the silhouette, not the black-only region.** The item says "a black
   mask and a cyan mask". I traced alpha ≥ 128 as the ink mask and painted cyan over it,
   rather than tracing black-only and butting the two paths together. Rationale in
   ADR-0047: independently-fitted curves along a shared boundary disagree by fractions of a
   unit and show the page through as a hairline. The rendered result is the same artwork —
   cyan covers the silhouette wherever cyan exists — and the §6 pixel diff is measured
   against the original, so the choice is verified rather than argued. **If this is wrong,
   it is wrong in a visible way**: the mark would show a seam or a wrong-coloured edge, and
   it does not.
3. **The traced SVG is 15,757 bytes, not the "~25 KB" the item estimates.** The estimate
   was written before the trace existed; a silhouette ink mask has fewer edges than a
   black-only one. Smaller than estimated, same parameters, and `--check` reproduces it.
4. **No rotation on the wordmark.** The replaced text was tilted −2°. The artwork carries
   its own tilt, and re-tilting it looked like a mistake. Recorded in design-system §5.
   Purely aesthetic and trivially reversible.
5. **`assets/` at the repo root rather than `src/assets/`.** ADR-0047 §"Why not
   `src/assets/`". Binary PNGs stay outside the UTF-8 source walk; lint's separate textual
   SVG side scan covers external/protocol-relative URLs, while the build validator covers
   the complete SVG/PNG structures.
6. **The 64 px favicon and the `.ico` are not committed.** Unused bytes in a budgeted
   artifact. If a reviewer wants `.ico` for legacy Windows shortcut behaviour, that is a
   separate decision.
7. **The two brand maintenance/build scripts are syntax-checked by lint.**
   `scripts/brand-assets.js` and `scripts/trace-brand-wordmark.js` are now in
   `toolingJavaScriptFiles`; this catches syntax drift without treating their comments or
   maintenance strings as source-tree security findings. `--check` remains the trace
   fidelity exercise.

---

## 9. What to scrutinise

**The namespace-declaration exemption in `assertSafeSvg()`** (§4, second caveat). It is the
one place I widened a check to let something through. I believe a namespace name is not an
external reference; a reviewer may reasonably disagree, and the argument is entirely in the
open above. This is where I am least confident.

**The denylist in `FORBIDDEN_SVG_PATTERNS`.** I would look hard at what a hostile SVG could
carry that thirteen regexes miss. `<set>`/`<animate>` with `attributeName="href"`, an
`xlink` prefix bound to a different local name, a `data-*` attribute a future consumer
reads — none of these do anything in a hash-pinned, `default-src 'none'` document, which is
why I stopped where I did, but "none of these do anything" is a claim about today's CSP.

**The trace fidelity numbers in §6.** They were produced by one renderer against one
composite. If a reviewer re-renders with `rsvg` or Inkscape and gets materially different
figures, my method is wrong, not theirs — the numbers are only meaningful as "this trace is
faithful", and the screenshots are the honest primary evidence.

**The six files touched outside the item** (§2). Each is a one-word addition to a
directory list, and I would check that none of them is doing anything else, and that I did
not miss a seventh. I found them by running the suite and reading the failures; a list I
missed would show up as a build ENOENT in that file, which is loud, but a temporary root
that happens not to build would hide it.

**Whether `assets/` should exist at all.** It is a new top-level directory in a repository
that has been deliberate about its shape. The alternative — weakening `lint.js` — seemed
clearly worse, but a third option I did not take is committing only the SVG (in `src/`,
where lint reads it) and not committing the PNG sources at all, accepting that the trace
becomes unverifiable. I rejected that because unverifiable is the thing this project's
review protocol exists to prevent, but it would be a smaller change.

---

## 10. Self-assessment

**What might be wrong:**

- The source PNG identification (assumption 1). Everything else follows from it.
- The wordmark may be too small or too large for someone's taste at some viewport. I
  anchored it to the replaced element's own geometry rather than to a judgement, which is
  defensible but is not the same as being right.
- `focusable="false"` is a legacy IE/Edge attribute. Harmless, and it costs 18 bytes.

**What I did not do that arguably should have been done:**

- Run the P0.3a browser harness. I could not, and I did not paper over it by stubbing the
  Firefox check — that would have produced a green line with nothing behind it.
- Test on any mobile device, or on Safari or Firefox at all.
- Add a binary-safe textual SVG side scan to `lint.js`, plus a negative lint regression for
  an external URL. The scan preserves the source-tree UTF-8 guard while making the
  roadmap's literal lint criterion true for these brand assets.

**Known limitations shipping with this change:**

- Regenerating the wordmark requires `potrace` 1.16 specifically; another version may not
  reproduce the committed bytes. The build never traces, so this affects maintenance only.
- `assets/` is a hand-maintained entry in five directory lists plus
  `BUILD_DATE_SOURCE_PATHS`. Pinned by test, but hand-maintained.
- The committed PNG sources add 425 KB to the *repository*. They are not in the artifact.

**Follow-up this creates:**

- The absolute bundle figure in `dependencies.md` needs its CI refresh after merge, per
  that file's own rule. Not filed as a roadmap item; it is a line edit on the next CI run.
- Physical-device and Safari/WebKit evidence remains outside UI.2's browser-verifiable
  acceptance; P0.19 owns that separate release/device matrix.

---

## 11. Bundle impact

| | Bytes | |
|---|---|---|
| Before (`main`, this toolchain, matching CI) | 2,597,939 | ≈ 2.60 MB |
| After | 2,622,481 | ≈ 2.62 MB |
| **Delta** | **+24,542** | **+23.97 KB** |

Components: traced wordmark SVG 15,757 inlined verbatim; three favicons 7,572 bytes of
base64 plus 186 bytes of `<link>` tags; the remainder is the net of the stylesheet rules
that replaced the text wordmark and the markup change.

Against a 4 MB target and a 4.5 MB hard cap, this is 0.6% of target. **The budget is not
threatened.** For scale: embedding the supplied 419,715-byte PNG as base64 instead of
tracing it would have cost ≈ 560 KB, a factor of 23 more.

Recorded in [dependencies.md](../dependencies.md#bundle-budget) as a delta, without
overwriting the CI-measured absolute figure — that file requires the "last measured" line
to come from CI, and this one did not.

---

## 12. Docs updated

| Document | Change |
|---|---|
| [ADR-0047](../adr/0047-brand-assets-traced-once-and-embedded.md) | **New.** Traced once and committed; `assets/` not `src/`; build-time validation. The structural decision this item makes |
| [ADR-0015](../adr/0015-provenance-build-date-and-self-hash.md) | Amendment: `assets` joins the build-date path list — the exact residual risk the 2026-08-06 amendment recorded |
| [adr/README.md](../adr/README.md) | Index row for 0047 |
| [design-system.md §5](../../01-spec/design-system.md) | `.app-bar` describes the logo, its tokens, its accessible name, its clamp, the no-rotation decision, and the favicons. The `.brand-name` text-shadow description is gone |
| [build.md](../build.md) | New step 3a for brand-asset embedding; build-date path list corrected |
| [dependencies.md](../dependencies.md#bundle-budget) | UI.2 delta with component breakdown and provenance |
| [ROADMAP.md](../ROADMAP.md) | UI.2 acceptance; the item-level status remains canonical there |
| [AGENTS.md](../../../AGENTS.md) | Browser-verifiable items use literal committed harness conditions; physical-device gating remains scoped to items that claim it and to P0.19 |
| [scripts/lint.js](../../../scripts/lint.js) and [test/lint.test.js](../../../test/lint.test.js) | Binary-safe textual SVG URL scan and its negative regression |
| [test/brand-assets.test.js](../../../test/brand-assets.test.js) | Complete PNG structure/decodability regression, including valid-header truncation |
| [scripts/run-browser-harness.js](../../../scripts/run-browser-harness.js) | Exact 320px Chromium/Firefox UI.2 browser gate and sibling-request assertions |
| [ui.2-brand-assets.review.md](ui.2-brand-assets.review.md) | Preserved independent review report supplied for this remediation |
| [CHANGELOG.md](../../../CHANGELOG.md) | Unreleased entry |

**No help content.** The three-depth requirement applies to user-facing features; a
wordmark is not one, and there is no glossary term or guide whose content changes. §2's
copy rules are untouched because this change adds no copy.

**No fact duplicated.** The bundle figure lives only in `dependencies.md`; design-system §8
and this packet link to it. The trace parameters live in the roadmap item and ADR-0047; the
script names them as constants because it executes them, which is code, not a restatement.
No dated review obligation is created — nothing here describes the outside world.
