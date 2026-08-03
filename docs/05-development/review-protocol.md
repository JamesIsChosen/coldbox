# Review protocol

The contract for whoever reviews a PR packet — human or agent.

**Every review ends in exactly one word: PASS or FAIL.** There is no third option, no "approve with comments," no "LGTM with nits."

---

## The core rule

> **Any advisory, nit, concern, suggestion, or "worth considering later" is a FAIL.**

If it's worth writing down, it's worth fixing before merge.

This is deliberately stricter than normal software review, for two reasons.

**"Approve with comments" is where defects go to live.** A comment attached to a merged PR is a comment nobody will action. The author has moved on, the branch is gone, and the concern quietly becomes permanent. Requiring a FAIL means the concern gets resolved or explicitly dismissed with reasoning — either way, someone decides.

**This tool handles seed phrases.** The cost asymmetry is extreme: a delayed merge costs hours, a wrong merge can cost someone everything they own. When those are the stakes, a reviewer who can hedge will hedge, and the hedge is worth nothing.

If you genuinely think something is fine, say nothing about it and PASS. If you're not sure, that uncertainty is itself a finding — write it down and FAIL.

---

## Verdict definitions

**PASS** — every acceptance criterion is met and independently verified, all hard constraints hold, and you have no findings of any severity. The work merges as-is.

**FAIL** — anything else. Including:

- An acceptance criterion is unmet, or reinterpreted to fit what was built
- An acceptance criterion **cannot be verified** — you can't pass what you can't check
- A hard constraint is violated
- You have a finding of any severity, including cosmetic
- The packet's claims don't reproduce on your machine
- Something is unclear enough that you'd need to ask the author

FAIL is not an insult and carries no implication about effort or competence. It means "not yet."

---

## What you must do before deciding

**Verify independently. Do not trust the packet.** Its purpose is to tell you what to check, not to be the evidence itself.

### Always

```bash
git checkout <branch>
npm ci
npm run verify-vendor
npm run lint
npm test
npm run build && shasum -a 256 build/coldbox.html
rm -rf build && npm run build && shasum -a 256 build/coldbox.html   # must match
```

Then, beyond re-running what the author ran:

- **Build under a different path, timezone, and locale.** Two builds in the same shell prove almost nothing about determinism.
- **Break something on purpose** and confirm it fails — with a **non-zero exit code**, not just an error message. A build that throws but exits 0 passes CI silently.
- **Check the acceptance criteria verbatim** against the roadmap, not as summarized in the packet.
- **Read the diff.** All of it.

### When the change touches security-relevant code

| Area | Verify |
|---|---|
| Realm boundary | `connect-src 'none'` present at runtime; `allow-same-origin` absent; no message type can carry secret material |
| Message schema | Unknown types dropped; unknown fields stripped; global handler ignored post-handshake |
| Vault format | Fresh nonce per save; header in AAD; secret subkey unreachable while online; tampering fails authentication |
| Derivation | Vectors come from a genuinely **independent** implementation — check the source, don't take the citation on faith |
| Randomness | `getRandomValues` for all key material; no `Math.random` anywhere in a security path; hard-fail when absent |
| Dependencies | Vendored bytes match **real upstream**, downloaded yourself — not just the project's own manifest |
| CSP | Policy in the built artifact matches what's documented |

### Automatic FAIL

No amount of good work elsewhere offsets these:

- A secret can cross the realm boundary
- `connect-src 'none'` removed or weakened in the cold realm
- Build is not reproducible
- A vendored dependency doesn't match upstream
- Test vectors are self-generated
- A failure mode fails **open**
- `Math.random` in a security-relevant path
- A chain added without independent test vectors
- More than one roadmap item in the PR
- Acceptance criteria reinterpreted rather than met

---

## The report

Write `docs/05-development/packets/<roadmap-id>-<slug>.review.md`, alongside the packet you're reviewing, and post its contents as the PR review.

**It must open with the verdict block**, before anything else:

```markdown
# Review: P0.3 — Forbidden-construct lint

**VERDICT: FAIL**

Findings: 3 (0 blocking, 3 advisory — all must be addressed)
Reviewed commit: a1b2c3d
Reviewed by: <agent/human>
Date: YYYY-MM-DD
```

Note the phrasing. Advisories are listed separately for clarity but **counted as must-fix**. A report with zero findings and a FAIL verdict is a contradiction; so is a report with findings and a PASS.

### Required sections

**1. What I verified** — commands run, with real output pasted. Include the environment variations you tried.

**2. What I could not verify** — and why. Every entry here is a finding. If it blocks an acceptance criterion, the verdict is FAIL.

**3. Acceptance criteria** — verbatim from the roadmap, one row each:

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | | ✅ / ❌ | |

**4. Findings** — every one gets an ID, a location, and a required action:

```markdown
### F1 — Build script does not fail on missing vendor directory

**Severity:** advisory
**Location:** scripts/build.js:47
**Observed:** With `vendor/` removed entirely, the build exits 0 and emits an empty bundle.
**Expected:** Non-zero exit with a clear message, per the fail-closed principle.
**Required action:** Add an existence check before verification and a test covering it.
```

Severity is recorded for triage, **not** to excuse anything. Advisory findings must still be fixed.

**5. Verdict rationale** — one paragraph. On a FAIL, state exactly what would make it a PASS.

---

## After a FAIL

1. The **author** fixes the findings. The reviewer does not fix them — that would make the reviewer an author and destroy the independence the process exists for.
2. The author addresses **every** finding: fix it, or argue it should be dismissed and say why.
3. The author pushes and requests re-review.
4. The reviewer issues a **fresh verdict** on the new commit — not an amendment to the old one. Re-review is a new review; findings from the previous round are re-checked, and new ones can appear.

A dismissed finding needs the reviewer to agree. If author and reviewer disagree, the human decides and the reasoning goes in an ADR if it's structural.

---

## Reviewer conduct

**Independence is the whole point.** Don't read the packet's conclusions first and then look for confirmation. Run the checks, form your own view, then compare against what the packet claims. A gap between the two is itself informative.

**Be specific.** "This feels fragile" is not a finding. "With `vendor/` removed, `build.js:47` exits 0 instead of failing" is.

**Don't review style.** Formatting, naming, and structure are not findings unless they violate a documented constraint. Save the mechanism for things that matter.

**Don't scope-creep.** A finding must relate to this roadmap item. "It would be nice if this also did X" belongs in an issue, not a review.

### Documentation is in scope

Per [doc-hygiene.md](doc-hygiene.md), a stale doc is a defect — and a worse one than a missing doc, because it makes readers confident and wrong. Since the docs compile into the app's Help system, a user can lose money acting on an out-of-date instruction.

Check, and raise as findings:

- A doc that now contradicts the code
- A fact restated in two places instead of linked
- A number in prose that no longer matches reality
- A dated doc touched by this change without its review date updated
- Help content missing any of the three depth blocks
- A broken internal link

**Say what you didn't check.** A review that silently omits a whole area is worse than one that admits the gap.

---

## Kickoff prompt

Review and re-review prompts are in **[prompts.md](prompts.md)**.

Use a **different session** from the one that wrote the code. An agent reviewing its own work in the same context isn't reviewing, it's re-reading.
