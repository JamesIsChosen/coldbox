# Review: UI.1 — Design reconciliation — round 4

**VERDICT: FAIL**

Findings: 2 open must-fix (R3-F3 closed; R3-F4's corruption gate carried forward)
Reviewed commit: `a5a7cb89b24bbc388039d0fb2e5d52b864aba041`
Reviewed by: independent agent reviewer
Date: 2026-08-15

> **Provenance note, added by the author, not the reviewer.** Transcribed by the
> UI.1 author, as in rounds 1, 2 and 3, because the reviewing session could not
> write to the branch: both persistence attempts failed with GitHub HTTP 403, so
> the reviewer could neither create this file nor submit REQUEST_CHANGES. Rounds
> 1, 2 and 3 are preserved unedited at
> [`ui.1-design-reconciliation.review.md`](ui.1-design-reconciliation.review.md),
> [`ui.1-design-reconciliation.review-2.md`](ui.1-design-reconciliation.review-2.md) and
> [`ui.1-design-reconciliation.review-3.md`](ui.1-design-reconciliation.review-3.md).
> Nothing below has been reworded, softened, merged or removed.

---

Round 4 is FAIL at exact tip `a5a7cb89b24bbc388039d0fb2e5d52b864aba041`. The branch still points there, and PR #55 remains open/unmerged.

R3-F3 is closed. ADR-0046 now explicitly makes the vault name cold-owned, omits it from the warm projection, preserves it across `publicData.replace`, and fails closed if warm attempts to inject a name. UI.10 also requires positive round-trip and negative injected-field tests.

Two branch findings remain.

**R4-F1:** ADR-0025's Rationale still says, without amendment, "Keeping the human name in the warm shell…". ADR-0026 §3 still says public vault names are unique in the session/profile/library, and its Negative/limits section still says browser-profile name uniqueness is best effort, even though ADR-0046 retires that model.

**R4-F2:** packet revision 5 correctly attributes the reviewer-owned run to `86685d7`, but then says that verification "now exists at the current tip." The current tip is `a5a7cb8`, not `86685d7`. At review time, the exact-tip GitHub Actions run for `a5a7cb8` was still in progress, so prior-tip evidence must remain explicitly prior-tip evidence.

The deliberate-corruption gate also remains for the next clean tip; I did not make you rerun the full suite because the branch already fails on documentation findings.

Both persistence attempts failed again with GitHub HTTP 403: I could neither create `ui.1-design-reconciliation.review-4.md` nor submit REQUEST_CHANGES. No branch state changed.

## Handoff

Preserve review rounds 1–3 unchanged. Round 4 at `a5a7cb89b24bbc388039d0fb2e5d52b864aba041` is FAIL.

Fix R4-F1 by performing another complete ADR-0025/0026 sweep. Preserve historical prose, but add explicit ADR-0046 amendment/retirement markers wherever live text still asserts the old warm-owned/public-name model. At minimum:

* ADR-0025 Rationale: "Keeping the human name in the warm shell…"
* ADR-0026 Decision §3: public-vault-name uniqueness
* ADR-0026 Negative/limits: browser-profile name uniqueness

Fix R4-F2 by correcting packet revision 5 so reviewer-owned verification at `86685d7` is described strictly as prior-tip evidence. Do not say it exists "at the current tip." Refresh exact-tip CI evidence for the new remediation commit once available.

R3-F3 is closed and must remain intact.

Leave UI.1 `[~]`. Do not merge. Record round 4 separately, push the remediation, and provide the new full SHA.

On the next textually clean tip, the independent reviewer must run the corrected deliberate-corruption check against a known tracked `vendor/**/package.tgz` and prove both `npm run verify-vendor` and `npm run build` exit non-zero before restoration.

**FAIL**
