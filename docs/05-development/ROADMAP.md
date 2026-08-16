# Roadmap

**This file is the single source of truth for what to build next _and_ for current status.** It is machine-readable by convention: work the first unchecked item whose dependencies are all complete.

Status: `[ ]` not started · `[~]` in progress, or built but not yet independently reviewed · `[x]` complete **and independently reviewed**
Markers: `👤 human-required` — an agent cannot complete it (physical hardware, or a decision that isn't theirs)
· `⚠️` — agent-implementable, but something is needed from the human before it fully works
· `🌐` — has acceptance criteria only a browser can verify; use the P0.3a harness and mark `[~]` until it confirms them

**An item whose criteria you cannot verify is `[~]`, never `[x]`.** Nine Phase 0 items have browser-dependent criteria; the P0.3a harness makes eight of them agent-verifiable. The ninth, P0.19, needs real devices and always will.

Every PR must update this file in the same commit as the work it completes.

**Who moves the marker.** The author sets `[~]`. The **reviewer** sets `[x]`, on the item's own branch, as part of the PASS and before merging — see [review-protocol.md](review-protocol.md). An author who marks their own item `[x]` is asserting an independent verification that has not happened yet. A missed `[x]` is folded into the next PR to touch the repo; it never gets a pull request of its own.

**Do not duplicate item-level status anywhere else** — not in the README, not in the spec, not in a PR description. Duplicated status drifts, and stale status is worse than none because people trust it. Other documents link here.

---

## How to pick the next item

1. Read top to bottom.
2. Find the first `[ ]` item whose listed dependencies are all `[x]`.
3. If it's already `[~]`, check for an open PR or branch before starting — someone may be on it.
4. Do **that item only**. One roadmap item per PR.
5. If the item is ambiguous or the spec doesn't settle a design question it raises, **stop and open a question issue or an ADR proposal rather than guessing.** Guessing on a security boundary is worse than a delay.

Do not skip ahead to a later phase because it looks more interesting. Ordering encodes dependency, and Phase 0 in particular is load-bearing for everything above it.

**Working several items in one unattended session?** That's a batch run — see [batch-run.md](batch-run.md). It adds dependency-aware branching, a self-review gate between items, a maximum unmerged stack depth, and hard stop conditions.

**Getting through the whole roadmap** is a *campaign*: repeated batches with merges between them. Merging resets the stack depth, so how often you merge — not agent capability — sets the pace.

---

## Phase 0 — Foundation

Nothing above this phase is safe to build until the container is trustworthy.

### Build and verification pipeline

- [x] **P0.1 — Deterministic build skeleton**
  *Deps: none*
  `package.json`, `.nvmrc`, and a build script assembling `src/` into a single `build/coldbox.html`. No app features yet — an empty shell is fine.
  **Accept:** two consecutive clean builds produce byte-identical output; `build/coldbox.html.sha256` emitted; `LC_ALL=C TZ=UTC` enforced; no timestamps, machine paths, or unsorted iteration in output.

- [x] **P0.2 — Vendor layout and verification**
  *Deps: P0.1*
  `vendor/` structure, `npm run verify-vendor` re-downloading upstream releases and comparing hashes, `dependencies.md` populated with real versions and hashes for `@noble/*` and `@scure/*`.
  **Accept:** `verify-vendor` passes; a deliberately corrupted vendor file makes it fail; the build refuses to run if verification fails.

- [x] **P0.3 — Forbidden-construct lint**
  *Deps: P0.1*
  Build-time check rejecting `eval`, `new Function`, `import`, `require`, external URLs, and `localStorage` in secret-handling paths.
  **Accept:** lint runs in the build and fails it; a test fixture containing each construct is rejected.

- [x] **P0.3a — Headless browser harness** 🌐 *unblocks browser verification for eight later items*
  *Deps: P0.1*
  Playwright as a **dev dependency** (never shipped), loading `build/coldbox.html` over `file://` in headless Chromium and Firefox. Exposes reusable assertions used by every later item's browser criteria:
  `expectNoConsoleErrors()` · `expectNoCspViolations()` · `expectCspViolation(directive)` · `expectScriptRejected()` (after post-build byte tampering) · `expectNetworkPrimitiveBlocked(name)` inside a frame · `expectParentCannotReadFrame()` · `expectElementVisible(sel)` · `atViewport(w, h)`.
  Rationale in [ADR-0007](adr/0007-headless-browser-harness.md).
  **Accept:** After a clean `npm ci` and the documented `npx playwright install chromium firefox` prerequisite, `npm run test:browser` loads the built file over `file://` in both engines; a deliberately CSP-violating fixture is detected; a byte-tampered inline script is rejected by the browser and the harness reports it; harness failures exit **non-zero**; Playwright appears only under `devDependencies` and contributes **0 bytes** to `build/coldbox.html`.

- [x] **P0.4 — CSP hash-pinning in the build**
  *Deps: P0.1 (implementation) · P0.3a (verification)*
  Compute SHA-256 of each inline script and style block; inject into the respective `script-src`/`style-src` directives.
  **Accept:** built file runs with no CSP violations; altering one byte of the inline script post-build causes the browser to refuse to execute it.
  🌐 *Both criteria are verified against the built artifact by the P0.3a harness in Chromium and Firefox. Implementation may land first and sit at `[~]` until the harness confirms them.*

### The two realms

- [x] **P0.5 — Warm shell skeleton**
  *Deps: P0.4*
  Outer document, CSP per [csp-policy.md](../02-security/csp-policy.md), nav rail and mobile tab bar, routing, dark/light. No features.
  **Accept:** loads from `file://` on the full device matrix; no console errors; responsive from 360 px to desktop.
  🌐 *Verified by the P0.3a harness in headless Chromium and Firefox. Real-device confirmation is P0.19.*

- [x] **P0.6 — Cold realm bootstrap**
  *Deps: P0.5*
  `srcdoc` iframe with `sandbox="allow-scripts allow-downloads allow-modals"` and its own CSP including `connect-src 'none'`; `allow-same-origin` remains absent.
  **Accept:** iframe instantiates; `fetch`, `XHR`, and `WebSocket` inside it **throw**; warm shell cannot read its DOM or variables; **app fails closed with an explanation if the iframe cannot be established.**
  🌐 *Verified by the P0.3a harness in headless Chromium and Firefox — this is the project's central security claim, so the harness assertions for it are the most important tests in the repo. Real-device confirmation is P0.19.*

- [x] **P0.7 — MessageChannel handshake and schema validator**
  *Deps: P0.6*
  Handshake transferring a port; typed whitelist schema per [architecture.md](../01-spec/architecture.md); global `message` handler ignored after handshake.
  **Accept:** schema rejects unknown types and strips unknown fields; a test asserts **no message type can carry a mnemonic, private key, xprv, passphrase, or secret-compartment plaintext**; messages injected on the global handler post-handshake are discarded and logged.
  🌐 *Verified by the P0.3a harness in headless Chromium and Firefox. Real-device confirmation is P0.19.*

- [x] **P0.8 — CSP canary and airgap guard**
  *Deps: P0.7*
  Deliberate exact-URL policy-violating requests as warm and cold canaries; `navigator.onLine` and `connection` signals; checking/green/amber/red banner states; prototype-safe runtime neutering of network primitives inside the cold realm.
  **Accept (historical P0.8 scope):** both exact canaries fire independently; warm-only, cold-only, and both-policy CSP stripping go to full lockdown and refuse vault operations; the banner follows the browser-reported/emulated network signal within 5 s. **P0.19 real-device testing proved that signal is not equivalent to actual external reachability; current semantics are superseded by ADR-0024 and P0.19 acceptance.**
  🌐 *Verified by the P0.3a harness in headless Chromium and Firefox, including Playwright offline emulation, asymmetric/both-policy CSP lockdown, exact canary URL checks, prototype restoration checks, and all five cold-realm network primitives. Real-device confirmation is P0.19.*

- [x] **P0.9 — Capability self-check panel**
  *Deps: P0.8*
  Boot-time detection of `getRandomValues`, `crypto.subtle`, WASM, Workers, camera, and available save paths.
  **Accept:** accurate on every platform in the device matrix; **hard-fails with an explanation if `getRandomValues` is absent**, never substituting `Math.random`.
  🌐 *Verified by the P0.3a harness in headless Chromium and Firefox, including the missing-`getRandomValues` lockdown fixture. Safari and mobile accuracy is confirmed at P0.19 — no real-device platform result is inferred here.*

### Cryptography and vault

- [x] **P0.10 — Crypto layer**
  *Deps: P0.9*
  Pure-JS `@noble` as the default path; WebCrypto used only after an affirmative known-answer test; Argon2id WASM loading.
  **Accept:** RFC 9106 Argon2 vectors and NIST AES-GCM vectors pass on both paths; **vault details display which KDF is actually active**, so a silent PBKDF2 fallback is impossible.
  🌐 *Verified by independent Node vectors plus the Chromium/Firefox browser harness; device-specific KDF allocation behavior remains part of P0.19.*

- [x] **P0.11 — Vault format v1**
  *Deps: P0.10*
  Serializer and parser per [vault-format.md](../01-spec/vault-format.md): header, AAD, multi-record wrapped-DEK block, two compartments, HKDF subkeys, 64 KiB padding.
  **Accept:** round-trips; tampering with any header byte fails authentication; wrong passphrase and corrupted file are indistinguishable in the error; padding always lands on a 64 KiB boundary; **the secret subkey has no derivation path reachable while online.**
  🌐 *Verified by real P0.10-backed Node round-trips, all-header-byte tamper tests, generic authentication failures, and the Chromium/Firefox cold-only API boundary; physical vault workflows remain part of P0.19.*

- [x] **P0.12 — KDF profiles and benchmark**
  *Deps: P0.11*
  Fast/Standard/Paranoid profiles, stored in the header, with an on-device timing benchmark offered before vault creation.
  **Accept:** all three profiles round-trip; benchmark reports realistic timings; Paranoid warns about iOS allocation failure.
  🌐 *Verified by real profile round-trips, positive ordered on-device benchmark timings, a likely-iOS allocation guard, shared vault-health gating, and the cold-only browser offer. The literal placement before vault creation is an integration property: P0.12 does not contain creation controls, while the dependent P0.13 workflow places the benchmark immediately before them. Physical-device timing remains part of P0.19.*

- [x] **P0.13 — Lock, unlock, save, load**
  *Deps: P0.12*
  Historical implementation: File System Access, blob download, and manual Base64/numbered-QR save/load; idle auto-lock; `Esc Esc` panic hide. **Current behavior superseded by [ADR-0026](adr/0026-canonical-vault-save-and-live-transfer.md):** `.cbx` is the only durable vault format, Base64 is an advanced handoff, and vault animated QR is live device-to-device transfer only.
  **Historical P0.13 accept:** the three then-current save/load paths were complete browser flows. Direct local execution from iOS Files was never a P0.13 gate under [ADR-0010](adr/0010-ios-local-html-execution.md).
  🌐 *The P0.3a harness verifies the blob and manual paths in Chromium/Firefox. Physical supported-device confirmation remains P0.19. Quick Look is not Safari execution evidence, and no iOS result may be inferred from another platform.*

- [x] **P0.14 — Save integrity**
  *Deps: P0.13*
  Historical implementation: verify-after-save, user-visible generational filenames, rollback detection via save counter. **Current filename/rollback UX is amended by [ADR-0026](adr/0026-canonical-vault-save-and-live-transfer.md):** one canonical file per Vault ID, legacy generation parsing retained, canonical older-copy warning timestamp-only/advisory.
  **Accept:** a deliberately truncated save is caught before the dirty flag clears; opening an older vault warns with both dates and counters.

- [x] **P0.15 — Keyfile unlock**
  *Deps: P0.14*
  Wrapped-DEK method 2. Off by default, with an unmissable warning that a lost or byte-altered keyfile means permanent loss.
  **Accept:** unlocks with the correct keyfile; fails with a one-byte-altered keyfile; passphrase-only vaults are unaffected.

### Trust surface

- [x] **P0.16 — Provenance panel and self-hash verifier**
  *Deps: P0.15*
  Every embedded library with version and upstream hash; the full CSP allowlist; build date; expected hash; drag-and-drop self-hash drop zone.
  **Accept:** listed hashes match `dependencies.md`; **the drop zone states plainly that self-verification is circular** and points to [verification.md](../02-security/verification.md).
  🌐 *Drop-zone behaviour verified by the P0.3a harness via file upload emulation.*
  **Help-content deferral (recorded 2026-08-06, per doc-hygiene.md rather than left as an unstated packet assumption):** no feature shipped before P0.17 exists — including this one — has three-depth `docs/03-guides/` content compiled into the app, because the `::: plain / working / technical` compiler P0.17 builds does not exist yet. `docs/03-guides/README.md` documents the block syntax, but grepping the guide tree today shows zero files actually using it. This item's in-panel copy (library list, CSP display, circularity disclosure, expected-hash labeling) is plain-language UI text living directly in `src/index.html`/`src/main.js`, not guide content, and is not exempt from ordinary review for clarity — it is exempt from the three-depth *pipeline* specifically because that pipeline is P0.17's deliverable, not this item's. See P0.17 below for the backfill obligation this creates.

- [x] **P0.17 — Help framework**
  *Deps: P0.5*
  Three-depth content model; build-time compilation of `docs/00-overview/glossary.md` and `docs/03-guides/`; contextual `?`; inline glossary; offline search.
  **Accept:** all three depths render and switch; a documented feature missing a depth block produces a build warning; search works with no network.
  🌐 *Rendering and depth switching verified by the P0.3a harness.*
  **Backfill obligation:** every feature shipped at P0.1–P0.16 has user-facing in-app copy but no `docs/03-guides/` three-depth content compiled into it, because the compiler this item builds does not exist until this item ships. This item must backfill three-depth guide content for those features (including P0.16's provenance panel) as part of standing up the pipeline — not deferred further, and not scope creep, since each prior item explicitly deferred it here rather than skipping it silently.
  **Current state (recorded 2026-08-07, revised after independent review):** the compiler, the `::: plain/working/technical` block model, the Learn-page UI (depth switcher, offline search, contextual `?` on five panels, inline glossary), and their tests are implemented and passing. **The backfill obligation above is met**: every glossary term (**51 of 51** — including the four "Things people get wrong" corrections and the five new P0.1–P0.16 in-app-feature entries) and all nine `docs/03-guides/` files now carry three-depth content, and `npm run build` produces **zero** help-content warnings. New glossary entries back the P0.1–P0.16 in-app copy that previously had none (capability self-check, KDF profiles, save integrity, keyfile unlock, the provenance panel itself), and every shipped contextual `?` button resolves to real content — none point at a placeholder.
  **Independent review of PR #29 (2026-08-07) returned FAIL, four findings, since remediated:** (F1, blocking) `verifyDevOnlyDependency()` in `scripts/run-browser-harness.js` copied only `scripts`/`src`/`vendor` into its dependency-free temp build, but P0.17's build now also reads `docs/`, so `npm run test:browser` exited 1 on ENOENT before either browser engine ever reached `verifyHelpFramework()` — fixed by adding `docs` to the copied directories; (F2, advisory) the "no machine paths in build output" regression test's exclusion for JSON `\uXXXX` escapes was too broad and would have missed a real path like `C:\u1234\repo\file.js` — fixed by naming the exact three sequences `jsonScriptLiteral()` emits (`\u003c`, `\u003e`, `\u0026`) instead of any `u`+4-hex shape, with an adversarial regression test added; (F3, advisory) the packet's verification evidence (Node version, build hash, test count) did not reproduce — see the packet for corrected, reproduced figures; (F4, advisory) this note and ADR-0016 understated the backfill as incomplete and the glossary count as 46 — both corrected here to the real compiled state (51 terms, zero warnings). The independent reviewer separately confirmed, with real network access, that Chromium and Firefox both install and launch in this repository's environment — the browser-harness failure was caused entirely by F1, not by an unfixable sandbox limitation.
  **Second independent review round (2026-08-07) returned FAIL again, three findings:** the F1 fix above was incomplete — three other temporary build-root fixtures in `scripts/run-browser-harness.js` (`createColdReadySuppressedFixture`, `createHandshakeResponseSuppressedFixture`, `createMissingRandomnessFixture`) still only copied `scripts`/`src`/`vendor`, so the harness still failed on ENOENT before reaching `verifyHelpFramework()` — fixed by routing all four fixtures through one shared `copyBuildInputsInto()` helper, so the build-input list can no longer drift out of sync at only some call sites. More significantly, the reviewer's own real-Chromium probe found a genuine product defect no prior layer of review had caught: three of the five contextual `?` buttons (cold-realm status, airgap banner, vault status) were nested inside `<h2>` titles whose entire `.textContent` gets rewritten by `src/main.js` on every state change, silently deleting the button along with the old text — only 2 of 5 survived real app initialization. Fixed by giving each affected title a dedicated child `<span>` for its dynamic text, with the button as a sibling instead of a doomed child; `verifyHelpFramework()` now asserts all five buttons survive a fully-settled app and exercises every one of their mappings, not just two. The packet's evidence was regenerated a second time against the tip that actually includes both fixes.
  **`npm run test:browser` has now passed cleanly end to end, in both Chromium and Firefox, on the repository-pinned Node `24.16.0`, with real network access (2026-08-07):** run directly by the human maintainer on their own machine, since the authoring sandbox still cannot download Playwright's binaries. The first run (at the commit both R2 fixes landed on) got through every previously-unreachable fixture and 38 checks before failing on one more real bug: a Playwright locator meant to find the "Seed phrase" glossary entry matched 9 elements instead of 1, because that phrase is legitimately cross-referenced in 8 other entries' compiled prose. Not a product defect — fixed by selecting the compiler's own deterministic id instead of a substring match. Rerun immediately after: clean pass in both engines, including the new five-button settled-DOM check from the second review round. Full output is in the packet.
  **Left at `[~]` per review-protocol.md**, not because of any remaining known defect, but procedurally: the author never marks their own item `[x]`, and this pass — while real, complete, and independently reproducible from the pasted output — was executed by the maintainer rather than by an independent reviewer. Whoever reviews next can either accept this evidence directly or reproduce the same `npm run test:browser` run themselves before flipping this checkbox.

- [x] **P0.18 — CI** ⚠️ *needs repository secrets configured by the human before the attestation step works*
  *Deps: P0.16, P0.17*
  GitHub Actions: build, test, `verify-vendor`, lint, **double-build hash comparison**, second-OS build comparison, bundle size report, release attestation. Plus the documentation checks in [doc-hygiene.md](doc-hygiene.md): internal link resolution, review dates present and within max age, three-depth help blocks, doc index consistency, roadmap ID references, and `dependencies.md` matching `vendor-manifest.json`.
  **Accept:** CI hash matches a local build; a nondeterministic change fails CI; a broken internal link fails CI; a missing review date fails CI; an out-of-date review date warns.
  **Current state (recorded 2026-08-07):** `.github/workflows/ci.yml` added — a `build` job matrixed across `ubuntu-latest`/`windows-latest` (each running `verify-vendor`, `lint`, `check-docs`, `npm test`, then a double build with an in-job hash diff), a `compare-hashes` job comparing the two OS legs' hashes, an always-run `browser-tests` job (Playwright, per [ADR-0007](adr/0007-headless-browser-harness.md)), a per-OS bundle size step-summary report, and a tag/release-gated `attestation` job using `actions/attest-build-provenance@v4`. `scripts/check-docs.js` (already on this branch before this item's own work began) implements every doc-hygiene check the acceptance criteria name, plus a new eighth check (`TODO`/`TBD` in user-facing docs, WARN) added as part of closing this item, with negative-fixture tests for all eight. Structural decisions recorded in [ADR-0017](adr/0017-ci-workflow-structure.md).
  **Independent review history:** the first real GitHub Actions runs against PR #30 have now actually occurred, with concrete per-job results, superseding the original "not verified" disclaimer this note used to carry. **R1 review returned FAIL** (one blocking, two advisory): every build-producing checkout step used `actions/checkout`'s bare defaults, which on `pull_request` events check out a shallow (`fetch-depth: 1`) synthetic merge commit rather than the real PR head SHA with full history — since `build.js` derives its embedded build date from `git log -1 -- src scripts vendor`, this desynced the hosted-CI artifact hash from a full-history local build of the identical commit, violating "CI hash matches a local build." Remediated by adding explicit `ref: ${{ github.event.pull_request.head.sha || github.sha }}` and `fetch-depth: 0` to every checkout step. R1 also bumped five stale/Node-20-deprecated Action pins (`checkout@v4`→`v7`, `setup-node@v4`→`v6`, `upload-artifact@v4`→`v7`, `download-artifact@v4`→`v8`, `attest-build-provenance@v1`→`v4`) and corrected a packet hash that had gone stale relative to the tip it claimed to describe. **R2 review returned FAIL again** (one blocking, two advisory) at tip `57ebcc4`: `build (ubuntu-latest)` passed cleanly and its artifact hash exactly matched an independent full-history local build (confirming R1's checkout fix actually works), but `build (windows-latest)` failed inside `npm test` (148/149) on `test/help-content.test.js`'s "single JSON statement" assertion, so `compare-hashes` never ran. Root-caused (not assumed) to a genuine test-suite race condition, not a line-ending issue as first suspected: three test files (`build.test.js`, `help-content.test.js`, `provenance.test.js`) each spawn their own build against the same shared `build/coldbox.html` path, and Node's test runner ran test files concurrently by default, so a reader could observe a file truncated mid-write by a concurrent build — reproduced directly by hammering concurrent builds against one checkout, and confirmed *not* to be CRLF-related by reproducing the CRLF scenario separately and observing it fail differently (at `lint.js`'s own CRLF check, not at HELP_CONTENT parsing). Remediated by making `scripts/build.js`'s `writeBuild()` write atomically (temp file + rename, so a reader only ever sees a complete file) and by serializing test-file execution (`--test-concurrency=1`) so the race can't occur at all; also bumped `setup-node@v6`→`v7` (the one Action pin that had gone stale since R1) and re-synced this note, the PR packet, and `CHANGELOG.md` with the actual review history. Ubuntu build+hash-match and the browser-harness job are proven passing on real hosted runners as of R2's run; the Windows unit-test leg and the resulting cross-OS `compare-hashes` job are what this round's remediation addresses and what the next independent review must confirm against a fresh real CI run. See the PR packet's §13–§14 for full evidence.
  **What remains unverified:** a fresh hosted-Windows `npm test` run and a full `compare-hashes` pass against this remediated tip — this authoring sandbox cannot trigger GitHub Actions, so the R2-F1 fix's real-world effect on the hosted Windows runner is confirmed only by local reproduction-and-fix-verification (see the packet), not by an observed hosted-Windows pass. Attestation's real success remains unverified pending repository secrets only the human can configure.

  **R3 review returned FAIL a third time** (zero blocking, two advisory) even though the actual roadmap acceptance criteria were independently confirmed green on a real hosted run (Ubuntu and Windows both green, cross-OS hash comparison, browser harness, docs/fail-closed checks all passing) — the binary review protocol treats any advisory finding as a FAIL regardless. R3-F1: the R2 remediation's atomic-write comments and packet language overclaimed `writeBuild()`'s guarantee as safe under concurrent *writers*, when a reviewer reproduced a real Windows `EPERM` on `fs.renameSync` under six concurrent build processes racing the same path — remediated by narrowing the claim in `scripts/build.js`'s comments to what's actually true and used (atomic visibility to readers under a single writer; concurrent multi-writer safety is explicitly out of scope, since real usage is always serialized). R3-F2: the packet's cited hash had gone stale relative to this round's tip — remediated with a freshly regenerated local hash, flagged as provisional pending the human's actual commit (the embedded build date is git-commit-derived, so it shifts again once committed). See the packet's §15 for full evidence.

- [x] **P0.20 — In-app Appropriate Legal Notices (AGPLv3 §5(d))**
  *Deps: P0.16*
  **Placed before P0.19 deliberately, out of numeric order.** Its dependency is P0.16, not P0.18, and P0.19 is `👤 human-required` — an agent reaching P0.19 must stop, so an item listed after it would never be picked up. Ordering encodes dependency in this file, not numbering.
  The provenance panel gains the Appropriate Legal Notices AGPLv3 §0 defines and §5(d) requires an interactive UI to display: the copyright notice, the absence of warranty, the statement that recipients may convey the work under the same licence, and how to view the licence. The full `LICENSE` text is embedded in the bundle and viewable offline — not linked to a URL, which would be unreachable in the airgapped case the whole app is designed for and would violate the no-network-fetch constraint besides.
  **Accept:** the notices are reachable from the app's own UI without a network connection and without leaving the file; the embedded licence text is byte-identical to the repository's `LICENSE` (asserted by a test that compares them, so the two cannot drift); the notice states the licence by SPDX identifier `AGPL-3.0-only`; the bundle remains within the [SPEC §3](../01-spec/SPEC.md) size budget with the delta recorded; **no release may be tagged until this ships**, since tagging is a conveyance and §5(d) applies to it — the gate is recorded in [release-checklist.md](release-checklist.md) rather than left to memory. Rationale in [ADR-0018](adr/0018-agplv3-license.md).
  🌐 *The "reachable from the app's UI with no network" criterion is verified against the built artifact by the P0.3a harness; the byte-identity criterion is a Node test.*
  **Current state (recorded 2026-08-07):** implemented on branch `p0.20-legal-notices`. The Provenance panel's new "Legal notices" section states the copyright notice, no-warranty statement, may-convey-under-this-licence statement, and the `AGPL-3.0-only` SPDX identifier (tested against `package.json`'s `license` field so the two can't drift), and embeds the full `LICENSE` text in a `<details>` disclosure populated on load. `scripts/build.js`'s new `readLicenseText()` reads the repository's raw `LICENSE` bytes with no normalization; `test/legal-notices.test.js` asserts byte-identity via `Buffer` comparison plus three negative tests (tampered LICENSE, missing placeholder, duplicated placeholder). `scripts/run-browser-harness.js` gained `verifyLegalNotices()`, wired into the existing Chromium/Firefox run loop, using real `setOffline(true)` emulation — **not run in this authoring session**, since this sandbox has no outbound network access to download Playwright's browser binaries (`npx playwright install chromium` fails with `Connection blocked by network allowlist`), the same limitation P0.18's packet disclosed; verified only by static inspection of the harness code plus `node --check`. Bundle size: 1,040,057 → 1,080,408 bytes, **+40,351 bytes (≈+39.4 KB)**, recorded in CHANGELOG.md; well inside the SPEC §3 budget. (Corrected during review remediation — see CHANGELOG.md's note on the `git archive` vs `git worktree` build-date measurement artifact.) `release-checklist.md`'s P0.20 gate already existed (added with the relicensing commit) and needed no further change. `npm test` (158/158, including 9 new tests in `test/legal-notices.test.js`), `npm run lint`, `node scripts/check-docs.js`, and a double build under different locale/timezone (identical hash) all pass locally; `npm run verify-vendor` (online mode) cannot run in this sandbox for the same network reason and is unrelated to this item — `node scripts/verify-vendor.js --offline`, what `build.js` actually invokes, passes. Independent review, a real hosted `test:browser` run, and the human's confirmation of the copyright holder/year are all outstanding — see the PR packet.
  **Remediation round (recorded 2026-08-07):** an independent review of commit `40c288d` returned FAIL (3 findings; report at `docs/05-development/packets/p0.20-legal-notices.review.md`). Fixed: F1, `verifyHelpFramework()`'s hardcoded five-button assertion, now expects six and exercises `glossary:appropriate-legal-notices` the same way the other five are exercised. F2, `test/build.test.js`'s `NO_MACHINE_PATHS` blind spot on machine paths introduced via `LICENSE`, closed by scanning the licence text's real unescaped bytes independently of the whole-document scan, plus a negative regression reproducing the reviewer's exact attack. F3, the recorded bundle-size baseline, corrected from 1,040,074 to the reproducible 1,040,057 bytes (see CHANGELOG.md). `npm test` now 159/159 (158 plus the new F2 negative regression); `npm run verify-vendor` passes in both offline and online mode in this session (this sandbox's Node `fetch` needs `NODE_USE_ENV_PROXY=1` to see the outbound proxy — without it, `fetch failed`/`EAI_AGAIN`, which is what previous packets' "no outbound network access" notes were actually hitting); `npm run lint` and `node scripts/check-docs.js` pass; a double build is byte-identical. **`npm run test:browser` still could not be completed end-to-end in this sandbox**, for reasons distinct from the code: Chromium's download redirects to `storage.googleapis.com`, which this sandbox's network allowlist blocks outright (`403 blocked-by-allowlist`); Firefox downloads successfully but fails to launch because required shared libraries (`libgtk-3.so.0`, `libXdamage.so.1`, and a `libnss3` new enough for `libxul.so`) are absent from the OS image and installing them needs root, which this session does not have. The F1 fix itself was verified by tracing `helpDomId()` in `src/main.js` and the compiled glossary/panel output by hand, not by a real browser run. See the PR packet for the exact commands and error text. Node here is `v22.22.3`, not the repository-pinned `v24.16.0` (same access restriction blocks fetching the v24 toolchain); both the base and P0.20 builds nonetheless reproduce the reviewer's own Node-v24.16.0 byte counts exactly, which is evidence but not proof that this repository's build output is Node-version-independent across 22→24. A fresh independent review of the new exact tip is requested before merge.

- [x] **P0.21 — Cold-realm injected-provider neutering**
  *Deps: P0.8*
  **Also placed before P0.19, for the same reason P0.20 is** — its dependency is P0.8, and an agent reaching the `👤 human-required` P0.19 must stop.
  Extend P0.8's runtime neutering to cover `window.ethereum` and the `eip6963:announceProvider` event alongside the five network primitives, on the same non-configurable, non-writable basis, installed on both the exposed object and its owning prototype.
  **This closes a hole that exists today, and is entirely independent of the wallet-extension integration that was rejected in [ADR-0020](adr/0020-injected-providers-rejected-and-neutered.md)** — it is that investigation's one durable finding, and it ships whether or not Coldbox ever talks to an extension. Sandboxed `srcdoc` frames are not reliably excluded from extension injection — that is a browser implementation detail, not a guarantee — and at present nothing stops an extension injecting a provider into the cold realm and nothing notices if one does. A provider inside the sealed realm is an egress channel that `connect-src 'none'` cannot touch, because provider calls are not subject to page CSP at all ([csp-policy.md](../02-security/csp-policy.md)).
  **Accept:** an announcement or provider object observed inside the cold realm enters **full lockdown** and refuses vault operations, exactly as a network-primitive call does; the alarm text **distinguishes an isolation failure from a policy failure**, since the two call for different responses from the user; the blockers survive an attempt to redefine or delete them, proven by a negative test that tries; a fixture dispatching `eip6963:announceProvider` inside the cold realm is detected. Rationale in [ADR-0020](adr/0020-injected-providers-rejected-and-neutered.md).
  🌐 *Verified by the P0.3a harness in Chromium and Firefox, alongside the existing prototype-restoration and network-primitive checks.*
  **Current state (recorded 2026-08-07):** implemented on branch `p0.21-injected-provider-neutering`. `src/airgap.js` gains `neuterProviders()`, mirroring `neuterNetwork()`: a non-configurable, non-enumerable accessor is installed for `window.ethereum` on both the object and its property owner (getter returns `undefined`, setter reports the attempt rather than silently swallowing it), and a capture-phase `eip6963:announceProvider` listener on `window` reports and stops propagation. Wired into `src/cold/main.js`'s `completeBootstrap()`: a new `recordProviderIsolationViolation()` sets `data-airgap-state="red"`/`data-lockdown-state="full"`/`data-vault-operations="refused"` and writes alarm text that opens with "Cold realm isolation failure" and explicitly states this is not a network-policy violation — distinct wording from the existing CSP/runtime-network alarm text, per the accept criterion. `data-provider-neutering` gates `vaultHealthReady()` in `src/cold/vault.js` exactly as `data-runtime-neutering` already does, and the capability travels to the warm shell via `providerNeutering` in the `ready` message (`src/protocol.js` whitelist, `src/main.js` handshake gate) and a new `provider-isolation-violation` warning code with its own warm-side copy. `test/airgap.test.js` gained 6 tests: setter-attempt reporting, a negative test that `Object.defineProperty`/`delete` cannot remove or redefine the accessor, `eip6963:announceProvider` detection via a dispatched fixture, an unrelated-event non-trigger, and two install-failure paths; `test/vault.test.js` updated its default/failure fixtures for the new gate attribute. `scripts/run-browser-harness.js` gained `verifyProviderNeutering()`, wired into the existing Chromium/Firefox loop immediately after `verifyUnlockedRuntimeHealthLockdown()`: negative redefine/delete survival, a live `window.ethereum` assignment triggering full lockdown with isolation-specific text on both the cold-frame (`#cold-realm-details`) and warm-shell (`#cold-realm-status-copy`) sides, an unrelated-event non-trigger, and a dispatched `eip6963:announceProvider` fixture triggering the same lockdown — **not run in this authoring session**, since this sandbox has no outbound network access to download Playwright's browser binaries (`npx playwright install chromium firefox` fails with `403 Connection blocked by network allowlist`), the same limitation P0.18's and P0.20's packets disclosed; verified only by `node --check`, `npm run lint`, and manual tracing against the element IDs and message-passing code it exercises. `npm test` (165/165, including the new provider-neutering tests in `test/airgap.test.js` and `test/vault.test.js`), `npm run lint`, `node scripts/verify-vendor.js --offline`, and `node scripts/check-docs.js` all pass locally; a double build under different `TZ`/`LC_ALL` is byte-identical (`7fa41c9d3981dd5addd360c5aed06390294526b8c433e5f27e849b20ffd8891e`). Bundle size: 1,080,408 → 1,089,324 bytes, **+8,916 bytes (≈+8.7 KB)**, recorded in CHANGELOG.md; well inside the SPEC §3 budget. Independent review and a real hosted `test:browser` run are outstanding — see the PR packet.
  **Remediation round (recorded 2026-08-07):** an independent review of commit `a59afce` returned FAIL (1 finding; report at `docs/05-development/packets/p0.21-injected-provider-neutering.review.md`). **F1 (blocking):** a provider already present at `window.ethereum` when `neuterProviders()` installed was silently overwritten — the guard reported plain installation success with no isolation violation, so cold bootstrap could reach `ready` with a provider having existed and been wiped rather than routing through the mandated full-lockdown path. Fixed: `defineProviderBlocked()` in `src/airgap.js` now inspects the existing property descriptor before installing (`inspectExistingValue()`) — reading only a data descriptor's `value`, never invoking a getter or any method on the object found there — and reports the same `onAttempt` isolation-violation callback used for post-install assignment attempts if something is already there. `neuterProviders()` returns a new `preexisting` field; `src/cold/main.js` now computes `providerNeuteringInstalled = providerNeutering.installed && !providerNeutering.preexisting`, keeping `coldReady` false in this case, while guarding the generic "could not be installed" alarm text from firing over the more specific isolation text `recordProviderIsolationViolation()` already set. New unit regression in `test/airgap.test.js` proves a preexisting provider is reported, neutered, and — critically — never called into during detection (a spy `request()` method asserted uncalled), plus a negative test that the default/explicit-`undefined` case does not false-positive. New browser-harness fixture `createPreexistingProviderFixture()` patches `src/cold/main.js` to assign `window.ethereum` as the very first statement in the cold IIFE (before any of Coldbox's own code runs, matching how an injected extension would actually beat the guard), and `verifyPreexistingProviderLockdown()` asserts the built page never reaches `data-handshake-state="ready"` or `data-cold-state="ready"` and instead shows full lockdown — not run in this remediation session for the same disclosed reason (no outbound network access to Playwright's binaries); the fixture's build step itself was verified manually (confirmed the injected script lands in the built HTML via a standalone script, `build status 0`). `npm test` now 167/167 (165 plus the 2 new F1 tests); `npm run lint`, `node scripts/verify-vendor.js --offline`, and `node scripts/check-docs.js` all pass; a double build under different `TZ`/`LC_ALL` is byte-identical (`5e49d9c796caf9bde14b5a6c84fa407f25f7d7d4662a4ff15b8163217633f3f4`). Bundle size: 1,089,324 → 1,094,321 bytes for this remediation (**+4,997 bytes**), cumulative delta from `main` now **+13,913 bytes (≈+13.6 KB)**, still well inside the SPEC §3 budget. A fresh independent review of the new exact tip is requested before merge.

- [x] **P0.22 — Provenance build-date ISO rendering hardening**
  *Deps: P0.16, P0.18*
  Defect remediation for P0.16 under [ADR-0015](adr/0015-provenance-build-date-and-self-hash.md): keep the embedded source-commit date in a fixed explicit numeric-offset form across Git versions, and make the exported formatter reject malformed direct inputs before arithmetic.
  **Accept:** a UTC product commit embeds `+00:00`, never `Z`; valid non-UTC offsets remain byte-neutral with the historical rendering; the formatter is locale/timezone independent; malformed Git output degrades to the labeled unknown; invalid signs, negative offset components, noncanonical offset components, impossible offsets, and unrepresentable instants are refused by the formatter itself; the complete build path remains reproducible; and the regression tests cover the direct formatter contract with negative cases.
  **Tracking:** this is a separately tracked build-reproducibility defect, not new product scope. It uses the existing ADR-0015 decision and leaves the reviewer to move `[~]` to `[x]` after an independent PASS.

- [~] **P0.19 — Device matrix pass** 👤 **human-required**
  *Deps: P0.18*
  Full manual pass per [testing.md](testing.md) across the supported execution matrix; record the deferred iOS local-execution target separately. Windows Edge/Chrome/Firefox hands-on retest on 2026-08-08 passes all currently testable non-camera flows at candidate `eae0e4c2a700781ac87b037a952dba09c7275698`. Camera receive remains open: the capability panel reports the camera API available, while the receiver says Camera is off and keeps Start camera scanner disabled. macOS, Linux, Android, Tails, and the formal iOS local-execution result are deferred; third-party iOS HTML-reader execution is non-qualifying evidence under ADR-0010. Full findings and the accepted remediation design are recorded in `packets/p0.19-device-matrix.md`, [ADR-0024](adr/0024-warm-reachability-monitor.md), [ADR-0025](adr/0025-vault-identity-library-and-save-ux.md), and [ADR-0026](adr/0026-canonical-vault-save-and-live-transfer.md).
  **Accept:** after remediation, every platform in the supported execution matrix passes the per-platform checks in [testing.md](testing.md) and the results are recorded in the P0.19 evidence packet. In particular, the vault check uses at least two named vaults (creation phrase confirmation with visible mismatch feedback, immutable Vault ID, public-name collision refusal, one canonical `<name>--<id8>.cbx` with no visible generations, unchanged-save duplicate refusal, truthful Saved · verified / Saved · unverified status, normal-lock warning from both warm and cold visible controls, reload/library selection, one-phrase unlock, correct active identity). The network check exercises both loss and restoration of external reachability while verifying the cold realm remains sealed and unknown status fails online-safe. Where camera QR decode is available, live animated-QR transfer is tested device-to-device; where unavailable it is recorded honestly with `.cbx` fallback. No downloadable vault QR artifact is permitted. The iOS local-execution target is recorded separately as **PASS, BLOCKED, or UNSUPPORTED** with the exact device and iOS version. A `BLOCKED` or `UNSUPPORTED` iOS result does not fail P0.19 under [ADR-0010](adr/0010-ios-local-html-execution.md), but remains visible portability debt. Quick Look, a third-party viewer, localhost, a renamed file, or another execution context is not a Safari-from-Files PASS unless a later accepted ADR explicitly qualifies it.
  Requires physically opening the file on real devices. An agent must not mark this complete, and must not infer a platform's result from a similar one.

---

## Phase 1 — Core wallet

*P0.19 remains deferred by maintainer decision; P1.3 work is explicitly authorized to proceed while the device matrix stays `[~] human-required`.*

- [x] P1.1 Entropy Lab: dice, coins, cards, CSPRNG, mixing
- [x] P1.2 Entropy Health Meter and Bias Analyzer
- [x] P1.3 Seed Forge: BIP-39 generate, validate, passphrase, fingerprint
  **Current state (recorded 2026-08-10):** the cold-only flow is Entropy Lab → Mix → Use this mix in Seed Forge → BIP-39 mnemonic → optional passphrase → raw BIP-39 seed + live master fingerprint. Generate and Validate Existing Phrase have separate passphrase/confirmation pairs and separate live seed/fingerprint derivation state; matching or mismatching one workflow affects only that workflow, and teardown clears both. The explicit handoff consumes the exact mixed bytes once without a second mix. All ten vendored BIP-39 wordlists are covered by official PBKDF2 vectors, including Japanese final NFKD handling. Evidence and the remediation response are recorded in `packets/p1.3-seed-forge.md`; the unchanged FAIL report is `packets/p1.3-seed-forge.review.md`; a fresh independent review must verify the new exact head and flip this marker to `[x]` on PASS. PR #36 remains DO NOT MERGE until then.
- [x] P1.4 Derivation engine: BIP-32 core plus Bitcoin script types
- [x] P1.5 Derivation: EVM and generic arbitrary-path mode
- [x] P1.6 Registry CRUD: wallets, accounts, addresses
- [x] P1.7 Notes, tags, and concealment levels
  **Current state (recorded 2026-08-10):** public Markdown notes, canonical shared tags, registry search, reversible hidden flags, persisted privacy blur, and session-scoped hidden-record reveal are implemented. Public projection validation rejects secret notes; the re-authentication phrase stays inside the cold realm. Evidence is in `packets/p1.7-notes-tags-concealment.md`; the marker remains `[~]` for independent review.
- [x] P1.8 Device registry
  **Current state (recorded 2026-08-10):** the public Devices workspace records the canonical Device metadata fields, bounded seed fingerprints, tamper/PIN/purchase context, passphrase-use boolean, lifecycle state, location, notes, and reversible hidden flag. Warm CRUD/search uses the typed public registry mutation boundary; device records never connect to hardware or carry secret material. Evidence is in `packets/p1.8-device-registry.md`; the marker remains `[~]` for independent review.
- [x] P1.9 Verification workflows: fingerprint, receive address, xpub, backup, passphrase ⚠️ *implementable by agent; final validation needs real hardware wallets*
  **Current state (recorded 2026-08-10):** four public comparison panels use one explicitly linked cold-local Seed Forge identity; Seed Forge is the only mnemonic/passphrase entry surface. The selected network/script, account path, family xpubs, and bounded receive/change ranges are shown for verification, while external fingerprints, addresses, and xpubs are strict checksum-validated public inputs. The passphrase check is performed by selecting and confirming the exact passphrase in Seed Forge, not by a duplicate Verify Bench shell. Evidence is in `packets/p1.9-verification-workflows.md`; the marker remains `[~]` for independent review and the real-device validation gate remains open.
- [x] P1.10 QR generation: addresses, SeedQR, Compact SeedQR, printable cards
  **Current state (recorded 2026-08-10):** public address QR generation supports local BIP-21/EIP-681 payloads with integer-wei Ethereum amounts and SVG/PNG export in the warm shell; Ethereum labels are rejected because EIP-681 has no Bitcoin `label` field. Standard SeedQR is explicitly English-only, Compact SeedQR uses the SeedSigner-compatible low-correction 21x21/25x25 sizes, and both remain cold-only with explicit plaintext acknowledgement, printable layouts, transcription grid, and SVG/PNG export. The cold print dialog uses the narrowly scoped `allow-modals` permission while `allow-same-origin` remains absent. Evidence is in `packets/p1.10-qr-generation.md`; the marker remains `[~]` for independent review.
- [x] **P1.11 Address verification state in the data model**
  *Deps: P1.6*
  The `addressOrigin`, `verificationState`, `lastColdVerifiedAt`, and `verifiedAgainstXpub` fields per [data-model.md](../01-spec/data-model.md), the schema migration, and the Registry surface that lists never-verified addresses. Rationale in [ADR-0021](adr/0021-clipboard-address-verification.md).
  **Accept:** a vault written by the previous schema version still opens (the migration test [data-model.md](../01-spec/data-model.md) requires); `verificationState` is never inferred — an address reaches `cold-verified` only via an actual cold re-derivation; changing an account's xpub moves its verified addresses to `cold-verified-stale` **automatically**, and a test proves a stale entry is never displayed as verified.
- [x] **P1.12 Clipboard round-trip address verification**
  *Deps: P1.11, P1.9*
  Full-string comparison with divergence index, the round-trip flow, inbound and batch verification, and the two-claim verdict model per [address-verification.md](../01-spec/address-verification.md).
  **Accept:** comparison is character-exact over the whole string and **never** prefix/suffix — a fixture pair matching on the first and last four characters but differing in the middle is reported as a mismatch with the correct divergence index; bech32 compares case-insensitively while base58check does not; a mixed-case EVM address failing EIP-55 is reported as `checksum-invalid`, distinctly from both match and mismatch; **a locked vault reports `vault-locked`, never `no-record`** — reporting "no match" when the registry simply cannot be read is a false negative on a security check and is the worst available bug here; a warm-only verdict against an `unverified` or `unverifiable` address states that inline every time; `address.verifyResult` carries enum codes only, with a test asserting no free-form string field exists on it ([architecture.md](../01-spec/architecture.md)).
  🌐 *The clipboard-permission matrix — read-permitted, read-denied, write-only, API-absent — is a P0.3a harness matrix, not an assumption.*
- [x] **P1.13 Clipboard volatility canary** ⚠️ *opt-in; needs a permission the user may refuse*
  *Deps: P1.12*
  Re-read the clipboard after a delay with no user action; a change is affirmative detection of an active hijacker.
  **Accept:** off by default and never enabled implicitly by using another feature; with permission denied or the API absent, the paste comparison still works **and the UI states the canary is unavailable** rather than silently presenting the weaker check's result as the stronger one's; the alarm names benign causes (clipboard managers, sync tools, remote-desktop clients) **before** naming malware; permission can be re-requested without a reload.

## Phase 2 — Backup

- [x] **P2.1 SLIP-39**
  *Deps: P1.3*
- [x] **P2.2 codex32**
  *Deps: P1.3*
- [x] P2.3 Seed XOR
  *Deps: P1.3*
  Coldcard-compatible N-of-N splitting of BIP-39 entropy into 2, 3, or 4 independently checked phrases, with deterministic and CSPRNG-derived masks, cold-only UI, and local reconstruction.
  **Accept:** only 12-, 18-, and 24-word BIP-39 phrases are accepted; every generated part is independently valid BIP-39; deterministic output matches the published Coldcard construction and independent vectors; random output refuses missing `crypto.getRandomValues`; combine accepts all parts in any order but rejects missing, malformed, mismatched-length, or invalid-checksum parts; the source, parts, and combined phrase never cross the cold boundary or persist, are masked by default, and clear on teardown; docs state that Seed XOR is N-of-N and that any BIP-39 passphrase is separate.
- [x] **P2.4 Shamir39 and raw SSS**
  *Deps: P1.3*
- [x] **P2.5 Vault recovery shares**
  *Deps: P2.1*
  An additional offline-only vault unlock route: a configured threshold of
  SLIP-39 shares reconstructs the 32-byte vault DEK while the normal
  passphrase or passphrase-plus-keyfile route remains available. The vault
  stores only fixed public recovery metadata, never the printed share words.
  **Accept:** method 3 has a versioned fixed binary record with exact bounds,
  one normal record, and a recovery marker that makes pre-P2.5 readers reject
  recovery-enabled files; generation and recovery are cold-only and always use
  the empty SLIP-39 share passphrase; supplied shares must match every
  recorded SLIP-39 field encoded by each mnemonic and member-index bound, with
  exactly the required threshold groups/members supplied; malformed, duplicate,
  insufficient, surplus, mixed, tampered, unknown, or unsupported inputs failing closed;
  recovery metadata is authenticated with both encrypted compartments; the
  normal unlock route continues to work; replacing an existing set requires an
  explicit choice; share material never crosses the realm boundary or persists
  outside the cold session; and tests include an independent official vector
  plus a deterministic byte-exact method-data fixture.
- [x] P2.6 BackupRecords and verify-your-shares
  *Deps: P2.5*
- [x] P2.7 Backup Health dashboard
  *Deps: P2.6*
  **Validation policy (recorded 2026-08-14):** Under [ADR-0043](adr/0043-scoped-mobile-validation-deferral.md), the maintainer-approved physical-mobile `file://` validation deferral is non-blocking for this warm-only item-level review. The packet records the mobile rows as `DEFERRED`; this does not claim mobile support, alter the release device gate, or close P0.19.

## Phase UI — Interface restructure

Inserted between P2.7 and P2.8 by UI.1, so that every item from P2.8 onward is built inside the new interface rather than built twice. The design is the August 2026 sealed-realm reorganisation handoff; the decisions it depends on are [ADR-0044](adr/0044-panel-scoped-calm-rule.md), [ADR-0045](adr/0045-released-secret-model.md), [ADR-0046](adr/0046-vault-name-availability-at-unlock.md) and the approved desktop/mobile evidence contract in [ADR-0049](adr/0049-approved-mock-parity-contract.md).

The IDs are lettered rather than numbered into Phase 2 because `P2.8` is referenced by roughly fifteen archived packets and review reports as "printable cards"; renumbering it would falsify that record.

**The handoff's implementation order from UI.3 through UI.8 is load-bearing.** The released-secret state has to exist before anything can be tested against it; the phrase fields cannot be deleted until it does; the floating menu is built once because forty-odd surfaces use it. UI.4a freezes what "matches the approved mock" means before the remaining visual work, and UI.11 is the hard parity gate before Phase 2 resumes.

Every later roadmap item that activates a screen listed in the [approved reference manifest](ui-reference/approved/manifest.json) inherits [the parity contract](../01-spec/ui-parity.md), even though it sits outside Phase UI. Until its underlying feature exists, the shared shell shows that destination unavailable rather than presenting a fake working screen.

- [x] **UI.1 Design reconciliation**
  *Deps: P2.7*
  Land the three ADRs, rewrite [design-system.md](../01-spec/design-system.md) §6 from realm-scoped to panel-scoped, add `.realm-strip` as a named component, reconcile the light-mode token conflict, correct the stale bundle-size figures, and create this phase. No `src/` change.
  **Accept:** ADR-0044, ADR-0045 and ADR-0046 exist, are indexed, and are linked from every document whose behaviour they change; §6 no longer contains a realm-scoped surface entry; §7's superseded second reason is corrected; `.realm-strip` is specified with angle, band width, both palettes and the no-motion requirement; the three conflicting light tokens are resolved in favour of the shipped values with the decision recorded; [dependencies.md](dependencies.md#bundle-budget) is the **single** home for the measured artifact size, target and hard cap, and carries a real measurement with its provenance rather than an estimate, while [SPEC.md](../01-spec/SPEC.md) restates none of those figures anywhere and links to it instead — a grep for the size, the target or the cap outside `dependencies.md` returns only historical records; ADR-0009, ADR-0023, ADR-0025 and ADR-0028 carry amendment markers pointing at the new records; no file under `src/` is modified.

- [x] **UI.2 Brand assets — wordmark and favicons**
  *Deps: UI.1*
  Replace the CSS text wordmark in `.app-bar` with the supplied Coldbox logo, and add favicons. Both embedded, both offline, both reproducible.
  **Source assets:** `coldbox-logo.png` (1494×514 RGBA, two flat colours) and `favicon-c-lower-{16,32,48}x{...}.png`, supplied by the maintainer 2026-08-14. The wordmark ships as SVG traced from the PNG with `potrace --flat -O 1.0 -t 8 -a 1.3 -u 10` over a black mask and a cyan mask, combined into one two-path document — 419,715 bytes of PNG becomes ~25 KB of SVG, against ~560 KB had the PNG been embedded as base64. The traced SVG is committed as a source asset; it is not re-traced at build time.
  **Accept:** the wordmark is an inline SVG carrying `--fill-cyan` and `--fill-ink` rather than literal hex, so it follows the theme and §3's no-inline-hex rule; it renders legibly at app-bar height and at 320px viewport width; it carries an accessible name of `Coldbox`; the favicons are `data:` URIs at 16, 32 and 48 px and resolve with no network and no sibling file from `file://`; `scripts/lint.js` passes, which means no external URL and no fetched asset; the build remains reproducible across two runs; the size delta is recorded against [dependencies.md](dependencies.md#bundle-budget); [design-system.md](../01-spec/design-system.md) §5 `.app-bar` is updated to describe the logo rather than the five-layer text-shadow wordmark it replaces; the `Pre-release · Not audited` badge and §2's copy rules are untouched; and **the SVG contains no `<script>`, no `<foreignObject>`, no `href`/`xlink:href`, and no external reference of any kind** — the CSP would block execution regardless, but a new content type entering the document is checked rather than assumed.

- [x] **UI.3 Released-secret state and the secret switcher** 🌐
  *Deps: UI.1*
  The session-scoped registry from [ADR-0045](adr/0045-released-secret-model.md), in `src/cold/main.js`, plus the switcher strip. Nothing else in this phase can be tested without it.
  **Accept:** a secret released from Seed Forge appears in the switcher with its label and public master fingerprint; several secrets can be released and exactly one is focused; changing focus re-points every dependent panel with no reload and no re-entry; the registry is cleared and its buffers zeroized by each of vault lock, idle timeout, panic and realm teardown, each covered by a test; no released secret, and no derivative of one, appears in any message to the warm shell; the empty registry renders a designed empty state that explains what cleared it; nothing is persisted to any vault compartment or storage; **the focused secret's public master fingerprint is visible on any panel that performs a destructive, splitting or exporting action**, because acting on the wrong secret is the failure mode a multi-secret switcher introduces and the fingerprint is the only thing that distinguishes them; and the keyboard shortcut that clears the registry is confirmed not to collide with the panic binding — if it does, one of the two changes and the change is recorded in the packet.

- [x] **UI.4 Sealed-realm tool grouping and hub** 🌐
  *Deps: UI.3*
  Restructure `src/cold/index.html` into the six sealed groups and delete the five duplicate seed/source-loading fields while retaining Seed Forge's single seed-entry field, re-pointing each tool at the focused secret.
  **Accept:** `#cold-seed-xor-source`, `#cold-codex32-secret-hex`, `#cold-shamir39-source`, `#cold-raw-sss-source` and `#cold-slip39-seed-source` no longer exist and their tools read the focused secret instead; `#cold-seed-forge-mnemonic-input` remains as the realm's single entry point; **a test asserts the declared secret-input registry specified in [ADR-0045](adr/0045-released-secret-model.md) holds**: every input in `src/` that accepts secret material is declared with a category, no undeclared one exists, and **exactly one carries the category `seed-entry`**. **This item removes seed/source-loading inputs and only those** — the five listed above, leaving Seed Forge's. The registry must enumerate the legitimate sealed inputs that are not seed entry — vault passphrase and confirmation, keyfile, recovery re-authentication, recovery-share entry, concealment re-authentication, secret notes, the BIP-39 passphrase fields, and the share-combine fields — **every one of which stays.** A tool that reconstructs from shares must still accept share words; removing those inputs would break recovery, which is the opposite of this item's purpose. A naive count of secret-accepting inputs is not an acceptable implementation of this criterion; it was tried in an earlier draft and was false on the day it was written; every migrated tool derives what it displays from the focused secret and **has no seed/source-loading input of its own** — it may still have the inputs its own job requires; every secret value is masked on first paint; each tool's existing behaviour and test coverage is preserved, not reduced; the cold CSP is byte-identical to before the restructure and a test asserts cold still has no network capability.

- [~] **UI.4a Approved desktop/mobile mock parity contract**
  *Deps: UI.4*
  Freeze the maintainer-approved desktop and mobile handoffs as repository-owned visual evidence before more implementation can drift from them. This item defines and tests the contract; it changes no product source.
  **Accept:** byte-exact, non-build copies of both approved handoffs are committed under `docs/05-development/ui-reference/approved/` with SHA-256, byte length, render viewport, product comparison region, navigation taxonomy and complete screen inventory in a machine-readable manifest; `.gitattributes` preserves the reference bytes on every platform; the repository secret-shaped-content scanner reports both supplied artifacts clean before import; [ui-parity.md](../01-spec/ui-parity.md) is the single canonical definition of exact parity, phase-UI versus rolling screen closure, deterministic state classification, zero-unexpected-pixel comparison, mobile evidence and the finite deviation register; [ADR-0049](adr/0049-approved-mock-parity-contract.md) records why prototype code is quarantined and why later feature items inherit the visual contract; an automated test fails on any reference-byte/hash/size drift, manifest/reference screen or navigation drift, invented/missing deviation ID, loss of the binary line-ending rule, reference entry into a build input, or dependency change that lets UI.5, UI.10 or P2.8 bypass the contract/final gate; the reference payloads are parsed only as inert data in normal automation and are never executed, imported into `src/`, or emitted into `build/coldbox.html`; `src/` is byte-identical to `main`.

- [ ] **UI.5 Shared shell chrome — app bar, nav rail, realm strip** 🌐
  *Deps: UI.4a*
  One shell across both realms: masthead, ten-group nav rail, and the `.realm-strip` specified in [design-system.md](../01-spec/design-system.md) §5.
  **Accept:** the rail reaches every built surface in both realms, including sealed tools, without scrolling the document; **groups render their unbuilt items disabled and labelled with roadmap ID and phase**, and a disabled item is not focusable as a control and is announced as unavailable; the realm strip changes unmistakably at the boundary and its stripes do not animate under any state, including `prefers-reduced-motion` being absent; the rail collapses to a five-slot bottom bar plus a More sheet below the phone breakpoint; 44px minimum touch targets hold; both realms stay hash-pinned into the parent CSP exactly as before.

- [ ] **UI.6 Floating record menu** 🌐
  *Deps: UI.5*
  One component, built once, used by every surface that holds a record.
  **Accept:** opening a record shows the complete record — all fields, tags, concealment state and provenance — not a summary; a QR appears for every public address, xpub, descriptor or npub; **no QR is offered for secret material from this component**, which remains SeedQR Studio's job behind its own plaintext acknowledgement; the panel is calm per §6 whenever it renders a secret; it is fully keyboard-navigable with a visible focus ring and returns focus on close; it is one implementation, and a reviewer can confirm that by finding one.

- [ ] **UI.7 Send-to routing** 🌐
  *Deps: UI.6*
  The typed routes that replace copy-paste between tools.
  **Accept:** every value that has a consumer offers a Send to row into it; **no send-to path writes secret material to the clipboard**, asserted by a test; where copy still exists for public values it runs the existing P1.12 clipboard round-trip check; a send-to into a cold tool never round-trips through the warm shell; routes are enumerable and each one is covered.

- [ ] **UI.8 Warm-realm workspaces**
  *Deps: UI.7*
  Regroup the warm shell into the four warm groups. Additive; breaks nothing.
  **Accept:** Records, Money, Vault files and Reference each reach their built surfaces; existing warm behaviour and routes are preserved or explicitly redirected; no warm surface gains access to anything sealed.

- [ ] **UI.9 Tool map compiled from ROADMAP.md**
  *Deps: UI.5*
  A build step that compiles this file into the in-app tool map, the way [help-content.js](../../scripts/help-content.js) compiles `docs/`.
  **Accept:** the tool map's content is generated at build time from this file and no item status is transcribed by hand anywhere in `src/`; the build fails closed if this file cannot be parsed; the output is deterministic across two builds; `scripts/check-docs.js` covers the new relationship; a status changed here and nowhere else changes the app on the next build.

- [ ] **UI.10 Vault naming in the sealed realm, and a name-free filename** 🌐
  *Deps: UI.4a*
  Implements [ADR-0046](adr/0046-vault-name-availability-at-unlock.md) end to end: the name joins the unlock phrase, confirmation, KDF profile and keyfile on one sealed creation screen and is stored inside the encrypted public compartment; the canonical filename stops carrying user-chosen text; the warm picker gains a device-local nickname.
  **Accept:** naming, phrase, confirmation, KDF profile and keyfile are on one screen inside the sealed realm; the name is written by cold into the encrypted public compartment under a bounded, typed field and is authenticated with the rest of it; **no name and no derivative of one crosses cold → warm in any message**, asserted by a test, and **no new message type is added in either direction**; the canonical filename is `coldbox--<id8>.cbx` and contains no user-chosen text; every historical filename form enumerated in [ADR-0026](adr/0026-canonical-vault-save-and-live-transfer.md) §5 remains readable and existing vaults open without migration; the warm picker shows `id8` plus an optional device-local nickname that is never sent to cold, never written into the vault and never placed in a filename; the real name can be renamed in cold while unlocked without writing a new file, and the nickname can be renamed in warm at any time; **the name survives a warm registry edit**: cold omits the name from the public projection it sends warm, carries its own stored name forward when re-encrypting after `publicData.replace`, and **rejects — failing closed — any inbound replace payload carrying a name field**, with a test proving that a full registry mutation round-trip leaves the stored name byte-identical and a negative test proving an injected name field is refused rather than merged; **whether the compartment addition requires a vault-format version bump is determined against [vault-format.md](../01-spec/vault-format.md) and recorded with its reasoning in the packet — the format must not change silently**; [architecture.md](../01-spec/architecture.md), [vault-format.md](../01-spec/vault-format.md) and [ADR-0025](adr/0025-vault-identity-library-and-save-ux.md)/[ADR-0026](adr/0026-canonical-vault-save-and-live-transfer.md)'s amended clauses are updated in this item; the retirement of duplicate-name refusal is reflected wherever ADR-0026 §37 is relied upon; and **every document that currently assumes a name-bearing filename is updated in this item** — the enumerated set, swept at UI.1, is [quick-start.md](../00-overview/quick-start.md), [SPEC.md](../01-spec/SPEC.md) (canonical save and Vault Library), [vault-format.md](../01-spec/vault-format.md), [threat-model.md](../02-security/threat-model.md) (which states the pre-UI.10 behaviour deliberately), [testing.md](testing.md) device-matrix step 5, and [ADR-0013](adr/0013-save-integrity-in-warm-shell.md); `test/p0.19-doc-semantics.test.js` asserts the old filename form against an **archived packet** and must keep passing unchanged, since that packet is a historical record and rewriting it would falsify history.

- [ ] **UI.11 Approved desktop/mobile visual parity certification** 🌐
  *Deps: UI.8, UI.9, UI.10*
  Close the interface restructure only after the built application is proven against both approved references. This item may correct visual drift and add the dedicated comparison harness; it may not add unrelated product behaviour.
  **Accept:** the parity harness reads its viewports, comparison regions, navigation and screen lists directly from the approved manifest; every manifest state is classified exactly once under [ui-parity.md](../01-spec/ui-parity.md), with the shared shell and every already-built feature classified `PARITY`, later-roadmap screens classified `UNAVAILABLE`, and no missing or skipped row; an unavailable screen appears only as the approved disabled navigation treatment and cannot be focused or opened; reference normalizers are deterministic, each names one registered deviation ID, each fails on unexpected selector cardinality, and no pixel mask or percentage threshold exists; in each browser engine required by the committed harness, every `PARITY` row has equal capture dimensions and zero unexpected changed pixels at the manifest comparison region; the packet includes the generated state matrix, reference/product/diff artifacts and machine-readable totals, and identifies every applied deviation by ID; keyboard, focus return, pinch zoom, responsive overflow, minimum touch targets, reduced motion, calm-panel state and dark/light presentation pass their committed assertions; a maintainer compares the real build with both approved references and records the physical mobile device, OS, browser and orientation — an ADR-0043 deferral does **not** close this item; no new deviation is accepted inside this implementation item without prior maintainer approval and the change-control steps in the contract; cold/warm CSP hashes, realm isolation and all existing behaviour remain intact; the reference artifacts remain absent from the production HTML; and the final build is reproducible.

## Phase 2 — Backup, continued

Phase 2's last item resumes here, after the interface work, so that it is built once and in the new shell.

- [ ] P2.8 Printable cards and hand-computation worksheets
  *Deps: P2.7, UI.11*

## Phase 3 — Portfolio and online

- [ ] P3.1 Price aggregation ⚠️ *needs a free CoinGecko demo key from the human* · P3.2 Multi-currency and Frankfurter FX
- [ ] P3.3 Balance lookups · P3.4 Transactions and **per-wallet** lot pools
- [ ] P3.5 Cost basis engine — FIFO plus specific ID with lot-level audit trail
- [ ] P3.6 Dashboard and charts · P3.7 CSV import/export · P3.8 BIP-329 labels
- [ ] **P3.9 Tax reporting exporter** — Form 8949 CSV per box code (G/H/I, J/K/L), Schedule D summary, income report, lot audit trail, transfer ledger, 1099-DA reconciliation, safe harbor allocation record, plus TurboTax and TaxAct profiles. Spec: [us-tax-reporting.md](../04-reference/us-tax-reporting.md)
  **Accept:** rows are per disposed lot, not per transaction; box codes correctly assigned; short/long term boundary is *more than* one year; **missing basis is flagged, never defaulted to zero**; transfers appear in the transfer ledger with dates and bases preserved and produce no disposal; no wash sale adjustment applied to crypto positions; ETF-tagged holdings flagged as securities

## Phase 4 — Full coverage

- [ ] P4.1 Tier 1 remaining chains · P4.2 Custom coin registry

**P4.3 Recovery Assistant** — specified in [SPEC §11.1b](../01-spec/SPEC.md). Split into five items; the original single line materially understated the work.

- [ ] **P4.3a Search engine and benchmark harness**
  *Deps: P1.4*
  Two-stage screen/verify pipeline; Web Worker partitioning; iterative deepening on address index with a bounded xpub cache; sequenced derivation paths; reproducible benchmark harness for the primitive costs quoted in §11.1b.
  **Accept:** the harness reproduces the per-primitive figures on the reviewer's own hardware; deepening measurably outperforms naive enumeration; **the estimate names which crypto path is live** and differs accordingly; cancel is immediate.
- [ ] **P4.3b Stop conditions and error models**
  *Deps: P4.3a*
  xpub, address plus generation limit, checksum-only; typo grammar, missing words, ordering, passphrase search; phased escalation.
  **Accept:** a checksum-only result is **never** reported as a recovery; address generation limit is surfaced, defaults to 20, and a deliberately out-of-limit fixture reproduces the false negative and is explained to the user; both operation counts are shown before any search starts.
- [ ] **P4.3c Checkpointing**
  *Deps: P4.3a* · ADR-0012
  Encrypted checkpoint emitted via `allow-downloads`; key wrapped under the vault DEK when a vault is open, own passphrase otherwise.
  **Accept:** resume reproduces an interrupted search exactly; a tampered checkpoint **fails closed** rather than resuming from corrupt state; no plaintext checkpoint path exists.
- [ ] **P4.3d Address database import** ⚠️ *gated on unresolved size research — may be dropped*
  *Deps: P4.3b*
  Import of an externally built btcrecover address database, read-only, memory-resident.
  **Accept:** oversize databases are **refused with the actual number**, never degraded to per-lookup file reads; a hit is reported as a candidate requiring verification and **never as a recovery**. If no pruned database fits in browser memory, the item is closed as dropped with the measurement recorded.
- [ ] **P4.3e SLIP-39 share repair and codex32 correction**
  *Deps: P4.3b, P2.1, P2.2*
  **Accept:** codex32 damage is *corrected* arithmetically, not searched, and is presented as deterministic; SLIP-39 repair uses independent test vectors.

- [ ] P4.4 Verify Bench and file hasher · P4.5 Passphrase Studio · P4.6 BIP-85
- [ ] P4.7 Nostr NIP-06 · P4.8 BC-UR animated QR · P4.9 Descriptors and BIP-388 · P4.10 Reference

## Phase 5 — Advanced

- [ ] P5.1 Tier 2 chains · P5.2 Multisig quorum analysis · P5.3 Miniscript read-only
- [ ] P5.4 BLS/EIP-2333 · P5.5 PSBT viewer · P5.6 Silent payments (experimental)
- [ ] P5.7 Quantum readiness panel · P5.8 ERC-4337 records · P5.9 Border Wallets
- [ ] P5.10 Inheritance letter · P5.11 Camera scanner

---

## Considered and rejected

Recorded here so they are not silently re-proposed. Each has an ADR with the full analysis.

| Proposal | Outcome |
|---|---|
| Unsigned transaction construction, broadcast relay, ERC-7730 clear signing | **Rejected** — [ADR-0019](adr/0019-no-transaction-workbench.md). Worked up in full, then declined: the three were justifying each other rather than standing alone, and hardware wallets already perform clear signing with provenance Coldbox structurally cannot match. [SPEC §1.3](../01-spec/SPEC.md)'s non-goal stands unamended |
| Injected wallet provider integration (EIP-6963 / EIP-1193) | **Rejected as a feature, kept as a threat** — [ADR-0020](adr/0020-injected-providers-rejected-and-neutered.md). Provider calls bypass page CSP, which would have required the first carve-out in [threat-model.md](../02-security/threat-model.md)'s design commitments. The investigation's finding ships as P0.21 |

---

## Changing this file

Adding, reordering, or removing items is a design decision. Small clarifications are fine in any PR. Anything that changes **what gets built or in what order** needs an issue or an ADR first — the ordering is the plan, and quietly rewriting it defeats the point of having one.
