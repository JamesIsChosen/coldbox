# UI.7 — Send-to routing

Status: `[~]` pending independent review.

Branch: `ui.7-send-to-routing`

## Scope

The shared UI.6 record menu now owns a finite typed Send to inventory. Address
records offer `Address bench` and `QR Studio`; the former selects the exact
registry record for comparison and the latter fills the public address field
directly. Backup records offer `Verify shares in sealed realm`, which calls the
existing validated `backup.verifyRequest` channel path without copying through
the warm shell. Records with no implemented consumer expose no misleading
route. No send-to path calls a clipboard API, and no secret value is accepted
or routed.

## Files

- `src/index.html`, `src/styles.css`, `src/main.js` — Send to section, typed
  route inventory, direct consumer handoffs, and no-clipboard implementation.
- `scripts/run-browser-harness.js` — Chromium/Firefox coverage of Address bench,
  QR Studio, and sealed backup verification routes.
- `test/ui.7-send-to-routing.test.js` — finite route inventory and negative
  clipboard-path regression.
- `CHANGELOG.md`, `docs/05-development/ROADMAP.md` — item record and `[~]` status.

## Verification run

```text
node --test test/ui.7-send-to-routing.test.js
✔ UI.7 exposes one typed Send to region in the shared record menu
✔ UI.7 routes public values directly and keeps cold sends off the clipboard
✔ UI.7 route inventory is finite and each route has a consumer
ℹ tests 3
ℹ pass 3
ℹ fail 0

node --check src/main.js
node --check scripts/run-browser-harness.js
npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.
```

Hosted CI must witness the complete test suite, reproducible double build,
cross-OS hash, Chromium/Firefox file:// harness, and approved-reference scan at
the exact pushed head.

## Acceptance mapping

- Every current consumer is enumerated in `renderRecordMenuSendTo`: Address
  bench, QR Studio, and sealed backup verification.
- Address bench receives the record ID in its typed select; it does not use the
  clipboard.
- QR Studio receives the address in its public input; it does not use the
  clipboard and retains its own validation before QR generation.
- Backup verification calls `requestBackupVerification`, which sends the
  existing typed message to the cold realm and never routes through warm text or
  the clipboard.
- The static negative test rejects clipboard references inside the send-to
  implementation, and the browser harness exercises every route.

## Known deferrals and assumptions

- UI.7 is browser-verifiable (`🌐`). Physical device testing remains outside
  this item and is part of the separate release/device gate.
- xpub, descriptor, and npub values have no built consumer in the current
  roadmap surfaces, so they intentionally expose no fake Send to route. Their
  QR rendering remains UI.6's public-only responsibility.
- Future consumer additions must extend the finite route inventory and browser
  coverage; a generic clipboard fallback is prohibited.

## Review focus

- Confirm every route in the inventory has a real consumer and no public value
  with a current consumer is omitted.
- Confirm Address bench and QR Studio receive typed values directly and the cold
  backup route stays inside the existing validated MessagePort path.
- Confirm no secret material can reach the warm clipboard or a send-to payload.
- Confirm UI.6 focus/close behavior and CSP/realm boundaries remain unchanged.
