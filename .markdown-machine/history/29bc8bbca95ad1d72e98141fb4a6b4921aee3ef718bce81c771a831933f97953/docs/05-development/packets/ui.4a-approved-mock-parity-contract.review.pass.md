# Review: UI.4a — Approved desktop/mobile mock parity contract

**VERDICT: PASS**

Findings: 0 (0 blocking, 0 advisory — all acceptance criteria independently verified)  
Reviewed commit: `e3e0c65dedd69ddb605c82a28817892213065c34`  
Reviewed by: `ui4a_fresh_review_3`  
Review mode: READ-ONLY (CI-witnessed, run `31934774555`)  
Date: 2026-08-16

## 1. What I verified

I read `AGENTS.md`, the review protocol, the roadmap, the packet, the canonical parity contract, ADR-0049, the manifest, the workflow, the implementation diff, and the preserved prior FAIL report.

The reviewed checkout is clean and at the requested exact head:

```text
git status --short --branch
## ui.4a-approved-mock-parity-contract...origin/ui.4a-approved-mock-parity-contract

git rev-parse HEAD
e3e0c65dedd69ddb605c82a28817892213065c34
```

The product source remains unchanged:

```text
SRC_DIFF_EMPTY=true
```

Reference integrity independently matches the manifest:

```text
desktop SHA256 FB7FF0643BDA8F12A0A7E64DAEA91F51D74276CFC9BFB66C80BAAF874BB2DED9
mobile  SHA256 AF0C1FE08E689F755869A6EB4CC06DCAF0F4D44B7DFE6426D6A322B464C7D7F8

desktop length 526996
mobile  length 322927
```

`.gitattributes` reports both `.html.reference` files as binary with text conversion unset.

The centralized graph independently reports:

```text
{"graphFiles":70,"brandAssets":true,"violations":[]}
```

The graph starts at `scripts/build.js`, follows transitive local CommonJS modules, includes `scripts/brand-assets.js`, includes the centralized non-code product inputs, rejects dynamic/malformed requires and symlinked local modules, and scans text candidates for approved-reference markers.

The required negative regressions are present and passed in exact-head CI:

```text
ok 364 - an imported helper consuming an approved reference fails the guard non-zero
ok 365 - the transitive graph rejects a symlinked local helper
```

The complete exact-head CI run is green:

- `build (ubuntu-latest)` — success
- `build (windows-latest)` — success
- `Approved UI reference secret scan` — success
- `Browser harness (Chromium + Firefox)` — success
- `Compare build hash across operating systems` — success
- `Release build attestation` — skipped under its documented PR-only condition

The run’s `headSha` is exactly:

```text
e3e0c65dedd69ddb605c82a28817892213065c34
```

The unit suite reported:

```text
# tests 417
# pass 417
# fail 0
# skipped 0
# todo 0
```

The CI build produced identical hashes on both passes and both operating systems:

```text
9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7
```

The independently witnessable secret-scan job checked out the exact head, copied exactly the two approved references to a temporary directory, verified their hashes, and reported:

```text
Clean        : True
FindingCount : 0
SkippedCount : 0
Approved UI reference secret scan passed: findings=0, skipped=0.
```

The workflow audit confirms the scan is a separate job, uses the exact PR head checkout, invokes `Invoke-ColdboxSecretScan`, verifies temporary-copy hashes, requires exactly the two candidate files, rejects findings and skipped candidates, and removes only the temporary directory.

The prior F3 finding is resolved by `lstatSync()` path validation and the symlink regression. The prior F4 stale-packet finding is resolved: the packet no longer embeds mutable head/run identifiers and explicitly requires the handoff’s authoritative full SHA and CI run ID to be independently checked against the PR head. The supplied handoff values match GitHub’s exact-head record.

## 2. What I could not verify

No UI.4a acceptance criterion remains unverified.

I did not run local `npm ci`, build, or test commands because this was an explicitly read-only review and those commands mutate dependency/build outputs. Exact-head CI provides the required execution witness. Physical-device testing is not an acceptance criterion for UI.4a and is correctly recorded as outside this contract item.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | **Accept:** byte-exact, non-build copies of both approved handoffs are committed under `docs/05-development/ui-reference/approved/` with SHA-256, byte length, render viewport, product comparison region, navigation taxonomy and complete screen inventory in a machine-readable manifest; `.gitattributes` preserves the reference bytes on every platform; the repository secret-shaped-content scanner reports both supplied artifacts clean before import; [ui-parity.md](../01-spec/ui-parity.md) is the single canonical definition of exact parity, phase-UI versus rolling screen closure, deterministic state classification, zero-unexpected-pixel comparison, mobile evidence and the finite deviation register; [ADR-0049](../adr/0049-approved-mock-parity-contract.md) records why prototype code is quarantined and why later feature items inherit the visual contract; an automated test fails on any reference-byte/hash/size drift, manifest/reference screen or navigation drift, invented/missing deviation ID, loss of the binary line-ending rule, reference entry into a build input, or dependency change that lets UI.5, UI.10 or P2.8 bypass the contract/final gate; the reference payloads are parsed only as inert data in normal automation and are never executed, imported into `src/`, or emitted into `build/coldbox.html`; `src/` is byte-identical to `main`.` | ✅, subject to F1 packet correction | Independent hashes, sizes, attributes, secret scan, 8/8 focused tests, graph/negative fixture, full suite, build checks, manifest, parity contract, ADR, empty `src/` diff, and exact-head CI all support the criterion. |

## 4. Findings

None.

## 5. Verdict rationale

The exact approved desktop/mobile references are immutable and correctly described; the parity contract and finite deviation register are synchronized; the reference payloads remain non-build inert data; the full transitive build-input graph and imported-helper negative regression close F1; the exact-head temporary-copy CI scanner closes F2; the symlink regression resolves the prior F3 finding; the packet’s dynamic handoff evidence resolves F4 without stale mutable identifiers; and all required exact-head CI checks are green with zero skipped tests. UI.4a meets its acceptance criterion and may be closed.

**PASS**. The maintainer may flip UI.4a from `[~]` to `[x]` on this branch and merge PR #60.
