# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each released version records the SHA-256 of its HTML artifact, so this file doubles as a historical hash record. A hash listed here should match the `.sha256` in the corresponding GitHub release and the CI build attestation.

---

## [Unreleased]

Foundation work in progress. Full wallet workflows remain ahead; the P0.10 cryptographic layer, P0.11 vault format, P0.12 KDF benchmark, and P0.13 lock/save/load surface are now present behind the cold-realm boundary. See [ROADMAP.md](docs/05-development/ROADMAP.md) for item-level status.

### Added — P0.18 CI (2026-08-07)

- New `.github/workflows/ci.yml`: a `build` job matrixed across `ubuntu-latest` and `windows-latest`, each leg running `npm run verify-vendor` (the one networked step, re-downloading every vendored release from the real npm registry), `npm run lint`, `npm run check-docs`, `npm test`, then building twice in the same checkout and diffing the two `coldbox.html.sha256` files (the "a nondeterministic change fails CI" acceptance criterion). A `compare-hashes` job downloads both OS legs' hash sidecars and fails if they differ (the "second-OS build comparison" criterion). A per-OS bundle size report is appended to the job's step summary. An always-run `browser-tests` job installs Playwright's browsers and runs `npm run test:browser` — GitHub-hosted runners have outbound network access, unlike the offline dev sandbox every prior packet in this project notes cannot download Playwright's binaries. A tag/release-gated `attestation` job uses `actions/attest-build-provenance` against `build/coldbox.html`.
- `scripts/check-docs.js` gained an eighth check — `TODO`/`TBD` in user-facing docs (`docs/00-overview/glossary.md`, `docs/03-guides/`), WARN severity, matching `doc-hygiene.md`'s "Automated checks" table entry that the other seven checks (all already implemented, predating this item's own work in this branch's history) had not yet covered. Three new negative-fixture tests added to `test/check-docs.test.js`, alongside the existing coverage for the other seven checks (broken links fail, missing review dates fail, stale review dates warn, unknown roadmap IDs fail, `dependencies.md`/`vendor-manifest.json` mismatches fail, missing help-content depth blocks fail).
- **[ADR-0017](docs/05-development/adr/0017-ci-workflow-structure.md):** records why the workflow is one file with four jobs rather than one job doing everything — cross-OS comparison needs its own job because a matrix leg can't see another leg's filesystem, `browser-tests` is unconditional rather than path-filtered (a per-job path filter needs either a workflow-level trigger that would also skip doc-hygiene checks, or a new third-party Action dependency this item doesn't justify adding yet), and why attestation is gated to tags/releases and its actual success is unverified pending repository secrets only the human can configure.
- **What is not verified from this authoring session:** GitHub Actions itself cannot be executed here. Every equivalent local command passes (see the PR packet for exact output: `npm test` 149/149, `npm run lint`, `npm run verify-vendor --offline`, `npm run check-docs`, two local builds producing an identical hash), and the workflow YAML parses cleanly with the expected trigger/job structure, but the real GitHub Actions run — including the cross-OS comparison, the browser-tests job on a real hosted runner, and the attestation step — has not been observed. `npm run verify-vendor` without `--offline` also could not be exercised in this session; the authoring sandbox has no outbound network access at all.
- **Independent review of PR #30 returned FAIL (1 blocking finding, 2 advisory, all remediated in this branch before re-review):**
  - **F1 (blocking):** every build-producing job used `actions/checkout`'s bare defaults, which on `pull_request` events check out GitHub's synthetic merge commit at `fetch-depth: 1` (shallow), not the real PR head SHA with full history. Since `build.js` derives its embedded build date from `git log -1 -- src scripts vendor`, the shallow synthetic checkout produced a build byte-different from a full-history local build of the same commit — the reviewer's real hosted-CI artifact hash (`e6b94f7...`) did not match two independent fresh full-history local clones' hash (`8891368...`), violating the roadmap's "CI hash matches a local build" acceptance criterion. Fixed by adding explicit `ref: ${{ github.event.pull_request.head.sha || github.sha }}` and `fetch-depth: 0` to every `actions/checkout` step in `ci.yml` (`build`, `browser-tests`, and `attestation` jobs).
  - **F2 (advisory):** `checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `download-artifact@v4`, and `attest-build-provenance@v1` all emitted GitHub's Node-20-deprecation warning. Bumped to the current Node-24-runtime majors, confirmed via each action's GitHub Releases API at the time of this fix: `checkout@v7`, `setup-node@v6`, `upload-artifact@v7`, `download-artifact@v8`, `attest-build-provenance@v4`. No input/output names used by this workflow changed across those major bumps (confirmed against each action's README at the pinned tag); a reviewer should re-check these are still current at merge time, since action releases move.
  - **F3 (advisory):** the packet's local double-build hash was computed before `scripts/check-docs.js` existed in history, so it didn't reflect the tip it claimed to describe. Packet regenerated against the actual current tip — see its "Remediation of review FAIL" section for the reproduced hash and the disclosure that a sandbox-vs-CI hash mismatch is now an *expected*, disclosed consequence of the sandbox's Node version and lack of live CI, not evidence of nondeterminism.
- Roadmap item set to `[~]`, never `[x]` — the marker is the independent reviewer's to flip.

### Fixed — P0.18 CI, R3 remediation (2026-08-07)

- **Independent review of PR #30 returned FAIL a third time** (zero blocking, two advisory) at tip `106ed85`, even though the actual roadmap acceptance criteria were independently confirmed green on a real hosted GitHub Actions run: both OS legs of `build`, `compare-hashes`, the browser harness, and the documentation/fail-closed checks all passed. Per this project's binary review protocol, the two advisory findings still block merge.
  - **R3-F1 (advisory):** the R2 remediation's comments in `scripts/build.js` and its packet text (§14) overclaimed `writeFileAtomic()`'s guarantee — stating it makes the build "correct under concurrent invocation, regardless of what triggers the concurrency," which reads as safety under multiple concurrent *writers*, not just a reader racing one writer. The reviewer reproduced a real Windows `EPERM: operation not permitted, rename` from six concurrent real build processes racing the same shared path. Chose not to build untested multi-writer retry/backoff logic (this project's real usage — `--test-concurrency=1` in `npm test`, single-process normal builds — never triggers concurrent writers, and `build.js` isn't structured to make that path unit-testable without a larger refactor beyond this item's scope); instead narrowed the code comment above `writeFileAtomic()` in `scripts/build.js` to state precisely what's guaranteed (atomic visibility to a reader under a single writer) and what isn't (multi-writer safety), naming the reviewer's reproduced Windows failure as the concrete limit. No executable behavior changed — `writeFileAtomic()` already failed closed (throws on a `renameSync` failure) both before and after this fix.
  - **R3-F2 (advisory):** the packet's cited build hash (`8891368...`) had gone stale relative to this round's tip. Regenerated from this round's actual working tree (`438a28e83f3467ddd4d54628cfb35c4412cb21c8a43703a8d4185cfe7ae8264e`, reproduced twice); flagged explicitly as provisional, since `readBuildCommitDate()` derives the embedded build date from `git log HEAD`, and this authoring sandbox cannot commit — so the true final hash will shift again the moment the human's commits for this round land, even though no application logic changed.
- Roadmap's P0.18 entry gets one additional sentence recording the R3 FAIL and this round's remediation, consistent with how R1/R2 were recorded; the `[~]` marker is untouched (never the author's to flip).
- **What remains unverified:** identical to R2 — a fresh hosted-Windows `npm test` run and full `compare-hashes` pass against this round's actual committed tip, plus (new this round) the true final build hash once that tip actually exists. This sandbox cannot trigger GitHub Actions or write git history.

### Fixed — P0.18 CI, R2 remediation (2026-08-07)

- **Independent review of PR #30 returned FAIL a second time** (1 blocking, 2 advisory), at tip `57ebcc4`, this time from a real hosted GitHub Actions run rather than static inspection: `build (ubuntu-latest)` passed and its hash matched an independent full-history local build, but `build (windows-latest)` failed inside `npm test` (148/149) on `test/help-content.test.js`'s single-JSON-statement assertion, skipping the `compare-hashes` job entirely.
  - **R2-F1 (blocking):** root-caused to a genuine test-suite race condition, not the line-ending theory first suspected. `test/build.test.js`, `test/help-content.test.js`, and `test/provenance.test.js` each spawn their own `node scripts/build.js` against the same shared real-tree path (`build/coldbox.html`), and Node's test runner ran test files concurrently by default (`"test": "node --test"`, no concurrency flag); `writeBuild()`'s plain `fs.writeFileSync` could leave a reader observing a file truncated mid-write by a concurrent build. Reproduced directly by hammering concurrent builds-and-reads against one checkout (malformed reads on ~2% of polls); the CRLF hypothesis was separately reproduced and ruled out — a CRLF-converted tree fails at `scripts/lint.js`'s own CRLF check with a different, clear error, never reaching HELP_CONTENT parsing. Fixed by (1) making `writeBuild()` write atomically — a process-unique temp file plus `fs.renameSync` into place, so a reader only ever sees a complete file — and (2) serializing test-file execution (`"test": "node --test --test-concurrency=1"`) so the underlying cross-file race can't occur at all. Re-reproduced the original stress harness against the fix: zero truncated/malformed reads across repeated runs on two different filesystems. Full local suite re-verified at 149/149, double-build hash unchanged (`8891368...`, matching both R1's figure and the reviewer's own independently-reproduced hash) — the fix changes write/read timing only, never build output.
  - **R2-F2 (advisory):** `actions/setup-node@v6` (pinned during R1) had gone stale relative to `v7.0.0`. Bumped all three `setup-node` steps to `@v7`; confirmed this workflow's only input (`node-version-file`) is unaffected by v7's one documented breaking change (a `NODE_AUTH_TOKEN` fallback removal this workflow never used). The other four pinned Actions (`checkout@v7`, `upload-artifact@v7`, `download-artifact@v8`, `attest-build-provenance@v4`) were rechecked and confirmed still current at major-version granularity.
  - **R2-F3 (advisory):** the live PR #30 body and `ROADMAP.md`'s P0.18 prose had drifted out of sync with the actual (two-round) review history, and `ROADMAP.md` still cited the pre-R1 `attest-build-provenance@v1` pin. `ROADMAP.md`'s P0.18 entry corrected and given an "Independent review history" narrative paragraph (matching P0.17's established convention); this packet's §14 documents the R2 remediation in full; this changelog entry added. The live PR body cannot be edited from this authoring sandbox (no `gh`/push access) — flagged as a required manual step (`gh pr edit 30 --body-file docs/05-development/packets/p0.18-ci.md`) for the human to run after pushing.
- **What remains unverified:** a fresh hosted-Windows `npm test` run and the resulting `compare-hashes` pass against this remediated tip. This sandbox cannot trigger GitHub Actions; the R2-F1 fix is verified by local reproduction of the original race and confirmation the same reproduction no longer produces corruption against the fix, not by an observed hosted-Windows pass. A fresh real CI run is required before the next independent review can confirm this closed.

### Added — P0.17 help framework (2026-08-07, remediated after independent review)

- New build-time compiler, `scripts/help-content.js`, parsing a `::: plain` / `::: working` / `::: technical` markdown block convention (already documented in `docs/03-guides/README.md`, previously unimplemented) and compiling `docs/00-overview/glossary.md` and `docs/03-guides/*.md` into a three-depth content model embedded in the build as `HELP_CONTENT`. A guide or glossary term with no depth blocks — or an incomplete group — produces a non-fatal build warning naming the gap, per this item's acceptance criterion; an unterminated or duplicated `:::` block fails the build closed with a non-zero exit.
- New in-app **Learn** page: a depth switcher (remembered via `localStorage`, an explicitly permitted UI preference, never a secret path), an offline substring search built from the compiled content at first use (no network call), the full glossary and guide text rendered at the chosen depth, and inline tap-to-define glossary terms inside guide bodies.
- **Contextual `?` help** added to five existing panels (sealed-realm status, airgap banner, capability self-check, vault status, provenance panel), each linking to a specific compiled glossary entry — all five resolve to real content.
- **`docs/00-overview/glossary.md` fully backfilled to three depths — all 51 entries** (corrected count; an earlier draft of this entry and the packet said 46, which was stale — see F4 below), including the four "Things people get wrong" corrections (initially left single-depth as a judgment call, then wrapped too since it cost little and closes the gap entirely) and five new entries backing previously-undocumented P0.1–P0.16 in-app copy: capability self-check, KDF profiles (Fast/Standard/Paranoid), save integrity, keyfile unlock, and the provenance panel itself.
- **All nine `docs/03-guides/` files gained three-depth content** on their key explanatory passages (first-wallet, verify-a-hardware-wallet, backup-slip39, backup-codex32, going-airgapped, inheritance-planning, multisig-quorum, portfolio-setup, recover-a-seed). `npm run build` now reports **zero** help-content warnings — the P0.1–P0.16 backfill obligation recorded on this roadmap item is met.
- New `test/help-content.test.js` (21 tests): the parser/renderer in isolation (shared-vs-group parsing, missing/partial-depth warnings, unterminated/duplicate-block failures, markdown-to-HTML escaping and rendering), end-to-end checks that the real `docs/` tree compiles and reaches the built artifact byte-for-byte, a regression guard that the real tree builds with zero warnings, and the missing-depth-warning mechanism itself re-tested against a synthetic fixture (since the real tree no longer has a naturally-occurring gap to test against).
- `scripts/run-browser-harness.js` gained `verifyHelpFramework` (depth switching with real content-change assertions, persistence across reload, offline search with a network-request tripwire, contextual-help navigation, a genuine fail-closed fallback case against a synthetic nonexistent topic, inline glossary tap-to-define).
- **Bundle impact:** the compiled help content adds ≈ 344 KB to `build/coldbox.html` (total ≈ 1.01 MB) — over the 180 KB estimate in `SPEC.md`'s bundle table, now corrected there to the measured figure. Most of the weight is the existing `jsonScriptLiteral()` helper's `<`/`>`/`&` → `\uXXXX` escaping (shared with `PROVENANCE_LIBRARIES` and the cold-realm document, not new to this item); an earlier draft also duplicated a full plain-text copy of every depth into a separate search-index field, and deriving search text from the already-embedded HTML at runtime instead (ADR-0016) cut roughly a third off that draft's weight. The remaining overage is flagged as a real, unresolved finding for a follow-up item — see the packet's "what to scrutinise."
- **Independent review of PR #29 returned FAIL (4 findings, all remediated in this branch before merge):**
  - **F1 (blocking):** `verifyDevOnlyDependency()`'s dependency-free build fixture didn't copy `docs/`, so `npm run test:browser` exited before ever reaching `verifyHelpFramework()` in Chromium or Firefox — the browser harness never actually ran the P0.17 acceptance checks. Fixed by copying `docs/` into the fixture, matching the same fix pattern already used for `.git` (P0.16 F4). The independent reviewer separately confirmed, with real network access, that Chromium and Firefox both install and launch cleanly in this repository — the failure was this fixture gap, not an environment limitation.
  - **F2 (advisory):** the "no machine paths" build-output regression test excluded any `letter:\` followed by `u`+4 hex digits, which would miss a real path like `C:\u1234\repo\file.js`. Fixed by naming the exact three escape sequences `jsonScriptLiteral()` emits (`\u003c`, `\u003e`, `\u0026`) instead, with an adversarial test added.
  - **F3 (advisory):** the packet's verification evidence (Node version, build hash, test count) did not reproduce. See the packet for corrected, reproduced figures.
  - **F4 (advisory):** this changelog entry, ROADMAP.md, and the packet described the glossary as 46 entries; the real compiled corpus has 51. Corrected throughout.
- **A second independent review round returned FAIL again (3 findings, 2 blocking):** the F1 fix above turned out to be incomplete — three other temporary build-root fixtures in `scripts/run-browser-harness.js` still omitted `docs/`, so `npm run test:browser` still failed before reaching `verifyHelpFramework()`. Fixed by introducing one shared `copyBuildInputsInto()` helper used by all four fixtures, so the build-input list can't drift out of sync at some call sites again. More significantly, the reviewer's own real-Chromium probe caught a genuine shipped defect: 3 of the 5 contextual `?` buttons (cold-realm status, airgap banner, vault status) were nested inside `<h2>` titles whose entire `.textContent` gets rewritten on every state change, silently deleting the button — only 2 of 5 survived real app initialization. Fixed by giving each affected title a dedicated child `<span>` for its dynamic text, leaving the button as an untouched sibling; `verifyHelpFramework()` now asserts all 5 buttons survive a fully-settled app and exercises all 5 mappings. The packet was regenerated a second time against the tip including both fixes, since the version reviewed at this round still carried stale pre-fix evidence (that round's own F3).
- **`npm run test:browser` passed cleanly end to end for the first time in this branch's history**, run directly by the maintainer with real network access and the repository-pinned Node `24.16.0` (the authoring sandbox throughout this item's development could never download Playwright's binaries). The first attempt ran through 38 checks — including everything the second review round's fixture fix touched — before finding one more real bug: `verifyHelpFramework()`'s locator for the "Seed phrase" glossary entry matched 9 elements instead of 1, since that phrase is legitimately cross-referenced in 8 other entries' compiled prose. Not a product defect; fixed by targeting the compiler's own deterministic element id instead of a substring match. The very next run passed cleanly in both Chromium and Firefox.

### Added — P0.16 provenance panel and self-hash verifier (2026-08-06)

- **Reference → Provenance** now lists every embedded third-party library (name, version, upstream SHA-256, upstream release URL), generated at build time directly from `vendor/vendor-manifest.json` — the same manifest `npm run verify-vendor` checks against real upstream bytes — so the panel and `dependencies.md` cannot drift apart.
- **Build date** shown is the source commit's date (`git log -1 --format=%cI`), not a wall-clock build timestamp; a literal build-time timestamp would make two builds of the same source produce different bytes, which breaks the reproducible-build guarantee. Falls back to a labeled "unknown" (not a build failure) when git metadata is unavailable.
- **CSP allowlist for both realms**, read live from the warm shell's own `<meta http-equiv="Content-Security-Policy">` tag and from the embedded cold-realm `srcdoc` document, rather than a second transcribed copy that could go stale.
- **Self-hash drop zone.** The build embeds a `coldbox-expected-hash` meta tag whose value is the SHA-256 of the assembled document with that same tag blanked to 64 zero characters — the only way to reference a document's own hash inside itself without infinite regress. The drop zone reproduces the identical blank-then-hash procedure over a dropped file's bytes (via `crypto.subtle`, entirely in the warm shell — this is public file hashing, not a secret operation) and compares the result. The panel states plainly, before any check runs, that this is a circular self-consistency check that a malicious build could always pass, and points to `docs/02-security/verification.md` for the command-line hash, GPG signature, and reproduce-the-build checks that an attacker cannot forge.
- New `test/provenance.test.js` (11 tests): manifest/panel parity, build-date determinism and its git-unavailable fallback, the blank-then-hash mechanism including a single-tampered-byte detection case, and static markup checks. `scripts/run-browser-harness.js` gained `verifyProvenancePanel`, covering the rendered library list, CSP text, and the drop zone's match/mismatch/error states via Playwright's `setInputFiles` file-upload emulation, per this item's 🌐 marker.
- **Known limitation, disclosed in the PR packet:** `npm run test:browser` could not be executed in the authoring session because outbound Playwright browser-binary downloads were blocked by that sandbox's network allowlist. The browser-harness function is written and reviewed but its actual pass/fail in Chromium and Firefox is unverified pending a session with working network access; the roadmap item is left at `[~]` accordingly.

### Fixed — P0.16 provenance panel review remediation (2026-08-06)

Independent review ([p0.16-provenance-panel.review.md](docs/05-development/packets/p0.16-provenance-panel.review.md)) returned FAIL with 4 blocking and 2 advisory findings. All addressed on this branch:

- **F1 (blocking).** The compiled expected hash now renders visibly in the Reference → Provenance → "Verify this file" panel (`#provenance-expected-hash`), labeled explicitly as distinct from `coldbox.html.sha256`. Previously it existed only in a hidden `<meta>` tag.
- **F2 (blocking).** The self-hash drop-zone comparison previously blanked the dropped file's own expected-hash field before hashing, so a byte flip confined to that field was invisible and reported `Match`. The comparison now also requires the dropped file's own declared expected-hash value to equal the running copy's, so corruption inside the hash field fails closed too.
- **F3 (blocking).** `verifyProvenancePanel` in `scripts/run-browser-harness.js` gained assertions for F1's visible value and F2's hash-field-tamper case. Chromium/Firefox execution was blocked in every sandboxed authoring session — `cdn.playwright.dev` is outside the reachable network allowlist there. Run for real, twice, on a machine with working network access, and found two genuine pre-existing fixture bugs, neither a regression in shipped bytes:
  1. `verifyDevOnlyDependency` copies `scripts`/`src`/`vendor` into a `.git`-free temp directory to prove the build needs no `devDependencies` (in particular, no Playwright at runtime), then asserts the result is byte-identical to the real build. That assertion predates P0.16 and implicitly assumed the build needs nothing outside `node_modules`; once the build date started reading `git log`, a `.git`-free copy legitimately produces a different (fallback "unknown") date than a real checkout, which still has its `.git`. Fixed by copying `.git` into the fixture too. Added an equivalent Playwright-free regression test, `test/build.test.js`'s "a build with node_modules absent but .git present matches the real build byte-for-byte", so this property is now covered by plain `npm test`.
  2. `stripWarmCsp` (used by `verifyCspStrippedLockdown`) scans the whole built document for `<meta http-equiv="Content-Security-Policy" ...>` text and asserts exactly one match. P0.16's `extractCspFromMarkup()` in `src/main.js` has its own regex literal containing that same tag-shaped text, which ends up embedded verbatim in the built document's inline `<script>` block — so the document-wide scan found two "meta tags": the one real tag and the JS source code describing a tag. Fixed by scoping the search to before the first `<script>` tag (the document head), where the one real tag lives and no inline script body can appear.

  Both fixes are test-only; confirmed with real `git`/`node` in the authoring session, without Playwright, that neither changes `coldbox.html`'s hash beyond the expected build-date advance from `scripts/` being one of the paths that legitimately feeds the embedded build date (see ADR-0015's amendment) — i.e. each fix commit moves the date forward by design, same as any other commit touching `scripts/`, `src/`, or `vendor/`, and produces byte-identical output across two locales/timezones at each step.

  **F3 is now closed.** A third real-network `npm run test:browser` run, at author tip `5693e40`, printed `Browser harness passed in Chromium and Firefox.` — every assertion passed in both engines, including `verifyProvenancePanel`'s F1 (visible expected hash) and F2 (hash-field-tamper reported as mismatch) checks, which had never executed against a real browser before this run. The independent reviewer separately reran the full harness at the actual final reviewed tip with the same result (see the packet's R3-F1 correction). This closes the roadmap item's 🌐 acceptance criterion. Roadmap stays `[~]` — flipping it to `[x]` remains the independent reviewer's call.
- **F4 (blocking).** The embedded build date was derived from literal `HEAD`, so committing a governance-only change (a PR packet) moved `HEAD` and therefore changed the product's own bytes and hash — the packet could never truthfully describe the tip it shipped on. Fixed: the build date now comes from the most recent commit touching `src/`, `scripts/`, or `vendor/`, so a docs-only commit no longer changes it. Documented as a dated amendment to [ADR-0015](docs/05-development/adr/0015-provenance-build-date-and-self-hash.md). Verified: the same tip builds byte-identical `coldbox.html` from two different checkout paths under different locale/timezone.
- **F5 (advisory, required).** `docs/02-security/verification.md` incorrectly claimed the GPG signing-key fingerprint is shown in the app's provenance panel — corrected to state plainly it isn't, and why. `docs/05-development/build.md`'s "What the build does" sequence now describes the provenance build-date/expected-hash injection steps. The three-depth `docs/03-guides/` help-content gap for this feature, previously only asserted in the PR packet, is now formally recorded in [ROADMAP.md](docs/05-development/ROADMAP.md): P0.17's help-content compiler doesn't exist yet, so no feature shipped before it has three-depth guide content, and P0.17 now carries an explicit backfill obligation.
- **F6 (advisory, required).** The PR packet is regenerated with exact-tip evidence: accurate test-file list, the real full `npm test` count, `dependencies.md`'s actual bundle budget quote ("Target ≤ 3 MB, hard cap 4.5 MB"), and the expected-hash/UI claim corrected to match what F1 actually ships.

Roadmap item stays `[~]` — the marker is the independent reviewer's to flip, not the author's.

### Fixed — P0.16 fresh re-review R2-F1 (2026-08-07)

A fresh independent re-review of the F1–F6 remediation confirmed every functional and browser-level acceptance criterion (including a full `npm run test:browser` PASS in Chromium and Firefox) but returned FAIL on one remaining finding:

- **R2-F1 (blocking).** The F4 governance-only-commit test in `test/provenance.test.js` created a synthetic commit with `GIT_COMMITTER_DATE: '2020-01-01T00:00:00Z'`, then asserted the build embedded the hardcoded string `'2020-01-01T00:00:00+00:00'`. Both strings name the same UTC instant, but different `git` versions render `git log --format=%cI`'s strict-ISO UTC offset differently for it (`Z` vs `+00:00`) depending on how the commit date was supplied — so the test's pass/fail depended on the reviewing machine's git version, not on the actual property under test (that a governance-only commit doesn't move the embedded build date). Confirmed this was a test-fixture defect, not a product regression: independent product-level F4 checks (two-checkout-path/timezone/locale build reproducibility, product-source-tip hash matching the exact reviewed tip) all passed in the same review. Fixed by capturing git's own answer for the synthetic product commit immediately after creating it (`git log -1 --format=%cI HEAD`), then comparing the build's embedded date against that captured value instead of a hand-typed string — representation-independent by construction, since both sides go through the identical `git log --format=%cI` command. This is a `test/`-only change; it does not touch `src/`, `scripts/`, or `vendor/`, so it does not advance the embedded build date or change `coldbox.html`'s bytes at all (confirmed: hash unchanged at `d20cc46a97adcddf9a99dbad7101ea98df0355a42b1e0959530fe9cf77b6ba73`).

Roadmap item stays `[~]`.

### Fixed — P0.16 fresh re-review R3-F1 (2026-08-07)

A second fresh independent re-review confirmed R2-F1 fixed and every mandatory gate and functional/browser acceptance criterion independently passing (pinned Node 24.16.0; `npm test` 111/111; full Chromium/Firefox `npm run test:browser` PASS; online vendor verification; deliberate-corruption negative tests; cross-path/timezone/locale reproducibility), but returned FAIL on one governance/evidence finding against the PR packet itself, not the implementation:

- **R3-F1 (blocking).** Three stale-evidence defects in `docs/05-development/packets/p0.16-provenance-panel.md`, all corrected in place: (1) the packet claimed **110/110** was "the true, complete `npm test` count," but the mandatory bare `npm test` command auto-discovers a 111th file, `test/browser/harness.js` — a helper module with no `test(...)` calls of its own that Node's default test-file glob still picks up and reports as one passing pseudo-test; the packet's four hand-listed `node --test` invocations never included it. Corrected to 111/111 with a fifth invocation explicitly accounting for it. (2) The packet described a real-browser pass as occurring "on the exact final tip (`5693e40`)" — `5693e40` was an earlier author tip, since superseded by the R2-F1 fix and this packet's own regeneration commits; it was never re-described as non-final. Corrected to name `5693e40` as the author tip where that specific run occurred, while noting the independent reviewer separately reran the full harness at the actual final tip with the same result. (3) The live PR #28 body was one packet revision behind the committed packet. Synced after this commit. No product, runtime, or test-assertion code changed — this is a documentation-accuracy correction only, and `coldbox.html`'s hash is unchanged (still `d20cc46a97adcddf9a99dbad7101ea98df0355a42b1e0959530fe9cf77b6ba73`).

Roadmap item stays `[~]`.

### Added — P0.15 keyfile unlock (2026-08-06)

- **Wrapped-DEK method 2 (passphrase + keyfile).** `src/cold/vault.js` can now wrap the vault DEK under `Argon2id(passphrase || SHA-512(keyfile), salt, params)`, per [vault-format.md](docs/01-spec/vault-format.md)'s existing method-2 specification. A vault created with a keyfile carries a method-2 record in place of the method-1 record — the keyfile is required, not an optional alternative, so losing it or altering a single byte makes the vault permanently unopenable. This is stated in bold in the cold-realm UI before the keyfile toggle can be used, and the toggle is **off by default**.
- **Fails closed on a one-byte-altered keyfile**, with an error indistinguishable from a wrong passphrase (`Vault authentication failed.` in both cases — no detail about which credential or byte was wrong).
- **Passphrase-only vaults are unaffected.** No wire-format or behavior change for any vault created without a keyfile; `unwrapDek()` only ever consults a method-2 record when the vault actually carries one, and only if a keyfile was supplied at open time.
- New cold-realm UI: a keyfile toggle (unchecked by default), an unmissable red warning that appears the moment it's checked, and a file input whose bytes are read via `FileReader` and never leave the sealed cold-realm document — no message type carries keyfile bytes, and they are never logged.
- Implementation limits (64 MiB keyfile size ceiling, 255-byte hint cap, empty-keyfile rejection) recorded in [ADR-0014](docs/05-development/adr/0014-keyfile-unlock-implementation-limits.md).

### Added — P0.14 save integrity (2026-08-06)

- **Verify-after-save.** The File System Access save path re-reads the file it just wrote and confirms the bytes are byte-identical before clearing the unsaved-changes flag; a truncated or corrupted read-back leaves the vault marked dirty and says so instead of silently reporting success.
- **Dirty-flag tracking.** A vault created fresh inside the cold realm starts with unsaved changes; opening an existing file does not. Only a verified save clears the flag — blob download and the manual base64/QR handoff have no way to read back what actually landed on disk or in a clipboard, so neither ever clears it automatically.
- **Generational filenames and rollback detection.** Saves are named `coldbox-vault-0047.cbx`; the highest generation this browser has seen is tracked in `localStorage` (non-secret, degrades silently) and compared against a loaded file's filename. Opening a file that parses to an older generation shows a warning with both dates and counters. This is advisory, not cryptographic — a renamed or foreign file simply cannot be checked, and the check never guesses.
- New `src/save-integrity.js`, assembled into the warm shell the same way as `airgap.js`/`capabilities.js`/`protocol.js`. Pure logic, no DOM dependency, no vault-format change, no new `postMessage` type — see [ADR-0013](docs/05-development/adr/0013-save-integrity-in-warm-shell.md) for why it lives here.

### Changed — review closeout ownership (2026-08-06)

- **Root cause fixed for governance-only pull requests.** [review-protocol.md](docs/05-development/review-protocol.md) told the reviewer to *write* a `.review.md` report but never to commit it to the branch under review, and no document assigned the `[~]` → `[x]` roadmap transition to anyone. Both artifacts therefore had no home once `--delete-branch` ran, producing rescue branches for review reports and a follow-up PR whose entire diff was one character.
- The reviewer now owns a **closeout commit** — report plus roadmap marker — pushed to the item branch before the merge. Authors set `[~]` and never `[x]`, because marking your own item complete asserts an independent verification that has not happened.
- **Pull requests that only move governance are prohibited.** A missed marker or report folds into the next PR to touch the repository. Browser-based sessions that cannot push to the branch under review hand the closeout to the next session via the handoff block rather than opening a PR.
- Aligned across [AGENTS.md](AGENTS.md), [ROADMAP.md](docs/05-development/ROADMAP.md), [review-protocol.md](docs/05-development/review-protocol.md), [handoff.md](docs/05-development/handoff.md), and [packets/README.md](docs/05-development/packets/README.md).

### Added — Recovery Assistant specification (2026-08-06)

- **SPEC §11.1b** replaces the single-paragraph Recovery Assistant sketch with a full specification: two-stage screen/verify pipeline, measured primitive costs, tiered stop conditions, search-space ordering, a declared typo grammar, phased escalation, and the estimate-and-refuse contract.
- Records the measured finding that **elliptic curve arithmetic, not the KDF, dominates recovery cost** — 79% against 16% at default settings — which inverts the assumption the previous text implied.
- Requires both operation counts (combinations enumerated, candidates verified) to be shown, and the time estimate to name which crypto path is live, since the pure-JS and WebCrypto paths differ by 7.8×.
- **[ADR-0011](docs/05-development/adr/0011-wasm-secp256k1-for-recovery.md):** WASM secp256k1 for the search path only, with `@noble` re-deriving every hit before display. `'wasm-unsafe-eval'` was already mandatory in the cold realm for Argon2id, so this adds no CSP concession.
- **[ADR-0012](docs/05-development/adr/0012-recovery-checkpoint.md):** checkpoints are a separate encrypted file rather than vault records — the cold realm's opaque origin cannot persist anything, and continuous vault rewriting would fight verify-after-save, generational filenames, and rollback detection.
- **P4.3 split into P4.3a–P4.3e** in the roadmap; the original single line materially understated the work. P4.3d is explicitly gated on unresolved size research and may be dropped.
- [recover-a-seed.md](docs/03-guides/recover-a-seed.md) corrected: the previous timing estimates conflated 12- and 24-word phrases and were optimistic by roughly an order of magnitude for 12-word, because a 12-word checksum filters 1 in 16 where a 24-word filters 1 in 256. Adds the xpub stop condition and the address generation limit.

### Added — P0.13 (2026-08-03)

- Cold-realm vault session controls for create, unlock, lock, five-minute idle auto-lock, `Esc Esc` panic concealment, and fail-closed runtime health handling; any cold airgap/capability/crypto failure or save-time health rejection closes and zeroizes the active session before locked status is exposed. The warm shell never receives the unlock phrase or decrypted secret compartment.
- File System Access save/load when available with normative `.cbx` filenames, portable blob download, and a first-class manual base64/share flow with numbered multi-part QR frames, local QR rendering, and ordered reassembly in supported running browser contexts.
- Cold session saves now re-encrypt public data with a fresh nonce every time, re-encrypt the secret compartment offline, and preserve the encrypted secret compartment opaquely online without deriving its key.
- Explicit mode signaling: online unlock uses a public-only opener that never derives the secret subkey; full compartment unlock is available only after the warm shell reports offline.
- Chromium/Firefox browser coverage for blob and manual round-trips, panic hide, and the existing cold boundary. Direct iOS local execution from Files is a blocked portability target under ADR-0010.

### Changed — portability decision (2026-08-04)

- **ADR-0010 accepted Choice 3:** Coldbox no longer claims that an arbitrary local `coldbox.html` file executes in Safari from iOS Files. Quick Look, third-party viewers, localhost, renamed files, and wrapped formats are not equivalent execution evidence.
- The authoritative roadmap/ADR re-baseline landed on `main`: direct iOS Files-to-Safari execution is a separately recorded P0.19 portability target, not a P0.13 acceptance gate. PR #21 subsequently received an independent PASS and merged; current item-level status is canonical in [ROADMAP.md](docs/05-development/ROADMAP.md). The security model and single-file/no-server constraints are unchanged.

### Added — P0.12 (2026-08-03)

- Cold-only KDF profile benchmark for Fast, Standard, and Paranoid, with sequential positive timings, shared vault-health gating, and an explicit iOS allocation warning for the 256 MiB profile; literal placement before creation is verified with the dependent P0.13 workflow.
- Real Argon2id round-trips for all three stored header profiles, likely-iOS Paranoid skip coverage, and browser verification that the benchmark offer remains inside the sealed realm.

### Added — browser runner workflow (2026-08-05)
- Browser-only development/review runners now require explicit repository/branch/HEAD state, persist per-step exit codes and preflight untracked paths, preserve recovery tags without overwriting them, and emit scanner-gated evidence bundles.
- Secret scanning uses the vendored English BIP-39 wordlist, handles CRLF and large text inputs, records skipped binary paths, and emits only a content-free diagnostic manifest plus scan report when a finding is detected.

### Added — P0.10 (2026-08-03)

- Vendored `argon2-browser` 1.18.0 with its embedded Argon2id WASM distribution, plus a deterministic build-time bundle of the selected `@noble/ciphers` and `@noble/hashes` modules.
- Pure-JS `@noble` AES-GCM as the default path, WebCrypto AES-GCM gated by an affirmative NIST known-answer test, and RFC 9106 Argon2id boot verification.
- Explicit KDF reporting in the cold realm and warm-shell capability summary; a PBKDF2-HMAC-SHA512 fallback is labelled with its active profile and iteration count whenever Argon2id cannot load.
- Node vector tests, protocol coverage for the cryptographic capability report, deterministic-build coverage, and Chromium/Firefox browser verification of the sealed realm.

### Added — P0.11 (2026-08-03)

- Vault format v1 serializer/parser in the cold realm: authenticated header, multi-record wrapped-DEK structure, AES-GCM public/secret compartments, HKDF domain separation, and 64 KiB random padding.
- Real P0.10-backed round-trip coverage, all-65-header-byte tamper coverage, indistinguishable authentication failures, zero-secret compartments, and a warm/cold vault API boundary check.
- Independent-review remediation makes the vault API fail closed on cold-health/CSP failure, consumes the shared airgap network snapshot, rejects unknown KDF profile names, uses the crypto layer as the single KDF-profile source, documents a distinct 64 MiB size refusal, and removes the premature P0.13 session/save primitive from P0.11.

### Added — review audit trail (2026-08-04)

- **Three independent review reports recovered and committed.** The reviews of P0.6, P0.7 and P0.8 were written, stashed, and never landed. All three are FAIL, together carrying 27 findings of which 8 are blocking, against the cold realm bootstrap, the message handshake, and the CSP canary. Remediation had happened without them visible in the tree.
- **Every one of the 27 findings dispositioned** against current `main`, with evidence, in a "Disposition of findings" section appended to each report. Reviewer text and verdicts are unmodified. Result: **25 Resolved, 2 open — both environmental** (upstream `verify-vendor` needs registry access; verification ran on Node 22 against a pinned 24.16.0).
- **One live defect surfaced.** `docs/05-development/adr/README.md` links to ADR-0008, which `c6d6cc2` deleted from `main` when the literal CSP throw contract replaced it. The file survives only on the unmerged `p0.13-lock-save-load` branch, so the two branches disagree about whether ADR-0008 exists. Recorded, not patched — withdrawing or reinstating an ADR is a structural decision.
- **P0.3a and P0.4 reviews** each contain two stacked reviews, an original FAIL and a later PASS re-review. A navigation banner now says so at the top; neither verdict was altered.
- **Independent review coverage is now tracked** in [packets/README.md](docs/05-development/packets/README.md). It records that **P0.5 and P0.9 have never been independently reviewed** — the `BATCH-2026-08-03.md` claim of a P0.5 independent PASS has no artifact behind it, and P0.9's reviewer-reserved path briefly held a self-review instead.

### Added — design system (2026-08-04)

- **Comic visual language** across the warm shell: heavy outlines, flat saturated fills, hard offset shadows, halftone dot field, comic display lettering. Recorded in [ADR-0009](docs/05-development/adr/0009-comic-visual-language.md); the full contract is [docs/01-spec/design-system.md](docs/01-spec/design-system.md), which is now authoritative for anything a user can see and supersedes the visual direction in SPEC §15.
- **The calm rule.** Security surfaces — realm status, airgap banner, capability self-check, the entire sealed realm, and everything Phase 1+ adds to the secret-handling routes — take the comic shell and none of the comic behaviour: no tilt, no animation, no stickers. The line is *reporting live boundary state* versus *explaining the design*. The display face is barred from seed words, addresses, keys, hashes, paths, and amounts, which stay monospace.
- **Yellow app bar** across every route: knocked-out cyan wordmark, rotated pink status badge reading `Pre-release · Not audited`, and quick links. The mockup's `LOCK ALL` is deliberately absent — there is no lock to engage until P0.13, and a prominent red control that does nothing is worse than no control. The theme toggle moved here from the content bar; its `id` is unchanged, so `main.js` binds as before.
- **3D card stage** on the dashboard: three comic-paper panels in perspective with pointer-tilt and scroll parallax, driven by two CSS custom properties from `startStageMotion()` in `src/main.js`. It renders no live data and exposes no controls. Below `62rem` the cards stack with no 3D; `prefers-reduced-motion` suppresses the listeners entirely.
- **Vendored display typefaces.** `@fontsource/bangers@5.3.0` and `@fontsource/comic-neue@5.3.0` (both SIL OFL 1.1) committed as pinned npm tarballs with SHA-256 and integrity in `vendor-manifest.json`, added to `requiredPackages`, and inlined as base64 `data:` URIs by the new `scripts/font-bundle.js` at the `__COLDBOX_FONT_FACES__` build token. Nothing is fetched at build or run time; a corrupted or unmanifested font tarball fails the build like any other vendored artifact. Cost ≈ 83 KB.
- Dashboard copy now states plainly that Coldbox is a toolkit that holds no keys and signs nothing, and the design system carries a say/never-say table so the "not a wallet" boundary is reviewable rather than a matter of taste.
- `scripts/crypto-bundle.js` and `scripts/font-bundle.js` are both covered by the lint tooling-syntax check; `crypto-bundle.js` had been missing from that list.
- Verified against the built artifact: two clean builds byte-identical across path, locale, and timezone; 49/49 node tests including the contrast floor; `npm run test:browser` green in Chromium and Firefox over `file://`. Real-hardware rendering — mobile in particular — remains untested; see [the packet](docs/05-development/packets/ui-comic-design-system.md) §7.

### Changed — workflow (2026-08-03)

- **Branch hygiene is automatic.** Reviewers merge with `--delete-branch`; every session's preflight runs `git fetch --prune` and deletes local branches marked `[gone]`. Combined with the repo's *Automatically delete head branches* setting, no periodic manual sweep is ever needed. The only cleanup that still reaches the human is `git worktree remove` after a parallel run, since worktrees live outside the repo

- **Agents now do the git work.** Implementation sessions open their own PR with `gh pr create`; reviewers **merge on PASS**. In the normal case the human runs no commands and pastes one prompt per step
- **`🙋 Action required from you`** block, which appears **first** in any handoff where the human is blocked — a `👤 human-required` item, a missing credential, or a command the agent could not run. Exact commands with real values, plus what stays blocked until they run
- Reviewers do **not** auto-merge items touching the realm boundary, message schema, or vault format (P0.6, P0.7, P0.11) — those hand the merge to the human with the command pre-filled
- Renamed `expectNetworkPrimitiveThrows` → `expectNetworkPrimitiveBlocked`; the assertion checks whether a request was blocked, which for `sendBeacon` means a `false` return or a `connect-src` violation rather than a throw

### Added — process (2026-08-03)

- **Mandatory handoff blocks** closing the copy-paste loop. Every session — implementation, batch, and review — must end with the exact commands to run and the exact prompt for the next agent, **with every placeholder already filled in**. The human copies and pastes; they never memorize a command or search the docs. `AGENTS.md` §6b-handoff, [review-protocol.md](docs/05-development/review-protocol.md), [batch-run.md](docs/05-development/batch-run.md)
- Reviewers hand off too: PASS gives merge commands plus the next-item prompt; FAIL gives the fix prompt and then the re-review prompt. A reviewer never fixes findings itself
- A session ending without a handoff block is a contract violation

- **P0.3a — headless browser harness** roadmap item, and [ADR-0007](docs/05-development/adr/0007-headless-browser-harness.md) justifying Playwright as a dev dependency. Discovered when P0.4's implementation could not verify either of its acceptance criteria: **9 of 19 Phase 0 items have criteria only a browser can satisfy**, which under the binary review protocol stalls a campaign indefinitely. The harness makes 8 of them agent-verifiable
- `🌐` roadmap marker for browser-verifiable criteria, applied to the eight affected items, each naming what the harness covers and what it cannot
- Explicit rule: **an item whose criteria you cannot verify is `[~]`, never `[x]`**
- P0.19 remains `👤 human-required` — Playwright cannot test iOS Safari, and that is the platform most likely to break the two-realm model

### Added — P0.3a (2026-08-02)

- Pinned Playwright 1.62.1 under `devDependencies` with a `test:browser` command that runs the built artifact from `file://` in Chromium and Firefox
- Reusable browser assertions for CSP violations, hash-tampered script rejection, opaque-frame isolation, blocked network primitives, responsive viewports, and visible elements
- Browser fixtures and negative checks proving deliberate CSP violations and byte-tampered inline scripts fail with a non-zero harness result

### Changed — P0.3a review fixes (2026-08-03)

- Per-primitive network assertions now cover throw/reject, asynchronous `EventSource` errors, and `sendBeacon` returning `false`, and exercise all five supported primitives against a real `connect-src 'none'` frame fixture
- Added an untampered hash-pinning control and a byte-for-byte build comparison from a tree without `node_modules`
- Made browser installation explicit with `npx playwright install chromium firefox`; the test command no longer downloads browsers implicitly

### Added — process (2026-08-02)

- **[review-protocol.md](docs/05-development/review-protocol.md)** — binary PASS/FAIL review contract. No "approve with comments"; **any finding of any severity, including advisory, is a FAIL.** Requires independent verification, a review report opening with a verdict block, and a fresh verdict on re-review rather than an amendment
- `AGENTS.md` §6a: session preflight and postflight checklists, mandatory output verification after every git command, and shell gotchas (PowerShell mangling `@{`, `$?` reporting the wrong command after a pipeline)
- `AGENTS.md` §6b: agents are told upfront how their work will be judged

- **[batch-run.md](docs/05-development/batch-run.md)** — protocol for working several roadmap items unattended: bounded scope, dependency-aware branching (branch from the declared dependency, not the previous item), a self-review gate between items, hard stop conditions, and a handoff note. Batches never merge
- **[packets/](docs/05-development/packets/)** — PR packets and review reports moved to per-item paths. A single rotating `PR-PACKET.md` destroyed the audit trail and caused a merge conflict on every stacked branch
- `👤 human-required` roadmap marker for items needing physical hardware or a human decision; P0.19 (device matrix) flagged
- **[doc-hygiene.md](docs/05-development/doc-hygiene.md)** — rules preventing documentation decay: one canonical home per fact, review dates and max ages on anything describing the outside world, docs shipping with the code that changes them, no orphan numbers, and automated checks wired into CI at P0.18
- Review dates added to `standards.md`, `api-sources.md`, `crypto-choices.md`, and `supported-chains.md`

### Changed — process

- **Status is single-sourced to the roadmap.** README carries phase descriptions only; item-level status lives in exactly one place so it cannot drift
- Definition of done now includes a clean working tree, exactly one roadmap item per branch, no duplicated facts, updated review dates, and a self-review against the reviewer's checklist
- Documentation staleness is explicitly in scope for review, and therefore a FAIL condition

### Added — P0.1 (2026-08-02)

- Pinned Node.js toolchain and lockfile for the first build step
- Deterministic source assembly into one `build/coldbox.html` file
- SHA-256 sidecar emission and reproducibility tests covering locale, timezone, line endings, and machine-path leakage

### Added — P0.2 (2026-08-02)

- Pinned official npm release tarballs for `@noble/hashes`, `@noble/curves`, `@noble/ciphers`, `@scure/bip32`, `@scure/bip39`, and `@scure/base`
- Offline local artifact verification and explicit online re-download verification against SHA-256 and npm SHA-512 integrity values
- Build fail-closed guard and regression tests for corrupted vendor artifacts

### Added — P0.4 (2026-08-02)

- Build-time SHA-256 hash-pinning for every inline script and style block in the CSP
- CSP policy embedded in the built HTML with deterministic hash injection

### Changed — P0.4 review fixes (2026-08-03)

- Browser harness copies `build/coldbox.html`, flips one byte in its inline script, and verifies `script-src` rejection plus the absence of the skeleton state in Chromium and Firefox; the untampered build is a positive control
- Final-document `__COLDBOX_` placeholder checking now fails the build before any output is created

### Added — P0.6 (2026-08-03)

- Hash-pinned cold-realm `srcdoc` assembly with `sandbox="allow-scripts allow-downloads"` and no `allow-same-origin`
- Cold-realm CSP with `connect-src 'none'`, isolated child styling/script, and a warm-shell policy that permits only the pinned child hashes needed by the inherited `srcdoc` policy
- Chromium and Firefox coverage for per-primitive CSP-correlated throw results, standalone native CSP signals, parent DOM/variable isolation, exact sandbox permissions, and explicit fail-closed behavior for iframe creation or readiness timeout
- The original P0.6 throw contract is enforced; P0.8 remains responsible for the broader five-primitive runtime guard and CSP canary

### Added — P0.7 (2026-08-03)

- MessageChannel port transfer after the payload-free cold bootstrap signal, with terminal handshake state and post-handshake global-message anomaly logging
- Typed warm-to-cold and cold-to-warm protocol whitelist with payload validation, unknown-field stripping, safe public-compartment projections, recognizable secret-content rejection, and aggregate payload limits
- Visible anomaly warnings in both realms, Node handshake-guard mutation tests, and Chromium/Firefox browser-harness assertions for handshake readiness, global-handler discard behavior, and continued cold-realm boundary coverage

### Added — P0.8 (2026-08-03)

- Native CSP canaries in the warm shell and cold realm, with exact `connect-src` violation matching, an inherited-policy-safe cold target, and fail-closed behavior when a policy is missing or modified
- Cold-realm runtime neutering for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `navigator.sendBeacon`, including their prototype owners, with non-configurable, non-writable blockers and typed runtime-violation lockdown
- Checking/green/amber/red airgap banner states driven by `navigator.onLine`, `navigator.connection`, focus, online/offline events, connection changes, and a five-second refresh interval
- Chromium/Firefox browser-harness coverage for offline emulation, warm-only/cold-only/both-policy stripping, exact canary URLs, prototype restoration, and all five runtime network primitives

### Added — P0.9 (2026-08-03)

- Boot-time capability self-check panel covering `crypto.getRandomValues`, `crypto.subtle`, WASM, Workers, camera API availability, and the three documented save-path capabilities
- Hard fail and full lockdown when required `crypto.getRandomValues` is missing in either realm; no `Math.random` substitution is present or permitted
- Capability-specific lint and build regression guard rejects executable `Math.random()` substitutions in the required randomness path
- Warm/cold capability reporting, optional-capability warnings, worker-capability CSP support, and visible save-path availability summary
- Chromium/Firefox browser-harness coverage for normal capability reporting and the missing-randomness refusal path; physical Safari/mobile confirmation remains P0.19

### Added — P0.5 (2026-08-03)

- Responsive warm-shell skeleton with desktop navigation rail, mobile tab bar, overflow menu, hash routing, and dark/light mode
- Public-facing route placeholders for the documented workspace, tools, and reference sections; secret-handling routes remain intentionally unimplemented until the cold realm exists
- Browser-harness coverage for file-based routing, theme switching, desktop/mobile navigation, and 360px horizontal-overflow checks in Chromium and Firefox
- Regression tests for multiple inline blocks and browser verification of one-byte tampering on a copy of the built artifact
- Lint compatibility for the required `wasm-unsafe-eval` directive while rejecting `unsafe-eval`

### Added — P0.3 (2026-08-02)

- Build-integrated forbidden-construct lint for application source: `eval`, `new Function`, `import`, and `require`
- Cold-realm source checks rejecting external URLs and `localStorage`
- Negative fixture tests proving each forbidden construct fails the lint and the build refuses the source

### Added — spec v0.4 (2026-08-02)

- **US tax reporting exporter** (SPEC §14.5, roadmap P3.9): Form 8949 CSV per box code, Schedule D summary, ordinary income report, lot audit trail, transfer ledger, 1099-DA reconciliation, safe harbor allocation record, plus TurboTax and TaxAct profiles
- New reference: [us-tax-reporting.md](docs/04-reference/us-tax-reporting.md) with rule citations and a review date

### Changed — spec v0.4

- **Breaking data model change: lot pools are now keyed by `(walletId, asset)`, not asset alone.** Rev. Proc. 2024-28 eliminated universal-wallet basis pooling effective 1 January 2025, so a global pool per asset cannot produce correct US figures
- Cost basis methods narrowed to FIFO and specific identification; HIFO and LIFO reclassified as **selection rules within specific ID** rather than independent methods, carrying the contemporaneous-records burden
- Added `Disposal` and `BasisAllocation` entities; `Lot` gained `walletId` and `carriedFromLotId`

### Added — spec v0.3 (2026-08-02)

- Hardware wallet companion role as the project's primary framing (§14a): device registry, fingerprint and receive-address verification, vendor support matrix, Seed XOR, multisig quorum survivability analysis
- Entropy Health Meter on every secret-creation screen — measures min-entropy rather than Shannon, shows claimed vs measured bits side by side, blocks generation below target, and refuses to give false-precision numbers for human-chosen passphrases
- codex32 (BIP-93) backup format — Shamir shares verifiable by hand with pen and paper
- BIP-329 wallet label import and export for portability with Sparrow, Nunchuk, BitBoxApp, and BTCPay
- Plain-English Help system at three depth levels, single-sourced with `docs/`
- Open source release engineering: reproducible builds, CI attestation, GPG signing, no hosted version
- Multi-currency support via CoinGecko `vs_currency` plus Frankfurter for fiat-to-fiat
- Historical price backfill with three modes, defaulting to manual entry
- Keyfile second factor, off by default
- Vault recovery shares: format reserved in Phase 0, feature shipped in Phase 2
- File hasher with no size ceiling: streaming, single-pass multi-algorithm, recursive folder hashing, interoperable manifests, and backup-media bit-rot verification
- Emerging standards survey with adoption decisions (§19), including an honest quantum readiness position
- Documentation structure and ADR practice

### Removed

- Duress/decoy compartment. Weak deniability against anyone who knows the file format, and it doubles the ways to lose data permanently
- QuickHash binaries (28 MB across three platforms), replaced by the built-in hasher

### Added — spec v0.2 (2026-08-02)

- Two-realm architecture: sandboxed cold realm with `connect-src 'none'` alongside a network-capable warm shell. Resolves the conflict between "tools must work online" and "secrets must never leak"
- Vault compartments — public and secret — so the portfolio works online while seeds stay sealed
- Portfolio manager: transactions, lots, FIFO/LIFO/HIFO/average/spec-ID cost basis, realized and unrealized PnL
- Price aggregation across five browser-callable sources, using median rather than mean
- On-chain balance lookups, opt-in per address, with the privacy cost stated plainly
- Notes and tags across every entity, with public/secret visibility
- Four-level concealment: masking, privacy blur, panic hide, hidden items
- Chain coverage expanded to 35+ with coin types verified against the live SLIP-44 registry

### Added — spec v0.1 (2026-08-02)

- Initial specification: single-file design, airgap enforcement, vault format, module breakdown, threat model, portability contract

---

## Release template

```
## [1.0.0] — YYYY-MM-DD

SHA-256: <hash of coldbox-v1.0.0.html>
Signed by: <GPG key fingerprint>
Reproducible build attestation: <CI run URL>

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
```
