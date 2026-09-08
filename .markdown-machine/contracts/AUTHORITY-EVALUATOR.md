---
{
  "record_type": "GOVERNING_CONTRACT",
  "schema_version": 1,
  "contract_id": "MM-AUTHORITY/1",
  "distribution_only": true,
  "normative": true,
  "reducer_outputs": [
    "SINGLETON",
    "AUTHORITY_FORK_UNRESOLVED",
    "AUTHORITY_CURRENTNESS_UNKNOWN",
    "NO_PROVABLE_LINEAGE"
  ],
  "transition_admission_shape_source": "MM-GOVERNING-RECORDS/1#transition_families",
  "human_subject_type_filter_source": "MM-GOVERNING-RECORDS/1#human_subject_type_filter_by_statement_class",
  "candidate_shape_sources": [
    {
      "role": "GRAMMAR",
      "path": "project-runtime/RECORD-GRAMMAR.md",
      "required_record_type": "GOVERNING_CONTRACT"
    },
    {
      "role": "GOVERNING_REGISTRY",
      "path": "project-runtime/GOVERNING-RECORD-CONTRACTS.md",
      "required_record_type": "GOVERNING_RECORD_CONTRACT_REGISTRY"
    }
  ],
  "candidate_shaped_binding_types_default": [
    "DISTRIBUTION_ORIGIN",
    "KERNEL_MANIFEST"
  ],
  "operator_registry": {
    "VALIDATE_GENESIS_BASE": {
      "input_vocabulary": [
        "OWN_LAW_PROJECTION",
        "ADOPTION_SUBJECT_PROJECTION",
        "CANDIDATE_ORIGIN_PROJECTION",
        "HUMAN_STATEMENT_PROJECTION"
      ],
      "output_vocabulary": [
        "NO_PROVABLE_LINEAGE",
        "SINGLETON",
        "REJECT"
      ],
      "output_fields": [
        "lineage_status",
        "authority_reduction"
      ]
    },
    "REPLAY_SINGLETON_CHILDREN": {
      "input_vocabulary": [
        "PROJECT_GENESIS_PROJECTION",
        "AUTHORITY_TRANSITION_PROJECTION",
        "INERT_CANDIDATE_PROJECTION",
        "REPOSITORY_OBSERVATION_PROJECTION"
      ],
      "output_vocabulary": [
        "SINGLETON",
        "AUTHORITY_FORK_UNRESOLVED",
        "head_set"
      ],
      "output_fields": [
        "authority_reduction",
        "head_set",
        "fork_set"
      ]
    },
    "REPLAY_FORK_RESOLUTION": {
      "input_vocabulary": [
        "AUTHORITY_FORK_PROJECTION",
        "FORK_RESOLUTION_PLAN_PROJECTION",
        "ENFORCEMENT_ASSESSMENT_PROJECTION",
        "REPOSITORY_OBSERVATION_PROJECTION"
      ],
      "output_vocabulary": [
        "SINGLETON",
        "AUTHORITY_FORK_UNRESOLVED",
        "ADMIT",
        "REJECT"
      ],
      "output_fields": [
        "authority_reduction",
        "admission_decision"
      ]
    },
    "TASK_BINDING_MUTATION_ALLOWED": {
      "input_vocabulary": [
        "CURRENT_TASK_MAP_PROJECTION",
        "REVIEW_PREDICATE_PROJECTION"
      ],
      "output_vocabulary": [
        "ADMIT",
        "REJECT",
        "task_map_delta"
      ],
      "output_fields": [
        "admission_decision",
        "task_map_delta"
      ]
    },
    "RESULT_ACCEPT_LINKS_CURRENT_TASK": {
      "input_vocabulary": [
        "CURRENT_TASK_MAP_PROJECTION",
        "REVIEW_PREDICATE_PROJECTION"
      ],
      "output_vocabulary": [
        "ADMIT",
        "REJECT"
      ],
      "output_fields": [
        "admission_decision"
      ]
    },
    "APPLY_ORDINARY_BINDINGS": {
      "input_vocabulary": [
        "CURRENT_BINDING_PROJECTION",
        "AUTHORITY_TRANSITION_PROJECTION",
        "CURRENT_TASK_MAP_PROJECTION",
        "REVIEW_PREDICATE_PROJECTION"
      ],
      "output_vocabulary": [
        "ADMIT",
        "REJECT",
        "binding_delta",
        "task_map_delta"
      ],
      "output_fields": [
        "admission_decision",
        "binding_delta",
        "task_map_delta"
      ]
    },
    "BINDING_REDUCER": {
      "input_vocabulary": [
        "ADMITTED_AUTHORITY_PROJECTION",
        "CURRENT_TASK_MAP_PROJECTION",
        "CURRENT_REVIEW_PROJECTION"
      ],
      "output_vocabulary": [
        "BOUND",
        "UNBOUND",
        "CURRENT_BINDING_PROJECTION"
      ],
      "output_fields": [
        "binding_reduction",
        "current_bindings"
      ]
    },
    "CAPABILITY_FLOOR_ALGORITHM": {
      "input_vocabulary": [
        "SELECTED_CAPABILITY_PROJECTION",
        "CURRENT_TASK_MAP_PROJECTION",
        "OPERATION_CONTRACT_PROJECTION",
        "CURRENT_REVIEW_PROJECTION",
        "CURRENT_HUMAN_AUTHORITY_PROJECTION",
        "CURRENT_EFFECT_PROJECTION",
        "CURRENT_RESOURCE_PROJECTION",
        "RUN_HORIZON_PROJECTION",
        "REPOSITORY_CURRENTNESS_PROJECTION"
      ],
      "output_vocabulary": [
        "PASS",
        "REJECT",
        "HUMAN_DECISION_REQUIRED",
        "UNDECLARED_EFFECT"
      ],
      "output_fields": [
        "capability_floor_decision"
      ]
    },
    "ADOPTION_ELIGIBLE": {
      "input_vocabulary": [
        "OWN_LAW_PROJECTION",
        "OLD_LAW_MIGRATION_PROJECTION",
        "OLD_LAW_PREDICATE_PROJECTION",
        "SHAPE_VALIDATION_PROJECTION",
        "ADOPTION_SUBJECT_PROJECTION",
        "HUMAN_STATEMENT_PROJECTION"
      ],
      "output_vocabulary": [
        "ELIGIBLE",
        "REJECT",
        "lineage_status"
      ],
      "output_fields": [
        "adoption_decision",
        "lineage_status"
      ]
    },
    "KERNEL_MIGRATION_CUTOVER_VALID": {
      "input_vocabulary": [
        "OWN_LAW_PROJECTION",
        "CANDIDATE_ORIGIN_PROJECTION",
        "CANDIDATE_KERNEL_MANIFEST_PROJECTION",
        "SHAPE_VALIDATION_PROJECTION",
        "OLD_LAW_PREDICATE_PROJECTION",
        "PRESERVATION_PROJECTION",
        "HUMAN_STATEMENT_PROJECTION"
      ],
      "output_vocabulary": [
        "ADMIT",
        "REJECT",
        "NO_MIGRATION_REQUIRED"
      ],
      "output_fields": [
        "migration_decision",
        "admission_decision"
      ]
    },
    "SOURCE_FREE_CLOSURE": {
      "input_vocabulary": [
        "SOURCE_AVAILABILITY_PROJECTION",
        "AUTHORITY_RECOVERY_PROJECTION",
        "CURRENT_TASK_MAP_PROJECTION",
        "ATTEMPT_ELIGIBILITY_PROJECTION",
        "SELECTED_CAPABILITY_PROJECTION",
        "RECOVERY_REDUCER_PROJECTION"
      ],
      "output_vocabulary": [
        "PASS",
        "REJECT",
        "cold_resume"
      ],
      "output_fields": [
        "cold_resume",
        "closure_status"
      ],
      "closure_operator_dependencies": [
        "ATTEMPT_EXECUTION_ELIGIBILITY",
        "REQUIRE_STOP_STATE",
        "BINDING_REDUCER",
        "CAPABILITY_FLOOR_ALGORITHM"
      ]
    }
  },
  "operator_rules": {
    "VALIDATE_GENESIS_BASE": {
      "evaluation_order": ["source and exact six-contract closure", "candidate origin", "human statement", "lineage"],
      "outputs": {"NO_PROVABLE_LINEAGE": "no positive lineage is provable", "SINGLETON": "exactly one valid epoch-0/sequence-0 Genesis is admitted", "REJECT": "any missing, malformed, conflicting, or own-law-admissible input"},
      "missing_or_malformed": "REJECT"
    },
    "REPLAY_SINGLETON_CHILDREN": {
      "evaluation_order": ["bounded inventory", "typed predecessor graph", "admitted transition continuity", "currentness"],
      "outputs": {"SINGLETON": "one reachable current head", "AUTHORITY_FORK_UNRESOLVED": "two or more distinct reachable heads", "head_set": "the exact sorted set of reachable heads"},
      "empty_or_invalid": "NO_PROVABLE_LINEAGE or AUTHORITY_CURRENTNESS_UNKNOWN as applicable; never infer a head from file order"
    },
    "REPLAY_FORK_RESOLUTION": {
      "inputs": "complete visible competing-head set, common base, selected winner, transition, and qualifying publication evidence",
      "outputs": {"ADMIT": "all exact fork fields and evidence pass", "SINGLETON": "replayed post-resolution head is one", "AUTHORITY_FORK_UNRESOLVED": "competing set remains", "REJECT": "missing, malformed, conflicting, or non-member winner"}
    },
    "TASK_BINDING_MUTATION_ALLOWED": {
      "inputs": "current Task map, one exact Task mutation, and current Task-relevant review predicate",
      "outputs": {"ADMIT": "candidate changes only the addressed Task map entry and all predicates pass", "REJECT": "stale/multiple Task, unauthorized mutation, or unknown predicate", "task_map_delta": "the exact one-entry replacement or tombstone"},
      "empty_or_malformed": "REJECT"
    },
    "RESULT_ACCEPT_LINKS_CURRENT_TASK": {
      "inputs": "current Task map and the candidate result-accept transition's exact Task binding",
      "outputs": {"ADMIT": "exactly one current non-tombstoned Task identity and operation match", "REJECT": "zero/multiple, stale, tombstoned, or mismatched Task"}
    },
    "APPLY_ORDINARY_BINDINGS": {
      "evaluation_order": ["freeze predecessor", "validate exact binding cardinalities", "apply transition family", "reduce current bindings and Task map"],
      "outputs": {"ADMIT": "all candidate deltas are exact and transition preconditions pass", "REJECT": "otherwise", "binding_delta": "only fields authorized by the selected transition family", "task_map_delta": "only the selected Task mutation, if any"}
    },
    "BINDING_REDUCER": {
      "inputs": "admitted authority chain and exact current-binding records",
      "outputs": {"BOUND": "one current record per binding identity", "UNBOUND": "no current record", "CURRENT_BINDING_PROJECTION": "the exact reduced bindings"},
      "conflict": "UNBOUND or AUTHORITY_CURRENTNESS_UNKNOWN; equal maxima are not resolved by order"
    },
    "CAPABILITY_FLOOR_ALGORITHM": {
      "evaluation_order": ["CURRENT_TASK_AND_OPERATION", "OPERATION_CONTRACT_POLICY_RESOLVER", "REVIEW", "EFFECT", "HUMAN", "RESOURCE", "ENFORCEMENT", "CURRENTNESS"],
      "outputs": {"PASS": "all required exact inputs pass", "REJECT": "any missing, stale, unknown, conflicting, or failed input", "HUMAN_DECISION_REQUIRED": "a current human-owned intent is unresolved", "UNDECLARED_EFFECT": "planned effect is outside the closed operation/horizon relation"},
      "empty_or_malformed": "REJECT except empty planned effects, which derive effective effect floor NONE"
    },
    "ADOPTION_ELIGIBLE": {
      "outputs": {"ELIGIBLE": "only exact no-law or shape-only retired-law escape hatch passes", "REJECT": "own law admits or any barrier/authority/preservation/approval/trust failure", "lineage_status": "the exact resulting lineage classification"}
    },
    "KERNEL_MIGRATION_CUTOVER_VALID": {
      "evaluation_order": ["old-law recovery", "candidate source/provenance", "shape validation", "preservation", "current barriers", "human approval", "single-parent cutover"],
      "outputs": {"ADMIT": "all preserved current state remains equivalent under the candidate", "NO_MIGRATION_REQUIRED": "origin and manifest are identical with no drift", "REJECT": "otherwise"}
    },
    "SOURCE_FREE_CLOSURE": {
      "evaluation_order": ["export availability", "authority recovery", "current Task/Attempt", "capability floor", "recovery reducer"],
      "outputs": {"PASS": "fresh worker derives the same route without source/compiler/corpus", "REJECT": "any exported dependency is missing or a required result differs", "cold_resume": "the exact derived route and reduced state"}
    }
  },
  "precondition_output_bindings": {
    "ACTIVE_STOP_BARRIER_REQUIRED": "REQUIRE_STOP_STATE.stop_decision must equal BLOCKED and stop_classification must equal ACTIVE_QUALIFIED because exactly one or more current ACTIVE barriers are proven well-formed and eligible for RESUME; AMBIGUOUS_OR_UNKNOWN never satisfies this precondition",
    "RESULT_ACCEPT_LINKS_CURRENT_TASK": "RESULT_ACCEPT_LINKS_CURRENT_TASK.admission_decision must equal ADMIT",
    "TASK_CANCELS_CURRENT_TASK": "TASK_BINDING_MUTATION_ALLOWED.admission_decision must equal ADMIT",
    "FORK_RESOLUTION_VALID": "REPLAY_FORK_RESOLUTION.admission_decision must equal ADMIT",
    "KERNEL_MIGRATION_CUTOVER_VALID": "KERNEL_MIGRATION_CUTOVER_VALID.migration_decision must equal ADMIT"
  }
}
---
# MM-AUTHORITY/1

This is the canonical authority-admission, binding, currentness, and migration
evaluator. `operator_registry` is the sole executable operator vocabulary in
this contract. Transition family/admission shape is consumed only from
`MM-GOVERNING-RECORDS/1#transition_families`; this contract does not restate a
second transition table.

## Mechanical operator result rules

The front-matter `operator_rules` table is normative. Each operator consumes
only the listed projections and returns only its listed outputs. Missing,
malformed, multiply resolved, stale, or conflicting inputs reject, except
where that table explicitly returns `UNKNOWN` or
`AUTHORITY_CURRENTNESS_UNKNOWN`. A precondition that names an operator is
satisfied only by the exact output equality in `precondition_output_bindings`;
the operator name, a prose description, or a truthy input is not sufficient.

In particular, `ACTIVE_STOP_BARRIER_REQUIRED` is not a free-standing boolean:
it is satisfied exactly when `REQUIRE_STOP_STATE.stop_decision == BLOCKED` and
`stop_classification == ACTIVE_QUALIFIED`, because the current barrier reducer found
one or more current, well-formed `ACTIVE` barriers eligible for RESUME. An
empty, malformed, conflicting, or otherwise ambiguous barrier set has
`stop_classification == AMBIGUOUS_OR_UNKNOWN` and does not satisfy RESUME. Likewise,
`RESULT_ACCEPT_LINKS_CURRENT_TASK` and `TASK_CANCELS_CURRENT_TASK` require the
corresponding `ADMIT` output, and a fork or kernel migration precondition
requires the exact named operator's `ADMIT` output.

## 1. Authority transition admission

Positive authority is the admitted chain, never Git state or file presence.
Candidate dependency records are inert until an admitted transition binds them.

For every non-fork transition use this freshness sequence:

1. Recover current durable state and repository currentness.
2. Require one stable singleton current head.
3. Freeze that head as the proposed predecessor.
4. Stage all candidate dependency records as inert data.
5. Immediately before transition durability/admission, re-enumerate and reduce
   the durable current head with the candidate transition excluded.
6. If the head, predecessor relation, binding currentness, or repository
   currentness changed, reject the candidate transition and rebuild it from
   fresh state.
7. Persist the exact validated transition.
8. Re-enumerate and reduce durable state; file presence alone never proves
   admission.

`AUTHORITY_FORK_RESOLVE` uses the exact fork predecessor rule in the governing
transition table instead of the singleton step above.

Human subject binding is closed by the governing filter. `EXECUTION_APPROVAL`
is not an authority-transition family; its consequences are evaluated by the
operation floor algorithm and `MM-HUMAN-CONTROL/2`.

`REVIEW_REQUEST_MATCHES_CURRENT_SUBJECT` is the bounded governing precondition,
not an additional operator. Exact path/digest subjects must match their frozen
bytes. Typed record subjects must resolve exactly to an allowed family and be
current/non-inert under `BINDING_REDUCER` or the exact family reducer. Historical
or non-current bytes use path/digest subjects. Ambiguous, stale, superseded, or
multiply resolved subjects reject.

## 2. Repository-head currentness and candidate binding phase

Repository/Git state is visibility and durability evidence only. Currentness
used to establish predecessor authority is always evaluated under the
`REPOSITORY_BINDING` selected by the last already-admitted authority state.

A candidate `REPOSITORY_BINDING` may be shape-validated and persisted inertly,
but it cannot prove its own admission or predecessor currentness. Only after the
transition that binds it is admitted does it become the current binding, and
repository currentness must then be freshly re-established under that binding
before substantive execution. The existing repository-backed
bootstrap/adoption publication exception can establish candidate publication
visibility, but it creates no project authority.

An authority file absent from the durable persistence-ref commit is inert. A
local HEAD inconsistent with the admitted persistence ref yields
`AUTHORITY_CURRENTNESS_UNKNOWN`. Structural replay from bootstrap Genesis yields
one singleton head, the exact unresolved competing-head set, or no provable
lineage. For `PUSH_ON_BOUNDED_CLOSEOUT`, use a fresh observation:
`REPOSITORY_SYNCED` is current; `LOCAL_AHEAD_REMOTE` is current only for
`SINGLE_WRITER`; remote-ahead, diverged, unknown, or blocked states deny
substantive work. Reconcile without force and replay; fetched children may
expose a fork. `LOCAL_ONLY` is sufficient only for an explicitly bound
`SINGLE_WRITER`.

## 3. Fork resolution phases

Fork resolution has two distinct publication phases.

**Pre-admission:** the complete visible competing-head set, common fork base,
selected winner, exact epoch/sequence rule, and qualifying non-peer enforcement
evidence must establish that a canonical single-winner publication can be
produced. The not-yet-admitted resolution is not required already to exist at
the canonical ref.

**Post-admission:** fresh repository readback must prove the durable canonical
ref contains the admitted fork resolution. This readback is not part of the
named transition precondition; it is an existing repository-currentness barrier
after admission. No successor ordinary transition is lawful before that proof
passes. A late pre-cutover branch cannot revive authority.

## 4. Current bindings and operation floors

`BINDING_REDUCER` is the canonical current-binding reducer; prose aliases are
not executable vocabulary. It reduces current Origin, KernelManifest, intent,
horizon, capabilities, lifecycle, operations, Tasks, reviews, convergence, and
repository binding from admitted authority.

`CAPABILITY_FLOOR_ALGORITHM` is the runtime execution-eligibility evaluator.
It consumes the selected capability, exact **current admitted** Task and
OperationContract, review state, human authority, planned effects, resources,
current horizon, and repository currentness. It first resolves
`OPERATION_CONTRACT_POLICY_RESOLVER` from the exact Task-bound capability
binding and digest-bound selected capability export, then applies the single
closed floor profile in `MM-GOVERNING-RECORDS/1#floors`; capability-specific
logic remains in the selected capability export and no second floor engine
exists.

`CAPABILITY_BIND` does not invoke this Task-dependent runtime evaluator.
`BOUND_OPERATION_CONTRACTS_SATISFY_FLOORS` instead invokes the same
`OPERATION_CONTRACT_POLICY_RESOLVER` for each inert candidate OperationContract
to prove exact policy-source representability while the candidate capability and
operations remain inert.

## 5. Governed kernel migration

A healthy existing project with a provable current law uses `KERNEL_MIGRATE`,
not adoption. The old/current law owns every authority question.

Candidate-current objects—the candidate Origin, candidate KernelManifest, and
records named by the candidate's `candidate_shaped_binding_types`—may be
shape-validated only under the candidate grammar and governing registry
resolved from the fixed Origin-bound paths
`project-runtime/RECORD-GRAMMAR.md` and
`project-runtime/GOVERNING-RECORD-CONTRACTS.md`. Candidate semantics do not
supply predecessor authority, migration approval, source membership,
preservation, barriers, currentness, review applicability, STOP release, Task
authority, convergence capacity, or RepositoryBinding authority.

`KERNEL_MIGRATION_CUTOVER_VALID` therefore executes under the old/current
admitted law: exact-bind candidate Origin and KernelManifest, validate only
candidate shape with candidate semantics, prove current-human migration
approval, preserve current Tasks, review barriers/PASS applicability,
convergence roots/reservations/capacity, STOP state, effects/resources,
RepositoryBinding, lifecycle/horizon, and source-free recovery, then admit one
coherent ordinary single-parent cutover. Identical current Origin/Manifest with
no drift returns `NO_MIGRATION_REQUIRED`.

Changed or removed old validation contracts required to interpret historical
state remain byte-identical under the existing history closure. Removed v0.7
current-schema families (`RESULT_ACCEPT` record, `REPOSITORY_SYNC_INTENT`,
`OBJECTIVE_RELATION`), the old HANDOFF shape, and the v0.7
`INDEPENDENCE_ASSESSMENT` shape remain interpretable under preserved v0.7 law;
they do not silently validate as current v0.9 records. The v0.9 HANDOFF is
regenerated from current reducers. Existing review PASS evidence remains
applicable only if its exact old-law subject and independence facts remain
provable; it is never laundered through the new independence schema.

The v0.9 kernel migration also revalidates runtime provenance, convergence
quantity domains and reservation histories, intent supersession mappings,
Task-review selection, effect targets, and route dependencies under the
candidate schema. It cannot reset capacity, clear an unresolved effect,
rewrite a historical intent relation, or replace an old child capability's
resource policy. The software capability's `IMPLEMENTATION` serial path is a
`CAPABILITY_MIGRATE` policy change: existing children retain their bound
`PROJECT_SPECIFIC` requirement until that capability migration is lawfully
admitted.

Adoption is eligible only when the subject has no provable positive lineage or
the old law rejects solely on the already-defined candidate-shape escape hatch.
If the old law can admit the candidate, adoption rejects.

## 6. Source-free closure

`SOURCE_FREE_CLOSURE` uses the exported runtime, exact six admitted contracts,
current governed records, and selected capability semantics. It requires no
original compiler/distribution, hidden state, database, service, index, or prior
chat. Handoff may orient a worker but never seeds authority.
