# Verifying your copy

This tool handles seed phrases. A modified copy could steal everything you own, and would look identical. Verifying takes two minutes.

Three levels, increasing in strength. Do at least the first.

---

## Level 1 — check the hash

A SHA-256 hash is a fingerprint. Change one bit of the file and the hash changes completely.

### macOS / Linux

```bash
shasum -a 256 coldbox-v1.0.0.html
```

### Windows PowerShell

```powershell
Get-FileHash coldbox-v1.0.0.html -Algorithm SHA256
```

### Windows Command Prompt

```
certutil -hashfile coldbox-v1.0.0.html SHA256
```

Compare against `coldbox-v1.0.0.html.sha256` from the same release. Compare the **whole string**, not the first and last few characters.

**If they don't match, stop.** Delete the file and download again from the official releases page. If it still doesn't match, report it — see [SECURITY.md](../../SECURITY.md).

### What this does and doesn't prove

It proves your file matches what the release page published. It does **not** prove the release page wasn't compromised. For that, level 2.

---

## Level 2 — verify the signature

The hash file could be replaced alongside the HTML. A GPG signature can't be forged without the private key.

### Get the signing key

```bash
gpg --recv-keys <KEY_FINGERPRINT>
```

The fingerprint is published in the README. **Compare it against a source you trust independently** — ideally one you saw before today. A key fetched from the same place as the file it signs proves less than it appears to.

The app's own Reference → Provenance panel does **not** show a signing-key fingerprint or verify GPG signatures — it covers the embedded library list, the live CSP policy for both realms, the build date, and the (circular) self-hash drop zone described in [ADR-0015](../05-development/adr/0015-provenance-build-date-and-self-hash.md). GPG verification is command-line only, by design: it is the check that does not trust anything the running copy says about itself.

### Verify

```bash
gpg --verify coldbox-v1.0.0.html.asc coldbox-v1.0.0.html
```

Look for `Good signature from ...`.

A warning that the key is not certified is normal — it means you haven't marked it as trusted in your keyring. What matters is that the signature is **good** and the fingerprint is the one you expect.

**A bad signature means do not use the file.**

---

## Level 3 — reproduce the build

The strongest check. Rebuild from source and confirm you get byte-identical output. This proves the published file contains nothing the source doesn't.

```bash
git clone https://github.com/<owner>/coldbox
cd coldbox
git checkout v1.0.0

# Confirm vendored libraries match their upstream releases
npm ci
npm run verify-vendor

# Build
npm run build

# Compare
shasum -a 256 build/coldbox.html
shasum -a 256 /path/to/downloaded/coldbox-v1.0.0.html
```

**The two hashes must be identical.**

### If they differ

That is a **critical security finding**. It means the published file was built from something other than the tagged source. Report it privately via [SECURITY.md](../../SECURITY.md).

Before reporting, rule out the boring explanations: wrong tag checked out, Node version mismatch (`.nvmrc` pins it), or local modifications (`git status`).

### CI attestation

Every tagged release is built by GitHub Actions, which publishes the resulting hash as a build attestation. Three independent sources should agree: the maintainer's published hash, CI's attested hash, and your local rebuild. Two agreeing and one differing is a signal worth investigating.

---

## Verifying inside the app

**Reference → Verify This File** has a drop zone. Drag the HTML onto it and the app hashes the bytes and compares against the version compiled into it.

**This is a convenience, not a security control.** Verifying a file using that same file is circular — a malicious build would simply claim success. It's useful for catching accidental corruption, not deliberate tampering. Use the command line for anything that matters. The app says this on the screen.

---

## Verifying your vault backups

Different problem: not "was this tampered with" but "has this rotted."

USB sticks and SD cards suffer silent bit corruption. Files that were fine when written can degrade in storage.

**Verify Bench → Folder hash** produces a manifest of every file on your backup media. Store it, and re-verify periodically:

```bash
# The app exports sha256sum-compatible manifests
sha256sum -c backup-manifest.txt
```

The Backup Health dashboard tracks BackupRecord share-verification due dates. Media-verification due dates belong to the future file-hasher workflow; keep the external manifest schedule separately until that record type exists.

---

## Ongoing hygiene

**Verify every update.** A tampered update is as dangerous as a tampered first download.

**Keep a known-good copy.** Once verified, keep it on read-only or write-protected media. Re-verify against it later.

**Watch for hash changes without a version change.** A given version's hash is fixed forever. If `v1.0.0` has a different hash than it did last month, something is wrong. The [CHANGELOG](../../CHANGELOG.md) records the hash of every release as a historical record.

---

## Quick reference

| Level | Effort | Proves | Do it? |
|---|---|---|---|
| Hash | 30 seconds | Matches the release page | **Always** |
| Signature | 2 minutes | Signed by the maintainer's key | Before real funds |
| Reproduce | 10 minutes | Matches the public source | Ideal; at least once |
| In-app | 5 seconds | Nothing against tampering | Convenience only |
