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
<iframe sandbox="allow-scripts allow-downloads" srcdoc="…">
```

**Deliberately absent: `allow-same-origin`.** Without it the iframe gets an **opaque origin** — the parent cannot read its DOM, variables, or keystrokes. This is what protects passphrase entry from network-capable code in the same page.

`allow-downloads` permits saving the vault directly from the cold realm where the platform supports it.

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

Under a strict CSP, Chrome blocks `WebAssembly.instantiate()` without it. Argon2id is a WASM module. Omitting the directive means Argon2 silently fails to load and **every vault falls back to the weaker PBKDF2 path** — with no error, just quietly reduced security.

It permits WASM compilation only. It does **not** re-enable `eval()` or `new Function()`. A build-time lint asserts neither appears in our source.

### CSP re-checks after redirects

CSP validates the URL at each redirect hop. Aggregator hosts that 302 elsewhere — `rest.cosmos.directory` does this — get blocked at the redirect target even though the original host is allowlisted.

**Every endpoint must be a concrete host.** The adapter layer resolves final hosts at build time, not runtime.

### `srcdoc` iframes inherit parent CSP

A `srcdoc` iframe inherits its parent's policy, and multiple policies combine **restrictively** — a request must satisfy all of them.

This works in our favour: the cold realm's `connect-src 'none'` applies on top of the warm shell's allowlist, and the intersection is `'none'`. **The child cannot be loosened by the parent.**

The build preserves this contract in a fixed order: it assembles and hashes the child document, inserts those exact child hashes into the parent `script-src` and `style-src`, serializes the child into the outer script, and then hashes the outer blocks. A child hash in the parent is authorization for that exact inline block only; it does not weaken the child's own `connect-src 'none'` policy. See [build.md](../05-development/build.md) for the assembly steps.

### Opaque origins may lack `crypto.subtle`

Not strictly a CSP issue, but it arises from the same sandbox. An opaque origin may not qualify as a secure context, so WebCrypto may be undefined. The cold realm defaults to pure-JS implementations and only uses WebCrypto after a known-answer test. See [crypto-choices](crypto-choices.md).

### Hash-pinning and the build

`'sha256-…'` requires the exact hash of the inline script. This is computed during the build and injected into the meta tag — meaning **the build must be deterministic**, or the hash won't match and nothing runs. The reproducible build requirement and CSP hash-pinning reinforce each other.

---

## Runtime neutering

Defense in depth *behind* the CSP, never instead of it.

P0.6's cold bootstrap normalizes its three acceptance probes: the native XHR send and WebSocket construction are attempted under `connect-src 'none'` and then produce a labelled throw, while native `fetch` rejection is reported as a thrown probe result. P0.8 runs its own native `fetch` canary first, then adds the broader runtime guard for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `navigator.sendBeacon`, with visible alarms and frozen replacement properties. Any failed canary or failed installation enters full lockdown before the warm shell accepts the private-channel readiness response.

If any of these ever fires, the CSP has failed and something is badly wrong — the alarm exists to make that loud rather than silent.

---

## The CSP canary

The app deliberately attempts a request the policy must reject.

- **Rejected** — CSP is active. Normal operation.
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

Manual, across the full browser matrix, because `file://` CSP behaviour varies. See [testing](../05-development/testing.md).

---

## Changing the policy

Treat any CSP change as security-critical.

**Adding a `connect-src` host** requires: justification in the PR, confirmation it doesn't redirect off-allowlist, an entry in [api-sources](../04-reference/api-sources.md), and a note on what it learns about the user.

**Loosening the cold realm's policy** requires an ADR and will be resisted. `connect-src 'none'` is not negotiable — it's the reason the project's central claim is true.
