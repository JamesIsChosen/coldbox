# Dependencies

**Zero runtime dependencies.** Every library is vendored into `vendor/`, committed to the repository, and verified against its upstream release hash. Nothing is fetched at build time or run time. `npm run verify-vendor` is the explicit networked check; normal builds verify the committed artifacts offline.

The pinned `@noble/*`, `@scure/*`, and Argon2 artifacts below are recorded in [vendor/vendor-manifest.json](../../vendor/vendor-manifest.json), which is the machine-readable authority.

---

## Runtime libraries (vendored; bundled by the build)

| Library | Version | Purpose | Upstream SHA-256 |
|---|---|---|---|
| `@noble/hashes` | 2.2.0 | SHA-2/3, HMAC, PBKDF2, RIPEMD-160, Keccak | `018b38bd7af36645fa0ece8f89eba21c828f3e4d219da5aacadd78bd0e654606` |
| `@noble/curves` | 2.2.0 | secp256k1, ed25519 | `6daf47e557e070b0657eda25549466bae3d07df555de4f702363355e8fb92ec8` |
| `@noble/ciphers` | 2.2.0 | AES-GCM, ChaCha20-Poly1305 | `4a030353f7de42e977cad54cf1d7ecedfe0558add24c5742e4a2e55159614ffa` |
| `@scure/bip32` | 2.2.0 | HD derivation | `648335439c8bf752209a40cd470aa86858de844d491fb46d9d934cb96073f08b` |
| `@scure/bip39` | 2.2.0 | Mnemonic encode/decode | `04a6e2bb040301954373f543e44c352137f14dff58f942782769984ef5ea8e1c` |
| `@scure/base` | 2.2.0 | base58, bech32, bech32m, base64 | `659e1b1eaac82df04e5a4b97ef48779cfd3e7c24dafde5efa4324659a25d70a3` |
| `argon2-browser` (WASM) | 1.18.0 | Argon2id KDF | `cdb11795a4971bde095fe6b836aa424de50c4558ed4b9505bc74111eee7f6d35` |
| Shamir39 reference | commit `30d17d8921200afd1c6365140ee1defead11386a`; `specification.md` blob `8be52ecd5d7700bf68086dccff7851dee3670074`, exact LF-byte SHA-256 `979d15d588adf80b27d515dbaf97a8a9f97766395289632142bef78614f77c62`; `src/js/shamir39.js` blob `4b0aae2cc63ac588326037e1718f7d888c21d269`, exact LF-byte SHA-256 `a1f822fe010d5ddbf9b33bda0eaf5152388e8700d5e35893fb8f85116ed4233c` | Inline adaptation; no runtime package | `N/A - source reference, not a release artifact` |
| SLIP-39 implementation | TBD | Shamir mnemonic shares | `TBD` |
| codex32 implementation | TBD | BIP-93 hand-verifiable shares | `TBD` |
| `secrets.js` reference | commit `14a4b682a28242b1dbe5506674b5d5f476b78dbf`; `README.md` blob `a4f1b45a96de9ab9c6a86f6927d3657b417cb643`, exact LF-byte SHA-256 `56d52d02a32735a5858bf7e6ffb2b95544c6a761906a4594cd438ffbbf125914`; `secrets.js` blob `2eb1360d61d99f5cee46ebb2aaf1f938b065069c`, exact LF-byte SHA-256 `6c90ec0b0d88a8c90d08f8657448c72db6592fcec5096306c70c815e2404eee9`; fixture `spec/secrets/SecretsSpec.js` blob `8986699144de4d25623217ac4377f85a4042f945`, exact LF-byte SHA-256 `b6f843bc4c40f268c175b0c49564fb5be43e1187e4216c33efd6b3559040db0f` | Inline raw SSS adaptation; no runtime package | `N/A - source reference, not a release artifact` |
| `qrcode-generator` | 1.4.4 | Ephemeral SVG/data-URL rendering for live encrypted `CBX-VT/1` transfer frames; never durable QR export | `ab6ed47d378877441deae95972e07b2716c26545a735a23aa6b9d442b33026ed` |
| `jsQR` | TBD | Camera decoding (optional) | `TBD` |

P0.2 verifies and stores release artifacts. P1.3 bundles the BIP-39 encoder/decoder and all ten official wordlists; P1.4 adds the BIP-32 Bitcoin derivation engine and the `@scure/base` encodings; P1.5 adds Keccak-256, EIP-55 formatting, EVM derivation, and the cold-only arbitrary-path projection to the same bundle alongside the selected `@noble` modules and embedded `argon2-browser` WASM bundle. P2.4 adapts the reviewed Shamir39 and secrets.js reference behavior inline in the cold realm; those source commits are provenance references, not fetched or shipped runtime dependencies. The remaining TBD libraries are still not runtime-ready.

## Fonts (vendored; inlined as `data:` URIs by the build)

Treated exactly like the crypto artifacts — pinned tarball, manifest entry, offline hash verification, build refuses to run on mismatch. There is no CDN option: the CSP is `font-src data:` only, `scripts/lint.js` rejects external URLs, and nothing may be fetched at build or run time.

| Package | Version | Face | Licence | Upstream SHA-256 |
|---|---|---|---|---|
| `@fontsource/bangers` | 5.3.0 | Bangers — display/headings | SIL OFL 1.1 | `7200b288ad26e3da1dd0a47dfb6f1712c4c327f038d84afe69a682c63a2c102c` |
| `@fontsource/comic-neue` | 5.3.0 | Comic Neue 400/700 — body | SIL OFL 1.1 | `0d242660fa8a3e31deb4ba0005b830904db4533ae3366f9c41724ff452662fa6` |

Only the **latin** WOFF2 subsets are extracted — one face from Bangers, two weights from Comic Neue — by `scripts/font-bundle.js`, which asserts the `wOF2` signature and a 512 KB ceiling before base64-encoding. Cost in `build/coldbox.html`: ~83 KB. The sealed realm deliberately does **not** carry these faces; see [design-system.md §7](../01-spec/design-system.md).

## Data files

| File | Source | Size |
|---|---|---|
| BIP-39 wordlists (10 languages) | bitcoin/bips | ~103 KB |
| SLIP-39 wordlist (1024) | satoshilabs/slips | ~8 KB |
| EFF Large (7776) | eff.org | ~60 KB |
| EFF Short 2.0 (1296) | eff.org | ~15 KB |
| SLIP-44 coin type subset | satoshilabs/slips | ~10 KB |

Wordlists are load-bearing: a single altered word produces a different, unrecoverable seed. They are hash-verified like code, and CI additionally asserts word counts and checksums of the lists themselves.

---

## Why `@noble` and `@scure`

- Audited, with public reports
- **Zero dependencies** — the whole tree is reviewable
- Small and written to be read
- Constant-time where it matters
- Actively maintained

**Deliberately replaced** from the tools this project supersedes: `bitcoinjs-lib` (large dependency tree), `elliptic` (past security issues, large), `sjcl` (aging, largely unmaintained), `jsbn` (ancient), `jQuery` (unnecessary). All appear in the Ian Coleman standalone; moving off them is an upgrade, not a lateral move.

---

## Development dependencies

In `package.json`, **not** shipped in the output. Kept minimal — a compromised dev dependency can alter the build.

| Tool | Purpose |
|---|---|
| Build script | Assembly, CSP hashing, help compilation |
| Test runner | Unit and vector tests |
| Linter | Forbidden-construct enforcement |
| Vendor verifier | Upstream hash comparison |
| **Playwright 1.62.1** *(P0.3a)* | Headless browser verification of CSP, sandbox, and realm boundary |

Installed with `npm ci`, never `npm install`, so the lockfile is respected exactly.

The Playwright package does not include browser binaries in npm. After `npm ci`, the browser harness prerequisite is `npx playwright install chromium firefox`; the binaries remain development tooling and are never shipped.

**On Playwright specifically.** It is by far the largest thing in the tree (~300 MB of browser binaries), which sits awkwardly in a project whose identity is minimal dependencies. It earns its place because the central security claim — that secrets cannot cross the realm boundary — is only observable in a real browser engine, and asserting a guarantee we have no way to observe would be exactly the unverified confidence this project exists to avoid. It contributes **zero bytes** to `build/coldbox.html`, an explicit P0.3a acceptance criterion. Full reasoning and rejected alternatives in [ADR-0007](adr/0007-headless-browser-harness.md).

### Pinned release artifacts

The pinned runtime libraries are stored as npm release tarballs under `vendor/npm/<scope>/<package>/<version>/package.tgz`. Each manifest entry records the official npm tarball URL, package size, SHA-256, and npm SHA-512 integrity value. The verifier checks the local bytes on every build and, when `npm run verify-vendor` is run, downloads the same official URLs again and checks both digests before passing.

---

## Adding a dependency

Rarely the right answer. When it is:

1. **Justify it.** Could a hundred lines of our own code do it? For anything non-cryptographic, usually yes.
2. **Check the tree.** A dependency with dependencies is a much larger review surface.
3. **Check maintenance.** Abandoned crypto libraries are a liability.
4. **Prefer `@noble`/`@scure`** where they cover the need.
5. **Vendor the release artifact**, not a git checkout.
6. **Record version and upstream hash** here.
7. **Add to the provenance panel** so users see it in-app.
8. **State the bundle cost** in the PR.

## Updating

```bash
npm run update-vendor -- @noble/hashes@2.0.0
```

Then **read the diff**. A dependency update in this project is a cryptographic change and deserves the same scrutiny.

Check the changelog for security fixes, confirm test vectors still pass, and confirm the bundle size delta is acceptable.

**If upstream re-publishes an existing version under a different hash, investigate rather than update.** Legitimate projects don't silently alter published releases, and that pattern is a known supply chain attack.

---

## Bundle budget

Target ≤ 3 MB, hard cap 4.5 MB. Current estimate ≈ 1.7 MB.

| Component | Est. |
|---|---|
| Crypto libraries | 205 KB |
| Argon2 WASM (base64) | 60 KB |
| Shamir schemes (SLIP-39, codex32, SSS, XOR) | 70 KB |
| QR encode + decode | 55 KB |
| Chain formatters | 60 KB |
| Wordlists | 186 KB |
| Reference excerpts | 120 KB |
| Help content | 180 KB |
| Portfolio engine + charts | 60 KB |
| Price/balance adapters | 35 KB |
| App code, CSS, icons | 450 KB |
| **Total** | **≈ 1.7 MB** |

For comparison, the Ian Coleman BIP39 standalone is 4.55 MB on its own.

Every PR states its size impact. The budget exists because this file must open quickly on a phone.

---

## Provenance in-app

Reference → Provenance lists every embedded library with version, upstream release URL, and upstream release hash — generated at build time directly from [vendor/vendor-manifest.json](../../vendor/vendor-manifest.json), so this table and the in-app panel cannot drift apart. It also shows the build date (the source commit date, never a wall-clock build timestamp — see [build.md](build.md)'s determinism requirements), the complete CSP allowlist for each realm read live from the assembled document rather than a second transcribed copy, and a self-hash drop zone that states plainly that self-verification is circular and points to [verification.md](../02-security/verification.md) for checks an attacker cannot forge.

An auditor should be able to diff what's in the file against what's claimed here, without cloning anything.
