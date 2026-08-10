# Entropy and strength

How the Entropy Health Meter works, why it shows two numbers, and how much randomness is actually enough.

---

## What entropy is

Entropy measures how hard something is to guess. It's counted in bits, and each bit **doubles** the difficulty.

| Bits | Possibilities | Guessable? |
|---|---|---|
| 20 | 1 million | Instantly |
| 40 | 1 trillion | Hours |
| 64 | 1.8 × 10¹⁹ | Feasible for a well-funded attacker |
| **128** | 3.4 × 10³⁸ | **No. Not ever, with any conceivable hardware** |
| 256 | 1.2 × 10⁷⁷ | Comfortably beyond 128 |

**128 bits is the security floor** and is genuinely sufficient. 256 bits is not "twice as safe" — both are already beyond brute force. 256 exists for margin against future cryptanalysis and quantum algorithms, not because 128 is weak.

A 12-word seed carries 128 bits. A 24-word seed carries 256.

---

## Why two numbers

The meter always shows **claimed bits** and **measured bits**.

**Claimed** is what your input should theoretically produce. Fifty rolls of a six-sided die: 50 × log₂(6) = **129.2 bits**.

**Measured** is an observed empirical min-entropy estimate from the distribution you actually produced. It is not a bias-corrected confidence bound or a guarantee of true min-entropy.

If your die is chipped, or you're unconsciously favouring certain faces, or you misread a roll, claimed and measured diverge. A single green bar would hide that. Two numbers make it visible.

### Min-entropy, not Shannon entropy

The meter reports **min-entropy**, and the distinction is not academic.

**Shannon entropy** measures average information content across all outcomes.
**Min-entropy** measures the probability of the *single most likely* outcome.

An attacker doesn't guess averagely — they guess the most likely candidate first. For a uniform source the two measures agree. For a biased source, Shannon entropy flatters it and min-entropy tells the truth. Entropy Health displays the claimed source-model bits and measured min-entropy; Shannon entropy is explanatory only and is not a displayed diagnostic.

### What the Bias Analyzer can and cannot establish

The analyzer reads physical/manual observations only; device-RNG simulations are excluded. For a fixed alphabet, its measured estimate uses the largest observed symbol frequency: `n × -log₂(max observed count / n)`. This is deliberately an estimate from finite data. A sample can miss a high-probability outcome, so neither this number nor a passing statistical test proves that the source is fair or that a platform CSPRNG is sound.

The evidence panel reports Pearson chi-square uniformity with an upper-tail p-value when every expected bin has at least five observations, the NIST binary runs test when its sample and proportion preconditions hold, and NIST lag-one serial correlation with an advisory 95% band. These tests are unavailable for cards drawn without replacement; cards retain their exact claimed permutation bits and order/pattern review. Long runs, ordered sequences, alternation, and repeated blocks are deterministic prompts to inspect the recording. Full formulas, thresholds, and fail-closed reasons live in [ADR-0027](../05-development/adr/0027-entropy-health-statistical-diagnostics.md).

---

## The states

| State | Meaning | What happens |
|---|---|---|
| 🔴 **Insufficient** | Measured below the selected target | Advisory P1.2 label; Seed Forge still requires the selected fresh CSPRNG target |
| 🟠 **Marginal** | Measured reaches the selected target and chi-square flags bias | Advisory P1.2 warning; Seed Forge requires an explicit acknowledgement before generation |
| 🟡 **Adequate** | Measured reaches the selected target, no chi-square flag, and is below 256 bits | Advisory P1.2 label |
| 🟢 **Strong** | Measured reaches 256 bits | Advisory P1.2 label |

The thresholds are ordered and non-overlapping. P1.2 does not block Entropy Lab's Mix entropy control; it reports evidence. For the P1.3 handoff, a successful Mix result is held cold-locally until the user selects **Use this mix in Seed Forge**, which consumes that exact result once without a second mix. Changing collected input or output size clears the pending result. Seed Forge fails closed rather than producing a shorter phrase and requires an explicit acknowledgement when the selected physical/manual source is marginal; the separate Generate action may draw fresh CSPRNG bytes through the same session.

---

## How much input you need

| Method | For 128 bits | For 256 bits |
|---|---|---|
| **d6 dice** (base-6) | 50 rolls | 100 rolls |
| **d6 dice** (1–4 discard method) | 64 rolls | 128 rolls |
| Coin flips | 128 flips | 256 flips |
| Playing cards (full shuffle) | 1 shuffle ≈ 225 bits | 2 shuffles |
| EFF Large Diceware | 25 words | 50 words |
| Hex characters | 32 | 64 |

The discard method throws away rolls of 5 and 6, using only 1–4 to give exactly 2 bits per roll. It's simpler to reason about but wastes about a third of your rolls. Base-6 uses every roll at log₂(6) ≈ 2.585 bits, then hashes.

The app tells you which method you're using and how many rolls remain.

---

## Pattern warnings

Flagged live during collection, not as a post-mortem:

| Pattern | Why it matters |
|---|---|
| Long runs (`4 4 4 4 4 4`) | A stuck die, or a transcription error |
| Sequences (`1 2 3 4 5 6`) | Almost always a misread or a joke entry |
| Alternation (`1 6 1 6 1 6`) | Rarely physical |
| Repeated blocks | Copy-paste or double-entry |
| Skewed frequency | A weighted or damaged die |

Real dice do produce runs — `4 4 4 4` happens. The warning is a prompt to check, not an accusation. It exists because the alternative failure is silent.

---

## Sources, honestly assessed

### Dice, coins, cards

Their source models are exactly computable and physically observable, and you don't have to trust any software to record the raw values. The Bias Analyzer adds finite-sample evidence about the recording; it does not prove that the source is fair.

Use **casino-grade dice** if you're being careful. Ordinary dice have rounded corners and drilled pips, both of which introduce measurable bias. The Bias Analyzer will show you if yours are unusually skewed across enough rolls.

### CSPRNG (`crypto.getRandomValues`)

256 bits by definition. The bar shows full.

**With a caveat the app states explicitly:** the meter measures the *source specification*, not the platform's implementation. A backdoored or broken RNG produces output that looks perfectly random. No statistical test on the output can detect this — that's precisely what a good backdoor achieves.

This is not a reason for alarm, and modern platform RNGs are well-scrutinised. It's a reason to understand what the green bar means.

### Mixing — the recommended approach

Combine physical/manual entropy with fresh CSPRNG output: XOR them, then hash the result.

```
 dice / coins / cards / hex          CSPRNG
  (physical/manual source)     (crypto.getRandomValues)
            │                            │
            └───────────  XOR  ──────────┘
                           │
                       SHA-256
                           │
              mixed entropy (128–256 bits)
```

The Entropy Lab shows **two different strength answers because they describe different threat assumptions**:

- **Normal output strength** — the selected output size (128/160/192/224/256 bits) when the device CSPRNG is functioning correctly. The mixed path always consumes at least that many fresh CSPRNG bits, so a 256-bit selection does not silently fall to 32-bit normal strength merely because only 32 physical bits were supplied.
- **Independent-source fallback strength** — the conservative physical/manual entropy that remains if the device RNG is completely compromised or predictable. This uses the same integer accounting as the security gate: coin flips contribute 1 bit each, discard-mode dice 2 bits per accepted roll, base-6 dice/cards use the conservative `BigInt` possibility-space floor, and manual hex contributes 4 bits per digit. It never counts device-RNG simulations.

Examples for a 256-bit selection:

| Sources | Normal output strength | Independent-source fallback |
|---|---:|---:|
| sound CSPRNG + 0 physical bits | 256 bits | 0 bits — CSPRNG-only security |
| sound CSPRNG + 32 physical bits | 256 bits | ~32 bits |
| sound CSPRNG + 128 physical bits | 256 bits | ~128 bits |
| sound CSPRNG + ≥256 physical bits | 256 bits | ~256 bits — **full two-source protection** |

The independent physical/manual count itself is not artificially capped to the selected target. If 300 conservative independent bits were collected for a 256-bit output, the UI may show `300 / 256 bits`; the fallback strength of that 256-bit output is still bounded by the 256-bit output length.

**Full two-source protection** means the independent physical/manual contribution itself reaches the selected output size. Only then does the strong statement apply: a weighted/manual source cannot compromise the result if the RNG is sound, and a completely compromised RNG still does not reduce the result below the selected target if the independent source is sound. With only a partial manual contribution, the CSPRNG still supplies the full normal output strength, while the displayed fallback honestly shows the smaller amount that survives a total RNG compromise.

The Entropy Lab's **Generate with device RNG** dice/coin/card/hex controls are simulations, not a substitute for the physical/manual side. They use the same device RNG as CSPRNG, are labeled `Device RNG` in the logs, and receive **zero independent-source credit**. They may remain in the transformation for simulation convenience, but they never increase the fallback figure or trigger the full-protection state.

If no dice/coin/card/hex source material is recorded, Entropy Lab uses the requested fresh CSPRNG bytes directly. If only device-RNG-generated simulations are recorded, they may be included in the XOR/hash transformation, but the security classification remains **CSPRNG-only security** with `0 bits` independent fallback because the same device RNG controls both inputs.

### Human-chosen passphrases

The meter shows a **range, not a number**, and says why.

Entropy estimation for human-chosen text is fundamentally heuristic. Any tool displaying "your passphrase has 84 bits of entropy" is inventing precision it doesn't have — the real answer depends on what an attacker's cracking dictionary contains, which is unknowable.

`Tr0ub4dor&3` looks strong to a naive meter and is weak in practice. `correct horse battery staple` looks weaker and is stronger. Meters routinely get both backwards.

**Use Diceware instead.** Its entropy is exactly computable because the words are chosen by a physical process from a known list. Six EFF Large words gives 77.5 bits and is far easier to remember than a comparable random string.

During vault creation, the sealed realm shows this guidance live as `Unknown range — no numeric estimate`. It is hidden during ordinary unlock. The panel never infers entropy from spelling or character count.

---

## Passphrase strength

| Method | Bits | Assessment |
|---|---|---|
| 4 Diceware words | 51.7 | Too weak for a vault |
| 5 Diceware words | 64.6 | Marginal |
| **6 Diceware words** | **77.5** | **Recommended minimum** |
| 7 Diceware words | 90.5 | Strong |
| 8 Diceware words | 103.4 | Very strong |
| 12 random alphanumerics | 71.5 | Comparable to 6 words, harder to remember |
| A memorable phrase | ~20–40 | **Inadequate** |

For the vault passphrase, six Diceware words plus Argon2id at 64 MiB puts offline guessing far out of reach.

Note the last row. A phrase you invented and find memorable is not random — it's drawn from the small space of phrases humans invent and find memorable, which is exactly the space a cracking dictionary covers.

---

## What the meter cannot tell you

- Whether your platform's RNG is sound
- Whether someone watched you roll
- Whether your dice are subtly weighted in a way that only shows over thousands of rolls
- Whether you'll remember your passphrase
- Whether your backup works

The last two lose more money than weak entropy ever has.

---

## Related

- [Glossary: entropy](../00-overview/glossary.md)
- [SPEC.md §11.1a](../01-spec/SPEC.md)
- [ADR-0027: Entropy Health statistical diagnostics](../05-development/adr/0027-entropy-health-statistical-diagnostics.md)
- [First wallet guide](../03-guides/first-wallet.md)
