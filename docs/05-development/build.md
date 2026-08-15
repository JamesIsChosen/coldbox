# Building

The build must be **reproducible** — anyone can rebuild from source and get byte-identical output. Without that, "open source" is a claim about a repository rather than about the file in a user's hands.

---

## Prerequisites

- Node.js — exact version pinned in `.nvmrc`. Use it; a different major version may produce different output.
- Git

```bash
nvm use          # respects .nvmrc
node --version   # must match .nvmrc exactly
```

## Quick start

```bash
git clone https://github.com/<owner>/coldbox
cd coldbox
npm ci                  # not npm install — ci respects the lockfile exactly
npm run verify-vendor   # confirm vendored libs match upstream hashes
npm run build           # → build/coldbox.html
npm test
```

To run the browser harness, install its development-only browser binaries once after `npm ci`:

```bash
npx playwright install chromium firefox
npm run test:browser
```

The browser download is explicit and separate from `npm ci`; the application build and the shipped HTML never fetch it or any runtime dependency.

---

## What the build does

1. **Verify vendor** — every file in `vendor/` is hashed and compared against the upstream release hashes in [dependencies.md](dependencies.md). Any mismatch aborts the build.
2. **Lint for forbidden constructs** — `eval`, `new Function`, `import`, and `require` are rejected throughout application source. `src/cold/` is the secret-handling path; it additionally rejects external URLs and `localStorage`. Any hit aborts.
3. **Compile help content** — markdown from `docs/00-overview/glossary.md` and `docs/03-guides/` is converted and embedded. There is one copy of every explanation; in-app help and repo docs cannot drift.
3a. **Embed the brand assets** — the traced wordmark SVG is inlined into `.app-bar` and the three favicon PNGs are base64-encoded into `data:` URIs in `<head>`, both read from `assets/brand/`. Nothing is traced, rasterised, or resized here; the build encodes committed bytes. An SVG carrying a `<script>`, a `<foreignObject>`, an `href`, a literal hex colour, or any external reference aborts the build, as does a favicon whose bytes are not a PNG of the size it declares. See [ADR-0047](adr/0047-brand-assets-traced-once-and-embedded.md).
4. **Assemble the cold realm** — its HTML, CSS, crypto vendor bundle, crypto layer, vault-format layer, and bootstrap JS are built and serialized into a string for `srcdoc`. The bundle is generated only from the committed vendor tarballs; it never imports a module or fetches a runtime dependency. The warm shell does not receive a vault API or secret-subkey derivation function.
5. **Compute cold CSP hashes** — SHA-256 of the exact UTF-8 text in each cold inline script and style block, injected into the child policy and then into the parent policy because `srcdoc` inherits the parent's CSP. The parent and child policies still combine restrictively; the parent hashes only authorize the exact child blocks.
6. **Compute warm CSP hashes and assemble the shell** — the warm script receives the serialized child document, the parent receives the exact child hashes, and the outer script/style hashes are injected last. Missing hash placeholders or inline blocks abort the build. **This is why the build must be deterministic**: a nondeterministic build produces a hash mismatch and nothing runs.
7. **Inject provenance data** — the Reference → Provenance panel's build-time inputs are compiled in: the embedded library list (read directly from `vendor/vendor-manifest.json`, so it can't drift from what `verify-vendor` checks), and the build date. That date is the commit date of the most recent commit touching `assets/`, `src/`, `scripts/`, or `vendor/` — deliberately *not* literal `HEAD`, so that a governance-only commit such as a PR packet update doesn't change the product's own bytes; see the [ADR-0015 amendment](adr/0015-provenance-build-date-and-self-hash.md#amendment-2026-08-06-build-date-is-scoped-to-product-paths-not-literal-head). Its *spelling* is produced by `scripts/build-date.js`, not by git, because git versions disagree on how to render a UTC offset (`+00:00` versus `Z`) and that five-byte disagreement was reaching the artifact — see the [2026-08-15 amendment](adr/0015-provenance-build-date-and-self-hash.md#amendment-2026-08-15-the-dates-rendering-is-ours-not-gits).
8. **Compute and embed the expected hash** — the document's `coldbox-expected-hash` meta tag is filled with the SHA-256 of the fully assembled document computed with that same tag blanked to 64 zero characters first, since a file cannot contain the true hash of itself. This is a distinct, disclosed value from the final `coldbox.html.sha256` below it — see [ADR-0015](adr/0015-provenance-build-date-and-self-hash.md) for why, and why the in-app drop zone reproduces the identical blank-then-hash procedure rather than comparing against `coldbox.html.sha256` directly.
9. **Emit** `build/coldbox.html` and `build/coldbox.html.sha256`.

---

## Determinism requirements

Every one of these has been a source of nondeterminism in real projects.

| Requirement | Why |
|---|---|
| No timestamps in output | Build time varies |
| No build-machine paths | Differs per machine |
| Sorted iteration order | Object and directory iteration order varies |
| Pinned toolchain | Minifiers change output between versions |
| No network access during build | Fetched content can change |
| Fixed locale (`LC_ALL=C`) | Sorting is locale-dependent |
| Fixed timezone (`TZ=UTC`) | Date formatting varies |
| **LF line endings everywhere** | CRLF on Windows vs LF on Linux produces different bytes and different hashes. Enforced by `.gitattributes` |
| No randomness | Obviously |

That line-endings row is the one people miss. It costs nothing to enforce and silently breaks cross-platform hash comparison if you don't — including the CI-versus-local check that the whole verification story rests on.

Verify locally:

```bash
npm run build && shasum -a 256 build/coldbox.html
rm -rf build && npm run build && shasum -a 256 build/coldbox.html
# The two hashes must be identical
```

CI additionally builds on a different OS and compares.

---

## Vendored dependencies

`vendor/` contains the actual release artifacts of every library, committed to the repository. Nothing is fetched at build time.

```bash
npm run verify-vendor
```

Re-downloads each upstream release, hashes it, and compares against `vendor/` and against the hashes recorded in [dependencies.md](dependencies.md). This is the only step that touches the network, it's separate from the build, and it's run in CI on every PR.

### Updating a dependency

```bash
npm run update-vendor -- @noble/hashes@2.0.0
```

Downloads, hashes, updates `vendor/` and `dependencies.md`. **Review the diff.** A dependency update in a project like this deserves the same scrutiny as a cryptographic change, because that's what it is.

---

## Adding help content

Write markdown in `docs/03-guides/` or add a glossary term. Use the three-depth structure:

```markdown
### What is an xpub?

::: plain
A master key that can create all your receiving addresses but can't spend anything.
:::

::: working
An extended public key. Combined with a chain code it derives every child public key
below its path…
:::

::: technical
BIP-32 serialized extended public key: 4-byte version, depth, parent fingerprint…
:::
```

The build extracts each block and the app shows the one matching the user's chosen depth. A missing block for a documented feature is a build warning.

---

## Release

Full checklist in [release-checklist.md](release-checklist.md). Summary:

```bash
npm version 1.0.0
npm run build
npm test
npm run test-matrix          # manual device testing prompts

shasum -a 256 build/coldbox.html > coldbox-v1.0.0.html.sha256
gpg --detach-sign --armor build/coldbox.html

git tag -s v1.0.0 -m "Release 1.0.0"
git push --tags
```

CI builds the tag independently and publishes an attestation. **Three hashes must agree**: yours, CI's, and any third-party rebuild. If they don't, the release doesn't ship.

---

## Troubleshooting

**Hash differs between builds.** Check Node version against `.nvmrc`, confirm `git status` is clean, run with `LC_ALL=C TZ=UTC`.

**`verify-vendor` fails.** Either a vendored file was modified locally, or upstream re-published a release under the same version. The second is a supply chain concern — investigate rather than update.

**CSP hash mismatch at runtime.** The build produced different bytes than the hash it embedded. Almost always nondeterminism in the assembly step.

**Argon2 fails to load in the built file.** Check the visible **Vault details / P0.12** panel and the `data-kdf-active` attribute. The cold realm runs the RFC 9106 vector during boot; if Argon2id WASM cannot load, it labels the active PBKDF2-HMAC-SHA512 fallback and never hides that downgrade. A missing `'wasm-unsafe-eval'` token is still a build/security defect because it forces the fallback on browsers that support WASM.
