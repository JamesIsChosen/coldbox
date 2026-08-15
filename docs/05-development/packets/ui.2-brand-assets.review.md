# Review: UI.2 — Brand assets — wordmark and favicons

**VERDICT: FAIL**

Findings: 4 (3 blocking, 1 advisory — all must be addressed)
Reviewed commit: `069a263e6cbf7d8e7dd6c755d3ab11cfd417d3a5`
Reviewed base: `main@be11564790c6393a26ccb9764d06c8cdafe2383f`
Reviewed by: GPT-5.6 Sol independent reviewer session
Date: 2026-08-15

## 1. What I verified

I reviewed the exact PR head rather than relying on the author packet's conclusions. PR #56 was open, non-draft, unmerged, and mergeable at the reviewed SHA. The branch was 7 commits ahead and 0 behind merged P0.22 `main`.

### P0.22 reconciliation

`scripts/build.js` retains P0.22's canonical `%ct %ci` Git timestamp input and adds `assets` to build-input provenance. `scripts/run-browser-harness.js` copies `assets/` into temporary build roots, and the reconciled P0.22 scratch-build test also copies `assets/`.

### Exact-head CI and artifact

CI #212 completed successfully at exact head `069a263e6cbf7d8e7dd6c755d3ab11cfd417d3a5`:

- Ubuntu build: success
- Windows build: success
- Browser harness, Chromium + Firefox: success
- Cross-OS build-hash comparison: success
- `npm test`: 399/399 passed
- `npm run check-docs`: 223 markdown files, 0 warnings
- `npm run lint`: passed
- `npm run verify-vendor`: passed against upstream releases

I downloaded the exact-head Ubuntu Actions artifact and independently measured:

```text
sha256 = 39f190b5e9f7b754a650e154329549a451c1f0e8ff7beb33817198132c26dcc1
bytes  = 2622481
```

The merged P0.22 baseline is:

```text
sha256 = da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562
bytes  = 2597939
```

Therefore the exact UI.2 delta is:

```text
2622481 - 2597939 = 24542 bytes
```

### Built brand assets

I independently parsed the downloaded built artifact. It contains exactly three favicon `data:image/png;base64,...` links. Independent PNG decoding produced:

```text
16x16 declared -> PNG, decoded 16x16, 629 bytes
32x32 declared -> PNG, decoded 32x32, 1712 bytes
48x48 declared -> PNG, decoded 48x48, 3334 bytes
```

No non-`data:` favicon sibling reference is present in the built HTML.

The embedded wordmark is present with `role="img"`, `aria-label="Coldbox"`, `fill="var(--fill-ink)"`, and `fill="var(--fill-cyan)"`. Direct inspection found none of `<script>`, `<foreignObject>`, `href` / `xlink:href`, `url()`, inline event handlers, or other external references in the shipped wordmark. The `Pre-release · Not audited` badge remains present.

### Negative/fail-closed inspection

The SVG validator rejects the relevant active/reference constructs. The favicon validator does not provide an equivalent fail-closed guarantee. I independently constructed a 24-byte input containing only a PNG signature, an `IHDR` marker, and 16x16 width/height. The current dimension checks accept those fields even though the bytes contain no `IDAT`, no `IEND`, and are not a decodable PNG:

```json
{
  "bytes": 24,
  "acceptedByCurrentChecks": true,
  "width": 16,
  "height": 16,
  "hasIDAT": false,
  "hasIEND": false
}
```

`potrace` was not available in the reviewer execution environment. It is maintenance-only and not a UI.2 acceptance criterion, so that is not treated as a shipped-runtime finding.

## 2. What I could not verify

The committed browser harness does not execute the literal UI.2 320px acceptance. Its general responsive path uses 360x640. This is addressed as F3 below.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Inline SVG uses `--fill-cyan` and `--fill-ink`, not literal hex | ✅ | Exact SVG and built artifact contain the two token fills. |
| 2 | Wordmark is legible at app-bar height and 320px viewport width | ❌ | Exact committed browser harness tests 360px, not 320px. See F3. |
| 3 | Accessible name `Coldbox` | ✅ | `role="img"` + `aria-label="Coldbox"`. |
| 4 | Favicons are embedded `data:` URIs at 16/32/48 and resolve offline from `file://` with no sibling file | ❌ | Current artifact is correct, but the committed browser harness does not independently execute the literal UI.2 favicon decode/no-sibling assertion. See F3. |
| 5 | `scripts/lint.js` passes, which means no external URL and no fetched asset | ❌ | Lint passes, but does not scan `assets/brand/`; the implementation substitutes a different validator. See F4. |
| 6 | Build reproducible across two runs | ✅ | Exact-head CI double builds and cross-OS comparison passed; artifact hash reproduced. |
| 7 | Size delta recorded against dependencies bundle budget | ✅ | +24,542 bytes independently reproduced. |
| 8 | Design-system §5 describes logo instead of old text-shadow wordmark | ✅ | Diff updates the app-bar specification. |
| 9 | `Pre-release · Not audited` badge and §2 copy rules untouched | ✅ | Badge remains; no relevant copy regression found. |
| 10 | SVG contains no script, foreignObject, href/xlink, or external references | ✅ | Exact SVG and built SVG inspected; validator covers the active/reference constructs. |

## 4. Findings

### F1 — Repository governance still reinstates the superseded physical-mobile gate for UI.2

**Severity:** advisory  
**Location:** `docs/05-development/ROADMAP.md` — UI.2 `Open gap`; `AGENTS.md` §5 Definition of done  
**Observed:** The UI.2 item still carries an author `Open gap` saying closure requires a physical mobile result or a new maintainer deferral. `AGENTS.md` §5 also broadly requires one desktop and one mobile browser or an item-scoped ADR-0043 deferral. The corrected UI.2 scope says physical mobile testing is not a UI.2 acceptance criterion; the 320px and `file://` behavior are browser-verifiable. Leaving the obsolete text in canonical governance reintroduces a superseded gate.  
**Expected:** Repository governance must not contradict the authoritative UI.2 acceptance scope or move real-device coverage into UI.2.  
**Required action:** Remove the stale UI.2 `Open gap` and reconcile the broad AGENTS §5 mobile clause so browser-verifiable items such as UI.2 are not forced through physical-device testing/ADR-0043. Preserve the separate real-device gate where it belongs. Run `check-docs` afterward.

### F2 — Favicon validation accepts a structurally invalid/truncated PNG

**Severity:** blocking  
**Location:** `scripts/brand-assets.js` — `readPngDimensions()` / `createFaviconLinks()`; favicon negative tests  
**Observed:** `readPngDimensions()` checks only the PNG signature, `IHDR` marker, and width/height. It does not validate required PNG structure/decodability. A 24-byte buffer containing those fields passes the current validator despite having no `IDAT`, no `IEND`, and being undecodable.  
**Expected:** Malformed favicon content must make the validator/build exit non-zero rather than pass unsafe or unusable content.  
**Required action:** Validate complete PNG structure/decodability before embedding, and add a regression that truncates or corrupts an otherwise correctly signed/dimensioned favicon while preserving the existing header fields; require `npm run build` to exit non-zero.

### F3 — The committed Chromium/Firefox harness does not execute UI.2's exact 320px / favicon `file://` acceptance

**Severity:** blocking  
**Location:** `scripts/run-browser-harness.js` responsive section  
**Observed:** The exact-head browser harness exercises desktop at 1440x900 and mobile at 360x640. There is no exact 320px UI.2 assertion. There is also no UI.2-specific browser assertion that all three favicon `data:` payloads decode at 16/32/48 from `file://` while no sibling icon/manifest request is emitted. CI #212 passing both browsers therefore does not independently establish those literal criteria.  
**Expected:** The 320px and offline `file://` criteria must be independently browser-verifiable in both Chromium and Firefox.  
**Required action:** Add a UI.2 browser-harness path in both engines at exact 320px that verifies wordmark visibility/non-clipping/accessibility/theme fills and decodes all three favicon data URIs while asserting no sibling icon/manifest request. Keep the existing 360px general responsive test separately.

### F4 — The implementation explicitly substitutes `assertSafeSvg()` for the ROADMAP's lint enforcement criterion

**Severity:** blocking  
**Location:** UI.2 ROADMAP criterion; `scripts/lint.js`; ADR-0047  
**Observed:** The literal criterion says: **"`scripts/lint.js` passes, which means no external URL and no fetched asset"**. `scripts/lint.js` does not scan `assets/brand/`. ADR-0047 and the packet explicitly acknowledge that lint passing says nothing about these assets and substitute `assertSafeSvg()` instead. The substitute validator is useful, but the review protocol says acceptance criteria are checked verbatim and may not be reinterpreted to fit the implementation.  
**Expected:** Either the literal lint criterion is satisfied by lint enforcement, or the acceptance criterion is formally changed before the implementation claims it is met.  
**Required action:** Preferably extend `scripts/lint.js` in a binary-safe way so it validates the textual brand SVG / brand-asset references for the external/fetched-asset condition, with a negative lint test. If the maintainer intends `assertSafeSvg()` to replace lint as the canonical enforcement layer, formally update the ROADMAP criterion before requesting re-review.

## 5. Verdict rationale

**FAIL.** The P0.22 reconciliation, exact artifact, reproducibility, current SVG safety, current favicon bytes, and CI #212 all reproduce. Under the repository's zero-finding protocol that is not sufficient to pass while F1–F4 remain. A fresh review can PASS only after every finding is fixed or explicitly dismissed with accepted reasoning and every criterion is independently re-verified on the new product commit.

FAIL
