# Review: UI.1 — Design reconciliation — round 5

**VERDICT: FAIL**

Findings: 2 (1 branch finding, 1 review-coverage gap — all must be addressed)
Reviewed commit: `dea4f32c8fb24a5479d4079bc539b9cb5711628f`
Reviewed by: independent agent reviewer
Date: 2026-08-14

## 1. What I verified

- PR #55 remained open, mergeable, not draft, and unmerged.
- Branch `ui.1-design-reconciliation` pointed exactly at the reviewed commit.
- R4-F1 was substantively closed: ADR-0025 and ADR-0026 now carry the required ADR-0046 amendment/retirement treatment.
- R3-F3 remained closed: ADR-0046/UI.10 still define the cold-owned vault name and its fail-closed `publicData.replace` ownership rule.
- Prior review reports 1–4 remained preserved separately.
- UI.1 remained `[~]` and the PR still changed no file under `src/`, `scripts/`, or `vendor/`.

## 2. What I could not verify

The reviewer-owned deliberate-corruption check remained unexecuted at this reviewed commit. Round 3's runner selected no target because of a reviewer-side selector bug; round 4 did not rerun because the branch already failed on documentation findings; round 5 likewise found a packet defect before the expensive runner stage.

## 3. Acceptance criteria

The eight UI.1 item criteria remained satisfied by inspection from the preceding rounds. The zero-findings review protocol nevertheless prohibited PASS because the packet itself still contained current factual contradictions and the reviewer-owned deliberate-corruption gate remained unexecuted.

## 4. Findings

### R5-F1 — Packet verification history is internally contradictory and contains a wrong commit-distance claim

**Severity:** blocking

**Location:** `docs/05-development/packets/ui.1-design-reconciliation.md` §3, §6, §10

**Observed:** §3 correctly records the successful reviewer-owned fresh clone at `86685d7` and says only the deliberate-corruption check remains outstanding. But §6 still says `F7 is unresolved`, says the protocol-mandated fresh clone under a different path/timezone/locale `did not happen`, and says re-review `needs a clone-capable environment`. §10 repeats that `F7 remains open and needs an environment, not an edit`. Those statements became obsolete when the round-3 runner successfully cloned from GitHub and completed the alternate-path/environment/browser gates. Only deliberate corruption remained.

The same §3 says `ce4bba4` is four commits behind the current head. GitHub's compare graph reports the reviewed commit is five commits ahead of `ce4bba4`.

**Required action:** Sweep the complete packet for obsolete F7/environment language; state that fresh-clone/environment coverage closed at `86685d7` and only deliberate corruption remains. Correct or remove brittle relative commit-count prose.

### R5-F2 — Reviewer-owned deliberate-corruption / non-zero-exit gate remains open

**Severity:** blocking review-coverage gap

**Location:** independent review protocol gate

**Required action:** On the next textually clean tip, select a known tracked `vendor/**/package.tgz`, mutate one byte, prove both `npm run verify-vendor` and `npm run build` exit non-zero, restore the exact tracked bytes, and complete the clean exact-tip verification gates.

## 5. Verdict rationale

FAIL. The ADR remediation is closed, but the packet still contains contradictory/stale verification-history text and the mandatory deliberate-corruption gate remains outstanding.

## Handoff

Under the maintainer's explicit exception, a controlled runner may repair R5-F1 directly, preserve this report, commit/push only those governance changes, and then perform R5-F2 against the resulting exact pushed tip. UI.1 stays `[~]`; no merge occurs inside that runner.

**FAIL**
