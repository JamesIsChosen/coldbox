# Maintainer decisions — Phase UI completion

**Decided:** 2026-08-20 · **By:** James (maintainer), in session
**Supersedes:** the "Five decisions" section of `_inbox/HANDOFF-ui-phase-completion.md`

These five answers were blocking Steps 1–3 of the UI phase completion plan. They
are binding. A session that disagrees with one should say so and stop, not choose
differently.

---

## D1 — Derivation paths and Address derivation are owned by **P1.4a**

**Answer: (a).** P1.4 and P1.5 completed the derivation *engine* and remain `[x]`.
The user-facing surfaces are owned by a new item, **P1.4a — Derivation paths and
address derivation surfaces**, which is unbuilt and stays `[ ]`.

This is already reflected on `ui.10b-workstation-shell`: `docs/05-development/ROADMAP.md`
carries the P1.4a entry with goal, deps, acceptance criteria and out-of-scope, and
all four derivation nav destinations in `src/cold/index.html` render as
`cold-nav-link-unavailable` with `data-roadmap-id="P1.4a"`. `main` does not yet have
either change; it still shows `P1.4` ×2 and `P1.5` ×1.

**What must change because of this answer:**

- **UI.10a, finding F2.** `scripts/ui-reference-manifest.js` currently maps
  `'flow:paths': ['P1.4', 'P1.5']` and `'flow:addresses': ['P1.4', 'P1.5']` in
  `SCREEN_OWNERS`. Both become `['P1.4a']`. Because P1.4a is open, these two screens
  must classify as unavailable-owner, not `PARITY`. Pin it with a test.
- **UI.10b** ships both destinations disabled, naming P1.4a. Already done — verify,
  don't redo.

## D2 — PAR-010 is **approved** for the QR normalizer

**Answer: approve.** The approved reference artifacts render QR codes as deterministic
decorative 21×21 grids seeded from the payload string; production renders real
encodings. No fixture payload can make a seeded-decorative grid equal a real encoding,
so the module pattern inside the frame can never converge. PAR-007 covers fixture
*substitution* and does not stretch to a different *kind* of mark.

Register **PAR-010** in `docs/01-spec/ui-parity.md` (PAR-001 … PAR-009 are taken;
010 is the next free id). Per §6 it requires, and this approval is conditional on:

- a **negative test** proving the deviation cannot silently widen — it must fail if
  the normalized region grows beyond the QR module area, or if the selector matches
  an unexpected number of elements;
- the normalizer naming exactly `PAR-010`, being deterministic, and failing on
  unexpected selector cardinality;
- the QR **frame, quiet zone, size and position** staying under normal pixel
  comparison. Only the module pattern inside the frame is covered.

## D3 — The Home portfolio card renders **`Unavailable · P3.4`** in place

**Answer: (a).** Keep the approved element; render the owner-named unavailable state
where the `≈ $104,767` figure sits. The other two Home cards — wallet count and
backup-verified count — are real and come from shipped P1.6/P2.7 registry records.
The `$104,767` string exists only in the two approved reference artifacts; nothing in
`src/` produces it.

This follows the precedent already set on Wallets and **is now the standing precedent
for every unbuilt-data element in the shell**: keep the approved element, name the
owning roadmap item, never invent or placeholder a number.

## D4 — The three global warm panels move into **Security & verify**, plus a compact indicator

**Answer:** stay true to the approved mock. *The private channel is established*,
*Reachability uncertain / secrets sealed* and *Capability self-check* stop being
global. They become content of the **Security & verify** destination, which is already
composed. A **compact status indicator** — a pill in the chrome, not a panel — stays
always-visible for at-a-glance transport status.

Every other route's content then begins directly under the hazard strip, as the
approved design shows. Today the composed Wallets screen starts 1,928px down the page.

**Two consequences, both must be handled:**

1. **Arrival.** `focusRouteSection()` (`src/main.js`) declines silently when its target
   panel is not rendered. The wallet list is not rendered while the vault is locked, so
   the scroll never happens and a rail click lands at the top of the page instead of on
   the section. This affects Wallets and Backup Health identically. Fix it as part of
   the layout change — it must not fail silently.
2. **The compact indicator is not in the approved mock.** Comparison regions are
   `full-viewport` or `product-frame`, so a chrome pill lands inside the compared area.
   It therefore needs its own registered deviation — **PAR-011**, with the same §6
   obligations as PAR-010 — *or* it must sit outside every comparison region. Whichever
   route is taken, it is registered explicitly. It is not allowed to be an unexplained
   diff.

**Ownership: this work belongs to UI.10b**, not UI.11. It is shell composition, not
drift correction, and UI.11 is explicitly forbidden from inventing hierarchy. Do the
layout change **before** composing the four remaining screens.

## D5 — Abandon the old UI.11 CSS; keep the branch

**Answer: abandon.** `ui.11-approved-visual-parity-certification` carries ~3,700 lines
of CSS convergence aimed at the **superseded** toolkit references. It is real history
and the branch stays, unmerged, as a record. Do not merge it and do not mine it for
rules — it converges toward the wrong mock. The one artifact worth keeping,
`scripts/ui11-parity.js`, has already been rebuilt on `ui.11-parity-harness` at
`52f9daf`.

---

## Branch state at the time of this decision

| Branch | Local tip | On origin? |
|---|---|---|
| `ui.10a-workstation-reference-import` | `15aec1b` | no — `7e7997a` |
| `ui.10b-workstation-shell` | `d02e48c` | no — 1 behind |
| `ui.11-parity-harness` | `52f9daf` | no — branch absent |

All three were restored from the `_inbox/` bundles and verified against their expected
tips. They are on disk and need `git push` from a host with network access and write
credentials; no agent session in this campaign has had either.
