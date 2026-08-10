# Batch remediation 2026-08-10

**Scope:** remediate the preserved stacked review findings for P1.4 through
P1.9, restack in dependency order, keep every PR open, and stop at the P1.9
human hardware gate.

The original historical stop snapshot remains in
[BATCH-2026-08-10.md](BATCH-2026-08-10.md) and is not edited. This file is the
additive remediation snapshot.

## Final stacked state

| Item | Branch | PR | Base | Product/remediation tip | State |
|---|---|---:|---|---|---|
| P1.4 | `p1.4-derivation-engine-bip32-bitcoin` | [#37](https://github.com/JamesIsChosen/coldbox/pull/37) | `main` | `8f99771` | Software remediation complete; open, unmerged |
| P1.5 | `p1.5-derivation-evm-arbitrary-path` | [#38](https://github.com/JamesIsChosen/coldbox/pull/38) | `p1.4-derivation-engine-bip32-bitcoin` | `05ca0026c132d3cb22e21e6f8c99f0a78c7a5b05` | Software remediation complete; open, unmerged |
| P1.6 | `p1.6-registry-crud-wallets-accounts-addresses` | [#39](https://github.com/JamesIsChosen/coldbox/pull/39) | `p1.5-derivation-evm-arbitrary-path` | `cc4a2f97d5b4faa824cbdf12b8764dabacd92688` | Software remediation complete; open, unmerged |
| P1.7 | `p1.7-notes-tags-concealment` | [#40](https://github.com/JamesIsChosen/coldbox/pull/40) | `p1.6-registry-crud-wallets-accounts-addresses` | `3d100b5cc2ac05dba840e4eae255fd8fbf1a8b79` | Software remediation complete; open, unmerged |
| P1.8 | `p1.8-device-registry` | [#41](https://github.com/JamesIsChosen/coldbox/pull/41) | `p1.7-notes-tags-concealment` | `7ae8df6e4afe8f370a2cde60f99719f361d008b9` | Software remediation complete; open, unmerged |
| P1.9 | `p1.9-verification-workflows` | [#42](https://github.com/JamesIsChosen/coldbox/pull/42) | `p1.8-device-registry` | `8a359a13e6f1de34ac6e12435dec40fa009daf47` | Software/browser gates pass; human hardware gate open |

All six branches remain stacked in the table's order. No branch was merged.
P1.10 through P1.13 were not started.

## Review provenance

The original product head, original 14-finding review commit, F15/F16
append-only review commit, combined digest, and both safety tags remain as
recorded in the P1.9 packet. The historical review file is preserved
byte-for-byte; the remediation does not rewrite review history.

## Aggregate remediation gates

- Full Node suite: 293/293 passed.
- Focused P1.9 verification suite: 6/6 passed.
- Lint: passed.
- Documentation hygiene: 161 Markdown files, 0 warnings.
- Local and upstream vendor verification: all 10 dependencies passed.
- Final artifact: 1,987,610 bytes,
  `03452808ec72a27c0d75d3a833a6d8d3f98f09807d4a4f55525d3e72badd8b46`.
- Alternate-path builds under different timezone/locale settings matched
  byte-for-byte.
- Chromium and Firefox browser harnesses passed, including CSP/airgap,
  tamper, zeroization, and P1.9 cold-local wallet-handoff coverage.

## Stop condition

The batch stops at P1.9 because final acceptance requires real hardware
wallet validation. The human must perform and record that physical check; no
agent can substitute for it. Until then P1.9 remains `[~]`, and no next
roadmap item starts.

After the hardware result is recorded, perform one fresh independent stacked
review of PRs #37-#42 as a single consolidated review. Review the stack in
dependency order within that one review, but do not create six separate review
rounds. Do not merge anything as part of this remediation handoff.
