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
