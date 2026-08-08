# ADR-0024: Warm-shell active reachability monitoring does not change the cold airgap boundary

**Status:** Accepted
**Date:** 2026-08-08

## Context

P0.19 real-device testing on Windows Chrome and Firefox found that unplugging Ethernet could leave Coldbox displaying "online" because `navigator.onLine` remained true. The existing implementation already listened to online/offline/focus/connection changes and polled every five seconds, but every path sampled the same unreliable browser-interface boolean. The user needs a status that changes when real outbound reachability changes, without giving the cold realm any network capability.

## Decision

1. **Active reachability checks live only in the warm shell.** The cold iframe keeps `connect-src 'none'`, the runtime network/provider guards, and the existing private `MessageChannel` boundary.
2. Browser interface signals are **hints/triggers**, not authority. The warm shell probes two already-allowlisted, unrelated public endpoints: Coinbase `/v2/time` and mempool.space `/api/blocks/tip/height`. No new `connect-src` host is added.
3. Probes are static GETs with credentials omitted, no referrer, and no cache. They contain no vault, address, asset, balance, Vault ID/name, or user-entered data.
4. **Any success means online immediately.** Coldbox reports **no external reachability detected** only after consecutive rounds in which every probe fails. Checking, stale, contradictory, timeout, and monitor-error states are online-safe and keep the secret compartment sealed. Stable state continues to refresh while Coldbox is open and on browser network/focus signals.
5. The UI shows **warm reachability** and **cold isolation** as separate facts. It never equates failed probes with a physical airgap. A firewall, captive portal, VPN, virtual adapter, or provider outage can still mislead the warm monitor.
6. A transition from offline-classified to reachable/unknown while a secret-capable vault session is open retains the existing immediate-lock behavior.

## Rationale

A device fingerprint or OS network adapter API is not available portably from a self-contained `file://` page. Active warm-shell requests answer the useful question the browser can actually test: "can this application reach an external allowed service right now?" They improve the operator signal while preserving the much stronger security property: **even if warm is online or the monitor is wrong, cold cannot issue a network request.**

Using existing allowlisted providers avoids adding a new party solely for health checks. Two unrelated providers reduce false offline caused by one outage. Requiring consecutive all-host failures avoids unsealing secrets on a transient request failure.

## Consequences

### Positive
- Cable/Wi-Fi loss can be noticed even when `navigator.onLine` remains stale/optimistic.
- Unknown status fails safe rather than silently enabling secret mode.
- No cold CSP, sandbox, runtime-neutering, or message type is loosened.

### Negative / privacy
- While Coldbox is open online, the two probe operators can observe ordinary connection metadata such as IP, time, TLS/browser metadata, and the generic endpoint path. This is automatic outbound traffic and is disclosed in the UI/security/API docs.
- Probe failure is not proof of physical disconnection. The wording must remain "no external reachability detected."

## Alternatives considered

**Keep `navigator.onLine` only.** Rejected by the P0.19 Windows evidence: it did not follow a real cable transition.

**Put the monitor inside the cold realm.** Rejected. That would directly destroy the load-bearing `connect-src 'none'` guarantee.

**Probe a new Coldbox-controlled health endpoint.** Rejected. It would add a new allowlist host and create the appearance and privacy properties of telemetry when existing public endpoints can answer the reachability question.

**Claim physical-airgap detection.** Rejected as technically untrue from browser JavaScript.

## Reconsider if

A standardized browser API emerges that reliably distinguishes physical interface state and real Internet reachability without adding a broader permission or privacy cost, or if the chosen public endpoints cease to be suitable. Any new host still requires the CSP/API-source review gate.
