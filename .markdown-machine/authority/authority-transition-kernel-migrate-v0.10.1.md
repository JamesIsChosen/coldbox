---
{
  "record_type": "AUTHORITY_TRANSITION",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "transition_id": "kernel-migrate-markdown-machine-v0.10.1",
  "transition_type": "KERNEL_MIGRATE",
  "predecessor_refs": [
    {
      "ref": "sha256:c6c809b1fa25607275da2b4e55318069f09072fba5cb8ad1affd5b138a324370",
      "path": ".markdown-machine/authority/authority-transition-kernel-migrate-v0.10.0.md"
    }
  ],
  "exact_contract_bindings": [
    {
      "ref": "sha256:643a6493ff64d91cfc73a08ca54127bb1962be9629fe3424d6ff24a633d1db5b",
      "path": ".markdown-machine/ORIGIN.md"
    },
    {
      "ref": "sha256:87822d173dbf0de810e1d4d8a7c94346009ba3de38bd988d4697c02232309ad4",
      "path": ".markdown-machine/authority/kernel-manifest-v0.10.1.md"
    },
    {
      "ref": "sha256:64718b7965160449301fcd54d296d1de4f6bb1800d098ab34deb46837a11cfbd",
      "path": ".markdown-machine/intent/intent-baseline-presentation-rebuild.md"
    },
    {
      "ref": "sha256:f58ec31091cb0021d83673f78cf9c03a022c4f3a36b128efd7bb29b109f2f52f",
      "path": ".markdown-machine/authority/capability-binding-software-product.md"
    },
    {
      "ref": "sha256:a977a2832ab8512108a568c005247a991e8571919332d51e0bb702b0353c3dc2",
      "path": ".markdown-machine/lifecycle/lifecycle-graph-presentation-rebuild.md"
    },
    {
      "ref": "sha256:285d8cd11cbb5e9b145a9069db3f635ad1d16150c02d5a0d33d9b51125f40bf2",
      "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md"
    },
    {
      "ref": "sha256:c8cb7a601cb0950faa15cbd3d892b46aaee1e5951ebd1793fcdaf7aed8f0dfb0",
      "path": ".markdown-machine/authority/operation-contract-discovery.md"
    },
    {
      "ref": "sha256:fc444687a7b75127fb0b8e6f65b3a008c0e2d9c4d3f3cd9f7f4c2c415aaa010c",
      "path": ".markdown-machine/authority/operation-contract-product-freeze.md"
    },
    {
      "ref": "sha256:ee8bfa4b034837bd38b4abddd61e12454ba447d0e9a76cb1d59159e41ccfd648",
      "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md"
    },
    {
      "ref": "sha256:1d14436330d927359f39ec7363a1720a426cdbef66680782cbd82636ef5d14fe",
      "path": ".markdown-machine/REPOSITORY.md"
    }
  ],
  "human_statement_refs": [
    {
      "ref": "sha256:e84a71847256165862f8b6049bca8c1a8b64baecb4cda321e109df10ca3ce452",
      "path": ".markdown-machine/authority/human-statement-mm-v0.10.1-migration.md"
    }
  ],
  "accepted_evidence_refs": [],
  "authority_epoch": 0,
  "sequence": 7
}
---
# Migrate Coldbox to Markdown Machine v0.10.1

This ordinary single-parent transition replaces the v0.10.0 kernel with the exact v0.10.1 candidate while preserving the admitted Coldbox intent, capability, lifecycle, horizon, task, and repository bindings.

The v0.10.1 distribution introduces the DESIGN_REALIZATION operation family and pre-freeze design realization policy in the software-product capability. The six canonical governing contracts and universal runtime export are byte-identical to v0.10.0. The capability-binding is updated to reflect the new capability source digest.
