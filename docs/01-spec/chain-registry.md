# Chain registry

How chains are defined, added, and validated. User-facing list in [supported-chains](../04-reference/supported-chains.md).

---

## Tiers

**Tier 1 — full address rendering.** Ships with the app, with test vectors. See [supported-chains](../04-reference/supported-chains.md).

**Tier 2 — deferred.** Needs a curve or encoding not otherwise carried. Grouped into Phase 5.

**Tier 3 — generic.** Any BIP-32 path produces correct private and public keys even with no address formatter. This is what "asset agnostic" actually means: the recovery-critical data is always available; the address is presentation.

---

## Chain definition

```js
{
  id:            'btc',
  name:          'Bitcoin',
  symbol:        'BTC',
  coinType:      0,                    // SLIP-44
  curve:         'secp256k1',          // | 'ed25519'
  addressScheme: 'base58check',
  versionBytes:  { p2pkh: 0x00, p2sh: 0x05 },
  hrp:           'bc',                 // bech32 human-readable part
  wifVersion:    0x80,
  scriptTypes:   ['p2pkh','p2sh-p2wpkh','p2wpkh','p2tr'],
  defaultPath:   "m/84'/0'/0'/0/0",
  decimals:      8,
  testVectors:   [...]                 // required
}
```

## Address schemes

| Scheme | Encoding | Used by |
|---|---|---|
| `base58check` | Base58 + 4-byte double-SHA256 checksum | BTC, LTC, DOGE, DASH, ZEC-t |
| `bech32` | BIP-173, BCH-code checksum | BTC SegWit v0, Cosmos family |
| `bech32m` | BIP-350 | BTC Taproot |
| `cashaddr` | BCH-specific bech32 variant | Bitcoin Cash |
| `keccak-eip55` | Keccak-256, case-encoded checksum | All EVM chains |
| `ed25519-base58` | Base58 of the raw public key | Solana |
| `ed25519-bech32` | bech32 with chain HRP | MultiversX |
| `ripple-base58` | Base58 with XRP's alternate alphabet | XRP |
| `tron-base58` | base58check, 0x41 prefix | Tron |
| `raw-hex` | Hex public key | Fallback |

Adding a scheme is a bigger change than adding a chain and needs its own test vectors.

---

## Custom registry

Users can define chains in-app: name, coin type, curve, address scheme, version bytes or HRP, WIF version. Exportable and importable as JSON, so a definition can be shared.

Custom chains are visibly marked as **unverified** — no test vectors have been run against them. The app will derive and display, but it won't imply the same confidence as a shipped chain.

---

## The EVM special case

Every EVM chain shares one address derived from `m/44'/60'`. Presenting Ethereum, Polygon, Arbitrum, Base, and Optimism as separate rows with identical addresses is noise and implies a distinction that doesn't exist.

So EVM is **one entry** with a chain-ID reference list:

| Chain | ID | Chain | ID |
|---|---|---|---|
| Ethereum | 1 | Base | 8453 |
| Optimism | 10 | Arbitrum One | 42161 |
| Gnosis | 100 | Avalanche C | 43114 |
| BNB Chain | 56 | Linea | 59144 |
| Polygon | 137 | Blast | 81457 |
| Sonic | 146 | Berachain | 80094 |
| zkSync Era | 324 | Hyperliquid EVM | 999 |
| Mantle | 5000 | Scroll | 534352 |
| Celo | 42220 | Monad | *see SLIP-44* |

Balances differ per chain and are looked up per chain; the address does not.

## The Cosmos special case

Cosmos chains share secp256k1 derivation and differ only in bech32 HRP. One entry with a configurable HRP:

| Chain | Coin type | HRP |
|---|---|---|
| Cosmos Hub | 118 | `cosmos` |
| Osmosis | 10000118 | `osmo` |
| Sei | 19000118 | `sei` |
| Injective | 22000119 | `inj` |
| Celestia | 118 | `celestia` |
| Kava | 459 | `kava` |
| Secret | 529 | `secret` |
| Thorchain | 931 | `thor` |

Injective uses `ethsecp256k1` — an Ethereum-style key scheme with Cosmos-style encoding — and needs its own test vectors rather than being assumed identical.

---

## Adding a chain

1. **SLIP-44 coin type** from the [official registry](https://github.com/satoshilabs/slips/blob/master/slip-0044.md). Never invent one.
2. **Curve and derivation.** secp256k1 uses BIP-32; ed25519 uses SLIP-0010, which is hardened-only — non-hardened ed25519 derivation is not defined and must not be offered.
3. **Address encoding**, including any checksum.
4. **Test vectors from an independent implementation** — the chain's own docs, a reference library, or a hardware wallet. At minimum: a known seed, a path, and the expected address, for at least three paths.
5. **Register** the definition and add it to the docs.

**A chain without test vectors will not be merged.** Silently producing a wrong address is worse than not supporting the chain — the user has no way to notice until funds are gone.

### What "has test vectors" has to mean in code

A gate that checks whether a chain *claims* vectors is not a gate. Prose is not
evidence, and a check that accepts prose is worse than no check because it reads
like protection. The requirement is therefore structural and executed, not
documentary:

1. **A vector is a record, not a sentence.** Each carries `source` (the
   independent implementation it came from, precisely enough to re-fetch),
   `seed` (a known test seed or mnemonic, never a real one), `path`, and
   `expectedAddress`. A vector missing any field is invalid, not merely
   incomplete.
2. **At least three distinct paths per chain**, per the rule above. Three
   records that share a path are one vector, not three.
3. **The vectors are executed, not inspected.** The gate derives from `seed`
   along `path` using the shipped engine and compares the result to
   `expectedAddress`. A chain is selectable only if every one of its vectors
   was executed and matched in this build.
4. **Absence, malformation and mismatch all fail closed** — an unusable chain,
   not a usable chain with a warning.
5. **CI executes the same vectors** and fails the build on any absence,
   malformation or mismatch, so the gate cannot pass at runtime while being
   broken in the repository.

The property under protection is address correctness. A chain the app cannot
independently prove it derives correctly must not be offered, because the user
discovers the error only after sending funds to an address nobody controls.

Tests for this gate must include a negative case proving that metadata alone —
a chain entry carrying a plausible label where its vectors should be — leaves
the chain unselectable. A positive case that only asserts "selectable" without
asserting the vectors ran is not evidence that they ran.

---

## Deliberately excluded

| Chain | Why |
|---|---|
| **Monero** | Entirely different seed scheme (25-word, dual keys, ed25519). Bolting it on invites subtle, expensive errors. Use the official tools |
| Zcash shielded | Sapling/Orchard key derivation is a large, separate implementation. Transparent addresses only |
| Lightning | Channel state, not addresses. Different custody model |

---

## Validation in CI

Every shipped chain runs its test vectors on every build. A chain whose vectors fail blocks the release.

Additionally: round-trip tests (address → decode → re-encode → identical), checksum rejection tests (flip a character, confirm validation fails), and cross-checks against a second implementation where one is available.
