---
{
  "record_type": "GOVERNING_RECORD_CONTRACT_REGISTRY",
  "schema_version": 1,
  "contract_id": "MM-RECOVERY/1",
  "registry_id": "MM-RECOVERY/1",
  "grammar_contract_ref": "sha256:47c61d1aa92f492afd0419e961d51777058f9148ff90b2355d7ee57d73e34e3d",
  "authoritative_contract": true,
  "project_output_eligible": true,
  "materialization_rule": "EXACT_EXPORT_REQUIRED",
  "unknown_fields": "REJECT",
  "operator_registry": {
    "ATTEMPT_EXECUTION_ELIGIBILITY": {
      "input_vocabulary": [
        "ATTEMPT_PROJECTION",
        "CURRENT_TASK_MAP_PROJECTION"
      ],
      "output_vocabulary": [
        "ELIGIBLE",
        "INELIGIBLE"
      ],
      "output_fields": [
        "attempt_eligibility_decision"
      ]
    },
    "REQUIRE_STOP_STATE": {
      "input_vocabulary": [
        "STOP_BARRIER_PROJECTION"
      ],
      "output_vocabulary": [
        "CLEAR",
        "BLOCKED",
        "NO_ACTIVE_STOP",
        "ACTIVE_QUALIFIED",
        "AMBIGUOUS_OR_UNKNOWN"
      ],
      "output_fields": [
        "stop_decision",
        "stop_classification"
      ]
    },
    "REQUIRE_CURRENT_TASK_BINDING": {
      "input_vocabulary": [
        "CURRENT_TASK_MAP_PROJECTION",
        "ATTEMPT_PROJECTION"
      ],
      "output_vocabulary": [
        "ELIGIBLE",
        "REJECT"
      ],
      "output_fields": [
        "binding_decision"
      ]
    },
    "APPLY_TASK_CANCEL_TOMBSTONE": {
      "input_vocabulary": [
        "CURRENT_TASK_MAP_PROJECTION",
        "TASK_TOMBSTONE_PROJECTION",
        "ATTEMPT_PROJECTION"
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
    "REVIEW_RESULT_INDEPENDENCE_VALID": {
      "input_vocabulary": [
        "REVIEW_REQUEST_PROJECTION",
        "OPERATION_CONTRACT_PROJECTION",
        "REVIEW_RESULT_PROJECTION",
        "ENFORCEMENT_ASSESSMENT_PROJECTION",
        "RECOVERY_PROOF_PROJECTION",
        "CURRENT_SUBJECT_APPLICABILITY_PROJECTION"
      ],
      "output_vocabulary": [
        "PASS",
        "FAIL",
        "UNKNOWN"
      ],
      "output_fields": [
        "independence_decision"
      ]
    },
    "ADMITTED_RESUME_TRANSITION_PROVEN": {
      "input_vocabulary": [
        "STOP_BARRIER_PROJECTION",
        "AUTHORITY_DESCENDANT_PROJECTION"
      ],
      "output_vocabulary": [
        "ADMIT",
        "REJECT"
      ],
      "output_fields": [
        "resume_decision"
      ]
    },
    "EFFECT_DEFINITE_NON_MATERIALIZATION_PROVEN": {
      "input_vocabulary": [
        "EFFECT_CLAIM_PROJECTION",
        "RECOVERY_PROOF_PROJECTION"
      ],
      "output_vocabulary": [
        "DEFINITELY_NOT_MATERIALIZED",
        "EXTERNAL_EFFECT_UNKNOWN",
        "REJECT"
      ],
      "output_fields": [
        "effect_resolution"
      ]
    },
    "EVALUATE_NEW_RESERVATION": {
      "input_vocabulary": [
        "CONVERGENCE_TRANCHE_PROJECTION",
        "CONVERGENCE_RESERVATION_PROJECTION",
        "CONVERGENCE_REDUCER_PROJECTION"
      ],
      "output_vocabulary": [
        "RESERVED",
        "REJECT",
        "capacity_delta"
      ],
      "output_fields": [
        "reservation_decision",
        "capacity_delta"
      ]
    }
  },
  "operator_rules": {
    "REQUIRE_STOP_STATE": {
      "evaluation_order": ["inventory stop barriers", "select current revision per barrier_id", "validate current barrier shape and RESUME eligibility", "classify state"],
      "inputs": "the complete bounded current STOP_INTENT_BARRIER set; well-formed current ACTIVE barriers are the exact qualifying relation for RESUME",
      "outputs": {"CLEAR": "no current ACTIVE barrier exists", "BLOCKED": "one or more current ACTIVE barriers exist, whether qualified or ambiguous", "NO_ACTIVE_STOP": "the current barrier set is empty or contains no current ACTIVE barrier", "ACTIVE_QUALIFIED": "one or more current ACTIVE barriers are well-formed and exactly eligible to participate in RESUME", "AMBIGUOUS_OR_UNKNOWN": "a current ACTIVE barrier or its RESUME eligibility is malformed, conflicting, missing, stale, or otherwise uncertain"},
      "missing_or_malformed": "BLOCKED with stop_classification AMBIGUOUS_OR_UNKNOWN",
      "conflict": "BLOCKED with stop_classification AMBIGUOUS_OR_UNKNOWN",
      "clear_state": "CLEAR with stop_classification NO_ACTIVE_STOP"
    },
    "ATTEMPT_EXECUTION_ELIGIBILITY": {
      "evaluation_order": ["REQUIRE_CURRENT_TASK_BINDING", "state and predecessor checks", "required enforcement checks"],
      "inputs": "one current Attempt projection and the current Task map",
      "outputs": {"ELIGIBLE": "all exact current Task, non-tombstone, predecessor, and enforcement conditions pass", "INELIGIBLE": "any condition is missing, stale, conflicting, unknown, or fails"},
      "empty_set": "INELIGIBLE",
      "malformed": "INELIGIBLE"
    },
    "REQUIRE_CURRENT_TASK_BINDING": {
      "inputs": "current Task map and Attempt task_contract_ref",
      "outputs": {"ELIGIBLE": "exactly one current non-tombstoned Task matches", "REJECT": "zero or multiple matches, stale reference, or malformed input"}
    },
    "APPLY_TASK_CANCEL_TOMBSTONE": {
      "inputs": "current Task map, one candidate tombstone, and all current Attempts for that Task",
      "outputs": {"ADMIT": "the Task is current and cancellation is deny-only; task_map_delta is one tombstone", "REJECT": "missing/multiple Task, non-current predecessor, or any commenced Attempt makes cancellation invalid"},
      "state_consequence": "an admitted tombstone removes the Task from the executable current map and preserves the cancellation record"
    },
    "REVIEW_RESULT_INDEPENDENCE_VALID": {
      "evaluation_order": ["exact request/result binding", "derive review kind from current Task-bound OperationContract", "derive required dimension set", "resolve ReviewResult.independence_evidence_refs", "derive each dimension", "reduce"],
      "outputs": {"PASS": "all required derived dimensions PASS", "FAIL": "any required dimension FAIL", "UNKNOWN": "otherwise at least one required dimension is UNKNOWN"},
      "review_kind_derivation": "resolve the effective operation policy through OPERATION_CONTRACT_POLICY_RESOLVER for the exact current Task-bound OperationContract; effective_review_floor is canonical: SELF_CHECK requires exactly empty required dimensions, while INDEPENDENT_REQUIRED requires exactly author_independence and subject_binding",
      "evidence_source": "REVIEW_RESULT.independence_evidence_refs only; substantive REVIEW_RESULT.evidence_refs are never used as independence proof",
      "dimension_derivation_rules": {
        "author_independence": {
          "pass": "at least one independence_evidence_refs member resolves to ENFORCEMENT_ASSESSMENT with dimension_id author_independence, result SATISFIED, proof_assurance LOCAL_MECHANICAL_PROOF, REMOTE_MECHANICAL_PROOF, or PROTECTED_ATTESTATION, nonempty mechanical_proof_locator, and environment_subject exactly equal to 'review_request=' + REVIEW_RESULT.review_request_ref + ';reviewer=' + REVIEW_RESULT.reviewer_identity; the referenced proof mechanically establishes separation of that reviewer execution process from the subject-authoring process",
          "fail": "qualifying bound evidence establishes NOT_SATISFIED or contradicts the claimed reviewer/process separation",
          "unknown": "no qualifying bound proof exists, proof is stale/ambiguous, or only PEER_DECLARATION, reviewer-name change, model-name change, provider difference, or other self/peer assertion is available"
        },
        "subject_binding": {
          "pass": "REVIEW_RESULT.review_request_ref identifies the authorized REVIEW_REQUEST, REVIEW_RESULT.reviewer_identity is the sole reviewer identity, the immutable subject sets resolve exactly, and CURRENT_SUBJECT_APPLICABILITY passes for those exact subjects",
          "fail": "request/result reference, reviewer binding, immutable subject identity, or current subject applicability mismatches or is stale",
          "unknown": "required exact subject/currentness inputs cannot be established"
        }
      },
      "empty_set": "only the canonically derived SELF_CHECK kind with exactly empty required dimensions returns PASS without independence_evidence_refs",
      "missing_or_malformed": "UNKNOWN; an independent review cannot satisfy its barrier"
    },
    "ADMITTED_RESUME_TRANSITION_PROVEN": {
      "inputs": "one current STOP barrier whose REQUIRE_STOP_STATE.stop_classification is ACTIVE_QUALIFIED and one admitted descendant RESUME transition",
      "outputs": {"ADMIT": "the exact qualifying barrier is released by the descendant", "REJECT": "missing, ambiguous, malformed, multiple, stale, or unrelated transition"}
    },
    "EFFECT_DEFINITE_NON_MATERIALIZATION_PROVEN": {
      "evaluation_order": ["exact claim identity", "operation identity", "target equality", "qualifying observation/proof", "outcome"],
      "outputs": {"DEFINITELY_NOT_MATERIALIZED": "one qualifying exact-bound proof says so and no conflicting qualifying proof exists", "EXTERNAL_EFFECT_UNKNOWN": "evidence is missing, stale, conflicting, or says unknown", "REJECT": "claim/proof is malformed or target-bound identity mismatches"},
      "conflict": "EXTERNAL_EFFECT_UNKNOWN"
    },
    "EVALUATE_NEW_RESERVATION": {
      "evaluation_order": ["validate identity/revision", "validate quantity domain", "validate policy dimensions", "reduce prior charge", "compare capacity"],
      "outputs": {"RESERVED": "candidate is a valid successor and every reserved value is within current remaining capacity; capacity_delta is the exact admitted charge", "REJECT": "otherwise"},
      "quantity_revision_rule": "for a successor of the greatest valid revision, a RESERVED, COMMITTED, or UNCERTAIN state may not decrease any previously charged dimension; each increase is the checked component-wise delta and must fit current remaining capacity after excluding the prior amount of this same reservation. A decrease or zeroing is lawful only when the successor state is RELEASED and the exact reservation-bound non-use/non-consumption proof passes; RELEASED quantities must be zero for every policy dimension. No quantity mutation may reset or transfer capacity across projects, roots, or epochs",
      "empty_set": "REJECT",
      "missing_or_malformed": "REJECT",
      "conflict": "REJECT; no file or discovery order tie-break is lawful"
    }
  },
  "revision_rules": {
    "reservation_identity": "project_id + convergence_root_ref + continuity_epoch + reservation_id",
    "valid_revision_domain": "nonnegative_safe_integer",
    "successor": "revision 0 is the only initial revision; each later revision is exactly greatest_valid_revision + 1 for the same identity and obeys quantity_revision_rule",
    "mutable_fields": ["reserved", "state", "release_evidence_refs"],
    "immutable_fields": ["project_id", "convergence_root_ref", "continuity_epoch", "reservation_id"],
    "duplicate_bytes": "identical bytes are one logical observation and have no effect",
    "equal_maximum_distinct_bytes": "REJECT and route recovery",
    "stale_revision": "a valid lower revision is ignored for current reduction; malformed or discontinuous history is invalid",
    "tie_breakers_forbidden": ["file order", "discovery order", "timestamp", "worker preference"],
    "quantity_revision_rule": "while the successor state is RESERVED, COMMITTED, or UNCERTAIN, every dimension is component-wise nondecreasing and any increase is charged as a checked delta against current remaining capacity excluding the prior amount of this reservation; any decrease or zeroing requires successor state RELEASED plus the exact reservation-bound non-use/non-consumption proof, and RELEASED quantities are zero for every policy dimension; revision, migration, and recovery never reset or transfer charged capacity"
  },
  "reservation_release_rule": {
    "eligibility": "RELEASED requires a valid successor revision, exact reservation identity, release_evidence_refs containing at least one qualifying EXTERNAL_OBSERVATION, and every Attempt referencing the reservation to be shown non-commenced and non-consuming",
    "observation_encoding": "observation_class=RESERVATION_NON_USE_PROOF; effect_claim_ref is absent; observed_value is reservation=<reservation-ref>;attempts=<sorted exact attempt ids>;used=NO",
    "qualifying_proof": "proof_assurance is LOCAL_MECHANICAL_PROOF, REMOTE_MECHANICAL_PROOF, or PROTECTED_ATTESTATION and mechanical_proof_locator is nonempty",
    "multiple_attempts": "all referenced Attempts must be covered; one commenced, running, result-recorded, failed-after-commencement, or unknown Attempt prevents release",
    "missing_conflicting_partial": "charged; UNKNOWN or conflicting evidence never releases capacity",
    "interruption": "recovery re-evaluates the complete Attempt set; interruption does not imply non-use"
  },
  "effect_recovery_binding": {
    "identity": "one EFFECT_CLAIM.effect_claim_id plus project_id",
    "target": "effect_target is the exact pair {target_kind,target_identity}; target_identity is canonical and case-sensitive; FILE is project-relative path, REPOSITORY_REF is exact provider/ref identity, and EXTERNAL_SYSTEM_OBJECT/OTHER_CANONICAL is the exact provider-defined stable identity",
    "observation": "an effect recovery observation must carry effect_claim_ref, effect_operation_ref equal to EFFECT_CLAIM.operation_ref, and effect_target byte-for-byte equal to the claim target",
    "sufficiency": "only a qualifying exact-bound observation/proof can resolve outcome; wrong-target, missing, stale, conflicting, or peer-only evidence yields EXTERNAL_EFFECT_UNKNOWN",
    "blind_replay": "forbidden while outcome is EXTERNAL_EFFECT_UNKNOWN"
  },
  "route_dependency_closure": {
    "roots": "fixed .markdown-machine/RUNTIME.md and COMPILED-MANIFEST.md, current stable admitted head, current binding records, current non-tombstoned Task, its OperationContract, and the exact records named by that route",
    "forward_relations": ["typed references", "contract-key references", "authority predecessor and successor links", "Task-to-review request/result links", "Attempt-to-reservation/evidence links", "EffectClaim-to-bound-observation links", "convergence root/policy/tranche/reservation links"],
    "reverse_relations": ["records that bind the current Task", "records that authorize or supersede its review requests", "records that reference its effect claims, attempts, or convergence root"],
    "intent_envelope": {
      "root": "the exact current INTENT_BASELINE referenced by both the current Task and the current binding reducer",
      "required_members": ["complete intent_items", "constraints", "non_goals", "the exact RUN_HORIZON named by run_horizon_ref", "all HUMAN_STATEMENT records named by the current intent and horizon"],
      "technical_context_rule": "project_context, subtree_context, exact_path_context, and transformed_context may be route-sized technical context only; none may replace, summarize away, or override the intent envelope",
      "unresolved_human_rule": "relevant unresolved human-owned meaning or restriction remains in the exact current intent/human-authority closure; if it cannot be resolved or its exact governing reference cannot be established, route HUMAN_DECISION_REQUIRED or AUTHORITY_RECOVERY rather than omitting it",
      "deny_only_rule": "a deny-only execution restriction remains an execution boundary and never changes the objective or intent items"
    },
    "global_blockers": ["STOP", "authority fork/currentness unknown", "competing authority", "unresolved or unknown effects", "convergence exhaustion/overcharge", "stale currentness/invalidation", "stale routing authority"],
    "termination": "stop after fixed roots and exact forward/reverse closure are visited, all global blocker families have been checked, and one highest-precedence route is established; a repeated identity is not revisited",
    "unknown": "if possible blocking state cannot be shown irrelevant by exact finite relations, classify the route as blocked/recovery; never skip it as unrelated"
  },
  "contracts": {
    "HANDOFF_PROJECTION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "authoritative",
        "project_id",
        "basis_head_ref",
        "basis_repository_commit",
        "authority_epoch",
        "sequence",
        "origin_ref",
        "kernel_manifest_ref",
        "stop_state",
        "run_horizon_ref",
        "selected_capability_ids",
        "current_tasks",
        "review_barrier",
        "convergence_remaining",
        "repository_sync",
        "next_lawful",
        "generated_at_closeout"
      ],
      "optional_fields": [
        "stop_barrier_ref",
        "lifecycle_node_id"
      ],
      "fixed_values": {
        "record_type": "HANDOFF_PROJECTION",
        "schema_version": 1,
        "authoritative": false
      },
      "current_task_item": {
        "task_id": "ascii_id",
        "ref": "typed_ref",
        "path": "canonical_logical_path",
        "operation_family": "ascii_id",
        "effective_review_floor": "ascii_token"
      },
      "review_barrier_item": {
        "review_request_id": "ascii_id",
        "ref": "typed_ref"
      },
      "basis_repository_rule": {
        "comparison": "TREE_DIFF_BASIS_TO_LOCAL_HEAD",
        "governed_namespace": ".markdown-machine",
        "projection_path": ".markdown-machine/HANDOFF.md",
        "valid_when": "BASIS_EQUALS_LOCAL_HEAD_OR_NO_GOVERNED_PATH_DIFF_EXCEPT_PROJECTION_PATH",
        "outside_governed_namespace": "ALLOWED",
        "other_governed_path_delta": "REJECT_AND_REGENERATE",
        "authority_effect": "NONE"
      },
      "next_lawful_precedence": [
        "STOP_ACTIVE",
        "AUTHORITY_RECOVERY",
        "REPOSITORY_RECOVERY",
        "EFFECT_RECOVERY",
        "REVIEW_REQUIRED",
        "CONVERGENCE_EXHAUSTED",
        "HUMAN_DECISION_REQUIRED",
        "CURRENT_TASK",
        "TERMINAL"
      ],
      "projection_rules": {
        "project_id": "CURRENT_PROJECT_ID",
        "basis_head_ref": "CURRENT_STABLE_SINGLETON_HEAD",
        "basis_repository_commit": "DURABLE_CLOSEOUT_BASIS_COMMIT",
        "authority_epoch": "BASIS_HEAD.authority_epoch",
        "sequence": "BASIS_HEAD.sequence",
        "origin_ref": "BINDING_REDUCER.current_distribution_origin_ref",
        "kernel_manifest_ref": "BINDING_REDUCER.current_kernel_manifest_ref",
        "stop_state": "STOP_REDUCER.state",
        "stop_barrier_ref": "STOP_REDUCER.active_barrier_ref when applicable",
        "run_horizon_ref": "BINDING_REDUCER.current_run_horizon_ref",
        "lifecycle_node_id": "CURRENT_LIFECYCLE_REDUCER.current_node_id when applicable",
        "selected_capability_ids": "BINDING_REDUCER.current_selected_capability_ids",
        "current_tasks": "CURRENT_TASK_MAP_PROJECTION",
        "review_barrier": "CURRENT_UNSATISFIED_REVIEW_REDUCER",
        "convergence_remaining": "CONVERGENCE_REDUCER.remaining",
        "repository_sync": "REPOSITORY_CURRENTNESS_REDUCER.classification",
        "next_lawful": "HIGHEST_PRECEDENCE_UNSATISFIED_BARRIER"
      },
      "descriptive_fields": {
        "generated_at_closeout": "rfc3339 timestamp only; non-authoritative"
      },
      "invariants": [
        "NEXT_LAWFUL_EQUALS_HIGHEST_PRECEDENCE_UNSATISFIED_BARRIER",
        "HANDOFF_MECHANICAL_FIELDS_EQUAL_PROJECTION_SOURCES",
        "HANDOFF_NEVER_FEEDS_AUTHORITY_OR_CURRENT_STATE_REDUCERS"
      ]
    },
    "ATTEMPT_RECORD": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "attempt_id",
        "task_contract_ref",
        "convergence_root_ref",
        "convergence_reservation_ref",
        "worker_identity",
        "worker_variant",
        "execution_endpoint",
        "required_enforcement_dimensions",
        "enforcement_assessment_refs",
        "resource_reservation_refs",
        "execution_human_authority_refs",
        "state",
        "result_evidence_refs",
        "revision"
      ],
      "optional_fields": [
        "commenced_at",
        "completed_at",
        "predecessor_attempt_ref"
      ]
    },
    "CONTEXT_REPRESENTATION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "representation_id",
        "source_refs",
        "fidelity",
        "content_digest",
        "revision"
      ]
    },
    "CONVERGENCE_CONTINUITY_ASSESSMENT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "convergence_root_ref",
        "continuity_epoch",
        "result",
        "safe_reusable",
        "assessed_at",
        "revision"
      ],
      "safe_reusable_item": {
        "dimension_id": "ascii_id",
        "value": "nonnegative_safe_integer"
      },
      "optional_fields": [
        "exact_consumed"
      ]
    },
    "CONVERGENCE_RESERVATION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "convergence_root_ref",
        "continuity_epoch",
        "reservation_id",
        "reserved",
        "state",
        "revision"
      ],
        "reserved_item": {
          "dimension_id": "ascii_id",
          "value": "nonnegative_safe_integer"
        },
      "optional_fields": [
        "release_evidence_refs"
      ],
      "release_rule": "RELEASED is admissible only with exact target-bound qualifying non-use evidence and after every Attempt referencing this reservation is shown non-commenced/non-consuming; unknown, missing, conflicting, or partial evidence keeps the reservation charged",
      "states": [
        "RESERVED",
        "COMMITTED",
        "UNCERTAIN",
        "RELEASED"
      ]
    },
    "EFFECT_CLAIM": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "effect_claim_id",
        "operation_ref",
        "effect_target",
        "effect_class",
        "write_ahead_state",
        "outcome_state",
        "revision"
      ],
      "effect_target_item": {
        "target_kind": "enum(FILE,REPOSITORY_REF,EXTERNAL_SYSTEM_OBJECT,OTHER_CANONICAL)",
        "target_identity": "unicode_scalar_string"
      }
    },
    "ENFORCEMENT_ASSESSMENT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "assessment_id",
        "dimension_id",
        "environment_subject",
        "proof_assurance",
        "mechanical_proof_locator",
        "observed_at",
        "result",
        "revision"
      ],
      "proof_assurance": [
        "PEER_DECLARATION",
        "LOCAL_MECHANICAL_PROOF",
        "REMOTE_MECHANICAL_PROOF",
        "PROTECTED_ATTESTATION"
      ]
    },
    "EXTERNAL_OBSERVATION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "observation_id",
        "observation_class",
        "observed_at",
        "observed_value",
        "proof_assurance",
        "revision"
      ],
      "optional_fields": [
        "mechanical_proof_locator",
        "effect_claim_ref",
        "effect_operation_ref",
        "effect_target",
        "effect_outcome"
      ],
      "required_unless_peer": [
        "mechanical_proof_locator"
      ]
    },
    "EXTERNAL_SUBJECT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "subject_id",
        "subject_class",
        "canonical_identity",
        "retention_ref",
        "revision"
      ]
    },
    "INBOX_ITEM": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "inbox_item_id",
        "exact_request",
        "received_at",
        "disposition",
        "revision"
      ]
    },
    "RESOURCE_RESERVATION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "reservation_id",
        "resource_identity",
        "floor",
        "state",
        "revision"
      ]
    },
    "REVIEW_RESULT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "review_result_id",
        "review_request_ref",
        "reviewer_identity",
        "verdict",
        "evidence_refs",
        "revision"
      ],
      "optional_fields": [
        "independence_evidence_refs"
      ],
      "conditional_fields": {
        "independence_evidence_refs": "required when the effective review floor requires author_independence; absent when the associated ReviewRequest.required_independence_dimensions is exactly empty and the associated review kind is SELF_CHECK"
      },
      "independence_evidence_ref_targets": [
        "ENFORCEMENT_ASSESSMENT",
        "EXTERNAL_OBSERVATION"
      ],
      "verdict": [
        "PASS",
        "FAIL",
        "BOUNDED_CORRECTIONS_REQUIRED",
        "MATERIAL_REDESIGN_REQUIRED"
      ],
      "required_review_results_pass": [
        "PASS"
      ]
    },
    "STOP_INTENT_BARRIER": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "barrier_id",
        "stop_kind",
        "human_statement_ref",
        "state",
        "revision"
      ]
    },
    "HISTORY_MANIFEST": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "authority_status",
        "boundary",
        "boundary_transition_ref",
        "entries"
      ],
      "entries_item": {
        "path": "canonical_logical_path",
        "sha256": "sha256_hex"
      },
      "authority_status": [
        "HISTORICAL_NON_CURRENT",
        "HISTORICAL_UNVERIFIED",
        "PROVABLE_UNDER_RETIRED_LAW"
      ]
    }
  },
  "field_types": {
    "HANDOFF_PROJECTION": {
      "record_type": "enum(HANDOFF_PROJECTION)",
      "schema_version": "canonical_integer",
      "authoritative": "boolean",
      "project_id": "ascii_id",
      "basis_head_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "basis_repository_commit": "git_object_id",
      "authority_epoch": "canonical_integer",
      "sequence": "canonical_integer",
      "origin_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "DISTRIBUTION_ORIGIN"
        ],
        "same_project": true
      },
      "kernel_manifest_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "KERNEL_MANIFEST"
        ],
        "same_project": true
      },
      "stop_state": "enum(NONE,ACTIVE,RELEASED,UNKNOWN)",
      "run_horizon_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "RUN_HORIZON"
        ],
        "same_project": true
      },
      "selected_capability_ids": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 0,
        "set_semantics": true
      },
      "current_tasks": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "task_id": "ascii_id",
            "ref": {
              "kind": "typed_ref",
              "target_record_types": [
                "TASK_CONTRACT"
              ],
              "same_project": true
            },
            "path": "canonical_logical_path",
            "operation_family": "ascii_token",
            "effective_review_floor": "ascii_token"
          }
        },
        "min_items": 0
      },
      "review_barrier": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "review_request_id": "ascii_id",
            "ref": {
              "kind": "typed_ref",
              "target_record_types": [
                "REVIEW_REQUEST"
              ],
              "same_project": true
            }
          }
        },
        "min_items": 0
      },
      "convergence_remaining": {
        "kind": "object"
      },
      "repository_sync": "enum(REPOSITORY_SYNCED,LOCAL_AHEAD_REMOTE,REMOTE_AHEAD_LOCAL,REMOTE_DIVERGED,REMOTE_SYNC_UNKNOWN,REMOTE_SYNC_BLOCKED,EXTERNAL_STOP_PROHIBITS_SYNC,NO_CANONICAL_REMOTE)",
      "next_lawful": "enum(STOP_ACTIVE,AUTHORITY_RECOVERY,REPOSITORY_RECOVERY,EFFECT_RECOVERY,REVIEW_REQUIRED,CONVERGENCE_EXHAUSTED,HUMAN_DECISION_REQUIRED,CURRENT_TASK,TERMINAL)",
      "generated_at_closeout": "rfc3339_utc_timestamp",
      "stop_barrier_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "STOP_INTENT_BARRIER"
        ],
        "same_project": true
      },
      "lifecycle_node_id": "ascii_id"
    },
    "ATTEMPT_RECORD": {
      "record_type": "enum(ATTEMPT_RECORD)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "attempt_id": "ascii_id",
      "task_contract_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "TASK_CONTRACT"
        ],
        "same_project": true
      },
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "convergence_reservation_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_RESERVATION"
        ],
        "same_project": true
      },
      "worker_identity": "unicode_scalar_string",
      "worker_variant": "ascii_token",
      "execution_endpoint": "unicode_scalar_string",
      "required_enforcement_dimensions": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 0,
        "set_semantics": true
      },
      "enforcement_assessment_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "ENFORCEMENT_ASSESSMENT"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "resource_reservation_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "RESOURCE_RESERVATION"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "execution_human_authority_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "HUMAN_STATEMENT"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "state": "enum(PLANNED,COMMENCEMENT_ACCEPTED,RUNNING,RESULT_RECORDED,FAILED,CANCELLED,STATE_UNKNOWN)",
      "result_evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "REVIEW_RESULT",
            "EXTERNAL_OBSERVATION",
            "ENFORCEMENT_ASSESSMENT",
            "CONVERGENCE_CONTINUITY_ASSESSMENT",
            "REPOSITORY_SYNC_OBSERVATION"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "revision": "canonical_integer",
      "commenced_at": "rfc3339_utc_timestamp",
      "completed_at": "rfc3339_utc_timestamp",
      "predecessor_attempt_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "ATTEMPT_RECORD"
        ],
        "same_project": true
      }
    },
    "CONTEXT_REPRESENTATION": {
      "record_type": "enum(CONTEXT_REPRESENTATION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "representation_id": "ascii_id",
      "source_refs": {
        "kind": "list",
        "items": {
          "kind": "sha256_ref"
        },
        "min_items": 1,
        "set_semantics": true
      },
      "fidelity": "enum(EXACT,TRANSFORMED)",
      "content_digest": "sha256_hex",
      "revision": "canonical_integer"
    },
    "CONVERGENCE_CONTINUITY_ASSESSMENT": {
      "record_type": "enum(CONVERGENCE_CONTINUITY_ASSESSMENT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "continuity_epoch": "nonnegative_safe_integer",
      "result": "enum(SAFE_REUSABLE,UNKNOWN,SINGLE_SESSION_ONLY)",
      "safe_reusable": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "dimension_id": "ascii_id",
            "value": "nonnegative_safe_integer"
          }
        },
        "min_items": 0,
        "set_key": "dimension_id"
      },
      "assessed_at": "rfc3339_utc_timestamp",
      "revision": "canonical_integer",
      "exact_consumed": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "dimension_id": "ascii_id",
            "value": "nonnegative_safe_integer"
          }
        },
        "min_items": 0,
        "set_key": "dimension_id"
      }
    },
    "CONVERGENCE_RESERVATION": {
      "record_type": "enum(CONVERGENCE_RESERVATION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "continuity_epoch": "nonnegative_safe_integer",
      "reservation_id": "ascii_id",
      "reserved": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "dimension_id": "ascii_id",
            "value": "nonnegative_safe_integer"
          }
        },
        "min_items": 1,
        "set_key": "dimension_id"
      },
      "release_evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "EXTERNAL_OBSERVATION"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "state": "enum(RESERVED,COMMITTED,UNCERTAIN,RELEASED)",
      "revision": "nonnegative_safe_integer"
    },
    "EFFECT_CLAIM": {
      "record_type": "enum(EFFECT_CLAIM)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "effect_claim_id": "ascii_id",
      "operation_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "OPERATION_CONTRACT"
        ],
        "same_project": true
      },
      "effect_target": {
        "kind": "object",
        "fields": {
          "target_kind": "enum(FILE,REPOSITORY_REF,EXTERNAL_SYSTEM_OBJECT,OTHER_CANONICAL)",
          "target_identity": "unicode_scalar_string"
        }
      },
      "effect_class": "ascii_token",
      "write_ahead_state": "enum(CLAIMED_NOT_STARTED,COMMENCEMENT_ACCEPTED,OUTCOME_PENDING)",
      "outcome_state": "enum(CONFIRMED,DEFINITELY_NOT_MATERIALIZED,EXTERNAL_EFFECT_UNKNOWN)",
      "revision": "canonical_integer"
    },
    "ENFORCEMENT_ASSESSMENT": {
      "record_type": "enum(ENFORCEMENT_ASSESSMENT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "assessment_id": "ascii_id",
      "dimension_id": "ascii_id",
      "environment_subject": "unicode_scalar_string",
      "proof_assurance": "enum(PEER_DECLARATION,LOCAL_MECHANICAL_PROOF,REMOTE_MECHANICAL_PROOF,PROTECTED_ATTESTATION)",
      "mechanical_proof_locator": "unicode_scalar_string",
      "observed_at": "rfc3339_utc_timestamp",
      "result": "enum(SATISFIED,NOT_SATISFIED,UNKNOWN)",
      "revision": "canonical_integer"
    },
    "EXTERNAL_OBSERVATION": {
      "record_type": "enum(EXTERNAL_OBSERVATION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "observation_id": "ascii_id",
      "observation_class": "ascii_token",
      "observed_at": "rfc3339_utc_timestamp",
      "observed_value": "unicode_scalar_string",
      "proof_assurance": "enum(PEER_DECLARATION,LOCAL_MECHANICAL_PROOF,REMOTE_MECHANICAL_PROOF,PROTECTED_ATTESTATION)",
      "mechanical_proof_locator": "unicode_scalar_string",
      "effect_claim_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "EFFECT_CLAIM"
        ],
        "same_project": true
      },
      "effect_operation_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "OPERATION_CONTRACT"
        ],
        "same_project": true
      },
      "effect_target": {
        "kind": "object",
        "fields": {
          "target_kind": "enum(FILE,REPOSITORY_REF,EXTERNAL_SYSTEM_OBJECT,OTHER_CANONICAL)",
          "target_identity": "unicode_scalar_string"
        }
      },
      "effect_outcome": "enum(CONFIRMED,DEFINITELY_NOT_MATERIALIZED,EXTERNAL_EFFECT_UNKNOWN)",
      "revision": "canonical_integer"
    },
    "EXTERNAL_SUBJECT": {
      "record_type": "enum(EXTERNAL_SUBJECT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "subject_id": "ascii_id",
      "subject_class": "ascii_token",
      "canonical_identity": "sha256_ref",
      "retention_ref": "canonical_logical_path",
      "revision": "canonical_integer"
    },
    "INBOX_ITEM": {
      "record_type": "enum(INBOX_ITEM)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "inbox_item_id": "ascii_id",
      "exact_request": "unicode_scalar_string",
      "received_at": "rfc3339_utc_timestamp",
      "disposition": "ascii_token",
      "revision": "canonical_integer"
    },
    "RESOURCE_RESERVATION": {
      "record_type": "enum(RESOURCE_RESERVATION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "reservation_id": "ascii_id",
      "resource_identity": "unicode_scalar_string",
      "floor": "ascii_token",
      "state": "enum(RESERVED,COMMITTED,UNCERTAIN,RELEASED)",
      "revision": "canonical_integer"
    },
    "REVIEW_RESULT": {
      "record_type": "enum(REVIEW_RESULT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "review_result_id": "ascii_id",
      "review_request_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "REVIEW_REQUEST"
        ],
        "same_project": true
      },
      "reviewer_identity": "unicode_scalar_string",
      "independence_evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "ENFORCEMENT_ASSESSMENT",
            "EXTERNAL_OBSERVATION"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "verdict": "enum(PASS,FAIL,BOUNDED_CORRECTIONS_REQUIRED,MATERIAL_REDESIGN_REQUIRED)",
      "evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "sha256_ref"
        },
        "min_items": 0,
        "set_semantics": true
      },
      "revision": "canonical_integer"
    },
    "STOP_INTENT_BARRIER": {
      "record_type": "enum(STOP_INTENT_BARRIER)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "barrier_id": "ascii_id",
      "stop_kind": "enum(GRACEFUL,IMMEDIATE_EXTERNAL)",
      "human_statement_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "HUMAN_STATEMENT"
        ],
        "same_project": true
      },
      "state": "enum(ACTIVE,RELEASED)",
      "revision": "canonical_integer"
    },
    "HISTORY_MANIFEST": {
      "record_type": "enum(HISTORY_MANIFEST)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "authority_status": "enum(HISTORICAL_NON_CURRENT,HISTORICAL_UNVERIFIED,PROVABLE_UNDER_RETIRED_LAW)",
      "boundary": "unicode_scalar_string",
      "boundary_transition_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "entries": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "sha256": "sha256_hex"
          }
        },
        "min_items": 1,
        "set_semantics": true
      }
    }
  },
  "convergence_reducer": {
    "identity": [
      "convergence_root_ref",
      "continuity_epoch",
      "dimension_id"
    ],
    "quantity_domain": "every grant, charge, delta, safe_reusable, and exact_consumed value is a JSON nonnegative_safe_integer in 0..(2^53-1); zero is legal and means no capacity for that dimension",
    "dimension_membership": "the current policy's exact unique dimension id set is authoritative; every admitted quantity list has no duplicate ids and contains no id outside that set",
    "arithmetic": "sum and subtraction are checked safe-integer operations; any operand or intermediate outside 0..(2^53-1), any overcharge, or any negative result is invalid and routes recovery",
    "grant": "sum values from admitted current-epoch CONVERGENCE_TRANCHE.granted for the dimension",
    "reservation_revision": "for each reservation_id use greatest valid revision only; a valid successor preserves the exact identity and continuity epoch, uses the exact integer successor revision, and obeys revision_rules.quantity_revision_rule",
    "charge": "sum reserved values where greatest-valid-revision state is RESERVED, COMMITTED, or UNCERTAIN",
    "released_charge": 0,
    "overcharge": "if charge > grant then invalid and route recovery",
    "remaining": "grant - charge",
    "cumulative_grant_limit": "authorization accounting excludes continuity-transfer carry-forward: epoch-0 base grant is bounded once by CONVERGENCE_POLICY.authorized_total; each admitted CONVERGENCE_EXTENSION delta is newly authorized exactly once and must satisfy its policy extension limit; re-materialized SAFE_REUSABLE capacity does not consume authorized_total or extension authority again",
    "cross_epoch_reuse": {
      "SAFE_REUSABLE": "continuity_transfer.SAFE_REUSABLE",
      "UNKNOWN": 0,
      "SINGLE_SESSION_ONLY": 0
    },
    "persistence": "no persistent remaining-capacity record; HANDOFF projects the deterministic result only",
    "continuity_transfer": {
      "prior_epoch_remaining": "for each dimension reduce the immediately prior continuity epoch using the same grant/charge rules before evaluating transfer",
      "SAFE_REUSABLE": "min(the assessment safe_reusable value for the dimension, prior_epoch_remaining for that dimension); an omitted dimension is 0",
      "UNKNOWN": 0,
      "SINGLE_SESSION_ONLY": 0
    },
    "successor_epoch_rule": "a CONVERGENCE_EXTEND-bound tranche may advance only to exactly the next continuity epoch; for each dimension its granted value equals continuity_transfer plus that transition's extension delta; the transfer component is carry-forward and is not counted again as new authorization",
    "same_epoch_extension_rule": "when the bound tranche remains in the current continuity epoch, each granted value equals that transition's extension delta exactly"
  },
  "recovery_reducers": {
    "effect": "Unknown effect state cannot become definitely-not-materialized without target-bound evidence.",
    "convergence": "Use convergence_reducer exactly; unknown reservation remains charged and unknown reusable capacity is zero.",
    "resource": "Unknown ownership cannot become reserved without new qualifying mechanical proof.",
    "continuity": "derive continuity_transfer exactly from the immediately prior epoch; SAFE_REUSABLE carries forward at most min(safe_reusable, prior remaining), while UNKNOWN and SINGLE_SESSION_ONLY carry forward zero; transferred capacity is never counted as new authorization",
    "independence": "derive every required dimension from dimension_derivation_rules; stored dimension PASS values are assertions only and must equal the derived result; any FAIL => FAIL, else any UNKNOWN => UNKNOWN, else all required PASS => PASS; empty SELF_CHECK set => PASS"
  },
  "invariant_bindings": {
    "NEXT_LAWFUL_EQUALS_HIGHEST_PRECEDENCE_UNSATISFIED_BARRIER": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "HANDOFF.next_lawful equals the first applicable class in HANDOFF_PROJECTION.next_lawful_precedence"
    },
    "HANDOFF_MECHANICAL_FIELDS_EQUAL_PROJECTION_SOURCES": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "every mechanical HANDOFF field equals the value produced by its projection_rules source, including conditional optional fields"
    },
    "HANDOFF_NEVER_FEEDS_AUTHORITY_OR_CURRENT_STATE_REDUCERS": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "no AuthorityTransition, Task, Attempt, binding/currentness/STOP/review/convergence reducer may consume HANDOFF_PROJECTION as positive input"
    }
  }
}
---
# MM-RECOVERY/1

This registry defines deny-only recovery, evidence, revision, continuity,
independence, and HANDOFF projection records. Recovery state never creates
positive authority. All reducers terminate over finite current records and fail
closed.

## HANDOFF projection

`HANDOFF_PROJECTION` is always `authoritative: false`. Every mechanical field is
an equality projection from the source named by `projection_rules`; it never
feeds authority, binding, currentness, STOP, review, convergence, or Task
reducers. `generated_at_closeout` is descriptive only. The projection contains
no free-form human-action field.

`next_lawful` is the highest-precedence unsatisfied barrier from the closed
precedence list. If exact current state cannot be reduced to one class, route
`AUTHORITY_RECOVERY`.

The HANDOFF reducer evaluates in this order: stable singleton basis head and
repository basis, exact Origin/Kernel bindings, STOP, lifecycle and selected
capabilities, current Tasks, review/effect/convergence/resource barriers, then
`next_lawful`. Each field is copied from the named projection rule exactly;
missing or multiply resolved source data invalidates the projection, except
that `stop_barrier_ref` and `lifecycle_node_id` may be absent only when their
source says they are not applicable. `generated_at_closeout` is never read by
any reducer. A post-freeze delta other than the projection-only HANDOFF delta
invalidates the basis and requires regeneration.

For each current task item, `operation_family` and `effective_review_floor` are
projected from the exact current Task-bound OperationContract after
`OPERATION_CONTRACT_POLICY_RESOLVER` resolves its exact capability binding and
digest-bound capability export. The HANDOFF projection never reads a removed
OperationContract policy snapshot field.

## Review independence

`REVIEW_RESULT_INDEPENDENCE_VALID` derives the required dimensions from the
exact current Task-bound operation policy and joins the authorized
ReviewRequest, the single ReviewResult's request/reviewer binding,
`REVIEW_RESULT.independence_evidence_refs`, existing evidence projections, and
current subject applicability. Substantive `REVIEW_RESULT.evidence_refs` remain
separate and are never independence proof. A different reviewer string is not
proof of independence. Any required dimension FAIL yields FAIL; otherwise any
UNKNOWN yields UNKNOWN; otherwise all required PASS yields PASS. An empty
SELF_CHECK dimension set yields PASS without independence evidence.

`REVIEW_RESULT.independence_evidence_refs` is required when the exact effective
review floor requires `author_independence` and is absent for the exact empty
SELF_CHECK case. The field carries only typed references to
`ENFORCEMENT_ASSESSMENT` or `EXTERNAL_OBSERVATION`; it carries no dimensions or
aggregate result. The authorized request, exact subject, substantive verdict,
reviewer binding, and currentness checks still apply. An independent result
without qualifying evidence cannot satisfy its barrier.

## Deterministic convergence

`convergence_reducer` is the one grant/charge/remaining reducer. For each
current root, continuity epoch, and dimension it sums admitted tranche grants,
charges greatest-valid-revision reservations in `RESERVED`, `COMMITTED`, or
`UNCERTAIN`, charges `RELEASED` as zero, rejects charge greater than grant, and
returns `remaining = grant - charge`. Cumulative grants cannot exceed policy
authorized totals plus admitted extension deltas. Cross-epoch `UNKNOWN` and
`SINGLE_SESSION_ONLY` reusable capacity is zero; `SAFE_REUSABLE` is bounded by
its exact declared safe value. No persistent remaining-capacity record exists.

Every admitted convergence quantity uses the closed
`nonnegative_safe_integer` domain. Zero is legal and means that the dimension
contributes no grant or charge. A quantity list must contain each current
policy dimension at most once and no other dimension; missing dimensions are
zero only when the reducer materializes a projection. Checked addition and
subtraction reject overflow, underflow, and overcharge, so a negative charge
can never manufacture capacity.

## Reservation revisions and release

The logical reservation identity is the exact tuple
`{project_id, convergence_root_ref, continuity_epoch, reservation_id}`.
Revision `0` is the only initial revision; every later valid revision is the
exact integer successor of the greatest valid revision for that identity and
may change only `reserved`, `state`, and `release_evidence_refs`. Identical
duplicate bytes are one observation. Distinct equal greatest revisions,
malformed gaps, identity changes, and ambiguous histories block recovery;
file order, discovery order, timestamps, and worker preference never select a
winner. Lower valid revisions are stale and do not become current. While a
successor remains `RESERVED`, `COMMITTED`, or `UNCERTAIN`, each quantity is
component-wise nondecreasing from the prior greatest revision; an increase is
only the checked newly charged delta within current remaining capacity after
excluding that reservation's prior charge. A decrease or zeroing is lawful
only for a `RELEASED` successor with the exact reservation-bound non-use and
non-consumption proof, and a released quantity list is zero for every policy
dimension. Revisions, migration, and recovery never reset or transfer a
charged quantity.

`RELEASED` is not a declaration of non-use. It is valid only when the current
revision carries a qualifying `RESERVATION_NON_USE_PROOF` observation bound to
the exact reservation and the complete sorted set of referencing Attempts,
with `used=NO`, non-peer mechanical/protected assurance, and a nonempty proof
locator. Every such Attempt must be `PLANNED` or a cancellation state with no
commencement and no consuming evidence. Any commenced, running,
result-recorded, failed-after-commencement, unknown, missing, partial, stale,
or conflicting Attempt/evidence keeps the reservation charged. Interruption
triggers this same complete re-evaluation; it never implies non-use.

## Effect recovery binding

An `EFFECT_CLAIM` is identified by `{project_id,effect_claim_id}` and carries
the exact `operation_ref` plus an `effect_target` pair. A target's kind and
identity are compared byte-for-byte: `FILE` is a canonical project-relative
path, `REPOSITORY_REF` is the exact provider/ref identity, and the other kinds
are exact stable provider-defined identities. A qualifying recovery
`EXTERNAL_OBSERVATION` must bind `effect_claim_ref`, an equal
`effect_operation_ref`, an equal `effect_target`, and an explicit
`effect_outcome`. Only exact target-bound mechanical/protected proof can
resolve a claim to `CONFIRMED` or `DEFINITELY_NOT_MATERIALIZED`; wrong-target,
missing, stale, peer-only, or conflicting evidence yields
`EXTERNAL_EFFECT_UNKNOWN`, and unknown effects cannot be replayed blindly.

## Route dependency closure

Route recovery starts at the fixed runtime and manifest surfaces, the stable
admitted head, current bindings, and the current Task/Operation pair. It
follows exact typed and contract-key references, admitted authority links,
Task-to-review authorization/result links, Attempt-to-reservation/evidence
links, EffectClaim-to-observation links, and convergence root/policy/tranche/
reservation links in both forward and reverse directions where those relations
are named. It separately checks the complete bounded inventory for global STOP,
authority/currentness conflict, unresolved effect, convergence exhaustion or
overcharge, stale invalidation, and stale routing authority. Traversal ends
when the fixed visited set is closed and one precedence-ranked route is
established. If a potentially blocking record cannot be shown irrelevant by
an exact relation, recovery fails closed; route slicing never means “ignore
unknown”.

The fixed route closure always includes the complete active human-intent
envelope. The exact current `INTENT_BASELINE` is reached through the current
Task and binding reducer, and its complete `intent_items`, `constraints`,
`non_goals`, exact `RUN_HORIZON`, and named human statements are retained. The
technical context lists on a Task can therefore be route-sized without making
human intent lossy. A transformed technical representation is orientation and
provenance only; it cannot replace or override that exact envelope. A relevant
unresolved human restriction or decision that cannot be established through
the exact closure routes to `HUMAN_DECISION_REQUIRED` or
`AUTHORITY_RECOVERY`, rather than being omitted or inferred from Task prose,
file age, or prior chat. A deny-only execution restriction remains a boundary
on execution and does not mutate the objective or accepted intent.

## Dead family removal

`OBJECTIVE_RELATION` is not a current recovery record family. Historical v0.7
bytes remain interpretable only under preserved v0.7 law during governed
migration.
