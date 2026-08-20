# Derive paths and addresses

Looking at the addresses a seed actually produces — and at the path each one came from — inside the sealed realm, without the seed ever leaving it.

::: plain
A seed phrase does not contain addresses. It contains the recipe for making them, and the recipe has a setting: the *path*. Change the path and the same phrase produces a completely different, equally valid set of addresses.

That is why "my coins have disappeared" is nearly always a wrong-path problem rather than a lost-coins problem. The money is where it always was; the wallet is looking somewhere else.

These two screens let you look for yourself. One shows you what path a chain uses. The other turns the seed you have loaded into a list of real addresses, each one labelled with exactly where it came from, so you can compare them against whatever your other wallet is showing you.
:::

::: working
**Derivation paths** reports, per chain, the SLIP-44 coin type, the default account path for the selected script family, and the address encoding Coldbox uses. In generic mode it accepts any canonical BIP-32 path, validates it, and derives that node's public metadata — depth, child index, fingerprint and extended public key.

**Address derivation** derives a range of receive and change addresses for the focused released secret, showing each with its complete path and encoding.

Both read the one secret you released from Seed Forge. Neither has a phrase field of its own, and switching which secret is focused re-derives both from scratch — a panel still showing values from a secret you have switched away from would be a defect, not a stale view.
:::

::: technical
Both surfaces are cold-realm lenses on the session-scoped released-secret registry defined in [ADR-0045](../05-development/adr/0045-released-secret-model.md), and both call the P1.4/P1.5 engine directly rather than carrying a second derivation implementation. Everything is computed inside the sandboxed frame: no derived address, extended key, fingerprint or path is placed in any message crossing the realm boundary, which is asserted by the committed browser scenario rather than assumed.

The panels render public values only. The engine's generic recovery projection can return extended private keys, raw private keys and WIF; these surfaces do not call it, and no derived private material is rendered, logged, or offered to a clipboard.

A chain is offered only while this build carries independently recorded test vectors for it, per the "Adding a chain" rule in [chain-registry.md](../01-spec/chain-registry.md). A user-defined custom chain entry is therefore not derivable until its vectors are recorded — a chain that silently produces a wrong address is worse than an unsupported one, because nothing reveals the error until the funds are gone.
:::

---

## Finding the path a wallet uses

1. Release the seed from **Seed Forge**. It is the only place a phrase is entered.
2. Open **Derivation paths** and choose the chain.
3. Choose the script family. Each one has a different purpose level and therefore a different account path and a different set of addresses.
4. Read off the coin type and default account path.

The path structure itself, the purposes table, the common wallet defaults and the full "my coins are missing" diagnosis live in the [derivation paths reference](../04-reference/derivation-paths.md).

## Checking addresses against another wallet

1. Open **Address derivation** with the same secret focused.
2. Choose the chain, script family and account number, then the first index and how many addresses to derive.
3. Compare against the other wallet.

**Compare the whole string, every time.** Address-poisoning attacks produce addresses that match a target's first and last few characters precisely because a truncated glance is the check they are built to defeat. Compare the full path and the script family too: two addresses can both be correct and still be different, because they come from different paths.

If nothing matches, the path is usually the reason. Work through the four Bitcoin script families and the first few account numbers before concluding anything is wrong — and note the [gap limit](../04-reference/derivation-paths.md#my-coins-are-missing) if your funds might sit at a higher index than the range you derived.

## What these screens do not tell you

An address shown here is what *this* build derives from *this* seed at *that* path. It is not evidence that another wallet will use the same path, that a hardware wallet's screen is honest, or that a BIP-39 passphrase was applied the same way in both places. For a check that compares against an independent device, use [verifying a hardware wallet](verify-a-hardware-wallet.md). For catching a substitution between a copy and a paste, use [verifying an address](verify-an-address.md).
