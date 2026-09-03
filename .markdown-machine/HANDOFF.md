---
{
  "record_type": "HANDOFF_PROJECTION",
  "schema_version": 1,
  "authoritative": false,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "basis_head_ref": {"ref": "sha256:0f9ce09bb944ae76ecec598d95ea097f257a8d5ca0a8146a123780e01b76ae22", "path": ".markdown-machine/authority/authority-transition-task-authorize.md"},
  "basis_repository_commit": "d8d9b2c651397de6c825ef05481c5134c15bbf00",
  "authority_epoch": 0,
  "sequence": 4,
  "origin_ref": {"ref": "sha256:daa5dfbded1c23c705fb16aab45b8627d6627534324af55f3c083508cbf9aa8b", "path": ".markdown-machine/ORIGIN.md"},
  "kernel_manifest_ref": {"ref": "sha256:81b19e2b2d81b15b22d46743a194d79a518d8e8f7224420b4f59177bbd91e275", "path": ".markdown-machine/authority/kernel-manifest-v0.6.1.md"},
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
  "next_lawful": "Execute the current mock-rereview-product-discovery Task under DISCOVERY; do not implement or freeze.",
  "lifecycle_node_id": "product_discovery",
  "generated_at_closeout": "2026-09-02T23:53:18Z"
}
---
# Markdown Machine handoff projection

This projection is non-authoritative. The authority head is recovered from the admitted records.
