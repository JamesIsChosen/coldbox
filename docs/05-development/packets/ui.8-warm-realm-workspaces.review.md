# Review: UI.8 — Warm-realm workspaces

**VERDICT: PASS**

Findings: 0
Reviewed commit: 6d31629476a620269922bdd73dc810cfff939014
Reviewed by: ui8_fresh_reviewer
Review mode: CONNECTED
Date: 2026-08-16

## 1. What I verified

I reviewed the complete UI.8 diff from `6d31629476a620269922bdd73dc810cfff939014` to its parent, the roadmap acceptance text, the packet, the UI.5/UI.6/UI.7 preceding implementation, the browser harness changes, and the CI workflow at the reviewed commit.

Local commands and results:

```text
npm ci
added 2 packages, and audited 3 packages in 903ms
found 0 vulnerabilities

npm run verify-vendor
Vendor verification passed against local files and upstream releases.

npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

npm run check-docs
Documentation hygiene check passed: 247 markdown file(s) checked, 0 warning(s).

node --test test/ui.8-warm-realm-workspaces.test.js
tests 2
pass 2
fail 0
skipped 0

npm test
tests 434
pass 434
fail 0
skipped 0

npm run build (TZ=Pacific/Honolulu, LANG=de_DE.UTF-8)
Built build/coldbox.html (cc50fd79fcdc6ef4b348b809c98650ff4e14dd8517e57f81e942adff44bcc881)

npm run build (TZ=UTC, LANG=C)
Built build/coldbox.html (cc50fd79fcdc6ef4b348b809c98650ff4e14dd8517e57f81e942adff44bcc881)

alternate detached worktree at C:\Users\semaj\Projects\coldbox-ui8-alt,
TZ=Asia/Tokyo, LANG=fr_FR.UTF-8
Built build/coldbox.html (cc50fd79fcdc6ef4b348b809c98650ff4e14dd8517e57f81e942adff44bcc881)

node --test --test-name-pattern="an imported helper consuming an approved reference fails the guard non-zero" test/ui.4a-approved-mock-parity.test.js
pass 1
fail 0
The committed negative fixture observed the deliberately broken transitive graph check as a non-zero child process.

npm run test:browser
Browser harness passed in Chromium and Firefox.
```

The exact-head CI witness is run `31956673435`, whose `head_sha` is exactly `6d31629476a620269922bdd73dc810cfff939014`. Its required jobs were green: Ubuntu build, Windows build, cross-OS hash comparison, approved UI reference secret scan, and the Chromium + Firefox browser harness. The unit test job reported `434` passed and `0` skipped; the reference scan reported `findings=0, skipped=0`. The release attestation job was conditionally skipped because this was a pull request and is not a UI.8 acceptance check.

The CI workflow at the reviewed commit was audited directly. It checks out the exact pull-request head, runs vendor verification, forbidden-construct lint, documentation hygiene, unit/vector tests with a zero-skip guard, two builds and hash comparison on both operating systems, cross-OS hash comparison, the exact-reference scan, and the committed Chromium + Firefox `file://` harness.

## 2. What I could not verify

No UI.8 acceptance criterion remained unverified. Physical mobile-device evidence is not an acceptance criterion of UI.8; the separate maintainer/device gate remains outside this review and is not used to close this roadmap item.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Records, Money, Vault files and Reference each reach their built surfaces; existing warm behaviour and routes are preserved or explicitly redirected; no warm surface gains access to anything sealed. | ✅ | `src/index.html` contains exactly four warm groups with the built routes: Records (`registry`, `devices`, `verify`, `qr`), Money (`dashboard` plus disabled future Money entries), Vault files (`vault`, `backup`), and Reference (`learn`, `reference`, and its built provenance/legal route). The sealed-realm handoff is a separate `.nav-sealed-entry`, outside all warm groups. The focused UI.8 tests and both Chromium and Firefox harness runs exercised every built route, the responsive/mobile shell, existing routes, and the sealed boundary. The diff adds no warm message, secret field, or sealed-realm capability. |

## 4. Findings

None.

## 5. Verdict rationale

The four-workspace taxonomy is explicit and finite, every built warm destination is reachable in both required browser engines over `file://`, unavailable future destinations remain disabled, and the sealed entry remains separately reachable without becoming a warm workspace. Existing warm behavior, responsive navigation, keyboard/focus behavior, and realm-boundary assertions pass. The exact reviewed head has green CI with no skipped required tests, deterministic hashes across locale/timezone/path variation, clean vendor and documentation checks, and no findings. UI.8 is independently verified and ready to merge by the author-side session.
