# Independent review - P0.22 provenance build-date ISO rendering hardening

**PR:** #57 - `fix-build-date-iso-rendering`
**Reviewed tip:** `04558e9ebdae4b8ce8f27e84e5a101c5e9d08616`
**Base:** `main` at `bb5274f13ae06cf74823e3d359215ae350801e60`
**Reviewer:** GPT-5.6 Sol, independent reviewer session
**Date:** 2026-08-15
**Findings:** 0

## 1. Scope and protocol

I read `AGENTS.md`, `docs/05-development/review-protocol.md`, the full PR packet, ROADMAP P0.22, and the complete PR diff. The final remediation commit at the reviewed tip is documentation-only and removes the duplicated roadmap-state language identified in the prior review; the live PR description reflects the same status-neutral packet text.

The mandatory reviewer-owned verification was run from the clean detached checkout `C:\Users\semaj\Projects\coldbox-review-04558e9`, pinned to the exact reviewed tip. The checkout remained clean and pinned after all checks. Deliberate mutations were confined to disposable detached worktrees.

## 2. Mandatory verification

Environment: Node `v24.16.0`, npm `11.13.0`, Git `2.54.0.windows.1`.

- exact tip and base ancestry: PASS
- `git diff --check`: PASS
- packet status deduplication: PASS; no literal `[~]` / `[x]` state markers remain in the packet
- live PR description status deduplication: PASS
- `npm ci`: PASS
- `npm run verify-vendor`: PASS against local bytes and upstream releases
- `npm run lint`: PASS
- `npm run check-docs`: PASS, 220 markdown files and 0 warnings
- `npm test`: PASS, 386/386
- `node --test --test-concurrency=1 test/build-date.test.js test/provenance.test.js`: PASS, 22/22
- `npm run test:browser`: PASS in Chromium and Firefox

## 3. Independent reproducibility evidence

A real reviewer-created UTC scratch commit under Git `2.54.0.windows.1` produced:

- `%cI`: `2026-08-15T04:18:45Z`
- `%ct %ci`: `1786767525 2026-08-15 04:18:45 +0000`

This directly exercises the motivating Git-version spelling difference rather than relying on the author's environment.

The reviewed tip built twice in the reviewer checkout to the same artifact:

- SHA-256: `da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562`
- size: `2,597,939` bytes
- embedded build date: `2026-08-14T23:18:32-07:00`

A disposable detached worktree at a different filesystem path, with `TZ=Asia/Tokyo`, `LC_ALL=de_DE.UTF-8`, and `LANG=de_DE.UTF-8`, reproduced the same SHA-256 and byte count.

The PR base `bb5274f13ae06cf74823e3d359215ae350801e60`, built independently in a separate disposable worktree, reproduced the historical artifact exactly:

- SHA-256: `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1`
- size: `2,597,939` bytes
- embedded build date: `2026-08-14T11:28:26-07:00`

## 4. Deliberate failure tests

Three reviewer-owned breakages were applied only in a disposable detached worktree:

1. bypass the semantic `%ci` wall-clock consistency check - targeted regression suite exited `1`; the semantic malformed/contradictory timestamp test failed as required;
2. reintroduce `Z` as the formatter's UTC spelling - targeted regression suite exited `1`, including the end-to-end UTC product-commit check;
3. corrupt a vendored artifact - `npm run build` exited `1` with the vendored SHA-256 mismatch and build-refusal path.

The disposable worktree was restored clean after the negative tests.

## 5. P0.22 acceptance criteria

| Criterion | Independent result |
|---|---|
| A UTC product commit embeds `+00:00`, never `Z` | PASS - real UTC scratch commit on a Git version that returns `Z`; Coldbox tests require and embed `+00:00`; the deliberate `Z` mutation is caught non-zero. |
| Valid non-UTC offsets remain byte-neutral with historical rendering | PASS - six real-offset vectors pass and the PR base reproduces the recorded historical artifact exactly. |
| Formatter is locale/timezone independent | PASS - direct formatter tests pass and a different-path `Asia/Tokyo` / `de_DE.UTF-8` build is byte-identical. |
| Malformed Git output degrades to the labeled unknown | PASS - syntactic and semantic malformed cases pass; bypassing the semantic check causes a non-zero regression failure. |
| Invalid signs, negative/noncanonical components, impossible offsets, and unrepresentable instants are refused by the formatter itself | PASS - direct formatter negative contract passes. |
| Complete build path remains reproducible | PASS - same-path double build, alternate-path/TZ/locale build, historical base rebuild, and exact-tip CI cross-OS evidence agree. |
| Regression tests cover the direct formatter contract with negative cases | PASS - targeted suite passes and two independent formatter mutations are detected. |

## 6. Findings

None.

## 7. Verdict

Every P0.22 acceptance criterion is independently verified at exact tip `04558e9ebdae4b8ce8f27e84e5a101c5e9d08616`. The prior findings are closed: semantic `%ci` validation is enforced, and the packet/PR description no longer duplicate roadmap state. The mandatory reviewer-owned checkout protocol is complete, reproducibility holds across path/timezone/locale, and deliberate breakages fail non-zero.

PASS