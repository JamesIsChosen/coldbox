# Release checklist

Every step matters. A release of a tool that handles seed phrases is not a routine deploy.

Copy this into the release issue and tick as you go.

---

## Pre-release

### v1 security and wallet gates

For the first `v1.0.0`, these are hard gates before ordinary release mechanics:

- [ ] SEC.9 is `[x]` — the security-hardening campaign is independently certified
- [ ] SEED.5 is `[x]` — seed identity/lineage, signing-authority choices, sealed SeedQR handoff, structured public address identity and xpub/descriptor export are independently certified
- [ ] WAL.15 is `[x]` — the full single-signature Bitcoin wallet is independently certified
- [ ] Every remaining pre-v1 roadmap item through Phase 5 is `[x]`
- [ ] REL.1 feature freeze identifies the exact release-candidate commit/artifact/hash
- [ ] REL.2 professional external audit covers the complete release candidate, including transaction construction/signing/broadcast state
- [ ] REL.3 has zero unresolved audit findings of any severity
- [ ] REL.4 fresh independent review, physical device matrix, release-signing rehearsal and downloaded-artifact verification pass
- [ ] No code has changed outside the audited/re-reviewed line after closure

Post-v1 hardware-signer and multisig work (W2.*) is explicitly **not** a v1 gate.

### Code

- [ ] All automated tests pass: `npm test`
- [ ] `npm run lint` passes
- [ ] `npm run check-docs` passes
- [ ] `npm run test:browser` passes in the required engines
- [ ] Every cryptographic/transaction function touched by the release has independent vector/differential coverage in the committed test suite
- [ ] `npm run verify-vendor` passes
- [ ] Forbidden-construct lint passes (no `eval`, `new Function`, `import`, external URLs)
- [ ] No TODO or FIXME in security-relevant paths
- [ ] Bundle size within budget, delta noted

### Reproducibility

- [ ] Build twice locally — hashes identical
- [ ] Build on a second machine or OS — hash identical
- [ ] Node version matches `.nvmrc`
- [ ] `git status` clean

### Licence compliance

Tagging a release is a conveyance under the AGPL, so these are gates, not courtesies. See [ADR-0018](adr/0018-agplv3-license.md).

- [ ] **[P0.20](ROADMAP.md) has shipped** — the app displays Appropriate Legal Notices in its own UI. AGPLv3 §5(d) requires this of an interactive UI, and a release without it is a non-compliant conveyance
- [ ] Embedded licence text is byte-identical to `LICENSE` (the P0.20 test asserts this; confirm it ran)
- [ ] Every vendored artifact's licence is still recorded in [dependencies.md](dependencies.md), and none has changed to something AGPL-incompatible since the last release
- [ ] `package.json` `license` field reads `AGPL-3.0-only`

### Documentation

- [ ] CHANGELOG updated with all changes
- [ ] Any new feature has help content at all three depths
- [ ] Any structural decision has an ADR
- [ ] SPEC.md reflects what actually shipped
- [ ] `dependencies.md` hashes current
- [ ] Version number consistent: `package.json`, in-app, docs

### Manual device matrix

Per [testing.md](testing.md). **All seven supported execution-matrix contexts are required; record the separate iOS local-execution target as PASS, BLOCKED, or UNSUPPORTED with the exact device and iOS build under [ADR-0010](adr/0010-ios-local-html-execution.md).**

- [ ] Windows Chrome/Edge
- [ ] Windows Firefox
- [ ] macOS Safari
- [ ] macOS Chrome
- [ ] Linux Firefox
- [ ] **iOS local-execution target** — record PASS, BLOCKED, or UNSUPPORTED with the exact device and iOS build; Quick Look is not a Safari pass ([ADR-0010](adr/0010-ios-local-html-execution.md))
- [ ] Android Chrome from Files
- [ ] Tails / Tor Browser

Per platform: cold realm/handshake healthy · capability panel accurate · **two named vaults** create-confirm-save-library-reload/unlock correctly · **Argon2id active, not PBKDF2** · a save path works · live warm-shell reachability loss/restoration is reflected while cold stays sealed/unknown fails online-safe · layout usable.

### Security review

- [ ] CSP matches the reviewed architecture; cold remains `connect-src 'none'`
- [ ] Message schema matches the reviewed finite protocol, including any finalized-Bitcoin-transaction broadcast type
- [ ] Every `connect-src` host is justified in `api-sources.md`, source-provenance behavior and in-app provenance
- [ ] Level 3 idle-state invariant holds: no seed/private-key plaintext or universal secret-decryption capability remains merely because the public wallet is open
- [ ] 15-character new-vault credential floor, legacy short-credential unlock/upgrade, offline common-value rejection, CSPRNG generator/slider bounds and generated-secret cold-only teardown tests pass
- [ ] Seed-lineage/BIP-85 official vectors, existing-child verification, signing-authority modes, root/child SeedQR teardown/passphrase-omission, structured address identity and xpub/descriptor export/privacy tests pass
- [ ] Exact review-to-sign binding and signature self-verification tests pass
- [ ] Fee/coin-selection/change/spending-policy negative tests pass
- [ ] PSBT/raw-transaction/node-response fuzz smoke passes
- [ ] RBF/CPFP/reorg/conflict/pending-reservation tests pass
- [ ] Threat model still accurate, including the malicious-build signature-exfiltration residual
- [ ] Professional audit report names this release-candidate line and has no unresolved finding
- [ ] Open security advisories addressed

---

## Build and sign

Do not run this section for v1 until REL.4 is `[x]`.

```bash
npm version 1.0.0
npm run build
npm test

shasum -a 256 build/coldbox.html
```

- [ ] Version bumped and committed
- [ ] Clean build produced
- [ ] Hash recorded

```bash
cp build/coldbox.html coldbox-v1.0.0.html
shasum -a 256 coldbox-v1.0.0.html > coldbox-v1.0.0.html.sha256
gpg --detach-sign --armor coldbox-v1.0.0.html
gpg --verify coldbox-v1.0.0.html.asc coldbox-v1.0.0.html
```

- [ ] `.sha256` generated
- [ ] Detached signature generated
- [ ] Signature verifies

```bash
git tag -s v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

- [ ] Signed tag pushed

---

## CI attestation

- [ ] CI build succeeded
- [ ] **CI hash matches local hash** — if not, stop and investigate
- [ ] Attestation published

Three sources must agree: your local build, CI's build, and any third-party rebuild. Disagreement means the release does not ship.

---

## Publish

- [ ] GitHub release created from the signed tag
- [ ] Artifacts attached: `.html`, `.sha256`, `.asc`
- [ ] Release notes include the hash, the signing key fingerprint, and the CI attestation URL
- [ ] CHANGELOG hash entry matches the artifact
- [ ] README version references updated

---

## Post-release

- [ ] Download from the release page and verify hash independently — as a user would
- [ ] Verify the signature from the published artifacts
- [ ] Open the downloaded file and confirm it runs
- [ ] Confirm the in-app version and provenance panel are correct
- [ ] Confirm the in-app expected hash matches the published one

That first item is not ceremony. Verifying the artifact you actually published, as a stranger would, catches upload mistakes that every earlier check misses.

---

## If something is wrong post-release

1. **Do not silently replace the artifact.** A version's hash is fixed forever; changing it destroys the trust model.
2. Publish a new patch version.
3. If security-relevant, publish an advisory.
4. Mark the bad release as deprecated with an explanation.
5. Record it in the CHANGELOG. Do not delete history.

---

## Version numbering

Semantic versioning.

| Change | Bump |
|---|---|
| Vault format change requiring migration | **Major** |
| Realm boundary or message schema change | **Major** |
| New features, backward compatible | Minor |
| New chains | Minor |
| Bug fixes | Patch |
| Security fixes | Patch, released promptly |
| Documentation only | No release |

A vault format change is a major bump even if technically compatible, because users must know their data file is affected.
