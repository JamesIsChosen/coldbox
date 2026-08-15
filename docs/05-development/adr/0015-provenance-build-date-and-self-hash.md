# ADR-0015: Provenance panel build date is the source commit date, and the self-hash is a blank-then-hash self-consistency check

**Status:** Accepted
**Date:** 2026-08-06

---

## Context

P0.16 requires the Reference → Provenance panel to show, among other things, a **build date** and an **expected hash** that a drag-and-drop drop zone compares a dropped file against ([SPEC.md §6.4](../../01-spec/SPEC.md), [dependencies.md](../dependencies.md)). Neither is settled by existing docs, and both collide with a hard constraint:

**"No timestamps in output."** [build.md](../build.md)'s determinism requirements table lists this explicitly — "Build time varies" is the stated reason, and `test/build.test.js` already asserts that two builds of the same source, run under different locales and timezones, are byte-identical. A literal `Date.now()` (or equivalent) embedded at build time would fail that test on the next run and break the reproducible-build guarantee the whole verification story depends on.

**A file cannot contain the true hash of itself.** SHA-256 of a byte string that includes its own digest is not a fixed point of the hash function in any generally computable sense. If the "expected hash" field is meant to be *the* SHA-256 of the shipped file (the same value in `coldbox.html.sha256`), embedding it inside the file necessarily changes the file, and therefore its real hash, invalidating the embedded value. SPEC.md §6.4 already anticipates this and says the check is circular; that only describes the *security property*, not how to make the mechanism work at all.

Both are genuinely ambiguous in the existing docs — SPEC.md says a value is "compiled into" the build and compared, but not what that value actually is or how a self-referential quantity gets computed. Per [AGENTS.md](../../../AGENTS.md) §4, this is exactly the kind of gap that should be resolved deliberately and recorded, not guessed silently.

## Decision

**Build date:** embed the source commit's date (`git log -1 --format=%cI HEAD`), not the wall-clock moment `npm run build` ran. This is fixed by the commit, so it is identical for every build of the same source regardless of when or where the build runs, and it degrades to a labeled `"unknown (no git commit metadata available)"` string — never a build failure — when `.git` history is unavailable (e.g. a source tarball without history).

**Self-hash:** the build reserves a meta tag, `<meta name="coldbox-expected-hash" content="…">`, whose 64-character value is filled with a fixed placeholder (`0` repeated 64 times) for the purpose of computing the embedded value. The build computes the SHA-256 of the fully-assembled document **with that tag's value blanked to the placeholder**, then substitutes the real hex digest into the same 64-character span (same length, so no other byte offset in the document shifts). The in-app drop zone reproduces the identical procedure on a dropped file's bytes: locate the tag, blank it back to the same placeholder, hash the result, and compare to the value read from the *running* copy's own tag.

This means the embedded "expected hash" is **not** the same value as `coldbox.html.sha256` (which remains the true hash of the exact shipped bytes, computed after the substitution, and is what release verification and CI attestation use). It is a distinct, well-defined quantity: the hash of "this document with its own self-hash field blanked out." The panel says this in plain language, alongside the existing circularity disclosure SPEC.md §6.4 already calls for.

## Rationale

### The build-date choice is the only automatic option consistent with the determinism tests

A manually-maintained "release date" field would also work and was considered (see Alternatives), but nothing in this repository currently has a release process — `package.json` is still `0.0.0` and CHANGELOG.md is entirely under `[Unreleased]`. Deriving from git avoids inventing a field someone has to remember to update, and it is trivially checkable: `git log -1 --format=%cI HEAD` in the same checkout must equal the embedded value, which is exactly what `test/provenance.test.js` asserts.

### The blank-then-hash construction is the only way to embed a self-referential value at all

Any construction that tries to make the embedded value equal the *actual final* SHA-256 of the shipped bytes requires that value to already be known before the file is finished — the classic bootstrapping problem, unsolvable in one deterministic pass without a fixed-point search (impractical for SHA-256). Blanking a known-length placeholder before hashing, then substituting the real digest into that exact span afterward, is the standard technique self-checksumming artifacts use (comparable to how self-extracting installers embed a checksum of "everything except the checksum field"). It is fully reproducible: the same source produces the same blanked-document hash on every build, so two consecutive builds still produce byte-identical output, which `test/provenance.test.js` also asserts directly.

### Being explicit that this is not the release hash is a disclosure obligation, not an implementation detail

A user who sees "hash: abc123…" in two places (the provenance panel and a downloaded `.sha256` file) and finds they differ, without an explanation, would reasonably conclude something is wrong. The panel and this ADR both state plainly that the two values measure different things, and that only the command-line hash comparison against a separately published `.sha256` (or GPG signature, or a from-source rebuild) is resistant to a malicious build lying about itself.

## Consequences

### Positive

- No timestamp-driven build nondeterminism; the existing locale/timezone determinism tests remain valid and are extended to cover both new fields.
- The self-hash mechanism gives the drop zone a genuine (if limited) corruption-detection capability — an accidentally truncated or bit-flipped copy of a real build will legitimately fail the comparison — while being honest that it proves nothing against a deliberately malicious build.
- Both fields are generated from existing sources of truth (`git log`, the assembled document itself) rather than hand-maintained, so neither can silently go stale the way a manually-typed date could.

### Negative

- The embedded "expected hash" is a second, different hash value living alongside `coldbox.html.sha256` in the same file. This is a plausible source of user confusion if the distinction is ever weakened in the UI copy; the in-app text and this ADR are the guardrail.
- Build date requires `git` to be installed and the checkout to have at least the `HEAD` commit's metadata (a depth-1 shallow clone is sufficient; a metadata-stripped source tarball is not). This is disclosed via the "unknown" fallback rather than failing the build, since the field is informational, not a security boundary.

### Risks

- If a future contributor "fixes" the drop zone to compare against `coldbox.html.sha256` directly (the intuitive but incorrect expectation), that comparison can never succeed by construction and would need to be caught in review. `test/provenance.test.js` pins the actual (blanked) relationship so this would fail CI, not just review.

## Alternatives considered

**A manually-maintained release-date field**, bumped as part of cutting a release. Rejected for now because no release process exists yet — this would be an unmaintained field from day one, which is worse than an automatically-derived one. Worth revisiting once versioned releases begin; at that point the release date and the commit date should coincide for a tagged commit anyway.

**Omitting the "expected hash" field entirely** and only pointing to `coldbox.html.sha256` and the command-line instructions. This would sidestep the self-reference problem completely and arguably reduces confusion. Rejected because SPEC.md §6.4 explicitly describes an in-app hash-and-compare drop zone as part of the design, and the roadmap item names it as a specific deliverable ("drag-and-drop self-hash drop zone"); removing it would be reinterpreting the acceptance criterion rather than meeting it.

**A fixed-point search** (brute-force appending padding until the file's true hash matches an embedded value). Rejected outright: computationally infeasible for SHA-256, and any construction cheap enough to run in a build script would need the hash function to be broken.

## What would change our mind

If Coldbox adopts a real release/versioning process, the build date could switch to (or be cross-checked against) the tagged release date rather than the raw commit date — those should usually agree for a release commit, but a formal source would remove the current ADR's dependency on git metadata being present in every checkout. If the blank-then-hash construction is ever found to be more confusing than useful for actual users (as measured by support questions or a UX review under Phase 0's later polish work), the simpler "omit expected hash, keep the drop zone informational" alternative above should be reconsidered.

## References

- [SPEC.md §6.4 — Self-integrity verification](../../01-spec/SPEC.md)
- [build.md — Determinism requirements](../build.md)
- [dependencies.md — Provenance in-app](../dependencies.md)
- [verification.md](../../02-security/verification.md) — the non-circular checks this panel points to
- `test/provenance.test.js`, `scripts/build.js` (`readBuildCommitDate`, `injectExpectedHash`)

## Amendment (2026-08-06): build date is scoped to product paths, not literal `HEAD`

**Status of this amendment:** Accepted. Recorded here rather than as a separate ADR because it narrows the mechanism this ADR already governs without changing the decision itself (build date = a commit date, not wall-clock time) or the self-hash design (F1/F2 below did touch the self-hash UI and comparison logic, but not the blank-then-hash mechanism itself).

### Context

Independent review of P0.16 ([p0.16-provenance-panel.review.md](../packets/p0.16-provenance-panel.review.md), finding F4) found a real design bug in the original decision: `readBuildCommitDate()` ran `git log -1 --format=%cI HEAD`, i.e. the date of **literal** `HEAD`, whatever commit that happened to be.

That is unstable under this repository's own review process. A PR packet documents the exact tip it verifies. Writing or correcting that packet requires a commit. That commit becomes the new `HEAD`. Under the original mechanism, that governance-only commit — which touches only `docs/05-development/packets/`, and nothing under `src/`, `scripts/`, or `vendor/` — changed the embedded build date, and therefore the embedded expected-hash and the final SHA-256 of `coldbox.html`, even though nothing about the product changed. The packet's own recorded hash was therefore stale the moment it was committed, by construction, every time. No amount of re-running the build could fix this; the mechanism itself guaranteed the mismatch.

### Decision

`readBuildCommitDate()` now scopes the `git log` query to the paths that actually feed the build:

```
git log -1 --format=%cI HEAD -- src scripts vendor
```

This asks "what is the date of the most recent commit, reachable from `HEAD`, that touched a path the build reads from" rather than "what is the date of `HEAD`." A commit that touches only `docs/`, `test/`, `README.md`, `CHANGELOG.md`, or other non-product paths is invisible to this query. The build date — and therefore every other build output, since it's the only thing in this build that varies commit-to-commit — is unaffected by such a commit. It only advances when a commit that could actually change the shipped bytes is made.

### Rationale

**This is the option ADR-0015's own "What would change our mind" section anticipated** ("deriving from... the last commit that touched product source rather than HEAD literally"), not a new alternative invented under review pressure.

**Alternatives considered and rejected:**

- **Merge-base with `main`.** Rejected: this repository's workflow is one feature branch per roadmap item, reviewed and merged in place — there is no guarantee `main` is the right stability anchor once a branch has commits both before and after a packet fix-up, and it couples the build to the reviewer's remote-tracking state rather than something computable from the commit graph alone in every checkout (a shallow clone or a detached worktree may not have `main` at all).
- **A manually-maintained "last product commit" tag or file.** Rejected for the same reason ADR-0015 rejected a manually-maintained release-date field: an unmaintained field is worse than a derived one, and this repository has no release process to hang a manual marker on yet.
- **Excluding only `docs/05-development/packets/`** rather than all of `docs/`. Rejected as needlessly narrow — any documentation-only commit (a typo fix in `verification.md`, a roadmap checkbox) has the identical problem, and the fix is just as cheap scoped to all of `docs/` plus the implicit exclusion of `test/` and top-level metadata files.

**Why this doesn't reopen the original build-date rationale:** the property ADR-0015 needed — a value that is fixed by the source and doesn't vary with wall-clock time — still holds. This amendment only changes *which* commit's date counts as "the source," so that "the source" means "the product," not "whatever HEAD happens to be when someone runs `git log`."

### Consequences

**Positive:** a packet, once committed, describes bytes that do not move under it on a subsequent governance-only commit. Reviewers can build a fixed tip and its hash will still match a later re-read of the same tip after the packet is corrected, re-worded, or the roadmap marker is flipped.

**Negative:** the embedded build date can now be visibly older than `HEAD`'s own commit date, which could look wrong to a reader who doesn't know this mechanism exists. The panel's existing copy already explains that this is *a* commit date rather than a build timestamp; it does not currently explain that it is specifically the *product* commit date. Worth a follow-up copy tweak if this causes confusion in practice, but not required to close this finding — the underlying value is correct and reproducible, which is the property that matters.

**Risk carried forward:** if a future contributor adds a new top-level directory that also feeds the build (e.g. a `data/` directory) without adding it to `BUILD_DATE_SOURCE_PATHS` in `scripts/build.js`, a commit to that new directory would silently fail to advance the build date. This is the same category of risk as any hand-maintained path list; `test/provenance.test.js` pins the current path set's behavior so a regression there would need to be a deliberate, reviewed change, not a silent one.

### Verification

Confirmed by building the same commit from two different checkout paths (a fresh worktree at a separate filesystem path) under different locale/timezone, per the review protocol's determinism requirement — see the regenerated [p0.16-provenance-panel.md](../packets/p0.16-provenance-panel.md) packet §3 for the actual commands and hashes. Also confirmed directly: a synthetic two-commit repository (one product commit, one docs-only commit as the new `HEAD`) embeds the first commit's date, not the second's — `test/provenance.test.js`, "a commit touching only docs/ ... does not change the build date."

## Amendment (2026-08-15): the date's *rendering* is ours, not git's

**Status of this amendment:** Accepted. It changes how the value this ADR governs is spelled, not which commit it comes from. The 2026-08-06 amendment's decision is untouched.

### Context

`readBuildCommitDate()` ran `git log -1 --format=%cI` and embedded whatever string git returned. `%cI` is documented as "strict ISO 8601", and different git versions disagree about how to spell a zero UTC offset under that standard:

```
git 2.43.0    2026-08-15T04:18:45+00:00     (25 bytes)
newer git     2026-08-15T04:18:45Z          (20 bytes)
```

Same commit object — `committer … 1786767525 +0000` — same instant, five bytes of difference in `build/coldbox.html`. **The artifact's size and hash therefore depended on which git the builder had installed**, which is a direct violation of AGENTS.md §3's reproducible-build constraint and of [build.md](../build.md)'s determinism requirements.

It went unnoticed for the whole of Phases 0–2 because every commit in this repository's history was made at a non-zero UTC offset, and both renderings spell those identically (`-07:00` either way). Only a commit made at `+0000` diverges. A container-based agent session is UTC-configured by default, so the first agent to commit product code from one exposed it — observed directly: a branch built on two machines from the identical commit produced 2,622,481 and 2,622,476 bytes.

**The symptom had already been seen and misdiagnosed.** P0.18 review R2-F1 hit exactly this `'Z' vs '+00:00'` divergence, correctly identified the cause at the string level, and concluded it was a *test* comparing against a hardcoded spelling — fixing the test to capture git's own answer instead. The reasoning ended at the test boundary. The same version-dependent string was flowing into the shipped bytes the entire time, and the fix that made the test robust also removed the signal that would have caught it. That is the more useful lesson here than the bug itself: a determinism failure was observed, explained, and closed without asking whether the same input reached the artifact.

### Decision

Ask git only for values that have no rendering to disagree about, and format the string here:

```
git log -1 --format=%ct %ci HEAD -- <BUILD_DATE_SOURCE_PATHS>
```

`%ct` is a Unix timestamp — an integer. The numeric UTC offset is taken from `%ci`, git's long-standing `YYYY-MM-DD HH:MM:SS ±HHMM` format, and **only** the offset is read from it; the instant always comes from the integer, so even a change in how `%ci` renders dates cannot move the output. Both are parsed strictly by `scripts/build-date.js`, and anything unexpected degrades to the same labeled `unknown (no git commit metadata available)` that missing git metadata already produced. The field is informational, so it fails soft — but it never guesses.

**The canonical form keeps an explicit numeric offset and never `Z`:** `YYYY-MM-DDTHH:MM:SS±HH:MM`, fixed length, seconds precision.

The formatter lives in its own module rather than inside `scripts/build.js` so it can be unit-tested as a pure function over a table of offsets, instead of being observable only through a full build.

### Rationale

**Why explicit-numeric rather than `Z`.** It is what every commit in this repository has already embedded, because every one of them was at a non-zero offset. Choosing it makes this change **byte-neutral on all existing history**: rebuilding `main` after the fix reproduces `73ce748f871166f717de4c22d31dcb4c6b8d048337a0eea78f1e4a7b676aafc1` at 2,597,939 bytes, the exact artifact recorded in [dependencies.md](../dependencies.md#bundle-budget) from a real CI run. Choosing `Z` would have been equally consistent going forward and would have silently rewritten the embedded date of every historical commit, invalidating that recorded figure and every packet hash in the archive.

**Why not normalise the `%cI` string instead** — rewriting a trailing `Z` to `+00:00`. It fixes the one divergence we found and leaves the output shape defined by an external tool's formatter, which is the property that failed. Taking the machine values and owning the rendering removes the class, not the instance.

**Why not `Date#toISOString()` on the raw timestamp.** That re-expresses every commit in UTC and discards the committer's offset, changing every date already embedded. The offset is preserved and only its spelling is fixed.

### Consequences

**Positive:** the artifact no longer depends on the builder's git version. Cross-OS hash comparison in CI ([ADR-0017](0017-ci-workflow-structure.md)) now means what it claims for commits made at any offset, including the UTC ones that agent sessions produce.

**Negative:** the build carries its own date formatter, which is code that did not exist before and has to be correct. It is ~50 lines, pure, and covered by unit vectors cross-checked against real git commits at six offsets.

**Risk carried forward:** `%ci`'s offset field is still an external format. If git ever changed it, the strict parse fails closed to the labeled unknown rather than emitting a wrong date — a visible, non-silent degradation, and one `test/build-date.test.js` would catch immediately.

### Verification

`test/build-date.test.js`: real commits created at six offsets, with the formatter's output compared against git's own `%cI` for each non-UTC case (proving byte-neutrality on historical commits) and pinned to `+00:00` for the UTC case (proving the fix). Plus locale/timezone independence, malformed-input degradation, out-of-range refusal, and an end-to-end build of a synthetic UTC product commit. `test/provenance.test.js`'s two build-date assertions were rewritten off `%cI` for the same reason this amendment exists.
