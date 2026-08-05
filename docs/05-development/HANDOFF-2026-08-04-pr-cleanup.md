# Handoff — PR cleanup session, 2026-08-04

**Read this before doing anything.** It exists so the next agent does not repeat ~4 hours of work, and so two independent review reports (28 findings between them) are not rediscovered from scratch.

**Incoming agent has no shell.** Everything below must be executed through the browser runner workflow. See §8 — and read §0 first, because that workflow is itself one of the things under review and it has a defect that matters to you specifically.

---

## 0. 🔴 Read this first — the runner's secret scanner does not work

The browser workflow you are about to use is defined by PR #22 (`docs-browser-runner-flow`). Its `scripts/runner/_template.ps1` scans every bundle for seed phrases before zipping it and uploading it to a chat window. **That scanner does not detect the mnemonics already sitting in this repository.**

An independent reviewer reproduced a complete leak chain. The regex at `_template.ps1:219` is anchored `^...$`, so it only fires on a line that is *nothing but* a word run:

- It does **not** match `test/protocol.test.js:212`, which contains a real 12-word `abandon … about` vector and is in every discovery bundle.
- It does **not** match across CRLF. `transcript.txt` (built with `AppendLine`) and `changes.patch` (built with `Out-String`) are both CRLF on Windows — the two files that carry non-`git archive` content, i.e. exactly the ones the "tracked content only" safety argument does not cover.
- It silently skips any file ≥ 2 MB, while `browser-runner-flow.md` §8 tells agents to make runners *fat*.

The commit that introduced it, `cc13d55`, says *"Verified against every tracked text file: no matches. Positive control: a 12-word 'abandon … about' vector is still detected."* Both halves are true and together they are misleading — the positive control was a synthetic bare line, and "no matches" meant the scanner is blind, not that the tree is clean.

**What this means for you, practically:**

1. Treat every bundle as unscanned. Do not rely on `scan-report.txt` saying CLEAN.
2. Fixing this scanner (finding F2/F3/F4 in §5) is the highest-value single task in this handoff. Do it early, because you depend on it.
3. Until it is fixed, do not run a runner that captures `npm test` output into a transcript you then upload. `test/protocol.test.js` passes a mnemonic through an assertion; if that assertion ever regresses, `node --test` prints the mnemonic, `Invoke-Step` tees it into `transcript.txt`, and it gets zipped and uploaded. The reviewer reproduced this end to end.

Also note: the scanner reports **paths only**, never matched content. So the failure mode is a miss, not a leak into the log itself.

---

## 1. Where things stand

**Goal the maintainer stated:** get all open PRs cleared and merged into `main` so the tool can start being used. Delay is costing them — PRs are piling up.

**Three PRs open, all three FAIL or unreviewed.** None can merge as-is.

| PR | Branch | Base | Status |
|---|---|---|---|
| #20 | `p0.12-kdf-profiles` | `p0.11-vault-format` (deleted) → **must retarget to `main`** | Independently reviewed 2026-08-04: **FAIL, 13 findings** (§4) |
| #21 | `p0.13-lock-save-load` | `p0.12-kdf-profiles` | **NEVER REVIEWED.** Stacks on #20 |
| #22 | `docs-browser-runner-flow` | `main` | Independently reviewed 2026-08-04: **FAIL, 15 findings** (§5) |

Both review reports are reproduced in full below. **Do not re-run those reviews.** They cost ~90 minutes each and their findings are current as of the commits named.

---

## 2. 🙋 Immediate action required from the human

**Local branches contain unpushed work.** Everything this session produced on the three branches exists only on the maintainer's machine. If it is not pushed, the next agent's discovery bundle will not contain it and this handoff will describe a state that does not exist on the remote.

```powershell
cd C:\Users\semaj\Projects\coldbox
git push origin main
git push origin docs-browser-runner-flow
git push origin p0.12-kdf-profiles
git push origin p0.13-lock-save-load
```

Then, on GitHub: **retarget PR #20 from `p0.11-vault-format` to `main`.** Its base branch was merged and deleted, so the PR currently points at a dead ref.

Expected result after pushing:

| Branch | Tip |
|---|---|
| `main` | `af152b6` + this handoff commit |
| `docs-browser-runner-flow` | `7fc7e85` |
| `p0.12-kdf-profiles` | `02d0b03` |
| `p0.13-lock-save-load` | `4f56909` |

---

## 3. What this session already did — do not redo

### 3a. Recovered three lost independent reviews (merged to `main`)

A `git stash` contained independent review reports for **P0.6, P0.7 and P0.8** that were written and never committed. All three are FAIL, 27 findings total, 8 blocking, against the cold realm bootstrap, the message handshake, and the CSP canary — the project's central security claims. Remediation had already happened *without those reports visible in the tree*, so nothing tied the fixes to the findings.

- Recovered from stash `9054bc6`, committed at `084b53e` (blobs verified byte-identical to the stash).
- **All 27 findings dispositioned against current `main`** at `af152b6`, with evidence, in a "Disposition of findings" section appended to each report. Reviewer text and verdicts untouched.
- **Result: 25 Resolved, 2 open.** Both open ones are environmental, not code defects:
  - Upstream `verify-vendor` (networked) — needs registry access. Closes with `npm run verify-vendor` on a machine that has it.
  - Node major mismatch — verification ran on v22.22.3, `package.json` pins `24.16.0`. Closes with `node --version && npm run lint && npm test && npm run test:browser` on 24.16.0.
- The stash has been dropped. The reports are the record now.

**Two resolutions worth knowing**, because they shape the codebase:

- **P0.6 F2** — the reviewer objected that the roadmap's "throw" criterion had been reinterpreted as "reported blocked". It was first amended (ADR-0008 written), then *reversed*: `c6d6cc2` implemented a literal throw contract in `src/cold/main.js` and deleted ADR-0008. The harness now reports `(threw)` for all three cold primitives. The criterion is met as written.
- **P0.7 F2** — the reviewer said the schema banned secret *field names*, not secret *content*, and refused to choose the fix. The strong option was taken: the public projection now rejects **every free-form string** (labels, notes, names, tags, unknown nested records), permitting only UUIDs, eight-hex fingerprints, validated xpubs, validated addresses, and numeric accounting values. Documented in `architecture.md` §Message schema.

### 3b. Surfaced a live defect on `main` — still open, needs a decision

`docs/05-development/adr/README.md` links to **ADR-0008**, which `c6d6cc2` deleted from `main`. The file survives only on `p0.13-lock-save-load` (added at `3476f04`), so the two branches disagree about whether ADR-0008 exists.

**This closes automatically when #21 merges** — that branch carries the file. Until then `main` has a dangling link, and P0.18's internal-link check is specified to catch exactly this. Recorded rather than patched, because withdrawing or reinstating an ADR is a structural decision.

### 3c. Recorded that P0.5 and P0.9 have never been independently reviewed

New coverage table in `docs/05-development/packets/README.md`. Both items are marked `[x]` and merged. Neither has ever had an independent `.review.md` committed on any branch.

- **P0.5** — `BATCH-2026-08-03.md` claims "Fresh independent review PASS". No artifact backs it.
- **P0.9** — a file briefly occupied the reviewer-reserved `.review.md` path (`0ab8626`, "P0.9: record self-review PASS"), the same violation P0.6/P0.7/P0.8 reviewers each raised as F1. Renamed to `.self-review.md` later; no independent review replaced it.

P0.12 and P0.13 stack directly on P0.5 and P0.9. Neither gap is evidence of a defect. It is a maintainer decision whether to review retrospectively or accept the gap explicitly.

### 3d. Fixed stale review headers

`p0.3a-headless-browser-harness.review.md` and `p0.4-csp-hash-pinning.review.md` each contain **two stacked reviews** — an original FAIL and a later independent re-review with **VERDICT: PASS**. A naive `grep -m1 VERDICT` reads FAIL. Both now carry a navigation banner at the top. Neither verdict was altered.

### 3e. Brought all three PR branches up to date with `main`

All three were 10–24 commits behind. Merged (not rebased — the stack would have broken).

**#22 (`docs-browser-runner-flow` → `7fc7e85`)** — zero file overlap, clean merge. Verified: lint clean, 49/49 tests, reproducible build `49694b68…`.

**#20 (`p0.12-kdf-profiles` → `02d0b03`)** — two conflicts:
- `scripts/run-browser-harness.js` — both sides added assertions. Kept all three (they check different things).
- `BATCH-2026-08-03.md` — both sides stale. Reconciled to fact.
- Also restyled P0.12's cold-realm benchmark UI into the design system (it arrived on the pre-redesign palette). Timings moved to monospace per `design-system.md` §4; disabled state uses solid colours instead of an opacity wash.
- Verified: lint clean, 52/52 tests, reproducible `05f56acd8e8789f9a270bc570bad1815092391b32ab4ff6adb95350ec36bc636`, 465,023 bytes.

**#21 (`p0.13-lock-save-load` → `4f56909`)** — three conflicts:
- `src/cold/main.js` — both sides set root attributes on the ready path. Kept all three.
- `docs/05-development/adr/README.md` — **genuine ADR number collision.** Both branches created an ADR-0009: p0.13's iOS local-HTML execution decision, and `main`'s comic visual language. `main`'s is published, so **p0.13's was renumbered to ADR-0010** and every reference across the docs updated (9 files).
- `BATCH-2026-08-03.md` — reconciled.
- Also restyled P0.13's cold-realm vault UI, including the passphrase field, into the design system. Monospace + letter-spaced (a passphrase is data being transcribed; spacing makes a masked character count readable), thick pink focus ring, status state carried by an inset bar *and* words, not colour alone.
- Verified: lint clean, 53/53 tests, reproducible `04c9ea3fd0cd30f5b71aed13924aeb4314efc312a82795cc21b9760bd260863b`, 575,066 bytes.

### 3f. Earlier in the session — the UI redesign (already merged to `main`)

Comic visual language across the warm shell, 3D dashboard stage, yellow app bar, two vendored display typefaces inlined as base64 `data:` URIs. Spec at `docs/01-spec/design-system.md`, rationale in ADR-0009, packet at `packets/ui-comic-design-system.md`. Browser harness passed in Chromium and Firefox. **Its load-bearing rule is `design-system.md` §6:** security surfaces get the comic shell and none of the comic behaviour — no tilt, no animation, no stickers on anything that reports live boundary state or touches secret material. You will need this when fixing #20 and #21's UI findings.

---

## 4. Review report — PR #20 (P0.12 KDF profiles)

**VERDICT: FAIL** · 13 findings (4 blocking, 9 advisory) · reviewed commit `02d0b03`, effective base `main` @ `af152b6` · independent reviewer agent, 2026-08-04.

### What the reviewer confirmed good — do not re-verify

- Argon2id parameters match ADR-0003, `crypto-choices.md` and `vault-format.md` **exactly**, and match what the header actually stores: Fast 19456 KiB/t=2/p=1, Standard 65536/3/1, Paranoid 262144/4/1. Mutating `262144`→`262143` fails the test.
- **No realm-boundary violation.** No `src/protocol.js` change, no new message type, no new field, no new `connect-src` host. `benchmarkProfiles` is confined to the cold document (confirmed structurally in `build/coldbox.html`). Benchmark inputs are fixed constants, zeroed in `cleanup()`.
- Build reproducible across two paths, two locales, two timezones: `05f56acd8e…`, 465,023 bytes.
- Vendor corruption and unmanifested-artifact both fail closed, exit 1.
- Live timings measured: fast 86.5 ms, standard 426.2 ms, paranoid 2570.8 ms — real and correctly ordered.
- Zero broken internal links in the docs this PR changed.

### Findings

**F1 — Packet and self-review evidence does not reproduce at the reviewed commit.** *Blocking.* `packets/p0.12-kdf-profiles.md` §3/§11 and the self-review. Every figure is stale: claims 7 vendor artifacts (actual 9), 47 tests (actual 52), hash `7968d840…` (actual `05f56acd…`), 354,940 bytes (actual 465,023). The self-review still says "Findings: 0 … PASS" against commit `cdc8ca6`, which is not the tip — no author gate was ever run at the reviewed commit. `BATCH-2026-08-03.md` points at the self-review as "canonical current-tip evidence", which is circular. **Action:** re-run the full gate at the tip, replace §3 and §11, re-issue the author gate against the actual commit.

**F2 — Packet declares the wrong PR base.** *Advisory.* §1 says the base "must therefore be `p0.11-vault-format`". That branch is merged and deleted, and the same commit's `BATCH-2026-08-03.md` says #20 must be retargeted to `main`. **Action:** update §1, retarget the PR.

**F3 — The benchmark control stays live after the cold realm enters lockdown.** *Blocking. This is the serious one.* `src/cold/main.js:203-204` enables the button on `cryptoReport.nobleAesGcm === true` alone — **before** `canaryPassed` is computed, before `airgap.neuterNetwork()` installs, before the `randomValues` check. Nothing re-disables it in `setAirgapFailure` (`:43`), `setCapabilityFailure` (`:73`), `setCryptoFailure` (`:164`) or `recordRuntimeViolation` (`:175`). So a realm displaying `data-vault-operations="refused"` and "Vault operations are refused" still offers a working Argon2id control. Two files over, `src/cold/vault.js:87` gates everything through `vaultHealthReady()`, which requires cold-state ready + canary passed + neutering installed + randomValues + airgap green + lockdown none + vault-operations guarded. `benchmarkProfiles()` has no equivalent gate. **Action:** enable only on the same full health condition `vaultHealthReady()` uses, disable in every failure path, add a test asserting the button is disabled when canary/neutering/randomValues fail.

**F4 — No test enforces "benchmark reports realistic timings".** *Blocking.* `test/crypto.test.js:96-110` only asserts `typeof durationMs === 'number'` and `>= 0`. Replacing `monotonicNow()` with `return 0;` makes every profile report 0.0 ms and the suite still exits 0 (`# tests 4 / # pass 4 / # fail 0`). The roadmap criterion is "benchmark reports realistic timings". **Action:** add a test with a strictly positive lower bound and the monotonic ordering `fast < standard < paranoid`; confirm it fails under a stubbed clock.

**F5 — No test enforces sequential execution.** *Advisory.* The packet lists sequential execution as an in-scope resource-safety property. Replacing the promise chain with `Promise.all(...)` — all three allocating 19+64+256 MiB concurrently — leaves the suite green (`# tests 15 / # pass 15 / # fail 0`). The existing assertion only checks result-array order, which `Promise.all` preserves. **Action:** add a non-overlap test with an instrumented `argon2.hash`, or drop the claim.

**F6 — `build.md` now contradicts the code.** *Advisory.* `docs/05-development/build.md:155` says to check the "Vault details / P0.10" panel; this PR renamed it to "P0.12" at `src/cold/index.html:20`. **Action:** update `build.md`, or stop encoding the roadmap ID in the label.

**F7 — First focusable element in the sealed realm ships with no focus indicator.** *Advisory.* `#cold-kdf-benchmark-run` is the first interactive element ever added to `src/cold/`. `src/cold/styles.css` has no `:focus` or `:focus-visible` rule. `design-system.md` §9 requires `0.2rem` solid `--fill-pink` at `0.18rem` offset, "visible on every focusable element". *(Note: a `--cold-pink` token was added on `p0.13-lock-save-load` for the passphrase field — reuse it.)* **Action:** add a `:focus-visible` rule meeting §9.

**F8 — Button is below the 44 × 44 CSS px touch-target floor.** *Advisory.* `font-size: 0.7rem` + `padding: 0.35rem 0.7rem` + `border: 0.13rem` renders ≈28–29 px tall. `design-system.md` §9 sets ≥ 44 × 44 on mobile, non-negotiable. Matters more than usual: the control exists so phone users can find out whether a profile is viable on their phone, and iOS is what the Paranoid warning is about. **Action:** `min-height: 2.75rem`.

**F9 — Hard-coded hex in a new rule.** *Advisory.* `src/cold/styles.css:150` `background: #8e8e9c;`. `design-system.md` §3: "Never hard-code a hex value in a rule — add a token." Contrast itself is fine (≈5.86:1). **Action:** add a `--cold-disabled` token.

**F10 — Unreachable "failed closed" branch.** *Advisory.* `src/cold/main.js:154-161` renders "KDF benchmark failed closed; no profile was selected." `benchmarkProfiles()` terminates with `work.then(onFulfilled, onRejected)` where the rejection handler *returns* an all-`unavailable` report rather than rethrowing, so the promise can never reject. Confirmed empirically. Dead code, untested. **Action:** remove it, or make the failure path reject and test it.

**F11 — The benchmark does not time the same Argon2 call the vault performs.** *Advisory.* `runArgon2Benchmark()` (`src/cold/crypto.js:203-212`) passes an 8-byte `secret` and 12-byte `ad`; `deriveKey()` (`:464-472`) passes **neither**. Memory/passes/lanes match; the call shape does not. Packet §5 claims "the exact parameters already stored by the vault layer". **Action:** drop `secret`/`ad` from the benchmark call, or correct the claim.

**F12 — "Offered before vault creation" cannot be verified in this branch.** *Blocking.* ROADMAP:116 requires the benchmark be "offered before vault creation". There is no vault-creation surface in this branch — the packet says so itself. The criterion is satisfied only vacuously, and nothing constrains P0.13 to actually place it ahead of creation. Packet §4 restates the criterion and answers a different one, which is a reinterpretation (AGENTS.md §7 forbids this). **Action:** state plainly that placement is deferred to P0.13, and record it as a required acceptance element of P0.13 so it cannot be lost. Do not present it as met here.

**F13 — Browser-harness assertions unverifiable in the review environment.** *Advisory.* Playwright binaries could not be downloaded. The four assertions this PR adds are UNVERIFIED. Note the third of them is the one F3 shows to be wrong in the failure case — the harness only ever checks the healthy boot. **Action:** none on the author for the binaries; re-review must run somewhere the harness executes, and the harness should gain a failure-path assertion once F3 is fixed.

### Reviewer's environment caveats

Node v22.22.3 (repo pins 24.16.0). `npm run test:browser` could not run. Worked in a throwaway `git worktree`, removed afterwards; repository untouched.

---

## 5. Review report — PR #22 (browser runner flow)

**VERDICT: FAIL** · 15 findings (4 blocking, 11 advisory) · reviewed commit `7fc7e85`, base `main` @ `af152b6` · independent agent reviewer, 2026-08-04.

Diff is 693 lines across three files: `docs/05-development/browser-runner-flow.md` (237), `docs/05-development/prompts.md` (85), `scripts/runner/_template.ps1` (371).

### What the reviewer confirmed good — do not re-verify

- All internal links and anchors resolve in both changed docs.
- Baseline green: lint, `verify-vendor --offline`, 49/49 tests.
- **Nothing in the branch weakens a hard constraint.** No CSP, `connect-src`, message-schema, vault-format or randomness change. No prompt tells an agent to self-merge or skip review; §6's "do not hand the verification agent the developing agent's bundles" is a genuine strengthening.
- The scan reports **paths only** — it never prints matched content.
- **Not stale vs `main`** — `7fc7e85` already merged main in.

### Findings

**F1 — No PR packet. Not exempt.** *Blocking.* The reviewer argued both sides and concluded it is a finding: `packets/ui-comic-design-system.md` is the precedent for off-roadmap work shipping a packet that argues its own scope, and AGENTS.md §6's stated purpose ("let a reviewer verify your work without trusting you") is *more* necessary when there are no acceptance criteria. **Action:** write `packets/browser-runner-flow.md` with a §2 stating it completes no roadmap item, carrying the real transcripts.

**F2 — The mnemonic scan cannot detect a mnemonic as it actually appears in this repository.** *Blocking, secret-handling.* See §0. `_template.ps1:219`, anchored `^[ \t]*(?:[a-z]{3,8}[ \t]+){11,23}[a-z]{3,8}[ \t]*$`. Misses `test/protocol.test.js:212` (tracked, in every discovery bundle). Misses `changes.patch` (lines start `+`/`-`/space). Misses `transcript.txt` (lines prefixed `[HH:mm:ss] INFO `). **Action:** replace with a wordlist-backed unanchored sliding-window scan. Add a regression test whose positive control is `test/protocol.test.js` itself, not a synthetic bare line.

**F3 — The scan cannot match across CRLF, and the two highest-risk bundle files are CRLF.** *Blocking, secret-handling.* In .NET, `(?m)$` matches only before `\n`; a preceding `\r` is not consumed by `[ \t]`. `transcript.txt` uses `AppendLine` (`\r\n`), `changes.patch` uses `Out-String` (`\r\n`), both read back with `Get-Content -Raw`. `.gitattributes` (`* text=auto eol=lf`) protects the `repo/` archive, which is why it went unnoticed. **Action:** normalise to LF before scanning. Add a CRLF fixture.

**F4 — Files ≥ 2 MB silently unscanned.** *Advisory.* `_template.ps1:207` (`$_.Length -lt 2MB`), no log line, no note in `scan-report.txt`. `browser-runner-flow.md:215` tells agents runners should be *fat*. **Action:** log skipped files into `scan-report.txt`; raise or remove the cap for text.

**F5 — §5 describes a scan the code does not implement.** *Advisory.* Doc claims words "from the BIP-39 wordlist"; code consults no wordlist and matches any `[a-z]{3,8}`. Doc claims 12/15/18/21/24; `{11,23}`+1 means every count 12–24. **Action:** rewrite §5 after fixing F2.

**F6 — "Bundles are built from `git archive`, never from a directory copy" is false for step runners.** *Advisory.* `git archive` runs only under `if ($Discovery)` (`:300`). Step bundles contain `transcript.txt`, `git-state.txt`, `changes.patch`, `evidence/build.txt` — the last derived from `build/coldbox.html`, which `.gitignore` excludes. §5's load-bearing security argument does not apply to them. **Action:** rewrite §5's opening claim.

**F7 — "The bundle is written whether the run succeeded or failed" is false in the one case that matters.** *Advisory.* `Invoke-SecretScan` is called at `:320` *inside* `New-Bundle` and `throw`s at `:234` on any finding, so `Compress-Archive` never runs and **no zip exists** — precisely when a secret is detected. Also `Remove-Item $script:Stage` (`:326`) is skipped, leaving a full staged copy of the repo plus transcript in `%TEMP%\coldbox-runner-<id>` indefinitely. **Action:** make the scan gate *content inclusion* rather than aborting bundle creation; emit a redacted bundle (manifest + scan-report only); clean or explicitly quarantine the staging directory with a logged path.

**F8 — `manifest.json` documented with fields it does not emit.** *Advisory.* Doc promises `exitCodes` and a `dirty-at-preflight` flag; neither exists (`:248-269`). Per-step exit codes live only in transcript prose, which §4 says the design exists to avoid. The dirty flag is unimplementable as documented — preflight aborts on a dirty tree, so it could only ever be `false`. **Action:** emit a `steps` array of `{command, exitCode}`; drop the dirty flag from the doc.

**F9 — "Untracked files … recorded to a manifest" — recorded only in process memory.** *Advisory.* `$script:PreUntracked` is an in-memory array, absent from `manifest.json`, adjacent to a sentence promising the tag "survives a crashed shell … and a reboot". **Action:** persist it, or correct §3.

**F10 — §4's "Verified" numbers do not match the branch.** *Advisory.* Claims "144 entries, 139 files under `repo/`, 1.29 MB". Tracked file counts: `72c50ab`/`33427e0`/`dde22a8` = 129, `main` = 148, branch tip = **150**. 139 matches no commit anywhere. **Action:** re-run discovery at the tip and restate, or move the evidence into the packet.

**F11 — `$RepoPath` defaults to the author's personal absolute path.** *Advisory.* `_template.ps1:22` `= 'C:\Users\semaj\Projects\coldbox'`. A verifier told to "clone fresh into a temp path" who omits `-RepoPath` silently runs against the developing agent's live checkout — AGENTS.md §6a's two-agents-one-tree prohibition, reached *by default*. Compounding: `$ExpectedBranch` defaults to `'REPLACE-ME'` and `:128` **skips the branch check entirely** when it is still `REPLACE-ME`. So an unfilled template mutates the author's repo on whatever branch it happens to be on with no branch guard. **Action:** make `RepoPath`, `ExpectedBranch`, `ExpectedHead` mandatory with no defaults; remove the `REPLACE-ME` bypass; fail closed.

**F12 — Both docs mandate "the exact launch command"; neither contains one.** *Advisory.* No `powershell`/`pwsh`/`-File`/`-RunnerId` example anywhere in the diff; no `-ExecutionPolicy` guidance for an unsigned `.ps1`; no statement of which parameters are required. `-Discovery` and `-ExpectedHead` are real parameter names — nothing is *wrong*, a complete invocation simply does not exist. **Action:** add a fenced example in §3.

**F13 — The template's only ever-executed step is `git --version`; every real command is commented out.** *Advisory.* `_template.ps1:346-350`. So `Invoke-Step` has never run against a command producing stderr or a non-zero exit. That matters: `:68` combines `2>&1` with script-wide `$ErrorActionPreference = 'Stop'` (`:33`) — the classic PowerShell 5.1 `NativeCommandError` shape, where stderr merged into the success stream becomes `ErrorRecord` objects and a terminating error can fire before `$LASTEXITCODE` is read. `npm ci` emits `npm warn` to stderr routinely. Reviewer could not execute PowerShell so recorded it as a risk, not a defect — but the reason it is unverified is that the author's own evidence never exercised the path. **Action:** uncomment the npm steps, run end to end including one deliberately failing step, paste the transcript into the packet.

**F14 — Process compliance.** *Advisory.* Three lapses: no `CHANGELOG.md` entry (AGENTS.md §5); `browser-runner-flow.md` absent from `docs/README.md`'s `05-development/` list, which `doc-hygiene.md` marks a **Fail**-severity automated check; and commit `dde22a8` adds a triage prompt scoped to *both* workflows and independently useful — a second separable unit of work on one branch (AGENTS.md §6a). **Action:** add the first two; split the third or justify it in the packet's Scope section.

**F15 — Smaller code/doc divergences.** *Advisory.* Four:
- `browser-runner-flow.md:75` says preflight compares against `.nvmrc` / `package.json` engines; `:144` reads `.nvmrc` only.
- `:144-147` — when `.nvmrc` is absent, `$pinned = '(unpinned)'` and the guard `$NodeVersion -notlike '*(unpinned)*'` is always true, so it warns *"Node vX does not match pinned (unpinned)"* on every run. A warning that always fires trains the reader to ignore it.
- Doc `:96` documents rollback as `git checkout $ExpectedBranch`; code `:178` uses `$script:BeforeBranch`. Equivalent only when `ExpectedBranch` was filled in — which per F11 is not enforced.
- Doc `:99` promises the `pre` tag is "kept, not deleted, so the state before any runner is always recoverable by name"; code `:157` uses `git tag -f`, silently overwriting it on a re-run with the same `RunnerId`.

### Reviewer's environment caveats

No PowerShell available (no `pwsh`/`dotnet`/`mono`; the GitHub release download returned 403). `_template.ps1` was **never executed**. Regex semantics verified in Python 3.10, which shares .NET's `$`/multiline behaviour exactly — an analogue, not the runtime. The two "Verified" runs in §4 are unreproducible: no transcripts, bundle listings or manifests are committed anywhere.

---

## 6. PR #21 (P0.13) — NOT REVIEWED

No independent review exists. It carries only a self-review, which under `review-protocol.md` is not a review.

It stacks on #20, so it needs re-review after #20's findings are fixed regardless. Known context:

- Acceptance criterion includes *"the manual base64 path is a complete, usable flow on iOS Safari, not a stub"*. The roadmap's own 🌐 note says this **cannot be verified without an iPhone** and must stay unverified until P0.19.
- The branch contains commits `2b8f1ae "docs: record iOS Files launch limitation"` and `3476f04 "docs: accept iOS portability boundary"`, and ADR-0010 (renumbered this session) withdraws the claim that a local `coldbox.html` executes in Safari from iOS Files. **Read that ADR carefully before accepting the criterion as met** — the reviewer of #20 flagged the equivalent pattern as criterion reinterpretation (F12).
- Roadmap still marks P0.13 `[~]`, not `[x]`.
- It carries ADR-0008, whose absence is the dangling link on `main` (§3b).

**Expect the same class of findings as #20**: stale packet evidence (its self-review predates this session's merge), design-system compliance on the new vault UI, and mutation-coverage gaps.

---

## 7. Recommended order of work

Dependency-ordered. Do not reorder — #21 stacks on #20.

1. **Human pushes the four branches and retargets #20** (§2). Nothing else can start.
2. **Fix #22's scanner first** — F2, F3, F4, F7. You depend on this tool, and every bundle you produce until it is fixed is unscanned. This is the single highest-value task in the handoff.
3. **Finish #22** — F1 (packet), F11 (mandatory params), F13 (run the template for real), F5/F6/F8/F9/F15 (doc/code reconciliation), F10 (figures), F12 (launch command), F14 (CHANGELOG, docs/README, split the prompt).
4. **Fix #20's F3** — the fail-closed defect. Gate the benchmark button on `vaultHealthReady()`'s condition, disable in every failure path, test the failure case.
5. **Fix #20's F4 and F5** — the two mutation-coverage gaps. Both are "the suite stays green when you break the thing it claims to test".
6. **Fix #20's remaining findings** — F1 (regenerate all evidence at the tip), F2, F6–F12.
7. **Re-review #20** with a fresh agent. Any finding is a FAIL; expect at least one more round.
8. **Merge #20 to `main`** once PASS. It is not one of the human-merge-only items.
9. **Rebase/merge #21 onto the new `main`**, then get its **first ever** independent review.
10. **Merge #21.** This also closes the ADR-0008 dangling link (§3b).
11. Then the roadmap resumes at **P0.14 — Save integrity**.

Two decisions the maintainer still owes, neither blocking the above:

- Whether to retrospectively review P0.5 and P0.9 or accept the gap explicitly (§3c).
- Whether ADR-0008 is reinstated or withdrawn (§3b) — resolves itself if #21 merges.

---

## 8. Working from the browser

Full protocol: `docs/05-development/browser-runner-flow.md` and `docs/05-development/prompts.md` — **both on the `docs-browser-runner-flow` branch, not on `main`.** You will need that branch checked out, or read them from the discovery bundle.

The loop:

```
you emit ONE runner + ONE launch command
  → human runs it in PowerShell
  → runner writes coldbox-runner-<id>.zip to Downloads
  → human uploads the zip to chat
  → you read manifest.json first, then transcript.txt
  → emit the next runner
```

Non-negotiables from §2 of that doc, which still hold:

- **One runner in flight at a time.** Git serialises on `.git/index.lock`; concurrent access fails asymmetrically (`commit` fails, `push` succeeds).
- **Every runner is atomic** — fully applies and leaves a known commit, or fully reverts.
- **Every runner declares expected branch and HEAD** and aborts before touching anything on drift.
- **Never delete `.git/index.lock`.** *(This session hit a stale one and had to request explicit permission to remove it — it was genuinely orphaned, not another process. Do not assume that.)*
- **A dirty tree is never absorbed.** It belongs to the human or a previous run.

Adjustments for this specific handoff:

- **Assume every bundle is unscanned** until §0's findings are fixed. Do not upload a bundle containing `npm test` output before then.
- **Fill in `-RepoPath`, `-ExpectedBranch` and `-ExpectedHead` explicitly on every runner.** Per F11 the template's defaults point at the maintainer's checkout and the branch guard silently disables itself when `ExpectedBranch` is still `REPLACE-ME`.
- **Add a launch command to every runner you emit** — the docs mandate one and provide no example (F12). Include `-ExecutionPolicy Bypass` for the unsigned script.
- **Expect `Invoke-Step` to be untested against real commands** (F13). If `npm ci` throws `NativeCommandError`, that is F13 manifesting, not your runner being wrong.

Useful commands to put in your first discovery runner:

```
git log --oneline -5 main
git branch -vv
git status --porcelain
node --version
npm run lint
npm run verify-vendor -- --offline
npm test
npm run build            # twice, compare hash AND byte size
npm run test:browser     # works on the maintainer's Windows machine
```

---

## 9. Only the human can do these

| | |
|---|---|
| Push the four branches, retarget #20 | §2 — blocks everything |
| Merge any PR | No agent has push credentials |
| An iPhone | P0.13's iOS Safari criterion; P0.19 |
| Repository secrets | P0.18 CI attestation |
| Decide on P0.5/P0.9 retrospective review | §3c |
| Decide ADR-0008's fate | §3b |
| Run `npm run verify-vendor` networked | Closes the last open finding from §3a |
| Run `npm run test:browser` | Works on their machine; no agent environment here could download Playwright binaries |

---

## 10. Verified state at handoff

Every branch below is green as of this session. `main` at `af152b6`:

```
npm run lint                        pass
npm run verify-vendor -- --offline  pass, 9 artifacts
npm test                            49/49
npm run build ×2                    49694b68007140a56ca404ff1cf6aeff22ed6764aacbaca5b87e1adf3d400737
                                    456,208 bytes, identical across path/locale/timezone
```

| Branch | Tests | Build hash | Bytes |
|---|---|---|---|
| `main` @ `af152b6` | 49/49 | `49694b68…d4bd52a6…` (see above) | 456,208 |
| `docs-browser-runner-flow` @ `7fc7e85` | 49/49 | `49694b68…` | 456,208 |
| `p0.12-kdf-profiles` @ `02d0b03` | 52/52 | `05f56acd8e8789f9a270bc570bad1815092391b32ab4ff6adb95350ec36bc636` | 465,023 |
| `p0.13-lock-save-load` @ `4f56909` | 53/53 | `04c9ea3fd0cd30f5b71aed13924aeb4314efc312a82795cc21b9760bd260863b` | 575,066 |

Working tree clean on `main`. No stashes. No `runner/*` tags. One worktree.

**These hashes are the ones the packets must be regenerated against** (#20 F1). If you get a different hash, something changed — find out what before proceeding.
