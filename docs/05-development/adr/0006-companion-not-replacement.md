# ADR-0006: A companion to hardware wallets, not a replacement

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The tool derives keys, generates seeds, and manages backups. Those capabilities overlap heavily with what a hardware wallet does, and the obvious next step — transaction signing — would make it a full software wallet.

The intended user owns several hardware wallets. The question is what role this tool plays alongside them.

## Decision

**Coldbox holds no keys and signs nothing.** It is explicitly a companion layer, and the product framing, feature set, and roadmap all follow from that.

Transaction signing is a permanent non-goal, not a deferred feature.

## Rationale

### Signing changes what an attacker gains

A tool that cannot sign cannot be used to steal funds directly, even if fully compromised. The worst case is disclosure of what it holds — serious, but bounded.

A tool that *can* sign becomes worth attacking for immediate profit. That single capability changes the security economics of every other decision in the project, and it would do so for a feature the user's hardware wallets already perform better.

### The genuine gap is verification, not signing

A hardware wallet secures keys well. What it cannot do is tell you whether the computer between you and it is lying.

Address-swapping malware alters the receive address your wallet software displays. Your device shows the true address on its own screen — which is why you're told to check — but comparing a 42-character string against a small display is tedious, and people stop doing it.

Independently deriving the address from your xpub, in software with no connection to the wallet application, catches this. The same principle covers verifying a device holds the seed you believe it does, verifying a metal backup works without wiping a device to test it, and verifying a passphrase produces the expected wallet before funding it.

**These are things no hardware wallet can do for itself**, because self-verification is circular. That's the gap worth filling.

### The record-keeping gap is real too

Which device holds which key. Which passphrase gives which wallet. Where the shares are and who has them. Whether the quorum is still reachable if one device dies. Firmware, PIN dates, purchase provenance.

Hardware wallets don't track any of this, and it's exactly what people lose.

## Consequences

### Positive

- Sharply reduced attack surface and attacker incentive.
- Clear positioning that doesn't compete with better-suited tools.
- Feature priorities follow naturally — verification workflows become Phase 1, not an afterthought.
- Honest messaging: "use a hardware wallet, and use this alongside it" is advice we can give without conflict of interest.
- The PSBT viewer can display transactions in plain language without ever being able to sign one.

### Negative

- Users wanting an all-in-one tool must use two things.
- No spending capability, which some will find limiting.
- Requires manually transferring xpubs and addresses to the app — no USB device communication.

### Implications for the roadmap

- Device registry and verification workflows move to Phase 1 — they're the core value, not an extra.
- PSBT support is **view-only**, permanently.
- Miniscript is parse-and-display only.
- MuSig2 and FROST are tracked for record-keeping, not implemented.
- No WebUSB or WebHID. Values are typed or scanned, which also keeps the tool useful on devices where those APIs don't exist.

## Alternatives considered

**Full software wallet with signing.** Rejected. Changes the security model fundamentally, duplicates what the user's existing devices do better, and makes the tool worth attacking.

**Watch-only wallet with transaction construction, signing elsewhere.** Tempting, and a natural fit. Deferred rather than rejected outright — but constructing transactions requires UTXO management and fee estimation, which pulls in significant network dependency and complexity. Not before the core is proven.

**Device communication over WebUSB/WebHID.** Rejected. Adds a large attack surface, works on a minority of browsers, doesn't work at all under `file://` on several platforms, and manual entry is adequate for the verification workflows that matter.

## What would change our mind

Nothing about signing — that's settled. The device-communication decision could be revisited if browser support consolidated and a compelling verification workflow required it, but manual comparison is arguably *better* for verification anyway: it forces the user to actually look at the values, which is the point.

## References

- [SPEC.md §14a](../../01-spec/SPEC.md)
- [verify-a-hardware-wallet.md](../../03-guides/verify-a-hardware-wallet.md)
- [hardware-wallet-matrix.md](../../04-reference/hardware-wallet-matrix.md)
