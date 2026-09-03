# ADR-0004: Aggregate prices by median, not mean

**Status:** Accepted
**Date:** 2026-08-02

---

## Context

The portfolio needs a price per asset. Several free, browser-callable sources exist: CoinGecko, Coinbase, Kraken, CoinPaprika, and DIA. Each occasionally returns stale, wrong, or wildly divergent data — thin order books, exchange outages, and API glitches all produce outliers.

A single source is a single point of failure. Multiple sources need an aggregation rule.

## Decision

Report the **median** of available sources as the headline price. Display every source individually beneath it, along with the spread between high and low, and a per-source staleness age. Flag divergence above a configurable threshold (default 1%) rather than silently averaging.

## Rationale

The median is robust to outliers; the mean is not.

With five sources at $100,000 and one broken source reporting $10,000:

- **Mean:** $85,000 — wrong by 15%, and silently so.
- **Median:** $100,000 — correct.

A single bad feed cannot move the median. It takes a majority of sources being wrong in the same direction, which is a different and much rarer failure.

Showing each source individually matters as much as the aggregation rule. A user who sees five sources agreeing has genuine confidence; a user who sees one source diverging learns something the aggregate would have hidden. Divergence is information, and averaging it away destroys that information.

## Consequences

### Positive

- One broken or stale feed cannot corrupt portfolio values.
- Users see the underlying data, not just a number to trust.
- Divergence flags surface real market conditions — thin liquidity, exchange-specific dislocations, depegs.
- Degrades gracefully: with two sources the median is their midpoint; with one, it's that source, clearly labelled.

### Negative

- Requires querying several APIs, multiplying rate-limit exposure.
- More UI complexity than a single number.
- The median of an even count is a midpoint, which reintroduces some outlier sensitivity at two sources.
- Users may ask why the figure differs from their exchange. The per-source breakdown answers this, and arguably teaches something useful.

## Notes

**CoinMarketCap cannot be included.** Their API sends no CORS headers for browser requests, and their own documentation notes that a key embedded in a browser application is stealable. Including it would require a proxy server, breaking the no-server axiom. This is worth stating explicitly because users will ask.

Sources are queried in parallel with a timeout. Failures are marked unavailable rather than retried aggressively. Rate limits are respected with backoff, and results are cached — this is a portfolio tracker, not a trading terminal.

A manual price override exists for illiquid assets no feed covers.

## Alternatives considered

**Single source.** Simplest, and a single point of failure. Rejected.

**Mean.** Rejected for the reason above.

**Volume-weighted average.** More principled in theory, but free tiers don't reliably expose volume, and it would introduce a dependency on data quality we can't verify.

**Trimmed mean.** Discard high and low, average the rest. Reasonable, but with only five sources it's nearly the median with more explaining to do.

**Let the user choose a preferred source.** Available as an override, but a poor default — it requires the user to know which source is currently reliable, which is exactly what they don't know.

## References

- [api-sources.md](../../04-reference/api-sources.md)
- [SPEC.md §7.1](../../01-spec/SPEC.md)
