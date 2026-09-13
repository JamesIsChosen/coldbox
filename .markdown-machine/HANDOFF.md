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
  "basis_repository_commit": "06d4660d48ce22d0c6fc680afe7b861576761c23",
  "authority_epoch": 0,
  "sequence": 7,
  "origin_ref": {
    "ref": "sha256:643a6493ff64d91cfc73a08ca54127bb1962be9629fe3424d6ff24a633d1db5b",
    "path": ".markdown-machine/history/8b71e8d18ae2d9a3820348fb195357f72cc7ef74e7323b315769a73cb9fa4766/ORIGIN.md"
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
  "generated_at_closeout": "2026-09-13T00:14:56Z"
}
---
# Markdown Machine handoff projection

The local tree carries the user-requested v0.10.2.1 test candidate. Its sequence-8 transition is not asserted admitted: shared-main publication was rejected by automatic approval review and remains pending explicit authorization. This projection retains the predecessor bindings and routes repository recovery.

The human explicitly directed testing migration without protected original-Inbox-boundary evidence. That evidence and normative checkpoint acceptance remain unproved; do not infer them from the user instruction, local commit, or source hashes.

Regenerate this projection from actual authority/currentness after publication. The required human mock review remains unfinished.
