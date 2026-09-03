# Independent review — UI.4a remediation

**VERDICT: FAIL**

Reviewed state: working-tree remediation on branch `ui.4a-approved-mock-parity-contract`; the only committed head remains `7fc24b56bbab70def5cacd1f1fe571fa6dc02a6f`.  
Review mode: CONNECTED, read-only working-tree review  
Date: 2026-08-16

## What I verified

- Read `AGENTS.md`, `docs/05-development/review-protocol.md`, the roadmap, parity contract, ADR-0049, manifest, packet, workflow, graph implementation, and focused tests.
- Reference bytes remain unchanged:
  - Desktop: 526,996 bytes, SHA-256 `fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9`
  - Mobile: 322,927 bytes, SHA-256 `af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8`
- `.gitattributes` preserves `*.html.reference` as binary.
- Product source diff under `src/` is empty.
- The graph currently resolves 70 files and includes `scripts/brand-assets.js`.
- The imported-helper negative test passes independently: 1 test passed, 0 failed.
- Independent temporary-copy secret scan passed:
  - `Clean=True`
  - `FindingCount=0`
  - `SkippedCount=0`
- `npm run lint` passed.
- `npm run check-docs` passed with 235 files and 0 warnings.
- Roadmap dependency gates, PAR-001–PAR-009, and empty pixel-mask list are structurally present.

## Findings

### F3 — Local-module symlinks are not rejected despite being claimed as rejected

**Severity:** advisory, must-fix  
**Location:** `scripts/build-input-graph.js:95-101`

**Observed:** `resolveLocalModule()` checks `fs.statSync(candidate).isFile()`. `statSync()` follows symlinks, so a symlinked local helper can enter the graph without triggering the stated symlink failure. Symlink rejection exists only in `readDirectoryFiles()` for centralized data inputs.

**Expected:** The transitive graph must either reject symlinked local modules or accurately document that they are followed and validate their resolved target remains inside the project.

**Required action:** Use `lstatSync()`/equivalent for local module candidates and fail closed on symlinks, or resolve and validate the real path before admitting the module. Add a negative regression if this behavior is retained as a guarantee.

### F4 — Packet evidence is stale after adding the graph helper

**Severity:** advisory, must-fix  
**Location:** `docs/05-development/packets/ui.4a-approved-mock-parity-contract.md` product-input isolation section

**Observed:** The packet records:

```text
$ git diff --name-only main -- src scripts vendor assets package.json package-lock.json
(no output)
```

Once `scripts/build-input-graph.js` is committed, that command will report `scripts/build-input-graph.js`.

**Expected:** Verification evidence must reproduce against the remediation head.

**Required action:** Refresh the packet with real post-commit output and explain that `scripts/build-input-graph.js` is a guard-only module, not consumed by the product build; separately show the actual product build-input graph remains reference-free.

## What I could not verify

- No new 40-character remediation head exists yet; the remediation is uncommitted.
- No exact-head CI run exists yet for the remediation.
- Full required verification at the remediation head—including full tests, vendor verification, reproducible builds, and browser CI—remains unverified.

## Provisional rationale

F1 and F2 are substantially addressed, but the symlink behavior contradicts the graph’s fail-closed claim, and the packet contains non-reproducible evidence after the new helper is added. The review cannot become PASS until those findings are corrected, the packet is refreshed, the remediation is committed and pushed, and all required CI checks pass at that exact new head.
