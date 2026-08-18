# Coldbox v1 security and Bitcoin-wallet contract

**Status:** Future v1 contract — accepted direction, not current shipped behavior.

This document is the canonical home for requirements that intentionally sit
ahead of the current implementation. [SPEC.md](SPEC.md),
[architecture.md](architecture.md), [vault-format.md](vault-format.md),
[data-model.md](data-model.md), and the current
[threat model](../02-security/threat-model.md) continue to describe what
Coldbox actually does today. Each roadmap item updates those current-behavior
documents in the same PR when the corresponding behavior ships.

This separation is deliberate: Coldbox documentation policy says `SPEC.md`
describes what shipped, not what was imagined.

The v1 sequence is:

`UI.10a -> UI.10b -> UI.11 -> SEC.1..SEC.9 -> SEED.1..SEED.5 -> WAL.1..WAL.15 -> existing pre-v1 roadmap (P2.8, P3, P4, P5) -> REL.1..REL.5 -> v1.0.0`

The professional security audit occurs on the complete v1 release candidate,
after wallet signing exists and before the v1.0.0 tag.

---

## 1. Product direction

Coldbox v1 is a **self-custody security workstation with a complete
standalone single-signature Bitcoin wallet**.

It can operate as:

- a standalone seed-backed Bitcoin wallet;
- a watch-only Bitcoin wallet; or
- a verification/backup companion alongside other wallets.

For v1, spending support is Bitcoin-only and single-signature. The intended
initial spend families are native SegWit singlesig and Taproot key-path
singlesig. Exact script/version support is proven with independent vectors
before release; unsupported or ambiguous spending forms fail closed.

Coldbox v1 discovers coins, manages UTXOs, selects coins, calculates fees,
constructs transactions, signs, broadcasts, and monitors confirmation state.

This decision supersedes the **future direction** of
[ADR-0006](../05-development/adr/0006-companion-not-replacement.md) and the
Bitcoin transaction-lifecycle rejection in
[ADR-0019](../05-development/adr/0019-no-transaction-workbench.md).
Those ADRs remain historical records and still describe the current pre-wallet
implementation until the WAL phase lands.

### Explicitly beyond v1

The following are not v1 release gates:

- multisig wallet signing and coordination;
- hardware-signer integration, including secure-element devices;
- hardware-backed anti-exfiltration signing modes;
- direct WebUSB/WebHID device integration;
- MuSig2;
- advanced Miniscript/policy spending;
- Lightning, CoinJoin, DLCs, RGB, ordinals/inscription tooling;
- non-Bitcoin signing or smart-contract signing.

Post-v1 hardware signer integration must preserve Coldbox as a complete
standalone wallet. A hardware device is an optional higher-assurance signer,
not a v1 dependency.

---

## 2. Security-hardening requirements before wallet implementation

### 2.1 Level 3 secret isolation

No secret plaintext, and no key capable of decrypting the complete secret
store, may persist merely because the public wallet session is open.

The v2 vault design therefore uses:

- independently encrypted secret records;
- a random record-encryption key (REK) per sensitive record;
- an encrypted and padded outer secret store so record count/type/update
  equality is not exposed directly in the `.cbx` file;
- a public key that may remain available for public-compartment work; and
- DEK, secret wrapping keys, REKs and target plaintext only during a bounded
  secret operation.

At idle after a secret operation the session may retain public data and opaque
secret ciphertext, but not seed plaintext, BIP-39 passphrase plaintext,
private-key plaintext, secret-note plaintext, DEK, KEK, secret-wrap key or REK.

A secret operation is:

`reauthenticate -> unwrap DEK -> open target record -> perform one operation -> wipe`

For passphrase-plus-keyfile vaults, the keyfile is reacquired for a strict
Level 3 secret operation rather than retained as a session-wide capability.

Recovery shares remain a bounded recovery route. They do not become a
session-long daily signing capability.

The current UI concept of a focused/released secret survives only as a
reference to a sealed record plus public fingerprint/label. ADR-0045's
session-long plaintext secret registry is superseded by ADR-0050 when SEC.1
lands.

### 2.2 Small trusted security core

The amount of code allowed to touch secrets or authorize spending must be kept
small and named.

The security-critical core includes only the minimum required:

- cold bootstrap and realm-health gate;
- protocol/schema validation;
- vault v2 codec and migration;
- crypto adapter;
- descriptor/wallet-policy authority;
- transaction parser/builder;
- spending-policy evaluator;
- bounded secret-record executor;
- signer and signature verifier;
- teardown/zeroization paths.

Normal UI, portfolio, charts, help, warm networking, price code and unrelated
record-management code do not receive general secret or signing capabilities.

### 2.3 DOM/injection hardening

Security-sensitive rendering uses safe text/node construction by default.
Dangerous HTML-writing sinks are statically rejected in security paths unless a
finite reviewed allowlist names the exact use and its sanitizer/constant input.

Trusted Types may be used as Chromium defense in depth, but no cross-browser
security claim depends on it.

### 2.4 Adversarial testing

A deterministic fuzz/property/differential framework attacks all
security-boundary parsers and state machines.

The corpus grows to cover:

- `.cbx` v1/v2 parsing and migration;
- wrapped-DEK and recovery records;
- public projection/message schema;
- QR/live-transfer framing;
- seed/share formats;
- descriptors and wallet policies;
- raw Bitcoin transactions;
- PSBT v0/v2 and Taproot PSBT fields;
- node/API responses used for wallet state;
- RBF/CPFP replacement relationships.

Required properties include bounded resource use, no uncaught parser failures,
no partial authentication, no silent downgrade, stable parse/serialize where
the format requires it, and independent/differential comparison for
cryptographic and transaction behavior.

### 2.5 Build and repository trust

Before v1:

- every GitHub Action is pinned to a reviewed full commit SHA;
- CI rejects mutable tag/branch action references;
- CodeQL or equivalent first-party code scanning is enabled for applicable
  JavaScript/TypeScript;
- dependency review covers development dependencies as well as vendored
  runtime material;
- required repository rules enforce review/status/conversation requirements
  for security-sensitive code;
- CODEOWNERS or equivalent ownership rules cover the cold realm, protocol,
  vault, crypto, transaction/signing, build and CI surfaces;
- force-push/delete paths are restricted for protected release branches/tags;
- release attestation is proven on a real pre-release rehearsal.

The release signing identity is operational before v1: no placeholder
fingerprint remains, the fingerprint is published independently, detached
signatures are verified from downloaded artifacts, and long-lived signing-key
material is not casually stored in ordinary CI.

### 2.6 Rollback and conflict hardening

A counter stored only inside a rollbackable vault cannot prove freshness.

Coldbox therefore distinguishes:

- authenticated internal save lineage;
- advisory local history; and
- optional externally anchored latest-state evidence for users who want true
  rollback detection across restored copies.

The product never claims cryptographic rollback prevention unless the trusted
latest-state evidence exists outside the file being checked.

Wallet signing adds pending-spend and chain-conflict state. A stale local vault
must not silently make a locally reserved input look normally spendable;
network reconciliation may clear or replace reservations only under explicit
rules.

### 2.7 KDF aging

The app periodically compares a vault's stored password-protection profile with
the currently recommended dated policy.

When a stronger recommendation exists, Coldbox can rewrap the DEK with stronger
parameters after an on-device benchmark and explicit user approval, without
changing seed material or unrelated vault data.

No automatic downgrade exists.

### 2.8 High Assurance profile

Coldbox has a named High Assurance operating profile whose rules are enforceable
where the app can enforce them and procedural where a browser cannot.

The profile includes, as applicable:

- verified release artifact;
- clean no-extension browser profile or amnesic environment;
- stricter Level 3 reauthentication;
- user-owned browser-compatible Bitcoin data service where available;
- tighter fee/spend/source-disagreement policies;
- suspicious-UTXO quarantine;
- stronger rollback anchoring;
- explicit no-swap/encrypted-swap guidance where practical;
- independent backups and recovery rehearsal.

It never claims to make a compromised operating system safe.

### 2.9 Vault credential policy and sealed generator

Before v1, new vault creation and vault-credential changes use an enforceable
minimum rather than accepting arbitrarily short secrets.

A **user-chosen** vault password/passphrase must contain at least **15 Unicode
code points** after the credential's defined normalization step. Coldbox does not
require an uppercase letter, lowercase letter, number, symbol, or any other
composition recipe. It accepts spaces and broad printable input, supports at
least 64 characters without truncation, and compares the complete value.

The 15-character floor applies to **new creation and credential replacement**.
It does not make an older vault with a shorter credential unreadable. Legacy
unlock keeps the historical exact semantics needed to open the file, then warns
that the credential is below the current policy and offers an explicit
credential-upgrade/DEK-rewrap flow. The old unlock record is not destroyed until
the upgraded copy passes verification.

User-chosen credentials are checked locally against a bounded embedded denylist
of very common/compromised whole-password values plus Coldbox-specific obvious
guesses. No candidate password, hash prefix or other derivative is sent to an
online breach service. The denylist is a minimum safety filter, not a claim that
an unlisted human choice is strong.

Coldbox does not display a fake exact entropy number for human-chosen passwords.
Its health feedback emphasizes minimum length, common-value rejection and
actionable warnings. KDF cost and password quality are displayed as separate
properties: a strong Argon2id profile does not turn a weak password into a strong
one.

The sealed vault-creation/change UI also offers a built-in generator using only
the cold realm's required CSPRNG. Production generation uses unbiased sampling
with no modulo bias and never `Math.random`.

The generator has three user-facing formats:

1. **Portable random password** — a high-entropy letters/digits alphabet chosen
   for reliable manual entry and reduced ambiguous glyphs.
2. **Full random password** — a larger reviewed printable-ASCII alphabet,
   including symbols, for more compact high entropy.
3. **Word passphrase** — independently sampled words from a pinned, reviewed
   large Diceware/EFF-style word list with an unambiguous separator.

A single **strength slider** controls all three formats. Every slider position
produces a strong generated credential; it is not allowed to slide below the
new-vault policy. The implementation documents the exact target search-space,
alphabet/list size and resulting character/word count for every stop. The
recommended/default stop targets at least 128 bits of generator search space;
lower convenience stops remain at least 80 bits and are labeled with their
reduced margin; higher stops extend the search space without arbitrary
composition rules. Exact bit/search-space statements are shown only for
machine-generated values whose sampling process is known.

Changing format or slider position generates a fresh value; it does not
deterministically transform the previous password. A generated value is shown
only inside the sealed realm. Copy is opt-in, visibly warned and uses the
existing best-effort clipboard-clear behavior; direct warm-shell messages,
telemetry and network checks are forbidden.

Generated vault credentials require the user to acknowledge that they have
stored the credential safely before final vault creation/change. Coldbox never
stores a recoverable copy of the vault password for the user and never implies
that Seed/SLIP-39 backups can recover a lost vault password unless the separately
specified vault-recovery method actually applies.

The generator core is shared with the later general Passphrase Studio rather
than implemented twice. SEC.7a delivers the security-critical vault
creation/change surface first; P4.5 later exposes the same reviewed generator for
general-purpose non-vault use.

### 2.10 Seed identity, lineage, signing authority and secret QR handoff

Before Bitcoin-wallet implementation, Coldbox turns seed identity and
deterministic child lineage into first-class authenticated public metadata around
Level 3 sealed records. A user must be able to answer "what is this seed, what is
it for, what depends on it, and where is it used?" without decrypting the seed
phrase.

A sealed Seed record may expose only non-secret identification metadata. The
future identity includes, where applicable:

- stable random record id and human label;
- BIP-32 master fingerprint, word count, language, origin and passphrase-presence
  boolean;
- role: independent seed, BIP-85 entropy root, or BIP-85 child;
- for a child, parent Seed id plus the complete BIP-85 application recipe needed
  to reproduce it, including application parameters and child index;
- human purpose/use, asset/network context and tags;
- signing-authority mode;
- links to Wallet, Account, Device and BackupRecord entities rather than copied
  duplicate facts;
- applicable public wallet identity such as key origin, account xpub, output
  descriptor and canonical public addresses;
- verification state/timestamps; and
- a bounded non-secret identification note.

The existing note concepts are reconciled rather than removed. `Seed.notes`
means **public identification context** such as "Bitcoin savings / SeedSigner /
child 1." It is deliberately available while the seed remains sealed and must
reject mnemonic/xprv/passphrase/share-shaped content. The general Note entity
remains available with public or secret visibility. Sensitive passphrase hints
and recovery instructions belong in linked secret Notes. A `hasPassphrase`
boolean may remain public; the passphrase itself never does.

A BIP-85 root is high-authority derivation/recovery material, not a routine
signing authority by default. A child is its own Seed identity and chooses one
of three signing modes:

- **external-only:** Coldbox retains lineage plus verified public identity while
  the child secret lives only on an external signer;
- **stored-child:** the child mnemonic/passphrase is a separate Level 3 secret
  record with its own REK, and Coldbox signs by opening only that child; or
- **derive-from-root:** no child secret is persisted, but the user explicitly
  authorizes Coldbox to open the root for one exact approved spend, derive only
  the selected BIP-85 child, verify the child's registered public identity, sign
  through WAL.8, and wipe root, child and spend-key material immediately.

The derive-from-root mode is intentionally higher-friction because opening the
root temporarily exposes authority capable of regenerating every child. It is
never silently selected, cached as a session capability or used for background
signing. Changing signing mode is an authenticated security-sensitive action.

BIP-85 requires private-root authority because its application path is fully
hardened and the derived private key is transformed into application entropy.
A parent xpub therefore is **not** a child-seed recovery mechanism. Coldbox never
implies that root xpub plus child index can recreate a BIP-85 child.

For an existing child already loaded into an external device, Coldbox can attach
it without importing the child mnemonic. During an explicit bounded root
verification it derives the specified child, derives expected public identity,
compares more than the 32-bit fingerprint alone, records the relationship, then
drops all transient secret material.

#### Secret QR handoff

Every eligible stored root or child Seed record can invoke Standard SeedQR or
Compact SeedQR directly from its sealed identity view. A derive-from-root child
can also invoke SeedQR after the same fresh high-authority root authorization and
child-identity verification used by recovery/signing. An external-only child
cannot display a secret QR unless Coldbox has an authorized root path capable of
rederiving that exact child.

The interaction deliberately mirrors the established floating-record-menu visual
language, but **not its warm implementation**. Secret QR rendering, QR payload,
acknowledgement, timers and teardown live entirely inside the cold realm. No
secret QR data, pixels, encoded payload or derived mnemonic crosses to the warm
shell.

The quick action defaults to display-only and requires fresh secret
authorization plus an explicit plaintext-secret acknowledgement. Closing it,
timeout, lock, panic, realm teardown or switching subjects clears the QR and
drops transient secret material. Existing cold-local export/print functionality
may remain available as a secondary action with the existing printer/download
retention warnings.

A SeedQR encodes the BIP-39 mnemonic/entropy, **not a BIP-39 passphrase**.
For a passphrase-protected root or child the UI must say plainly "mnemonic only;
passphrase not included." Coldbox does not invent a combined mnemonic+passphrase
QR format or imply that scanning the SeedQR alone recreates a passphrase wallet.

Root QR display carries the high-authority warning because disclosure of the root
can regenerate every deterministic child. Child QR display names the selected
child, its fingerprint, lineage recipe and purpose before reveal so a user does
not load the wrong secret into a stateless signer.

### 2.11 Structured public wallet, account and address identity

The same identification principle applies to public addresses. Notes remain
useful context, but the user must not have to infer machine-relevant identity
from prose.

Wallet, Account and Address records form a public relationship graph. For an
address, the UI resolves and displays, where applicable:

- human label and a dedicated bounded **purpose** field;
- finite role such as receive, change, deposit, withdrawal/payout, donation,
  service/custodial, or other;
- asset/network;
- owning Wallet and Account;
- derivation path/index or explicit imported/manual origin;
- linked Seed identity, including BIP-85 root/child lineage when one exists;
- linked Device records resolved through the wallet/seed relationship;
- verification state and the exact xpub/descriptor/public identity it was
  verified against;
- used/reuse status;
- balance snapshot amount, source and age;
- tags; and
- optional notes as supplemental human context.

Machine-owned facts are linked, not copied into notes. Device firmware/location,
backup health, wallet descriptor and seed lineage remain owned by their
respective records and are rendered into the address detail view by reference.

The public floating record menu remains the public-address QR surface. An address
QR contains only the selected public address/payment-URI data and must visibly
name the same structured address identity so "show QR" cannot silently detach
from the record the user selected.

Applicable child/account xpub, key-origin information and output descriptor are
also explicit pre-v1 exports while all seed records remain sealed. Export warns
that an xpub/descriptor can reveal an address graph and transaction history even
though it cannot spend. Bitcoin descriptor export includes origin
fingerprint/path and round-trips against an independent parser.

This public identity graph applies to watch-only/custodial/manual records too.
Absence of a seed lineage is an explicit valid state rather than a reason to put
ownership facts into notes.

Index or identity conflicts never silently overwrite verified relationships. A
changed xpub/descriptor, stale derivation basis, duplicate BIP-85 recipe or
conflicting address ownership moves the record to a visible stale/conflict state
until reconciled.

---

## 3. Full Bitcoin wallet v1 architecture

### 3.1 Warm realm: untrusted network worker

The warm realm remains the only page realm with network access.

It may:

- query Bitcoin data sources;
- collect chain-tip, transaction, UTXO, fee and mempool information;
- monitor confirmation/reorg state;
- maintain public wallet dashboards;
- broadcast an exact cold-approved finalized transaction.

Warm-provided blockchain information is **evidence, not authority**. It may be
stale, incomplete, contradictory or malicious.

Warm cannot:

- receive seed/private-key plaintext;
- choose a trusted recipient on cold's behalf;
- declare an output to be change;
- decide the final fee;
- construct the authoritative transaction to be signed;
- alter a cold-approved signed transaction before broadcast.

### 3.2 Cold realm: wallet authority

The cold realm remains `connect-src 'none'` and becomes the Bitcoin spending
authority.

It owns:

- authenticated wallet/descriptor identity;
- receive/change ownership verification;
- recipient and amount confirmation;
- UTXO validation used for spending;
- coin-control approval;
- final fee arithmetic and policy enforcement;
- authoritative transaction construction;
- exact transaction review;
- Level 3 key access;
- signing and signature self-verification.

A normal public/watch-only wallet session does not require secret plaintext.

### 3.3 Browser-compatible data sources

A self-hosted privacy mode must use a browser-compatible Bitcoin HTTP data
surface that can be safely reached under the warm CSP, for example a
user-owned Esplora/electrs-compatible HTTP service configured for browser
access.

Direct authenticated Bitcoin Core RPC is not assumed to be browser-safe from a
local `file://` page. WAL.2 must prove any direct Core path before claiming it;
otherwise Coldbox documents the user-owned HTTP indexer/service as the supported
private-node path.

Public providers remain available with explicit privacy/source provenance.
A multi-source cross-check mode may improve integrity but leaks queries to more
operators, so privacy and integrity modes are separate user-visible choices.

### 3.4 Descriptor-backed wallet identity

Wallet ownership is defined from authenticated descriptor/account data, not
from claims made by an API response.

For v1 singlesig, the descriptor implementation covers the exact receive/change
families Coldbox supports and uses checksummed standard descriptors.

Warm may cache public descriptors/xpubs for watch-only discovery. Cold remains
the authority when a spend is authorized.

### 3.5 Wallet synchronization

The wallet sync engine tracks:

- derived receive/change address ranges;
- UTXOs/outpoints and exact satoshi values;
- transaction history;
- mempool/unconfirmed state;
- confirmations;
- chain-tip context;
- replacements/conflicts;
- reorg rollback;
- pending local spends.

All monetary arithmetic is integer satoshis. No floating-point value controls a
Bitcoin amount or fee.

### 3.6 UTXO management and privacy

Coldbox exposes first-class coin control:

- individual UTXO list;
- labels;
- freeze/unfreeze;
- explicit/manual selection;
- automatic selection;
- confirmation state;
- address/account provenance;
- suspicious-small-coin quarantine;
- privacy warnings for address reuse and cluster merging.

Automatic selection does not silently merge unrelated accounts/labels when a
less revealing choice exists. Cross-account mixing requires explicit approval.

### 3.7 Fee engine

Network data sources may suggest fee rates. Cold computes the actual final fee
from the transaction it constructs.

The spending policy supports:

- absolute fee ceiling;
- fee-rate ceiling;
- fee-as-percentage/relative warning or ceiling;
- minimum confirmation policy;
- RBF policy;
- unconfirmed-input policy.

Changing a security policy is a separately reauthenticated action. A spend
warning does not contain a one-click bypass that silently weakens the policy.

### 3.8 Strict Payload Schema Enforcement

Every cross-realm Bitcoin message has a finite typed schema, bounded sizes and
closed enums where practical.

Unknown fields, duplicate fields, unsupported script/signature types,
unsupported PSBT/proprietary extensions, impossible counts, out-of-range
amounts and ambiguous wallet ownership fail closed.

Strict schema enforcement is necessary but not sufficient: Cold also derives
wallet ownership, reconstructs transaction meaning, enforces policy and binds
human approval to the exact transaction.

### 3.9 Cold-owned transaction construction

Warm supplies validated/bounded public chain evidence and fee suggestions.

Cold constructs the authoritative transaction:

- version;
- inputs/outpoints;
- sequences;
- recipient outputs;
- verified change;
- locktime;
- fee;
- RBF semantics;
- supported sighash mode.

An output is change only if Coldbox derives and proves it belongs to the
authenticated selected wallet.

### 3.10 Review-to-sign binding

The final review screen is produced inside the cold realm from the exact
transaction object/bytes that will be signed.

It shows at minimum:

- selected wallet/fingerprint;
- recipients and exact satoshi/BTC amounts;
- each selected input;
- verified change;
- total fee and fee rate;
- RBF state;
- policy/privacy warnings;
- expected resulting wallet state where safely computable.

Approval is bound to an exact transaction digest. Any semantically relevant
change invalidates approval and returns to review.

### 3.11 Signing

Signing is a privileged Level 3 operation, not a consequence of the public
wallet merely being open.

The lifecycle is:

`review -> approve -> reauthenticate -> decrypt one seed record -> derive only
required child key(s) -> sign -> verify signature -> wipe child key/seed/REK/DEK/KEK`

The implementation supports only explicitly accepted sighash/script forms.
Unsupported signing forms fail closed.

The signer verifies the signature it produced before returning it.

### 3.12 Signature-output boundary

A Bitcoin signature/final transaction is intentionally public output produced
using secret key material. That is different from exposing the secret itself.

Therefore the old absolute statement that a malicious cold implementation has
no possible egress is no longer sufficient once signing ships.

v1 mitigates malicious-signer risk through:

- reproducible release verification;
- reviewed/pinned signing implementation;
- deterministic/standard nonce construction where required by the signing
  standard;
- signature self-verification;
- independent test vectors and differential tests;
- professional audit of the complete signer;
- exact limitation of the cold->warm signing/broadcast message.

These controls do **not** honestly prove that a maliciously modified signer
cannot encode information in valid signatures.

Post-v1 hardware-signer integration is the place for an independent physical
signer/secure element and, where supported by the device/protocol, stronger
anti-exfiltration schemes.

### 3.13 Broadcast

Cold returns only the exact finalized transaction authorized by the user plus
its expected identifier.

Warm may broadcast those exact bytes. It does not rebuild or mutate them.

Broadcast success is not confirmation. The wallet tracks mempool, confirmed,
replaced, conflicted, dropped and reorganized states separately.

### 3.14 RBF and CPFP

RBF and CPFP are first-class v1 workflows.

RBF loads the original transaction, proves the replacement relationship and
shows the old/new fee and every changed field. Changing recipient/amount is
treated as a new spend review rather than disguised as a fee bump.

CPFP only spends an output Coldbox can prove belongs to the wallet and displays
the combined fee effect of parent plus child.

### 3.15 PSBT interoperability

v1 supports bounded PSBT v0/v2 import, inspection, update/signing where the
wallet has authority, finalization/export as appropriate, and Taproot fields
for the supported v1 spend families.

Unknown/proprietary extensions are not silently trusted. Support is finite and
test-vector-backed.

---

## 4. Required v1 release gate

The public `v1.0.0` tag does not exist until:

1. UI.11 is independently complete.
2. SEC.1–SEC.9 are independently complete.
3. WAL.1–WAL.15 are independently complete.
4. Every remaining pre-v1 roadmap item through Phase 5 is independently complete.
5. The v1 feature set is frozen.
6. A professional external security audit covers the complete release
   candidate, including the transaction and signing path.
7. Every audit finding is remediated and independently re-verified.
8. The full supported physical-device matrix is recorded.
9. Release signatures, published fingerprint, reproducible build, CI
   attestation and downloaded-artifact verification have all been rehearsed.
10. The final release candidate receives the normal independent Coldbox review.

The audit is not performed against a pre-signing architecture and then treated
as proof for code added afterward.

---

## 5. Post-v1 advanced wallet direction

After v1, Coldbox may add:

### Multisig

- complete M-of-N descriptor-backed wallet operation;
- cosigner identity and origin verification;
- partial-signature coordination;
- PSBT signing-progress state;
- quorum/change-policy verification;
- hardware and airgapped cosigners.

### Hardware signer integration

Hardware signer support is optional and does not replace the standalone v1
wallet.

The high-assurance model is:

`Coldbox validates/builds -> hardware signer independently displays/signs ->
Coldbox verifies returned signature -> broadcast`

Initial integration should prefer interoperable PSBT/QR/file workflows that do
not weaken the `file://` and cold-realm model. Direct WebUSB/WebHID transport
requires its own accepted ADR and portability/security evidence.

A secure-element device can provide private-key isolation and an independent
physical confirmation surface that ordinary browser execution cannot provide.
Coldbox must not market its encrypted vault as equivalent to a secure element
against host-memory or physical-chip attacks.

### Hardware-backed anti-exfiltration

Where a hardware device/protocol supports a reviewed anti-exfiltration or
host/signer nonce-commitment design, Coldbox may offer it as a higher-assurance
signing mode after separate review. The warm and cold realms inside the same
artifact do not count as independent devices for this claim.

---

## 6. Documentation landing rules

This future contract does not preemptively rewrite current behavior.

When SEC/WAL work lands, the implementing PR updates the canonical current
documents it changes, including as applicable:

- `SPEC.md`
- `architecture.md`
- `vault-format.md`
- `data-model.md`
- `design-system.md`
- `threat-model.md`
- `crypto-choices.md`
- `csp-policy.md`
- `verification.md`
- `api-sources.md`
- `standards.md`
- `testing.md`
- `release-checklist.md`
- user-facing three-depth guides and glossary
- `SECURITY.md`
- accepted ADR amendment/supersession markers

Archived packets and review reports are historical evidence and are never
rewritten to make past decisions look as though the wallet direction had
already existed.