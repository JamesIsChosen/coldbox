---
{
  "record_type": "LIFECYCLE_GRAPH",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "graph_id": "coldbox-presentation-rebuild-to-freeze",
  "node_ids": [
    "design_verification",
    "flows_ux",
    "human_product_approval",
    "product_challenge",
    "product_discovery",
    "product_freeze"
  ],
  "edges": [
    {"from": "design_verification", "to": "product_freeze"},
    {"from": "flows_ux", "to": "design_verification"},
    {"from": "human_product_approval", "to": "flows_ux"},
    {"from": "product_challenge", "to": "human_product_approval"},
    {"from": "product_discovery", "to": "product_challenge"}
  ],
  "current_node_id": "product_discovery",
  "terminal_node_ids": ["product_freeze"],
  "capability_binding_refs": [
    {"ref": "sha256:c8b81f0d805b4041e725152064261f62b154a4e4d9a6f77d4f152562dca48223", "path": ".markdown-machine/authority/capability-binding-software-product.md"}
  ],
  "run_horizon_ref": {"ref": "sha256:285d8cd11cbb5e9b145a9069db3f635ad1d16150c02d5a0d33d9b51125f40bf2", "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md"},
  "revision": 1
}
---
# Presentation-rebuild lifecycle through Product Freeze

The graph deliberately ends at Product Freeze. Architecture and implementation require a later horizon change after the human's second mock review and valid freeze.
