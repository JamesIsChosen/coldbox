# Content Security Policy

The CSP is the mechanism that makes secret leakage impossible rather than merely unlikely. This documents both policies, every directive, and the gotchas found during design.

---

## Cold realm — the sealed sandbox

Applied inside the `srcdoc` iframe.

```
default-src  'none';
script-src   'sha256-<inline-script-hash>' 'wasm-unsafe-eval';
style-src    'sha256-<inline-style-hash>';
img-src      data: blob:;
media-src    blob:;
font-src     data:;
connect-src  'none';
form-action  'none';
frame-src    'none';
frame-ancestors 'self';
object-src   'none';
base-uri     'none';
worker-src   blob:;
```

### Directive by directive

| Directive | Why |
|---|---|
| `default-src 'none'` | Deny by default. Every capability is opted into explicitly |
| `script-src 'sha256-…'` | **Hash-pinned, not `'unsafe-inline'`.** An injected script cannot execute even if one somehow got in |
| `'wasm-unsafe-eval'` | Required for Argon2id — see below |
| `connect-src 'none'` | **The load-bearing directive.** Removes `fetch`, `XHR`, `WebSocket`, `EventSource`, `sendBeacon` |
| `img-src data: blob:` | QR codes are generated locally as data URIs. No remote images — an `<img src>` to an attacker host is an exfiltration channel |
| `form-action 'none'` | A form POST would otherwise be a network egress path |
| `base-uri 'none'` | Prevents `<base>` injection redirecting relative URLs |
| `object-src 'none'` | No plugins |
| `worker-src blob:` | Workers for Argon2 and search, created from blob URLs |
| `frame-src 'none'` | The cold realm embeds nothing |

The policy listing includes `frame-ancestors 'self'` for a header-capable deployment. The shipped `file://` artifact delivers CSP through a meta element, and Chromium reports that directive as ignored when it appears there. The embedded policy therefore omits that one non-functional meta directive; the required embedding boundary is still provided by the iframe's sandbox without `allow-same-origin` and the warm shell's `frame-src` policy. A server or packaged deployment may add `frame-ancestors 'self'` as an HTTP header.

### Sandbox attribute

```html
<iframe sandbox="allow-scripts allow-downloads allow-modals" srcdoc="…">
```

**Deliberately absent: `allow-same-origin`.** Without it the iframe gets an **opaque origin** — the parent cannot read its DOM, variables, or keystrokes. This is what protects passphrase entry from network-capable code in the same page.

`allow-downloads` permits saving the vault directly from the cold realm where the platform supports it.

`allow-modals` is the narrowly scoped amendment recorded in [ADR-0035](../05-development/adr/0035-cold-printing-allow-modals.md). It permits the cold-only SeedQR print workflow to request the browser print dialog. It does not grant a same-origin relationship, network capability, navigation, form submission, popups, or any other sandbox permission.

---

## Warm shell — outer document

```
default-src  'none';
script-src   'sha256-<inline-script-hash>' 'wasm-unsafe-eval';
style-src    'sha256-<inline-style-hash>';
img-src      data: blob:;
font-src     data:;
connect-src  https://api.coingecko.com
             https://api.coinbase.com
             https://api.kraken.com
             https://api.coinpaprika.com
             https://api.diadata.org
             https://api.frankfurter.app
             https://mempool.space
             https://blockstream.info
             https://eth.llamarpc.com
             https://rpc.ankr.com
             https://api.mainnet-beta.solana.com
             https://lcd.osmosis.zone
             http://localhost:*
             https://localhost:*
             http://127.0.0.1:*;
frame-src    'self' blob:;
worker-src   blob:;
form-action  'none';
base-uri     'none';
object-src   'none';
```

The allowlist is **pinned at build time** and displayed in full in Reference → Provenance. It is the complete set of hosts the application can ever contact — a claim anyone can check by reading the source.

`localhost` and `127.0.0.1` are present so you can point the app at your own Bitcoin, Electrum, or Ethereum node. This is the privacy-preserving path for balance lookups.

---

## Gotchas

These were found during design. Each would have caused a silent, hard-to-diagnose failure.

### `'wasm-unsafe-eval'` is mandatory

Under a strict CSP, Chrome blocks `WebAssembly.instantiate()` without it. Argon2id is a WASM module. Omitting the directive makes the Argon2 known-answer test fail; the cold realm then exposes the weaker PBKDF2 path as an explicit, labelled fallback rather than silently reducing security. The build and browser checks must still treat a missing directive as a defect.

It permits WASM compilation only. It does **not** re-enable `eval()` or `new Function()`. A build-time lint asserts neither appears in our source.

### CSP re-checks after redirects

CSP validates the URL at each redirect hop. Aggregator hosts that 302 elsewhere — `rest.cosmos.directory` does this — get blocked at the redirect target even though the original host is allowlisted.

**Every endpoint must be a concrete host.** The adapter layer resolves final hosts at build time, not runtime.

### `srcdoc` iframes inherit parent CSP

A `srcdoc` iframe inherits its parent's policy, and multiple policies combine **restrictively** — a request must satisfy all of them.

This works in our favour: the cold realm's `connect-src 'none'` applies on top of the warm shell's allowlist, and the intersection is `'none'`. **The child cannot be loosened by the parent.**

The build preserves this contract in a fixed order: it assembles and hashes the child document, inserts those exact child hashes into the parent `script-src` and `style-src`, serializes the child into the outer script, and then hashes the outer blocks. A child hash in the parent is authorization for that exact inline block only; it does not weaken the child's own `connect-src 'none'` policy. See [build.md](../05-development/build.md) for the assembly steps.

### Injected wallet providers are not constrained by CSP at all

The most important gotcha on this page, because it is an exception to the mechanism the whole document describes.

`provider.request(...)` — the [EIP-1193](../04-reference/standards.md) call every browser wallet extension exposes — **does not make a network request from this page.** It passes a message to the extension, and the *extension* makes the request from its own context under its own policy.

Consequences:

- Nothing appears in `connect-src`. The allowlist above does not describe this path.
- The [CSP canary](#the-csp-canary) does not fire, because no CSP violation occurs.
- `connect-src 'none'` would not prevent it.

So an injected provider is an egress channel that exists **outside** every mechanism on this page. This is a property of how extensions work, not a defect in our policy, and no CSP change can address it.

**Coldbox does not use a wallet provider**, and a proposal to do so was rejected on exactly this basis — [ADR-0020](../05-development/adr/0020-injected-providers-rejected-and-neutered.md).

What can be done is defensive: **provider objects are neutered inside the cold realm alongside the five network primitives** ([P0.21](../05-development/ROADMAP.md)), with presence treated as an isolation failure rather than a capability. Sandboxed `srcdoc` frames are not reliably excluded from extension injection, so this is enforced at runtime instead of assumed.

### Opaque origins may lack `crypto.subtle`

Not strictly a CSP issue, but it arises from the same sandbox. An opaque origin may not qualify as a secure context, so WebCrypto may be undefined. The cold realm defaults to pure-JS implementations and only uses WebCrypto after a known-answer test. See [crypto-choices](crypto-choices.md).

### Hash-pinning and the build

`'sha256-…'` requires the exact hash of the inline script. This is computed during the build and injected into the meta tag — meaning **the build must be deterministic**, or the hash won't match and nothing runs. The reproducible build requirement and CSP hash-pinning reinforce each other.

---

## Runtime neutering

Defense in depth *behind* the CSP, never instead of it.

P0.6's cold bootstrap normalizes its three acceptance probes: the native XHR send and WebSocket construction are attempted under `connect-src 'none'` and then produce a labelled throw, while native `fetch` rejection is reported as a thrown probe result. P0.8 runs its own native `fetch` canary first using `http://localhost:9/cold-csp-canary`, which the inherited warm allowlist permits while the cold policy must deny; the warm realm uses `https://coldbox.invalid/csp-canary`. Once the cold canary settles, P0.8 overwrites `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `navigator.sendBeacon` with functions that throw a labelled error and raise a visible alarm. The blockers are installed on both the exposed object and the prototype that originally owns the WebIDL member, then made non-configurable and non-writable. Any failed canary or failed installation enters full lockdown before the warm shell accepts the private-channel readiness response.

**P0.21 extends the same mechanism to injected wallet providers**, because CSP cannot touch them at all (see the gotcha above). `window.ethereum` and the `eip6963:announceProvider` event are covered alongside the five primitives, on the same non-configurable, non-writable basis.

The difference is what a hit means: a network-primitive call inside the cold realm indicates the **CSP has failed**, whereas an announcement indicates an extension is **injecting into a sandboxed opaque-origin frame** — an isolation failure rather than a policy failure. Both enter full lockdown; the alarm text distinguishes them, because they call for different responses from the user.

Sandboxed `srcdoc` frames are not reliably excluded from extension injection. That is a browser implementation detail rather than a guarantee, which is exactly why this is enforced at runtime instead of assumed — and why this particular guard matters more than the other five rather than less, since the others sit behind a CSP that already blocks them.

If any of these ever fires, the CSP has failed and something is badly wrong — the alarm exists to make that loud rather than silent.

---

## Warm-shell reachability probes

The warm shell is deliberately network-capable and continuously distinguishes **confirmed external reachability** from **no external reachability detected**. This does **not** loosen the cold policy.

The monitor sends small `GET` requests using `mode: 'no-cors'`, `credentials: 'omit'`, `cache: 'no-store'`, and `referrerPolicy: 'no-referrer'`, to two already-allowlisted hosts operated by different parties. It consumes no response body; an opaque fulfilled response is sufficient for reachability:

- `https://api.coinbase.com/v2/time`
- `https://mempool.space/api/blocks/tip/height`

No vault name, Vault ID, address, asset, balance, user input, or other Coldbox state is included. Any successful probe establishes online immediately; Coldbox reports no reachability only after two consecutive all-endpoint failures. The cadence is fixed independently of vault/user activity so timing does not become a vault-state side channel. Unknown/stale/error states remain online-safe. The ordinary IP address, time, TLS/browser metadata, and generic requested path can still be logged by those operators; [api-sources.md](../04-reference/api-sources.md) discloses this.

These probes are **not telemetry**: they are not sent to a Coldbox-controlled collector and carry no application state. They are also not a physical-cable detector. A firewall that blocks both hosts can produce a false offline-looking result, which is why the UI never calls probe failure proof of an airgap and why the secret guarantee continues to come from the cold CSP/runtime boundary. Decision: [ADR-0024](../05-development/adr/0024-warm-reachability-monitor.md).

---

## The CSP canary

The app deliberately attempts a request the policy must reject. The warm shell attempts `https://coldbox.invalid/csp-canary`. The cold realm attempts `http://localhost:9/cold-csp-canary`; `http://localhost:*` is permitted by the warm policy, so a matching cold `connect-src` violation cannot be supplied solely by the inherited warm policy.

The result is accepted only when the browser reports an exact `connect-src` violation whose `blockedURI` equals the realm's expected canary URL. A generic rejected request, a near-match URL, or another CSP directive is not sufficient.

- **Exact `connect-src` violation** — CSP is active. Normal operation.
- **Not rejected** — CSP is not active. **Full lockdown**: refuse to open any vault, display a red banner, explain what happened.

This catches the scenario where a browser doesn't support meta-tag CSP, or a modified build stripped the policy. Without the canary, that failure would be invisible.

---

## Testing

Every release must verify:

1. Both policies are present and parsed (no console warnings).
2. The canary fires correctly in both realms.
3. `fetch` from within the cold realm throws.
4. Argon2 WASM loads — confirming `'wasm-unsafe-eval'` is present and the PBKDF2 fallback is *not* silently active.
5. No allowlisted endpoint redirects to a non-allowlisted host.
6. The warm shell cannot read into the cold realm iframe.
7. The build's script hash matches the meta tag.
8. Warm-shell reachability probes transition online/offline classifications without changing the cold realm's `connect-src 'none'`; unknown/probe-error states remain online-safe.

Manual, across the full browser matrix, because `file://` CSP behaviour varies. See [testing](../05-development/testing.md).

---

## Changing the policy

Treat any CSP change as security-critical.

**Adding a `connect-src` host** requires: justification in the PR, confirmation it doesn't redirect off-allowlist, an entry in [api-sources](../04-reference/api-sources.md), and a note on what it learns about the user.

**Loosening the cold realm's policy** requires an ADR and will be resisted. `connect-src 'none'` is not negotiable — it's the reason the project's central claim is true.
