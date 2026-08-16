# UI.11 Approved desktop/mobile visual parity certification

## Summary

UI.11 is in progress. This branch adds the manifest-driven parity harness and its exact PNG artifacts, preserves the cold/warm security boundary, and makes a first presentation-only shell/record-menu correction. It is not complete: the current pixel matrix is substantially non-zero and physical mobile evidence is unavailable in this environment.

## Scope

Included: `scripts/ui11-parity.js`, the harness unit tests, warm route state selection, shell composition CSS, canonical record-menu tokens/geometry, roadmap status, and this packet. No protocol, crypto, vault, storage, CSP, iframe sandbox, or message-schema source was changed.

Not complete: per-screen visual closure, zero-pixel parity, the final browser-integrated parity gate, and the maintainer physical-mobile comparison.

## How to verify

```text
$ node --test test/ui.11-parity-harness.test.js test/ui.6-floating-record-menu.test.js
✔ 6 tests passed

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 252 markdown file(s) checked, 0 warning(s).

$ npm run verify-vendor
Vendor verification passed against local files and upstream releases.

$ npm run build
Built build/coldbox.html (003d13fa2f9dbab09331a1035a33fbd9e295410ca3c4ab2ec33d2c232b1a6f2a)

$ npm run test:browser
Browser harness passed in Chromium and Firefox.

$ node scripts/ui11-parity.js --baseline
UI.11 baseline captured 138 rows; unexpected changed pixels: 85345227

$ node scripts/ui11-parity.js
Currently stops at the first incomplete reference driver state: `empty` has no visible selector after the mobile More transition. The parity run is therefore not a completion result.
```

The baseline and failed-run artifacts are retained under ignored `test/output/ui11/`. The harness verifies immutable reference bytes, generates its state matrix from the manifest and roadmap, uses exact RGBA comparison with no tolerance or masks, and writes cropped reference/product/diff PNGs plus machine-readable totals.

## Acceptance criteria

The roadmap acceptance is deliberately not claimed. The generated matrix and red baseline are present, but the following remain unmet: every PARITY row at zero unexpected pixels; all screen drivers; unavailable-only treatment; final browser-integrated parity gate; and the required physical mobile record.

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

The shell still contains legacy warm/cold nested composition around the opaque iframe, and many feature screens have not been visually rebuilt against the reference. The state-driver selectors are not yet complete, and the mobile crop/physical-device procedure still needs maintainer verification.

## Self-assessment

This is a reviewable partial implementation, not a release-ready UI.11 result. Do not mark the roadmap item `[x]`, do not merge, and do not treat the 138-row baseline as parity evidence.

## Docs updated

`ROADMAP.md`, `CHANGELOG.md`, and this packet.
