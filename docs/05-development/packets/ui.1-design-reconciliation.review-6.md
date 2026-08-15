# Review: UI.1 — Design reconciliation — round 6

**VERDICT: PASS**

Findings: 0
Reviewed commit: `743630d71bb4f3e75a52eeb2765517fd609fcbeb`
Reviewed by: agent reviewer under the maintainer's explicit exception authorizing this session to complete Round 6 after the controlled Round-5 remediation
Date: 2026-08-14

## 1. What I verified

- PR #55 is open, not draft, mergeable/clean, unmerged, based on `main` at `94cf73b43b410a47e104f599147206b702ece656`, with exact reviewed head `743630d71bb4f3e75a52eeb2765517fd609fcbeb`.
- The complete base-to-head file list was rechecked. UI.1 changes no file under `src/`; the exact-tip verification also confirmed no `scripts/` or `vendor/` change.
- The Round-5 remediation commit contains only `docs/05-development/packets/ui.1-design-reconciliation.md` and `docs/05-development/packets/ui.1-design-reconciliation.review-5.md`. The staged Git blob IDs used to create it were proved byte-identical before commit.
- A fresh clone of the pushed exact tip was made under a different temporary path. `origin/main` resolved exactly to `94cf73b43b410a47e104f599147206b702ece656`.
- Node pin and runtime both resolved to `24.16.0`.
- `npm ci` exited 0.
- `npm run verify-vendor` against real upstream exited 0.
- `npm run lint` exited 0.
- `npm run check-docs` exited 0: 218 Markdown files checked, 0 warnings.
- `npm test` exited 0: 378 tests, 378 passed.
- Build 1 under `TZ=Pacific/Auckland`, `LANG=de_DE.UTF-8`, `LC_ALL=de_DE.UTF-8` produced SHA-256 `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1`, 2,597,939 bytes.
- Build 2 under `TZ=America/St_Johns`, `LANG=fr_FR.UTF-8`, `LC_ALL=fr_FR.UTF-8` produced the identical SHA-256 and byte count.
- Deliberate corruption targeted tracked file `vendor/npm/@scure/bip39/2.2.0/package.tgz`. One byte was changed. `npm run verify-vendor` exited 1 and `npm run build` exited 1. The exact tracked bytes were then restored; the restored SHA-256 matched the pre-corruption SHA-256 `04a6e2bb040301954373f543e44c352137f14dff58f942782769984ef5ea8e1c`.
- After restoration, real-upstream vendor verification and a clean build both passed; the final artifact again matched `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1` / 2,597,939 bytes.
- `npm run test:browser` exited 0 and the harness passed over `file://` in both Chromium and Firefox.
- Both fresh verification clones ended clean. The maintainer's original checkout was deliberately left untouched because it had been the source of an unexplained local commit exit-128 condition.
- Exact-tip GitHub Actions CI run #201 for `743630d71bb4f3e75a52eeb2765517fd609fcbeb` completed successfully. Ubuntu and Windows builds passed, the cross-OS hash comparison passed, and the Chromium + Firefox browser job passed. The release-attestation job was skipped as expected for a pull-request run.
- R5-F1 is closed: packet Revision 7 removes the obsolete claims that the reviewer fresh-clone/environment run never happened, attributes that coverage to exact prior tip `86685d7`, leaves only deliberate corruption as the then-outstanding executable gate, and removes the brittle relative commit-distance claim.
- R5-F2 is closed by the exact-tip deliberate-corruption run described above.
- Review reports 1–5 remain separate historical records. Round 5 still records its FAIL at `dea4f32`; it was not rewritten into a PASS.
- The documentary acceptance sweep was repeated at the exact reviewed tip: ADR-0044/0045/0046 are present and indexed; the required old ADRs carry amendment markers; design-system §6 is panel-scoped; §7's superseded reason is corrected; `.realm-strip` has the required fixed geometry/palettes/no-motion rule; the shipped light tokens explicitly win; and the bundle facts have one live canonical home in `dependencies.md` with SPEC linking rather than restating them.

## 2. What I could not verify

None.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | ADR-0044, ADR-0045 and ADR-0046 exist, are indexed, and are linked from every document whose behaviour they change | ✅ | All three ADRs exist at the reviewed tip and are indexed in `adr/README.md`; affected design, threat-model, roadmap and superseded-ADR surfaces link to the governing records. |
| 2 | §6 no longer contains a realm-scoped surface entry | ✅ | `design-system.md` §6 states that the rule attaches to the panel, not the realm, and enumerates calm behaviour/surfaces rather than blanket `src/cold/` scope. |
| 3 | §7's superseded second reason is corrected | ✅ | §7 records both historical reasons, then explicitly says the sealed realm is no longer calm throughout and the display face remains excluded on reason 1 alone. |
| 4 | `.realm-strip` is specified with angle, band width, both palettes and the no-motion requirement | ✅ | `45°`; `14px`; warm `--fill-cyan` on `--fill-ink`; cold `--fill-pink` on `--fill-ink`; stripes never move; it is also listed under Permanently calm. |
| 5 | the three conflicting light tokens are resolved in favour of the shipped values with the decision recorded | ✅ | `--bg #ece2cf`, `--bg-dot #d8c9ad`, and `--surface-soft #fff6dc` are normative and the August handoff alternatives are explicitly superseded. |
| 6 | `dependencies.md` is the single home for the measured artifact size, target and hard cap, and carries a real measurement with its provenance rather than an estimate, while SPEC restates none of those figures anywhere and links to it instead — a grep for the size, the target or the cap outside `dependencies.md` returns only historical records | ✅ | `dependencies.md` records 2,597,939 bytes, SHA-256 `73ce748f…`, target ≤ 4 MB and hard cap 4.5 MB with CI provenance. SPEC links to the bundle budget and does not restate those figures. Remaining occurrences outside the canonical home are historical records. |
| 7 | ADR-0009, ADR-0023, ADR-0025 and ADR-0028 carry amendment markers pointing at the new records | ✅ | ADR-0009 → 0044; ADR-0023 → 0045; ADR-0025 → 0046; ADR-0028 → 0045. |
| 8 | no file under `src/` is modified | ✅ | Exact `94cf73b…` → `743630d…` compare contains no `src/` file; exact-tip verification independently asserted the same. |

## 4. Findings

None.

## 5. Verdict rationale

PASS. All UI.1 acceptance criteria are met at exact commit `743630d71bb4f3e75a52eeb2765517fd609fcbeb`; the complete mandatory review matrix has reproduced on a fresh exact-tip clone; the previously outstanding deliberate-corruption/non-zero-exit gate is now positively demonstrated; exact-tip hosted CI is successful; R5-F1 and R5-F2 are closed; and there are no findings, advisories, nits, unresolved questions or unverifiable criteria.

**PASS**