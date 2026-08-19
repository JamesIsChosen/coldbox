# UI.10b — Self-custody workstation shell and workflow implementation

**Branch:** `ui.10b-workstation-shell` (stacked on `ui.10a-workstation-reference-import` @ `7e7997a`)
**Roadmap item:** [UI.10b](../ROADMAP.md) · *Deps: UI.10a* 🌐
**Status left at:** `[ ]` — **this item is not finished.** See §0.

---

## 0. This is a partial packet. Read this first.

UI.10b is one roadmap item but several passes of work. This branch contains
**pass 1 of 3**, committed and green, so the work survives the session and can be
reviewed in a coherent slice rather than as a half-rewrite.

| Pass | Scope | State |
|---|---|---|
| **1 — navigation** | The approved hierarchy in both realms: rails, phone bar, realm-aware More sheets, four new warm destinations, the All flows index, deletion of the tool-first placeholder pages | **done, on this branch** |
| 2 — screen content | Home / Wallets / Backup / Security composition against the approved screens; the seed record and Secret QR sealed screens | not started |
| 3 — harness reconciliation | `scripts/run-browser-harness.js` reconciled to the new shell, and the two-engine run | not started |

The roadmap marker stays `[ ]`, not `[~]`: `[~]` means implemented and awaiting
review, and this is not implemented yet. A reviewer looking at this branch should
review **pass 1 on its own terms** — is the navigation change correct, truthful
and safe — and should not weigh it against UI.10b's full acceptance list, most of
which passes 2 and 3 own.

Everything in §§1–12 describes pass 1 only.

---

## 1. Summary

The warm shell's rail becomes Workspace / Records / Trust & reference /
Vault & settings / Sealed work, and the sealed rail becomes Seeds & lineage /
Forge / Derive / Split & carry / Recover & verify / Session — the exact taxonomy
UI.10a imported, asserted against the approved manifest rather than against a
second hand-written list. The phone bar becomes the approved five object slots
and both More sheets become realm-pure. Four new warm destinations and an All
flows index carry the capabilities that lost a top-level tool name.

---

## 2. Scope

**In:**

- `src/index.html` — new rail (5 groups, 21 destinations), new phone bar, new
  realm-aware More sheet, four new pages (`wallets`, `security`, `settings`,
  `advanced`), the approved Home heading, and deletion of four placeholder pages.
- `src/cold/index.html` — new sealed rail (6 groups), new sealed phone bar and
  More sheet.
- `src/main.js` — `routeDetails` rewritten to the new groups; the More sheet's
  Lock / panic control wired to the existing lock handler.
- `src/styles.css` — the All flows index, the More sheet's action control, and
  the sealed-group separator rule that replaces the deleted `.nav-sealed-entry`.
- `docs/05-development/ROADMAP.md` — **adds P1.4a** (§4).
- `test/ui.10b-workstation-shell.test.js` — 12 new tests.
- `test/ui.5-shared-shell.test.js`, `test/ui.8-warm-realm-workspaces.test.js` —
  reconciled, not deleted (§9).
- `test/ui.10a-workstation-reference.test.js` — leak sentinel changed (§9).

**Deliberately not in:**

- **Pixel convergence.** UI.11 owns that, and ui-parity.md §6.1 pauses it until
  UI.10b is `[x]`. Nothing here chases a colour, a shadow offset or a type size.
  The screenshots below look like the current Coldbox, not like the mock, and
  that is correct at this stage.
- Screen content and the sealed seed-record screens — pass 2.
- The browser harness — pass 3.
- Any new capability. Every new destination routes to something that already
  exists or is an explicit roadmap-owned unavailable control.

---

## 3. How to verify

```
$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ node scripts/check-docs.js
Documentation hygiene check passed: 264 markdown file(s) checked, 0 warning(s).

$ npm test
# tests 464
# pass 464
# fail 0
# skipped 0
```

464 passing, **zero skipped** (452 at UI.10a + 12 new).

Reproducible build, two runs under different `TZ` and `LC_ALL`:

```
$ rm -f build/coldbox.html && TZ=UTC LC_ALL=C node scripts/build.js && sha256sum build/coldbox.html
692d2c02197adb340e8acc0a0412d27afd5bddee06650f1c4dba9db565d37f5c

$ rm -f build/coldbox.html && TZ=Pacific/Kiritimati LC_ALL=en_US.UTF-8 node scripts/build.js && sha256sum build/coldbox.html
692d2c02197adb340e8acc0a0412d27afd5bddee06650f1c4dba9db565d37f5c
```

### 3.1 Routing, in a real browser

Driven against `build/coldbox.html` from `file://` in the locally available
Chromium. Every `[data-route]` was navigated and the visible `[data-page]` set
checked after each:

```
PAGES (16): dashboard,wallets,security,settings,advanced,vault,portfolio,prices,
            registry,devices,backup,qr,verify,reference,learn,tool-map
ROUTES (14): dashboard,vault,wallets,backup,security,registry,devices,reference,
             learn,tool-map,settings,advanced,qr,verify
ROUTES WITHOUT PAGE: none
PAGES WITHOUT NAV:   portfolio,prices     <- the two approved unavailable destinations
BROKEN ROUTES:       none
PAGEERRORS:          []
```

Exactly one page was visible for every route, and `portfolio`/`prices` are the
two pages reached only through their disabled rail controls, which is the
approved unavailable treatment.

### 3.2 The sealed realm, in a real browser

The sealed realm is one scrolling document rather than a router, so a rail entry
pointing at a deleted id fails **silently** — the click does nothing and no
assertion about routing would notice. Every sealed anchor was therefore resolved
against the ids actually present in the frame:

```
anchors checked: 13
DEAD ANCHORS: none
GROUPS: [{"aria":"Seeds & lineage","title":"Seeds & lineage"},
         {"aria":"Forge","title":"Forge"},
         {"aria":"Derive","title":"Derive"},
         {"aria":"Split & carry","title":"Split & carry"},
         {"aria":"Recover & verify","title":"Recover & verify"},
         {"aria":"Session","title":"Session"}]
PAGEERRORS: []
```

Every group's accessible name now equals its visible heading — see §9 for the
defect that replaces.

### 3.3 Mobile, at the approved 390 × 844

```
BOTTOM BAR: Home 75×48 · Wallets 75×48 · Seeds 75×48 · Backup 75×48 · More 75×48
under 44px: none

More opened:   aria-expanded=true,  focus moved to "Security & verify"
More entries:  15,  under 44px: none
More closed:   aria-expanded=false, focus returned to #mobile-more-tab
aria-disabled but tabbable: []
PAGEERRORS: []
```

Focus enters the sheet on open and returns to the invoking tab on close. Focus
lands on the first *enabled* entry, skipping the disabled Portfolio row. No
`aria-disabled` element anywhere is reachable by tab.

---

## 4. The roadmap item this pass had to add

**P1.4a — Derivation paths and address derivation surfaces.**

The problem surfaced when the new test refused to let an index entry claim a
completed roadmap item as its reason for being unavailable:

```
error: 'P1.4 is complete but shown unavailable in the index'
```

P1.4 and P1.5 are `[x]`, but they completed the derivation **engine**. No item
ever owned a derivation **UI**, and the engine is reachable today only
indirectly, through Verify Bench's fingerprint/address/xpub comparison. So the
approved design's *Derivation paths* and *Address derivation* destinations had no
truthful owner: marking them unavailable against P1.4/P1.5 asserts something
false, and marking them available promises a surface that does not exist. The
shipped sealed rail has been making the false claim since UI.5.

**The maintainer approved adding the item during this session.** P1.4a now owns
both destinations, with acceptance criteria covering path validation, the P1.5
generic mode, reuse of the existing `src/cold/derivation.js` engine rather than a
second derivation path, and the ADR-0045 rule that neither surface accepts a
phrase in its own fields. Both destinations cite P1.4a in the sealed rail, the
sealed More sheet and the All flows index.

This is scope a reviewer should question deliberately: an implementation item
that edits the roadmap is unusual. The alternative was to satisfy UI.10b's
truthful-availability criterion by writing something untrue, which
[AGENTS.md §7](../../../AGENTS.md) forbids outright.

---

## 5. Security impact

| Boundary | Touched? |
|---|---|
| Realm boundary / cold CSP | **No** — `src/cold/index.html` changes are navigation markup only; no CSP, no script, no message |
| Message schema | No — no message type added, removed or changed |
| Vault format | No |
| Derivation | No — P1.4a is a roadmap entry, not an implementation |
| Randomness | No |
| `connect-src` hosts | No |
| iframe sandbox | **No, and deliberately not** — see below |

**The one place this pass had to refuse the approved design.** The approved cold
rail's Session group ends with *Return to warm shell*. The sealed frame is
created with `sandbox="allow-scripts allow-downloads allow-modals"` — no
`allow-top-navigation`, no `allow-same-origin` — so it cannot navigate its
parent, and there is no message type that would let it ask. Shipping that entry
would mean either granting the sealed frame top-navigation or adding a
cold → warm message, and **weakening realm isolation to satisfy a navigation
shortcut is not a trade this item is allowed to make.** PAR-003 puts realm
isolation above prototype treatment, so the entry is omitted; the warm masthead's
realm switcher is visible above the sealed frame at all times and is the return
path. A test asserts the sandbox string, so this reasoning fails loudly if
someone later relaxes it.

The rail is asserted to contain no `<input>`, `<textarea>` or `data-secret`
element in either realm, and no warm destination gained a sealed capability: the
warm More sheet is asserted not to contain Entropy Lab, Seed Forge, Split lab,
Passphrase Studio or Child seeds, and the sealed More sheet is asserted not to
contain Portfolio, Prices & FX, Tax & exports, Records & registry, Reference &
help or Tool map.

**Where I am not certain:** the sealed rail entries `Verify / combine`
(`#cold-backup-verification`) and `Backup Health` (`#cold-backup-health-title`)
now anchor to elements *inside* the backup workspace rather than to the workspace
container. Both ids exist and neither is a dead anchor, but I have not verified
that landing mid-workspace leaves the surrounding panel in a sensible scroll and
focus state on a small screen. That is a UX risk, not a security one, and pass 2
should look at it.

---

## 6. Test evidence

**New — `test/ui.10b-workstation-shell.test.js`, 12 tests.** The first two are
the ones that matter: the rail is compared against
`currentSet(readManifest()).navigation`, so "the exact hierarchy approved in
UI.10a" is machine-checked against the approved bytes rather than against a list
I typed twice.

| Test | Proves |
|---|---|
| warm rail groups are the approved warm taxonomy, in order | group set, order, and that each visible heading equals its accessible name |
| every approved warm destination is present exactly once, in its approved group | all 21 destinations, per group, in order, no duplicates |
| an unavailable destination is a disabled control naming a real roadmap owner | disabled + `aria-disabled` + a `data-roadmap-id` that exists in `ROADMAP.md` and is **not** `[x]`; and the converse — a routable entry carries no roadmap badge |
| every routable destination resolves to a built page and an announced route | route → page → `routeDetails`; and no page is stranded |
| the All flows index keeps every specialist capability reachable | every family group, every former top-level tool by name, every roadmap-owned wallet flow present-and-unavailable |
| the mobile bottom bar is the approved five slots, More sheet realm-aware | bar equals `navigation.mobileBottomBar`; Seeds enters the sealed realm; no sealed capability in the warm sheet |
| the reorganised shell gains no secret-capable control and no funding prompt | no inputs in navigation; the sealed entry is alone in its own group and absent from every warm group; no interactive element offers donate/sponsor/subscribe/sign in/activate |
| new destinations meet the touch-target and focus floors | 44px floors; disabled index entries are real disabled buttons; the superseded markup **and** its CSS are gone |
| sealed rail groups are the approved cold taxonomy, in order | as warm, plus a negative on emptied headings |
| sealed rail carries the approved destinations plus only its known extras | exact per-group membership, with the three production extras enumerated so a fourth cannot appear quietly; asserts the sandbox string behind the omitted entry |
| no sealed destination claims a completed item, and none is a dead anchor | every sealed `data-roadmap-id` exists and is not `[x]`; every sealed anchor resolves to a real id |
| the sealed More sheet reaches only sealed capability | realm purity from the sealed side |

**Negative results — the tests caught three real defects in my own work before
this was committed:**

| What broke | Finding |
|---|---|
| The index cited P1.4/P1.5 for the derivation destinations | The completed-owner assertion refused it → P1.4a (§4) |
| The Settings page says "no subscription and no advertising" | The funding check flagged its own denial → scoped to interactive elements only |
| The UI.10a leak sentinel was `/Your self-custody system/` | That is now real product copy → re-based on the mobile reference's annotation board, which no product surface may contain (both replacements verified present in the reference bytes) |

**Could not test:** the two-engine browser harness (§7).

---

## 7. Device matrix

🌐 UI.10b's acceptance is browser-verifiable, so this section is a **real gap on
this branch, not an N/A.**

| Platform | Result | Notes |
|---|---|---|
| Linux Chromium (local, `file://`) | **PASS** for §§3.1–3.3 | routing, sealed anchors, mobile bar, More focus return, touch targets |
| Chromium via the committed harness | **NOT RUN** | pass 3 has not reconciled `scripts/run-browser-harness.js` to the new shell |
| Firefox | **NOT RUN** | no Firefox binary is obtainable in this environment; Playwright downloads are blocked (`cdn.playwright.dev` → `403 blocked-by-allowlist`) |
| Physical mobile | **NOT RUN** | 390 × 844 emulation is not a device result |

`npm run test:browser` was **not run and will not pass as-is**: the harness
still drives the superseded shell. Reconciling it is pass 3 and is the largest
remaining piece of this item. Nothing in this packet should be read as a claim
that the committed harness is green.

---

## 8. Assumptions made

1. **Route ids are not part of the approved design.** `dashboard` stays
   `dashboard` although the approved screen id is `home`. Renaming it would churn
   28 references in the committed browser harness for no user-visible gain, and
   UI.11's harness maps reference screen ids to product routes exactly as its
   predecessor did. *If wrong:* a rename, mechanical but wide.
2. **The four placeholder pages could be deleted rather than kept.** `entropy`,
   `seed-forge`, `derivation` and `recovery` were warm "this lives in the sealed
   realm / coming in Phase N" stubs with no rail entry under the new taxonomy.
   Keeping them would have left four orphaned routes; the All flows index carries
   all four capabilities. Verified no test or harness path references them.
3. **Three production-only sealed rail entries are legitimate.** Reveal hidden,
   Backup Health and Vault session are real sealed surfaces the prototype folds
   into other screens. They keep a rail shortcut rather than losing keyboard
   access to match a mock exactly. Enumerated in the test so the exception cannot
   widen. *If wrong:* delete three entries; they remain reachable from the cold
   tool hub either way.
4. **The sealed rail drops Learn, Airgap guard, Tool map, Fingerprint & address,
   SeedQR & print and Animated QR.** The first three are warm destinations in the
   approved design; the next two were duplicate anchors to destinations that
   remain; Animated QR keeps its sealed More entry. Nothing became unreachable —
   the sealed realm is one scrolling document.
5. **`Phase SEED` and `Phase WAL` are valid phase labels.** The existing
   assertion allowed only numeric phases. Widened, with the reasoning in the
   test.

---

## 9. What to scrutinise

**First — I changed two frozen shell tests, and that always deserves suspicion.**

`test/ui.8-warm-realm-workspaces.test.js` asserted the exact four-group taxonomy
UI.8 shipped. `test/ui.5-shared-shell.test.js` asserted the exact ten-group
taxonomy UI.5 shipped. Both taxonomies were replaced under maintainer-approved
change control (ADR-0059, ui-parity.md §6.2), so those specific assertions are
superseded — but "the taxonomy changed" is exactly the excuse a careless change
would also give. What I did:

- Kept every assertion that was about a *property* rather than the old labels:
  grouped rails in both realms, unavailable entries as unfocusable disabled
  controls naming an owner, calm boundary strips, five-slot phone navigation,
  44px floors, shared chrome vocabulary, no secret-capable control in navigation.
- Moved the *stronger* form of the taxonomy check into the UI.10b suite, where it
  runs against the approved manifest instead of a hand-written list.
- **Weakened exactly one assertion, and this is the one to check.**
  `assert.ok(unavailable.length >= 4)` became `>= 1`, because Reference & help is
  now a live destination and three unavailable warm entries remain. I believe
  nothing was lost — the UI.10b suite asserts the exact set and every owner's
  status — but a reviewer who disagrees should say so, because a loosened
  threshold is precisely how coverage rots.
- Replaced UI.8's `data-route="reference"` count of 3 with the property it was
  proxying: every *navigation* anchor to a built route declares that route. The
  count kept breaking as pages gained cross-links; the property does not. The
  replacement checks 15+ anchors.

**Second — the three pre-existing mislabels I corrected in passing.** The sealed
More sheet owned Child seeds with `P1.5` (Child seeds is P4.6, and P1.5 is
generic-path derivation); the recovery assistant named a bare `P4.3` that the
roadmap does not define; and the two derivation entries cited completed items.
All three were wrong before this branch. Correcting them was necessary to make
the new "every owner exists and is not `[x]`" assertion pass — but it does mean
this diff contains fixes for defects it did not cause. Judge whether they belong
here or in their own change.

**Third — the sealed rail's per-group membership is my judgement.** The approved
cold rail and the production sealed document are not the same shape: production
has surfaces the prototype folds elsewhere, and the prototype has screens
(Selected seed, Level 3 signing) production has not built. I resolved that by
enumerating an allow-list per group in the test. Read that list adversarially —
it is the thing standing between "a considered mapping" and "whatever I happened
to write".

**Fourth — an accessibility defect I fixed rather than reported.** The sealed
rail had a group titled *Split & Carry* whose `aria-label` was still `Split`, and
two groups whose visible heading had been emptied to `aria-hidden="true"` while
the group kept an accessible name. Sighted and screen-reader users saw different
navigation. This came in with the unmerged UI.11 convergence work; on `main` the
same rail has six groups whose labels and titles agree. The new tests assert
label-equals-heading in both realms so it cannot recur.

**Fifth — what pass 1 deliberately does not look like.** The screenshots show the
current Coldbox chrome with new navigation, not the approved mock. Geometry,
type, colour and panel construction are UI.11's, and ui-parity.md §6.1 pauses
that work until UI.10b closes. If a reviewer expects this branch to *look* like
the mock, that expectation is the thing to correct, not the branch.

---

## 10. Self-assessment

**What might be wrong:**

- The per-group allow-lists (warm and cold) encode my reading of the approved
  design. They are asserted, so they cannot drift — but an assertion of the wrong
  thing is still wrong.
- `Verify / combine` and `Backup Health` anchor mid-workspace (§5). Ids resolve;
  the resulting scroll and focus position is unverified.
- The `advanced` index hand-writes roadmap ids and phase labels. That matches
  existing practice in the rail and does not violate UI.9's rule (which forbids
  transcribing item *status*, and is satisfied because the Tool map still
  compiles status from `ROADMAP.md` at build time) — but it is 20-odd
  hand-maintained ids that will rot if the roadmap renumbers. The tests catch a
  *nonexistent* or *completed* owner, not a merely wrong one.

**What I did not do that arguably should have been done:**

- Did not reconcile the browser harness. It is the largest remaining piece and
  the reason this item is not `[~]`.
- Did not touch screen content, so Home still carries the old boundary panels
  under the approved heading.
- Did not verify on a physical device or in Firefox.

**Known limitations shipping with this:**

- `npm run test:browser` does not pass on this branch.
- The sealed realm has no *Return to warm shell* control of its own (§5).

**Follow-up:**

- **P1.4a** is now an open roadmap item with no owner scheduled.
- UI.10b passes 2 and 3.
- UI.11 inherits the QR-normalizer question flagged in the UI.10a packet.

---

## 11. Bundle impact

| | Bytes |
|---|---|
| Before (UI.10a tip) | 2,742,786 |
| After | 2,762,070 |
| **Delta** | **+19,284 (≈ +18.8 KB)** |

Well inside the SPEC §3 budget. The four new pages and the All flows index are
the bulk of it; four placeholder pages were deleted, which offsets part.

---

## 12. Docs updated

| Doc | Change |
|---|---|
| `docs/05-development/ROADMAP.md` | Adds **P1.4a** with goal, deps, acceptance criteria and out-of-scope (§4). UI.10b's own marker stays `[ ]`. |

**No ADR added.** ADR-0059 carries the structural decision; this pass executes
the approved design. The one refusal (§5) is covered by the existing PAR-003.

**No help content.** No user-facing *feature* changed — destinations moved, and
every one of them routes to a surface that already documented itself. Pass 2
changes screen content and will need the three-depth sweep.
