# UI.7 — Independent review

**VERDICT: PASS**

Findings: 0

Reviewed commit: `a26bf6be91efcd1decd2aba22f7cb1268553b735`

Reviewed by: `ui7_fresh_reviewer`

Review mode: CONNECTED (with exact-head CI witness, run `31954436220`)

Date: 2026-08-16

## 1. What I verified

The exact checked-out commit is `a26bf6be91efcd1decd2aba22f7cb1268553b735`,
and the working tree was clean before review. The complete local suite passed:

```text
npm test
ℹ tests 432
ℹ pass 432
ℹ fail 0
ℹ skipped 0

npm run verify-vendor
Vendor verification passed against local files and upstream releases.

npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

node scripts/check-docs.js
Documentation hygiene check passed: 245 markdown file(s) checked, 0 warning(s).
```

The focused UI.7 tests passed (3/3), including the finite route inventory and
negative no-clipboard assertion. Two local builds, the second under
`TZ=Pacific/Honolulu`, produced the identical hash:

```text
first=3878ac46c9ac0f7280866a6726d0eb096c66f3368647f81e37e33f0ca141ce25
second=3878ac46c9ac0f7280866a6726d0eb096c66f3368647f81e37e33f0ca141ce25
```

I read the complete UI.7 diff against `main`, the roadmap criterion, packet,
and the exact `.github/workflows/ci.yml` at this commit. The exact-head CI run
`31954436220` reports success for all required jobs:

- `build (ubuntu-latest)` and `build (windows-latest)`: vendor verification,
  lint, documentation checks, 432-test unit/vector suite with zero skips,
  two-build reproducibility, and artifact hashes.
- `Compare build hash across operating systems`: passed.
- `Approved UI reference secret scan`: temporary copies of both frozen
  references, findings 0 and skipped 0.
- `Browser harness (Chromium + Firefox)`: passed on the required `file://`
  harness after exercising UI.6 menu behavior and all UI.7 routes.

The implementation has one explicit route inventory in
`renderRecordMenuSendTo`: `verify`, `qr`, and `cold-backup-verify`. Address
records receive only the public record ID or address in their existing public
consumer controls. Backup verification calls the existing
`requestBackupVerification` path, which queues only `backup.verifyRequest`
through the established private MessagePort. `sendRecordToRoute` contains no
clipboard API or `copyText` reference, and the route test rejects both.

I also checked that the existing UI.6 complete-field rendering, public-only QR
classifier, calm panel, close/Escape focus return, and focus trap remain the
single shared implementation. The browser harness now covers the expanded
keyboard order, direct Address bench handoff, QR Studio handoff, and sealed
backup verification handoff in both engines.

## 2. What I could not verify

None of UI.7's browser-verifiable acceptance criteria remained unverified.
Physical iOS/Android/device testing is outside this `🌐` checkpoint and remains
the separate release/device gate, as stated in the author packet.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Every value that has a consumer offers a Send to row into it. | ✅ | The finite inventory covers the current Address bench, QR Studio, and sealed backup-verification consumers; records without a current consumer expose no invented route. The browser harness activates each route. |
| 2 | No send-to path writes secret material to the clipboard, asserted by a test. | ✅ | The static UI.7 test rejects clipboard and `copyText` references in `sendRecordToRoute`; the implementation carries only a public record ID/address or a backup ID. |
| 3 | Where copy still exists for public values it runs the existing P1.12 clipboard round-trip check. | ✅ | UI.7 adds no copy path and leaves the existing public clipboard/P1.12 implementation untouched; no Send-to route bypasses or replaces it. |
| 4 | A send-to into a cold tool never round-trips through the warm shell. | ✅ | `cold-backup-verify` calls the pre-existing `requestBackupVerification` → `sendVaultMessage('backup.verifyRequest', { backupId })` MessagePort path; the Chromium/Firefox harness reaches the sealed-share status without warm clipboard/text routing. |
| 5 | Routes are enumerable and each one is covered. | ✅ | The route-inventory test asserts exactly `['verify', 'qr', 'cold-backup-verify']`; the browser harness clicks each route and asserts its consumer state. |

## 4. Findings

None.

## 5. Verdict rationale

UI.7 meets every roadmap acceptance criterion without weakening the UI.4a
parity/security contract or changing the sealed boundary. The exact-head CI
witness covers the required cross-OS builds, zero-skip test suite, frozen
reference scan, and both browser engines; local review and tests confirm the
typed inventory, public-only direct handoffs, existing cold MessagePort path,
and preserved UI.6 behavior. No remediation is required.

