# claude-web-dev-skills

Reusable Claude Code autonomous pipeline for any web project. One command gives you a full set of specialist agents, slash commands, and an orchestration backbone — no npm account needed, just `npx` from GitHub.

## What's included

**12 specialist agents** (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| `architecture-reviewer` | Structure, coupling, naming, API design |
| `docs-writer` | Inline comments, API reference, README updates |
| `e2e-test-writer` | Playwright tests from QA checklist |
| `epic-doc-writer` | Collated delivery documents at `docs/epics/` |
| `implementor` | Implements task contracts precisely within scope |
| `performance-reviewer` | N+1s, blocking ops, memory leaks, scale bottlenecks |
| `pricing-reviewer` | Billing/tier correctness (tag-gated) |
| `qa-planner` | QA checklist with 🔴Critical / 🟡Functional / 🟢Non-blocker tiers |
| `red-team` | Adversarial plan review (Conservative / Optimist / Pessimist) |
| `security-auditor` | Auth, input validation, sensitive data, misconfiguration |
| `test-writer` | Unit + integration tests |
| `translator` | Technical plans → plain English for Human Gates |

**11 slash commands** (`.claude/commands/`)

`/start` `/plan` `/implement` `/review` `/test` `/fix` `/grill-me` `/diagnose` `/qa-plan` `/epic-doc` `/setup-project`

**`CLAUDE.md`** — full autonomous pipeline orchestrator with 7 phases, adaptive lanes (express → feature-full), risk triage, 3 Human Gates, and model/effort assignment.

---

## Quick start (no npm account needed)

### New project — init once

```bash
npx github:rahulsunnycs/claude-web-dev-skills init
```

This writes `CLAUDE.md`, all 12 agents, all 11 commands, and a `.claude/.pipeline-version` marker into your project. Nothing is touched if you run it twice — use `sync` for updates.

```bash
git add CLAUDE.md .claude/
git commit -m "feat: add claude-web-dev-skills pipeline"
```

Then in Claude Code:

```
/setup-project   # interview → writes .claude/project/ (your project-specific context)
/start           # pipeline is live
```

### Update to latest

```bash
npx github:rahulsunnycs/claude-web-dev-skills sync
git diff .claude/ CLAUDE.md     # review what changed
git commit -m "chore: sync claude-web-dev-skills"
```

### Pin to a specific version

```bash
npx github:rahulsunnycs/claude-web-dev-skills#v1.0.0 init
```

### CI validation

```bash
npx github:rahulsunnycs/claude-web-dev-skills sync --check
```

Exits non-zero if any file is out of date. Makes no writes. Use as a CI step to confirm the pipeline files match the latest version.

---

## What gets written vs what is never touched

| Path | On `init` | On `sync` |
|------|-----------|-----------|
| `CLAUDE.md` | Written (prompt if already exists) | Overwritten if unchanged since last sync; diff + confirm if you've modified it |
| `.claude/agents/*.md` | Always written | Always overwritten — never modify locally |
| `.claude/commands/*.md` | Always written | Always overwritten — never modify locally |
| `.claude/.pipeline-version` | Created | Updated |
| `.claude/project/` | **Never touched** | **Never touched** |
| `.claude/settings.json` | **Never touched** | **Never touched** |

## Commit all synced files

Nothing goes in `.gitignore`. Committing the files means:
- Pipeline works in CI and for fresh clones with zero setup
- Agent/command changes are visible and auditable in PR diffs
- `git bisect` can identify when a pipeline behaviour changed

## Add a convenience script (optional)

```json
"scripts": {
  "pipeline:sync": "npx github:rahulsunnycs/claude-web-dev-skills sync"
}
```

---

## How to use the pipeline

After `init`, your project has the full pipeline. The entry points:

| Command | What it does |
|---------|-------------|
| `/start` | Reads the repo, produces a Repository Assessment Report, waits for approval |
| `/plan` | Triage + Planning with Red Team loop → Human Gate 1 |
| `/implement` | Decomposition + parallel implementation → Human Gate confirmation |
| `/review` | Security + Performance + Architecture review in parallel → Human Gate 2 |
| `/test` | Test generation + execution loop (max 2 auto-retries) |
| `/fix` | Fix cycle only — drives failing tests to green |
| `/grill-me` | Intent extraction interview before planning |
| `/diagnose` | Root-cause investigation for unknown bugs |
| `/qa-plan` | Generate/refresh the QA checklist |
| `/epic-doc` | Collated delivery document for a completed epic |
| `/setup-project` | Populate `.claude/project/` via interview |

## Project context (your responsibility)

After `init`, populate three files with your project's specific facts:

```
.claude/project/overview.md   — what the product does and who uses it
.claude/project/business.md   — business model, tiers, pricing, billing rules
.claude/project/technical.md  — stack, patterns, conventions, gotchas, commands
```

Run `/setup-project` in Claude Code and it will interview you and write these files automatically.

---

## Repository structure

```
claude-web-dev-skills/
├── package.json                  # bin field only, zero dependencies
├── bin/claude-pipeline.js        # CLI entry point
├── lib/sync.js                   # copy logic (init + sync)
├── README.md
└── template/
    ├── CLAUDE.md                 # generic pipeline orchestrator
    └── .claude/
        ├── agents/               # 12 specialist agent definitions
        └── commands/             # 11 slash command definitions
```

## Versioning

- Push to `main` → available immediately via `npx github:rahulsunnycs/claude-web-dev-skills`
- Tag releases: `git tag v1.1.0 && git push --tags` → pin with `#v1.1.0`
- Keep `CHANGELOG.md` so consumers know what changed before syncing
