# Claude

Read **[AGENTS.md](AGENTS.md)** first. It is the standing contract for all agent work on this repository: how to orient, how to pick the next task, the constraints that cannot be violated, and the PR packet you must deliver.

Short version:

1. Next task is the first unchecked item with satisfied dependencies in [docs/05-development/ROADMAP.md](docs/05-development/ROADMAP.md).
2. This tool handles seed phrases. Fail closed, never guess on a security boundary, use independent test vectors.
3. Deliver a PR packet per [docs/05-development/pr-packet.md](docs/05-development/pr-packet.md) — written so a reviewer can verify the work without trusting you.
