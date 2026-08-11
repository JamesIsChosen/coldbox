# Data model

Entities stored in the vault. Compartment assignment is load-bearing: it determines what's available online.

`🔵 public` — decryptable while online · `🔒 secret` — never decrypted while online

---

## Vault metadata 🔵

Every newly created vault carries a non-secret `id` UUID in its authenticated public compartment. This identifies the **vault file lineage**, not any Seed/Wallet/Device record and not the computer running Coldbox. Human-readable vault names are public warm-shell filename/library metadata and are deliberately not a Cold → Warm free-form field. See [ADR-0025](../05-development/adr/0025-vault-identity-library-and-save-ux.md).

Legacy format-v1 vaults without this field remain valid and use their random header salt only as a warm-shell compatibility namespace until an explicit migration exists.

---

## Entities

### Seed 🔵 / 🔒

The `storedSecret` field lives in the secret compartment; everything else is public. This is what lets you track a wallet without storing its seed.

```
id              string
label           string
fingerprint     string     8 hex chars — the safe public identifier
wordCount       12|15|18|21|24
hasPassphrase   bool
createdAt       ISO8601
origin          dice | coinflip | cards | csprng | hardware | imported
storedSecret    🔒 { mnemonic, passphrase } | null    — opt-in, null by default
passphraseHint  string
notes           string (markdown)
tags            string[]
hidden          bool
```

### Wallet 🔵

```
id, label, seedId?, type, network, scriptType, primaryPath,
xpubs[], deviceIds[], status, notes, tags[], hidden
```

`type`: `singlesig | multisig | exchange | custodial | watch-only`
`scriptType`: `p2pkh | p2sh-p2wpkh | p2wpkh | p2tr | multisig | n/a`

A device with passphrase wallets links to **several** Wallet records, each with its own fingerprint. Tracking which passphrase gives which wallet is the thing people lose.

### Account 🔵

```
id, walletId, asset, path, xpub, label, notes
```

### Address 🔵

```
id, accountId, index, address, label, isChange, used,
balanceSnapshot { amount, asOf, source }, notes, tags[], hidden,
addressOrigin, verificationState, lastColdVerifiedAt, verifiedAgainstXpub
```

Balances are snapshots with timestamps, never presented as live truth once stale.

**Verification fields** — see [address-verification.md](address-verification.md) and [ADR-0021](../05-development/adr/0021-clipboard-address-verification.md).

`addressOrigin`: `derived | manual | imported`

`verificationState`: `unverified | cold-verified | cold-verified-stale | unverifiable`

| State | Meaning |
|---|---|
| `unverified` | Recorded but never re-derived inside the cold realm |
| `cold-verified` | Re-derived from the seed, offline, with the vault unlocked |
| `cold-verified-stale` | Was verified, but `verifiedAgainstXpub` no longer matches the account's current xpub |
| `unverifiable` | **Terminal.** No seed exists in this vault for it — a watch-only address recorded from an xpub or entered directly |

`unverifiable` is an honest permanent state, not a failure. It is more useful than leaving a watch-only address indistinguishable from one nobody has got round to checking.

`verifiedAgainstXpub` stores the xpub the verification was performed against, so staleness is *detected* rather than assumed. Without it, an account whose xpub changed would keep displaying a verification that no longer means anything.

**Why this is in the model rather than computed.** A verification is an event that happened at a time, not a property derivable from current state — and the whole point is to distinguish "checked" from "not yet checked."

### Device 🔵

```
id, vendor, model, serial?, firmware, firmwareDate,
purchasedFrom, purchasedAt, tamperCheckPassed, tamperCheckNotes,
pinSetAt, pinChangedAt, passphraseUsed, seedFingerprints[],
location, status, notes, hidden
```

`status`: `in-use | retired | lost | destroyed | rma`

### Transaction 🔵

```
id, ts, type, asset, quantity, pricePerUnit, quoteCurrency,
priceSource, fee, feeAsset, venue, walletId?, addressId?, txid?,
lotMethodOverride?, notes, tags[], hidden
```

`type`: `buy | sell | swap | transfer-in | transfer-out | fee | income | staking | airdrop | gift-in | gift-out | lost`

`priceSource`: `manual | fetched` — so you can always see which figures you entered and which came from an API.

**`quoteCurrency` stores the currency actually transacted in, never a pre-converted figure.** Conversion happens at display time, so changing your reporting currency never rewrites history.

**Transfers between your own wallets are not disposals.** The model treats them as movement, preserving original acquisition date and cost basis. Getting this wrong silently corrupts every gain figure downstream, and it's the most common bug in portfolio trackers.

### Lot 🔵 — derived

```
id, walletId, asset, acquisitionTs, qtyOriginal, qtyRemaining,
costBasisPerUnit, quoteCurrency, sourceTxId, acquisitionType,
carriedFromLotId?          set when a transfer moved this lot between wallets
```

Recomputed from transactions; never authored directly.

**`walletId` is part of the pool key.** Lot pools are `(walletId, asset)`, never asset alone. [Rev. Proc. 2024-28](https://www.irs.gov/pub/irs-drop/rp-24-28.pdf) eliminated universal-wallet basis pooling effective 1 January 2025 — a global pool per asset cannot produce correct US figures. See [us-tax-reporting.md](../04-reference/us-tax-reporting.md).

A transfer between your own wallets **moves lots**, preserving `acquisitionTs` and `costBasisPerUnit` and setting `carriedFromLotId`. It does not create a disposal and does not reset the holding period.

### Disposal 🔵 — derived

```
id, disposalTs, lotId, walletId, asset, qtyDisposed,
proceeds, quoteCurrency, feeTreatment, costBasis, gainLoss,
term (short|long), selectionMethod, selectionBasis, form8949Box,
sourceTxId, brokerFormRef?
```

One record per lot consumed, which is what Form 8949 requires — a sale drawing on three lots produces three disposals, not one.

`selectionMethod` and `selectionBasis` are the audit trail: when anything other than FIFO is used, they record which lots were identified and why. That trail is the substantiation for specific identification, and the documentation burden sits with the taxpayer regardless of broker relief.

`form8949Box` is one of `G|H|I` (short) or `J|K|L` (long), determined by whether a 1099-DA was received and whether it reported basis.

### BasisAllocation 🔵

```
id, effectiveDate, walletId, asset, quantity, allocatedBasis, note
```

Records a Rev. Proc. 2024-28 safe harbor allocation. **Irrevocable once filed**, so these are write-once and flagged in the UI as such.

### BackupRecord 🔵 / 🔒

```
id, subjectId, method, shareLabel, threshold, groupConfig,
location, custodian, createdAt, lastVerifiedAt, verifyEveryDays,
shareMaterial 🔒, notes
```

`method`: `slip39 | codex32 | seedxor | shamir39 | sss | seedqr | metal | paper | encrypted-file`

Locations and schedules are public so the Backup Health dashboard works online. Actual share material is secret and, as with seeds, optional.

### Contact 🔵

```
id, name, role, reachInstructions, notes
```

`role`: `heir | custodian | attorney | co-signer | executor`

### Note 🔵 / 🔒

```
id, title, body (markdown), visibility, linkedIds[], tags[], hidden
```

`visibility` determines the compartment. `public` notes are safe for the warm
public projection; `secret` notes are decrypted and searched only in the cold
realm. "This account receives Coinbase withdrawals" stays readable online;
"the passphrase hint is the street we grew up on" does not.

### PriceSnapshot 🔵

```
asset, median, sources[{ name, price, ts }], spread, ts, quoteCurrency
```

Cached so Cold Mode shows last-known values with visible age.

### AuditEvent 🔵

```
ts, action, entityId, detail
```

Append-only, vault-local. Never leaves the vault.

---

## Public protocol collection identifiers

The P0.7 `publicData.request` message refers to these public projections by stable collection identifier. The identifier list is explicit so a new entity cannot be silently omitted from cross-realm reads.

| Identifier | Entity |
|---|---|
| `seeds` | Seed public metadata (never `storedSecret`) |
| `wallets` | Wallet |
| `accounts` | Account |
| `addresses` | Address |
| `notes` | Note public records |
| `devices` | Device |
| `transactions` | Transaction |
| `lots` | Lot |
| `disposals` | Disposal |
| `basisAllocations` | BasisAllocation |
| `prices` | PriceSnapshot |
| `backups` | BackupRecord public location/schedule fields |
| `contacts` | Contact |
| `auditLog` | AuditEvent |

UI settings are not a vault entity and are not a public-compartment collection. They are therefore not accepted in `publicData.request`.

---

## Relationships

```
Seed ──1:N── Wallet ──1:N── Account ──1:N── Address
 │             │                              │
 │             └──N:M── Device                │
 │                                            │
 └──1:N── BackupRecord              Transaction ──N:1── Lot

Note ──N:M── (any entity)
Tag  ──N:M── (any entity)
Contact ──N:M── BackupRecord
```

---

## Design rules

**Fingerprint, not seed, as the identifier.** Every reference to a wallet uses its 8-character master fingerprint. Nothing in the public compartment references secret material.

**Hidden excludes from totals.** A `hidden` entity is absent from views, search, exports, *and portfolio totals* — so the visible view stays internally consistent rather than showing a total that doesn't match its rows.

**Soft delete.** Deletions are tombstoned rather than removed, so a mistaken delete is recoverable until you compact the vault.

**IDs are random, not sequential.** Sequential IDs leak creation order and count.

**Timestamps are ISO 8601 UTC.** Local time is a display concern.

---

## Interoperability

| Format | Direction | Scope |
|---|---|---|
| **BIP-329** | Import + export | Transaction, address, pubkey, input, output, xpub labels |
| CSV | Import + export | Transactions, addresses, realized gains |
| JSON | Export | Full public compartment |
| `sha256sum` manifests | Import + export | File hasher |
| Output descriptors | Import + export | Wallet definitions |

BIP-329 matters disproportionately. Labels are the one piece of wallet data that is pure human effort and impossible to regenerate. Supporting the standard means the work you do here moves to Sparrow, Nunchuk, BitBoxApp, or BTCPay — and survives this project being abandoned.

Coldbox's richer note fields round-trip through the standard's `label` field with graceful degradation; full fidelity is preserved in native `.cbx` export.

---

## Migration

The payload carries a `schema` integer. Migrations run on open, in sequence, and the app takes a backup copy of the vault file before applying any. A migration that fails leaves the original untouched.

Any schema change requires a test asserting that a vault written by the previous version still opens.
