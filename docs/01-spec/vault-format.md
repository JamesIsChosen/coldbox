# Vault format — `.cbx`

Byte-level specification. Format version 1.

Design goals: indistinguishable from random after the header, no information leaked by file size, KDF parameters that can't be downgraded by tampering, multiple unlock methods without duplicating data, and a public compartment that can be opened online while the secret compartment stays sealed.

---

## Layout

```
Offset  Size    Field
------  ------  ---------------------------------------------------
0       8       Magic "CBXVAULT" (ASCII)
8       2       Format version           uint16 BE
10      1       KDF id                   1=Argon2id, 2=PBKDF2-HMAC-SHA512
11      4       KDF memory KiB           uint32 BE  (0 for PBKDF2)
15      4       KDF iterations / time    uint32 BE
19      1       KDF parallelism          uint8
20      1       Cipher id                1=AES-256-GCM, 2=XChaCha20-Poly1305
21      32      KDF salt                 CSPRNG
53      4       Wrapped-DEK block length uint32 BE
57      4       Public compartment len   uint32 BE (ciphertext + tag)
61      4       Secret compartment len   uint32 BE (ciphertext + tag)
------  ------  ----- header ends at 65; AAD = bytes 0..64 ---------
65      W       Wrapped-DEK block
65+W    N       Nonce, public compartment    (12 for GCM, 24 for XChaCha)
...     L1      Public ciphertext + 16-byte tag
...     N       Nonce, secret compartment
...     L2      Secret ciphertext + 16-byte tag
```

`L2` may be zero — a vault with no secrets is valid and is the default state.

### Why explicit lengths

Without them the compartments can't be parsed apart. They're in the AAD so they can't be manipulated to make a parser misread compartment boundaries.

### AAD

Bytes 0–64 authenticate both compartments. Consequences: KDF parameters cannot be downgraded (an attacker can't rewrite `m=64MiB` to `m=1KiB` to make cracking cheap), the cipher can't be swapped, and compartment lengths can't be altered. Any edit to the header causes both compartments to fail authentication.

---

## Key hierarchy

```
passphrase ─┐
keyfile ────┼─→ Argon2id ─→ KEK ─→ unwraps ─→ DEK (256-bit, random)
            │                                  │
recovery ───┘                                  ├─ HKDF-SHA-512 "cbx/public/v1" → public subkey
shares                                         └─ HKDF-SHA-512 "cbx/secret/v1" → secret subkey
```

The DEK is generated once at vault creation and never changes. Changing your passphrase rewraps 32 bytes rather than re-encrypting everything.

**Compartment separation is cryptographic, not merely procedural.** Online, the secret subkey is never derived. There is no code path that produces it while a network connection is detected.

### Wrapped-DEK block

A list of records, present from format version 1 even when only one record exists. Reserving the structure costs a few bytes and means keyfile and recovery-share unlock need no format bump or migration later.

```
Per record:
  1    Method id      1=passphrase, 2=passphrase+keyfile, 3=recovery share set
  1    Flags
  2    Record length  uint16 BE
  N    Method-specific data
  12   Nonce
  48   Wrapped DEK (32 bytes + 16-byte tag), AES-256-GCM under the KEK
```

**Method 1** — KEK = Argon2id(passphrase, salt, params).

**Method 2** — KEK = Argon2id(passphrase ‖ SHA-512(keyfile), salt, params). Record data holds a keyfile hint (filename only, never contents). One altered byte in the keyfile makes the vault permanently unopenable — stated at setup, in bold.

A vault created with a keyfile carries a method-2 record in place of a method-1 record, not alongside one — the keyfile is required, not an alternative unlock path. The v1 implementation refuses a keyfile larger than **64 MiB**, the same implementation ceiling as the whole vault file below, and refuses an empty (zero-byte) keyfile outright since it would add no protection while still carrying the "permanent loss" warning. The keyfile hint is capped at 255 UTF-8 bytes and silently truncated past that, since it is pure display metadata with no cryptographic role. Rationale for these four implementation choices, none of which are wire-format fields: [ADR-0014](../05-development/adr/0014-keyfile-unlock-implementation-limits.md).

**Method 3** — the DEK is split via SLIP-39. Record data holds the group configuration and share metadata, never share material. Reconstructing a threshold yields the DEK directly. This is the inheritance path. *Phase 2.*

---

## Compartments

### Public — openable online

Vault metadata (`id` UUID), wallets, accounts, addresses, labels, tags, public notes, devices, transactions, cost-basis lots, price snapshots, backup record *locations and metadata*, settings, audit log.

`id` is a random non-secret UUID created once with every new vault. It is the stable vault identity across devices and filenames and is **immutable for the life of that vault**: saving or re-saving creates a new generation of the same Vault ID, never a new Vault ID. A different UUID means a different vault created through the explicit new-vault flow. It is **not** a device fingerprint and is not derived from hardware/browser characteristics. The human-readable vault name intentionally lives in warm-shell filename/library metadata rather than this compartment because Cold → Warm free-form prose is excluded by the message-schema security invariant; see [ADR-0025](../05-development/adr/0025-vault-identity-library-and-save-ux.md).

### Secret — never decrypted while online

Seed phrases (`Seed.storedSecret`), private keys, BIP-39 passphrases, SLIP-39/codex32/Seed XOR share material, secret notes.

Both serialize to JSON, then pad, then encrypt.

---

## Padding

Each compartment is padded to the next **64 KiB** boundary with random bytes before encryption.

```
padded_length = ceil((json_length + 4) / 65536) * 65536
```

First 4 bytes of the plaintext are the real JSON length (uint32 BE); the remainder is random.

Without padding, file size reveals roughly how many wallets and transactions you have. A 200 KB vault and a 2 MB vault tell an observer different things.

**Compression is deliberately not used.** Compressing before encrypting leaks plaintext information through ciphertext length — the general failure behind CRIME and BREACH. Padding costs disk space; compression costs confidentiality.

### Implementation size limit

The v1 Coldbox implementation refuses any complete vault file larger than **64 MiB (67,108,864 bytes)**. It also refuses a compartment whose padded plaintext alone would exceed that bound. This is an implementation safety limit, not an authentication result and not a new wire-format field.

An over-size refusal is reported distinctly as **`Vault exceeds the 64 MiB size limit.`** File size is already observable, so separating this condition leaks no secret and prevents a valid-but-too-large file from being mislabeled as a wrong passphrase or damaged vault.

---

## Nonces

A fresh CSPRNG nonce for every compartment on every save.

**In Warm Mode the secret compartment is copied byte-for-byte** — ciphertext, nonce, and tag together — so no nonce is ever reused against the same key with different plaintext. This is what allows editing your portfolio online without ever decrypting or re-encrypting your seeds.

---

## KDF profiles

| Profile | Memory | Iterations | Parallelism | For |
|---|---|---|---|---|
| Fast | 19 MiB | 2 | 1 | Old phones. OWASP floor |
| **Standard** | **64 MiB** | **3** | **1** | **Default.** OWASP higher-security |
| Paranoid | 256 MiB | 4 | 1 | Desktop only — may fail to allocate on iOS |
| Fallback | PBKDF2-HMAC-SHA512 | 1,000,000 | — | Only where Argon2 WASM won't load |

Chosen at creation, stored in the header, changeable later (rewraps the DEK; compartments untouched).

**Benchmark before committing.** The KDF calculator times each profile on the current device. A vault you can't open on your phone is a problem worth discovering at creation.

---

## Save and load

### Save paths

`.cbx` is the only durable vault format.

| Path | Where | Mechanism |
|---|---|---|
| Canonical File System Access save | Chrome/Edge desktop where available | First save chooses `<vault-name>--<id8>.cbx`; later dirty saves reuse the same retained file handle and verify read-back |
| Canonical blob-download replacement | Desktop, most Android, other running contexts with downloads | Starts the same canonical filename, but browser-controlled storage cannot be read back/overwritten reliably, so status is **Saved · unverified** |
| Encrypted text handoff (advanced) | Supported running Coldbox contexts | Base64 / optional `navigator.share`; transport convenience only, not a canonical save |

Animated QR is **not** a save path. It is an ephemeral live device-to-device transfer of already-encrypted `.cbx` bytes; no QR backup/download artifact is emitted. See [ADR-0026](../05-development/adr/0026-canonical-vault-save-and-live-transfer.md).

### Vault names, IDs, and canonical filenames

New Coldbox filenames are `<vault-name>--<id8>.cbx`, for example `Bitcoin-Savings--7f3a91c2.cbx`.

- `vault-name` is a user-chosen **public** display name sanitized by the warm shell. Never put secrets in it.
- `id8` is the first eight hexadecimal characters of the canonical Vault UUID and is only a compact hint; the full authenticated UUID is authoritative after unlock.
- No current filename contains a user-visible generation. One Vault ID has one canonical name/file destination within the app-known scope.
- A different Vault ID cannot claim a name already known in the current session, best-effort browser-profile registry, or currently granted Vault Library. Coldbox cannot guarantee disk-wide uniqueness because it cannot silently enumerate the filesystem.

### Rollback detection

Rollback detection remains advisory warm-shell bookkeeping. Historical generational filenames (`<name>--<id8>--0047.cbx` and `coldbox-vault-0047.cbx`) retain their numeric high-water comparison. Current canonical filenames contain no counter; for them, a browser profile that has previously recorded a newer trustworthy filesystem timestamp for the same authenticated Vault ID can show an **older-copy advisory**. Missing local history, a renamed/foreign file, or an unavailable/untrustworthy timestamp degrades silently. This is not cryptographic rollback protection.

### Legacy v1 vaults and filenames

Every existing format-v1 `.cbx` remains openable without byte-format migration. A pre-P0.19 vault may have no public-compartment `id` and may be named `coldbox-vault-0047.cbx`; P0.19-era files may also have `<name>--<id8>--0047.cbx`. Historical counters remain readable only for compatibility/advisory rollback checks. A future save uses the current canonical `<name>--<id8>.cbx` naming. For warm-shell bookkeeping only, a vault without authenticated `id` uses the already-public random 32-byte KDF salt in header bytes 21–52 as a stable legacy namespace.

### Verify-after-save — mandatory

Where File System Access can read its own output back, Coldbox requires the bytes read from disk to be identical before marking **Saved · verified** and clearing the dirty/lock-warning flag. A canonical browser download can be real durable output but cannot be read back by the page, so it becomes **Saved · unverified** and keeps the normal-lock confirmation active. Advanced Base64 handoff and live animated QR transfer do **not** count as saves at all. Every path preserves the authenticated Vault ID.

### Live device-to-device vault transfer

`CBX-VT/1` is a transport envelope around encrypted `.cbx` bytes, not a vault format. The sending vault must already be unlocked from durable `.cbx` storage or have a verified canonical save; live QR cannot substitute for saving the sender. Warm obtains a fresh encrypted representation and cycles it as QR frames under a random per-session Transfer ID. The receiver rejects mixed transfer IDs, tolerates duplicates/out-of-order observations, reconstructs the encrypted payload, verifies the manifest SHA-256, and only then feeds the bytes to the ordinary locked `vault.open` flow. The normal passphrase is still required. The announced Vault ID is rechecked against the authenticated public Vault ID after unlock. No live-transfer QR artifact is downloadable or persisted by Coldbox.

### Corruption

A failed AEAD tag means **"wrong passphrase *or* damaged file."** These are cryptographically indistinguishable and the app says exactly that. Claiming to know which would be a lie.

---

## Threat properties

| Property | How |
|---|---|
| Indistinguishable from random after header | AEAD ciphertext + random padding |
| Size reveals nothing | 64 KiB padding buckets |
| KDF can't be downgraded | Parameters in AAD |
| Compartments can't be confused | Lengths in AAD; separate HKDF subkeys |
| Tampering detected | AEAD tags on both compartments |
| Rollback detected | Historical counter / current timestamp history, advisory only |
| Passphrase change is cheap | Rewrap 32 bytes |
| Secrets sealed online | Secret subkey never derived |

### Not defended

**Traffic analysis of save frequency** — if your vault is in a sync service, modification times leak activity patterns. Use local storage.

**Endpoint compromise** — an unlocked vault on a compromised machine is readable. Nothing in the format helps.

**Weak passphrases** — Argon2id at 64 MiB makes guessing expensive, not impossible. Six Diceware words (~77 bits) is comfortably beyond reach; a dictionary word is not.

---

## Compatibility

Format version 1 is the baseline. Version bumps only for changes that break parsing.

An older reader encountering a newer version must refuse to open rather than guess — misparsing an encrypted file could silently destroy data on the next save.

Any change to this format requires a test asserting that a vault written by the previous version still opens.
