# Continuation recovery and proposed horizon amendment

Status: human decision required before the proposed horizon amendment. This is
recovery evidence and a proposal, not an admitted Task or authority transition.
No product source was changed during this recovery pass. Existing local changes
were preserved.

## Verified state

- Local HEAD and a fresh authenticated `git ls-remote origin refs/heads/main`
  read both resolve to `16101abe966468c3aa05c4896db43c6d72abf63d`.
- The bounded `.markdown-machine/` inventory contains 60 current files,
  excluding retained history. Runtime, all six contract exports, and the selected
  capability export match their compiled-manifest SHA-256 bindings.
- Current-record hinted typed references checked in this pass resolve by exact
  digest within the bounded governed inventory. This is reference-integrity
  evidence, not a claim that all transition admission predicates pass.
- The sequence 9–13 transitions and flows/UX Task are untracked local candidates;
  they are absent from the durable `main` commit. The authority evaluator says
  an authority file absent from the durable persistence-ref commit is inert.
- The design-realization OperationContract is also an untracked candidate. No
  inventoried transition admits it. `TASK_REFERENCES_CURRENT_INTENT_CAPABILITY_OPERATION`
  requires the Task's operation reference to equal a current admitted binding.
  The proposed sequence-13 Task transition therefore cannot currently pass.
- The current HANDOFF claim that this design Task is admitted and immediately
  executable is unsupported. It must not be used as execution authority.

The prior explicit instruction to test v0.10.2.1 without the unavailable
original-Inbox-boundary attestation is preserved. This recovery does not ask
for that evidence again, fabricate it, or claim normative checkpoint acceptance.

## Concrete human decision

Approve raising `bootstrap-to-product-freeze` from revision 1 to revision 2
with this sole permission change:

```json
{
  "allowed_effect_classes": ["REPOSITORY_WRITE"]
}
```

The existing authorized frontier and Product Freeze terminal remain the same.
The repository-write permission is to support the already approved first-slice
reviewable design candidate, its tests and evidence, and the necessary
Markdown Machine admission/recovery records, including normal non-force
publication to the bound repository under its closeout policy. Implementation,
integration, deployment, and release remain outside this run horizon.

This decision is required by:

- `MM-GOVERNING-RECORDS/1#floors.effect_relations.horizon`: planned effects must
  be a subset of current `RUN_HORIZON.allowed_effect_classes`, currently empty.
- `MM-GOVERNING-RECORDS/1#transition_families.RUN_HORIZON_RAISE`: raising the
  horizon requires an `INTENT_CONFIRMATION` HumanStatement bound to the exact
  candidate horizon.
- The selected software-product capability classifies the intended executable
  UI design changes as `REPOSITORY_WRITE` and explicitly retains horizon and
  effect restrictions.

The existing first-slice approval is an `OTHER` statement and does not bind an
amended Run Horizon. An ordinary continuation request does not itself provide
that missing exact-subject horizon confirmation.

## Recovery after confirmation

Capture the human confirmation against the exact candidate horizon before
admission. Re-establish a lawful predecessor and repository currentness;
construct and validate the required horizon and operation bindings; rebuild
only the unpublished dependent Task/lifecycle candidates against those bindings;
and publish/re-read the validated recovery state without force. Do not rewrite
published authority or treat Git publication alone as admission.

Then recover the exact current Task and execute its preflight, realization,
self-check, and completion requirements. Regenerate HANDOFF only from the
recovered state. No complete authority replay, clean-closeout certification,
Product Freeze, or product completion is claimed by this report.
