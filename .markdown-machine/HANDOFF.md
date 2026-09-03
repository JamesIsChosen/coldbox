---
{
  "record_type": "HANDOFF_PROJECTION",
  "schema_version": 1,
  "authoritative": false,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "basis_head_ref": {"ref": "sha256:33e0a9e7e16b3ed6482d88296b2c454c936522c8f1999b7bd84dabf00b21f83e", "path": ".markdown-machine/authority/authority-transition-kernel-migrate-v0.7.0.md"},
  "basis_repository_commit": "9630a3336462ab5442e95c285259cf5a876cf160",
  "authority_epoch": 0,
  "sequence": 5,
  "origin_ref": {"ref": "sha256:b3e0080189145d8b77edc7e5b115623df8e2501a3a34e80d61003c08f960e27b", "path": ".markdown-machine/ORIGIN.md"},
  "kernel_manifest_ref": {"ref": "sha256:3226fdd36a1691d9973e86eb09a44b5adde7fb2c6b1284ef1f9364072076cfca", "path": ".markdown-machine/authority/kernel-manifest-v0.7.0.md"},
  "stop_state": "NONE",
  "run_horizon_ref": {"ref": "sha256:285d8cd11cbb5e9b145a9069db3f635ad1d16150c02d5a0d33d9b51125f40bf2", "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md"},
  "selected_capability_ids": ["software-product"],
  "current_tasks": [
    {"task_id": "mock-rereview-product-discovery", "ref": {"ref": "sha256:d4fbdb608665446276884ef2611024425fd192168d3224acbc38205dee9f5e7a", "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md"}, "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md", "operation_family": "DISCOVERY", "review_floor": "SELF_CHECK"}
  ],
  "human_action_required": "Review the provisionally approved workstation mock again after bootstrap; record requested changes or renewed approval before Product Freeze.",
  "review_barrier": [],
  "convergence_remaining": {"design_verification_cycles": 2, "governance_adoption_cycles": 0, "product_challenge_cycles": 1, "product_discovery_cycles": 2, "product_freeze_reviews": 1},
  "repository_sync": "REPOSITORY_SYNCED",
  "next_lawful": "CURRENT_TASK",
  "lifecycle_node_id": "product_discovery",
  "generated_at_closeout": "2026-09-03T05:55:15Z"
}
---
# Markdown Machine handoff projection

This projection is non-authoritative. The authority head is recovered from the admitted records.
