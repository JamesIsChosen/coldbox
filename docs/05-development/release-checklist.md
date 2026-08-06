# Release checklist

Every step matters. A release of a tool that handles seed phrases is not a routine deploy.

Copy this into the release issue and tick as you go.

---

## Pre-release

### Code

- [ ] All tests pass: `npm test`
- [ ] Security tests pass: `npm run test:security`
- [ ] Vector tests pass for every chain
- [ ] `npm run verify-vendor` passes
- [ ] Forbidden-construct lint passes (no `eval`, `new Function`, `import`, external URLs)
- [ ] No TODO or FIXME in security-relevant paths
- [ ] Bundle size within budget, delta noted

### Reproducibility

- [ ] Build twice locally — hashes identical
- [ ] Build on a second machine or OS — hash identical
- [ ] Node version matches `.nvmrc`
- [ ] `git status` clean

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

Per platform: cold realm instantiates · handshake completes · capability panel accurate · vault round-trips · **Argon2id active, not PBKDF2** · a save path works · airgap banner correct.

### Security review

- [ ] CSP unchanged, or change has an ADR and review
- [ ] Message schema unchanged, or change reviewed for secret-carrying capability
- [ ] No new `connect-src` host, or it's justified and documented
- [ ] Threat model still accurate
- [ ] Open security advisories addressed

---

## Build and sign

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
