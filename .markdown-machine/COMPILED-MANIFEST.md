---
{
  "record_type": "COMPILED_MANIFEST",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "compiled_manifest_id": "coldbox-markdown-machine-v0.6.1",
  "distribution_origin_ref": {
    "ref": "sha256:daa5dfbded1c23c705fb16aab45b8627d6627534324af55f3c083508cbf9aa8b",
    "path": ".markdown-machine/ORIGIN.md"
  },
  "runtime_export": {
    "path": ".markdown-machine/RUNTIME.md",
    "source_path": "project-runtime/RUNTIME.md",
    "source_digest": "d9828a1db911bdb48dca7ebdfe3dd6ad72dc45355fee7180137b84a9054b322a"
  },
  "contract_exports": [
    {
      "path": ".markdown-machine/contracts/AUTHORITY-EVALUATOR.md",
      "contract_id": "MM-AUTHORITY/1",
      "source_path": "project-runtime/AUTHORITY-EVALUATOR.md",
      "source_digest": "5567d443ca71dfa2d60df941ab72a57c3273864d24a4a6917dd91b9222dd3b04"
    },
    {
      "path": ".markdown-machine/contracts/GENESIS-ADMISSION.md",
      "contract_id": "DIRECT_HUMAN_GENESIS_ADMISSION/v3",
      "source_path": "bootstrap/GENESIS-ADMISSION.md",
      "source_digest": "1bc787fdcd524032145576621af7cb635034ccaacb1516a0d3b94538d0e83d5e"
    },
    {
      "path": ".markdown-machine/contracts/GOVERNING-RECORD-CONTRACTS.md",
      "contract_id": "MM-GOVERNING-RECORDS/1",
      "source_path": "project-runtime/GOVERNING-RECORD-CONTRACTS.md",
      "source_digest": "cc4122c8c06157a7f2346c5166a9c3267633368ac1f5a5ce400b266841972118"
    },
    {
      "path": ".markdown-machine/contracts/HUMAN-CONTROL.md",
      "contract_id": "MM-HUMAN-CONTROL/2",
      "source_path": "project-runtime/HUMAN-CONTROL.md",
      "source_digest": "ad9dd45d856cbfa07442c7a32986af29332863bce975c2ad839ca6732d56cdf1"
    },
    {
      "path": ".markdown-machine/contracts/RECORD-GRAMMAR.md",
      "contract_id": "MM-RECORD-GRAMMAR/1",
      "source_path": "project-runtime/RECORD-GRAMMAR.md",
      "source_digest": "71b4666f81f973472e98ddac4e17501933eeb2db8447a3d3372fa1030f7e4040"
    },
    {
      "path": ".markdown-machine/contracts/RECOVERY-CONTRACTS.md",
      "contract_id": "MM-RECOVERY/1",
      "source_path": "project-runtime/RECOVERY-CONTRACTS.md",
      "source_digest": "5945ac74c62555e2e52f51e33f66c5b176ba96a8225ebaececa2a1df51e5bf79"
    }
  ],
  "selected_capability_exports": [
    {
      "capability_id": "software-product",
      "path": ".markdown-machine/capabilities/software-product.md",
      "source_path": "project-runtime/capabilities/software-product.md",
      "source_digest": "26eaf260c6a79d8067e3b9d7b1b8520fce7db48c02125114bdea5ff19e529ab6"
    }
  ],
  "child_layout": [
    {
      "path": ".markdown-machine/COMPILED-MANIFEST.md",
      "role": "compiled_manifest",
      "required": true
    },
    {
      "path": ".markdown-machine/HANDOFF.md",
      "role": "recovery_projection",
      "required": true
    },
    {
      "path": ".markdown-machine/ORIGIN.md",
      "role": "distribution_origin",
      "required": true
    },
    {
      "path": ".markdown-machine/REPOSITORY.md",
      "role": "repository_binding",
      "required": true
    },
    {
      "path": ".markdown-machine/RUNTIME.md",
      "role": "runtime_export",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/authority-transition-capability-bind.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/authority-transition-intent-accept.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/authority-transition-lifecycle-publish.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/authority-transition-task-authorize.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/capability-binding-software-product.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/external-subject-coldbox-pre-mm.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/human-statement-goal-presentation-rebuild.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/human-statement-intent-confirmation.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/human-statement-mm-adoption-approval.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/kernel-manifest-v0.6.1.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/operation-contract-discovery.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/operation-contract-product-freeze.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/authority/project-genesis-coldbox.md",
      "role": "authority_record",
      "required": true
    },
    {
      "path": ".markdown-machine/capabilities/software-product.md",
      "role": "capability_runtime_export",
      "required": true
    },
    {
      "path": ".markdown-machine/contracts/AUTHORITY-EVALUATOR.md",
      "role": "governing_contract_export",
      "required": true
    },
    {
      "path": ".markdown-machine/contracts/GENESIS-ADMISSION.md",
      "role": "governing_contract_export",
      "required": true
    },
    {
      "path": ".markdown-machine/contracts/GOVERNING-RECORD-CONTRACTS.md",
      "role": "governing_contract_export",
      "required": true
    },
    {
      "path": ".markdown-machine/contracts/HUMAN-CONTROL.md",
      "role": "governing_contract_export",
      "required": true
    },
    {
      "path": ".markdown-machine/contracts/RECORD-GRAMMAR.md",
      "role": "governing_contract_export",
      "required": true
    },
    {
      "path": ".markdown-machine/contracts/RECOVERY-CONTRACTS.md",
      "role": "governing_contract_export",
      "required": true
    },
    {
      "path": ".markdown-machine/convergence/convergence-continuity-bootstrap.md",
      "role": "convergence_record",
      "required": true
    },
    {
      "path": ".markdown-machine/convergence/convergence-policy-bootstrap-to-product-freeze.md",
      "role": "convergence_record",
      "required": true
    },
    {
      "path": ".markdown-machine/convergence/convergence-root-coldbox-presentation-rebuild.md",
      "role": "convergence_record",
      "required": true
    },
    {
      "path": ".markdown-machine/convergence/convergence-tranche-bootstrap.md",
      "role": "convergence_record",
      "required": true
    },
    {
      "path": ".markdown-machine/external-state/repository-sync-observation-bootstrap.md",
      "role": "external_state_record",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/.github/ISSUE_TEMPLATE/bug_report.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/.github/ISSUE_TEMPLATE/chain_request.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/.github/pull_request_template.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/AGENTS.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/CHANGELOG.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/CLAUDE.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/CONTRIBUTING.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/HISTORY-MANIFEST.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/SECURITY.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/00-overview/faq.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/00-overview/glossary.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/00-overview/quick-start.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/00-overview/what-is-this.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/SPEC.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/address-verification.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/architecture.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/chain-registry.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/data-model.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/design-system.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/ui-parity.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/v1-security-wallet-contract.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/01-spec/vault-format.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/02-security/audit-notes.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/02-security/crypto-choices.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/02-security/csp-policy.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/02-security/threat-model.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/02-security/verification.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/backup-codex32.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/backup-health.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/backup-seed-xor.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/backup-shamir.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/backup-slip39.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/first-wallet.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/going-airgapped.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/inheritance-planning.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/multisig-quorum.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/portfolio-setup.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/recover-a-seed.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/use-qr-studio.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/verify-a-hardware-wallet.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/03-guides/verify-an-address.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/api-sources.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/derivation-paths.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/entropy-and-strength.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/hardware-wallet-matrix.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/standards.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/supported-chains.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/04-reference/us-tax-reporting.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/01-spec/ui-parity.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/HANDOFF-2026-08-04-pr-cleanup.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/ROADMAP.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0001-two-realm-architecture.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0002-separate-vault-file.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0003-argon2id-parameters.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0004-median-not-mean-prices.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0005-no-duress-compartment.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0006-companion-not-replacement.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0007-headless-browser-harness.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0008-csp-blocked-network-signals.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0009-comic-visual-language.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0010-ios-local-html-execution.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0011-wasm-secp256k1-for-recovery.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0012-recovery-checkpoint.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0013-save-integrity-in-warm-shell.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0014-keyfile-unlock-implementation-limits.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0015-provenance-build-date-and-self-hash.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0016-help-content-compiler-and-search.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0017-ci-workflow-structure.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0018-agplv3-license.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0019-no-transaction-workbench.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0020-injected-providers-rejected-and-neutered.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0021-clipboard-address-verification.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0022-entropy-lab-mixing.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0023-entropy-lab-seed-forge-boundary.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0024-warm-reachability-monitor.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0025-vault-identity-library-and-save-ux.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0026-canonical-vault-save-and-live-transfer.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0027-entropy-health-statistical-diagnostics.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0028-cold-only-bip39-seed-forge.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0029-cold-only-bitcoin-derivation-engine.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0030-cold-only-evm-and-arbitrary-path-derivation.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0031-public-registry-mutation-boundary.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0032-notes-tags-and-concealment.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0033-device-registry.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0034-cold-local-verification-workflows.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0035-cold-printing-allow-modals.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0036-slip39-cold-vendoring.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0037-codex32-cold-hand-verifiable.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0038-shamir39-and-raw-sss-cold-only.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0039-seed-xor-cold-only.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0040-vault-recovery-share-record.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0041-backup-record-verification-boundary.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0042-conservative-backup-health.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0043-scoped-mobile-validation-deferral.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0044-panel-scoped-calm-rule.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0045-released-secret-model.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0046-vault-name-availability-at-unlock.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0047-brand-assets-traced-once-and-embedded.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0048-ci-as-independent-execution.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0049-approved-mock-parity-contract.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0050-level-3-secret-record-vault.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0051-full-bitcoin-wallet-v1.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0052-warm-network-cold-wallet-authority.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0053-strict-spending-envelope.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0054-signing-lifecycle-and-exfiltration-boundary.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0055-chain-state-trust-and-privacy.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0056-seed-lineage-signing-and-secret-qr.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0057-structured-public-identity-graph.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0058-vault-credential-policy-and-generator.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/0059-self-custody-workstation-product-identity.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/adr/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/batch-run.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/browser-runner-flow.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/build.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/dependencies.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/doc-hygiene.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/handoff.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/maintainer-decisions.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-03.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-10-p1.10-p1.13.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-10-remediation.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-10.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-10.rereview-2.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-10.rereview.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-10.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/BATCH-2026-08-12.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/browser-runner-flow.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/browser-runner-flow.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/fix-build-date-iso-rendering.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/fix-build-date-iso-rendering.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/license-agplv3.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.10-crypto-layer.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.10-crypto-layer.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.10-crypto-layer.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.11-vault-format.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.11-vault-format.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.11-vault-format.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.12-kdf-profiles.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.12-kdf-profiles.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.12-kdf-profiles.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.13-lock-save-load.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.13-lock-save-load.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.13-lock-save-load.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.14-save-integrity.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.14-save-integrity.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.15-keyfile-unlock.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.15-keyfile-unlock.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.16-provenance-panel.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.16-provenance-panel.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.17-help-framework.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.17-help-framework.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.18-ci.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.18-ci.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.19-device-matrix.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.19-device-matrix.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.2-vendor-verification.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.20-legal-notices.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.20-legal-notices.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.21-injected-provider-neutering.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.21-injected-provider-neutering.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.3-forbidden-construct-lint.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.3a-headless-browser-harness.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.3a-headless-browser-harness.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.4-csp-hash-pinning.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.4-csp-hash-pinning.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.5-warm-shell-skeleton.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.5-warm-shell-skeleton.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.6-cold-realm-bootstrap.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.6-cold-realm-bootstrap.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.6-cold-realm-bootstrap.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.7-message-handshake.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.7-message-handshake.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.7-message-handshake.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.8-csp-canary-airgap-guard.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.8-csp-canary-airgap-guard.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.8-csp-canary-airgap-guard.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.9-capability-self-check.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p0.9-capability-self-check.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.1-entropy-lab.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.1-entropy-lab.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.10-qr-generation.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.10-qr-generation.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.10-qr-generation.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.11-address-provenance.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.11-address-provenance.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.11-address-provenance.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.12-address-verification.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.12-address-verification.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.12-address-verification.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.13-clipboard-canary.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.13-clipboard-canary.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.13-clipboard-canary.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.2-entropy-health-meter-bias-analyzer.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.2-entropy-health-meter-bias-analyzer.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.3-seed-forge.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.3-seed-forge.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.4-derivation-engine-bip32-bitcoin.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.4-derivation-engine-bip32-bitcoin.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.5-derivation-evm-arbitrary-path.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.5-derivation-evm-arbitrary-path.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.6-registry-crud-wallets-accounts-addresses.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.6-registry-crud-wallets-accounts-addresses.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.7-notes-tags-concealment.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.7-notes-tags-concealment.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.8-device-registry.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.8-device-registry.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.9-verification-workflows.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p1.9-verification-workflows.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.1-slip39.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.1-slip39.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.1-slip39.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.2-codex32.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.2-codex32.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.2-codex32.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.3-seed-xor.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.3-seed-xor.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.3-seed-xor.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.4-shamir39.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.4-shamir39.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.4-shamir39.self-review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.5-vault-recovery-shares.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.5-vault-recovery-shares.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.6-backup-records-verify-shares.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.6-backup-records-verify-shares.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.7-backup-health-dashboard.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/p2.7-backup-health-dashboard.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui-comic-design-system.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.review-2.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.review-3.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.review-4.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.review-5.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.review-6.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.1-design-reconciliation.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.10-vault-naming.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.10-vault-naming.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.10a-workstation-reference-import.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.10a-workstation-reference-import.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.2-brand-assets.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.2-brand-assets.rereview-2.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.2-brand-assets.rereview.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.2-brand-assets.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.3-released-secret-state.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.3-released-secret-state.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4-sealed-realm-tool-grouping.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4-sealed-realm-tool-grouping.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4a-approved-mock-parity-contract.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4a-approved-mock-parity-contract.review.final.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4a-approved-mock-parity-contract.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4a-approved-mock-parity-contract.review.pass.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.4a-approved-mock-parity-contract.review.test-fix.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.5-shared-shell-chrome.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.5-shared-shell-chrome.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.6-floating-record-menu.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.6-floating-record-menu.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.7-send-to-routing.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.7-send-to-routing.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.8-warm-realm-workspaces.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.8-warm-realm-workspaces.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.9-tool-map-roadmap.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/packets/ui.9-tool-map-roadmap.review.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/pr-packet.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/prompts.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/release-checklist.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/review-protocol.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/testing.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/05-development/ui-reference/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/docs/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/history/29bc8bbca95ad1d72e98141fb4a6b4921aee3ef718bce81c771a831933f97953/test/fixtures/reference/README.md",
      "role": "historical_provenance",
      "required": true
    },
    {
      "path": ".markdown-machine/intent/intent-baseline-presentation-rebuild.md",
      "role": "intent_record",
      "required": true
    },
    {
      "path": ".markdown-machine/intent/run-horizon-bootstrap-to-product-freeze.md",
      "role": "intent_record",
      "required": true
    },
    {
      "path": ".markdown-machine/lifecycle/lifecycle-graph-presentation-rebuild.md",
      "role": "lifecycle_record",
      "required": true
    },
    {
      "path": ".markdown-machine/tasks/task-mock-rereview-product-discovery.md",
      "role": "task_record",
      "required": true
    }
  ],
  "forbidden_distribution_roots": [
    "bootstrap",
    "project-compiler",
    "project-runtime",
    "verification"
  ],
  "closure_status": "COMPLETE",
  "revision": 1,
  "repository_binding_ref": {
    "ref": "sha256:1d14436330d927359f39ec7363a1720a426cdbef66680782cbd82636ef5d14fe",
    "path": ".markdown-machine/REPOSITORY.md"
  }
}
---
# Compiled Markdown Machine manifest
