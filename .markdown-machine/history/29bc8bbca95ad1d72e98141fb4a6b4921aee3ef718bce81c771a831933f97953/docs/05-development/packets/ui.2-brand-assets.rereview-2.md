# Re-review: UI.2 — Brand assets — wordmark and favicons, Round 3

**VERDICT: PASS**

Findings: 0
Reviewed PR: #56
Reviewed branch: `ui.2-brand-assets`
Reviewed commit: `ec1c0bda2cc6bba99fb4a68b08b994bcbf20f6b9`
Reviewed base: `main@be11564790c6393a26ccb9764d06c8cdafe2383f`
Reviewed by: GPT-5.6 Sol independent reviewer session
Date: 2026-08-15

## 1. What I verified

### Exact PR state and final remediation scope

PR #56 was open, non-draft, unmerged, and mergeable at exact head `ec1c0bda2cc6bba99fb4a68b08b994bcbf20f6b9` against `main@be11564790c6393a26ccb9764d06c8cdafe2383f`.

The final remediation from the previously reviewed product tip `2adc1e8055236c37f71e70b4c97871cf3725d8f3` is one commit and changes exactly two files:

- `docs/05-development/dependencies.md` — one-line canonical UI.2 provenance correction.
- `docs/05-development/packets/ui.2-brand-assets.rereview.md` — the prior independent FAIL report, preserved as a review record.

No file under `assets/`, `src/`, `scripts/`, or `vendor/` changed in this final remediation, so it is governance-only and cannot alter the product-input build date.

### R2-F1

The canonical bundle-budget record now identifies the reconciled UI.2 product artifact as:

```text
bytes  = 2622481
sha256 = ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83
```

It retains the merged-P0.22 baseline:

```text
bytes  = 2597939
sha256 = da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562
```

and therefore the recorded delta remains exactly:

```text
2622481 - 2597939 = 24542 bytes
```

The separate historical `Last measured` CI-only rule remains intact. R2-F1 is resolved.

### Exact-head CI and artifact

CI #214 completed successfully at exact head `ec1c0bda2cc6bba99fb4a68b08b994bcbf20f6b9`:

- `npm ci`: success, 0 vulnerabilities
- upstream vendor verification: success
- `npm run lint`: success
- `npm run check-docs`: 225 markdown files, 0 warnings
- `npm test`: 402/402 passed
- Ubuntu double build: identical hashes
- Windows double build: success
- cross-OS build-hash comparison: success
- Chromium + Firefox browser harness: success

I downloaded the exact-head Ubuntu Actions artifact and independently measured:

```text
sha256 = ba94ee70a5308a623810cff9090d37d6c4f5f9ecd9aecc79ac431a1ae42f5a83
bytes  = 2622481
```

This independently confirms that the final governance-only remediation did not perturb the shipped artifact.

### UI.2 browser acceptance

At exact head, both Chromium and Firefox report the dedicated UI.2 browser gate passing from `file://` at an exact 320 px viewport. The committed harness verifies:

- non-zero wordmark geometry and no clipping at 320 px;
- `role="img"` and accessible name `Coldbox`;
- computed ink/cyan fills resolve from theme tokens in both themes;
- exactly three favicon `data:` URIs;
- favicon image decode to 16x16, 32x32, and 48x48;
- no sibling icon/manifest file request.

### Fail-closed asset validation and lint

The exact-head test suite confirms the remediation remains in place:

- unsafe SVG constructs are rejected;
- a wordmark with `<script>` makes the build exit non-zero;
- a wrong-size favicon is rejected;
- a non-PNG favicon is rejected;
- a truncated PNG retaining a valid header is rejected;
- an IDAT CRC corruption is rejected;
- textual SVG assets under `assets/brand/` are scanned by `scripts/lint.js`, and an external-URL mutation fails lint.

The prior F1–F4 and R2-F1 findings therefore all recheck clean.

## 2. Environment note

The reviewer container could not resolve `github.com` for a separate direct `git clone`. Exact-head source was inspected through the GitHub connector, exact-head CI was inspected directly, and the exact-head Actions artifact was independently downloaded, hashed, sized, and parsed in the reviewer environment. This tooling limitation does not leave any UI.2 acceptance criterion unverified and is not a product finding.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Inline SVG carries `--fill-cyan` and `--fill-ink`, not literal hex | ✅ | Exact source/test coverage retained; validator rejects literal hex; final remediation is docs-only. |
| 2 | Wordmark is legible at app-bar height and at 320px viewport width | ✅ | Exact-head Chromium and Firefox dedicated 320px `file://` gate passed with geometry/clipping assertions. |
| 3 | Accessible name `Coldbox` | ✅ | Exact-head browser gate and source tests verify `role="img"` plus `aria-label="Coldbox"`. |
| 4 | Favicons are `data:` URIs at 16/32/48 and resolve offline from `file://` with no sibling file | ✅ | Both engines decode all three exact sizes and assert no sibling icon/manifest request. |
| 5 | `scripts/lint.js` passes, meaning no external URL/fetched brand asset | ✅ | Exact-head lint passed; negative textual-SVG external-URL regression remains green by rejecting its poisoned fixture. |
| 6 | Build reproducible across two runs | ✅ | Exact-head Ubuntu/Windows double builds and cross-OS comparison passed at `ba94ee70…`; independently downloaded artifact matches. |
| 7 | Size delta recorded against `dependencies.md` bundle budget | ✅ | Canonical record now names current `ba94ee70…`, 2,622,481 bytes, preserving +24,542 bytes against merged P0.22. |
| 8 | Design-system §5 `.app-bar` updated to describe the logo | ✅ | Prior verified implementation unchanged by the docs-only final remediation. |
| 9 | `Pre-release · Not audited` badge and §2 copy rules untouched | ✅ | Exact artifact/source assertions remain green; final remediation changes no product copy. |
| 10 | SVG contains no `<script>`, `<foreignObject>`, `href`/`xlink:href`, or external reference | ✅ | Exact source validator/tests remain green; unsafe mutations fail closed. |

## 4. Findings

None.

## 5. Verdict rationale

**PASS.** Every UI.2 acceptance criterion is met and independently re-verified at the exact final head. The four original findings and R2-F1 are resolved, exact-head CI is fully green, the canonical bundle provenance now matches the independently measured artifact, and the final remediation is docs-only so it does not change the reviewed product bytes. There are zero remaining findings of any severity.

PASS
