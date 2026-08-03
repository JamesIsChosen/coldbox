# PR packet — P0.1 deterministic build skeleton

## 1. Summary

P0.1 adds the pinned Node.js toolchain and the first deterministic build pipeline. The pipeline assembles the source template, CSS, and classic JavaScript into one `build/coldbox.html` file and emits a SHA-256 sidecar. No wallet, vault, cryptographic, realm, CSP, or network features are included.

## 2. Scope

In scope:

- `.nvmrc`, `package.json`, and `package-lock.json`
- Deterministic source assembly from `src/` via `scripts/build.js`
- A deliberately empty application shell with inline CSS and classic inline JavaScript
- SHA-256 sidecar generation
- Baseline syntax/LF lint and empty-vendor guard required by the repository contract
- Reproducibility tests
- Roadmap, README, and changelog status updates

Out of scope by design:

- Vendored dependency downloads and upstream hash verification (P0.2)
- Forbidden-construct policy lint (P0.3)
- CSP hash-pinning (P0.4)
- Warm/cold realms, vaults, cryptography, and application features

## 3. How to verify

The Windows environment used `npm.cmd` because PowerShell script execution policy blocks `npm.ps1`.

```text
PS> npm.cmd ci --ignore-scripts

up to date, audited 1 package in 685ms

found 0 vulnerabilities

PS> npm.cmd run verify-vendor

> coldbox@0.0.0 verify-vendor
> node scripts/verify-vendor.js

Vendor verification passed: no runtime artifacts are vendored yet.

PS> npm.cmd run lint

> coldbox@0.0.0 lint
> node scripts/lint.js

Lint passed: JavaScript syntax and LF source line endings are valid.

PS> npm.cmd test

> coldbox@0.0.0 test
> node --test

✔ build assembles one HTML file and emits its SHA-256 sidecar (53.7822ms)
✔ two builds are byte-identical regardless of caller locale and timezone (99.9662ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0

PS> npm.cmd run build

> coldbox@0.0.0 build
> node scripts/build.js

Built build/coldbox.html (40b39e4392477a4625791e23f0475f0585ec2f9588d611897c700a4effa534fe)

PS> Get-FileHash -LiteralPath 'build\coldbox.html' -Algorithm SHA256

Algorithm       Hash                                                                   Path
---------       ----                                                                   ----
SHA256          40B39E4392477A4625791E23F0475F0585EC2F9588D611897C700A4EFFA534FE       ...\build\coldbox.html

PS> Get-Content -LiteralPath 'build\coldbox.html.sha256'
40b39e4392477a4625791e23f0475f0585ec2f9588d611897c700a4effa534fe  build/coldbox.html

PS> npm.cmd run build
Built build/coldbox.html (40b39e4392477a4625791e23f0475f0585ec2f9588d611897c700a4effa534fe)

PS> $second = (Get-FileHash -LiteralPath 'build\coldbox.html' -Algorithm SHA256).Hash.ToLowerInvariant()
PS> $second
40b39e4392477a4625791e23f0475f0585ec2f9588d611897c700a4effa534fe

PS> if ($first -ne $second) { throw 'consecutive build hashes differ' }
consecutive build hashes match
```

The test suite also invokes the build twice with different caller locale/timezone values (`de-DE`/Honolulu and `ja-JP`/Tokyo); both output files and sidecars compare byte-for-byte.

## 4. Acceptance criteria

| Criterion | How satisfied | Test/evidence |
|---|---|---|
| `package.json`, `.nvmrc`, and a build script assembling `src/` into a single `build/coldbox.html`. No app features yet — an empty shell is fine. | Added the pinned package/toolchain, `scripts/build.js`, and the inline shell assembled from `src/index.html`, `src/styles.css`, and `src/main.js`. | `npm.cmd ci --ignore-scripts`; `npm.cmd run build`; `npm.cmd test` |
| Two consecutive clean builds produce byte-identical output; `build/coldbox.html.sha256` emitted; `LC_ALL=C TZ=UTC` enforced; no timestamps, machine paths, or unsorted iteration in output. | Build code sets locale/timezone before assembly, normalizes LF endings, uses an explicit ordered manifest, emits the sidecar, and contains no timestamp or machine-path data. | Reproducibility test; two consecutive build hashes `40b39e4392477a4625791e23f0475f0585ec2f9588d611897c700a4effa534fe`; LF/path assertions |

## 5. Security impact

- Realm boundary: no. The two-realm architecture is not implemented yet.
- Message schema: no new message type.
- CSP: no CSP is emitted yet; P0.4 owns hash-pinning and later realm policies.
- Vault format/cryptography/randomness: untouched.
- New network hosts: none. The build has no network access or runtime dependency.
- Secrets: none are accepted, generated, stored, or logged by this shell.

If this implementation is wrong, the immediate impact is a non-reproducible or malformed application artifact. It does not yet create a secret-handling path; later roadmap items must not treat this skeleton as a security boundary.

## 6. Test evidence

New tests:

- `build assembles one HTML file and emits its SHA-256 sidecar`: checks source assembly, unresolved-token absence, sidecar equality, LF-only output, and absence of common absolute-path forms.
- `two builds are byte-identical regardless of caller locale and timezone`: runs the build with conflicting locale/timezone inputs and compares both generated files byte-for-byte.

Independent cryptographic vectors: not applicable; no cryptographic code is included.

Negative checks: unresolved source placeholders, CRLF output, and absolute path patterns fail the build tests. Corrupted vendor-file testing is intentionally deferred to P0.2 because no vendor artifacts exist yet.

Not tested: browser/device behavior and cross-OS hash comparison. The artifact contains only the P0.1 shell; the full manual matrix is still required before release.

## 7. Device matrix

| Platform | Result | Notes |
|---|---|---|
| Windows Chrome | Untested | No browser pass performed for P0.1 |
| Windows Firefox | Untested | No browser pass performed for P0.1 |
| macOS Safari | Untested | No macOS device available in this run |
| macOS Chrome | Untested | No macOS device available in this run |
| Linux Firefox | Untested | No Linux device available in this run |
| iOS Safari (Files) | Untested | No iOS device available in this run |
| Android Chrome (Files) | Untested | No Android device available in this run |
| Tor Browser | Untested | No Tor Browser pass performed for P0.1 |

## 8. Assumptions made

> **Assumed:** Node.js `24.16.0` is the first pinned development toolchain.
> **Basis:** That exact version is installed in the implementation environment and is recorded in `.nvmrc` and `package.json`.
> **Not verified on:** A second operating system.
> **If wrong:** Developers must install the pinned toolchain before comparing build hashes; using another Node version is outside the reproducibility claim.

> **Assumed:** The sidecar uses standard sha256sum-style text with the repository-relative path `build/coldbox.html`.
> **Basis:** It is stable, human-readable, and contains no machine-specific path.
> **If wrong:** A later release-artifact step can change the presentation without changing the HTML bytes or digest.

> **Assumed:** A baseline empty-vendor guard is useful before P0.2 implements upstream re-download and hash comparison.
> **Basis:** The standing contract requires `npm run verify-vendor` to pass; the guard fails closed if any vendor artifact appears before its manifest exists.
> **If wrong:** P0.2 should replace this guard with the full verifier before adding any vendored dependency.

## 9. What to scrutinise

- The explicit source manifest and placeholder replacement in `scripts/build.js`: adding a source component without adding it to the manifest will not include it in the artifact.
- The locale/timezone enforcement and LF normalization: both must remain before any future date/locale-sensitive assembly.
- The sidecar path format and the fact that build output is ignored by Git; release packaging must copy the intended artifact explicitly.
- The baseline `verify-vendor` and `lint` scripts are intentionally not the full P0.2/P0.3 implementations.

## 10. Self-assessment

- No second-OS build or browser/device test was possible in this run.
- The output is only a shell and has no user capability beyond proving assembly.
- The baseline vendor check does not contact upstream or compare hashes; that is a known, deliberate P0.2 follow-up.
- The baseline lint does not yet enforce the forbidden-construct policy; that is a known, deliberate P0.3 follow-up.

## 11. Bundle impact

| Artifact | Before | After | Delta |
|---|---:|---:|---:|
| `build/coldbox.html` | 0 bytes | 776 bytes | +776 bytes |
| `build/coldbox.html.sha256` | 0 bytes | 85 bytes | +85 bytes |

The HTML is far below the 3 MB target and 4.5 MB hard cap.

## 12. Docs updated

- `docs/05-development/ROADMAP.md`: P0.1 marked complete.
- `README.md`: pre-release status now distinguishes the build skeleton from unavailable wallet features.
- `CHANGELOG.md`: P0.1 added to Unreleased.
- No ADR was added; P0.1 follows the already accepted reproducible-build and two-realm decisions and introduces no new structural security decision.
