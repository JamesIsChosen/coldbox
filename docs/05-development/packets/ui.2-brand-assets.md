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
- `test/brand-assets.test.js` — 13 tests.
- Docs: ADR-0047 (new), ADR-0015 amendment, ADR index, design-system §5, build.md,
  dependencies.md bundle budget, CHANGELOG, roadmap marker.

**Touched outside the item, and why:**

- `scripts/run-browser-harness.js` `copyBuildInputsInto()` and the temporary-build-root
  lists in `test/build.test.js`, `test/help-content.test.js`, `test/legal-notices.test.js`
  and `test/provenance.test.js` each gained `'assets'`. These construct a scratch project
  root and run the real `scripts/build.js` in it; without the new directory they fail
  closed on ENOENT. This is not optional cleanup — it is the same drift the comment above
  `copyBuildInputsInto()` was written to warn about, and leaving it would have broken six
  existing tests. Verified by the failure being reproduced first (see §6) and then fixed.

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

Environment: Node **v24.16.0** (matching `.nvmrc` and `package.json` `engines`), Linux
x64, `npm ci` from the committed `package-lock.json`.

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
Documentation hygiene check passed: 221 markdown file(s) checked, 0 warning(s).

$ rm -rf build && npm run build && sha256sum build/coldbox.html
Built build/coldbox.html (bd4273913623881864ce12f7beecd20a6486053ae48cda0764c10f77cf2b9c2d)
bd4273913623881864ce12f7beecd20a6486053ae48cda0764c10f77cf2b9c2d  build/coldbox.html

$ rm -rf build && LC_ALL=fr_FR.UTF-8 TZ=Asia/Tokyo npm run build && sha256sum build/coldbox.html
Built build/coldbox.html (bd4273913623881864ce12f7beecd20a6486053ae48cda0764c10f77cf2b9c2d)
bd4273913623881864ce12f7beecd20a6486053ae48cda0764c10f77cf2b9c2d  build/coldbox.html

$ wc -c build/coldbox.html
2622481 build/coldbox.html

$ npm test
ℹ tests 391
ℹ pass 391
ℹ fail 0
```

**Which tip that hash belongs to, and when it moves.** `readBuildCommitDate()` resolves
`git log -1 --format=%cI HEAD -- assets src scripts vendor`, so the embedded build date —
and therefore the artifact hash — is fixed by the last commit touching a *product* path.
On this branch that is the test commit, `ea0a76d`; the docs commit after it touches only
`docs/` and `CHANGELOG.md` and does not move the hash, which is exactly the property
ADR-0015's 2026-08-06 amendment exists to give. `bd427391…` is therefore the hash of this
branch as submitted, and a reviewer building this tip should reproduce it. If the branch
gains a further commit under `src/`, `scripts/`, `assets/` or `vendor/` — a remediation
round, say — the hash advances and this line goes stale by design. **The byte count does
not move either way**, since the date is a fixed-length ISO-8601 string; that is why §11
quotes a size delta and this section quotes a hash with its tip named.

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

### This environment reproduces CI exactly

Before making any change, `main` was built with the same toolchain:

```
$ git checkout main && npm run build && sha256sum build/coldbox.html && wc -c build/coldbox.html
73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1  build/coldbox.html
2597939 build/coldbox.html
```

Both match the CI-measured figures recorded in
[dependencies.md](../dependencies.md#bundle-budget) exactly — hash and byte count. That is
what makes the §11 delta a real measurement of this change rather than a measurement of a
toolchain difference.

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
| `scripts/lint.js` passes, which means no external URL and no fetched asset | Lint passes (§3). **Read the note below the table before treating this as the evidence.** | `test/lint.test.js` (unchanged); the substantive property is covered by `assertSafeSvg()` and its negative tests |
| the build remains reproducible across two runs | Two builds, second under a different locale and timezone and after `rm -rf build`: identical hash `f7b9025a…`. | §3; `test/build.test.js` "two builds are byte-identical regardless of caller locale and timezone" |
| the size delta is recorded against dependencies.md#bundle-budget | +24,542 bytes (+23.97 KB) recorded there with its component breakdown and its provenance, without overwriting the CI-measured absolute figure. | §11 |
| design-system.md §5 `.app-bar` is updated to describe the logo rather than the five-layer text-shadow wordmark it replaces | §5 rewritten: the logo, its two token-filled paths, the accessible name, the clamp, the no-rotation decision, and the favicons. The stale `.brand-name` reference is gone. | `npm run check-docs`; "the replaced text wordmark is gone from source and from the artifact" |
| the `Pre-release · Not audited` badge and §2's copy rules are untouched | `.brand-badge` markup, CSS and copy are byte-unchanged; the diff for `src/index.html` is 3 lines, none of them the badge. No UI copy is added by this change at all — the wordmark is artwork and its accessible name is the product name. | "the app bar holds the inline wordmark…" asserts the badge element verbatim |
| the SVG contains no `<script>`, no `<foreignObject>`, no `href`/`xlink:href`, and no external reference of any kind | Asserted directly against the committed asset, and enforced at build time by `assertSafeSvg()`, which additionally rejects `<image>`, `<use>`, `<style>`, `<a>`, inline event handlers, `url()`, entity declarations and a DOCTYPE. The only URI-shaped string in the asset is the SVG namespace declaration — see the note below. | "the wordmark contains no script, no foreignObject, no href, and no external reference"; "the SVG validator rejects each forbidden construct rather than passing it through" (14 mutations); "a wordmark that grew a script tag fails the build closed with a non-zero exit" |

**Two criteria need a caveat rather than a tick, and I would rather state them than have
them found.**

**`scripts/lint.js` does not cover these assets.** It walks `src/` only. The brand assets
live in `assets/`, for the reason in ADR-0047: lint reads every file under `src/` as UTF-8
text and fails on a CR byte, so committing binary PNGs there would force the lint to skip
files by extension, weakening a P0.3 guard in order to place a directory. Lint does pass,
and there is no external URL or fetched asset anywhere in the change — but the criterion's
"which means" clause does not hold as a chain of reasoning for these files, and a reviewer
should not accept "lint passed" as the evidence. The evidence is `assertSafeSvg()` failing
the build closed and the 14-mutation negative test proving each rejection fires.

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

**Favicons.** A `data:` URI cannot be a network beacon; the byte ceiling and the
dimension check exist so that a corrupted or swapped file stops the build rather than
shipping. The bytes are the committed PNGs, unmodified, asserted by test.

---

## 6. Test evidence

**New tests: 13**, in `test/brand-assets.test.js`. Suite total 378 → 391, all passing.

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
- **Negative: build fails closed (3 tests).** A temporary project root is built with (a) a
  wordmark carrying `<script>1</script>`, (b) the 48 px artwork copied over the 16 px file,
  (c) a favicon that is not a PNG. Each must exit non-zero with the specific message, and
  the script case additionally asserts **no `build/coldbox.html` is written** — a build that
  fails after emitting an artifact is not failing closed. Observed failures:
  `Brand SVG coldbox-wordmark.svg contains a forbidden construct: <script>`,
  `Favicon favicon-c-lower-16x16.png is 48x48, expected 16x16`,
  `Favicon favicon-c-lower-32x32.png is not a PNG`.
- **Favicons in the artifact (2 tests).** Exactly three icon links, right sizes, right
  order, `data:` scheme; each base64 payload decodes to a PNG whose IHDR matches its
  declared size, whose IDAT inflates, and whose bytes equal the committed file. Plus the
  negative markup assertions for non-`data:` hrefs and sibling-seeking relationships.
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

**Browser evidence (Chromium, from `file://`, against the built artifact).**

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

Wordmark geometry and computed fills: 1280 px → 127.9 × 44.0 px; 320 px → 88.3 × 30.4 px;
`fill` resolves to `rgb(18, 18, 18)` and `rgb(0, 240, 255)` in both themes. Favicon
`new Image()` load from the 32 px `data:` href resolved `32x32`. Request log outside the
document: empty, apart from ADR-0024's reachability monitor.

**What I could not test, and it is not a small gap:**

- **Firefox.** `npm run test:browser` refuses to run without both engines, and the Firefox
  binary could not be downloaded in this environment (`Failed to download Firefox 153.0`,
  network-restricted sandbox). **The P0.3a harness therefore did not run at all in this
  session.** The Chromium evidence above comes from a purpose-written Playwright script
  against the real built artifact from `file://`, not from the project harness. A reviewer
  or CI must run `npm run test:browser` — it is expected to pass, since this change adds no
  behaviour the harness asserts and the harness's `copyBuildInputsInto()` was updated for
  the new build input, but *expected to pass* is not *observed to pass*.
- **Physical mobile.** Untested. See §7.
- **Safari / WebKit.** Untested. SVG `fill` from a CSS custom property and `data:` favicons
  are both long-standing features, but I have not observed them there.

---

## 7. Device matrix

| Platform | Result | Notes |
|---|---|---|
| Windows Chrome | UNTESTED | No Windows host in this session |
| Windows Firefox | UNTESTED | " |
| macOS Safari | UNTESTED | No macOS host |
| macOS Chrome | UNTESTED | " |
| Linux Chromium | **PASS** | Playwright Chromium 1194, `file://`, real built artifact. Wordmark renders in both themes at 1280/720/400/320 px; favicons decode; no external request; masthead height unchanged vs `main` |
| Linux Firefox | UNTESTED | Binary download blocked in this environment; `npm run test:browser` could not run |
| **iOS local-execution target** | UNTESTED | No device. Per [ADR-0010](../adr/0010-ios-local-html-execution.md), nothing here may be inferred from another context |
| Android Chrome (Files) | UNTESTED | No device |
| Tor Browser | UNTESTED | Not available |

**This does not yet meet AGENTS.md §5's "one desktop and one mobile browser from
`file://`" clause.** Desktop is covered; mobile is not.

**[ADR-0043](../adr/0043-scoped-mobile-validation-deferral.md) is not borrowed here.** It
says in its own text that it applies "for P2.7 only" and that "a later item needs its own
explicit scope decision." Marking UI.2 `DEFERRED` under it would be exactly the misuse its
Risks section names. So this row is `UNTESTED`, not `DEFERRED`, and closing it needs either
a physical mobile `file://` result or a maintainer decision recorded as its own ADR. The
roadmap item carries the same note so the gap is not visible only from inside this packet.

For what it is worth in deciding that: this change is warm-realm chrome. It adds no
behaviour, no storage, no message, no CSP change, and no realm-boundary interaction. The
mobile-specific risk is rendering — an SVG `fill` that does not resolve from a custom
property, or a `data:` favicon a mobile browser ignores — and the failure mode of either is
cosmetic, not a security property. That is an argument for a deferral being reasonable; it
is not a deferral, and it is not mine to grant.

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
   `src/assets/`". The cost is that lint does not cover these files, disclosed in §4.
6. **The 64 px favicon and the `.ico` are not committed.** Unused bytes in a budgeted
   artifact. If a reviewer wants `.ico` for legacy Windows shortcut behaviour, that is a
   separate decision.
7. **`scripts/trace-brand-wordmark.js` is not added to `lint.js`'s
   `toolingJavaScriptFiles`.** That list is not exhaustive today — `check-docs.js` is
   absent from it too — and I chose not to edit a security control for a maintenance
   script. It is covered by `npm test` only in the sense that nothing imports it; its
   `--check` mode is the real exercise and is not run in CI.

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
- Add `assets` to `lint.js`'s scan in some binary-aware form. It would make the roadmap's
  "lint passes, which means no external URL" chain actually hold. I judged editing a
  security control to be out of scope for a brand-asset item; a reviewer may disagree, and
  it is the most likely legitimate finding against this PR after the namespace question.

**Known limitations shipping with this change:**

- Regenerating the wordmark requires `potrace` 1.16 specifically; another version may not
  reproduce the committed bytes. The build never traces, so this affects maintenance only.
- `assets/` is a hand-maintained entry in five directory lists plus
  `BUILD_DATE_SOURCE_PATHS`. Pinned by test, but hand-maintained.
- The committed PNG sources add 425 KB to the *repository*. They are not in the artifact.

**Follow-up this creates:**

- The absolute bundle figure in `dependencies.md` needs its CI refresh after merge, per
  that file's own rule. Not filed as a roadmap item; it is a line edit on the next CI run.
- The mobile gap needs a maintainer decision or a device result (§7).

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
| [ROADMAP.md](../ROADMAP.md) | UI.2 → `[~]`, plus the open device-matrix gap |
| [CHANGELOG.md](../../../CHANGELOG.md) | Unreleased entry |

**No help content.** The three-depth requirement applies to user-facing features; a
wordmark is not one, and there is no glossary term or guide whose content changes. §2's
copy rules are untouched because this change adds no copy.

**No fact duplicated.** The bundle figure lives only in `dependencies.md`; design-system §8
and this packet link to it. The trace parameters live in the roadmap item and ADR-0047; the
script names them as constants because it executes them, which is code, not a restatement.
No dated review obligation is created — nothing here describes the outside world.
