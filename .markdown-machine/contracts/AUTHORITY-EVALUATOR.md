---
{
  "record_type": "GOVERNING_CONTRACT",
  "schema_version": 1,
  "contract_id": "MM-AUTHORITY/1",
  "distribution_only": true,
  "normative": true
  ,"reducer_outputs": ["SINGLETON", "AUTHORITY_FORK_UNRESOLVED", "AUTHORITY_CURRENTNESS_UNKNOWN", "NO_PROVABLE_LINEAGE"]
  ,"operators": ["VALIDATE_GENESIS_BASE", "REDUCE_AUTHORITY_HEAD", "REPLAY_SINGLETON_CHILDREN", "REPLAY_FORK_RESOLUTION", "TASK_BINDING_MUTATION_ALLOWED", "RESULT_ACCEPT_LINKS_CURRENT_TASK", "APPLY_ORDINARY_BINDINGS", "BINDING_REDUCER", "CAPABILITY_FLOOR_ALGORITHM", "CURRENT_BINDING_STATE_VALID", "CURRENT_AUTHORITY_STATE_VALID", "KERNEL_MIGRATION_CUTOVER_VALID", "FORK_RESOLUTION_VALID", "FORK_RESOLUTION_PUBLICATION_GUARANTEE", "REPOSITORY_CURRENTNESS_VALID", "CANDIDATE_SHAPE_VALID", "ADOPTION_ELIGIBLE", "SOURCE_FREE_CLOSURE", "HISTORICAL_CLOSURE_VALID", "NO_HANDOFF_AUTHORITY_REFERENCE", "NO_SELF_AUTHORIZATION"]
  ,"transition_families": ["INTENT_ACCEPT", "INTENT_SUPERSEDE", "CAPABILITY_BIND", "CAPABILITY_SUSPEND", "CAPABILITY_MIGRATE", "LIFECYCLE_PUBLISH", "RUN_HORIZON_RAISE", "RUN_HORIZON_LOWER", "TASK_AUTHORIZE", "TASK_CANCEL", "REVIEW_AUTHORIZE", "RESULT_ACCEPT", "STOP", "RESUME", "CONVERGENCE_EXTEND", "AUTHORITY_FORK_RESOLVE", "KERNEL_MIGRATE"]
  ,"transition_admission_shape_source": "MM-GOVERNING-RECORDS/1#transition_families"
  ,"human_subject_type_filter_source": "MM-GOVERNING-RECORDS/1#human_subject_type_filter_by_statement_class"
  ,"candidate_shape_sources": [{"role":"GRAMMAR","path":"project-runtime/RECORD-GRAMMAR.md","required_record_type":"GOVERNING_CONTRACT"},{"role":"GOVERNING_REGISTRY","path":"project-runtime/GOVERNING-RECORD-CONTRACTS.md","required_record_type":"GOVERNING_RECORD_CONTRACT_REGISTRY"}]
  ,"candidate_shaped_binding_types_default": ["DISTRIBUTION_ORIGIN","KERNEL_MANIFEST"]
  ,"operator_registry": {
    "REPLAY_SINGLETON_CHILDREN": {"input_vocabulary":["PROJECT_GENESIS_PROJECTION","AUTHORITY_TRANSITION_PROJECTION","INERT_CANDIDATE_PROJECTION","REPOSITORY_OBSERVATION_PROJECTION"],"output_vocabulary":["SINGLETON","AUTHORITY_FORK_UNRESOLVED","head_set"],"output_fields":["authority_reduction","head_set","fork_set"]},
    "REPLAY_FORK_RESOLUTION": {"input_vocabulary":["AUTHORITY_FORK_PROJECTION","FORK_RESOLUTION_PLAN_PROJECTION","ENFORCEMENT_ASSESSMENT_PROJECTION","REPOSITORY_OBSERVATION_PROJECTION"],"output_vocabulary":["SINGLETON","AUTHORITY_FORK_UNRESOLVED","ADMIT","REJECT"],"output_fields":["authority_reduction","admission_decision"]},
    "TASK_BINDING_MUTATION_ALLOWED": {"input_vocabulary":["CURRENT_TASK_MAP_PROJECTION","REVIEW_PREDICATE_PROJECTION"],"output_vocabulary":["ADMIT","REJECT","task_map_delta"],"output_fields":["admission_decision","task_map_delta"]},
    "RESULT_ACCEPT_LINKS_CURRENT_TASK": {"input_vocabulary":["CURRENT_TASK_MAP_PROJECTION","REVIEW_PREDICATE_PROJECTION"],"output_vocabulary":["ADMIT","REJECT"],"output_fields":["admission_decision"]},
    "APPLY_ORDINARY_BINDINGS": {"input_vocabulary":["CURRENT_TASK_MAP_PROJECTION","REVIEW_PREDICATE_PROJECTION"],"output_vocabulary":["ADMIT","REJECT","task_map_delta"],"output_fields":["admission_decision","task_map_delta"]},
    "BINDING_REDUCER": {"input_vocabulary":["CURRENT_TASK_MAP_PROJECTION","REVIEW_PREDICATE_PROJECTION"],"output_vocabulary":["BOUND","UNBOUND"],"output_fields":["binding_reduction"]},
    "CAPABILITY_FLOOR_ALGORITHM": {"input_vocabulary":["SELECTED_CAPABILITY_PROJECTION"],"output_vocabulary":["PASS","REJECT"],"output_fields":["capability_floor_decision"]},
    "VALIDATE_GENESIS_BASE": {"input_vocabulary":["OWN_LAW_PROJECTION","ADOPTION_SUBJECT_PROJECTION","CANDIDATE_ORIGIN_PROJECTION","HUMAN_STATEMENT_PROJECTION"],"output_vocabulary":["NO_PROVABLE_LINEAGE","SINGLETON","REJECT"],"output_fields":["lineage_status","authority_reduction"]},
    "ADOPTION_ELIGIBLE": {"input_vocabulary":["OWN_LAW_PROJECTION","OLD_LAW_MIGRATION_PROJECTION","OLD_LAW_PREDICATE_PROJECTION","SHAPE_VALIDATION_PROJECTION","ADOPTION_SUBJECT_PROJECTION","HUMAN_STATEMENT_PROJECTION"],"output_vocabulary":["ELIGIBLE","REJECT","lineage_status"],"output_fields":["adoption_decision","lineage_status"]},
    "KERNEL_MIGRATION_CUTOVER_VALID": {"input_vocabulary":["OWN_LAW_PROJECTION","CANDIDATE_ORIGIN_PROJECTION","SHAPE_VALIDATION_PROJECTION","OLD_LAW_PREDICATE_PROJECTION","HUMAN_STATEMENT_PROJECTION"],"output_vocabulary":["ADMIT","REJECT","NO_MIGRATION_REQUIRED"],"output_fields":["migration_decision","admission_decision"]},
    "SOURCE_FREE_CLOSURE": {"input_vocabulary":["SOURCE_AVAILABILITY_PROJECTION","AUTHORITY_RECOVERY_PROJECTION","CURRENT_TASK_MAP_PROJECTION","ATTEMPT_ELIGIBILITY_PROJECTION","SELECTED_CAPABILITY_PROJECTION"],"output_vocabulary":["PASS","REJECT","cold_resume"],"output_fields":["cold_resume","closure_status"],"closure_operator_dependencies":["ATTEMPT_EXECUTION_ELIGIBILITY","REQUIRE_STOP_STATE","BINDING_REDUCER","CAPABILITY_FLOOR_ALGORITHM"]}
  }
  ,"transition_admission_shapes": {"ordinary_predecessor":{"min":1,"max":1},"ordinary_forbidden_fields":["fork_base_ref","competing_head_refs","selected_winner_ref"],"fork_resolve_predecessor":{"min":2,"max":100},"fork_resolve_required_fields":["predecessor_refs","fork_base_ref","competing_head_refs","selected_winner_ref"],"fork_structure":{"predecessor_refs":"EXACT_COMPLETE_VISIBLE_COMPETING_HEAD_SET","competing_head_refs":"EXACT_SAME_SET_AS_PREDECESSOR_REFS","fork_base_ref":"EXACT_COMMON_FORK_BASE","selected_winner_ref":"ONE_MEMBER_OF_COMPETING_HEAD_SET","authority_epoch":"MAX_PREDECESSOR_EPOCH_PLUS_ONE","sequence":"ZERO"},"human_authority":{"KERNEL_MIGRATE":"MIGRATION_APPROVAL","CAPABILITY_MIGRATE":"MIGRATION_APPROVAL","AUTHORITY_FORK_RESOLVE":"FORK_RESOLUTION_APPROVAL","INTENT_ACCEPT":"INTENT_CONFIRMATION","INTENT_SUPERSEDE":"INTENT_CONFIRMATION","RUN_HORIZON_RAISE":"INTENT_CONFIRMATION","CONVERGENCE_EXTEND":"CONVERGENCE_EXTENSION","STOP":"STOP","RESUME":"RESUME"},"human_statement_consumers":{"GOAL":["PROJECT_GENESIS"],"INTENT_CONFIRMATION":["INTENT_ACCEPT","INTENT_SUPERSEDE","RUN_HORIZON_RAISE"],"STOP":["STOP"],"RESUME":["RESUME"],"CONVERGENCE_EXTENSION":["CONVERGENCE_EXTEND"],"MIGRATION_APPROVAL":["KERNEL_MIGRATE","CAPABILITY_MIGRATE","ADOPTION"],"FORK_RESOLUTION_APPROVAL":["AUTHORITY_FORK_RESOLVE"],"EXECUTION_APPROVAL":[],"OTHER":[]}}
}
---
# MM-AUTHORITY/1

This is the canonical authority-admission, binding, currentness, and
migration evaluator. It is structured semantics; `RUNTIME.md` is the sole
narrative explanation.

## 1. Authority transition rules

`AUTHORITY_TRANSITION` is admitted only from the exact current head, has one
predecessor except for `AUTHORITY_FORK_RESOLVE`, and cites exact candidate
records before those records become current. A transition cannot cite its own
digest or a repository-sync observation. Positive authority is the admitted
chain, never Git or file presence.

The ordinary transition families are exactly the closed families in the
governing transition table: `INTENT_ACCEPT`, `INTENT_SUPERSEDE`,
`CAPABILITY_BIND`, `CAPABILITY_SUSPEND`, `CAPABILITY_MIGRATE`,
`LIFECYCLE_PUBLISH`, `RUN_HORIZON_RAISE`, `RUN_HORIZON_LOWER`,
`TASK_AUTHORIZE`, `TASK_CANCEL`, `REVIEW_AUTHORIZE`, `RESULT_ACCEPT`, `STOP`,
`RESUME`, `CONVERGENCE_EXTEND`, `AUTHORITY_FORK_RESOLVE`, and
`KERNEL_MIGRATE`. Each family has a closed binding cardinality, human statement
class, predecessor rule, preconditions, and operation-floor interaction.

Human subject binding is closed by the governing filter and consumed as follows:

| Statement class | Allowed target record types | Consuming transitions/operations |
|---|---|---|
| `GOAL` | `PROJECT_GENESIS`, `INTENT_BASELINE`, `CONVERGENCE_ROOT` | `PROJECT_GENESIS` |
| `INTENT_CONFIRMATION` | `INTENT_BASELINE`, `RUN_HORIZON`, `REPOSITORY_BINDING` | `INTENT_ACCEPT`, `INTENT_SUPERSEDE`, `RUN_HORIZON_RAISE` |
| `STOP` | `PROJECT_GENESIS`, `AUTHORITY_TRANSITION` | `STOP` |
| `RESUME` | `PROJECT_GENESIS`, `AUTHORITY_TRANSITION` | `RESUME` |
| `CONVERGENCE_EXTENSION` | `CONVERGENCE_EXTENSION` | `CONVERGENCE_EXTEND` |
| `MIGRATION_APPROVAL` | `DISTRIBUTION_ORIGIN`, `EXTERNAL_SUBJECT`, `KERNEL_MANIFEST`, `CAPABILITY_BINDING`, `OPERATION_CONTRACT` | `KERNEL_MIGRATE`, `CAPABILITY_MIGRATE`, `ADOPTION` |
| `FORK_RESOLUTION_APPROVAL` | `AUTHORITY_TRANSITION` | `AUTHORITY_FORK_RESOLVE` |
| `EXECUTION_APPROVAL` | `TASK_CONTRACT`, `OPERATION_CONTRACT` | none in the transition registry |
| `OTHER` | none | none |

For `KERNEL_MIGRATE`, the exact current-human subject set is one candidate
`DISTRIBUTION_ORIGIN` plus one candidate `KERNEL_MANIFEST`. For `ADOPTION`, it
is one `EXTERNAL_SUBJECT` plus one candidate `KERNEL_MANIFEST`. No fixture or
candidate-origin shorthand changes these target types.

`AUTHORITY_FORK_RESOLVE` must carry `predecessor_refs` equal to the complete
visible competing-head set, carry the exact `fork_base_ref`, identify the
selected winner, set epoch to one greater than the maximum parent epoch, and
preserve all required bindings. Its non-peer enforcement evidence must prove
canonical single-winner cutover. Before any successor transition, a fresh
`REPOSITORY_SYNCED` observation must contain the resolution record; a
`LOCAL_ONLY` binding requires the durable head itself to contain it.

## 2. Repository-head currentness

Definitions: governed tree means `.markdown-machine/`; persistence ref is
`REPOSITORY_BINDING.persistence_ref`; durable head is the commit resolved by
that ref; fresh observation is produced by the evaluating session's own
readback.

1. An authority file absent from the durable head commit is an inert candidate.
2. A local HEAD that is not the persistence-ref commit or an ancestor-consistent
   fast-forward yields `AUTHORITY_CURRENTNESS_UNKNOWN` and denies substantive
   execution.
3. Replay structurally valid admitted children from bootstrap Genesis: zero
   children keeps the head, one advances it, and more than one yields the exact
   `AUTHORITY_FORK_UNRESOLVED` head set.
4. A local-only project is current when its durable head is sufficient and its
   writer model is `SINGLE_WRITER`.
5. With `PUSH_ON_BOUNDED_CLOSEOUT`, obtain a fresh observation before
   substantive execution. `REPOSITORY_SYNCED` is current;
   `LOCAL_AHEAD_REMOTE` is current for `SINGLE_WRITER` and denied for
   `MULTI_WRITER`; remote-ahead, diverged, unknown, and blocked states deny.
   Reconcile without force, then replay; fetched children may expose a fork.
6. A failed push leaves `LOCAL_AHEAD_REMOTE`; no failure record is authoritative.
7. STOP remains governed by STOP semantics and cannot be released by an
   observation.

## 3. Reducer outputs

The reducer output set is exactly `SINGLETON`, `AUTHORITY_FORK_UNRESOLVED`,
`AUTHORITY_CURRENTNESS_UNKNOWN`, and `NO_PROVABLE_LINEAGE`.

`NO_PROVABLE_LINEAGE` is relative to the law being applied when no Genesis is
admitted by that law. It is never execution-eligible or a migration prestate.
`LATE_PRE_CUTOVER_BRANCH` describes a later transition from an older epoch that
is not an ancestor of the current epoch base; it cannot revive authority.

## 4. Migration

`KERNEL_MIGRATE` is ordinary single-parent authority. It requires a singleton,
exact candidate Origin and KernelManifest, coherent atomic bindings, preserved
Tasks/reviews/convergence/barriers/human intent, source-free semantic closure,
and a current-human `MIGRATION_APPROVAL` whose subject set exactly names the
candidate `DISTRIBUTION_ORIGIN` and candidate `KERNEL_MANIFEST`. Identical current
origin/manifest with no drift returns `NO_MIGRATION_REQUIRED`; candidate shape
validation never supplies this approval.

Candidate-current objects—the candidate Origin, candidate KernelManifest, and
records named by the candidate's `candidate_shaped_binding_types`—are
shape-validated under the candidate grammar and governing registry resolved
from the fixed Origin-bound paths `project-runtime/RECORD-GRAMMAR.md` and
`project-runtime/GOVERNING-RECORD-CONTRACTS.md`. The Origin is checked only for
the minimal `{governing_sources:[{path,sha256}]}` shape needed to locate those
bytes; candidate-law source-membership predicates are not admission authority.
Every other question, including authority, predecessor, structure, approval,
source membership, barriers, preservation, and old-current state, is evaluated
under the old law. Candidate shape semantics never authorize cutover.

`KERNEL_MIGRATION_CUTOVER_VALID` resolves the candidate shape sources by this
closed procedure: (1) minimally validate the bound candidate Origin as a list
of `{path,sha256}` governing sources; (2) find exactly one Origin item for each
fixed candidate-shape path, resolve bytes whose SHA-256 equals that item, and
require the declared record type `GOVERNING_CONTRACT` for the grammar and
`GOVERNING_RECORD_CONTRACT_REGISTRY` for the registry; (3) use
`KERNEL_MANIFEST.candidate_shaped_binding_types` when present, otherwise
`[DISTRIBUTION_ORIGIN,KERNEL_MANIFEST]`, to choose candidate-shape validation
for bound records; and (4) evaluate every non-shape predicate under the old
law. Any missing, duplicate, mismatched, or failed shape source rejects.
Candidate registries contribute shape validation only and never an admission
verdict. Identical Origin/Manifest inputs with no drift return
`NO_MIGRATION_REQUIRED`.

`SOURCE_FREE_CLOSURE` is the cold-resume closure operator. Given an assembled
contract set and granted current state, it passes only when: (a) every
assembled file parses under the assembled grammar and carries its declared
`profile_id`, `registry_id`, or `contract_id`; (b) every contract-key reference
and typed target identity resolves exactly within the assembled set; (c) the
operator closure of attempt-execution eligibility, `REQUIRE_STOP_STATE`, the
binding reducer, and the capability-floor algorithm resolves entirely to
operators in that set; (d) the selected capability export's
`operation_floor_profile_id` resolves to
`MM-GOVERNING-RECORDS/1#floors`; and (e) no reference targets a path outside
`.markdown-machine/`. The evaluator records `{target_path,sha256}` for every
assembled file; source availability is hidden only after assembly. The
expected cold-resume result is `cold_resume: PASS`.

Adoption uses this same migration authorization rule: the current human
statement must be a `MIGRATION_APPROVAL` whose subject set exactly names the
`EXTERNAL_SUBJECT` adoption subject and candidate `KERNEL_MANIFEST`. Adoption does not introduce a
second human-control operation or permit candidate bytes to supply the
approval.

## 5. Existing-project dispatch

For an existing subject and human-selected candidate, probe bytes only to find
an own law: a `KERNEL_MANIFEST` whose admission-contract reference resolves
within the subject to the `GOVERNING_CONTRACT` whose `contract_id` is
`MM-AUTHORITY/1` (or a historical retired-law equivalent), with a Genesis
binding that manifest by digest. Do not semantically evaluate old bytes during
this probe.

If an own-law subject recovers as `SINGLETON`, evaluate `KERNEL_MIGRATE` under
that law. An admit is ordinary migration. A block/reject is adoption-eligible
only when every non-shape predicate passed and the failures are exclusively
candidate-shape checks; its lineage status is
`PROVABLE_UNDER_RETIRED_LAW`. Any barrier, authority, structure, approval,
trust, preservation, or genuine incompatibility failure rejects adoption. A
fork is resolved under its own law first. `NO_PROVABLE_LINEAGE` under a claimed
law means the subject is treated as having no law.

With no own law, apply the candidate reducer. `NO_PROVABLE_LINEAGE` may admit
adoption with lineage status `HISTORICAL_UNVERIFIED`. Adoption is never an
escape hatch: if the own law can admit the candidate, or rejects for any reason
other than candidate shape, adoption is rejected. No compatibility intermediary
or second authority plane exists in this contract.

## 6. Closed operator and predicate registry

The operator registry includes every name in the front-matter `operators`
list, including the projection-tested `REPLAY_SINGLETON_CHILDREN`,
`REPLAY_FORK_RESOLUTION`, `TASK_BINDING_MUTATION_ALLOWED`,
`RESULT_ACCEPT_LINKS_CURRENT_TASK`, `APPLY_ORDINARY_BINDINGS`,
`ADOPTION_ELIGIBLE`, and `SOURCE_FREE_CLOSURE` operators. Unknown names
reject. The evaluator is finite, source-free, and digest-bound; repository
state can satisfy only durability or currentness evidence predicates.
