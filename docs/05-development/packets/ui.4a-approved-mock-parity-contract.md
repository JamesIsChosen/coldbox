# UI.4a — Approved desktop/mobile mock parity contract

Branch: `ui.4a-approved-mock-parity-contract`
Base: `main`
Date: 2026-08-15
Roadmap: [UI.4a](../ROADMAP.md#phase-ui--interface-restructure)

## 1. Summary

UI.4a makes the maintainer-approved desktop and mobile handoffs immutable,
repository-owned visual acceptance evidence without making their prototype code
a product input. It adds a binding parity/deviation contract, machine-readable
state inventory, negative integrity/build-isolation tests, and a final UI.11
parity gate that P2.8 cannot bypass. No product source, realm behaviour, vault
format, message, CSP or shipped byte is changed.

## 2. Scope

In scope:

- Byte-exact copies of the two maintainer-supplied handoffs under
  `docs/05-development/ui-reference/approved/`, stored with a non-HTML final
  extension and binary Git treatment.
- A manifest that freezes the approved hashes, sizes, render/comparison regions,
  complete desktop/mobile screen inventories, desktop group taxonomy, mobile
  bottom bars, deviation IDs and empty pixel-mask list.
- [The canonical parity contract](../../01-spec/ui-parity.md), including authority
  precedence, current-versus-future screen closure, exact evidence, a finite
  deviation register and change control.
- ADR-0049, documentation links, changelog entry and automated regression tests.
- UI.5 and UI.10 dependency tightening, UI.11 as the final certification gate,
  and P2.8 dependency on UI.11.

Deliberately out of scope:

- Any change under `src/`, or any attempt to make the current UI resemble the
  handoff. That work begins at UI.5 and is closed by UI.11.
- The UI.11 renderer, state driver, deterministic normalizers, screenshots or
  physical-mobile certification.
- Fake working screens for P3/P4/P5 features shown by the prototypes. Those
  destinations stay unavailable until their owning feature is implemented, then
  inherit the parity contract.
- Executing or trusting the prototype code during this item. It is parsed only
  as inert JSON/template data for inventory validation.

## 3. How to verify

Run from the repository root on branch
`ui.4a-approved-mock-parity-contract`.

### Reference safety and provenance

The repository scanner was run against temporary copies, so it did not write a
report into the immutable reference directory:

```text
$ $auditRoot = Join-Path ([IO.Path]::GetTempPath()) ('coldbox-ui4a-scan-' + [guid]::NewGuid().ToString('N'))
$ New-Item -ItemType Directory -Path $auditRoot
$ Copy-Item -LiteralPath docs/05-development/ui-reference/approved/coldbox-desktop-mockup.html.reference -Destination $auditRoot
$ Copy-Item -LiteralPath docs/05-development/ui-reference/approved/coldbox-mobile-mockup.html.reference -Destination $auditRoot
$ . ./scripts/runner/secret-scan.ps1
$ $scan = Invoke-ColdboxSecretScan -Root $auditRoot -RepoPath (Get-Location).Path
$ $scan | Format-List
Clean        : True
FindingCount : 0
SkippedCount : 0

$ Get-Content -LiteralPath (Join-Path $auditRoot scan-report.txt)
CLEAN - no vault, private-key, or BIP-39 mnemonic-shaped content found in candidate text.
SKIPPED-BINARY - 0 files.

$ Get-FileHash -Algorithm SHA256 -LiteralPath docs/05-development/ui-reference/approved/coldbox-desktop-mockup.html.reference,docs/05-development/ui-reference/approved/coldbox-mobile-mockup.html.reference
desktop  FB7FF0643BDA8F12A0A7E64DAEA91F51D74276CFC9BFB66C80BAAF874BB2DED9
mobile   AF0C1FE08E689F755869A6EB4CC06DCAF0F4D44B7DFE6426D6A322B464C7D7F8

$ Get-Item docs/05-development/ui-reference/approved/coldbox-desktop-mockup.html.reference,docs/05-development/ui-reference/approved/coldbox-mobile-mockup.html.reference | Select-Object Name,Length
coldbox-desktop-mockup.html.reference  526996
coldbox-mobile-mockup.html.reference   322927

$ git check-attr -a -- docs/05-development/ui-reference/approved/coldbox-desktop-mockup.html.reference docs/05-development/ui-reference/approved/coldbox-mobile-mockup.html.reference
binary: set
diff: unset
merge: unset
text: unset

$ Remove-Item -LiteralPath $auditRoot -Recurse -Force
```

The manifest repeats those machine values deliberately so the test can reject a
changed artifact or changed declaration independently.

The remediation adds a separately witnessable CI job named
`Approved UI reference secret scan`. At the final exact head it checks SHA-256
identity for temporary copies of both references, runs the same
`Invoke-ColdboxSecretScan` implementation, and fails unless `FindingCount` and
`SkippedCount` are both zero. Its run ID is recorded in the final evidence
section below.

### Focused tests

```text
$ node --test test/ui.4a-approved-mock-parity.test.js
✔ approved desktop and mobile references are immutable byte-exact evidence
✔ reference integrity guard rejects byte and manifest mutation fixtures
✔ manifest screen inventories and navigation match the inert approved payloads
✔ the deviation register is finite, synchronized and cannot hide pixels
✔ approved prototype payloads stay outside every product build input
✔ an imported helper consuming an approved reference fails the guard non-zero
✔ the transitive graph rejects a symlinked local helper
✔ roadmap dependencies cannot bypass the parity contract or final gate
ℹ tests 8
ℹ pass 8
ℹ fail 0
ℹ skipped 0
```

### Required static checks

```text
$ npm run lint
Lint passed: forbidden constructs, JavaScript syntax, and LF source line endings are valid.

$ npm run check-docs
Documentation hygiene check passed: 236 markdown file(s) checked, 0 warning(s).

$ npm run verify-vendor
Local vendor verified: 10 pinned packages
Upstream release verified: 10 pinned packages
Vendor verification passed against local files and upstream releases.
```

The first restricted `verify-vendor` attempt completed every local comparison but
ended `fetch failed` because outbound access was sandboxed. The required retry
with network permission verified all ten upstream releases and exited zero.

### Product-input isolation

```text
$ node -e "const path = require('node:path'); const { collectProductBuildInputFiles, findApprovedReferenceBuildInputs } = require('./scripts/build-input-graph.js'); const files = collectProductBuildInputFiles(process.cwd()); console.log('graph-files=' + files.length); console.log('brand-assets-in-graph=' + files.some((file) => file.endsWith(path.join('scripts', 'brand-assets.js')))); console.log('violations=' + JSON.stringify(findApprovedReferenceBuildInputs(process.cwd())));"
graph-files=70
brand-assets-in-graph=true
violations=[]

$ git diff --name-only main -- src scripts vendor assets package.json package-lock.json
scripts/build-input-graph.js
```

The centralized graph starts at `scripts/build.js`, resolves every transitive
local CommonJS module, and adds the product's non-code inputs from
`scripts/build-input-graph.js`. The guard fails closed on a missing module,
symlink, unsupported dynamic `require`, or an approved-reference marker in any
text input. `scripts/build-input-graph.js` is a guard-only module: it is not
required by `scripts/build.js` and is not consumed by the product build. The
focused test also runs the real build and rejects the prototype
bundler markers and mobile presentation-board marker in `build/coldbox.html`.

The negative fixture copies an imported `brand-assets.js` helper, makes it read
the frozen desktop reference, runs the guard in a child Node process, and
requires a non-zero exit with `brand-assets.js` in the diagnostic.

### Reproducible build

```text
$ npm run build
Built build/coldbox.html (9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7)

$ npm run build
Built build/coldbox.html (9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7)

first=9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7
first-sidecar=9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7
second=9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7
second-sidecar=9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7
REPRODUCIBLE=PASS
```

An earlier verification wrapper incorrectly compared the entire GNU-style
sidecar line, including `build/coldbox.html`, to the bare digest and therefore
exited one even though both displayed hashes matched. The corrected command
compared the sidecar's first field and produced the passing evidence above.

### Full suite

```text
$ npm test
ℹ tests 417
ℹ suites 0
ℹ pass 417
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

During development, an earlier 414-test revision first passed 409 and failed
five; every failure was `spawnSync git EPERM` in tests that create disposable Git
repositories. That unchanged revision passed 414/414 with the required
permission. The final suite above adds the imported-helper and symlink graph
regressions and passes 417/417 with the same permission.

`npm run test:browser` was not run. UI.4a has no browser-verifiable criterion and
changes no rendered product input; rendering the untrusted prototypes is
deliberately reserved for UI.11's network-blocked harness.

## 4. Acceptance criteria

The roadmap criterion is copied verbatim below:

> **Accept:** byte-exact, non-build copies of both approved handoffs are committed under `docs/05-development/ui-reference/approved/` with SHA-256, byte length, render viewport, product comparison region, navigation taxonomy and complete screen inventory in a machine-readable manifest; `.gitattributes` preserves the reference bytes on every platform; the repository secret-shaped-content scanner reports both supplied artifacts clean before import; [ui-parity.md](../01-spec/ui-parity.md) is the single canonical definition of exact parity, phase-UI versus rolling screen closure, deterministic state classification, zero-unexpected-pixel comparison, mobile evidence and the finite deviation register; [ADR-0049](../adr/0049-approved-mock-parity-contract.md) records why prototype code is quarantined and why later feature items inherit the visual contract; an automated test fails on any reference-byte/hash/size drift, manifest/reference screen or navigation drift, invented/missing deviation ID, loss of the binary line-ending rule, reference entry into a build input, or dependency change that lets UI.5, UI.10 or P2.8 bypass the contract/final gate; the reference payloads are parsed only as inert data in normal automation and are never executed, imported into `src/`, or emitted into `build/coldbox.html`; `src/` is byte-identical to `main`.

| Criterion area | How satisfied | Evidence |
|---|---|---|
| Exact approved artifacts and manifest | The two supplied files are copied byte-for-byte; the manifest carries both hashes, lengths, viewports/regions, navigation and all template-declared screens. | Hash/size output above; immutable-evidence and inert-payload tests |
| Cross-platform byte preservation | `*.html.reference` is binary in `.gitattributes`; Git reports `binary: set` and `text: unset`. | `git check-attr`; immutable-evidence test |
| Secret-shaped-content scan | Both candidate text files passed the repository's vendored-BIP39/xprv/vault scan with zero findings and zero skipped binaries before import. | Scanner output above |
| Canonical exact-parity semantics | `ui-parity.md` defines precedence, binding visual properties, state classification, zero-unexpected-pixel comparison, no masks, device evidence, rolling closure and nine finite deviations. | Deviation synchronization test; docs check |
| Structural rationale | ADR-0049 records immutable evidence, quarantine, the final gate, alternatives and risks. | ADR index and docs check |
| Drift and bypass failures | The test hard-codes approved evidence, parses both template payloads without execution, rejects a one-byte and metadata mutation, synchronizes deviation IDs, scans the complete transitive product-input graph, runs the build, proves an imported-helper violation exits non-zero, and pins roadmap dependencies. | Seven focused tests above |
| Prototype remains non-build data | References have a non-HTML final extension; no product input names them; the real artifact contains neither bundler markers nor the mobile board marker. | Build-isolation test; empty product-input diff |
| No product-source change | `git diff main -- src` and the broader product-input diff are empty. | Command above |

## 5. Security impact

- Realm boundary: **no change**.
- Message schema or new message type: **no change / none added**.
- CSP or `connect-src`: **no change / no host added**.
- Vault format, derivation or randomness: **no change**.
- Product runtime/build dependencies: **none added**. The prototype snapshots are
  explicitly outside every build input.

If this work is wrong, the most serious plausible failure is that executable
prototype material becomes trusted product input, or that a future implementer
uses a broad deviation/normalizer to hide real drift. The non-HTML extension,
binary hash pin, build-input scan, real-artifact negative assertions, empty mask
list, selector-cardinality requirement and fixed deviation IDs constrain those
paths.

The other security-sensitive risk is source content: arbitrary user-supplied
mockups could contain real secret material. Both exact files passed the
repository's established scanner before import, their hashes now prevent silent
replacement, and they are never executed. No claim is made that rendering them
would be safe outside UI.11's disposable network-blocked context.

## 6. Test evidence

New coverage in `test/ui.4a-approved-mock-parity.test.js` proves:

- exact reference names, bytes, hashes, viewports, comparison regions and binary
  Git treatment;
- a one-byte mutation and a manifest byte-length mutation fail the integrity
  guard;
- declared desktop/mobile screen order matches each inert `SCREENS` object;
- the ten desktop groups and both five-slot mobile bars match the approved data;
- the nine deviation IDs are exactly synchronized and pixel masks stay empty;
- current source/build inputs cannot name the references, and a real built HTML
  contains no approved bundler/presentation markers; and
- UI.5/UI.10 cannot bypass UI.4a, UI.11 cannot lose its prerequisites, and P2.8
  cannot bypass UI.11.

Vector sources: not applicable; this item adds no cryptography.

Negative tests: one-byte payload mutation, manifest-length mutation, changed
hash/metadata assertions, undeclared/missing artifact inventory, screen or
navigation disagreement, deviation mismatch, pixel-mask addition, product-input
reference, built-artifact marker leak and roadmap dependency drift all produce a
non-zero Node test result.

Not tested: prototype rendering, visual comparison, interaction, physical
devices, iOS local execution, Android, macOS, Linux or Tor. Those are not inferred
from static evidence and are assigned to UI.11 where the production visual exists.

## 7. Device matrix

UI.4a changes no rendered application byte. The matrix is recorded to make clear
that no device result is being inferred.

| Platform | Result | Notes |
|---|---|---|
| Windows Chrome | NOT APPLICABLE | No product rendering change; prototype was not executed. |
| Windows Firefox | NOT APPLICABLE | No product rendering change; prototype was not executed. |
| macOS Safari | UNTESTED | No macOS/Safari host available. |
| macOS Chrome | UNTESTED | No macOS host available. |
| Linux Firefox | UNTESTED | No Linux host used. |
| **iOS local-execution target** | UNTESTED | No device/build; no Quick Look or localhost inference. |
| Android Chrome (Files) | UNTESTED | No Android device used. |
| Tor Browser | UNTESTED | No Tor Browser used. |

## 8. Assumptions made

- The two files supplied by the maintainer in this request are the approved
  August 2026 desktop and mobile handoffs. Their repository hashes, not their
  original personal-machine paths or timestamps, are now the identity.
- The mock content is synthetic design data, not operational seed/private-key
  material. Basis: it is presented as a UI mock, and both full files pass the
  repository's established secret-shaped-content scanner. If that assumption is
  wrong, the immutable evidence would disclose content that should instead be
  replaced through the contract's maintainer-approval process.
- Exact parity means zero unexplained visible difference after only the nine
  registered security/product normalizations. It does not mean copying the
  prototype runtime or overriding accepted architecture.
- The mobile handoff's outer annotation board and device-frame styling are
  presentation context; the application composition inside the normalized
  product frame, including its guard/status row, is binding. PAR-008 is the only
  authority for that unwrapping.
- Future feature screens may not honestly be interactive at UI.11. Their
  navigation/unavailable treatment closes then; their full visual closes with
  the roadmap item that makes the feature real.
- Parsing the exact `const SCREENS`, `const ITEMS` and `const TABS` formatting is
  sufficient for this immutable version. A changed format also changes the
  approved hash and correctly requires a new approval rather than a permissive
  parser.

## 9. What to scrutinise

- Confirm the two binary blobs are the exact supplied files and contain no
  unreviewed operational secret despite the scanner result. This is the most
  important non-code trust boundary in the PR.
- Challenge each PAR-001 through PAR-009 scope. In particular, PAR-003 and
  PAR-007 must not become excuses for geometry drift, and PAR-009 must not let an
  already-built feature be classified unavailable.
- Check that the mobile normalizer exception removes only the presentation frame,
  not the approved guard/status row or product layout.
- Review the build-isolation test's fixed input set. It covers the current build
  graph and real artifact; if a future generic docs compiler broadens its input,
  this test must still catch the marker leak.
- Confirm UI.11's acceptance is strict enough to prevent percentage thresholds,
  masks, skipped rows, a device deferral or author-only visual assurance from
  closing parity.

## 10. Self-assessment

- This PR does **not** make the current UI look like the mock. It fixes the reason
  earlier work could pass without doing so and makes that correction a hard
  future gate.
- Exact cross-implementation pixel parity is deliberately expensive. UI.11 still
  has to build deterministic state drivers and narrow reference normalizers; the
  contract prevents reducing that burden silently.
- The raw handoffs add executable-looking content to repository history even
  though it is quarantined. A rendered screenshot-only baseline would reduce
  that appearance but would lose interactive states and reproducibility.
- No physical or browser rendering evidence exists for this item. That is an
  explicit limitation, not evidence deferred under ADR-0043.
- The scanner is the repository's defined secret-shaped gate, but no detector can
  prove that every arbitrary demo-looking number was never used operationally.
  Independent review should treat the maintainer-source assumption above as the
  primary residual risk.

Follow-up work is filed, not informal: UI.5–UI.10 implement the remaining
interface structure and UI.11 supplies the parity harness, corrections, evidence
and real mobile sign-off. Every later manifest screen inherits the same contract.

## 11. Bundle impact

Product build before: 2,667,256 bytes. Product build after: 2,667,239 bytes.
Delta: **-17 bytes**. The remediation changes only governance/build-input
evidence; the byte delta is the expected provenance-date update caused by the
new committed `scripts/` guard file. The remediation-tip build hash is
`9bb3ef11505d76c059bd196fa6aea02b9a9ab35ee491cf723924411f88b8b2d7`.

The two repository-only reference snapshots add 849,923 bytes to source history;
neither enters `build/coldbox.html`. The artifact remains inside the canonical
budget in [dependencies.md](../dependencies.md#bundle-budget).

## 12. Docs updated

- `docs/01-spec/ui-parity.md` — canonical parity, evidence and deviation contract.
- `docs/01-spec/design-system.md` and `docs/01-spec/SPEC.md` — authority links.
- `docs/05-development/adr/0049-approved-mock-parity-contract.md` and the ADR
  index — structural decision and alternatives.
- `docs/05-development/ui-reference/README.md` and `approved/manifest.json` —
  quarantine handling and machine source of truth.
- `docs/05-development/ROADMAP.md` — UI.4a `[~]`, tightened prerequisites,
  rolling-screen obligation, UI.11 final gate and P2.8 dependency.
- `docs/05-development/testing.md` — link to the single-sourced parity procedure.
- `docs/README.md` — parity contract in the specification index.
- `CHANGELOG.md` — UI.4a change record.
- This packet — commands, evidence, assumptions, limitations and review focus.

No guide/glossary/help-depth update is required because this item changes no
user-facing product behaviour or shipped Help content.

## 13. Remediation of review FAIL

The prior independent review of PR #60 returned FAIL with two findings. The
prior review record is preserved unchanged outside this remediation section;
this section records the author-side fixes and does not amend or rewrite that
verdict.

### F1 — Build-input isolation covered only a hand-picked subset

**Finding:** The original regression inspected `build.js`, `help-content.js`,
`package.json`, and `src/`, so an already-imported helper such as
`brand-assets.js` could begin consuming an approved reference without the UI.4a
guard failing.

**Remediation:** Added `scripts/build-input-graph.js`. It starts at
`scripts/build.js`, resolves every transitive local CommonJS `require`, adds the
centralized non-code product inputs, rejects unsupported dynamic requires and
symlinks, and scans every text file in the resulting graph. The focused test
now asserts that `scripts/brand-assets.js` is in the graph and that the clean
graph has zero violations. A temporary fixture copies an imported
`brand-assets.js`, makes it consume the frozen desktop reference, invokes the
guard in a child Node process, and requires a non-zero status naming the helper.

### F2 — The exact-reference secret scan was not independently witnessable

**Finding:** The packet contained author-side scanner output, but no exact-head
CI job that a Mode B reviewer could audit independently.

**Remediation:** Added the CI job `Approved UI reference secret scan`. It checks
out `${github.event.pull_request.head.sha || github.sha}`, copies exactly the
desktop and mobile `.html.reference` files to a runner-temporary directory,
verifies copy hashes, runs the repository's `Invoke-ColdboxSecretScan`, and
fails on any finding or skipped candidate file. It also requires the clean and
zero-skipped report lines. The job never writes to the immutable reference
directory.

The final exact-head SHA and CI run ID, including this job's result, are recorded
in the handoff and in the verification evidence added before push.
