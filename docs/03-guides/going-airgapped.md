# Going airgapped

Setting up a machine that has never been and will never be online.

---

## When it's worth it

| Activity | Airgap needed? |
|---|---|
| Generating a seed for real funds | **Yes** |
| Recovering a damaged seed | **Yes** |
| Creating or reconstructing backup shares | **Yes** |
| Verifying a receive address | No |
| Checking a fingerprint | No |
| Portfolio review | No |

::: plain
The tools work fine online — Coldbox's own sealed realm can't reach the network regardless of what's around it. A physical airgap defends against a different, bigger threat: your whole computer already being compromised. If something is logging your keystrokes, it reads your seed as you type it no matter how good the app is.
:::
::: working
Coldbox's cold realm already can't reach a network, but that's a browser-level guarantee — it says nothing about the operating system underneath it. A genuinely airgapped machine defends against OS-level compromise (keyloggers, screen scrapers) that no in-page protection can address.
:::
::: technical
See "Airgapped" and "Cold realm / warm shell" in the [glossary](../00-overview/glossary.md): the cold realm's `connect-src 'none'` CSP and runtime network-primitive neutering are a software boundary inside one process; they cannot detect or prevent OS-level input capture, which happens below the browser entirely.
:::

---

## Option 1 — Tails (recommended)

An amnesic operating system that runs from USB and forgets everything on shutdown.

**Why it fits:** nothing persists, so nothing leaks later. Network is off by default. It's free, and it turns any laptop into a clean machine without permanently dedicating hardware.

### Setup

1. Download Tails from [tails.net](https://tails.net) on your normal machine.
2. **Verify the download** — Tails provides signatures and instructions. Skipping this defeats the purpose.
3. Write to a USB stick with their installer.
4. Copy `coldbox.html` and its `.sha256` to a **second** USB stick.
5. Boot the target machine from the Tails USB.
6. **Do not connect to any network.** Tails asks; decline.
7. Insert the second stick, verify the hash from a terminal, and open the file in Tor Browser.

### Notes

- Tor Browser is the browser; it handles `file://` fine
- Everything is forgotten at shutdown — save your vault to the USB stick before powering down
- Persistent storage exists but reintroduces the thing you're avoiding. Prefer saving deliberately to a stick you control

---

## Option 2 — A dedicated offline machine

An old laptop that never touches a network again.

### Setup

1. Choose a machine you'll never need for anything else.
2. **Physically remove the Wi-Fi card and Bluetooth module** if you can. Software-disabled radios can be re-enabled; absent hardware cannot.
3. Install an OS from verified media.
4. Never connect Ethernet. Consider filling the port with epoxy — genuinely done, and effective.
5. Transfer Coldbox by USB, and verify the hash on the offline machine.

**Advantages:** persistent, always ready, can store your vault.
**Disadvantages:** the OS never gets security updates, so an already-compromised machine stays compromised. Only meaningful if you're confident it started clean.

---

## Option 3 — A phone in airplane mode

Better than nothing, considerably worse than the above.

Modern phones are hard to verify and hard to make truly offline — a "disabled" radio is a software claim. Cellular basebands are notoriously opaque.

Adequate for reading a backup or checking a fingerprint. Not adequate for generating a seed that will hold significant value.

---

## Transferring data across the gap

| Method | Safe for |
|---|---|
| **QR codes** | Anything, including seeds. Nothing crosses but photons |
| USB stick | Files. Some malware risk in both directions |
| Typing manually | Small values. Slow but auditable |
| microSD | Same as USB |

**QR is the cleanest.** No filesystem, no autorun, no firmware. Coldbox generates and reads QR for addresses, xpubs, and SeedQR, plus BC-UR animated QR for larger payloads.

**Rule:** public data may cross outward freely. Secrets should never cross toward a networked machine — that's what makes it a gap rather than a delay.

---

## The workflow in practice

**Setting up a wallet:**

1. Offline machine: generate entropy, generate seed, write it down.
2. Offline machine: derive the xpub and first addresses.
3. Cross the gap **outward only**: xpub and addresses via QR.
4. Online machine: enter the xpub for watch-only monitoring.
5. Offline machine: create backup shares, verify, record in the vault.
6. Save the vault to USB.

The seed never exists on a networked machine. The xpub does, which is fine — it can't spend, though it does reveal your transaction history, so treat it as private.

**Ongoing:**

- Portfolio and balance checks: online machine, public compartment only.
- Address verification: online machine — the derivation is done in the cold realm.
- Anything touching a seed: boot the offline machine.

---

## Verifying your setup

Once running, confirm:

1. Airgap banner is **green**.
2. The capability panel shows the cold realm instantiated.
3. Vault details show **Argon2id**, not PBKDF2 — a PBKDF2 fallback means the WASM module didn't load.
4. You verified the file hash **on the offline machine**, not just before transferring.

That last point catches USB-based tampering, which is the specific threat an airgapped setup invites.

---

## What an airgap doesn't fix

- **A machine that was already compromised** before you disconnected it
- **Hardware implants** — out of scope for almost everyone
- **A compromised copy of Coldbox** — hence hash verification on the offline machine
- **Someone watching you** — cameras, over the shoulder, screen recording via a nearby device
- **Your own mistakes** — a wrong path recorded, an untested backup

The last one remains the most likely way to lose money, airgap or not.

---

## Related

- [Verification](../02-security/verification.md)
- [Threat model](../02-security/threat-model.md)
- [First wallet](first-wallet.md)
