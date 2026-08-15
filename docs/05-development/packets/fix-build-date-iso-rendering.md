# PR packet — Fix: the embedded build date's spelling depended on the builder's git version

**Branch:** `fix-build-date-iso-rendering` · **Base:** `main`
**Roadmap item:** none — this is a defect fix, not a roadmap item. See §8.
**Author:** agent session, 2026-08-15

---

## 1. Summary

`scripts/build.js` embedded whatever string `git log --format=%cI` returned, and git versions
disagree on how to spell a zero UTC offset — `+00:00` on git 2.43.0, `Z` on newer git. Same
commit, same instant, five bytes of difference in `build/coldbox.html`, so the artifact's size
and hash depended on which git the builder had installed. This asks git only for values that
have no rendering to disagree about and formats the string in a new `scripts/build-date.js`.
**The fix is byte-neutral on all existing history**: `main` still builds to `73ce748f…` at
2,597,939 bytes.

---

## 2. Scope

**In:** `scripts/build-date.js` (new, 84 lines), `readBuildCommitDate()` in `scripts/build.js`,
`scripts/lint.js` (one line — the new build module joins the tooling syntax-check list, matching
how `crypto-bundle.js`/`font-bundle.js`/`help-content.js` are treated), `test/build-date.test.js`
(new, 6 tests), two rewritten assertions in `test/provenance.test.js`, ADR-0015 amendment,
`build.md` step 7, CHANGELOG.

**Deliberately not in:** no change to which commit the date comes from — the 2026-08-06
amendment's decision is untouched. No change to the CSP, realm boundary, message schema, vault
format, derivation, or randomness. No change to the self-hash mechanism. Nothing under `src/`.

**Relationship to UI.2.** This was found while verifying
[PR #56](https://github.com/JamesIsChosen/coldbox/pull/56) (UI.2 brand assets), whose author
built at UTC in a container and whose reviewer built on Windows, producing two different hashes
for the identical commit. **It is not UI.2's defect** — it is reachable from any UTC commit and
predates that branch. Split into its own PR per AGENTS.md §6a rather than bundled. UI.2 rebases
onto this once merged, and its packet's recorded hash is regenerated afterwards.

---

## 3. How to verify

Environment: Node v24.16.0, git 2.43.0, Linux x64.

### The defect, reproduced from the commit object alone

```
$ git cat-file commit ea0a76d | grep committer
committer Claude (agent) <noreply@anthropic.com> 1786767525 +0000

$ git --version
git version 2.43.0
$ git log -1 --format=%cI ea0a76d
2026-08-15T04:18:45+00:00          # 25 characters
```

The same commit object, read by the newer git on the maintainer's Windows machine, returned
`2026-08-15T04:18:45Z` — 20 characters. The two builds of that identical commit measured
**2,622,481** and **2,622,476** bytes: a five-byte difference, exactly the difference between the
two spellings, with two different SHA-256 hashes.

### The fix is byte-neutral on existing history

This is the load-bearing check. `main`'s product tip is at `-07:00`, which both git versions
spell identically, so a correct fix must leave `main`'s artifact untouched:

```
$ git checkout main && npm run build && sha256sum build/coldbox.html && wc -c build/coldbox.html
73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1  build/coldbox.html
2597939 build/coldbox.html

$ git checkout fix-build-date-iso-rendering && rm -rf build && npm run build && sha256sum build/coldbox.html && wc -c build/coldbox.html
73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1  build/coldbox.html
2597939 build/coldbox.html

$ grep -o 'PROVENANCE_BUILD_DATE = "[^"]*"' build/coldbox.html
PROVENANCE_BUILD_DATE = "2026-08-14T11:28:26-07:00"
```

Identical hash and identical byte count before and after the change, and both match the figure
[dependencies.md](../dependencies.md#bundle-budget) records from a real two-OS CI run. **This is
the strongest single claim in the packet**: it demonstrates the fix changes nothing except the
case that was broken. Note that the branch's own source changes (`scripts/build.js`,
`scripts/build-date.js`, `scripts/lint.js`) are all under `BUILD_DATE_SOURCE_PATHS`, so this
hash holds only until the branch is committed — see the caveat in §9.

```
$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 220 markdown file(s) checked, 0 warning(s).

$ npm test
ℹ tests 384
ℹ pass 384
ℹ fail 0
```

378 before, 384 after: the 6 new tests in `test/build-date.test.js`.

### A reviewer on a different git version

The most useful thing a reviewer can do here is run `npm test` on a git that renders `Z`. On
`main` today, `test/provenance.test.js`'s build-date assertions pass on either git only because
this repository has no UTC commit; on this branch they are pinned to the canonical spelling and
`test/build-date.test.js` creates a real UTC commit and asserts the outcome directly, so a
newer git exercises the actual fix rather than agreeing with itself.

---

## 4. Acceptance criteria

No roadmap item, so no criteria to copy. The properties this claims, and what proves each:

| Property | Test |
|---|---|
| A UTC commit embeds `+00:00`, never `Z` | `build-date.test.js` "a UTC commit always embeds +00:00 and never Z, whatever this git version spells it" |
| Non-UTC commits are spelled exactly as git spells them, so existing history is byte-neutral | "the build date agrees with git for every non-UTC offset" — six real commits at `-07:00`, `+01:00`, `+05:30`, `+14:00`, `-11:00`, `-03:30`, each compared against git's own `%cI` |
| `main` rebuilds to its recorded CI artifact | §3, byte-for-byte, hash and size |
| The embedded value is locale- and timezone-independent | "the formatter is independent of the caller locale and timezone" (four zones, two locales) |
| Malformed git output degrades visibly instead of guessing | "unparseable git output degrades to the labeled unknown" — 12 inputs including `undefined`, `null`, a number, and a plausible-but-wrong shape |
| An impossible offset or instant is refused | "an out-of-range offset or an unrepresentable instant is refused, not rounded" |
| The whole path works end to end, not just the unit | "a real build of a UTC product commit embeds +00:00, end to end" — synthetic repo, real `build.js`, asserts the embedded value |

---

## 5. Security impact

| Surface | Touched? |
|---|---|
| Realm boundary, message schema, CSP, vault format, derivation, randomness | No — none of them |

The build date is informational and explicitly not a security boundary (ADR-0015). But the
property that *broke* is one: **reproducible builds are how a user checks that the file they
have is the file the source produces.** With this defect, an honest reviewer rebuilding an
honest commit could get a different hash and have no way to tell that from tampering — and,
worse, could learn to dismiss hash mismatches as environmental noise. That is the real damage,
and it is a trust-model failure rather than a cosmetic one.

**What an attacker gains if this fix is wrong:** nothing directly. A wrong formatter produces a
wrong or `unknown` date in the provenance panel, which is visible and inert. The risk is the
inverse — that the fix is *incomplete* and some other version-dependent input still varies,
leaving the reproducibility claim overstated in a way that is now documented as fixed.

**Honest uncertainty:** I found this one because two machines happened to build the same commit.
I have not audited the rest of the build for other environment-dependent inputs, and I would not
claim there are none. §9 says where I would look.

---

## 6. Test evidence

**6 new tests.** The vectors are not hand-written: `commitAt()` creates a real repository, makes
a real commit at a requested offset, and returns both the machine values the build reads and
git's own `%cI` rendering. So "our formatter agrees with git" is checked against git, not against
my belief about git.

**Negative tests.** 12 malformed git outputs must all produce the labeled unknown — including
`'1786767525 Z'` and `'1786767525 2026-08-15T04:18:45 +0000'`, which are close enough to the real
shape to slip past a loose parser. Five out-of-range inputs must return `null` rather than a
rounded or wrapped date.

**Deliberately broken, and how it failed.** My first implementation asked for `--format=%ct %cz`.
`%cz` is not a git placeholder — git emitted the literal text `%cz`, the strict parse rejected
it, and the build fell through to `unknown (no git commit metadata available)`, producing a
2,597,956-byte artifact. That is a 17-byte increase over the correct 2,597,939, and it is the
same figure `dependencies.md` records as a *superseded estimate* that once sat in the budget —
i.e. that stale number was itself produced by a build with no git metadata. The failure was
caught by the byte-neutrality check in §3 within one build, which is the argument for that check
existing: a silent degradation to `unknown` is exactly the kind of thing a formatter change can
cause, and it is invisible unless something compares against a known-good artifact.

**Two existing assertions rewritten**, both in `test/provenance.test.js`. Both compared the
embedded date against `git log --format=%cI`. With the fix in place they would compare `+00:00`
against `Z` on a newer git and fail — not because the product was wrong, but because the test
deferred to the very string the fix removes. One now re-derives independently from `%ct` plus the
numeric offset, written out longhand rather than importing `scripts/build-date.js` so it stays an
independent reimplementation of the contract. The other pins the expected value for its synthetic
2020 UTC commit.

**What I could not test:** I do not have a newer git in this environment, so I never observed the
`Z` rendering myself — the evidence for it is the maintainer's build output on Windows (a 5-byte
smaller artifact, a different hash) and the commit object being identical. I also did not
establish which git version changed the behaviour; a web search did not settle it, and I have not
asserted a version boundary anywhere in the code or docs for that reason. Both facts are recorded
rather than smoothed over.

---

## 7. Device matrix

Not applicable in the usual sense — this changes a build script, not a rendered surface, and
`build/coldbox.html` is byte-identical on `main` before and after. No browser behaviour changes.

The relevant cross-platform evidence is instead the two-machine reproduction in §3: Linux/git
2.43.0 and Windows/newer git, building the identical commit, before and after.

---

## 8. Assumptions made

1. **This warrants no roadmap item.** ROADMAP.md's "Changing this file" says anything altering
   *what gets built or in what order* needs an issue or an ADR first. A defect fix to existing
   build machinery is neither, and the repository has no documented hotfix convention. I did not
   insert an item unilaterally. **If the maintainer wants defects tracked in the roadmap, this
   needs one and I did not create it** — flagged here rather than decided.
2. **Explicit numeric offset is the right canonical form**, chosen because it is byte-neutral on
   existing history. `Z` would have been equally valid ISO-8601 and equally deterministic, but it
   would rewrite every historical embedded date and invalidate the recorded CI figure and every
   archived packet hash. Recorded in the ADR amendment.
3. **`%ci`'s offset field is stable.** The instant comes from `%ct`, an integer, so only the
   offset is exposed to this. `%ci` has rendered `±HHMM` for git's entire history and is not the
   format that follows a standard someone might tighten. If it ever changed, the strict parse
   fails closed to the labeled unknown rather than emitting a wrong date.
4. **The new module belongs in `lint.js`'s tooling list.** It is a build module like
   `crypto-bundle.js` and `help-content.js`, all of which are listed. This adds a syntax check;
   it does not weaken anything.

---

## 9. What to scrutinise

**Whether the byte-neutrality claim survives the branch's own commits.** The hash in §3 is from
the working tree before committing. This branch touches `scripts/`, which is in
`BUILD_DATE_SOURCE_PATHS`, so once it lands the build date advances to this branch's commit date
and the artifact hash changes — correctly, per the mechanism. The claim being made is narrower
than "the artifact never changes": it is that **rebuilding `main` at `ba188e1` reproduces
`73ce748f…`**, which is checkable independently of this branch and is the check a reviewer should
run.

**`formatCommitDate`'s arithmetic.** It shifts the instant by the offset and then formats in UTC,
which is a trick that reads as slightly wrong on first pass. The six-offset cross-check against
git is what makes me confident, including `+05:30` and `-03:30` (non-integer hours), `+14:00`
(the extreme), and a leap day. If a reviewer finds an offset where it disagrees with git, that is
a real finding.

**Whether the fix is complete.** I fixed the input I caught. Other candidates for
environment-dependence in this build that I did *not* audit: `readLicenseText()` reads `LICENSE`
with no normalisation at all (deliberately, per P0.20 — but that makes it line-ending sensitive,
guarded only by `.gitattributes`), and `help-content.js` compiles markdown whose file ordering
comes from `docs/`. Both are plausible places for a second instance of this class. I would look
there before concluding the reproducibility claim is sound.

**The two rewritten provenance assertions.** I changed tests that were passing. A reviewer should
confirm I made them independent rather than making them agree with the new code — specifically
that the longhand re-derivation is not just `build-date.js` copied.

---

## 10. Self-assessment

**What might be wrong:** the formatter could disagree with git at some offset I did not try,
though I tried the awkward ones. The `%ci` dependency (assumption 3) is a smaller version of the
same class of problem I am fixing, mitigated but not eliminated.

**What I did not do that arguably should have been done:** verify the `Z` rendering firsthand on a
newer git rather than relying on the maintainer's build output; identify the git version boundary;
audit the rest of the build for sibling defects (§9); run the browser harness — Firefox could not
be installed here, though nothing in this change touches rendering.

**Known limitations:** the labeled-unknown fallback means a malformed `%ci` produces a build that
succeeds with a degraded provenance field. That is the pre-existing design (informational field,
fails soft) and I kept it rather than changing failure semantics in a defect fix — but it does
mean a future git change would degrade quietly-ish rather than loudly.

**Follow-up this creates:** UI.2 rebases onto this and regenerates its packet hash. If the
maintainer wants defects roadmap-tracked, an item is needed (§8.1). The audit in §9 is worth doing
and is not filed.

---

## 11. Bundle impact

**Zero.** `main` builds to 2,597,939 bytes before and after, with the same SHA-256. The only
artifact change this can cause is on commits made at a UTC offset, where the embedded date goes
from a version-dependent 20-or-25-byte string to a fixed 25-byte one.

---

## 12. Docs updated

| Document | Change |
|---|---|
| [ADR-0015](../adr/0015-provenance-build-date-and-self-hash.md) | New amendment: the rendering is ours, not git's. Records the defect, why explicit-numeric was chosen over `Z`, the rejected alternatives, and that P0.18 R2-F1 saw this and closed it at the test boundary |
| [build.md](../build.md) | Step 7 now separates *which commit* the date comes from (unchanged) from *how it is spelled* (new) |
| [CHANGELOG.md](../../../CHANGELOG.md) | Unreleased `### Fixed` entry |

No help content: this is build machinery with no user-facing surface. No new dated review
obligation. The bundle figure in `dependencies.md` is unchanged and deliberately not touched —
this fix reproduces it rather than superseding it.
