# UI.5 — Shared shell chrome

Status: `[~]` pending independent review.

Branch: `ui.5-shared-shell-chrome`

## Scope

This checkpoint brings the approved shell chrome into the warm document and
the sealed `srcdoc`: the ten navigation groups from the approved manifest,
roadmap-labelled unavailable entries, the calm 45° realm strip, and the
five-slot mobile navigation. It does not make later roadmap features appear
to work. Unbuilt entries are disabled native controls with `aria-disabled`, a
roadmap ID, and a phase label; the implementation contains no route handler
for those controls.

The existing warm and cold CSP source templates are unchanged except for the
CSS and markup that are hash-pinned by the normal build. No protocol message,
secret input, or realm permission was added.

## Evidence

Focused UI.5 tests:

```text
node --test test/ui.5-shared-shell.test.js
✔ UI.5 implements the ten approved realm navigation groups
✔ unbuilt navigation entries are disabled controls with roadmap and phase labels
✔ each realm has a calm striped boundary strip and five-slot phone navigation
✔ navigation touch targets are at least 44px and unavailable items cannot receive focus
✔ warm and cold shells carry the same chrome vocabulary
✔ sealed-realm shell links resolve to and focus the shared boundary target
ℹ tests 6
ℹ pass 6
```

Source syntax, lint, and build:

```text
node --check src/main.js
node --check src/cold/main.js
npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.
npm run build
Built build/coldbox.html (f0fd7fbef416222b27effd13fa26cb6aa07511f2a8f23de6a49eab49b9e25a8f)
```

The first hosted browser run on the initial UI.5 head found that the legacy
harness still exercised the built warm Backup page, which the new rail had
omitted. The link is now restored under Vault files and the focused parity
tests/build were rerun. The independent UI.5 review then found that the
unchecked P4.3 Recovery Assistant was still exposed as an active cold link;
that item is now a disabled phase-labelled control, while the built
SLIP-39/verification destination has a separate truthful label. The full
local test command was also attempted. Three existing provenance
tests that create a scratch Git repository cannot run in this Windows
sandbox: `spawnSync git` is denied by the sandbox policy. The remaining test
output, including the UI.5 suite, passed. Hosted CI is required for the
complete Windows/Ubuntu and browser verification before merge.

The fresh independent review of the exact `64c4d522f17b3ba26a000ab38d9b769795f0511d`
head then found that the four approved warm links to `#cold-realm-status`
were cosmetic: the router collapsed that hash back to `#dashboard`. The
remediation adds an explicit sealed-realm route, preserves the current page,
scrolls to the boundary, and focuses its keyboard target. The browser harness
now exercises the desktop rail, realm switcher, app-bar quick link, and mobile
More link; the focused UI.5 suite also guards the route implementation.

The first exact-head CI run for the router fix exposed that the newly added
desktop route sequence ran before the harness's existing 360px overflow
baseline, making that baseline state-dependent. The harness now records the
mobile overflow baseline first, then exercises the desktop rail/switcher/
quick-link routes and returns to mobile for the More-link route. Product
markup, styles, and routing behavior are unchanged by this harness-only
ordering correction.

The fresh review then required a numeric 44px floor for the warm desktop rail,
the warm More links, and the More close control. Those controls now use
explicit `44px` minimum dimensions; the UI.5 test checks those numeric rules,
and the browser harness computes the rendered desktop rail and mobile More
rectangles. The exact implementation head for that remediation is
`5fa3cf835bef5b94e98e07fe5748bc54243ff033`. Exact-head CI run
`31939849010` passed its Ubuntu, Windows, Chromium/Firefox, approved-reference
secret-scan, and cross-OS hash jobs; release attestation was skipped because
this is a pull request.

The packet closeout is documentation-only after that implementation head. The
next exact-head CI run and the fresh reviewer must still verify the closeout
head itself.

## Final remediation evidence (implementation head)

The route-inventory remediation and browser-harness corrections are present at
implementation head `6059adef0d62462b387cab06c15e7f5ef20111d2`. Exact-head CI
run `31941743557` checked out that SHA and passed Ubuntu, Windows,
Chromium/Firefox, cross-OS hash comparison, and the approved-reference secret
scan; pull-request release attestation was skipped.

```text
Focused UI.5 tests: 7 passed, 0 failed, 0 skipped
Full CI unit/vector tests: 424 passed, 0 skipped
Documentation hygiene: 241 markdown files, 0 warnings
Vendor verification: passed against local files and upstream releases
Ubuntu/Windows reproducible build hash: 0c805752c828a94dfca184f0f74781c00bcb25fc2600c10d59037703cb1ce9e4
Browser harness: passed in Chromium and Firefox over file://
Approved reference scan: Clean=True, findings=0, skipped=0
Desktop reference SHA-256: fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
Mobile reference SHA-256: af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
```

The approved mobile More inventories are now represented in their frozen
order. Warm entries are Devices, QR Studio, Address bench, future Prices & FX,
future Tax & exports, future Reference, Verify this file, Provenance & legal,
Learn, future Tool map, and Enter sealed realm. Cold entries are Vault session,
Entropy Lab, Validate phrase, future Child seeds (canonical P4.6), future
Passphrase Studio, future Descriptors, SeedQR studio, Backup Health, future
Recovery Assistant, Verify Bench, Reveal hidden, Secret notes, No secret yet,
and Lock & wipe. Future entries are non-focusable disabled elements with
roadmap/phase labels. The mobile Money slot is likewise a disabled P3.4
control and cannot open the unbuilt Prices or Portfolio routes. The sealed
Backup Health card explicitly distinguishes its cold backup workspace from the
warm public schedule dashboard.

The browser harness asserts both complete More inventories, the unavailable
future controls, the disabled Money slot, 44px rendered targets, and the
sealed-boundary routes in both Chromium and Firefox. The focused static test
also rejects the old combined cold More entries and active future mobile
links.

## Final route-remediation witness

The follow-up route remediation is at implementation head
`56eac29b831442d9621ea1599eaf707e47c7d56c`. Exact-head CI run `31943319683`
checked out that head and passed every required job.

```text
Full CI unit/vector tests: 424 passed, 0 skipped
Documentation hygiene: 241 markdown files, 0 warnings
Vendor verification: passed against local files and upstream releases
Ubuntu/Windows reproducible build hash: 0043600d32837dc7e4d90db0d6f215ffa9de18ba98e2a6d47ad87f149fcda31f
Cross-OS build comparison: passed
Browser harness: passed in Chromium and Firefox over file:// (including activated cold More targets)
Approved reference scan: Clean=True, findings=0, skipped=0
Desktop reference SHA-256: fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
Mobile reference SHA-256: af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
Release attestation: skipped for pull request
```

The desktop rail keeps the canonical P4.6 Child seeds ownership while the
mobile More sheet preserves the frozen mobile reference’s P1.5 label. The
cold More links for Reveal hidden, Secret notes, and Lock &amp; wipe now
activate their actual cold targets, expose a locked-state explanation when
needed, and make the target focusable; the browser harness activates each
route in both engines.

## Review focus

- Confirm the ten group labels and their realm ownership match the approved
  manifest, and that the unavailable entries are genuinely non-focusable.
- Confirm the strip is structurally calm: fixed 45°/14px stripes, no
  animation, and a text pill that names the active realm.
- Confirm the cold navigation additions remain inside the opaque frame and
  did not change `connect-src 'none'`, sandbox permissions, or the protocol.
- Confirm the responsive mobile rails keep 44px targets and expose the full
  route inventory through the More surface without making future features
  look functional.

## Known deferrals

UI.5 is marked browser-verifiable (`🌐`) in the roadmap. Physical iOS,
Android, and other device execution is therefore outside this checkpoint's
acceptance evidence; it remains part of the separate release/device gate and
does not claim closure for P0.19 or UI.11. No ADR-0043 deferral is claimed:
that ADR is explicitly scoped to P2.7 only.

## Self-assessment

The cold frame now has a real shell rather than only a vertical hub. The main
risk is visual geometry at the narrowest phone widths because the production
frame is an opaque `srcdoc`; the hosted Chromium/Firefox harness and the
independent reviewer must verify overflow, focus order, and the More sheet.

## Final exact-head closeout evidence

This closeout evidence is for the reviewed implementation head
`378a3fda7f05da9c8b69954788674574bcdc33ac`. Exact-head CI run
`31943631539` checked out that SHA and passed all required jobs.

```text
Focused UI.5 tests: 7 passed, 0 failed, 0 skipped
Full CI unit/vector tests: 424 passed, 0 skipped
Documentation hygiene: 241 markdown files, 0 warnings
Vendor verification: passed against local files and upstream releases
Ubuntu/Windows reproducible build hash: 0043600d32837dc7e4d90db0d6f215ffa9de18ba98e2a6d47ad87f149fcda31f
Cross-OS build comparison: passed
Browser harness: passed in Chromium and Firefox over file://
Approved reference scan: Clean=True, findings=0, skipped=0
Desktop reference SHA-256: fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
Mobile reference SHA-256: af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
Release attestation: skipped for pull request
```

The final exact-head witness covers the complete current route inventory,
activated cold More targets, disabled future controls, reproducible build,
browser parity, and the independent temporary-copy scan of both frozen
references.

## Secret-notes rail remediation evidence

The fresh review found that built P1.7 Secret notes was incorrectly disabled in
the sealed desktop rail. The remediation at source head
`deac26d` makes that entry an active link to `#cold-secret-notes`, reuses the
locked-state target handler, and adds static and browser assertions for the
rail route. Exact-head CI run `31945079313` checked out that source head and
passed the complete matrix.

```text
Focused UI.5 tests: 7 passed, 0 failed, 0 skipped
Full CI unit/vector tests: 424 passed, 0 skipped
Ubuntu/Windows reproducible build hash: 0043600d32837dc7e4d90db0d6f215ffa9de18ba98e2a6d47ad87f149fcda31f
Cross-OS build comparison: passed
Browser harness: passed in Chromium and Firefox over file://
Approved reference scan: Clean=True, findings=0, skipped=0
Desktop reference SHA-256: fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
Mobile reference SHA-256: af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
```

## Packet-head CI refresh

The packet refresh is included in head `aac2100` and was checked out by exact-head
CI run `31944201578`. That run passed the complete verification matrix:

```text
Full CI unit/vector tests: 424 passed, 0 skipped
Ubuntu/Windows reproducible build hash: 0043600d32837dc7e4d90db0d6f215ffa9de18ba98e2a6d47ad87f149fcda31f
Cross-OS build comparison: passed
Browser harness: passed in Chromium and Firefox over file://
Approved reference scan: Clean=True, findings=0, skipped=0
Desktop reference SHA-256: fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
Mobile reference SHA-256: af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
```
