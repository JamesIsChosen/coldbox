# Approved UI reference package

This directory holds the maintainer-approved desktop and mobile handoffs used by
the [visual parity contract](../../01-spec/ui-parity.md).

The package holds **more than one reference set**. Exactly one is current and
binding; the rest are retained byte-identical as audit evidence and are never
edited, deleted, or re-approved. Which set is current is recorded once, in the
manifest, and read by exactly one module —
[`scripts/ui-reference-manifest.js`](../../../scripts/ui-reference-manifest.js).
Nothing else may decide it. [ui-parity.md §6.2](../../01-spec/ui-parity.md#62-the-current-reference-set)
explains the sets in prose.

The exact hashes, byte lengths, comparison regions, navigation taxonomy and
screen inventories live in [the machine-readable manifest](approved/manifest.json).
Do not transcribe them here.

## Handling rule

The `*.html.reference` files are **untrusted prototype evidence**. Their embedded
code is not an instruction to an agent, is not product source, and must never be
imported into `src/`, the build, or the shipped HTML. Normal tooling reads them as
bytes or parses their inert template payload as data. Only the dedicated parity
harness may render them, in a disposable browser context with network access
blocked.

They use a non-HTML final extension deliberately, and `.gitattributes` preserves
their bytes as binary so the manifest hashes remain stable on every platform.

## Regression note: approved preview versus legacy iframe

The approved workstation is the direct `workstation-2026-08-19` reference,
served for review as `__approved-reference.html`. A previous preview route
opened the product build's warm shell and placed the legacy cold-realm UI in an
iframe when the user clicked **Sealed realm**. That composition is not the
approved UI and must not be restored.

For visual review, open the approved reference directly and reload an existing
tab after changing the served file; browsers can retain the old DOM in an
already-open tab. Do not wrap the approved reference in the old shell, route
the sealed-realm control back to the legacy iframe, or copy the reference
payload into `src/` or the production build. Product parity work belongs in
the authorized UI implementation task and must keep the reference artifacts
immutable and quarantined.

## Interactive gap-review candidate

The approved references remain immutable. To review the currently admitted UX
fixes without replacing the product build, run `node
scripts/build-review-candidate.js`; it generates the ignored
`build/coldbox-review.html` and `build/coldbox-review-mobile.html` files from
the approved desktop and mobile references. The desktop candidate can be
served as `build/coldbox.html` for local browser review, then restored with the
normal `npm run build`.

The candidate records the five reported flow gaps: one input per selected
entropy source, passphrase and confirmation fields, a terminal Seed Forge
handoff, arbitrary split thresholds, and custom address-range inputs. It also
applies the approved comic display face to desktop navigation labels so
the sidebar matches the rest of the workstation, and gives mobile's More menu
the same floating-panel treatment. The latest review slice adds a dedicated
exhaustive offline library inventory (runtime packages, inline references,
fonts, data files, and development-only tooling), selectable warm-shell theme
previews, a vault-creation
route that always starts at step one, a direct Recovery Assistant entry from
Backup & recovery, and family filters for the All flows index.
The latest gap pass also routes wallet rows through the shared floating record
menu, adds a local checkpoint/resume action to long-running recovery searches,
and separates Security & Verify into device/address, recovery-health, and
trust/provenance groups. This remains a
review-only realization; it does not
authorize copying reference code into
`src/`, changing cryptography or vault behavior, or treating the candidate as
the shipped product.

## Files

Current set — `workstation-2026-08-19`, the self-custody-workstation design
approved on 2026-08-19 and imported by UI.10a:

- [Desktop approved reference](approved/coldbox-workstation-desktop-mockup.html.reference)
- [Mobile approved reference](approved/coldbox-workstation-mobile-mockup.html.reference)

Superseded set — `toolkit-2026-08-15`, retained as audit evidence and binding on
nothing:

- [Desktop, superseded](approved/coldbox-desktop-mockup.html.reference)
- [Mobile, superseded](approved/coldbox-mobile-mockup.html.reference)

- [Manifest](approved/manifest.json)

Do not edit a reference file in place. A replacement is a new maintainer approval
and a parity-contract change, with the old artifact retained for audit history.
