# ADR-0058: Vault credential minimum, offline strength checks and sealed generator

**Status:** Accepted — future v1 direction
**Date:** 2026-08-17

## Context

A Coldbox vault can currently be created with a user-entered passphrase and an
Argon2id KDF profile. KDF cost is important, but it cannot compensate for an
arbitrarily short or obvious vault credential in an offline-guessing scenario.

Coldbox also plans a general Passphrase Studio later in the roadmap. Vault
creation needs the security-critical subset earlier, and implementing a separate
generator twice would create unnecessary cryptographic and UX drift.

Current password guidance has also moved away from composition rules such as
"one uppercase, one number, one symbol." Length, rejection of very common
choices, safe random generation and expensive password hashing are more useful.

Coldbox is offline-first and secret-handling code is deliberately network
isolated. A breach-password web API is therefore inappropriate for vault
creation: the candidate credential or a derivative of it must never be sent to
the network.

## Decision

### New credentials have a 15-character floor

A user-chosen credential for **new vault creation or credential replacement**
must contain at least 15 Unicode code points after the documented normalization
step.

Coldbox:

- allows spaces and broad printable input;
- accepts at least 64 characters;
- never silently truncates;
- verifies the complete credential; and
- imposes no uppercase/lowercase/digit/symbol composition recipe.

The KDF profile and credential-quality indicators are separate. "Paranoid KDF"
does not turn `password1234567` into a good credential.

### Legacy unlock remains compatible

The minimum is not retroactive to unlock.

A pre-policy vault with a shorter credential must remain unlockable using the
exact historical semantics under which it was created. After unlock, Coldbox
shows a current-policy warning and offers a deliberate upgrade.

Credential upgrade rewraps the vault DEK under the new credential. Seed material
does not change. The prior usable file/unlock record remains intact until the
new save passes authentication/verify-after-save.

### Human choices receive bounded offline checks

At creation/change, the complete candidate is compared locally against a bounded
embedded list of very common/compromised values and obvious Coldbox-specific
guesses. The list is versioned and reproducible.

No candidate, hash prefix or lookup token is sent to an online service.

This is a safety floor, not a comprehensive breach guarantee. Coldbox must not
say "not found = safe."

For human-chosen credentials, UI feedback does not claim an exact entropy number.
It reports actionable facts such as too short, commonly used/rejected, long
enough, and additional local guessability warnings where the implementation can
justify them.

### The vault UI gets one sealed generator with three formats

The generator runs entirely inside the sealed realm and uses only the required
cryptographic random source.

Formats:

1. **Portable password** — independently sampled characters from a reviewed
   letters/digits alphabet that avoids visually ambiguous characters.
2. **Full password** — independently sampled characters from a larger reviewed
   printable-ASCII alphabet including symbols.
3. **Passphrase** — independently sampled words from a pinned large
   Diceware/EFF-style word list with an unambiguous separator.

Sampling is unbiased. Implementations use rejection sampling or an equivalent
proof-safe mapping; modulo bias and `Math.random` are forbidden.

### One strength slider controls all formats

The slider has documented discrete stops. Each stop maps to a target minimum
generator search space, then to the required character count or word count for
the selected format.

All positions are deliberately strong. The UI does not offer a "weak but
convenient" generated vault credential.

- no stop is below 80 bits of generator-controlled search space;
- the recommended/default stop targets at least 128 bits;
- higher stops increase output length/word count predictably; and
- every generated output also satisfies the 15-character creation floor where
  that floor applies to character-counted passwords.

Exact bit/search-space labels are allowed for generated values because Coldbox
controls the random experiment and knows the alphabet/list cardinality. The same
labels are **not** applied to human-chosen passwords.

Changing the slider or format and pressing regenerate draws a new independent
secret. Coldbox never stretches or edits a previously generated credential and
calls the result stronger.

### Generated credentials are secret material

Generated credentials:

- never cross the cold/warm MessageChannel;
- are never placed in telemetry, URLs or logs;
- are masked by default after the initial deliberate reveal workflow;
- may be copied only through an explicit warned secret-copy action with the
  existing best-effort clipboard clear;
- are cleared on error, cancel, lock, panic, idle timeout and realm teardown; and
- require acknowledgement that the user saved the credential before the final
  create/change action.

Coldbox does not retain a recoverable password copy. The UI must state that loss
of the vault credential can cause loss of access except where the separately
configured vault-recovery mechanism actually provides an alternate unlock path.

### One generator core, two product surfaces

SEC.7a ships the generator core and the vault-create/change integration.

P4.5 later exposes that **same reviewed generator core** as the general Passphrase
Studio, adding general-purpose UX without a second random generator.

## Rationale

A minimum length closes the easiest avoidable offline-guessing failure without
training users into predictable composition tricks.

Machine generation gives users a safer default than asking them to invent a
"clever" password. Offering both compact random passwords and word passphrases
supports password-manager users and people who need a human-recordable secret.

Keeping the generator in the cold realm preserves the existing architecture:
the system that can use the vault credential is also the only system that sees
the generated value.

## Consequences

### Positive

- New vaults can no longer be protected by arbitrarily short credentials.
- Users get a high-quality safe default instead of only a warning meter.
- Legacy vaults remain recoverable.
- Generated strength is measurable because the random process is known.
- General Passphrase Studio reuses one reviewed random-generation core.

### Negative

- Some users will need to upgrade old short credentials.
- A 128-bit generated passphrase can be long.
- Embedding a high-quality word list adds bundle size that must stay within the
  existing budget.
- Clipboard/password-manager transfer remains an OS-level exposure when the user
  chooses it.

### Risks

- Unicode normalization changes can break compatibility if applied silently.
- A weak embedded common-password list could create false confidence.
- A biased random-index implementation could materially reduce generated
  strength.
- A UI that mixes KDF strength with password strength could mislead users.
- A generated password that is not safely recorded can lock the user out.

These are test targets, not documentation warnings only.

## Alternatives considered

### Require uppercase/lowercase/number/symbol

Rejected. It encourages predictable transformations and is not the security model
Coldbox wants to teach.

### Allow any length but show a warning

Rejected for new creation/change. A warning is too easy to ignore for the secret
protecting all vault records.

### Block legacy unlock below 15 characters

Rejected. Security policy must not make existing user data inaccessible.

### Query a breach-password API

Rejected. Vault credentials and derivatives remain inside the sealed/offline
boundary.

### Build a separate generator later in P4.5

Rejected. Vault creation needs it earlier and duplicate cryptographic generator
implementations increase audit surface.

## References

- NIST SP 800-63B, Password Authenticators and Strength of Passwords
- OWASP Authentication Cheat Sheet
- [ADR-0003](0003-argon2id-parameters.md)
- [ADR-0050](0050-level-3-secret-record-vault.md)
- [v1 security/wallet contract](../../01-spec/v1-security-wallet-contract.md)
