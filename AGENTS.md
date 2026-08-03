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
8. **[docs/05-development/review-protocol.md](docs/05-development/review-protocol.md)** — how your work will be judged. Read it before you start, not after.

Then, for your specific item: `vault-format.md`, `csp-policy.md`, `crypto-choices.md`, `data-model.md`, or `chain-registry.md` as relevant.

## 2. Pick your work

From the roadmap: **the first `[ ]` item whose dependencies are all `[x]`.**

Check `git log` and open branches first, in case an item marked `[~]` is genuinely in progress.

**One roadmap item per PR.** Don't bundle. Don't skip ahead because a later item looks more interesting — the ordering encodes dependency.

**Never start an item marked `👤 human-required`.** It needs physical hardware or a human decision that isn't yours to make. Report it and stop.

If the item is already complete but unmarked, mark it and move to the next.

Asked to work several items in one session? That's a **batch run** — follow [batch-run.md](docs/05-development/batch-run.md), which adds dependency-aware branching, a self-review gate between items, and hard stop conditions.

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

**Update docs in the same PR.** Help content compiles from `docs/` into the app, so a doc lag means the app itself is lying to users. User-facing features need all three depths (plain / working / technical).

**Follow [doc-hygiene.md](docs/05-development/doc-hygiene.md).** The two rules that catch most people: every fact has exactly one canonical home and everywhere else links to it, and any document describing the outside world — tax rules, vendor firmware, API terms — carries a review date. Never restate a fact that lives elsewhere; you're creating a future contradiction.

**Add an ADR for structural decisions.** Format in [docs/05-development/adr/README.md](docs/05-development/adr/README.md).

**Update the roadmap** in the same commit as the work.

## 5. Definition of done

- [ ] Every acceptance criterion from the roadmap item is **met**, not reinterpreted
- [ ] Tests written, including negative tests, using independent vectors
- [ ] `npm test`, `npm run verify-vendor`, and the lint all pass
- [ ] Build is reproducible — built twice, hashes identical
- [ ] Tested on at least one desktop and one mobile browser from `file://`
- [ ] Docs and help content updated, per [doc-hygiene.md](docs/05-development/doc-hygiene.md)
- [ ] No fact duplicated — every claim links to its canonical home
- [ ] Review dates updated on any dated doc this change touches
- [ ] No doc left contradicting the new behaviour
- [ ] ADR added if a structural decision was made
- [ ] Roadmap status updated
- [ ] CHANGELOG updated
- [ ] **PR packet written**
- [ ] Working tree clean, everything pushed
- [ ] Exactly one roadmap item in this branch
- [ ] You would PASS this yourself under [the review protocol](docs/05-development/review-protocol.md)

That last one is the real test. Read your own diff as a stranger who distrusts you, using the reviewer's checklist. Anything you'd flag, fix now — because the reviewer will flag it, and any finding is a FAIL.

## 6. Deliver a PR packet

Full spec: [docs/05-development/pr-packet.md](docs/05-development/pr-packet.md).

Write `docs/05-development/packets/<roadmap-id>-<slug>.md`, matching your branch name. Its purpose is to let a reviewer verify your work **without trusting you**. So:

- **Show, don't assert.** Paste the commands and their real output. "Verified reproducible" is worthless; two matching hashes are evidence.
- **State every assumption**, its basis, and what breaks if it's wrong.
- **Say what to scrutinise.** Where are you least confident? "Nothing, it's straightforward" is almost always wrong.
- **Report gaps honestly.** Couldn't test on iOS? Mark it untested. A flagged gap is a managed risk; a hidden one is a latent failure.
- **Self-assess.** What might be wrong? What did you skip?

## 6a. Git protocol

Every rule below exists because it was broken once and cost real time. Follow them literally.

### One agent per working tree — always

**Never run two agents, or an agent and a human, against the same checkout at the same time.** Git serialises on `.git/index.lock`, so concurrent work produces `Unable to create index.lock` — and the failure mode is nasty: `add` and `commit` fail while `push` still succeeds, silently publishing empty branches while you believe work was saved.

If you see `index.lock` errors, **stop immediately**. Do not retry, do not delete the lock file. Another process is mid-operation and deleting its lock can corrupt the index. Report it and wait.

If a second agent needs to work in parallel, it gets its own clone or a `git worktree` — never a shared checkout.

### Session preflight — run before touching anything

```
git status                    # MUST be clean. If not, stop (see below)
git branch --show-current     # MUST be main before you branch
git pull
git checkout -b p0.5-cold-realm-bootstrap     # roadmap ID, short description
git branch --show-current     # confirm you're where you think you are
```

**If `git status` is not clean, do not proceed.** Uncommitted changes belong to someone — possibly the human, possibly a previous session. Report what you found and ask. Never stash, discard, or absorb work you didn't create.

**If you are not on `main`,** you may be on a previous item's branch. Do not build on it. Return to `main` and branch fresh.

### Session postflight — run before you stop, every time

```
git status                    # review every listed file; expect no surprises
git add <explicit paths>      # never `git add -A`
git commit -m "..."
git push -u origin <your-branch>
git status                    # MUST be clean now
```

**Never end a session with uncommitted work.** Not "I'll finish next run" — commit what exists, push it, and note the state in your packet. Work left in a working tree across sessions gets tangled with other branches and eventually lost.

**One branch per roadmap item. No exceptions.** If you finish an item and want to continue, open the PR, return to `main`, and branch again. Two items on one branch cannot be reviewed independently, which defeats the purpose of the packet — and the reviewer will FAIL it on sight.

If you were asked to work several items in one session, that's a **batch run** — follow [batch-run.md](docs/05-development/batch-run.md). It still means one branch per item; the difference is that branches stack on their dependencies rather than all coming off `main`.

The temptation is real: you finish P0.1, the next item looks small, and continuing feels efficient. It isn't. It produces a branch whose packet describes one thing and whose diff contains two, and untangling that afterwards costs far more than the branch switch would have.

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

**Open the PR when the item is done and the packet is written**, not per run. A run that ends mid-item ends with a push and a note in your packet saying where you stopped.

**If the working tree contains changes you didn't make** — the human may have edited docs while you were working — do not sweep them into your commit. Stage your files explicitly by path. `git add -A` is how unrelated work ends up in the wrong PR.

### Verify every git command's output

Do not fire a batch of git commands and assume they worked. Each one either succeeded or it didn't, and git failures are frequently non-fatal — the next command runs anyway, on a state you didn't expect.

Specifically: after `checkout`, confirm the branch. After `commit`, confirm the file count. After `push`, confirm the ref updated. If a command errored, **stop and resolve it** rather than continuing down the script.

### Shell gotchas

**PowerShell mangles `@{`** — it's a hashtable literal. `git checkout stash@{0} -- file` fails with a confusing `unknown switch 'e'`. Quote it: `git checkout 'stash@{0}' -- file`, or use the raw commit SHA instead.

**`$?` after a pipeline reports the last command in the pipe**, not the one you care about. `npm run build 2>&1 | tail -4; echo $?` tells you about `tail`. Test exit codes without a pipe, or use `PIPESTATUS`.

**Prefer raw SHAs over symbolic refs** in any scripted recovery. They can't be reinterpreted by a shell.

Then open a PR using the template.

## 6b. Expect an independent review

Your packet will be reviewed by someone — human or another agent — working from [docs/05-development/review-protocol.md](docs/05-development/review-protocol.md).

Two things to internalize about how that review works:

**The verdict is binary: PASS or FAIL.** There is no "approve with comments."

**Any finding at all — including cosmetic or advisory — is a FAIL.** So there is no benefit in leaving a rough edge and hoping it slides. It won't.

The reviewer will independently re-run your verification, build under a different path/timezone/locale, deliberately break things to confirm they fail closed with non-zero exit codes, and download vendored dependencies from upstream to compare bytes. Write your packet expecting all of that, and expecting a stranger to do it without asking you anything.

The most useful thing you can put in a packet is an honest account of what you're unsure about. A finding you flagged yourself is a managed risk. One the reviewer discovers that you should have known about damages the credibility of everything else you claimed.

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
