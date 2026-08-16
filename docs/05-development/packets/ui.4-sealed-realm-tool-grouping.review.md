# Review: UI.4 — Sealed-realm tool grouping and hub

**VERDICT: FAIL**

Findings: 3 (2 blocking, 1 advisory — all must be addressed)
Reviewed commit: `ee42eab5d7a612fed83705234e0b94ddb7665052`
Reviewed by: ChatGPT (GPT-5.6 Sol)
Date: 2026-08-15

## 1. What I verified

I reviewed PR #59 at the exact author tip `ee42eab5d7a612fed83705234e0b94ddb7665052`, not the synthetic merge commit. I read `AGENTS.md`, `docs/05-development/review-protocol.md`, the verbatim UI.4 roadmap item, ADR-0045, the PR packet, and the complete changed-file set.

I independently inspected the implementation and confirmed that the five named duplicate loaders are absent from the changed cold HTML/source, the QR Studio and SLIP-39 source selectors are removed, Seed Forge retains `#cold-seed-forge-mnemonic-input`, the six sealed groups and hub are present, migrated generation paths require a focused released secret, recovery/share-combine inputs remain, and the cold CSP literal still contains `connect-src 'none'`.

I queried the exact-head GitHub Actions run for this commit. CI run #226 (`31914951032`) completed successfully. Its exact-head jobs included Ubuntu and Windows build/test/vendor/lint/docs legs, cross-OS build-hash comparison, and the committed Chromium + Firefox browser harness.

I downloaded both exact-head build artifacts from that run and compared them independently:

```text
ubuntu  bbad99e2e28e053f64f0d072dd0c3f6cc25389c6d9a3ca5d30abd5a19468c330  coldbox.html
windows bbad99e2e28e053f64f0d072dd0c3f6cc25389c6d9a3ca5d30abd5a19468c330  coldbox.html
2660608 bytes each
cross-os artifact: byte-identical
```

The artifact hash and size therefore reproduce the packet's claimed product artifact on both CI operating systems.

I also attempted the review protocol's fresh local checkout in the reviewer environment:

```text
$ git clone --no-checkout https://github.com/JamesIsChosen/coldbox.git /mnt/data/coldbox-review-ui4
fatal: unable to access 'https://github.com/JamesIsChosen/coldbox.git/': Could not resolve host: github.com
clone_exit=128

$ node --version
v22.16.0

$ npm --version
10.9.2
```

The project requires Node 24.16.0. The available Chromium is 144.0.7559.96, `file://` navigation is blocked by this environment's browser policy, and no Firefox binary is installed locally. I therefore did not substitute a mismatched local runtime for the required review environment.

## 2. What I could not verify

- I could not execute a fresh reviewer-side `npm ci`, `npm run verify-vendor`, `npm run lint`, `npm test`, or the two builds locally because the reviewer sandbox cannot resolve GitHub and does not have the pinned Node 24.16.0 toolchain. Exact-head CI evidence was retrieved directly and is green, but that is not the same as completing every reviewer-side command mandated by the review protocol.
- I could not perform the protocol-required build under an explicitly different timezone and locale from the author's run.
- I could not deliberately corrupt a dependency/source/build input and demonstrate that the relevant committed verification path fails closed with a non-zero exit code. CI run #226 does not contain such a deliberate mutation step.
- I could not independently rerun the committed `file://` Chromium/Firefox harness in this sandbox because local `file://` is policy-blocked and Firefox is absent. I did independently verify that the exact-head CI browser job executed the committed harness and succeeded in both engines.

These omissions are consolidated as F3 because the review protocol explicitly makes an unverifiable required check a FAIL.

## 3. Acceptance criteria

Roadmap acceptance, verbatim:

> **Accept:** `#cold-seed-xor-source`, `#cold-codex32-secret-hex`, `#cold-shamir39-source`, `#cold-raw-sss-source` and `#cold-slip39-seed-source` no longer exist and their tools read the focused secret instead; `#cold-seed-forge-mnemonic-input` remains as the realm's single entry point; **a test asserts the declared secret-input registry specified in [ADR-0045](../adr/0045-released-secret-model.md) holds**: every input in `src/` that accepts secret material is declared with a category, no undeclared one exists, and **exactly one carries the category `seed-entry`**. **This item removes seed/source-loading inputs and only those** — the five listed above, leaving Seed Forge's. The registry must enumerate the legitimate sealed inputs that are not seed entry — vault passphrase and confirmation, keyfile, recovery re-authentication, recovery-share entry, concealment re-authentication, secret notes, the BIP-39 passphrase fields, and the share-combine fields — **every one of which stays.** A tool that reconstructs from shares must still accept share words; removing those inputs would break recovery, which is the opposite of this item's purpose. A naive count of secret-accepting inputs is not an acceptable implementation of this criterion; it was tried in an earlier draft and was false on the day it was written; every migrated tool derives what it displays from the focused secret and **has no seed/source-loading input of its own** — it may still have the inputs its own job requires; every secret value is masked on first paint; each tool's existing behaviour and test coverage is preserved, not reduced; the cold CSP is byte-identical to before the restructure and a test asserts cold still has no network capability.

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Five named duplicate seed/source fields are gone and the migrated generators read the focused secret. | ✅ | `src/cold/index.html` and `src/cold/main.js` remove all five IDs; generation code requires `focusedReleasedSecret()`; exact-head browser CI passed. |
| 2 | `#cold-seed-forge-mnemonic-input` remains the single declared `seed-entry`. | ✅ | Registry declares exactly one `seed-entry`, and it is the retained Seed Forge mnemonic input. |
| 3 | A test proves every secret-accepting input in `src/` is declared and no undeclared one exists. | ❌ | F1: the test examines only `src/cold/index.html` plus hard-coded dynamic cases and does not mechanically cover all secret-accepting inputs in `src/`. |
| 4 | Only seed/source-loading controls are removed; legitimate vault/recovery/share/passphrase/note/entropy inputs remain, and share reconstruction still accepts words. | ✅ | Diff inspection plus exact-head unit/browser CI; the retained registry enumerates these current inputs. |
| 5 | Migrated tools retain masking, focus/teardown behavior, and existing functional coverage. | ✅ | Changed browser harness explicitly releases/focuses fixtures and exact-head Chromium/Firefox CI passed the retained split/recovery/masking/negative/teardown flows. |
| 6 | Cold CSP is byte-identical to the expected pre-restructure policy and cold network capability remains absent. | ✅ | New test compares the exact CSP literal including `connect-src 'none'`; exact-head browser network probes passed. |

## 4. Findings

### F1 — The registry test does not prove the declared whole-`src/` invariant

**Severity:** blocking
**Location:** `test/ui.4-sealed-realm.test.js:9-12, 50-118`

**Observed:** The acceptance criterion requires a test proving that every input in `src/` that accepts secret material is declared, with no undeclared secret input. The test reads only `src/cold/index.html` and `src/cold/main.js`. Its static discovery treats password/file inputs and textareas as secret candidates, then manually adds five known non-password IDs. Its dynamic discovery is also a hard-coded list/count after checking only that each prefix string occurs. Consequently, a new secret-accepting input elsewhere under `src/`, or a new cold text/select/other input not added to the manual allowlist, can be introduced without this test necessarily failing.

**Expected:** The test required by the roadmap must mechanically enforce the invariant it claims: additions of secret-accepting inputs anywhere in the relevant `src/` surface must either be declared with a category or fail the test. The mechanism must not rely on a manually curated list of the same cases it is intended to detect.

**Required action:** Rework the registry assertion so its discovery scope covers the complete acceptance surface and cannot silently miss a newly introduced secret-accepting input because of file location, element type, or an unenumerated dynamic creation path. Add negative mutation/regression cases showing that representative undeclared static and dynamic secret inputs make the test fail.

### F2 — The authoritative roadmap summary contradicts UI.4's own acceptance text

**Severity:** advisory
**Location:** `docs/05-development/ROADMAP.md` — UI.4 summary immediately above the acceptance paragraph

**Observed:** The summary still says UI.4 will “delete the six secret-entry fields,” while the acceptance text immediately below requires removal of only the five named duplicate seed/source loaders and explicitly requires `#cold-seed-forge-mnemonic-input` to remain as the single entry point. ADR-0045 and the implementation now also describe one Seed Forge entry plus five duplicate loaders.

**Expected:** The authoritative roadmap must not instruct a future reader to delete six secret-entry fields when the acceptance contract says the Seed Forge entry remains. Documentation contradictions are review findings under `review-protocol.md`.

**Required action:** Correct the UI.4 summary sentence to say that the five duplicate seed/source-loading fields are removed while Seed Forge remains the single seed-entry surface. Keep the acceptance paragraph unchanged unless a separately justified contract change is intended.

### F3 — Mandatory reviewer-side variation and fail-closed checks were not independently executable

**Severity:** blocking
**Location:** review environment / `docs/05-development/review-protocol.md`

**Observed:** The protocol requires the reviewer to build under a different path, timezone, and locale and deliberately break something to confirm a non-zero fail-closed exit. This reviewer environment cannot resolve GitHub for a fresh clone, has Node 22.16.0 instead of the pinned 24.16.0, blocks local `file://` navigation by browser policy, and has no Firefox. The exact-head CI evidence is useful and was independently retrieved, but it does not include the explicit timezone/locale variation or a deliberate corruption/failure-injection step.

**Expected:** Every mandatory review step must be independently established before PASS. The protocol explicitly states that an acceptance/review requirement that cannot be verified is a FAIL.

**Required action:** After F1 and F2 are remediated, have a fresh independent reviewer use a checkout/environment capable of the pinned Node toolchain, different path/timezone/locale builds, deliberate fail-closed mutation with a verified non-zero exit, and the required `file://` browser harness. Record the real outputs in the fresh verdict.

## 5. Verdict rationale

UI.4's runtime shape is substantially consistent with the intended focused-secret model, and exact-head CI plus independently downloaded cross-OS artifacts support the claimed build and browser results. It cannot PASS, however, because the new registry test does not establish the acceptance invariant it is specifically required to prove, the authoritative roadmap contains a direct contradiction about what UI.4 deletes, and mandatory independent review variations/failure injection could not be completed in this environment. A fresh review can PASS only after F1 and F2 are addressed and F3's required independent verification is actually executed.

FAIL

---

# Re-review: UI.4 — Sealed-realm tool grouping and hub

**VERDICT: PASS**

Findings: 0
Reviewed commit: `d1aa23072209def2a4efb09ed73adc850f07bef2`
Reviewed by: ChatGPT (GPT-5.6 Sol)
Review mode: READ-ONLY (CI-witnessed, run `31927730786`)
Date: 2026-08-15
CI run: `31927730786`
CI URL: https://github.com/JamesIsChosen/coldbox/actions/runs/31927730786

## 1. What I verified

I re-reviewed PR #59 at the exact requested head `d1aa23072209def2a4efb09ed73adc850f07bef2` under the revised ADR-0048 Mode B rules. I read the complete PR diff plus `AGENTS.md`, the UI.4 roadmap contract, `review-protocol.md`, ADR-0044, ADR-0045, ADR-0048, the implementation packet, the existing historical review, the relevant specification/design-system/architecture/threat-model material, the affected user guides, and `CONTRIBUTING.md`. I did not treat the implementation packet as evidence for its own claims.

### CI witness and exact-head check

GitHub Actions run `31927730786` concluded `success`. Its `head_sha` is exactly `d1aa23072209def2a4efb09ed73adc850f07bef2`, and the run is associated with PR #59. The fact that the run was author-triggered is not a defect under ADR-0048; exact commit pinning plus workflow audit is the Mode B execution witness.

### Workflow/check audit

I audited `.github/workflows/ci.yml` as it exists at the reviewed SHA, not at a later branch tip.

- **Pinned Node:** `.nvmrc` contains `24.16.0`. Both build legs and the browser job use `actions/setup-node` with `node-version-file: .nvmrc`; the matrix legs also contain an explicit step that compares `node --version` against `.nvmrc` and fails on a mismatch.
- **Vendor verification:** both Ubuntu and Windows run `npm run verify-vendor`; the qualifying run completed local and upstream verification successfully.
- **Forbidden-pattern lint:** both operating systems run `npm run lint`; the run reports the forbidden-construct/syntax/LF lint passed.
- **Documentation checks:** both operating systems run `npm run check-docs`; the run completed with zero documentation warnings.
- **Complete TAP test suite:** both operating systems run `npm test -- --test-reporter=tap`, which invokes the repository's complete Node test suite (`node --test --test-concurrency=1`). The workflow preserves the real test exit code and fails if the test command fails.
- **Explicit zero-skip assertion:** the workflow parses the TAP `# skipped` summary and exits non-zero for a nonzero skip count. In this qualifying run the summary was present on both operating systems and was followed by the workflow's own `skipped=0` output, so no required Node test silently self-skipped.
- **Two builds per OS:** each Ubuntu/Windows leg runs the build twice, records SHA-256 sidecars, compares them, and fails on mismatch.
- **Cross-OS comparison:** the dedicated comparison job downloads both OS sidecars and fails unless the hashes are equal.
- **Committed browser harness:** the browser job checks out the exact PR head, uses the pinned Node version, installs the declared Chromium and Firefox Playwright binaries, builds, then runs the committed `npm run test:browser` harness. `scripts/run-browser-harness.js` requires the browser binaries, launches both engines, exercises the built artifact through `file://`, and returns a nonzero process exit on any thrown assertion.

### No-silent-skip evidence from run `31927730786`

The Ubuntu and Windows TAP summaries both show:

```text
1..409
# tests 409
# pass 409
# fail 0
# cancelled 0
# skipped 0
# todo 0
skipped=0
```

Thus each required operating-system leg executed 409 tests, passed 409, failed 0, and skipped 0. The browser job did not degrade to one engine: its log records the committed harness completing in both Chromium and Firefox, including explicit `file://` checks, and ends with `Browser harness passed in Chromium and Firefox.`

### Reproducible artifact

All required build comparisons agree on:

```text
c9b728b05fc912e82a5bf7c2205065425d0db3afae2836e79c02a4d41cc91fe4
```

- Ubuntu first build: match.
- Ubuntu second build: match; in-job comparison passed.
- Windows first build: match.
- Windows second build: match; in-job comparison passed.
- Cross-OS sidecar comparison: match.
- Browser-harness build/dependency-free comparison: the same digest.

### UI.4 implementation and remediation

The five duplicate source-loading controls are removed from the cold HTML and their old fallback/source-selection paths are removed from `src/cold/main.js`: `#cold-seed-xor-source`, `#cold-codex32-secret-hex`, `#cold-shamir39-source`, `#cold-raw-sss-source`, and `#cold-slip39-seed-source`. The affected generation paths now refuse to proceed without a focused released secret. `#cold-seed-forge-mnemonic-input` remains and is the registry's only `seed-entry`.

The prior F1 is fixed materially, not cosmetically. `test/ui.4-sealed-realm.test.js` recursively walks every `.html` and `.js` under `src/`. For every static `<input>`, `<textarea>`, and `<select>` it requires an explicit public/secret input-surface classification; secret controls must be in the cold document and match the ADR-0045 registry/category, while public controls must not be registry-declared. Its JavaScript audit enumerates every `createElement(...)` form-control site, requires literal element types, restricts dynamic secret inputs to the registry-checked `createDeclaredSecretInput()` factory, and accounts for the single detached warm textarea as public. Prefix-based dynamic share/validation fields are also checked against the registry.

The negative regression coverage proves the audit fails closed: an undeclared static password control is rejected; a raw dynamic `document.createElement('input')` path is rejected; and non-literal dynamic form-element construction is rejected. The registry declares exactly one `seed-entry`, and it is `cold-seed-forge-mnemonic-input`.

The legitimate non-seed secret inputs required by the roadmap remain: vault passphrase and confirmation, keyfile, recovery re-authentication, recovery-share inputs, concealment re-authentication, secret-note fields, BIP-39 passphrase fields, entropy inputs, share passphrases, and share-combine/correction inputs. The browser harness still reconstructs from shares and exercises the migrated Seed XOR, codex32, Shamir39/raw SSS, SLIP-39, SeedQR, focused-secret, masking, negative, warm-isolation, lock, and teardown paths in both engines.

The prior F2 is fixed: the authoritative UI.4 roadmap summary now says the item removes the **five** duplicate seed/source-loading fields while retaining Seed Forge's single seed-entry field, matching its acceptance paragraph and ADR-0045.

The old F3 is not carried forward as a defect. ADR-0048 and the revised review protocol explicitly support READ-ONLY CI-witnessed Mode B and make the trigger identity immaterial; this review therefore does not require reviewer-initiated CI or a local reproduction of the pinned execution environment. The separate physical-device/iOS/manual gates are not UI.4 acceptance criteria and are not inferred from CI.

Finally, the historical FAIL report is preserved byte-for-byte. The review file's blob SHA at the commit that first recorded that historical report (`8aa9100da0dd37c06cdeed9c2daf290ae6d55511`) is `09b39499fe44ceba5449d10b223f4587c3a824ad`, and the blob at the reviewed SHA is the same `09b39499fe44ceba5449d10b223f4587c3a824ad`. This fresh report is appended after it; the historical verdict and findings are not rewritten.

## 2. What I could not verify

None that is required for UI.4 acceptance under READ-ONLY CI-witnessed Mode B. This verdict does not claim physical-device, iOS, Tor, or other human-only validation, and it does not convert those separate gates into verified results.

## 3. Acceptance criteria

Roadmap acceptance, verbatim:

> **Accept:** `#cold-seed-xor-source`, `#cold-codex32-secret-hex`, `#cold-shamir39-source`, `#cold-raw-sss-source` and `#cold-slip39-seed-source` no longer exist and their tools read the focused secret instead; `#cold-seed-forge-mnemonic-input` remains as the realm's single entry point; **a test asserts the declared secret-input registry specified in [ADR-0045](../adr/0045-released-secret-model.md) holds**: every input in `src/` that accepts secret material is declared with a category, no undeclared one exists, and **exactly one carries the category `seed-entry`**. **This item removes seed/source-loading inputs and only those** — the five listed above, leaving Seed Forge's. The registry must enumerate the legitimate sealed inputs that are not seed entry — vault passphrase and confirmation, keyfile, recovery re-authentication, recovery-share entry, concealment re-authentication, secret notes, the BIP-39 passphrase fields, and the share-combine fields — **every one of which stays.** A tool that reconstructs from shares must still accept share words; removing those inputs would break recovery, which is the opposite of this item's purpose. A naive count of secret-accepting inputs is not an acceptable implementation of this criterion; it was tried in an earlier draft and was false on the day it was written; every migrated tool derives what it displays from the focused secret and **has no seed/source-loading input of its own** — it may still have the inputs its own job requires; every secret value is masked on first paint; each tool's existing behaviour and test coverage is preserved, not reduced; the cold CSP is byte-identical to before the restructure and a test asserts cold still has no network capability.

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | The five named duplicate seed/source fields no longer exist, and migrated tools read the focused secret instead. | ✅ | Exact diff/source inspection; all five IDs and fallback loaders are removed; generation paths require `focusedReleasedSecret()`; Chromium/Firefox migrated-tool flows pass. |
| 2 | `#cold-seed-forge-mnemonic-input` remains and exactly one registry category is `seed-entry`. | ✅ | Retained cold HTML control plus `COLD_SECRET_INPUT_REGISTRY`; UI.4 registry test passes in both 409-test OS legs. |
| 3 | The declared secret-input registry mechanically covers the complete `src/` input surface and undeclared secret inputs fail closed. | ✅ | Recursive all-`src/**/*.html` static-form audit plus all-`src/**/*.js` dynamic form creation audit; negative mutations reject undeclared static, raw dynamic, and non-literal dynamic controls. |
| 4 | Only the duplicate seed/source loaders are removed; legitimate authentication, recovery, note, entropy, passphrase, and share-combine inputs remain. | ✅ | Registry/source inspection and retained full/browser recovery, notes, entropy, and backup flows. |
| 5 | Migrated tools preserve focused-secret behavior, first-paint masking, functional coverage, recovery, isolation, and teardown. | ✅ | Committed Chromium/Firefox `file://` harness passes focused-secret, masking, split/reconstruction, negative, warm-isolation, lock, and teardown assertions; full suite is 409/409 on both OSes. |
| 6 | Cold CSP remains byte-identical to the pre-restructure policy and cold network capability remains absent. | ✅ | UI.4 source test compares the exact cold CSP literal including `connect-src 'none'`; committed browser CSP/network probes pass in Chromium and Firefox. |

## 4. Findings

None.

## 5. Verdict rationale

The exact reviewed SHA has a successful qualifying Mode B CI witness whose audited workflow executes the pinned toolchain, vendor/lint/docs checks, complete zero-skip TAP suite, deterministic double builds on Ubuntu and Windows, cross-OS hash comparison, and the committed Chromium/Firefox `file://` harness. The prior registry-coverage defect is fixed with a whole-`src/` mechanical audit plus fail-closed mutations, the roadmap contradiction is corrected, and the old environment-based F3 no longer blocks under accepted ADR-0048 Mode B. Every UI.4 acceptance criterion is satisfied and I found no blocking, advisory, cosmetic, or documentation finding.

PASS
