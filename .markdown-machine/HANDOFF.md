---
{
  "record_type": "HANDOFF_PROJECTION",
  "schema_version": 1,
  "authoritative": false,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "basis_head_ref": {
    "ref": "sha256:432641553d860c1544502e63820a8e181d6bfb163dc18106c2dac81e5ad37ec0",
    "path": ".markdown-machine/authority/authority-transition-kernel-migrate-v0.10.1.md"
  },
  "basis_repository_commit": "871d784a80a33ad01d3346d2c1d8ce1c45b4516f",
  "authority_epoch": 0,
  "sequence": 7,
  "origin_ref": {
    "ref": "sha256:643a6493ff64d91cfc73a08ca54127bb1962be9629fe3424d6ff24a633d1db5b",
    "path": ".markdown-machine/ORIGIN.md"
  },
  "kernel_manifest_ref": {
    "ref": "sha256:87822d173dbf0de810e1d4d8a7c94346009ba3de38bd988d4697c02232309ad4",
    "path": ".markdown-machine/authority/kernel-manifest-v0.10.1.md"
  },
  "stop_state": "NONE",
  "run_horizon_ref": {
    "ref": "sha256:285d8cd11cbb5e9b145a9069db3f635ad1d16150c02d5a0d33d9b51125f40bf2",
    "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md"
  },
  "selected_capability_ids": [
    "software-product"
  ],
  "current_tasks": [
    {
      "task_id": "mock-rereview-product-discovery",
      "ref": {
        "ref": "sha256:ee8bfa4b034837bd38b4abddd61e12454ba447d0e9a76cb1d59159e41ccfd648",
        "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md"
      },
      "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md",
      "operation_family": "DISCOVERY",
      "effective_review_floor": "SELF_CHECK"
    }
  ],
  "review_barrier": [],
  "convergence_remaining": {
    "design_verification_cycles": 2,
    "governance_adoption_cycles": 0,
    "product_challenge_cycles": 1,
    "product_discovery_cycles": 2,
    "product_freeze_reviews": 1
  },
  "repository_sync": "LOCAL_AHEAD_REMOTE",
  "next_lawful": "REPOSITORY_RECOVERY",
  "lifecycle_node_id": "product_discovery",
  "generated_at_closeout": "2026-09-10T00:17:23Z"
}
---
# Markdown Machine handoff projection

This projection is non-authoritative. The authority head is recovered from the admitted records.
