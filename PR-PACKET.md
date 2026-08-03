# PR packet - P0.2 vendor layout and verification

## 1. Summary

P0.2 vendors six official npm release tarballs for the planned `@noble/*` and `@scure/*` runtime libraries. The manifest records each artifact's canonical URL, canonical path, size, SHA-256, and npm SHA-512 integrity value. Verification checks local bytes offline and re-downloads the official releases when explicitly requested.

The verifier now fails closed on name/version/path/URL identity mismatches, package metadata mismatches, and any vendored artifact absent from the manifest. Builds run the same verifier in offline mode before assembly.

## 2. Scope

In scope:

- Six pinned npm release tarballs at version 2.2.0
- `vendor/vendor-manifest.json` with official URLs, sizes, SHA-256 hashes, and npm integrity values
- Canonical path and URL derivation from package name and version
- Exact `package/package.json` name/version inspection inside every tarball
- Complete vendor-tree enforcement
- `scripts/verify-vendor.js` with offline and explicit online modes
- Build-time offline vendor verification
- Corruption, identity-mismatch, and unmanifested-artifact regression tests
- Real versions and hashes in `docs/05-development/dependencies.md`

Out of scope by design:

- Extracting or bundling the packages into the HTML
- Argon2, SLIP-39, codex32, QR, or camera dependencies
- Runtime network access
- CSP, realm, vault, or cryptographic behavior

## 3. How to verify

The Windows environment used `npm.cmd` because PowerShell script execution policy blocks `npm.ps1`.

```text
PS> npm.cmd ci --ignore-scripts
PS> npm.cmd run lint
PS> npm.cmd test
PS> npm.cmd run verify-vendor
PS> npm.cmd run build
```

Expected test result:

```text
tests 6
pass 6
fail 0
```

The online verifier must print an upstream verification line for each of the six packages and end with:

```text
Vendor verification passed against local files and upstream releases.
```

The deterministic build must continue to emit SHA-256
`40b39e4392477a4625791e23f0475f0585ec2f9588d611897c700a4effa534fe`.

## 4. Acceptance criteria

| Criterion | How satisfied | Test/evidence |
|---|---|---|
| Vendor structure, upstream re-download verification, and real package versions/hashes. | Six versioned artifacts, a machine-readable manifest, canonical identity checks, and real registry metadata are committed. | Online verifier checks all six official registry tarballs. |
| Verification passes for intact artifacts. | Offline verification checks size, SHA-256, SHA-512 integrity, tar safety, and exact package metadata. | Intact offline test and build pass. |
| Corruption blocks verification and build. | A temporary one-byte change is rejected before assembly. | Corruption regression test. |
| Identity and completeness fail closed. | Canonical path/URL, package metadata, and complete vendor-tree checks reject altered or unlisted artifacts. | Three identity mismatch cases and one unmanifested artifact case. |
| Reproducibility remains intact. | The build output and sidecar are stable across locale/timezone changes. | Two independent builds are byte-identical. |

## 5. Security impact

- Supply chain: yes. This adds the first runtime artifacts and records their exact bytes.
- Build integrity: yes. The build refuses to assemble HTML when local vendor verification fails.
- Runtime network access: no. Online re-download is limited to the explicit developer verifier.
- Realm boundary, message schema, CSP, vault format, and randomness: untouched.
- New application `connect-src` host: none.

This item verifies artifact identity and completeness; it does not claim that upstream code is independently audited.

## 6. Test evidence

New tests cover:

- Offline verification of all six committed artifacts, including size and both digest forms.
- Temporary one-byte corruption, with build refusal.
- Canonical manifest path mismatch.
- Canonical npm URL mismatch.
- Package metadata mismatch using a valid tarball under the wrong manifest identity.
- Unmanifested vendor artifact.
- Existing reproducible-build behavior.

Independent source evidence:

- Official npm registry metadata and tarball URLs for each pinned release.
- Manifest npm SHA-512 integrity values plus independently computed SHA-256 values.
- Six tarballs total 916,610 bytes.

## 7. Device matrix

P0.2 changes developer tooling and committed release inputs but does not change browser behavior or the HTML artifact.

| Platform | Result |
|---|---|
| Windows Chrome | N/A |
| Windows Firefox | N/A |
| macOS Safari | N/A |
| macOS Chrome | N/A |
| Linux Firefox | N/A |
| iOS Safari (Files) | N/A |
| Android Chrome (Files) | N/A |
| Tor Browser | N/A |

## 8. Assumptions

- npm's official registry tarball is the release artifact to vendor.
- Version 2.2.0 is the intended pinned release for all six packages.
- Builds may verify local artifacts but must not download dependencies.

## 9. What to scrutinise

- Name/version-derived canonical manifest paths and npm URLs.
- Tarball inspection and exact `package/package.json` identity checks.
- Complete vendor-tree enforcement, including rejection of unmanifested files.
- The distinction between online developer verification and the build's offline guard.
- SHA-256 and SHA-512 calculations and fail-closed error paths.
- The fact that the tarballs are pinned but not yet extracted or bundled.

## 10. Self-assessment

- No second-OS or browser test was needed for this developer-tooling-only change.
- The upstream packages have not been independently audited in this PR.
- Other planned dependencies remain TBD and are intentionally not included.
- The corrected P0.2 commit is based directly on the P0.1 commit, preserving the one-roadmap-item boundary.

## 11. Bundle impact

| Artifact | Before | After | Delta |
|---|---:|---:|---:|
| `build/coldbox.html` | 776 bytes | 776 bytes | 0 bytes |
| Vendored release tarballs | 0 bytes | 916,610 bytes | +916,610 bytes |

The HTML remains unchanged and far below the 3 MB target. The vendor artifacts are not yet included in the output bundle.

## 12. Docs updated

- `docs/05-development/dependencies.md`
- `docs/05-development/ROADMAP.md`
- `CHANGELOG.md`
- `PR-PACKET.md`
