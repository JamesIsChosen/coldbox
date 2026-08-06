# PR packets and review reports

The evidence trail. One packet per roadmap item, kept permanently.

```
docs/05-development/packets/
├─ p0.2-vendor-verification.md          the packet
├─ p0.2-vendor-verification.review.md   the reviewer's verdict
├─ p0.3-forbidden-construct-lint.md
├─ p0.3-forbidden-construct-lint.review.md
└─ ...
```

Naming: `<roadmap-id>-<slug>.md` for the packet, `.review.md` alongside it. Use the same slug as the branch.

---

## Why per-item files rather than one `PR-PACKET.md`

Two reasons, and the second is the one that bites.

**Preservation.** For a tool handling seed phrases, the packets *are* the audit trail — what was claimed, what was verified, what was uncertain at the time. A single rotating file destroys that history.

**Merge conflicts.** When branches are stacked — which happens whenever items depend on one another — every branch would carry a different `PR-PACKET.md` at the same path. Merging them in sequence produces a conflict per merge, on a file where a conflict is meaningless. Per-item paths make the branches merge cleanly.

---

## What goes in them

Packet format: [pr-packet.md](../pr-packet.md).
Review format: [review-protocol.md](../review-protocol.md).

A review report opens with its verdict block. Since **any finding is a FAIL**, a FAIL followed by fixes produces a *fresh* review appended to the same file with a new verdict block and commit SHA — not an edit of the old one. The history of verdicts is itself informative: an item that took three rounds is worth remembering when something later goes wrong near it.

---

## Independent review coverage

**Canonical procedure for determining independent-review status:** a `.self-review.md` is the author's own gate and never counts as independent review. Inspect the per-item `.review.md`; its sequence of verdict blocks records the independent reviews and re-reviews. If no per-item `.review.md` exists, the item has not been independently reviewed.

### Frozen audit snapshot — 2026-08-04

The table below records what the audit found on 2026-08-04. It is intentionally **not** kept synchronized with later reviews, merges, or PR changes; use the procedure above for the later answer.

| Item | Independent `.review.md` | Disposition as of 2026-08-04 |
|---|---|---|
| P0.2 | none | never independently reviewed |
| P0.3 | none | never independently reviewed |
| P0.3a | yes | PASS (re-review; original FAIL retained in the same file) |
| P0.4 | yes | PASS (re-review; original FAIL retained in the same file) |
| P0.5 | **none** | **never independently reviewed** — see below |
| P0.6 | yes | FAIL on `3ba9c661`; 9 findings dispositioned, 8 Resolved, 1 part-open |
| P0.7 | yes | FAIL on `7360d946`; 9 findings dispositioned, 7 Resolved, 2 open (environmental) |
| P0.8 | yes | FAIL on `da90258`; 9 findings dispositioned, all 9 Resolved |
| P0.9 | **none** | **never independently reviewed** — see below |
| P0.10 | yes | PASS |
| P0.11 | yes | PASS (re-review; supersedes an earlier FAIL) |
| P0.12 | none | open PR #20, self-review only |
| P0.13 | none | open PR #21, self-review only |

### P0.5 and P0.9 — the two gaps

Neither had an independent review report committed on any branch as of the 2026-08-04 audit.

**P0.5** — `BATCH-2026-08-03.md` recorded "Fresh independent review PASS; no remediation required". No artifact backed that claim; no `p0.5-warm-shell-skeleton.review.md` existed in the history of any branch. The only committed gate was the author's `.self-review.md`.

**P0.9** — a file *was* briefly committed at the reviewer-reserved path `p0.9-capability-self-check.review.md` (commit `0ab8626`, "P0.9: record self-review PASS"), the same reserved-path violation the P0.6, P0.7 and P0.8 reviewers each raised as F1. It was later renamed to `.self-review.md`, correctly, but no independent review had replaced it by the audit date.

**What this meant at the 2026-08-04 audit.** P0.5 is the warm shell skeleton and P0.9 is the capability self-check; both were load-bearing for everything above them, and P0.12 and P0.13 stacked directly on that foundation. Neither gap was evidence of a defect — the P0.9 `Math.random` regression was caught and fixed by a later gate (`b929a35`), which suggested the surrounding process worked. But the roadmap marked both `[x]`, and under [review-protocol.md](../review-protocol.md) an item with no independent review had not cleared the bar the protocol sets. Whether to review them retrospectively or accept the gap explicitly and record that decision was a maintainer call; the audit recorded the gap rather than resolving it.

---

## Reading these later

Useful when:

- Something breaks and you want to know what was verified at the time
- An auditor asks what testing was done
- A decision looks strange and the ADR doesn't cover it
- You're assessing whether a review process is actually catching things

That last one matters. If every packet passed first time, the reviews probably aren't adversarial enough.
