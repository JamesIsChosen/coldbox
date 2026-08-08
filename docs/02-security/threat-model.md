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

The defence has two halves, covering two different moments.

**Before the copy — independent derivation.** Coldbox derives addresses from your xpub with no involvement from the software that might be lying. Three-way agreement between wallet software, device screen, and Coldbox catches a display that has been altered. See the [verification guide](../03-guides/verify-a-hardware-wallet.md).

**After the copy — clipboard round-trip.** The first half proves the *displayed* address was right. It says nothing about what arrived in the destination field, and a clipboard hijacker rewrites the address in transit — every display correct, funds still gone. So Coldbox compares, character-exact, what you paste back out of the destination, and reports the index of the first divergent character. See [address-verification.md](../01-spec/address-verification.md) and the [address verification guide](../03-guides/verify-an-address.md).

Two properties of that second half are what make it work, and both are easy to get wrong:

- **Full-string comparison, never first-four/last-four.** Address poisoning exists specifically to defeat end-matching. A truncated comparison counters an attack that is no longer the one being used.
- **A checksum pass is not a verification.** A swapped address is a *valid* address — EIP-55, bech32, and base58check all validate it perfectly. Checksums catch typing mistakes, not substitution.

*Residual:* a registry entry that was already wrong when recorded verifies cleanly forever. Countered by tracking per-address verification state, so an address that has never been re-derived inside the cold realm says so on every verdict rather than borrowing the credibility of one that has.

This remains the single highest-value function in the tool.

### Clipboard hijacking, detected rather than inferred

Everything above reports the *absence* of evidence — the strings matched, so probably nothing is wrong. The optional clipboard volatility canary is the one affirmative signal available: it re-reads the clipboard after a delay with no user action, and a change is positive detection of an active hijacker.

Opt-in, off by default, because it needs persistent clipboard-read permission. If permission is denied the paste comparison still works and the app says the canary is unavailable — it never presents the weaker check's result as the stronger one's.

*Residual:* legitimate clipboard managers and sync tools rewrite clipboard contents, so false positives are expected and the alarm names benign causes first.

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

**Wallet extensions are the sharpest case, and worth stating explicitly.** Calling `provider.request(...)` does not make a network request from the page — it messages the extension, which makes the request from its own context. **Nothing appears in `connect-src`, and the CSP canary does not fire.** An injected provider is an egress channel this project's central mechanism cannot constrain at all.

**Coldbox does not use one.** A 2026-08 proposal to integrate wallet extensions was rejected on exactly this basis — [ADR-0020](../05-development/adr/0020-injected-providers-rejected-and-neutered.md).

What that investigation did produce is a fix for a hole that exists regardless: extensions are **not** reliably excluded from sandboxed `srcdoc` frames. That is a browser implementation detail, not a guarantee. The cold realm therefore treats provider presence inside itself as an **isolation failure** — `window.ethereum` and the `eip6963:announceProvider` event neutered alongside the five network primitives ([P0.21](../05-development/ROADMAP.md)), entering full lockdown if observed.

Note the asymmetry: this guard is *more* important than the ones on the five network primitives, not less, because those sit behind a CSP that already blocks them, and this one has no CSP in front of it.

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
6. **Coldbox builds, signs, and broadcasts nothing.** No code path constructs a transaction, produces a signature, or transmits one. See [SPEC §1.3](../01-spec/SPEC.md) and [ADR-0019](../05-development/adr/0019-no-transaction-workbench.md).

**On commitment 4 and wallet extensions.** A 2026-08 proposal to use an injected wallet provider would have made commitment 4 false as written, because provider calls are not subject to page CSP — see below and [ADR-0020](../05-development/adr/0020-injected-providers-rejected-and-neutered.md). **The feature was rejected rather than the commitment amended**, so commitment 4 stands unqualified. That was the deciding consideration: these commitments are valuable because they are checkable by reading the source, and a carve-out is a cost paid by every future reader, not only by users of the feature.

Commitment 6 restates in security terms what [SPEC §1.3](../01-spec/SPEC.md) states as a product non-goal, so that a regression is judged here as well as there.

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
