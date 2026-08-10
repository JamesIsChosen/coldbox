# Batch remediation 2026-08-10

**Scope:** remediate the preserved stacked review findings for P1.4 through
P1.9, restack in dependency order, keep every PR open, and prepare one
consolidated independent review after the P1.9 human hardware gate.

The original historical stop snapshot remains in
[BATCH-2026-08-10.md](BATCH-2026-08-10.md) and is not edited. This file is the
additive remediation snapshot.

## Final stacked state

| Item | Branch | PR | Base | Product/remediation tip | State |
|---|---|---:|---|---|---|
| P1.4 | `p1.4-derivation-engine-bip32-bitcoin` | [#37](https://github.com/JamesIsChosen/coldbox/pull/37) | `main` | `1f13ac970c49e0d9f8f87045204ba09eff4a7c74` | Software remediation complete; open, unmerged |
| P1.5 | `p1.5-derivation-evm-arbitrary-path` | [#38](https://github.com/JamesIsChosen/coldbox/pull/38) | `p1.4-derivation-engine-bip32-bitcoin` | `feec2009d8f4637e9807af65c7a4f67de2368077` | Software remediation complete; open, unmerged |
| P1.6 | `p1.6-registry-crud-wallets-accounts-addresses` | [#39](https://github.com/JamesIsChosen/coldbox/pull/39) | `p1.5-derivation-evm-arbitrary-path` | `38133e6db8382d6bf420fe022c08c049e171ffed` | Software remediation complete; open, unmerged |
| P1.7 | `p1.7-notes-tags-concealment` | [#40](https://github.com/JamesIsChosen/coldbox/pull/40) | `p1.6-registry-crud-wallets-accounts-addresses` | `4052f58f8c949adc2df71f176249c2afffdc02c9` | Software remediation complete; open, unmerged |
| P1.8 | `p1.8-device-registry` | [#41](https://github.com/JamesIsChosen/coldbox/pull/41) | `p1.7-notes-tags-concealment` | `d96e924483b560ecb3f3f7ac31aa065532500ee5` | Software remediation complete; open, unmerged |
| P1.9 | `p1.9-verification-workflows` | [#42](https://github.com/JamesIsChosen/coldbox/pull/42) | `p1.8-device-registry` | `e31cac45c1e0865ea73aeeec87b98f7b3b711b1e` | Software/browser/hardware gates pass; open, unmerged |

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
- Documentation hygiene: 163 Markdown files, 0 warnings.
- Local and upstream vendor verification: all 10 dependencies passed.
- Final exact-rebased-tip artifact: 1,987,610 bytes,
  `f8156f8f635115e4dd81a9eb6c291d436ac4517d27926913802d488a638a224f`.
- Alternate-path builds under different timezone/locale settings matched
  byte-for-byte.
- Chromium and Firefox browser harnesses passed, including CSP/airgap,
  tamper, zeroization, and P1.9 cold-local wallet-handoff coverage.

## Human hardware evidence

The human-required gate is cleared. The user ran Coldbox from the local
`file://` build on a Windows PC in Microsoft Edge with Wi-Fi and Ethernet
physically disconnected, using a SeedSigner at firmware `0.8.0` and a
throwaway seed generated solely for this test. Fingerprint, receive address,
xpub, backup fingerprint, and passphrase-derived identity all matched. The
exact Edge version was not recorded; no production seed or secret was
committed.

## Stop condition

The human-required hardware stop is cleared. P1.9 remains `[~]` pending
independent review. Perform one fresh independent stacked review of PRs
#37-#42 as a single consolidated review, then stop for the reviewer’s verdict;
do not create six separate review rounds and do not merge anything.

P1.10 through P1.13 remain untouched.
