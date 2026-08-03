# Batch runs

Working several roadmap items in one unattended session, leaving a set of branches with PRs open for independent review.

Normal mode is one item per session. Batch mode trades some safety for throughput, and this document defines exactly how much.

---

## The honest tradeoff

**Sequential dependency is the constraint.** Most items build on the one before. Because nothing merges during a batch, each branch is cut from its dependency rather than from `main`, producing a stack.

Two things get worse as the stack deepens:

**A failure early invalidates everything above it.** If item 2 of 7 turns out to be wrong, items 3–7 are built on rejected work. Fixing it means rebasing the stack and rewriting packets that no longer describe reality.

**Review fatigue is real.** Fifteen PRs waiting at once is where a reviewer starts skimming — and skimming is how a PASS gets rubber-stamped, defeating the binary-verdict protocol entirely.

So batches are **bounded and gated**, not open-ended.

---

## Rules

### 1. Scope: a range, or "until blocked"

Two modes.

**Ranged** — the human names a span, e.g. P0.4 through P0.9. The agent stops there even if it could continue.

**Until blocked** — the agent works forward through the roadmap and keeps going until it hits a stop condition (§5). This is the mode for "get as far as you safely can while I sleep."

Either way the agent stops at the first stop condition. The difference is only whether there's an additional ceiling.

**Why "until blocked" is safe to allow:** every genuine limit is already a stop condition. The agent doesn't need an artificial ceiling to prevent overreach — it needs honest stop conditions, and it has them. An arbitrary range mostly just leaves throughput on the table.

### 1a. Maximum stack depth

**Default: 8 unmerged branches.** On reaching it, the agent stops and hands off regardless of how well things are going.

This is the real reason batches end, and it has nothing to do with agent capability. Because a batch never merges, each item stacks on its dependency. A stack much beyond 8 becomes impractical for a human to review in order, and if an early item needs rework, every branch above it must be rebased and its packet rewritten.

**Merging resets the depth to zero.** So the way to get through the whole roadmap is not a single enormous batch — it's repeated batches with merges between them. Merge cadence, not agent capacity, is what governs total throughput.

If you want longer unattended runs, merge more often.

### 2. Branch from the dependency, not from the previous item

Read each item's declared `Deps:` and branch from **that** item's branch. Items sharing a dependency are siblings and both branch from the same place — they do not chain.

Example, for P0.3 through P0.9:

```
main
├── p0.3-forbidden-construct-lint          (deps P0.1 — already merged, so from main)
└── p0.4-csp-hash-pinning                  (deps P0.1 — also from main; sibling of P0.3)
    └── p0.5-warm-shell-skeleton           (deps P0.4)
        └── p0.6-cold-realm-bootstrap      (deps P0.5)
            └── p0.7-message-handshake     (deps P0.6)
                └── p0.8-csp-canary        (deps P0.7)
                    └── p0.9-capability-panel  (deps P0.8)
```

Branching blindly from "the previous branch" would put P0.3 under P0.4 and make the stack deeper than the dependencies require. Read the deps.

### 3. PR base is the dependency branch

```
gh pr create --base p0.4-csp-hash-pinning --title "P0.5 - Warm shell skeleton" ...
```

This makes GitHub show only the incremental diff, which is what a reviewer needs. When the base merges, GitHub retargets the child automatically.

Items branched from `main` use `--base main`.

### 4. Self-review gate between items

After finishing an item and writing its packet, **before starting the next**, run a review pass on your own work.

Re-read [review-protocol.md](review-protocol.md) and apply it properly: verify independently rather than re-reading what you wrote, build under a different path/timezone/locale, break things deliberately and confirm non-zero exit codes, check acceptance criteria verbatim against the roadmap. Write the review report and issue a verdict.

| Verdict | Action |
|---|---|
| PASS | Push, open the PR, proceed to the next item |
| FAIL, first time | Fix every finding, re-review, issue a fresh verdict |
| FAIL, second time | **Stop the batch.** Write the handoff note. Do not proceed |

**Be honest about what this gate is worth.** Reviewing your own work in the same session is a *filter*, not independent review — you share the assumptions that produced the code. It catches mechanical failures, unmet criteria, and things you knew were shaky. It will not catch a misconception. Independent review still happens afterward, and remains the real gate.

Its value is preventing a defective item from having six more built on top of it while you sleep.

### 5. Stop conditions — hard

Stop the batch immediately, write the handoff, and do not continue:

- **Stack depth reached** (default 8 unmerged branches)
- **Second consecutive FAIL** on the same item
- **Spec ambiguity on a security boundary** — never guess to keep the batch moving
- **A hard constraint that can't be satisfied**
- **An item marked `👤 human-required`** — needs hardware, credentials, or a decision that isn't yours
- **An item needing a credential you don't have** — an API key, a signing key, a repository secret
- Working tree unexpectedly dirty, or any git command failing
- `index.lock` contention — see rule 7
- A dependency's branch missing or in an unexpected state
- **Context pressure** — you'd have to rush an item to fit

That last one matters more than it looks. A rushed final item produces a packet that overstates confidence, which is worse than one fewer item completed. Stop one early rather than finish one badly.

**Stopping is a good outcome.** Four solid items and a clear handoff beats seven where three are unsound. The handoff note is the deliverable as much as the code is.

### 6. Never merge

A batch produces branches and PRs. It does not merge, and it does not touch `main`. The human merges after independent review.

### 7. Exclusive access to the working tree

A batch run **owns the checkout for its duration.** Nobody else — no second agent, no human editing files — touches it until the batch reports done.

Git serialises on `.git/index.lock`, and concurrent access fails in a genuinely dangerous way: `add` and `commit` fail while `push` still succeeds, so empty branches get published while everyone believes the work was saved. It looks like progress and is not.

If you hit `index.lock`, **stop and report**. Never delete the lock — another process may be mid-write, and removing it can corrupt the index.

Parallel work needs a separate clone or `git worktree`, never a shared checkout.

---

## The handoff note

Whether the batch completes or stops early, finish by writing `docs/05-development/packets/BATCH-<YYYY-MM-DD>.md`, committed to the last branch you worked on:

```markdown
# Batch run 2026-08-03

**Scope requested:** P0.3 – P0.9
**Completed:** P0.3, P0.4, P0.5, P0.6
**Stopped at:** P0.7 — reason below

## Items

| Item | Branch | PR | Self-review | Rounds |
|------|--------|-----|------|--------|
| P0.3 | p0.3-forbidden-construct-lint | #4 | PASS | 1 |
| P0.4 | p0.4-csp-hash-pinning | #5 | PASS | 2 |
| P0.5 | p0.5-warm-shell-skeleton | #6 | PASS | 1 |
| P0.6 | p0.6-cold-realm-bootstrap | #7 | PASS | 1 |

## Why it stopped

P0.7 requires deciding whether the handshake nonce is transferred in the
initial message or derived. The spec doesn't settle it and it's on the realm
boundary, so per AGENTS.md §4 I stopped rather than guessing.

**Recommendation:** transfer it in the handshake — simpler to reason about.
Wants an ADR either way.

## Review these in dependency order

#4 (independent) · #5 → #6 → #7

## What I'd scrutinise hardest

P0.4's CSP hash injection. It required two rounds and the fix touches build
determinism, which everything downstream depends on.

## Known-weak areas

- No item was tested on real iOS hardware. The capability checks are
  reasoned about, not observed.
- P0.6's sandbox behaviour is verified in Chrome only.
```

The "what I'd scrutinise hardest" and "known-weak areas" sections are the most valuable part. They direct a tired human to the right place first.

---

## What the human does next

1. Read the handoff note.
2. Run an **independent review** — a fresh session per PR, per [review-protocol.md](review-protocol.md). The batch's self-reviews do not substitute for this; treat them as the author's own notes.
3. Merge in dependency order. GitHub retargets children as parents merge.
4. Anything that FAILs gets fixed before the branches above it are merged.

---

## Getting through the whole roadmap

The goal of "leave it running and wake up to finished work" is achievable, but not as one enormous batch. It's a **campaign**: repeated batches with merges between them.

```
batch → merge the stack → batch → merge → …
```

Each batch starts from a fresh session reading the roadmap cold. That works because the roadmap says what's next and `AGENTS.md` says how — nothing depends on remembering the previous session.

**The cadence is set by you.** Merge after each batch and the next one starts from depth zero. Skip merging and the following batch stops after a couple of items because the stack is already deep.

### Running batches in parallel

Much of the roadmap is *not* a chain. Phase 0 after P0.3 mostly is — P0.4→P0.16 is sequential — but later phases have wide independent tracks:

| Phase | Structure |
|---|---|
| 0 | Chain: P0.4→P0.16, with P0.17 branching off P0.5 |
| 1 | Several tracks: entropy, seeds, derivation, registry, devices |
| 2 | SLIP-39, codex32, Seed XOR are independent siblings |
| 3 | Prices, balances, transactions, cost basis — partly parallel |
| 4 | Chain support is highly parallel |
| 5 | Mostly independent |

Independent items can run **concurrently in separate worktrees**:

```bash
git worktree add ../coldbox-track-a
git worktree add ../coldbox-track-b
```

Each gets its own checkout sharing one `.git`. This is the *only* safe way to parallelise — never two agents in one working tree (rule 7).

Assign each agent a disjoint set of items with no dependency between them, and tell each one explicitly which worktree it owns.

### Where a campaign will actually stop

Known gates, so you can plan around them:

| Gate | Where | What's needed |
|---|---|---|
| Device matrix | **P0.19** | Real iPhone, Android, Mac, Tor Browser |
| CI secrets | P0.18 | Repository secrets configured by you |
| Hardware wallet verification | P1.9 testing | Your actual devices |
| CoinGecko demo key | P3.1 | Free key you register for |
| Release signing | Any release | Your GPG key |

Everything else is agent-workable. P0.19 is the significant one — it gates all of Phase 1, and for good reason: building the wallet on a foundation never opened on a real iPhone would mean discovering a platform problem after fifteen more items sit on top of it.

---

## Kickoff prompts

All session prompts — single item, ranged batch, until-blocked batch, campaign leg, parallel track, and review — live in **[prompts.md](prompts.md)**.

---

## When not to batch

**Cryptographic correctness work.** Phase 1's derivation items live or die on independent test vectors, and a self-review gate is weakest exactly where a misconception is the risk. Run those one at a time with real independent review between.

**Anything the spec leaves open.** If you can foresee a decision the agent will have to make, decide it first — batches turn one ambiguity into several branches built on a guess.

**Items needing real hardware.** Marked `👤 human-required` in the roadmap.
