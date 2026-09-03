# Using QR Studio

QR is a transfer format, not a correctness check. Read the complete destination address from an independent source before sharing or paying. A SeedQR is different: it contains the whole seed in plaintext and must stay on an offline machine.

---

## Public receiving addresses

::: plain
Use QR Studio for a receiving address when typing the full address would be slow or error-prone. Choose Bitcoin or Ethereum, enter the complete address, and generate a fresh code. The optional payment URI can carry an amount; Bitcoin URIs can also carry a label. A QR code does not prove that the address belongs to the intended recipient.
:::
::: working
Public address QR generation stays in the warm shell because an address and its payment URI are public values. The shell rejects seed-shaped input, generates BIP-21 for Bitcoin or EIP-681 for Ethereum when requested, converts Ethereum decimal ETH amounts to integer wei, and offers SVG/PNG export. Compare the whole address independently and test a small payment before sending significant value.
:::
::: technical
The payload is encoded locally with the pinned `qrcode-generator` release. Bitcoin payloads use `bitcoin:<address>` with optional `amount` and `label` query parameters; Ethereum payloads use `ethereum:<address>` with optional integer-wei `value`. QR generation does not add ownership, checksum, or device-authenticity evidence; those claims belong to address validation and verification workflows.
:::

## SeedQR and Compact SeedQR

::: plain
Open SeedQR Studio inside the sealed workspace, not the warm QR page. After
generating or validating a phrase in Seed Forge, release it and confirm the
focused fingerprint in SeedQR Studio. Choose a format and explicitly
acknowledge that the result is a plaintext seed. Keep the display, downloads,
printer, camera, and paper offline.
:::
::: working
Standard SeedQR writes each English BIP-39 word as its zero-padded four-digit word-list index. Compact SeedQR stores the raw BIP-39 entropy bytes in a smaller byte-mode code; it is not human-readable and is the SeedQR option for non-English BIP-39 phrases. Both formats are produced inside the cold iframe, and locking the cold session clears the phrase and the generated code from the working document.
:::
::: technical
Standard SeedQR is English-only because the format carries word indices without a language identifier. Compact payloads use byte mode over the original 128/160/192/224/256-bit BIP-39 entropy, not the later 512-bit PBKDF2 seed, and can be used for non-English BIP-39 phrases. SVG and PNG exports are generated inside the sealed document. Printable A4/Letter and wallet-sized layouts include a warning that printer queues, printer memory, photographs, and discarded drafts can retain the secret.
:::

## Before you print or scan

- A SeedQR is equivalent to writing the seed on paper: anyone who sees a clear copy can recover the wallet.
- Do not put a SeedQR in a networked camera, cloud photo library, chat application, or online printer queue.
- Verify a printed copy from the cold display before storing it, then clear the session when the workflow is complete.

See [Going airgapped](going-airgapped.md) for the limits of browser isolation and the **SeedQR** entry in the glossary for the format terms.
