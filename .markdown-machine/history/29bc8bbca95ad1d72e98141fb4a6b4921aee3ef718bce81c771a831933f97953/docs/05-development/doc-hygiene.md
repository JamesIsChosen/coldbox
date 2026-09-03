# Documentation hygiene

Stale documentation is worse than missing documentation. Missing docs make people ask; stale docs make them confident and wrong.

That matters more here than in most projects, because the docs compile into the app's Help system — a user reading a wrong instruction about backup verification can lose money acting on it.

---

## Rule 1 — every fact has exactly one home

If a fact appears in two places, it will eventually disagree with itself. Other documents **link** to the canonical location; they never restate it.

| Fact | Canonical home | Everyone else |
|---|---|---|
| Item status, what's next | [ROADMAP.md](ROADMAP.md) | Links only |
| Dependency versions and hashes | `vendor/vendor-manifest.json` (machine) → [dependencies.md](dependencies.md) (human, must match) | Links only |
| CSP allowlist | [csp-policy.md](../02-security/csp-policy.md) + the built artifact | Links only |
| Supported chains and coin types | [supported-chains.md](../04-reference/supported-chains.md) | Links only |
| Crypto primitives and parameters | [crypto-choices.md](../02-security/crypto-choices.md) | Links only |
| Vault byte layout | [vault-format.md](../01-spec/vault-format.md) | Links only |
| Entity schemas | [data-model.md](../01-spec/data-model.md) | Links only |
| Why a decision was made | [ADRs](adr/) | Links only |
| Term definitions | [glossary.md](../00-overview/glossary.md) | Links only |
| Threats defended and not | [threat-model.md](../02-security/threat-model.md) | Links only |
| Accepted future v1 security/wallet requirements | [v1-security-wallet-contract.md](../01-spec/v1-security-wallet-contract.md) | Links only; current-behavior docs change only when implementation lands |

**Applying this in practice:** before writing a fact into a document, ask whether it already lives somewhere. If it does, link. If the link would be awkward to read around, that's a signal the text should be restructured, not duplicated.

The one permitted exception is a *summary* that adds no detail and states it's a summary — for example, README listing phase names without status. A summary that carries specifics has become a duplicate.

---

## Rule 2 — anything describing the outside world carries a review date

External reality changes without touching our repo. Tax rules change, vendors ship firmware, APIs alter their terms, standards get activated. A document describing any of these is a snapshot and must say when it was taken.

These docs carry `*Last reviewed: YYYY-MM-DD*` near the top, and a maximum age:

| Doc | Max age | Why it drifts |
|---|---|---|
| [us-tax-reporting.md](../04-reference/us-tax-reporting.md) | 6 months | IRS rules and forms change annually, sometimes mid-year |
| [hardware-wallet-matrix.md](../04-reference/hardware-wallet-matrix.md) | 6 months | Firmware adds features constantly |
| [standards.md](../04-reference/standards.md) | 12 months | BIPs get activated or gain wallet support |
| [api-sources.md](../04-reference/api-sources.md) | 12 months | Free tiers, keys, and CORS policies change |
| [crypto-choices.md](../02-security/crypto-choices.md) | 12 months | OWASP guidance moves as hardware improves |
| [supported-chains.md](../04-reference/supported-chains.md) | 12 months | SLIP-44 registry grows |

Past the max age, CI emits a warning naming the document. The fix is to **re-check the sources and update the date** — not to bump the date because it's noisy. A date is a claim that someone looked.

Each of these also states in its own text that it's dated and user-maintained, so a reader who arrives directly still gets the warning.

---

## Rule 3 — documentation changes ship with the code

A PR that changes behaviour and updates docs in a follow-up is a PR that ships wrong documentation, however briefly. Help content compiles from `docs/` into the app, so a lag means the app itself is lying to users.

Same PR, always:

- Behaviour change → update the guide and the help content, all three depths
- New term → glossary entry
- Structural decision → ADR
- Status change → roadmap
- New dependency → `dependencies.md` and the provenance panel
- New endpoint → `api-sources.md` and the CSP allowlist

---

## Rule 4 — no orphan numbers

Any figure stated in prose — a bundle size, a chain count, an iteration count, a threshold — must be traceable to something authoritative, and ideally generated rather than typed.

Numbers currently asserted in prose, and their sources:

| Number | Where asserted | Source of truth |
|---|---|---|
| Bundle size total | [dependencies.md](dependencies.md) | Build output; CI reports actual |
| Chain count ("35+") | README, spec | [supported-chains.md](../04-reference/supported-chains.md) |
| SLIP-44 registered types | spec, chain-registry | The upstream registry |
| Argon2id parameters | Multiple | [crypto-choices.md](../02-security/crypto-choices.md) |
| KDF timing (~100 ms) | crypto-choices, ADR-0003 | Measured; re-verify on hardware changes |

When a number can be produced by the build, prefer that over a hand-maintained one. A generated figure cannot go stale.

---

## Rule 5 — the spec records what shipped, not what was imagined

`SPEC.md` carries a version and a `Supersedes` line. When implementation reveals the spec was wrong — which it will — **update the spec and note it in the changelog**, rather than letting the code and spec diverge silently.

A spec that describes an aspiration while the code does something else is the most expensive kind of stale doc, because reviewers check work against it.

---

## Automated checks

Wired into CI at [P0.18](ROADMAP.md):

| Check | Fails or warns |
|---|---|
| Internal links resolve | **Fail** |
| Review dates present on all dated docs | **Fail** |
| Review date within max age | Warn |
| Help content has all three depth blocks | **Fail** |
| Docs referenced in `docs/README.md` all exist, and vice versa | **Fail** |
| Roadmap item IDs referenced elsewhere exist | **Fail** |
| `dependencies.md` hashes match `vendor-manifest.json` | **Fail** |
| No `TODO` or `TBD` in user-facing docs | Warn |

Link checking is cheap and catches the most common decay — a file renamed, a section removed, a path changed during a refactor.

---

## What a reviewer checks

Per [review-protocol.md](review-protocol.md), and remembering that **any finding is a FAIL**:

- Does the change contradict a doc that wasn't updated?
- Is any fact now stated in two places?
- Do the numbers in prose still match reality?
- Were dated docs touched by this change, and if so is the date updated?
- Does the help content match what the code now does?

---

## Periodic sweep

Quarterly, or when a phase completes:

1. Re-check every dated doc against its sources; update content and date.
2. Re-read the spec against what shipped.
3. Run the link checker and the doc-consistency checks.
4. Re-read the glossary — terminology drifts as code evolves.
5. Confirm no `TODO` or `TBD` survives in user-facing documentation.

Worth doing before any release, since release is the moment strangers start reading this and acting on it.
