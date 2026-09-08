---
{
  "record_type": "GOVERNING_CONTRACT",
  "schema_version": 1,
  "contract_id": "MM-HUMAN-CONTROL/2",
  "distribution_only": true,
  "normative": true
}
---
# MM-HUMAN-CONTROL/2

## 1. No magic words

Human control is semantic ordinary language. No reserved command, keyword,
version, or token is required or sufficient. The exact statement is captured
before the transition or execution decision that cites it and is immutable
thereafter.

## 2. Start, stop, and resume

An ordinary project goal begins fresh bootstrap. In an active project, ordinary
continuation follows current authority. A clear request to end, pause, defer,
or make work safe for session loss creates a STOP statement and triggers safe
closeout. Language forbidding further external action creates immediate
external STOP. While stopped, a clear substantive continuation request may
provide RESUME intent, but an admitted current-human RESUME transition must
release the barrier. Read-only status questions do not release STOP.

## 3. Migration

A clear request to use one specifically selected candidate distribution can
provide `MIGRATION_APPROVAL` after exact source binding. Comparison,
conditional, future, or ambiguous language does not authorize migration. The
machine decides migration versus adoption mechanically and explains the result
in plain language; no new intent is invented for adoption.

## 4. Independence and authority boundary

Unresolved intent, material risk posture, consequential effects, and human
approval remain human-owned. Derivable routing, validation, replay, and
closeout mechanics are agent-owned. A statement cannot grant more authority
than the current transition, Task, OperationContract, horizon, and effect
contracts permit.

For new execution authority, qualifying current-human assurance is exactly:

- `DIRECT_SESSION_HUMAN`;
- `PROTECTED_HUMAN_ATTESTATION`;
- `SIGNED_EXTERNAL_AUTHORITY`.

`HISTORICALLY_ACCEPTED_HUMAN_PROVENANCE` and `UNKNOWN` never grant new
execution authority.

Operation-floor consequences are finite. Human-boundary values never waive the
reserved-effect rule: whenever planned effects are nonempty and the governing
floor resolver derives `effective_effect_floor == HUMAN_RESERVED`, one qualifying
current `EXECUTION_APPROVAL` exact-bound to the current `TASK_CONTRACT` and its
current `OPERATION_CONTRACT` is required regardless of the effective policy's
`human_boundary`.
Missing, stale, ambiguous, or nonqualifying approval rejects.

The boundary-specific rules are:

- `TECHNICAL_AUTONOMY`: this boundary adds no execution-approval requirement,
  but no other authority expands and the universal reserved-effect rule still
  applies.
- `HUMAN_IF_INTENT`: relevant unresolved human-owned intent yields
  `HUMAN_DECISION_REQUIRED`; otherwise this boundary fabricates no additional
  approval requirement and does not waive the universal reserved-effect rule.
- `HUMAN_REQUIRED`: a qualifying current `EXECUTION_APPROVAL` is required.
- `HUMAN_IF_RESERVED_EFFECT`: retained compatibility/readability vocabulary.
  Planned concrete effects never need to contain the literal floor token
  `HUMAN_RESERVED`; when the effective floor is `HUMAN_RESERVED`, the universal
  reserved-effect rule requires the same approval as `HUMAN_REQUIRED`.
  Otherwise this boundary fabricates no additional approval.

A qualifying execution approval binds exactly the current `TASK_CONTRACT` and
its current `OPERATION_CONTRACT`. A statement about another revision, Task,
operation, or candidate is stale for this purpose.

## 5. Closeout

Graceful closeout starts no substantive work and preserves enough durable state
to continue without prior chat. It covers authority, lifecycle/horizon,
capabilities, Inbox, Tasks/Attempts, reviews, convergence, effects/resources,
blockers, and meaningful transient state. A clean worktree or handoff file is
not itself proof of clean closeout.
