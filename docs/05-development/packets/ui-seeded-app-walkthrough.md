# UI shell walkthrough packet

> Revision after owner feedback: the shipped application now uses the approved
> card hierarchy with empty/live states and contains no invented route records,
> balances, prices, dates, devices, or verification results. The seeded
> walkthrough remains a separate visual reference only; it is not the shipped
> application. The earlier seeded wording below is retained as implementation
> history, while the current tip and current test results supersede it.

## 1. Summary

This owner-directed UI branch applies the approved comic-shell walkthrough to the
actual application shell. It adds one shared centered floating detail menu with
the approved red Close button, gives every route the final card hierarchy with
honest empty states, embeds the supplied Coldbox wordmark and matching favicon
sizes, and documents both the live shell and the separate visual walkthrough.

This is roadmap-neutral UI work. It does not change the ROADMAP or claim any
P0.19 completion. P0.19 remains [~] with physical acceptance deferred.

## 2. Scope

Branch: ui-seeded-app-walkthrough

Implementation commit: 821257566599

Base: 25ba569873b5343c6c88efda952bdfe592e08a83 (merged P0.19 implementation;
physical matrix deferred)

Included:

- Sample-free Dashboard, Portfolio, Prices, Registry, and Devices cards that
  preserve the approved hierarchy while showing explicit no-record states.
- Protected-layout shells for Entropy Lab, Seed Forge, Derivation, Backup Lab,
  QR Studio, Recovery, and Verify Bench; no unbuilt feature is presented as
  complete or populated.
- The previous seeded walkthrough preserved locally as
  build/coldbox-ui-walkthrough.html for visual review only; it is not part of
  the shipped app or the build output contract.
- Verify Bench, plus the existing Reference and Learn routes.
- One shared floating popup layer centered in the viewport. It uses backdrop
  click, Escape, keyboard activation for capability rows, focus transfer, focus
  restoration, and a red Close button.
- Capability rows are individually clickable and their popup summary reflects
  the current capability status/detail nodes.
- The supplied transparent wordmark and all six supplied favicon files are
  copied into src/assets/brand and embedded as data URIs during the build.
- A precise build asset manifest and binary-aware source lint handling.
- A browser-harness walkthrough for all 15 routes and popup keyboard/focus
  behavior.
- The canonical UI walkthrough at docs/01-spec/ui-walkthrough.md.

Deliberately not included:

- No new vault, crypto, derivation, backup, recovery, QR-transfer, or device
  protocol implementation.
- No secret material in the warm-shell preview.
- No runtime image/font/CDN dependency.
- No ROADMAP status change, P0.19 acceptance claim, PR merge, or P1 start.

## 3. How to verify

Run from C:/Users/semaj/Projects/coldbox.

npm.cmd run verify-vendor

Result: local and upstream verification passed for all pinned artifacts:
@fontsource/bangers, @fontsource/comic-neue, @noble/ciphers,
@noble/curves, @noble/hashes, @scure/base, @scure/bip32, @scure/bip39,
argon2-browser, and qrcode-generator.

npm.cmd run lint

Result: Lint passed: forbidden constructs, JavaScript syntax, and LF source
line endings are valid.

npm.cmd run check-docs

Result: Documentation hygiene check passed: 136 markdown file(s) checked,
0 warning(s).

npm.cmd run build

First committed-tip result:
Built build/coldbox.html
(9ff497b54b8b918d475f88bf1c0d7720752ff81431d68f1ac9484b3bca7731aa)

Second committed-tip result:
Built build/coldbox.html
(9ff497b54b8b918d475f88bf1c0d7720752ff81431d68f1ac9484b3bca7731aa)

The sidecar contains the same SHA-256:
9ff497b54b8b918d475f88bf1c0d7720752ff81431d68f1ac9484b3bca7731aa
build/coldbox.html

npm.cmd test

Result:
tests 255
pass 255
fail 0
cancelled 0
skipped 0

npm.cmd run test:browser

Result in this environment:
Browser harness failed: Playwright browser binaries are missing (chromium,
firefox). Run npx playwright install chromium firefox after npm ci.

The harness was not weakened or skipped. The new route/popup assertions are
registered before the existing Chromium/Firefox security gates and will execute
when the required binaries are installed. Direct file:// navigation was also
blocked by the available in-app browser policy; no workaround was attempted.

## 4. Acceptance criteria

This branch has no roadmap item. It is the owner-directed continuation of the
approved UI mock, so the acceptance contract is:

| Criterion | Evidence |
|---|---|
| Every approved route uses the approved card hierarchy | test/ui-walkthrough.test.js asserts all 15 route IDs and the browser harness visits every route |
| Unbuilt features do not present invented data | Portfolio, Prices, Registry, Devices, protected routes, and Verify Bench use explicit empty/unavailable states |
| Detail actions use one centered popup style | Shared floating-menu-layer markup/CSS/handlers and popup contract test |
| Close action is red and accessible | CSS uses var(--fill-red), modal is aria-modal, keyboard close and focus restoration are asserted |
| Protected surfaces remain visibly calm and secret-free | Seed/derivation/recovery/QR previews use placeholders; the existing vault boundary test passes |
| Brand artwork is supplied locally and embedded | Six asset hashes below, build asset manifest, and built data-URI test |
| Future work cannot silently lose the UI map | docs/01-spec/ui-walkthrough.md, docs index link, design-system link, changelog entry |
| The browser-openable artifact is reproducible | Two committed-tip builds have the same SHA-256 |

## 5. Security impact

- The cold realm, message schema, vault format, derivation code, CSP hosts,
  and runtime security logic were not changed.
- No new protocol message, secret-bearing field, network host, or runtime
  dependency was added.
- The brand images are local build inputs only. They are embedded in the warm
  document as data URIs under the existing image CSP.
- The popup body uses a static, source-controlled content map. No runtime
  user-controlled string is interpolated into it. The packet's future-feature
  checklist requires structured/escaped dynamic content if this changes.
- The warm-shell source guard caught and forced removal of the literal
  protected-secret term from main.js popup copy. The actual protected UI
  remains in the cold realm; test/vault.test.js passes its cold-only API and
  source checks.
- scripts/lint.js now ignores only the known binary source extensions ICO and
  PNG for text/line-ending scans. JavaScript remains syntax-checked and the
  forbidden-construct fixture suite remains fully passing.

## 6. Test evidence

New test file: test/ui-walkthrough.test.js.

It proves:

- All 15 stable routes have a page and route link.
- Every popup trigger maps to a static popup content entry.
- The shared dialog is modal, centered, keyboard-closeable, and red-close
  styled.
- No route content uses inline style attributes or invented records.
- All supplied assets are non-empty, included in the explicit build manifest,
  and resolved into the final artifact.
- The live **Design shell / no sample data** badge remains present.

New browser checks in scripts/run-browser-harness.js prove, when browsers are
available:

- The wordmark and design-shell badge render.
- Light/dark toggles still work.
- A system-health popup opens, has the red computed background, closes, and
  restores focus.
- A capability row opens by Enter, reports its current result, closes by
  Escape, and restores focus.
- Each of the 15 routes becomes visible and has a primary heading.
- No unexpected console errors appear in the walkthrough.

The full unit suite includes the new 3 passing UI tests and the existing 252
tests. The browser harness prerequisite failure is environmental and is
reported above; no browser result is inferred from another engine or platform.

## 7. Device matrix

This owner-directed branch was not used to claim P0.19 physical acceptance.
All physical rendering and execution checks remain untested here and must not
be inferred from the existing Windows/P0.19 work.

| Platform | Result | Notes |
|---|---|---|
| Windows Chrome | Untested on this UI branch | P0.19 physical acceptance remains deferred |
| Windows Firefox | Untested on this UI branch | P0.19 physical acceptance remains deferred |
| macOS Safari | Deferred | No device available in this session |
| macOS Chrome | Deferred | No device available in this session |
| Linux Firefox | Deferred | No device available in this session |
| iOS local-execution target | Deferred | Exact device/iOS result still belongs to P0.19 human acceptance |
| Android Chrome (Files) | Deferred | No device available in this session |
| Tor Browser | Deferred | No device available in this session |

P0.19 remains [~]. This UI branch does not mark it complete.

## 8. Supplied asset evidence

The supplied favicon files are the same lower-case C design at different sizes.
The wordmark PNG was checked as transparent RGBA artwork before copying.

| Repository path | Bytes | SHA-256 |
|---|---:|---|
| src/assets/brand/coldbox-wordmark.png | 419715 | 9313cd9b9897c3665af927aed486cd6fb19f8b37151f13abefca9c70d7c0ea89 |
| src/assets/brand/favicon-c-lower.ico | 651 | 7e530161502be7d0c7745c252d235aeb10ca36e63f0abad25c6ca217f7e9e238 |
| src/assets/brand/favicon-c-lower-16x16.png | 629 | e4f2ca7f8a0ad98701cd7b6f9dab068143da6a6fe3a14b558a722a8dee80c9bb |
| src/assets/brand/favicon-c-lower-32x32.png | 1712 | 53192dfea859a910f91a9de43be7fea08b569cf22f7044a44cd3f57e9dd74b01 |
| src/assets/brand/favicon-c-lower-48x48.png | 3334 | 543b9e6c7dedf49be6f2326686b0cd721998f35e2fc64f01e23c793737b426bf |
| src/assets/brand/favicon-c-lower-64x64.png | 5391 | 30d4d46b401cde10dfa64173b267baac03513d91f004c8fd3416e9554d4b9030 |

## 9. Assumptions

- The supplied favicon files are intentional density variants of one design, so
  all are retained rather than selecting only one.
- The transparent wordmark is the intended navbar replacement; no additional
  image editing or generated artwork was performed.
- The standalone seeded reference is for layout comprehension only and is not
  part of the application, a test vector, or a claim about a user's holdings.
- Existing Vault, Reference, and Learn implementations remain authoritative
  where this preview overlaps them.
- A roadmap-neutral UI branch is appropriate because the prior approved comic
  design-system packet used the same owner-directed UI-track precedent. No
  roadmap marker was changed.

## 10. What to scrutinise

- Open build/coldbox.html at desktop and mobile widths and confirm the actual
  wordmark aspect ratio does not crowd the badge or quick links.
- Walk every popup from the route inventory. Check that the red Close button,
  centered placement, Escape behavior, and focus restoration remain consistent.
- Verify the live shell keeps explicit empty/loading/unavailable states until a
  route receives real data; keep seeded reference content separate.
- Review static popup copy against architecture and the public-data model before
  replacing any placeholder with a live value.
- Install the pinned browser binaries in a review environment and run the
  Chromium/Firefox harness. This session could not provide that evidence.
- Keep the P0.19 physical matrix separate. Do not treat this UI packet as a
  device acceptance record.

## 11. Bundle impact

Reviewed base 25ba569 build: 1,269,833 bytes.

Committed UI tip build: 1,939,484 bytes.

Delta: +669,651 bytes (+653.96 KiB). The increase is primarily the embedded
419,715-byte transparent wordmark expanded into a base64 data URI, plus the
sample-free route cards and popup/CSS walkthrough. The artifact remains below the
SPEC target of 3 MB.

## 12. Docs updated

- docs/01-spec/ui-walkthrough.md: canonical route and popup walkthrough.
- docs/01-spec/design-system.md: link to the canonical walkthrough.
- docs/README.md: documentation index entry.
- CHANGELOG.md: seeded UI, popup, and brand-artwork entry.
- This packet: implementation and verification evidence.

No ADR was added because this uses the existing design-system and two-realm
decisions; the shared popup is an implementation of the approved UI contract,
not a new security or storage decision.
