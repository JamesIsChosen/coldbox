# Multisig quorum management

Tracking which device holds which key — and whether you could still spend if one of them died.

---

## What Coldbox does here

**Does:** records your quorum configuration, tracks which device holds which key and where each is, stores the descriptor, analyses survivability, and imports/exports wallet policies for re-registering on a replacement device.

**Doesn't:** construct or sign transactions. Your devices and your wallet coordinator do that.

The gap this fills: plenty of software tracks multisig *wallets*. Very little tracks whether your quorum is **still actually reachable** — which is the thing that quietly stops being true.

---

## The setup

A 2-of-3 means three keys exist and any two can sign. Properties worth being precise about:

- Losing **one** key: fine, you can still spend.
- Losing **two** keys: funds are gone. Permanently.
- An attacker getting **one** key: nothing.
- An attacker getting **two**: everything.

Multisig removes single points of failure and **adds** things to back up. Three devices means three seeds, three backups, and three places for something to go wrong.

**Common configurations:**

| Config | Suits |
|---|---|
| 2-of-3 | Most people. One spare, meaningful security |
| 3-of-5 | Larger holdings, more custodians |
| 2-of-2 | Rarely right — no redundancy at all |

---

## Recording it

Registry → Add wallet → type: multisig.

Record: the quorum (2-of-3), the **descriptor**, and per key — which device, its fingerprint, its derivation path, its xpub, where the device lives, and where that key's seed backup lives.

### The descriptor is not optional

An output descriptor is the precise, unambiguous definition of the wallet: which keys, which script type, which paths, which quorum.

```
wsh(sortedmulti(2,[A1B2C3D4/48h/0h/0h/2h]xpub.../0/*,
                  [E5F6A7B8/48h/0h/0h/2h]xpub.../0/*,
                  [C9D0E1F2/48h/0h/0h/2h]xpub.../0/*))
```

**Without the descriptor, three seed phrases will not recover your funds.** You'd also need to know the quorum, the script type, the key order, and the paths — and reconstructing that by trial and error is a genuinely bad afternoon.

Store the descriptor with **every** backup. It contains no private keys and is safe to distribute alongside each share. It does reveal your addresses, so it isn't public information — but it can't spend.

---

## Survivability analysis

Registry → Multisig → Survivability.

The app asks the question you should be asking: **for each thing that could go wrong, could you still spend?**

| Scenario | Checked |
|---|---|
| Device 1 destroyed | Can you still reach threshold? |
| Location A burns down | Which keys were there? |
| Custodian unreachable | Do the rest suffice? |
| Two devices in the same fire | ← the common one |
| Descriptor lost | **Instant fail** |
| You die | Can heirs reach threshold? |

It flags the recurring mistakes:

- **Two of three devices in the same building.** Very common, and it silently converts 2-of-3 into 1-of-2 against fire.
- **All seed backups in one safe**, even if devices are distributed.
- **Descriptor stored in only one place.**
- **A key whose backup has never been verified.**
- **All custodians the same age**, which matters for inheritance.

---

## Key rotation

When a device is lost, compromised, or retired:

1. **Move the funds** to a new multisig wallet with a fresh key set. Rotating a key in place isn't possible — the address set is derived from the keys.
2. Set up the replacement device and record it.
3. Create the new wallet and its descriptor.
4. **Verify a receive address** on the new wallet before sending anything.
5. Move funds.
6. Record the old wallet as retired. Don't delete it — you may need its history.
7. Destroy the compromised key's backup.

If a device is lost but not compromised, this isn't urgent. If it may be compromised, it is — an attacker with one key of a 2-of-3 needs only one more.

---

## Re-registering on a replacement device

Multisig devices must be told about the wallet before they'll sign or display addresses for it.

Coldbox exports **BIP-388 wallet policies** and output descriptors for this. Keep an exported copy with your backups — a replacement device with the seed but no wallet policy is a device that can't do anything useful.

---

## Inheritance

Multisig is genuinely good for inheritance and genuinely easy to get wrong.

**Good:** distribute keys among heirs so a quorum can act, but no individual can act alone. That's the property you want, and it's enforced by Bitcoin rather than by trust.

**Easy to get wrong:** your heirs need the descriptor, the wallet policy, compatible software, and enough understanding to use them. A 2-of-3 among people who don't know what a descriptor is protects your funds from your family.

**Minimum:**

1. The [instruction letter](inheritance-planning.md) explains the setup in plain language.
2. The descriptor is stored with every key backup.
3. At least two heirs know the wallet exists and what to do.
4. **You rehearse it** — walk an heir through a recovery on a wallet holding a trivial amount, without helping.

That last one will show you your instructions are less clear than you think. Everyone's are.

---

## Maintenance

**Annually:** verify each device still works and holds the expected key (fingerprint check), confirm each seed backup is present and legible, confirm the descriptor is stored in multiple places, and re-run the survivability analysis after any move or relationship change.

**Every few years:** actually perform a recovery drill on a test wallet.

The Backup Health dashboard tracks all of this and flags what's overdue.

---

## Related

- [Verify a hardware wallet](verify-a-hardware-wallet.md)
- [Inheritance planning](inheritance-planning.md)
- [Hardware wallet matrix](../04-reference/hardware-wallet-matrix.md)
