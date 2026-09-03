---
{
  "record_type": "GOVERNING_CONTRACT",
  "schema_version": 1,
  "contract_id": "DIRECT_HUMAN_GENESIS_ADMISSION/v3",
  "distribution_only": true,
  "normative": true
}
---
# DIRECT_HUMAN_GENESIS_ADMISSION/v3

This deny-only bootstrap contract admits exactly one `PROJECT_GENESIS` per
positive lineage. It does not grant capability activation, effect authority,
or convergence beyond the initial human-authorized records.

## Fresh Genesis

The human selects an exact archive or authenticated Git distribution. The
selected source, ContentSetDigest, exact origin, candidate status, and the
exact six-contract closure are verified: `project-runtime/RECORD-GRAMMAR.md`,
`project-runtime/GOVERNING-RECORD-CONTRACTS.md`,
`project-runtime/RECOVERY-CONTRACTS.md`,
`project-runtime/AUTHORITY-EVALUATOR.md`,
`project-runtime/HUMAN-CONTROL.md`, and
`bootstrap/GENESIS-ADMISSION.md`. A high-entropy `project_id`, project name,
bootstrap profile, immutable human statements, DistributionOrigin,
KernelManifest, ConvergenceRoot, ConvergencePolicy, and required references
are captured. Genesis has epoch `0` and sequence `0`; its initial bindings are
narrow and exact.

## Adoption eligibility

`ADOPTION_ELIGIBLE` passes iff all are true: the subject contains a Markdown
Machine origin declaration; the authority dispatch produced an adoption-eligible
result with lineage status; the Genesis project id equals the historical
Genesis project id; an `EXTERNAL_SUBJECT` identifies the exact historical
subject and its bytes are retained under `history/<identity-digest>/`; and a
current-human `MIGRATION_APPROVAL` statement targets exactly the adoption
`EXTERNAL_SUBJECT` and new `KERNEL_MANIFEST`.

An own-law subject is evaluated under its own law first. A shape-only rejection
may yield `PROVABLE_UNDER_RETIRED_LAW`; a barrier, authority, structure,
approval, trust, preservation, or genuine incompatibility failure rejects
adoption. A subject with no provable law may yield `NO_PROVABLE_LINEAGE` and
`HISTORICAL_UNVERIFIED`. If the own law can admit the candidate, adoption is
rejected. Adoption never releases a barrier, resets review/convergence, or
repairs past authority.

## Adoption Genesis

Presence of `adoption_subject_ref` (typed `EXTERNAL_SUBJECT`) selects adoption
mode. The adoption Genesis is the sole root of a new positive lineage at epoch
0/sequence 0. The historical Genesis is provenance only and never a positive
root, predecessor, or compiled authority. Historical statements are imported
only as provenance or current-human intent items. Open Tasks, convergence,
lifecycle, capabilities, and repository binding are compiled prospectively;
repository binding is confirmed by the first intent acceptance.

## Required preservation

The complete pre-adoption governance tree is byte-identical under the history
identity with a `HISTORY-MANIFEST.md` recording status, boundary, transition
reference, paths, and SHA-256 digests. Old evaluators are retained only for
`PROVABLE_UNDER_RETIRED_LAW`; no evaluator role is assigned to
`HISTORICAL_UNVERIFIED` bytes. The historical closure is non-current and cannot
authorize new work. A second bootstrap Genesis in one lineage is rejected.
