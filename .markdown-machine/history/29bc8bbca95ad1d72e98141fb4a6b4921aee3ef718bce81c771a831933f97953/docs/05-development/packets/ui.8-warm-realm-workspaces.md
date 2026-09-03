# UI.8 — Warm-realm workspaces

Status: `[~]` pending independent review.

Branch: `ui.8-warm-realm-workspaces`

## Scope

The warm shell now has exactly four workspace groups: Records, Money, Vault
files, and Reference. Every built warm surface has a typed route in its owning
group. The sealed-realm handoff remains available, but is explicitly outside
the warm workspace taxonomy so it cannot be mistaken for a public-data group.

## Files

- `src/index.html` — explicit four-group warm taxonomy, reference route
  highlighting, and separate sealed-realm entry.
- `src/styles.css` — preserved sealed-entry treatment outside group headings.
- `scripts/run-browser-harness.js` — Chromium/Firefox route reachability and
  group-count coverage over `file://`.
- `test/ui.8-warm-realm-workspaces.test.js` — static taxonomy, route, and
  warm-source boundary regressions.
- `CHANGELOG.md`, `docs/05-development/ROADMAP.md` — item record and `[~]`.

## Acceptance mapping

- Records reaches Registry, Devices, Address bench, and QR Studio.
- Money reaches Dashboard; future money surfaces remain disabled and labelled.
- Vault files reaches Vault files and Backup Health.
- Reference reaches Verify this file/Provenance & legal and Learn.
- The sealed realm link remains reachable but is not a warm workspace group.
- No secret-capable input or message is added to the warm shell; existing
  realm-boundary behavior is preserved.

## Verification plan

The focused test asserts the four-group taxonomy and every built route. The
committed browser harness will exercise every route in Chromium and Firefox at
the exact required `file://` conditions. Hosted CI must also witness the full
suite, vendor verification, lint, docs hygiene, reproducible builds, cross-OS
hash comparison, and approved-reference scan at the pushed head.

## Review focus

- Confirm no built warm route is omitted or routed to a missing page.
- Confirm future Money/Reference items remain unavailable rather than fake.
- Confirm the sealed handoff is outside the four warm groups without losing its
  keyboard, focus, or mobile reachability.
- Confirm the warm shell still receives public metadata only.
