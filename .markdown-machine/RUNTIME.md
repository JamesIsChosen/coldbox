---
{
  "record_type": "PROJECT_RUNTIME_EXPORT",
  "schema_version": 1,
  "title": "Universal Project Runtime Export",
  "project_output_eligible": true,
  "output_role": "UNIVERSAL_RUNTIME_SOURCE"
}
---
# Universal Project Runtime

This is the compact universal narrative exported into a child project's
`.markdown-machine/RUNTIME.md`. It defines universal runtime and closeout
procedure; exact structured record schemas, reducers, operators, and invariants
live in the six canonical contracts. It is not a template factory and cannot
be used to relax a contract.

## 1. Authority and records

Only an admitted current `AUTHORITY_TRANSITION` supplies positive governance.
Genesis is admitted by the selected bootstrap profile; it cannot be created by
project records. Ordinary authority is single-parent. A fork is unresolved
until an explicit `AUTHORITY_FORK_RESOLVE` establishes one canonical winner and
a new epoch. Files, timestamps, repository state, observations, evidence,
reviews, handoffs, inbox items, or model output never manufacture authority.

Authority records are strict Markdown records with JSON front matter. UTF-8,
LF, no BOM, one JSON object, duplicate-key rejection, canonical numbers, valid
Unicode scalars, exact typed references, closed predicates/operators, and
unknown-field/op rejection are mandatory. A record is an inert candidate until
it is admitted by the current law; a candidate cannot authorize its own
admission.

Human statements are captured before the transition that cites them and remain
immutable. Their provenance is never rewritten or reclassified. Human control
semantics are defined by `HUMAN-CONTROL.md`; unresolved human intent belongs to
the human, while derivable mechanics belong to the agent.

## 2. Human control

Humans use ordinary language for project goals, stopping, continuing, and
machine migration. No reserved command, magic phrase, version word, or token is
required. The agent classifies language using the current conversation and
recovered state, then records the exact statement. A request to continue
substantive work while stopped supplies semantic RESUME intent, but the
admitted RESUME transition must still release the barrier. Read-only status
questions do not release STOP. A clear request to use a selected candidate
distribution supplies migration approval only after exact candidate binding;
comparison or conditional language does not.

## 3. Capabilities and execution

Capability availability is not capability activation. A capability is selected
only for a distinct governed objective and is activated through its admitted
binding and operation floors. Skills are bounded procedures, not authority.

Markdown Machine is provider-, model-, platform-, tool-, language-,
methodology-, and vendor-neutral. Recover accepted intent, constraints,
existing state, risks, resources, and evidence; discover viable strategies; and
choose the best justified project-specific strategy inside the human authority
envelope. Do not infer a stack or provider from examples or tool availability.
Material mechanics belong in project strategy state with their evidence and
re-evaluation triggers.

## 4. Lifecycle, intent, inbox, and work

Intent is accepted through an immutable `INTENT_BASELINE`. Inbox material is
candidate input, never Task authority:

```text
Inbox → impact → accepted intent → lifecycle revision → Task authorization → execution
```

The lifecycle is a revisioned capability-composed graph. A changed intent,
capability, or currentness fact invalidates only causally affected state. The
Run Horizon is a current human-authorized boundary; “finish” never silently
authorizes public, destructive, payment, physical, credential, or other
consequential effects.

`TASK_CONTRACT` revisions are immutable and Task identity is stable. Only
`TASK_AUTHORIZE` and `TASK_CANCEL` mutate the Task map; cancellation leaves a
tombstone. `RESULT_ACCEPT` is linkage-only. An Attempt requires the exact
current non-tombstoned Task plus all current preflight checks. A handoff
verification fast path never substitutes for Attempt preflight.

## 5. Context and canonical targets

Stored paths are canonical logical paths: project-relative components joined by
ASCII `/`, with no empty, `.`, or `..` component, leading/trailing separator,
normalization, or host case folding. POSIX and Windows host locators are
adapters that first prove one relative logical locator; an absolute host path
is never the governing identity. Ambiguous aliases or multiple plausible
logical identities block.

The runtime accepts exactly one caller-declared locator syntax. A
`CANONICAL_LOGICAL` locator is validated directly; `POSIX_RELATIVE_HOST` uses
`/` as separator and rejects leading `/`, empty components, `..`, NUL, or an
unproved project-relative path; `WINDOWS_RELATIVE_HOST` treats `/` and `\\` as
separators and rejects drive, UNC, device, leading-separator, empty, `..`, or
invalid-scalar forms. Both adapters join validated components with `/` and then
apply the canonical logical-path rule. Physical symlinks, junctions, mounts,
hard links, and case aliases may locate bytes but cannot rewrite logical
ancestry; ambiguity blocks.

Task applicability is exactly `PROJECT`, `SUBTREE`, or `EXACT_PATH`. Exact
context is bound as `{path, source_digest}`. Transformed context is bound
through a `CONTEXT_REPRESENTATION` carrying exact provenance. Component-prefix
matching is deterministic and sibling/cousin context is excluded unless an
admitted reference requires it. Explicit references are resolved in a finite
visited-set closure; cycles stop, duplicates do not amplify authority, and
unresolved required references fail closed. No filename, proximity, search
ranking, glob, embedding, or host behavior creates applicability.

## 6. Convergence, review, resources, and effects

Each objective lineage has one finite multidimensional `CONVERGENCE_ROOT`.
Reservations precede commencement. `COMMITTED` and uncertain reservations
remain charged until a qualifying release or commit; exhaustion requires a
new human-governed finite extension. After restore or cross-copy recovery,
unknown reusable capacity is zero; continuity is keyed by convergence root and
continuity epoch.

Review requests identify immutable artifact subjects or typed subject records,
and required evidence is typed. Reviewer independence covers the dimensions
required by the ReviewPurpose; unknown independence makes a reviewer
ineligible. Author scratch and unrelated context are excluded.

Every operation proves its enforcement requirement vector. Evidence is
deny-only eligibility evidence, not authority. Under `SERIAL_PORTABLE/v1`, a
serial resource floor needs no artificial resource-fencing assessment; stronger
or project-specific floors retain their reservation and proof requirements.
Significant external effects use a write-ahead EffectClaim. Unknown effect
outcomes remain unknown and are never blindly replayed. Secrets remain external
references.

## 7. STOP and recovery

STOP denies new substantive work immediately. Graceful STOP permits only safe
preservation, reconciliation, and recovery; immediate external STOP crosses no
new intentional external-effect boundary. Recovery-critical records are
deny-only and preserve uncertainty. Clean closeout requires recoverable
authority, lifecycle/horizon, capabilities, inbox, Tasks/Attempts,
convergence, effects/resources, blockers, meaningful transient state, and next
legal route without prior chat. A clean worktree alone is not closeout proof.

Recurring clean-closeout validation is source-free and uses only this exported
runtime plus the exact six contracts carried by the child. Before claiming a
clean closeout, freeze the current governed path-and-byte set for that
evaluation. Validate every current governed record locally under the exported
record grammar and its governing or recovery family: required/optional/fixed
fields, field types and enums, unknown-field rejection, record-local
invariants, typed references, contract-key references, and uniqueness of each
`profile_id`, `registry_id`, and `contract_id` must pass. Resolve all required
typed and contract-key references exactly once within the current governed set;
zero or multiple matches reject. Then evaluate the exported authority,
current-binding, STOP, Task/Attempt, review, convergence, effect/resource,
repository-currentness, and source-free-closure rules needed to recover the
truthful current state. Unknown or unresolved state remains deny-only.

The compile-time whole-child publication marker on `COMPILED_MANIFEST` is not a
recurring steady-state invariant. Its publication satisfaction is established
by the compiler before the child is published. Source-free closeout instead
verifies that the published compiled closure and exact exported contract
identities remain available and internally resolvable, then applies the current
runtime/recovery rules above. After authoritative and recovery-critical state
is durable, validate the resulting `HANDOFF_PROJECTION` under `MM-RECOVERY/1`,
including its basis/currentness checks and highest-precedence `next_lawful`
invariant. If the frozen governed path set or any bytes already validated by
this closeout check change before the claim is made, discard that evaluation
and repeat against a new frozen set after the mutation is durable. Clean
closeout may be claimed only when this finite source-free evaluation passes and
exactly one truthful next lawful route or terminal result remains.

The original distribution, `MM-COMPILER/1`, verification corpus, hidden state,
database, daemon, external index, or prior chat is never required to perform
this recurring closeout validation.

## 8. Handoff

`HANDOFF.md` is a non-authoritative, one-screen orientation projection. Its
front matter is exactly `HANDOFF_PROJECTION`, schema version `1`,
`authoritative: false`, and the fields defined by the governing contract:
project/head basis, epoch/sequence, origin and manifest refs, STOP state and
barrier, lifecycle, horizon, selected capabilities, current Tasks, human
actions, review barriers, remaining convergence, repository-sync class, next
lawful route, and `generated_at_closeout`. Its body contains no record contents,
history, task-scope copy, effect/resource lists, or non-derived fields.

The five bounded checks are: the basis head resolves and is durable; no valid
transition descends from it; STOP reduction matches; the repository commit
basis is local HEAD, or the tree diff from that basis to local HEAD contains no
path under `.markdown-machine/` except `.markdown-machine/HANDOFF.md` while
paths outside `.markdown-machine/` may differ; and currentness passes the
repository rules. The HANDOFF-only governed-path delta is the sole
self-projection exception. Any other governed-path delta makes the projection
stale and requires regeneration. The exception grants no authority and cannot
hide changes to authoritative or recovery-critical governed state. No
AuthorityTransition, Task, or Attempt may reference a handoff.

This exception terminates closeout rather than recursively chasing the commit
that contains the projection: after authoritative governed state is durable, a
final commit may write only `.markdown-machine/HANDOFF.md` inside the governed
namespace, and that committed projection remains valid against its immediately
prior durable basis when the other four checks pass.

## 9. Repository persistence and currentness

Repository/Git state proves visibility and durability only; it is never
positive authority. A `REPOSITORY_BINDING` declares provider, identity,
persistence ref, policy, effect classification, and `writer_model`.

An authority file absent from the durable persistence-ref commit is an inert
candidate. Local HEAD detached from or inconsistent with that ref yields
`AUTHORITY_CURRENTNESS_UNKNOWN`. Structural replay from bootstrap Genesis over
durable admitted children yields one singleton head, an exact unresolved fork
set, or no provable lineage. A local-only binding is sufficient with
`SINGLE_WRITER`.

With `PUSH_ON_BOUNDED_CLOSEOUT`, obtain a fresh session observation before
substantive work. `REPOSITORY_SYNCED` is current; `LOCAL_AHEAD_REMOTE` is
current only for `SINGLE_WRITER`; remote-ahead, diverged, unknown, or blocked
states deny substantive execution. Reconcile without force and re-run
structural replay; remote-fetched children can therefore expose a fork. A
failed push leaves the same locally-ahead classification and writes no failure
record. Fork resolution additionally requires a non-peer enforcement proof of
canonical single-winner cutover and a fresh synced observation containing the
resolution record. `LATE_PRE_CUTOVER_BRANCH` evidence cannot revive authority.

## 10. Migration, history, and adoption

`KERNEL_MIGRATE` is an ordinary single-parent cutover. Stage candidate bytes as
inert data, recover the old state, exact-bind the candidate Origin and
KernelManifest, derive a finite complete plan, validate preservation and
barriers, admit one coherent binding replacement, and then remove obsolete
current-only bytes. If the exact candidate Origin and Manifest are already
current with no drift, return `NO_MIGRATION_REQUIRED`.

At a boundary, compare old and candidate governing maps. Retain only changed or
removed validation contracts—Record Grammar, Governing Records, Recovery,
Authority, Genesis, and old selected capability exports—under
`history/<old-content-set-digest>/`, byte-identically, with a history manifest.
Narrative, compiler, verification, and other current-only files are not
retained. Historical closure is non-current and cannot authorize work.

The candidate-shape rule prevents schema evolution from stranding future
successors. A v0.6 ordinary migration resolves candidate grammar and governing
registry bytes only from the fixed Origin source paths
`project-runtime/RECORD-GRAMMAR.md` and
`project-runtime/GOVERNING-RECORD-CONTRACTS.md`, checks their Origin-bound
digests and record types, and uses them for candidate shape validation only.
Every authority, predecessor, human approval, source membership, barrier,
preservation, and old-current question remains under the old law. A future
distribution that removes either fixed path rejects on candidate-shape
resolution and uses governed adoption where eligible.

Authority dispatch for an existing subject first probes bytes for an own law.
An own-law singleton tries `KERNEL_MIGRATE`; a shape-only rejection may be
adoption-eligible with `PROVABLE_UNDER_RETIRED_LAW`, while any barrier,
authority, structure, trust, approval, preservation, or incompatibility failure
rejects adoption. A fork is resolved under its own law first. A subject with no
law is evaluated by the candidate and may yield `NO_PROVABLE_LINEAGE`, allowing
adoption with `HISTORICAL_UNVERIFIED` status. If the old law can admit the
candidate, adoption is rejected.

Adoption creates the sole new epoch-0/sequence-0 Genesis for a new positive
lineage and binds an `EXTERNAL_SUBJECT` with exact historical identity. It
retains the entire pre-adoption governance tree byte-identically under
`history/<identity-digest>/`; the historical Genesis is provenance only. Old
law evaluators are retained only for `PROVABLE_UNDER_RETIRED_LAW`. Historical
statements and outcomes are imported as provenance or intent items, never as
new review results. Open Tasks, convergence, lifecycle, capabilities, and
repository binding are compiled prospectively and require current human
confirmation. Adoption never releases STOP, resets review/convergence state, or
repairs past authority.

## 11. Distribution boundary and recovery

The distribution can be selected as an archive or authenticated Git source;
both are reduced to the exact ContentSetDigest, with Git additionally pinning
repository identity, commit, and tree. The child exports only the exact
contracts, runtime, `COMPILED_MANIFEST` closure, selected capability semantics,
and actual project state. `COMPILED-MANIFEST.md` is validated under
`MM-GOVERNING-RECORDS/1#contracts.COMPILED_MANIFEST`; it is compilation metadata, not a
seventh governing contract or authority source.
It does not contain distribution, compiler, verification, source, or factory
roots. Cold recovery and later clean closeout use `.markdown-machine/HANDOFF.md`,
this exported runtime, and the exact compiled contracts—not prior chat, hidden
state, or the original compiler/distribution source.
