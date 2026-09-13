---
{
  "record_type": "AUTHORITY_TRANSITION",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "transition_id": "kernel-migrate-markdown-machine-v0.10.2.1",
  "transition_type": "KERNEL_MIGRATE",
  "predecessor_refs": [
    {
      "ref": "sha256:432641553d860c1544502e63820a8e181d6bfb163dc18106c2dac81e5ad37ec0",
      "path": ".markdown-machine/authority/authority-transition-kernel-migrate-v0.10.1.md"
    }
  ],
  "exact_contract_bindings": [
    {
      "ref": "sha256:151fe4fd3baad4c0364aa925d38a2e4270005589f6c4971410759bee11540b81",
      "path": ".markdown-machine/ORIGIN.md"
    },
    {
      "ref": "sha256:72f28f42c686438918801f2d82527ab9893fb8cec6a368226a3aec4fb7937873",
      "path": ".markdown-machine/authority/kernel-manifest-v0.10.2.1.md"
    }
  ],
  "human_statement_refs": [
    {
      "ref": "sha256:690571b5789a0a9eb379d406db3f743b06c43465cff6765391ae6f99d9bd64e7",
      "path": ".markdown-machine/authority/human-statement-mm-v0.10.2.1-migration.md"
    }
  ],
  "accepted_evidence_refs": [],
  "authority_epoch": 0,
  "sequence": 8
}
---
# Experimental migration to Markdown Machine v0.10.2.1

User-directed test migration from the exact v0.10.1 predecessor. Only Origin and KernelManifest change; the selected capability bytes, current intent, horizon, lifecycle, Tasks, reviews, convergence, effects, and repository binding are preserved.

The source is an unaccepted Inbox checkpoint. The user explicitly instructed proceeding without the unavailable protected predecessor snapshot attestation. No boundary proof is asserted, and accepted_evidence_refs is intentionally empty. This transition must not be reported as satisfying the candidate's normal original-Inbox-boundary acceptance requirements. Canonical publication and repository-currentness readback are pending; local presence alone does not admit this transition.
