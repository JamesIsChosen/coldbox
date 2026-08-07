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
  `srcdoc` iframe with `sandbox="allow-scripts allow-downloads"` and its own CSP including `connect-src 'none'`.
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
  **Accept:** both exact canaries fire independently; warm-only, cold-only, and both-policy CSP stripping go to full lockdown and refuse vault operations; banner reflects actual network state within 5 s.
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
  Three save paths (File System Access, blob download, manual base64/QR); symmetric load; idle auto-lock; `Esc Esc` panic hide.
  **Accept:** the three save/load paths are complete browser flows, and the manual base64/QR path is usable without File System Access or blob-download support. At least one save path must work on every platform in the supported execution matrix. **Direct local execution from iOS Files into Safari is not a P0.13 acceptance gate under [ADR-0010](adr/0010-ios-local-html-execution.md); it remains a separately recorded portability target at P0.19.**
  🌐 *The P0.3a harness verifies the blob and manual paths in Chromium/Firefox. Physical supported-device confirmation remains P0.19. Quick Look is not Safari execution evidence, and no iOS result may be inferred from another platform.*

- [x] **P0.14 — Save integrity**
  *Deps: P0.13*
  Verify-after-save re-opening the written file before clearing the dirty flag; generational filenames; rollback detection via save counter.
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

- [~] **P0.18 — CI** ⚠️ *needs repository secrets configured by the human before the attestation step works*
  *Deps: P0.16, P0.17*
  GitHub Actions: build, test, `verify-vendor`, lint, **double-build hash comparison**, second-OS build comparison, bundle size report, release attestation. Plus the documentation checks in [doc-hygiene.md](doc-hygiene.md): internal link resolution, review dates present and within max age, three-depth help blocks, doc index consistency, roadmap ID references, and `dependencies.md` matching `vendor-manifest.json`.
  **Accept:** CI hash matches a local build; a nondeterministic change fails CI; a broken internal link fails CI; a missing review date fails CI; an out-of-date review date warns.
  **Current state (recorded 2026-08-07):** `.github/workflows/ci.yml` added — a `build` job matrixed across `ubuntu-latest`/`windows-latest` (each running `verify-vendor`, `lint`, `check-docs`, `npm test`, then a double build with an in-job hash diff), a `compare-hashes` job comparing the two OS legs' hashes, an always-run `browser-tests` job (Playwright, per [ADR-0007](adr/0007-headless-browser-harness.md)), a per-OS bundle size step-summary report, and a tag/release-gated `attestation` job using `actions/attest-build-provenance@v1`. `scripts/check-docs.js` (already on this branch before this item's own work began) implements every doc-hygiene check the acceptance criteria name, plus a new eighth check (`TODO`/`TBD` in user-facing docs, WARN) added as part of closing this item, with negative-fixture tests for all eight. Structural decisions recorded in [ADR-0017](adr/0017-ci-workflow-structure.md).
  **What is not verified:** this authoring session has no way to actually execute a GitHub Actions run — the workflow YAML parses and the equivalent local commands (`npm test`, `npm run lint`, `npm run verify-vendor --offline`, `npm run check-docs`, double local build with a hash diff) all pass, but the workflow itself, the cross-OS comparison, the browser-tests job on a real GitHub-hosted runner, and the attestation step have not been observed running. Attestation additionally needs repository configuration only the human can grant. See the PR packet for exact commands and output.

- [ ] **P0.19 â€” Device matrix pass** ðŸ‘¤ **human-required**
  *Deps: P0.18*
  Full manual pass per [testing.md](testing.md) across the supported execution matrix; record the deferred iOS local-execution target separately.
  **Accept:** every platform in the supported execution matrix passes the seven per-platform checks and the results are recorded in the PR packet. The iOS local-execution target is recorded separately as **PASS, BLOCKED, or UNSUPPORTED** with the exact device and iOS version. A `BLOCKED` or `UNSUPPORTED` iOS result does not fail P0.19 under [ADR-0010](adr/0010-ios-local-html-execution.md), but remains visible portability debt. Quick Look, a third-party viewer, localhost, a renamed file, or another execution context is not a Safari-from-Files PASS unless a later accepted ADR explicitly qualifies it.
  Requires physically opening the file on real devices. An agent must not mark this complete, and must not infer a platform's result from a similar one.

---

## Phase 1 — Core wallet

*Blocked until Phase 0 is complete.*

- [ ] P1.1 Entropy Lab: dice, coins, cards, CSPRNG, mixing
- [ ] P1.2 Entropy Health Meter and Bias Analyzer
- [ ] P1.3 Seed Forge: BIP-39 generate, validate, passphrase, fingerprint
- [ ] P1.4 Derivation engine: BIP-32 core plus Bitcoin script types
- [ ] P1.5 Derivation: EVM and generic arbitrary-path mode
- [ ] P1.6 Registry CRUD: wallets, accounts, addresses
- [ ] P1.7 Notes, tags, and concealment levels
- [ ] P1.8 Device registry
- [ ] P1.9 Verification workflows: fingerprint, receive address, xpub, backup, passphrase ⚠️ *implementable by agent; final validation needs real hardware wallets*
- [ ] P1.10 QR generation: addresses, SeedQR, Compact SeedQR, printable cards

## Phase 2 — Backup

- [ ] P2.1 SLIP-39 · P2.2 codex32 · P2.3 Seed XOR · P2.4 Shamir39 and raw SSS
- [ ] P2.5 Vault recovery shares · P2.6 BackupRecords and verify-your-shares
- [ ] P2.7 Backup Health dashboard · P2.8 Printable cards and hand-computation worksheets

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

## Changing this file

Adding, reordering, or removing items is a design decision. Small clarifications are fine in any PR. Anything that changes **what gets built or in what order** needs an issue or an ADR first — the ordering is the plan, and quietly rewriting it defeats the point of having one.
