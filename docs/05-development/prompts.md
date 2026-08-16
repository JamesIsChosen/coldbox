# Kickoff prompts

Copy-paste prompts for starting an agent session. All modes are valid — pick by how much you want done unattended and how much review capacity you have.

Every one of these works from a **cold session**. The repo carries the context; the prompt just points at it.

> **You should rarely need this file.** Every session is required to end with a **handoff block** containing the exact commands to run and the exact prompt for the next agent, with every placeholder already filled in — see [handoff.md](handoff.md). Copy, paste, move on. This file is the fallback for when you're starting cold or an agent forgot.

## The loop

```
implement  →  pushes, opens the PR, hands you the review prompt
review     →  PASS: merges, hands you the next-item prompt
              FAIL: hands you the fix prompt, then the re-review prompt
fix        →  pushes, hands you the re-review prompt
```

**In the normal case you run no commands at all** — you paste one prompt per step.

Anything only you can do — a device pass, a credential, a blocked command — arrives as a `🙋 Action required from you` block at the **top** of the handoff, with exact commands and what's blocked until you run them.

**If a session ends without a handoff block, that's a contract violation** — say so, and it should produce one.

---

## Quick reference

| Mode | Does | Use when |
|---|---|---|
| [Single item](#single-item) | One roadmap item, one PR | Default. Highest quality per item |
| [Batch, ranged](#batch-ranged) | A named span of items | You want a specific unit done |
| [Batch, until blocked](#batch-until-blocked) | Works forward until a stop condition | Overnight; "get as far as you safely can" |
| [Campaign leg](#campaign-leg) | Same as until-blocked, aware it's one leg of many | Working through a whole phase over several sessions |
| [Parallel track](#parallel-track) | A disjoint set of items in its own worktree | Independent items, several agents at once |
| [Review](#review) | Independent PASS/FAIL verdict | After any implementation session |
| [Re-review](#re-review-after-a-fail) | Fresh verdict after fixes | After a FAIL is addressed |

**Browser mode** — same loop, but the agent has no shell and you run the commands:

| Mode | Does | Use when |
|---|---|---|
| [Browser: start](#browser-start-a-session) | Discovery runner, then works the roadmap | Working from a browser chat |
| [Browser: continue](#browser-continue-after-a-bundle) | Next runner from the last bundle | After uploading any bundle |
| [Browser: verify](#browser-independent-verification) | Independent PASS/FAIL, own runners | After a browser batch completes |
| [Browser: closeout](#browser-closeout) | Push, PRs, clean baseline | After a PASS |

---

## Single item

The default. One item, one branch, one PR.

> Read AGENTS.md and start the next roadmap item.

That's the whole prompt. The agent finds the first unchecked item with satisfied dependencies, does it, writes the packet, **pushes and opens the PR itself**, and hands you the review prompt.

---

## Batch, ranged

Several items in one session, with an explicit ceiling.

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. Run a batch from P0.4 through P0.9. Follow the self-review gate between every item and the stop conditions exactly. **Open a PR for every branch you produce**, with the correct base. Do not merge anything. Finish with the handoff block.

Adjust the range; keep everything else verbatim.

---

## Batch, until blocked

The overnight mode. No artificial ceiling — the agent works forward until a real stop condition.

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. Run a batch starting from the next roadmap item and continue until you hit a stop condition. Follow the self-review gate between every item. **Open a PR for every branch you produce**, with the correct base. Do not merge anything. Finish with the handoff block.

Expect it to stop at a `👤 human-required` item, at maximum stack depth (8 unmerged branches), on a second consecutive self-review FAIL, or on any spec ambiguity touching a security boundary.

---

## Campaign leg

For working through a phase across several sessions. Identical to until-blocked, plus awareness that it's one leg of a longer run.

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. This is one leg of a campaign to complete Phase 0.
>
> Start by checking what's already merged into `main` and what branches are outstanding — earlier legs may have left work awaiting review. Then work forward from the next available roadmap item until you hit a stop condition.
>
> Follow the self-review gate between every item. **Open a PR for every branch you produce**, with the correct base. Do not merge anything. In the handoff block, state clearly where the campaign now stands and what — if anything — I need to do before the next leg can make progress.

Run this repeatedly. Between legs: review, merge, then start the next. **Merging is what resets the stack depth**, so how often you merge sets the pace.

---

## Parallel track

For independent items worked concurrently. Each agent needs its own worktree — never two agents in one checkout.

Set up first:

```bash
git worktree add ../coldbox-track-a
git worktree add ../coldbox-track-b
```

Then, per agent:

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. You own the worktree at `../coldbox-track-a` — work only there, and never touch any other checkout.
>
> Your items are P4.1, P4.2, and P4.3. These have no dependencies on each other or on work another agent is doing. Run until blocked. **Open a PR for each.** Do not merge. Finish with the handoff block.

Only assign genuinely independent items — check the `Deps:` lines. Phase 0 after P0.3 is largely a chain and doesn't parallelise; Phases 2, 4, and 5 have wide independent tracks.

---

## Review — pick the prompt that matches your reviewer

**Use a fresh session, not the one that wrote the code.** Both modes are
supported; see `review-protocol.md`. Fill in every placeholder — a read-only
reviewer cannot look any of it up.

### Mode B — read-only reviewer (browser agent, no checkout)

The common case here.

> Read `docs/05-development/review-protocol.md` and review PR #`<n>` at commit
> `<full-40-char-sha>` as an independent reviewer, in **READ-ONLY (CI-witnessed)**
> mode.
>
> You cannot check out or execute this repository, and you are not expected to.
> **Do not attempt it, and do not report your own environment's limitations as
> defects in the code.** A missing Node version, absent Firefox, or a 403 on a
> write path is a fact about your sandbox, not a finding against this PR.
>
> Read the whole diff. Check every acceptance criterion **verbatim** against the
> roadmap. Reason through the production paths rather than trusting the tests —
> a suite can be green while the real path is dead, and that is the defect class
> you are here to catch.
>
> For execution, use CI run `<run-id>`. Confirm its `head_sha` equals the reviewed
> commit exactly, audit `.github/workflows/` **at that commit** to confirm what it
> actually runs, and **verify the skip count is zero**. Name the checks you
> confirmed. Who triggered the run is immaterial — do not require reviewer-
> initiated CI (ADR-0048).
>
> CI does not cover the manual device matrix, clean-directory execution, offline
> operation, or iOS. Check what the packet records and treat anything untested as
> unverified.
>
> Emit your report as text for transcription; you are not expected to write to the
> branch or post a PR review. Open with the verdict block including `Review mode`.
> End with PASS or FAIL — **any finding of any severity is a FAIL**.

### Mode A — connected reviewer (can check out and run)

> Read `docs/05-development/review-protocol.md`, then review branch `<branch>` at
> commit `<full-40-char-sha>` as an independent reviewer, in **CONNECTED** mode.
>
> Verify every claim yourself — do not take the packet's word for anything. Build
> under a different path, timezone, and locale. Deliberately break things and
> confirm they fail closed with non-zero exit codes. Check the acceptance criteria
> verbatim against the roadmap.
>
> Note what your environment cannot reach — this project's CI covers two operating
> systems, a pinned Node, and both Chromium and Firefox. Anything you cannot
> reproduce, verify against CI run `<run-id>` under the Mode B conditions rather
> than claiming it.
>
> Write your report to `docs/05-development/packets/<id>-<slug>.review.md`, commit
> it to the branch, end with PASS or FAIL — **any finding of any severity is a
> FAIL** — and merge the PR yourself if it passes.

## Re-review after a FAIL

> Read `docs/05-development/review-protocol.md` and the existing review at `docs/05-development/packets/<roadmap-id>-<slug>.review.md`.
>
> The author has pushed fixes. Issue a **fresh verdict on the new commit** — not an amendment. Re-check every previous finding and look for new ones introduced by the fixes. Append a new verdict block; do not edit the old one. **Merge the PR yourself if it passes.**

---

## Fixing a FAIL

Given to the *author's* session, not the reviewer's:

> Read the review at `docs/05-development/packets/<roadmap-id>-<slug>.review.md`. Address every finding — fix it, or argue it should be dismissed and say why. Advisory findings must be fixed like any other. Update the packet to describe what changed, push, and hand me the re-review prompt.

The reviewer never fixes findings. That would make them an author and destroy the independence the process exists for.

---

## Browser mode

For working from a browser chat window where the agent has **no shell**. You run every command in PowerShell and upload the resulting zip back.

Full contract: [browser-runner-flow.md](browser-runner-flow.md). Runner template: [`scripts/runner/_template.ps1`](../../scripts/runner/_template.ps1).

The rhythm is always the same: **one runner → you run it → upload the zip → next runner.**

### Browser: start a session

> You have no shell. I am running every command myself in PowerShell on Windows and uploading the results back to you as a zip.
>
> Read `docs/05-development/browser-runner-flow.md` and follow it exactly.
>
> Emit **one discovery runner** based on `scripts/runner/_template.ps1`, plus the exact launch command. Then wait — do not plan the work until you have read the bundle.
>
> After discovery, read `AGENTS.md` and work the next roadmap item. Follow the self-review gate and every stop condition in `docs/05-development/batch-run.md`. Do not merge anything.

For a batch instead of one item, add: *"Run a batch from `<first>` through `<last>`"* or *"Run until you hit a stop condition."*

### Browser: continue after a bundle

Usually unnecessary — the agent should ask for the next upload on its own. Use it if a session stalls or you're resuming cold:

> Here is the bundle from the last runner. Read `manifest.json` first, then the transcript.
>
> If the verdict is FAIL, the runner already rolled the tree back to `beforeHead` — do not try to patch forward from a partial state. Diagnose, then emit a fresh runner from the rolled-back state.
>
> If PASS, emit the next runner with `ExpectedBranch` and `ExpectedHead` set to the `after*` values in the manifest.

### Browser: independent verification

**Open a new chat** — same as the local flow. That session starts cold with no memory of the implementation work, which is what makes the verdict worth having.

> You have no shell. I run every command in PowerShell and upload the results.
>
> Read `docs/05-development/review-protocol.md` and `docs/05-development/browser-runner-flow.md` §6, then independently verify branch `<branch-name>`.
>
> **Write your own runners** — do not ask me for the developing agent's bundles or runners to save a round trip. Clone fresh into a temp path, build under a different path, timezone, and locale, deliberately corrupt a vendored dependency and confirm a non-zero exit, and check every acceptance criterion verbatim against the roadmap.
>
> Verify every claim in the packet yourself — take nothing on trust. Write your report to `docs/05-development/packets/<roadmap-id>-<slug>.review.md` and end with **PASS or FAIL**. Any finding of any severity, including cosmetic or advisory, is a **FAIL**.
>
> On FAIL, write the findings so the developing agent can act on each one without needing to ask you anything.

### Browser: closeout

> The batch passed verification. Emit the closeout runner and commands per `browser-runner-flow.md` §7: push every branch in dependency order, `gh pr create` for each with the **dependency as base**, delete the `runner/*` safety tags, return to a clean `main` with pruned branches, and confirm `git status` is clean.
>
> Finish with the handoff block and the exact prompt for my next session.

---

## Notes

**Prompts are deliberately short.** Everything they need is in the repo. If a prompt starts growing to carry context, that context belongs in `AGENTS.md` or the roadmap instead — a prompt you have to remember to include is a prompt you'll eventually forget.

**One agent per working tree, always.** Concurrent git access fails in a nasty way: `add` and `commit` fail while `push` succeeds, publishing empty branches that look like saved work.

**Stopping early is a good outcome.** A batch that completes four items with a clear handoff beats one that completes seven where three are unsound.
