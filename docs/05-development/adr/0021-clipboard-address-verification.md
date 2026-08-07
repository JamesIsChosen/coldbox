# ADR-0021: Clipboard address verification — warm clipboard, cold authority, two separate claims

**Status:** Accepted
**Date:** 2026-08-07

## Context

[threat-model.md](../../02-security/threat-model.md) lists address-swap malware as a High-priority adversary and marks it "**specifically countered**". [SPEC §14a.2](../../01-spec/SPEC.md) calls receive-address verification "the highest-value check in the whole tool."

The counter that exists today is a *three-way visual comparison*: Coldbox derives the address independently from the xpub, and the user compares it against the wallet software and the hardware wallet screen. That works, and it assumes the user compares the whole string by eye.

Two things break that assumption:

1. **Address poisoning is designed to defeat eyeballing.** Attackers generate addresses matching a target's first and last four characters and seed them into transaction histories. Users check the ends, see a match, and send. A comparison that isn't character-exact isn't a comparison.
2. **The dangerous moment is the paste, not the read.** The user copies a correct address *out* of Coldbox and pastes it into an exchange withdrawal field. A clipboard hijacker rewrites it in between. Coldbox showed the right address and the funds still left. Verifying before the copy proves nothing about what landed after it.

So the missing capability is: **paste back what actually arrived in the destination, and have Coldbox check it exactly.**

The design question is which realm does it, and the clipboard settles it. `navigator.clipboard.readText()` requires a secure context and a user gesture. Inside a `sandbox` iframe without `allow-same-origin` — an opaque origin, typically under `file://` — it is effectively unavailable. A cold-realm-only design degrades to "retype 42 characters by hand," and a security step users skip is worth nothing.

## Decision

Verification is split across both realms, answering **two different questions with two different claims**, and the app never merges them into one verdict.

| Question | Realm | Available | What it proves |
|---|---|---|---|
| Does this string exactly match an address in my registry? | **Warm** | Always, including online | The clipboard was not tampered with between Coldbox and the destination |
| Is that registry entry genuine, or was it poisoned when recorded? | **Cold** | Offline, vault unlocked | The address is really derived from the seed it claims |

**Clipboard I/O is warm-realm only**, for the availability reason above. The registry lives in the public compartment, which is decryptable online, so the warm comparison needs no secret and creates no new boundary crossing.

Four rules give the feature its actual value:

**1. Full-string comparison, reporting the first divergent character position.** Never a prefix or suffix match, never a truncated display. On mismatch, the exact index. This is what defeats poisoning, and it is the entire point.

**2. Round-trip verification is the primary flow.** The headline interaction is "paste back what landed in the destination field," not "check an address." Verifying before the copy is the flow that misses the attack.

**3. Per-address verification state, in the data model.** Each `Address` records whether it has ever been cold-re-derived and when — see [data-model.md](../../01-spec/data-model.md). A warm verdict against a never-cold-verified address **says so, every time**. A watch-only address — one recorded from an xpub, or entered directly, with no seed in the vault — can never reach cold-verified status; it is permanently marked `unverifiable` rather than left ambiguous.

**4. The clipboard volatility canary is opt-in, off by default, and degrades visibly.** Coldbox re-reads the clipboard after a delay with no user action. A change is *positive detection of an active hijacker* — a far stronger signal than a mismatch, and the only affirmative one available. It needs clipboard-read permission, so: explicit toggle, off by default, and if permission is denied or the API is missing, the paste comparison still works while the UI states the canary is unavailable. **Fail closed on the claim, not on the feature** — the app never silently drops to a weaker check while presenting the stronger one's result.

### What this does not prove, stated in the UI

- **Checksums catch typos, not swaps.** EIP-55, bech32, and base58check all validate a *swapped* address perfectly, because it is a real address. A checksum pass must never read as a verification pass.
- **A compromised warm shell could fake a verdict.** Already out of scope per [threat-model.md](../../02-security/threat-model.md) — in-page compromise and malicious extensions are undefended app-wide — but the feature must not imply otherwise. Its guarantee is against OS-level clipboard malware without code execution in the page, which is the common case, not against everything.

## Rationale

**The cold realm buys less here than instinct suggests, and the reasoning matters more than the conclusion.** An address is public data, so confidentiality is not at stake. The attacker this defends against manipulates the OS clipboard and has no code execution inside the page, so integrity of the comparison logic is not at stake either. What the cold realm genuinely adds is authority over *the reference value* — re-deriving from the seed proves the registry entry itself is real. That is the second question, and it is why the split is by question rather than by realm.

**Availability is a security property here.** The strongest verification nobody performs is weaker than a good one everybody does. Forcing manual retyping to keep the check inside the sandbox would trade a real reduction in use for a marginal, mostly theoretical, gain against an attacker already out of scope.

**Two claims, never one tick.** A single green check meaning either "matches your registry" or "re-derived from your seed" would be the most dangerous element on the screen, because the weaker claim would inherit the stronger one's credibility. Rule 3 exists to keep them apart.

**The canary is the only affirmative signal in the feature.** Everything else reports absence of evidence — the strings matched, so probably nothing is wrong. A clipboard that changes with no user action is evidence of something, and it is worth the permission cost to the users who accept it.

## Consequences

### Positive

- Closes the gap between "Coldbox showed the right address" and "the right address reached the destination" — a gap the current three-way check does not cover at all.
- Defeats address poisoning by construction, since a divergence index cannot be satisfied by matching ends.
- Works online, which is where users actually are when withdrawing from an exchange. [threat-model.md](../../02-security/threat-model.md)'s recommended posture already says "verifying an address: any machine — that's the point."
- Rule 3's verification state feeds the Backup Health surface pattern: never-cold-verified addresses become a visible, actionable list rather than an unstated assumption.

### Negative

- A new `Address` field means a schema migration and the compatibility test [data-model.md](../../01-spec/data-model.md) requires.
- Two claims means two verdict strings, two help entries, and a UI that must never let one read as the other — more surface than a single check.
- The canary's permission prompt appears in a security tool, where a permission request is exactly what users are trained to distrust. Off-by-default limits this, but does not remove it.

### Risks

- **A user reads a warm-only pass as full verification.** The likeliest harm in the feature. Countered by rule 3 making the weaker claim state its own limits inline, every time, rather than in a note users read once.
- **The canary produces false positives** — legitimate clipboard managers and sync tools rewrite clipboard contents. A false hijacker alarm in a security tool causes real distress. The message must describe what was observed ("the clipboard changed on its own") and name benign causes before naming malware.
- **Clipboard APIs vary sharply across browsers and under `file://`.** The feature must survive every combination of read-permitted, read-denied, write-only, and API-absent. This is where the implementation is most likely to be wrong, and it is a P0.3a harness matrix, not an assumption.

## Alternatives considered

**Cold realm only.** Strongest-sounding: comparison inside the sandbox against a freshly derived address, defeating both clipboard malware and a compromised warm shell. Rejected because the clipboard API is effectively unavailable in an opaque-origin sandboxed frame under `file://`, so the real-world flow becomes manual retyping. It would also gain little against an in-page attacker, who is out of scope app-wide.

**Warm realm only, as a Verify Bench tool.** Simplest, public data only, no schema change. Rejected as insufficient rather than wrong: it cannot say anything about whether the registry entry is genuine, so a poisoned entry verifies cleanly forever. That is the failure mode most likely to be catastrophic and least likely to be noticed.

**Prefix/suffix comparison with a visual highlight.** Common in wallet UIs and much easier to read at a glance. Rejected because it is the exact check address poisoning is built to defeat; shipping it would counter an attack that no longer exists while missing the one that does.

**Always-on clipboard canary.** Strongest detection. Rejected under the answered question: a permission prompt on every verification, in a tool whose value rests on not doing surprising things, reads as the tool being invasive.

**No canary at all.** Smallest permission surface. Rejected because it leaves the feature able to report only mismatches, never able to affirmatively detect that a hijacker is running — and that affirmative signal is the most valuable thing available.

## What would change our mind

- If clipboard read permission proves unobtainable in practice across the supported matrix, the canary becomes documentation rather than a feature, and the ADR should say so instead of shipping something that never runs.
- If false-positive canary alarms from clipboard managers are common, it should invert: detect and name the clipboard manager, and only alarm when the rewrite is unexplained.
- If a browser exposes clipboard read inside opaque-origin sandboxed frames, the cold realm could own the whole flow and the split would be worth revisiting.
- If users are observed treating warm-only passes as full verification despite rule 3, the warm claim may need to be *harder* to obtain — for instance refusing a verdict for never-cold-verified addresses rather than qualifying one.

## References

- [address-verification.md](../../01-spec/address-verification.md) — the full specification
- [SPEC.md §14a.2](../../01-spec/SPEC.md) — verification workflows
- [threat-model.md](../../02-security/threat-model.md) — address-swap malware; clipboard scraping
- [data-model.md](../../01-spec/data-model.md) — the `Address` verification-state fields
- [ADR-0020](0020-injected-providers-rejected-and-neutered.md) — the rejected wallet-extension integration, which would have created a permanently unverifiable address category
- [verify-an-address.md](../../03-guides/verify-an-address.md) — the user-facing guide
