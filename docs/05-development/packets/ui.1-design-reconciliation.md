# PR packet: UI.1 — Design reconciliation

**Branch:** `ui.1-design-reconciliation`
**Base:** `main` @ `94cf73b` (Merge PR #54: P2.7 Backup Health dashboard)
**Roadmap item:** [UI.1 Design reconciliation](../ROADMAP.md) — Phase UI
**Date:** 2026-08-14

---

## 1. Summary

Makes the August 2026 sealed-realm reorganisation legal to build. It lands three ADRs, rewrites the calm rule from realm-scoped to panel-scoped, adds `.realm-strip` as a named component, resolves a light-mode token conflict, corrects a bundle figure that had fallen below the artifact it described, and inserts Phase UI into the roadmap so everything from P2.8 onward is built once, in the new interface. **No file under `src/` is touched and no application behaviour changes.**

## 2. Scope

**In:**

- `docs/05-development/adr/0044-panel-scoped-calm-rule.md` (new)
- `docs/05-development/adr/0045-released-secret-model.md` (new)
- `docs/05-development/adr/0046-vault-name-availability-at-unlock.md` (new)
- `docs/05-development/adr/README.md` — index rows, amendment markers on 0009/0023/0025/0028
- `docs/05-development/adr/{0009,0023,0025,0028}-*.md` — status lines only
- `docs/01-spec/design-system.md` — §3 note, §5 `.realm-strip`, §6 rewrite, §7 correction, §8 pointer, §10 checklist
- `docs/01-spec/SPEC.md` — two stale size figures
- `docs/05-development/dependencies.md` — bundle budget
- `docs/05-development/ROADMAP.md` — Phase UI (nine items), P2.8 dependency
- `CHANGELOG.md`
- this packet

**Deliberately not in:**

- **Any `src/` change.** The interface work is UI.2–UI.9. This PR only makes it legal.
- **The logo and favicons.** The maintainer supplied `coldbox-logo.png` and three favicon PNGs during this session. They are a `src/` change, so they are UI.2, and the traced asset is not committed here. Its provenance and the exact `potrace` invocation are recorded in UI.2's roadmap entry so the trace is reproducible rather than a mystery binary.
- **Untangling the SPEC §16 / dependencies.md duplicated component table.** Both restate the same estimates and that is a genuine doc-hygiene defect, but it predates this PR and fixing it properly means deciding which one is canonical for the per-component breakdown. I corrected only the contradiction my change would otherwise have created — the totals — and pointed SPEC at dependencies.md for the figure. Flagged in §10.
- **The two stray bullets at the top of `CHANGELOG.md`**, above the file's own intro paragraph. They describe P0.19/ADR-0026 work and appear to have been prepended to the wrong position in an earlier PR. Pre-existing, not mine to relocate silently. Flagged in §10.

## 3. How to verify

Run from the branch tip. Note §6 for what I could not run and why.

```
$ node scripts/lint.js
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ node scripts/check-docs.js
Documentation hygiene check passed: 212 markdown file(s) checked, 0 warning(s).

$ node --test --test-concurrency=1 test/check-docs.test.js test/lint.test.js test/accessibility.test.js
1..23
# tests 23
# suites 0
# pass 23
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5421.714125
```

**The build output is unchanged by this PR, and that is checkable rather than asserted.** `scripts/build.js` scopes its build-date git query to `BUILD_DATE_SOURCE_PATHS = ['src', 'scripts', 'vendor']` (build.js:127), specifically so that governance-only commits do not move the artifact. This PR touches none of those three paths. Help content compiles from `docs/00-overview/glossary.md` and `docs/03-guides/*.md` only (help-content.js:513–514); neither is touched. So:

```
$ git stash && npm run build && shasum -a 256 build/coldbox.html
$ git stash pop && rm -rf build && npm run build && shasum -a 256 build/coldbox.html
# expected: identical hashes, before and after this PR
```

## 4. Acceptance criteria

Copied verbatim from the roadmap item, semicolon-separated clauses split into rows.

| Criterion | How satisfied | Test |
|---|---|---|
| ADR-0044, ADR-0045 and ADR-0046 exist, are indexed, and are linked from every document whose behaviour they change | Three new files; three index rows in `adr/README.md`; linked from design-system.md §6 and §7, from ROADMAP Phase UI, and from CHANGELOG | `check-docs.js` (link integrity, 0 warnings) |
| §6 no longer contains a realm-scoped surface entry | The bullet `Everything inside the sealed realm (src/cold/)` and the Phase-1-and-later blanket entry are both gone; the section is now two behavioural clauses plus two enumerated lists | Manual — `grep -n "inside the sealed realm" docs/01-spec/design-system.md` returns nothing |
| §7's superseded second reason is corrected | Reason 2 no longer claims the realm is "a calm surface throughout"; it now rests on the display face being barred from data, and states the consequence that the sealed hub reads plainer | Manual, diff §7 |
| `.realm-strip` is specified with angle, band width, both palettes and the no-motion requirement | New §5 component: 45°, 14px, `--fill-cyan`/`--fill-pink` on `--fill-ink`, pill treatment, and listed under §6 Permanently calm | Manual, diff §5 and §6 |
| The three conflicting light tokens are resolved in favour of the shipped values with the decision recorded | Note under §3 Surfaces: `--bg`, `--bg-dot`, `--surface-soft` keep shipped values; the competing map is recorded as superseded | Manual, diff §3 |
| dependencies.md and SPEC.md carry a measured artifact size with its provenance rather than an estimate | dependencies.md carries bytes, SHA-256, build time and the caveat that it predates `94cf73b`; SPEC §3 and §16 stop restating a total and link to it | Manual, diff both |
| ADR-0009, ADR-0023, ADR-0025 and ADR-0028 carry amendment markers pointing at the new records | Status line in each file, plus the Status column in `adr/README.md` | Manual, diff four files |
| No file under `src/` is modified | — | `git diff --name-only main...HEAD -- src/` returns empty |

## 5. Security impact

| Area | Touched? |
|---|---|
| Realm boundary | **Not by this PR.** ADR-0046 *decides* a future boundary change; UI.3/UI.4 implement it |
| Message schema | Not by this PR — no schema file changed |
| CSP | No |
| Vault format | No |
| Derivation | No |
| Randomness | No |

No new `connect-src` host. No new message type ships here.

**What an attacker gains if the decisions recorded here are wrong** — this is the honest risk, and it is a design risk rather than an implementation one:

**ADR-0044 loosens a security-motivated rule.** It is the one change in this PR that could make the product worse. The failure mode is not a vulnerability but a credibility loss: if the panel/realm boundary is drawn wrongly by an implementer, a panel that asserts something about security could animate while making that assertion, at the moment a user is deciding whether to believe it. The forbidden column is unchanged in strength, and four mitigations are in place — but it matters which of them are actually new, and an earlier draft of this packet overstated that. **The old §6 already made anything reporting boundary state calm regardless of whether a secret was on screen, and named `.airgap-banner` and `.capability-panel` explicitly.** That protection is carried forward, not invented here. What this decision genuinely adds is narrower: calm must arrive on the same frame as the plaintext rather than at the end of a transition; the tiebreaker defaults to calm where the clauses are ambiguous; adjacency binds clause 2 as well as clause 1; and the panic screen is named for the first time.

I still consider this the highest-risk item in the PR and it should get the most reviewer attention.

**ADR-0046 adds a warm → cold data flow.** Nothing crosses in this PR, but the decision authorises it. Direction is the reason it is acceptable: the invariant that matters is that no secret leaves cold, and this moves public data inward. [ADR-0031](../adr/0031-public-registry-mutation-boundary.md) already established typed warm-to-cold public data, so the shape has precedent. The disclosure it accepts is real and I stated it in the ADR rather than burying it: **cold learns the public names of the user's vaults for the duration of a session.** If I am wrong about that being acceptable, the cost is that a compromised cold document knows vault names it previously did not — names that are already visible in filenames on disk to anything that can read the directory. Fail-closed on a missing or malformed list is specified.

**ADR-0045 reduces secret-entry points from eleven to one**, which I believe is a net security improvement rather than a neutral reorganisation, since retyping a seed into one of six fields is a live misuse surface today. The risk it introduces is that a session-scoped registry is a single place where a secret sits for longer than one tool's use. Teardown on lock/idle/panic/realm-teardown is specified, and asserted by required tests, precisely because that is the property the model stands on.

## 6. Test evidence

No new tests. This PR adds no behaviour to test; it adds records and criteria. The tests that the decisions *require* are enumerated as acceptance criteria on UI.3–UI.9 rather than written here, because the code they test does not exist yet.

**Existing coverage re-run:** `check-docs.test.js`, `lint.test.js`, `accessibility.test.js` — 23/23 pass, output in §3. `accessibility.test.js` is the relevant one for a design-system change: it enforces the `--faint` contrast floors, and the light-token decision was to keep the shipped values, so the measured figures in §9 remain correct and untouched.

**Negative check performed:** every edit in this PR was applied by a script that asserts exactly one match for each anchor string and aborts otherwise, so a silently-missed or double-applied replacement fails loudly rather than producing a half-edited document. Every edited file was re-read and asserted CRLF-free before and after writing, per `.gitattributes`.

**What I could not run, and why.** I worked through a remote folder bridge that can create and modify files but **cannot delete them**. `npm test` in full, `npm run build`, and the two-build reproducibility check all write and then remove temporary files; `scripts/build.js` writes `build/coldbox.html.tmp-<pid>-<rand>` and renames it. I did not run them rather than leave orphaned temp files behind — `build/` already contains four such orphans dated 10–12 Aug, which I believe were produced by exactly this failure in earlier remote sessions. **The full suite, the build, and the reproducibility check are therefore unverified by me and must be run by the reviewer.** The argument in §3 for why the artifact cannot change is a code-reading argument, not a measurement; treat it as a claim to check, not evidence.

## 7. Device matrix

**Not applicable.** This PR changes no rendered surface, no bootstrap path, no CSP and no storage. Nothing ships to a device.

The device-matrix obligation transfers to UI.2 (favicon and wordmark rendering from `file://`) and UI.5 (shell chrome, breakpoints, touch targets), both of which are marked 🌐 in the roadmap.

## 8. Assumptions made

| Assumption | Basis | What breaks if wrong |
|---|---|---|
| Phase UI belongs between P2.7 and P2.8 rather than after Phase 2 | Maintainer decision, this session: everything after the restructure should be built in the new shell, so P2.8 waits | If wrong, P2.8 ships in the old layout and is partly redone. Reversible by moving one roadmap block |
| Lettered `UI.n` IDs rather than renumbering into `P2.x` | `P2.8` is referenced as "printable cards" by ~15 archived packets and review reports; renumbering falsifies that record | If the maintainer prefers numeric IDs, the rename is mechanical but the archived references need a note |
| The shipped light tokens win over the handoff's map | They are already measured against §9 and the handoff gave no argument for the cooler set beyond precedence | A visual preference, not a correctness question. One-line revert |
| The sealed realm stays without the vendored display face | Maintainer decision, this session, on the hash-pinned-bytes argument | The sealed hub reads plainer than the mockup. Accepted and recorded in §7 |
| Bundle target moves 3 MB → 4 MB | The artifact already exceeds the documented estimate; Phases 3–5 are still to land; 4.5 MB hard cap unchanged | If 3 MB was a real constraint rather than an estimate, this hides a problem instead of surfacing it. I judged the reverse — a budget below its own artifact hides more |
| ADR-0045's registry does not need a specified implementation shape | The ADR fixes the observable properties — one holder, hard teardown — and leaves worker-vs-closure to UI.3 | If the holder's shape turns out to be security-relevant (e.g. worker isolation matters), UI.3 needs its own ADR |

## 9. What to scrutinise

**ADR-0044's clause 2, and my own correction to it.** The first version of this branch attached the adjacency provision to clause 1 only, which would have permitted a tilting hub card immediately beside the airgap guard. I caught it on re-read and fixed it in commit 4 rather than leaving it for you. Check that the fix is complete — the provision has to hold in both the ADR and design-system.md §6, since §6 is the normative home and the ADR is only the rationale.

**ADR-0044, hardest.** Read it as someone who thinks relaxing a security rule to accommodate a visual design is exactly backwards, because that is a reasonable position and it nearly won. The specific question worth asking: is the two-clause test actually decidable by an implementer at authoring time, or will it collapse into "everything is chrome until someone complains"? If you think it will, that is a finding and I would rather hear it now than after forty surfaces are built on it.

**The §6 rewrite against the old §6, clause by clause.** I claim nothing in the forbidden column was weakened and that the permanence carve-out is strictly new protection. Check that claim directly rather than taking it — the old text is in `git show main:docs/01-spec/design-system.md`.

**ADR-0046's direction argument.** I am confident that warm → cold public data is the safe direction and that ADR-0031 is the right precedent. I am less confident that "vault names are already public, so cold learning them costs nothing" is complete — it is true of the filesystem, but cold is a different trust context and I may be under-thinking a correlation attack I have not imagined.

**Roadmap acceptance criteria for UI.3 and UI.4.** These are the criteria a future agent will be held to, and criteria that cannot be verified are a FAIL under the review protocol. I wrote UI.4's "exactly two secret-entry points exist across `src/`" as a test rather than a convention specifically so it is checkable — but check that the two legitimate entry points are correctly identified, because if there is a third legitimate one I have not found, that test will block UI.4 for a wrong reason.

**§3's reproducibility argument.** It is a code-reading claim, not a measurement, and it is the only claim in this packet with no output pasted under it.

## 10. Self-assessment

**A defect I introduced and corrected on this branch.** Clause 2 of ADR-0044 originally lacked the adjacency provision that clause 1 had, which was a real if small weakening — it would have allowed a lively panel directly beside a boundary-reporting one. Fixed in commit 4, along with an overstated novelty claim in §5 of this packet and in the CHANGELOG. Both were found by re-reading my own diff against the review protocol rather than by a reviewer, which is the process working, but they were mine and they were in a security-relevant document.

**What might be wrong.** The single largest risk is that ADR-0044 is a decision the project will regret, and no amount of care in how I wrote it changes that it is a loosening. Second: I authored nine roadmap items with acceptance criteria for code I have not written, and criteria written that far ahead of implementation tend to be either too vague to bind or too specific to survive contact. UI.6 and UI.8 are the vaguest and I would not defend their criteria as strongly as UI.3's.

**What I did not do that arguably should have been done.**

- Did not run the full test suite, the build, or the reproducibility check (§6). This is the biggest gap in the packet and it is environmental, not a choice about effort.
- Did not reconcile the duplicated component table between SPEC §16 and dependencies.md. I fixed the contradiction and left the duplication, which is a doc-hygiene violation left standing.
- Did not update `docs/01-spec/architecture.md` or `csp-policy.md` for ADR-0046. Deliberate — no message exists yet, and documenting a message that does not exist is how docs start lying. UI.3/UI.4 own that update and ADR-0046 says so. A reviewer may reasonably disagree and want the inventory to carry a "planned" row.
- Did not measure the artifact myself; the figure in dependencies.md is read from an artifact built 2026-08-14 18:54 UTC, which predates `94cf73b`. It is labelled as a floor, not a current figure.

**Known limitations shipping with this change.** The roadmap now contains nine items whose acceptance criteria have never been tested against a real implementation. Phase UI's ordering is load-bearing and nothing enforces it beyond document order and the `Deps:` lines.

**Follow-up work this creates.**

- UI.2–UI.9, filed in the roadmap.
- Making the bundle hard cap a failing CI gate rather than a reported number. Noted in `dependencies.md`; **not filed as a roadmap item** because adding one is a roadmap change and I had one item's mandate. Recommend it be filed.
- Relocating the two stray `CHANGELOG.md` bullets and de-duplicating the SPEC §16 table. Both pre-existing; both want a maintainer decision rather than a silent fix.

## 11. Bundle impact

**0 bytes.** No `src/`, `scripts/` or `vendor/` path is touched, so by build.js:127 the build date does not move and no build input changes. Help content compiles only from `glossary.md` and `docs/03-guides/*.md`, neither touched.

Budget status recorded for the first time as a measurement rather than an estimate: **2,597,956 bytes measured** against a **4 MB target** (raised from 3 MB in this PR) and an unchanged **4.5 MB hard cap**. The documented estimate this replaces — ≈ 1.7 MB — was below the artifact that already existed.

## 12. Docs updated

`design-system.md` (§3, §5, §6, §7, §8, §10) · `SPEC.md` (§3 file table, §16) · `dependencies.md` (bundle budget) · `ROADMAP.md` (Phase UI, P2.8 deps) · `adr/README.md` · `adr/0009`, `adr/0023`, `adr/0025`, `adr/0028` status lines · three new ADRs · `CHANGELOG.md` · this packet.

**Help content: not applicable.** No user-facing feature ships here, so there is nothing to write at three depths. UI.2 onward will need it.
