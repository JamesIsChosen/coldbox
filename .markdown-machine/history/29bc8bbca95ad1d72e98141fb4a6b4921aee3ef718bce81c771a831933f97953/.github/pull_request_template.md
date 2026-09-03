## What this changes

## Why

---

## Checklist

- [ ] Read [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] Tests pass: `npm test`
- [ ] `npm run verify-vendor` passes
- [ ] Forbidden-construct lint passes
- [ ] Build is reproducible — built twice, hashes identical
- [ ] Tested on at least one desktop and one mobile browser, from `file://`

## Security impact

- [ ] **No change** to the realm boundary, message schema, or CSP
- [ ] Changes one of the above — ADR added and explained below

If this touches secrets, the vault format, derivation, or the realm boundary, describe what an attacker gains if you're wrong:

<!-- -->

## Bundle size

Before: — KB
After: — KB
Delta: —

## Tests added

- [ ] Vector tests from an independent source (required for crypto changes)
- [ ] Round-trip tests
- [ ] Negative tests — wrong things fail loudly
- [ ] Regression test (if fixing a bug)
- [ ] N/A — documentation only

## Documentation

- [ ] Help content added at all three depths (plain / working / technical)
- [ ] Relevant docs updated **in this PR** — they compile into the app and cannot drift
- [ ] ADR added for any structural decision
- [ ] CHANGELOG updated
- [ ] N/A

---

## Notes for the reviewer

<!-- What deserves the closest look? -->
