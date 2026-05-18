# Consumer Setup Guide

Get the Claude Code autonomous pipeline running in your project in under five
minutes. No npm account, no global install.

---

## Prerequisites

- **Node.js ≥ 18** (`node --version` to confirm)
- **Claude Code** installed and authenticated
- A git repository for your project

---

## Step 1 — Install the pipeline

Run this once from the root of your project:

```bash
npx github:rahulsunnycs/claude-web-dev-skills init
```

This writes the following into your project root:

```
your-project/
├── CLAUDE.md                   ← pipeline orchestrator (do not hand-edit)
└── .claude/
    ├── .pipeline-version       ← version marker (tracks sync state)
    ├── agents/                 ← 12 specialist agent definitions
    │   ├── architecture-reviewer.md
    │   ├── docs-writer.md
    │   ├── e2e-test-writer.md
    │   ├── epic-doc-writer.md
    │   ├── implementor.md
    │   ├── performance-reviewer.md
    │   ├── pricing-reviewer.md
    │   ├── qa-planner.md
    │   ├── red-team.md
    │   ├── security-auditor.md
    │   ├── test-writer.md
    │   └── translator.md
    └── commands/               ← 11 slash commands
        ├── diagnose.md
        ├── epic-doc.md
        ├── fix.md
        ├── grill-me.md
        ├── implement.md
        ├── plan.md
        ├── qa-plan.md
        ├── review.md
        ├── setup-project.md
        ├── start.md
        └── test.md
```

> If a `CLAUDE.md` already exists, you will be prompted before it is
> overwritten. Running `init` a second time is a no-op — use `sync` for
> updates.

Commit everything:

```bash
git add CLAUDE.md .claude/
git commit -m "feat: add claude-web-dev-skills pipeline"
```

---

## Step 2 — Fill in your project context

The pipeline needs three files that describe your specific project. These live
in `.claude/project/` and are **never touched by `init` or `sync`** — they are
yours to own and maintain.

| File | What goes in it |
|------|----------------|
| `overview.md` | What the product does, who uses it, the core value proposition |
| `business.md` | Business model, tiers, pricing rules, billing constraints |
| `technical.md` | Tech stack, patterns, conventions, key commands, gotchas |

### Option A — Let the pipeline interview you (recommended)

Open Claude Code in your project root and run:

```
/setup-project
```

Claude will ask you one question at a time and write all three files
automatically.

### Option B — Write the files manually

```bash
mkdir -p .claude/project
```

Create each file with the relevant facts about your project. Keep them
factual and concise — the pipeline reads them on every run.

Commit the context files:

```bash
git add .claude/project/
git commit -m "docs: add project context for claude pipeline"
```

---

## Step 3 — Start the pipeline

Open Claude Code in your project root and run:

```
/start
```

Claude reads the entire repository, produces a **Repository Assessment
Report**, and waits for your approval before doing anything further.

From there, use the slash commands to drive each stage:

| Command | What it does |
|---------|-------------|
| `/start` | Read the repo and produce the assessment report |
| `/plan` | Triage + planning with Red Team review → Human Gate 1 |
| `/implement` | Decomposition + parallel implementation |
| `/review` | Security, performance, and architecture review → Human Gate 2 |
| `/test` | Generate and run tests, with up to two auto-retry cycles |
| `/fix` | Drive failing tests to green without re-running the full pipeline |
| `/grill-me` | Intent-extraction interview — clarify scope before planning |
| `/diagnose` | Root-cause investigation for an unknown bug |
| `/qa-plan` | Generate or refresh the QA checklist |
| `/epic-doc` | Produce a collated delivery document for a completed epic |
| `/setup-project` | Re-run the project-context interview at any time |

---

## Keeping the pipeline up to date

Pull in the latest agents, commands, and `CLAUDE.md` from the upstream
template:

```bash
npx github:rahulsunnycs/claude-web-dev-skills sync
git diff .claude/ CLAUDE.md     # review what changed
git commit -m "chore: sync claude-web-dev-skills"
```

`sync` overwrites agents and commands unconditionally (never edit those
locally). For `CLAUDE.md` it checks whether you have local modifications
and prompts you before overwriting.

### Pin to a specific version

```bash
npx github:rahulsunnycs/claude-web-dev-skills#v1.0.0 init
```

### Validate in CI (no writes)

```bash
npx github:rahulsunnycs/claude-web-dev-skills sync --check
```

Exits non-zero if any pipeline file is out of date. Safe to add as a CI
step — it makes no changes.

---

## What is and is not touched

| Path | `init` | `sync` |
|------|--------|--------|
| `CLAUDE.md` | Written (prompt if exists) | Overwritten if unmodified; diff + confirm if you've edited it |
| `.claude/agents/*.md` | Always written | Always overwritten — do not modify locally |
| `.claude/commands/*.md` | Always written | Always overwritten — do not modify locally |
| `.claude/.pipeline-version` | Created | Updated |
| `.claude/project/` | **Never touched** | **Never touched** |
| `.claude/settings.json` | **Never touched** | **Never touched** |

Everything in `.claude/project/` and `.claude/settings.json` belongs to
you. The pipeline never overwrites your project context or local settings.

---

## Optional: add a convenience script

```json
"scripts": {
  "pipeline:sync": "npx github:rahulsunnycs/claude-web-dev-skills sync"
}
```

---

## Troubleshooting

**`Already initialised. Run sync to update.`**
You have already run `init`. Use `sync` to pull in updates.

**`Not initialised. Run init first.`**
Run `init` before `sync`. The `.claude/.pipeline-version` marker is missing.

**`CLAUDE.md has local modifications AND the template changed.`**
The upstream template changed since your last sync, and you have edited
`CLAUDE.md` locally. You will be prompted. If you choose not to overwrite,
merge the upstream changes manually and update `.pipeline-version`
accordingly.

**Non-TTY environment (CI, scripts)**
Any interactive prompt (overwrite confirmations) defaults to **NO** when
stdin is not a TTY. Use `sync --check` in CI instead of `sync`.
