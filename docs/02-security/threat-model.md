# Threat model

What this defends against, what it doesn't, and why the boundary sits where it does.

An honest threat model is more useful than a comprehensive-sounding one. Everything in "does not defend" is there because it's true, not because it was overlooked.

---

## Assets

| Asset | Impact if lost | Impact if disclosed |
|---|---|---|
| Seed phrases | Total, irreversible loss of funds | Total, irreversible loss of funds |
| BIP-39 passphrases | Loss of that wallet | Loss of that wallet |
| Extended private keys | Loss of that account | Loss of that account |
| Share material | Depends on threshold | Threshold shares = full compromise |
| Vault passphrase | Loss of all records | Full record disclosure |
| xpubs | Minor | **Permanent loss of transaction privacy** |
| Addresses and labels | Minor | Deanonymization, targeting |
| Portfolio data | Minor | Reveals net worth — a physical-security risk |
| Backup locations | Recovery difficulty | **Physical theft target** |

Two often-underrated entries: an xpub discloses your entire transaction history forever, and a list of backup locations is a burglary map. Both live in the public compartment, which is why the compartment is encrypted rather than plaintext.

---

## Adversaries

| Adversary | Capability | Priority |
|---|---|---|
| Opportunistic thief | Steals the USB stick or laptop | High |
| Remote attacker | Compromised website, malicious download | High |
| Supply chain attacker | Tampers with the app or a dependency | High |
| Address-swap malware | Alters displayed addresses | High — **specifically countered** |
| Network observer | Sees API queries | Medium |
| Curious insider | Household or office access | Medium |
| Targeted attacker | Malware on your specific machine | Low — largely undefendable |
| Coercion | Physical force | Out of scope |
| Nation-state | Full-spectrum | Out of scope |

---

## Defended

### Secret exfiltration — the primary threat

The cold realm has `connect-src 'none'`, an opaque origin, and a whitelist message schema with no secret-carrying type. Network primitives are absent, not disabled. Even a fully compromised cold realm cannot transmit.

*Residual:* a compromised **build** could ship a cold realm without these properties. Countered by reproducible builds and hash verification — which is why [verification](verification.md) is not optional advice.

### Supply chain

Zero runtime dependencies. All libraries vendored, pinned, and hashed, with `verify-vendor` confirming byte equality against upstream. Nothing is fetched at build or run time. Builds are reproducible and CI-attested.

*Residual:* an upstream library could be backdoored before we vendor it. Mitigated by preferring audited, dependency-free `@noble`/`@scure` libraries and by pinning specific reviewed versions.

### Vault theft

Argon2id (64 MiB, t=3) plus AES-256-GCM. Indistinguishable from random after the header; padded so size reveals nothing; KDF parameters in AAD so they can't be downgraded.

P0.11 implements the v1 header as AAD, wraps the random DEK in a record list, derives `cbx/public/v1` and `cbx/secret/v1` with distinct HKDF-SHA-512 info strings, and keeps the vault API inside the cold realm. Vault entry points fail closed until the cold CSP canary, runtime network guard, required randomness, and crypto bootstrap have established the guarded state; mode detection consumes the shared airgap snapshot. Wrong passphrases and damaged ciphertext return the same authentication error, while the public 64 MiB implementation limit is reported distinctly.

*Residual:* a weak passphrase. Argon2id buys time proportional to passphrase entropy. Six Diceware words is beyond reach; a dictionary word isn't.

### Address-swap malware

The attack: malware alters the receive address displayed by your wallet software. You send to the attacker.

The defence: Coldbox derives addresses independently from your xpub, with no involvement from the software that might be lying. Three-way agreement between wallet software, device screen, and Coldbox catches it.

This is the single highest-value function in the tool. See the [verification guide](../03-guides/verify-a-hardware-wallet.md).

### Browser text exfiltration

Browser spellcheck can transmit typed text to vendor servers. Every secret-bearing field carries `spellcheck="off" autocomplete="off" autocorrect="off" autocapitalize="off"`. Secrets never enter the URL, page title, `localStorage`, or session-restore data.

### Shoulder surfing and casual access

Masked by default, hold-to-reveal, 30-second auto-remask, privacy blur for monetary figures, `Esc Esc` panic hide, idle auto-lock, optional lock on tab-hide.

### Clipboard scraping

Copy is opt-in per field with a visible 30-second auto-clear countdown, and a warning that clipboard managers may retain content regardless.

### Backup failure

Backups are the most common cause of loss, and the failures are boring: never tested, all shares in one drawer, threshold unreachable because two shares were lost, nobody else knows the vault exists.

Countered by a mandatory verify-your-shares step before a backup can be marked complete, co-location warnings, verification scheduling, survivability analysis, and the inheritance letter.

### Vault rollback

Monotonic save counter, generational filenames, prominent warning when opening an older vault than the highest seen. Advisory, not cryptographic — see [vault-format.md](../01-spec/vault-format.md#rollback-detection) for exactly what it does and does not catch.

### Address–IP correlation

Balance lookups are opt-in per address, never automatic, default off, with self-hosted node support and Tor guidance. xpub scanning derives addresses locally and sends only the resulting addresses — the xpub itself never leaves the device.

---

## Not defended

### Compromised operating system

A keylogger reads your passphrase as you type it. Malware with memory access reads decrypted secrets. Screen capture reads anything displayed.

**No in-browser tool can defend against this.** Claiming otherwise would be dishonest and dangerous, since it would change user behaviour based on a guarantee that doesn't exist.

*Mitigation is procedural:* generate keys on a machine that has never been online, or boot Tails from USB.

### Malicious browser extensions

Extensions can read page content and inject scripts. They operate above the layer where CSP protects us.

*Mitigation:* use a clean browser profile with no extensions, or an amnesic OS.

### JavaScript memory forensics

JS strings are immutable and cannot be wiped. The garbage collector may copy buffers anywhere. The OS may page memory to swap on disk.

We use `Uint8Array` and zero-fill where the code path allows, and drop the DEK on lock. **This is partial mitigation, not a solution**, and the app says so rather than implying secrets are scrubbed.

*Mitigation:* an amnesic OS with encrypted swap, or no swap.

### Physical coercion

A duress compartment was considered and **rejected** — see [ADR-0005](../05-development/adr/0005-no-duress-compartment.md). Its deniability is weak against anyone who knows the file format, and it doubles the ways to lose data.

### Hostile display

Screen recording, cameras, compromised GPU drivers. Masking helps against a person; nothing helps against a recorder.

### Which addresses you query

Tor hides your IP but the query content still reveals interest in those addresses. Only a self-hosted node fully solves it.

### Weak passphrases

The strength meter is advisory. A memorable-but-weak passphrase defeats good cryptography.

### Malicious build

An attacker who compromises the release pipeline could ship anything. This is why verification exists — and why the strongest check, reproducing the build, is documented for non-experts.

---

## Design commitments

Breaking one of these is a security regression, not a feature change:

1. Secrets never enter the warm shell.
2. The cold realm's CSP always includes `connect-src 'none'`.
3. If the cold realm cannot be established, the app **fails closed**.
4. No telemetry. The CSP allowlist in source is the complete set of reachable hosts.
5. Builds are reproducible and the published hash is independently verifiable.

**Fail closed** is worth dwelling on. A tool that silently degrades from "cannot leak" to "probably won't leak" is more dangerous than one that stops, because the user keeps behaving as though the guarantee holds.

---

## Recommended posture

| Activity | Environment |
|---|---|
| Generating keys for real funds | Airgapped machine or Tails, never online again |
| Verifying an address | Any machine — that's the point |
| Portfolio review | Any machine. Secrets seal automatically |
| Backup engineering | Airgapped |
| Recovery from a damaged seed | Airgapped |

Keep the app and vault on the same removable media. Keep a second copy elsewhere. Treat the vault as a supplement to metal backups, never a replacement.
