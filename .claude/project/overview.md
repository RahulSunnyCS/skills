# Project Overview

**claude-web-dev-skills** (package `claude-web-dev-skills`, repo `skills`) is a
zero-dependency CLI that drops a complete Claude Code autonomous pipeline —
12 specialist agents, 11 slash commands, and a `CLAUDE.md` orchestrator — into
any web project via `npx` from GitHub.

- **Pipeline distribution CLI** — `init` (first install), `sync` (update to
  latest template), `sync --check` (CI drift validation, no writes)
- **Template payload** — the canonical `web-dev/template/` tree (agents,
  commands, generic CLAUDE.md) that gets copied into consumer projects
- **Drift detection** — SHA-256 of CLAUDE.md recorded in
  `.claude/.pipeline-version`; sync diffs against it and guards local edits
- **Audience** — developer tool, consumed by engineers setting up the pipeline
  on their own web codebases; CLI-only, no web UI and no API surface
