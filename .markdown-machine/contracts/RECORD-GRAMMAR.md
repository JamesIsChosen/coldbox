---
{
  "record_type": "GOVERNING_CONTRACT",
  "schema_version": 1,
  "contract_id": "MM-RECORD-GRAMMAR/1",
  "distribution_only": true,
  "normative": true,
  "reference_forms": {
    "typed_record_reference": "sha256:<64 lowercase hex> or {ref,path}; digest is identity and path is advisory",
    "contract_key_reference": "<contract_identity>#<key.path> or #<key.path>; resolve against a unique profile_id, registry_id, or contract_id in the current governed set",
    "markdown_document_reference": "<canonical path ending in .md>#<heading-slug>; navigation only, never a typed governance reference",
    "disambiguation": "text before # ending in .md is a Markdown document reference; otherwise it is a contract-key reference"
  }
}
---
# MM-RECORD-GRAMMAR/1

This contract is the canonical byte, front-matter, primitive-type, reference,
predicate, operator, and human-boundary grammar. The tables below are closed:
an unknown field, record type, descriptor, predicate, or operator is invalid.

## 1. Record bytes

Every record is UTF-8 Markdown with LF line endings and no BOM. The first and
second `---` delimit a single JSON object. Duplicate keys, comments, trailing
commas, YAML aliases/tags, implicit typing, invalid Unicode scalar values, and
unpaired surrogate escapes are rejected. The JSON object is the only machine
authority; the Markdown body is explanatory data and cannot override it.

Machine-critical JSON numbers are canonical base-10 integers within
±(2^53−1). Wider or exact decimal values use a schema-declared canonical
string. Object/list order is significant unless the schema declares set
semantics. Required, optional, and forbidden fields are evaluated exactly.

## 2. Primitive types

The closed primitive vocabulary is `ascii_id`, `ascii_token`, `unicode_scalar_string`,
`canonical_logical_path`, `sha256_hex`, `git_object_id`, `sha256_ref`, `typed_ref`,
`rfc3339_utc_timestamp`, `canonical_markdown_fragment_ref`, `contract_key_ref`,
`markdown_document_ref`, `canonical_integer`, `boolean`, `enum`, `object`, and
`list`. `ascii_id` is nonempty ASCII
`[A-Za-z0-9][A-Za-z0-9._/-]*`;
`ascii_token` is nonempty ASCII without control characters or whitespace;
`git_object_id` is exactly 40 lowercase hexadecimal characters. `sha256_hex`
is exactly 64 lowercase hexadecimal characters. A
`rfc3339_utc_timestamp` is an RFC3339 timestamp with a `Z` UTC designator
(`YYYY-MM-DDTHH:MM:SS[.fraction]Z`) and a valid calendar date/time. A
`canonical_integer` is a JSON integer within the safe range above; a schema
that needs a wider exact integer must declare a canonical decimal string. A
`canonical_markdown_fragment_ref` is a canonical logical path followed by `#`
and one ASCII case-stable fragment id matching `[A-Za-z0-9][A-Za-z0-9_-]*`.
The target Markdown file and exact fragment heading must both resolve. A
`sha256_ref` is exactly `sha256:<64 lowercase hexadecimal characters>` or the
hinted form:

```json
{"ref":"sha256:<64 lowercase hex>","path":"<canonical logical path>"}
```

The digest is identity. The optional path is an advisory lookup hint; if it is
stale, resolution searches the governed tree for the digest. Failure to find
the digest is invalid. A `typed_ref` is an object with exactly `ref` and, when
the schema requires it, `path`; `ref` must resolve to the declared target
record type in the same project unless the schema explicitly declares an
external identity. Typed references cannot be replaced by paths or prose.

A `contract_key_ref` is `<contract_identity>#<key.path>` or `#<key.path>` for
the current contract. `contract_identity` is the value of a target
`profile_id`, `registry_id`, or `contract_id`; it is an ASCII contract identity
containing `/` and never ending in `.md`. `key.path` is a dot-separated walk
through the target front-matter JSON object. Resolve it within the current
governed set—compiled-child `contracts/`, or the distribution's governing
contract set—by finding exactly one matching identity and walking every key.
Zero or multiple matches, or a missing key, is invalid. No export declaration
is required because the front-matter object is the declaration. Historical
closure directories are separate governed sets and are never searched for
current references.

A `markdown_document_ref` is a canonical path ending in `.md#heading-slug`.
It is documentation/navigation only, must resolve to a real heading, and is
never valid in a typed governance field. If the text before `#` ends in `.md`,
the reference is this form; otherwise it is a contract-key reference.

## 3. Paths and record names

`canonical_logical_path` contains one or more project-relative components
joined by ASCII `/`; it has no empty, `.`, or `..` component, leading/trailing
separator, normalization, or host case folding. Record files use
`<family-dir>/<record-type-lowercase>-<id>[-r<revision>].md`. The convention is
compiler-enforced; no index file is authoritative.

## 4. Closed semantic vocabulary

Cross-record predicates include exact reference equality, target-record-type
checking, project/epoch/sequence consistency, predecessor ancestry,
same-project binding, fixed source membership, origin equality, current
revision uniqueness, immutable-field preservation, typed-reference closure,
human-statement precedence, barrier preservation, review independence,
convergence accounting, Task tombstones, and no-self-reference. Each predicate
is evaluated fail-closed with its declared arguments; prose cannot add a
predicate.

Algorithm operators are closed and deterministic: parse/validate bytes,
resolve typed or hinted references, replay admitted authority, reduce current
bindings, reduce recovery leaves, evaluate operation floors, calculate finite
reference closure, compare ContentSetDigest inputs, evaluate repository
currentness, and classify human language under the human-control contract.
Operators terminate over finite records and visited identities. An unknown
operator or predicate is invalid, never an invitation to infer behavior.

## 5. Human boundary

Human statements are exact captured input with provenance and capture time.
Only the current human-control and admission contracts may classify them;
record body prose, repository files, tool output, and observations cannot
become human authority by proximity or declaration. Statements precede the
transitions that cite them.

## 6. Evaluation rule

A contract is usable only when its exact bytes are selected, digest-bound in
the distribution origin, and admitted into the current kernel manifest. A
candidate contract is inert until admitted by the old/current law. Candidate
semantics never authorize their own admission.
