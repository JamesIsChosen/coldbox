---
{
  "record_type": "TASK_CONTRACT",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "task_id": "product-challenge-presentation-rebuild",
  "intent_baseline_ref": {
    "ref": "sha256:64718b7965160449301fcd54d296d1de4f6bb1800d098ab34deb46837a11cfbd",
    "path": ".markdown-machine/intent/intent-baseline-presentation-rebuild.md"
  },
  "capability_binding_ref": {
    "ref": "sha256:f58ec31091cb0021d83673f78cf9c03a022c4f3a36b128efd7bb29b109f2f52f",
    "path": ".markdown-machine/authority/capability-binding-software-product.md"
  },
  "operation_contract_ref": {
    "ref": "sha256:c8cb7a601cb0950faa15cbd3d892b46aaee1e5951ebd1793fcdaf7aed8f0dfb0",
    "path": ".markdown-machine/authority/operation-contract-discovery.md"
  },
  "purpose": "Challenge the reviewed presentation-rebuild direction, resolve human-owned product and UX decisions, and establish the acceptance criteria needed before human product approval and flows/UX realization.",
  "scope": [
    "Turn the documented flow gaps into explicit product decisions, acceptance criteria, and deferred-scope boundaries.",
    "Resolve which workflows are in the first design-realization slice and which remain visibly unavailable.",
    "Confirm the required input, validation, error, recovery, responsive, accessibility, and completion behavior for the selected slice.",
    "Record the human-owned decisions and unresolved questions that must be answered before design realization."
  ],
  "prohibited_scope": [
    "Writing or changing product, UI, CSS, HTML, controller, cryptographic, vault, derivation, protocol, or build code.",
    "Declaring human product approval, Product Freeze, or production readiness.",
    "Changing the preserved warm/sealed security architecture or logical behavior.",
    "Treating mock evidence or simulated states as working product behavior."
  ],
  "completion_conditions": [
    "The first design-realization slice and explicit deferred scope are documented.",
    "Input, validation, state, responsive, accessibility, error/recovery, and completion acceptance criteria are explicit.",
    "Human-owned product and UX decisions are either resolved in immutable statements or clearly surfaced for approval.",
    "No product implementation, human product approval, or Product Freeze has occurred."
  ],
  "convergence_root_ref": {
    "ref": "sha256:9061478ea304e9eec15653f552a3c47ae73f67c016c0e27012b1c935513b2fbc",
    "path": ".markdown-machine/convergence/convergence-root-coldbox-presentation-rebuild.md"
  },
  "lifecycle_node_id": "product_challenge",
  "project_context": [],
  "subtree_context": [],
  "exact_path_context": [
    {
      "path": "docs/05-development/ui-reference/review/2026-09-13/flow-design-review.md",
      "source_digest": "94c40491a8bf6317b06aa8d151e9584cc8e19f0bf9ee03e931f9a6b578dafff1"
    },
    {
      "path": "docs/01-spec/SPEC.md",
      "source_digest": "a20f5354c885d8c0e4111274259b0392cf10779b4c9c9aae3da69ec33a56fc06"
    },
    {
      "path": "docs/01-spec/design-system.md",
      "source_digest": "b9e698f0af40ad7e5e439187bb5dfdb828680c68391b99fc922004ea989eb58"
    },
    {
      "path": "docs/01-spec/ui-parity.md",
      "source_digest": "1f13b897d4efdf49106c91f4cff8447eff5e822080684afc83d0cf55523b3277"
    }
  ],
  "revision": 1
}
---
# Product challenge for the presentation rebuild
