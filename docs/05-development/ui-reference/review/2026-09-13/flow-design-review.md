# Coldbox flow design direction and gap review

The human approved the Entropy Lab candidate's aesthetic and asked that it carry
through every subsequent flow. This records that direction and a static audit
of the complete desktop/mobile workstation references. It is discovery evidence
under `mock-rereview-product-discovery`, not Product Freeze or production code.

Exact current instruction:

> this entropy flow is good now lets make sure all the flows going foward follow this same asthetic. appears we have several gaps in the UI flow. so lets make sure this same astheic is carried out throughout

## Reference and approval scope

- [Desktop entropy snapshot](entropy-desktop.html.reference): the candidate reviewed
  in this conversation, including target selection. Preserve its visual direction
  and the intent of its six-step journey. SHA-256:
  `6a70a8032a32ec9ded8f16affd5cb55345633ebe20b5dc96ff31af6078fbad36` (27,270 bytes).
- [Mobile entropy snapshot](entropy-mobile.html.reference): the later mobile
  adaptation, retained as evidence to compare and correct. It was not independently
  approved as equivalent to the desktop candidate. SHA-256:
  `d3961c23b5f7bbce55f7fc352a22ae1b7c273ee4596340001e504736af5c7b2f` (15,991 bytes).
- The complete `workstation-2026-08-19` desktop and mobile references remain the
  shell/navigation context. These entropy snapshots are supplemental evidence,
  not replacements for the entire workstation reference set.

These files are inert prototype evidence. Their simulated entropy, health,
mixing, isolation claims and destinations are not implementation evidence.
Do not import prototype code into the product.

## Shared visual direction

Use the same comic visual language across every flow:

| Element | Direction from the approved candidate |
|---|---|
| Page | Dark halftone background and a consistent workstation shell |
| Work card | Warm paper surface, heavy ink border, small corner radius, hard offset shadow |
| Type | Bangers for short headings and action labels; Comic Neue for explanatory text; monospace for exact values |
| Palette | Yellow for progression and badges; cyan for primary entry actions; pink for current selection; green for confirmed outcomes |
| Steps | Numbered, named steps with a clear current state and understandable Back/Next actions |
| Inputs | Visible labels and entry controls, short format guidance, validation adjacent to the input |
| Context | Current object and realm remain legible while working |
| Feedback | Per-entry ledger or equivalent summary; selected values and results update from the same state |
| Secondary information | Bordered summary blocks with aligned labels/values, not competing primary actions |

Reuse the accepted design-system tokens when implementing; the candidate's
hard-coded CSS is reference evidence, not a new parallel token system. Preserve
the warm/sealed boundaries, object identity, and reveal protections. Colour alone
must not carry selected, invalid, disabled, or successful state.

## Flow completion criteria

Apply these to every applicable flow; do not force every workflow into six steps.

1. The entry point works from the actual app navigation, including return to the
   originating object. Placing a second mock beside the app is not integration.
2. Every requested value has an editable control, a label, valid formats and a
   clear empty/invalid state. Choice chips must make real selections.
3. Input persists through Back/Next. Changing upstream input invalidates dependent
   results and removes stale health/mix/success states.
4. Review displays the user's entered/selected values. Validation and prerequisites
   govern advancement through both Next and the step navigation.
5. Actions show pending, failure and completion states where applicable. Retry,
   cancel, clear and undo behave honestly; no button silently does something else.
6. Completion reaches the promised destination and passes the intended context.
   Simulated actions in a design preview are identified as simulated; they do not
   claim successful cryptography, isolation, verification, save or transfer.
7. Desktop/mobile offer the same choices, validation and outcome. Mobile stacks
   content with full access to controls and long values; it does not delete options.
8. Verify labels, keyboard operation, visible focus, meaningful selected states,
   narrow screens, overflow, and existing minimum touch targets. Check both a
   success path and relevant failure/recovery paths before calling a flow complete.
9. Roadmap features use the same aesthetic while remaining clearly unavailable.
   Visual completeness does not authorize implementing unfinished capabilities.

## Static audit findings

The complete desktop and mobile templates each contain only one native input:
the existing strength range slider. Neither contains a native text input,
textarea, select or file input. Both use the same bundled flow model (SHA-256
`d211e358a7ca521fa704533d774f85f387d9a51421fe32a998806fa71963b8df`).
This inventory covers its **32 flows / 108 steps**. It is a source audit, not a
claim that every route has received a browser test. Preset variant buttons are
not sufficient evidence that a user can enter and complete the described work.

| Flow | Steps | Gap or next verification required |
|---|---:|---|
| Entropy Lab | 6 | Integrate the approved candidate into both actual mock routes; fix candidate state/validation issues below. |
| Device-to-device vault transfer | 4 | Payload selection, receiver input/scanning, missing-frame recovery and comparison must be operable, rather than preset narrative. |
| Settings | 5 | Selections must affect the preview, persist across navigation and report save/discard outcomes. |
| Seed Forge | 5 | Actual phrase input for validation/restore, optional passphrase input, masked reveal and release destination. |
| Passphrase Studio | 3 | Candidate entry and hide/reveal; changes must drive the displayed effect and record/discard state. |
| Secret notes & concealment | 3 | Object selection, note/value editor, save/discard and per-value conceal/reveal. |
| Derivation paths | 3 | Editable arbitrary path/custom coin inputs, validation and output/export state. |
| Address derivation | 3 | Editable custom range and comparison input; mismatch must prevent a verified result. |
| Child seeds · BIP-85 | 4 | Recipe/index/context input and continuity through authority selection and lineage recording. |
| Descriptors | 3 | Actual descriptor/key/path entry and validation before public export. |
| Split lab | 4 | Scheme-appropriate setup, generation/reveal states and a working verify destination. |
| Verify / combine shares | 3 | Share entry, per-share errors, reconstruction review and verified-state prerequisites. |
| SeedQR studio | 3 | Format/acknowledgment state, reveal control and truthful print/export outcome. |
| Recovery assistant | 4 | Recovery input, progress/cancel states, no-result/error handling and reviewed release. |
| Verify Bench | 3 | Tool-specific file/value input and a result derived from that input. |
| Records & registry | 3 | Structured identity editor and xpub import with validation and correct object destination. |
| Device registry | 3 | Device details/xpub entry and actual fingerprint/address comparison inputs. |
| Prices & FX | 3 | Source/manual value entry, refresh failure/staleness states and currency continuity. |
| Tax & exports | 3 | Editable scope, lot review and truthful export result. Existing logic determines calculations. |
| Backup Health | 3 | Score/reason must follow selected data; each remedy must return to the correct record. |
| Verify this file | 3 | Real file selection and error states; clearly distinguish local checks from external verification. |
| Provenance & legal | 3 | Verify all read-only content, long-text layout and full-licence destination. No forced input step. |
| Learn | 3 | Depth selection must change content; each guide must open its stated destination. |
| Tool map | 3 | Realm/family filtering, accurate availability and actual routing for every entry. |
| First run | 3 | Each starting choice must reach its own creation/import flow and then its resulting record. |
| Vault session | 4 | Credential/keyfile/file inputs, unlock failure, dirty-state save/discard and lock outcomes. |
| Send & review | 3 | Roadmap-owned: show missing capability honestly; recipient/amount/fee interaction remains future scope. |
| Level 3 signing | 3 | Roadmap-owned: explicit unavailable state; no simulated signing success presented as real. |
| Broadcast, RBF & CPFP | 3 | Roadmap-owned: preserve unavailable state and future network/failure boundaries. |
| PSBT inspector | 3 | Roadmap-owned: future file/base64/QR intake and export need the same visual treatment. |
| Coin control | 3 | Roadmap-owned: future selection/freeze controls need legible states and mobile parity. |
| Source & transport | 3 | Roadmap-owned: distinguish source from transport; no fictitious Tor switch/success. |

## Candidate defects to resolve while preserving the approved aesthetic

The approval is not a test pass for the prototype's code. Static inspection found:

- Desktop target buttons also match the generic `.source` click handler, which
  can hide all entropy entry panels after selecting a target.
- The desktop ledger's remaining calculation still uses literal 224 in `render`;
  later synchronization repairs some paths but Clear does not synchronize it.
- Changed inputs/targets do not consistently invalidate `mixed`; direct step
  navigation bypasses the hand-off prerequisite.
- “Open Seed Forge” goes to the target step, and “Start another collection” does
  not clear the prior collection. The promised destinations are not wired.
- The mobile card picker contains only six cards; desktop contains 52. Mobile
  dice entry lacks desktop face validation and the mobile ledger has no Clear.
- CSPRNG, health, mixing and the sealed handle are simulated labels/state, not
  calls to the product's preserved logic. Never use these previews for real keys.
- The full-app review wrappers show separate iframes; the workstation still has
  its original Entropy Lab. The desktop iframe is cramped and the mobile wrapper
  clips the original mock's surrounding presentation frame.

## Recommended remediation order

1. Correct shared navigation, input/validation state, action feedback and mobile
   layout patterns; integrate the Entropy Lab route into the complete mock.
2. Apply those patterns to Seed Forge, Passphrase Studio, notes, share recovery,
   Recovery Assistant and Verify Bench where direct input gaps are evident.
3. Cover derivation, descriptors, registry/devices, vault and transfer workflows.
4. Verify settings, records, read-only guidance and all remaining navigation.
5. Review desktop/mobile together in the complete workstation; preserve roadmap
   availability and obtain final whole-design approval only after gaps are closed.

The current admitted discovery Task allows recording these findings and human
direction. Updating all mock code requires the subsequent flows/UX work to be
authorized under Markdown Machine. No production implementation or design freeze
is asserted by this document.
