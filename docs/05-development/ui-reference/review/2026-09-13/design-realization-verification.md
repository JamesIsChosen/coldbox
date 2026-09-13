# First-slice design realization verification

This evidence records the current reviewable candidate for the admitted
flows/UX design-realization task. It does not claim Product Freeze,
production implementation, or release readiness.

## Live workstation checks

- The rebuilt workstation opens the sealed realm with the approved navigation
  groups and the first-slice routes visible in the desktop rail.
- The sealed Entropy Lab exposes all 52 playing-card choices, source controls,
  validation feedback, and the truthful empty CSPRNG state.
- Entering `70x` into the dice field reports `No valid die faces found` and
  identifies the rejected characters without mutating the entropy ledger.
- Passphrase Studio routes to the existing Seed Forge passphrase pair and
  focuses the first field when it is available.
- Recovery Assistant routes to the vault recovery-share controls and keeps the
  locked state explicit; the recovery status receives focus until recovery input
  becomes available.

## Automated checks

The following checks pass against the current source and rebuilt candidate:

- `node --test test/ui.4a-approved-mock-parity.test.js`
- `node --test test/entropy-lab.test.js`
- `node --test test/seed-forge.test.js`
- `node --test test/verification.test.js`
- `node --test test/p0.19-runtime-wiring.test.js`
- `node --test test/ui.5-shared-shell.test.js`
- `npm run lint`
- `npm run build`

The full test command still reports eight existing fixture/harness failures;
the direct lint, documentation, and build checks pass.

