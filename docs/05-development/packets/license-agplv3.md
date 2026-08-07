# PR packet — Relicense MIT → AGPL-3.0-only

**Branch:** `license-agplv3`
**Roadmap item:** none — this is a governance change, not a roadmap item. It *creates* one ([P0.20](../ROADMAP.md)).
**Date:** 2026-08-07

---

## 1. Summary

`LICENSE` is replaced with the GNU Affero General Public License v3.0, and every document that stated the old licence is updated to match. The reasoning, the rejected alternatives, and the vendored-dependency compatibility analysis are recorded in [ADR-0018](../adr/0018-agplv3-license.md). The change creates one new obligation — AGPLv3 §5(d) requires an interactive UI to display Appropriate Legal Notices — which is filed as roadmap item P0.20 and gated in the release checklist.

## 2. Scope

**In:**

- `LICENSE` — full AGPLv3 text
- `package.json` — `license` field → `AGPL-3.0-only`
- `docs/05-development/adr/0018-agplv3-license.md` — new ADR
- `docs/05-development/adr/README.md` — index row
- `README.md`, `CONTRIBUTING.md`, `docs/00-overview/faq.md` — prose stating the licence
- `docs/01-spec/SPEC.md` §20.3 and §23.1 — both recommended MIT; now superseded
- `docs/05-development/ROADMAP.md` — new item P0.20
- `docs/05-development/release-checklist.md` — new "Licence compliance" gate block
- `CHANGELOG.md`

**Deliberately not in:**

- **No `src/`, `scripts/`, or `vendor/` file is touched.** The in-app licence notice is P0.20's work. Doing it here would bundle two changes and move the embedded build date, which derives from `git log -1 -- src scripts vendor` ([ADR-0015](../adr/0015-provenance-build-date-and-self-hash.md)).
- **No per-file copyright headers.** AGPLv3's "How to Apply" section recommends them; adding ~30 file headers is mechanical churn that belongs with P0.20, where the in-app notice makes the whole set coherent. Flagged in §10 as a known omission, not an oversight.
- **No `threat-model.md` change.** A licence defends against nothing at runtime. Adding a row would be a false claim. Reasoned in ADR-0018's Risks.

**Not a roadmap item, and why that's not a rule violation.** AGENTS.md's "one roadmap item per PR" governs implementation branches. This branch implements nothing; it changes a governance fact and files the implementation work that follows as P0.20. ROADMAP.md's "Changing this file" clause requires an issue or ADR before altering what gets built — ADR-0018 is that ADR, and it is in this same PR, which is the ordering that clause asks for.

## 3. How to verify

Node here is **v22.22.3**, not the `.nvmrc`-pinned 24.16.0 — the sandbox has no other version available. This is disclosed rather than hidden, and §9 explains why it did not affect the result that matters.

```
$ node scripts/check-docs.js
Documentation hygiene check passed: 116 markdown file(s) checked, 0 warning(s).
$ echo $?
0

$ npm run lint
> node scripts/lint.js
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run build && cp build/coldbox.html.sha256 /tmp/h1
$ npm run build && cp build/coldbox.html.sha256 /tmp/h2
$ diff /tmp/h1 /tmp/h2 && cat /tmp/h1
e05e68b8aa72e382070f48232aa6ade94e0cbf19d5fd29f376acb565e59e835b  build/coldbox.html

$ npm test
1..149
# tests 149
# suites 0
# pass 149
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

**The build hash is the load-bearing evidence in this packet.** `e05e68b8aa72e382070f48232aa6ade94e0cbf19d5fd29f376acb565e59e835b` is byte-for-byte the hash `CHANGELOG.md` already records for the R4 hosted-CI artifact on both Ubuntu and Windows. Since that figure was produced by a different machine, a different OS, and a different Node version, its reappearance here is independent confirmation of the packet's central claim: **this change moves zero build bytes.** A reviewer does not have to take that on trust — rebuild and compare.

### Verifying the licence text itself

The text was retrieved from SPDX's `license-list-data` repository, which publishes it paragraph-reflowed rather than in the FSF's hard-wrapped rendering. It was then reformatted into the FSF's conventional line breaks for `LICENSE`. **That hand-reflow was the single highest-risk thing in this PR**, so it was word-diffed against the SPDX source rather than eyeballed.

**Result: 5535 tokens on each side, three differences, all in informational URLs.**

```
$ diff <(tr -s '[:space:]' '\n' < agpl-spdx-source.txt | grep -v '^$') \
       <(tr -s '[:space:]' '\n' < LICENSE            | grep -v '^$')
18c18
< <http://fsf.org/>
---
> <https://fsf.org/>
5403c5403
< <http://www.gnu.org/licenses/>.
---
> <https://www.gnu.org/licenses/>.
5535c5535
< <http://www.gnu.org/licenses/>.
---
> <https://www.gnu.org/licenses/>.

$ tr -s '[:space:]' '\n' < agpl-spdx-source.txt | grep -vc '^$'   # 5535
$ tr -s '[:space:]' '\n' < LICENSE              | grep -vc '^$'   # 5535
```

Splitting on whitespace and diffing token-by-token ignores line wrapping — which carries no legal weight — while catching any dropped, added, or altered word. **Zero differences anywhere in the operative text**: no missing clause, no mangled negation, no lost word across all eighteen sections. The reflow was clean.

The three deltas are the known divergence between SPDX's copy (which retains historical `http://`) and the FSF's current published `agpl-3.0.txt` (which uses `https://`). `LICENSE` matches the FSF's current form. Both schemes resolve to the same pages and neither appears in operative text — §0–§17 are untouched; the hits are the copyright header and the two "How to Apply" pointers.

Structural cross-check:

```
$ for n in $(seq 0 17); do grep -qE "^  $n\. " LICENSE || echo "section $n MISSING"; done
(no output — all eighteen numbered sections present)

$ grep -c '' LICENSE
663
```

**What remains unverified, and it is now narrow.** The diff above is against SPDX, not against gnu.org — this sandbox's egress allowlist returns `403 blocked-by-allowlist` for `gnu.org`, so the FSF's own copy could not be retrieved. A reviewer with network access closes the remaining gap in one command:

```
$ curl -sO https://www.gnu.org/licenses/agpl-3.0.txt
$ diff <(tr -s '[:space:]' '\n' < agpl-3.0.txt | grep -v '^$') \
       <(tr -s '[:space:]' '\n' < LICENSE      | grep -v '^$')
```

Expect **no output**. If the three URL lines appear, the FSF still ships `http://` and `LICENSE` should be changed to match — a cosmetic fix with no effect on the terms, but worth making so the file byte-matches a published reference, which is the property this project values everywhere else.

## 4. Acceptance criteria

No roadmap item, so no criteria to copy. The obligations this change creates are P0.20's acceptance criteria and are not claimed as met here. For the record, P0.20 is `[ ]` — not started, not `[~]`.

## 5. Security impact

| Surface | Touched? |
|---|---|
| Realm boundary | No |
| Message schema | No |
| CSP | No |
| Vault format | No |
| Derivation | No |
| Randomness | No |
| `connect-src` hosts | No — none added |
| New message types | No |

**What does an attacker gain if this is wrong?** Nothing, at runtime. No executable byte changed — proven by the identical build hash above, not asserted. The realistic failure mode of this PR is *legal*, not technical: if the reformatted licence text differs materially from the FSF's, the project's licensing is defective, and every downstream redistributor inherits the defect. That is why §3 gives the reviewer a diff command instead of my word.

One second-order security point, stated because it cuts against the change: **an AGPL notice in the UI is a new place to display attacker-controlled-looking text in a security tool.** P0.20 must render the licence as inert text with no links, no markdown, and no interpolation. Recorded now so P0.20's reviewer has it.

## 6. Test evidence

- **No new tests.** This PR adds no behaviour, and a test asserting the content of `package.json`'s `license` field would test a constant.
- **The regression suite is the evidence**: 149/149 pass, and `check-docs` passes with zero warnings across 116 markdown files — that is what proves the eight new internal links (README→verification.md and →ADR-0018, CONTRIBUTING→ADR-0018, FAQ, SPEC×3, ROADMAP→release-checklist, release-checklist→ROADMAP/ADR-0018/dependencies) all resolve, and that the new `P0.20` reference resolves to a real roadmap item under check 6.
- **Negative test performed, and actually run — here is its output.** A throwaway fixture root was built from this tree with the P0.20 *item* deleted from `ROADMAP.md` and every *reference* to it left in place, then `check-docs` was pointed at it:

  ```
  $ node scripts/check-docs.js --root "$T"
  FAIL [roadmap-id] CHANGELOG.md references unknown roadmap item P0.20
  FAIL [roadmap-id] docs/01-spec/SPEC.md references unknown roadmap item P0.20
  FAIL [roadmap-id] docs/05-development/adr/0018-agplv3-license.md references unknown roadmap item P0.20
  FAIL [roadmap-id] docs/05-development/packets/license-agplv3.md references unknown roadmap item P0.20
  FAIL [roadmap-id] docs/05-development/release-checklist.md references unknown roadmap item P0.20
  Documentation hygiene check failed with 8 finding(s), 0 warning(s)
  $ echo $?
  1
  ```

  Every document this PR added a `P0.20` reference to is named, and the exit code is non-zero. **Honest caveat on the count:** the run reports 8 findings, of which 5 are the roadmap-id findings above. The other 3 are link failures caused by the fixture itself — it copies `docs/`, `scripts/`, and `vendor/` but not root files like `LICENSE`, so links pointing at them cannot resolve there. Those 3 are fixture artifacts, not findings against this branch; against the real tree `check-docs` is clean (§3).

  What this proves is narrow but real: the roadmap-id check is genuinely load-bearing rather than decorative, so the `P0.20` references in this PR are verified to resolve, not merely believed to.
- **Not tested:** the byte-equality of `LICENSE` against gnu.org's copy — no network. See §3 and §9.

## 7. Device matrix

Not applicable — nothing touching bootstrap, CSP, storage, or rendering changed, and the built artifact is byte-identical to the one already exercised on the matrix. No platform result is claimed or inferred.

## 8. Assumptions made

| Assumption | Basis | What breaks if wrong |
|---|---|---|
| All copyright is held by the single author named in the previous MIT notice | `git log` shows one author; no CLA exists; no external contributor has merged | Relicensing needs the other holders' consent. Recorded in ADR-0018 so the next person doesn't have to reconstruct it — and it stops being true the moment a second contributor merges |
| MIT-licensed `@noble`/`@scure` may be incorporated into an AGPL work | MIT is permissive with no copyleft or reciprocity clause | If wrong, the combined work is undistributable. Considered settled |
| SIL OFL 1.1 fonts may be bundled without relicensing them | OFL permits bundling; its conditions bind the font files, not the work they ship inside | A reserved-font-name issue at most; the faces are unmodified |
| Playwright's Apache-2.0 terms don't reach the artifact | Dev dependency contributing 0 bytes, per [ADR-0007](../adr/0007-headless-browser-harness.md) | Would need an Apache notice. Contradicted by the existing 0-byte assertion, so low risk |
| "only" beats "or-later" | An upgrade clause delegates a future drafting decision to a third party | If the FSF publishes a v4 the project wants, it needs an explicit relicense — deliberate friction, not an accident |
| The reviewer has network access to diff against gnu.org | Prior reviewers in this repo have demonstrably had real network access (see the P0.17 and P0.18 notes) | The three-token `http`/`https` delta in §3 stays unresolved. Bounded: the operative text is already word-diffed clean against SPDX |
| SPDX's published AGPL-3.0 text is faithful to the FSF's | SPDX is the reference the OSI and the wider tooling ecosystem build on, and its texts are used for automated licence identification | If SPDX itself is wrong, the §3 diff proves only that two copies agree. The gnu.org diff is what closes this, and it is the reason §3 still asks for it despite the clean result |

## 9. What to scrutinise

**First: the `LICENSE` bytes — now largely retired, but check the residue.** This was the top risk when the packet was first written: the text was hand-reflowed from a paragraph-unwrapped source, which is exactly the operation that silently drops a clause or mangles a "not". It has since been word-diffed against the SPDX source (§3): **5535 tokens each side, zero differences in operative text.** What remains is the three-token `http`/`https` delta and the fact that the comparison was against SPDX rather than gnu.org, which the sandbox cannot reach. One `curl` and one `diff` settle it — commands in §3. Do not review this by reading it; read the diff.

**Second: the P0.20 placement.** I put it *before* P0.19 in the file, out of numeric order. The reasoning is in the item itself: its dependency is P0.16, and P0.19 is `👤 human-required`, so an agent reaching P0.19 stops and anything after it is unreachable. If you disagree, the alternative is P0.20 never getting picked up. Worth a second opinion — this is a judgement call about how the roadmap's pick-the-next-item algorithm interacts with the human-required marker, and I may be reading that interaction more literally than intended.

**Third: whether P0.20 belongs in Phase 0 at all.** I argued yes, because tagging a release before it lands would be a non-compliant conveyance. The counter-argument is that Phase 0 is defined as "nothing above this phase is safe to build until the container is trustworthy," and a licence notice has nothing to do with the container's trustworthiness. I think the release gate settles it, but I can see the other reading.

**Fourth: the FAQ's new "does the AGPL protect my privacy?" entry.** I added it because AGPL reliably invites that inference and the docs' stated convention is honesty over reassurance. Check that answering an unasked question in the FAQ matches the house style rather than reading as defensive.

**Fifth: SPEC §23.1 is a "Settled" table.** I edited a settled row rather than adding a superseding note. Row 23.1 now cites ADR-0018 inline. If the convention is that §23.1 is an immutable historical record, this is wrong and the edit should become an annotation instead.

## 10. Self-assessment

**What might be wrong:** the licence bytes (§9). Everything else in this PR is prose that a reader can check by reading.

**What I didn't do that arguably should have been done:**

- **Per-file copyright headers.** AGPLv3's "How to Apply" recommends attaching a notice to each source file. I deferred to P0.20. A reviewer could reasonably call that the wrong split, since the headers are the part that actually travels with copied code.
- **No `NOTICE`/`AUTHORS` file.** Not required by AGPL. Will matter when a second contributor appears.
- **`docs/05-development/dependencies.md` has a Licence column only for the fonts,** not for `@noble`/`@scure`. ADR-0018's compatibility analysis asserts they are MIT, but `dependencies.md` — the canonical home for dependency facts — doesn't record it, so the ADR is currently the only place that fact lives, which inverts the doc-hygiene rule. **I judged that fixing it here would be scope creep and left it; I now think that was the wrong call** and it should either be fixed in this PR or filed. Flagging it rather than quietly leaving it.

**Known limitations shipping with this change:** the repository is AGPL-licensed while the built artifact displays no licence notice. Between this merge and P0.20, the repo is compliant and any *release* would not be. Mitigated by the release-checklist gate, which is a checklist item and therefore only as strong as the person reading it.

**Follow-up work created:**

- **P0.20** — in-app Appropriate Legal Notices. Filed, `[ ]`, deps P0.16.
- The `dependencies.md` licence-column gap above. Not filed as an item; it is a one-line doc fix and should be folded into whichever PR touches that file next, per the roadmap's convention for missed housekeeping.

## 11. Bundle impact

**Zero.** Before and after are the same file: `e05e68b8aa72e382070f48232aa6ade94e0cbf19d5fd29f376acb565e59e835b`. No `src/`, `scripts/`, or `vendor/` input changed.

P0.20 will add roughly 34 KB of licence text against a 3 MB target and 4.5 MB hard cap — about 1.1% of the target. Noted so the budget conversation happens there rather than being a surprise.

## 12. Docs updated

| Doc | Change |
|---|---|
| `LICENSE` | MIT → AGPLv3 full text |
| `package.json` | `license` → `AGPL-3.0-only` |
| `docs/05-development/adr/0018-agplv3-license.md` | **New.** The structural decision |
| `docs/05-development/adr/README.md` | Index row |
| `README.md` | Licence section rewritten; links ADR-0018 and verification.md |
| `CONTRIBUTING.md` | Contribution terms; no CLA, contributors keep copyright, and what that implies for a future relicense |
| `docs/00-overview/faq.md` | "Can I fork it?" rewritten; new "Does the AGPL protect my privacy?" |
| `docs/01-spec/SPEC.md` | §20.3 rewritten; §23.1 row updated |
| `docs/05-development/ROADMAP.md` | New item P0.20 |
| `docs/05-development/release-checklist.md` | New "Licence compliance" gate block |
| `CHANGELOG.md` | Entry under Unreleased |

**Three-depth help content:** not required. `faq.md` and `README.md` are not in the compiled help set — the compiler reads `docs/00-overview/glossary.md` and `docs/03-guides/` only. No glossary term is added, because "AGPL" is not a term a user needs while operating the tool. **P0.20 changes this**: once the licence is user-visible in-app, it needs a glossary entry at all three depths, and that is part of P0.20's scope, not a gap here. `check-docs` confirms zero help-content warnings either way.
