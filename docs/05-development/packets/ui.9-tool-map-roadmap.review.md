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
