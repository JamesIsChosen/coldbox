# Verify an address

Checking that the address you're about to send to is the one you meant — and, just as importantly, that it survived the trip from Coldbox to wherever you pasted it.

::: plain
You copy an address, you paste it, you send. Somewhere in between, a nasty little program swaps the address for the attacker's. Everything on your screen looked right. The money is gone.

This is real, it's common, and it's boring in how it works: the program just watches your clipboard and rewrites anything that looks like a crypto address.

The fix is to check *after* you paste, not before. Copy the address back out of wherever you pasted it, drop it into Coldbox, and Coldbox tells you whether it's still the right one — comparing every single character, not just the first and last few.
:::

::: working
Clipboard-hijacking malware substitutes a copied address between the copy and the paste. Verifying the address Coldbox displays proves nothing about what reached the destination field.

The round-trip check closes that gap: paste back what actually landed in the destination, and Coldbox compares it character-exact against your registry, reporting the index of the first divergent character.

Full-string comparison is not a detail. Address-poisoning attacks generate addresses matching a target's first and last four characters, so a truncated visual comparison — the `0x71C7…976F` display most wallets show — is precisely the check they're built to defeat.
:::

::: technical
The check operates on the `Address` records in the vault's public compartment, so it's available online without unsealing the secret compartment. Comparison is exact over the full string after chain-appropriate normalisation: bech32/bech32m lowercased and compared case-insensitively per BIP-173/BIP-350; base58check compared case-sensitively; EVM hex compared case-insensitively with EIP-55 mixed-case checksum validated as a separate outcome.

Clipboard I/O is warm-shell-resident because `navigator.clipboard.readText()` requires a secure context and a user gesture, and is effectively unavailable in an opaque-origin `sandbox` iframe under `file://`. Cold-realm re-derivation is a separate, stronger claim tracked per address in `verificationState`. See [address-verification.md](../01-spec/address-verification.md) and [ADR-0021](../05-development/adr/0021-clipboard-address-verification.md).
:::

If you have released a Seed Forge result for the cold-only tools, the Address Check still compares the complete pasted value, but it does not change the registry's cold-verification state from that session-only result. Use the focused cold verification panel for cold-local derivation; this separation keeps a released-secret derivative out of the warm/public compartment.

---

## The round trip

This is the flow that catches the attack. **Step 4 is the one people skip, and it's the one that matters.**

1. Open the address in Coldbox. Where the transitional Seed Forge path permits it, Coldbox re-derives it from the current seed first; a released-secret session keeps this warm-origin check comparison-only.
2. Copy it.
3. Paste it into the destination — an exchange withdrawal field, a wallet's send box.
4. **Copy it back out of that field**, and paste it into Coldbox's Address Check.
5. Coldbox reports a match, or tells you exactly which character position went wrong.

Checking before step 3 tells you the address Coldbox knows about is correct. It tells you nothing about the address sitting in the withdrawal field, and that is the one the money follows.

---

## Reading the result

Coldbox answers two separate questions and never merges them into one tick.

| What it says | What it means | What it does **not** mean |
|---|---|---|
| Matches your registry | The string you pasted is exactly an address you have recorded | That the recorded address was right in the first place |
| Re-derived from your seed | Coldbox regenerated it offline from your seed and it matches | Anything about the clipboard — that's the other check |
| No record | Coldbox has no such address | That the address is bad. For a first payment this is expected |
| Checksum invalid | The string is corrupt — probably a truncated or mangled paste | That it was swapped |
| Matches a different account | Real address, real record, **different account than you expected** | Ignore this at your peril; it's worth a second look |

If an address has never been re-derived inside the cold realm, every verdict says so. That's not padding — a registry entry that was wrong when you recorded it will verify cleanly forever, and you should know which of your addresses have been checked against the seed and which haven't.

---

## Checksums are not verification

::: plain
Crypto addresses have a built-in typo check. If you mistype a character, most software will notice.

That check does **not** help here. The attacker's address is a perfectly normal, valid address — it passes the typo check just like yours does. "Valid address" and "your address" are completely different claims.
:::

::: working
EIP-55, bech32, and base58check checksums detect transcription errors, not substitution. A swapped address is a well-formed address and passes every checksum test. A checksum pass must never be read as a verification pass.
:::

::: technical
Checksum schemes provide error *detection* over the encoded payload — bech32's BCH code detects up to four character errors and any run of eight or fewer, EIP-55 encodes a keccak-256-derived case pattern. None binds the address to a key you control, so none distinguishes an attacker's valid address from yours. Only comparison against an independently derived value does that.
:::

---

## The clipboard alarm

Off by default. The toggle is in the Verify panel, beside the address-comparison controls.

::: plain
If you want this extra check, turn on the clipboard volatility canary in the Verify panel. Coldbox takes a baseline, then re-reads the clipboard once after a short delay without user action. It does not keep watching for copy actions.

It needs permission to read your clipboard, which your browser will ask about. If access is denied or unavailable, the canary says **unavailable** and the ordinary address comparison still works. You can retry permission without reloading.
:::

::: working
The volatility canary is a one-shot check. Enable it, or use Retry in the Verify panel, and Coldbox reads the current clipboard as a baseline and schedules exactly one delayed re-read with no user action. A change with no user input is affirmative detection of an active hijacker — the only positive signal in this feature, since every other check reports the absence of a problem rather than the presence of one. After that read, the canary reports `stable` or `changed`; it does not begin ongoing monitoring.

Requires persistent clipboard-read permission. On denial or unavailable access, the paste comparison continues to work and the UI states the canary is **unavailable**; it never silently substitutes the weaker check's result. A permission-query failure alone is not treated as a denial: the actual clipboard read determines whether the canary can arm.
:::

::: technical
Implemented against `navigator.clipboard.readText()` under the `clipboard-read` permission, which requires a secure context. Availability varies across the supported execution matrix, particularly under `file://`, so permission/API outcomes are surfaced as `unavailable` rather than treated as a successful canary, while the address comparison remains available. A synchronous `permissions.query()` failure is contained as an unknown permission state; a successful actual read may still arm the one-shot canary.
:::

**Expect false alarms.** Clipboard managers, cloud sync, and remote-desktop clients all rewrite clipboard contents legitimately. If you run one, this will trip. Coldbox names those causes first, because they're far more likely than malware — but if you don't run anything like that and it trips, take it seriously.

---

## What this doesn't protect you from

Stated plainly, because a check you over-trust is worse than no check.

- **A compromised computer** at a deeper level — malware that can alter what runs in your browser could fake the answer. Nothing in a browser defends against that; see [threat-model.md](../02-security/threat-model.md).
- **An address that was already wrong when you saved it.** That's what the cold re-derivation state is for. If it says never verified, it means never verified.
- **A tampered copy of Coldbox itself.** [Verify your copy](../02-security/verification.md) — it's the check underneath all the others.

---

## Related

- [Verify a hardware wallet](verify-a-hardware-wallet.md) — the device-screen comparison this builds on
- [address-verification.md](../01-spec/address-verification.md) — full specification
- [ADR-0021](../05-development/adr/0021-clipboard-address-verification.md) — why the work is split across the two realms
