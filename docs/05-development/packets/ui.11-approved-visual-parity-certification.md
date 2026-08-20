# UI.11 — Approved desktop/mobile visual parity certification

**Branch:** `ui.11-parity-harness` (stacked on `ui.10b-workstation-shell` @ `d02e48c`)
**Roadmap item:** [UI.11](../ROADMAP.md) · *Deps: UI.8, UI.9, UI.10*
**Status left at:** `[ ]`. **This is a mid-item pass, not a finished item.** No PR.

---

## 0. Read this first

UI.11's acceptance opens with **"UI.10a and UI.10b are `[x]`"**. Neither is. UI.10a
is `[~]` and has an independent **FAIL** with nine findings; UI.10b is `[ ]` with
pass 2 unfinished. `ui-parity.md` §6.1 pauses pixel convergence until both close.

So this pass deliberately does **not** attempt certification. It builds the one
part of UI.11 the roadmap allows while the redesign items are open — *"this item
may correct visual drift and **maintain the dedicated comparison harness**"* — and
stops at the point where certification would begin.

Concretely: **the reference half of the harness is finished and exercised over all
92 states; the product half is written and cannot yet be exercised, because the
shell it compares against does not exist.** Every row it cannot compare is
reported `PENDING` and the run exits non-zero. Nothing here claims parity.

---

## 1. Summary

`scripts/ui11-parity.js` is rewritten from the version stranded on the unmerged
`ui.11-approved-visual-parity-certification` branch. That version predates UI.10a:
it carried its own `SCREEN_OWNERS`, its own roadmap parser and its own
`createStateMatrix()`, and its browser half was bound to the superseded
tool-first shell through tables like `PRODUCT_WARM_ROUTES` and
`ACTIVE_COLD_FIXTURE_SCREENS`.

The new harness:

- reads the current set, the state matrix, the classifications and the deviation
  register from `scripts/ui-reference-manifest.js` — **one module decides, not
  two**;
- derives every reference navigation route from the approved artifact's own
  tables and **cross-checks them against the manifest before it clicks
  anything**, so the run is independent evidence about the manifest rather than a
  consumer of it;
- crops the mobile capture by **measuring** the approved product frame instead of
  hard-coding the old artifact's offsets;
- refuses masks and thresholds, and refuses to skip a row.

---

## 2. Scope

**In:**

- `scripts/ui11-parity.js` — full rewrite (1,2xx lines).
- `test/ui.11-parity-harness.test.js` — 13 tests, no browser required.
- `scripts/lint.js` — registers the new tooling script for syntax checking.
- `package.json` — `npm run test:parity`.
- `CHANGELOG.md`, `ROADMAP.md` (a current-state note under UI.11; the marker
  stays `[ ]`).

**Deliberately not in:**

- **Any `src/` change.** Byte-identical to `ui.10b-workstation-shell` @ `d02e48c`.
  Pixel convergence is what §6.1 pauses; the harness is what it permits.
- **Any new deviation ID.** The register stays PAR-001..PAR-009. The QR-normalizer
  question UI.10a §9 raises (a decorative 21×21 grid versus a real encoding) still
  needs a maintainer-approved **PAR-010** and is not resolved here — see §9.
- **The five unimplemented normalizers.** Declared, reasoned, and enforced as
  blocking. See §6.
- **Merging or salvaging the old UI.11 branch's ~3,700 lines of CSS.** It converges
  on the *superseded* references. It stays as history.

---

## 3. How to verify

```
$ git diff --quiet ui.10b-workstation-shell HEAD -- src/ && echo "SRC BYTE-IDENTICAL TO UI.10b"
SRC BYTE-IDENTICAL TO UI.10b

$ npm run verify-vendor
Vendor verification passed against local files and upstream releases.

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ node scripts/check-docs.js
Documentation hygiene check passed: 265 markdown file(s) checked, 0 warning(s).

$ npm test
# tests 481
# pass 481
# fail 0
# skipped 0
```

481 passing, **zero skipped**; `ui.10b-workstation-shell` is 468 and the 13 new
tests are all in `test/ui.11-parity-harness.test.js`.

Reproducible build — four runs, three timezones, three locales, two Node majors,
two paths, one hash:

```
TZ=UTC                 LC_ALL=C        node 22   994f6b0761b2d7001e8ec8e70f2f4ce9d507f92992a60810269c48de342f2ad8
TZ=Pacific/Kiritimati  LC_ALL=C.utf8   node 22   994f6b07…  (from "/var/tmp/cbx-ui11/deep path/repo")
TZ=Asia/Kolkata        LC_ALL=POSIX    node 20   994f6b07…
```

Adding `test:parity` to `package.json` — which *is* a product build input — left
the artifact hash unchanged; measured before and after.

### 3.1 The reference half, over all 92 states

```
$ node scripts/ui11-parity.js --reference-only --engine chromium --out test/output/ui11
UI.11 parity: 92 row(s) [PENDING=92]; unexpected changed pixels: 0
```

**88 of 92 rows navigated to their state and captured at the manifest's
comparison region.** Capture dimensions, from `totals.json`:

| viewport | region kind | captured |
|---|---|---|
| desktop | `full-viewport` | 1440 × 940 |
| mobile | `product-frame` | 390 × 844 |

The four uncaptured rows are `desktop/walletDetail`, `desktop/create`,
`mobile/walletDetail` and `mobile/create` — screens the approved artifacts do not
put on a rail, a bottom bar or a More sheet, and whose entry-point control has not
been established **by measurement**. They are declared `unresolved` with a reason,
and they fail. See §9.

Two captures worth opening, because they are the evidence that the driver reached
the *right* state rather than merely a state:

- `chromium-mobile-seedqr-reference.png` — three cardinality-checked hops (bottom
  bar → Seeds → record row 0 → *Show SeedQR (secret)*), cropped to exactly
  390 × 844 with the presentation board, bezel, rounding and shadow removed by
  the PAR-008 normalizer.
- `chromium-desktop-flow-shares-reference.png` — realm switched to sealed, rail
  group *Split & carry*, entry *Split lab*, full 1440 × 940.

### 3.2 Deliberate breakage

| Sabotage | Result | Exit |
|---|---|---|
| Declared a pixel mask in the manifest | `Pixel masks are forbidden by the parity contract` | 1 |
| `--rows desktop/nope` | `--rows names states that are not in the matrix: desktop/nope` | 1 |
| Ran a product pass with `build/` removed | run fails; no row is reported compared | 1 |
| Added `PAR-006` to a matrix row (in test) | `emits deviations with no normalizer: PAR-006` | 1 |
| Renamed a manifest rail group (in test) | `artifact rail groups disagree with the manifest navigation` | 1 |
| Renamed a manifest bottom-bar tab / More entry (in test) | corresponding disagreement error | 1 |
| Renamed a manifest flow title (in test) | `title drifted from the artifact` | 1 |
| Added a screen to the manifest (in test) | `PRODUCT_NAV has no entry for: somethingNew` | 1 |
| Cropped one pixel outside the capture (in test) | `exceeds capture width` / `height` | 1 |

**Environment note, and a warning for the next agent.** This container cannot run
the committed harness as written: Playwright 1.62.1 wants `chromium@1234` and
`firefox@1538`; the image carries `chromium-1194` and no Firefox, and
`cdn.playwright.dev` is blocked. The reference-only run above was produced by
pointing `PLAYWRIGHT_BROWSERS_PATH` at a scratch directory of symlinks
(`chromium-1234 -> chromium-1194`, plus a `chrome-headless-shell` name for
`headless_shell`). **That is an environment fix and touches no repository file.**
A test asserts the committed harness contains no `executablePath`, no
`CBX_CHROMIUM` and no `--no-sandbox`, so the workaround cannot become a commit
the way the campaign's earlier one nearly did.

---

## 4. Acceptance criteria

UI.11's criteria are not met and this pass does not claim them. The table records
where each one now stands, so the remaining work is legible rather than implied.

| Criterion (verbatim, abbreviated where long) | State | Evidence / what remains |
|---|---|---|
| UI.10a and UI.10b are `[x]` | ❌ | UI.10a `[~]` with an independent FAIL (9 findings); UI.10b `[ ]`, pass 2 unfinished. **This gates everything below.** |
| the parity harness selects the current reference set and reads its viewports, comparison regions, navigation and screen lists directly from the approved manifest | ✅ | `runParity()` calls `readManifest()`/`currentSet()`/`createStateMatrix()`; viewports and comparison regions come from `set.references[*]`; navigation and screens are read from the manifest and re-derived from the artifact for cross-check. |
| superseded reference artifacts remain byte-identical historical evidence and cannot accidentally become current | ✅ | `verifyReferenceBytes()` runs on every invocation, over every set; selection is UI.10a's module and the harness has no second path to a set. |
| every manifest state is classified exactly once … no missing or skipped row | ✅ *(classification)* / ❌ *(comparison)* | 92 rows, unique, all classified — but four have no reference route and 92 have unneutralised deviations, so none is *compared*. Both facts are in `totals.json`. |
| an unavailable screen appears only as the approved disabled navigation treatment and cannot be focused or opened | ❌ | Needs UI.10b's shipped disabled treatment. All six roadmap-owned flows are PENDING with that reason. |
| reference normalizers are deterministic, each names one registered deviation ID, each fails on unexpected selector cardinality, and no pixel mask or percentage threshold exists | ⚠️ **partly** | The *rule* is enforced now: one PAR id per normalizer, coverage asserted against the matrix, masks refused at run time, every selector cardinality-checked. But only **PAR-008** is implemented; five are declared-and-blocking. See §6. |
| in each browser engine required by the committed harness, every `PARITY` row has equal capture dimensions and zero unexpected changed pixels | ❌ | Chromium only, reference side only. Firefox unobtainable here. No row compared. |
| the packet includes the generated state matrix, reference/product/diff artifacts and machine-readable totals, and identifies every applied deviation by ID | ⚠️ **partly** | `state-matrix.json` and `totals.json` are emitted, each row naming `appliedNormalizers` and `pendingNormalizers`; 88 reference PNGs exist. No product or diff artifacts, because nothing was compared. |
| keyboard, focus return, pinch zoom, responsive overflow, minimum touch targets, reduced motion, calm-panel state and dark/light presentation pass their committed assertions | ❌ | Untouched by this pass. UI.10b's browser harness owns most of these today. |
| a maintainer compares the real build with both approved references and records the physical mobile device, OS, browser and orientation | ❌ | Human-only, and premature: the real build is still the old shell. |
| no new deviation is accepted inside this implementation item without prior maintainer approval | ✅ | Register unchanged at PAR-001..PAR-009. The **PAR-010** question is raised in §9, not decided. |
| cold/warm CSP hashes, realm isolation and all existing behaviour remain intact | ✅ | `src/` byte-identical to `d02e48c`; 481 tests pass. |
| the reference artifacts remain absent from the production HTML | ✅ | UI.10a's build-input-graph test still passes; the harness is not a build input. |
| the final build is reproducible | ✅ | §3. |

---

## 5. Security impact

| Boundary | Touched? |
|---|---|
| Realm boundary / cold CSP | No |
| Message schema | No |
| Vault format | No |
| Derivation | No |
| Randomness | No |
| `connect-src` hosts | No |
| New message types | No |

`src/` is byte-identical to `ui.10b-workstation-shell` @ `d02e48c`.

The one security-relevant property this pass carries is the same one UI.10a
accepted: the harness **renders** two untrusted prototype artifacts. It does so in
a disposable copy under a temporary root, in a context created `offline: true`,
with every non-`file:` request aborted at the route level, and it asserts the page
raised no errors. It never evaluates prototype internals — it clicks controls and
reads geometry and text, which is what a renderer does. The artifacts are read as
data everywhere else (`JSON.parse` of the inert template, `gunzipSync` of the
resource manifest), exactly as UI.10a's reference test reads them.

**Where I am not certain:** the reference is driven by clicking. A prototype
control that navigates somewhere unexpected would produce a confidently captured
screenshot of the wrong screen, and no assertion here would catch it — the
cardinality checks prove *which control was clicked*, not *what it did*. Two
captures were opened and confirmed by eye (§3.1); the other 86 were not. A
per-row assertion on the rendered heading against the manifest's screen inventory
would close this, and should be the next thing added.

---

## 6. Test evidence

**New — `test/ui.11-parity-harness.test.js`, 13 tests, no browser:**

| Test | Proves |
|---|---|
| the harness decides nothing the module already decides | source contains no `SCREEN_OWNERS` / `parseRoadmapStatuses` / `classifyScreen`, and does `require('./ui-reference-manifest.js')` |
| pixel masks and percentage thresholds are refused | a declared mask throws; a one-channel difference in one pixel counts as changed |
| every deviation the matrix emits has exactly one normalizer | coverage holds today, and an injected `PAR-006` row throws |
| a row whose deviations are not all neutralised cannot be certified | **all 92 rows are currently uncertifiable, and the test asserts that set is exactly empty of certifiable rows** — so the first row that becomes certifiable forces a deliberate edit here |
| PAR-008 is implemented, geometric, and the only one that is | pins the implemented set to `['PAR-008']` |
| PRODUCT_NAV covers every manifest screen exactly once | plus: every declared handle actually exists in `src/index.html` |
| a screen the manifest adds and the tables do not fails closed | both directions |
| every manifest screen has a reference route on both viewports | 46 + 46, each with a known route kind, each unresolved one carrying a reason |
| the route index re-verifies the manifest navigation against the artifact | five separate disagreements each throw — groups, bottom bar, warm More, sealed More, flow title |
| the PNG pipeline round-trips and crops only inside the capture | plus three out-of-bounds refusals |
| captures of unequal size are a failure, not a resize | width and height |
| the command line refuses anything it does not understand | unknown flag, unknown engine, missing value |
| the committed harness requires both engines and carries no escape hatch | no `executablePath`, no `CBX_CHROMIUM`, no `--no-sandbox` |

**Normalizer status — the honest table:**

| Deviation | Implemented | Why not / how |
|---|---|---|
| **PAR-008** | ✅ | Geometric. Finds the unique element whose CSS content box equals the manifest comparison region, asserts cardinality 1, asserts the origin is on a whole device pixel, crops to it. Verified over all 46 mobile rows. |
| PAR-001 | ❌ | The matrix emits only `theme: 'dark'` rows, so there is no light-theme capture for a light-theme deviation to act on. This is UI.10a review finding **F9**; it needs the matrix's theme axis resolved first. |
| PAR-002 | ❌ | The substitution table is defined by what UI.10b renders. |
| PAR-003 | ❌ | Needs the shipped sealed shell; UI.10b pass 2 has not composed it. |
| PAR-005 | ❌ | Needs both sides: the corrected owner is known, the rendered target format is UI.10b's. |
| PAR-007 | ❌ | A fixture substitution needs both sides drivable to the same fixture. |
| PAR-009 | ❌ | Needs the shipped disabled-navigation treatment. |

A row carrying an unimplemented normalizer is `PENDING` and **cannot pass**. That
is the difference between "this difference is permitted" and "this difference has
been removed", and collapsing the two is how a parity harness starts certifying
screens it never compared.

**Could not test:** Firefox (§7), and every product-side path (no shell).

---

## 7. Device matrix

**Not applicable to this pass**, and not deferred under ADR-0043. No `src/` byte
changes; the harness ships no rendering, bootstrap, CSP or storage behaviour.
UI.11's real device obligation — a maintainer comparing the built app against both
approved references on a physical phone — belongs to certification and is
untouched.

| Platform | Result | Notes |
|---|---|---|
| all | **N/A** | no product change; `src/` byte-identical to `d02e48c` |

`npm run test:parity` requires Chromium **and** Firefox and refuses to run without
both. CI's `browser-tests` job installs both; it does not yet invoke this harness.
**Wiring it into CI is deliberately left to the pass that first has something to
certify** — a CI job that runs 92 PENDING rows and fails on every push buys
nothing and trains people to ignore a red check.

---

## 8. Assumptions made

1. **"Maintain the dedicated comparison harness" covers rewriting it.** The old
   driver cannot be maintained toward the new references — its selection tables
   name the old shell's routes. *If wrong:* this pass should have waited for
   UI.10b, and nothing here is lost by waiting.
2. **The approved artifact is the authority for the screen→label binding.** The
   manifest records navigation *label sets* but not which label opens which
   screen, so the binding is parsed from the artifact and the label sets are
   cross-checked against the manifest. *If wrong:* the binding belongs in the
   manifest, which is a UI.10a change and would resolve review finding **F3**
   more directly than this cross-check does.
3. **Clicking a prototype control is rendering, not executing it.** PAR-006 makes
   the prototype's implementation non-binding; the harness reads geometry and
   text and clicks. It never calls into the prototype's own functions.
4. **`--reference-only` exiting 0 is correct.** It asserts only that no row
   *failed*; it never asserts parity, and it prints the PENDING reason for every
   row. *If wrong:* it should exit non-zero whenever any row is PENDING, which
   would make it useless as the "is the reference half healthy?" check it exists
   to be.

---

## 9. What to scrutinise

**Start here — the four unresolved entry points.** `desktop/walletDetail`,
`desktop/create`, `mobile/walletDetail` and `mobile/create` have no measured
control. For `walletDetail` I established a real negative: on the desktop wallets
screen there are **zero** elements ≥240×56 with `cursor: pointer`, so the wallet
rows are not clickable in the prototype at all. Either the object view is reached
some other way, or the approved artifact does not navigate to it and the manifest
lists a screen that is only reachable as an initial state. **That distinction
matters** — the second case would be a UI.10a manifest question, not a harness
one. I did not resolve it and did not guess a selector.

**Second — the `record` matcher's geometry.** `mobile/seedDetail` selects "the
outermost pointer-cursor region ≥240×56, sorted by y, index 0", with
`expected: 4`. That is stable today (measured: exactly 4 rows) and it is
independent of PAR-007 fixture text, which is deliberate — selecting a row by its
demo label would break the moment a fixture normalizer replaced that label. But it
is geometry, and geometry is a weaker contract than a handle. Judge whether the
`expected: 4` pin is enough.

**Third — the harness now re-verifies UI.10a's manifest navigation on every run.**
`buildReferenceIndex()` throws if the artifact and the manifest disagree about
rail groups, the bottom bar, either More sheet, or any flow title/realm. This is
genuinely useful — it independently closes the verification gap that UI.10a review
finding **F3** identified, where 26 More-sheet labels were asserted by nothing.
**But it closes it in the wrong repository layer.** UI.10a should assert its own
manifest; a consumer catching its supplier's error is luck, not design. If UI.10a
fixes F3 properly, this cross-check becomes redundant belt-and-braces, and that is
fine — do not delete it, but do not treat it as F3's fix either.

**Fourth — no per-row state assertion.** Flagged in §5 and worth repeating: the
harness proves which control it clicked, not which screen it landed on. Every
capture I inspected was correct, but "every capture I inspected" is two.

**Fifth — the PAR-010 question is still open.** UI.10a §9 raised it: the approved
artifacts render QR codes as deterministic decorative 21×21 grids seeded from the
payload string, and production renders real encodings. PAR-007 covers fixture
*substitution*, not a different *kind* of mark. `mobile/seedqr` is now captured
and the grid is plainly visible in it, so this is no longer hypothetical. **UI.11
cannot close without a maintainer-approved PAR-010 (or a fixture whose payload
both sides encode identically), plus the negative test the contract requires.**

---

## 10. Self-assessment

**What might be wrong:**

- The reference driver's selectors are label- and geometry-based because the
  artifacts carry no handles. Every one asserts cardinality, which converts
  ambiguity into a loud failure rather than a wrong screenshot — but a *unique*
  wrong match is still possible. The per-row state assertion in §9 is the fix.
- `REFERENCE_SETTLE_MS = 1500` and `INTERACTION_SETTLE_MS = 250` are settle
  margins, not synchronisation. Everything after them asserts what it found, so a
  slow mount produces a cardinality failure rather than a bad capture — but on a
  loaded machine that failure would look like a selector bug.
- The four unresolved entry points may indicate a manifest question rather than a
  harness gap (§9).

**What I did not do that arguably should have been done:**

- Did not run Firefox. Unobtainable here; CI is the only possible witness and this
  harness is not in CI yet.
- Did not assert the rendered screen identity per row (§5, §9).
- Did not wire `test:parity` into CI (§7, deliberate).
- Did not implement five of the six declared normalizers. They cannot be written
  against a shell that does not exist, and writing them speculatively would mean
  five untested substitutions in the code path that decides what counts as a
  difference.

**Known limitations shipping with this:**

- Nothing here compares the product to anything. `PENDING=92`.

**Follow-up this creates:**

- The next UI.11 pass implements PAR-001/002/003/005/007/009 as UI.10b's screens
  land, resolves the four entry points, adds the per-row state assertion, and
  wires `test:parity` into CI once a non-trivial number of rows can actually be
  compared.

---

## 11. Bundle impact

| | Bytes |
|---|---|
| Before (`d02e48c`) | 2,742,786 |
| After | 2,742,786 |
| **Delta** | **0** |

`src/` is byte-identical and the artifact hash is unchanged
(`994f6b07…`), including after the `package.json` script addition — measured, not
assumed.

---

## 12. Docs updated

| Doc | Change |
|---|---|
| `docs/05-development/ROADMAP.md` | A current-state note under UI.11. **The marker stays `[ ]`** — this is a mid-item pass. |
| `CHANGELOG.md` | Unreleased entry. |
| This packet | New. |

**No ADR added.** The harness executes decisions ADR-0043/0049 and `ui-parity.md`
already carry; it makes no new structural choice. The one decision that *would*
need an ADR — a PAR-010 for the QR normalizer — is raised in §9 and left to the
maintainer.

**No help content.** Nothing user-facing changed.

---

## 13. Independence disclosure

This pass was authored by the same session that produced the independent **FAIL**
review of UI.10a. That is not a review conflict — UI.11 is a different roadmap
item, and no UI.10a finding was fixed here — but a reviewer should know it, and
should be a third session. Two specific places where the overlap could have
biased me are called out honestly in §9: the manifest cross-check that
incidentally covers UI.10a finding F3, and the PAR-001/theme contradiction that is
UI.10a finding F9.
