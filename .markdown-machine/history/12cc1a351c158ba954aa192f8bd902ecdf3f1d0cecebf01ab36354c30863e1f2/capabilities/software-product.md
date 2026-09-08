---
{
  "record_type": "CAPABILITY_RUNTIME_EXPORT",
  "schema_version": 1,
  "title": "Software / Product Development Runtime Export",
  "project_output_eligible": true,
  "capability_id": "software-product",
  "materialization_rule": "SELECTED_CAPABILITY_ONLY",
  "operation_contract_schema_ref": "MM-GOVERNING-RECORDS/1#contracts.OPERATION_CONTRACT",
  "operation_floor_profile_id": "MM-GOVERNING-RECORDS/1#floors",
  "operation_contract_floors": [
    {
      "operation_family": "DISCOVERY",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "LOCAL_REVERSIBLE",
      "review_floor": "SELF_CHECK",
      "resource_floor": "SERIAL",
      "human_boundary": "TECHNICAL_AUTONOMY",
      "allowed_effect_classes": [],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    },
    {
      "operation_family": "PRODUCT_FREEZE",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "NONE",
      "review_floor": "INDEPENDENT_REQUIRED",
      "resource_floor": "SERIAL",
      "human_boundary": "HUMAN_IF_INTENT",
      "allowed_effect_classes": [],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    },
    {
      "operation_family": "ARCHITECTURE",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "LOCAL_REVERSIBLE",
      "review_floor": "INDEPENDENT_REQUIRED",
      "resource_floor": "SERIAL",
      "human_boundary": "TECHNICAL_AUTONOMY",
      "allowed_effect_classes": [],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    },
    {
      "operation_family": "IMPLEMENTATION",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "REPOSITORY_WRITE",
      "review_floor": "SELF_CHECK",
      "resource_floor": "PROJECT_SPECIFIC",
      "human_boundary": "TECHNICAL_AUTONOMY",
      "allowed_effect_classes": [
        "REPOSITORY_WRITE"
      ],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    },
    {
      "operation_family": "IMPLEMENTATION_ACCEPTANCE",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "NONE",
      "review_floor": "INDEPENDENT_REQUIRED",
      "resource_floor": "SERIAL",
      "human_boundary": "TECHNICAL_AUTONOMY",
      "allowed_effect_classes": [],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    },
    {
      "operation_family": "INTEGRATION",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "REPOSITORY_WRITE",
      "review_floor": "INDEPENDENT_REQUIRED",
      "resource_floor": "PROJECT_SPECIFIC",
      "human_boundary": "HUMAN_IF_RESERVED_EFFECT",
      "allowed_effect_classes": [
        "REPOSITORY_WRITE"
      ],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    },
    {
      "operation_family": "RELEASE",
      "authority_floor": "CURRENT_ADMITTED_TASK_AUTHORITY",
      "effect_floor": "HUMAN_RESERVED",
      "review_floor": "INDEPENDENT_REQUIRED",
      "resource_floor": "PROJECT_SPECIFIC",
      "human_boundary": "HUMAN_IF_RESERVED_EFFECT",
      "allowed_effect_classes": [
        "PUBLIC_RELEASE",
        "DEPLOYMENT"
      ],
      "prohibited_effect_classes": [
        "UNDECLARED_EFFECT"
      ]
    }
  ],
  "authoritative_operation_floor_source": "MM-GOVERNING-RECORDS/1#floors",
  "declared_effect_classes": [
    "DEPLOYMENT",
    "PUBLIC_RELEASE",
    "REPOSITORY_WRITE"
  ],
  "floor_satisfaction_rule": "EXACT_MATRIX_AND_EFFECT_SET_RELATION_FROM_MM-GOVERNING-RECORDS/1#floors"
}
---
# Runtime export rule

This capability runtime is **not included by default**. It may be compiled into a project only when this capability is ONBOARDING/ACTIVE (or required historical interpretation) under the capability-selection rules. AVAILABLE/HYPOTHESIZED/DISCOVERED alone do not justify copying this runtime export.

# Software / Product Development

## Interview focus

Users, problem/outcome, essential behavior, must-have/deferred scope, platforms, privacy/security, UX/accessibility, offline/online posture, commercial/rights posture where material, success criteria, non-goals, and run horizon.

## Execution neutrality

This capability is programming-language, framework, platform, package-manager, database, hosting-provider, CI/CD, test-framework, and toolchain agnostic. Product requirements and existing project truth come first. During architecture, discover and evaluate viable implementation strategies, then select the best justified stack for the accepted product intent, constraints, security/privacy posture, target platforms, maintainability, performance, portability, cost/rights boundaries, and environment.

For existing software, preserve the current stack unless accepted intent or evidence justifies migration. Do not ask the human to pick a language/framework when that is a technical choice the machine can evaluate; escalate only when the technology itself is an explicit human constraint or materially changes human-owned business/legal/risk/product intent.

## Lifecycle fragment

```text
Intent
 -> Product discovery
 -> Product challenge/council
 -> Human product approval when required
 -> Flows/UX
 -> Design verification
 -> Product Freeze
 -> Architecture
 -> Architecture challenge
 -> Implementation
 -> Implementation acceptance
 -> Integration
 -> Release readiness
```

Production implementation may not precede the capability's valid Product Freeze for the active product slice.

## Change control

Post-freeze features enter the universal Inbox. Return to the earliest affected product stage and preserve unaffected history.

## Human decisions

Product behavior/scope, visual taste where material, business/commercial/rights posture, accepted risk, and consequential UX decisions remain human-owned when unresolved.
