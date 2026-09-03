# Review: UI.9 — Tool map compiled from ROADMAP.md

**VERDICT: FAIL**

Findings: 2 (2 blocking — both must be addressed)
Reviewed commit: 68aae09528bbed42874de7bbeaaf05f50cdf63c3
Reviewed by: ui9_fresh_reviewer
Review mode: CONNECTED
Date: 2026-08-16

## 1. What I verified

- `npm test` — **440 passed, 0 failed, 0 skipped** (run with the repository's required process permissions).
- `node --test test/tool-map.test.js test/ui.9-tool-map.test.js test/ui.8-warm-realm-workspaces.test.js` — **8 passed, 0 failed**.
- `npm run lint` — passed.
- `npm run verify-vendor` — passed against local files and upstream releases.
- `npm run check-docs` — passed; 249 markdown files, 0 warnings.
- Two builds under different `TZ` and `LANG` values produced the same SHA-256: `cea40bf20dbfcf10adbf29dca2792c6c17ec30f9c8cc807701548328cf871d89`.
- Direct parser negatives reject a malformed checklist heading and a duplicate single-ID entry with exceptions.
- Exact-head CI run `31959418393` has `head_sha` `68aae09528bbed42874de7bbeaaf05f50cdf63c3` and conclusion `success`. I audited the workflow at this commit and confirmed the Ubuntu and Windows build jobs, the Chromium + Firefox browser harness, the approved UI reference secret scan, and the cross-OS hash comparison all completed successfully. The unit-test workflow rejects nonzero skips, and the recorded run was green.

The local browser binaries were unavailable, so I used the exact-head CI browser job as the execution witness for Chromium and Firefox. The local run was not silently treated as a pass.

## 2. What I could not verify

The browser harness could not be launched locally because the Playwright Chromium and Firefox binaries are not installed in this checkout. The exact-head CI browser job independently executed the required engines successfully, so no browser acceptance criterion is left unverified by this limitation.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | the tool map's content is generated at build time from this file and no item status is transcribed by hand anywhere in `src/` | ❌ | Build-time compilation and warm rendering are present, but `src/cold/index.html:68` still hand-transcribes `UI.9`, `UI 9`, and the unavailable Tool map status. The test only checks `src/index.html`, not all of `src/`. |
| 2 | the build fails closed if this file cannot be parsed | ❌ | `scripts/build.js` calls `compileToolMap()`, and the parser has direct negatives, but no test mutates a temporary ROADMAP input and runs the actual build to prove a malformed or duplicate roadmap exits nonzero. |
| 3 | the output is deterministic across two builds | ✅ | Local builds under different timezone/locale settings matched at SHA-256 `cea40bf20dbfcf10adbf29dca2792c6c17ec30f9c8cc807701548328cf871d89`; exact-head CI also passed both build legs and the cross-OS comparison. |
| 4 | `scripts/check-docs.js` covers the new relationship | ✅ | `checkToolMapRelationship()` is called by `scripts/check-docs.js`; `npm run check-docs` passed with zero warnings. |
| 5 | a status changed here and nowhere else changes the app on the next build | ✅ | The compiler reads the marker from `ROADMAP.md`, the marker-only mutation test changes the compiled status, and the build injects the compiled object into the artifact. |

## 4. Findings

### F1 — A hand-transcribed UI.9 status remains in the sealed source

**Severity:** blocking

**Location:** `src/cold/index.html:68`; `test/ui.9-tool-map.test.js:10-19`

**Observed:** The sealed-realm source still contains a disabled Tool map control with `data-roadmap-id="UI.9"`, `data-phase="UI 9"`, and a manually written unavailable treatment. The UI.9 test only loads `src/index.html`, so it does not enforce the roadmap criterion over all files under `src/`.

**Expected:** The roadmap is the sole status source: no UI.9 status, phase, or availability metadata is hand-transcribed anywhere in `src/`. The Tool map may remain warm-only and the sealed shell may retain a noninteractive entry if that is required by the existing chrome contract, but the UI.9 status metadata must not be duplicated in the sealed source.

**Required action:** Remove or replace the sealed-source UI.9 status transcription without adding sealed access, and add a regression that scans every relevant `src/` file (including `src/cold/`) for forbidden hand-transcribed UI.9 status metadata.

### F2 — Negative tests stop at the parser and do not prove the build fails nonzero

**Severity:** blocking

**Location:** `test/tool-map.test.js:21-36`

**Observed:** The malformed and duplicate fixtures call `parseRoadmap()` directly. No test supplies a malformed or duplicate temporary `ROADMAP.md` to the build entry point and asserts a nonzero process exit. A future build integration change could bypass the parser while all current negative tests remained green.

**Expected:** The build itself must fail closed, with a nonzero exit code, when its ROADMAP input is malformed or contains duplicate IDs.

**Required action:** Add build-level negative regression coverage using an isolated temporary project/input (or an equivalent build-root injection) for both malformed and duplicate roadmap fixtures, asserting a nonzero exit and no successful product output. Keep the parser-level tests as unit coverage.

## 5. Verdict rationale

The compiler is deterministic, wired into the build, and well covered by the exact-head CI and positive/low-level parser tests. However, the submitted tree does not yet satisfy the literal source-of-truth boundary because a sealed source file still carries UI.9 status metadata, and the negative tests do not witness the actual build process failing closed. Address F1 and F2, rerun the complete verification, and request a fresh review on the new head; the roadmap marker remains `[~]` until then.

---

## Fresh independent re-review of the remediation

**VERDICT: PASS**
**Reviewed commit:** `3128699f920cb02e1bebe5d8f193a53c32003f14`
**Reviewed PR:** #65
**Reviewed by:** `ui9_fresh_reviewer_retry`
**Review mode:** CONNECTED
**Date:** 2026-08-16

This is a new independent verdict on the remediation head, not an amendment to the preceding FAIL. The preceding FAIL remains above unchanged. I independently inspected the exact commit, reran the focused and complete verification, checked the source and build-input graph, exercised the negative fixtures, and inspected exact-head CI before setting UI.9 to `[x]`.

### Prior findings re-checked

**F1 — closed.** `test/ui.9-tool-map.test.js` now scans every `.html`, `.js`, and `.css` file below `src/` for hand-transcribed UI.9 status/phase metadata. `src/cold/index.html` retains only a noninteractive Tool map label; it contains no UI.9 identifier, phase, or availability/status metadata. The warm route's status and metadata are created only by `renderToolMap()` from the injected `TOOL_MAP` object.

The broader UI.4a isolation guard was also independently re-run. `collectProductBuildInputFiles()` starts at `scripts/build.js`, follows the complete local CommonJS require graph, and adds the explicitly read product data inputs; the graph includes the imported `scripts/brand-assets.js` helper. The focused suite passed both the clean graph assertion and the negative fixture in which an imported `brand-assets.js` consumes an approved reference: the child probe exited non-zero and identified `brand-assets.js`. The symlinked-helper negative also passed. `findApprovedReferenceBuildInputs()` returned an empty list for the real graph.

**F2 — closed.** `test/ui.9-tool-map.test.js` copies an isolated repository fixture, replaces `ROADMAP.md` first with a malformed item and then with duplicate IDs, runs the actual `scripts/build.js` entry point in each fixture, requires a non-zero exit, and requires that `build/coldbox.html` does not exist. The focused test passed both build-level negatives; parser-level negatives remain present as unit coverage.

### Exact-head verification

Focused command:

```text
node --test test/ui.4a-approved-mock-parity.test.js test/ui.9-tool-map.test.js
✔ approved prototype payloads stay outside every product build input
✔ an imported helper consuming an approved reference fails the guard non-zero
✔ the transitive graph rejects a symlinked local helper
✔ Tool map is a built route with no hand-transcribed roadmap status in src
✔ the build fails non-zero for malformed and duplicate ROADMAP fixtures
✔ built Tool map contains the current roadmap status and all parsed items
ℹ tests 11
ℹ pass 11
ℹ fail 0
ℹ skipped 0
```

Complete local verification:

- `npm test` — **441 passed, 0 failed, 0 skipped**.
- `npm run lint` — passed.
- `npm run verify-vendor` — passed for all local artifacts and upstream releases.
- `npm run check-docs` — passed; 250 markdown files, 0 warnings.
- Two local builds, one normal and one with `TZ=Pacific/Honolulu` and `LANG=de_DE.UTF-8`, both produced SHA-256 `071593f78bf0c39cd08a77db82af33eb3e7ee3a3558e691527c5e887c229e64c`.
- `npm run test:browser` — passed in both Chromium and Firefox over `file://`, including the generated Tool map route and existing cold/warm, CSP, responsive, and security assertions.
- `git diff --check` — no new whitespace errors in the remediation diff.

Exact-head CI run `31960224106` was independently inspected and has `head_sha` `3128699f920cb02e1bebe5d8f193a53c32003f14`, status `completed`, conclusion `success`. Its successful jobs include:

- Ubuntu build, including lint, docs, unit/vector tests, two-build comparison, and artifact upload.
- Windows build with the same checks.
- Cross-operating-system build hash comparison.
- Chromium + Firefox browser harness.
- Approved UI reference secret scan, scanning temporary byte-checked copies of both frozen desktop/mobile references with zero findings and zero skipped candidates.

### UI.9 acceptance criteria

| Criterion | Result | Independent evidence |
|---|---|---|
| Content is generated at build time from `ROADMAP.md`, with no hand-transcribed item status in `src/` | PASS | `scripts/build.js` injects `compileToolMap(projectRoot)` into `__COLDBOX_TOOL_MAP__`; the source-wide regression scans all HTML/JS/CSS under `src/`; the built route renders the injected items. |
| Build fails closed if `ROADMAP.md` cannot be parsed | PASS | Actual-build malformed and duplicate fixtures both exit non-zero and produce no product output; direct parser negatives also pass. |
| Output is deterministic across two builds | PASS | Local differing-environment hashes match; exact-head Ubuntu/Windows double-build and cross-OS comparisons are green. |
| `scripts/check-docs.js` covers the relationship | PASS | `npm run check-docs` passes with zero warnings, and `checkToolMapRelationship()` checks the canonical roadmap/compiler relationship. |
| A marker-only roadmap change changes the next build | PASS | The marker-only compiler regression observes the status change while preserving the item identity, and the built-artifact test observes current UI.9 status in the injected map. |

No acceptance criterion, hard constraint, or review requirement remains outstanding. There are no advisory findings.

**VERDICT: PASS**

---

## Closeout correction — fresh review verdict

The PASS section immediately above was invalidated by the required reviewer-owned closeout check. After changing the roadmap marker from `[~]` to `[x]`, I reran the focused UI.9 tests and got **5 passed, 2 failed**. Both failures are committed status assertions, not environment noise:

- `test/tool-map.test.js:18` requires UI.9 to remain `in-progress`.
- `test/ui.9-tool-map.test.js:76` requires the built UI.9 entry to remain `in-progress`.

The reviewer must leave the roadmap at `[~]` when the closeout state makes the committed verification red. The implementation and the two previous UI.9 findings remain independently verified, but the exact branch cannot be marked complete while its full test suite fails after the required reviewer marker transition. This is a blocking finding under the binary review protocol.

**Required action:** Make the UI.9 tests status-agnostic or derive their expected status from the current roadmap/compiler, while retaining their source-of-truth and build-level negative assertions. Run the complete verification after that change, push a new exact head, and request another fresh independent review. The next reviewer must flip UI.9 to `[x]` only after the post-flip complete suite remains green.

**VERDICT: FAIL**

---

## Fresh independent re-review of status-agnostic closeout

**VERDICT: PASS**

Findings: 0 (0 blocking, 0 advisory)
Reviewed commit: 5fc151b0aec46c9432697f5cb72e57aa19b5eba6
Reviewed PR: #65
Reviewed by: ui9_final_reviewer
Review mode: CONNECTED
Date: 2026-08-16

This is a fresh independent verdict on the remediation head, not an amendment to either preceding verdict. The preceding FAIL sections remain verbatim above. I re-checked both original findings, the reviewer-owned marker transition, every UI.9 acceptance criterion, the complete verification contract, and the exact-head CI witness. No findings remain.

### 1. What I verified

- `npm ci` — completed successfully; 2 packages added, 0 vulnerabilities.
- `npm test` with UI.9 still `[~]` — **441 passed, 0 failed, 0 skipped**.
- Focused isolation/tool-map tests with UI.9 `[~]` — **11 passed, 0 failed, 0 skipped**.
- After changing the roadmap marker to reviewer-owned `[x]`, focused closeout tests — **7 passed, 0 failed, 0 skipped**.
- After the marker transition, `npm test` — **441 passed, 0 failed, 0 skipped**.
- `npm run lint` — passed.
- `npm run verify-vendor` — passed for all local artifacts and upstream releases.
- `npm run check-docs` — passed; 250 markdown files, 0 warnings.
- Two post-closeout builds under `TZ=UTC`, `LANG=C` and `TZ=Pacific/Honolulu`, `LANG=de_DE.UTF-8` produced the identical SHA-256 `2101495d0f02f66af431eca60dc6655b94857d73af5d8bc0281ac9f21ab6c990`.
- A final clean copied checkout under a different filesystem path and the Honolulu/German locale environment produced the same `2101495d0f02f66af431eca60dc6655b94857d73af5d8bc0281ac9f21ab6c990` hash.
- `npm run test:browser` after closeout — **passed in Chromium and Firefox** over `file://`, including the shared shell, CSP/airgap, responsive, UI.6/UI.7, and existing security assertions.
- The source-wide UI.9 regression scans all `.html`, `.js`, and `.css` files below `src/` and found no hand-transcribed UI.9 identifier, phase, or status metadata. The sealed shell retains only a noninteractive Tool map label and no sealed access.
- The centralized product build-input graph was re-checked. It follows the complete local CommonJS graph from `scripts/build.js`, includes the imported `scripts/brand-assets.js` helper, rejects symlinked modules, and reports no approved-reference inputs in the real graph. The negative imported-helper fixture exits non-zero and identifies `brand-assets.js`.
- The actual build-level malformed and duplicate `ROADMAP.md` fixtures both exit non-zero and emit no `build/coldbox.html`; parser-level negatives remain green.
- Exact-head CI run `31961273138` has `head_sha` `5fc151b0aec46c9432697f5cb72e57aa19b5eba6`, status `completed`, conclusion `success`. I audited `.github/workflows/ci.yml` at the reviewed commit and confirmed successful Ubuntu and Windows build/test/lint/docs/vendor legs, cross-OS hash comparison, the Chromium + Firefox browser harness, and the separate approved-reference secret-scan job. The required local and CI test suites report zero skips. The conditionally skipped Release build attestation job is not a UI.9 acceptance or review requirement.
- The exact-head secret-scan log independently witnesses temporary byte-checked copies of both frozen references: desktop SHA-256 `FB7FF0643BDA8F12A0A7E64DAEA91F51D74276CFC9BFB66C80BAAF874BB2DED9`, mobile SHA-256 `AF0C1FE08E689F755869A6EB4CC06DCAF0F4D44B7DFE6426D6A322B464C7D7F8`; `Clean: True`, `FindingCount: 0`, `SkippedCount: 0`.

### 2. What I could not verify

None for the UI.9 acceptance criteria. UI.9 does not claim a physical-device or iOS/Android acceptance gate; those remain separate human/device evidence and are not represented as completed by this review.

### 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | the tool map's content is generated at build time from this file and no item status is transcribed by hand anywhere in `src/` | ✅ | `scripts/build.js` injects `compileToolMap(projectRoot)` into `__COLDBOX_TOOL_MAP__`; the source-wide regression covers every HTML/JS/CSS source file; the browser harness and built-artifact test exercise the generated route. |
| 2 | the build fails closed if this file cannot be parsed | ✅ | The isolated actual-build malformed and duplicate ROADMAP fixtures both exit non-zero and produce no product output; parser-level negatives also pass. |
| 3 | the output is deterministic across two builds | ✅ | Post-closeout builds under differing timezone/locale and a different copied path matched at SHA-256 `2101495d0f02f66af431eca60dc6655b94857d73af5d8bc0281ac9f21ab6c990`; exact-head CI also passed both OS double-build and cross-OS comparison. |
| 4 | `scripts/check-docs.js` covers the new relationship | ✅ | `checkToolMapRelationship()` is called by `scripts/check-docs.js`, requires the canonical ROADMAP/compiler relationship, and `npm run check-docs` passed with zero warnings. |
| 5 | a status changed here and nowhere else changes the app on the next build | ✅ | The marker-only compiler regression observes the status change while preserving item identity; after the reviewer changed only UI.9 from `[~]` to `[x]`, the built artifact changed to the corresponding `complete` status and all tests remained green. |

### 4. Findings

None.

### 5. Verdict rationale

The remediation closes both prior blocking findings: source-wide inspection now prevents hand-transcribed UI.9 metadata, and the real build is proven to fail closed for malformed and duplicate roadmap inputs. The transitive build-input isolation guard and imported-helper negative are independently witnessed, the approved desktop/mobile reference scan is independently witnessed at the exact head with zero findings and skips, the final marker transition keeps the complete suite green, and every UI.9 criterion is met without weakening the parity contract. **PASS**.
