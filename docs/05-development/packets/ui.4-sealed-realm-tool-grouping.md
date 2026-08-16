# UI.4 — Sealed-realm tool grouping and hub

Branch: `ui.4-sealed-realm-tool-grouping`
Base: `main`
Date: 2026-08-15
Roadmap: [UI.4](../ROADMAP.md#phase-ui--interface-restructure)

## 1. Summary

UI.4 gives the cold realm a six-group hub and makes Seed Forge's released, focused secret the only seed/source-loading surface. The five duplicate seed/source fields are gone, the QR and SLIP-39 source selectors now display the focused-source state, and the remaining vault, recovery, share, passphrase, note, and entropy inputs stay in place. A whole-`src/` form-surface audit, a registry-checked dynamic secret-input factory, and the Chromium/Firefox harness enforce the registry, grouping, focus-only behavior, masking, teardown, and unchanged cold CSP.

## 2. Scope

In scope:

- Six sealed groups and direct hub links in `src/cold/index.html`: session, entropy, Seed Forge, backups, QR, and recovery.
- Removal of `#cold-seed-xor-source`, `#cold-codex32-secret-hex`, `#cold-shamir39-source`, `#cold-raw-sss-source`, and `#cold-slip39-seed-source`.
- Removal of the QR Studio and SLIP-39 non-secret source selectors, replaced by focused-source status text so those panels cannot load an unreleased alternative.
- Focused-secret reads for Seed XOR, codex32, Shamir39, raw SSS, SeedQR, and SLIP-39 generation.
- The ADR-0045 declared secret-input registry, whole-`src/` static form-surface audit, and registry-checked dynamic input factory.
- Browser-harness migration to release and focus the Seed Forge fixture before exercising migrated tools.
- Documentation and help updates at the affected spec, guide, ADR, changelog, and roadmap locations.

Deliberately out of scope:

- UI.5's global rail and disabled future-item navigation.
- New cryptography, vault-format changes, message types, persistence, or cold/warm boundary changes.
- Physical-device, mobile, Safari, Linux, or Tor validation; this item is browser-verifiable and does not claim the separate P0.19 device gate.

## 3. How to verify

Run from the repository root on branch `ui.4-sealed-realm-tool-grouping`.

### Focused tests

```text
$ node --test --test-concurrency=1 test/ui.4-sealed-realm.test.js test/ui.3-released-secret.test.js test/address-verification.test.js
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

The UI.4 tests walk every source HTML file and every JavaScript `createElement` call, require explicit public/sealed classification for every static form control, require all dynamic form types to be literal, and route the sole dynamic secret-input surface through the registry-checked factory. Negative mutations cover an unmarked static password field and a new raw dynamic input. The tests also assert the exact six group order, hub targets, exact cold CSP policy, and absence of all five retired IDs. The address test preserves the pre-release Seed Forge verification path while released sessions remain comparison-only.

### Required static checks

```text
$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 230 markdown file(s) checked, 0 warning(s).

$ npm run verify-vendor
Local vendor verified: @fontsource/bangers@5.3.0
Local vendor verified: @fontsource/comic-neue@5.3.0
Local vendor verified: @noble/ciphers@2.2.0
Local vendor verified: @noble/curves@2.2.0
Local vendor verified: @noble/hashes@2.2.0
Local vendor verified: @scure/base@2.2.0
Local vendor verified: @scure/bip32@2.2.0
Local vendor verified: @scure/bip39@2.2.0
Local vendor verified: argon2-browser@1.18.0
Local vendor verified: qrcode-generator@1.4.4
Upstream release verified: @fontsource/bangers@5.3.0
Upstream release verified: @fontsource/comic-neue@5.3.0
Upstream release verified: @noble/ciphers@2.2.0
Upstream release verified: @noble/curves@2.2.0
Upstream release verified: @noble/hashes@2.2.0
Upstream release verified: @scure/base@2.2.0
Upstream release verified: @scure/bip32@2.2.0
Upstream release verified: @scure/bip39@2.2.0
Upstream release verified: argon2-browser@1.18.0
Upstream release verified: qrcode-generator@1.4.4
Vendor verification passed against local files and upstream releases.
```

### Reproducible build

The final committed product-input build was run twice with the same result:

```text
$ npm run build
Built build/coldbox.html (c9b728b05fc912e82a5bf7c2205065425d0db3afae2836e79c02a4d41cc91fe4)

$ npm run build
Built build/coldbox.html (c9b728b05fc912e82a5bf7c2205065425d0db3afae2836e79c02a4d41cc91fe4)

$ Get-FileHash build/coldbox.html -Algorithm SHA256
C9B728B05FC912E82A5BF7C2205065425D0DB3AFAE2836E79C02A4D41CC91FE4

$ Get-Item build/coldbox.html | Select-Object Length
2667239
```

### Full suite

```text
$ npm test
ℹ tests 409
ℹ pass 409
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### Browser harness

```text
$ npm run test:browser
Playwright is dev-only; dependency-free build matches byte-for-byte (c9b728b05fc912e82a5bf7c2205065425d0db3afae2836e79c02a4d41cc91fe4)
Chromium: released-secret registry, public switcher, focus indicators, boundary isolation, clear shortcut, realm teardown, and panic clearing passed
Chromium: Seed XOR official-compatible deterministic flow, random flow, masked reveals, incomplete-set rejection, warm isolation, and teardown passed
Chromium: codex32 BIP-93 vectors, threshold generation/recovery, masking, confirmation-gated correction, warm isolation, and teardown passed
Chromium: Shamir39 and raw SSS official-format UI, masking, reconstruction, negative case, warm isolation, and teardown passed
Chromium: SLIP-39 cold gating, masked reveal, 20-word output, local two-share recovery, indexed checksum failure, warm-shell isolation, and teardown passed
Chromium: cold-local Seed Forge handoff, public fingerprint/xpub/address/backup comparisons, strict external-value negatives, and lock teardown passed
Firefox: released-secret registry, public switcher, focus indicators, boundary isolation, clear shortcut, realm teardown, and panic clearing passed
Firefox: Seed XOR official-compatible deterministic flow, random flow, masked reveals, incomplete-set rejection, warm isolation, and teardown passed
Firefox: codex32 BIP-93 vectors, threshold generation/recovery, masking, confirmation-gated correction, warm isolation, and teardown passed
Firefox: Shamir39 and raw SSS official-format UI, masking, reconstruction, negative case, warm isolation, and teardown passed
Firefox: SLIP-39 cold gating, masked reveal, 20-word output, local two-share recovery, indexed checksum failure, warm-shell isolation, and teardown passed
Firefox: cold-local Seed Forge handoff, public fingerprint/xpub/address/backup comparisons, strict external-value negatives, and lock teardown passed
Browser harness passed in Chromium and Firefox.
```

The harness ran from `file://` on Windows with Chromium `151.0.7922.34` and Firefox `153.0`. It also ran the existing cold network probes and reported the fetch, XHR, WebSocket, EventSource, and sendBeacon attempts blocked in both engines.

## 4. Acceptance criteria

The roadmap criterion is copied verbatim below:

> **Accept:** `#cold-seed-xor-source`, `#cold-codex32-secret-hex`, `#cold-shamir39-source`, `#cold-raw-sss-source` and `#cold-slip39-seed-source` no longer exist and their tools read the focused secret instead; `#cold-seed-forge-mnemonic-input` remains as the realm's single entry point; **a test asserts the declared secret-input registry specified in [ADR-0045](../adr/0045-released-secret-model.md) holds**: every input in `src/` that accepts secret material is declared with a category, no undeclared one exists, and **exactly one carries the category `seed-entry`**. **This item removes seed/source-loading inputs and only those** — the five listed above, leaving Seed Forge's. The registry must enumerate the legitimate sealed inputs that are not seed entry — vault passphrase and confirmation, keyfile, recovery re-authentication, recovery-share entry, concealment re-authentication, secret notes, the BIP-39 passphrase fields, and the share-combine fields — **every one of which stays.** A tool that reconstructs from shares must still accept share words; removing those inputs would break recovery, which is the opposite of this item's purpose. A naive count of secret-accepting inputs is not an acceptable implementation of this criterion; it was tried in an earlier draft and was false on the day it was written; every migrated tool derives what it displays from the focused secret and **has no seed/source-loading input of its own** — it may still have the inputs its own job requires; every secret value is masked on first paint; each tool's existing behaviour and test coverage is preserved, not reduced; the cold CSP is byte-identical to before the restructure and a test asserts cold still has no network capability.

| Criterion area | How satisfied | Evidence |
|---|---|---|
| Five duplicate fields removed; Seed Forge remains the single seed entry | The five listed IDs are absent from both cold HTML and cold source. Seed Forge keeps `#cold-seed-forge-mnemonic-input`; all migrated generation panels require a focused released record. | `test/ui.4-sealed-realm.test.js`; Chromium and Firefox released-secret and backup flows |
| Declared secret-input registry; exactly one `seed-entry` | `COLD_SECRET_INPUT_REGISTRY` is the canonical category map. Every static `<input>`, `<textarea>`, and `<select>` in every `src/**/*.html` file declares `data-input-surface`; sealed controls must match the registry, and public controls must not be registry-declared. Every JavaScript `createElement` call in `src/**/*.js` uses a literal element type; the sole dynamic input is the registry-checked cold factory, and the detached warm export textarea is explicitly public. Negative mutations prove that an unmarked static password and a raw dynamic input fail the audit. Exactly one registry entry is `seed-entry`. | `test/ui.4-sealed-realm.test.js`; `src/cold/main.js`; `src/cold/index.html` |
| Legitimate non-seed inputs stay | Vault passphrase/confirmation, keyfile, recovery re-auth/share entry, concealment re-auth, secret notes, entropy, BIP-39 passphrases, share passphrase, and combine/correction inputs remain. | Registry test; existing full suite and browser recovery/notes/entropy/backup flows |
| Recovery still accepts share words | Recovery and combine fields remain declared and functional; the harness reconstructs SLIP-39 locally and exercises Seed XOR, Shamir39, raw SSS, codex32, and BackupRecord share workflows. | `test/slip39.test.js`, `test/shamir.test.js`, `test/seed-xor.test.js`, `test/codex32.test.js`, browser harness |
| Migrated tools derive from focus and preserve masking/behavior | Source consumers now read the focused registry record; the browser harness releases a known Seed Forge fixture, checks generation/recovery, masking, negative cases, focus/lock teardown, and warm isolation in both engines. | `scripts/run-browser-harness.js`; full suite; Chromium/Firefox output above |
| Cold CSP is unchanged and offline | The source-level test compares the cold policy to the exact pre-restructure literal, including `connect-src 'none'`; browser CSP probes remain blocked. | `test/ui.4-sealed-realm.test.js`; browser harness |

## 5. Security impact

- Realm boundary: no change. No new message type or secret-bearing message was added. The registry is closure-local to the cold frame; only public labels/fingerprints and existing public protocol results are eligible for the warm shell.
- CSP/network: no change. The cold policy remains byte-identical and retains `connect-src 'none'`; no host is added and no attacker gains a network observation path from this item.
- Secret exposure: reduced duplicate seed-entry surfaces from six to one. QR Studio, SLIP-39, Seed XOR, codex32, Shamir39, and raw SSS source-loading now require the focused released Seed Forge record. Share words, passphrases, vault authentication, notes, and physical/manual entropy remain because they serve distinct jobs.
- Source classification: every static form control is explicitly marked public or sealed, sealed markers carry an ADR-0045 category, and dynamic cold secret inputs can only be made by the registry-checked factory. The detached warm export textarea is explicitly public.
- Teardown and masking: existing session teardown and masking paths remain; the migrated workflows clear focused-derived state on focus changes and lock/realm teardown. The browser harness checks masked outputs and teardown in both engines.
- Cryptography and vault format: unchanged. No derivation primitive, randomness path, vault byte layout, or persisted field was added.

If this implementation were wrong, the most serious plausible failure would be a migrated panel displaying or generating from an unfocused/stale secret, or a newly introduced undeclared secret input bypassing the review registry. The source audit rejects unmarked static controls, non-literal dynamic element types, and raw dynamic form creation; the focus/teardown browser assertions cover the runtime secret-consumer paths.

## 6. Test evidence

New or changed coverage:

- `test/ui.4-sealed-realm.test.js` walks all `src/**/*.html` form controls and all `src/**/*.js` `createElement` calls, checks the registry categories and exact one `seed-entry`, and includes negative mutations for an unmarked static control and raw dynamic input; it also checks removed fields, six groups, hub links, and exact cold CSP.
- `scripts/run-browser-harness.js` now releases/focuses the Seed Forge fixture before every migrated tool workflow and asserts focus-only gating, masked values, recovery, negative cases, warm isolation, and teardown in Chromium and Firefox.
- `test/address-verification.test.js` names and covers the preserved unreleased Seed Forge re-derivation path.

Independent vector sources already exercised by the retained crypto tests and browser flows:

- Seed XOR: Coldcard's [published Seed XOR guide](https://github.com/Coldcard/firmware/blob/master/docs/seed-xor.md) and [firmware construction](https://github.com/Coldcard/firmware/blob/master/shared/xor_seed.py), recorded in [`test/seed-xor.test.js`](../../../test/seed-xor.test.js).
- Codex32: published [BIP-93 vectors](https://github.com/bitcoin/bips/blob/master/bip-0093.mediawiki), recorded in [`test/codex32.test.js`](../../../test/codex32.test.js).
- Shamir39: [Ian Coleman's reference implementation](https://github.com/iancoleman/shamir39) and its pinned published fixtures, recorded in [`test/shamir.test.js`](../../../test/shamir.test.js).
- Raw SSS: [secrets.js](https://github.com/grempe/secrets.js) compatibility fixtures, recorded in [`test/shamir.test.js`](../../../test/shamir.test.js).
- SLIP-39: Trezor's published [`python-shamir-mnemonic` vectors](https://github.com/trezor/python-shamir-mnemonic/blob/master/vectors.json), recorded in [`test/slip39.test.js`](../../../test/slip39.test.js).

Deliberate negative checks include unmarked static and raw dynamic form controls, non-literal dynamic element types, undeclared/duplicate registry entries, retired IDs still present, no focused secret, incomplete share sets, invalid checksums, malformed/mixed shares, confirmation-gated codex32 correction, wrong external public values, cold network probes, CSP tampering, and lock/teardown while secret-bearing workflows are populated. The full Node suite reports 409 passing tests, and the browser harness passes in both required engines.

Not tested: iOS local execution, Android Chrome from Files, macOS Safari, macOS Chrome, Linux Firefox, Tor Browser, and physical hardware. No result for those platforms is inferred from the Windows browser run.

## 7. Device matrix

This item has browser-verifiable acceptance; it does not claim to close P0.19.

| Platform | Result | Notes |
|---|---|---|
| Windows Chrome | PASS | Playwright Chromium `151.0.7922.34`; exact `file://` harness passed. |
| Windows Firefox | PASS | Playwright Firefox `153.0`; exact `file://` harness passed. |
| macOS Safari | UNTESTED | No macOS/Safari host available. |
| macOS Chrome | UNTESTED | No macOS host available. |
| Linux Firefox | UNTESTED | No Linux host available. |
| **iOS local-execution target** | UNTESTED | No iOS device/build available; no Quick Look or localhost inference made. |
| Android Chrome (Files) | UNTESTED | No Android device available. |
| Tor Browser | UNTESTED | No Tor Browser binary available. |

## 8. Assumptions made

- The six group labels and order are `session`, `entropy`, `seed-forge`, `backups`, `qr`, and `recovery`, matching the workflow taxonomy in the existing cold document. The hub uses direct anchors to those group IDs.
- The roadmap names five duplicate secret/source fields, but QR Studio and SLIP-39 also had non-secret selectors that chose generated/validated source material. UI.4 removes those selectors as source-loading controls and replaces them with focused-source status text; no recovery, share-combine, passphrase, vault-authentication, note, or entropy input was removed. This is recorded in [ADR-0045](../adr/0045-released-secret-model.md).
- Seed Forge's per-word validation inputs are categorized `seed-validation`, not `seed-entry`: they are editable validation mirrors for the single Seed Forge validation workflow, not an additional source-loading surface. The registry therefore has exactly one entry whose category is `seed-entry`.
- Every form control in source HTML is part of the explicit surface contract: `data-input-surface="public"` means the control accepts no secret material, while `data-input-surface="secret"` must be in the sealed document and carry a matching ADR-0045 category. Dynamic secret inputs use the registry-checked factory; the detached warm export textarea is the only dynamic form control and is explicitly public.
- Codex32 and raw SSS consume the focused Seed Forge record's derived BIP-39 seed bytes; Shamir39 consumes the focused mnemonic, and SLIP-39 consumes the focused phrase entropy. Their own share, correction, passphrase, and configuration inputs remain where the workflow requires them.
- The warm-origin address check preserves its existing Seed Forge re-derivation before any release exists. After release, it is comparison-only; the dedicated cold Verification Bench is the focused-secret derivation lens. This avoids sending a released secret or its derivative into warm/public persistence.

## 9. What to scrutinise

- Review the registry and surface markers against every current form control in every `src/**/*.html` file and every `createElement` call in every `src/**/*.js` file, especially the dynamic per-word and share-combine IDs. A future static form control must declare its surface; a future dynamic form control must use a literal type and, if secret, the registry-checked factory.
- Trace every migrated generation path from `currentSeedForgeWallet()` to the focused registry record, and confirm no stale generated/validated fallback remains in Seed XOR, codex32, Shamir39/raw SSS, QR Studio, or SLIP-39.
- Confirm the intentional `currentUnreleasedSeedForgeWallet()` exception is limited to pre-release warm Address Check compatibility and cannot become a released-secret warm derivation path.
- Confirm the QR/SLIP-39 selector removal does not remove their legitimate share/passphrase/configuration inputs, and that all first-paint secret outputs remain masked.
- Confirm the six sections are correctly nested, the hub targets all six groups, and the cold CSP literal did not move or change.

## 10. Self-assessment

- The implementation keeps the existing cold-local recovery/share inputs because removing them would break recovery; the registry is category-based rather than a naive count, as required by ADR-0045.
- The registry audit is intentionally explicit: source HTML form controls carry public/sealed markers, sealed markers carry categories, and all dynamic form types are scanned across `src/**/*.js`. A future secret input cannot pass the audit by appearing in an unmarked HTML control, a new dynamic file, or a non-literal `createElement` call.
- Browser coverage is strong for the requested file-based acceptance, but it is not device evidence. Mobile, Safari, Linux, Tor, and hardware-wallet behavior remain untested and must not be read as passing from this packet.
- The QR and SLIP-39 selector removal is broader than the five named IDs because those selectors were source-loading controls, not independent secret values. That choice is documented in the ADR and is the main semantic point for independent review.

## 11. Bundle impact

The UI.3 packet recorded a local baseline of 2,654,759 bytes. This UI.4 branch builds to 2,667,239 bytes, a delta of +12,480 bytes (+12.19 KiB, +0.47%). The artifact remains below the 4 MB target and 4.5 MB hard cap recorded in [dependencies.md](../dependencies.md#bundle-budget).

## 12. Docs updated

- `docs/05-development/ROADMAP.md` — UI.4 moved to `[~]`; the reviewer must move it to `[x]` on PASS.
- `docs/05-development/adr/0045-released-secret-model.md` — exact duplicate-loader retirement, source-selector decision, registry categories, and address-verification boundary.
- `docs/01-spec/address-verification.md` and `docs/01-spec/architecture.md` — pre-release compatibility and released-session comparison-only behavior.
- `docs/03-guides/backup-seed-xor.md`, `backup-codex32.md`, `backup-shamir.md`, `backup-slip39.md`, and `use-qr-studio.md` — focused-secret workflow guidance at the affected user-facing depth.
- `CHANGELOG.md` — UI.4 entry and updated UI.1/ADR summary.
- This PR packet — commands, evidence, assumptions, limitations, and review focus.
- `docs/05-development/packets/ui.4-sealed-realm-tool-grouping.review.md` — the historical FAIL report copied unchanged into the branch for re-review.

## 13. Remediation of review FAIL

The attached review at [`ui.4-sealed-realm-tool-grouping.review.md`](ui.4-sealed-realm-tool-grouping.review.md) reviewed the previous exact tip `ee42eab5d7a612fed83705234e0b94ddb7665052` and remains unchanged, including its FAIL verdict.

- F1 is addressed by auditing every source HTML form control and every JavaScript `createElement` call, requiring explicit public/sealed markers, routing dynamic cold secret inputs through a registry-checked factory, and testing negative static, raw-dynamic, and non-literal-dynamic mutations.
- F2 is addressed in `ROADMAP.md`: the UI.4 summary now says that the five duplicate seed/source-loading fields are deleted while Seed Forge's single seed-entry field remains.
- F3 is not claimed closed by this author session. The pinned Node toolchain and both local browser engines are available here, but the protocol-mandated fresh independent reviewer must still perform the independent environment variation and deliberate fail-closed mutation before changing UI.4 from `[~]` to `[x]` or merging PR #59.
