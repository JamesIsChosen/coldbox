# Review: UI.5 — Shared shell chrome

**VERDICT: PASS**

Findings: 0
Reviewed commit: c4bd799c904c329ead1c33a876508934953a1106
Reviewed by: ui5_protocol_review (independent sub-agent)
Review mode: CONNECTED (CI-witnessed, run 31950846360)
Date: 2026-08-16

## 1. What I verified

- Read the complete PR diff against `main`, the UI.5 roadmap criteria, the
  review protocol, the packet, and the exact-head CI workflow.
- Confirmed commit `c4bd799c904c329ead1c33a876508934953a1106` changes only
  `docs/05-development/packets/ui.5-shared-shell-chrome.md` relative to
  `cc0d6f25c097b562f36f825540bdb4dfedea901b`; no product, test, build, or
  workflow input differs. The packet's `cc0d6f...` / `31950206414` entry is a
  historical product/audit record. The current review handoff, as required by
  the protocol, supplied the current tip and exact-head run separately. Requiring
  the packet commit to contain its own SHA would be self-referential and is not
  a requirement of `review-protocol.md`.
- `npm ci`: completed, 0 vulnerabilities.
- `npm run verify-vendor`: all ten vendored packages matched local manifests
  and independently downloaded upstream releases.
- `npm run lint`: passed forbidden constructs, JavaScript syntax, and LF source
  line endings.
- `npm test -- --test-reporter=tap`: 425 passed, 0 failed, 0 skipped. This
  included clean-checkout, locale/timezone determinism, CSP hash, opaque cold
  realm, UI.4a isolation, and all eight UI.5 assertions.
- Two local `npm run build` executions both produced
  `68809b12ebd8dbeabbb6c0cf749153b1acf2d76ace648c48b707279145e2b3cc`.
- A deliberate in-memory mutation of every warm `min-height: 44px` declaration
  to `43px` exited non-zero, confirming the touch-target guard rejects the
  regression without changing repository files.
- Audited `.github/workflows/ci.yml` at the reviewed commit. Exact-head run
  `31950846360` checked out
  `c4bd799c904c329ead1c33a876508934953a1106` and ran: vendor verification,
  lint, documentation hygiene, unit/vector tests with a mandatory zero-skip
  gate, two builds on Ubuntu and Windows, cross-OS hash comparison, the
  Chromium/Firefox `file://` browser harness, and the approved-reference scan.
  The run passed with 425 tests and 0 skips on both operating systems; both
  builds and both operating systems matched the hash above; Chromium and
  Firefox passed the UI.5 route, focus, responsive, disabled-control, More-sheet,
  44px, boundary, and CSP assertions; the exact reference scan reported zero
  findings and zero skipped candidates. Release attestation was intentionally
  skipped because the event was a pull request and is outside UI.5.
- Confirmed the cold CSP still contains `connect-src 'none'`, the iframe sandbox
  remains `allow-scripts allow-downloads allow-modals` without
  `allow-same-origin`, and CI's built-artifact CSP hash assertions pass.

## 2. What I could not verify

None within UI.5's browser-verifiable acceptance scope. Physical iOS, Android,
and other device testing belongs to the separate P0.19/UI.11 gates and is not an
acceptance requirement for UI.5.

## 3. Acceptance criteria

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | The rail reaches every built surface in both realms, including sealed tools, without scrolling the document. | ✅ | Complete rail inventories were read in both source documents; built routes are active, future routes are disabled, and Chromium/Firefox exercised the warm routes, sealed boundary, desktop rails, and every active cold More route. The rails have their own bounded scroll containers rather than requiring document scroll. |
| 2 | Groups render their unbuilt items disabled and labelled with roadmap ID and phase, and a disabled item is not focusable as a control and is announced as unavailable. | ✅ | Unavailable desktop entries are native disabled buttons with `disabled`, `aria-disabled`, roadmap and phase metadata; unavailable More entries are non-interactive spans with the same metadata. Static tests and both browser engines verified the approved inventories and disabled states. |
| 3 | The realm strip changes unmistakably at the boundary and its stripes do not animate under any state, including `prefers-reduced-motion` being absent. | ✅ | Warm and cold strips use distinct realm classes and text, fixed 45-degree 14px repeating bands, and no animation declaration. Static tests and the browser boundary assertions passed. |
| 4 | The rail collapses to a five-slot bottom bar plus a More sheet below the phone breakpoint. | ✅ | Both realm styles switch at the phone breakpoint; both documents contain five-slot mobile navigation and complete More inventories. Chromium and Firefox verified the 360px presentation and More behavior. |
| 5 | 44px minimum touch targets hold. | ✅ | Numeric source floors cover desktop rails, mobile bars, More links and close controls; rendered geometry assertions passed in Chromium and Firefox. The deliberate 43px mutation failed non-zero. |
| 6 | Both realms stay hash-pinned into the parent CSP exactly as before. | ✅ | Build tests recomputed every inline script/style hash; cold remains opaque with `connect-src 'none'`; two local builds and the Ubuntu/Windows CI matrix produced the same artifact hash. |

## 4. Findings

None.

## 5. Verdict rationale

Every UI.5 acceptance criterion is implemented and independently witnessed at
the reviewed commit. The current tip is a documentation-only packet record over
the already verified product tree, and exact-head CI reran that unchanged tree
successfully. The packet SHA issue is resolved by the protocol's explicit
division of responsibility: committed packet evidence records completed product
runs, while the review handoff carries the current full tip SHA and exact-head CI
run. I found no product, test, documentation, or security-boundary defect.
