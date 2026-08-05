# PR packet - Browser runner flow

## 1. Summary

This is an off-roadmap developer-workflow PR. It completes no roadmap checkbox and does not change application runtime behavior.

The PR defines the browser-mediated runner workflow, a guarded Windows PowerShell 5.1 template, and fail-closed evidence-bundle screening for sessions where the agent has no shell and the human executes one runner at a time.

The independent exact-tip re-review of PR #22 at `d3a7f7288548601139fa99e9523b74830a8bfd30` returned FAIL with five findings (N1-N5). The preserved reviewer report is:

- `docs/05-development/packets/browser-runner-flow.review.md`
- SHA-256 `e2dc5e161e08508df5b17b5212aa1ce106140d0ce25f9ebbdd1326b45df7194d`

That report is reviewer-owned remediation input, not author evidence. It remains external/untracked during author remediation and must remain byte-for-byte unchanged.

## 2. Scope

In scope:

- browser-runner workflow documentation and prompts;
- generic PowerShell 5.1 runner template;
- exact branch/HEAD and configuration-independent clean-tree preflight;
- non-overwriting recovery tags and bounded rollback;
- ordered command/exit-code evidence in `manifest.json`;
- diagnostic recording of untracked paths when preflight refuses to run;
- BIP-39 wordlist-backed secret screening and explicit known-public discovery-fixture sanitization;
- fail-closed discovery archive/extraction behavior;
- full staging/partial-output cleanup for bundle-construction failures;
- accurate failure-phase diagnostics;
- end-to-end template contract regressions.

Not in scope:

- no roadmap item is completed or reinterpreted;
- no cold/warm runtime source, CSP, message schema, vault format, KDF, randomness, or runtime dependency version changes;
- no force push, merge, rebase, or deployment behavior.

## 3. Evidence provenance

This tracked packet intentionally does not embed or call a parent commit "current-tip" evidence.

The remediation workflow constructs the complete proposed Git tree first, including this packet and all regression sources. The immutable independent FAIL report remains reviewer-owned external/untracked workspace evidence and is copied byte-for-byte into the external remediation evidence bundle instead of being added to the author remediation commit. The workflow then commits the proposed Git tree in a disposable clone and executes author-side verification against that disposable committed candidate.

The exact disposable candidate commit and tree SHA are recorded in the external remediation evidence bundle. They are not embedded here because a tracked packet cannot embed its own final commit SHA without changing that commit.

Before source closeout, the final source commit must be created without content changes and its Git tree SHA must equal the externally recorded, already-tested candidate tree SHA. Fresh independent re-review must still verify and execute the exact final PR tip itself. Author evidence is never a substitute for independent exact-tip review.

Historical execution evidence from parent commit `d34495cc4a29449741a17fe2e857492f3d2717a5` is historical only and is not described as current-tip evidence.

## 4. How to verify

Read:

- `AGENTS.md`
- `docs/05-development/review-protocol.md`
- `docs/05-development/browser-runner-flow.md`
- this packet
- the preserved independent FAIL report
- `scripts/runner/_template.ps1`
- `scripts/runner/secret-scan.ps1`
- `scripts/runner/test-secret-scan.ps1`
- `scripts/runner/test-template-contract.ps1`

Run at minimum:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\runner\test-secret-scan.ps1 -RepoPath .
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\runner\test-template-contract.ps1 -RepoPath .
npm ci --no-audit --no-fund
npm run verify-vendor
npm run lint
npm test
npm run build
npm run test:browser
```

Then exercise the actual `_template.ps1` in disposable clones by replacing only its documented `STEPS` block.

Successful real-command sequence:

1. native command writes benign stderr and exits `0`;
2. `npm ci --no-audit --no-fund`;
3. networked `npm run verify-vendor`;
4. `npm run lint`;
5. `npm test`;
6. `npm run build`;
7. `npm run test:browser`.

Required success semantics:

- runner process exit `0`;
- manifest verdict `PASS`;
- all seven manifest step exit codes `0`;
- discovery bundle exists;
- `repo/` exists and contains the tracked snapshot;
- final scan `CLEAN`;
- bundle is not redacted;
- checkout remains clean.

Deliberate native failure:

- exercise branch restoration;
- create one runner-owned untracked file;
- write to native stderr;
- exit exactly `23`.

Required failure semantics:

- manifest step exit `23`;
- process exit non-zero;
- verdict `FAIL`;
- `rolledBack: true`;
- exact starting branch restored;
- exact starting HEAD restored;
- runner-created untracked file removed;
- final checkout clean;
- evidence bundle scan `CLEAN`.

## 5. N1-N5 remediation disposition

| Finding | Required closure in this remediation |
|---|---|
| N1 - discovery construction fails open | `git archive` and `tar -xf` are checked through an stderr-safe native wrapper. Any non-zero exit throws. A requested discovery can never return ordinary PASS with missing/empty `repo/`. Bundle construction is part of the runner transaction: if construction fails after the safety net and STEPS mutated the checkout, exact rollback runs before failure returns. The legacy scanner regression now requires a bundle-construction `exit 1` after any required rollback/verification instead of requiring adjacency to the `BUNDLE FAILED` log. End-to-end regressions force archive exit `17` after tracked/untracked/branch mutation and post-extraction tar exit `19`, require runner exit non-zero, exact branch/HEAD/clean-tree restoration, and no ordinary output ZIP. |
| N2 - Git-config-dependent clean-tree preflight | Untracked paths are collected first for refusal diagnostics, then cleanliness is checked with explicit `git status --porcelain=v1 -uall`. Any tracked or untracked path aborts before safety tag/steps. Regression sets `status.showUntrackedFiles=no` and proves the untracked path is still refused and persisted in the failure manifest. |
| N3 - pre-publication staging can survive | The complete `New-Bundle` lifecycle is protected by `finally`. Any construction failure removes staging and any partial/stale output ZIP. The tar regression performs real extraction first, then forces non-zero exit and requires populated staging and output to be absent afterward. |
| N4 - parent evidence called current-tip | This packet no longer makes that claim. It states the candidate-tree evidence model explicitly, records historical parent evidence only as historical, and reserves final exact-tip verification for external closeout evidence and fresh independent re-review. |
| N5 - tag collision mislabeled as preflight | The runner tracks `failurePhase`. Tag collision reports `safety-net`, never `preflight`. An end-to-end collision regression checks both tag non-overwrite and diagnostic text. |

## 6. Prior F1-F15 status

The prior F1-F15 remediation remains part of the current PR. The new N1-N5 fixes do not weaken it.

In particular:

- PR packet exists;
- BIP-39 detection uses the vendored English wordlist;
- real tracked mnemonic positive control is detected without printing matched content;
- CRLF and >2 MiB text are scanned;
- binary exclusions are path-recorded;
- unsafe original manifests cannot re-enter redacted bundles;
- ordered `{command, exitCode}` step records are persisted;
- mandatory `RepoPath`, `RunnerId`, `ExpectedBranch`, and 40-hex `ExpectedHead` remain enforced;
- exact launch-command documentation remains present;
- Node pin handling remains present;
- recovery tags remain non-overwriting;
- scanner helpers remain in `New-Bundle` caller scope;
- bundle-construction exceptions remain non-zero;
- rollback remains stderr-safe and verifies exact starting branch/HEAD/clean tree;
- known discovery fixture sanitization remains limited to the two documented allowlisted paths;
- equivalent secret-shaped content at an unallowlisted path remains untouched and forces final fail-closed redaction.

## 7. Security impact

The PR does not change application realm boundaries, CSP, message schemas, vault format, cryptography, randomness, dependencies, or user-facing runtime behavior.

Security-sensitive workflow rules:

1. Mutable runners start only from an explicitly clean tracked-and-untracked tree.
2. `.git/index.lock` is never deleted.
3. Discovery `repo/` is required when `-Discovery` is requested; archive/extraction failure is fatal.
4. Only the two explicit known-public fixture paths may be sanitized in the staged discovery copy.
5. Any other secret-shaped tracked content remains untouched and causes final payload redaction.
6. The complete bundle stage is cleanup-protected, including failures before the publisher is entered.
7. A failed construction removes partial/stale ordinary output ZIPs rather than leaving evidence that could be mistaken for the current run.
8. Findings print path/category only, never matched secret-shaped content.

## 8. Template contract regression

`scripts/runner/test-template-contract.ps1` is an end-to-end Windows PowerShell 5.1 contract suite. It uses disposable local clones and independently exercises:

- `status.showUntrackedFiles=no` with a pre-existing untracked file;
- recovery-tag collision and phase labeling;
- forced `git archive` exit `17`;
- real tar extraction followed by forced exit `19`;
- staging cleanup after the post-extraction failure;
- stale/partial output ZIP removal.

The source repository is read-only to this regression.

## 9. Reproducibility / application bundle

The remediation is developer tooling/documentation only. Author closeout must still rebuild candidate and current `main` under different path/locale/timezone conditions and verify byte identity.

The expected unchanged application artifact from the independently reviewed parent tip is:

- bytes: `456208`
- SHA-256: `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`

The remediation runner must independently reproduce that result before closeout. If it does not, the remediation fails.

## 10. Discovery evidence

The proposed remediation tree adds one tracked file relative to the previously reviewed tip:

- `scripts/runner/test-template-contract.ps1`.

The independent FAIL report remains reviewer-owned external workspace/evidence and is deliberately not absorbed into the author remediation commit.

Therefore the author remediation gate expects current candidate discovery to contain:

- `155` `repo/` files;
- `175` total ZIP entries;
- this packet and `scripts/runner/test-template-contract.ps1`;
- final scanner `CLEAN`;
- bundle not redacted.

These figures are candidate-tree expectations, not a self-referential final commit SHA claim.

## 11. What to scrutinise

Fresh independent re-review should focus on:

1. all `New-Bundle` construction subprocess exit codes;
2. whether any requested discovery can report PASS without a valid `repo/`;
3. whether bundle-construction failure after successful mutations rolls the checkout back atomically before returning non-zero;
4. cleanup after failures before `Publish-ColdboxScannedBundle`;
5. explicit `--porcelain=v1 -uall` preflight behavior under hostile Git display configuration;
6. coherence of untracked-path diagnostics versus mutable-run clean-tree policy;
7. failure-phase labeling around safety-tag collision;
8. preservation of the two-path discovery fixture allowlist and unallowlisted fail-closed behavior;
9. whether the final source commit tree exactly matches the externally tested candidate tree;
10. reproducible zero-byte application bundle impact.

## 12. Changed paths in the PR

The complete PR remains limited to developer workflow/documentation paths:

- `CHANGELOG.md`
- `docs/05-development/browser-runner-flow.md`
- `docs/05-development/packets/browser-runner-flow.md`
- `docs/05-development/prompts.md`
- `docs/README.md`
- `scripts/runner/_template.ps1`
- `scripts/runner/secret-scan.ps1`
- `scripts/runner/test-secret-scan.ps1`
- `scripts/runner/test-template-contract.ps1`

`docs/05-development/ROADMAP.md` remains untouched.
