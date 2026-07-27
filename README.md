# Claude Web Dev Skills

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
npx github:rahulsunnycs/skills init
```

This writes the following into your project root:

```
your-project/
├── CLAUDE.md                   ← pipeline orchestrator (do not hand-edit)
└── .claude/
    ├── .pipeline-version       ← version marker (tracks sync state)
    ├── agents/                 ← 15 specialist agent definitions
    │   ├── architecture-reviewer.md
    │   ├── docs-writer.md
    │   ├── e2e-test-writer.md
    │   ├── epic-doc-writer.md
    │   ├── implementor.md
    │   ├── performance-reviewer.md
    │   ├── pricing-reviewer.md
    │   ├── qa-planner.md
    │   ├── red-team.md
    │   ├── regression-analyst.md
    │   ├── retrospective-reviewer.md
    │   ├── security-auditor.md
    │   ├── senior-software-engineer.md
    │   ├── test-writer.md
    │   └── translator.md
    ├── commands/               ← 12 slash commands
    │   ├── diagnose.md
    │   ├── epic-doc.md
    │   ├── fix.md
    │   ├── grill-me.md
    │   ├── implement.md
    │   ├── plan.md
    │   ├── qa-plan.md
    │   ├── review.md
    │   ├── setup-project.md
    │   ├── start.md
    │   ├── test.md
    │   └── triage.md
    └── pipeline/               ← phase specs, read on demand by the
        │                          orchestrator only (not injected into
        │                          every sub-agent — keeps delegations cheap)
        ├── phases.md
        ├── lanes-and-specialists.md
        ├── models-and-effort.md
        └── output-formats.md
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

## Step 3 — Start building

### For most tasks: just use `/plan`

The most common entry point is `/plan`. Describe what you want to build or
fix, and the pipeline handles triage, risk classification, planning, Red Team
review, and a plain-English Gate 1 report — all from a single prompt.

```
/plan Add a product catalogue page with filtering by category and price range
```

```
/plan The checkout flow crashes when a guest user applies a discount code
```

```
/plan Refactor the order service to support multiple payment providers
```

You do not need to frame prompts as commands. Write them like you would brief
a senior engineer — what the feature does, who uses it, and any constraints
that matter.

### When to use `/start` instead

`/start` is useful when you are **orienting yourself to an unfamiliar
codebase** — it reads every file in the repo and produces a Repository
Assessment Report before you start planning. Use it:

- First time working in the repo (especially if someone else set it up)
- After a long gap — to re-read what is there before making changes
- When you want a health check before starting a large feature

It is not a required step before every task. If you already know the codebase,
go straight to `/plan`.

### Slash command reference

| Command | When to use it |
|---------|---------------|
| `/plan` | **Most tasks** — describe a feature, bug, or change and get a full plan |
| `/start` | Onboarding or orientation — read the repo and get an assessment |
| `/implement` | Run decomposition + parallel implementation after Gate 1 |
| `/review` | Security, performance, and architecture review → Human Gate 2 |
| `/test` | Generate and run tests, with up to two auto-retry cycles |
| `/fix` | Drive failing tests to green without re-running the full pipeline |
| `/triage` | Classify failing tests (direct / collateral / external) and route each to the right fix path |
| `/grill-me` | Clarify scope before planning — good for large or ambiguous tasks |
| `/diagnose` | Root-cause investigation for a bug whose cause is unknown |
| `/qa-plan` | Generate or refresh the QA checklist on demand |
| `/epic-doc` | Produce a collated delivery document for a completed epic |
| `/setup-project` | Re-run the project-context interview at any time |

---

## Sample prompts — e-commerce example

These show how to write effective `/plan` prompts. The pattern is: **what to
build + who uses it + any key constraints**.

### New features

```
/plan Build a product listing page. Shoppers can browse items, filter by
category and price range, and sort by newest or best-selling. Use the
existing Product model. No auth required — this is a public page.
```

```
/plan Add a shopping cart. Guests can add items and persist the cart in
localStorage. Logged-in users should have their cart synced to the DB
so it survives across devices. Cart badge in the nav should update in
real time.
```

```
/plan Implement checkout. Collect shipping address and payment details,
integrate Stripe for card processing, send an order confirmation email
via SendGrid, and write an order record to the DB. Handle payment
failures gracefully with a user-facing error message.
```

```
/plan Build an admin dashboard for order management. Staff can view all
orders, filter by status (pending / shipped / delivered / cancelled),
update order status, and trigger a refund via Stripe. Must be behind
the existing admin role check.
```

### Bug fixes

```
/plan The discount code field on the checkout page crashes with
"Cannot read properties of undefined" when a guest user applies a code.
Logged-in users are unaffected. Repro: open checkout as guest, enter
any code, click Apply.
```

```
/plan Product images are not loading for items added in the last 48 hours.
Older items display fine. The image URL format appears to have changed
after last week's S3 migration.
```

### Refactors and improvements

```
/plan The order service currently hard-codes Stripe as the payment provider.
Refactor it to support a pluggable provider interface so we can add
PayPal in the next sprint without touching order logic.
```

```
/plan Search is doing a full table scan on every keystroke. Add a debounce
on the frontend and a DB index on product name and description. The
products table has ~50k rows.
```

### Ambiguous or large tasks — use `/grill-me` first

For anything cross-cutting or where you are not sure of the scope, run
`/grill-me` before `/plan`:

```
/grill-me We need a loyalty points system — customers earn points on purchases
and can redeem them at checkout
```

Claude will interview you one question at a time (earning rate, expiry,
redemption rules, existing user model, etc.) before producing the plan,
so Gate 1 is a clean yes/no rather than a negotiation.

---

## Contributing your customisations back

If you have modified agents, commands, or `CLAUDE.md` in your project and want
to share that variant as a named skill, run this from the root of the
`skills` repo:

```bash
node web-dev/bin/claude-pipeline.js publish https://github.com/you/your-repo ecommerce
```

This clones your repo, copies `.claude/agents/`, `.claude/commands/`,
`.claude/pipeline/` (if present), and `CLAUDE.md` into
`web-dev/skills/ecommerce/`, then prints the commit instructions. Your project-specific `.claude/project/` and `settings.json`
are never copied — only the pipeline files.

```bash
git add web-dev/skills/ecommerce/
git commit -m "feat: add skill ecommerce from https://github.com/you/your-repo"
git push
```

Each named skill lives independently under `web-dev/skills/` and does not
affect the default template.

---

## Keeping the pipeline up to date

Pull in the latest agents, commands, pipeline reference files, and
`CLAUDE.md` from the upstream template:

```bash
npx github:rahulsunnycs/skills sync
git diff .claude/ CLAUDE.md     # review what changed
git commit -m "chore: sync claude-web-dev-skills"
```

`sync` overwrites agents and commands unconditionally (never edit those
locally). For `CLAUDE.md` it checks whether you have local modifications
and prompts you before overwriting.

### Pin to a specific version

```bash
npx github:rahulsunnycs/skills#v1.0.0 init
```

### Validate in CI (no writes)

```bash
npx github:rahulsunnycs/skills sync --check
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
| `.claude/pipeline/*.md` | Always written | Always overwritten — do not modify locally |
| `.claude/.pipeline-version` | Created | Updated |
| `.claude/project/` | **Never touched** | **Never touched** |
| `.claude/settings.json` | **Never touched** | **Never touched** |

Everything in `.claude/project/` and `.claude/settings.json` belongs to
you. The pipeline never overwrites your project context or local settings.

---

## Optional: add a convenience script

```json
"scripts": {
  "pipeline:sync": "npx github:rahulsunnycs/skills sync"
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
