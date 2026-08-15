# Address verification

How Coldbox proves an address is the one you meant. Decision rationale in [ADR-0021](../05-development/adr/0021-clipboard-address-verification.md); the user-facing walkthrough is [verify-an-address.md](../03-guides/verify-an-address.md).

This document covers the clipboard round-trip check. The device-screen comparison it builds on is [SPEC §14a.2](SPEC.md).

---

## The gap this closes

The existing check compares three sources — wallet software, hardware wallet screen, and an address Coldbox derives independently from your xpub. It catches malware that alters a *displayed* address.

It does not cover what happens next. You copy the verified address, paste it into an exchange withdrawal field, and a clipboard hijacker rewrites it in transit. Every displayed address was correct and the funds still left.

So the check runs in the other direction: **paste back what actually landed in the destination**, and compare it exactly.

---

## Two questions, two claims

The app answers these separately and never merges them into a single verdict.

| | Registry match | Cold re-derivation |
|---|---|---|
| **Question** | Does this string exactly match an address I have recorded? | Is that recorded address genuinely derived from the seed it claims? |
| **Realm** | Warm shell | Cold realm |
| **Needs** | Vault open (public compartment) | Vault unlocked, offline |
| **Available** | Always, including online | Offline only |
| **Proves** | The clipboard was not tampered with between Coldbox and the destination | The registry entry is real |
| **Does not prove** | That the registry entry was right to begin with | Anything about the clipboard |

**Why the clipboard work is warm.** `navigator.clipboard.readText()` needs a secure context and a user gesture. In a `sandbox` iframe without `allow-same-origin` — an opaque origin, usually under `file://` — it is effectively unavailable. Putting it in the cold realm degrades the flow to retyping 42 characters by hand, which users skip. See [architecture.md](architecture.md) for the capability constraints inside the sandbox.

**Why that costs little.** An address is public data, so there is no confidentiality at stake. The attacker in scope manipulates the OS clipboard and has no code execution in the page, so the integrity of the comparison logic is not at stake either. What the cold realm uniquely provides is authority over the *reference value*, which is the second question.

---

## Verification state

Each `Address` record carries its verification history — fields in [data-model.md](data-model.md).

| State | Meaning | How reached |
|---|---|---|
| `unverified` | Recorded, never re-derived | Manual entry; import; watch-only provider import |
| `cold-verified` | Re-derived from the seed inside the cold realm | An offline unlocked re-derivation |
| `cold-verified-stale` | Was re-derived, but the account's xpub has changed since | Automatic on xpub change |
| `unverifiable` | No seed exists in this vault for it | Watch-only addresses recorded from an xpub, or entered directly |

`unverifiable` is a permanent, honest terminal state, not a failure. A watch-only address can never be cold-verified, because Coldbox has no seed for it. Marking it so is more useful than leaving it indistinguishable from an address nobody has got round to checking.

### Released-secret session boundary

The warm-origin Address Check remains available after a Seed Forge result is released: it can compare the pasted candidate with the public registry. It does not, however, use the session-only released secret to derive an address or persist `verifiedAgainstXpub`/`cold-verified` state. The dedicated cold verification panel can still use the focused secret inside the sealed realm; the unreleased transitional Seed Forge fields retain the existing warm-request re-derivation path until UI.4 removes them.

**A registry match against an `unverified` or `unverifiable` address states that, inline, every time.** Not once at setup, not in a help panel.

---

## The comparison

**Character-exact, over the whole string.** Never a prefix or suffix match. Never a truncated display.

On mismatch, the app reports the **index of the first divergent character** and shows both strings aligned with the divergence marked.

This is the entire point. Address poisoning generates addresses matching a target's first and last four characters, then seeds them into the victim's transaction history so a copy-paste picks up the wrong one. A first-four/last-four check is exactly the check that attack defeats. A wallet UI's `0x71C7…976F` display is not a verification.

**Normalisation before comparison, and its one exception:**

| Chain form | Normalisation |
|---|---|
| Bech32 / bech32m (`bc1…`, `tb1…`) | Lowercase; case-insensitive by specification |
| Base58Check (`1…`, `3…`, `L…`) | None; case is significant |
| EVM hex (`0x…`) | Compared case-insensitively, **and** EIP-55 checksum case validated separately |

The EVM case is the subtle one. `0xABC…` and `0xabc…` are the same address, so a case difference is not a mismatch — but a *mixed*-case string that fails its EIP-55 checksum is corrupt, and is reported as its own outcome rather than as either a match or a mismatch.

---

## Checksums prove less than users assume

Stated in the UI, not just here:

> A swapped address is a **valid** address. It passes every checksum. Checksums catch typing mistakes, not substitution.

EIP-55, bech32, and base58check all validate an attacker's address perfectly. A checksum pass must never be presented with the visual weight of a verification pass.

---

## The clipboard volatility canary

**Opt-in. Off by default. Degrades visibly.**

Everything else in this feature reports *absence* of evidence — the strings matched, so probably nothing is wrong. The canary is the only affirmative signal available: it re-reads the clipboard after a delay with no user action, and a change is **positive detection of an active hijacker**.

Because it needs persistent clipboard-read permission:

- Explicit toggle, off by default, never enabled implicitly by using another feature.
- If permission is denied or the API is absent, the paste comparison still works and the UI **states the canary is unavailable**. It never silently falls back to the weaker check while presenting the stronger one's result.
- The user can re-request permission without a reload.

**False positives are expected and must be handled as the common case.** Clipboard managers, sync tools, and remote-desktop clients rewrite clipboard contents legitimately. The alarm describes what was observed — "the clipboard changed on its own" — and **names benign causes before naming malware**. A false hijacker alarm in a tool people use when they are already anxious about their money does real harm.

---

## Flows

### Round-trip verification — the primary flow

The headline interaction. Verifying *before* the copy is the flow that misses the attack.

1. Coldbox displays a receive address, cold-verified where possible.
2. The user copies it, out of Coldbox.
3. The user pastes it into the destination — exchange withdrawal field, wallet send field.
4. The user copies it back **out of the destination field**, and pastes into Coldbox.
5. Coldbox compares character-exact and reports match, or the divergence index.

Step 4 is the one users will skip and the one that carries the value. The guide says so.

### Inbound verification

Someone sends you an address to pay. Paste it into Coldbox; it reports whether it matches a `Contact` or registry record, and its verification state. A no-match is not an accusation — it means Coldbox has no record, which for a first payment is expected and is worded that way.

### Batch verification

Paste a list of addresses — a payout file, a CSV column. Each row gets its own verdict. Useful before a batch withdrawal, where checking twenty addresses by eye is not something anyone actually does.

---

## What this does not defend against

Per [threat-model.md](../02-security/threat-model.md), and stated in the app:

- **A compromised warm shell or a malicious browser extension** could fake a verdict. Undefended app-wide; this feature does not change that and must not imply it does. Its guarantee is against OS-level clipboard malware without code execution in the page — the common case, not every case.
- **A poisoned registry entry**, unless the address is `cold-verified`. This is exactly why the state is tracked and surfaced.
- **A compromised build.** Countered by [verification.md](../02-security/verification.md), as everywhere else.

---

## Failure modes

| Failure | Response |
|---|---|
| Clipboard read permission denied | Paste comparison still works; canary marked unavailable with a re-request control |
| Clipboard API absent entirely | Manual paste field only; canary hidden with an explanation, not silently absent |
| Pasted string is not a valid address on any known chain | Reported as unrecognised, distinctly from a mismatch — a truncated paste is not a swap |
| Mixed-case EVM address failing EIP-55 | Reported as a corrupt address, distinctly from both match and mismatch |
| Address matches a record in a *different* account | Reported as a match **with the account named** — a real and confusing case worth surfacing, not hiding |
| Vault locked | Registry comparison unavailable; the app says so rather than reporting "no match" |

That last row is load-bearing. Reporting "no match" when the app simply cannot see the registry is a false negative on a security check, and would be the worst bug in this feature.
