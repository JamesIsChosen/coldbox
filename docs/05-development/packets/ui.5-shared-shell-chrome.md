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
