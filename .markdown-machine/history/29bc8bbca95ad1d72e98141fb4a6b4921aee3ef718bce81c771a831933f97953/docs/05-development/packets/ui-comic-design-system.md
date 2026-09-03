# PR packet — Comic visual language, 3D dashboard stage, and app bar

**Branch:** `ui/comic-design-system`
**Commit:** `e88f135`
**Roadmap item:** none — see §2.

---

## 1. Summary

Adopts a comic-book visual language across the warm shell, taken from a design mockup supplied by the repository owner, and records the resulting contract in [docs/01-spec/design-system.md](../../01-spec/design-system.md) with rationale in [ADR-0009](../adr/0009-comic-visual-language.md). Adds the mockup's yellow app bar and its 3D floating-card stage, rebuilt to describe the two-realm architecture rather than the mockup's fabricated balances. Vendors two display typefaces through the existing pinned-tarball supply chain and inlines them as `data:` URIs, because no CDN is permissible here.

## 2. Scope

**This PR completes no roadmap item.** It is owner-directed UI work explicitly requested outside the roadmap. `ROADMAP.md` is deliberately **not** modified: it is the source of truth for what to build next, and inventing a completed entry for work that was never planned would pollute it. A reviewer who expects a roadmap delta should expect its absence here.

**In scope**

- `src/styles.css` — full retokenisation, both themes, plus new components
- `src/index.html` — app bar, 3D stage markup, corrected dashboard copy
- `src/main.js` — `startStageMotion()`, ~80 lines, presentational only
- `src/cold/styles.css` — same ink language, system font stack, no display face
- `scripts/font-bundle.js` — new; extracts and base64-encodes vendored WOFF2
- `scripts/build.js` — one new injection token, `__COLDBOX_FONT_FACES__`
- `scripts/verify-vendor.js` — two names added to `requiredPackages`
- `vendor/` — two `@fontsource` tarballs plus manifest entries
- Docs: design system, ADR-0010, ADR index, SPEC §15 amendment, dependencies, docs README, CHANGELOG

**Deliberately out of scope**

- **The mockup's `LOCK ALL` button.** There is no lock to engage until P0.13. A prominent red control that does nothing is worse than no control, and worst of all in a tool whose entire pitch is that its claims are checkable.
- **The mockup's card content** — `14.28 BTC`, `SIGN TRANSACTION`, `COLDBOX MASTER`, `AIR-GAPPED VAULT v2.0`. All of it either fabricates data or contradicts [ADR-0006](../adr/0006-companion-not-replacement.md).
- **Speech-bubble use in Learn/help.** The component exists and is used on the stage; the help framework that will consume it properly is a later item.
- **The sealed realm's typography.** It stays on the system stack; reasoning in design-system.md §7.

**Touched outside the strict remit, and why**

- `scripts/lint.js` gained two lines adding `crypto-bundle.js` and `font-bundle.js` to `toolingJavaScriptFiles`. `font-bundle.js` is mine and needed covering; `crypto-bundle.js` was a **pre-existing gap** — it has never been syntax-checked by the lint despite being build-critical. Flagging rather than silently leaving it.
- The theme toggle moved from `.content-bar` to the app bar. Its `id` is unchanged, so `main.js` binds exactly as before.
- `docs/05-development/packets/p0.11-vault-format.review.md` was already modified in the working tree when I started. It is **not** in this commit.

## 3. How to verify

```
$ npm run build
Local vendor verified: @fontsource/bangers@5.3.0
Local vendor verified: @fontsource/comic-neue@5.3.0
Local vendor verified: @noble/ciphers@2.2.0
... (7 more)
Vendor verification passed in offline mode.
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.
Built build/coldbox.html (49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737)

$ cat build/coldbox.html.sha256
49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737  build/coldbox.html

$ rm -rf build && npm run build && cat build/coldbox.html.sha256
49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737  build/coldbox.html

# different path, locale, and timezone
$ cp -r . /tmp/altbuild && cd /tmp/altbuild && rm -rf build \
    && LC_ALL=en_US.UTF-8 TZ=Asia/Tokyo npm run build \
    && sha256sum build/coldbox.html
49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737  build/coldbox.html

$ npm test
# tests 49
# pass 49
# fail 0
```

**Negative tests — both must exit non-zero:**

```
$ printf 'x' >> vendor/npm/@fontsource/bangers/5.3.0/package.tgz && npm run build
Vendor verification failed: Vendor size mismatch for @fontsource/bangers@5.3.0: expected 97875, got 97876
Error: Build refused: vendored artifacts failed offline verification
$ echo $?
1

$ cp vendor/npm/@fontsource/bangers/5.3.0/package.tgz \
     vendor/npm/@fontsource/bangers/5.3.0/stray.tgz && npm run build; echo $?
1
```

**CSP coverage of the font block** — confirms the ~83 KB of base64 is inside the hash-pinned inline style rather than smuggled past it:

```
$ node -e "<script in commit message / reproduce from build/coldbox.html>"
inline style blocks: 1
declared hashes    : 2
font-face inside a hash-pinned block: yes
every block authorized by CSP       : yes
one-byte colour change matches hash : no (correct - browser would refuse)
```

The second declared hash is the cold realm's style block, pinned into the parent per the existing P0.4 contract.

## 4. Acceptance criteria

No roadmap item, so no criteria to copy verbatim. The owner's stated requirements, and how each is met:

| Requirement | How satisfied | Evidence |
|---|---|---|
| Wire the UI into the mockup's look | Full retokenisation of `src/styles.css`; outlines, flat fills, hard offset shadows, halftone field, comic display type | Visual; `build/coldbox.html` |
| Carry over the nav bar | `.app-bar` — cyan knocked-out wordmark, rotated pink badge, comic buttons, sticky, full width | `src/index.html:17` |
| Keep the 3D floating scrolling cards | `.stage` — three cards in perspective, ±24° rotation, centre card on Z, pointer tilt, scroll drift | `src/index.html:181`; `startStageMotion()` in `src/main.js` |
| Produce a spec so future UI follows this | `docs/01-spec/design-system.md`, authoritative, with SPEC §15 amended to point there | Committed |
| Copy must stay true to what Coldbox is | §2 copy contract with say/never-say table; dashboard card states Coldbox holds no keys and signs nothing; badge reads "Pre-release · Not audited" | design-system.md §2 |

## 5. Security impact

| Area | Touched? |
|---|---|
| Realm boundary | No |
| Message schema | No |
| CSP directives | **No new directive or host.** The `@font-face` block is inlined into the existing hash-pinned `<style>`; `font-src data:` was already the policy and is unchanged |
| Vault format | No |
| Derivation | No |
| Randomness | No |
| `connect-src` hosts | None added |
| Message types | None added |

**If this implementation is wrong, what does an attacker gain?**

The realistic answer is bounded but not zero, and the honest framing is that this PR adds one new class of parsed binary input to the artifact.

- **The font pipeline is the real surface.** Two WOFF2 files now sit inside the single HTML file and are handed to the browser's font parser, historically a source of memory-safety bugs. Mitigations: both come from pinned tarballs with upstream SHA-256 and npm integrity recorded in the manifest; the build refuses on mismatch (demonstrated above); `font-bundle.js` asserts the `wOF2` signature and a 512 KB ceiling before encoding. What this does **not** defend against is a malicious upstream release that was already compromised when I fetched it — the hash pins what I got, not that what I got was good. A reviewer should independently re-download both tarballs from npm and compare bytes.
- **No secret path is touched.** The stage renders no live data, the app bar exposes no control that acts on the vault, and `startStageMotion()` reads only viewport geometry and writes only two CSS custom properties.
- **Copy changes are a security property in this project's terms.** If the "not a wallet" framing regressed, a user could form the wrong mental model of what Coldbox can do for them. The say/never-say table exists so this is reviewable rather than a matter of taste.

**Where I am not certain:** whether `font-display: block` on a `data:` URI can produce a period of invisible text on a slow device. Decode is local and should be immediate, but I have not measured it on real hardware. If it does, the failure is cosmetic (invisible headings briefly), not a security issue.

## 6. Test evidence

**New tests added: none.** This is the weakest part of the packet and is called out in §9. The existing `test/accessibility.test.js` covers the `--faint` contrast floor and continues to pass against the retokenised palette, which is real coverage of the highest-risk part of the change — but no test asserts that the font pipeline produces valid `@font-face` output, that the stage markup is present, or that no inline event handler crept in. Those were verified by hand this once.

**Negative tests performed:**

| Made to fail | How it failed |
|---|---|
| Appended one byte to `@fontsource/bangers` tarball | `Vendor size mismatch … expected 97875, got 97876`; build refused, exit 1 |
| Added unmanifested `stray.tgz` under `vendor/npm/@fontsource/bangers/5.3.0/` | Build refused, exit 1 |
| Changed one colour byte in the hashed style block | Recomputed SHA-256 no longer matches the declared `style-src` hash |

**Contrast verified numerically**, both themes, all four surface tokens, by re-implementing the WCAG relative-luminance formula independently of `accessibility.test.js`:

```
PASS: all text tokens >= 4.5:1 on all four surfaces, both themes
```

Two values sit deliberately below 4.5 and are documented in design-system.md §9: white on `--fill-pink` (3.80) is **never used**; the sticker's yellow on red (3.60) is held above `1.3rem` to qualify as large text under the 3:1 floor, is `aria-hidden`, and the claim it decorates also appears as ordinary body text in the same card.

**Font provenance.** Both packages resolved from `registry.npmjs.org`; the `integrity` values in the manifest are the values npm itself reports for those versions, and the SHA-256 values were computed locally from the committed bytes. Both are SIL Open Font License 1.1 with `LICENSE` present in the tarball.

**Browser harness — run post-merge by the repository owner on Windows, against `a680ca7`.**

The authoring environment could not download Playwright's browser binaries (`cdn.playwright.dev` returned `403 Connection blocked by network allowlist`), so this was outstanding when the branch was written. It has since been run and passed:

```
$ npm run test:browser
Playwright is dev-only; dependency-free build matches byte-for-byte
  (49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737)
...
Chromium: warm shell routes, theme switch, responsive navigation, and cold boundary passed over file://
Chromium: built-artifact byte tampering triggered script-src and prevented execution
Chromium: detected deliberate CSP violation
Chromium: confirmed untampered inline script control
Chromium: reported byte-tampered inline script rejection
Chromium: reusable frame and viewport assertions passed
...
Firefox: warm shell routes, theme switch, responsive navigation, and cold boundary passed over file://
Firefox: built-artifact byte tampering triggered script-src and prevented execution
Firefox: reusable frame and viewport assertions passed
Browser harness passed in Chromium and Firefox.
```

What this establishes for **this** change specifically:

- The retokenised shell **renders over `file://` with no console errors and no CSP violations** in two independent engines. The ~83 KB of base64 `@font-face` inside the hash-pinned inline style does not trip `style-src` — the theoretical CSP-coverage check in §3 is now confirmed by a browser rather than by recomputing a hash.
- Routing, the relocated theme toggle, and responsive navigation all still work after the app bar moved the toggle out of `.content-bar`.
- The realm boundary, lockdown paths, and byte-tamper rejection are unaffected, which is what you would hope from a change that touches no security-relevant code — but is worth having demonstrated rather than assumed.

**Still not covered by the harness:** the harness asserts the shell boots, routes, and stays within policy. It does **not** assert that the 3D stage renders in perspective, that the tilt responds to pointer input, or that the display face loaded rather than falling back. Those remain visually confirmed only, by the owner on Windows Edge.

**Still could not test:** real-hardware rendering. See §7.

## 7. Device matrix

This change touches rendering, so the matrix is required.

| Platform | Result | Notes |
|---|---|---|
| Windows Chromium (headless, harness) | **pass** | Boots, routes, theme switch, responsive nav, no CSP violations over `file://` |
| Windows Firefox (headless, harness) | **pass** | Same assertions |
| Windows Edge (manual) | **pass** | Owner-confirmed: app bar, 3D stage, sticker, display face all render. Note a stale `file://` tab served the pre-redesign document until hard-reloaded — a caching artifact, not a build one |
| macOS Safari | untested | |
| macOS Chrome | untested | |
| Linux Firefox | untested | |
| **iOS Safari (Files)** | untested | Highest remaining risk — `perspective` + `preserve-3d` under a `position: sticky` ancestor is where engines diverge |
| Android Chrome (Files) | untested | |
| Tor Browser | untested | `prefers-reduced-motion` and font fingerprinting resistance both worth checking |

Not inferred from one another. Headless Chromium and Firefox on Windows say nothing about iOS Safari, and the three passes above are all desktop — the stage's 3D path is the part most likely to behave differently on mobile, and no mobile engine has seen it. P0.19 remains the item that closes this out.

## 8. Assumptions made

> **Assumed:** unregistered CSS custom properties substitute cleanly inside `transform` and `calc()` — `rotateX(var(--stage-tilt-x, 0deg))` and `calc(-50% + (var(--stage-depth, 0rem) * 0.55))`.
> **Basis:** CSS Variables Level 1 substitution semantics; the fallbacks mean an engine that fails substitution lands on the resting transform rather than an invalid one.
> **Since confirmed on:** Windows Edge, visually — the stage renders in perspective and tilts, so substitution works there.
> **Still not verified on:** any mobile engine. The harness boots the shell but asserts nothing about the stage's transforms.
> **If wrong:** the stage renders flat and static. Cosmetic.

> **Assumed:** `font-display: block` on a `data:` URI resolves effectively immediately, so no flash of invisible text.
> **Basis:** no network round trip is involved.
> **Not verified on:** low-powered mobile hardware.
> **If wrong:** headings are briefly invisible on first paint. Cosmetic, but user-visible.

> **Assumed:** the dashboard stage is **not** a security surface under the calm rule.
> **Basis:** it reports no live boundary state and exposes no controls. The rule's line is *reporting state* versus *explaining the design*.
> **If wrong:** the tilt and the sticker belong on a surface that should be still. This is the judgement call in the PR most worth disagreeing with, and design-system.md §6 states it explicitly so disagreement has something to bite on.

> **Assumed:** vendoring a font is proportionate rather than over-applied rigour.
> **Basis:** the repo's own rules leave no alternative — lint blocks external URLs, CSP is `font-src data:`, nothing may be fetched at build time.
> **If wrong:** the cost is ~83 KB and a slightly wider supply chain for a purely cosmetic asset.

> **Assumed:** `--fill-ink` (`#121212`) rather than pure black on fills is close enough that measured contrast values hold. Verified numerically; pink drops from 5.53 to 4.94 and still clears 4.5.

## 9. What to scrutinise

**Start here: there are no new automated tests.** A 1,366-line CSS change, a new build-time bundler, and 80 lines of new JS ship with zero new assertions. The pipeline is verified by hand-run negative tests documented above, which is exactly the kind of evidence that rots. If you add one thing to this branch, add a test that `createFontFaceSource()` emits three `@font-face` blocks with `wOF2`-signed payloads, and one that greps the built artifact for inline event handlers.

The browser harness passing (§6) does **not** discharge this. It asserts the shell boots, routes, and stays within CSP — properties this change was trying not to break, and didn't. Nothing in the suite asserts that the stage renders in perspective, that the tilt responds, that the display face loaded rather than silently falling back to Impact, or that the contrast floors hold in a rendered document. A future change could regress every one of those and the harness would stay green.

**Then the calm rule's boundary (§8, third assumption).** I drew the line at *reporting live state* versus *explaining the design*. That line is defensible but it is mine, not the spec's — the spec is now the line, because I wrote it. Someone should check whether it survives contact with Phase 1, when the Vault screen starts showing real state and the temptation to make it lively returns.

**Then `startStageMotion()`.** It attaches `mousemove` and `scroll` listeners on `document`/`window` and never removes them. Harmless today because the shell never tears down, but it will need cleanup if routing ever destroys the dashboard. It also reads `matchMedia` once at boot, so a user who toggles reduced-motion, or resizes across the `62rem` boundary, does not get re-evaluated until reload.

**Then the sealed realm's divergence.** `src/cold/styles.css` deliberately looks different from the shell. I believe that is honest signalling; a reviewer may reasonably read it as an inconsistency bug.

**Then whether the whole direction is right.** A comic-book interface on a seed-phrase tool is a real bet. ADR-0009 argues attention is a security property. That argument could be wrong, and the ADR's "what would change our mind" section is the place to record it if so.

## 10. Self-assessment

**What might be wrong**

- The no-new-tests gap above. It is the thing I would reject in someone else's PR, and the harness passing does not close it — the harness asserts the shell boots and stays within policy, not that any of this change's own behaviour is correct.
- No mobile engine has seen this. `preserve-3d` with `position: sticky` ancestors is a known source of engine divergence, and iOS Safari is where I would expect it to break first. Three desktop passes are weak evidence about a phone.
- Bangers has no lowercase and ambiguous digits. I barred it from data in the spec, but the rule is only as good as the next person reading it — a lint rule would enforce it better than prose.

**What I did not do that arguably should have been done**

- Written a test asserting the display face never appears on a data-bearing element.
- Measured the real-hardware legibility of the display face at small sizes before committing to it.
- Filed roadmap items for the follow-ups below instead of listing them here.

**Known limitations shipping with this**

- ~83 KB permanent weight in a file whose premise is portability.
- Two type systems to maintain.
- The scroll cue's looping animation is the only loop in the product; it is a deliberate exception to what was originally a blanket ban, and the spec now carries the narrower rule.

**Follow-up work created (roadmap items not filed — owner's call)**

1. Tests for the font pipeline and for the absence of inline event handlers.
2. Re-evaluate `matchMedia` on resize / reduced-motion change in `startStageMotion()`.
3. P0.19 device testing should explicitly check display-face legibility at 1× and the stage on iOS Safari.
4. Speech-bubble adoption in the help framework when that lands.

## 11. Bundle impact

Measured by building `9dd6bbc` (the merge-base) in a clean worktree and comparing:

```
$ git worktree add /tmp/oldtree 9dd6bbc && cd /tmp/oldtree && npm run build
$ stat -c%s build/coldbox.html
344415
$ stat -c%s /path/to/coldbox/build/coldbox.html
456208
```

| | Size |
|---|---|
| Before (`9dd6bbc`) | 344,415 bytes (~336 KB) |
| After | 456,208 bytes (~446 KB) |
| Delta | **+111,793 bytes (~109 KB)** |

Roughly 83 KB of that is the three base64 WOFF2 faces. The remaining ~28 KB is CSS, markup, and the stage motion code — the stylesheet is substantially larger than the one it replaced, mostly because every panel now carries explicit outline, shadow, and fill declarations where the previous design leaned on a handful of shared rules.

Budget in [SPEC.md §16](../../01-spec/SPEC.md) is ≈1.7 MB. Not threatened — the artifact is at roughly 26% of budget with Phases 1–5 still to land. If it ever is threatened, design-system.md §8 records the fallback: drop Comic Neue first, keep Bangers.


## 12. Docs updated

| Doc | Change |
|---|---|
| `docs/01-spec/design-system.md` | **New.** Tokens, typography, components, the calm rule, the copy contract, accessibility floors, how to add a surface |
| `docs/05-development/adr/0009-comic-visual-language.md` | **New.** Decision, rationale, five rejected alternatives, what would change our mind |
| `docs/05-development/adr/README.md` | Index entry |
| `docs/01-spec/SPEC.md` | §15 amended to defer to the design system; non-visual rules (secret display, mobile, accessibility, onboarding) explicitly retained |
| `docs/05-development/dependencies.md` | Font provenance table with licences and upstream hashes |
| `docs/README.md` | Index entry |
| `CHANGELOG.md` | Unreleased entry |

**Help content at three depths: not written.** The help framework is a later foundation item and there is no place to put it yet. This is a gap against the packet template's requirement, stated rather than glossed.
