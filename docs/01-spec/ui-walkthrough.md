# Coldbox UI walkthrough

**Canonical screen map and extension contract for the Coldbox interface.**

This document preserves the approved UI walkthrough while the underlying product
features are still being built. It is a design contract, not a claim that every
button is already connected to live storage, market data, hardware, or
secret-handling logic. The visual language and tokens remain canonical in the
[design system](design-system.md); the realm boundary remains canonical in the
[architecture](architecture.md).

## 1. How to read this walkthrough

The shipped application is the empty/live shell: it uses the approved card
hierarchy and shows explicit empty, unavailable, or live-status states. It does
not embed invented balances, dates, wallet records, device records, prices, or
verification results.

The seeded walkthrough is a separate visual reference only. The workspace copy
at `build/coldbox-ui-walkthrough.html` is the clickable demonstration of what
fully built-out cards can look like; it is not shipped as the application and
must never be treated as product data or a test fixture.

When the separate visual reference is opened, every sample value must be treated
as a visual placeholder:

- Dollar amounts, dates, prices, wallet names, device records, addresses, and
  status counts are not live facts.
- No seed phrase, private key, passphrase, xprv, or secret-compartment
  plaintext belongs in this warm-shell preview.
- A future live feature must replace a sample with an explicit loading,
  unavailable, stale, error, or verified state. It must not leave a sample
  value in place while implying that it came from a real source.
- The live application uses **Design shell / no sample data**. A seeded visual
  reference must keep its own sample-data label visible.

The application is intended to be opened from `file://` after `npm run build` at
`build/coldbox.html`. It is one document with embedded CSS, JavaScript, fonts,
and brand artwork. The separate seeded reference is for visual review only.

## 2. Shell anatomy

Every route uses the same shell. The shell is public and warm; it may display
public records and public results, but it is not a replacement for the sealed
cold realm.

### App bar

The yellow masthead contains:

1. The transparent supplied Coldbox wordmark, linked to Dashboard.
2. The permanent **Pre-release / Not audited** badge.
3. The compact **Airgap guard** live caption, including its current state and
   contextual glossary button.
4. Quick links to Vault tools, Secret tools, theme, and Panic conceal.
5. The Light mode / Dark mode control.

The navbar wordmark is the supplied coldbox-wordmark.png. The lower-case C
favicon artwork is embedded at ICO plus 16, 32, 48, and 64 pixel PNG sizes.
These are all local build inputs; the browser never fetches them from a CDN.

### Navigation rail

Desktop uses grouped links:

- **Workspace:** Dashboard, Vault tools, Portfolio, Prices, Registry, Devices.
- **Tool decks:** Secret tools, Entropy Lab, Derivation, Backup & recovery,
  QR & transfer, Recovery.
- **Reference:** Verify Bench, Reference, Learn.
- **System:** System health opens the dedicated live-check route.

The active route is cyan. The rail remains a navigation surface, not a status
claim. A green or red state must be explained in the content card or the
floating detail menu beside it. The airgap guard is a compact live caption in
the top app bar; it is not a full workspace repeated beneath every route or a
status card pinned to the left rail.

### Content bar and status panels

The content bar shows "Coldbox / current route", the **Warm shell** badge, and
the **Design shell / no sample data** badge. The primary route content appears
first. System health is a separate route and reports the sealed-realm state and
capability matrix. The compact app-bar caption reports the live
airgap/reachability state on every route without taking over the route body or
being placed in a route workspace.
These are live foundation checks, not seeded route data.

The capability rows on System Health are clickable. Each opens the same
centered floating detail card described in section 4 and reports the current
status, the evidence that produced it, and what the status does not prove.

### Mobile shell

On narrow screens the rail becomes the mobile tab bar and the app bar drops its
duplicate quick links. Cards collapse to one column, tables can scroll inside a
bounded region, and every interactive target keeps the design-system touch
floor. The floating detail card remains centered in the viewport rather than
being appended below the page.

## 3. Route-by-route walkthrough

The route names below are the stable navigation IDs. A feature implementation
may add live behavior behind a route, but should not rename or remove the
content hierarchy without updating this document and the browser walkthrough.
The detailed record examples in a route's hierarchy describe the separate
fully seeded visual reference; the shipped application uses the same structure
with an honest empty, unavailable, planning, or live-status state until that
feature exists.

### Dashboard (#dashboard)

**Purpose:** the public starting point: what needs attention, what is saved,
and where to go next.

**Visible hierarchy:**

1. Command-center heading and short explanation.
2. A **Working day at a glance** card grid with portfolio, next-action, and
   at-a-glance surfaces.
3. Empty-state workspace cards for Vault and public records.

**Walkthrough actions:**

- **Open portfolio** navigates to Portfolio's empty/live shell.
- **How this will work** opens the portfolio-value explanation.
- **Dashboard guide** opens the dashboard guidance popup.
- **Open the vault workspace** navigates to the real Vault route.
- **Plan public records** navigates to the Registry shell.
- **Review the backup plan** opens the backup-action popup.
- The app-bar airgap caption remains visible as a compact live status surface;
  open System health from the System navigation group for the full readiness
  view.

**Live replacement rules:** the dashboard may aggregate public records, but a
headline total must show its source age and calculation method. A health summary
must not be the only place a failure appears; the underlying route or popup
must remain inspectable.

### Vault (#vault)

**Purpose:** the actual vault workspace and the primary boundary-sensitive
route. The existing P0.13/P0.19 flow remains the implementation source of truth
for create, unlock, save, load, transfer, lock, and panic conceal behavior.

**Visible hierarchy:**

1. Session/status strip.
2. Vault identity and public metadata, with the **Vault details** floating-card
   trigger beside the session state.
3. Lock and panic controls bundled directly into the Vault workspace.
4. One sealed-realm panel containing Vault details, the unlock session, keyfile
   option, and cold-realm status.
5. A compact Vault tools deck: Vault Library and canonical save sit together;
   the advanced encrypted-text handoff is collapsed until needed.
6. Device-to-device transfer is not duplicated here; the Vault tools deck links
   to its live CBX-VT/1 card in QR Studio.

The standalone visual reference does not invent a second vault implementation.
New UI work
must preserve the existing cold-realm message contract, save verification
states, canonical .cbx save behavior, live CBX-VT/1 transfer semantics, and
the panic-conceal screen.

**Popup rule:** public explanations, transfer details, and save-status help may
use the shared floating card. Secret entry and secret results stay inside the
sealed realm and use its calm, non-tilted surface. Never move a secret field
into a warm-shell popup merely because it is visually convenient.

### Portfolio (#portfolio)

**Purpose:** public holdings, transactions, lots, allocation, and performance.

**Visible hierarchy:**

1. Total tracked value and allocation cards, both empty until public records exist.
2. A reserved performance chart with an explicit no-series state.
3. Holdings table layout with a no-records state.
4. Recent transaction/lots layout with a no-records state.

**Popup actions:** total calculation, activity import, chart details, holding
rules, asset detail, public export, add transaction, lot audit, and transfer
classification.

**Live replacement rules:** portfolio rows contain public accounting data only.
Cost basis must remain tied to wallet and asset scope. Transfers between the
user's own records must remain distinguishable from disposals. Every chart
must have a tabular/text equivalent and an age/source explanation.

### Prices (#prices)

**Purpose:** show a market view without hiding source disagreement, source age,
spread, or privacy cost.

**Visible hierarchy:**

1. BTC/USD median headline and spread.
2. BTC, ETH, and SOL watchlist.
3. Historical sample chart.
4. Source ledger cards for CoinGecko, Coinbase, Kraken, CoinPaprika, and DIA.

**Popup actions:** refresh explanation, privacy note, source rules, and one
detail card per source.

**Live replacement rules:** calls stay in the warm shell. A median must never
hide source age or a stale reading. If no source is fresh enough, the UI says so
and does not present a normal-looking headline as current.

### Registry (#registry)

**Purpose:** the public index of wallet records, accounts, addresses, labels,
devices, and notes.

**Visible hierarchy:**

1. Three wallet-record cards: Coldcard savings, Trezor daily, and Tax reserve.
2. An address table with labels, wallet, shortened public address, verification,
   and balance lookup.

**Popup actions:** add record, filter records, open each wallet record, address
details, and balance lookup.

**Live replacement rules:** registry records can identify a device or address,
but they must not contain seed material. Short display forms are for scanning;
the detail view and copy/verification flow must make the complete public value
available without relying on an ellipsis.

### Devices (#devices)

**Purpose:** companion metadata for hardware wallets and replacement planning.

**Visible hierarchy:**

1. Coldcard Mk4 card with firmware, verification date, backup state, and public
   location note.
2. Trezor Safe 5 card with the same fields and a review-soon state.
3. Replacement-plan card for a future device, explicitly not a key record.

**Popup actions:** device detail, verification workflow, and replacement plan.

**Live replacement rules:** firmware and compatibility facts need a dated
source when they describe the outside world. A device card records metadata; it
does not imply that Coldbox can sign, spend, or attest to hardware it has not
actually verified.

### Entropy Lab (#entropy)

**Purpose:** present the protected entropy collection flow without rendering
entropy in the warm shell.

**Visible hierarchy:** a route-local Entropy Lab tools panel for the actual
Collect -> Mix -> Health workspace. The protected workspace visibly includes
dice, coin flips, shuffled cards, hex digits, fresh CSPRNG bytes, the entropy
strength meter, undo/reset controls, target selection, and the mix action. The
existing controls are the live surface; the route does not leave a stale
"not-built" placeholder underneath them. The generic sealed-realm boot strip
is hidden while this route is active because the route already introduces the
protected tool surface, and Vault session controls remain on the Vault route.

**Popup actions:** collection flow, health meter, and entropy rules.

**Live replacement rules:** real raw entropy and the mixed result stay inside the
cold realm. The warm shell can receive only the public progress/result contract
per the architecture. The calm security surface must not gain tilt, animation,
or decorative stickers.

### Seed Forge (#seed-forge)

**Purpose:** show the finished create/validate/fingerprint/passphrase layout
without placing a real seed in the preview.

**Visible hierarchy:** word-count and language selectors, masked seed placeholder,
fingerprint/passphrase summary, and BIP-85 note.

**Popup actions:** create flow, validation, and boundary explanation.

**Live replacement rules:** the preview's bullets are visual placeholders, not
masked secret data. The live controls and results must be rendered inside the
sealed realm. Seed words, passphrases, and private derivation material never
enter the warm DOM, popup body, logs, URL, or route state.

### Derivation (#derivation)

**Purpose:** choose a chain/path inside the sealed realm and inspect public
addresses, xpubs, and fingerprints returned to the registry.

**Visible hierarchy:** path builder, chain/account/range fields, example path,
and an empty public-results panel.

**Popup actions:** explain path, inspect the planned results view, and inspect
the planned Registry handoff.

**Live replacement rules:** only the public projection crosses the realm
boundary. The UI must identify chain, path, account, range, and verification
state next to each returned value; a path label alone is not evidence that a
device or seed was used.

### Backup Lab (#backup)

**Purpose:** make backup scheme, threshold, locations, and verification age
visible together.

**Visible hierarchy:** a backup-health table with Primary Bitcoin, Daily device,
and Emergency reserve examples, followed by create, verify, and location
actions.

**Popup actions:** create plan, verify backup, and review locations.

**Live replacement rules:** the registry may retain a public plan and status;
backup material itself stays protected. "Verified" must name what was checked,
when, and by which workflow. "Complete" is not proof of recoverability by
itself.

### QR Studio (#qr)

**Purpose:** separate public address QR, cold-only SeedQR, and live encrypted
vault transfer.

**Visible hierarchy:** three cards: public address QR placeholder, cold-only
SeedQR placeholder, and live **CBX-VT/1** encrypted-frame transfer.

**Popup actions:** address QR and SeedQR flow explanations. The transfer card
links to the Vault workspace.

**Live replacement rules:** a public address QR can be public. SeedQR is cold
only and is never downloaded or left in a warm-shell popup. CBX-VT/1 is
ephemeral device-to-device transport; it is not numbered QR export and is not a
durable backup. A camera path that is unavailable must present the canonical
.cbx fallback honestly.

### Recovery (#recovery)

**Purpose:** show bounded recovery assumptions, operation estimates,
checkpoints, cancellation, and verification requirements.

**Visible hierarchy:** Describe -> Estimate -> Verify stepper, warning that a
candidate is not recovery, and explicit search limits.

**Popup actions:** estimate, checkpoint rules, and all limits.

**Live replacement rules:** the search stays in the sealed realm. A checksum
hit or database match is a candidate, never a recovered wallet, until verified
against an independently known public result. Limits, cancellation, and
failure-to-find must be visible before a search starts.

### Verify Bench (#verify)

**Purpose:** public verification utilities with explicit claims and limits.

**Visible hierarchy:** file hasher, address validator, and KDF calculator cards;
each has an input/result placeholder and a detail action.

**Popup actions:** file hasher, address check, and KDF check.

**Live replacement rules:** every result says what it proves and what it does
not prove. File and public-address checks can remain in the warm shell. Any
secret-derived check must follow the two-realm architecture and use the
existing independent vectors.

### Reference (#reference)

**Purpose:** provenance, legal notices, build identity, vendored dependencies,
and the checks a user can perform on the artifact.

The existing provenance panel is live and remains the canonical source for
build metadata and legal notices. New UI help should link to the appropriate
specification or guide instead of duplicating those facts in a popup.

### System Health (#system-health)

**Purpose:** isolate live platform readiness from the route-specific workspace.

**Visible hierarchy:**

1. Sealed-realm status and failure boundary.
2. Boot self-check summary.
3. Six individually clickable capability rows: required randomness, WebCrypto,
   WebAssembly, Web Workers, camera access, and save paths.

**Popup actions:** the route summary opens popup-system-health; every
capability row opens its own centered floating card. The same red Close button,
focus return, Escape handling, and keyboard activation rules apply to all of
them.

**Live replacement rules:** status is live evidence only. Camera capability
does not imply permission or successful QR decode, and a platform/API hint does
not imply physical hardware availability. Never infer an OS or device from a
capability row.

### Learn (#learn)

**Purpose:** compiled plain/working/technical help content.

Learn is an embedded searchable glossary, not a long page of every guide and
term. The initial state is a compact prompt and search field. A search result
opens exactly one selected glossary term or guide in the detail card; changing
the explanation depth rerenders only that selected entry. Contextual ? buttons
use the same route/deep-link mechanism. Feature work must update its canonical
docs and the relevant help blocks in the same change; do not use a mock popup
as a substitute for a guide.

## 4. Shared floating-menu contract

All detail actions use one shared popup implementation. It is deliberately a
single visual system so users do not have to learn a new interaction pattern on
each route.

### Presentation

- Fixed overlay, centered in the viewport, above the current route.
- Dimmed backdrop with no page reflow and no placement at the bottom of the
  document.
- Paper card with the same hard outline and offset shadow as the approved cards.
- Eyebrow, title, summary, ordered detail list, and optional note.
- **Close** is always the red button with white text.
- Security explanations use the calm card variant: no tilt, bounce, flashing,
  or decorative stickers.

### Behavior

- Any element with data-popup-open="<popup-id>" opens the shared card.
- Enter and Space activate keyboard-accessible non-button triggers such as the
  capability rows.
- Close button, backdrop click, and Escape close the card.
- Focus moves to Close when the card opens and returns to the triggering element
  when it closes.
- The underlying page remains in place and can be read again when the popup
  closes.
- Popup content is static structural copy today. Future dynamic content must be
  escaped/structured and must not turn this route into a free-form HTML or
  secret-data sink.

### Content contract

Every popup has:

1. A route/realm kicker.
2. A specific title, not "Details".
3. A summary that answers why the user opened it.
4. A short list of evidence, fields, or next actions.
5. A note that states sample/live status or a relevant limitation.

Status color is never the only signal. Pair it with a label and a sentence that
states the evidence. A popup that says "Healthy" without a source, age, or
scope is incomplete.

## 5. Display and data rules

These rules keep the approved visual language from becoming misleading when
live features arrive:

- Display face for headings, labels, and comic captions; monospace for hashes,
  IDs, paths, addresses, timestamps, quantities, and other data.
- Use the shared design tokens; do not introduce one-off hex colors or shadows.
- Use the paper-card surface for readable content and keep body text dark on
  paper in both themes.
- Use icon + text + structure for status; never rely on color alone.
- Keep the 44 pixel interactive target floor and visible keyboard focus.
- Keep public and protected content visually distinct but stylistically related.
- Do not imply that a placeholder is a live network result, a device attestation,
  a successful backup recovery, or a security guarantee.
- Avoid real-looking secrets. Public-looking shortened addresses are acceptable
  only as clearly labeled sample data and must not be reused as test vectors.

## 6. Adding a feature without losing the UI

Before merging a new route feature, use this checklist:

1. Identify the route and realm in the architecture/spec. If the boundary is
   unclear, stop and record an ADR before writing UI code.
2. Add the route's purpose, visible hierarchy, popup actions, live replacement
   rules, and security classification to this walkthrough.
3. Reuse the existing shell, card, table, chart, security-card, and floating
   popup classes. Add a new visual primitive only when the walkthrough explains
   why the existing primitives cannot express it.
4. Give every detail action a stable data-popup-open key and add its complete
   content to the single popup content map. Do not create a second modal style.
5. If a visual reference uses seeded values, label them clearly. In the shipped
   shell, define loading, stale, unavailable, error, and verified states before
   connecting live data.
6. Keep secret inputs/results in the cold realm and check the message schema for
   any public projection before wiring a warm control.
7. Update the canonical docs/help content for user-facing behavior. Link to
   existing facts rather than copying them into route text.
8. Add route, popup, keyboard, responsive, theme, and boundary regression
   coverage. Run both the unit suite and the Chromium/Firefox browser harness
   when the binaries are available.
9. Inspect the built file:// artifact, not only the source. Confirm the
   wordmark/favicon remain embedded, the popup is centered, and no seeded card
   is mistaken for a live result.
10. Record the changed screen and remaining physical-device gaps in the PR
    packet. Do not mark P0.19 complete; its physical acceptance remains a
    human-required gate.

## 7. Recommended click-through order

For a quick review of the shipped shell, open `build/coldbox.html` and follow
this path:

1. Dashboard: toggle light/dark mode, inspect the empty workspace cards, and
   follow Open portfolio.
2. Vault: inspect the session strip, open Vault details and Session guide, then
   confirm the sealed Vault details/session panel and lock/panic controls sit
   with the Vault tools.
3. Portfolio: inspect the empty total, allocation, chart, holdings, and
   transaction shells, including each layout trigger.
4. Prices: inspect the empty median, watchlist, chart, and five source-ledger
   cards.
5. Registry: inspect the empty wallet-record cards, public-address shell, and
   balance lookup layout.
6. Devices: inspect the no-record primary, secondary, and replacement-plan
   cards, including verification workflow triggers.
7. Entropy Lab -> Seed Forge -> Derivation -> Backup Lab: confirm Entropy Lab
   owns the sealed entropy workspace, while the other protected screens remain
   calm, empty, and use centered popups.
8. QR Studio -> Recovery -> Verify Bench: inspect the public/SeedQR placeholders,
   then open the live transfer card, recovery, and verification surfaces.
9. System Health: confirm only the warm live-check surface and boot capability
   rows are present; open the summary and each capability card, close with the
   red button, reopen a row with Enter, and close with Escape. Confirm focus
   returns to the row.
10. Reference -> Learn: search for a term, open one result, switch explanation
    depth, and confirm contextual help opens the same selected-entry card.

The panic conceal screen is not part of normal route content. It is hidden
until the top-nav Panic conceal action, the Vault panic control, or the
documented panic shortcut activates it. Its surrounding surface follows the
active theme, while the centered red backing panel sits completely beneath the
concealed-state copy at desktop and mobile widths.

The cold realm is one persistent opaque frame. Routing moves that frame between
the Vault and Entropy Lab slots and sends only an allowlisted section name; it
does not create a second secret session or carry secret material across the
boundary. Vault mode exposes the KDF/session controls; Entropy mode exposes the
full entropy toolset and suppresses only the duplicate generic sealed-realm
boot strip. System Health contains the warm live-check surface and capability
rows only.

For the full seeded visual walkthrough, open
`build/coldbox-ui-walkthrough.html` separately and repeat the route order. That
file demonstrates the intended populated card shapes and popup copy; it is not
the shipped application and its values must never become default product data.

## 8. Live versus preview

| Surface | Shipped shell now | Separate visual reference / future live responsibility |
|---|---|---|
| Brand/artwork | Embedded supplied wordmark and favicon sizes | Keep assets local and reproducible |
| Dashboard totals | Empty cards and no-record status | Populated visual reference; aggregate verified public records with source age |
| Portfolio/chart | Empty total, allocation, chart, holdings, and transaction shells | Populated visual reference; connect to public data model and accessible data table |
| Prices | Empty median, watchlist, chart, and source-ledger shells | Populated visual reference; warm-shell fetch, median/spread/stale policy |
| Registry/devices | Empty record cards and address/device placeholders | Populated visual reference; durable records, verification history, dated external facts |
| Entropy | Route-local cold tools for dice, coin, cards, hex, CSPRNG, strength, and mix | Keep raw entropy and mixed bytes in the cold realm |
| Seed Forge/Derivation/Backup | Protected-layout placeholders | Calm visual reference; cold-realm workflows and public projections only |
| QR Studio | Placeholder public/SeedQR cards plus the live-transfer card | Calm visual reference; public QR, cold-only SeedQR, live transfer, truthful fallback |
| Recovery | Empty decision/limit placeholders | Calm visual reference; bounded cold-realm search with checkpoint/cancel |
| Verify Bench | Empty input/result states | Populated visual reference; independent public verification tools and evidence |
| System Health | Dedicated live-check route, individually clickable capability rows | Keep live evidence scoped to the system route; never infer physical platforms |
| Reference/Learn | Existing provenance plus one-entry-at-a-time searchable embedded help | Keep docs and help in sync with every feature |

This table is the handoff boundary: implementing a live responsibility does
not authorize changing the shell's visual language, popup contract, or realm
rules. Update this document when the responsibility changes.
