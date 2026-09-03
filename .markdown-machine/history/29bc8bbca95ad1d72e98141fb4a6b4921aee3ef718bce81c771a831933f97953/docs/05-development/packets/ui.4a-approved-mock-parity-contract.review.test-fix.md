# Independent review — UI.4a final exact-head audit after test-fix

**VERDICT: PASS**

Findings: 0 (0 blocking, 0 advisory)  
Reviewed commit: `9321c7e8c033648193c266ffd47d46e79f311b4a`  
Reviewed by: `ui4a_re_review_after_test_fix`  
Review mode: READ-ONLY (CI-witnessed, run `31936499661`)  
Date: 2026-08-16

## 1. What I verified

I read `AGENTS.md`, the review protocol, the roadmap, the UI.4a packet, all preserved UI.4a FAIL/PASS/final review reports, the parity contract, ADR-0049, the approved manifest, workflow, graph implementation, focused tests, and compatibility redirect.

The checkout is clean at the exact reviewed head:

```text
git status --short --branch
## ui.4a-approved-mock-parity-contract...origin/ui.4a-approved-mock-parity-contract

git rev-parse HEAD
9321c7e8c033648193c266ffd47d46e79f311b4a
```

Product source remains unchanged:

```text
SRC_DIFF_EMPTY=true
```

Reference integrity independently matches the manifest:

```text
desktop: 526996 bytes
SHA256: fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9

mobile: 322927 bytes
SHA256: af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfE6426d6a322b464c7d7f8
```

`.gitattributes` preserves both `.html.reference` files as binary.

The centralized graph reports:

```text
graph-files=70
brand-assets-in-graph=true
violations=[]
```

The graph walks transitive local CommonJS imports from `scripts/build.js`, includes centralized non-code product inputs, rejects dynamic/malformed imports and symlinked helpers, and scans text candidates for approved-reference markers.

The required negative regressions passed:

```text
ok 364 - an imported helper consuming an approved reference fails the guard non-zero
ok 365 - the transitive graph rejects a symlinked local helper
```

The roadmap closure assertion now correctly accepts either the author’s `[~]` state or the independent reviewer’s `[x]` state:

```js
/- \[(?:~|x)\] ... UI\.4a .../
```

It continues to require UI.5, UI.10, UI.11, and P2.8 to remain unchecked with their dependency declarations intact. This allows legitimate reviewer closure without weakening downstream parity or final-gate dependencies. The current roadmap correctly contains UI.4a as `[x]`.

Exact-head CI run `31936499661` is successful for:

- Ubuntu build
- Windows build
- Approved UI reference secret scan
- Chromium + Firefox browser harness
- Cross-OS build hash comparison

Release attestation is skipped only because this is not a release/tag event.

Full suite:

```text
# tests 417
# pass 417
# fail 0
# skipped 0
# todo 0
```

The eight focused UI.4a tests all passed.

Both operating systems produced the same reproducible artifact hash on both build passes:

```text
9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7
```

The exact-reference CI scan checked temporary copies of exactly both approved files and reported:

```text
Clean        : True
FindingCount : 0
SkippedCount : 0
Approved UI reference secret scan passed: findings=0, skipped=0.
```

The scan independently verified copy hashes, invoked `Invoke-ColdboxSecretScan`, required zero findings and zero skipped candidates, and removed only the temporary directory.

Documentation hygiene passed with 239 markdown files and zero warnings. PAR-001 through PAR-009 are synchronized, the pixel-mask list is empty, the immutable reference payloads remain inert non-build data, and the compatibility redirect does not alter the canonical parity contract.

The prior F1, F2, F3, and F4 findings are resolved:

- F1: centralized transitive graph plus imported-helper failure fixture.
- F2: exact-head CI secret scan with temporary copies.
- F3: `lstatSync()` symlink rejection plus negative regression.
- F4: packet evidence refreshed and mutable head/run identifiers kept out of the packet.

## 2. What I could not verify

No UI.4a acceptance criterion remains unverified.

Physical-device, iOS, Android, and prototype-rendering checks are not acceptance criteria for UI.4a and are correctly reserved for UI.11 or the applicable device gate.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | **Accept:** byte-exact, non-build copies of both approved handoffs are committed under `docs/05-development/ui-reference/approved/` with SHA-256, byte length, render viewport, product comparison region, navigation taxonomy and complete screen inventory in a machine-readable manifest; `.gitattributes` preserves the reference bytes on every platform; the repository secret-shaped-content scanner reports both supplied artifacts clean before import; [ui-parity.md](../01-spec/ui-parity.md) is the single canonical definition of exact parity, phase-UI versus rolling screen closure, deterministic state classification, zero-unexpected-pixel comparison, mobile evidence and the finite deviation register; [ADR-0049](../adr/0049-approved-mock-parity-contract.md) records why prototype code is quarantined and why later feature items inherit the visual contract; an automated test fails on any reference-byte/hash/size drift, manifest/reference screen or navigation drift, invented/missing deviation ID, loss of the binary line-ending rule, reference entry into a build input, or dependency change that lets UI.5, UI.10 or P2.8 bypass the contract/final gate; the reference payloads are parsed only as inert data in normal automation and are never executed, imported into `src/`, or emitted into `build/coldbox.html`; `src/` is byte-identical to `main`. | ✅ | Exact hashes/sizes, inert manifest checks, binary attributes, secret scan, graph and negative regressions, dependency gates, 417/417 tests, cross-platform reproducible builds, browser harness, and unchanged product source. |

## 4. Findings

None.

## 5. Verdict rationale

The exact approved desktop/mobile references are immutable, secret-scanned independently at the exact head, excluded from the complete transitive product build-input graph, and protected by imported-helper and symlink regressions. The closure-state test accepts only the legitimate author/reviewer states while preserving all downstream dependency gates. The finite deviation register and empty pixel-mask list remain intact, product source is unchanged, all required CI jobs are green with zero test skips, and no UI.4a criterion remains unverified. PR #60 may be merged.

PASS
