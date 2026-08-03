# Handoff blocks

**Every session ends with a handoff block. No exceptions, in any mode.**

The human should never memorize a command, work out what happens next, or search these docs. They copy, they paste, they move on.

**Fill in every placeholder.** You know the branch name, the PR number, the item ID, the packet path. Leaving `<branch>` for the human to substitute defeats the entire point.

A session that ends without a handoff block is a contract violation.

---

## The loop

```
implement ──→ push + PR commands, review prompt
review ──┬──→ PASS: merge commands, next-item prompt
         └──→ FAIL: fix prompt, then re-review prompt
fix ──────→ push + re-review prompt
```

Every exit path below terminates in a paste-ready next step.

---

## 1. Item complete

```markdown
---

## ✅ Handoff

**1. Push and open the PR:**

​```powershell
git push -u origin p0.4-csp-hash-pinning
gh pr create --base main --head p0.4-csp-hash-pinning --title "P0.4 - CSP hash-pinning" --body-file docs/05-development/packets/p0.4-csp-hash-pinning.md
​```

**2. Open a NEW session and paste:**

> Read `docs/05-development/review-protocol.md`, then review branch `p0.4-csp-hash-pinning` as an independent reviewer. Verify every claim yourself — do not take the packet's word for anything. Build under a different path, timezone, and locale. Deliberately break things and confirm they fail closed with non-zero exit codes. Check the acceptance criteria verbatim against the roadmap. Write your report to `docs/05-development/packets/p0.4-csp-hash-pinning.review.md` and end with a PASS or FAIL verdict. Any finding of any severity, including cosmetic or advisory, is a FAIL.

Stop this session first, or give the reviewer its own checkout:
`git worktree add ../coldbox-review p0.4-csp-hash-pinning`

**⚠️ Tell the reviewer:** <anything ambiguous, or a result readable two ways>
```

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

**1. Save the work:**
​```powershell
git push -u origin p0.11-vault-format
​```

**2. Resume in a new session:**
> Read `AGENTS.md`. Continue P0.11 on branch `p0.11-vault-format`. Read `docs/05-development/packets/p0.11-vault-format.md` for where the previous session stopped. Do not start a new item.

**What I'd do next:** <specific next step>
```

---

## 3. Batch complete

Every branch, in dependency order, with the correct PR base.

```markdown
---

## ✅ Batch handoff — 4 branches ready

**1. Push and open all PRs:**

​```powershell
git push -u origin p0.4-csp-hash-pinning
gh pr create --base main --head p0.4-csp-hash-pinning --title "P0.4 - CSP hash-pinning" --body-file docs/05-development/packets/p0.4-csp-hash-pinning.md

git push -u origin p0.5-warm-shell-skeleton
gh pr create --base p0.4-csp-hash-pinning --head p0.5-warm-shell-skeleton --title "P0.5 - Warm shell skeleton" --body-file docs/05-development/packets/p0.5-warm-shell-skeleton.md
​```

**2. Review in this order, each in its OWN new session:**

**→ P0.4 first:**
> Read `docs/05-development/review-protocol.md`, then review branch `p0.4-csp-hash-pinning` as an independent reviewer. […full prompt…]

**→ P0.5, only after P0.4 passes and merges:**
> Read `docs/05-development/review-protocol.md`, then review branch `p0.5-warm-shell-skeleton` as an independent reviewer. […full prompt…]

**3. Self-review results:** P0.4 PASS (2 rounds) · P0.5 PASS (1 round)

**4. Scrutinise hardest:** <where you're least confident>

**5. Known-weak:** <untested platforms, unverified assumptions>

**6. Next leg** — after merging, paste into a new session:
> Read `AGENTS.md` and `docs/05-development/batch-run.md`. This is one leg of a campaign to complete Phase 0. […full campaign prompt…]
```

**PR base matters.** Stacked branches target their dependency, not `main`. Get it wrong and the human opens a PR containing four items of changes.

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

- [ ] **iOS Safari, from the Files app** — highest risk, do this first
- [ ] Android Chrome, from Files
- [ ] macOS Safari
- [ ] Tor Browser

Per platform: cold realm instantiates · handshake completes · capability panel accurate · vault round-trips · **vault details show Argon2id, not PBKDF2** · a save path works · airgap banner correct.

**1. Push and open PRs:** […commands…]
**2. Review each:** […prompts in order…]
**3. After your device pass**, resume with:
> Read `AGENTS.md` and `docs/05-development/batch-run.md`. P0.19 is complete — I verified the device matrix manually. Continue the campaign from the next available item.
```

Same shape for a **missing credential** — CoinGecko key, repo secret, GPG key. State exactly what's needed, where to get it, and where it goes.

---

## 5. Batch stopped at stack depth

```markdown
---

## 🛑 Batch handoff — stack depth reached (8 unmerged branches)

**Completed:** P0.4 … P0.11 — all pushed, PRs open

Nothing is wrong. This is the designed stopping point: an 8-deep stack is the most that can be reviewed in order without rework becoming expensive. **Merging resets the depth to zero.**

**1. Push and open PRs:** […commands…]
**2. Review and merge in dependency order:** […prompts…]
**3. Then the next leg:** […campaign prompt…]
```

---

## 6. Parallel track complete

```markdown
---

## ✅ Track handoff — worktree `../coldbox-track-a`

**Items:** P4.1, P4.2, P4.3 — independent, each branched from `main`

**1. Push and open PRs** *(run from `../coldbox-track-a`)*: […commands…]
**2. Review each — order doesn't matter, no dependencies between them:** […prompts…]
**3. Other tracks:** these merge cleanly alongside track B's items; no shared files touched.
**4. Clean up when merged:** `git worktree remove ../coldbox-track-a`
```

---

## 7. Review — PASS

```markdown
---

## ✅ Handoff — VERDICT: PASS

**1. Merge:**
​```powershell
gh pr merge 8 --merge --delete-branch=false
git checkout main
git pull
​```

**2. Next item** — new session:
> Read AGENTS.md and start the next roadmap item.

Next up is **P0.5 — Warm shell skeleton**.
```

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

**1. Push:**
​```powershell
git push origin p0.4-csp-hash-pinning
​```

**2. Re-review** — new session:
> Read `docs/05-development/review-protocol.md` and the existing review at `docs/05-development/packets/p0.4-csp-hash-pinning.review.md`. The author has pushed fixes. Issue a fresh verdict on the new commit — not an amendment. […]
```

---

## Rules that apply to all of them

**Placeholders filled in.** Always.

**Handoff last.** Nothing after it — the human should find it at the bottom without scrolling past a summary.

**Never merge.** Implementation and review sessions produce commands *for the human*; they don't merge, and they don't touch `main`.

**One session per checkout.** If handing to a reviewer while this session may still be alive, include the `git worktree add` command.

**Say what you're unsure about.** The most valuable line in any handoff.
