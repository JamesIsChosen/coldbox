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
ℹ tests 5
ℹ pass 5
```

Source syntax, lint, and build:

```text
node --check src/main.js
node --check src/cold/main.js
npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.
npm run build
Built build/coldbox.html (e12ebc734d94be428d2511d3045d3894836904d480eff698a096ab9ac3586641)
```

The full local test command was also attempted. Three existing provenance
tests that create a scratch Git repository cannot run in this Windows
sandbox: `spawnSync git` is denied by the sandbox policy. The remaining test
output, including the UI.5 suite, passed. Hosted CI is required for the
complete Windows/Ubuntu and browser verification before merge.

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

The physical iOS/Android/device rows are not part of this warm/browser shell
checkpoint. Any required physical validation remains an explicit, non-blocking
item-scoped deferral under ADR-0043 and does not claim release/device-gate
closure for P0.19 or UI.11.

## Self-assessment

The cold frame now has a real shell rather than only a vertical hub. The main
risk is visual geometry at the narrowest phone widths because the production
frame is an opaque `srcdoc`; the hosted Chromium/Firefox harness and the
independent reviewer must verify overflow, focus order, and the More sheet.

