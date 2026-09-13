---
{
  "record_type": "DISTRIBUTION_ORIGIN",
  "schema_version": 1,
  "project_id": "coldbox-d105f94a-f83e-4f85-9671-c64bcca74803",
  "machine_name": "Markdown Machine",
  "machine_version": "v0.10.0",
  "source_transport": "GIT_REPOSITORY",
  "source_identity": "https://github.com/JamesIsChosen/markdown-machine.git",
  "content_set_digest": "49988f75ac11a402cb1edf8073b7f3fc4339763123b85fb22480a23c93a7189b",
  "compatibility_family": "MARKDOWN-MACHINE-V0-10",
  "enforcement_profile": "KERNEL_MIGRATE",
  "runtime_source": {
    "path": "project-runtime/RUNTIME.md",
    "sha256": "b82f830d2cb85c84cb5252c44b6aa85c7e88fb0447ef49ba3e288e044da22533"
  },
  "git_commit": "d7bd9fefae8a629fb5383209701c8f3b09a654fb",
  "git_tree": "e2ae696dd939aaa72c9aaaac8a8fbeea28037dad",
  "governing_sources": [
    {"path": "project-runtime/RECORD-GRAMMAR.md", "sha256": "47c61d1aa92f492afd0419e961d51777058f9148ff90b2355d7ee57d73e34e3d"},
    {"path": "project-runtime/GOVERNING-RECORD-CONTRACTS.md", "sha256": "82fe05a4bd8191090e472391a3fdc37f76c359bdb78556ec4c43f8b29defb9e2"},
    {"path": "project-runtime/RECOVERY-CONTRACTS.md", "sha256": "df7ba1c11932181f88779dddf0bce08e0ba14795030b200bab8afe4d57ca3539"},
    {"path": "project-runtime/AUTHORITY-EVALUATOR.md", "sha256": "00368d16eef91628b0e87d9ecf1a7518207b8eb8b80a14106b1d805d2c0ef6cb"},
    {"path": "project-runtime/HUMAN-CONTROL.md", "sha256": "7c92664ce77ae0afa26f99e53175fe2ae0dbf5a14806ebb110edffde519b20ae"},
    {"path": "bootstrap/GENESIS-ADMISSION.md", "sha256": "f395faf32323d0527dbcb5e7756414eceff98e295a043b9257b06cbdfffcd7e9"}
  ],
  "selected_capability_sources": [
    {"capability_id": "software-product", "path": "project-runtime/capabilities/software-product.md", "sha256": "678a8ebd6493d72b93f0822df87efe769413f06e61555f78701a5d795c6d7d30"}
  ]
}
---
# Coldbox v0.10.0 distribution origin

This DISTRIBUTION_ORIGIN pinpoints the exact immutable v0.10.0 distribution
from the Markdown Machine Git repository for project coldbox-d105f94a-f83e-4f85-9671-c64bcca74803. It binds the six canonical governing
contracts, the universal runtime export, and the selected software-product
capability source. The content_set_digest covers all .md files in the tag tree.
