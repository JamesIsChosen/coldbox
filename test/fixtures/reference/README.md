# P2.4 reference combiner fixtures

These files are test-only copies of the exact pinned upstream sources recorded
in [ADR-0038](../../../docs/05-development/adr/0038-shamir39-and-raw-sss-cold-only.md).
They are not shipped, loaded by the build, or used at runtime. The tests use
their real combiners to check that Coldbox-generated zero-coefficient shares
remain readable without claiming byte-for-byte generator-distribution
compatibility.

| Fixture | Pinned commit | Git blob | Exact LF-byte SHA-256 |
|---|---|---|---|
| `ian-coleman-shamir39.js` | `30d17d8921200afd1c6365140ee1defead11386a` | `4b0aae2cc63ac588326037e1718f7d888c21d269` | `a1f822fe010d5ddbf9b33bda0eaf5152388e8700d5e35893fb8f85116ed4233c` |
| `secrets.js` | `14a4b682a28242b1dbe5506674b5d5f476b78dbf` | `2eb1360d61d99f5cee46ebb2aaf1f938b065069c` | `6c90ec0b0d88a8c90d08f8657448c72db6592fcec5096306c70c815e2404eee9` |

The upstream licenses and attribution headers remain intact.
