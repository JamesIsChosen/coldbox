# UI.10a — Product identity and replacement approved mock design

**Branch:** `ui.10a-workstation-reference-import` (from `origin/main` @ `b1208aa`)
**Roadmap item:** [UI.10a](../ROADMAP.md) · *Deps: UI.8, UI.9, UI.10* — all `[x]`
**Status left at:** `[~]`. The reviewer sets `[x]`.

---

## 1. Summary

The maintainer approved the replacement self-custody-workstation desktop and
mobile designs on 2026-08-19. This item imports those two artifacts as new
immutable references, moves the approved package from one reference set to two,
and makes "which set is current" a question with exactly one answer. Production
`src/` is byte-identical to `origin/main`.

---

## 2. Scope

**In:**

- Byte-exact import of the two approved standalone mocks as
  `*.html.reference` files.
- `manifest.json` schema v1 → v2: named reference sets, one marked current, the
  UI.4a set retained as superseded audit evidence.
- `scripts/ui-reference-manifest.js` — reads and validates the manifest, selects
  the current set, verifies every set's bytes, and builds the deterministic
  UI.11 state matrix.
- `test/ui.10a-workstation-reference.test.js` — 10 tests over the new set and the
  selection machinery, including eight negative fixtures.
- `test/ui.4a-approved-mock-parity.test.js` — adapted to reach the superseded set
  by id. Every asserted value is unchanged.
- Docs: `ui-parity.md` §1 and new §6.2, `ui-reference/README.md`, `SPEC.md` §24,
  `CHANGELOG.md`, roadmap UI.10a → `[~]`.

**Deliberately not in:**

- **Any change to `src/`.** UI.10a's acceptance says the design is produced
  "without altering production `src/`". Verified byte-identical below. The shell
  is UI.10b's.
- **The pixel-comparison harness.** `scripts/ui11-parity.js` exists only on the
  unmerged `ui.11-approved-visual-parity-certification` branch, and its
  browser-driving half is bound to the *old* product shell through tables like
  `PRODUCT_WARM_ROUTES` and `ACTIVE_COLD_FIXTURE_SCREENS`. Porting that forward
  now would add several hundred lines with no caller and no product to compare
  against. What UI.10a's acceptance actually requires — "the manifest/harness
  unambiguously selects the new set as current" — is
  `scripts/ui-reference-manifest.js`, which UI.11 will `require()` when it
  rebuilds the driver against UI.10b's shell.
- **Any new deviation ID.** The register stays at PAR-001..PAR-009. See §9.
- The design work itself. The maintainer commissioned and approved it outside the
  repository; this item imports it.

**Touched outside the item:** `SPEC.md` §24 (one paragraph). It stated "It holds
no keys and signs nothing" as a permanent product rule — one of the four phrases
ADR-0059 explicitly supersedes — and UI.10a's first acceptance criterion is that
the durable identity is reconciled. It now states current behaviour truthfully
and does not claim the wallet exists.

---

## 3. How to verify

```
$ git diff --quiet origin/main HEAD -- src/ && echo "SRC BYTE-IDENTICAL TO origin/main"
SRC BYTE-IDENTICAL TO origin/main

$ cd docs/05-development/ui-reference/approved
$ for f in *.html.reference; do printf '%s  bytes=%s  sha256=%s\n' "$f" "$(wc -c < "$f")" "$(sha256sum "$f" | cut -d' ' -f1)"; done
coldbox-desktop-mockup.html.reference  bytes=526996  sha256=fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
coldbox-mobile-mockup.html.reference  bytes=322927  sha256=af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
coldbox-workstation-desktop-mockup.html.reference  bytes=397090  sha256=e657a14d86428f5558bf5655b12d05d3e9b732ac403c5344f73e60dd1d85066c
coldbox-workstation-mobile-mockup.html.reference  bytes=353595  sha256=f4deca09c69151985e9e960282999bed0bb8c4828b2718cc573a02d2d811e2aa
```

The first two are the UI.4a artifacts, unchanged. The second two match the
approved handoff's own `DELIVERABLES.md` hash table exactly — the reviewer can
check them against the maintainer's copy of the handoff without trusting this
branch.

```
$ npm run verify-vendor
Upstream release verified: @scure/bip39@2.2.0
Upstream release verified: argon2-browser@1.18.0
Upstream release verified: qrcode-generator@1.4.4
Vendor verification passed against local files and upstream releases.

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ node scripts/check-docs.js
Documentation hygiene check passed: 266 markdown file(s) checked, 0 warning(s).

$ npm test -- --test-reporter=tap
# tests 458
# pass 458
# fail 0
# skipped 0
# todo 0
`

458 passing, **zero skipped** at source-remediation commit
`5a863766c7501c2609ccff52a1902f16725cfac2`. The original UI.10a suite remains in place and the dedicated
`test/ui.10a-review-remediation.test.js` adds six focused regressions for the
independent F1-F5/F8/F9 findings.

Reproducible build at the exact source-remediation commit
`5a863766c7501c2609ccff52a1902f16725cfac2`:

```
$ npm run build
sha256=f9f58a17b0fda5103d50d3e6d0ba5493d4a403e3fd8d16beffb00bac5ad394a4
bytes=2742963

$ npm run build
sha256=f9f58a17b0fda5103d50d3e6d0ba5493d4a403e3fd8d16beffb00bac5ad394a4
bytes=2742963
```

The two consecutive builds are byte-identical. The full Node suite also retains
the existing locale/timezone determinism regression, so this evidence does not
claim that the runner manually changed `TZ` or `LC_ALL` when it did not.
### 3.1 The build hash and byte length change, and here is exactly why

Production `src/` remains byte-identical to `origin/main`, but the generated
single-file artifact is **2742963 bytes**, versus **2742786 bytes** on the
recorded `origin/main` baseline: **+177 bytes**.

Two author-side metadata inputs explain the artifact change:

1. `scripts/ui-reference-manifest.js` changed in the F1-F9 remediation.
   `scripts/build.js` derives `PROVENANCE_BUILD_DATE` from
   `git log -1 -- src scripts vendor`, so that script-path commit moves the
   embedded provenance date and its dependent expected-hash/CSP bytes even though
   the reference-manifest helper is not itself a product build input.
2. The UI.9 Tool Map compiles `ROADMAP.md` into the artifact. UI.10a already
   changes its own status to `[~]`; maintainer decision D1 additionally adds the
   open **P1.4a — Derivation paths and address derivation surfaces** item while
   leaving P1.4/P1.5 complete. That new roadmap record is therefore intentionally
   present in the generated Tool Map and accounts for the non-zero byte delta.

The approved `*.html.reference` files themselves remain quarantined outside
the transitive product build-input graph. The size change is roadmap/provenance
metadata, not imported prototype bytes or a `src/` implementation change.
### 3.2 The imported references render fully offline

The parity contract requires the references to render in a network-blocked
context. Verified with every non-`file://` request aborted at the route level and
the context set offline:

```
desktop  blocked network requests: 0   page errors: none
         h1 font-family: Bangers, Impact, "Arial Narrow Bold", sans-serif
         first text: COLDBOX | PRE-RELEASE · NOT AUDITED | ☼ WARM SHELL | ✻ SEALED REALM | ...
mobile   blocked network requests: 0   page errors: none
         h1 font-family: Bangers, Impact, sans-serif
         first text: COLDBOX WORKSTATION — MOBILE, 390 × 844, FULLY CLICKABLE | ...
```

Zero requests were blocked because zero were made: the display face resolves from
a `woff2` embedded in the artifact's own inert resource manifest. The
`<link rel="preconnect" href="https://fonts.googleapis.com">` in the payload is
inert — the `@font-face` rules point at embedded resource UUIDs, not at Google.

**Note for whoever writes the UI.11 renderer:** the references must be copied to
a `.html` name before a browser will parse them as HTML. Opened under their real
`.html.reference` extension, Chromium serves them as `text/plain` and renders the
source. That is the extension doing its job, and the existing
`scripts/ui11-parity.js` already copies to a disposable path (line 217).

### 3.3 Secret-shaped-content scan — **canonically verified; automation remediated**

UI.4a's inherited import control is satisfied on independent-review evidence at
the reviewed implementation commit: the repository's canonical
`Invoke-ColdboxSecretScan` was run unmodified under **PowerShell 7.4.6** on
byte-exact temporary copies of both new workstation reference artifacts. It
reported **CLEAN**, **0 skipped binary files**, and exit 0. The reviewer also ran
a positive control containing twelve consecutive BIP-39 words; the scanner
correctly returned a finding and non-zero exit. This author-side remediation did
**not** rerun that scanner by hand.

F1 was not about the content result; it was about automation. The CI
`approved-ui-reference-secret-scan` job now derives every declared
`*.html.reference` filename from `manifest.json`, compares that declared set
against every approved reference file present on disk, fails closed on any
undeclared/unscanned file, copies the exact declared set to a temporary root, and
runs the canonical scanner there. Future reference imports therefore cannot gain
a green scan by being absent from a hard-coded list.

The illustrative phrase disclosed by the design handoff is:

`ripple canyon velvet oyster timber plunge ladder nectar quarry siphon walnut orbit`

The correct BIP-39 explanation is that **`nectar`, `quarry` and `siphon`**
are not in the vendored English wordlist. The longest consecutive in-list run in
that sample is therefore **7 words** (`ripple` through `ladder`), below the
scanner's 12-word threshold. `ripple` and `velvet` are BIP-39 words; the
earlier packet text saying otherwise was wrong and is superseded here.

---

## 4. Acceptance criteria

Verbatim from the roadmap item, split at its semicolons.

| Criterion | How satisfied | Test |
|---|---|---|
| Coldbox's durable product identity is reconciled as **Self-Custody Security Workstation**, with the finished v1 direction including a complete standalone single-signature Bitcoin wallet while current pre-release availability continues to come only from roadmap status | ADR-0059 (already on `main`) declares it; README, `design-system.md` §2, `package.json` and `SPEC.md`'s header amendment were reconciled in that commit. This branch closes the one remaining contradiction: `SPEC.md` §24 stated "It holds no keys and signs nothing" as a permanent rule. Availability still comes only from the roadmap — the manifest records the *prototype's* tags separately and the harness classifies from `ROADMAP.md`. | `ui.10a…: 'classification follows ROADMAP.md status'`, `'roadmap ownership comes from ROADMAP.md, not from the prototype tags'` |
| the replacement desktop/mobile design is produced for maintainer approval without altering production `src/` | `git diff --quiet origin/main HEAD -- src/` exits 0. | §3, and `git diff --stat` lists no `src/` path |
| the design remains recognizably the approved Coldbox comic aesthetic rather than a generic fintech/SaaS rebrand | Bangers display face, Comic Neue body, halftone field, 3px hard outlines, unblurred offset shadows and the yellow/cyan/pink/red/green fills are carried through — see the rendered captures in §3.2 and the token list in the handoff. **Judgement, not a test.** The maintainer approved the design; a reviewer should look at the renders rather than trust this row. | none — see §9 |
| information architecture is object/workflow-centered rather than tool-first while every current specialist capability remains mapped to a contextual or Advanced-tools destination | Rail groups are Workspace / Records / Trust & reference / Vault & settings / Sealed work — objects, not tool names. All 32 flows keep a direct route under **All flows index** (desktop) and **Every flow** (mobile). The handoff's coverage matrix maps all 35 old screen IDs; nothing was dropped. | `'the manifest inventory and navigation match the inert approved payloads'` asserts the 11 groups, the 5 bottom-bar slots, both More sheets and all 32 flows against the artifact bytes |
| exact navigation/grouping is owned by the maintainer-approved replacement mocks rather than predetermined by roadmap prose | Every navigation value in the manifest is extracted from the reference bytes, never hand-authored. The test re-derives them from the inert payload and compares. | same test |
| warm/cold authority, calm security panels, accessibility, 44px mobile targets, secret switcher/record identity, truthful unavailable future features, and offline/single-file constraints remain non-negotiable | The More sheet is realm-aware and the test proves no destination appears in both sheets, so a sealed capability is never reached through a warm one. Truthful unavailability is machine-checked. The rest are **design properties of the artifact** asserted by the handoff, and become *product* obligations at UI.10b/UI.11 — this item ships no UI. | `'the manifest inventory…'` (realm-aware More sheet), `'every manifest state is classified exactly once…'` (unavailability) |
| the redesign accommodates the accepted SEED/WAL/SEC concepts … without presenting unfinished functionality as currently available | The six wallet flows remain roadmap-owned and unavailable; maintainer decision D1 separately assigns `flow:paths` and `flow:addresses` to open `P1.4a`, while P1.4/P1.5 remain complete engines. Both derivation surfaces therefore classify `UNAVAILABLE` and carry PAR-009 until P1.4a is independently `[x]`. Seed lineage, root/child SeedQR and structured address identity have screens whose owners are SEED.1/2/3. | `'every manifest state is classified exactly once…'` asserts all six by name, both viewports, `UNAVAILABLE` + PAR-009 |
| after maintainer approval, the new desktop/mobile artifacts are imported as **new immutable reference files** with new hashes/byte sizes/viewports/screen inventory/navigation metadata | Two new `*.html.reference` files, `.gitattributes` already binds `*.html.reference binary`, and the manifest records all of it. | `'the workstation references are imported as new immutable byte-exact evidence'` |
| the old approved files remain byte-identical audit evidence | Both UI.4a artifacts are untouched; `verifyReferenceBytes()` checks **every** set, not just the current one, so drift in a retired artifact fails too. | `'the superseded toolkit set is retained and can never become current'`, plus the whole unchanged UI.4a suite |
| the manifest/harness unambiguously selects the new set as current | Exactly one set may be `current`, `manifest.current` must name it, a superseded set must name a real successor, and no two sets may share an artifact. One module answers the question. | `'an ambiguous or retired current selection fails closed'` — eight negative fixtures |
| reference-integrity/docs tests pass | 452/452, 0 skipped; `check-docs` 0 warnings. | §3 |

**Nothing in this table is marked met that isn't**, with judgement-only rows identified explicitly. The canonical scanner criterion is independently verified, and F1's missing automation is remediated in CI.

---

## 5. Security impact

| Boundary | Touched? |
|---|---|
| Realm boundary / cold CSP | No |
| Message schema | No |
| Vault format | No |
| Derivation | No |
| Randomness | No |
| `connect-src` hosts | No — none added |
| New message types | No |

`src/` is byte-identical to `origin/main`, so no shipped behaviour changed.

The one security-relevant property this item does carry: two untrusted prototype
artifacts entered the repository. Both are quarantined by the same mechanism as
the UI.4a pair — `findApprovedReferenceBuildInputs()` proves the transitive
product build-input graph never reaches them, and the built HTML is asserted not
to contain their copy or their bundler payload. The new tests assert both against
the *new* files specifically, not only the old ones.

**Where I am not certain:** the artifacts contain a full React runtime and a DC
bundler runtime as base64 resources. Nothing in the repository executes them, and
UI.11's harness will render them only in a disposable, network-blocked context —
but "nothing executes them" is a property of the current code, enforced by the
build-input graph test, not a property of the bytes. That is the same risk UI.4a
accepted and ADR-0049 reasoned about; this item does not widen it, and does not
reduce it either.

---

## 6. Test evidence

**New — `test/ui.10a-workstation-reference.test.js`, 10 tests:**

| Test | Proves |
|---|---|
| workstation references are immutable byte-exact evidence | manifest hashes/sizes/viewports match the maintainer's own DELIVERABLES table and the bytes on disk; the approving ADR path resolves; the binary line-ending rule survives |
| superseded toolkit set is retained and can never become current | both retired artifacts still exist, name their successor, share no file with the current set, and produce no comparison rows |
| an ambiguous or retired current selection fails closed | **8 negative fixtures** — see below |
| manifest inventory and navigation match the inert approved payloads | all 14 shell screens, all 32 flows (id *and* realm), 11 rail groups, 5 bottom-bar slots and both More sheets are re-derived from the reference bytes and compared; warm and cold More sheets are proven disjoint |
| every manifest state is classified exactly once | 92 unique rows, every one classified, every deviation registered and unduplicated, PAR-008 on exactly the mobile rows, the shared shell never `UNAVAILABLE`, all six roadmap-owned flows unavailable on both viewports, and **no stale `SCREEN_OWNERS` entry** |
| classification follows ROADMAP.md status | `[x]` → PARITY, `[ ]` and `[~]` → UNAVAILABLE, any-one-owner-built → PARITY, and a dependency mention cannot set a status |
| roadmap ownership comes from ROADMAP.md, not the prototype tags | all six documented corrections, and that no corrected owner is missing from the roadmap |
| workstation references stay outside every product build input | transitive graph clean; the new mock's copy is absent from `build/coldbox.html` |
| UI.10a and UI.10b gate UI.11 | the new dependency edges exist and the frozen `UI.8, UI.9, UI.10` / `P2.7, UI.11` lines are unrewritten |
| deviation register is finite, synchronized and forbids masks | register matches `ui-parity.md` exactly, masks empty, §6.2 names both new files |

**Negative tests — what I deliberately broke, and how it failed:**

| Sabotage | Failure |
|---|---|
| Marked both sets `current` | `Exactly one reference set may be current` |
| Pointed `manifest.current` at the retired set | `manifest.current does not name the set marked current` |
| Marked every set `superseded` | `Exactly one reference set may be current` |
| Made both sets declare the same artifact | `A reference file is declared by more than one set` |
| Deleted the superseded set from the manifest | `must retain the superseded set` |
| Added an undeclared `.html.reference` to the directory listing | `undeclared or missing snapshot` |
| Pointed `supersededBy` at a set that never existed | `does not name a set that replaced it` |
| Added a pixel mask | `Pixel masks are forbidden` |
| Invented deviation `PAR-CLOSE-ENOUGH` | `is not a registered PAR id` |
| Flipped a reference byte (retained UI.4a test) | `desktop approved reference changed bytes` |
| Claimed a wrong byte length (retained UI.4a test) | `desktop byte length drifted in manifest` |

The eight manifest fixtures run against `validateManifest()` in memory rather
than writing a fake approved package to disk. That is why `readManifest()` was
split into I/O and pure validation — the split has a real caller and exists to
make the sabotage testable, not for generality.

**Independent vectors:** the four reference hashes were re-derived with
`sha256sum` and independently match the hash table the maintainer's design
handoff shipped with, which was produced outside this repository. The BIP-39
wordlist used by the secret scan comes from the vendored `@scure/bip39` tarball,
which `npm run verify-vendor` re-downloads from the real registry and byte-checks.

**Could not test:** the two-engine browser harness — see §7.

---

## 7. Device matrix

**Not applicable to this item, and not deferred under ADR-0043 either.** UI.10a
carries no 🌐 marker, changes no `src/` byte, and ships no rendering, bootstrap,
CSP or storage behaviour. There is nothing on a device to test. UI.10b and UI.11
both carry 🌐 and inherit the real obligation.

| Platform | Result | Notes |
|---|---|---|
| all | **N/A** | no product change; `src/` byte-identical to `origin/main` |

**`npm run test:browser` was not run, and could not be.** The committed harness
requires both Chromium and Firefox binaries. In this session's environment
Playwright's downloads are blocked at the network layer
(`cdn.playwright.dev` → `403 blocked-by-allowlist`), a pinned Chromium build is
present but is a different revision than `playwright@1.62.1` expects, and no
Firefox binary is obtainable at all. This is a fact about the sandbox, not a
finding against the code. **CI's `browser-tests` job runs both engines on every
pull request** and is the witness for this branch; the reviewer should require a
green run at this exact head SHA. The offline render evidence in §3.2 was
produced by driving the locally present Chromium directly and covers one engine
only.

---

## 8. Assumptions made

1. **The maintainer's approval covers exactly the two `standalone/` files.** The
   handoff bundle also contains `.dc.html` sources, `coldbox-flows.js` and
   `support.js`; its README names the standalone pair as "Review this one" and
   they are the only self-contained artifacts. Only those two were imported.
   *If wrong:* the imported bytes are the wrong artifact and every hash in the
   manifest is wrong. Cheap to check — the hashes match the handoff's own table.
2. **Approval date 2026-08-19**, the date the maintainer gave the approval in
   this session, and the date on the handoff's `DELIVERABLES.md`.
   *If wrong:* an audit record is off by a day. Test-asserted, so it cannot drift
   silently.
3. **Set ids `toolkit-2026-08-15` and `workstation-2026-08-19`** — product
   identity plus approval date. Nothing existing named them.
4. **`[~]` does not certify a screen.** `classifyScreen()` treats only `[x]` as
   built. `[~]` means implemented and awaiting independent review, and certifying
   a screen against unreviewed work is what this contract exists to prevent.
   *If wrong:* screens whose owners are mid-review classify `UNAVAILABLE` and
   UI.11 would refuse to compare them. This is a deliberate fail-closed choice
   and a reviewer may reasonably disagree with it.
5. **Shell-screen owner mappings** (§9) are my judgement, not the artifact's.
6. **Every flow is listed on both viewports.** Both mocks read the same 32-flow
   model and both render `flow:` screens through the same engine; the test proves
   the two models are identical. Mobile reaches them through the More sheet and
   contextual actions rather than a rail.

---

## 9. What to scrutinise

**Start here — the owner mapping.** `SCREEN_OWNERS` in
`scripts/ui-reference-manifest.js` decides which of 92 states UI.11 will demand
pixel parity for. Get it wrong in one direction and UI.11 certifies a screen
whose feature does not exist; wrong in the other and a shipped screen escapes
certification. Fourteen of those entries are shell screens I mapped by judgement.
The three I am least sure of:

- `seeds` / `seedDetail` → `['UI.3', 'SEED.1'(, 'SEED.2')]`. Their predecessor is
  the shipped `secret` screen (UI.3 released-secret state and secret switcher),
  which SEED.1/SEED.2 later enrich. Because any one built owner yields PARITY,
  these classify PARITY. Map them to SEED alone and they become `UNAVAILABLE` —
  yet **Seeds is a mobile bottom-bar slot**, which would be a strange thing to
  certify as unavailable. I think PARITY is right and the enrichment is a rolling
  closure under §2, but this is the judgement call most worth a second opinion.
- `seedqr` → `['P1.10', 'SEED.3']`, same reasoning via shipped SeedQR.
- `reference` → `['P0.17', 'P4.10']`. **This one I found and fixed while
  starting UI.10b, rather than leaving flagged.** The UI.4a-era harness mapped it
  to `P4.10` alone, which classified it `UNAVAILABLE` — and the shipped app does
  render Reference as `nav-link-unavailable` with `data-roadmap-id="P4.10"`. But
  P0.17's help framework is built, P0.16's provenance panel is built, a live
  `#reference` route renders both today, and the approved artifact's own tag for
  this destination is **P0.17**, not P4.10. `P4.10 Reference` is a Phase 4 item
  that enriches the section, not the item that creates it. Leaving it wrong would
  have put UI.10a (screen unavailable) in direct contradiction with UI.10b, which
  must ship this destination live. Worth re-checking my reasoning: it is the one
  place where I overrode both an inherited mapping *and* the shipped app's own
  label in the same change.

A cross-check the reviewer can run cheaply — and which found a real discrepancy:

```
$ grep -o 'data-roadmap-id="[^"]*"' src/index.html src/cold/index.html | sort -u
warm: P3.1 P3.4 P3.9 P4.10
cold: P1.4 P1.5 P4.3 P4.5 P4.6 P4.8 P4.9
```

The shipped app's unavailable derivation entries are now reconciled by
**maintainer decision D1**, committed in
`docs/05-development/maintainer-decisions.md`. `P1.4` and `P1.5` remain
complete as derivation-engine work; they do not certify the replacement
workstation surfaces. `flow:paths` and `flow:addresses` are owned by
`P1.4a`. P1.4/P1.5 remain complete derivation engines; P1.4a is the open
surface item and therefore keeps both states `UNAVAILABLE` + `PAR-009` until
it is independently `[x]`. UI.10a does not make the currently disabled cold
navigation live merely to satisfy the matrix.
- The shipped cold rail also carries `data-roadmap-id="P4.3"`, a bare id the
  roadmap does not define — the same defect the prototype has, independently. It
  is split into P4.3a..P4.3e. This branch maps `flow:recovery` to all five.

`P4.8` (Animated QR) has no counterpart in the new design; device-transfer QR is
P0.13-owned and available. That is a deliberate consequence of the reorganisation,
not a dropped capability — the handoff's coverage matrix routes it through
Device-to-device vault transfer.

**Second — prototype roadmap tags and owner overrides are now fully auditable.** The manifest transcribes prototype tags for all fourteen shell screens as well as flows. The regression pins the complete divergence set: eight flow-level divergences plus the `seeds` and `seedqr` shell divergences.

| Flow | Artifact says | Actually |
|---|---|---|
| Send & review | WAL.5 | WAL.9 — WAL.5 is UTXO management |
| Level 3 signing | WAL.6 | WAL.8 — WAL.6 is the fee engine |
| Broadcast, RBF & CPFP | WAL.7 | WAL.10/11/12 — WAL.7 is the cold builder |
| PSBT inspector | WAL.10 | WAL.13 — WAL.10 is exact-byte broadcast |
| Coin control | WAL.4 | WAL.5 — WAL.4 is the receive workflow |
| Recovery assistant | P4.3 | P4.3a..P4.3e — bare P4.3 does not exist |
| Derivation paths | P1.4 | P1.4a — D1 separates the user-facing surface from the completed engine |
| Address derivation | P1.4 | P1.4a — D1 assigns the user-facing surface to the open item |
| Seeds (shell) | SEED | UI.3 / SEED.1 — the artifact carries a bare prototype phase label |
| Secret QR (shell) | SEED.4 | P1.10 / SEED.3 — SEED.4 owns the public identity graph/export, not the secret SeedQR surface |

PAR-005 authorises exactly this ("availability labels and roadmap phases come
from the current roadmap at build time, not the frozen prototype's statuses"), so
I did not add a deviation. **But an override that silently disagreed with the
approved artifact would be indefensible**, so the artifact's own tags are
transcribed into the manifest as `prototypeRoadmapTag` and a test asserts both
the transcription and that the corrected owner is not just the prototype's tag
copied through. Judge whether PAR-005 really stretches this far, or whether the
maintainer should instead be asked to correct the artifact. I would rather be
told to do the latter than have this pass unexamined.

**Third — I changed a frozen UI.4a test file.** `ui.4a-approved-mock-parity.test.js`
is the frozen parity regression and touching it deserves suspicion. Every
constant it asserts is unchanged; the diff redirects `manifest.references` →
`supersededSet.references` and adds three assertions (the retired set is still
marked superseded, is not current, and its artifacts still exist). It gained
strength, not slack. The file-list assertion necessarily loosened from "exactly
these two files" to "exactly the declared set" — verify that its replacement
still catches an undeclared artifact. It does, in
`'an ambiguous or retired current selection fails closed'`.

**Fourth — no new deviation ID, and one place I think may need one later.** The
handoff discloses that its QR codes are "deterministic decorative grids (21 × 21,
seeded from the payload string), not real encodings". Production renders real
encodings. That is not a fixture substitution, so PAR-007 arguably does not cover
it, and the module pattern inside the frame will differ pixel-for-pixel. I did
**not** add a PAR-010 for it, because a new deviation needs its own maintainer
approval and UI.10a is not the item that renders anything. UI.11 will have to
resolve it — either a normalizer under a new approved deviation, or a fixture
whose payload both sides encode identically. Flagging it now so it is not
discovered as a surprise at the final gate.

**Fifth — schema v2's shape.** I chose an array of named sets over, say, keeping
v1's top-level `references` and adding an `archive`. The array makes "exactly one
current" a checkable invariant instead of a convention. If a reviewer prefers a
different shape, now is the time — UI.11 is about to depend on it.

---

## 10. Self-assessment

**What might be wrong:**

- The owner mapping, as above. It is the highest-consequence judgement here.
- `createStateMatrix()` assigns each row a fixed deviation set by realm and
  viewport. That is inherited from the UI.11 branch's harness and is coarse: a
  row gets PAR-001/002 because it is warm, not because a light-theme token or a
  copy substitution actually applies to it. It is honest as an upper bound and
  the register is finite, but UI.11 may need per-state precision when normalizers
  become real. I kept the existing behaviour rather than invent a new one inside
  an import item.
- `parseRoadmapStatuses()` parses Markdown with a regex. I fixed one real bug in
  the inherited version — a dependency mention (`*Deps: P2.7, UI.11*`) used to set
  UI.11's status, so UI.11 read as complete from a line that only referenced it —
  and there is a test for it. Other Markdown shapes could still surprise it. The
  compact `P4.4 … · P4.5 …` bullets are handled; a heading style nobody has
  written yet is not.

**What I did not do that arguably should have been done:**

- Did not redundantly rerun the canonical PowerShell secret scanner during remediation; independent review already recorded canonical CLEAN plus positive-control evidence, and F1 fixes the missing CI automation.
- Did not run the two-engine browser harness (§7). No Firefox obtainable.
- Did not port `scripts/ui11-parity.js` forward. Argued in §2; a reviewer who
  reads UI.10a's "manifest/harness" clause as requiring the whole harness will
  disagree, and that is a legitimate reading I want tested rather than assumed.
- Did not touch `reference` → `P4.10` even though I suspect it is wrong (§9).

**Known limitations shipping with this:**

- The state matrix is a classification, not a comparison. Nothing here proves the
  product resembles the new references — it cannot, because the product is still
  the old shell. That is UI.10b and UI.11.

**Follow-up this creates:**

- **UI.10b** implements the shell. Its `SCREEN_OWNERS` mapping and the 92-row
  matrix are the contract it must satisfy.
- **UI.11** rebuilds the pixel driver against UI.10b's shell, `require()`s
  `scripts/ui-reference-manifest.js` for selection, and must resolve the QR
  normalizer question in §9.
- The unmerged `ui.11-approved-visual-parity-certification` branch now contains
  ~3,700 lines of CSS convergence aimed at the superseded references. It is real
  history and stays; it should not be merged as-is. Someone should decide
  explicitly whether to salvage `scripts/ui11-parity.js` from it or rewrite.

---

## 11. Bundle impact

| | Bytes |
|---|---:|
| Before (recorded `origin/main` baseline) | 2742786 |
| After (source-remediation commit `5a863766c7501c2609ccff52a1902f16725cfac2`) | 2742963 |
| **Delta** | **+177** |

Production `src/` is still byte-identical to `origin/main`. The non-zero
artifact delta comes from build provenance plus the D1/P1.4a roadmap record
compiled into UI.9's Tool Map, as detailed in §3.1. The four approved reference
artifacts remain repository evidence and contribute **0 direct reference-file
bytes** to the shipped HTML.

---

## 12. Docs updated

| Doc | Change |
|---|---|
| `docs/01-spec/ui-parity.md` | §1 now states that only the current set is binding and names the one module that decides. New **§6.2** records the 2026-08-19 approval, both sets, the IA summary, and that UI.10a imports and selects but does not certify. |
| `docs/05-development/ui-reference/README.md` | Explains the multi-set package; lists current and superseded files separately. |
| `docs/01-spec/SPEC.md` | §24's permanent "holds no keys and signs nothing" claim replaced with truthful current behaviour plus the accepted direction. |
| `docs/05-development/ROADMAP.md` | UI.10a `[ ]` → `[~]`; maintainer D1 also adds open P1.4a while P1.4/P1.5 remain complete engines. |
| docs/05-development/maintainer-decisions.md | Commits the binding maintainer decisions; UI.10a consumes D1 rather than choosing surface ownership author-side. |
| `CHANGELOG.md` | Unreleased entry. |

**No ADR added.** ADR-0059 already carries the structural decision and this item
executes it. The multi-set manifest is the mechanism ADR-0059 anticipated
verbatim: "the manifest/harness must eventually retain historical references
while selecting a new current set."

**No help content.** Nothing user-facing changed — `src/` is untouched.

**Doc hygiene:** no fact duplicated. Hashes, sizes, viewports, screens and
navigation live only in the manifest; §6.2 links rather than restates. Which set
is current is stated in the manifest and explained in §6.2; the README links to
both.

---

## 13. Independence disclosure

This packet's author also self-gated it. That gate is a **filter, not an
independent review** — it shares every assumption that produced the code. The
independent reviewer should weight it accordingly, and should be a different
session.
---

## 14. Remediation of independent review FAIL

Starting author-side remediation point: `15aec1b6171215c2f62df5b2707e7af08492c645`
(the independent FAIL report). Reviewed implementation: `7e7997a225ab52a16f9c24e3f50c82ac3b81a0ba`.
Source-remediation commit: `5a863766c7501c2609ccff52a1902f16725cfac2`.
The original review report remains unchanged as audit history.

| Finding | Resolution |
|---|---|
| **F1** | **Fixed.** CI now derives the approved-reference scan set from `manifest.json`, checks it against every `*.html.reference` on disk, and scans that exact set. No manual scanner rerun was performed; §3.3 records the already-satisfied canonical CLEAN + positive-control evidence. |
| **F2** | **Fixed per maintainer D1.** `flow:paths` and `flow:addresses` are owned by open `P1.4a`. P1.4/P1.5 remain complete engines. Both states stay `UNAVAILABLE` + `PAR-009` until P1.4a is independently `[x]`. |
| **F3** | **Fixed.** Both mobile More sheets are parsed from the inert approved mobile artifact and compared order-sensitively to the manifest in both directions. |
| **F4** | **Fixed.** The 11 desktop rail groups and five mobile bottom-bar slots are parsed in declaration order and deep-equaled to manifest metadata; containment-only checks are no longer the proof. |
| **F5** | **Fixed.** The current set transcribes prototype roadmap tags for all fourteen shell screens. The regression test enumerates every prototype/owner divergence, including `seedqr: SEED.4 → P1.10/SEED.3` and D1's `P1.4 → P1.4a` derivation-surface ownership. |
| **F6** | **Fixed.** Build evidence is tied explicitly to source-remediation commit `5a863766c7501c2609ccff52a1902f16725cfac2`: `f9f58a17b0fda5103d50d3e6d0ba5493d4a403e3fd8d16beffb00bac5ad394a4` (`2742963` bytes), reproduced twice. The packet-only closeout commit cannot move the source-path provenance timestamp. |
| **F7** | **Fixed.** §3.3 now names the actual non-BIP-39 words — `nectar`, `quarry`, `siphon` — and the longest consecutive in-list run (7). |
| **F8** | **Fixed.** Manifest validation requires positive integer render and comparison-region dimensions; negative fixtures prove zero/negative dimensions fail closed. |
| **F9** | **Fixed.** Dark rows no longer claim light-theme-only PAR-001. PAR-004 is applied exactly to `vault`, `create` and `flow:unlock` states. Regression coverage pins both applicability rules. |

**Verification at the source-remediation commit:** `npm ci`, `npm run
verify-vendor`, `npm run lint`, `npm run check-docs`, the complete Node test
suite with zero skips, `git diff --check`, and two reproducible builds all
passed. The PowerShell secret scanner was intentionally not rerun manually,
because the independent review already satisfied that content criterion and F1
was the missing automation.

UI.10a remains `[~]`. The independent reviewer, not the author, sets `[x]`.
