---
{
  "record_type": "RUN_HORIZON",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "run_horizon_id": "bootstrap-to-product-freeze",
  "authorized_frontier": ["design_verification", "flows_ux", "human_product_approval", "product_challenge", "product_discovery", "product_freeze"],
  "reachable_terminal_nodes": ["product_freeze"],
  "allowed_effect_classes": ["REPOSITORY_WRITE"],
  "human_statement_refs": [
    {"ref": "sha256:a2c92fdb6b8fa747d738b6059389c77ea0420beae85dff95907ed612270d80ed", "path": ".markdown-machine/authority/human-statement-intent-confirmation.md"}
  ],
  "revision": 2
}
---
# Bootstrap-to-Product-Freeze run horizon with repository writes

Candidate horizon staged after the human authorized repository writes. It
remains inert until its exact Run Horizon raise transition is admitted.
