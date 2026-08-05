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

**Method 3** — the DEK is split via SLIP-39. Record data holds the group configuration and share metadata, never share material. Reconstructing a threshold yields the DEK directly. This is the inheritance path. *Phase 2.*

---

## Compartments

### Public — openable online

Wallets, accounts, addresses, labels, tags, public notes, devices, transactions, cost-basis lots, price snapshots, backup record *locations and metadata*, settings, audit log.

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

| Path | Where | Mechanism |
|---|---|---|
| File System Access | Chrome/Edge desktop | `showSaveFilePicker()` — overwrite in place |
| Blob download | Desktop, most Android | `<a download>` + `createObjectURL` |
| Manual export | Any supported running Coldbox browser context | Base64 textarea, `navigator.share`, multi-part QR; iOS Safari-from-Files is not currently claimed (see [ADR-0010](../05-development/adr/0010-ios-local-html-execution.md)) |

Detected at boot. Manual export is a first-class flow with chunk counts and reassembly instructions, not a fallback, whenever Coldbox reaches a supported execution context. Quick Look is not an execution context.

### Generational filenames

`my-vault-0047.cbx`, where 0047 is the save counter. You accumulate history rather than clobbering. Keep at least the last three.

### Rollback detection

Highest save counter seen is remembered in `localStorage` (non-secret, degrades silently if unavailable). Opening an older vault shows a prominent warning with both dates and counters.

### Verify-after-save — mandatory

After writing, the app re-reads the file and confirms it decrypts and matches before clearing the unsaved-changes flag. An unverified save is not a save.

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
| Rollback detected | Save counter, advisory |
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
