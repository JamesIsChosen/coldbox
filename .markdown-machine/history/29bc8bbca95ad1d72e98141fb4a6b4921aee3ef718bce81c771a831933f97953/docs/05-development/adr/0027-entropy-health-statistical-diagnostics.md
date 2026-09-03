# ADR-0027: Entropy Health statistical diagnostics

**Status:** Accepted
**Date:** 2026-08-09

## Context

P1.2 adds the Entropy Health Meter and Bias Analyzer described in [SPEC.md §11.1a](../../01-spec/SPEC.md). The specification names frequency, chi-square, p-values, runs, serial correlation, and pattern warnings, but does not define the sample preconditions or the meaning of the displayed "measured" number.

The existing P1.1 integer accounting is the security authority for independent-source credit and mixing. A statistical test can find evidence worth investigating; it cannot prove that a physical source is fair, and output tests cannot establish that a platform CSPRNG is uncompromised. The analyzer therefore needs a precise, deliberately limited contract.

## Decision

1. **Analyze only physical/manual observations.** Values tagged as device-RNG simulations are excluded from every diagnostic and their count is shown separately. The analyzer is cold-realm code with no DOM, network, or cryptographic dependency. It never changes P1.1's integer accounting and never carries a secret across the realm boundary.

2. **Use finite-alphabet frequency counts.** Each source supplies an alphabet size and its claimed bits per observation. Claimed bits are the source model (`n × log₂(k)` for a uniform `k`-symbol source), or the source's exact supplied claim where the model is not a fixed alphabet. The displayed measured value for with-replacement observations is the empirical maximum-frequency estimate:

   `n × -log₂(max observed symbol count / n)`

   This is an observed estimate, not a bias-corrected confidence bound and not a guarantee of true min-entropy. It is labeled accordingly in code and help text. Cards drawn without replacement report their claimed permutation bits and order warnings, but measured min-entropy is unavailable because the iid frequency model does not apply.

3. **Use Pearson chi-square for uniformity evidence.** For a `k`-symbol alphabet, the expected count is `n/k`, the statistic is `Σ(observed - expected)² / expected`, degrees of freedom are `k - 1`, and the displayed p-value is the upper-tail probability. Use `alpha = 0.01` for the advisory bias flag. Do not report the test until every expected bin has at least five observations; do not apply it to without-replacement card draws.

4. **Use the binary Wald-Wolfowitz runs test.** Binary sources use their two symbols directly. Multi-symbol sources are mapped to below/above the alphabet midpoint solely for this diagnostic. The normal approximation is reported only for at least 20 observations, both projected symbol counts strictly greater than 10, and an observed one-side proportion within `2/√n` of one half. The two-sided p-value uses `alpha = 0.01`; without-replacement card draws are unavailable. Smaller projected counts are unavailable because this ADR does not implement the NIST critical-value tables.

5. **Use lag-one serial correlation.** Report the NIST lag-one autocorrelation over the observed sequence when there are at least three observations with non-zero variance. Compare it with the advisory 95% band `±1.95996/√n`; constant sequences and without-replacement card draws are unavailable. Being outside the band is evidence to inspect, not proof of a defect.

6. **Keep pattern warnings deterministic and advisory.** Warn for a run of at least six equal symbols, an ascending or descending sequence of at least four values, an alternating sequence of at least six values, or a non-constant block of at least two symbols repeated until at least four values are covered. These thresholds prompt a recording check; they do not reject entropy or establish randomness.

7. **Fail closed on malformed analyzer state.** Invalid alphabets, symbols, option values, or empty observations throw. A valid but underpowered test returns an explicit unavailable reason. P1.2 does not silently substitute a different alphabet, infer missing samples, or turn an unavailable test into a pass.

8. **Keep P1.2 advisory and leave generation gates to P1.3.** The Entropy Lab health state is live evidence about a recording. It does not block the current Mix entropy control and does not require an acknowledgement. Seed Forge (P1.3) owns any future below-target generation block and marginal-state acknowledgement; P1.2 must not infer that boundary before the seed-generation path exists.

### Remediation clarification (2026-08-09)

The independent review of PR #35 found that the specification's earlier state-table behaviour was written as if a generation path already existed. The current contract is now explicit: P1.2 reports the non-overlapping states and remains advisory; P1.3 will implement the generation boundary. This clarification does not alter P1.1's integer accounting or the cold/warm boundary.

## Rationale

The formulas are simple enough to audit against independent reference material while being honest about what finite samples can establish. The minimum expected-count rule prevents a chi-square p-value from being presented outside its useful approximation. The runs and correlation preconditions make the UI say "not available" instead of manufacturing confidence from a tiny or degenerate sample. Treating cards separately avoids applying iid tests to a permutation.

Keeping this layer advisory preserves the stronger guarantee already implemented by P1.1: the user can inspect evidence about their recording without a statistical result becoming an accidental security gate or a claim that a platform RNG has been verified. Leaving generation policy to P1.3 avoids pretending that the current Mix entropy surface is a seed-generation boundary.

## Consequences

### Positive

- The UI has reproducible, reviewable definitions for every P1.2 diagnostic.
- Physical/manual evidence is separated from device-RNG simulations.
- Small, skewed, constant, and without-replacement samples fail closed or explain why a test is unavailable.
- The analyzer remains independent of the secret-bearing P1.1 accumulator and can be unit-tested with published statistical formulas.

### Negative and risks

- The empirical estimate can overstate the true source entropy when a finite sample misses a high-probability outcome; the UI must keep calling it an estimate.
- A passing test is absence of detected evidence, not proof of a fair source or a sound platform CSPRNG.
- The P1.2 pattern thresholds are engineering heuristics, not universal statistical cutoffs; changing them requires revisiting this ADR and its tests.

## Alternatives considered

- **Use a confidence-bound or bias-corrected entropy estimator in P1.2.** Rejected for now. It would require a validated sampling plan and a specific estimator from a separate standard; presenting a number without that validation would create false precision. P1.2 can add a separately specified estimator later.
- **Run iid tests over card permutations.** Rejected. A shuffled deck is without replacement, so its observations are dependent by construction. The exact permutation accounting remains the card source's claim; only order/pattern review is retained.
- **Use per-symbol runs tests for multi-symbol sources.** Rejected. A separate binary test per symbol multiplies interpretations and behaves poorly for sparse bins. The midpoint projection gives one clearly labeled advisory diagnostic; future alternatives need their own specification.
- **Use statistical results as the P1.1 entropy gate.** Rejected. Statistical evidence cannot replace the integer possibility-space floor or establish CSPRNG integrity.

## What would change our mind

A separately reviewed estimator and sampling protocol with independently checked vectors, or evidence that users interpret the empirical number as a guarantee despite the disclosure, would justify revisiting this decision. A future estimator must preserve explicit unavailable states and must not weaken P1.1's accounting.

## References

- [NIST runs test](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35d.htm)
- [NIST chi-square goodness-of-fit](https://itl.nist.gov/div898/handbook/eda/section3/eda35f.htm)
- [NIST autocorrelation](https://itl.nist.gov/div898/handbook/eda/section3/eda35c.htm)
- [NIST autocorrelation plot and confidence band](https://itl.nist.gov/div898/handbook/eda/section3/autocopl.htm)
- [NIST SP 800-22 Rev. 1a](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-22r1a.pdf)
