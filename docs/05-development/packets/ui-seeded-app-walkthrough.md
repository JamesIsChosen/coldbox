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

Implementation commit: 672cfd7c15a837fe675fc001389c17f96daf0ec2

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
- A browser-harness walkthrough for all 16 routes and popup keyboard/focus
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

Result: Documentation hygiene check passed: 137 markdown file(s) checked,
0 warning(s).

npm.cmd run build

Current-tip (672cfd7) first result:
Built build/coldbox.html
(ac67b1ac9149b68e7d2051fba5b265ee623bc06dcb06887c11630bd946ae5f15)

Current-tip (672cfd7) second result:
Built build/coldbox.html
(ac67b1ac9149b68e7d2051fba5b265ee623bc06dcb06887c11630bd946ae5f15)

The sidecar contains the same SHA-256:
ac67b1ac9149b68e7d2051fba5b265ee623bc06dcb06887c11630bd946ae5f15
build/coldbox.html

npm.cmd test

Result:
tests 256
pass 256
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
| Every approved route uses the approved card hierarchy | test/ui-walkthrough.test.js asserts all 16 route IDs and the browser harness visits every route |
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

- All 16 stable routes have a page and route link.
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
- Each of the 16 routes becomes visible and has a primary heading.
- No unexpected console errors appear in the walkthrough.

The full unit suite passes 256 tests, including the new UI and protocol
coverage. The browser harness prerequisite failure is environmental and is
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

Committed UI tip build: 1,947,648 bytes.

Delta: +677,815 bytes (+661.93 KiB). The increase is primarily the embedded
419,715-byte transparent wordmark expanded into a base64 data URI, plus the
sample-free route cards and popup/CSS walkthrough. Removing the populated route
records reduced the final artifact relative to the earlier seeded tip. The
artifact remains below the
SPEC target of 3 MB.

## 12. Docs updated

- docs/01-spec/ui-walkthrough.md: canonical route and popup walkthrough.
- docs/01-spec/design-system.md: link to the canonical walkthrough.
- docs/README.md: documentation index entry.
- CHANGELOG.md: seeded visual-reference, sample-free shell, popup, and
  brand-artwork entries.
- This packet: implementation and verification evidence.

No ADR was added because this uses the existing design-system and two-realm
decisions; the shared popup is an implementation of the approved UI contract,
not a new security or storage decision.

## 13. Current-tip correction evidence

The owner correction is included in commit
`05f55078b656505c8fc2d7b7c9b685e43735f33b`. The shipped artifact now presents
the approved mock hierarchy first and uses empty, unavailable, planning, or
live-status states wherever the feature is not built. The live realm,
reachability, and capability surfaces remain present in the dedicated System
Health workspace and were not removed or replaced with display-only copies.

The following static scan was run against `build/coldbox.html` after the
current-tip build:

```text
rg -n -i 'Seeded UI preview|Sample source card|sample data in this|sample data in the|248,670|78,382|1.8421|Coldcard savings|Trezor daily|Tax reserve|Primary Bitcoin|Daily device|Emergency reserve' build/coldbox.html
No seeded route values found in shipped artifact.
```

The current full suite result is 256 tests passed, 0 failed. The focused
UI/route contract run is 23 tests passed, 0 failed. `npm.cmd run lint` and
`npm.cmd run check-docs` pass; the latter reports 137 markdown files and zero
warnings. Two post-commit builds produced the identical SHA-256 recorded in
section 3.

`npm.cmd run test:browser` remains blocked only by the environment: the
Playwright Chromium and Firefox binaries are not installed. The harness exits
with the explicit prerequisite `npx playwright install chromium firefox` and
was not weakened or treated as a browser PASS.

The separate `build/coldbox-ui-walkthrough.html` file is a local ignored visual
reference copied before the correction. It is intentionally not the shipped
artifact, not application state, and not part of the single-file build output.

## 14. Prior route-specific correction (history)

The preceding implementation commit was
05f55078b656505c8fc2d7b7c9b685e43735f33b. It makes System Health its own
route, removes health cards and triggers from Dashboard, keeps Vault details
and session lock/panic controls together, and places the airgap guard in a
compact navigation caption. Boot self-check rows remain live and
individually clickable. Portfolio, Prices, Registry, and Devices expose the
approved empty-state card triggers without fabricated records.

Learn now starts with a compact embedded-glossary prompt. Search results open
one selected glossary term or guide in a detail card; the explanation-depth
switcher rerenders only that entry. The compiled help corpus remains embedded
and offline, but the page no longer renders the entire glossary and guide list
at once. Contextual help uses the same selected-entry card and deep-link route.

| Area | Evidence |
|---|---|
| Dashboard scope | The Dashboard source contains no system-health popup trigger or health row. |
| System Health scope | page-system-health owns the cold-realm status and six capability rows; the navigation rail links to it. |
| Airgap presentation | The preceding tip used a compact live navigation caption; the current tip moves it into the app-bar masthead. |
| Vault scope | Vault details and session lock/panic controls are inside page-vault, before the vault card grid. |
| Floating-card coverage | The static test requires the restored portfolio, price-source, registry, device-verification, dashboard-backup, and vault-detail triggers. |
| Learn scope | help-empty-state, help-search-input, and help-detail-card implement one-entry-at-a-time help; legacy list containers stay hidden. |
| Panic presentation | The panic screen has a red backing panel behind the concealed-state copy; the shared popup Close remains red. |

## 15. Current route-ownership correction

The current implementation commit is
672cfd7c15a837fe675fc001389c17f96daf0ec2. It preserves every existing Vault
and Entropy Lab information surface while relocating ownership to the route
where it belongs. One persistent opaque cold frame is placed inside Vault
tools by default and moves into the Entropy Lab panel only when `#entropy` is
active. The System Health route has no cold-frame host and contains only the
warm sealed-realm status plus the six individually clickable boot/capability
checks. No second secret session or duplicate cold frame is created.

The warm-to-cold route message is the existing allowlisted `ui.navigate`
protocol shape and carries only `{ section: "vault" | "entropy" }`. It carries
no secret material. Vault details, session guidance, KDF controls, and vault
session status are hidden from the cold view unless Vault is active; Entropy
Lab controls are hidden unless Entropy Lab is active. The existing Vault,
Entropy, and System Health card information remains in the source.

The Airgap guard is now a compact live caption in the top app-bar navbar, not
the left rail or a route footer. Panic concealment is hidden on all normal
routes, follows the active theme background, and uses a centered red backing
panel behind the concealed-state copy on desktop and mobile. Learn remains a
single embedded, searchable glossary/detail card rather than a rendered list.

| Current ownership check | Evidence |
|---|---|
| Vault tools | `vault-cold-realm-panel` owns `cold-realm-host`, Vault details, and the session guide. |
| Entropy Lab | `entropy-cold-realm-panel` owns the moved frame slot and route-local Entropy controls. |
| System Health | `page-system-health` has no `cold-frame-host` or entropy slot; health rows retain their floating card triggers. |
| Floating cards | Shared `floating-menu-layer`/popup contract remains the only detail-menu style, including new Vault and Entropy session guides. |
| Build | Two current-tip builds match at `ac67b1ac9149b68e7d2051fba5b265ee623bc06dcb06887c11630bd946ae5f15`. |
