# Browser runner flow

Running the normal development loop from a browser chat window, where the agent has **no shell** and you execute every command yourself in PowerShell.

The loop is identical to the local one — implement, self-review gate, PR packet, independent review, PASS/FAIL. What changes is only *who types the commands*. Everything in [AGENTS.md](../../AGENTS.md), [batch-run.md](batch-run.md), [review-protocol.md](review-protocol.md), and [pr-packet.md](pr-packet.md) still applies without exception.

Prompts for every step live in [prompts.md](prompts.md).

---

## 1. The shape of it

```
you paste a prompt in the browser
   ↓
agent emits ONE runner + ONE launch command
   ↓
you run it in PowerShell
   ↓
runner writes coldbox-runner-<id>.zip to your Downloads
   ↓
you upload the zip back to the chat
   ↓
agent reads the result, emits the next runner
   ↓                                    ↺ repeat
batch completes
   ↓
agent produces the PR packet
   ↓
NEW chat, verification agent, own runners → PASS / FAIL
   ↓
PASS → closeout commands, next session starts clean
FAIL → findings go back to the developing agent
```

Two runner families:

| Family | Purpose | Bundle size |
|---|---|---|
| **Discovery** | First runner of a session. Captures full repo state so the agent can orient cold | ≈ 1.4 MB |
| **Step** | Every runner after. Executes work, returns a diff and evidence | Tens of KB |

---

## 2. Non-negotiables

These exist because the alternative silently corrupts something.

**One runner in flight at a time.** Never run two, never run one twice concurrently. Same reason as one-agent-per-working-tree in `AGENTS.md` §6a — git serialises on `.git/index.lock` and concurrent access fails in the nasty asymmetric way where `commit` fails but `push` succeeds.

**Every runner is atomic.** It either fully applies and leaves the tree at a known commit, or it fully reverts and leaves the tree exactly as it found it. There is no partial state. This is what stops fail-patch-on-fail-patch.

**Every runner declares the state it expects.** It aborts before touching anything if the branch or HEAD is not what the agent believed. Drift is caught immediately, not three runners later.

**No secret ever enters an uploaded bundle.** Discovery payload starts from `git archive`. Only two explicit known-public fixture paths — `test/protocol.test.js` and `docs/05-development/packets/p0.7-message-handshake.review.md` — may have BIP-39 mnemonic-shaped or extended-private-key-shaped values replaced in the staged copy. Path/category evidence is recorded in `repo-screening-report.txt`; the source checkout is never altered. Secret-shaped content at any other tracked path is left untouched so the final scanner redacts/fails closed. Step payload also includes generated transcript/diff/evidence files. Every staged file then receives the same final secret scan before zipping. Any remaining secret-shaped hit omits the payload and emits only `manifest.json` + `scan-report.txt`. See §5.

**Never delete `.git/index.lock`.** If a runner finds one at preflight it aborts and reports. Another process may be mid-write.

**The agent never asks you to fix a broken tree by hand.** If a runner fails, its rollback already restored the tree. The next runner starts from a known state.

---

## 3. The runner contract

Every runner — without exception — follows this sequence. The reference implementation is [`scripts/runner/_template.ps1`](../../scripts/runner/_template.ps1).

`RepoPath`, `RunnerId`, `ExpectedBranch`, and the full 40-hex `ExpectedHead` are mandatory. A browser agent hands the human the exact invocation; for an unsigned runner on Windows PowerShell 5.1 the shape is:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\coldbox-runner-p0.17-01.ps1" -RepoPath "C:\Users\you\Projects\coldbox" -RunnerId "p0.17-01" -ExpectedBranch "p0.17-example" -ExpectedHead "0123456789abcdef0123456789abcdef01234567"
```

`-Discovery` is added only for discovery runners. `-OutDir` is optional; it defaults to the current Windows profile's Downloads folder.

### Preflight - changes nothing, and can abort freely

1. `$ErrorActionPreference = 'Stop'`, strict mode on.
2. Resolve and verify the repo path. Abort if it is not a git work tree.
3. Abort if `.git/index.lock` exists.
4. Record untracked paths with `git ls-files --others --exclude-standard` so a refused preflight can report them.
5. Abort if explicit `git status --porcelain=v1 -uall` is non-empty. The explicit `-uall` is required so `status.showUntrackedFiles=no` or similar Git display configuration cannot hide a dirty tree. Any tracked or untracked path refuses the mutable run.
6. Abort if the current branch differs from `ExpectedBranch`.
7. Abort if `git rev-parse HEAD` differs from `ExpectedHead`.
8. Record `node --version` and compare against `.nvmrc` / `package.json` engines. Mismatch is a warning recorded in the manifest.

A refused preflight exits non-zero, writes a safe diagnostic bundle when bundle construction itself is available, and mutates nothing. `preUntracked` is diagnostic evidence for the refusal; it is not permission to start a mutable run from a dirty tree.

### Safety net - before the first mutation

```powershell
git tag "runner/$RunnerId/pre" HEAD
```

A real ref, not a variable. It survives a crashed shell, a closed window, and a reboot. If that exact tag already exists, the safety-net step fails closed; a runner never overwrites an earlier recovery ref.

Because mutable execution starts only after an explicit clean tracked-and-untracked preflight, `preUntracked` is empty for every run that reaches this phase. A non-empty `preUntracked` can appear only in a preflight-refusal diagnostic bundle.

### Execute

Steps run in order. After every external command the runner checks `$LASTEXITCODE` explicitly — **never `$?` after a pipeline**, which reports the last element of the pipe, not the command you care about (`AGENTS.md` §6a). All output is tee'd to the transcript with its exit code.

### Rollback - on any failure after the safety net

```powershell
# if a step changed branches:
git checkout -f $script:BeforeBranch
git reset --hard "runner/$RunnerId/pre"
# remove runner-created untracked paths
# verify exact starting branch + exact starting HEAD + clean `git status --porcelain=v1 -uall`
```

Pre-existing tracked or untracked paths never enter a mutable run; they cause preflight refusal. Therefore every untracked path created after the clean preflight is runner-owned and may be removed during rollback.

The `pre` tag is kept, not deleted, so the state before the runner is always recoverable by name. Closeout deletes session tags (section 7).

Rollback failure is the one unrecoverable case: the runner says so loudly, names the `pre` tag, and stops. It does not attempt a second repair.

### Always - bundle and report

Normal successful runs, preflight refusals, safety-net failures, and step failures produce a scanned evidence bundle.

Bundle construction itself is also fail-closed. If a required construction subprocess such as `git archive` or `tar -xf` exits non-zero, or any exception occurs after staging begins but before publication, the runner exits non-zero. It removes the entire staging directory and any stale or partial ordinary output ZIP. It never converts a requested discovery into a PASS bundle with an omitted or empty `repo/`.

Bundle construction is part of the same atomic transaction as STEPS. If construction fails after the safety net and STEPS changed the checkout, the runner restores the exact starting branch and HEAD, removes runner-created untracked paths, and verifies a clean tree before returning failure. If an earlier step failure already rolled back, construction failure does not run rollback a second time.

A construction failure may therefore produce no uploadable bundle rather than emit misleading or incompletely scanned evidence. The console must identify the bundle-construction failure and return non-zero.

---

## 4. Bundle contents

```
coldbox-runner-<id>.zip
├── manifest.json        runner id, UTC timestamp, verdict, ordered steps
│                        with command + exit code, branch + HEAD before/after,
│                        preflight untracked paths, node pin/version, rollback y/n
├── transcript.txt       every command, its full output, its exit code
├── git-state.txt        status --porcelain=v1 -uall, log --oneline -20, branch -vv
├── evidence/            build hash + byte size, test counts, lint,
│                        verify-vendor, any harness output
├── changes.patch        git diff of what the runner changed  (step runners)
├── repo/                git archive of HEAD                  (discovery only)
└── scan-report.txt      secret-scan result — always present
```

`manifest.json` is what the agent reads first. It is machine-shaped on purpose: the agent should never have to infer success from prose.

**`preTag` is `null` whenever this run created no recovery tag** - for example a preflight refusal or a safety-tag collision. A non-null `preTag` names the recovery ref created by this run.

**Zip entries use backslash separators.** `Compress-Archive` on Windows PowerShell 5.1 writes `repo\src\main.js`, not `repo/src/main.js`. `unzip` warns about it and some tooling mis-splits the paths, so anything reading a bundle should normalise separators before matching on them.

### Evidence provenance

Execution counts, bundle listings, deliberate failure runs, and environment details belong in the PR packet at [`packets/browser-runner-flow.md`](packets/browser-runner-flow.md), but a tracked packet must not call a parent-commit run "current-tip" evidence.

Author remediation evidence records the exact committed candidate tree externally. Final exact-tip provenance is established by closeout verification and fresh independent re-review. This avoids a self-referential packet SHA claim while keeping evidence provenance explicit.

---

## 5. Secret safety

This repository handles seed phrases. A bundle is uploaded to a chat window, so this is the highest-consequence rule in the document.

**Discovery** payload is built from `git archive HEAD`, so its `repo/` directory contains tracked content only. **Step** bundles are assembled separately and may also contain generated `transcript.txt`, `changes.patch`, and build evidence, so tracked-content provenance alone is not a safety boundary.

For discovery bundles, the extracted tracked snapshot is screened against an explicit known-public-fixture allowlist. Only `test/protocol.test.js` and `docs/05-development/packets/p0.7-message-handshake.review.md` may be sanitized, and only in the staged copy. Their BIP-39 mnemonic-shaped runs and extended-private-key-shaped fixtures are replaced with explicit redaction markers and recorded by path/category in `repo-screening-report.txt`. A secret-shaped finding at any other tracked path is recorded as unexpected but deliberately left untouched; the final bundle scan must then redact/fail closed. The untouched checkout remains the source of truth. Before zipping, the runner scans every candidate text file regardless of size. Known binary formats are excluded by extension and every excluded path is listed in `scan-report.txt`; unreadable candidate text is a scan finding rather than a silent skip. CRLF is normalised before mnemonic analysis.

The mnemonic detector loads the English BIP-39 wordlist from the already-vendored `@scure/bip39` 2.2.0 archive and looks for an unanchored run of at least 12 consecutive BIP-39 words within a line. This catches standard 12 / 15 / 18 / 21 / 24-word mnemonics even when source-code, diff, or transcript prefixes/suffixes surround them, while a one-word-per-line wordlist does not self-trigger.

The scanner also rejects:

- `*.cbx`, `*.cbx.bak`, `*.cbw` — vault files
- `*.key`, `*.pem`, `*.asc`, `*.sig` — key material
- `.env`, `.env.*`, any `secrets/` directory
- `xprv`, `yprv`, `zprv`, `tprv`, `uprv`, `vprv` private-key prefixes

A finding never prints matched content. It **gates payload inclusion**: the unsafe staging directory is deleted and the zip contains only a newly generated content-free `manifest.json` and `scan-report.txt`. The redacted manifest records only fixed diagnostic flags/counts (`bundleRedacted: true`, `scanClean: false`) and never copies fields from the rejected original manifest, because the finding itself may have originated there. A clean scan keeps the normal payload and adds `scan-report.txt`.

The complete New-Bundle staging lifecycle is cleanup-protected. Any failure before final publication removes populated staging and any stale or partial ordinary output ZIP before the process exits non-zero.

---
## 6. Independence of verification

**Verification is a new chat, exactly as it is today.** You open a fresh session, paste the verify prompt from [prompts.md](prompts.md), and that agent produces a PASS or FAIL. Nothing about browser mode changes this, and it needs no special machinery — a new session starts with no memory of the implementation work, which is the whole point.

Because it starts cold, it naturally writes its own runners. There is nothing to inherit.

The one thing worth stating, because it is a tempting shortcut rather than an oversight: **do not hand the verification agent the developing agent's bundles or runners to save it a round trip.** Re-running the author's runner reproduces the author's assumptions, which is re-reading rather than reviewing. If a packet's evidence rests on a runner the verifier did not write, that is a finding.

The verifier may of course *read* the developing agent's runner as part of judging the evidence chain — reviewing it as text is fine. Executing it in place of writing its own is not.

| | Developing agent | Verification agent |
|---|---|---|
| Session | the working chat | **a new chat, no shared context** |
| Writes runners | yes | its own, always |
| The other's runners | — | may read as text; never executes |
| Starts from | the current branch | a **fresh clone** into a temp path |
| Builds under | normal conditions | different path, timezone, and locale |
| Breaks things deliberately | no | yes — corrupt a vendor file, confirm non-zero exit |

Verdict rules are unchanged from [review-protocol.md](review-protocol.md): **binary PASS/FAIL, and any finding of any severity — including cosmetic or advisory — is a FAIL.** On FAIL, the findings go back to the developing chat, which fixes them and hands you the re-review prompt — the same loop as [§ Fixing a FAIL](prompts.md#fixing-a-fail) today.

---

## 7. Closeout

After a batch reaches PASS, the agent emits one final runner plus copy-paste commands that leave the machine ready for a cold start:

1. Push every branch produced, in dependency order.
2. `gh pr create` for each, with the **dependency as base** (`batch-run.md` §3) — never `main` for a stacked item.
3. Delete the session's safety tags:
   ```powershell
   git tag --list "runner/*" | ForEach-Object { git tag -d $_ }
   ```
4. Return to a clean baseline, exactly as `AGENTS.md` §6a preflight requires:
   ```powershell
   git checkout main
   git pull
   git fetch --prune
   git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads |
     Where-Object { $_ -match '\[gone\]$' } |
     ForEach-Object { git branch -D ($_ -split ' ')[0] }
   ```
5. Remove any worktrees created for parallel tracks.
6. Confirm `git status` is clean and print the tip of every remaining branch.

The closeout bundle is the proof that the loop actually closed. Without it the next session starts by guessing.

---

## 8. Honest costs

**Latency.** Every command costs a human round trip. Runners should therefore be *fat* — batch many commands into one runner rather than emitting five small ones. This is the opposite of the local flow's instinct.

**Weaker evidence of environment.** The agent only knows what the transcript says. This is why `manifest.json` records Node version, locale, and timezone: so the agent can state honestly in the packet what the evidence was produced under.

**The dirty-tree stop is strict and will occasionally annoy you.** It applies to both tracked and untracked paths, regardless of Git display configuration. If you edited or created a file mid-session, the next mutable runner refuses to start.

**Bundle upload limits.** Discovery is ≈ 1.4 MB. If a chat rejects it, the agent falls back to a metadata-only discovery bundle (no `repo/`) plus targeted file requests — slower, and it should say so rather than proceeding on partial context.

---

## 9. What does *not* change

Everything that makes the process worth having:

- One roadmap item per branch, PR base is the dependency
- Self-review gate between items, second consecutive FAIL stops the batch
- All stop conditions in `batch-run.md` §5
- Packet written to let a reviewer verify **without trusting the author**
- Independent review is binary, and any finding is a FAIL
- Nothing merges during a batch
- Handoff block ends every session, every mode

If browser mode ever seems to justify relaxing one of these, the correct conclusion is that browser mode is being used wrong.
