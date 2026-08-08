# Security policy

Coldbox handles seed phrases and private keys. A vulnerability here can cost someone everything they own. Reports are taken seriously and answered.

---

## Reporting a vulnerability

**Please do not open a public issue for anything that could put funds at risk.**

Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository — Security → Report a vulnerability.

Include, as far as you can:

- What the issue is, and what an attacker gains from it
- Steps to reproduce, or a proof of concept
- Which version or commit you tested
- Browser, OS, and whether you ran the file locally or from a server

### What to expect

| | |
|---|---|
| Acknowledgement | Within 72 hours |
| Initial assessment | Within 7 days |
| Fix or mitigation plan | Communicated as soon as it exists |
| Credit | Offered in the advisory and changelog, unless you'd rather not be named |

This is a small volunteer project. There is no bug bounty. What there is: a real response, an honest severity assessment, and public credit.

---

## Scope

### In scope

- **Any path by which a secret escapes the cold realm.** This is the highest-severity class in the project. If you can get a seed, private key, or decrypted secret compartment out of the sandboxed iframe — through `postMessage`, a CSP bypass, a sandbox escape, or anything else — that is a critical finding.
- Vault format weaknesses: key derivation, encryption, AAD handling, nonce reuse, padding, rollback.
- Cryptographic implementation errors in derivation, mnemonic handling, or Shamir schemes.
- Incorrect addresses or keys derived from a valid seed and path. Silent wrongness is as dangerous as a leak.
- CSP bypasses in either realm.
- Secrets persisting where they shouldn't: `localStorage`, session restore, browser history, the DOM after lock.
- Supply chain: a vendored dependency that doesn't match its upstream hash, or a build that isn't reproducible.
- XSS or injection reachable from any input the app accepts, including imported vaults, CSVs, and QR payloads.

### Out of scope

- Compromised operating systems, keyloggers, and malicious browser extensions. No in-browser tool can defend against these, and the documentation says so.
- Physical coercion.
- JavaScript memory forensics. JS strings are immutable and cannot be reliably wiped; this is a documented limitation, not a bug.
- Weak user-chosen passphrases.
- Rate limits, availability, or downtime of third-party price and balance APIs.
- The privacy cost of querying a public block explorer. Documented, mitigated, opt-in, and inherent to the feature.
- Missing security headers on a page you self-hosted. There is no supported hosted deployment.
- Findings that require an already-compromised device.

---

## Verifying a release

Every release ships with a SHA-256 hash, a detached GPG signature, and a reproducible-build attestation from CI. If you can produce a build from source whose bytes differ from the published artifact, **report it as a critical finding** — that would mean the published file contains something the source doesn't.

See [docs/02-security/verification.md](docs/02-security/verification.md).

---

## Supported versions

Pre-release. Nothing is supported yet, and nothing here should hold real funds.

Once released, the latest version is supported. Security fixes are not backported; the file is small and updating means downloading and verifying one file.

---

## Design commitments

These are promises the code is expected to keep. A change that breaks one is a security regression, not a feature.

1. Secrets never enter the warm shell.
2. The cold realm's CSP always includes `connect-src 'none'`.
3. If the cold realm cannot be established, the app **fails closed** — it refuses to open a vault rather than silently degrading.
4. No telemetry and no analytics. The warm shell may make fixed, content-free reachability probes to already-allowlisted hosts so the network-status UI can refresh while the app is open; those probes carry no vault, address, asset, or user-entered data. The CSP allowlist in source remains the complete list of hosts the app can contact. The cold realm contacts none of them.
5. Builds are reproducible, and the published hash is verifiable by anyone.
