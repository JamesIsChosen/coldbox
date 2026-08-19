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
Documentation hygiene check passed: 264 markdown file(s) checked, 0 warning(s).

$ npm test
# tests 452
# pass 452
# fail 0
# skipped 0
# todo 0
```

452 passing, **zero skipped**. `origin/main` is 444; the eight new tests are 10
in `ui.10a-workstation-reference.test.js` minus two consolidations in the UI.4a
file (its file-list and byte-mutation assertions merged into the reworked
selection tests).

Reproducible build, two runs under different `TZ` and `LC_ALL`:

```
$ rm -f build/coldbox.html && TZ=UTC LC_ALL=C node scripts/build.js
$ sha256sum build/coldbox.html
a7d9c0eacf8b6093b7a4a4e4c4b14f6b9b3ede5317b05e813a94920399ac4fbf

$ rm -f build/coldbox.html && TZ=Pacific/Kiritimati LC_ALL=en_US.UTF-8 node scripts/build.js
$ sha256sum build/coldbox.html
a7d9c0eacf8b6093b7a4a4e4c4b14f6b9b3ede5317b05e813a94920399ac4fbf
```

### 3.1 The build hash changes, and here is exactly why

`src/` is byte-identical, but the artifact hash is not. A reviewer who diffs the
build against `origin/main` will see this immediately, so it is stated up front
rather than left to be discovered.

```
main   e1e09d68b6cb77bbd07814563f5a8d84908965c5fa28df46685ba2379ac11d3b  2742786 bytes
UI.10a a7d9c0eacf8b6093b7a4a4e4c4b14f6b9b3ede5317b05e813a94920399ac4fbf  2742786 bytes
```

**Identical byte length.** A byte-level diff finds 12 differing regions, all
accounted for by two causes:

1. `PROVENANCE_BUILD_DATE` moves from `2026-08-16T12:23:50-07:00` to this
   branch's commit time. `scripts/build.js` derives it from
   `git log -1 -- src scripts vendor`, which is **path**-scoped, not
   build-input-graph-scoped, so adding `scripts/ui-reference-manifest.js` moves
   it even though that file is not a build input. This cascades into the
   `coldbox-expected-hash` meta tag and the inline script's CSP `sha256-` pin.
   Eleven of the twelve regions are this one cause (one CSP pin, five in the
   expected-hash meta tag, five in the date literal itself). The same is true of the existing
   `scripts/ui11-parity.js`, `scripts/run-browser-harness.js` and
   `scripts/build-input-graph.js`, none of which are build inputs either — this
   is pre-existing behaviour, not something this branch introduces.
2. The UI.9 tool map, which compiles from `ROADMAP.md` at build time, now reads
   `"status":"in-progress"` for UI.10a instead of `"not-started"`. That is UI.9
   working as specified.

After normalising only the build date, the two artifacts are otherwise identical
in structure and length. **Bundle delta: 0 bytes.**

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

### 3.3 Secret-shaped-content scan — **partial, read §7**

UI.4a's acceptance requires the repository secret-shaped-content scanner to
report supplied artifacts clean before import. The canonical scanner is
PowerShell (`scripts/runner/secret-scan.ps1`) and **no PowerShell interpreter was
available in this session's environment**, so it was not the thing that ran.

What did run: a line-for-line Node port of `Invoke-ColdboxSecretScan`'s two
content rules — the `\b(?:xprv|yprv|zprv|tprv|uprv|vprv)[0-9A-HJ-NP-Za-km-z]{50,}`
extended-private-key shape, and a run of 12+ consecutive vendored-BIP-39-wordlist
words on one line — reading the same 2048-word list out of
`vendor/npm/@scure/bip39/2.2.0/package.tgz` and asserting it parses to exactly
2048 words, `abandon` first and `zoo` last, as the PowerShell does.

```
$ node <port> coldbox-workstation-desktop-mockup.html coldbox-workstation-mobile-mockup.html
CLEAN - no vault, private-key, or BIP-39 mnemonic-shaped content found in candidate text.
```

The port was also run against the **decoded** payloads — the gunzipped shared
flow model and both inert bundler templates — because the outer files are largely
base64 and a text scan of them alone proves little:

```
$ node <port> cbx-flows.js tpl-desktop.js tpl-mobile.js
CLEAN - no vault, private-key, or BIP-39 mnemonic-shaped content found in candidate text.
```

The handoff's own `DELIVERABLES.md` discloses "a public BIP-39 wordlist sample
used only as an illustrative reconstructed phrase". The longest such run in the
artifacts is 12 words on one line in the `forge:1` variant
(`ripple canyon velvet oyster timber plunge ladder nectar quarry siphon walnut orbit`)
— this is exactly the shape the rule targets, and it did **not** trip, because
`ripple`, `velvet` and `siphon` are not in the BIP-39 English list. The sample is
deliberately not a valid mnemonic. A reviewer should confirm that independently
rather than take it from here.

**🙋 Action required from the maintainer, on a Windows host:**

```powershell
. .\scripts\runner\secret-scan.ps1
Invoke-ColdboxSecretScan -Root '<path to the approved directory>' -RepoPath '<repo root>'
```

Until that runs, treat this criterion as **evidenced but not canonically
verified**.

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
| the redesign accommodates the accepted SEED/WAL/SEC concepts … without presenting unfinished functionality as currently available | Six flows are roadmap-owned; each is present in navigation on both viewports, classified `UNAVAILABLE`, and carries PAR-009. Seed lineage, root/child SeedQR and structured address identity have screens whose owners are SEED.1/2/3. | `'every manifest state is classified exactly once…'` asserts all six by name, both viewports, `UNAVAILABLE` + PAR-009 |
| after maintainer approval, the new desktop/mobile artifacts are imported as **new immutable reference files** with new hashes/byte sizes/viewports/screen inventory/navigation metadata | Two new `*.html.reference` files, `.gitattributes` already binds `*.html.reference binary`, and the manifest records all of it. | `'the workstation references are imported as new immutable byte-exact evidence'` |
| the old approved files remain byte-identical audit evidence | Both UI.4a artifacts are untouched; `verifyReferenceBytes()` checks **every** set, not just the current one, so drift in a retired artifact fails too. | `'the superseded toolkit set is retained and can never become current'`, plus the whole unchanged UI.4a suite |
| the manifest/harness unambiguously selects the new set as current | Exactly one set may be `current`, `manifest.current` must name it, a superseded set must name a real successor, and no two sets may share an artifact. One module answers the question. | `'an ambiguous or retired current selection fails closed'` — eight negative fixtures |
| reference-integrity/docs tests pass | 452/452, 0 skipped; `check-docs` 0 warnings. | §3 |

**Nothing in this table is marked met that isn't**, with two rows explicitly
flagged as judgement rather than test, and §3.3's scanner criterion flagged
partial.

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
- `reference` → `['P4.10']`, inherited from the UI.4a harness. This classifies
  `UNAVAILABLE`, which matches what the shipped app already shows
  (`src/index.html` renders Reference as `nav-link-unavailable` with
  `data-roadmap-id="P4.10"`) — but P0.17's help framework *is* built and a
  Reference route does render. I kept the existing precedent rather than change
  it inside this item. It may deserve its own correction later.

A cross-check the reviewer can run cheaply — and which found a real discrepancy:

```
$ grep -o 'data-roadmap-id="[^"]*"' src/index.html src/cold/index.html | sort -u
warm: P3.1 P3.4 P3.9 P4.10
cold: P1.4 P1.5 P4.3 P4.5 P4.6 P4.8 P4.9
```

Everything the shipped app marks unavailable lines up with this branch's
`UNAVAILABLE` set **except two, and they are worth a look:**

- **The shipped cold rail marks Derivation paths and Addresses unavailable with
  `P1.4`/`P1.5`, but the roadmap has both at `[x]`.** This branch therefore
  classifies `flow:paths` and `flow:addresses` as PARITY. One of the two is
  wrong: either the shipped nav under-claims a built feature, or those roadmap
  items are marked complete without a cold surface behind them. I did not change
  either — `src/` is out of scope here and the roadmap marker is a reviewer's to
  set — but **UI.10b cannot ship without resolving it**, because it decides
  whether those two destinations render or sit disabled.
- The shipped cold rail also carries `data-roadmap-id="P4.3"`, a bare id the
  roadmap does not define — the same defect the prototype has, independently. It
  is split into P4.3a..P4.3e. This branch maps `flow:recovery` to all five.

`P4.8` (Animated QR) has no counterpart in the new design; device-transfer QR is
P0.13-owned and available. That is a deliberate consequence of the reorganisation,
not a dropped capability — the handoff's coverage matrix routes it through
Device-to-device vault transfer.

**Second — the prototype's roadmap tags are wrong and I overrode them.** Five of
the six wallet flows are mislabelled in the approved artifact, and it names a
bare `P4.3` the roadmap does not define:

| Flow | Artifact says | Actually |
|---|---|---|
| Send & review | WAL.5 | WAL.9 — WAL.5 is UTXO management |
| Level 3 signing | WAL.6 | WAL.8 — WAL.6 is the fee engine |
| Broadcast, RBF & CPFP | WAL.7 | WAL.10/11/12 — WAL.7 is the cold builder |
| PSBT inspector | WAL.10 | WAL.13 — WAL.10 is exact-byte broadcast |
| Coin control | WAL.4 | WAL.5 — WAL.4 is the receive workflow |
| Recovery assistant | P4.3 | P4.3a..P4.3e — bare P4.3 does not exist |

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

- Did not run the canonical PowerShell secret scanner (§3.3). No interpreter.
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
|---|---|
| Before (`origin/main`) | 2,742,786 |
| After | 2,742,786 |
| **Delta** | **0** |

`src/` is byte-identical, so there is no bundle impact. The hash differs for the
reasons in §3.1. The four reference artifacts add 1,600,608 bytes to the
repository and 0 bytes to the shipped file.

---

## 12. Docs updated

| Doc | Change |
|---|---|
| `docs/01-spec/ui-parity.md` | §1 now states that only the current set is binding and names the one module that decides. New **§6.2** records the 2026-08-19 approval, both sets, the IA summary, and that UI.10a imports and selects but does not certify. |
| `docs/05-development/ui-reference/README.md` | Explains the multi-set package; lists current and superseded files separately. |
| `docs/01-spec/SPEC.md` | §24's permanent "holds no keys and signs nothing" claim replaced with truthful current behaviour plus the accepted direction. |
| `docs/05-development/ROADMAP.md` | UI.10a `[ ]` → `[~]`. |
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
