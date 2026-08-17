# UI.11 Approved desktop/mobile visual parity certification

## Summary

UI.11 is in progress. This branch adds the manifest-driven parity harness and its exact PNG artifacts, preserves the cold/warm security boundary, and materially improves the sealed desktop/mobile shell composition. It is not complete: the latest exact full matrix captured all 138 rows but reported 64,297,690 unexpected changed pixels, and physical mobile evidence is unavailable in this environment.

## Scope

Included: `scripts/ui11-parity.js`, the harness unit tests, warm route state selection, shell composition CSS, mobile product-frame capture, canonical record-menu tokens/geometry, roadmap status, and this packet. No protocol, crypto, vault, storage, CSP, iframe sandbox, or message-schema source was changed.

Not complete: per-screen visual closure, zero-pixel parity, and the maintainer physical-mobile comparison. The Chromium/Firefox behavioral harness is green; that is separate from the failed exact pixel gate.

## How to verify

```text
$ node --test test/ui.11-parity-harness.test.js test/ui.6-floating-record-menu.test.js
✔ 6 tests passed

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 253 markdown file(s) checked, 0 warning(s).

$ npm run verify-vendor
Vendor verification passed against local files and upstream releases.

$ npm run build
Built build/coldbox.html (01281cb60a1d77e1d3472bf8e73a20eb7001153d351440ac9262ec1565c4431d)

$ npm run test:browser
Browser harness passed in Chromium and Firefox.

$ node scripts/ui11-parity.js --baseline
UI.11 baseline captured 138 rows; unexpected changed pixels: 60582440

$ node scripts/ui11-parity.js
UI.11 parity captured 138 rows; unexpected changed pixels: 64297690
UI.11 parity failed: UI.11 parity has unexpected changed pixels
```

The baseline and failed-run artifacts are retained under ignored `test/output/ui11/`. The harness verifies immutable reference bytes, generates its state matrix from the manifest and roadmap, uses exact RGBA comparison with no tolerance or masks, renders the product at the literal 390×844 mobile frame, and writes cropped reference/product/diff PNGs plus machine-readable totals.

## Acceptance criteria

The roadmap acceptance is deliberately not claimed. Every manifest row now has a captured product/reference/diff record, but the following remain unmet: every PARITY row at zero unexpected pixels; visual closure of the feature screens; unavailable-only treatment; final browser-integrated parity gate; and the required physical mobile record.

## Security impact

No security or product boundary was intentionally changed. `src/main.js` now selects one primary route state for the sealed-realm route and adds a presentation attribute; CSS changes only affect composition and tokens. Existing behavior was re-run in Chromium and Firefox, including CSP, protocol, vault, zeroization, and cold-only tests.

## Test evidence and gaps

The new unit test proves manifest row uniqueness/classification and exact PNG encode/decode plus one-pixel negative comparison. The existing independent crypto and browser vectors remain unchanged. Full `npm test` was not green in the sandbox because six build-date/provenance cases could not spawn temporary Git repositories (`spawnSync git EPERM`); the focused new/UI.6 tests, lint, docs, vendor verification, build, and full browser harness passed.

## Device matrix

| Platform | Result | Notes |
|---|---|---|
| Chromium file:// | PASS | Existing behavioral harness; UI.11 pixel gate remains open. |
| Firefox file:// | PASS | Existing behavioral harness; UI.11 pixel gate remains open. |
| Physical mobile | UNTESTED | No physical iOS/Android device is available in this session. ADR-0043 cannot close UI.11. |

## Assumptions made

- The frozen reference remains quarantine-only and is copied to a disposable `.html` path only by the harness.
- `backuphealth` remains warm-owned in the product while the approved prototype renders that lens in the cold rail; the harness records this as PAR-003 instead of moving product logic across the realm boundary.
- The branch remains `[~]` until an independent reviewer can verify the complete acceptance criteria.

## What to scrutinise

The shell is materially closer in the warm and sealed desktop/mobile hub captures, including the single sealed viewport, compact released-secret switcher, mobile card order, and cold navigation rail. The approved header actions, most feature screens, and several fixture/reference details still differ substantially. The aggregate exact diff remains non-zero, and physical-device comparison still needs maintainer verification.

## Self-assessment

This is a reviewable partial implementation, not a release-ready UI.11 result. Do not mark the roadmap item `[x]`, do not merge, and do not treat the 138-row baseline as parity evidence.

## Docs updated

`ROADMAP.md`, `CHANGELOG.md`, and this packet.
