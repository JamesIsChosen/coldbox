# Design system

**The visual and interaction contract for every Coldbox surface.**
Authoritative for anything a user can see. Where [SPEC.md §15](SPEC.md) and this document disagree, this document wins; §15 links here.

Rationale for the visual direction is in [ADR-0009](../05-development/adr/0009-comic-visual-language.md). This document is the *what*; the ADR is the *why*.

---

## 1. The idea in one paragraph

Coldbox looks like a comic book: heavy black outlines, flat saturated fills, hard offset drop shadows with no blur, a halftone dot field behind everything, and a display face borrowed from comic lettering. This is not decoration for its own sake. Self-custody tooling is uniformly grim, and grim interfaces get skimmed. A page that is pleasant to read is a page whose warnings get read. The style exists to make people slow down and look.

It has a hard limit, and the limit is the point of §6.

---

## 2. What Coldbox is, in UI copy

Copy is part of the design system because the wrong noun is a design defect. The canonical descriptions live in [what-is-this.md](../00-overview/what-is-this.md) and [README.md](../../README.md); this section is the short form the interface must hold to.

**Coldbox is a toolkit, a wallet registry, and a portfolio manager. It is a companion to hardware wallets.**

| Say | Never say |
|---|---|
| toolkit, toolbox, companion | wallet, our wallet, your Coldbox wallet |
| record, register, track, verify | hold, store your coins, custody |
| the vault (an encrypted file of *records*) | the vault (a thing containing *money*) |
| sealed realm, cold realm | cold storage, cold wallet |
| balances, holdings *(read from chain or entered by hand)* | your funds in Coldbox |

Three claims the interface may make freely, because they are the product:

- Coldbox **holds no keys and signs nothing.** No transaction building, signing, or broadcasting — ever. This is a permanent non-goal ([ADR-0006](../05-development/adr/0006-companion-not-replacement.md)).
- Coldbox **cannot spend your money**, which means an attacker who compromises it cannot directly spend it either.
- Coldbox **is not audited.** The interface says so permanently and does not bury it.

"Wallet" is correct in exactly three compounds: **hardware wallet**, **wallet registry**, and **wallet record**. Anywhere else it is a bug.

Tone: plainly spoken, specific, never breathless. The visual language is loud; the words are not. A sentence that would embarrass you in a security review does not ship because the panel around it is yellow.

---

## 3. Tokens

All defined in `src/styles.css` on `:root` (dark) and `html[data-theme="light"]`. Never hard-code a hex value in a rule — add a token.

### Surfaces

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#1a1a24` | `#ece2cf` | Page field, carries the halftone dots |
| `--bg-dot` | `#2d2d3f` | `#d8c9ad` | The dots themselves |
| `--surface` | `#232331` | `#fffdf5` | Standard panel |
| `--surface-raised` | `#2b2b3d` | `#ffffff` | Emphasised panel |
| `--surface-soft` | `#1e1e2b` | `#fff6dc` | Recessed chips, hover states |

The August 2026 design handoff proposed a light map differing from the shipped values at three tokens — `--bg` `#efece2`, `--bg-dot` `#d8d2c2`, `--surface-soft` `#ffffff`. **The shipped values above win**, and the handoff's map is superseded on those three. They are warmer, they are already measured against §9, and nothing in the handoff argued for the cooler set beyond it being written down first. Recorded here so it is not re-proposed. The handoff's remaining light-mode advice was already satisfied: `--success` light is `#0f6b45` and the reveal border stays `--fill-red` `#e02020`.

### Ink

The outline and its shadow are separate tokens because they diverge by theme. On light, the outline is black and the shadow is black. On dark, a black outline would disappear into the panel, so the outline inverts to bone while the shadow stays black.

| Token | Dark | Light |
|---|---|---|
| `--outline` | `#f4f0e2` | `#121212` |
| `--drop` | `#000000` | `#121212` |
| `--outline-width` | `0.19rem` | same |
| `--outline-width-thin` | `0.13rem` | same |

Widths are in `rem`, not `px`, so outlines scale with the user's font size instead of getting hairline-thin at large text settings.

### Type colours

| Token | Dark | Light |
|---|---|---|
| `--text` | `#fffdf5` | `#121212` |
| `--muted` / `--faint` | `#b3bcd4` | `#5c5344` |
| `--accent` | `#00f0ff` | `#0a6a75` |
| `--success` | `#5ef2a0` | `#0f6b45` |
| `--warning` | `#ffde59` | `#8a6100` |
| `--danger` | `#ff6b6b` | `#c01f1f` |

`--accent`, `--success`, `--warning` and `--danger` are **text** colours and differ per theme because a colour legible on `#1a1a24` is not legible on `#ffffff`. Do not use them as fills.

### Fills

Flat, saturated, identical in both themes, always outlined, always carrying `--fill-ink` (`#121212`) text.

| Token | Value | Means |
|---|---|---|
| `--fill-yellow` | `#ffde59` | Caption boxes, primary buttons, attention |
| `--fill-cyan` | `#00f0ff` | Current selection, active nav, identity |
| `--fill-pink` | `#ff007a` | Focus rings, accent marks |
| `--fill-red` | `#e02020` | Failure, lockdown (white text — the one exception) |
| `--fill-green` | `#4ade80` | Verified, no external reachability detected, available |
| `--fill-disabled` | `#8e8e9c` | Disabled controls; use the surface's dark ink token |

### Paper

Comic-card stock, identical in both themes, with its own ink because a white panel needs dark text regardless of what the shell around it is doing.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#fffdf5` | Card stock |
| `--paper-cool` | `#e8f9ff` | Cool variant |
| `--paper-warm` | `#fff2f7` | Warm variant |
| `--paper-ink` | `#121212` | Text on paper |
| `--paper-muted` | `#5c5344` | Secondary text on paper (≥ 6.9:1 on all three stocks) |
| `--paper-rule` | `#b9b0a0` | Dashed row rules |
| `--paper-yes` / `--paper-no` | `#0f6b45` / `#b3261e` | Affirmative / negative values |

**`--fill-pink` with white text is 3.80:1 and fails.** Pink carries black text or it is not used for text at all. `--fill-red` is dark enough for white (5.08:1) and light text on it is correct.

### Shadow and radius

| Token | Value |
|---|---|
| `--shadow-hard` | `0.25rem 0.25rem 0 var(--drop)` |
| `--shadow-hard-lg` | `0.45rem 0.45rem 0 var(--drop)` |
| `--radius` | `0.55rem` |
| `--radius-sm` | `0.35rem` |

**Shadows never blur.** A blurred shadow is a different design language; offset-and-solid is this one. Corner radii stay small — comic panels are rectangles.

---

## 4. Typography

Two vendored faces, both SIL Open Font License 1.1, both inlined as base64 `data:` URIs at build time from pinned npm tarballs. Nothing is fetched at build or run time; see §8.

| Token | Face | Fallbacks |
|---|---|---|
| `--font-display` | Bangers → `'Coldbox Display'` | Impact, Haettenschweiler, Arial Narrow Bold |
| `--font-text` | Comic Neue 400/700 → `'Coldbox Text'` | Comic Sans MS, ui-sans-serif, system-ui |
| `--font-mono` | *(none vendored)* | ui-monospace, Cascadia Mono, SF Mono, Menlo, Consolas |

Body copy is **weight 700 by default.** Comic Neue at 400 is too light against a dotted field; 700 is the normal reading weight here, and 400 is not used.

### The display face never carries data

This is a hard rule, not a preference. Bangers has no lowercase, ambiguous digit forms, and tight letterspacing. It is for headings, captions, buttons, badges, and nav labels.

**Never set in the display face:** seed words, addresses, extended public keys, fingerprints, hashes, derivation paths, amounts, dates, checksums, or any value a user might transcribe or compare character by character.

Those use `--font-mono`, at 400+ weight, with generous letterspacing. A user copying 24 words onto a steel plate is the reason this rule exists.

### Scale

| Role | Face | Size |
|---|---|---|
| `h1` (page title) | display | `clamp(2.6rem, 6vw, 5rem)`, outlined via `text-shadow` |
| Panel `h2` | display | `clamp(1.6rem, 2.8vw, 2.4rem)` |
| Security panel `h2` | display | `clamp(1.15rem, 2.4vw, 1.85rem)` |
| `h3` / row title | display | `1.05rem` |
| Caption box | display | `0.9rem`, uppercase, `0.09em` tracking |
| Lede | text 700 | `clamp(1rem, 1.5vw, 1.15rem)` |
| Body | text 700 | `0.86rem`–`0.92rem` |
| Meta / detail | text 700 | `0.72rem`–`0.78rem` |

The `h1` outline is a four-way `text-shadow`, not a `-webkit-text-stroke`, because stroke support is inconsistent and thins unpredictably at small sizes.

---

## 5. Components

### App bar — `.app-bar`

The yellow masthead, sticky at the top of every route and present at every width. Left to right: the cyan `.brand-name` wordmark knocked out with a five-layer black `text-shadow` and rotated −2°, the pink `.brand-badge` rotated +3°, then `.app-bar-actions`.

Its height is `--app-bar-height`, which is also what the nav rail's `top` and `height` are computed from — one token, so the two cannot drift apart and leave a gap or a clipped rail.

Chrome, not a security surface: the tilts and the button press are fine here because nothing on the bar reports boundary state. The network/sealed-realm status surface does that, one screen down, and stays still.

**The badge says what is true.** The mockup's read `AIR-GAPPED VAULT v2.0` — the wrong noun and a version that does not exist. It now reads `Pre-release · Not audited`, which is what the README leads with and what §2 requires.

**Nothing in the bar may be a control that does not work.** The mockup had a red `LOCK ALL`; there is no lock to engage until P0.13, so it is not there. A prominent red button that does nothing is worse than an absent one, and worst of all on a tool whose entire pitch is that its claims are verifiable. Quick links point at real routes and are hidden below `720px`, where the tab bar and More menu already reach everything.

### Button — `.comic-btn`

Cyan fill, full outline, hard shadow, display type, uppercase. Hover lifts toward the light and deepens the shadow to `0.4rem`; active presses *into* it — `translate(0.17rem, 0.17rem)` while the shadow shrinks to `0.08rem`, the same distance in the opposite direction, so the button appears to touch the page. `[aria-current="page"]` fills pink.

`.icon-button` is the small yellow variant used inside menus.

### Caption box — `.eyebrow`, `.panel-kicker`

The comic narration strip. Yellow fill, thin outline, small hard shadow, uppercase display type. Marks what a panel *is*. One per panel, at the top.

### Comic panel — `.info-card`, `.hero-panel`, `.empty-panel`

Full outline, `--shadow-hard-lg`, square-ish corners. Editorial panels may lift and tilt on hover (`translate(-0.15rem, -0.15rem) rotate(-0.6deg)`). Security panels may not — see §6.

### Badge and chip — `.mode-badge`, `.card-icon`, `.nav-group-title`

Outlined rectangle, small hard shadow, fill from the palette, black text.

### Status dot — `.status-dot`

Outlined circle, filled from the palette. **Never the only carrier of state.** Every status surface pairs the dot with a text label and a structural cue (an inset colour bar). Three channels, so colour vision is never load-bearing.

### Speech bubble — `.speech-bubble`

White fill, outlined, tail built from two stacked CSS triangles: the outline triangle sits behind and slightly larger than the fill triangle, offset so the two read as one shape. Reserved for **explanatory voice** — plain-language help, Learn content, guidance. Never for status, never for a value.

### Sound-effect sticker — `.sound-effect`

Red fill, yellow display type, rotated ~9°, overlapping the panel corner. Yellow on red is 3.60:1, so it is held above `1.3rem` to qualify as large text under the 3:1 floor and is always `aria-hidden` — **the claim it decorates must also appear as ordinary body text in the same panel.** A sticker never carries information that exists nowhere else.

Barred entirely from security surfaces (§6). One per screen at most; two stickers is a carnival.

### Realm strip — `.realm-strip`

The diagonally striped band under the app bar that names which realm you are in. Because both realms now share one shell, something has to state the boundary without shouting, and this is the only element that changes unmistakably at it.

Fixed here so it cannot drift into decoration:

| Property | Value |
|---|---|
| Stripe angle | `45°` |
| Band width | `14px` |
| Warm palette | `--fill-cyan` on `--fill-ink` |
| Cold palette | `--fill-pink` on `--fill-ink` |
| Realm name | Solid pill, `--fill-ink` text, full outline |

It is chrome and never renders a secret, so §6 clause 1 does not reach it — but it reports boundary state, so clause 2 does. **The stripes never move**, and the strip is listed under Permanently calm in §6. A barber-pole animation here would be the single most tempting and least defensible motion in the app.

### The stage — `.stage`

The dashboard's 3D panel arrangement: three comic-paper cards in perspective, the centre one pushed forward on the Z axis and the outer two rotated ±24° inward. The scene tilts up to ±7° following the pointer, and the cards drift vertically as the stage crosses the fold.

Rules that keep it on the permissive side of §6:

- **It renders no live data.** Every value on it is a roadmap phase or a fixed Yes/No about what Coldbox does. If real balances ever appear here, the stage becomes a security surface and the tilt goes.
- **It exposes no controls.** No buttons, no inputs — nothing that can be mis-clicked because a card was rotating. The mock this came from had a `SIGN TRANSACTION` button on a tilting card, which is a good illustration of why not.
- **Motion is driven by two CSS custom properties** (`--stage-tilt-x`/`--stage-tilt-y` and `--stage-depth`) set by `startStageMotion()` in `main.js`. The JS never writes `transform` directly, so the arrangement stays entirely in CSS and the media query below `62rem` can drop 3D without fighting inline styles.
- **Below `62rem` there is no 3D at all** — the same cards stack in normal flow. A 320 px phone has no room to rotate a 21 rem panel.
- `prefers-reduced-motion: reduce` means `startStageMotion()` returns before attaching any listener, and the cards sit at their resting transform.

Cards use the paper tokens, not the shell surface tokens, and carry `--paper-ink` text in both themes.

---

## 6. The calm rule

> **A calm panel gets the comic shell and none of the comic behaviour.**

The rule attaches to the **panel**, not to the realm. Rationale and the alternatives considered are in [ADR-0044](../05-development/adr/0044-panel-scoped-calm-rule.md).

A panel is calm when either clause holds:

1. It **renders, accepts, or is immediately adjacent to secret material.**
2. It **reports the live state of a security boundary**, or is immediately adjacent to a panel that does.

Adjacency binds both clauses. A lively panel may not sit immediately beside one that is reporting boundary state, for the same reason it may not sit beside a revealed seed word: it undercuts its neighbour.

Everything else is chrome and carries the full comic language, in both realms: hubs, navigation, page furniture, empty states, share decks, explanatory bubbles, the app bar, the dashboard stage.

The distinction that does the work is *reporting state* versus *explaining the design*. The network/sealed-realm status surface reports: it tells you, right now, both the warm-shell reachability classification and whether the cold guard is healthy. The dashboard stage explains: it describes how the two realms are arranged and renders nothing that can change. Explaining may be lively. Reporting may not — because the moment a reporting surface fails, any whimsy on it reads as the interface not taking the failure seriously.

**Where the clauses are ambiguous, the tiebreaker is: whimsy is permitted only where nothing is being asserted about security and nothing secret is rendered. If in doubt, the panel is calm.**

### Permanently calm

These report boundary state, so they stay calm whether or not a secret is on screen. A tilting panel that reports `connect-src 'none'` undermines the claim it is making.

- `.realm-status` — sealed realm bootstrap
- `.airgap-banner` — airgap guard
- `.capability-panel` and every `.capability-row`
- `.realm-status-failure`, `.protocol-warning`
- `.realm-strip` — the boundary strip (§5); its stripes never move
- The vault unlock screen, and the panic screen

### Calm while a secret is present

Any panel that renders, accepts or sits immediately beside secret material, wherever it lives. In practice that is most of Entropy Lab, Seed Forge, Derivation, Split lab, QR Studio, Recovery and Verify Bench — but it is the panel that qualifies, not the screen and not the directory.

**Calm arrives on the same frame the plaintext does.** It is a state, not a transition. A panel about to reveal a secret straightens, drops any sticker and takes the red reveal border *before* the plaintext paints. A panel still rotating when a seed word appears has failed this rule even if it settles 200 ms later.

### On any calm panel

| Allowed | Forbidden |
|---|---|
| Outline, hard shadow, flat fill | Rotation or tilt, at rest or on hover |
| Display face in headings | Any animation, pulse, bounce, or shake |
| Caption boxes | Sound-effect stickers — no KABOOM, no POW, no ZAP |
| Inset colour bar for state | Speech bubbles |
| | Hover lift or transform |

The reasoning is worth stating plainly, because it is the one rule most likely to be argued with: a rotating sticker reading *KABOOM! SAFE!* is funny right up until the airgap check fails, at which point the interface is making a joke at the exact moment the user needs to believe it. The style earns its place by knowing when to stop.

A panel that is lively today because it renders no value does not stay lively by default. If it acquires one, re-check it against this section — §10 step 1 says so, and `.stage` in §5 is the worked example.

### Motion

On lively panels, transitions are ≤ 420 ms and limited to transform, box-shadow, background-color, border-color, and color. Looping animation is permitted only as a navigational affordance — currently one instance, the scroll cue under the stage — and never as decoration or emphasis.

On calm panels there is no animation and no transition that moves anything: state changes swap colour and text, and that is all.

`prefers-reduced-motion: reduce` collapses every duration to `0.01ms`, removes every hover transform, stops the scroll cue, and causes `startStageMotion()` to return before attaching a listener. Reduced motion must be honoured in JS as well as CSS — a listener that keeps firing is still a battery cost even when the transform is suppressed.

---

## 7. The sealed realm

`src/cold/styles.css` matches the ink-and-fill language but **does not carry the vendored display face**, and uses the system stack instead.

Two reasons:

1. Every byte of that document sits inside the security boundary and is hash-pinned into the parent's `script-src`/`style-src`. Smaller is more reviewable, and 83 KB of base64 font is not worth reviewing twice.
2. The display face is barred from data regardless (§4), so on the panels that render values it would buy nothing.

Under [ADR-0044](../05-development/adr/0044-panel-scoped-calm-rule.md) the sealed realm is **no longer calm throughout** — its hub, navigation and empty states are chrome and may carry the full language. The face still stays out, on reason 1 alone. The consequence is deliberate and worth stating: the sealed hub uses the system stack and reads plainer than the warm shell. Revisit only if a cold screen turns out to need heading hierarchy that the system stack cannot carry.

The realm stays dark under both parent themes. It is a separate document with a separate policy, and looking separate is accurate rather than a defect. Revisit if a Phase 1+ cold-realm screen turns out to need substantial heading hierarchy.

---

## 8. Fonts and the build

Fonts are treated exactly like cryptographic dependencies, because the constraints are identical: no runtime fetch, reproducible output, verifiable provenance.

1. `@fontsource/bangers@5.3.0` and `@fontsource/comic-neue@5.3.0` are committed under `vendor/npm/@fontsource/` as npm tarballs.
2. Both are listed in [`vendor/vendor-manifest.json`](../../vendor/vendor-manifest.json) with upstream URL, byte size, SHA-256, and npm integrity, and both are in `requiredPackages` in `scripts/verify-vendor.js`. A corrupted or unmanifested font tarball fails the build, same as a corrupted `@noble` tarball.
3. `scripts/font-bundle.js` reads the latin-subset WOFF2 from the pinned tarball, asserts the `wOF2` signature and a size ceiling, and emits `@font-face` rules with base64 `data:` URIs.
4. `scripts/build.js` injects that block at `__COLDBOX_FONT_FACES__` in `src/styles.css`.

**Google Fonts, or any CDN, is not an option and never will be.** It fails three separate rules simultaneously: `scripts/lint.js` rejects external URLs, the CSP is `font-src data:` only, and [AGENTS.md](../../AGENTS.md) forbids fetching anything at build or run time.

Cost: three faces, ~83 KB base64 in `build/coldbox.html`. Inside the budget recorded in [dependencies.md](../05-development/dependencies.md#bundle-budget), which is the canonical home for the figure.

To add a face: vendor the tarball, add it to the manifest and `requiredPackages`, add an entry to `FONT_FACES` in `scripts/font-bundle.js`, record the licence in [dependencies.md](../05-development/dependencies.md). Do not add a face without a use that the existing two cannot serve.

---

## 9. Accessibility floors

Non-negotiable, and partly enforced by `test/accessibility.test.js`.

| Requirement | Floor |
|---|---|
| `--faint` against `--bg`, `--surface`, `--surface-raised`, both themes | ≥ 4.5:1 — **enforced by test** |
| Body and meta text against its surface | ≥ 4.5:1 |
| Display headings ≥ 24px against their surface | ≥ 3:1 |
| Text on any fill | ≥ 4.5:1 with `--fill-ink` |
| Focus indicator | `0.2rem` solid `--fill-pink`, `0.18rem` offset, visible on every focusable element |
| Touch target | ≥ 44 × 44 CSS px on mobile |

Current measured values, for reference when changing a token:

| | dark `--bg` | dark `--surface` | dark `--raised` | light `--bg` | light `--surface` | light `--raised` |
|---|---|---|---|---|---|---|
| `--faint` | 9.09 | 8.16 | 7.30 | 5.89 | 7.43 | 7.57 |
| `--text` | 16.94 | 15.20 | 13.61 | 14.58 | 18.40 | 18.73 |
| `--accent` | 12.25 | 10.99 | 9.84 | 4.91 | 6.19 | 6.30 |
| `--danger` | 6.22 | 5.58 | 4.99 | 4.73 | 5.96 | 6.07 |

On paper: `--paper-ink` ≥ 17.2 · `--paper-muted` ≥ 6.95 · `--paper-yes` / `--paper-no` ≥ 6.01, across all three stocks.

`--fill-ink` on fills: yellow 14.13 · cyan 13.30 · green 10.75 · pink 4.94. White on red 5.08. White on pink **3.80 — fails, never use.** Sticker yellow on red **3.60 — large text only**, and always with an `aria-hidden` attribute plus the same claim in body text.

Also required, and not testable by contrast alone:

- Never colour alone. Status = dot + label + structure.
- `user-scalable=no` is forbidden. Pinch-zoom is how people check a transcribed seed word.
- The halftone field is a background-image on `body`; it must never reduce text contrast, which is why the dot colours sit close to `--bg`.
- Full keyboard navigation with a visible focus ring on every interactive element.

---

## 10. Adding a surface

1. Decide whether it is a calm panel under §6. If in doubt, it is. Re-check this whenever the panel starts rendering a value it did not render before.
2. Use existing tokens. If a value is missing, add a token — do not inline a hex.
3. Caption box at the top, outline and hard shadow on the panel.
4. Headings in the display face; every value, address, or word in mono.
5. Check contrast against §9 in both themes before opening a PR.
6. If it renders a secret, re-read §6 and [SPEC.md §15](SPEC.md) secret display rules — masked by default, 30 s auto-remask, red border while visible.

---

## References

- [ADR-0009](../05-development/adr/0009-comic-visual-language.md) — why this direction
- [SPEC.md §15](SPEC.md) — UI and interaction, secret display rules
- [csp-policy.md](../02-security/csp-policy.md) — why `font-src data:`
- [dependencies.md](../05-development/dependencies.md) — vendored font provenance
- [what-is-this.md](../00-overview/what-is-this.md) — the product description UI copy must match
