# PR packet — UI.3 released-secret state and the secret switcher

## 1. Summary

This branch implements [UI.3](../ROADMAP.md) as a cold-realm, session-only released-secret registry and switcher, then remediates the independent review findings. Seed Forge can release several labeled results, exactly one remains focused, and the dependent split, backup-share, SeedQR, and verification panels visibly identify that focus by public master fingerprint. A warm-origin address check remains a public registry comparison after release and cannot derive or persist a public value from the session-only released secret. The release action uses the documented dark-ink token on pink, and the plain glossary definition names a released secret directly.

## 2. Scope

In scope: the registry and zeroization path in `src/cold/main.js`; the cold switcher, Seed Forge release controls, focus indicators, and panel wiring in the cold HTML/CSS; the released-session address-verification boundary; Chromium/Firefox browser coverage; unit/static coverage; the UI.3 guide/glossary help; the address-verification architecture/spec amendments; changelog and roadmap status.

Deliberately out of scope: UI.4's six-group hub and deletion of the five duplicate seed/source fields. Those fields remain as a transitional path on an unreleased session and are disabled once a release has occurred; UI.4 removes them and keeps the focused-secret wiring.

## 3. How to verify

The product tip used for verification, before this packet-only commit, is `e78cb6422510be26cb060d7df0744199dfef845a` on `ui.3-released-secret-state`. The reviewer-owned local report `docs/05-development/packets/ui.3-released-secret-state.review.md` is intentionally untracked and must not be staged.

```text
> npm run verify-vendor
Vendor verification passed against local files and upstream releases.

> npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

> node scripts/check-docs.js (clean checkout at e78cb64)
Documentation hygiene check passed: 227 markdown file(s) checked, 0 warning(s).

> npm run build
Built build/coldbox.html (1a60f562dbb428ea97a7e040820b1bbe359bce4d0c3a2b31ab9561577d16271d)

> first clean build
bytes=2654776
sha256=1a60f562dbb428ea97a7e040820b1bbe359bce4d0c3a2b31ab9561577d16271d

> Remove-Item build; npm run build
Built build/coldbox.html (1a60f562dbb428ea97a7e040820b1bbe359bce4d0c3a2b31ab9561577d16271d)

> second clean build
bytes=2654776
sha256=1a60f562dbb428ea97a7e040820b1bbe359bce4d0c3a2b31ab9561577d16271d

> npm test
ℹ tests 406
ℹ pass 406
ℹ fail 0

> npm run test:browser
Playwright is dev-only; dependency-free build matches byte-for-byte (1a60f562dbb428ea97a7e040820b1bbe359bce4d0c3a2b31ab9561577d16271d)
Browser harness passed in Chromium and Firefox.
Chromium: EVM cold verdict/state transition, named different-account match, aligned mismatch, raw whitespace, and checksum-invalid batch rows passed
Firefox: EVM cold verdict/state transition, named different-account match, aligned mismatch, raw whitespace, and checksum-invalid batch rows passed
```

The browser harness ran the built artifact from `file://` in both engines. Its dependency-free rebuild matched byte-for-byte. The EVM address-verification flow first proves the unreleased transitional path still reaches `cold-verified`, then releases/focuses the same Seed Forge result, verifies a previously unverified secondary address, captures every cold→warm delivery, and asserts one `address.verifyResult` with `unverified`, zero `publicData.updated` replacements, and an unchanged warm registry record.

## 4. Acceptance criteria

Roadmap text, copied verbatim:

> [~] **UI.3 Released-secret state and the secret switcher** 🌐
> *Deps: UI.1*
> The session-scoped registry from [ADR-0045](adr/0045-released-secret-model.md), in `src/cold/main.js`, plus the switcher strip. Nothing else in this phase can be tested without it.
> **Accept:** a secret released from Seed Forge appears in the switcher with its label and public master fingerprint; several secrets can be released and exactly one is focused; changing focus re-points every dependent panel with no reload and no re-entry; the registry is cleared and its buffers zeroized by each of vault lock, idle timeout, panic and realm teardown, each covered by a test; no released secret, and no derivative of one, appears in any message to the warm shell; the empty registry renders a designed empty state that explains what cleared it; nothing is persisted to any vault compartment or storage; **the focused secret's public master fingerprint is visible on any panel that performs a destructive, splitting or exporting action**, because acting on the wrong secret is the failure mode a multi-secret switcher introduces and the fingerprint is the only thing that distinguishes them; and the keyboard shortcut that clears the registry is confirmed not to collide with the panic binding — if it does, one of the two changes and the change is recorded in the packet.

| Criterion | How satisfied | Test |
|---|---|---|
| Released Seed Forge secrets appear with label and public fingerprint; several releases exist with exactly one focus. | `createReleasedSecretRegistry()` copies the derived bytes, stores only the public projection in switcher DOM, auto-focuses a new release, and renders one disabled `Focused` control. | `test/ui.3-released-secret.test.js`; `verifyReleasedSecretSwitcher` in the committed browser harness. |
| Changing focus re-points every dependent panel without reload or re-entry. | Focus switches clear cached split/share/QR/verification outputs, then all lenses read the focused record; source-loading fields are disabled after release and QR/SLIP-39 select the `focused` option. | Chromium and Firefox browser harness assertions for six indicators, source controls, focus summary, unchanged cold-ready marker, and focus switching. |
| Vault lock, idle timeout, panic, and realm teardown clear and zeroize the registry. | `clearVaultSession()` calls `clearReleasedSecrets()`, the idle callback calls `clearVaultSession(false)`, panic uses `lockVaultSession()`, and `pagehide` calls the same clear path. `clear()` fills every retained byte buffer with zeroes and removes mnemonic/language/public references. | Unit/static teardown assertions; Chromium and Firefox browser checks for normal vault lock, shortened item-scoped idle timeout, panic, and `pagehide`; the full harness also exercises the shared cold-session lock path. |
| No released secret or derivative appears in a warm message; no persistence is added. | `handleAddressVerifyRequest` gates `currentSeedForgeWallet()`, `verification.deriveRegistryAddress()`, and `verification.markAddressColdVerified()` behind `!releasedSecretModeActive()`. In released mode the warm-origin check remains a public registry comparison and returns `unverified`; it cannot write `verifiedAgainstXpub` or emit `publicData.updated`. | `test/address-verification.test.js`; the browser harness captures every cold-to-warm message after release, asserts one `address.verifyResult` with `unverified`, zero `publicData.updated` replacements, and an unchanged warm registry record. |
| Independent review F2: the release button meets the design-system contrast requirement. | `.cold-seed-forge-release button` uses `var(--cold-pink)` with `var(--cold-ink)`, and the test computes the actual token contrast rather than trusting a hard-coded result. | `test/ui.3-released-secret.test.js` asserts the exact tokens and WCAG contrast `>= 4.5:1`. |
| Independent review F4: the plain glossary entry uses “released secret” terminology directly. | The canonical plain entry now begins “The released secret you temporarily choose...” and does not describe the entry as a wallet. | `docs/00-overview/glossary.md`; `npm run check-docs`. |
| Empty registry is designed and explains clearing. | The always-visible switcher has a dashed empty state naming Seed Forge and the lock/inactivity/panic/realm causes; explicit clear paths replace it with the actual clear reason. | `verifyReleasedSecretSwitcher` checks empty state after clear, shortcut, teardown, and panic. |
| No vault/storage persistence. | Registry state is held only by the closure; teardown drops records and zeroizes buffers. The implementation introduces no storage API and no vault field. | Unit/static registry-source assertion and full build/lint/protocol tests. |
| Focused fingerprint is visible on every destructive, splitting, or exporting panel. | Six cold panels carry `[data-secret-focus-indicator]`: Seed XOR, codex32, Shamir/raw SSS, SeedQR, SLIP-39, and verification. They render the focused label and public fingerprint and never render secret material. | Chromium and Firefox count six focused indicators and verify every one contains the active fingerprint. |
| Clear shortcut does not collide with panic. | The shortcut is `Ctrl+Alt+Shift+L` (Meta is accepted for macOS); panic remains double `Escape`. The keydown handler checks the shortcut before the existing Escape branch. | Browser presses `Control+Alt+Shift+L`, then separately releases and double-presses Escape; both clear the registry through their intended paths. |

## 5. Security impact

- Realm boundary: touched cold-local code and cold DOM only. The cold CSP remains `connect-src 'none'`; no `allow-same-origin`, network host, or runtime dependency was added.
- Message schema: no new message type, payload field, or warm API. Released records, labels, fingerprints, mnemonics, derived bytes, and panel outputs are not passed to `postVaultMessage()` or `window.parent.postMessage()`.
- Released-session address verification: the warm-origin path may compare a candidate with public registry data, but it does not derive from the focused released secret or persist a public replacement. The browser regression captures the boundary and checks that `publicData.updated` remains absent. The unreleased Seed Forge path remains transitional until UI.4 and is documented as such.
- Vault format/storage: untouched. The registry is not serialized, included in a public or secret compartment, or written to browser storage.
- UI review remediation: the release button uses the dark-ink token on pink and the automated contrast test computes `var(--cold-pink)` versus `var(--cold-ink)` at WCAG AA contrast.
- Derivation/randomness: no cryptographic primitive or vector was added. Release copies the already-derived Seed Forge bytes; it does not generate randomness. Existing independent BIP-39 browser vectors continue to pass.
- If the focus invalidation were wrong, a user could act on a prior secret while seeing a new switcher focus. This is why focus changes clear dependent derived outputs and every covered lens displays the current public fingerprint.

## 6. Test evidence

New tests:

- `test/ui.3-released-secret.test.js` extracts the actual cold registry factory, proves multiple records and exactly-one focus, proves input byte copying, holds references to both buffers across `clear()`, and observes zeroization plus reference removal. It also asserts teardown wiring, no registry persistence/message calls, and the shortcut/panic distinction.
- `test/address-verification.test.js` statically asserts that released mode passes `null` instead of the focused released record into the warm-origin derivation/persistence path. `test/ui.3-released-secret.test.js` parses the release-button tokens and computes their WCAG contrast.
- `verifyReleasedSecretSwitcher` in `scripts/run-browser-harness.js` runs in Chromium and Firefox against the built `file://` artifact. It releases the independent official BIP-39 mnemonic with the `TREZOR` passphrase, releases a second generated secret, switches focus, checks automatic verification relinking plus all dependent indicators and source controls, checks warm-shell isolation, then covers explicit clear, shortcut, normal vault lock, an item-scoped shortened idle timeout, realm teardown, and panic.
- `verifyAddressVerification` first establishes the existing unreleased `cold-verified` transition, then releases/focuses the same validated result and verifies a different public address from the warm shell. It captures the cold-to-warm messages and asserts `address.verifyResult`/`unverified`, zero `publicData.updated` messages, and no persisted `cold-verified` text in the released-session result.

Independent vector source: the browser fixture uses the Trezor/python-mnemonic official BIP-39 English vector (`abandon` × 11 + `about`) with passphrase `TREZOR`; existing Seed Forge tests independently verify the derived fingerprint and PBKDF2 result. UI.3 itself does not introduce a new cryptographic algorithm.

Negative coverage includes invalid/missing registry inputs, a missing focus target, zeroized buffers after clear, no storage/message references in the registry factory, warm-shell absence of released public labels/fingerprints, and shortcut-vs-Escape separation. The harness also retains the repository's existing CSP, provider, randomness, tamper, and secret-message negative checks.

The review finding was reproduced with the guard temporarily removed from `handleAddressVerifyRequest`:

```text
> npm run test:browser
Browser harness failed: AssertionError [ERR_ASSERTION]: The input was expected to not match the regular expression /cold-verified/. Input:

'Registry match. This proves only that the pasted string matches a recorded address. Registry state: cold-verified.'
```

The guard was restored before the final verification. This control failure demonstrates that the browser regression detects the original released-secret derivation/persistence bug rather than merely checking static source text.

No physical-device testing was performed. UI.3's acceptance is explicitly browser-verifiable; the separate P0.19 device matrix remains its own release gate.

## 7. Device matrix

| Platform | Result | Notes |
|---|---|---|
| Windows Chrome | PASS | Chromium Playwright harness, built `file://` artifact; UI.3 flow passed. |
| Windows Firefox | PASS | Firefox Playwright harness, built `file://` artifact; UI.3 flow passed. |
| macOS Safari | untested | No macOS host available. |
| macOS Chrome | untested | No macOS host available. |
| Linux Firefox | untested | The required engine ran on this Windows host; no Linux host validation. |
| **iOS local-execution target** | untested | No iOS device/build available; no Quick Look inference made. |
| Android Chrome (Files) | untested | No Android device available. |
| Tor Browser | untested | No Tor Browser binary available. |

## 8. Assumptions made

- A blank release label uses the bounded generated label `Released secret <n>`; a supplied label is trimmed and bounded to 64 characters. This is a UI detail not fixed elsewhere and does not alter secret identity.
- A release is a snapshot of the Seed Forge mnemonic, language, derived 64-byte BIP-39 seed, and public fingerprint at the moment of release. Later passphrase edits do not mutate an existing registry record; releasing again creates a new record.
- The five duplicate source fields remain only until UI.4 removes them. Once any secret has been released, they are disabled and all dependent action code prefers the focused registry record.
- A released-secret session intentionally makes the warm-origin Address Check comparison-only: it may compare against the public registry, but it cannot derive or persist a public replacement from the focused released secret. The dedicated cold verification panel remains a cold-local lens; the unreleased source-field path is transitional until UI.4. Basis: the ADR-0045 amendment and the address-verification architecture/spec sections; if this assumption is wrong, warm verification would need a separately approved boundary design.
- `Ctrl+Alt+Shift+L` was selected because the existing panic binding is double `Escape`; the browser test confirms both paths independently.

## 9. What to scrutinise

- Verify that `clearReleasedSecretLensState()` is called before and after focus changes in the right order: dependent outputs must not survive a new focus, while Seed Forge must retain its two releaseable workflows until an actual teardown.
- Verify `clearVaultSession()` remains the single implementation path for lock and idle teardown, including failure/health paths, and that pagehide does not introduce a second persistence or message route. The committed browser flow now drives normal lock and an item-scoped shortened idle timer directly.
- Verify that `getFocused()` is closure-local and that only `getFocusedPublic()` reaches DOM rendering; a future refactor must not expose the record's mnemonic or byte array through a diagnostic API.
- Verify the released-mode branch in `handleAddressVerifyRequest`: the focused released record must not reach `deriveRegistryAddress` or `markAddressColdVerified`, and the `publicData.updated` check must cover every captured message after the released verification. This is the least confident boundary because the pre-existing warm-origin path was correct for unreleased transitional fields but unsafe once release state existed.
- Verify that the review-remediation tests assert the actual CSS tokens and contrast calculation, and that the plain glossary definition retains “released secret” terminology if the wording is edited later.
- Verify the transitional source-field behavior does not get mistaken for UI.4 completion; the roadmap intentionally leaves field deletion to the next item.

## 10. Self-assessment

- The browser harness directly exercises normal vault lock, an item-scoped shortened idle timer, panic, shortcut, and realm teardown. The idle case shortens only the cold frame's five-minute timer inside the harness; it does not change the product constant.
- Firefox required `MOZ_DISABLE_CONTENT_SANDBOX=1` and `MOZ_WEBRENDER=0` for the Playwright process on this Windows host; those are test-environment settings only and no product security setting was changed. The final Chromium and Firefox harness runs passed with the committed artifact.
- Mobile, Safari, Tor, and physical device behavior are untested and remain open release evidence gaps outside this item's browser-verifiable acceptance.
- UI.4 must delete the five duplicate seed/source inputs and retain the focused-record lens behavior; until then, an unreleased initial page still supports the existing transitional source workflows.

## 11. Bundle impact

The recorded UI.2 baseline is 2,622,481 bytes. This branch builds to 2,654,776 bytes, a delta of +32,295 bytes (+31.54 KiB, +1.23%); the artifact remains below the 4 MB target and 4.5 MB hard cap recorded in [dependencies.md](../dependencies.md#bundle-budget). The increase includes the UI.3 cold registry/switcher, the released-session verification boundary, automatic verification relinking, and the three-depth help additions.

## 12. Docs updated

- `docs/05-development/ROADMAP.md` — UI.3 moved to `[~]`; it remains for the independent reviewer to mark `[x]`.
- `docs/03-guides/first-wallet.md` — plain/working/technical release and focus guidance.
- `docs/00-overview/glossary.md` — canonical three-depth “Released secret” term linked to ADR-0045.
- `docs/01-spec/address-verification.md` — released-secret comparison-only boundary.
- `docs/01-spec/architecture.md` — warm/cold boundary clarification for released-session address checks.
- `docs/03-guides/verify-an-address.md` — user-facing comparison-only behavior after release.
- `docs/05-development/adr/0045-released-secret-model.md` — amendment recording the released-session verification invariant.
- `CHANGELOG.md` — UI.3 entry.
- No new ADR: the registry model and boundary decisions already live in [ADR-0045](../adr/0045-released-secret-model.md).
