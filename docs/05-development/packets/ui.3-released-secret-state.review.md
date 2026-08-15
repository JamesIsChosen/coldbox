# Independent review â€” UI.3 released-secret state and the secret switcher

**VERDICT: FAIL**

**Findings:** 4 â€” all must be addressed before a fresh review.

- **Reviewed commit:** `77ac766ae3584f13352fe819ce287e78b828e744`
- **Base:** `main@ac09a5f1153a94cabbc068cf5d1ffc4d98ce9b6c`
- **Reviewed by:** GPT-5.6 Sol
- **Date:** 2026-08-15

## What I verified

- Read `AGENTS.md`, `docs/05-development/review-protocol.md`, `docs/05-development/handoff.md`, ADR-0045, the UI.3 roadmap criterion, the author packet, and the full ten-file PR diff.
- Verified PR #58 was open, non-draft, mergeable, and still exactly at author tip `77ac766ae3584f13352fe819ce287e78b828e744` immediately before attempting to publish this report.
- Inspected the exact implementation paths for released-secret release/focus/clear, dependent consumers, address verification, warm messaging, vault public-data replacement, lifecycle teardown, switcher rendering, shortcut handling, and the new UI.3 tests/browser harness.
- Independently inspected exact-tip GitHub Actions execution in clean hosted checkouts on Ubuntu and Windows. Both build jobs passed `npm ci`, `npm run verify-vendor`, `npm run lint`, `npm run check-docs`, all **405/405** tests, and two same-checkout builds. The cross-OS comparison also passed.
- Exact-tip CI produced **2,652,766 bytes**, SHA-256 `0090eef2d775e0484684d1a27e045c274ff560bbd2149087c01acb5163c8149e` on both Windows and Ubuntu. `npm run check-docs` checked **227** Markdown files with 0 warnings.
- Independently inspected the exact-tip browser job. The built `file://` artifact passed the full committed harness in **Chromium and Firefox**, including the UI.3 release/switch/focus/lifecycle flow and the repository's existing negative CSP/provider/tamper checks.
- The full exact-tip test run also exercised deliberate fail-closed fixtures with expected non-zero behavior, including a deliberately failed browser-harness check, malformed UI.2 assets, machine-path smuggling, randomness-fallback mutation, CSP/sandbox mutation, broken documentation, and corrupted vendored dependencies.
- Checked the UI.3 user-visible CSS and help copy against `docs/01-spec/design-system.md`.

### Execution-environment note

This review environment could not directly clone GitHub because its local shell had no outbound DNS. I therefore used the repository's exact-tip GitHub Actions clean checkouts as executable verification evidence rather than representing the author's packet output as reviewer execution. Those jobs checked out the reviewed SHA directly in separate Linux and Windows paths and exposed complete command logs and build artifacts.

## What I could not verify

None within UI.3's browser-verifiable acceptance surface. Mobile, Safari, Tor, and physical-device checks remain untested, but they are explicitly outside UI.3 acceptance and were not used as findings here. UI.4's removal of the transitional duplicate source fields is likewise out of scope for this verdict.

## Acceptance criteria â€” verbatim check

| Roadmap acceptance criterion | Result | Evidence |
|---|---:|---|
| `a secret released from Seed Forge appears in the switcher with its label and public master fingerprint` | PASS | Registry/render code plus Chromium/Firefox UI.3 flow. |
| `several secrets can be released and exactly one is focused` | PASS | Registry invariant, unit test, and two-secret browser flow. |
| `changing focus re-points every dependent panel with no reload and no re-entry` | PASS | Consumer rewiring, focus invalidation, six focus indicators, and browser focus switch without cold-frame reload. |
| `the registry is cleared and its buffers zeroized by each of vault lock, idle timeout, panic and realm teardown, each covered by a test` | PASS | `clearReleasedSecrets()`/`clearVaultSession()` wiring, registry zeroization unit test, and browser coverage of lock, idle, panic, and `pagehide`. |
| `no released secret, and no derivative of one, appears in any message to the warm shell` | **FAIL â€” F1** | A focused released secret is returned by `currentSeedForgeWallet()`. Warm-origin address verification feeds its `seedBytes` into `deriveRegistryAddress()`, obtains an xpub, and sends the updated public compartment to warm via `publicData.updated`. |
| `the empty registry renders a designed empty state that explains what cleared it` | PASS | Switcher empty-state rendering and browser checks after explicit clear/lifecycle paths. |
| `nothing is persisted to any vault compartment or storage` | **FAIL â€” F1** | The same focused-released-secret address-verification route writes `verifiedAgainstXpub` into the vault public compartment through `currentVaultSession.replacePublicData()`. |
| `the focused secret's public master fingerprint is visible on any panel that performs a destructive, splitting or exporting action` | PASS | Six `[data-secret-focus-indicator]` surfaces are populated from current focus and checked by both browser engines. |
| `the keyboard shortcut that clears the registry is confirmed not to collide with the panic binding` | PASS | `Ctrl+Alt+Shift+L` clear and double-Escape panic are separate paths and both execute in Chromium/Firefox. |

## Findings

### F1 â€” BLOCKING â€” A derivative of the focused released secret is persisted and sent to the warm shell

**Location:** `src/cold/main.js` â€” `currentSeedForgeWallet()` and `handleAddressVerifyRequest()`; `src/cold/verification.js` â€” `deriveRegistryAddress()` and `markAddressColdVerified()`.

UI.3 changes `currentSeedForgeWallet()` so a focused released record wins and returns `bytes: focused.seedBytes`. Existing warm-origin address verification then calls `verification.deriveRegistryAddress(current.bytes, ...)`. That derivation returns an account xpub. On a matching address, `markAddressColdVerified(..., derivationResult.xpub)` stores that value as `verifiedAgainstXpub`; `currentVaultSession.replacePublicData(nextPublicData)` writes it into the public compartment; and `postVaultMessage(..., 'publicData.updated', { publicCompartment: updated })` emits the updated compartment to the warm shell.

That is precisely an indirect derivative path from the new released-secret registry. The roadmap criterion is explicit: **no released secret, and no derivative of one, appears in any message to the warm shell**, and **nothing is persisted to any vault compartment or storage**.

The new tests do not cover this path. `test/ui.3-released-secret.test.js` only proves that the registry factory itself contains no `postMessage`/storage call and searches for a nearby direct `postMessage` after `release()`. The browser flow checks that warm DOM text does not contain the released label/fingerprint. Neither test captures all coldâ†’warm messages after a released secret becomes the active `currentSeedForgeWallet()`, nor does either assert that address verification cannot persist a derivative of that released record.

**Required action:** remove the released-record derivative from this warm/persistence route while preserving the intended verification behavior. Add a regression that (1) releases/focuses a secret, (2) executes the warm-origin address-verification flow, (3) captures every coldâ†’warm message and vault public-compartment replacement, and (4) proves no value derived from the released record is sent or persisted. The test must fail against `77ac766...` before the fix.

### F2 â€” BLOCKING â€” The new pink Release button violates the authoritative contrast and token rules

**Location:** `src/cold/styles.css` â€” `.cold-seed-forge-release button`.

The new rule uses `background: var(--cold-pink)` together with `color: #ffffff`.

`docs/01-spec/design-system.md` is explicit that:

- user-visible rules must not introduce hard-coded hex values; use a design token;
- pink with white text is **3.80:1 and fails** the normal-text contrast floor; and
- pink carries dark/ink text rather than white.

This is therefore not cosmetic preference: the new UI.3 control violates the documented component/color contract and its accessibility rationale.

**Required action:** replace the literal white foreground with the documented compliant token/foreground for pink (normally ink), eliminate the hard-coded hex from the new rule, and add or extend an automated contrast/style assertion so this exact regression cannot pass lint/tests again.

### F3 â€” BLOCKING EVIDENCE â€” The packet's exact artifact evidence is stale and internally contradictory

**Location:** `docs/05-development/packets/ui.3-released-secret-state.md` Â§Â§3, 11.

The packet claims the reviewed branch builds to **2,652,783 bytes** with SHA-256 `b214401be55a415f003d70fcfe00fa23f687b6fa3840ea5d19a489d2c527eb31`, and reports `check-docs` as **226** Markdown files. It also says the browser harness's dependency-free rebuild â€œmatched byte-for-byteâ€ while giving a different hash, `aa618188a33bac1f197479bf0d332a4bee95bb9e6886e5ff4cdb6841d4208f4e`.

At the exact reviewed SHA, clean GitHub Actions Windows and Ubuntu builds both independently produced **2,652,766 bytes** and SHA-256 `0090eef2d775e0484684d1a27e045c274ff560bbd2149087c01acb5163c8149e`; the cross-OS comparison passed on that hash. The exact-tip browser job also built `0090eef2...149e`, and exact-tip docs hygiene checked **227** Markdown files.

So the source is reproducible in CI, but the packet's claimed final artifact is not the artifact of the reviewed commit and the packet contains mutually incompatible â€œbyte-for-byteâ€ hashes. Under `review-protocol.md`, packet claims that do not reproduce are a FAIL.

**Required action:** after all code/doc fixes are committed, rerun verification from the final exact tip and replace every stale artifact hash, byte count, docs count, dependency-free rebuild hash, and bundle-delta claim with one internally consistent set of final-tip evidence. Do not record pre-commit working-tree build figures as the reviewed artifact.

### F4 â€” ADVISORY (still FAIL under protocol) â€” New user-facing help uses prohibited bare `wallet`

**Location:** `docs/00-overview/glossary.md` â€” `Released secret`, plain depth.

The new text begins: â€œThe wallet you temporarily choose for Coldbox's offline tools ...â€. The authoritative design-system copy contract says bare **wallet** is correct only in the three compounds **hardware wallet**, **wallet registry**, and **wallet record**; anywhere else is a bug because Coldbox distinguishes seed, account, and address concepts explicitly.

**Required action:** rewrite the plain-depth definition using `released secret`, `secret`, or the precise intended object rather than bare `wallet`, then rerun documentation/help compilation checks.

## Verdict rationale

UI.3's core switcher/lifecycle behavior is substantially exercised and the exact-tip 405-test suite plus Chromium/Firefox harness are green. That is not enough for PASS: F1 directly violates two verbatim UI.3 acceptance clauses at the cold/warm and vault-persistence boundary; F2 violates the authoritative user-visible design contract; F3 means the final artifact evidence in the packet does not describe the reviewed commit; and F4 violates the repository's explicit copy rules.

Per `docs/05-development/review-protocol.md`, any finding of any severity is a FAIL. Leave UI.3 at `[~]`; do not merge PR #58. A fresh reviewer must re-check every finding and all acceptance criteria on the remediation tip.

**VERDICT: FAIL**

---

# Independent re-review — UI.3 released-secret state and the secret switcher

**VERDICT: FAIL**

**Findings:** 2 — one blocking evidence finding and one stale-PR-metadata finding; both must be addressed before another fresh review.

- **Reviewed commit:** `23c17de2e1e2d98ed5fac1e97066e286a88661b1`
- **Base:** `main@ac09a5f1153a94cabbc068cf5d1ffc4d98ce9b6c`
- **Reviewed by:** GPT-5.6 Sol
- **Date:** 2026-08-15

## Previous finding disposition

| Prior finding | Status | Re-review evidence |
|---|---|---|
| F1 — released-secret derivative persisted/sent warm | **RESOLVED** | `handleAddressVerifyRequest()` now sets `current` to `null` whenever released-secret mode has ever activated, so the focused record cannot enter `deriveRegistryAddress()`, `markAddressColdVerified()`, `replacePublicData()`, or `publicData.updated`. The committed browser regression releases a secret, captures every cold→warm MessagePort delivery for the verification operation, requires `address.verifyResult`/`unverified`, requires zero `publicData.updated`, and checks the warm registry record remains `unverified`. |
| F2 — pink Release button used white/hard-coded foreground | **RESOLVED** | `.cold-seed-forge-release button` now uses `var(--cold-pink)` with `var(--cold-ink)`. From the committed token values `#ff007a` and `#121212`, the independently calculated WCAG contrast is **4.94:1**. `test/ui.3-released-secret.test.js` checks the actual tokens and recalculates the ratio with a `>= 4.5` assertion. |
| F3 — packet artifact evidence stale/non-reproducible | **NOT RESOLVED** | See R2-F1 below. Clean committed checkouts at both the packet-named product tip `e78cb6422510be26cb060d7df0744199dfef845a` and this reviewed tip `23c17de2e1e2d98ed5fac1e97066e286a88661b1` produce a different artifact from the packet claim. |
| F4 — prohibited bare `wallet` in new glossary plain copy | **RESOLVED** | The plain definition now starts “The released secret you temporarily choose…” and no longer names the released-secret entry as a wallet. |

## What I verified

- Re-read `AGENTS.md`, `docs/05-development/review-protocol.md`, the existing independent FAIL report, the UI.3 roadmap criterion, the remediation diff, and the current packet.
- Verified PR #58 was open, non-draft, mergeable, and exactly at `23c17de2e1e2d98ed5fac1e97066e286a88661b1` for this re-review before publishing reviewer artifacts.
- Inspected all 15 changed files, including the released-secret registry/focus/clear paths, every new cold UI surface, the warm-origin address-verification guard, the MessagePort boundary regression, the contrast regression, the help/spec/ADR amendments, and the packet evidence.
- Inspected exact-tip GitHub Actions run #220. Clean Ubuntu and Windows build jobs both completed successfully through `npm ci`, upstream vendor verification, lint, documentation hygiene, unit/vector tests, two builds, and same-checkout hash comparison. The cross-OS comparison job also passed.
- Inspected exact-tip Browser harness job #220. The committed built `file://` artifact passed the Chromium + Firefox harness, including the released-secret switcher/lifecycle coverage and the released-session address-verification boundary regression.
- Downloaded the exact-tip Ubuntu and Windows build artifacts and independently hashed the actual `coldbox.html` files. Both are **2,654,759 bytes** with SHA-256 **`b2f752827e4480769ec84850aa3edb555005fad93f8aa000386ac32055ab3a5d`**; their bytes agree across operating systems.
- Independently checked the packet-named product tip `e78cb6422510be26cb060d7df0744199dfef845a`. Its completed clean CI run #219 also produced **2,654,759 bytes** with the same SHA-256 **`b2f752827e4480769ec84850aa3edb555005fad93f8aa000386ac32055ab3a5d`**. Therefore the packet's `2,654,776` / `1a60f562...` evidence does not reproduce even at the commit the packet says it measured.
- Recomputed the bundle delta from the packet's UI.2 baseline of 2,622,481 bytes: the reproducible clean artifact is **+32,278 bytes (+31.52 KiB, +1.23%)**, not +32,295 bytes.
- Re-checked F1 directly in `handleAddressVerifyRequest()` and the browser capture path: released mode cannot supply `currentSeedForgeWallet()` to the derivation/persistence block, while the unreleased transitional path remains intact.
- Re-checked F2 against the committed CSS tokens and test: pink/ink computes to **4.94:1** and the rule contains no literal white foreground.
- Re-checked F4 against the committed glossary text and documentation-hygiene-successful exact-tip CI.
- Re-checked the realm-boundary scope: no new message type is introduced by UI.3; released-mode warm address verification is comparison-only, and the cold registry itself remains session-local. The exact-tip browser and protocol suites are green.

### Execution-environment note

This reviewer runtime cannot mount the maintainer's Windows worktree and its shell cannot perform a fresh outbound Git clone. As in the first independent review, I used the PR's exact commit in GitHub-hosted clean checkouts as executable verification evidence and downloaded the resulting artifacts for independent byte/hash inspection. The Windows and Ubuntu jobs give distinct clean paths/environments and independently verify the upstream-vendor and reproducibility gates; the exact-tip browser job executes the committed `file://` flow in both required engines.

## What I could not verify

None within UI.3's browser-verifiable acceptance surface. Physical mobile, Safari, Tor, and other device-matrix entries remain outside UI.3 acceptance and were not used to pass or fail this item.

## Acceptance criteria — verbatim check

| Roadmap acceptance criterion | Result | Evidence |
|---|---:|---|
| `a secret released from Seed Forge appears in the switcher with its label and public master fingerprint` | PASS | Registry/render code plus exact-tip Chromium/Firefox released-secret flow. |
| `several secrets can be released and exactly one is focused` | PASS | Registry invariant/unit coverage and two-secret browser flow. |
| `changing focus re-points every dependent panel with no reload and no re-entry` | PASS | Focus invalidation plus six dependent focus surfaces and browser focus-switch assertions without cold-frame reload. |
| `the registry is cleared and its buffers zeroized by each of vault lock, idle timeout, panic and realm teardown, each covered by a test` | PASS | Registry zeroization unit test plus browser lock, shortened idle, double-Escape panic, and `pagehide` coverage. |
| `no released secret, and no derivative of one, appears in any message to the warm shell` | PASS | F1 remediation guard plus the committed capture of every cold→warm delivery during released-session address verification; zero `publicData.updated` and `unverified` result required. |
| `the empty registry renders a designed empty state that explains what cleared it` | PASS | Switcher empty-state rendering and exact-tip browser checks across clear/lifecycle paths. |
| `nothing is persisted to any vault compartment or storage` | PASS | Registry remains closure-local; released-mode address verification cannot reach `replacePublicData`; browser regression requires the warm registry record to remain `unverified`. |
| `the focused secret's public master fingerprint is visible on any panel that performs a destructive, splitting or exporting action` | PASS | Six `[data-secret-focus-indicator]` surfaces are populated and checked in both browser engines. |
| `the keyboard shortcut that clears the registry is confirmed not to collide with the panic binding` | PASS | `Ctrl+Alt+Shift+L` clear and double-Escape panic remain distinct and are both exercised by the exact-tip browser harness. |

## Findings

### R2-F1 — BLOCKING EVIDENCE — Prior F3 remains unresolved: the packet still records a non-reproducible build artifact

**Location:** `docs/05-development/packets/ui.3-released-secret-state.md` §§3, 11.

**Observed:** The remediated packet explicitly says its verification product tip is `e78cb6422510be26cb060d7df0744199dfef845a` and records `build/coldbox.html` as **2,654,776 bytes**, SHA-256 **`1a60f562dbb428ea97a7e040820b1bbe359bce4d0c3a2b31ab9561577d16271d`**. Section 11 consequently records a **+32,295-byte** delta from the 2,622,481-byte UI.2 baseline.

Clean GitHub Actions checkouts do not reproduce those numbers. Run #219 at the packet-named `e78cb6422510be26cb060d7df0744199dfef845a` and run #220 at the reviewed `23c17de2e1e2d98ed5fac1e97066e286a88661b1` both produce **2,654,759 bytes**, SHA-256 **`b2f752827e4480769ec84850aa3edb555005fad93f8aa000386ac32055ab3a5d`**. I independently downloaded and hashed the artifacts. Ubuntu and Windows agree byte-for-byte at the reviewed tip. The clean delta is **+32,278 bytes (+31.52 KiB, +1.23%)**.

This is the same class of evidence defect as prior F3. That finding's required action was explicit: after fixes are committed, record one internally consistent set of clean, committed-tip artifact figures rather than working-tree/pre-commit values. The new packet instead names a committed product tip but still gives an artifact that a clean checkout of that exact commit does not produce.

**Expected:** Every exact artifact hash, byte count, dependency-free rebuild claim, and bundle-delta statement in the packet must describe a clean committed checkout and reproduce at the commit it names. Per `review-protocol.md`, a packet claim that does not reproduce is a FAIL even when the underlying source itself builds reproducibly.

**Required action:** Replace the packet's non-reproducing artifact hash, byte count, and bundle-delta evidence with values obtained from a clean committed checkout. Commit that packet correction, then rerun the required verification at the resulting new PR tip and confirm the packet's recorded evidence still matches that exact tip. Do not use untracked reviewer material or other working-tree-only content when deriving the recorded artifact figures. Request another fresh re-review after the correction is pushed.

### R2-F2 — ADVISORY (still FAIL under protocol) — PR #58's GitHub description is stale and contradicts the remediated branch

**Location:** PR #58 description/body.

**Observed:** At the reviewed tip, the committed packet file describes the F1/F2/F4 remediation and records 406 tests plus the newer (though still non-reproducing) `1a60f562...` artifact evidence. The GitHub PR description is still the original pre-remediation packet: it reports 405 tests, the obsolete `b214401b...` / 2,652,783-byte artifact, 226 docs, and states the old direct boundary rationale that was invalidated by F1. It does not describe the released-session address-verification guard or its new regression.

That makes the PR's primary review surface materially stale. A reviewer opening PR #58 is shown claims that no longer describe the branch and evidence from before the remediation commits.

**Expected:** The PR description must reflect the current packet/branch and must not present superseded security or verification claims as current evidence.

**Required action:** After correcting R2-F1 in the committed packet and rerunning final-tip verification, update PR #58's description from that final corrected packet so the GitHub review surface and repository packet agree. Do not merely patch individual numbers in the old body; synchronize the full final packet content.

## Verdict rationale

F1, F2, and F4 are resolved, every UI.3 roadmap acceptance clause is supported by the exact-tip code/tests/browser run, and run #220 is green across Windows, Ubuntu, cross-OS reproducibility, and Chromium/Firefox. The review still cannot PASS for two independent evidence/publication reasons: prior F3 was not actually remediated because the packet's supposedly final artifact evidence fails to reproduce both at its named `e78cb64` product tip and at the reviewed `23c17de` tip; and the GitHub PR description remains the obsolete pre-remediation packet. Under the review protocol, either finding is enough for FAIL. Leave UI.3 at `[~]`; do not merge PR #58.

**VERDICT: FAIL**
