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

**No secret ever enters a bundle.** Bundles are built from `git archive` — tracked content only — and scanned before zipping. See §5.

**Never delete `.git/index.lock`.** If a runner finds one at preflight it aborts and reports. Another process may be mid-write.

**The agent never asks you to fix a broken tree by hand.** If a runner fails, its rollback already restored the tree. The next runner starts from a known state.

---

## 3. The runner contract

Every runner — without exception — follows this sequence. The reference implementation is [`scripts/runner/_template.ps1`](../../scripts/runner/_template.ps1).

### Preflight — changes nothing, and can abort freely

1. `$ErrorActionPreference = 'Stop'`, strict mode on.
2. Resolve and verify the repo path. Abort if it is not a git work tree.
3. Abort if `.git/index.lock` exists.
4. Abort if `git status --porcelain` is non-empty. **A dirty tree is never absorbed** — it belongs to you or to a previous run, and `AGENTS.md` §6a forbids sweeping it up.
5. Abort if the current branch ≠ `ExpectedBranch`.
6. Abort if `git rev-parse HEAD` ≠ `ExpectedHead`.
7. Record `Node --version` and compare against `.nvmrc` / `package.json` engines. Mismatch is a warning, not an abort — but it goes in the manifest, because build evidence produced under the wrong Node is weaker evidence.

Any abort exits non-zero, writes a bundle explaining why, and **mutates nothing**.

### Safety net — before the first mutation

```powershell
git tag "runner/$RunnerId/pre" HEAD
```

A real ref, not a variable. It survives a crashed shell, a closed window, and a reboot. Untracked files present at preflight are recorded to a manifest so rollback can tell yours from the runner's.

### Execute

Steps run in order. After every external command the runner checks `$LASTEXITCODE` explicitly — **never `$?` after a pipeline**, which reports the last element of the pipe, not the command you care about (`AGENTS.md` §6a). All output is tee'd to the transcript with its exit code.

### Rollback — on any failure

```powershell
git reset --hard "runner/$RunnerId/pre"
# delete only untracked paths that did NOT exist at preflight
git checkout $ExpectedBranch
```

Untracked files you already had are left alone. The `pre` tag is **kept**, not deleted, so the state before any runner in the session is always recoverable by name. Closeout deletes them (§7).

Rollback failure is the one unrecoverable case: the runner says so loudly, names the `pre` tag, and stops. It does not attempt a second repair.

### Always — bundle and report

The bundle is written whether the run succeeded or failed. A failed run's bundle is *more* important than a successful one.

---

## 4. Bundle contents

```
coldbox-runner-<id>.zip
├── manifest.json        runner id, UTC timestamp, verdict, exit codes,
│                        branch + HEAD before and after, node version,
│                        dirty-at-preflight flag, rollback performed y/n
├── transcript.txt       every command, its full output, its exit code
├── git-state.txt        status --porcelain, log --oneline -20, branch -vv
├── evidence/            build hash + byte size, test counts, lint,
│                        verify-vendor, any harness output
├── changes.patch        git diff of what the runner changed  (step runners)
├── repo/                git archive of HEAD                  (discovery only)
└── scan-report.txt      secret-scan result — always present
```

`manifest.json` is what the agent reads first. It is machine-shaped on purpose: the agent should never have to infer success from prose.

---

## 5. Secret safety

This repository handles seed phrases. A bundle is uploaded to a chat window, so this is the highest-consequence rule in the document.

**Bundles are built from `git archive HEAD`, never from a directory copy.** `git archive` emits tracked content only — it cannot pick up `.env`, `node_modules/`, `build/`, or an ignored `.cbx` file, because those are not in the tree.

Before zipping, the runner scans everything staged for the bundle and **aborts on any match**:

- `*.cbx`, `*.cbx.bak`, `*.cbw` — vault files
- `*.key`, `*.pem`, `*.asc`, `*.sig` — key material
- `.env`, `.env.*`, `secrets/`
- Anything matching a BIP-39 mnemonic shape: 12 / 15 / 18 / 21 / 24 consecutive lowercase words from the BIP-39 wordlist
- `xprv`, `yprv`, `zprv`, `tprv`, `uprv`, `vprv` prefixes

A hit aborts the bundle and reports the offending path **without printing the matched content**. Fail closed, per `AGENTS.md` §3.

The scan report is included even when clean, so the agent and the verifier can both see it ran.

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

**The dirty-tree stop is strict and will occasionally annoy you.** If you edited a file mid-session, the next runner aborts. That is correct — the alternative is your edit landing in a commit that claims to be one roadmap item.

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
