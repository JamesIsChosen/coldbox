# UI.10 — Vault naming in the sealed realm

## Summary

This item implements [UI.10](../ROADMAP.md) and ADR-0046 end to end. Durable vault names are entered and authenticated in the cold realm, while the warm shell uses a name-free canonical filename and an optional device-local nickname. The cold/warm projection and replacement rules preserve the name without adding a message type or exposing the name to warm.

## Scope

In scope: sealed creation controls, bounded authenticated name storage and rename, name-free filenames, historical filename parsing, warm nickname state, live-transfer metadata removal, cold-owned projection/replacement rules, documentation, tests, and browser-harness updates. Out of scope: UI.11 visual certification and physical-device release validation.

## How to verify

The exact commands and observed results from commit `b2ef5af` are:

```text
$ npm test
ℹ tests 442
ℹ pass 442
ℹ fail 0

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run verify-vendor
Vendor verification passed against local files and upstream releases.

$ npm run check-docs
Documentation hygiene check passed: 250 markdown file(s) checked, 0 warning(s).

$ npm run build
Built build/coldbox.html (d7d695792648e09646d94b91a78510101e45541110dfa058fdddf495b907af92)

$ npm run build
Built build/coldbox.html (d7d695792648e09646d94b91a78510101e45541110dfa058fdddf495b907af92)
BUILD1_SHA256=d7d695792648e09646d94b91a78510101e45541110dfa058fdddf495b907af92
BUILD2_SHA256=d7d695792648e09646d94b91a78510101e45541110dfa058fdddf495b907af92

$ npm run test:browser
Browser harness passed in Chromium and Firefox.
```

The focused UI.10 and affected save/transfer tests are included in the 442-test run. The browser harness also verified that the approved reference files remain outside the product build inputs.

## Acceptance criteria

| Criterion | How satisfied | Test/evidence |
|---|---|---|
| Creation name, phrase, confirmation, KDF profile, and keyfile share one sealed screen | Cold HTML and `createEmptyVault` own all controls; warm preparation is payload-free | `p0.19-runtime-wiring.test.js`; Chromium and Firefox harness |
| Name is bounded, typed, authenticated in the encrypted public compartment | `normalizeVaultName` enforces a non-empty 1–80-character string with no controls; `createVault` serializes it into authenticated public data | `vault.test.js` UI.10 round-trip |
| No name/derivative crosses cold → warm; no new message type | `publicCompartmentProjection` deletes `name` for every outbound public projection; warm only receives existing `id`; transfer manifest no longer carries a name | `vault.test.js`, `save-flow-wiring.test.js`, `vault-transfer.test.js`, browser boundary assertions |
| Canonical filename is `coldbox--<id8>.cbx`; historical forms remain readable | `filenameForVault` is name-free; parser retains historical named/generational forms | `save-integrity.test.js`; browser library flow |
| Warm picker shows `id8` plus optional local nickname, never sent/stored in vault/filename | Nickname is localStorage keyed by Vault ID; create, load, and transfer flows use it only for display | `save-flow-wiring.test.js`, `p0.19-runtime-wiring.test.js`, browser library flow |
| Durable name can be renamed cold while unlocked; nickname can be renamed warm | `renameVault` rewrites the authenticated public compartment without a new file; warm nickname helpers are independent | `vault.test.js`; source wiring tests |
| Name survives registry edit; inbound name injection fails closed | `replacePublicData` carries the cold-owned name and rejects an inbound own `name` field | `vault.test.js` full replace round-trip and negative injection |
| Format-version decision is recorded | No version bump: the v1 public compartment is authenticated JSON with forward-compatible optional fields; the existing parser/migration path preserves the field, and UI.10 adds no header/AAD/key/KDF or compartment framing change. This is documented in `vault-format.md` and this packet. | `vault.test.js`; reproducible build |
| Required current docs and amended ADR clauses are updated; historical packet is unchanged | Current spec, architecture, threat model, quick start, testing, ADR-0013, and changelog now describe name-free current behavior; archived P0.19 evidence remains verbatim | `p0.19-doc-semantics.test.js`; `npm run check-docs` |

## Security impact

Yes: this changes cold-owned authenticated public metadata and its warm projection. If the projection leaked `name`, the warm realm would gain a user-chosen string that could be a passphrase or other sensitive label; if replacement accepted `name`, warm could rewrite authenticated cold-owned state. Both paths are explicitly guarded and tested. No CSP or `connect-src` host changed. No message type was added; existing `vault.opened`/`publicData.updated` projections are filtered, and the create preparation remains payload-free.

The name is now encrypted inside the vault rather than disclosed in filesystem metadata. The warm nickname is deliberately non-durable, device-local display state and is never sent to cold or put in a filename.

## Test evidence

New/changed tests cover name normalization, authenticated save/reopen, rename, replacement preservation, inbound injection rejection, canonical and historical filename parsing, name-free transfer frames, payload-free creation, local nickname wiring, and browser library selection. The negative replacement test fails closed on an injected name field. Browser verification ran the committed Chromium and Firefox harness over `file://`, including cold/warm isolation and the name-free library flow. No cryptographic vectors were changed.

## Device matrix

| Platform | Result | Notes |
|---|---|---|
| Windows Chromium | PASS | Committed browser harness, `file://` |
| Windows Firefox | PASS | Committed browser harness, `file://` |
| macOS Safari | DEFERRED | Physical device validation is release/UI.11 work |
| macOS Chrome | DEFERRED | Physical device validation is release/UI.11 work |
| Linux Firefox | DEFERRED | Physical device validation is release/UI.11 work |
| iOS local-execution target | DEFERRED | No physical device in this item; see ADR-0043/ADR-0010 |
| Android Chrome (Files) | DEFERRED | Physical device validation is release/UI.11 work |
| Tor Browser | UNTESTED | Not required by UI.10's committed browser harness |

## Assumptions made

The v1 public JSON compartment permits authenticated optional fields without a format-version bump because the field is inside the existing authenticated compartment and no framing or key derivation changes. Older readers preserve unknown public fields through the existing migration/serialization path; warm never receives the field. Physical device and human visual certification remain deferred to the later certification gate.

## What to scrutinise

Review the projection boundary at every cold-to-warm response, especially `publicData.updated`, and the replacement path's rejection-before-merge behavior. Check that nickname storage cannot enter a message, vault bytes, filename, or transfer manifest. Confirm historical filename parsing remains compatibility-only and that no current documentation silently retains the old name-bearing convention.

## Self-assessment

The main residual risk is compatibility with an external reader that assumes the public JSON has no optional `name`; the field is authenticated and the current reader path is tested, but external readers are not part of this repository. Physical Safari/iOS/Android behavior is not claimed here and remains a later human gate. UI.11 still owns exact approved desktop/mobile visual parity certification.

## Bundle impact

The single-file product remains one deterministic HTML artifact. The two builds above produced the identical SHA-256 `d7d695792648e09646d94b91a78510101e45541110dfa058fdddf495b907af92`; no runtime dependency was added.

## Docs updated

Updated `quick-start.md`, `SPEC.md`, `architecture.md`, `vault-format.md`, `threat-model.md`, `testing.md`, ADR-0013, ADR-0046's implementation references, `ROADMAP.md`, and `CHANGELOG.md`. Historical packets were not rewritten.
