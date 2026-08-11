# Derivation paths

The most common cause of "my coins have disappeared" is a wallet looking at the wrong path. The coins are fine; the software is looking in the wrong place.

---

## Reading a path

```
m / 84' / 0' / 0' / 0 / 5
│    │     │    │    │   └── address index
│    │     │    │    └────── change: 0 = receive, 1 = change
│    │     │    └─────────── account number
│    │     └──────────────── coin type (SLIP-44)
│    └────────────────────── purpose (which standard)
└─────────────────────────── master key
```

`'` means **hardened**. Hardened steps prevent a leaked child key from exposing siblings or the parent. Non-hardened steps allow deriving addresses from a public key alone — which is what makes watch-only wallets possible.

The first three levels are hardened; the last two are not. That's what lets an xpub at account level generate all your addresses without any spending ability.

---

## Purposes

| Purpose | Standard | Address | Name |
|---|---|---|---|
| `44'` | BIP-44 | `1...` | Legacy (P2PKH) |
| `49'` | BIP-49 | `3...` | Nested SegWit (P2SH-P2WPKH) |
| `84'` | BIP-84 | `bc1q...` | Native SegWit (P2WPKH) |
| `86'` | BIP-86 | `bc1p...` | Taproot (P2TR) |
| `48'` | BIP-48 | varies | Multisig |
| `1237'` | NIP-06 | `npub...` | Nostr |

**Same seed, different purpose, completely different addresses.** This is the single most common source of confusion — and of panic.

## Coldbox derivation engine

The P1.4/P1.5 engine runs inside the sealed cold realm. Bitcoin accepts a copied raw seed of 16–64 bytes or a depth-3 hardened account extended public key and derives the four Tier 1 single-key script types. EVM uses `m/44'/60'/account'/change/index`, with one address covering all EVM chains; EVM watch-only likewise requires a depth-3 hardened account xpub. The generic mode accepts any canonical BIP-32 path. Public Bitcoin/EVM helpers return only public metadata. The explicit generic recovery projection can return raw private material, extended private keys, and compressed WIF, but only to cold-local callers; none is part of the public protocol result and no derivation operation needs network access.

Seed derivation uses the path `m / purpose' / coin_type' / account' / change / index`, with account and purpose levels hardened. A batch defaults to 20 addresses and is capped at 1,000; the engine refuses a batch that would enter the hardened index range. Watch-only derivation accepts only a depth-3 account-level xpub/ypub/zpub/tpub/upub/vpub whose account child number is hardened, then derives non-hardened children below it. An xpub cannot prove the master fingerprint, so watch-only results expose only the account fingerprint. Every Bitcoin script family validates that the compressed public key is an actual secp256k1 point before hashing it into an address.

Taproot uses the BIP-86 key-path construction: the internal key is normalized to even-Y x-only form, the tagged `TapTweak` is applied with no script tree, and the result is encoded as Bech32m. Legacy and nested SegWit use Base58Check; native SegWit uses Bech32. EVM addresses hash the uncompressed secp256k1 public-key body with Keccak-256 and apply the ERC-55 mixed-case checksum; all-lower and all-upper input remains accepted for validation. The authoritative primitive choices remain in [crypto-choices.md](../02-security/crypto-choices.md), and the structural cold-only decisions are [ADR-0029](../05-development/adr/0029-cold-only-bitcoin-derivation-engine.md) and [ADR-0030](../05-development/adr/0030-cold-only-evm-and-arbitrary-path-derivation.md).

---

## Common paths

### Bitcoin

```
m/44'/0'/0'/0/0     legacy      1...
m/49'/0'/0'/0/0     nested      3...
m/84'/0'/0'/0/0     native      bc1q...
m/86'/0'/0'/0/0     taproot     bc1p...
m/48'/0'/0'/2'      multisig    (account level)
```

Testnet uses coin type `1'`: `m/84'/1'/0'/0/0`.

### Other chains

```
m/44'/60'/0'/0/0       Ethereum + all EVM
m/44'/2'/0'/0/0        Litecoin
m/84'/2'/0'/0/0        Litecoin native SegWit
m/44'/3'/0'/0/0        Dogecoin
m/44'/145'/0'/0/0      Bitcoin Cash
m/44'/501'/0'/0'       Solana (hardened, ed25519)
m/44'/195'/0'/0/0      Tron
m/44'/144'/0'/0/0      XRP
m/44'/118'/0'/0/0      Cosmos
m/44'/607'/0'/0/0      TON
m/44'/637'/0'/0'/0'    Aptos
m/44'/784'/0'/0'/0'    Sui
m/44'/1237'/0'/0/0     Nostr
```

Ed25519 chains use hardened derivation throughout — SLIP-0010 doesn't define non-hardened derivation for that curve.

---

## Wallet defaults

Dated and user-editable in-app, because vendor defaults change.

| Wallet | Bitcoin default |
|---|---|
| Sparrow | `m/84'/0'/0'` |
| Electrum | `m/84'/0'/0'` |
| BlueWallet | `m/84'/0'/0'` |
| Ledger Live | `m/84'/0'/0'` (legacy accounts may use 44') |
| Trezor Suite | `m/84'/0'/0'` |
| Coldcard | `m/84'/0'/0'` |
| BitBox | `m/84'/0'/0'` |
| Blue Wallet legacy | `m/44'/0'/0'` |
| Old wallets (pre-2017) | `m/44'/0'/0'` |
| Some Ethereum wallets | `m/44'/60'/0'/0` *(note: no final index level)* |

That last row is a genuine trap. A handful of Ethereum wallets treat the account level differently, producing different addresses from an otherwise identical setup.

---

## "My coins are missing"

Almost always a path mismatch. In order of likelihood:

**1. Wrong purpose.** You restored into a wallet defaulting to `84'` but the coins are on `44'`. Check all four Bitcoin purposes — Coldbox shows them side by side.

**2. Wrong account.** Funds on account 1, wallet showing account 0.

**3. Passphrase.** A BIP-39 passphrase creates a completely different wallet. No passphrase, or a different one, means a different set of addresses. This is not a path problem but presents identically.

**4. Wrong coin type.** Some forks share the seed but use a different coin type.

**5. Gap limit.** Your wallet scanned 20 addresses; your funds are at index 47. Increase the gap limit.

### Diagnosing

1. Enter your seed in Coldbox, **offline**.
2. Generate addresses across all four purposes and the first few accounts.
3. Look for an address you recognise.
4. Once found, note the path — that's your wallet's real configuration.
5. Record it in the Registry so this never happens again.

---

## Record your paths

For every wallet, record: the derivation path, the script type, whether a passphrase is used, and the master fingerprint.

A seed phrase alone is not always enough to recover. A seed plus a path is. The Registry exists substantially for this — and the inheritance letter includes it, because heirs will have no idea.

---

## Related to tax records

Your derivation path and wallet identity now matter for tax as well as recovery: cost basis is tracked **per wallet**, so "which wallet did this come from" is a reportable fact rather than bookkeeping trivia. See [us-tax-reporting.md](us-tax-reporting.md).

## Related

- [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) — HD derivation
- [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) — the path structure
- [BIP-49](https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki) · [BIP-84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) · [BIP-86](https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki)
- [SLIP-44](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) — coin types
- [SLIP-0010](https://github.com/satoshilabs/slips/blob/master/slip-0010.md) — ed25519 derivation
