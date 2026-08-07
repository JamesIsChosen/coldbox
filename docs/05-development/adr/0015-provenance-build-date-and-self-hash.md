# ADR-0015: Provenance panel build date is the source commit date, and the self-hash is a blank-then-hash self-consistency check

**Status:** Accepted
**Date:** 2026-08-06

---

## Context

P0.16 requires the Reference → Provenance panel to show, among other things, a **build date** and an **expected hash** that a drag-and-drop drop zone compares a dropped file against ([SPEC.md §6.4](../../01-spec/SPEC.md), [dependencies.md](../dependencies.md)). Neither is settled by existing docs, and both collide with a hard constraint:

**"No timestamps in output."** [build.md](../build.md)'s determinism requirements table lists this explicitly — "Build time varies" is the stated reason, and `test/build.test.js` already asserts that two builds of the same source, run under different locales and timezones, are byte-identical. A literal `Date.now()` (or equivalent) embedded at build time would fail that test on the next run and break the reproducible-build guarantee the whole verification story depends on.

**A file cannot contain the true hash of itself.** SHA-256 of a byte string that includes its own digest is not a fixed point of the hash function in any generally computable sense. If the "expected hash" field is meant to be *the* SHA-256 of the shipped file (the same value in `coldbox.html.sha256`), embedding it inside the file necessarily changes the file, and therefore its real hash, invalidating the embedded value. SPEC.md §6.4 already anticipates this and says the check is circular; that only describes the *security property*, not how to make the mechanism work at all.

Both are genuinely ambiguous in the existing docs — SPEC.md says a value is "compiled into" the build and compared, but not what that value actually is or how a self-referential quantity gets computed. Per [AGENTS.md](../../AGENTS.md) §4, this is exactly the kind of gap that should be resolved deliberately and recorded, not guessed silently.

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
