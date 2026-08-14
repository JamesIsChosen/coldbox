# Review: UI.1 — Design reconciliation — round 2

**VERDICT: FAIL**

Findings: 5 (4 must-fix on the branch, 1 review-coverage gap)
Reviewed commit: `53f8ae6`
Reviewed by: independent agent reviewer
Date: 2026-08-14

> **Provenance note, added by the author, not the reviewer.** As in round 1, the
> reviewing session could not write to the branch or the PR, so this file is
> transcribed by the UI.1 author. It records round 2 separately from round 1, as
> the reviewer directed; round 1's FAIL at
> [`ui.1-design-reconciliation.review.md`](ui.1-design-reconciliation.review.md)
> is preserved unedited.
>
> **Transcription history.** An earlier version of this file contained only the
> reviewer's handoff block, which was all the author had at the time, and said so.
> The full finding text below was supplied afterwards and replaces it. Nothing has
> been reworded, softened, merged or removed. The author's response is in the
> packet, not here.

---

## Findings

There are 5 remaining findings:

**1. R2-F1 — Blocking: UI.1's own acceptance criterion is now unmet verbatim.** ROADMAP still requires both `dependencies.md` and SPEC to "carry a measured artifact size with its provenance." The remediation correctly removed SPEC's duplicate number and made it link to the canonical `dependencies.md` figure instead. That is the better documentation design, but under the review protocol acceptance criteria cannot be reinterpreted after the fact. Required: change the criterion itself to require the canonical measurement/provenance in `dependencies.md` and a link from SPEC.

**2. R2-F2 — Blocking: ADR-0045 still contradicts its new input registry.** It now correctly preserves legitimate `share-input`, `vault-auth`, `bip39-passphrase`, and `secret-note` inputs, but elsewhere still says every other cold tool — including recovery — "gain[s] no input of [its] own." UI.4 similarly preserves recovery/share inputs and then says every migrated tool has no input of its own. Required: narrow the claim everywhere to no additional seed/source-loading input, and reconcile the "eleven entry points collapse to one" wording.

**3. R2-F3 — Blocking: ADR-0046's vault-name lifecycle is structurally impossible as written.** The user chooses the new name only inside cold; ADR-0046 says no name or derivative may return cold→warm; yet warm remains save-time duplicate authority. Existing ADR-0025/0026 require warm to manage the public name, canonical `<public-name>--<id8>.cbx` filename, Vault Library/name registry, and save-time uniqueness. There is currently no specified channel by which warm learns the cold-entered name it must use. UI.10 reproduces the same mutually incompatible requirements. Required: make an explicit structural decision for the complete name lifecycle — creation, duplicate check, filename generation, library bookkeeping and save — without silently weakening the realm boundary.

**4. R2-F4 — Advisory, therefore still must-fix:** ADR-0046's Context correctly says ADR-0046, not ADR-0045, moves naming into cold, but its rejected "Leave naming in the warm shell" alternative still says ADR-0045 made that decision. Correct that stale attribution.

**5. R2-F5 — Blocking review coverage:** this review session again cannot close F7. I personally attempted:

```
git clone --no-tags https://github.com/JamesIsChosen/coldbox.git /tmp/coldbox-ui1-r2-review
```

and received `Could not resolve host: github.com`, exit 128. Therefore I could not do the protocol-required reviewer-owned fresh clone under an alternate path/timezone/locale or personally introduce a deliberate corruption and verify a non-zero failure. The protocol explicitly requires those reviewer-owned checks.

---

## Handoff, verbatim

❌ Handoff — VERDICT: FAIL (5 findings)

Do not merge PR #55. UI.1 stays `[~]`.

**Remediate R2-F1–R2-F4 on `ui.1-design-reconciliation`:**

Preserve the round-1 FAIL verbatim. Record the round-2 FAIL separately. Reconcile UI.1's bundle acceptance criterion with the single-canonical-home design; narrow ADR-0045/UI.4/CHANGELOG claims to seed/source-loading inputs rather than all secret inputs; resolve ADR-0046's structural vault-name lifecycle so a cold-entered public name can coherently support warm-owned canonical filenames/library/save authority without violating the realm boundary; and correct ADR-0046's remaining stale ADR-0045 attribution. Leave UI.1 `[~]`, push, and request a fresh independent review.

**Then re-review from a genuinely clone-capable reviewer environment:**

Read `docs/05-development/review-protocol.md`, the preserved round-1 FAIL, and the separate round-2 FAIL. Review the new exact PR #55 tip. Re-check every prior finding, clone fresh under a different path/timezone/locale, run `npm ci`, real-upstream `verify-vendor`, lint, full tests, two matching builds, Chromium and Firefox, then deliberately corrupt a dependency/build input and confirm the relevant command exits non-zero. Only with zero findings may the reviewer record PASS, flip UI.1 to `[x]`, push the closeout, and merge.
