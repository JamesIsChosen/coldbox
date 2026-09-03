# Review: PR #22 — Browser runner flow

**VERDICT: PASS**

Findings: 0  
Reviewed PR: #22  
Reviewed branch: `docs-browser-runner-flow`  
Reviewed base: `main` at `c2fec78323209c2cc5944e35e900466b196ad83f`  
Reviewed commit: `0429388cccfb8761e8728dc539c8b31381127008`  
Reviewed tree: `8335a4146fbb706ca7f4299a6a10662ebe92cabe`  
Reviewed by: independent agent reviewer  
Date: 2026-08-05

This is a fresh independent re-review of the exact remediation tip requested after the immediately prior independent FAIL at `0266efb4d71c150dffb3db884242fe46e975399e`. I did not accept the author packet, author verdicts, author remediation evidence, author runners, prior implementation claims, or prior PASS claims as proof. The source checkout was treated read-only during substantive verification; all destructive and failure fixtures ran only in disposable clones.

No merge, push, amend, rebase, reset, clean, stash, source-branch switch, roadmap edit, or application/source mutation was performed by this review.

## 1. What I verified

### Exact source / remote / PR gate

Before substantive review I independently verified:

- source branch `docs-browser-runner-flow`;
- source `HEAD` `0429388cccfb8761e8728dc539c8b31381127008`;
- source `HEAD^{tree}` `8335a4146fbb706ca7f4299a6a10662ebe92cabe`;
- source `git status --porcelain=v1 -uall` empty;
- `origin/docs-browser-runner-flow` at the exact reviewed HEAD;
- GitHub PR #22 head branch `docs-browser-runner-flow`;
- GitHub PR #22 head OID `0429388cccfb8761e8728dc539c8b31381127008`;
- GitHub PR #22 base `main`;
- GitHub PR #22 state `OPEN`;
- local `main` `c2fec78323209c2cc5944e35e900466b196ad83f`;
- `origin/main` `c2fec78323209c2cc5944e35e900466b196ad83f`;
- merge-base of `main` and the reviewed tip is current `main`;
- preserved prior fresh FAIL SHA-256 `befba4fceae46a195a23535f1d5b2d0c15f4af106ccef4f144ae38ae518ca260`.

This was not a stale PR.

Independent evidence ZIP:

`coldbox-pr22-independent-rereview-20260805-155814.zip`

SHA-256:

`fddac01276945ac1af3713e03c4d45316ba245dc80d513be4bfe308455478dff`

The uploaded `.sha256` file matched that digest.

### Required inputs

I read the exact-tip snapshots of:

- `AGENTS.md`
- `docs/05-development/review-protocol.md`
- `docs/05-development/ROADMAP.md`
- `docs/05-development/browser-runner-flow.md`
- `docs/05-development/packets/browser-runner-flow.md`
- `docs/05-development/prompts.md`
- `docs/README.md`
- `CHANGELOG.md`
- `scripts/runner/_template.ps1`
- `scripts/runner/secret-scan.ps1`
- `scripts/runner/test-secret-scan.ps1`
- `scripts/runner/test-template-contract.ps1`
- the preserved prior fresh independent FAIL.

### Exact delta from the immediately prior FAIL tip

I independently inspected:

`0266efb4d71c150dffb3db884242fe46e975399e..0429388cccfb8761e8728dc539c8b31381127008`

Verified:

- `0429388...` is a direct child of `0266efb4...`;
- exactly one path changed: `scripts/runner/_template.ps1`;
- numstat is exactly one deletion and one insertion;
- the deleted line is exactly:
  `- Emits a bundle whether it succeeds or fails`
- the inserted line is exactly:
  `- Emits a PASS/FAIL bundle when bundle construction succeeds; construction failures fail closed without publishing an incomplete bundle`
- `git diff --check` passes for the one-line delta;
- replacing only the stale guarantee in the prior template makes the prior text equivalent to the current template text;
- no executable code changed in this remediation commit;
- the new wording truthfully matches the already-implemented fail-closed construction behavior.

The immediately prior one-line wording advisory is closed.

### Complete PR diff / scope

I independently inspected the complete:

`main...0429388cccfb8761e8728dc539c8b31381127008`

diff.

Changed paths are exactly:

1. `CHANGELOG.md`
2. `docs/05-development/browser-runner-flow.md`
3. `docs/05-development/packets/browser-runner-flow.md`
4. `docs/05-development/prompts.md`
5. `docs/README.md`
6. `scripts/runner/_template.ps1`
7. `scripts/runner/secret-scan.ps1`
8. `scripts/runner/test-secret-scan.ps1`
9. `scripts/runner/test-template-contract.ps1`

Verified:

- `git diff --check` passes;
- `docs/05-development/ROADMAP.md` has no diff;
- `docs/05-development/packets/browser-runner-flow.review.md` is not tracked in the PR;
- no application runtime source changed;
- no CSP changed;
- no message schema changed;
- no vault-format code changed;
- no KDF/randomness code changed;
- no package manifest or package lock changed;
- no runtime dependency declaration changed;
- PR #22 contributes no application behavior beyond developer/review workflow changes.

### Author regression suites

For completeness I executed:

- `scripts/runner/test-secret-scan.ps1` — exit `0`;
- `scripts/runner/test-template-contract.ps1` — exit `0`.

I did not accept those PASS strings as proof. The material behavior was independently exercised below.

### Actual exact-tip successful template execution

In a clean disposable clone at the exact reviewed tip I executed the actual `scripts/runner/_template.ps1`, changing only the documented STEPS block, with:

1. `cmd.exe /d /c echo benign-native-stderr 1>&2 & exit /b 0`
2. `npm.cmd ci --no-audit --no-fund`
3. `npm.cmd run verify-vendor`
4. `npm.cmd run lint`
5. `npm.cmd test`
6. `npm.cmd run build`
7. `npm.cmd run test:browser`

Observed:

- Windows PowerShell 5.1 benign native stderr did not false-fail;
- outer process exit `0`;
- manifest verdict `PASS`;
- exactly seven ordered step entries;
- every step exit code `0`;
- Node version `v24.16.0`;
- Node pin `24.16.0` from `.nvmrc`;
- discovery bundle exists;
- 155 `repo/` files;
- 175 total ZIP entries;
- browser-runner packet present in `repo/`;
- `scripts/runner/test-template-contract.ps1` present in `repo/`;
- reviewer FAIL report absent from `repo/`;
- final scan `CLEAN`;
- bundle not redacted;
- independent second scan found zero unexpected findings;
- exact tree remained `8335a4146fbb706ca7f4299a6a10662ebe92cabe`;
- disposable checkout remained clean.

### Deliberate native failure / rollback

A separate actual-template exercise:

- changed to a disposable branch;
- next native command wrote stderr;
- created a runner-owned untracked file;
- exited exactly `23`.

Observed:

- manifest recorded exit `23`;
- outer process exit `1`;
- manifest verdict `FAIL`;
- `rolledBack: true`;
- exact original branch restored;
- exact HEAD `0429388cccfb8761e8728dc539c8b31381127008` restored;
- exact tree `8335a4146fbb706ca7f4299a6a10662ebe92cabe` restored;
- runner-created untracked path removed;
- final `git status --porcelain=v1 -uall` empty;
- failure evidence scan `CLEAN`;
- normal Git stderr during rollback did not create a false rollback failure.

### N1 — discovery construction fail-closed

**Closed independently.**

I forced `git archive` to exit `17` through a controlled wrapper that delegated all other Git operations. Successful STEPS had first moved to a disposable branch and created runner-owned untracked content.

Observed:

- outer process exit `1`;
- construction failure truthfully reported exit `17`;
- no ordinary output ZIP remained;
- zero staging directories remained;
- rollback executed after construction failure;
- original branch restored;
- exact reviewed HEAD restored;
- exact reviewed tree restored;
- runner-created untracked file removed;
- final tree clean.

I separately allowed real tar extraction to populate `repo/`, then forced tar exit `19`.

Observed:

- real extraction completed;
- outer process exit `1`;
- no ordinary output ZIP remained;
- no populated staging remained;
- exact branch/HEAD/tree restored;
- runner-created untracked content removed;
- final tree clean;
- no matched mnemonic/private-key-shaped content printed.

The prior N1 and N3 failure-open/cleanup defects remain closed.

### N2 — configuration-independent clean-tree preflight

**Closed independently.**

In a disposable exact-tip clone I set:

`status.showUntrackedFiles=no`

and created a pre-existing untracked file.

Observed:

- actual template exited `1`;
- explicit `git status --porcelain=v1 -uall` detected the path;
- refusal occurred before the safety tag;
- refusal occurred before STEPS;
- the path was preserved as diagnostic evidence;
- the pre-existing file remained untouched.

Git display configuration cannot bypass the clean-tree gate.

### N4 — packet/evidence provenance

**Closed independently.**

I read the packet literally.

It:

- explicitly says the independent reviewer report is reviewer-owned external/untracked evidence;
- does not describe parent commit `d34495cc4a29449741a17fe2e857492f3d2717a5` as current-tip evidence;
- distinguishes author candidate-tree evidence from external final-tip verification;
- avoids a self-referential final-commit SHA claim;
- states stable candidate-tree expectations rather than pretending a tracked packet proves its own final commit;
- records 155 `repo/` files and 175 total entries;
- records the independently reproduced build SHA.

The packet claims reproduced at the exact reviewed tip.

### N5 — recovery-tag collision diagnostic

**Closed independently.**

I pre-created the intended `runner/<RunnerId>/pre` tag at the immediately prior commit before launching the actual template.

Observed:

- runner exited `1`;
- tag was not overwritten;
- tag commit remained identical;
- no STEPS mutation started;
- final tree remained clean;
- transcript labeled the failure `safety-net`;
- transcript did not label the collision `preflight`.

### Secret scanner / discovery security

I independently verified:

- vendored `@scure/bip39` English wordlist parses to exactly 2,048 unique words;
- the real tracked mnemonic-shaped positive control is detected without matched content being printed;
- a CRLF text fixture larger than 2 MiB is scanned and forces redaction;
- unsafe original manifest content cannot re-enter redacted publication;
- binary exclusions are path-recorded;
- matched secret-shaped values are not printed;
- discovery construction starts from `git archive HEAD`;
- only these exact paths may be sanitized in staged discovery:
  - `test/protocol.test.js`
  - `docs/05-development/packets/p0.7-message-handshake.review.md`
- source copies of those allowlisted paths remain byte-identical;
- only staged copies are sanitized;
- an equivalent new tracked unallowlisted path remains unsanitized and causes final fail-closed two-entry redaction;
- a synthetic `.git/index.lock` causes non-zero refusal and is not deleted or altered;
- scanner/construction failures leave no unsafe populated staging directory.

### Reproducibility / zero application-bundle impact

Independent builds:

| Build | Environment | SHA-256 | Bytes |
|---|---|---|---:|
| exact PR tip A | disposable path A | `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737` | 456208 |
| exact PR tip B | separate path, `TZ=Pacific/Honolulu`, `LANG=de-DE`, `LC_ALL=de-DE` | `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737` | 456208 |
| current `main` | third path, `TZ=Asia/Tokyo`, `LANG=ja-JP`, `LC_ALL=ja-JP` | `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737` | 456208 |

All three `build/coldbox.html` files are byte-identical.

Exact PR application-bundle delta versus current `main`: **0 bytes**.

### Deliberate vendor corruption

In a disposable exact-tip clone I corrupted tracked:

`vendor/npm/@fontsource/bangers/5.3.0/package.tgz`

Observed:

- `npm.cmd run verify-vendor -- --offline` exit `1`;
- `npm.cmd run build` exit `1`;
- disposable clone restored clean afterward.

### Documentation / governance

Independently verified:

- corrected template guarantee is factually accurate;
- explicit unsigned Windows PowerShell 5.1 launch command is documented;
- `RepoPath`, `RunnerId`, `ExpectedBranch`, exact 40-hex `ExpectedHead` are mandatory;
- no executable `REPLACE-ME` bypass;
- Node pin logic matches observed manifest behavior;
- rollback docs match implementation;
- safety-tag docs match implementation;
- preflight/untracked docs match implementation;
- bundle-construction failure/cleanup docs match implementation;
- discovery sanitization/security docs match implementation;
- CHANGELOG entry exists;
- docs index entry exists;
- unrelated cross-workflow triage scope is absent;
- no force-push/history-rewrite behavior was introduced;
- no source `.git/index.lock` deletion exists;
- rollback branch switching is bounded to the recorded starting branch;
- no roadmap completion is claimed.

## 2. What I could not verify

Nothing material remained unverified because of reviewer environment limitations.

## 3. Acceptance criteria / controlling review requirements

PR #22 is intentionally off-roadmap and completes no roadmap checkbox. The controlling review prompt therefore supplies the explicit acceptance surface.

| # | Requirement | Met? | Evidence |
|---|---|---|---|
| 1 | Exact branch/head/tree/remote/PR/base gate | Yes | independently verified |
| 2 | Exact one-line remediation from `0266efb4...` | Yes | one path, 1 deletion, 1 insertion, exact old/new text |
| 3 | No executable or application behavior change in the final remediation commit | Yes | template differs only in comment line |
| 4 | Exactly nine complete-PR changed paths; ROADMAP untouched; review report untracked | Yes | independent three-dot diff |
| 5 | N1 archive failure fails closed, cleans output/stage, atomically rolls back | Yes | forced archive exit 17 |
| 6 | N2 hidden-untracked Git configuration cannot bypass preflight | Yes | hostile-config fixture |
| 7 | N3 post-extraction failure cleans populated staging/output and rolls back | Yes | real extraction then forced tar exit 19 |
| 8 | N4 packet/evidence provenance accurate | Yes | literal packet inspection plus exact-tip reproduction |
| 9 | N5 tag collision non-overwriting and phase accurate | Yes | collision fixture |
| 10 | Actual exact-tip seven-step success run | Yes | process 0, manifest PASS, seven exit-0 steps |
| 11 | Deliberate exit-23 rollback exact branch/head/tree/clean state | Yes | actual failure exercise |
| 12 | BIP-39 / CRLF / >2 MiB / redaction / allowlist / unallowlisted fail-closed behavior | Yes | independent fixtures |
| 13 | `.git/index.lock` preserved | Yes | synthetic lock fixture |
| 14 | Reproducible A/B/main build; zero application-bundle impact | Yes | identical 456208-byte artifact |
| 15 | Corrupted vendor fails verifier and build | Yes | independent corruption fixture |
| 16 | Corrected top-level bundle guarantee matches implementation/docs | Yes | literal source/doc comparison |
| 17 | No findings of any severity | Yes | full review completed with zero findings |

## 4. Prior finding disposition

### Immediately prior one-line advisory

**Closed.** The stale unconditional guarantee was replaced exactly with:

`Emits a PASS/FAIL bundle when bundle construction succeeds; construction failures fail closed without publishing an incomplete bundle`

The remediation commit changes no executable code and the new statement matches independently observed construction behavior.

### N1–N5

| Prior finding | Exact-tip disposition |
|---|---|
| N1 — discovery construction failed open | Closed; archive and post-extraction failures exit non-zero, publish no incomplete ordinary ZIP, clean staging, and roll exact Git state back. |
| N2 — clean-tree preflight Git-config dependent | Closed; explicit `-uall` rejects hidden untracked state before safety tag/STEPS. |
| N3 — pre-publication staging could survive | Closed; populated post-extraction staging is removed on failure. |
| N4 — stale/current-tip evidence provenance | Closed; packet explicitly separates historical, candidate-tree, external reviewer, and fresh exact-tip evidence. |
| N5 — tag collision mislabeled preflight | Closed; collision is non-overwriting and labeled safety-net/non-preflight. |

### Original F1–F15 closure set

The older F1–F15 closure targets were re-checked at this exact tip and remain closed:

- PR packet exists;
- wordlist-backed mnemonic detector catches the real repository positive control;
- CRLF and >2 MiB candidate text are scanned;
- binary exclusions are path-recorded;
- scanner docs match current scanner semantics;
- discovery versus generated-bundle provenance is distinguished;
- fail-closed redacted publication and cleanup operate correctly;
- manifests contain ordered command/exit records;
- preflight-untracked evidence is coherent with clean mutable-run policy;
- discovery figures reproduce at 155/175;
- mandatory state parameters and 40-hex head validation remain;
- exact Windows PowerShell launch command exists;
- actual Windows PowerShell 5.1 template success/failure paths were executed;
- CHANGELOG/docs index are present and unrelated triage scope absent;
- Node pin, exact rollback, and non-overwriting recovery tags remain correct.

## 5. Findings

None.

## 6. Security assessment

No security or workflow-safety finding remains.

The exact-tip review reproduced fail-closed bundle construction, configuration-independent dirty-tree refusal, cleanup of populated staging, atomic rollback after construction failure, index-lock preservation, two-path-only discovery sanitization, unallowlisted secret-shaped fail-closed redaction, non-printing of matched secret-shaped values, corrupted-vendor non-zero failure, and clean scanner results for successful/failure evidence bundles.

No application realm, CSP, message-schema, vault-format, KDF, randomness, runtime dependency, force-push, or history-rewrite behavior changed in this PR.

## 7. Reproducibility / application-bundle impact

`build/coldbox.html` is byte-for-byte identical across both exact-tip environments and current `main`:

- SHA-256 `49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737`
- bytes `456208`
- exact PR application-bundle delta `0` bytes.

## 8. Verdict rationale

Every controlling requirement was independently verified at exact PR tip `0429388cccfb8761e8728dc539c8b31381127008` / tree `8335a4146fbb706ca7f4299a6a10662ebe92cabe`. The immediately prior wording advisory is fixed exactly, N1–N5 remain closed, the older F1–F15 closure set remains satisfied, the complete PR diff contains only the expected developer/review-workflow paths, failure modes fail closed, builds are reproducible with zero application-bundle impact, documentation matches implementation, and I have no findings of any severity.

Per the explicit review task, I did not merge or push anything.

PASS
