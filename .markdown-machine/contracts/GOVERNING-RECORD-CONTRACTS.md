---
{
  "record_type": "GOVERNING_RECORD_CONTRACT_REGISTRY",
  "schema_version": 1,
  "contract_id": "MM-GOVERNING-RECORDS/1",
  "registry_id": "MM-GOVERNING-RECORDS/1",
  "grammar_contract_ref": "sha256:47c61d1aa92f492afd0419e961d51777058f9148ff90b2355d7ee57d73e34e3d",
  "authoritative_contract": true,
  "project_output_eligible": true,
  "materialization_rule": "EXACT_EXPORT_REQUIRED",
  "unknown_fields": "REJECT",
  "fixed_governing_source_paths": [
    "project-runtime/RECORD-GRAMMAR.md",
    "project-runtime/GOVERNING-RECORD-CONTRACTS.md",
    "project-runtime/RECOVERY-CONTRACTS.md",
    "project-runtime/AUTHORITY-EVALUATOR.md",
    "project-runtime/HUMAN-CONTROL.md",
    "bootstrap/GENESIS-ADMISSION.md"
  ],
  "contracts": {
    "PROJECT_GENESIS": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "project_name",
        "authority_epoch",
        "sequence",
        "bootstrap_profile_id",
        "human_statement_refs",
        "distribution_origin_ref",
        "kernel_manifest_ref",
        "convergence_root_ref",
        "convergence_policy_ref"
      ],
      "optional_fields": [
        "adoption_subject_ref",
        "extensions"
      ],
      "fixed_values": {
        "authority_epoch": 0,
        "sequence": 0
      },
      "initial_binding_types": [
        "DISTRIBUTION_ORIGIN",
        "KERNEL_MANIFEST",
        "CONVERGENCE_ROOT",
        "CONVERGENCE_POLICY",
        "HUMAN_STATEMENT"
      ],
      "adoption_additional_binding_types": [
        "EXTERNAL_SUBJECT"
      ],
      "invariants": [
        "PROJECT_ID_HIGH_ENTROPY_OR_EXACT_HISTORICAL_ID_IN_ADOPTION",
        "ONE_BOOTSTRAP_ADMITTED_GENESIS_PER_LINEAGE",
        "KERNEL_ORIGIN_EQUALITY"
      ]
    },
    "DISTRIBUTION_ORIGIN": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "machine_name",
        "machine_version",
        "source_transport",
        "source_identity",
        "content_set_digest",
        "compatibility_family",
        "enforcement_profile",
        "runtime_source",
        "governing_sources",
        "selected_capability_sources"
      ],
      "optional_fields": [
        "git_commit",
        "git_tree"
      ],
      "governing_sources_item": {
        "path": "canonical_logical_path",
        "sha256": "sha256_hex"
      },
      "selected_capability_sources_item": {
        "capability_id": "ascii_id",
        "path": "canonical_logical_path",
        "sha256": "sha256_hex"
      },
      "runtime_source_item": {
        "path": "canonical_logical_path",
        "sha256": "sha256_hex"
      },
      "invariants": [
        "SOURCE_ORIGIN_EQUALITY",
        "RUNTIME_ORIGIN_EQUALITY",
        "GOVERNING_SOURCE_SET_EXACT",
        "GIT_IDENTITY_REQUIRED_FOR_GIT_TRANSPORT"
      ]
    },
    "COMPILED_MANIFEST": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "compiled_manifest_id",
        "distribution_origin_ref",
        "runtime_export",
        "contract_exports",
        "selected_capability_exports",
        "child_layout",
        "forbidden_distribution_roots",
        "closure_status",
        "revision"
      ],
      "optional_fields": [
        "repository_binding_ref"
      ],
      "invariants": [
        "EXACT_COMPILED_SOURCE_BINDING",
        "EXACT_RUNTIME_EXPORT_BINDING",
        "EXACT_SIX_CONTRACT_EXPORTS",
        "FORBIDDEN_DISTRIBUTION_ROOTS_ABSENT",
        "CHILD_CLOSURE_COMPLETE"
      ]
    },
    "KERNEL_MANIFEST": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "distribution_origin_ref",
        "compatibility_family",
        "admission_contract_ref",
        "selected_capability_runtime_refs"
      ],
      "optional_fields": [
        "compiled_under_authority_ref",
        "candidate_shaped_binding_types"
      ],
      "admission_contract_ref_target": {
        "record_type": "GOVERNING_CONTRACT",
        "identity_field": "contract_id",
        "identity": "MM-AUTHORITY/1"
      },
      "invariants": [
        "ADMISSION_CONTRACT_EQUALS_CURRENT_KERNEL",
        "CANDIDATE_SHAPE_PATHS_FIXED"
      ]
    },
    "INTENT_BASELINE": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "intent_baseline_id",
        "intent_items",
        "human_statement_refs",
        "authorized_capability_ids",
        "constraints",
        "non_goals",
        "run_horizon_ref",
        "revision"
      ],
      "optional_fields": [
        "compiled_under_authority_ref",
        "supersession"
      ],
      "intent_items_item": {
        "id": "ascii_id",
        "text": "unicode_scalar_string"
      },
      "set_key": "id",
      "supersession_item": {
        "prior_intent_baseline_ref": "typed_ref INTENT_BASELINE",
        "item_relations": {
          "old_id": "ascii_id",
          "new_ids": "list of ascii_id; empty means explicit deletion"
        }
      }
    },
    "RUN_HORIZON": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "run_horizon_id",
        "authorized_frontier",
        "reachable_terminal_nodes",
        "allowed_effect_classes",
        "human_statement_refs",
        "revision"
      ],
      "optional_fields": [
        "compiled_under_authority_ref"
      ]
    },
    "CAPABILITY_BINDING": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "capability_id",
        "intent_baseline_ref",
        "runtime_ref",
        "capability_state",
        "operation_floor_profile_id",
        "revision"
      ],
      "optional_fields": [
        "compiled_under_authority_ref",
        "capability_source_ref"
      ],
      "capability_state": [
        "ONBOARDING",
        "ACTIVE",
        "SUSPENDED",
        "RETIRED",
        "REVOKED"
      ]
    },
    "OPERATION_CONTRACT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "operation_contract_id",
        "intent_baseline_ref",
        "capability_binding_ref",
        "capability_id",
        "operation_family",
        "revision"
      ],
      "optional_fields": [
        "compiled_under_authority_ref"
      ]
    },
    "LIFECYCLE_GRAPH": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "graph_id",
        "node_ids",
        "edges",
        "current_node_id",
        "terminal_node_ids",
        "capability_binding_refs",
        "run_horizon_ref",
        "revision"
      ],
      "optional_fields": [
        "compiled_under_authority_ref",
        "edge_ids"
      ],
      "edges_item": {
        "from": "ascii_id",
        "to": "ascii_id"
      },
      "invariants": [
        "EDGE_ENDPOINTS_IN_NODE_IDS",
        "TERMINAL_NODES_SUBSET_OF_NODE_IDS"
      ]
    },
    "TASK_CONTRACT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "task_id",
        "intent_baseline_ref",
        "capability_binding_ref",
        "operation_contract_ref",
        "purpose",
        "scope",
        "prohibited_scope",
        "completion_conditions",
        "convergence_root_ref",
        "lifecycle_node_id",
        "project_context",
        "subtree_context",
        "exact_path_context",
        "revision"
      ],
      "optional_fields": [
        "compiled_under_authority_ref",
        "transformed_context"
      ],
      "context_item": {
        "path": "canonical_logical_path",
        "source_digest": "sha256_hex"
      },
      "transformed_context_item": {
        "representation_ref": "typed_ref CONTEXT_REPRESENTATION",
        "path": "canonical_logical_path"
      },
      "applicability": [
        "PROJECT",
        "SUBTREE",
        "EXACT_PATH"
      ]
    },
    "AUTHORITY_TRANSITION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "transition_id",
        "transition_type",
        "predecessor_refs",
        "exact_contract_bindings",
        "human_statement_refs",
        "accepted_evidence_refs",
        "authority_epoch",
        "sequence"
      ],
      "optional_fields": [
        "fork_base_ref",
        "competing_head_refs",
        "selected_winner_ref"
      ],
      "forbidden_binding_types": [
        "HANDOFF_PROJECTION",
        "REPOSITORY_SYNC_OBSERVATION"
      ]
    },
    "REPOSITORY_BINDING": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "provider",
        "repository_identity",
        "persistence_ref",
        "persistence_policy",
        "effect_classification",
        "writer_model",
        "revision"
      ],
      "writer_model": [
        "SINGLE_WRITER",
        "MULTI_WRITER"
      ]
    },
    "REPOSITORY_SYNC_OBSERVATION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "observation_id",
        "observed_at",
        "persistence_ref",
        "local_commit",
        "classification",
        "revision"
      ],
      "optional_fields": [
        "remote_commit"
      ],
      "classification": [
        "REPOSITORY_SYNCED",
        "LOCAL_AHEAD_REMOTE",
        "REMOTE_AHEAD_LOCAL",
        "REMOTE_DIVERGED",
        "REMOTE_SYNC_UNKNOWN",
        "REMOTE_SYNC_BLOCKED",
        "EXTERNAL_STOP_PROHIBITS_SYNC",
        "NO_CANONICAL_REMOTE"
      ],
      "remote_commit_presence_by_classification": {
        "REPOSITORY_SYNCED": "REQUIRED",
        "LOCAL_AHEAD_REMOTE": "REQUIRED",
        "REMOTE_AHEAD_LOCAL": "REQUIRED",
        "REMOTE_DIVERGED": "REQUIRED",
        "REMOTE_SYNC_UNKNOWN": "OPTIONAL",
        "REMOTE_SYNC_BLOCKED": "OPTIONAL",
        "EXTERNAL_STOP_PROHIBITS_SYNC": "REQUIRED",
        "NO_CANONICAL_REMOTE": "FORBIDDEN"
      },
      "invariants": [
        "REMOTE_COMMIT_CONDITIONAL_BY_CLASSIFICATION"
      ]
    },
    "HUMAN_STATEMENT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "statement_id",
        "statement_class",
        "exact_statement",
        "captured_at",
        "authority_assurance",
        "subject_refs"
      ],
      "subject_ref_targets_by_statement_class": {
        "GOAL": [
          "PROJECT_GENESIS",
          "INTENT_BASELINE",
          "CONVERGENCE_ROOT"
        ],
        "INTENT_CONFIRMATION": [
          "INTENT_BASELINE",
          "RUN_HORIZON",
          "REPOSITORY_BINDING"
        ],
        "STOP": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "RESUME": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "CONVERGENCE_EXTENSION": [
          "CONVERGENCE_EXTENSION"
        ],
        "MIGRATION_APPROVAL": [
          "DISTRIBUTION_ORIGIN",
          "EXTERNAL_SUBJECT",
          "KERNEL_MANIFEST",
          "CAPABILITY_BINDING",
          "OPERATION_CONTRACT"
        ],
        "FORK_RESOLUTION_APPROVAL": [
          "AUTHORITY_TRANSITION"
        ],
        "EXECUTION_APPROVAL": [
          "TASK_CONTRACT",
          "OPERATION_CONTRACT"
        ],
        "OTHER": []
      }
    },
    "CONVERGENCE_ROOT": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "convergence_root_id",
        "objective_identity",
        "revision"
      ]
    },
    "CONVERGENCE_POLICY": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "convergence_root_ref",
        "dimensions",
        "revision"
      ],
      "dimensions_item": {
        "id": "ascii_id",
        "authorized_total": "nonnegative_safe_integer",
        "preauthorized_extension_delta_limit": "nonnegative_safe_integer"
      },
      "dimension_rule": "dimension ids are the exact unique id set declared by this policy; every admitted tranche, reservation, extension delta, and continuity quantity names a member of that set exactly once; omitted dimensions are zero only in reducer projections, never in admitted quantity lists",
      "invariants": [
        "CONVERGENCE_DIMENSIONS_VALID"
      ],
      "set_key": "id"
    },
    "CONVERGENCE_EXTENSION": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "convergence_root_ref",
        "deltas",
        "trigger_evidence_refs",
        "revision"
      ],
      "deltas_item": {
        "dimension_id": "ascii_id",
        "delta": "nonnegative_safe_integer"
      },
      "set_key": "dimension_id",
      "invariants": [
        "CONVERGENCE_DIMENSIONS_VALID"
      ]
    },
    "CONVERGENCE_TRANCHE": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "convergence_root_ref",
        "continuity_epoch",
        "continuity_assessment_ref",
        "granted",
        "revision"
      ],
      "granted_item": {
        "dimension_id": "ascii_id",
        "value": "nonnegative_safe_integer"
      },
      "set_key": "dimension_id",
      "invariants": [
        "CONVERGENCE_DIMENSIONS_VALID"
      ]
    },
    "REVIEW_REQUEST": {
      "required_fields": [
        "record_type",
        "schema_version",
        "project_id",
        "review_request_id",
        "review_purpose",
        "subjects",
        "subject_record_refs",
        "required_independence_dimensions",
        "required_evidence_refs",
        "revision"
      ],
      "optional_fields": [
        "supersedes_review_request_ref"
      ],
      "subjects_item": {
        "path": "canonical_logical_path",
        "source_digest": "sha256_hex"
      },
      "subject_record_ref_targets": [
        "TASK_CONTRACT",
        "OPERATION_CONTRACT",
        "INTENT_BASELINE",
        "LIFECYCLE_GRAPH",
        "ATTEMPT_RECORD",
        "EFFECT_CLAIM"
      ],
      "evidence_ref_targets": [
        "EXTERNAL_OBSERVATION",
        "ENFORCEMENT_ASSESSMENT",
        "REVIEW_RESULT"
      ],
      "invariants": [
        "AT_LEAST_ONE_SUBJECT_LIST_NONEMPTY"
      ]
    }
  },
  "field_types": {
    "PROJECT_GENESIS": {
      "record_type": "enum(PROJECT_GENESIS)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "project_name": "unicode_scalar_string",
      "authority_epoch": "canonical_integer",
      "sequence": "canonical_integer",
      "bootstrap_profile_id": "ascii_token",
      "human_statement_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "HUMAN_STATEMENT"
          ],
          "same_project": true
        },
        "min_items": 1,
        "set_semantics": true
      },
      "distribution_origin_ref": {
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
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "convergence_policy_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_POLICY"
        ],
        "same_project": true
      },
      "adoption_subject_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "EXTERNAL_SUBJECT"
        ],
        "same_project": true
      },
      "extensions": {
        "kind": "object"
      }
    },
    "COMPILED_MANIFEST": {
      "record_type": "enum(COMPILED_MANIFEST)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "compiled_manifest_id": "ascii_id",
      "distribution_origin_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "DISTRIBUTION_ORIGIN"
        ],
        "same_project": true
      },
      "runtime_export": {
        "kind": "object",
        "fields": {
          "path": "canonical_logical_path",
          "source_path": "canonical_logical_path",
          "source_digest": "sha256_hex"
        }
      },
      "contract_exports": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "contract_id": "ascii_token",
            "source_path": "canonical_logical_path",
            "source_digest": "sha256_hex"
          }
        },
        "min_items": 6,
        "max_items": 6,
        "set_key": "path"
      },
      "selected_capability_exports": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "capability_id": "ascii_id",
            "path": "canonical_logical_path",
            "source_path": "canonical_logical_path",
            "source_digest": "sha256_hex"
          }
        },
        "min_items": 0,
        "set_key": "path"
      },
      "child_layout": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "role": "ascii_token",
            "required": "boolean"
          }
        },
        "min_items": 1,
        "set_key": "path"
      },
      "forbidden_distribution_roots": {
        "kind": "list",
        "items": "canonical_logical_path",
        "min_items": 1,
        "set_semantics": true
      },
      "closure_status": "enum(COMPLETE)",
      "revision": "canonical_integer",
      "repository_binding_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "REPOSITORY_BINDING"
        ],
        "same_project": true
      }
    },
    "DISTRIBUTION_ORIGIN": {
      "record_type": "enum(DISTRIBUTION_ORIGIN)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "machine_name": "enum(Markdown Machine)",
      "machine_version": "unicode_scalar_string",
      "source_transport": "enum(ARCHIVE,GIT_REPOSITORY)",
      "source_identity": "unicode_scalar_string",
      "content_set_digest": "sha256_hex",
      "compatibility_family": "ascii_id",
      "enforcement_profile": "ascii_token",
      "runtime_source": {
        "kind": "object",
        "fields": {
          "path": "canonical_logical_path",
          "sha256": "sha256_hex"
        }
      },
      "git_commit": "git_object_id",
      "git_tree": "git_object_id",
      "governing_sources": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "sha256": "sha256_hex"
          }
        },
        "min_items": 6,
        "max_items": 6,
        "set_semantics": true
      },
      "selected_capability_sources": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "capability_id": "ascii_id",
            "path": "canonical_logical_path",
            "sha256": "sha256_hex"
          }
        },
        "min_items": 0,
        "set_semantics": true
      }
    },
    "KERNEL_MANIFEST": {
      "record_type": "enum(KERNEL_MANIFEST)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "distribution_origin_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "DISTRIBUTION_ORIGIN"
        ],
        "same_project": true
      },
      "compatibility_family": "ascii_id",
      "admission_contract_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "GOVERNING_CONTRACT"
        ],
        "same_project": false,
        "target_identity": {
          "identity_field": "contract_id",
          "contract_id": "MM-AUTHORITY/1"
        }
      },
      "selected_capability_runtime_refs": {
        "kind": "list",
        "items": {
          "kind": "sha256_ref"
        },
        "min_items": 0,
        "set_semantics": true
      },
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "candidate_shaped_binding_types": {
        "kind": "list",
        "items": "enum(KERNEL_MANIFEST,TASK_CONTRACT,CAPABILITY_BINDING,OPERATION_CONTRACT,LIFECYCLE_GRAPH,RUN_HORIZON,REPOSITORY_BINDING)",
        "min_items": 0,
        "set_semantics": true
      }
    },
    "INTENT_BASELINE": {
      "record_type": "enum(INTENT_BASELINE)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "intent_baseline_id": "ascii_id",
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "human_statement_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "HUMAN_STATEMENT"
          ],
          "same_project": true
        },
        "min_items": 1,
        "set_semantics": true
      },
      "intent_items": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "id": "ascii_id",
            "text": "unicode_scalar_string"
          }
        },
        "min_items": 1,
        "set_key": "id"
      },
      "supersession": {
        "kind": "object",
        "fields": {
          "prior_intent_baseline_ref": {
            "kind": "typed_ref",
            "target_record_types": [
              "INTENT_BASELINE"
            ],
            "same_project": true
          },
          "item_relations": {
            "kind": "list",
            "items": {
              "kind": "object",
              "fields": {
                "old_id": "ascii_id",
                "new_ids": {
                  "kind": "list",
                  "items": "ascii_id",
                  "min_items": 0,
                  "set_semantics": true
                }
              }
            },
            "min_items": 0,
            "set_key": "old_id"
          }
        }
      },
      "authorized_capability_ids": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 0,
        "set_semantics": true
      },
      "constraints": {
        "kind": "list",
        "items": "unicode_scalar_string",
        "min_items": 0
      },
      "non_goals": {
        "kind": "list",
        "items": "unicode_scalar_string",
        "min_items": 0
      },
      "run_horizon_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "RUN_HORIZON"
        ],
        "same_project": true
      },
      "revision": "canonical_integer"
    },
    "RUN_HORIZON": {
      "record_type": "enum(RUN_HORIZON)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "run_horizon_id": "ascii_id",
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "authorized_frontier": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 0,
        "set_semantics": true
      },
      "reachable_terminal_nodes": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 0,
        "set_semantics": true
      },
      "allowed_effect_classes": {
        "kind": "list",
        "items": "ascii_token",
        "min_items": 0,
        "set_semantics": true
      },
      "human_statement_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "HUMAN_STATEMENT"
          ],
          "same_project": true
        },
        "min_items": 1,
        "set_semantics": true
      },
      "revision": "canonical_integer"
    },
    "CAPABILITY_BINDING": {
      "record_type": "enum(CAPABILITY_BINDING)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "capability_id": "ascii_id",
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "intent_baseline_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "INTENT_BASELINE"
        ],
        "same_project": true
      },
      "runtime_ref": {
        "kind": "sha256_ref"
      },
      "capability_source_ref": {
        "kind": "sha256_ref"
      },
      "capability_state": "enum(ONBOARDING,ACTIVE,SUSPENDED,RETIRED,REVOKED)",
      "operation_floor_profile_id": "contract_key_ref",
      "revision": "canonical_integer"
    },
    "OPERATION_CONTRACT": {
      "record_type": "enum(OPERATION_CONTRACT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "operation_contract_id": "ascii_id",
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "intent_baseline_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "INTENT_BASELINE"
        ],
        "same_project": true
      },
      "capability_binding_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CAPABILITY_BINDING"
        ],
        "same_project": true
      },
      "capability_id": "ascii_id",
      "operation_family": "ascii_token",
      "revision": "canonical_integer"
    },
    "LIFECYCLE_GRAPH": {
      "record_type": "enum(LIFECYCLE_GRAPH)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "graph_id": "ascii_id",
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "node_ids": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 1,
        "set_semantics": true
      },
      "edges": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "from": "ascii_id",
            "to": "ascii_id"
          }
        },
        "min_items": 0,
        "set_semantics": true
      },
      "edge_ids": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 0,
        "set_semantics": true
      },
      "current_node_id": "ascii_id",
      "terminal_node_ids": {
        "kind": "list",
        "items": "ascii_id",
        "min_items": 1,
        "set_semantics": true
      },
      "capability_binding_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "CAPABILITY_BINDING"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "run_horizon_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "RUN_HORIZON"
        ],
        "same_project": true
      },
      "revision": "canonical_integer"
    },
    "TASK_CONTRACT": {
      "record_type": "enum(TASK_CONTRACT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "task_id": "ascii_id",
      "compiled_under_authority_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "intent_baseline_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "INTENT_BASELINE"
        ],
        "same_project": true
      },
      "capability_binding_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CAPABILITY_BINDING"
        ],
        "same_project": true
      },
      "operation_contract_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "OPERATION_CONTRACT"
        ],
        "same_project": true
      },
      "purpose": "unicode_scalar_string",
      "scope": {
        "kind": "list",
        "items": "unicode_scalar_string",
        "min_items": 0
      },
      "prohibited_scope": {
        "kind": "list",
        "items": "unicode_scalar_string",
        "min_items": 0
      },
      "completion_conditions": {
        "kind": "list",
        "items": "unicode_scalar_string",
        "min_items": 0
      },
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "lifecycle_node_id": "ascii_id",
      "project_context": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "source_digest": "sha256_hex"
          }
        },
        "min_items": 0,
        "set_semantics": true
      },
      "subtree_context": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "source_digest": "sha256_hex"
          }
        },
        "min_items": 0,
        "set_semantics": true
      },
      "exact_path_context": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "source_digest": "sha256_hex"
          }
        },
        "min_items": 0,
        "set_semantics": true
      },
      "transformed_context": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "representation_ref": {
              "kind": "typed_ref",
              "target_record_types": [
                "CONTEXT_REPRESENTATION"
              ],
              "same_project": true
            },
            "path": "canonical_logical_path"
          }
        },
        "min_items": 0,
        "set_semantics": true
      },
      "revision": "canonical_integer"
    },
    "AUTHORITY_TRANSITION": {
      "record_type": "enum(AUTHORITY_TRANSITION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "transition_id": "ascii_id",
      "transition_type": "enum(INTENT_ACCEPT,INTENT_SUPERSEDE,CAPABILITY_BIND,CAPABILITY_SUSPEND,CAPABILITY_MIGRATE,LIFECYCLE_PUBLISH,RUN_HORIZON_RAISE,RUN_HORIZON_LOWER,TASK_AUTHORIZE,TASK_CANCEL,REVIEW_AUTHORIZE,RESULT_ACCEPT,STOP,RESUME,CONVERGENCE_EXTEND,AUTHORITY_FORK_RESOLVE,KERNEL_MIGRATE)",
      "predecessor_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "PROJECT_GENESIS",
            "AUTHORITY_TRANSITION"
          ],
          "same_project": true
        },
        "min_items": 1,
        "max_items": 100,
        "set_semantics": true
      },
      "exact_contract_bindings": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "DISTRIBUTION_ORIGIN",
            "KERNEL_MANIFEST",
            "INTENT_BASELINE",
            "CAPABILITY_BINDING",
            "LIFECYCLE_GRAPH",
            "RUN_HORIZON",
            "OPERATION_CONTRACT",
            "TASK_CONTRACT",
            "REVIEW_REQUEST",
            "CONVERGENCE_ROOT",
            "CONVERGENCE_POLICY",
            "CONVERGENCE_EXTENSION",
            "CONVERGENCE_TRANCHE",
            "REPOSITORY_BINDING"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "human_statement_refs": {
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
      "accepted_evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "HUMAN_STATEMENT",
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
      "authority_epoch": "canonical_integer",
      "sequence": "canonical_integer",
      "fork_base_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "PROJECT_GENESIS",
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      },
      "competing_head_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "AUTHORITY_TRANSITION"
          ],
          "same_project": true
        },
        "min_items": 2,
        "max_items": 100,
        "set_semantics": true
      },
      "selected_winner_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "AUTHORITY_TRANSITION"
        ],
        "same_project": true
      }
    },
    "REPOSITORY_BINDING": {
      "record_type": "enum(REPOSITORY_BINDING)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "provider": "ascii_token",
      "repository_identity": "unicode_scalar_string",
      "persistence_ref": "canonical_logical_path",
      "persistence_policy": "enum(PUSH_ON_BOUNDED_CLOSEOUT,LOCAL_ONLY,EXTERNAL_POLICY)",
      "effect_classification": "ascii_token",
      "writer_model": "enum(SINGLE_WRITER,MULTI_WRITER)",
      "revision": "canonical_integer"
    },
    "REPOSITORY_SYNC_OBSERVATION": {
      "record_type": "enum(REPOSITORY_SYNC_OBSERVATION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "observation_id": "ascii_id",
      "observed_at": "rfc3339_utc_timestamp",
      "persistence_ref": "canonical_logical_path",
      "local_commit": "git_object_id",
      "remote_commit": "git_object_id",
      "classification": "enum(REPOSITORY_SYNCED,LOCAL_AHEAD_REMOTE,REMOTE_AHEAD_LOCAL,REMOTE_DIVERGED,REMOTE_SYNC_UNKNOWN,REMOTE_SYNC_BLOCKED,EXTERNAL_STOP_PROHIBITS_SYNC,NO_CANONICAL_REMOTE)",
      "revision": "canonical_integer"
    },
    "HUMAN_STATEMENT": {
      "record_type": "enum(HUMAN_STATEMENT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "statement_id": "ascii_id",
      "statement_class": "enum(GOAL,INTENT_CONFIRMATION,STOP,RESUME,CONVERGENCE_EXTENSION,MIGRATION_APPROVAL,FORK_RESOLUTION_APPROVAL,EXECUTION_APPROVAL,OTHER)",
      "exact_statement": "unicode_scalar_string",
      "captured_at": "rfc3339_utc_timestamp",
      "authority_assurance": "enum(DIRECT_SESSION_HUMAN,PROTECTED_HUMAN_ATTESTATION,SIGNED_EXTERNAL_AUTHORITY,HISTORICALLY_ACCEPTED_HUMAN_PROVENANCE,UNKNOWN)",
      "subject_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types_from": "human_subject_type_filter_by_statement_class",
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      }
    },
    "CONVERGENCE_ROOT": {
      "record_type": "enum(CONVERGENCE_ROOT)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "convergence_root_id": "ascii_id",
      "objective_identity": "unicode_scalar_string",
      "revision": "canonical_integer"
    },
    "CONVERGENCE_POLICY": {
      "record_type": "enum(CONVERGENCE_POLICY)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "dimensions": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "id": "ascii_id",
            "authorized_total": "nonnegative_safe_integer",
            "preauthorized_extension_delta_limit": "nonnegative_safe_integer"
          }
        },
        "min_items": 1,
        "set_key": "id"
      },
      "revision": "canonical_integer"
    },
    "CONVERGENCE_EXTENSION": {
      "record_type": "enum(CONVERGENCE_EXTENSION)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "deltas": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "dimension_id": "ascii_id",
            "delta": "nonnegative_safe_integer"
          }
        },
        "min_items": 1,
        "set_key": "dimension_id"
      },
      "trigger_evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "sha256_ref"
        },
        "min_items": 1,
        "set_semantics": true
      },
      "revision": "canonical_integer"
    },
    "CONVERGENCE_TRANCHE": {
      "record_type": "enum(CONVERGENCE_TRANCHE)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "convergence_root_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_ROOT"
        ],
        "same_project": true
      },
      "continuity_epoch": "canonical_integer",
      "continuity_assessment_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "CONVERGENCE_CONTINUITY_ASSESSMENT"
        ],
        "same_project": true
      },
      "granted": {
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
      "revision": "canonical_integer"
    },
    "REVIEW_REQUEST": {
      "record_type": "enum(REVIEW_REQUEST)",
      "schema_version": "canonical_integer",
      "project_id": "ascii_id",
      "review_request_id": "ascii_id",
      "review_purpose": "ascii_token",
      "subjects": {
        "kind": "list",
        "items": {
          "kind": "object",
          "fields": {
            "path": "canonical_logical_path",
            "source_digest": "sha256_hex"
          }
        },
        "min_items": 0
      },
      "subject_record_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "TASK_CONTRACT",
            "OPERATION_CONTRACT",
            "INTENT_BASELINE",
            "LIFECYCLE_GRAPH",
            "ATTEMPT_RECORD",
            "EFFECT_CLAIM"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "required_independence_dimensions": {
        "kind": "list",
        "items": "enum(author_independence,subject_binding)",
        "min_items": 0,
        "set_semantics": true
      },
      "supersedes_review_request_ref": {
        "kind": "typed_ref",
        "target_record_types": [
          "REVIEW_REQUEST"
        ],
        "same_project": true
      },
      "required_evidence_refs": {
        "kind": "list",
        "items": {
          "kind": "typed_ref",
          "target_record_types": [
            "EXTERNAL_OBSERVATION",
            "ENFORCEMENT_ASSESSMENT",
            "REVIEW_RESULT"
          ],
          "same_project": true
        },
        "min_items": 0,
        "set_semantics": true
      },
      "revision": "canonical_integer"
    }
  },
  "transition_families": {
    "INTENT_ACCEPT": {
      "binding_cardinality": {
        "INTENT_BASELINE": {
          "min": 1,
          "max": 1
        },
        "RUN_HORIZON": {
          "min": 1,
          "max": 1
        },
        "CONVERGENCE_TRANCHE": {
          "min": 1,
          "max": 1
        },
        "REPOSITORY_BINDING": {
          "min": 0,
          "max": 1
        }
      },
      "human_statement_class": "INTENT_CONFIRMATION",
      "human_subject_mode": "EXACT_BOUND_CONTRACT_SET",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "INITIAL_CONVERGENCE_TRANCHE_VALID"
      ]
    },
    "INTENT_SUPERSEDE": {
      "binding_cardinality": {
        "INTENT_BASELINE": {
          "min": 1,
          "max": 1
        },
        "RUN_HORIZON": {
          "min": 1,
          "max": 1
        },
        "REPOSITORY_BINDING": {
          "min": 0,
          "max": 1
        }
      },
      "human_statement_class": "INTENT_CONFIRMATION",
      "human_subject_mode": "EXACT_BOUND_CONTRACT_SET",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "INTENT_SUPERSESSION_VALID"
      ]
    },
    "CAPABILITY_BIND": {
      "binding_cardinality": {
        "CAPABILITY_BINDING": {
          "min": 1,
          "max": 1
        },
        "OPERATION_CONTRACT": {
          "min": 1,
          "max": 100
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "BOUND_CAPABILITY_AUTHORIZED_BY_CURRENT_INTENT",
        "BOUND_OPERATION_CONTRACTS_SATISFY_FLOORS"
      ]
    },
    "CAPABILITY_SUSPEND": {
      "binding_cardinality": {
        "CAPABILITY_BINDING": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "DENY_ONLY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "CAPABILITY_SUSPENSION_VALID"
      ]
    },
    "LIFECYCLE_PUBLISH": {
      "binding_cardinality": {
        "LIFECYCLE_GRAPH": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "LIFECYCLE_REFERENCES_CURRENT_BINDINGS_AND_HORIZON"
      ]
    },
    "RUN_HORIZON_RAISE": {
      "binding_cardinality": {
        "RUN_HORIZON": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": "INTENT_CONFIRMATION",
      "human_subject_mode": "EXACT_BOUND_CONTRACT_SET",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "NEW_HORIZON_STRICT_SUPERSET_CURRENT"
      ]
    },
    "RUN_HORIZON_LOWER": {
      "binding_cardinality": {
        "RUN_HORIZON": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "DENY_ONLY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "NEW_HORIZON_SUBSET_OR_EQUAL_CURRENT"
      ]
    },
    "TASK_AUTHORIZE": {
      "binding_cardinality": {
        "TASK_CONTRACT": {
          "min": 1,
          "max": 1
        },
        "REVIEW_REQUEST": {
          "min": 0,
          "max": 20
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "BOUND_OPERATION_CEILING_ONLY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "TASK_REFERENCES_CURRENT_INTENT_CAPABILITY_OPERATION",
        "TASK_REVIEW_REQUIREMENT_MATERIALIZED"
      ]
    },
    "TASK_CANCEL": {
      "binding_cardinality": {
        "TASK_CONTRACT": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "DENY_ONLY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "TASK_CANCELS_CURRENT_TASK"
      ]
    },
    "REVIEW_AUTHORIZE": {
      "binding_cardinality": {
        "REVIEW_REQUEST": {
          "min": 1,
          "max": 20
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "REVIEW_REQUEST_MATCHES_CURRENT_SUBJECT"
      ]
    },
    "RESULT_ACCEPT": {
      "binding_cardinality": {
        "TASK_CONTRACT": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": null,
      "human_subject_mode": "NONE",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "RESULT_ACCEPT_LINKS_CURRENT_TASK",
        "REQUIRED_REVIEW_RESULTS_PASS"
      ]
    },
    "STOP": {
      "binding_cardinality": {},
      "human_statement_class": "STOP",
      "human_subject_mode": "EXACT_PREDECESSOR_SET",
      "effect_delta": "DENY_ONLY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": []
    },
    "RESUME": {
      "binding_cardinality": {},
      "human_statement_class": "RESUME",
      "human_subject_mode": "EXACT_PREDECESSOR_SET",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "ACTIVE_STOP_BARRIER_REQUIRED"
      ]
    },
    "CONVERGENCE_EXTEND": {
      "binding_cardinality": {
        "CONVERGENCE_EXTENSION": {
          "min": 1,
          "max": 1
        },
        "CONVERGENCE_TRANCHE": {
          "min": 1,
          "max": 1
        }
      },
      "human_statement_class": "CONVERGENCE_EXTENSION",
      "human_subject_mode": "EXACT_CONVERGENCE_EXTENSION",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "CONVERGENCE_EXTENSION_AUTHORIZED"
      ]
    },
    "AUTHORITY_FORK_RESOLVE": {
      "binding_cardinality": {
        "DISTRIBUTION_ORIGIN": {
          "min": 1,
          "max": 1
        },
        "KERNEL_MANIFEST": {
          "min": 1,
          "max": 1
        },
        "INTENT_BASELINE": {
          "min": 1,
          "max": 1
        },
        "CAPABILITY_BINDING": {
          "min": 0,
          "max": 100
        },
        "LIFECYCLE_GRAPH": {
          "min": 1,
          "max": 1
        },
        "RUN_HORIZON": {
          "min": 1,
          "max": 1
        },
        "OPERATION_CONTRACT": {
          "min": 0,
          "max": 100
        },
        "TASK_CONTRACT": {
          "min": 0,
          "max": 100
        },
        "REVIEW_REQUEST": {
          "min": 0,
          "max": 100
        },
        "CONVERGENCE_ROOT": {
          "min": 1,
          "max": 1
        },
        "CONVERGENCE_POLICY": {
          "min": 1,
          "max": 1
        },
        "REPOSITORY_BINDING": {
          "min": 0,
          "max": 1
        }
      },
      "human_statement_class": "FORK_RESOLUTION_APPROVAL",
      "human_subject_mode": "EXACT_FORK_HEAD_SET",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 2,
        "max": 100
      },
      "preconditions": [
        "FORK_RESOLUTION_VALID",
        "FORK_RESOLUTION_PUBLICATION_GUARANTEE"
      ]
    },
    "KERNEL_MIGRATE": {
      "binding_cardinality": {
        "DISTRIBUTION_ORIGIN": {
          "min": 1,
          "max": 1
        },
        "KERNEL_MANIFEST": {
          "min": 1,
          "max": 1
        },
        "INTENT_BASELINE": {
          "min": 0,
          "max": 1
        },
        "CAPABILITY_BINDING": {
          "min": 0,
          "max": 100
        },
        "LIFECYCLE_GRAPH": {
          "min": 0,
          "max": 1
        },
        "RUN_HORIZON": {
          "min": 0,
          "max": 1
        },
        "OPERATION_CONTRACT": {
          "min": 0,
          "max": 100
        },
        "TASK_CONTRACT": {
          "min": 0,
          "max": 100
        },
        "REVIEW_REQUEST": {
          "min": 0,
          "max": 100
        },
        "CONVERGENCE_POLICY": {
          "min": 0,
          "max": 1
        },
        "REPOSITORY_BINDING": {
          "min": 0,
          "max": 1
        }
      },
      "human_statement_class": "MIGRATION_APPROVAL",
      "human_subject_mode": "EXACT_MIGRATION_SUBJECT",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "KERNEL_MIGRATION_SOURCE_PINNED",
        "KERNEL_MIGRATION_CUTOVER_VALID",
        "MIGRATION_APPROVAL_CURRENT_AND_SUBJECT_EXACT"
      ]
    },
    "CAPABILITY_MIGRATE": {
      "binding_cardinality": {
        "CAPABILITY_BINDING": {
          "min": 1,
          "max": 1
        },
        "OPERATION_CONTRACT": {
          "min": 1,
          "max": 100
        }
      },
      "human_statement_class": "MIGRATION_APPROVAL",
      "human_subject_mode": "EXACT_CAPABILITY_MIGRATION_SET",
      "effect_delta": "NO_NEW_EFFECT_AUTHORITY",
      "predecessor": {
        "min": 1,
        "max": 1
      },
      "preconditions": [
        "CAPABILITY_MIGRATION_SOURCE_PINNED"
      ]
    }
  },
  "precondition_bindings": {
    "INITIAL_CONVERGENCE_TRANCHE_VALID": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "the INTENT_ACCEPT candidate tranche is same project/root as the candidate intent convergence root, has continuity_epoch 0, references one valid epoch-0 continuity assessment, contains each policy dimension at most once, and grants nonnegative values no greater than the policy authorized_total for each dimension; epoch 0 has no predecessor continuity transfer and this base grant is counted once as newly authorized capacity"
    },
    "INTENT_SUPERSESSION_VALID": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate intent has same project and new revision, carries supersession.prior_intent_baseline_ref equal to the current intent, preserves explicit unresolved human constraints, lists every prior item id exactly once, maps only to existing candidate ids, permits one-to-many and many-to-one mappings, uses empty new_ids only for explicit deletion, and rejects unknown/duplicate ids or omission by inference; candidate-only ids are additions and the complete candidate item/constraint set remains human-approved"
    },
    "BOUND_CAPABILITY_AUTHORIZED_BY_CURRENT_INTENT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate capability_id is a member of current INTENT_BASELINE.authorized_capability_ids and candidate intent_baseline_ref equals the current intent binding"
    },
    "BOUND_OPERATION_CONTRACTS_SATISFY_FLOORS": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "candidate CAPABILITY_BINDING.operation_floor_profile_id equals MM-GOVERNING-RECORDS/1#floors; every bound candidate OPERATION_CONTRACT satisfies OPERATION_CONTRACT_POLICY_RESOLVER against that candidate capability binding and its exact digest-bound selected export; any missing, duplicate, mismatched, unresolved, or unrecognized selector, selected export row, or floor_satisfaction_rule rejects; this is candidate semantic policy-source validation only and consumes no current Task, review, human-authority, planned-effect, resource, or repository-currentness execution input"
    },
    "CAPABILITY_SUSPENSION_VALID": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate CAPABILITY_BINDING identifies a currently bound capability and changes only to a legal deny-only suspension state without broadening operation authority"
    },
    "LIFECYCLE_REFERENCES_CURRENT_BINDINGS_AND_HORIZON": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate lifecycle run_horizon_ref equals current horizon, every capability_binding_ref is current, current_node_id is in node_ids, every edge endpoint is in node_ids, and terminal_node_ids is a subset of node_ids"
    },
    "NEW_HORIZON_STRICT_SUPERSET_CURRENT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate frontier, reachable terminal nodes, and allowed effects are each supersets of current values and at least one set is a strict superset; required current-human INTENT_CONFIRMATION binds the candidate horizon"
    },
    "NEW_HORIZON_SUBSET_OR_EQUAL_CURRENT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate frontier, reachable terminal nodes, and allowed effects are each subsets of or equal to current values"
    },
    "TASK_REFERENCES_CURRENT_INTENT_CAPABILITY_OPERATION": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate Task intent_baseline_ref, capability_binding_ref, operation_contract_ref, convergence_root_ref, and lifecycle_node_id equal the corresponding current admitted bindings"
    },
    "TASK_REVIEW_REQUIREMENT_MATERIALIZED": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "resolve the effective operation policy through OPERATION_CONTRACT_POLICY_RESOLVER for the exact current Task-bound OperationContract, then derive the review kind from effective_review_floor; SELF_CHECK requires an authorized ReviewRequest whose immutable typed subjects include that exact Task and OperationContract and whose dimensions are exactly empty; INDEPENDENT_REQUIRED requires the same exact bindings with dimensions exactly author_independence and subject_binding; no other review-floor or request combination is valid"
    },
    "TASK_CANCELS_CURRENT_TASK": {
      "resolution_kind": "OPERATOR",
      "operator": "TASK_BINDING_MUTATION_ALLOWED"
    },
    "REVIEW_REQUEST_MATCHES_CURRENT_SUBJECT": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "each path/digest subject equals exact current or explicitly inert candidate bytes; each typed subject resolves to one permitted family and is current/non-inert under BINDING_REDUCER or the exact family currentness rule; at least one subject list is nonempty; every current or superseding request must contain exact current Task and exact current OperationContract typed subjects, and its required_independence_dimensions must equal the review floor derived through OPERATION_CONTRACT_POLICY_RESOLVER (SELF_CHECK = empty, INDEPENDENT_REQUIRED = author_independence plus subject_binding); a superseding request may name only one exact current request for the same project, Task, OperationContract, review purpose, immutable subject set, and required dimension set; stale operation/Task subjects, changed-operation replacements, missing or duplicate replacement targets, multiple distinct current successors, and conflicting revision histories reject; no request is displaced by omission, timing, or matching dimensions alone"
    },
    "RESULT_ACCEPT_LINKS_CURRENT_TASK": {
      "resolution_kind": "OPERATOR",
      "operator": "RESULT_ACCEPT_LINKS_CURRENT_TASK"
    },
    "REQUIRED_REVIEW_RESULTS_PASS": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "derive the required set only from REVIEW_REQUEST records exactly bound by the Task's admitting TASK_AUTHORIZE transition or later currently authorized requests whose immutable typed subject set contains the exact current Task and exact current OperationContract; resolve effective_review_floor through OPERATION_CONTRACT_POLICY_RESOLVER, apply current greatest-valid request revisions, retain only requests whose dimensions equal that resolved floor projection, exclude an earlier request only when exactly one valid same-floor successor explicitly supersedes it, require exactly one current result identity per remaining request, and require its greatest-valid revision verdict PASS plus REVIEW_RESULT_INDEPENDENCE_VALID PASS; unrelated, stale, changed-operation, weaker replacement, missing, multiply resolved, or conflicting request/result state rejects"
    },
    "ACTIVE_STOP_BARRIER_REQUIRED": {
      "resolution_kind": "OPERATOR",
      "operator": "REQUIRE_STOP_STATE"
    },
    "CONVERGENCE_EXTENSION_AUTHORIZED": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate extension targets the current convergence root, deltas are nonnegative and within policy extension limits, one current qualifying CONVERGENCE_EXTENSION human statement exactly binds the extension, and the same transition binds exactly one candidate CONVERGENCE_TRANCHE for that root; if the tranche remains in the current continuity epoch then its per-dimension granted value equals the extension delta exactly; if the tranche advances to exactly current continuity_epoch + 1 then its valid continuity assessment determines continuity_transfer for every dimension and tranche.granted equals continuity_transfer plus the extension delta; continuity epochs may not be skipped; transferred capacity is carry-forward rather than new authorization and only the extension delta is counted as newly authorized capacity"
    },
    "FORK_RESOLUTION_VALID": {
      "resolution_kind": "OPERATOR",
      "operator": "REPLAY_FORK_RESOLUTION"
    },
    "FORK_RESOLUTION_PUBLICATION_GUARANTEE": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "pre-admission qualifying non-peer enforcement evidence bound to the exact competing-head set, selected winner, and canonical persistence ref proves that one canonical single-winner publication can be produced; the not-yet-admitted resolution need not already exist at the canonical ref; post-admission canonical readback is not part of this transition precondition and is enforced by repository currentness before any successor ordinary transition"
    },
    "KERNEL_MIGRATION_SOURCE_PINNED": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate Origin and KernelManifest are exact-bound from fixed Origin source paths and candidate grammar/governing bytes are digest-verified for candidate-shape validation only"
    },
    "KERNEL_MIGRATION_CUTOVER_VALID": {
      "resolution_kind": "OPERATOR",
      "operator": "KERNEL_MIGRATION_CUTOVER_VALID"
    },
    "MIGRATION_APPROVAL_CURRENT_AND_SUBJECT_EXACT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "one qualifying current-human MIGRATION_APPROVAL exactly binds the candidate DISTRIBUTION_ORIGIN and KERNEL_MANIFEST and precedes the migration transition"
    },
    "CAPABILITY_MIGRATION_SOURCE_PINNED": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate capability source/runtime refs are exact digest-bound to the selected candidate distribution and one qualifying current-human MIGRATION_APPROVAL exactly binds the capability migration subject"
    }
  },
  "transition_field_rules": {
    "ordinary": {
      "forbidden": [
        "fork_base_ref",
        "competing_head_refs",
        "selected_winner_ref"
      ],
      "authority_epoch": "PREDECESSOR_EPOCH",
      "sequence": "PREDECESSOR_SEQUENCE_PLUS_ONE"
    },
    "AUTHORITY_FORK_RESOLVE": {
      "required": [
        "predecessor_refs",
        "fork_base_ref",
        "competing_head_refs",
        "selected_winner_ref"
      ],
      "fork_structure": {
        "predecessor_refs": "EXACT_COMPLETE_VISIBLE_COMPETING_HEAD_SET",
        "competing_head_refs": "EXACT_SAME_SET_AS_PREDECESSOR_REFS",
        "fork_base_ref": "EXACT_COMMON_FORK_BASE",
        "selected_winner_ref": "ONE_MEMBER_OF_COMPETING_HEAD_SET",
        "authority_epoch": "MAX_PREDECESSOR_EPOCH_PLUS_ONE",
        "sequence": "ZERO"
      }
    }
  },
  "human_subject_type_filter_by_statement_class": {
    "GOAL": [
      "PROJECT_GENESIS",
      "INTENT_BASELINE",
      "CONVERGENCE_ROOT"
    ],
    "INTENT_CONFIRMATION": [
      "INTENT_BASELINE",
      "RUN_HORIZON",
      "REPOSITORY_BINDING"
    ],
    "STOP": [
      "PROJECT_GENESIS",
      "AUTHORITY_TRANSITION"
    ],
    "RESUME": [
      "PROJECT_GENESIS",
      "AUTHORITY_TRANSITION"
    ],
    "CONVERGENCE_EXTENSION": [
      "CONVERGENCE_EXTENSION"
    ],
    "MIGRATION_APPROVAL": [
      "DISTRIBUTION_ORIGIN",
      "EXTERNAL_SUBJECT",
      "KERNEL_MANIFEST",
      "CAPABILITY_BINDING",
      "OPERATION_CONTRACT"
    ],
    "FORK_RESOLUTION_APPROVAL": [
      "AUTHORITY_TRANSITION"
    ],
    "EXECUTION_APPROVAL": [
      "TASK_CONTRACT",
      "OPERATION_CONTRACT"
    ],
    "OTHER": []
  },
  "invariant_bindings": {
    "PROJECT_ID_HIGH_ENTROPY_OR_EXACT_HISTORICAL_ID_IN_ADOPTION": {
      "resolution_kind": "BOUNDED_RULE",
      "rule": "fresh project_id is newly high-entropy; adoption may reuse only the exact historical project identity proven by EXTERNAL_SUBJECT"
    },
    "ONE_BOOTSTRAP_ADMITTED_GENESIS_PER_LINEAGE": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "authority replay admits exactly one epoch-0 sequence-0 PROJECT_GENESIS per positive lineage"
    },
    "KERNEL_ORIGIN_EQUALITY": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "KERNEL_MANIFEST.distribution_origin_ref equals PROJECT_GENESIS.distribution_origin_ref"
    },
    "SOURCE_ORIGIN_EQUALITY": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "every governing_sources and selected_capability_sources digest equals the exact selected-distribution source bytes at its canonical path"
    },
    "RUNTIME_ORIGIN_EQUALITY": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "DISTRIBUTION_ORIGIN.runtime_source.path is exactly project-runtime/RUNTIME.md and its sha256 equals the exact selected-distribution bytes at that path; the path and digest are both required and neither content_set_digest nor a child copy substitutes for this proof"
    },
    "GOVERNING_SOURCE_SET_EXACT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "DISTRIBUTION_ORIGIN.governing_sources path set equals fixed_governing_source_paths exactly"
    },
    "GIT_IDENTITY_REQUIRED_FOR_GIT_TRANSPORT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "source_transport GIT_REPOSITORY requires git_commit and git_tree; ARCHIVE forbids them unless another current schema explicitly permits"
    },
    "EXACT_COMPILED_SOURCE_BINDING": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "each compiled manifest export source_path/source_digest exactly equals the selected DistributionOrigin source binding"
    },
    "EXACT_RUNTIME_EXPORT_BINDING": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "COMPILED_MANIFEST.runtime_export.source_path and source_digest equal DISTRIBUTION_ORIGIN.runtime_source.path and sha256 exactly, and the child runtime export at runtime_export.path has bytes whose sha256 equals source_digest"
    },
    "EXACT_SIX_CONTRACT_EXPORTS": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "contract_exports contains exactly six unique paths and exactly the six fixed governing contract identities"
    },
    "FORBIDDEN_DISTRIBUTION_ROOTS_ABSENT": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "no child_layout path is under a forbidden distribution-only root"
    },
    "CHILD_CLOSURE_COMPLETE": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "every required child_layout path and every exact exported runtime/contract/capability path exists in the fixed publication set"
    },
    "ADMISSION_CONTRACT_EQUALS_CURRENT_KERNEL": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "KERNEL_MANIFEST.admission_contract_ref resolves exactly to admitted MM-AUTHORITY/1"
    },
    "CANDIDATE_SHAPE_PATHS_FIXED": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "candidate shape grammar and governing registry resolve only from the fixed project-runtime/RECORD-GRAMMAR.md and project-runtime/GOVERNING-RECORD-CONTRACTS.md Origin-bound paths"
    },
    "EDGE_ENDPOINTS_IN_NODE_IDS": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "every lifecycle edge from/to value is a member of node_ids"
    },
    "TERMINAL_NODES_SUBSET_OF_NODE_IDS": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "every terminal_node_id is a member of node_ids"
    },
    "REMOTE_COMMIT_CONDITIONAL_BY_CLASSIFICATION": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "remote_commit is required, optional, or forbidden exactly according to remote_commit_presence_by_classification"
    },
    "AT_LEAST_ONE_SUBJECT_LIST_NONEMPTY": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "REVIEW_REQUEST.subjects or REVIEW_REQUEST.subject_record_refs is nonempty"
    },
    "CONVERGENCE_DIMENSIONS_VALID": {
      "resolution_kind": "FINITE_RELATION",
      "relation": "each admitted convergence quantity is a nonnegative_safe_integer; each listed dimension id occurs exactly once and is a member of the current CONVERGENCE_POLICY dimension id set; no unlisted dimension, negative value, duplicate, overflow, or omitted admitted quantity is valid"
    }
  },
  "floors": {
    "profile_id": "MM-GOVERNING-RECORDS/1#floors",
    "operation_policy_resolver": {
      "rule_id": "OPERATION_CONTRACT_POLICY_RESOLVER",
      "resolution_kind": "BOUNDED_RULE",
      "inputs": [
        "current_project_id",
        "current_or_candidate_CAPABILITY_BINDING",
        "current_or_candidate_OPERATION_CONTRACT",
        "exact_selected_CAPABILITY_RUNTIME_EXPORT"
      ],
      "recognized_export_rule": "OPERATION_CONTRACT_POLICY_RESOLVER_FROM_MM-GOVERNING-RECORDS/1#floors",
      "selection": "the OperationContract capability_binding_ref resolves exactly once to the current or candidate CapabilityBinding in the same project; that binding operation_floor_profile_id equals MM-GOVERNING-RECORDS/1#floors, runtime_ref resolves by exact retained digest/source identity to exactly one selected CAPABILITY_RUNTIME_EXPORT in the exact selected-capability closure, and the selected export operation_contract_schema_ref and operation_floor_profile_id equal the exact current governing contract and floors profile; when present, the binding capability_source_ref equals the exact selected capability source binding from the DistributionOrigin; the export capability_id equals both the binding capability_id and OperationContract capability_id; the OperationContract project_id equals the current/candidate project and binding project, intent_baseline_ref equals the binding intent_baseline_ref, and capability_binding_ref equals the binding identity; operation_family matches exactly one row in that export.operation_contract_floors",
      "effective_policy": "the selected operation_contract_floors row is the sole effective policy and projects authority_floor, effect_floor, review_floor, resource_floor, human_boundary, allowed_effect_classes, and prohibited_effect_classes",
      "fail_closed": "zero or multiple binding/export/operation-row matches, missing or mismatched retained source/digest identity, capability-id mismatch, project or typed-reference mismatch, floor_satisfaction_rule other than the exact recognized_export_rule, unrecognized policy value, or any other missing/malformed/ambiguous selector rejects",
      "historical_pinning": "resolve only from the exact retained/bound capability export selected by the binding; never substitute the newest export, current repository version, unbound capability file, fuzzy operation-family match, cache, or agent memory"
    },
    "authority_values": [
      "CURRENT_ADMITTED_TASK_AUTHORITY"
    ],
    "review_values": [
      "SELF_CHECK",
      "INDEPENDENT_REQUIRED"
    ],
    "human_values": [
      "TECHNICAL_AUTONOMY",
      "HUMAN_IF_INTENT",
      "HUMAN_REQUIRED",
      "HUMAN_IF_RESERVED_EFFECT"
    ],
    "effect_values": [
      "NONE",
      "LOCAL_REVERSIBLE",
      "REPOSITORY_WRITE",
      "PROJECT_SPECIFIC",
      "HUMAN_RESERVED"
    ],
    "resource_values": [
      "SERIAL",
      "PROJECT_SPECIFIC"
    ],
    "independence_dimensions": [
      "author_independence",
      "subject_binding"
    ],
    "review_satisfaction": {
      "SELF_CHECK": {
        "required_independence_dimensions": [],
        "rule": "one applicable authorized self-check ReviewRequest/ReviewResult PASS is sufficient; reviewer independence is not claimed"
      },
      "INDEPENDENT_REQUIRED": {
        "required_independence_dimensions": [
          "author_independence",
          "subject_binding"
        ],
        "rule": "one applicable authorized ReviewResult PASS plus REVIEW_RESULT_INDEPENDENCE_VALID PASS is required"
      }
    },
    "effect_relations": {
      "allowed": "planned_effects is a subset of the effective policy allowed_effect_classes returned by OPERATION_CONTRACT_POLICY_RESOLVER",
      "prohibited": "planned_effects intersection the effective policy prohibited_effect_classes returned by OPERATION_CONTRACT_POLICY_RESOLVER is empty",
      "horizon": "planned_effects is a subset of current RUN_HORIZON.allowed_effect_classes",
      "undeclared": "an effect not in the closed effect vocabulary or not declared by the operation is UNDECLARED_EFFECT and rejects",
      "write_ahead": "every significant external effect requires a current write-ahead EFFECT_CLAIM before commencement",
      "effective_floor": "if planned_effects is empty then effective_effect_floor is NONE; otherwise the effective policy effect_floor returned by OPERATION_CONTRACT_POLICY_RESOLVER must not be NONE and effective_effect_floor equals that value; effect-floor labels are abstract classifications and are never required to appear as literal members of planned_effects",
      "human_reserved_boundary": "when planned_effects is nonempty and effective_effect_floor is HUMAN_RESERVED, one qualifying current EXECUTION_APPROVAL binding the exact current TASK_CONTRACT and OPERATION_CONTRACT is required regardless of human_boundary; HUMAN_IF_RESERVED_EFFECT remains valid compatibility vocabulary but does not own this safety condition"
    },
    "resource_satisfaction": {
      "SERIAL": "no artificial RESOURCE_RESERVATION is required when execution is actually serial and no project-specific contention exists",
      "PROJECT_SPECIFIC": "current qualifying reservation/proof is required; unknown ownership or proof fails closed"
    },
    "human_satisfaction": {
      "TECHNICAL_AUTONOMY": "this human boundary adds no execution-approval requirement and expands no other authority; it does not waive an execution approval required independently by effect_relations.human_reserved_boundary",
      "HUMAN_IF_INTENT": "unresolved human-owned intent yields HUMAN_DECISION_REQUIRED; otherwise this human boundary adds no execution-approval requirement; it does not waive an execution approval required independently by effect_relations.human_reserved_boundary",
      "HUMAN_REQUIRED": "this human boundary requires one qualifying current EXECUTION_APPROVAL binding the exact current TASK_CONTRACT and OPERATION_CONTRACT; this requirement is conjunctive with and does not waive effect_relations.human_reserved_boundary",
      "HUMAN_IF_RESERVED_EFFECT": "this human boundary applies the HUMAN_REQUIRED rule when effective_effect_floor is HUMAN_RESERVED; it is compatibility/readability vocabulary and does not replace, weaken, or waive the independent effect_relations.human_reserved_boundary rule"
    },
    "qualifying_human_assurance": [
      "DIRECT_SESSION_HUMAN",
      "PROTECTED_HUMAN_ATTESTATION",
      "SIGNED_EXTERNAL_AUTHORITY"
    ],
    "nonqualifying_human_assurance": [
      "HISTORICALLY_ACCEPTED_HUMAN_PROVENANCE",
      "UNKNOWN"
    ],
    "authority_satisfaction": "current Task is non-tombstoned in the admitted Task map, current OperationContract is the Task's bound operation, and all current authority/currentness barriers pass",
    "enforcement_satisfaction": "all Attempt required_enforcement_dimensions have qualifying current evidence; evidence is deny-only and never positive authority",
    "satisfaction_order": [
      "CURRENT_TASK_AND_OPERATION",
      "REVIEW",
      "EFFECT",
      "HUMAN",
      "RESOURCE",
      "ENFORCEMENT",
      "CURRENTNESS"
    ],
    "fail_rule": "unknown, missing, stale, unlisted, or multiply resolved required floor input rejects"
  }
}
---
# MM-GOVERNING-RECORDS/1

This registry defines positive records, transition admission, retained
record-local invariants, and operation floors. Records are validated with
`MM-RECORD-GRAMMAR/1`; recovery-only records are defined in `MM-RECOVERY/1`.
Unknown fields and unresolved executable names fail closed.

## Transition closure

`transition_families` is the sole per-family source for family identity,
predecessor cardinality, binding cardinality, human statement class, and
precondition names. `precondition_bindings` has exactly the same key set as all
preconditions used by that table. A binding's `resolution_kind` controls how it
is evaluated: `OPERATOR` resolves one admitted operator-registry key, while
`FINITE_RELATION` and `BOUNDED_RULE` execute only the finite relation/rule stated
in the binding. The labels `FINITE_RELATION` and `BOUNDED_RULE` are never
operator names.

Ordinary transition fields obey `transition_field_rules.ordinary`.
`AUTHORITY_FORK_RESOLVE` obeys the exact fork structure in its dedicated rule.
No duplicate predecessor/admission table exists elsewhere.

## Invariant closure

`invariant_bindings` is the complete executable table for every invariant name
retained by a current positive record family. Every retained invariant resolves
exactly once. Redundant typed-reference restatements, narrow-Genesis
restatements, duplicated source membership/origin restatements,
`EDGE_SET_SEMANTICS`, `WHOLE_CHILD_RECORD_VALIDATION`, and currentness/barrier
behavior misclassified as record-local invariants are not current invariant
names. Whole-child validation remains the finite compiler publication
procedure in `MM-COMPILER/1`, not a recursive record invariant.

## Operation floors

`floors` is one closed profile. Operation eligibility requires the current
admitted Task and bound OperationContract, then deterministically evaluates
review, effect, human, resource, enforcement, horizon, and repository-currentness
inputs. The declared satisfaction order computes `effective_effect_floor` before
any human rule consumes it. `NONE` remains an effect class but is not a review
or resource floor. An undeclared effect rejects.

Current-law `OPERATION_CONTRACT` records persist the exact capability binding,
capability identity, and operation-family selector; they do not persist a second
copy of the seven policy values. Records admitted under a predecessor contract
may retain those fields and remain interpretable only under that exact retained
predecessor law/source identity. Migration does not rewrite or reinterpret those
historical records, and current-law resolution never falls back to their stored
values.

When planned effects are nonempty and `effective_effect_floor` is
`HUMAN_RESERVED`, one qualifying current `EXECUTION_APPROVAL` binding the exact
current Task and OperationContract is required regardless of the effective
policy's `human_boundary`.
`HUMAN_IF_RESERVED_EFFECT` remains valid compatibility vocabulary; reserved-effect
safety no longer depends on a capability author selecting that boundary value.

`SELF_CHECK` requires the exact empty independence-dimension set.
`INDEPENDENT_REQUIRED` requires exactly `author_independence` and
`subject_binding`. Human execution authority qualifies only through
`DIRECT_SESSION_HUMAN`, `PROTECTED_HUMAN_ATTESTATION`, or
`SIGNED_EXTERNAL_AUTHORITY`; historical or unknown provenance cannot grant new
execution authority.

## Review subjects

`REVIEW_REQUEST.subjects` and `subject_record_refs` may each be empty
individually, but `AT_LEAST_ONE_SUBJECT_LIST_NONEMPTY` requires at least one of
the two sets to be nonempty. Typed-record-only, path/digest-only, and mixed
review subjects are therefore lawful; both empty rejects.

## Intent supersession relation

An `INTENT_SUPERSEDE` candidate `INTENT_BASELINE` carries `supersession` with
one exact `prior_intent_baseline_ref` and a finite `item_relations` set. Every
old item id in the prior baseline appears exactly once as `old_id`; every
listed `new_id` exists in the candidate, and duplicate old ids, duplicate
relation targets, unknown ids, self-contradictory mappings, and missing
relations reject. An empty `new_ids` list is the explicit deletion relation.
An old id mapped to itself preserves the item (whether or not its text
changes); one old id may map to many new ids and many old ids may map to one
new id. Candidate-only ids are additions and require no predecessor. No
relation is inferred from omission, text similarity, timestamps, or file
order. The candidate's complete item set, relation, constraints, and
human-statement binding are the approved subject; the relation never itself
approves changed product intent.

## Task context and active intent envelope

`TASK_CONTRACT.intent_baseline_ref` is the exact current intent binding, not a
route-local copy. Recover / Reduce / Route expands that binding and retains the
complete `INTENT_BASELINE.intent_items`, `constraints`, `non_goals`, its exact
`run_horizon_ref`, and the human statements named by the current intent and
horizon. The Task's `project_context`, `subtree_context`, and
`exact_path_context` remain distinct technical applicability mappings and may
be reduced to the smallest sufficient route slice. `transformed_context` is
technical orientation with exact provenance; it cannot replace, summarize
away, or override the active intent envelope. Missing or ambiguous envelope
references fail closed or route to the applicable human decision; they are not
filled from `purpose`, free-form scope, timestamps, prior chat, or model
output. A deny-only execution restriction remains an execution boundary and
does not supersede or alter the objective.

## Required-review selection

For a current non-tombstoned Task, the required set is the union of (a) the
`REVIEW_REQUEST` records exactly bound by that Task's admitting
`TASK_AUTHORIZE` transition and (b) later currently authorized requests whose
immutable typed subject set contains both the exact current Task and its exact
current `OPERATION_CONTRACT`. The canonical review kind is the exact
The effective review floor returned by `OPERATION_CONTRACT_POLICY_RESOLVER` is
canonical: `SELF_CHECK` requires an empty dimension set, and
`INDEPENDENT_REQUIRED` requires exactly `author_independence` and
`subject_binding`. A request applies only when its project, Task, operation,
subject bytes, authorization transition, review kind, and required dimension
set are exact. A request with matching dimensions but no exact Task binding is
unrelated and cannot satisfy the Task.

Within each request identity, the greatest valid revision is current. A later
request may replace one earlier request only by carrying
`supersedes_review_request_ref` to exactly one current request with the same
Task, OperationContract, review purpose, immutable subject set, and canonical
floor/dimensions; omission, timing, or a changed operation never replaces a
request. Duplicate identical bytes are one request. Distinct equal maxima,
malformed revision histories, stale subjects, weaker replacements, duplicate
replacement targets, and ambiguous replacement chains are blocking. For each
remaining request there must be exactly one current applicable
`REVIEW_RESULT` identity; its greatest valid revision must be `PASS`, and its
independence result must pass under `MM-RECOVERY/1`. Zero or multiple current
results, a stale result, or any missing request/result is unsatisfied. An
unrelated PASS never enters this set.

## Fixed governing closure

`DISTRIBUTION_ORIGIN.governing_sources` contains exactly the six canonical
governing paths listed by `fixed_governing_source_paths`. Each member is
digest-bound to exact selected-distribution bytes. Capability exports remain
outside this fixed-six set.

`RESULT_ACCEPT` remains an authority transition but is not a current record
family. `REPOSITORY_SYNC_INTENT` is not a current record family.
`REPOSITORY_SYNC_OBSERVATION` remains deny-only evidence and never positive
authority.
