# PR packet: UI.1 — Design reconciliation

**Branch:** `ui.1-design-reconciliation` · **PR:** #55
**Base:** `main` @ `94cf73b` (Merge PR #54: P2.7 Backup Health dashboard)
**Roadmap item:** [UI.1 Design reconciliation](../ROADMAP.md) — Phase UI
**Date:** 2026-08-14 · **Revision 2** (remediation of the FAIL at `ce4bba4`)

---

## 0. Remediation of review round 1

Round 1 returned **FAIL with 7 findings** at `ce4bba40bd1df404f32148104fbf8d451866cf2c`. The report is preserved verbatim at [`ui.1-design-reconciliation.review.md`](ui.1-design-reconciliation.review.md), committed by me rather than the reviewer only because their integration was refused write access with HTTP 403; **no finding was reworded, softened or removed**, and that file is the reviewer's record, not mine to revise.

Every finding was valid. Three of them — F3, F4, F5 — were substantive errors in security-relevant documents, not presentation problems, and I want that stated plainly rather than buried in a table.

| # | Finding | Response |
|---|---|---|
| F1 | Canonical bundle measurement stale (2,597,956 / `4d1a9235…` vs the real 2,597,939 / `73ce748f…`) | **Fixed.** `dependencies.md` now records the exact reviewed artifact with its CI provenance, and instructs that the figure be updated from a CI run rather than a local build — a local build is precisely how the wrong number got there |
| F2 | Bundle facts duplicated; CI still reported the superseded 3 MB target | **Fixed.** SPEC §16's competing component table is gone and its measured help-content note relocated to `dependencies.md`; SPEC §5.1's file table no longer carries a size; `.github/workflows/ci.yml` now reports the 4 MB target. A **third** live restatement the finding did not name — SPEC's platform-constraints table, still asserting `Target ≤ 3 MB` — was found by sweeping for the string rather than fixing only what was cited, and now links to the canonical home instead |
| F3 | ADR-0045 placed the vault unlock phrase in the warm realm | **Fixed, and it was my error.** The passphrase is entered in cold (`#cold-vault-passphrase`), which I had read in this very session. Corrected, with the correction stated in the ADR rather than silently patched |
| F4 | "Exactly two secret-entry points across `src/`" is not a valid test | **Fixed by redefining the invariant.** It is now a declared, categorised registry asserting exactly one `seed-entry`, with the ~two dozen legitimate auth/recovery/note/passphrase inputs enumerated as non-violating |
| F5 | ADR-0046 incoherently integrated — false premise, absent threat-model disclosure, no implementation owner | **Fixed on all three.** ADR-0046 now owns the naming decision itself; the disclosure exists in `threat-model.md`; **UI.10** is a new roadmap item owning ADR-0046 end to end |
| F6 | Packet evidence stale (212 vs 213 markdown files) | **Fixed.** §3 now separates author-run evidence from exact-tip CI evidence and does not present the former as current |
| F7 | Reviewer could not resolve `github.com`, so the protocol-mandated fresh clone and deliberate-corruption run did not happen | **Not mine to fix.** Carried forward as an open review-coverage gap; the re-review needs a clone-capable environment. Recorded in §6 and §10 |

**On F4 in particular.** The criterion I wrote would have been false on the day it was written, and a future agent would have been held to it. That is worse than a wrong fact in prose, because acceptance criteria are what a reviewer checks verbatim. The replacement is a registry rather than a count, because the original conflated "how many places can a secret be typed" with "how many places can *the* secret be loaded"; only the second is what ADR-0045 constrains.

## 1. Summary

Makes the August 2026 sealed-realm reorganisation legal to build. It lands three ADRs, rewrites the calm rule from realm-scoped to panel-scoped, adds `.realm-strip` as a named component, moves vault naming into the sealed realm, resolves a light-mode token conflict, canonicalises a bundle figure that had fallen below the artifact it described, and inserts Phase UI into the roadmap so everything from P2.8 onward is built once, in the new interface. **No file under `src/`, `scripts/` or `vendor/` is touched and no application behaviour changes.**

## 2. Scope

**In:** three new ADRs (0044, 0045, 0046) · `adr/README.md` index and amendment markers · status lines in ADR-0009, 0023, 0025, 0028 · `design-system.md` §3, §5, §6, §7, §8, §10 · `SPEC.md` §5.1, the platform-constraints table and §16 · `dependencies.md` bundle budget · `threat-model.md` (new *Not defended* subsection) · `.github/workflows/ci.yml` (budget report line) · `ROADMAP.md` (Phase UI, ten items; P2.8 dependency) · `CHANGELOG.md` · this packet · the preserved review report.

**Deliberately not in:**

- **Any `src/`, `scripts/` or `vendor/` change.** The interface work is UI.2–UI.10.
- **The logo and favicons.** Supplied by the maintainer during this session; they are a `src/` change, so they are UI.2. The traced SVG is not committed here, and UI.2's roadmap entry records the exact `potrace` invocation so the trace is reproducible rather than a mystery binary.
- **Making the bundle hard cap a failing CI gate.** F2 explicitly permits this as future work. CI now *reports* the correct target; enforcement is unfiled because filing it is itself a roadmap change and I have one item's mandate. Recommended in §10.
- **Historical `CHANGELOG.md` entries that quote the old 3 MB target.** One earlier entry quotes `dependencies.md`'s wording as it stood at the time. That is a record of what was true then, and rewriting it would falsify history rather than fix a stale fact. Only live, load-bearing statements of the budget were changed: `dependencies.md`, SPEC, and the CI report.
- **The two stray bullets at the top of `CHANGELOG.md`**, above the file's own intro paragraph. They describe P0.19/ADR-0026 work and appear to have been prepended to the wrong position in an earlier PR. Pre-existing; relocating them wants a maintainer decision, not a silent fix by me.

## 3. How to verify

**Reviewer-grade evidence, exact tip `ce4bba4` (round 1 CI, not run by me).** 378/378 tests · upstream vendor verification · lint and docs checks · Windows and Ubuntu builds · cross-OS reproducibility · Chromium and Firefox harness. Artifact **2,597,939 bytes**, SHA-256 `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1`, **identical to the P2.7 product artifact** — which is what independently confirms this PR's zero-byte bundle claim.

**This revision has not yet been through CI**, and its changes are documentation plus one CI summary string. Re-run the full gate on the new tip.

**Author-run, this revision.** These are the only commands I can execute; see §6 for why.

```
$ node scripts/lint.js
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ node scripts/check-docs.js
Documentation hygiene check passed: 214 markdown file(s) checked, 0 warning(s).
```

214, not the 213 CI saw at `ce4bba4`, because this revision adds the preserved review report. The 212 figure in revision 1 of this packet was taken before its own packet file existed and should not have been presented as current — that was F6.

**The build output cannot change, and this is checkable rather than asserted.** `scripts/build.js` scopes its build-date git query to `BUILD_DATE_SOURCE_PATHS = ['src', 'scripts', 'vendor']` (build.js:127), so governance-only commits do not move the artifact. Help content compiles from `docs/00-overview/glossary.md` and `docs/03-guides/*.md` only (help-content.js:513–514); neither is touched. `.github/` is not a build input. Round 1 confirmed this empirically by producing the P2.7 artifact byte-for-byte.

## 4. Acceptance criteria

| Criterion | How satisfied | Test |
|---|---|---|
| ADR-0044, ADR-0045 and ADR-0046 exist, are indexed, and are linked from every document whose behaviour they change | Three files; three index rows; linked from design-system §6/§7, ROADMAP Phase UI, threat-model, CHANGELOG | `check-docs.js`, 0 warnings |
| §6 no longer contains a realm-scoped surface entry | Both the `src/cold/` bullet and the Phase-1-and-later blanket entry are gone; two behavioural clauses plus two enumerated lists replace them | `grep -n "inside the sealed realm" docs/01-spec/design-system.md` → nothing |
| §7's superseded second reason is corrected | Reason 2 no longer claims the realm is calm throughout; it rests on the display face being barred from data, and states the consequence | diff §7 |
| `.realm-strip` is specified with angle, band width, both palettes and the no-motion requirement | New §5 component: 45°, 14px, `--fill-cyan`/`--fill-pink` on `--fill-ink`, pill; listed under §6 Permanently calm | diff §5, §6 |
| The three conflicting light tokens are resolved in favour of the shipped values with the decision recorded | Note under §3 Surfaces; competing map recorded as superseded | diff §3 |
| dependencies.md and SPEC.md carry a measured artifact size with its provenance rather than an estimate | **Now met (was F1).** `dependencies.md` carries 2,597,939 bytes, `73ce748f…`, and its CI provenance; SPEC restates none of it and links instead | diff both; compare against CI artifact |
| ADR-0009, 0023, 0025, 0028 carry amendment markers pointing at the new records | Status line in each, plus the Status column in `adr/README.md` | diff four files |
| No file under `src/` is modified | — | `git diff --name-only main...HEAD -- src/ scripts/ vendor/` → empty |

## 5. Security impact

Realm boundary, message schema, CSP, vault format, derivation, randomness: **none touched by this PR.** No new `connect-src` host. No message type ships here. ADR-0046 *decides* a future boundary change; **UI.10** implements it.

**What an attacker gains if the decisions recorded here are wrong.**

**ADR-0044 loosens a security-motivated rule** and is the highest-risk item in the PR. The failure mode is credibility loss rather than a vulnerability: a panel that asserts something about security while animating, at the moment a user is deciding whether to believe it. The forbidden column is unchanged in strength, and four mitigations are in place — but it matters which are genuinely new, and revision 1 of this packet overstated that. **The old §6 already made anything reporting boundary state calm regardless of secret presence, and named `.airgap-banner` and `.capability-panel` explicitly.** That protection is carried forward, not invented here. Genuinely new: calm must arrive on the same frame as the plaintext rather than at the end of a transition; the tiebreaker defaults to calm; adjacency binds clause 2 as well as clause 1; and the panic screen is named for the first time. The adjacency symmetry was itself a defect I introduced and corrected on this branch — clause 2 originally lacked it, which would have permitted a tilting hub card immediately beside the airgap guard.

**ADR-0045 contained a boundary error, now fixed (F3).** It stated the vault unlock phrase was entered in the warm realm. It is entered in cold; `vault.open` carries ciphertext only; `architecture.md` states the warm shell never receives a vault passphrase. Nothing was built on the wrong text, but an ADR that misplaces a passphrase is exactly the document from which someone later builds the wrong boundary. The corrected text says what is true and stronger: **the warm shell has no secret input of any kind and gains none here.**

**ADR-0045's substance** reduces seed-entry points from six to one, which I believe is a net improvement over a status quo in which the same phrase is retyped up to six times. It accepts two costs, both stated in the ADR: a secret resides in a session registry for longer than one tool's use, and a multi-secret switcher introduces acting-on-the-wrong-secret as a new failure mode. UI.3 must therefore show the focused fingerprint on any panel that splits, exports or destroys.

**ADR-0046 authorises a warm → cold data flow.** Direction is why it is acceptable: the invariant that matters is that no secret leaves cold, and this moves public data inward. [ADR-0031](../adr/0031-public-registry-mutation-boundary.md) is the precedent. The disclosure it accepts — cold learns the public names of your vaults for a session — is now recorded in [threat-model.md](../../02-security/threat-model.md) under *Not defended*, which is where F5 correctly said it belonged. What it adds is a new *input* path into the sealed realm, so validation quality at UI.10 is where the real risk sits: bounds, wholesale rejection of malformed elements, never rendering a name as HTML, and fail-closed on a missing list are all specified as acceptance criteria rather than left to judgement.

## 6. Test evidence

No new tests: this PR adds records and criteria, not behaviour. The tests the decisions require are acceptance criteria on UI.2–UI.10, because the code they cover does not exist.

**Exact-tip coverage from round 1 CI** — 378/378 tests, both browsers, both operating systems, cross-OS reproducible, upstream vendor bytes verified. That is stronger evidence than anything I could produce and it is the reason F1's discrepancy was caught at all.

**Method note.** Every edit in both revisions was applied by a script asserting exactly one match per anchor and aborting otherwise, so a missed or double-applied replacement fails loudly. Every edited file was asserted CRLF-free before and after writing, per `.gitattributes`.

**What I could not run, and why.** I work through a remote folder bridge that can create and modify files but **cannot delete them**. `npm test` in full, `npm run build`, and the two-build reproducibility check all write and then remove temporary files. I did not run them rather than leave orphans behind — `build/` already holds four such orphans dated 10–12 Aug from earlier remote sessions. **Treat every claim in §3 marked author-run as narrow, and the CI results as the real evidence.**

**F7 is unresolved and is not mine to resolve.** The round-1 reviewer could not resolve `github.com`, so the protocol's reviewer-owned fresh clone under a different path/timezone/locale, and the deliberate-corruption run that must exit non-zero, did not happen. CI covers much of the same ground but the protocol assigns those checks to the reviewer deliberately. **The re-review needs a clone-capable environment**; without one, F7 recurs regardless of the state of this branch.

## 7. Device matrix

**Not applicable.** No rendered surface, bootstrap path, CSP or storage changes; nothing ships to a device. The obligation transfers to UI.2 (wordmark and favicon rendering from `file://`) and UI.5 (shell chrome, breakpoints, touch targets), both marked 🌐.

## 8. Assumptions made

| Assumption | Basis | What breaks if wrong |
|---|---|---|
| Phase UI belongs between P2.7 and P2.8 | Maintainer decision this session: everything after the restructure should be built in the new shell | P2.8 ships in the old layout and is partly redone. Reversible by moving one block |
| Lettered `UI.n` IDs rather than renumbering into `P2.x` | `P2.8` is referenced as "printable cards" by ~15 archived packets; renumbering falsifies that record | A rename is mechanical but archived references need a note |
| Shipped light tokens beat the handoff's map | Already measured against §9; the handoff gave no argument beyond precedence | Visual preference, not correctness. One-line revert |
| Sealed realm stays without the vendored display face | Maintainer decision this session, on the hash-pinned-bytes argument | The sealed hub reads plainer than the mockup. Accepted, recorded in §7 of the design system |
| Bundle target moves 3 MB → 4 MB | The artifact already exceeded the documented estimate; Phases 3–5 are still to land; hard cap unchanged | If 3 MB was a real constraint rather than an estimate, this hides a problem. I judged the reverse: a budget below its own artifact hides more |
| ADR-0045 need not fix the registry's implementation shape | The ADR fixes observable properties — one holder, hard teardown — leaving worker-vs-closure to UI.3 | If the holder's shape is security-relevant, UI.3 needs its own ADR |
| The reviewer's report may be committed by the author when their integration is refused write access | Losing a FAIL to a permissions error is worse than an author transcribing it verbatim under an explicit provenance note | If the transcription is doubted, the reviewing session's own output is the check. I altered nothing |

## 9. What to scrutinise

**The F4 replacement, hardest.** A registry is only better than a count if the categories are right. Check that `seed-entry` is genuinely the only category that must be unique, and that nothing in `vault-auth`, `bip39-passphrase`, `share-input` or `secret-note` is quietly a seed-loading path. If any of them is, the invariant is still wrong — just less obviously.

**ADR-0044's clause 2 and its adjacency provision.** It has to hold in both the ADR and design-system §6, since §6 is normative and the ADR is rationale only.

**ADR-0044 as a whole.** Read it as someone who thinks relaxing a security rule to accommodate a visual design is backwards; that position nearly won. The specific question: is the two-clause test decidable at authoring time, or will it collapse into "everything is chrome until someone complains"?

**ADR-0046's direction argument.** I am confident warm → cold public data is the safe direction and that ADR-0031 is the right precedent. I am less confident that "vault names are already public, so cold learning them costs nothing" is complete — true of the filesystem, but cold is a different trust context and I may be under-thinking a correlation I have not imagined.

**Whether UI.10 belongs where I put it.** It is placed after UI.9 in document order with `Deps: UI.4`, so ordering rests on the dependency line rather than position. If the roadmap's read-top-to-bottom convention should dominate, it is in the wrong place.

**Every claim in §3 marked author-run.** They come from a constrained environment.

## 10. Self-assessment

**What might be wrong.** ADR-0044 may be a decision the project regrets, and no care in the writing changes that it is a loosening. Beyond that: I authored ten roadmap items with acceptance criteria for code I have not written. Round 1 proved that risk is real rather than theoretical — F4 was exactly that failure, an invariant that read well and was false. UI.6 and UI.8 remain the vaguest and I would not defend their criteria as strongly as UI.3's or UI.10's.

**Defects I introduced, and how they were found.** Clause 2's missing adjacency provision and an overstated novelty claim: found by re-reading my own diff, fixed in `ce4bba4`. F1–F6: found by an independent reviewer, fixed here. The ratio is the honest signal — self-review caught the smaller two; the reviewer caught the boundary error, the invalid invariant and the incoherent ADR integration. That is the process working as designed, and it is an argument against trusting a self-review to substitute for it.

**What I did not do that arguably should have been done.**

- Did not run the full suite, build, or reproducibility check (§6). Environmental, and it is why F1 existed: I quoted a local artifact because I could not produce a real one.
- Did not file the bundle-cap CI gate as a roadmap item. F2 permits it as future work; filing it is a roadmap change beyond this item's mandate. **Recommend it be filed.**
- Did not update `architecture.md`'s message inventory or `csp-policy.md` for ADR-0046. Deliberate — no message exists yet, and documenting one that does not exist is how docs start lying. UI.10 owns it and says so explicitly, which is what F5 asked for.

**Known limitations shipping with this change.** Ten roadmap items whose criteria have never met an implementation. Phase UI's ordering is load-bearing and enforced only by document order plus `Deps:` lines. F7 remains open and needs an environment, not an edit.

**Follow-up work this creates.** UI.2–UI.10, filed. The bundle-cap gate, unfiled, recommended. Relocating the stray `CHANGELOG.md` bullets — pre-existing, wants a maintainer decision.

## 11. Bundle impact

**0 bytes**, confirmed empirically rather than argued: round-1 CI at `ce4bba4` produced **2,597,939 bytes** / `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1`, byte-identical to the P2.7 product artifact. No `src/`, `scripts/` or `vendor/` path is touched; `.github/` is not a build input.

Budget status, now canonical in one place: **2,597,939 bytes measured** against a **4 MB target** (raised from 3 MB here) and an unchanged **4.5 MB hard cap**. The estimate this replaced — ≈ 1.7 MB — sat below the artifact that already existed.

## 12. Docs updated

`design-system.md` (§3, §5, §6, §7, §8, §10) · `SPEC.md` (§5.1, platform-constraints table, §16) · `dependencies.md` (bundle budget, relocated help-content measurement) · `threat-model.md` (new *Not defended* subsection) · `ROADMAP.md` (Phase UI, ten items; P2.8 deps) · `adr/README.md` · status lines in ADR-0009, 0023, 0025, 0028 · three new ADRs · `.github/workflows/ci.yml` · `CHANGELOG.md` · this packet · the preserved review report.

**Help content: not applicable.** No user-facing feature ships here, so there is nothing to write at three depths. UI.2 onward will need it.
