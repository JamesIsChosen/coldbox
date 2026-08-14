# PR packet: UI.1 — Design reconciliation

**Branch:** `ui.1-design-reconciliation` · **PR:** #55
**Base:** `main` @ `94cf73b` (Merge PR #54: P2.7 Backup Health dashboard)
**Roadmap item:** [UI.1 Design reconciliation](../ROADMAP.md) — Phase UI
**Date:** 2026-08-14 · **Revision 5** (remediation of the round-3 FAIL at `86685d7`)

---

## 0. Remediation of review round 3

Round 3 returned **FAIL with 4 findings** at `86685d7`, preserved at [`ui.1-design-reconciliation.review-3.md`](ui.1-design-reconciliation.review-3.md). Rounds 1 and 2 are preserved unedited.

| # | Finding | Response |
|---|---|---|
| R3-F1 | ADR-0025/0026 still contained unqualified old naming-model statements | **Fixed.** Round 2 annotated ADR-0025 §2, ADR-0026 §4 and ADR-0026's duplicate-name consequence but missed three more: ADR-0025 §5, ADR-0025's Consequences line on filenames being public metadata, and ADR-0026 §1 itself. All three now carry inline amendment, reversal or retirement notes |
| R3-F2 | The packet was stale against exact-tip CI and current ROADMAP wording — it still read "This revision has not yet been through CI" | **Fixed.** §3 now leads with the reviewer's own fresh-clone run at `86685d7`, §4's bundle row quotes the criterion as it currently reads, and §11 carries the reviewer-confirmed figure |
| R3-F3 | ADR-0046/UI.10 needed an explicit rule preserving the cold-owned name across warm `publicData.replace` | **Fixed, and it was a data-loss bug in waiting.** See below |
| R3-F4 | Reviewer-owned verification | **Mostly closed by the reviewer's own run.** Fresh clone, alternate path, pinned Node, clean gates, reproducibility and both browsers are now demonstrated at this tip. Only the deliberate-corruption check remains, blocked by a runner-side selector bug the reviewer identified as theirs |

### On R3-F3

The finding is exactly right and I had missed it twice. `publicData.replace` is warm's write path into the public compartment, used after any registry mutation. Under ADR-0046 the vault name lives in that compartment and warm does not know it — **so the first time a user edited a label, the replacement payload would have carried no name and the vault's name would have been silently erased.** No existing test would have caught it, because no existing test knows the field exists.

The fix mirrors patterns already in `architecture.md` rather than inventing one. The Vault ID already must remain unchanged across a warm replace; address provenance is already reconciled against cold's own authenticated projection. The name joins that set, as its strictest member:

- **Outbound**, cold omits the name from the projection it hands warm — which is what keeps "vault names do not cross cold → warm" true under this ADR, and is why *projection* rather than *copy* is the accurate word.
- **Inbound**, cold carries its stored name forward when re-encrypting, and a name field present in a replace payload is **rejected with the message failing closed** — not merged, not silently stripped, because warm has no legitimate reason to send one.

UI.10 gains both a positive test (a full registry round-trip leaves the stored name byte-identical) and a negative one (an injected name field is refused).

**Why this kept being missed.** Each round I checked ADR-0046 against the documents it amends, and each round the gap was in a document it *doesn't* amend — first ADR-0026's filename requirement, now `architecture.md`'s write path. Moving a field into the public compartment means auditing every party that writes to the public compartment, and I was auditing every party that reads the name. That is the generalisable lesson and it is worth stating for whoever implements UI.10.

---

## 0b. Remediation of review round 2

Round 2 returned **FAIL with 5 findings** at `53f8ae6`, preserved at [`ui.1-design-reconciliation.review-2.md`](ui.1-design-reconciliation.review-2.md). Round 1's FAIL is preserved unedited at [`ui.1-design-reconciliation.review.md`](ui.1-design-reconciliation.review.md), as the reviewer directed.

**Remediation happened in two passes, and the second one matters.** Commit `14543ff` was written from the reviewer's handoff block, which was all that was available; the review file said so rather than implying it was complete. The **full finding text arrived afterwards** and is now transcribed in place of the handoff-only version. Re-checking `14543ff` against the complete text found that R2-F1 and R2-F4 were fully closed, but **R2-F2 and R2-F3 were only partly closed** — the fuller wording named specific residues the handoff summary did not. Those are fixed here. The lesson is not subtle: a remediation written from a summary of findings closed roughly two-thirds of them, and I would not have known which third was missing without the original text.

**R2-F3 was a structural error, and it is the important one.** Two successive drafts of ADR-0046 proposed something that could not work.

| # | Finding | Response |
|---|---|---|
| R2-F1 | UI.1's bundle criterion contradicted the single-canonical-home design it had just created — it required SPEC to carry a measured size, while the implementation deliberately made SPEC carry none | **Fixed.** The criterion now requires `dependencies.md` to be the single home and SPEC to restate nothing, and is checkable by grep |
| R2-F2 | ADR-0045, UI.4 and CHANGELOG claimed more than the decision removes — "eleven entry points", "no input of their own" | **Fixed, in two passes.** `14543ff` corrected ADR-0045 and CHANGELOG and narrowed UI.4's registry clause, but **left one clause of UI.4 intact — "every migrated tool renders from the focused secret with no input of its own"** — so UI.4 still contradicted itself three clauses later. The full finding named it explicitly. UI.4 now says each migrated tool has no *seed/source-loading* input of its own and may keep the inputs its own job requires |
| R2-F3 | ADR-0046's vault-name lifecycle was structurally incoherent | **Redesigned in `14543ff`, completed here.** The redesign was right but under-specified: the full finding asked for the *complete* lifecycle — creation, duplicate check, filename generation, library bookkeeping, save — and for the amended clauses of ADR-0025 and ADR-0026 to stop asserting the old model in their own bodies. Both are now done. See below |
| R2-F4 | ADR-0046 still credited the rejection of an alternative to ADR-0045 | **Fixed.** The stale attribution is gone and the alternative now carries a note that ADR-0045 says nothing about vault creation |
| R2-F5 | Reviewer environment still could not clone | **Not fixable here.** Open, and it needs an environment rather than an edit |

### On R2-F3

The contradiction: [ADR-0026](../adr/0026-canonical-vault-save-and-live-transfer.md) §1 makes the canonical file `<public-name>--<id8>.cbx` with warm owning saving and the library, so warm needs the name — while [architecture.md](../../01-spec/architecture.md) states that **vault names do not cross cold → warm**, because arbitrary prose cannot be distinguished from a secret by regex. A name typed in cold can never reach warm. Warm cannot name the file without it.

Draft 1 moved naming into cold and ignored the outbound problem. Draft 2 added a warm → cold name-list message, which solved duplicate detection — a downstream symptom — while leaving the contradiction untouched. Both were incoherent, and the second was worse for looking more thorough.

The resolution came from asking why a user-chosen string is in a filename at all. **The name now lives inside the encrypted container, the canonical filename becomes `coldbox--<id8>.cbx`, and the warm picker identifies a vault by `id8` plus a device-local nickname that never leaves warm.** Consequences worth stating plainly:

- **No new message type, in either direction.** Draft 2's inbound list is withdrawn. Cold needs nothing from warm to name a vault; warm needs nothing from cold to list one. The boundary gets simpler than it was before this PR started.
- **It is a privacy improvement.** A name in a filename is disclosed to cloud sync, backup software, file indexers and anyone reading the directory, whether or not the vault is opened. That disclosure is removed.
- **The cost is not attacker-facing.** Pre-unlock the picker shows `id8` and file metadata, so the risk is a user selecting or overwriting the wrong vault — integrity and availability, not confidentiality. The device-local nickname bounds it without moving a byte across the boundary.
- **Duplicate-name refusal is retired, not violated.** ADR-0026 §37 exists to prevent look-alike confusion; the visible discriminator is now `id8`, derived from the authenticated Vault ID rather than user-chosen text, and a name nobody can see cannot be used to confuse anyone.
- **The lifecycle is now stated in full, as a table in ADR-0046**, with an owner per stage: choose and store (cold), duplicate check (retired), filename generation and library and save (warm), read-back and rename (cold), nickname (warm). The finding asked for exactly this, and writing it out is what confirmed the design closes: **warm needs the Vault ID to name a file, and it already receives the Vault ID as the authenticated `publicCompartment.id` in the existing public projection.** There is no channel to add because warm never needed the name — it only appeared to, because the filename convention put one there.
- **The amended clauses now say so in their own bodies**, following this repository's existing convention (ADR-0025 §5 already carries an inline "Amended by ADR-0026" note). ADR-0025 §2, ADR-0026 §4 and ADR-0026's duplicate-name consequence each carry an inline amendment or retirement note, so a reader who lands on the clause is not misled by a status line they may never scroll to.
- **One thing is deliberately left open, with a named owner.** Adding a bounded name field to the public compartment may or may not require a vault-format version bump. UI.10 must determine that against `vault-format.md` and record the reasoning; changing the format silently would be a defect. I did not guess.

**How this got through twice.** Draft 1 was mine. Draft 2 was written while remediating a FAIL, which is exactly when the temptation to patch the cited symptom rather than re-examine the design is strongest — the round-1 reviewer asked me to give ADR-0046 an implementation owner, and I gave it one without asking whether the thing being owned was possible. The maintainer's question about rename support is what surfaced the real answer.

---

## 0c. Remediation of review round 1

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

**Reviewer-owned verification at tip `86685d7` (round 3, run by the reviewer, not by me).** A fresh clone from GitHub into a new temp path with head and base confirmed, on the pinned **Node 24.16.0**: `npm ci` · real-upstream vendor verification · lint, docs and tests · **two builds under different caller timezone and locale** · Chromium and Firefox. Both builds identical at

```
73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1
2,597,939 bytes
```

and the repository clean afterwards. This is the protocol's reviewer-owned fresh-clone check, which rounds 1 and 2 could not perform, and it now exists at the current tip.

**Hosted CI at `ce4bba4` agrees**: 378/378 tests, Windows and Ubuntu builds, cross-OS reproducibility, both browsers — same artifact, same hash. That hash is **identical to the P2.7 product artifact**, which is what independently confirms this PR's zero-byte bundle claim across every revision of it.

**What is not yet verified on the current tip:** the reviewer-owned deliberate-corruption check. Round 3 could not execute it — the runner's corruption-target selector failed to find a tracked `vendor/**/package.tgz` although ten exist, which the reviewer identified as a bug in the runner and explicitly declined to charge against UI.1. It remains the one outstanding protocol check.

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
| `dependencies.md` is the single home for the measured artifact size, target and hard cap, and carries a real measurement with its provenance rather than an estimate, while SPEC restates none of those figures anywhere and links to it instead — a grep for the size, the target or the cap outside `dependencies.md` returns only historical records | **Met.** `dependencies.md` carries 2,597,939 bytes, `73ce748f…` and its provenance; SPEC §5.1, the platform-constraints table and §16 all link rather than restate | `grep -rn "≤ 3 MB\|≤ 4 MB\|2,597,939" docs/ .github/` → matches only in `dependencies.md`, the packet, and archived packets. Reviewer-confirmed measurement at `86685d7` |
| ADR-0009, 0023, 0025, 0028 carry amendment markers pointing at the new records | Status line in each, plus the Status column in `adr/README.md` | diff four files |
| No file under `src/` is modified | — | `git diff --name-only main...HEAD -- src/ scripts/ vendor/` → empty |

## 5. Security impact

Realm boundary, message schema, CSP, vault format, derivation, randomness: **none touched by this PR.** No new `connect-src` host, and — after the R2-F3 redesign — **no future message type is authorised either, in either direction.** ADR-0046 as it now stands adds no protocol surface at all. It does decide a future *vault-format* addition (a bounded name field in the public compartment) whose version-bump question is explicitly left to UI.10 rather than guessed at here.

**What an attacker gains if the decisions recorded here are wrong.**

**ADR-0044 loosens a security-motivated rule** and is the highest-risk item in the PR. The failure mode is credibility loss rather than a vulnerability: a panel that asserts something about security while animating, at the moment a user is deciding whether to believe it. The forbidden column is unchanged in strength, and four mitigations are in place — but it matters which are genuinely new, and revision 1 of this packet overstated that. **The old §6 already made anything reporting boundary state calm regardless of secret presence, and named `.airgap-banner` and `.capability-panel` explicitly.** That protection is carried forward, not invented here. Genuinely new: calm must arrive on the same frame as the plaintext rather than at the end of a transition; the tiebreaker defaults to calm; adjacency binds clause 2 as well as clause 1; and the panic screen is named for the first time. The adjacency symmetry was itself a defect I introduced and corrected on this branch — clause 2 originally lacked it, which would have permitted a tilting hub card immediately beside the airgap guard.

**ADR-0045 contained a boundary error, now fixed (F3).** It stated the vault unlock phrase was entered in the warm realm. It is entered in cold; `vault.open` carries ciphertext only; `architecture.md` states the warm shell never receives a vault passphrase. Nothing was built on the wrong text, but an ADR that misplaces a passphrase is exactly the document from which someone later builds the wrong boundary. The corrected text says what is true and stronger: **the warm shell has no secret input of any kind and gains none here.**

**ADR-0045's substance** reduces seed-entry points from six to one, which I believe is a net improvement over a status quo in which the same phrase is retyped up to six times. It accepts two costs, both stated in the ADR: a secret resides in a session registry for longer than one tool's use, and a multi-secret switcher introduces acting-on-the-wrong-secret as a new failure mode. UI.3 must therefore show the focused fingerprint on any panel that splits, exports or destroys.

**ADR-0046, after R2-F3, reduces exposure rather than adding it.** Both earlier drafts added protocol surface — one moving a name outward through a validator that ADR-0025 had already shown cannot work, one moving a list of names inward. Neither survives. The name now lives inside the encrypted container and no message carries it in either direction, so the invariant that vault names do not cross cold → warm stops depending on a filter and becomes trivially true.

The change is a net privacy gain: a name in a filename is disclosed to cloud sync, backup software, file indexers and anything reading the directory, whether or not the vault is ever opened, and that disclosure is removed. What remains observable is the file's existence, size, modification time and `id8`.

The residual risk is not confidentiality but **integrity and availability**: a picker showing hex strings is a picker in which someone overwrites the wrong vault. The device-local nickname bounds it. If that proves insufficient in real use, the fallback is recorded in ADR-0046's alternatives — leave naming in warm — and it costs no security to take.

The one thing I deliberately did not settle is whether the compartment addition needs a vault-format version bump. UI.10 must determine it against `vault-format.md` and record the reasoning, because a silent format change is a defect and guessing at a format question is exactly what AGENTS.md §4 forbids.

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

**ADR-0046's redesign, hardest — it has now been wrong twice.** The specific things to test it against: does anything else in the repository still assume a user-chosen name is present in a filename or reachable by warm? I checked ADR-0025, ADR-0026 and architecture.md, and amended the first two. If a fourth place exists, this is wrong a third time. Also worth challenging: I retired ADR-0026 §37's duplicate-name refusal on the reasoning that a name nobody can see cannot cause look-alike confusion. If §37 was protecting against something else I have not identified, retiring it is a regression rather than a simplification.

**Whether UI.10 belongs where I put it.** It is placed after UI.9 in document order with `Deps: UI.4`, so ordering rests on the dependency line rather than position. If the roadmap's read-top-to-bottom convention should dominate, it is in the wrong place.

**Every claim in §3 marked author-run.** They come from a constrained environment.

## 10. Self-assessment

**What might be wrong.** ADR-0044 may be a decision the project regrets, and no care in the writing changes that it is a loosening. Beyond that: I authored ten roadmap items with acceptance criteria for code I have not written. Round 1 proved that risk is real rather than theoretical — F4 was exactly that failure, an invariant that read well and was false. UI.6 and UI.8 remain the vaguest and I would not defend their criteria as strongly as UI.3's or UI.10's.

**Defects I introduced, and how they were found.** Clause 2's missing adjacency provision and an overstated novelty claim: found by re-reading my own diff, fixed in `ce4bba4`. F1–F6: found by an independent reviewer, fixed here. The ratio is the honest signal — self-review caught the smaller two; the reviewer caught the boundary error, the invalid invariant and the incoherent ADR integration. That is the process working as designed, and it is an argument against trusting a self-review to substitute for it.

**What I did not do that arguably should have been done.**

- Did not run the full suite, build, or reproducibility check (§6). Environmental, and it is why F1 existed: I quoted a local artifact because I could not produce a real one.
- Did not file the bundle-cap CI gate as a roadmap item. F2 permits it as future work; filing it is a roadmap change beyond this item's mandate. **Recommend it be filed.**
- Did not update `architecture.md`'s message inventory or `csp-policy.md` for ADR-0046 — and after R2-F3 there is nothing to add to either, because the redesign introduces no message. `architecture.md`'s existing statement that vault names do not cross cold → warm remains correct and becomes stronger. UI.10 still owns the `vault-format.md` and `architecture.md` updates that the compartment field does require.
- **Swept for every document assuming a name-bearing filename**, after first writing this bullet as a caveat. It found seven beyond the three I had amended: `quick-start.md`, `SPEC.md`, `vault-format.md`, `threat-model.md`, `testing.md`, `ADR-0013`, and an assertion in `test/p0.19-doc-semantics.test.js`. **None is changed here, deliberately** — ADR-0046 is a decision and UI.10 is the implementation, so until UI.10 ships those documents correctly describe what the product does today. Changing them now would make the docs lie about shipped behaviour. They are instead enumerated by name in UI.10's acceptance criteria so none can be missed, and the test asserts against an *archived packet*, so it must keep passing unchanged rather than being updated.
- **A regression I introduced was caught by an existing test, not by me.** Enumerating the historical filename forms verbatim in UI.10's criteria tripped `test/p0.19-doc-semantics.test.js`, which forbids canonical-filename text near a generation suffix in `ROADMAP.md` — precisely the drift P0.19 fought. Fixed by referencing ADR-0026 §5 rather than restating its list, which is better doc-hygiene anyway. Worth recording because it is the third defect in this branch found by something other than my own review.
- `threat-model.md`'s new section was initially written in the present tense, describing the post-UI.10 filename as though it had shipped. Corrected in the same pass: it now states today's behaviour first, marks the change as decided-not-shipped, and names UI.10 as the item that lands it.

**Known limitations shipping with this change.** Ten roadmap items whose criteria have never met an implementation. Phase UI's ordering is load-bearing and enforced only by document order plus `Deps:` lines. F7 remains open and needs an environment, not an edit.

**Follow-up work this creates.** UI.2–UI.10, filed. The bundle-cap gate, unfiled, recommended. Relocating the stray `CHANGELOG.md` bullets — pre-existing, wants a maintainer decision.

## 11. Bundle impact

**0 bytes**, confirmed empirically rather than argued, and now twice independently: hosted CI at `ce4bba4` and the reviewer's own fresh-clone run at `86685d7` both produced **2,597,939 bytes** / `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1`, byte-identical to the P2.7 product artifact. The reviewer's run built twice under differing caller timezone and locale and got the same hash both times. No `src/`, `scripts/` or `vendor/` path is touched; `.github/` is not a build input.

Budget status, now canonical in one place: **2,597,939 bytes measured** against a **4 MB target** (raised from 3 MB here) and an unchanged **4.5 MB hard cap**. The estimate this replaced — ≈ 1.7 MB — sat below the artifact that already existed.

## 12. Docs updated

`design-system.md` (§3, §5, §6, §7, §8, §10) · `SPEC.md` (§5.1, platform-constraints table, §16) · `dependencies.md` (bundle budget, relocated help-content measurement) · `threat-model.md` (new *Not defended* subsection) · `ROADMAP.md` (Phase UI, ten items; P2.8 deps) · `adr/README.md` · status lines in ADR-0009, 0023, 0025, 0028 · three new ADRs · `.github/workflows/ci.yml` · `CHANGELOG.md` · this packet · the preserved review report.

**Help content: not applicable.** No user-facing feature ships here, so there is nothing to write at three depths. UI.2 onward will need it.
