# UI.6 — Floating record menu

Status: `[~]` pending independent review.

Branch: `ui.6-floating-record-menu`

## Scope

UI.6 adds one reusable warm-shell record menu. Wallet, account, address,
device, note, and backup cards — including the dashboard backup-health cards —
use the same `View complete record` trigger. The menu is a bounded calm panel,
keeps focus inside while open, closes on Escape or Done, and returns focus to
the trigger. It lists every stored public field, concealment state, record ID,
and public-compartment provenance. It never receives cold-realm messages or
secret material.

Public QR payloads are discovered only from address, xpub/xpubs, descriptor,
and npub fields. Each candidate is checked with the existing protocol
secret-content classifier before the pinned QR encoder is called; secret-shaped
values are withheld and no QR card is created for them. This is one menu
implementation, not per-surface copies.

## Files

- `src/index.html` — single menu markup with provenance, complete-field, and QR regions.
- `src/main.js` — shared trigger, record lookup, field rendering, public-only QR generation, focus trap, focus return, and edit handoff.
- `src/styles.css` — calm bounded panel, responsive bottom-sheet treatment, readable field grid, and minimum trigger size.
- `scripts/run-browser-harness.js` — Chromium/Firefox `file://` witness for complete fields, address QR, keyboard traversal, Escape, and focus return.
- `test/ui.6-floating-record-menu.test.js` — static contract and negative secret-QR checks.
- `CHANGELOG.md`, `docs/05-development/ROADMAP.md` — item record and `[~]` status.

## Verification run

Focused tests and lint:

```text
node --test test/ui.6-floating-record-menu.test.js
✔ UI.6 has one reusable record menu with complete-field and provenance regions
✔ every public record list uses the same complete-record trigger
✔ record menu QR is public-only and rejects secret-shaped values
✔ record menu is calm, bounded, touch-sized, and keyboard navigable
ℹ tests 4
ℹ pass 4
ℹ fail 0
ℹ skipped 0

node --check src/main.js
node --check scripts/run-browser-harness.js
npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.
```

Hosted CI must witness the full suite, reproducible double-build, cross-OS
hash, and Chromium/Firefox browser harness at the exact pushed head. Local
browser execution is not claimed in this packet because the repository's
Playwright binaries are hosted-CI evidence in this environment.

## Acceptance mapping

- Complete record: every own stored field is rendered in a `<dl>`, including
  tags, notes, relationships, verification state, and hidden state.
- QR coverage: address, xpub/xpubs, descriptor, and npub are rendered as
  individual public QR cards; no secret field is a candidate.
- Calm secret behavior: secret-shaped candidates are withheld and the menu
  states that it is public-only; no secret QR is offered.
- Keyboard behavior: role dialog, close control focus on open, Tab trap,
  Escape close, Done close, and focus return to the originating trigger.
- Reuse: all six registry kinds call the same trigger and the dashboard backup
  health list uses the same trigger helper.

## Known deferrals and assumptions

- UI.6 is browser-verifiable (`🌐`). Physical iOS/Android/device execution is
  outside this checkpoint and remains part of the separate release/device
  gate; no human device closure is claimed here.
- Existing public registry records are the only record source. The menu does
  not add a protocol message or access the sealed realm. Future public fields
  named `descriptor` or `npub` automatically receive the same public-only QR
  treatment if they pass the classifier.
- No QR download control is duplicated in this menu; the menu's obligation is
  to show the QR for each public payload. QR Studio remains the dedicated
  address-entry/export workflow.

## Review focus

- Confirm the menu is truly one implementation and every record-bearing warm
  surface uses it.
- Confirm every stored field is visible without leaking secret-shaped values,
  and that public QR candidates cannot include xprv/private-key/seed material.
- Confirm focus cannot escape the menu, closing restores the exact trigger, and
  mobile geometry remains usable.
- Confirm the existing CSP, realm boundary, protocol, and registry mutation
  behavior are unchanged.

## Self-assessment

The highest-risk area is future schema growth: public `descriptor` and `npub`
fields are supported generically, while secret-shaped values are deliberately
withheld even if malformed data reaches the view. The independent reviewer
should inspect the classifier gate and the dashboard backup-health trigger in
addition to the registry lists.
