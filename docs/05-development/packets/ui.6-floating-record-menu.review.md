# Independent review — UI.6 Floating record menu

Verdict: PASS

Review mode: Mode B (repository and hosted-CI evidence)

Reviewed exact head: `ed160ecccdfb995d4f998833955934b53aa00a92`

## Evidence

- `node --test test/ui.6-floating-record-menu.test.js`: 4 passed, 0 failed,
  0 skipped.
- `npm run lint`: passed.
- `git diff main...HEAD --check`: passed.
- Hosted CI run `31952956261` for the exact head: Ubuntu and Windows builds,
  Chromium/Firefox browser harness, cross-OS reproducible hash comparison,
  and approved-reference secret scan all passed. Release attestation was
  skipped as an unrelated release-only job.

## Independent checks

- There is one `#record-menu` implementation with complete-field,
  provenance, QR, edit, close, and Done regions.
- Wallet, account, address, device, note, backup, and dashboard backup-health
  record surfaces use the same `recordMenuTrigger` and `openRecordMenu` path.
- Rendering enumerates all stored record keys, includes concealment and record
  provenance, and uses text sinks for values.
- QR candidates are limited to address, xpub/xpubs, descriptor, and npub
  values and are gated by `protocol.isSecretContent`; no secret-shaped value
  is offered to the QR renderer.
- The dialog is bounded and touch-sized, traps Tab focus, closes on Escape or
  Done, and restores focus to the originating trigger.
- No cold-realm message, secret-bearing protocol path, CSP, or vendor input
  changed in this checkpoint.

No findings remain. UI.6 is independently verified.
