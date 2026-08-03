# PR packet - P0.4 CSP hash-pinning in the build

## 1. Summary

P0.4 adds the documented warm-shell CSP to the source template and makes the build compute and inject a SHA-256 CSP hash for every inline script and style block. Hashes are computed from the exact UTF-8 text between each tag, so formatting and any later byte change are covered by the policy.

The implementation and static regression coverage are complete. The roadmap item remains in progress because the available in-app browser rejected `file://` navigation, so actual browser console behavior and post-build refusal could not be verified in this environment.

Branch: `p0.4-csp-hash-pinning`
Base: `main` at `487a19e`

## 2. Scope

In scope:

- CSP meta tag in `src/index.html` with build-time script and style hash placeholders
- SHA-256 hash injection for all inline script blocks
- SHA-256 hash injection for all inline style blocks
- Multiple-inline-block coverage
- Post-build script-tampering hash regression coverage
- Deterministic output verification
- Build documentation, changelog, roadmap status, and this packet

Out of scope by design:

- Changing the documented network allowlist
- Realm, message schema, vault format, or cryptographic behavior
- Adding runtime dependencies or external scripts/styles
- Claiming browser enforcement without a supported browser run

## 3. How to verify

The Windows environment used `npm.cmd` because PowerShell script execution policy blocks `npm.ps1`.

```text
PS> npm.cmd run lint
Lint passed: JavaScript syntax and LF source line endings are valid.

PS> npm.cmd test
ℹ tests 8
ℹ pass 8
ℹ fail 0

PS> npm.cmd run verify-vendor
Vendor verification passed against local files and upstream releases.

PS> npm.cmd run build
Vendor verification passed in offline mode.
Built build/coldbox.html (7878f1418085c4e212f9b1803d7acd56e3653ccda46bec29096569457b4c0605)

PS> Get-FileHash -Algorithm SHA256 build/coldbox.html
7878F1418085C4E212F9B1803D7ACD56E3653CCDA46BEC29096569457B4C0605
```

A second build emitted the same digest. `git diff --check` also passed.

Browser runtime verification was attempted with the available Codex in-app browser. Its URL policy blocked `file://` navigation to the built artifact; no alternate browser, CDP, or indirect execution workaround was used. Consequently, the browser console/no-violation check and actual browser refusal after tampering remain pending.

## 4. Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Compute SHA-256 of each inline script and style block; inject into the respective `script-src`/`style-src` directives. | Satisfied statically | Build code hashes every extracted inline block; the regression suite independently recomputes and checks each hash in the correct directive. |
| Built file runs with no CSP violations. | Browser verification pending | The built policy contains no unresolved placeholders or `unsafe-inline`; the in-app browser could not open the local artifact. |
| Altering one byte of the inline script causes the browser to refuse execution. | Static invariant verified; browser verification pending | The tampering test produces a different hash absent from `script-src`; a browser run is still required to observe refusal. |

The roadmap item is intentionally marked `[~]` until the two browser-visible criteria can be run in a supported browser.

## 5. Security impact

- CSP: yes. Inline execution is restricted to the build-generated hashes; `unsafe-inline` is not added.
- Build integrity: yes. Missing CSP placeholders or inline blocks fail the build.
- Runtime network access: no new host is introduced; the existing documented allowlist is embedded in the source policy.
- Realm boundary, message schema, vault format, and randomness: untouched.

The security property depends on the browser applying the emitted CSP to the exact bytes of the built document; that final runtime behavior is the outstanding verification item.

## 6. Test evidence

New P0.4 tests cover:

- Independent SHA-256 recomputation for the built inline script and style.
- Correct routing of script hashes to `script-src` and style hashes to `style-src`.
- Rejection of unresolved CSP placeholders and `unsafe-inline`.
- Multiple inline scripts and styles in a temporary build root.
- A one-byte script tamper producing a different hash that is absent from the policy.
- Existing reproducible-build and vendor verification behavior.

The complete suite passes 8/8 tests. The build output is 1,498 bytes and reproduced byte-for-byte across the final build checks.

## 7. Device matrix

P0.4 changes browser-visible CSP behavior, but runtime testing was blocked by the local browser URL policy.

| Platform | Result |
|---|---|
| Windows Chrome | Not run; supported browser access to the local artifact was unavailable |
| Windows Firefox | Not run |
| macOS Safari | Not run |
| macOS Chrome | Not run |
| Linux Firefox | Not run |
| iOS Safari (Files) | Not run |
| Android Chrome (Files) | Not run |
| Tor Browser | Not run |

## 8. Assumptions

- CSP hashes must cover the exact UTF-8 text between each inline tag, including whitespace and line endings.
- The source CSP allowlist matches `docs/02-security/csp-policy.md`; that policy document was reviewed and is unchanged by P0.4.
- The final browser acceptance check will use the built artifact without rewriting its inline blocks.

## 9. What to scrutinise

- Exact bytes selected for hashing, including leading/trailing newlines.
- Placeholder replacement order and fail-closed behavior.
- Correct separation of script and style hashes between CSP directives.
- Multiple inline-block handling.
- Browser console behavior for the intact artifact and browser refusal after script tampering.

## 10. Self-assessment

- Static implementation and regression evidence are complete.
- Actual browser CSP enforcement could not be observed because the available browser blocked `file://` navigation.
- The roadmap item is not represented as complete until that runtime evidence exists.

## 11. Bundle impact

| Artifact | Before | After | Delta |
|---|---:|---:|---:|
| `build/coldbox.html` | 776 bytes | 1,498 bytes | +722 bytes |

The built HTML remains far below the 3 MB target. The CSP metadata accounts for the increase.

## 12. Docs updated

- `docs/05-development/build.md`
- `docs/05-development/ROADMAP.md` (P0.4 marked `[~]` pending browser evidence)
- `CHANGELOG.md`
- `PR-PACKET.md`
