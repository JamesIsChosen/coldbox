# ADR-0048: CI at the reviewed commit satisfies independent execution

**Status:** Accepted
**Date:** 2026-08-15

## Context

The review protocol requires the independent reviewer to check out the branch and
run the canonical sequence itself, varying environment and deliberately breaking
things.

The UI.4 review returned FAIL on `F3-R2` — a finding requiring that CI be
**freshly initiated by the reviewer session**. The reviewer attempted three
routes and was refused each time:

- re-running the exact-head Actions job — `HTTP 403`, no Actions write permission;
- triggering a fresh `pull_request` run by close/reopen — `HTTP 403`;
- publishing an exact-commit `REQUEST_CHANGES` review — `HTTP 403`.

It also examined its own runtime: Node v22.16.0, npm 10.9.2, Chromium, **no
Firefox and not the pinned Node v24.16.0**. It therefore correctly declined to
claim the pinned-runtime + Chromium/Firefox gate had been satisfied locally.

Exact-head CI run **#227** was successful — Ubuntu and Windows, pinned Node,
Chromium and Firefox, and cross-OS build comparison.

`F3-R2` is not a rule written in this repository. It was derived by a reviewer
from the protocol's independence language, and as applied it is unsatisfiable by
a browser-hosted reviewer with a read-only token.

## The argument

**This project's CI is stronger evidence than any single reviewer could produce.**

| CI at the reviewed commit | The reviewer's environment |
|---|---|
| ubuntu-latest **and** windows-latest | one OS |
| Node pinned via `.nvmrc`, with a confirm step | Node 22.16.0 — wrong version |
| Playwright Chromium **and** Firefox | Chromium only |
| Vendored deps verified against real upstream | not performed |
| Double-build hash within a checkout | not performed |
| **Cross-OS** build hash comparison | impossible on one machine |

Requiring local execution would substitute weaker evidence for stronger.

**"Freshly initiated" protects against nothing that SHA-pinning does not already
cover.** A GitHub Actions run's `head_sha` and conclusion are attested by GitHub
and cannot be forged by the author. A re-run of the same commit executes the same
workflow over the same tree and yields the same result. Who pressed the button is
not a property of the evidence.

The real risk is different, and worth naming precisely: **the workflow is
author-controlled.** An author can weaken `ci.yml` and point at a green run. That
is defeated by auditing the workflow **at the reviewed commit** — which a
read-only reviewer can do by reading — not by who triggered it.

The second real risk is **silent skips**: a suite that self-skips a missing
dependency reports success while checking nothing. That is defeated by asserting
a zero skip count, not by re-triggering.

## Decision

Amend the review protocol to define two reviewer modes. A reviewer that cannot
execute may use CI at the reviewed commit as its execution witness, under all of:

1. **Exact commit.** The run's `head_sha` equals the reviewed commit in full.
   Record the run ID.
2. **Audit the workflow at that commit.** Confirm it runs the canonical commands
   and name the ones confirmed. An unaudited green run proves only that the
   author's chosen commands succeeded.
3. **No silent skips.** Zero skipped tests in every required suite, or each skip
   named and treated as unverified.
4. **Who triggered it is immaterial**, provided 1 and 2 hold.
5. **CI never covers what CI cannot reach.** Manual device matrix, clean-directory
   execution, offline operation, and any human-observed security behaviour remain
   separate and are recorded as such.

`F3-R2` is superseded by this ADR for the reviewer-initiation clause only. Every
other requirement in that finding stands.

## Consequences

- Cross-model, read-only review remains viable. It has already proved its worth:
  reading code catches defects that green suites do not.
- Reviewers must audit `ci.yml`, which is real work and the right work.
- Silent skips become a named, checkable failure rather than an invisible one.
- CI becomes load-bearing for review, so weakening it is now a review-visible act.

## Security note

Coldbox handles seed phrases, so the bar is higher here than in a general
project. Higher must mean **more evidence**, not an unsatisfiable procedural step.
The cold-realm properties — opaque-origin isolation, CSP inheritance, the private
`MessageChannel` handshake, vault save/load — are only established by whatever
executes them. Where CI's browser job exercises them, CI is the witness; where it
does not, they stay manual and unverified until a human runs them. No mode change
converts an unexecuted security property into a verified one.

## What would change our mind

A review citing a run ID without naming the commands it audited. That is the
rubber-stamp failure this decision risks, and it would justify reverting to
required local execution.
