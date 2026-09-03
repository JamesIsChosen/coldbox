# Review: UI.1 — Design reconciliation — round 3

**VERDICT: FAIL**

Findings: 4 (3 open must-fix, 1 partially closed)
Reviewed commit: `86685d7`
Reviewed by: independent agent reviewer, with a clone-capable runner
Date: 2026-08-14

> **Provenance note, added by the author, not the reviewer.** Transcribed by the
> UI.1 author, as in rounds 1 and 2, because the reviewing sessions cannot write to
> the branch. Rounds 1 and 2 are preserved unedited at
> [`ui.1-design-reconciliation.review.md`](ui.1-design-reconciliation.review.md) and
> [`ui.1-design-reconciliation.review-2.md`](ui.1-design-reconciliation.review-2.md).
> Nothing below has been reworded, softened, merged or removed.

---

## Environment finding, substantially changed

This run is useful, and it changes the status of the environmental finding substantially.

The fresh-clone environment is now proven to work. The runner cloned PR #55 from GitHub into a new temp path, confirmed exact head/base, used Node 24.16.0, ran `npm ci`, real-upstream vendor verification, lint/docs/tests, two builds under different caller timezone/locale settings, and Chromium + Firefox. Both builds were identical at:

```
73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1
2,597,939 bytes
```

The repository was clean afterwards. PR #55 is still open and unmerged.

**The two runner FAILs are not UI.1 findings:**

- "No tracked vendor package.tgz found" is a bug in my runner. Your ZIP's own scanner lists ten tracked `vendor/.../package.tgz` files. So the selector failed even though suitable corruption targets unquestionably exist.
- The discovery ZIP redaction is a pre-existing runner/scanner problem. The scan found secret-shaped public fixtures in seven tracked files such as `test/derivation.test.js`, `test/seed-xor.test.js`, `src/protocol.js`, and `scripts/run-browser-harness.js`. PR #55 changes none of `src/`, `scripts/`, `test/`, or `vendor/`; its changed-file set is documentation/governance plus `.github/workflows/ci.yml` and `CHANGELOG.md`. So I will not charge either scanner failure against UI.1.

What remains of R3-F4 is now much narrower: the clone/environment portion is closed; only the reviewer-owned deliberate-corruption test remains unexecuted because my selector bug prevented the mutation. Hosted and reviewer-owned clean verification otherwise agree.

## Updated round-3 status

**R3-F1 — still open:** ADR-0025/0026 contain unqualified old naming-model statements.

**R3-F2 — still open:** the UI.1 packet is stale against exact-tip CI/current ROADMAP wording. The PR body still literally says "This revision has not yet been through CI," even though this tip now has exact-tip CI and your fresh reviewer run.

**R3-F3 — still open:** ADR-0046/UI.10 still need an explicit ownership rule preserving the cold-only vault name across warm `publicData.replace`.

**R3-F4 — partially closed:** fresh GitHub clone, alternate path/environment, Node pin, clean gates, reproducibility and both browsers are now independently demonstrated. Only deliberate corruption/non-zero evidence remains.

So the verdict remains FAIL, but do not rerun this exact tip. R3-F1–F3 already require branch remediation, so spending another full verification cycle on `86685d7` would not move it toward merge.

After the author fixes R3-F1–F3 and pushes a new head, I'll generate a corrected round-4 runner pinned to that new SHA. I'll fix the corruption target by selecting a known tracked vendored tarball directly, and I'll make the evidence bundle avoid the broken full-discovery allowlist so the actual transcript/results survive the scanner.

## Handoff

Preserve rounds 1 and 2; preserve this round-3 FAIL separately; remediate R3-F1–F3; leave UI.1 `[~]`; push the new tip. Then give me the new SHA and I'll do the final clone-capable review with the corrected deliberate-break runner.

**FAIL**
