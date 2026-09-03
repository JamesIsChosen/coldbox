---
{
  "record_type": "AUTHORITY_TRANSITION",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "transition_id": "kernel-migrate-markdown-machine-v0.7.0",
  "transition_type": "KERNEL_MIGRATE",
  "predecessor_refs": [
    {"ref": "sha256:0f9ce09bb944ae76ecec598d95ea097f257a8d5ca0a8146a123780e01b76ae22", "path": ".markdown-machine/authority/authority-transition-task-authorize.md"}
  ],
  "exact_contract_bindings": [
    {"ref": "sha256:b3e0080189145d8b77edc7e5b115623df8e2501a3a34e80d61003c08f960e27b", "path": ".markdown-machine/ORIGIN.md"},
    {"ref": "sha256:3226fdd36a1691d9973e86eb09a44b5adde7fb2c6b1284ef1f9364072076cfca", "path": ".markdown-machine/authority/kernel-manifest-v0.7.0.md"},
    {"ref": "sha256:64718b7965160449301fcd54d296d1de4f6bb1800d098ab34deb46837a11cfbd", "path": ".markdown-machine/intent/intent-baseline-presentation-rebuild.md"},
    {"ref": "sha256:c8b81f0d805b4041e725152064261f62b154a4e4d9a6f77d4f152562dca48223", "path": ".markdown-machine/authority/capability-binding-software-product.md"},
    {"ref": "sha256:609b19353ead74ebb28dece6a38c4a2d7a139c0c78fa119d72c9f917f7eb596a", "path": ".markdown-machine/lifecycle/lifecycle-graph-presentation-rebuild.md"},
    {"ref": "sha256:285d8cd11cbb5e9b145a9069db3f635ad1d16150c02d5a0d33d9b51125f40bf2", "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md"},
    {"ref": "sha256:a2059443c8aaf4af05b23f62383fbc741ffb4776a7438f0cf3e7de0354f582ff", "path": ".markdown-machine/authority/operation-contract-discovery.md"},
    {"ref": "sha256:1b67e52472961e87708c019c2bc15bae9887d4d0b288ec8e4a4b06c246cca8b3", "path": ".markdown-machine/authority/operation-contract-product-freeze.md"},
    {"ref": "sha256:d4fbdb608665446276884ef2611024425fd192168d3224acbc38205dee9f5e7a", "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md"},
    {"ref": "sha256:1d14436330d927359f39ec7363a1720a426cdbef66680782cbd82636ef5d14fe", "path": ".markdown-machine/REPOSITORY.md"}
  ],
  "human_statement_refs": [
    {"ref": "sha256:be45cf8407f8a39738197a60c30dc6254d1f96c80bcd13083fbad56ab55ade48", "path": ".markdown-machine/authority/human-statement-mm-v0.7.0-migration.md"}
  ],
  "accepted_evidence_refs": [
    {"ref": "sha256:680a47132ff3eb1f80c913b161e548097f03e839953ffcf2796def26f151a891", "path": ".markdown-machine/external-state/repository-sync-observation-mm-v0.7.0-pre-migration.md"}
  ],
  "authority_epoch": 0,
  "sequence": 5
}
---
# Migrate Coldbox to Markdown Machine v0.7.0

This ordinary single-parent transition replaces the v0.6.1 kernel with the exact v0.7.0 candidate while preserving the admitted Coldbox intent, capability, lifecycle, horizon, task, and repository bindings.
