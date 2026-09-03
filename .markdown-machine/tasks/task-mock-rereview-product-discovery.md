---
{
  "record_type": "TASK_CONTRACT",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "task_id": "mock-rereview-product-discovery",
  "intent_baseline_ref": {"ref": "sha256:64718b7965160449301fcd54d296d1de4f6bb1800d098ab34deb46837a11cfbd", "path": ".markdown-machine/intent/intent-baseline-presentation-rebuild.md"},
  "capability_binding_ref": {"ref": "sha256:c8b81f0d805b4041e725152064261f62b154a4e4d9a6f77d4f152562dca48223", "path": ".markdown-machine/authority/capability-binding-software-product.md"},
  "operation_contract_ref": {"ref": "sha256:a2059443c8aaf4af05b23f62383fbc741ffb4776a7438f0cf3e7de0354f582ff", "path": ".markdown-machine/authority/operation-contract-discovery.md"},
  "purpose": "Return the provisionally approved workstation mock to the human after Markdown Machine bootstrap, conduct the required deeper product review, and establish the product-discovery facts needed before challenge, flows/UX, design verification, and Product Freeze.",
  "scope": [
    "Render and present the exact provisionally approved desktop and mobile mock references.",
    "Inventory the intended warm and sealed workflows, navigation, responsive behavior, accessibility expectations, unavailable-feature treatment, and presentation-to-logic seams.",
    "Record the human's requested mock changes or renewed approval without advancing to Product Freeze.",
    "Identify unresolved product-intent questions and material UX or security tradeoffs for product challenge."
  ],
  "prohibited_scope": [
    "Writing or changing product, UI, CSS, HTML, controller, cryptographic, vault, derivation, protocol, or build code.",
    "Declaring Product Freeze or treating the provisional mock approval as the required post-bootstrap review.",
    "Changing the preserved warm/sealed security architecture or logical behavior.",
    "Using pre-adoption Coldbox governance as current authority."
  ],
  "completion_conditions": [
    "The human has reviewed the mock after bootstrap and the exact outcome is captured.",
    "Product flows, presentation boundaries, responsive expectations, accessibility requirements, and unavailable-feature behavior are explicitly inventoried.",
    "Every unresolved human-owned product or UX decision is surfaced before product challenge.",
    "No product implementation or Product Freeze has occurred."
  ],
  "convergence_root_ref": {"ref": "sha256:9061478ea304e9eec15653f552a3c47ae73f67c016c0e27012b1c935513b2fbc", "path": ".markdown-machine/convergence/convergence-root-coldbox-presentation-rebuild.md"},
  "lifecycle_node_id": "product_discovery",
  "project_context": [],
  "subtree_context": [],
  "exact_path_context": [
    {"path": "docs/01-spec/SPEC.md", "source_digest": "a20f5354c885d8c0e4111274259b0392cf10779b4c9c9aae3da69ec33a56fc06"},
    {"path": "docs/01-spec/architecture.md", "source_digest": "9686d4487115f21e76903dce7ba55a8ade1c694c6db8cefc2093814b68e66858"},
    {"path": "docs/01-spec/design-system.md", "source_digest": "b9e698f0af40ad7e5e439187bb5dfdb828680c68391b99fc922004ea989eb58b"},
    {"path": "docs/01-spec/ui-parity.md", "source_digest": "1f13b897d4efdf49106c91f4cff8447eff5e822080684afc83d0cf55523b3277"},
    {"path": "docs/05-development/ui-reference/approved/coldbox-workstation-desktop-mockup.html.reference", "source_digest": "e657a14d86428f5558bf5655b12d05d3e9b732ac403c5344f73e60dd1d85066c"},
    {"path": "docs/05-development/ui-reference/approved/coldbox-workstation-mobile-mockup.html.reference", "source_digest": "f4deca09c69151985e9e960282999bed0bb8c4828b2718cc573a02d2d811e2aa"},
    {"path": "docs/05-development/ui-reference/approved/manifest.json", "source_digest": "2ba9c31e43d35f2f078309d6267ac3aa817ffcc203f710a82b747b40e7c2a7d3"},
    {"path": "src/cold/main.js", "source_digest": "de26b8358d736a0b105719e9a69462bbd9f01b5465be403cf2b7114531b61c0f"},
    {"path": "src/main.js", "source_digest": "9d6d4ff3e1bf1a6cd5d87dd6ef8f2001433d4db50a729fe02eefab70bb97a541"}
  ],
  "revision": 1
}
---
# Mock re-review and product discovery

This Task materializes the human's caveat: the mock must be reviewed again after bootstrap and before any Product Freeze.
