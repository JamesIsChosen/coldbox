# Re-review: UI.2 — Brand assets — wordmark and favicons

**VERDICT: FAIL**

Findings: 1 (0 blocking, 1 advisory — must be addressed)
Reviewed commit: `2adc1e8055236c37f71e70b4c97871cf3725d8f3`
Reviewed base: `main@be11564790c6393a26ccb9764d06c8cdafe2383f`
Reviewed by: GPT-5.6 Sol independent reviewer session
Date: 2026-08-15

## 1. What I verified

- Fresh exact-head CI #213 completed successfully at `2adc1e8055236c37f71e70b4c97871cf3725d8f3`.
- `npm ci`, upstream vendor verification, lint, docs, 402/402 tests, Ubuntu/Windows double builds, and cross-OS hash comparison all passed in CI.
- Chromium and Firefox browser harnesses passed, including the explicit UI.2 exact 320px `file://` wordmark/favicons checks.
- I independently downloaded the exact-head Ubuntu Actions artifact and measured:
  - SHA-256: `ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83`
  - size: `2,622,481` bytes
- The exact artifact contains three embedded PNG favicon data URIs at 16x16, 32x32 and 48x48, and the embedded wordmark retains its accessible name and theme-token fills.
- The prior F1-F4 remediations recheck clean:
  - F1 governance wording now scopes physical-device testing only where the roadmap claims it and explicitly treats browser-verifiable items through the committed harness.
  - F2 favicon validation now parses PNG chunks, checks CRCs, requires complete IHDR/IDAT/IEND structure, inflates image data, and rejects truncation / corrupt CRCs through non-zero build failures.
  - F3 the browser harness now executes UI.2 at an exact 320px viewport in both Chromium and Firefox, checks geometry/accessibility/theme fills, decodes all three data favicons, and asserts no sibling icon/manifest requests.
  - F4 `scripts/lint.js` now performs a binary-safe textual SVG side scan under `assets/brand/`, with a negative external-URL regression.

## 2. What I could not verify

The local container still cannot resolve `github.com`, so I could not perform a separate `git clone` and local `npm ci` checkout in this environment. The exact-head CI, connector source inspection, and independently downloaded build artifact were available and reproduced the relevant UI.2 evidence. This environment limitation is not the finding below.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Inline SVG uses `--fill-cyan` and `--fill-ink`, not literal hex | ✅ | Exact source and built artifact retain the two theme-token fills; validator rejects literal hex. |
| 2 | Wordmark legible at app-bar height and 320px viewport | ✅ | Both CI browser engines report the exact 320px UI.2 check passing; harness checks nonzero geometry and clipping. |
| 3 | Accessible name `Coldbox` | ✅ | `role="img"`, `aria-label="Coldbox"`, `<title>Coldbox</title>`. |
| 4 | 16/32/48 favicons are data URIs and resolve from `file://` with no sibling file | ✅ | Both engines decode the three data favicons and assert no sibling icon/manifest request. Exact artifact independently contains the three embedded PNGs. |
| 5 | `scripts/lint.js` passes, meaning no external URL/fetched brand asset | ✅ | Lint now scans textual brand SVGs; negative external-URL test passes by failing the poisoned fixture. |
| 6 | Build reproducible across two runs | ✅ | CI double builds and cross-OS comparison pass at `ba94ee70…`; independently downloaded artifact matches. |
| 7 | Size delta recorded against `dependencies.md` bundle budget | ❌ | Size/delta remain correct, but canonical UI.2 provenance still names the superseded `39f190…` product hash instead of current `ba94ee70…`. See R2-F1. |
| 8 | Design-system §5 app-bar updated for logo | ✅ | Prior implementation retained; no contrary remediation change found. |
| 9 | `Pre-release · Not audited` badge and §2 copy rules untouched | ✅ | Built artifact retains the badge; remediation does not change product copy. |
| 10 | SVG contains no script/foreignObject/href/xlink/external reference | ✅ | Exact SVG and validator rechecked; forbidden constructs remain rejected. |

## 4. Findings

### R2-F1 — Canonical bundle-budget provenance still names the pre-remediation UI.2 artifact hash

**Severity:** advisory  
**Location:** `docs/05-development/dependencies.md`, Bundle budget → UI.2 delta provenance  
**Observed:** the canonical bundle-budget record still says the reconciled UI.2 product tip built as 2,622,481 bytes with SHA-256 `39f190b5e9f7b754a650e154329549a451c1f0e8ff7beb33817198132c26dcc1`. The remediation changed files under `scripts/`, which are build-date provenance inputs, so the current product artifact hash changed. Exact-head CI #213 and the independently downloaded artifact both produce the same 2,622,481-byte file with SHA-256 `ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83`. The author packet was refreshed to the current hash, but `dependencies.md` was not, leaving current canonical documentation internally inconsistent.  
**Expected:** canonical current documentation must not identify the UI.2 product artifact with a superseded hash unless that older measurement is explicitly labeled historical.  
**Required action:** update the UI.2 delta provenance in `dependencies.md` to the current reviewed product tip/hash, or explicitly label the `39f190…` measurement as historical and add the current `ba94ee70…` provenance. Preserve the measured +24,542-byte delta and the CI-only rule for the separate `Last measured` line. Run `npm run check-docs`, rebuild, and request a fresh review.

## 5. Verdict rationale

**FAIL.** The four previous findings are fixed and the current implementation now satisfies the technical UI.2 browser, lint, SVG, PNG, and reproducibility requirements. However, the roadmap explicitly requires the size delta to be recorded against the canonical bundle-budget documentation, and the review protocol treats stale canonical documentation as a defect. Because that record still identifies the current UI.2 product artifact with the superseded pre-remediation hash, the review cannot close with zero findings. Fix R2-F1, keep UI.2 `[~]`, and request a fresh review.

FAIL
