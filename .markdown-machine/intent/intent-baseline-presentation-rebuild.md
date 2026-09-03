---
{
  "record_type": "INTENT_BASELINE",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "intent_baseline_id": "coldbox-presentation-rebuild",
  "intent_items": [
    {"id": "governance", "text": "Markdown Machine v0.6.1 is Coldbox's sole current authority; pre-adoption Coldbox governance is historical provenance and cannot override it."},
    {"id": "logic", "text": "Preserve Coldbox's existing logical behavior and the warm/sealed security architecture."},
    {"id": "mock", "text": "Use the repository's workstation mock as the provisionally approved design direction, return it to the human for further review after bootstrap, and do not admit Product Freeze without that review."},
    {"id": "presentation", "text": "Replace Coldbox's presentation and UI/UX implementation from scratch rather than cosmetically wrapping the current interface."}
  ],
  "human_statement_refs": [
    {"ref": "sha256:f579c5aa5adc56c2cc7e735a5caf280620d33d38a45c1ded071832073a7cf292", "path": ".markdown-machine/authority/human-statement-goal-presentation-rebuild.md"}
  ],
  "authorized_capability_ids": ["software-product"],
  "constraints": [
    "The Markdown Machine adoption is governance-only and changes no product or UI code.",
    "No production implementation may begin before a valid Product Freeze for the active product slice.",
    "The human must review the provisionally approved mock again after bootstrap and before Product Freeze.",
    "Security-sensitive behavior must be characterized before mixed presentation/controller code is removed.",
    "Standalone cryptographic, vault, derivation, protocol, and security logic remains behaviorally unchanged during the presentation rebuild unless separately authorized."
  ],
  "non_goals": [
    "Changing cryptographic choices, vault formats, derivation behavior, or the warm/sealed realm boundary.",
    "Implementing new wallet capabilities during governance adoption or pre-freeze discovery.",
    "Treating unimplemented destinations depicted by the mock as functional.",
    "Releasing or deploying Coldbox within the bootstrap-to-Product-Freeze horizon."
  ],
  "run_horizon_ref": {"ref": "sha256:285d8cd11cbb5e9b145a9069db3f635ad1d16150c02d5a0d33d9b51125f40bf2", "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md"},
  "revision": 1
}
---
# Coldbox presentation-rebuild intent baseline
