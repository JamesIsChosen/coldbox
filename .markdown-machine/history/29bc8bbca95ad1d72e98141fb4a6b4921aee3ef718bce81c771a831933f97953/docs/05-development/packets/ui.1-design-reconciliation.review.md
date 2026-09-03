# Review: UI.1 — Design reconciliation

**VERDICT: FAIL**

Findings: 7 (6 must-fix on the branch, 1 review-coverage gap — all must be addressed)
Reviewed commit: `ce4bba40bd1df404f32148104fbf8d451866cf2c`
Reviewed by: independent agent reviewer
Date: 2026-08-14

> **Provenance note, added by the author, not the reviewer.** The reviewing session
> attempted to commit this report to `ui.1-design-reconciliation` and to submit a
> REQUEST_CHANGES review on PR #55. Both GitHub writes were rejected with
> HTTP 403 `Resource not accessible by integration`, so the reviewer modified
> nothing. The report below is transcribed verbatim from that session's output by
> the UI.1 author so the FAIL is preserved in the branch history rather than lost
> to a permissions failure. **No finding has been reworded, softened, merged or
> removed.** The author's response is in the packet, not here; this file is the
> reviewer's record and later sessions must not edit it.

---

## Verdict

Reviewed PR #55 at `ce4bba40bd1df404f32148104fbf8d451866cf2c`. The PR is correctly based on `main@94cf73b…`, contains 14 changed documentation/governance files, and makes no `src/` change.

The executable gates are healthy. Exact-tip CI completed successfully: 378/378 tests, upstream vendor verification, lint/docs checks, Windows + Ubuntu builds, cross-OS reproducibility, and Chromium + Firefox browser harness all passed. The reproducible artifact is 2,597,939 bytes, SHA-256 `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1`. This matches the P2.7 product artifact, so UI.1's claimed 0-byte bundle impact is valid.

However, under this repository's review protocol, any finding — including advisory findings or an acceptance criterion that cannot be independently verified — requires FAIL. I found 7 findings.

## Findings

**F1 — Blocking: canonical bundle measurement is stale.** `dependencies.md` records 2,597,956 bytes / `4d1a9235…`, explicitly identifies it as a pre-P2.7 floor, and says the next build should replace it. The exact reviewed artifact is 2,597,939 / `73ce748f…`. UI.1's measured-artifact acceptance criterion is therefore not met.

**F2 — Blocking: bundle facts are still duplicated, and CI reports the superseded 3 MB target.** SPEC says `dependencies.md` is canonical but then restates the ≈2.60 MB size, 4 MB target, and 4.5 MB cap; it also retains a competing component table. Meanwhile `.github/workflows/ci.yml` still literally reports `target ≤ 3 MB, hard cap 4.5 MB`. The hard-cap-as-failing-gate proposal can remain future work; the stale 3 MB reporting cannot.

**F3 — Blocking: ADR-0045 places the vault unlock phrase in the warm realm.** It says, "In the warm realm it is the vault unlock phrase." That directly contradicts the architecture: the warm shell never receives a vault passphrase, while passphrase entry belongs to cold and `vault.open` carries ciphertext only. This needs correction before the ADR can be accepted.

**F4 — Blocking: "exactly two secret-entry points across `src/`" is not a valid test as written.** ADR-0045/UI.4 count Seed Forge plus vault unlock, but existing legitimate sealed inputs also include keyfile input, recovery re-authentication, recovery shares, concealment re-authentication, and secret-note entry. The criterion needs to be narrowed to something mechanically meaningful such as released seed/source entry points, with authentication/recovery surfaces explicitly excluded or redesigned.

**F5 — Blocking: ADR-0046 is not coherently integrated.** ADR-0046 says ADR-0045 moves vault creation wholly into cold, but ADR-0045 does not actually establish that design. ADR-0046 also says its vault-name disclosure is documented in the threat model, yet the current threat model contains no such disclosure. Finally, no UI.3–UI.9 acceptance criteria explicitly own ADR-0046's new typed warm→cold name-list message, bounds, malformed/missing-list fail-closed behavior, teardown, protocol tests, and documentation updates.

**F6 — Advisory, therefore still must-fix: packet evidence is stale.** The packet says docs hygiene checked 212 Markdown files, whereas exact-tip CI checks 213 with zero warnings. The remediation packet should accurately distinguish earlier author-run evidence from exact-tip CI/reviewer evidence.

**F7 — Blocking review coverage.** My shell environment cannot resolve `github.com`, so I could not perform the protocol-mandated reviewer-owned fresh clone under another path plus a new deliberate-corruption/non-zero-exit run. CI independently gives very strong exact-tip evidence, including negative regression tests, but the protocol explicitly requires the reviewer to perform those checks. A fresh re-review after F1–F6 therefore needs a clone-capable environment.

## Persistence blocker

I attempted to persist `docs/05-development/packets/ui.1-design-reconciliation.review.md` directly to `ui.1-design-reconciliation` and submit the REQUEST_CHANGES review to PR #55. Both GitHub writes were rejected with HTTP 403 `Resource not accessible by integration`. I therefore did not modify the branch, did not flip UI.1 to `[x]`, and did not merge.

## Handoff

**VERDICT: FAIL (7 findings).** Do not merge PR #55. UI.1 remains `[~]`.

**Fix next, in an author/remediation session.** Address F1–F6 completely: replace the stale bundle measurement with the exact artifact and provenance; canonicalize bundle-budget facts and update CI's stale 3 MB report; correct ADR-0045's warm-realm vault-passphrase contradiction; redefine the "exactly two secret-entry points" invariant so legitimate authentication/recovery inputs do not violate it; make ADR-0046's vault-creation decision, threat-model disclosure, implementation owner, message validation/fail-closed requirements and future acceptance criteria explicit; and refresh the packet's exact-tip evidence without pretending author-only commands were run. Preserve reviewer history, leave UI.1 `[~]`, push the remediation, and request a fresh review.

**Then re-review in a fresh, clone-capable session.** Read `docs/05-development/review-protocol.md` and the preserved UI.1 FAIL review. Independently review the new PR #55 tip. Re-check every prior finding, clone fresh under a different path/timezone/locale, run `npm ci`, upstream `verify-vendor`, lint, full tests, two reproducible builds, Chromium/Firefox, and a reviewer-owned deliberate corruption that exits non-zero. Issue a new verdict; do not edit away the prior FAIL. Only on zero findings may the reviewer record PASS, flip UI.1 to `[x]`, and merge.
