# Independent review — UI.4a final exact-head audit

**VERDICT: PASS**

Reviewed commit: `ce38ae1b8586c84eb037984c36e8adcc54d806ac`  
Exact-head CI: `31935567811`  
Review mode: read-only, CI-witnessed  
Reviewer: `ui4a_final_review_4`  
Date: 2026-08-16

## Scope

I read `AGENTS.md`, the review protocol, roadmap, UI.4a packet, preserved FAIL report, prior PASS report, parity contract, ADR-0049, manifest, workflow, graph implementation, focused tests, and the new compatibility redirect at `docs/05-development/01-spec/ui-parity.md`.

The compatibility redirect is valid and does not alter the canonical parity contract. Documentation hygiene passes with 238 files and zero warnings.

## Verification

- Current checkout is clean at the requested exact head.
- `src/` has no diff from `origin/main`.
- Desktop reference: 526,996 bytes, SHA-256 `fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9`.
- Mobile reference: 322,927 bytes, SHA-256 `af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfE6426d6a322b464c7d7f8`.
- `.gitattributes` preserves both `.html.reference` files as binary.
- Manifest contract resolves to the canonical `docs/01-spec/ui-parity.md`.
- `allowedDeviationIds` contains exactly PAR-001 through PAR-009.
- `allowedPixelMasks` is empty.
- The centralized graph includes `scripts/brand-assets.js`, covers transitive local modules and product data inputs, rejects symlinked helpers, and reports no approved-reference violations.
- The imported-helper negative fixture fails non-zero as required.
- The symlink negative regression passes.
- Focused UI.4a tests: 8 passed, 0 failed, 0 skipped.
- Exact-head CI passed:
  - Ubuntu build
  - Windows build
  - Approved UI reference secret scan
  - Chromium + Firefox browser harness
  - Cross-OS build hash comparison
- Release attestation was skipped only under the documented PR-only condition.
- Unit suite: 417 passed, 0 failed, 0 skipped.
- Reproducible artifact hash on both OSes and both passes: `9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7`.
- Bundle size: 2,667,239 bytes.
- Secret scan independently checked temporary copies of exactly both references:
  - `Clean: True`
  - `FindingCount: 0`
  - `SkippedCount: 0`
  - Copy hashes matched the frozen references.
- No product source, reference bytes, manifest integrity, dependency gates, deviation register, or parity-contract criterion remains unverified.

The prior F3 and F4 findings remain resolved. The new redirect is documentation-only and introduces no new concern.

UI.4a may be flipped from `[~]` to `[x]` by the reviewer and PR #60 may be merged.

PASS
