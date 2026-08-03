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

## Reading these later

Useful when:

- Something breaks and you want to know what was verified at the time
- An auditor asks what testing was done
- A decision looks strange and the ADR doesn't cover it
- You're assessing whether a review process is actually catching things

That last one matters. If every packet passed first time, the reviews probably aren't adversarial enough.
