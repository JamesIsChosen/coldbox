# Dependencies

**Zero runtime dependencies.** Every library is vendored into `vendor/`, committed to the repository, and verified against its upstream release hash. Nothing is fetched at build time or run time.

Hashes below are placeholders until the first build pins them. `npm run verify-vendor` is the authority.

---

## Runtime libraries (bundled into the HTML)

| Library | Version | Purpose | Upstream SHA-256 |
|---|---|---|---|
| `@noble/hashes` | TBD | SHA-2/3, HMAC, PBKDF2, RIPEMD-160, Keccak | `TBD` |
| `@noble/curves` | TBD | secp256k1, ed25519 | `TBD` |
| `@noble/ciphers` | TBD | AES-GCM, ChaCha20-Poly1305 | `TBD` |
| `@scure/bip32` | TBD | HD derivation | `TBD` |
| `@scure/bip39` | TBD | Mnemonic encode/decode | `TBD` |
| `@scure/base` | TBD | base58, bech32, bech32m, base64 | `TBD` |
| `argon2-browser` (WASM) | TBD | Argon2id KDF | `TBD` |
| SLIP-39 implementation | TBD | Shamir mnemonic shares | `TBD` |
| codex32 implementation | TBD | BIP-93 hand-verifiable shares | `TBD` |
| `secrets.js` | TBD | Raw Shamir over GF(2^n) | `TBD` |
| QR encoder | TBD | SVG/PNG generation | `TBD` |
| `jsQR` | TBD | Camera decoding (optional) | `TBD` |

## Data files

| File | Source | Size |
|---|---|---|
| BIP-39 wordlists (9 languages) | bitcoin/bips | ~103 KB |
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

Installed with `npm ci`, never `npm install`, so the lockfile is respected exactly.

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

Reference → Provenance lists every embedded library with version, upstream repository, and upstream release hash, plus the build date, the app's own expected hash, and the complete CSP allowlist.

An auditor should be able to diff what's in the file against what's claimed here, without cloning anything.
