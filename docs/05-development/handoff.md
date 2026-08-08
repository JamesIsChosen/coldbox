# Handoff blocks

**Every session ends with a handoff block. No exceptions, in any mode.**

The human should never memorize a command, work out what happens next, or search these docs. They copy, they paste, they move on.

**Fill in every placeholder.** You know the branch name, the PR number, the item ID, the packet path. Leaving `<branch>` for the human to substitute defeats the entire point.

A session that ends without a handoff block is a contract violation.

---

## Who does what

**Agents do the git work.** You should not be running `git push` or `gh pr create` by hand.

| Action | Who |
|---|---|
| Branch, commit, push | **Agent**, always |
| Open the PR | **Agent**, always — using `gh pr create` |
| Merge on PASS | **Reviewer agent**, automatically |
| Merge on FAIL | Nobody. It gets fixed first |
| Anything needing hardware, credentials, or your judgement | **You** — with exact commands, see §0 |

**If an agent cannot run a command** — `gh` unauthenticated, permission refused, network blocked — it does not silently skip it. It puts the exact command in a §0 block with the real values filled in, and says what's blocked until you run it.

## The loop

```
implement ──→ pushes, opens PR, hands off review prompt
review ──┬──→ PASS: merges, hands off next-item prompt
         └──→ FAIL: fix prompt, then re-review prompt
fix ──────→ pushes, hands off re-review prompt
```

In the normal case you paste **one prompt per step** and run no commands at all.

---

## 0. Action required from you

**When present, this goes FIRST — above everything else in the handoff.** Not after four branches of summary. If you are blocked, you need to know before you read anything else.

Use it whenever the human must act: a `👤 human-required` item, a missing credential, an agent-blocked command, or a decision that isn't the agent's to make.

```markdown
---

# 🙋 Action required from you

**Blocked:** P0.19 device matrix — and everything in Phase 1 behind it.
**Why me:** needs physical devices. No agent can do this.

## What to do

Open `build/coldbox.html` on each device and confirm the seven checks in
`docs/05-development/testing.md`:

- [ ] **iOS local-execution target** — record PASS, BLOCKED, or UNSUPPORTED with the exact device and iOS build; Quick Look is not a Safari pass ([ADR-0010](adr/0010-ios-local-html-execution.md))
- [ ] Android Chrome, from Files
- [ ] macOS Safari
- [ ] Tor Browser

Per device: cold realm/handshake healthy · capability panel accurate · **two named vaults** create-confirm-save-library-reload/unlock correctly · **vault details show Argon2id, not PBKDF2** · a save path works · live warm reachability loss/restoration is reflected while cold stays sealed and unknown fails online-safe · layout usable.

## Then run

​```powershell
git checkout main
git pull
​```

## Then paste this into a new session

> Read `AGENTS.md`. I completed the P0.19 human device work: every supported execution-matrix platform passed its seven checks, and the separate iOS local-execution target is recorded as PASS, BLOCKED, or UNSUPPORTED with the exact device and iOS build under ADR-0010. Verify those recorded results; if they satisfy the P0.19 acceptance criteria, mark P0.19 `[x]` and continue from the next available item.

**Until this is done:** nothing in Phase 1 can start.

---
```

If a command failed rather than a task needing you, same shape — state what failed, give the exact command with real values, and say what's blocked:

```markdown
# 🙋 Action required from you

**Blocked:** PR creation — `gh` returned "authentication required".

​```powershell
gh auth login
gh pr create --base main --head p0.5-warm-shell-skeleton --title "P0.5 - Warm shell skeleton" --body-file docs/05-development/packets/p0.5-warm-shell-skeleton.md
​```

**Until this is done:** the work is pushed and safe, but cannot be reviewed.
```

Every exit path below terminates in a paste-ready next step.

---

## 1. Item complete

**You open the PR yourself before writing this block.** Run the push and `gh pr create`, then report the result.

```markdown
---

## ✅ Handoff — P0.5 complete

**Pushed and PR opened:** https://github.com/JamesIsChosen/coldbox/pull/12

**Paste into a NEW session:**

> Read `docs/05-development/review-protocol.md`, then review PR #12 (branch `p0.5-warm-shell-skeleton`) as an independent reviewer. Verify every claim yourself — do not take the packet's word for anything. Build under a different path, timezone, and locale. Deliberately break things and confirm they fail closed with non-zero exit codes. Run `npm run test:browser` and confirm every browser assertion executes. Check the acceptance criteria verbatim against the roadmap. Write your report to `docs/05-development/packets/p0.5-warm-shell-skeleton.review.md`, end with a PASS or FAIL verdict — any finding of any severity is a FAIL — and **merge the PR yourself if it passes**.

Stop this session first, or give the reviewer its own checkout:
`git worktree add ../coldbox-review p0.5-warm-shell-skeleton`

**⚠️ Tell the reviewer:** <anything ambiguous, or a result readable two ways>
```

**No commands for the human.** If `gh pr create` failed, use a §0 block instead and say what's blocked.

That last line is not filler. A weakness you flagged is a managed risk; the same one found by the reviewer discredits every other claim in your packet.

---

## 2. Stopped mid-item

```markdown
---

## ⏸️ Handoff — stopped mid-item

**Item:** P0.11 — Vault format v1
**Branch:** `p0.11-vault-format` (pushed, `a1b2c3d`)
**State:** header and AAD done; compartments and padding not started
**Safe to build on:** yes / no — <why>

**Why I stopped:** <reason>

**Pushed** — nothing is lost. No PR yet, since the item isn't finished.

**Resume in a new session:**
> Read `AGENTS.md`. Continue P0.11 on branch `p0.11-vault-format`. Read `docs/05-development/packets/p0.11-vault-format.md` for where the previous session stopped. Do not start a new item. Open the PR when it's done.

**What I'd do next:** <specific next step>
```

---

## 3. Batch complete

**You push and open every PR yourself**, in dependency order, with the correct base — stacked branches target their dependency, not `main`.

```markdown
---

## ✅ Batch handoff — 4 items, all PRs open

| Item | Branch | PR | Base | Self-review |
|---|---|---|---|---|
| P0.4 | `p0.4-csp-hash-pinning` | #12 | `main` | PASS (2 rounds) |
| P0.5 | `p0.5-warm-shell-skeleton` | #13 | `p0.4-csp-hash-pinning` | PASS |
| P0.6 | `p0.6-cold-realm-bootstrap` | #14 | `p0.5-warm-shell-skeleton` | PASS |
| P0.7 | `p0.7-message-handshake` | #15 | `p0.6-cold-realm-bootstrap` | PASS |

**Review in this order — each in its OWN new session.** Each reviewer merges on PASS, which retargets the next PR automatically.

**→ #12 first:**
> Read `docs/05-development/review-protocol.md`, then review PR #12 (branch `p0.4-csp-hash-pinning`) as an independent reviewer. […full prompt…] Merge the PR yourself if it passes.

**→ #13, after #12 merges:**
> Read `docs/05-development/review-protocol.md`, then review PR #13 (branch `p0.5-warm-shell-skeleton`) as an independent reviewer. […full prompt…] Merge the PR yourself if it passes.

*(…one per item…)*

**Why it stopped:** <reason>

**Scrutinise hardest:** <where you're least confident>

**Known-weak:** <untested platforms, unverified assumptions>

**Next leg** — once these are merged, paste into a new session:
> Read `AGENTS.md` and `docs/05-development/batch-run.md`. This is one leg of a campaign to complete Phase 0. […full campaign prompt…]
```

**Review order is not optional.** Reviewing #13 before #12 merges means implicitly accepting #12 unreviewed — which is how unreviewed code reaches `main`.

---

## 4. Batch stopped at a human-required item

The all-night case. **Lead with what the human must do**, since nothing progresses until they do it.

```markdown
---

## 🛑 Batch handoff — stopped at P0.19 (human-required)

**Completed:** P0.4, P0.5, P0.6, P0.7 — all pushed, PRs open
**Stopped at:** P0.19 — device matrix. Needs real hardware; an agent cannot do it.

### 👤 What only you can do

Open `build/coldbox.html` on each device and confirm the seven per-platform checks in `docs/05-development/testing.md`:

- [ ] **iOS local-execution target** — record PASS, BLOCKED, or UNSUPPORTED with the exact device and iOS build; Quick Look is not a Safari pass ([ADR-0010](adr/0010-ios-local-html-execution.md))
- [ ] Android Chrome, from Files
- [ ] macOS Safari
- [ ] Tor Browser

Per platform: cold realm/handshake healthy · capability panel accurate · **two named vaults** create-confirm-save-library-reload/unlock correctly · **vault details show Argon2id, not PBKDF2** · a save path works · live warm reachability loss/restoration is reflected while cold stays sealed/unknown fails online-safe · layout usable.

**Everything below is already pushed with PRs open** — nothing for you to run there.

**Review each, in order:** […one prompt per item…]

**After every supported execution-matrix platform passes its seven checks and the separate iOS local-execution target has a recorded PASS, BLOCKED, or UNSUPPORTED result with the exact device and iOS build**, resume with:
> Read `AGENTS.md` and `docs/05-development/batch-run.md`. I completed the P0.19 human device work: every supported execution-matrix platform passed, and the separate iOS target status is recorded under ADR-0010. Verify the recorded results; if they satisfy P0.19 acceptance, mark P0.19 `[x]` and continue the campaign from the next available item.
```

Same shape for a **missing credential** — CoinGecko key, repo secret, GPG key. State exactly what's needed, where to get it, and where it goes.

---

## 5. Batch stopped at stack depth

```markdown
---

## 🛑 Batch handoff — stack depth reached (8 unmerged branches)

**Completed:** P0.4 … P0.11 — all pushed, PRs open

Nothing is wrong. This is the designed stopping point: an 8-deep stack is the most that can be reviewed in order without rework becoming expensive. **Merging resets the depth to zero.**

**All pushed, all PRs open** — see the table above.

**Review in dependency order**, each in its own new session. Each reviewer merges on PASS, which retargets the next PR.
[…one review prompt per item…]

**Then the next leg:** […campaign prompt…]
```

---

## 6. Parallel track complete

```markdown
---

## ✅ Track handoff — worktree `../coldbox-track-a`

**Items:** P4.1, P4.2, P4.3 — independent, each branched from `main`

**All pushed, all PRs open:** #21, #22, #23 — all based on `main`.

**Review each — order doesn't matter, no dependencies between them:**
[…one review prompt per item…]

**Other tracks:** these merge cleanly alongside track B's items; no shared files touched.

**When all are merged**, one command for you:
​```powershell
git worktree remove ../coldbox-track-a
​```
```

---

## 7. Review — PASS

**Close out, merge, then report.** Before merging, push the closeout commit to the PR branch — your `.review.md` and the roadmap marker flipped to `[x]` — per [review-protocol.md](review-protocol.md). Then run `gh pr merge <n> --merge --delete-branch`, confirm `main` updated, and write this. **Delete the branch on merge** — leftover branches make it impossible to see which are live work.

If the closeout commit did not land — you could not push to the branch, or you noticed too late — say so explicitly in the block below and name the item whose marker is still `[~]`. Do **not** open a PR to fix it; the next session folds it in.

```markdown
---

## ✅ Handoff — VERDICT: PASS · merged

PR #12 merged to `main`, branch deleted. `main` is now at `a1b2c3d`.

**Paste into a NEW session:**

> Read AGENTS.md and start the next roadmap item.

Next up is **P0.6 — Cold realm bootstrap**.
```

**Do not merge if:**

- You are the session that wrote the code. Self-merge is not review.
- The verdict is anything other than PASS.
- The item touches the **realm boundary, message schema, or vault format** — P0.6, P0.7, P0.11. Those are the security core; issue the PASS and hand the merge to the human with the exact command:

```markdown
# 🙋 Action required from you

**PASS** — but P0.6 is the realm boundary, so it wants your eyes before merging.

​```powershell
gh pr merge 14 --merge --delete-branch
git checkout main
git pull
​```

Worth a look at the Files Changed tab first: 6 files, all under `src/`.
```

*If you'd rather the reviewer merge these too, delete that list — it's a recommendation, not a constraint.*

---

## 8. Review — FAIL

```markdown
---

## ❌ Handoff — VERDICT: FAIL (3 findings)

**Do not merge.**

**1. Fix it** — new session, or the author's if still open:
> Read the review at `docs/05-development/packets/p0.4-csp-hash-pinning.review.md`. Address every finding — fix it, or argue it should be dismissed and say why. Advisory findings must be fixed like any other. Push, then update the packet to describe what changed.

**2. Then re-review** — a fresh session again:
> Read `docs/05-development/review-protocol.md` and the existing review at `docs/05-development/packets/p0.4-csp-hash-pinning.review.md`. The author has pushed fixes. Issue a fresh verdict on the new commit — not an amendment. Re-check every previous finding and look for new ones introduced by the fixes. Append a new verdict block; do not edit the old one.

**Must change:** <one line per finding>
```

**Reviewers never fix findings.** That would make the reviewer an author and destroy the independence this protocol exists for.

---

## 9. Fix complete

```markdown
---

## ✅ Handoff — findings addressed

**Fixed:** F1, F2 · **Dismissed:** F3 — <argument>

**Pushed to** `p0.4-csp-hash-pinning`. PR #12 updated.

**Re-review** — new session:
> Read `docs/05-development/review-protocol.md` and the existing review at `docs/05-development/packets/p0.4-csp-hash-pinning.review.md`. The author has pushed fixes. Issue a fresh verdict on the new commit — not an amendment. […]
```

---

## Rules that apply to all of them

**Placeholders filled in.** Always.

**Handoff last.** Nothing after it — the human should find it at the bottom without scrolling past a summary.

**Implementation sessions open their own PR. Reviewers merge on PASS.** The human runs commands only when something genuinely requires them — and then it goes in a §0 block at the top, with real values filled in.

**One session per checkout.** If handing to a reviewer while this session may still be alive, include the `git worktree add` command.

**Say what you're unsure about.** The most valuable line in any handoff.
