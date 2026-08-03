# Instructions for AI agents

You are contributing to Coldbox: a single-file, offline-first crypto toolkit that handles seed phrases and private keys. **A bug here can cost someone everything they own.** Work accordingly.

This file is your standing contract. Read it fully before doing anything else.

---

## 1. Orient yourself

Read in this order. Don't skip — most "why is it built like that" questions are already answered, and re-litigating settled decisions wastes everyone's time.

1. **[docs/05-development/ROADMAP.md](docs/05-development/ROADMAP.md)** — what to build next. Authoritative.
2. **[docs/01-spec/SPEC.md](docs/01-spec/SPEC.md)** — the design. Long; skim the whole thing, read the sections your item touches.
3. **[docs/01-spec/architecture.md](docs/01-spec/architecture.md)** — the two-realm split. **Non-negotiable. Understand it before writing any code.**
4. **[docs/05-development/adr/](docs/05-development/adr/)** — why decisions were made and what was rejected.
5. **[CONTRIBUTING.md](CONTRIBUTING.md)** — hard constraints and conventions.
6. **[docs/02-security/threat-model.md](docs/02-security/threat-model.md)** — what's defended and what isn't.
7. **[docs/05-development/pr-packet.md](docs/05-development/pr-packet.md)** — your deliverable.

Then, for your specific item: `vault-format.md`, `csp-policy.md`, `crypto-choices.md`, `data-model.md`, or `chain-registry.md` as relevant.

## 2. Pick your work

From the roadmap: **the first `[ ]` item whose dependencies are all `[x]`.**

Check `git log` and open branches first, in case an item marked `[~]` is genuinely in progress.

**One roadmap item per PR.** Don't bundle. Don't skip ahead because a later item looks more interesting — the ordering encodes dependency.

If the item is already complete but unmarked, mark it and move to the next.

## 3. Constraints you cannot violate

Full list in [CONTRIBUTING.md](CONTRIBUTING.md). These are the ones that end a PR:

| | |
|---|---|
| **No network in the cold realm** | `connect-src 'none'` stays. This is the project's central claim |
| **No secret crosses the realm boundary** | No message type may carry a mnemonic, private key, xprv, passphrase, or secret-compartment plaintext |
| **Fail closed** | If a guarantee can't be established, refuse to proceed. Never degrade silently |
| **No runtime dependencies** | Everything vendored, pinned, hashed. Nothing fetched at build or run time |
| **No ES modules, no `eval`, no `new Function`** | `file://` compatibility and CSP hash-pinning both depend on this |
| **Reproducible builds** | Any nondeterminism in output breaks the trust model |
| **`crypto.getRandomValues` only** | Never `Math.random` in a security path. Hard-fail if unavailable |
| **Independent test vectors** | Vectors you generated yourself prove nothing |
| **Single output file** | One HTML file, working from `file://` |

## 4. How to work

**When the spec is silent, stop.** Don't guess on anything touching a security boundary, the vault format, or a cryptographic choice. Open an issue or write an ADR proposal describing the options and your recommendation. **A delay costs hours; a wrong guess costs someone's savings.**

For genuinely minor gaps — a variable name, a layout detail — decide, and record it under Assumptions in the packet.

**Write the test first for anything cryptographic.** Get the official vectors, write the failing test, then implement.

**Update docs in the same PR.** Help content compiles from `docs/` into the app, so they cannot drift. User-facing features need all three depths (plain / working / technical).

**Add an ADR for structural decisions.** Format in [docs/05-development/adr/README.md](docs/05-development/adr/README.md).

**Update the roadmap** in the same commit as the work.

## 5. Definition of done

- [ ] Every acceptance criterion from the roadmap item is **met**, not reinterpreted
- [ ] Tests written, including negative tests, using independent vectors
- [ ] `npm test`, `npm run verify-vendor`, and the lint all pass
- [ ] Build is reproducible — built twice, hashes identical
- [ ] Tested on at least one desktop and one mobile browser from `file://`
- [ ] Docs and help content updated
- [ ] ADR added if a structural decision was made
- [ ] Roadmap status updated
- [ ] CHANGELOG updated
- [ ] **PR packet written**

## 6. Deliver a PR packet

Full spec: [docs/05-development/pr-packet.md](docs/05-development/pr-packet.md).

Write `PR-PACKET.md` at the repo root on your branch. Its purpose is to let a reviewer verify your work **without trusting you**. So:

- **Show, don't assert.** Paste the commands and their real output. "Verified reproducible" is worthless; two matching hashes are evidence.
- **State every assumption**, its basis, and what breaks if it's wrong.
- **Say what to scrutinise.** Where are you least confident? "Nothing, it's straightforward" is almost always wrong.
- **Report gaps honestly.** Couldn't test on iOS? Mark it untested. A flagged gap is a managed risk; a hidden one is a latent failure.
- **Self-assess.** What might be wrong? What did you skip?

## 6a. Git protocol

**Check your branch before you touch anything.** `git status` first, every session. If you're on `main` or on someone else's item branch, stop and create your own.

```
git checkout main
git pull
git checkout -b p0.5-cold-realm-bootstrap     # roadmap ID, short description
```

**One branch per roadmap item. No exceptions.** If you finish an item and want to continue, open the PR, return to `main`, and branch again. Two items on one branch cannot be reviewed independently, which defeats the purpose of the packet.

**Commit as you go**, in logical chunks — not one giant commit at the end. The commit sequence is part of the audit trail; a reviewer should be able to follow how the work developed. Imperative mood, and explain *why* in the body.

**Push at the end of every run**, always to your item branch:

```
git push -u origin p0.5-cold-realm-bootstrap
```

This means the work survives a lost session, the human can review from GitHub, CI runs, and a second agent can fetch the branch to review it.

**Never:**

- Push directly to `main`
- Force-push a branch that has an open PR
- Commit work belonging to a different roadmap item
- Commit `.cbx` files, real seeds, or keys — run `git status` and look before every commit

**Open the PR when the item is done and the packet is written**, not per run. A run that ends mid-item ends with a push and a note in `PR-PACKET.md` saying where you stopped.

**If the working tree contains changes you didn't make** — the human may have edited docs while you were working — do not sweep them into your commit. Stage your files explicitly by path. `git add -A` is how unrelated work ends up in the wrong PR.

Then open a PR using the template.

## 7. Never

- Commit a real seed phrase, private key, or vault file. Use throwaway values, and check `git status` before committing
- Log a secret, even behind a debug flag
- Weaken the cold realm's CSP
- Add a message type that could carry secret material
- Add a chain without independent test vectors
- Mark an acceptance criterion met when it isn't
- Claim you tested something you didn't
- Fetch anything at build or run time
- Reinterpret an acceptance criterion to fit what you built

## 8. If you get stuck

Say so. Write what you tried, what blocked you, and what you'd need to proceed. Leave the branch in a reviewable state with a partial packet explaining where you stopped.

**A clear "I couldn't finish this and here's why" is a good outcome.** A plausible-looking implementation that quietly fails a security property is the worst possible one, because it looks like progress.
