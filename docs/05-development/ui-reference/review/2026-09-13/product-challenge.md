# Presentation rebuild product challenge

This is the product-challenge output for the admitted
`product-challenge-presentation-rebuild` task. It converts the static flow
review into a bounded first design-realization slice and acceptance criteria.
It is discovery evidence and product intent input. It does not authorize UI
implementation, Product Freeze, release, or changes to Coldbox's security and
logical behavior.

## First design-realization slice

The first slice follows the review order and starts with the shared patterns
that every flow depends on:

1. Workstation navigation and return-to-origin context.
2. Entropy Lab, including its desktop and mobile routes.
3. Seed Forge, including the Entropy Lab handoff.
4. Passphrase Studio.
5. Secret notes and concealment.
6. Share recovery, Recovery Assistant, and Verify Bench.

The later derivation, descriptor, registry/device, vault, transfer, settings,
records, guidance, and roadmap routes remain outside this first realization
slice. They keep the same approved visual language and honest unavailable-state
treatment until separately realized.

## Product decisions and boundaries

- The Entropy Lab aesthetic is the shared visual direction: dark halftone shell,
  warm paper work cards, heavy ink borders, hard offset shadows, Bangers and
  Comic Neue typography, and the approved yellow/cyan/pink/green state palette.
- The six-step Entropy Lab journey is a presentation reference. The realized
  route may use fewer or more steps when the actual workflow requires it, but
  it must keep a clear current step, understandable Back/Next actions, and a
  visible current object and realm.
- Every requested value in the first slice gets a real labeled control with
  format guidance, empty and invalid states, and adjacent validation.
- A choice chip or preset is only a selection control when it changes the same
  state used by review, validation, and completion. Decorative presets do not
  count as input.
- Upstream changes clear dependent health, mix, release, verification, and
  success state. Back/Next and direct step navigation enforce the same
  prerequisites.
- Completion destinations must be real routes with the intended context. A
  design preview must label simulated behavior and must not claim cryptography,
  isolation, verification, saving, transfer, or release success.
- Desktop and mobile expose the same choices and outcomes. Mobile may stack
  content, but it does not remove controls or truncate values that need review.
- Roadmap capabilities remain visibly unavailable. This slice does not turn
  Send, signing, broadcast, PSBT, coin-control, or transport placeholders into
  working product behavior.

## Acceptance checklist for the first slice

### Shared shell and navigation

- [ ] Each first-slice route opens from the actual workstation navigation.
- [ ] Opening a flow records and visibly preserves its originating object and
      realm.
- [ ] Back, cancel, clear, retry, and completion return to truthful destinations.
- [ ] Direct step navigation cannot bypass required inputs or prerequisites.
- [ ] Keyboard focus, selected state, disabled state, and error state remain
      visible without relying on colour alone.

### Entropy Lab

- [ ] Target selection does not trigger the generic source handler or hide the
      wrong entry panel.
- [ ] Source entries use the preserved entropy logic and validate dice, cards,
      bits, and hex according to their actual formats.
- [ ] The ledger and remaining count derive from one state; Clear synchronizes
      all dependent values.
- [ ] Changing source input or target clears stale mix and health state.
- [ ] The handoff to Seed Forge consumes the exact selected result once and
      reaches the correct Seed Forge context.
- [ ] “Start another collection” clears the previous collection.
- [ ] Desktop and mobile expose equivalent source choices, validation, Clear,
      and outcome states.

### Seed Forge, Passphrase Studio, and notes

- [ ] Phrase and optional passphrase controls are real inputs with matching,
      invalid, masked, reveal, and clear behavior.
- [ ] Entropy Lab handoff and fresh generation remain distinct, truthful paths.
- [ ] Review shows the current entered values and prevents release until the
      relevant prerequisites pass.
- [ ] Passphrase changes invalidate derived output and record/discard state.
- [ ] Notes and concealment provide object selection, value editing, save,
      discard, and per-value reveal/hide behavior.

### Recovery and Verify Bench

- [ ] Share/recovery entry accepts actual values, reports per-entry errors, and
      supports retry, cancel, and no-result recovery.
- [ ] Recovery completion reaches the reviewed release destination and does not
      imply a match when the recovered result differs.
- [ ] Verify Bench inputs are derived from the selected tool and current Seed
      Forge context; a mismatch blocks a verified result.
- [ ] Long fingerprints, xpubs, addresses, and share values remain fully
      reviewable on narrow screens.

## Evidence required before human product approval

The next flows/UX task must provide a reviewable desktop and mobile candidate,
show a success path and relevant failure/recovery paths for each first-slice
flow, and demonstrate the checklist above against the actual workstation routes.
Only after that evidence is reviewed can the lifecycle advance to human product
approval and then flows/UX design realization.
