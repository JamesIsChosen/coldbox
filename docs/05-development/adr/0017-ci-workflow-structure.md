# ADR-0017: CI workflow structure — two-OS matrix, a separate always-run browser job, and gated release attestation

**Status:** Accepted
**Date:** 2026-08-07

## Context

P0.18 needed a GitHub Actions workflow covering: build, test, `verify-vendor`, lint, a double-build hash comparison, a second-OS build comparison, a bundle size report, release attestation, and the `docs/05-development/doc-hygiene.md` automated checks (already implemented as `npm run check-docs`, standing up P0.18's own item — see that script and `test/check-docs.test.js`).

Several structural questions weren't settled by the roadmap line itself:

1. Does the reproducibility story live in one job or does cross-OS comparison need its own job?
2. Does `npm run test:browser` (Playwright, [ADR-0007](0007-headless-browser-harness.md)) belong in CI at all, given this project's own packets record that the *authoring dev sandbox* cannot download Playwright's browser binaries — is that a sandbox-specific limitation or a real GitHub Actions limitation?
3. How is the release-attestation step gated, given it needs repository secrets/permissions a human configures, which this authoring session cannot grant itself?

## Decision

**One workflow file, four jobs:** `build` (matrix: `ubuntu-latest`, `windows-latest`), `compare-hashes` (needs `build`), `browser-tests` (independent), `attestation` (needs `build`, gated to tags/releases).

**`build` matrix, not two builds in one job.** Each OS leg runs its own full pipeline — `verify-vendor`, `lint`, `check-docs`, `npm test`, then build twice in place (`build.js` overwrites `build/` rather than requiring a directory removal between passes) and diffs the two `coldbox.html.sha256` files. This catches *intra-OS* nondeterminism (the literal "a nondeterministic change fails CI" acceptance criterion) independently on each OS, before cross-OS comparison is even relevant.

**`compare-hashes` is a separate job**, not a step glued onto one matrix leg, because a matrix leg cannot see another leg's filesystem — it has to download both legs' uploaded `coldbox.html.sha256` artifacts and diff them after both finish. This is the literal "second-OS build comparison" acceptance item: it fails if `ubuntu-latest` and `windows-latest` disagree, which `.gitattributes`' `* text=auto eol=lf` exists specifically to prevent (a Windows checkout that silently gained CRLF line endings would diverge here).

**`browser-tests` runs unconditionally, on every push and pull request** — not gated to `src/`-touching paths, and not folded into the `build` job. Two things settled this:

- **The sandbox limitation is not a GitHub Actions limitation.** Every packet and roadmap note referencing Playwright's binaries being unreachable (P0.16, P0.17, and this item's own packet) is about the specific dev sandbox this project has been authored in, which has no outbound network access at all. GitHub-hosted runners have ordinary outbound internet access. `npx playwright install --with-deps chromium firefox` is expected to actually succeed there. This session could not verify that claim by running it — see the packet's "what to scrutinise" — but the claim itself is about environment capability, not about Playwright.
- **Not folded into `build`** because it needs `npx playwright install`'s ~300 MB of browser binaries ([ADR-0007](0007-headless-browser-harness.md)) on top of `npm ci`, which would slow down *every* leg of the reproducibility matrix for a concern (browser behavior) that reproducibility itself doesn't need. Keeping it a separate job also means a browser-harness failure and a hash-reproducibility failure are reported as distinct, independently rerunnable checks.
- **Not path-filtered** in this version, on purpose: a per-job path filter needs either a workflow-level `on.paths` trigger (which would skip the *entire* workflow, including the doc-hygiene checks that must run on every PR regardless of what changed) or a third-party diffing action, and this item does not justify adding a new dependency to solve a CI-cost problem that hasn't been observed yet. See "What would change our mind" below — this mirrors [ADR-0007](0007-headless-browser-harness.md)'s own anticipation of this exact tradeoff.

**`attestation` is gated to `github.event_name == 'release'` or a `v*` tag push**, and depends on `build` only for job ordering (it does its own independent checkout/build rather than reusing `build`'s artifact, so the exact bytes it attests are built from the tagged commit, not downloaded from an untrusted-by-default artifact store). It uses `actions/attest-build-provenance@v1` against `build/coldbox.html`, with the `id-token: write` and `attestations: write` permissions that action requires. **This step's actual success is unverified** — GitHub's attestation feature requires repository-level configuration (the "Actions" → attestations settings, and in some GitHub plans an explicit enablement) that only the repository owner can grant, and it can only be genuinely exercised by pushing a real tag or publishing a real release, neither of which this authoring session can do. The roadmap item's own `⚠️` marker anticipates exactly this — it is implemented per GitHub's documented contract for the action, not invented, but nobody has watched it pass yet.

**Bundle size report** is a step inside each `build` leg, appending byte count and KiB to `$GITHUB_STEP_SUMMARY` — a report, not a gate. It deliberately does not fail the build at the 3 MB target or the 4.5 MB hard cap from [dependencies.md](../dependencies.md#bundle-budget); the roadmap line asks for a report, and turning an informational number into a second, undocumented budget-enforcement mechanism would be scope creep this item wasn't asked to do.

## Rationale

Splitting reproducibility into "two builds, same OS" (in `build`) and "one build each, compared across OS" (in `compare-hashes`) means a failure message immediately says which property broke: intra-OS nondeterminism reads as a `build` job failure with a diff of two hashes from the identical checkout; cross-OS divergence reads as a `compare-hashes` failure naming both OSes. Collapsing these into one comparison would leave a human guessing which axis actually diverged.

Windows was chosen as the second OS (over macOS) because it's the platform this repository's own tooling explicitly worries about for line-ending correctness (`AGENTS.md`'s PowerShell gotchas section, `.gitattributes`' comment block) — testing the OS most likely to introduce CRLF drift catches the failure mode the reproducibility story is actually built to defend against.

## Consequences

### Positive

- Reproducibility failures are attributable to a specific axis (intra-OS vs cross-OS) rather than one opaque "hash mismatch" job.
- The browser harness runs somewhere with real network access on every PR, closing the gap every prior roadmap item's packet flagged as "could not verify in this sandbox."
- Attestation is implemented and reviewable now, rather than deferred until secrets exist — the human unblocks it by configuration, not by waiting on more agent work.

### Negative

- **CI cost.** Four jobs per run, two of which install Playwright's ~300 MB of browsers on every push/PR rather than only when relevant files changed. This is the tradeoff ADR-0007 flagged as likely eventually necessary.
- **Attestation is unverified end to end.** A packet claiming this step "works" would be false; the packet for this item says so plainly instead.
- `compare-hashes` adds artifact upload/download latency (network round trip through GitHub's artifact store) on every run, even when both OSes were always going to agree.

### Risks

- If GitHub's hosted-runner network access is ever more restricted (corporate runner policies, self-hosted runners without egress), the `browser-tests` and `verify-vendor` jobs would fail in ways this ADR assumed away. Both already fail closed (non-zero exit) rather than silently skipping, so this would surface as a visible CI failure, not a silent gap.

## Alternatives considered

**Fold `browser-tests` into the `build` matrix**, running it once per OS. Rejected: Playwright's Windows browser story is materially different (different binary set, different flake profile) from this project's actual claim, which is about `file://` behavior in Chromium/Firefox specifically — running it on `windows-latest` too would roughly double browser-install cost for coverage this project doesn't currently claim to need on Windows CI specifically (real Windows browser behavior is still covered by the human device matrix at P0.19).

**Skip cross-OS comparison and trust two same-OS double-builds.** Rejected outright — the acceptance criterion explicitly asks for a second-OS comparison, and same-OS double-builds cannot catch a CRLF/path-separator/locale-default divergence that only appears when the *checkout* itself differs, which is exactly the failure mode `.gitattributes` exists to prevent and therefore worth actually testing.

**Gate `browser-tests` on changed paths from the start**, using `dorny/paths-filter` or similar. Rejected for now: it's a real, reasonable optimization, but it's a new third-party Action dependency (a meaningful review surface for a security-focused project, per [ADR-0007](0007-headless-browser-harness.md)'s own reasoning about Playwright) introduced to solve a cost problem nobody has measured yet on this specific workflow.

## What would change our mind

- If CI wall-clock time or GitHub Actions minutes become a measured bottleneck, path-scoping `browser-tests` to `src/`, `scripts/`, `test/browser/`, and `package.json`/`package-lock.json` changes is the documented next step — using `paths-ignore`/`paths` on a dedicated workflow file (so doc-hygiene and the reproducibility matrix keep running on every PR) rather than gating the whole workflow.
- If GitHub's attestation feature turns out to need different permissions or a different action than `actions/attest-build-provenance@v1` once actually exercised against real repository secrets, this ADR's attestation section should be revised with the real observed behavior, not left describing an assumption.
- If Windows Playwright coverage becomes load-bearing (a real Windows-specific `file://` bug surfaces), add `browser-tests` to the OS matrix rather than leaving it Ubuntu-only.

## References

- [ROADMAP P0.18](../ROADMAP.md)
- [doc-hygiene.md](../doc-hygiene.md) — the "Automated checks" table this workflow's `check-docs` step enforces
- [build.md](../build.md) — determinism requirements and the build pipeline this workflow drives
- [ADR-0007](0007-headless-browser-harness.md) — why Playwright exists as a dev dependency, and the cost/benefit reasoning this ADR extends into CI
- [dependencies.md](../dependencies.md#bundle-budget) — the bundle size budget this workflow reports against but does not enforce
- `.github/workflows/ci.yml`
