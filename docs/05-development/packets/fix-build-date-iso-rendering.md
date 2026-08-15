# PR packet — P0.22: harden provenance build-date ISO rendering

**Branch:** `fix-build-date-iso-rendering` · **Base:** `main`
**Roadmap item:** P0.22 — Provenance build-date ISO rendering hardening
**Author:** agent session, 2026-08-14

---

## 1. Summary

`scripts/build.js` previously embedded whatever string `git log --format=%cI` returned, and git
versions disagree on how to spell a zero UTC offset — `+00:00` on older git, `Z` on newer git.
P0.22 hardens the existing fix by validating `formatCommitDate()`'s direct inputs before
arithmetic, so invalid signs, negative components, noncanonical components, and malformed
seconds fail closed instead of becoming malformed provenance strings. The parser also retains
`%ci`'s calendar/time fields and compares them with a reconstruction from `%ct` plus the numeric
offset, so impossible or contradictory Git output degrades to the labeled unknown rather than
being accepted on shape alone. The formatter still emits a fixed explicit numeric offset.

---

## 2. Scope

**In:** `scripts/build-date.js`, `readBuildCommitDate()` in `scripts/build.js`,
`scripts/lint.js` (one line — the new build module joins the tooling syntax-check list, matching
how `crypto-bundle.js`/`font-bundle.js`/`help-content.js` are treated), `test/build-date.test.js`
(now 8 tests), two rewritten assertions in `test/provenance.test.js`, ADR-0015 amendment,
`build.md` step 7, CHANGELOG, and the P0.22 roadmap item.

**Deliberately not in:** no change to which commit the date comes from — the 2026-08-06
amendment's decision is untouched. No change to the CSP, realm boundary, message schema, vault
format, derivation, or randomness. No change to the self-hash mechanism. Nothing under `src/`.

**Relationship to UI.2.** The original defect was found while verifying
[PR #56](https://github.com/JamesIsChosen/coldbox/pull/56) (UI.2 brand assets), whose author
built at UTC in a container and whose reviewer built on Windows, producing two different hashes
for the identical commit. **It is not UI.2's defect** — it is reachable from any UTC commit and
predates that branch. It remains a separate P0.22 PR per AGENTS.md §6a. UI.2 must rebase onto
this after an independent PASS and merge, then regenerate its packet's hash and size evidence.

---

## 3. How to verify

Environment used for this remediation: Node v24.16.0, npm 11.13.0, Git
2.53.0.windows.3, Windows x64. The browser prerequisite was installed with
`npx playwright install chromium firefox`.

The motivating divergence is recorded in the original review and ADR-0015: the same UTC commit
can render as either `...+00:00` or `...Z` under different Git versions. This remediation keeps
the explicit numeric form, hardens the formatter's direct-input contract, and rejects `%ci`
calendar/time values that are impossible or disagree with `%ct`.

### Main byte-neutrality check

A detached `main` worktree at a separate temporary path was built under
`LC_ALL=fr_FR.UTF-8` and `TZ=Asia/Tokyo`:

```
$ node scripts/build.js
Built build/coldbox.html (73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1)
$ Get-FileHash -Algorithm SHA256 build/coldbox.html
hash 73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1
$ (Get-Item build/coldbox.html).Length
2597939
$ (Select-String -LiteralPath build/coldbox.html -Pattern 'var PROVENANCE_BUILD_DATE = "[^"]*"' | Select-Object -First 1).Matches.Value
var PROVENANCE_BUILD_DATE = "2026-08-14T11:28:26-07:00"
```

This matches the recorded `main` artifact hash and size. The temporary worktree was removed
after verification.

### At the remediation tip

The product/test commit is `3540ccb`. Its build-date source path includes `scripts/`, so later
packet-only commits do not change this artifact:

```
$ npm run build
Built build/coldbox.html (da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562)
$ Get-FileHash -Algorithm SHA256 build/coldbox.html
hash da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562
$ (Get-Item build/coldbox.html).Length
2597939
$ (Select-String -LiteralPath build/coldbox.html -Pattern 'var PROVENANCE_BUILD_DATE = "[^"]*"' | Select-Object -First 1).Matches.Value
var PROVENANCE_BUILD_DATE = "2026-08-14T23:18:32-07:00"

$ $env:LC_ALL='C'; $env:TZ='UTC'; npm run build
Built build/coldbox.html (da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562)
$ Get-FileHash -Algorithm SHA256 build/coldbox.html
hash da04ecd107ae27fd2b8be8cc30843d5d89ea608034976964eb1ddb0936c95562
$ (Get-Item -LiteralPath build/coldbox.html).Length
2597939
```

The fixed `+00:00` path is exercised by the real UTC scratch-commit test, while these two
builds show the current branch remains stable across locale/timezone and path variations.

### Required checks

```
$ npm run verify-vendor
Vendor verification passed against local files and upstream releases.

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 220 markdown file(s) checked, 0 warning(s).

$ npm test
ℹ tests 386
ℹ pass 386
ℹ fail 0

$ npm run test:browser
Browser harness passed in Chromium and Firefox.
```

The targeted `node --test --test-concurrency=1 test/build-date.test.js` run passed all 8 tests,
including the direct-input and semantic `%ci` regressions. The first browser-harness invocation reported missing
binaries; after the documented install command above, the complete Chromium+Firefox harness passed.

### Scratch repositories are pinned against the tester's git config

Found by the maintainer running `npm test` on Windows against the first version of this
branch: 788 lines of `warning: in the working copy of '<file>', LF will be replaced by CRLF`,
one per file, burying the test output.

Cause: the temporary repositories these tests build in have no `.gitattributes` of their own
— the repository's `* text=auto eol=lf` rule is not among the files copied in — so
`core.autocrlf` fell through to the developer's global config, which is `true` by default on
a standard Windows git install. `git add -A` then rewrote line endings on the way into the
index and warned for every file.

No build output was affected, and no assertion was wrong: the fixtures are written to disk as
LF and never checked back out, so the build read LF either way, which is why all 384 tests
passed on both machines. It was noise — but noise of exactly the kind this branch exists to
remove, one level down: **a test asserting build determinism should not itself vary with the
tester's git configuration.** Both scratch roots now pin `core.autocrlf=false` and
`core.safecrlf=false` after `git init`.

Measured by reproducing the condition (`git config --global core.autocrlf true`) on Linux:

```
$ git config --global core.autocrlf true
$ node --test --test-concurrency=1 test/build-date.test.js test/provenance.test.js 2>&1 | grep -c "LF will be replaced by CRLF"
788        # before
0          # after
```

### A reviewer on a different git version

The most useful thing a reviewer can do here is run `npm test` on a git that renders `Z`. On
`main` today, `test/provenance.test.js`'s build-date assertions pass on either git only because
this repository has no UTC commit; on this branch they are pinned to the canonical spelling and
`test/build-date.test.js` creates a real UTC commit and asserts the outcome directly, so a
newer git exercises the actual fix rather than agreeing with itself.

---

## 4. Acceptance criteria

Copied verbatim from [ROADMAP.md](../ROADMAP.md), P0.22:

> **Accept:** a UTC product commit embeds `+00:00`, never `Z`; valid non-UTC offsets remain byte-neutral with the historical rendering; the formatter is locale/timezone independent; malformed Git output degrades to the labeled unknown; invalid signs, negative offset components, noncanonical offset components, impossible offsets, and unrepresentable instants are refused by the formatter itself; the complete build path remains reproducible; and the regression tests cover the direct formatter contract with negative cases.

| Criterion | How satisfied | Test/evidence |
|---|---|---|
| A UTC product commit embeds `+00:00`, never `Z` | The formatter reconstructs the wall clock from `%ct` plus the numeric `%ci` offset and always emits the validated explicit offset. | `build-date.test.js` creates a real UTC commit and checks the embedded end-to-end build value. |
| Valid non-UTC offsets remain byte-neutral with the historical rendering | Six real commits at `-07:00`, `+01:00`, `+05:30`, `+14:00`, `-11:00`, and `-03:30` are compared against Git's own `%cI` output. | `build-date.test.js` offset cross-check. |
| The formatter is locale/timezone independent | Formatting uses `toISOString()` after explicit offset arithmetic, with no locale APIs. | Four `TZ` values and two `LC_ALL` values in `build-date.test.js`; independent two-build hashes in §3. |
| Malformed Git output degrades to the labeled unknown | Strict parsing captures `%ci`'s calendar/time fields, reconstructs the expected wall clock from `%ct` plus the parsed offset, and maps any mismatch or formatter failure to the labeled unknown. | `build-date.test.js` syntactic malformed-output table and semantic impossible/contradictory timestamp regression. |
| Invalid signs, negative offset components, noncanonical offset components, impossible offsets, and unrepresentable instants are refused by the formatter itself | `formatCommitDate()` validates its own sign, seconds, and canonical two-digit offset components before arithmetic. | Direct-input regression covers invalid sign, negative values, numeric/noncanonical components, whitespace, negative seconds, out-of-range offsets, and unrepresentable instants. |
| The complete build path remains reproducible | Build output is compared across locale/timezone and from a synthetic UTC product commit. | §3 command output and the full test suite. |
| Regression tests cover the direct formatter contract with negative cases | The direct-input test calls the exported formatter rather than only the parser path; the parser test independently covers semantic `%ci` validation. | `build-date.test.js` now has 8 passing tests. |

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

**8 tests in `test/build-date.test.js`.** The vectors are not hand-written: `commitAt()` creates a real repository, makes
a real commit at a requested offset, and returns both the machine values the build reads and
git's own `%cI` rendering. So "our formatter agrees with git" is checked against git, not against
my belief about git.

**Negative tests.** 12 syntactically malformed Git outputs must all produce the labeled unknown —
including `'1786767525 Z'` and `'1786767525 2026-08-15T04:18:45 +0000'`, which are close enough to
the real shape to slip past a loose parser. Four additional semantically malformed or
contradictory `%ci` values cover an impossible month/time, an impossible day, an impossible hour,
and a one-second contradiction against `%ct`; each also produces the labeled unknown. The direct
formatter regression adds 12 invalid sign, negative, noncanonical, whitespace, and negative-seconds
inputs that must return `null`, and the existing out-of-range/unrepresentable inputs must also
return `null` rather than a rounded or wrapped date.

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

**What I could not test:** I did not independently run a Git version known to emit the `Z`
spelling, so I did not establish the version boundary. The current Git 2.53.0 test run accepts
whichever `%cI` spelling it returns while asserting that Coldbox always emits `+00:00`. No Git
version boundary is asserted in code or docs.

---

## 7. Device matrix

Not applicable in the usual sense — this changes a build script, not a rendered surface, and
`build/coldbox.html` is byte-identical on `main` before and after. No browser behaviour changes.

The current-session evidence is the detached `main` rebuild at a separate Windows filesystem
path under Git 2.53.0, plus the Chromium and Firefox `file://` harness. The original two-OS CI
artifact comparison remains recorded in the independent review report; this build-only change
does not add a rendered surface or mobile behavior.

---

## 8. Assumptions made

1. **P0.22 is the tracking mechanism for this remediation.** The roadmap item is a defect fix
   authorized by the existing ADR-0015 decision, not new product scope. It remains `[~]` until
   an independent reviewer verifies the acceptance criteria and moves it to `[x]`.
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
5. **The formatter's direct component inputs are canonical strings.** They are captured from the
   strict Git-output regex, so accepting numbers, signs outside `+`/`-`, negative components, or
   noncanonical widths would create a second, weaker input contract. The formatter rejects those
   values instead of silently normalizing them.

---

## 9. What to scrutinise

**Whether the byte-neutrality claim survives the branch's own commits.** This branch touches
`scripts/`, which is in `BUILD_DATE_SOURCE_PATHS`, so the product/test commit `3540ccb` advances
the build date and changes the final artifact hash — correctly, per the mechanism. The claim is
narrower than "the artifact never changes": rebuilding `main` reproduces the recorded
`73ce748f…` artifact, while rebuilding this tip twice reproduces `da04ecd…`.

**`formatCommitDate`'s arithmetic.** It shifts the instant by the offset and then formats in UTC,
which is a trick that reads as slightly wrong on first pass. The six-offset cross-check against
git is what makes me confident, including `+05:30` and `-03:30` (non-integer hours), `+14:00`
(the extreme), and a leap day. If a reviewer finds an offset where it disagrees with git, that is
a real finding.

**Whether the fix is complete.** The parser now binds the raw `%ci` wall clock to the independent
`%ct` reconstruction; a reviewer should try both impossible calendar/time values and valid-looking
contradictions. Other candidates for
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
though I tried the awkward ones. The parser's semantic check deliberately treats `%ct` plus the
parsed offset as authoritative and rejects any `%ci` wall clock that differs; a future change in
Git's timestamp semantics should therefore degrade to the labeled unknown rather than be guessed.
The direct formatter contract is deliberately strict; a future caller that supplies a different
representation will receive `null` and must adapt at that boundary rather than bypassing
validation.

**What I did not do that arguably should have been done:** verify the `Z` rendering firsthand on a
newer git rather than relying on the maintainer's build output; identify the git version boundary;
audit the rest of the build for sibling defects (§9). The Chromium+Firefox browser harness was
run after installing its documented binaries and passed.

**Known limitations:** the labeled-unknown fallback means a malformed `%ci` produces a build that
succeeds with a degraded provenance field. That is the pre-existing design (informational field,
fails soft) and I kept it rather than changing failure semantics in a defect fix — but it does
mean a future git change would degrade quietly-ish rather than loudly.

**Follow-up this creates:** UI.2 must rebase onto this after an independent PASS and merge, then
regenerate its packet hash and size evidence. The broader audit in §9 is worth doing and is not
filed by this item.

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
| [ROADMAP.md](../ROADMAP.md) | P0.22 defect item, left at `[~]` for independent review |

No help content: this is build machinery with no user-facing surface. No new dated review
obligation. The bundle figure in `dependencies.md` is unchanged and deliberately not touched —
this fix reproduces it rather than superseding it.
