---
{
  "record_type": "PROJECT_RUNTIME_EXPORT",
  "schema_version": 1,
  "title": "Universal Project Runtime Export",
  "project_output_eligible": true,
  "output_role": "UNIVERSAL_RUNTIME_SOURCE"
}
---
# Universal Project Runtime

This is the compact universal narrative exported into a child project's
`.markdown-machine/RUNTIME.md`. Exact structured schemas, reducers, operators,
preconditions, invariants, and floors live in the six canonical contracts.
This file exposes exactly four universal worker procedures. It is not a record
factory and cannot relax a contract.

## Canonical semantic ownership

This export owns worker procedure ordering, not a second copy of deterministic
law. Exact mechanics are read from the canonical owners: record grammar and
typed references from `MM-RECORD-GRAMMAR/1`; schemas, transitions, operation
floors, intent relations, and fixed closure from `MM-GOVERNING-RECORDS/1`;
recovery, review, convergence, effects, route closure, STOP, and HANDOFF from
`MM-RECOVERY/1`; authority, repository currentness, and migration from
`MM-AUTHORITY/1`; human statements, intent, and human STOP/RESUME boundaries
from `MM-HUMAN-CONTROL/2`; and initial Genesis admission from
`DIRECT_HUMAN_GENESIS_ADMISSION/v3`. A selected capability export remains the
owner of any capability-local policy it expressly defines. Resolve the exact
current Task-bound `OperationContract` through
`OPERATION_CONTRACT_POLICY_RESOLVER` and operation eligibility through
`CAPABILITY_FLOOR_ALGORITHM`; then invoke the named floor, reducer, and
precondition entries owned by those contracts.

## Universal procedure 1 — Recover / Reduce / Route

Use this procedure for cold continuation, meaningful context loss, ordinary
continuation, and the state-recovery portion of closeout/audit.

1. Begin at the fixed project-local `.markdown-machine/` root.
2. `HANDOFF.md`, when present, is optional orientation only. Do not use it to
   seed authority or current bindings.
3. Read `.markdown-machine/RUNTIME.md`, then
   `.markdown-machine/COMPILED-MANIFEST.md`.
4. Validate the manifest and verify its exact six contract exports. Every
   compiled child always carries all six; routine reading/loading remains
   conditional on the active procedure.
5. Establish one bounded inventory of the current governed tree. Enumerate the
   finite project-local governed namespace with an available bounded host/tool
   mechanism. If exact enumeration cannot be established, fail closed through
   authority recovery/currentness unknown.
6. Validate current record bytes, schemas, exact typed references, contract-key
   references, retained invariants, and unique contract identities against the
   exported grammar/contracts as required by the active route.
7. Replay structural authority from admitted Genesis over the bounded durable
   candidate set. Reduce one singleton head, the exact unresolved fork set, or
   deny-only unknown/no-lineage state.
8. Reduce current bindings from admitted authority.
9. Evaluate repository currentness using the `REPOSITORY_BINDING` selected by
   the last already-admitted state. A candidate binding cannot prove itself.
10. If reconciliation changes visible governed bytes, re-enumerate, replay, and
    reduce before continuing.
11. Reduce STOP.
12. Reduce lifecycle, the exact current intent envelope and Run Horizon,
    selected capabilities, current Tasks, and bound OperationContracts.
13. Reduce current Attempts, review barriers, effects, resources, and human
    authority needed by the current route.
14. Run the deterministic convergence reducer.
15. Evaluate the single operation-floor profile.
16. Apply barrier precedence and derive exactly one truthful `next_lawful`.
17. Only now compare any HANDOFF projection to the independently reduced state.
18. Stop recovery when the one truthful route has been established. Ordinary
    continuation does not escalate into a full audit merely for confidence.

For `CONTINUE`, bounded enumeration in step 5 establishes the finite governed
inventory; it is not whole-child semantic requalification. Semantic
qualification is route-sliced: establish stable singleton admitted authority,
current already-admitted bindings, repository currentness, STOP,
lifecycle, the exact current intent envelope and Run Horizon, the current
non-tombstoned Task, its exact current capability and `OPERATION_CONTRACT`,
Task-relevant review/effect/recovery state, convergence capacity, human
approval/intent state, resource/enforcement prerequisites, and barrier
precedence. The intent envelope is the complete current `INTENT_BASELINE`
items, constraints, non-goals, exact horizon, and named human statements;
technical Task context may be reduced to the smallest sufficient route slice
only after that envelope is retained. Do not semantically validate unrelated
technical state merely for confidence, and never replace the envelope with a
transformed summary, Task prose, prior chat, or model inference.

Once stable current authority and the current Task/Operation binding are
established, every higher-precedence barrier is absent, and barrier reduction is
exactly `CURRENT_TASK`, `CONTINUE` recovery MUST terminate. A discovered
inconsistency may reactivate recovery. This termination never waives the exact
execution preflight required immediately before a new Attempt commences.

Governance discovery is exact and bounded: fixed canonical surfaces, a bounded
current tree, exact typed/digest references, and finite closure traversal.
Never guess law filenames, probe fuzzy/proximity candidates, search Git objects
for governance, or treat search ranking as authority.

Authority is an admitted lineage, not file freshness. Files, timestamps,
repository observations, reviews, evidence, handoffs, inbox items, or model
output never manufacture positive authority.

## Universal procedure 2 — Construct / Validate / Admit

Use this procedure when creating a strict governed record or authority
transition.

For an ordinary strict record:

1. Select its exact family.
2. Read `contracts.<family>`, then `field_types.<family>`.
3. Apply required, optional, fixed, conditional, enum, and unknown-field rules.
4. Apply every retained invariant through its exact `invariant_bindings` entry.
5. Construct dependency records first when the schema requires them.
6. Serialize exact UTF-8/LF Markdown with one strict JSON front-matter object.
7. Persist the candidate.
8. Re-read its exact bytes and validate them again.
9. Keep it inert unless current authority lawfully admits it.

For `AUTHORITY_TRANSITION` add the mandatory freshness sequence:

1. Recover/reduce durable current state.
2. Select the exact row in `transition_families`.
3. Freeze its lawful predecessor: one current singleton, except fork resolution.
4. Stage candidate dependency records inertly.
5. Capture any required HumanStatement before the transition.
6. Evaluate every named precondition through
   `precondition_bindings`; `OPERATOR` resolves an exact admitted operator key,
   while `FINITE_RELATION` and `BOUNDED_RULE` execute only their finite rule and
   are never interpreted as operator names.
7. Construct and locally validate the candidate transition.
8. Immediately before persistence/admission, freshly re-enumerate and re-reduce
   the durable current head with the candidate transition excluded.
9. If predecessor or required currentness changed, reject and rebuild from
   fresh state.
10. Persist the transition and re-reduce durable state. File presence alone
    never proves admission.

A fork resolution obeys the governing fork row and the authority contract's
separate publication phases. `FORK_RESOLUTION_PUBLICATION_GUARANTEE` is
pre-admission only. After admission, fresh canonical repository readback is an
existing currentness barrier and blocks every ordinary successor until the
admitted resolution is durably visible.

## Universal procedure 3 — Review

Use one mechanical review lifecycle:

1. Determine the current operation review floor.
2. Freeze the exact immutable review subject: path/digest subjects, typed
   current-record subjects, or both.
3. Construct/authorize `REVIEW_REQUEST`.
4. Derive the required independence dimensions from the floor.
5. Establish reviewer eligibility with exact evidence.
6. Perform the substantive review judgment. This is the judgment boundary; the
   machine does not replace it with mechanical self-certification.
7. Record `REVIEW_RESULT`, including only the exact typed
   `independence_evidence_refs` needed when `author_independence` is required.
   SELF_CHECK with exactly empty dimensions carries no independence evidence.
8. Re-check exact subject applicability/currentness.
9. Satisfy the barrier only with an applicable PASS; otherwise remediate and
   re-review within convergence authority or route the lawful blocker.

Invoke `MM-RECOVERY/1` `REVIEW_RESULT_INDEPENDENCE_VALID` for the independence
barrier; do not replace its derived dimensions or evidence evaluation with a
stored assertion.

`SELF_CHECK` uses the exact empty independence-dimension set.
`INDEPENDENT_REQUIRED` uses exactly `author_independence` and
`subject_binding`. Dimension outcomes are mechanically derived under
`MM-RECOVERY/1`; no stored dimension/result assertion, self-declared distinct
reviewer identity, model/provider rename, or peer declaration is its own
independence proof.
`author_independence` requires qualifying exact-request/reviewer-bound mechanical
evidence; `subject_binding` is derived from the immutable ReviewRequest,
ReviewResult binding, and exact current subject applicability.

## Universal procedure 4 — Closeout

This is a terminating closeout algorithm.

1. Stop starting new substantive work.
2. Preserve/classify meaningful transient state and uncertainty.
3. Make authoritative and recovery-critical state durable.
4. Freeze the current governed path-and-byte set for this evaluation.
5. Perform source-free validation using this runtime and the exact six exported
   contracts.
6. Re-reduce complete current state and derive exactly one `next_lawful` or
   terminal result.
7. Derive `HANDOFF_PROJECTION` only from the exact mechanical projection sources
   in `MM-RECOVERY/1`; `generated_at_closeout` is descriptive.
8. Validate HANDOFF while it remains non-authoritative.
9. Publish the final HANDOFF-only governed mutation.
10. Freshly read back repository state and confirm that the only governed delta
    after the frozen evaluation is `.markdown-machine/HANDOFF.md`.
11. Close. Do not perform another closeout pass solely because HANDOFF was
    published.

The HANDOFF-only mutation is the sole frozen-set invalidation exception. Any
other governed mutation after freeze invalidates the evaluation and requires a
fresh closeout against the new durable set. This exception grants no authority
and cannot hide changes to authoritative or recovery-critical state.

## Validation purposes

The procedures above are used under four explicit purposes; these are headings,
not governed state values.

- **CONTINUE** — prove one current lawful route through route-sliced semantic
  qualification and stop; bounded inventory does not impose whole-child audit.
- **ADMIT** — validate the candidate plus affected current-state conditions.
- **CLOSEOUT** — validate the complete current governed set needed for a clean
  continuation claim.
- **AUDIT** — prove the exact broader declared subject and properties. Its
  declared burden may include whole-child qualification, corpus execution, or
  historical checks, but that burden does not attach to `CONTINUE`.

Meaningful session/context compaction requires Recover / Reduce / Route before
substantive continuation. Only durably governed facts are recoverable MM state.
Prompt text, harness instructions, or prior-chat facts do not become MM
authority merely because a worker once saw them.

## Worker boundaries and human control

Human statements are captured before the transition or execution decision that
cites them and remain immutable. Unresolved human intent belongs to the human;
derivable mechanics belong to the worker inside the admitted authority
envelope. Capability availability is not activation, skills are bounded
procedures rather than authority, and Markdown Machine remains provider-,
model-, platform-, tool-, language-, and vendor-neutral.

Intent enters through immutable `INTENT_BASELINE` records; inbox material is
candidate input until accepted intent, lifecycle revision, Task authorization,
and execution are separately established. The active route always retains the
complete current intent envelope: accepted items, constraints, non-goals, the
exact Run Horizon, and named human statements. The Run Horizon is a current
human-authorized boundary; “finish” never silently authorizes consequential
effects. A deny-only execution restriction remains a boundary on execution and
does not change the project objective.

Exact context uses canonical project-relative paths and `{path, source_digest}`
binding. Project, subtree, and exact-path context remain distinct technical
applicability mappings. Transformed context uses `CONTEXT_REPRESENTATION` with
exact provenance and is never a substitute for the intent envelope. Explicit
references use finite visited-set closure; cycles stop and unresolved required
references fail closed. Filename similarity, proximity, globbing, embedding,
or host case behavior never creates applicability.

The procedures invoke the canonical Task, Attempt, capability, review, effect,
resource, convergence, authority, and currentness rules at their stated
points. File presence, timestamps, model output, prior chat, and harness facts
never manufacture authority.

## STOP, HANDOFF, and repository currentness

STOP denies new substantive work immediately. Recover / Reduce / Route invokes
`MM-RECOVERY/1` `REQUIRE_STOP_STATE` before routing or execution; graceful STOP
permits only safe preservation, reconciliation, recovery, and closeout, while
immediate external STOP crosses no new intentional external-effect boundary.
Human RESUME intent does not release STOP until the corresponding transition is
validated and admitted under `MM-HUMAN-CONTROL/2` and `MM-AUTHORITY/1`.

`HANDOFF.md` is a non-authoritative one-screen projection. It cannot seed
authority or current state. Closeout derives and validates it through the exact
`MM-RECOVERY/1` HANDOFF projection rules; it has no `human_action_required`
field.

Repository state proves persistence/currentness only. Recover / Reduce / Route
uses the last admitted `REPOSITORY_BINDING`, and a candidate binding remains
inert until admitted. Re-read and re-reduce after reconciliation or before a
transition when the authority contract requires fresh currentness; unknown or
blocked currentness routes through recovery rather than being guessed.

## Migration, history, and adoption

A healthy supported predecessor upgrades in place through the existing
`KERNEL_MIGRATE` authority transition; it does not re-bootstrap or adopt. Stage
candidate bytes inertly, recover predecessor law/state, bind candidate Origin
and KernelManifest exactly, and route migration/adoption through
`MM-AUTHORITY/1` and the existing reconciliation procedure. Candidate semantics
validate candidate shape only until lawful cutover; predecessor questions remain
under predecessor law until then. A separate `CAPABILITY_MIGRATE` admits any
capability-local policy change, and candidate policy never authorizes itself.

Preserve predecessor bytes under their exact bound law and source identity.
Historical records, old HANDOFF or `INDEPENDENCE_ASSESSMENT` shapes, and review
evidence remain historical and are not promoted into current authority by
proximity. After cutover, regenerate HANDOFF and re-establish repository
currentness under the newly admitted binding. Adoption remains only the
existing no-provable-lineage or exact shape-only retired-law escape hatch.

## Distribution boundary

The distribution may be selected as an archive or authenticated Git source and
is bound by the existing external ContentSetDigest algorithm. The child exports
only its exact runtime, `COMPILED-MANIFEST`, all exact six governing contracts,
selected capability semantics, and actual project state. It never needs the
original compiler/distribution, verification corpus, hidden state, a database,
daemon, dynamic index, cache, or prior chat for ordinary recovery/closeout.
