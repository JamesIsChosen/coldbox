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

---

## Single item

The default. One item, one branch, one PR.

> Read AGENTS.md and start the next roadmap item.

That's the whole prompt. The agent finds the first unchecked item with satisfied dependencies, does it, writes the packet, and opens a PR.

---

## Batch, ranged

Several items in one session, with an explicit ceiling.

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. Run a batch from P0.4 through P0.9. Follow the self-review gate between every item and the stop conditions exactly. Do not merge anything. Finish with the handoff note.

Adjust the range; keep everything else verbatim.

---

## Batch, until blocked

The overnight mode. No artificial ceiling — the agent works forward until a real stop condition.

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. Run a batch starting from the next roadmap item and continue until you hit a stop condition. Follow the self-review gate between every item. Do not merge anything. Finish with the handoff note.

Expect it to stop at a `👤 human-required` item, at maximum stack depth (8 unmerged branches), on a second consecutive self-review FAIL, or on any spec ambiguity touching a security boundary.

---

## Campaign leg

For working through a phase across several sessions. Identical to until-blocked, plus awareness that it's one leg of a longer run.

> Read `AGENTS.md` and `docs/05-development/batch-run.md`. This is one leg of a campaign to complete Phase 0.
>
> Start by checking what's already merged into `main` and what branches are outstanding — earlier legs may have left work awaiting review. Then work forward from the next available roadmap item until you hit a stop condition.
>
> Follow the self-review gate between every item. Do not merge anything. In the handoff note, state clearly where the campaign now stands and what I need to do before the next leg can make progress.

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
> Your items are P4.1, P4.2, and P4.3. These have no dependencies on each other or on work another agent is doing. Run until blocked. Do not merge. Finish with the handoff note.

Only assign genuinely independent items — check the `Deps:` lines. Phase 0 after P0.3 is largely a chain and doesn't parallelise; Phases 2, 4, and 5 have wide independent tracks.

---

## Review

**Use a fresh session, not the one that wrote the code.** An agent reviewing its own work in the same context is re-reading, not reviewing.

> Read `docs/05-development/review-protocol.md`, then review branch `<branch-name>` as an independent reviewer.
>
> Verify every claim yourself — do not take the packet's word for anything. Build under a different path, timezone, and locale. Deliberately break things and confirm they fail closed with non-zero exit codes. Check the acceptance criteria verbatim against the roadmap.
>
> Write your report to `docs/05-development/packets/<roadmap-id>-<slug>.review.md` and end with a PASS or FAIL verdict. **Any finding of any severity, including cosmetic or advisory, is a FAIL.**

For a batch, review each branch in dependency order, one session each.

---

## Re-review after a FAIL

> Read `docs/05-development/review-protocol.md` and the existing review at `docs/05-development/packets/<roadmap-id>-<slug>.review.md`.
>
> The author has pushed fixes. Issue a **fresh verdict on the new commit** — not an amendment. Re-check every previous finding and look for new ones introduced by the fixes. Append a new verdict block; do not edit the old one.

---

## Fixing a FAIL

Given to the *author's* session, not the reviewer's:

> Read the review at `docs/05-development/packets/<roadmap-id>-<slug>.review.md`. Address every finding — fix it, or argue it should be dismissed and say why. Advisory findings must be fixed like any other. Push, then update the packet to describe what changed.

The reviewer never fixes findings. That would make them an author and destroy the independence the process exists for.

---

## Notes

**Prompts are deliberately short.** Everything they need is in the repo. If a prompt starts growing to carry context, that context belongs in `AGENTS.md` or the roadmap instead — a prompt you have to remember to include is a prompt you'll eventually forget.

**One agent per working tree, always.** Concurrent git access fails in a nasty way: `add` and `commit` fail while `push` succeeds, publishing empty branches that look like saved work.

**Stopping early is a good outcome.** A batch that completes four items with a clear handoff beats one that completes seven where three are unsound.
