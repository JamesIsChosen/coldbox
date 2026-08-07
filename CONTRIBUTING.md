# Contributing

Thanks for considering it. This project has unusual constraints, and knowing them upfront will save you rework.

---

## Before you write code

**Read [the specification](docs/01-spec/SPEC.md) and [the ADRs](docs/05-development/adr/).** Most "why on earth is it built like that" questions have a written answer. If an ADR is wrong, that's worth a discussion — but argue with the recorded reasoning rather than around it.

**Open an issue first for anything non-trivial.** The design has hard constraints that aren't obvious, and it's frustrating for everyone to reject a large PR on architectural grounds.

---

## Hard constraints

Non-negotiable. A PR violating any of these can't be merged regardless of how good it is otherwise.

| Constraint | Why |
|---|---|
| **No network access in the cold realm** | The entire security model. `connect-src 'none'` stays |
| **No runtime dependencies** | Everything vendored, pinned, and hashed. Nothing fetched at build or run time |
| **No ES modules, no `import`** | `file://` origins break module loading in Safari and Firefox |
| **No `eval`, no `new Function`** | Enforced by a build-time lint |
| **No `localStorage` for secrets** | UI preferences only |
| **No external resources** | No CDN, no fonts, no analytics, no images from anywhere |
| **Builds stay reproducible** | Anything nondeterministic in output breaks the trust model |
| **Single output file** | One HTML file. No sidecars, no assets directory |
| **Works from `file://`** | If it needs a server, it doesn't ship |

## Secrets discipline

- Secrets live in `Uint8Array`, not `String`, wherever the code path allows. Zero-fill after use.
- Secret-bearing DOM fields carry `spellcheck="off" autocomplete="off" autocorrect="off" autocapitalize="off"`. Browser spellcheck can transmit typed text to vendor servers.
- Never log a secret, even behind a debug flag. There is no debug flag that makes it acceptable.
- New `postMessage` message types need explicit review. The schema is a whitelist, and a message type that can carry a secret is a hole in the architecture.

---

## Development

```bash
git clone https://github.com/<you>/coldbox
cd coldbox
npm ci            # dev tooling only — the app itself has no runtime deps
npm run verify    # confirm vendored libs match their upstream hashes
npm run build     # produces build/coldbox.html
npm test
```

Full detail in [docs/05-development/build.md](docs/05-development/build.md).

### Adding a dependency

Rarely the right answer. If it is:

1. Vendor the actual release artifact into `vendor/`.
2. Record its version and upstream SHA-256 in [docs/05-development/dependencies.md](docs/05-development/dependencies.md).
3. Confirm `npm run verify` passes.
4. Add it to the in-app provenance panel.
5. Justify the bundle size cost in your PR.

Prefer `@noble` and `@scure` libraries — audited, dependency-free, and already in the tree.

### Adding a chain

See [docs/04-reference/supported-chains.md](docs/04-reference/supported-chains.md). You'll need the SLIP-44 coin type, curve, address encoding, and **test vectors from an independent implementation**. A chain without test vectors won't be merged — silently producing a wrong address is worse than not supporting the chain at all.

---

## Testing

Cryptographic code needs test vectors from an independent source — the relevant BIP/SLIP, a reference implementation, or a hardware wallet. "I checked it against my own implementation" is circular.

Required for any change touching derivation, mnemonics, or the vault format:

- Official test vectors where they exist
- Round-trip tests (encode → decode → identical)
- Edge cases: empty input, maximum length, invalid checksum, wrong network
- For vault changes: a vault written by the previous version must still open

Manual verification across the device matrix in [docs/05-development/testing.md](docs/05-development/testing.md) is required before release, because `file://` behaviour differs meaningfully between browsers.

---

## Documentation

**Help content lives in `docs/` and compiles into the app.** There is one copy of every explanation. If you change behaviour, update the doc in the same PR — they cannot drift apart, by design.

Explanations exist at three depths (plain / working / technical). If you add a feature, add all three. Writing the plain-English version is often what reveals that the feature is confusing.

## Architecture Decision Records

Making a structural decision? Add an ADR in `docs/05-development/adr/`. Short: what we decided, what else we considered, why this, and what would change our mind. Six months from now it's the difference between "why is there an iframe in here" being a paragraph or an archaeology project.

---

## Pull requests

- One logical change per PR — and for roadmap work, exactly one roadmap item.
- Describe what breaks if you're wrong. Security-relevant PRs should state their threat-model impact explicitly.
- Note bundle size impact.
- Confirm you tested on at least one desktop and one mobile browser, from `file://`.
- Include a PR packet per [pr-packet.md](docs/05-development/pr-packet.md).

### How review works

Reviews follow [review-protocol.md](docs/05-development/review-protocol.md) and end in a binary **PASS or FAIL**. There is no "approve with comments," and **any finding of any severity — including cosmetic — is a FAIL.**

This is stricter than typical projects, deliberately. A comment attached to a merged PR is a comment nobody actions; requiring a FAIL means every concern is either fixed or explicitly dismissed with reasoning. Given that this tool handles seed phrases, a delayed merge costing hours is a good trade against a wrong merge costing someone their savings.

FAIL carries no judgement about effort. It means "not yet." Fix the findings, push, and request a fresh verdict.

Commit messages: imperative mood, explain *why* in the body. `fix: reject xpub with invalid version bytes` beats `fixes`.

## Code of conduct

Be decent. Assume good faith. Critique code, not people. Anyone who makes participating unpleasant for others will be removed regardless of contribution quality.

## License

Contributions are licensed under the [GNU Affero General Public License v3.0 only](LICENSE), same as the project. By opening a pull request you are licensing your contribution under those terms.

You keep the copyright in what you write — there is no CLA and no copyright assignment. One practical consequence: once your work is merged, relicensing the project would need your agreement as well as the maintainer's. That is deliberate. See [ADR-0018](docs/05-development/adr/0018-agplv3-license.md).
