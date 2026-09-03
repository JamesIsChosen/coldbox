# ADR-0007: Headless browser harness as a dev dependency

**Status:** Accepted
**Date:** 2026-08-03

---

## Context

Nine of nineteen Phase 0 items have acceptance criteria that only a browser can satisfy. Examples, verbatim from the roadmap:

- *"altering one byte of the inline script post-build causes the browser to refuse to execute it"* (P0.4)
- *"iframe instantiates; `fetch`, `XHR`, and `WebSocket` inside it throw; warm shell cannot read its DOM"* (P0.6)
- *"loads from `file://`… no console errors; responsive from 360 px to desktop"* (P0.5)

This was discovered the hard way. An agent implemented P0.4, could not verify either criterion, and correctly marked it `[~]` rather than claiming completion. That was the right behaviour — and it exposed a planning flaw, not an implementation one.

The consequence is structural: [review-protocol.md](../review-protocol.md) says an unverifiable criterion is a FAIL, and [batch-run.md](../batch-run.md) stops a run at an item it cannot complete. So without browser verification, **nearly half of Phase 0 stalls indefinitely at `[~]`** and no campaign can progress past P0.4.

The project's most distinctive claim — that a secret cannot cross the realm boundary — is *entirely* browser-observable. Sandbox attributes, CSP enforcement, and cross-origin isolation exist only in a live browser. Asserting that guarantee while having no automated way to observe it holding would be exactly the kind of unverified confidence this project is built to avoid.

## Decision

Adopt **Playwright as a development dependency**, driving headless Chromium and Firefox against `build/coldbox.html` loaded over `file://`.

The harness exposes reusable assertions consumed by later items rather than one-off scripts:

```
expectNoConsoleErrors()          expectCspViolation(directive)
expectNoCspViolations()          expectScriptRejected()
expectNetworkPrimitiveBlocked()   expectParentCannotReadFrame()
expectElementVisible(sel)        atViewport(w, h)
```

Introduced as **P0.3a**, depending only on P0.1, so it lands before the items that need it.

## Consequences

### Positive

- Eight of nine browser-blocked items become agent-verifiable, unblocking campaigns.
- **The realm boundary gets automated tests.** `connect-src 'none'` actually blocking `fetch`, and the parent actually being unable to read the sandbox, become assertions that run on every commit rather than claims in a document.
- CSP enforcement is verified against a real engine rather than by reading the policy string.
- Regression protection: a future change that quietly breaks the sandbox fails CI.
- Cross-engine coverage catches Chromium-only assumptions early.

### Negative

- **~300 MB of browser binaries**, in a project whose identity is minimal dependencies. This is the real cost and it deserves to sting.
- Playwright is a large dependency with a substantial tree of its own — a meaningful review surface for a security-focused project.
- CI gets slower and more complex.
- Contributors must download browsers on first setup.

### Why the negatives are acceptable

**It never ships.** Playwright is `devDependencies` only and contributes **zero bytes** to `build/coldbox.html` — an explicit acceptance criterion of P0.3a. The "no runtime dependencies" rule is untouched.

**The threat model differs from runtime code.** A compromised dev dependency could alter the build — which is precisely why reproducible builds and CI hash comparison exist ([verification.md](../../02-security/verification.md)). A malicious Playwright would have to produce a build whose hash still matches an independent rebuild, which the existing controls already detect.

**The alternative is worse.** Without it, a human manually verifies eight items' worth of browser behaviour before any campaign advances — and manual verification that tedious gets skipped, which converts "unverified" into "assumed fine." An automated check that runs every time beats a manual one performed once and then trusted forever.

## What it does *not* solve

**Playwright cannot test iOS Safari.** WebKit-on-Linux is not Safari-on-iOS, and the differences are exactly where this project is most fragile: `file://` secure-context status, opaque-origin `crypto.subtle` availability, blob download restrictions, and sandbox behaviour.

So **P0.19 remains `👤 human-required`** and still gates Phase 1. The harness raises the floor; it does not replace real-device testing, and any packet claiming iOS verification from harness results should be failed on sight.

## Alternatives considered

**A human browser checklist per item.** No new dependency, and honest about needing a person. Rejected: it puts a manual gate in front of eight items, blocks every unattended run, and relies on someone performing a tedious check repeatedly and accurately.

**jsdom or happy-dom.** Far lighter. Rejected outright — they do not implement CSP, iframe sandboxing, or cross-origin isolation. They would produce tests that *pass* while telling us nothing about the guarantee, which is worse than no tests because it manufactures false confidence.

**Puppeteer.** Chromium only. Rejected: single-engine coverage would miss exactly the cross-browser divergence that makes `file://` behaviour risky.

**Selenium / WebDriver.** Heavier, slower, worse `file://` ergonomics.

**Write our own via the Chrome DevTools Protocol.** Avoids the dependency and is genuinely feasible for a narrow subset. Rejected: we would be maintaining browser-automation plumbing instead of the actual product, and our version would be less correct than a maintained one.

## What would change our mind

- If Playwright's `file://` support proved unreliable enough to produce flaky results, we would revert to a human checklist rather than ship tests we can't trust.
- If a lighter tool gained real CSP and sandbox enforcement, it would be worth revisiting on dependency-size grounds.
- If browser binaries in CI became a practical bottleneck, running the harness only on PRs touching `src/` would be a reasonable compromise.

## References

- [ROADMAP P0.3a](../ROADMAP.md)
- [architecture.md](../../01-spec/architecture.md) — the boundary this harness exists to verify
- [ADR-0001](0001-two-realm-architecture.md) — the claim being tested
- [csp-policy.md](../../02-security/csp-policy.md)
