# Review: UI.10a — Product identity and replacement approved mock design

**VERDICT: FAIL**

Findings: 9 (3 blocking, 6 advisory — all must be addressed)
Reviewed commit: `7e7997a225ab52a16f9c24e3f50c82ac3b81a0ba`
Reviewed by: independent agent session (Claude, `claude-opus-5`), separate from the authoring session
Review mode: CONNECTED
Date: 2026-08-19

The work is careful and the packet is unusually honest about its own soft spots.
Everything it asks to be scrutinised was scrutinised, and two of its open items
resolved **in its favour**: the canonical PowerShell secret scanner was obtained
and run (§1.6), and the offline-render claim reproduced exactly. The FAIL comes
from things the packet did not flag — chiefly that the one repository control
that exists to scan newly imported prototype artifacts never sees these two
files, and that a whole navigation surface recorded in the manifest is checked
against nothing.

---

## 1. What I verified

Environment: fresh `git clone` of `JamesIsChosen/coldbox` into a Linux container
(never against the maintainer's mounted working copy, per the campaign's standing
constraint), `refs/pull/67/head` fetched to a detached head at
`7e7997a225ab52a16f9c24e3f50c82ac3b81a0ba`.

**Node version deviation, disclosed:** `package.json` pins `node 24.16.0`;
`nodejs.org` and `nvm` are both blocked in this sandbox, so everything below ran
on **Node v22.22.2** (`npm ci` emits `EBADENGINE`). This is a weaker environment
than CI's. It is not a blind spot for the reproducibility claim specifically —
see §1.4, where Node 20 and Node 22 produce the identical artifact hash, and
where the packet's own recorded hash reproduced byte-exactly at the commit it was
written against.

### 1.1 The protocol's mandatory sequence

```
$ npm ci
added 2 packages, and audited 3 packages in 2s
found 0 vulnerabilities
EXIT=0

$ npm run verify-vendor
Local vendor verified: @fontsource/comic-neue@5.3.0
... (9 local)
Upstream release verified: @fontsource/bangers@5.3.0
Upstream release verified: @fontsource/comic-neue@5.3.0
Upstream release verified: @noble/ciphers@2.2.0
Upstream release verified: @noble/curves@2.2.0
Upstream release verified: @noble/hashes@2.2.0
Upstream release verified: @scure/base@2.2.0
Upstream release verified: @scure/bip32@2.2.0
Upstream release verified: @scure/bip39@2.2.0
Upstream release verified: argon2-browser@1.18.0
Upstream release verified: qrcode-generator@1.4.4
Vendor verification passed against local files and upstream releases.
EXIT=0

$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.
EXIT=0

$ node scripts/check-docs.js
Documentation hygiene check passed: 264 markdown file(s) checked, 0 warning(s).
EXIT=0

$ npm test
# tests 452
# pass 452
# fail 0
# skipped 0
# todo 0
EXIT=0
```

452 passing, **zero skipped**, matching the packet. The vendored bytes were
re-downloaded from the real npm registry by `verify-vendor`, not merely compared
against the project's own manifest.

### 1.2 `src/` is untouched

```
$ git diff --quiet origin/main pr67 -- src/ && echo "SRC BYTE-IDENTICAL"
SRC BYTE-IDENTICAL
```

`git diff --name-status b1208aa pr67` lists twelve paths, none under `src/`, and
exactly one roadmap marker changes (`UI.10a` `[ ]` → `[~]`). One roadmap item in
the PR.

### 1.3 Reference bytes

```
coldbox-desktop-mockup.html.reference               bytes=526996  sha256=fb7ff0643bda8f12a0a7e64daea91f51d74276cfc9bfb66c80baaf874bb2ded9
coldbox-mobile-mockup.html.reference                bytes=322927  sha256=af0c1fe08e689f755869a6eb4cc06dcaf0f4d44b7dfe6426d6a322b464c7d7f8
coldbox-workstation-desktop-mockup.html.reference   bytes=397090  sha256=e657a14d86428f5558bf5655b12d05d3e9b732ac403c5344f73e60dd1d85066c
coldbox-workstation-mobile-mockup.html.reference    bytes=353595  sha256=f4deca09c69151985e9e960282999bed0bb8c4828b2718cc573a02d2d811e2aa
```

All four match the manifest and the packet. The two UI.4a artifacts still match
the constants frozen in `test/ui.4a-approved-mock-parity.test.js`, which that
file asserts independently of the manifest. **I could not compare the two new
files against the maintainer's own handoff copy** — it is not in the repository
and not on the connected disk. See §2.

### 1.4 Reproducibility, across path, timezone, locale and Node major

```
$ npm run build && sha256sum build/coldbox.html
c7ad5d0df95c5432a8a95a4f89004544de7c21a8b4e6c55763d566169d098630   2742786 bytes

$ rm -rf build && npm run build && sha256sum build/coldbox.html
c7ad5d0df95c5432a8a95a4f89004544de7c21a8b4e6c55763d566169d098630   (match)
```

Then re-run from a **different path containing a space and a dot**
(`/var/tmp/cbx alt-path.review/deep dir/repo`):

```
TZ=Pacific/Kiritimati LC_ALL=C.utf8   → c7ad5d0df95c5432a8a95a4f89004544de7c21a8b4e6c55763d566169d098630
TZ=Asia/Kolkata       LC_ALL=POSIX   → c7ad5d0df95c5432a8a95a4f89004544de7c21a8b4e6c55763d566169d098630
TZ=UTC  /opt/node20/bin/node          → c7ad5d0df95c5432a8a95a4f89004544de7c21a8b4e6c55763d566169d098630
```

Four independent builds, three timezones, three locales, two Node majors, two
paths: one hash. The build is reproducible.

`origin/main` builds to `e1e09d68b6cb77bbd07814563f5a8d84908965c5fa28df46685ba2379ac11d3b`,
2 742 786 bytes — exactly the baseline the packet records, and exactly the same
length as this branch's artifact, confirming the **0-byte bundle delta** claim.

The packet's own recorded hash, `a7d9c0ea…`, reproduces byte-exactly — but at
`af34a1d`, not at the reviewed head. See **F6**.

### 1.5 Deliberate breakage — every one exits non-zero

| Sabotage | Result | Exit |
|---|---|---|
| Flipped one byte in the **current** desktop reference | `not ok 1 - the workstation references are imported as new immutable byte-exact evidence` | 1 |
| Flipped one byte in the **superseded** mobile reference | fails in *both* the UI.10a and the frozen UI.4a suites | 1 |
| Added an undeclared `rogue-extra.html.reference` | `The approved reference directory contains an undeclared or missing snapshot` | 1 |
| Removed a declared reference file | same guard | 1 |
| Marked both sets `current` | `Exactly one reference set may be current` | 1 |
| Pointed `manifest.current` at the retired set | `manifest.current does not name the set marked current` | 1 |
| Zeroed a manifest `sha256` | `verifyReferenceBytes` mismatch | 1 |
| Added a pixel mask | `Pixel masks are forbidden by the parity contract` | 1 |
| Appended `Math.random()` to `src/cold/codex32.js` | `Forbidden construct "Math.random" in src/cold/codex32.js:555:17`; **build refuses** | 1 / 1 |
| Flipped one byte in `vendor/npm/@noble/hashes/2.2.0/package.tgz` | `Vendor SHA-256 mismatch`; build refuses | 1 / 1 |
| Removed `vendor/` entirely | build refuses | 1 |
| Named a reference file in a comment inside `src/main.js` | `findApprovedReferenceBuildInputs` → `['src/main.js']`, test fails | 1 |
| Made `scripts/build.js` `require()` the manifest module | → `['scripts/ui-reference-manifest.js']`, test fails | 1 |
| `npm run test:browser` with no Playwright binaries | `Playwright browser binaries are missing (chromium, firefox)` — **refuses, does not skip** | 1 |

The build-input isolation guard is real and catches both the textual and the
module-graph route. The browser harness fails closed rather than self-skipping,
and the committed harness at this head still requires **both** engines — the
campaign's uncommitted Chromium-only patch has not leaked into a commit
(`grep CBX_CHROMIUM scripts/run-browser-harness.js` → no match).

One breakage did **not** fail: see **F8**.

### 1.6 The canonical secret scanner — run, and clean

The packet flags this as "evidenced but not canonically verified" and asks the
maintainer to run it on Windows. That is no longer necessary. PowerShell 7.4.6
was obtained and installed in this container, and the repository's own scanner
was dot-sourced and run unmodified:

```
$ pwsh -NoProfile -File /tmp/scan.ps1
    . ./scripts/runner/secret-scan.ps1
    Invoke-ColdboxSecretScan -Root /tmp/scanroot -RepoPath (Get-Location).Path

CLEAN - no vault, private-key, or BIP-39 mnemonic-shaped content found in candidate text.
SKIPPED-BINARY - 0 files.
EXIT=0
```

`/tmp/scanroot` held byte-exact copies of both new artifacts and nothing else.
`.html.reference` is not in the scanner's binary-skip list, so both files were
scanned as candidate text — `SKIPPED-BINARY - 0 files` proves it.

I verified the scanner was actually armed rather than silently degraded:

```
WORDLIST OK count=2048 abandon=True ripple=True nectar=False
```

and ran a **positive control** — a file containing twelve consecutive BIP-39
words dropped into the scan root:

```
FAILED - 1 finding(s). Paths only; matched content is deliberately not printed.
BIP-39 mnemonic-shaped word run in positive-control.txt
EXIT=1
```

I also wrote an independent Python implementation of both content rules (not the
packet's Node port) and ran it over the raw artifacts and over every decoded
payload — the four gzipped JS/text resources extracted from each file's inert
bundler manifest. Raw artifacts: clean, longest BIP-39 run **10**. The only
`>= 12` run anywhere is inside the minified React runtime, where `case` and
`return` are themselves BIP-39 words — a heuristic artifact of minified
JavaScript, not content, and not reachable by the canonical scanner, which does
not decode payloads.

**The substance of UI.4a's inherited scanner criterion holds for the new
artifacts.** What does not hold is that the *repository* establishes it — see
**F1**.

### 1.7 Offline render, and the aesthetic criterion

Both new references were rendered in headless Chromium with the context set
`offline: true` and every non-`file://` request aborted at the route level:

```
workstation-desktop | blocked: 0 | errors: 0 | h1font: Bangers, Impact, "Arial Narrow Bold", sans-serif
workstation-mobile  | blocked: 0 | errors: 0 | h1font: Bangers, Impact, sans-serif
toolkit-desktop     | blocked: 0 | errors: 0 | h1font: Bangers, Impact, "Arial Narrow Bold", sans-serif
```

Zero blocked requests because zero were attempted, and zero page errors. §3.2
reproduces exactly.

I looked at the renders rather than trusting the packet's row: Bangers display
face, Comic Neue body, halftone dot field, 3px hard outlines, unblurred offset
shadows, the yellow/cyan/pink/red/green fills, the striped hazard rail. This is
the Coldbox comic aesthetic, not a fintech rebrand.

### 1.8 Independent re-derivation of the manifest's navigation and flow model

Rather than re-run the branch's own tests, I parsed the artifacts myself and
compared every field:

- **32 flows**, each `id`, `realm`, `family`, `title`, `steps` and
  `prototypeRoadmapTag` compared against the artifact's `FLOWS` array —
  **0 mismatches**.
- The six `availability: "roadmap-owned"` flows are exactly the six the artifact
  marks `Roadmap · not built` (`send`, `signing`, `broadcast`, `psbt`,
  `coincontrol`, `source`) — **6 occurrences, 6 flows, exact match**.
- **11 rail groups** in `WARM_NAV`/`COLD_NAV` (5 warm, 6 cold), same labels and
  same order as the manifest.
- **5 mobile bottom-bar slots** in `TABS`, same labels and order.
- `MORE_WARM` (10 entries) and `MORE_COLD` (16 entries) match the manifest's
  `mobileMore` exactly, and are disjoint.

**The manifest's data is faithful to the approved bytes.** That is a real
positive result and it is worth stating plainly. The findings below are about
what the repository *proves*, not about whether the numbers happen to be right.

### 1.9 Roadmap parser

`parseRoadmapStatuses()` takes each id's status from the **first** checkbox line
naming it. I enumerated every checkbox line in `ROADMAP.md` that names more than
one id (10 of them, e.g. `P3.3 … shipped in WAL.2–WAL.3 · P3.4 …`, `P4.4 · P4.5
… SEC.7a … P4.6 … SEED.2`, `P5.4 · P5.5 … WAL.13 …`) and confirmed that for
**every** id with its own definition line, that definition line is the first one
that names it. No id currently takes its status from a foreign line. The
`*Deps:*` fix is real: `statuses.get('UI.11') === ' '` despite P2.8's dependency
mention.

---

## 2. What I could not verify

Every entry here is a finding in the protocol's sense; the two that block an
acceptance criterion are written up in §4.

1. **That the imported bytes are the bytes the maintainer approved.** The design
   handoff and its `DELIVERABLES.md` hash table are not repository artifacts and
   are not on the connected disk. I can attest the two files are internally
   consistent, self-contained, render as a coherent Coldbox workstation design,
   and hash to what the manifest says — I cannot attest they are *the approved
   ones*. Only the maintainer can close this, by comparing the four hashes in
   §1.3 against their own copy. This is inherent to the reviewer's position, not
   a defect in the branch, but it must not be recorded as verified.
2. **Firefox.** One reviewer machine, one engine. The committed harness needs
   both and Playwright's CDN is blocked here. I could not witness CI either —
   this session has no GitHub API access for the repository (`add_repo` is not
   available), so I could not confirm a green `browser-tests` run at this head.
   UI.10a ships no `src/` byte and carries no 🌐, so nothing rendering is at
   stake for *this* item; recorded so the gap is not inherited silently.
3. **Node 24.16.0.** Unobtainable here (see §1). Reproducibility was demonstrated
   across Node 20 and 22 instead.
4. **Cross-OS build comparison.** Linux only. CI's `compare-hashes` job covers
   Ubuntu vs Windows; I did not witness it.
5. **`scripts/runner/test-secret-scan.ps1`** — the scanner's own self-test hung
   past a five-minute timeout in this container and I stopped it rather than
   report a result I did not have. The scanner's behaviour was instead
   established directly, by the positive control in §1.6.

---

## 3. Acceptance criteria

Verbatim from `ROADMAP.md` UI.10a, split at its semicolons.

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Coldbox's durable product identity is reconciled as **Self-Custody Security Workstation**, with the finished v1 direction including a complete standalone single-signature Bitcoin wallet while current pre-release availability continues to come only from roadmap status | ✅ | ADR-0059 is already on `main`; this branch closes the last contradiction in `SPEC.md` §24, which stated "It holds no keys and signs nothing" as a permanent rule. The replacement text states current behaviour and names the direction without claiming it ships. Availability is computed from `ROADMAP.md` by `classifyScreen()`, never from the prototype's tags — I confirmed the prototype's tags are recorded separately and are not the source. |
| 2 | the replacement desktop/mobile design is produced for maintainer approval without altering production `src/` | ✅ | `git diff --quiet origin/main pr67 -- src/` exits 0 (§1.2). |
| 3 | the design remains recognizably the approved Coldbox comic aesthetic rather than a generic fintech/SaaS rebrand | ✅ | Rendered both artifacts myself and looked at them (§1.7). Bangers/Comic Neue, halftone field, 3px hard outlines, unblurred offset shadows, the established fill palette. |
| 4 | information architecture is object/workflow-centered rather than tool-first while every current specialist capability remains mapped to a contextual or Advanced-tools destination | ✅ | Rail groups are Workspace / Records / Trust & reference / Vault & settings / Sealed work and Seeds & lineage / Forge / Derive / Split & carry / Recover & verify / Session — objects and workflows, not tool names. I mapped all 16 shipped warm routes in `src/main.js` `routeDetails` and every labelled cold destination in `src/cold/index.html` onto the new design: all reachable, via **All flows index** (desktop) / **Every flow** (mobile) where not top-level. The single shipped label with no counterpart is *Animated QR*, which is `P4.8` and renders `cold-nav-link-unavailable` today — an unbuilt roadmap item, not a current capability. |
| 5 | exact navigation/grouping is owned by the maintainer-approved replacement mocks rather than predetermined by roadmap prose | ✅ | Verified by re-deriving all 11 groups, 5 bottom-bar slots, both More sheets and all 32 flows from the artifact bytes myself (§1.8). The manifest is faithful. **But the repository does not establish this** — see **F3** and **F4**. |
| 6 | warm/cold authority, calm security panels, accessibility, 44px mobile targets, secret switcher/record identity, truthful unavailable future features, and offline/single-file constraints remain non-negotiable | ❌ | The design-side properties hold: the mobile mock states the 44px floor, retained pinch-zoom and a persistent airgap guard; the More sheet is realm-aware and provably disjoint, so a sealed capability is never reached through a warm one. The one half this item *mechanises* — truthful unavailability — is wrong for two states: `flow:paths` and `flow:addresses` classify `PARITY` while the shipped cold rail renders both as `cold-nav-link-unavailable`. See **F2**. |
| 7 | the redesign accommodates the accepted SEED/WAL/SEC concepts … without presenting unfinished functionality as currently available | ✅ | Six wallet flows present on both viewports, all `UNAVAILABLE` + `PAR-009`; `flow:passphrase`, `flow:children`, `flow:descriptors` and `flow:recovery` likewise unavailable against their `[ ]` owners. Seed lineage (`seeds`, `seedDetail`), root/child SeedQR (`seedqr`, `flow:qrstudio`) and structured address identity (`flow:addresses`, `flow:descriptors`) all have screens. |
| 8 | after maintainer approval, the new desktop/mobile artifacts are imported as **new immutable reference files** with new hashes/byte sizes/viewports/screen inventory/navigation metadata, the old approved files remain byte-identical audit evidence, and the manifest/harness unambiguously selects the new set as current | ✅ | Hashes/sizes verified (§1.3); viewports 1440×940 and 880×1000 with a 390×844 product frame; 46 screens per viewport; `.gitattributes` binds `*.html.reference binary`. The retired pair is byte-identical and still asserted by the frozen UI.4a suite. Selection is unambiguous and fails closed on every fixture I could invent (§1.5). I accept the packet's §2 reading that "the manifest/**harness**" is satisfied by `scripts/ui-reference-manifest.js`: porting a browser driver bound to the old shell would produce several hundred lines with no caller and nothing to compare against. |
| 9 | reference-integrity/docs tests pass. External design handoffs or working mock files are not repository artifacts unless and until the maintainer separately approves their import | ✅ | 452/452, 0 skipped; `check-docs` 264 files, 0 warnings. Only the two standalone artifacts were imported; no `.dc.html`, `coldbox-flows.js` or `support.js` appears in the diff. |

UI.4a's inherited import control — *"the repository secret-shaped-content
scanner reports both supplied artifacts clean before import"* — is satisfied on
the evidence (§1.6) but **not by the repository**: see **F1**.

---

## 4. Findings

### F1 — CI's approved-reference secret scan never sees the two new artifacts

**Severity:** blocking
**Location:** `.github/workflows/ci.yml:205-268` (job `approved-ui-reference-secret-scan`), unchanged by this branch

**Observed:** The job hard-codes the file list it will scan:

```yaml
$expected = @(
  'coldbox-desktop-mockup.html.reference',
  'coldbox-mobile-mockup.html.reference'
)
```

It copies exactly those two into a temporary root, then asserts the root contains
exactly them (`throw 'Temporary scan root does not contain exactly the two
approved references'`), then scans. UI.10a adds two new untrusted prototype
artifacts to the same directory and does not touch this job. The consequence is
not a failure — it is a **pass that means less than it says**. The job goes green
at this head while `coldbox-workstation-desktop-mockup.html.reference` and
`coldbox-workstation-mobile-mockup.html.reference` are never opened. Nothing else
in the repository scans them: `grep -rn "secret-scan|SecretScan" .github/ test/
scripts/` finds this job, the scanner, its self-test, and the bundle template —
no other caller.

The job's own comment states its purpose as *"so a read-only reviewer can witness
the approved UI snapshots being scanned at the exact PR head without trusting an
author-side packet."* A Mode B reviewer would read that green check as covering
the artifacts this PR imports. It does not.

This also makes packet §3.3 under-informed rather than merely incomplete: it
reports that no PowerShell interpreter was available and asks the maintainer to
run the scanner by hand, without mentioning that the repository already runs that
exact scanner in CI on every pull request and that extending it was a two-line
change inside this item.

**Failure scenario:** A future approved-mock import lands a file containing an
extended-private-key shape or a real mnemonic. CI reports
`Approved UI reference secret scan passed: findings=0, skipped=0`, because the
new file was never copied into the scan root. The control that exists precisely
to catch this is bypassed by construction, silently, forever.

**Expected:** The job derives its file list from the manifest — every
`references.*.file` across every set — or at minimum asserts that the set of
`*.html.reference` files on disk equals the set it scanned, so that adding a
reference without adding it to the scan is a hard failure rather than a silent
omission.

**Required action:** Extend `approved-ui-reference-secret-scan` to scan every
declared reference in `docs/05-development/ui-reference/approved/`, driven off
`manifest.json` rather than a literal list, and fail closed when the directory
contains a `.html.reference` the job did not scan. For the record: I ran the
canonical scanner on both new artifacts manually and it is **CLEAN** (§1.6) — the
finding is the missing automation, not the content.

---

### F2 — Two cold screens classify PARITY against a product that renders them unavailable, and the contradiction is left open

**Severity:** blocking
**Location:** `scripts/ui-reference-manifest.js:92-93` (`'flow:paths'`, `'flow:addresses'`); packet §9

**Observed:** `SCREEN_OWNERS` maps both to `['P1.4', 'P1.5']`; both are `[x]` in
`ROADMAP.md`; `classifyScreen()` therefore yields `PARITY` for four of the 92
matrix rows. The shipped application disagrees:

```
src/cold/index.html:41  cold-nav-link-unavailable ... data-roadmap-id="P1.4" ... Derivation paths
src/cold/index.html:42  cold-nav-link-unavailable ... data-roadmap-id="P1.4" ... Addresses
```

P1.4 and P1.5 are *derivation engine* items. No cold surface exists behind them.
`ui-parity.md` §4.2 and UI.11's acceptance define `PARITY` as "every already-built
feature"; these two are not built features, and the matrix asserts they are.

The packet finds this itself and states it plainly: *"One of the two is wrong:
either the shipped nav under-claims a built feature, or those roadmap items are
marked complete without a cold surface behind them. I did not change either."*
That is exactly the situation the review protocol names — *"something is unclear
enough that you'd need to ask the author"* — and it cannot be closed by a
reviewer.

It is also inconsistent within this same PR. The head commit `7e7997a` remaps
`reference` from `['P4.10']` to `['P0.17', 'P4.10']` on precisely this reasoning
— an inherited mapping contradicting reality, corrected inside an import item,
overriding both the inherited map and the shipped app's own `data-roadmap-id`.
(That correction is right: `#reference` is a live route, reached from *Verify this
file* and *Provenance & legal*, and the approved artifact's own tag for the
destination is `P0.17`.) The same class of contradiction, in the same file, in the
same PR, was resolved once and deferred once.

**Failure scenario:** UI.11 consumes this matrix and demands zero unexpected
changed pixels for `desktop/flow:paths`, `mobile/flow:paths`,
`desktop/flow:addresses` and `mobile/flow:addresses` against a product where those
destinations are disabled chrome. Every one fails, or — worse — UI.10b ships live
surfaces for them to satisfy the matrix, shipping UI for an item nobody scheduled.

**Expected:** One of three, decided rather than deferred: the roadmap gains an
item owning the derivation *surfaces* and these two map to it (the natural home is
a new roadmap item owning the derivation surfaces); or `P1.4`/`P1.5` are demoted from `[x]`;
or the shipped nav is corrected and the classification stands. The choice is the
maintainer's; leaving all three open is not one of them.

**Required action:** Resolve the ownership of `flow:paths` and `flow:addresses`
with the maintainer and encode the outcome in `SCREEN_OWNERS`, with a test that
pins the resulting classification so it cannot drift back.

---

### F3 — The mobile More sheet is recorded in the manifest and checked against nothing

**Severity:** blocking
**Location:** `test/ui.10a-workstation-reference.test.js:339-347`;
`docs/05-development/ui-reference/approved/manifest.json` (`navigation.mobileMore`)

**Observed:** The test asserts only that the two More-sheet lists are non-empty
and disjoint. It never compares either against the artifact. `validateManifest()`
does not look at `mobileMore` at all. So 26 navigation labels — a complete
navigation surface, and the *only* route to sixteen sealed destinations on
mobile — are hand-authored data that nothing verifies.

Demonstrated:

```
$ python3 -  # replace mobileMore with invented labels
   warm: ['Fabricated Warm A', 'Fabricated Warm B']
   cold: ['Fabricated Cold A']

$ npm test
# tests 452
# pass 452
# fail 0
# skipped 0
EXIT=0
```

The entire suite stays green with every real label deleted and replaced by
fiction. Twenty-six of the manifest's navigation values, gone, unnoticed.

This directly contradicts two packet claims. §4, against the criterion "exact
navigation/grouping is owned by the maintainer-approved replacement mocks":
*"Every navigation value in the manifest is extracted from the reference bytes,
never hand-authored. The test re-derives them from the inert payload and
compares."* And §6: *"11 rail groups, 5 bottom-bar slots and both More sheets are
re-derived from the reference bytes and compared."* Both More sheets are not.

The recorded values *are* correct — I extracted `MORE_WARM` and `MORE_COLD` from
the mobile artifact myself and they match exactly (§1.8). The defect is that the
repository proves nothing about them, while the packet says it does.

**Failure scenario:** UI.10b builds the mobile More sheet from
`manifest.navigation.mobileMore`, as it is meant to. A transcription slip — one
label dropped, a sealed destination moved into the warm list — passes every
committed check. The disjointness assertion still passes, because a wrong-but-
disjoint pair is disjoint. A sealed capability appears in the warm sheet and the
suite is green.

**Expected:** `mobileMore.warm` and `mobileMore.cold` re-derived from the mobile
artifact's `MORE_WARM`/`MORE_COLD` blocks, exactly as `set.flows` is re-derived
from `FLOWS`, and compared with `deepEqual` in both directions.

**Required action:** Extend `'the manifest inventory and navigation match the
inert approved payloads'` to parse both More-sheet blocks out of the inert
template and `assert.deepEqual` them against the manifest. Correct the two packet
claims to describe what the test does.

---

### F4 — Group and bottom-bar checks are one-directional

**Severity:** advisory
**Location:** `test/ui.10a-workstation-reference.test.js:320-337`

**Observed:** Both artifact-side checks are containment, not equality:

```js
for (const group of EXPECTED_GROUPS) {
  assert.ok(desktopNav.includes(`['${group.label}', [`), ...);
}
...
for (const label of EXPECTED_MOBILE_TABS) {
  assert.ok(mobileTabLine.includes(`'${label}'`), ...);
}
```

Each proves *manifest ⊆ artifact*. Neither proves *artifact ⊆ manifest*, and
neither checks order. A twelfth rail group or a sixth bottom-bar slot present in
an approved artifact but omitted from the manifest is invisible to the suite; so
is a reordering. `EXPECTED_GROUPS` and `EXPECTED_MOBILE_TABS` pin the manifest,
so today's values cannot drift — but the artifact is the authority, and the
direction that matters is the one not checked.

Compare `set.flows`, which is done correctly: `deepEqual` in both directions
against the artifact's own `FLOWS` array, plus an explicit `length === 32`.

**Failure scenario:** A future approved set adds a rail group. The manifest omits
it, every test passes, and UI.11 certifies pixel parity against a navigation
taxonomy that is missing a group the maintainer approved.

**Expected:** Parse the group labels and tab labels out of the template in
declaration order and `deepEqual` against the manifest, with an explicit count.

**Required action:** Replace both containment loops with order-sensitive
equality against values extracted from the artifact.

---

### F5 — An undisclosed seventh prototype-tag correction, and shell-screen tags are transcribed nowhere

**Severity:** advisory
**Location:** `scripts/ui-reference-manifest.js:72` (`seedqr`); packet §9 second block;
`test/ui.10a-workstation-reference.test.js:433-459`

**Observed:** The packet enumerates the prototype's roadmap-tag errors as *"Five
of the six wallet flows … and it names a bare `P4.3`"* — six corrections, in a
table, each transcribed into the manifest as `prototypeRoadmapTag` and asserted by
`'roadmap ownership comes from ROADMAP.md, not from the prototype tags'`.

There is a seventh. The approved desktop artifact tags the Secret QR destination
`SEED.4`:

```
['seedqr', 'Q', 'Secret QR', 'SEED.4']
```

`SCREEN_OWNERS` maps it `['P1.10', 'SEED.3']`. The correction is right —
`SEED.3` is *Root/child SeedQR quick action*; `SEED.4` is the *public
wallet/account/address identity graph and xpub/descriptor export*, a different
item entirely — but it is not in the §9 table, not in the six-correction test, and
not recorded anywhere as an override.

The underlying cause is structural: `prototypeRoadmapTag` exists only on
`set.flows`. The fourteen **shell** screens have no such field, so no shell-screen
tag is transcribed and no shell-screen override is auditable against the reference
bytes. `seedqr` is the one where that gap currently hides a real disagreement;
the warm rail's bare `SEED` tag on `seeds` is a second, milder instance.

This matters more than a documentation slip because §9's stated safeguard is
exactly this: *"an override that silently disagreed with the approved artifact
would be indefensible, so the artifact's own tags are transcribed into the
manifest."* For shell screens, they are not.

**Failure scenario:** A reviewer or a future maintainer audits the overrides by
reading the §9 table and the test, concludes six exist, and never learns that a
mobile bottom-bar-adjacent sealed screen was re-owned from one SEED item to
another.

**Expected:** Shell screens carry a transcribed prototype tag the same way flows
do, and every divergence between transcribed tag and `SCREEN_OWNERS` is
enumerated in one place that a test pins.

**Required action:** Add the shell screens' artifact tags to the manifest, extend
the ownership test to cover all divergences rather than the six flow ones, and
add `seedqr: SEED.4 → SEED.3` to the packet's §9 table.

---

### F6 — The packet's build hash does not reproduce at the reviewed head

**Severity:** advisory
**Location:** packet §3 and §3.1

**Observed:** §3 records the reproducible-build result as
`a7d9c0eacf8b6093b7a4a4e4c4b14f6b9b3ede5317b05e813a94920399ac4fbf`, and §3.1's
comparison table repeats it as the branch's artifact hash. At the reviewed head
`7e7997a` the artifact is
`c7ad5d0df95c5432a8a95a4f89004544de7c21a8b4e6c55763d566169d098630`.

I confirmed the cause rather than assuming it: building at `af34a1d`, the commit
the packet was written on, reproduces `a7d9c0ea…` exactly. The head commit
`7e7997a` touches `scripts/ui-reference-manifest.js`, which moves
`PROVENANCE_BUILD_DATE` from `2026-08-19T08:49:33+00:00` to
`2026-08-19T09:08:17+00:00` — the very mechanism §3.1 exists to explain. The
packet documents the mechanism and is then overtaken by it.

`doc-hygiene.md` is explicit that a number in prose that no longer matches
reality is a defect, and a build hash is the highest-consequence number in this
packet: it is the one value a later auditor uses to decide whether a rebuild of
this commit is authentic. As written it tells them a correct rebuild is wrong.

**Failure scenario:** Someone rebuilds `7e7997a` in a year to check the artifact,
gets `c7ad5d0d…`, compares against the packet, and concludes either that the
build is not reproducible or that the tree was tampered with.

**Expected:** §3 and §3.1 record the hash of the commit the packet ships on, or
state which commit each hash belongs to.

**Required action:** Update both hashes to the head the PR is reviewed at, and —
because this will recur every time a packet-touching commit lands — say in §3
which commit produced them.

---

### F7 — §3.3's stated reason the BIP-39 sample does not trip is factually wrong

**Severity:** advisory
**Location:** packet §3.3

**Observed:** The packet explains why the artifacts' illustrative twelve-word
phrase does not trip the mnemonic rule:

> The longest such run in the artifacts is 12 words on one line … `ripple canyon
> velvet oyster timber plunge ladder nectar quarry siphon walnut orbit` — this is
> exactly the shape the rule targets, and it did **not** trip, because `ripple`,
> `velvet` and `siphon` are not in the BIP-39 English list.

Two of the three named words *are* in the list. Checked against the vendored
`@scure/bip39@2.2.0` wordlist, both with my own parser and with the repository's
own `Get-ColdboxBip39EnglishWordSet`:

| ripple | canyon | velvet | oyster | timber | plunge | ladder | nectar | quarry | siphon | walnut | orbit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ✅ in | ✅ in | ✅ in | ✅ in | ✅ in | ✅ in | ✅ in | ❌ **not** | ❌ **not** | ❌ **not** | ✅ in | ✅ in |

Nine of twelve are in the list. The words that break the run are `nectar`,
`quarry` and `siphon` — none of which the packet names — and the longest
in-list run in that phrase is therefore **7** (`ripple` … `ladder`), well under
the rule's threshold of 12. The conclusion is right; the reasoning offered for it
is not.

The packet ends that paragraph with *"A reviewer should confirm that
independently rather than take it from here."* I did, which is how this surfaced.

**Failure scenario:** The rationale is load-bearing for a security control on
untrusted imported content. A future importer reasons "the sample is safe because
words like `ripple` and `velvet` aren't BIP-39 words," carries that false premise
to a different artifact, and clears a phrase that is nine-tenths of a real
mnemonic with a longer in-list run.

**Expected:** The three words that actually break the run, named correctly, with
the resulting run length.

**Required action:** Correct §3.3. The paragraph can now also record that the
canonical scanner has been run and is clean (§1.6 of this report), which removes
the maintainer action item it currently carries.

---

### F8 — `validateManifest()` does not validate the comparison region

**Severity:** advisory
**Location:** `scripts/ui-reference-manifest.js:155-166` (`assertReferenceShape`)

**Observed:** `renderViewport.width` and `renderViewport.height` are both checked
with `Number.isInteger`. `comparisonRegion` is checked only for `kind`:

```js
assert.ok(Number.isInteger(reference.renderViewport.width), ...);
assert.ok(Number.isInteger(reference.renderViewport.height), ...);
assert.ok(['full-viewport', 'product-frame'].includes(reference.comparisonRegion.kind), ...);
```

Its dimensions are never validated. Confirmed by breaking it — the one sabotage
in §1.5 that did not fail:

```
$ # comparisonRegion: {kind:'full-viewport', width:'not-a-number', height:null}
$ node -e "require('./scripts/ui-reference-manifest.js').readManifest()"
exit=0
```

`readManifest()` accepts it silently. The full suite still fails, because
`EXPECTED_CURRENT` in the test file pins the current set's region by `deepEqual`
— but that is a hard-coded fixture for one set, not the validator. The module
whose stated job is *"validates the manifest's shape and fails closed"* does not
fail closed here, and a superseded set or a future third set has no such fixture
behind it.

This is the field UI.11's acceptance singles out: *"the parity harness … reads its
viewports, comparison regions, navigation and screen lists directly from the
approved manifest."*

**Failure scenario:** A future approved set is added with a malformed or missing
comparison region. `readManifest()` passes, and UI.11's driver crops to `NaN` or
throws deep inside a screenshot loop, far from the cause.

**Expected:** `comparisonRegion.width` and `.height` validated as positive
integers alongside `renderViewport`, with a negative fixture in the eight-fixture
sabotage test.

**Required action:** Add the two assertions and a ninth negative fixture.

---

### F9 — The state matrix applies deviations that cannot apply, and omits one that can

**Severity:** advisory
**Location:** `scripts/ui-reference-manifest.js:330-341` (`createStateMatrix`)

**Observed:** Deviations are assigned by realm and viewport alone:

```js
const deviations = realm === 'cold'
  ? ['PAR-003', 'PAR-005', 'PAR-007']
  : ['PAR-001', 'PAR-002', 'PAR-005', 'PAR-007'];
```

Two concrete consequences, not merely the coarseness §10 concedes:

- **`PAR-001` is applied to every warm row, and every row is emitted with
  `theme: 'dark'`.** PAR-001 permits exactly one difference — *"the shipped
  light-theme token values replace the three superseded values proposed by the
  handoff."* It cannot apply to a dark-theme state. All 46 warm rows claim a
  deviation that is unreachable in the state they describe, and the matrix
  contains no light-theme row at all.
- **`PAR-004` is applied to no row.** It permits the vault-naming difference —
  sealed creation flow, encrypted real name, `coldbox--<id8>.cbx` filename — and
  the matrix contains `create`, `vault` and `flow:unlock` rows, which are exactly
  the states where the prototype's name-bearing treatment differs from what UI.10
  shipped. Under this matrix that difference has no registered deviation to sit
  under and would count as an unexpected changed pixel.

`PAR-006` is likewise never emitted, though as a blanket non-binding statement
about the prototype's bundler that is defensible.

The suite asserts every emitted deviation is registered and unduplicated, which
is true and weaker than correct: it cannot catch a deviation that is registered,
unduplicated and inapplicable.

**Failure scenario:** UI.11 rebuilds its driver on this matrix, as the packet
intends. The vault-creation screens fail parity on a difference the contract
explicitly permits, and the failure is opaque because PAR-004 is nowhere in the
row.

**Expected:** Either per-state deviation assignment, or — if that genuinely
belongs to UI.11 — a comment and a test pinning the current assignment as a
deliberate upper bound, plus PAR-004 on the vault-naming rows and `theme` no
longer hard-coded to a value that contradicts PAR-001.

**Required action:** Add `PAR-004` to the `create`/`vault`/`flow:unlock` rows and
resolve the `PAR-001`/`theme: 'dark'` contradiction — either by emitting light
rows or by dropping PAR-001 from rows that cannot exhibit it.

---

## 5. Verdict rationale

The engineering here is good and most of it verified cleanly on an independent
machine: `src/` is untouched to the byte, the build is reproducible across four
environments, every fail-closed path I could think to attack exits non-zero, the
manifest's data is faithful to the approved bytes in every field I re-derived, and
the two items the packet left open both resolved in its favour once I obtained a
PowerShell interpreter and a browser. The selection machinery — one current set,
one module that decides, eight negative fixtures — is the right design and it
works.

It fails on three things. The repository's one automated control for scanning
newly imported prototype artifacts is hard-coded to the two files this item
supersedes, so it goes green without opening either new file, in a project whose
whole reason for quarantining these artifacts is that they are untrusted (**F1**).
A complete navigation surface is recorded in the manifest and verified by nothing
— I replaced all 26 More-sheet labels with invented text and 452 tests passed —
while the packet states twice that it is re-derived from the reference bytes
(**F3**). And a contradiction the author found, wrote down clearly, and chose not
to resolve is still open, in the same file where the identical class of
contradiction was resolved one commit earlier (**F2**). Six further findings are
smaller but none is cosmetic: an undisclosed override in a security-adjacent
mapping, two packet claims that do not survive checking, a validator that accepts
a malformed comparison region, and a deviation assignment that is demonstrably
wrong per row rather than merely coarse.

**To make this a PASS:** extend the CI secret-scan job to every declared
reference and fail closed on an unscanned one (F1); resolve `flow:paths` /
`flow:addresses` ownership with the maintainer and pin it (F2); compare both More
sheets, the rail groups and the bottom bar against the artifact bytes in both
directions (F3, F4); transcribe shell-screen prototype tags and disclose the
`seedqr` override (F5); correct the build hash and the BIP-39 rationale in the
packet (F6, F7); validate the comparison region (F8); fix the PAR-004 omission and
the PAR-001/dark-theme contradiction (F9). Then request re-review — a fresh
verdict on the new head, not an amendment to this one.

The roadmap marker stays at `[~]`. Nothing merges.

---

## 6. What I did not check

- The two new artifacts against the maintainer's own handoff copy — not available
  to me (§2.1). The four hashes in §1.3 are what the maintainer should compare.
- Firefox, any physical device, and any CI run — no engine, no device, no API
  access to the repository (§2.2, §2.4).
- Node 24.16.0 (§2.3).
- `scripts/runner/test-secret-scan.ps1` (§2.5).
- Style, naming and formatting, per the protocol.
- The unmerged `ui.11-approved-visual-parity-certification` branch, and UI.10b's
  in-flight work. Out of scope for this item.
---

## Fresh independent re-review - PASS (2026-08-20)

**Reviewed head:** `4b888571387396480325e9ee4a01f8a0ff7f6abf`
**Mode:** READ-ONLY, CI-witnessed Mode B
**Verdict:** **PASS - 0 findings**

The prior FAIL report above is preserved as review history. This re-review independently
re-checked all nine findings F1-F9 and every UI.10a acceptance criterion against the
exact remediated PR head.

### Prior findings

- **F1 - FIXED.** Approved-reference CI scanning is manifest-driven and fail-closed.
  The exact-head CI scanner inventories every manifest-declared reference, rejects
  unsafe or duplicate paths and undeclared `*.html.reference` files, verifies
  source/copy hashes, and fails on findings or skipped files. Exact-head CI scanned
  all four current and superseded references with `findings=0` and `skipped=0`.
- **F2 - FIXED.** Maintainer decision D1 is implemented: `flow:paths` and
  `flow:addresses` are owned by open **P1.4a**, while P1.4 and P1.5 remain complete
  derivation engines. Until P1.4a ships those destinations classify
  `UNAVAILABLE` with `PAR-009`.
- **F3 - FIXED.** Mobile More navigation is compared against the approved reference
  artifact, including the warm and cold lists.
- **F4 - FIXED.** Desktop rail groups, mobile bottom-bar slots, and More lists are
  exact and order-sensitive rather than one-directional containment checks.
- **F5 - FIXED.** Prototype tags are represented audibly, including the seventh
  `seedqr` divergence (prototype `SEED.4` vs canonical P1.10/SEED.3), without using
  prototype tags as roadmap truth.
- **F6 - FIXED.** Packet build/test provenance is reconciled. Exact-head CI reproduced
  458/458 passing tests and build SHA-256
  `f9f58a17b0fda5103d50d3e6d0ba5493d4a403e3fd8d16beffb00bac5ad394a4`
  at 2,742,963 bytes.
- **F7 - FIXED.** Packet BIP-39 discussion correctly identifies `nectar`, `quarry`,
  and `siphon` as the non-list breakers and records a maximum valid-word run of 7.
- **F8 - FIXED.** Comparison-region geometry now requires positive integer width and
  height, matching viewport validation.
- **F9 - FIXED.** Deviation applicability is state-specific: `PAR-004` is limited to
  vault/create/unlock rows, `PAR-009` marks unavailable rows, and dark rows do not
  inherit light-theme-only `PAR-001`.

### Acceptance and verification

All UI.10a acceptance criteria are satisfied. The immutable workstation desktop/mobile
references and superseded UI.4a references verify at their declared hashes; exactly one
reference set is current; the 46-screen-per-viewport / 32-flow inventory and exact
desktop/mobile navigation are derived from the approved artifacts; truthful availability
comes from roadmap ownership/status; production `src/` remains unchanged by this design
import; and the approved comic visual identity/offline behavior remain supported by the
unchanged exact reference bytes and prior independent render evidence.

Mode B exact-head CI run **32341539920** was audited and succeeded at the reviewed SHA:
458 tests passed with zero failures/skips, documentation hygiene checked 266 Markdown
files with 0 warnings, Chromium and Firefox browser harnesses passed, Ubuntu and Windows
reproducible builds matched at
`f9f58a17b0fda5103d50d3e6d0ba5493d4a403e3fd8d16beffb00bac5ad394a4`, and the
approved-reference scanner reported all four references clean with no skips.

The canonical secret-scan criterion is carried forward from the prior independent evidence,
as instructed: `Invoke-ColdboxSecretScan`, PowerShell 7.4.6, CLEAN, zero skipped binaries,
and a 12-word BIP-39 positive control correctly failed with exit 1. No redundant manual
secret scan was required for this re-review.

**Final independent verdict: PASS. UI.10a may be marked `[x]` and merged.**