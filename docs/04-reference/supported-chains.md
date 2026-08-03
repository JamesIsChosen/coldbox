# Supported chains

Coin types verified against the [SLIP-44 registry](https://github.com/satoshilabs/slips/blob/master/slip-0044.md), which currently holds 1,464 registered types.

**Tier 3 applies to everything:** any BIP-32 path produces correct private and public keys even where no address formatter exists. That's the recovery-critical data — the address is presentation.

---

## Tier 1 — full address rendering

### Bitcoin and forks

| Chain | Coin type | Encoding | Script types |
|---|---|---|---|
| Bitcoin | 0 | base58check / bech32 / bech32m | P2PKH, P2SH-P2WPKH, P2WPKH, P2TR |
| Litecoin | 2 | base58check / bech32 | P2PKH, P2WPKH |
| Dogecoin | 3 | base58check | P2PKH |
| Dash | 5 | base58check | P2PKH |
| Zcash | 133 | base58check | Transparent only |
| Bitcoin Cash | 145 | CashAddr | P2PKH |

Bitcoin paths: `m/44'/0'` legacy · `m/49'/0'` nested SegWit · `m/84'/0'` native SegWit · `m/86'/0'` Taproot. Mainnet, testnet, and signet.

### EVM — one address, every chain

Coin type 60, path `m/44'/60'/0'/0/n`, Keccak-256 with EIP-55 checksum.

**The same address works on every EVM chain.** Listing them as separate rows implies a distinction that doesn't exist, so they're presented as one entry with a chain-ID reference:

| Chain | ID | Chain | ID |
|---|---|---|---|
| Ethereum | 1 | Base | 8453 |
| Optimism | 10 | Arbitrum One | 42161 |
| BNB Chain | 56 | Avalanche C | 43114 |
| Gnosis | 100 | Linea | 59144 |
| Polygon | 137 | Berachain | 80094 |
| Sonic | 146 | Blast | 81457 |
| zkSync Era | 324 | Scroll | 534352 |
| Hyperliquid EVM | 999 | Mantle | 5000 |
| Celo | 42220 | Monad | *see registry* |

Balances differ per chain and are queried per chain. The address does not.

Related SLIP-44 entries: Avalanche 9000 / C-Chain 9005, Optimism 614, Fantom 1007, Berachain 8008, Hyperliquid 2457, Monad 268435779.

### Cosmos family

secp256k1, differing only in bech32 HRP.

| Chain | Coin type | HRP |
|---|---|---|
| Cosmos Hub | 118 | `cosmos` |
| Osmosis | 10000118 | `osmo` |
| Sei | 19000118 | `sei` |
| Injective | 22000119 | `inj` |
| Celestia | 118 | `celestia` |
| Kava | 459 | `kava` |
| Secret Network | 529 | `secret` |
| Thorchain | 931 | `thor` |

Injective uses `ethsecp256k1` — Ethereum-style keys with Cosmos-style encoding — and carries its own test vectors rather than being assumed identical.

### Ed25519 (SLIP-0010)

Hardened derivation only. Non-hardened ed25519 derivation is undefined and is not offered.

| Chain | Coin type | Encoding |
|---|---|---|
| Solana | 501 | base58 |
| TON | 607 | TON-specific |
| Aptos | 637 | hex |
| Sui | 784 | hex |
| NEAR | 397 | hex |
| Algorand | 283 | base32 + checksum |
| Stellar | 148 | base32 |
| Hedera | 3030 | account ID |
| MultiversX | 508 | bech32 `erd` |

### Other secp256k1

| Chain | Coin type | Encoding |
|---|---|---|
| Tron | 195 | base58check, 0x41 prefix |
| XRP | 144 | XRP base58 alphabet |

---

## Tier 2 — Phase 5

Each needs a curve or encoding not otherwise carried, so they're grouped:

| Chain | Coin type | Blocker |
|---|---|---|
| Cardano | 1815 | ed25519-bip32, CIP-1852 |
| Polkadot | 354 | sr25519 |
| Kusama | 434 | sr25519 |
| Tezos | 1729 | Multi-curve, prefixed base58 |
| Kaspa | 111111 | Schnorr variant |
| Stacks | 5757 | Stacks encoding |
| Filecoin | 461 | Filecoin address scheme |
| Starknet | 9004 | Stark curve |
| Chia | 8444 | BLS12-381 |
| Casper | 506 | — |
| Mina | 12586 | — |
| Bittensor | 1005 | sr25519 |
| Aleo | 683 | — |
| Ergo | 429 | — |
| Nervos CKB | 309 | — |
| Flow | 539 | — |
| Radix | 1022 | — |
| Internet Computer | 223 | — |
| Arweave | 472 | RSA |

---

## Excluded

| Chain | Why |
|---|---|
| **Monero** | Entirely different seed scheme — 25-word, dual keys, ed25519. Bolting it on invites subtle, expensive errors. Use the official tools |
| Zcash shielded | Sapling/Orchard derivation is a large separate implementation. Transparent only |
| Lightning | Channel state, not addresses. Different custody model |

---

## Custom chains

Define your own in-app: name, coin type, curve, address scheme, version bytes or HRP, WIF version. Export and import as JSON.

Schemes available: `base58check`, `bech32`, `bech32m`, `cashaddr`, `keccak-eip55`, `ed25519-base58`, `ed25519-bech32`, `ripple-base58`, `tron-base58`, `raw-hex`.

Custom chains are marked **unverified** — no test vectors have been run. The app derives and displays but doesn't imply the same confidence as a shipped chain.

---

## Requesting a chain

Open an issue with: SLIP-44 coin type from the official registry, curve, address encoding, and **test vectors from an independent implementation** — a known seed, path, and expected address, for at least three paths.

**A chain without test vectors won't be merged.** Silently producing a wrong address is worse than not supporting the chain, because there's no way for the user to notice until funds are gone.

See [chain-registry.md](../01-spec/chain-registry.md) for the implementation detail.
