# PR packet — Browser runner flow

## 1. Summary

This is an **off-roadmap developer-workflow PR**; it completes no roadmap checkbox. It defines the browser-mediated runner workflow, a guarded PowerShell 5.1 template, and fail-closed secret screening for evidence bundles so an agent without shell access can work through one human-executed runner at a time.

The implementation was remediated against the independent FAIL review of PR #22 before this packet was written.

## 2. Scope

**In scope**

- browser-runner workflow documentation and prompts;
- the generic PowerShell 5.1 runner template;
- exact branch/HEAD and clean-tree preflight;
- non-overwriting recovery tags and bounded rollback;
- ordered command/exit-code evidence in `manifest.json`;
- persisted preflight untracked paths;
- BIP-39 wordlist-backed secret screening, CRLF handling, >2 MiB text handling, redacted diagnostic bundles, and staged discovery-copy sanitization;
- explicit launch-command documentation;
- current-tip evidence for successful and deliberately failing native-command execution.

**Not in scope**

- no roadmap item is completed or reinterpreted;
- no cold/warm runtime source, CSP, message schema, vault format, KDF, randomness, or dependency version changes;
- the previously separable cross-workflow triage prompt was removed from this PR.

## 3. How to verify

The permanent source template is `scripts/runner/_template.ps1`. For execution evidence, the documented `STEPS` block was replaced in disposable clones only; scaffolding above and below it was unchanged.

### Successful real-command run

The derived success runner used:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File <derived-from-_template.ps1> -RepoPath <disposable-clone> -RunnerId pr22-template-success-current-tip -ExpectedBranch docs-browser-runner-flow -ExpectedHead d34495cc4a29449741a17fe2e857492f3d2717a5 -Discovery -OutDir <evidence-dir>
```

Manifest step output:

- `cmd.exe /d /c echo benign-native-stderr 1>&2 & exit /b 0` -> exit `0`
- `npm.cmd ci --no-audit --no-fund` -> exit `0`
- `npm.cmd run verify-vendor` -> exit `0`
- `npm.cmd run lint` -> exit `0`
- `npm.cmd test` -> exit `0`
- `npm.cmd run build` -> exit `0`
- `npm.cmd run test:browser` -> exit `0`

Runner verdict: `PASS`.

The run used a fresh disposable clone and executed `npm ci`, networked `npm run verify-vendor`, lint, all unit tests, a build, and `npm run test:browser`. The first step deliberately wrote benign text to native stderr while exiting `0`, proving Windows PowerShell 5.1 did not turn stderr alone into a false failure.

### Deliberate native failure

The failure runner was derived from the same exact template and used one step that writes to stderr and exits `23`.

- `cmd.exe /d /c echo deliberate-native-stderr 1>&2 & exit /b 23` -> exit `23`

Observed outer runner exit: `1`.
Manifest verdict: `FAIL`.
Manifest `rolledBack`: `true`.
The disposable clone returned to the exact expected HEAD with a clean tree.

### Secret scanner regression

```text
PASS: template scanner helpers live in New-Bundle scope and bundle-construction failure exits non-zero.
PASS: rollback Git commands are stderr-safe and rollback success requires exact branch/HEAD/clean-tree verification.
PASS: vendored English BIP-39 wordlist parsed to 2048 unique words.
PASS: repository protocol.test.js is detected as the positive control without printing matched content.
PASS: CRLF text larger than 2 MiB is scanned and secret-shaped content yields manifest + scan-report only.
PASS: a finding inside manifest.json cannot re-enter through the redacted manifest.
PASS: tracked positive-control mnemonic is detected at source, sanitized only in the discovery copy, and the final discovery payload remains usable.
PASS: explicit known-public discovery fixtures sanitize mnemonic/private-key shapes only in the staged copy.
PASS: unallowlisted tracked secret-shaped content is never sanitized and forces final fail-closed redaction.
PASS: clean bundle retains ordinary payload plus scan-report.
PASS: secret scanner regression suite complete.
```

### Reproducible build / bundle impact

Candidate build A:
- path: disposable `candidate-a`
- environment: `TZ=UTC`, `LANG=en-US`, `LC_ALL=en-US`
- SHA-256: `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`
- bytes: `456208`

Candidate build B:
- path: separate disposable `candidate-b`
- environment: `TZ=Pacific/Honolulu`, `LANG=de-DE`, `LC_ALL=de-DE`
- SHA-256: `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`
- bytes: `456208`

Base `main` build:
- detached commit: `c2fec78323209c2cc5944e35e900466b196ad83f`
- environment: `TZ=Asia/Tokyo`, `LANG=ja-JP`, `LC_ALL=ja-JP`
- SHA-256: `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`
- bytes: `456208`

All three outputs are byte-identical. Bundle delta: **0 bytes**.

### Discovery evidence

Implementation-tip discovery bundle before adding this packet:
- `repo/` files: `153`
- total ZIP entries: `173`
- produced ZIP bytes: `1826479`
- final scan: `CLEAN`
- allowlisted staged positive-control paths recorded in `repo-screening-report.txt`: `test/protocol.test.js` and `docs/05-development/packets/p0.7-message-handshake.review.md`

After this packet file was added, current-tip discovery was required to report:
- `repo/` files: `154`
- total ZIP entries: `174`

Those are stable file/entry counts. Compressed ZIP byte size is deliberately **not** turned into a documentation contract: the packet itself is inside the discovery archive, so embedding its own compressed byte count would be recursively self-referential. A current-tip discovery pass after tracking this packet confirmed these stable counts; the runner then reruns discovery after the packet amendment and fails unless they remain exact.

## 4. Acceptance criteria

There is no roadmap acceptance row for this off-roadmap workflow PR. This PR does **not** mark or complete any roadmap item.

Its acceptance basis is the repository governance contract plus disposition of the independent PR #22 findings:

| Finding | Disposition |
|---|---|
| F1 | Resolved: this packet exists and carries real execution evidence. |
| F2 | Resolved: mnemonic detection uses the vendored English BIP-39 wordlist and catches the repository positive control without printing matched content. |
| F3 | Resolved: CRLF is normalized; a CRLF fixture >2 MiB is a required regression. |
| F4 | Resolved: text is not silently skipped by size; binary-extension skips are path-recorded. |
| F5 | Resolved: documentation now describes the implemented wordlist-backed scanner. |
| F6 | Resolved: docs distinguish discovery `git archive` content from generated step-bundle content. |
| F7 | Resolved: a finding gates payload inclusion; only a newly generated content-free manifest plus scan report are uploaded, and staging is cleaned in `finally`. |
| F8 | Resolved: manifest includes ordered `{command, exitCode}` steps; the impossible dirty-preflight flag was dropped. |
| F9 | Resolved: preflight untracked paths are persisted in `manifest.json`. |
| F10 | Resolved: volatile branch-specific figures were removed from normative workflow prose; current evidence lives here. |
| F11 | Resolved: `RepoPath`, `RunnerId`, `ExpectedBranch`, and full 40-hex `ExpectedHead` are mandatory; no `REPLACE-ME` bypass remains. |
| F12 | Resolved: the workflow documents an exact unsigned-PowerShell launch command. |
| F13 | Resolved: the real template scaffolding was exercised with native stderr, `npm ci`, real npm commands, browser harness, and a deliberate exit-23 failure. |
| F14 | Resolved: CHANGELOG/docs index were updated and the separable triage prompt was removed from this PR. |
| F15 | Resolved: Node pin handling, rollback documentation, and non-overwriting recovery tags match code. |

## 5. Security impact

This PR does **not** change the application realm boundary, message schema, CSP, vault format, derivation, randomness, or runtime dependency set.

It **does** handle repository/evidence material that may contain secret-shaped text. If the scanner is wrong, a mnemonic or private-key-shaped value could be uploaded in a browser-runner evidence ZIP. The implementation therefore fails closed at final bundle publication, prints paths only, sanitizes only two explicit known-public discovery fixture paths in the staged copy, and leaves the source checkout unchanged.

New `connect-src` hosts: none.
New protocol message types: none.

## 6. Test evidence

Required scanner regressions prove:

- the vendored English BIP-39 wordlist parses to exactly 2048 unique words;
- the real `test/protocol.test.js` vector is detected without printing its contents;
- CRLF text larger than 2 MiB is scanned;
- a finding yields manifest + scan-report only;
- secret-shaped content in the original manifest cannot re-enter through the redacted manifest;
- discovery sanitizes only the two explicit known-public fixture paths in the staged copy, including mnemonic and extended-private-key shapes, while preserving source files byte-for-byte;
- the same secret-shaped fixture moved to an unallowlisted tracked path remains untouched and forces final fail-closed redaction;
- scanner helper functions are imported in `New-Bundle` caller scope;
- rollback Git commands tolerate benign native stderr and declare success only after exact starting branch/HEAD/clean-tree verification;
- a bundle-construction exception exits non-zero;
- a harmless bundle remains intact.

Negative runner evidence additionally proves a native command that writes to stderr and exits `23` causes runner exit `1`, records exit `23`, and rolls back cleanly.

Anything not tested: no macOS/Linux PowerShell execution was claimed. The target human workflow is Windows PowerShell 5.1; reviewers should still inspect cross-platform assumptions in the documentation.

## 7. Device matrix

Not applicable to this PR. It changes development tooling/documentation only and does not touch bootstrap, CSP, storage, or rendering behavior. The application browser harness was nevertheless run as part of the successful template evidence.

## 8. Assumptions made

**Assumed:** the vendored `@scure/bip39` 2.2.0 English wordlist is the canonical local source for mnemonic-word membership during bundle screening.

**Basis:** it is already pinned and vendored by the repository; the scanner validates that exactly 2048 unique words parse with the expected first/last markers.

**If wrong:** scanner establishment fails closed instead of silently skipping mnemonic analysis.

**Assumed:** only the two explicit known-public fixture paths named by the workflow may have mnemonic/private-key-shaped fixture values replaced in the staged discovery copy, provided the source checkout is unchanged and the final bundle scan still runs.

**Basis:** both allowlisted paths are pre-existing public test/review evidence. A regression copies the same secret-shaped review fixture to an unallowlisted path and proves it is not sanitized and the final bundle fails closed.

**If wrong:** discovery would self-redact permanently because its required positive-control file is tracked.

## 9. What to scrutinise

Pay particular attention to:

1. `Protect-ColdboxDiscoverySnapshot` versus `Invoke-ColdboxSecretScan`: only the two explicit known-public fixture paths may be sanitized; any other secret-shaped tracked path must remain untouched and fail closed in the final scan.
2. `Publish-ColdboxScannedBundle`: an unsafe original manifest must never be copied into a redacted upload.
3. PowerShell 5.1 native stderr handling in `Invoke-Step`.
4. Recovery-tag non-overwrite behavior, stderr-safe native Git rollback, exact branch/HEAD/clean-tree verification, and rollback of runner-created untracked paths.
5. Scanner helper scope: `secret-scan.ps1` must be dot-sourced in `New-Bundle` caller scope, not inside a short-lived importer function.
6. Bundle construction failure must terminate the runner non-zero rather than printing `BUNDLE FAILED` and returning success.
7. The exact boundary between generic template scaffolding and the replaceable `STEPS` block.

## 10. Self-assessment

The most subtle area is the distinction between a **known tracked public test fixture** and secret-shaped content generated or introduced during a runner execution. The implementation handles that distinction by sanitizing only the staged discovery copy and then running the same final scanner over the complete staged bundle.

No application runtime behavior is changed.

The final independent reviewer must not trust this packet: re-run the template in a fresh clone, deliberately fail a native command, inspect both manifests/transcripts, and re-run the scanner regressions.

## 11. Bundle impact

`build/coldbox.html` is unchanged relative to current `main`.

- main: `456208` bytes, SHA-256 `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`
- PR: `456208` bytes, SHA-256 `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`
- delta: **0 bytes**

## 12. Docs updated

Changed documentation in this PR includes:

- `docs/05-development/browser-runner-flow.md`
- `docs/05-development/prompts.md`
- `docs/README.md`
- `CHANGELOG.md`
- this packet

The runtime Help content is unaffected because this is developer workflow tooling, not a user-facing application feature.

## Changed paths in the PR

- `CHANGELOG.md`
- `docs/05-development/browser-runner-flow.md`
- `docs/05-development/packets/browser-runner-flow.md`
- `docs/05-development/prompts.md`
- `docs/README.md`
- `scripts/runner/_template.ps1`
- `scripts/runner/secret-scan.ps1`
- `scripts/runner/test-secret-scan.ps1`
