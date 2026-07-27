# Model Assignment & Effort Levels

Referenced from CLAUDE.md. Read this file when delegating an agent and you
need its model/effort, or when producing the token log / final token summary.

---

## Model Assignment

Planning, Decomposition, Synthesis Review, Final Review → Use deepest reasoning available
Triage → Haiku at low effort (short rule-based risk classification + lane selection against a fixed rubric; "default to HIGH when uncertain" and "pick the heavier lane when uncertain" make any misclassification fail-safe, so a fast model is correct here)
Diagnosis (Phase 0.7, bugfix-unknown) → Sonnet; escalate to Opus if the root cause stays elusive (root-causing is reasoning, not boilerplate)
Implementation, Fix cycles → Use fast capable model
Specialist Review (Phase 4) → the consolidated senior-software-engineer agent uses deepest reasoning (Opus): it carries the security lens, and security review is security reasoning. Its forced-or-discretionary Opus deep-dive (security-auditor) is also Opus/max. The dedicated specialists only run at the very-hard/epic split or for bugfix-unknown: security-auditor Opus/max, performance/architecture fast capable model
Retrospective (Phase 7.4, feature-full+) → 3× retrospective-reviewer agents fast capable model (Sonnet); Opus synthesis (it weighs cross-bias pipeline-design tradeoffs — reasoning, not boilerplate)
Documentation, Translation to plain English → Use fastest model
Test writing → Sonnet at medium effort by default; escalate to Opus at high effort when the task's risk_flags include auth or PII (security tests need the strongest reasoning)
Regression analysis (regression-analyst, Phase 6 COLLATERAL path) → Opus at high effort: evaluating a shared-component change and the architecture that let it cascade is regression reasoning, same principle as the security-auditor — never a fast model. The DIRECT-failure fix path stays on the fast model (Implementor).
Collated epic/delivery documents (epic-doc-writer) → Use mid-tier model (Sonnet): it synthesises rationale, tradeoffs, and human test cases — not mechanical boilerplate

Never use a fast model for security reasoning. Never use a slow expensive model for mechanical tasks like boilerplate or documentation.

Lane sizing (see lanes-and-specialists.md) selects the model per phase: express/docs → Haiku end-to-end; bugfix-known → Haiku/Sonnet; bugfix-unknown → Sonnet diagnosis then normal phase models; feature-fast / feature-full → as per the table below. The lane fail-safe overrides any sizing: HIGH risk / any risk_flag ⇒ feature-full models, security-auditor Opus/max.

**Meta-principle — effort + model are lane-and-task-derived, not static table
lookups.** Triage sets the lane; the lane sets per-phase effort/model defaults
(table below). Decomposition further refines per-task model/effort via
`model_hint` + `effort_hint` in each task contract (see phases.md → Phase 2).
Every agent delegation must receive its model and effort **explicitly** —
never assume the static table row applies when the lane or task type points
to a lighter assignment. The table is the starting point; the lane + task
contract override it.

---

## Effort Levels & Model Versions

Effort is an orchestration convention, not a model tier. It controls how much
deliberation a step spends, independent of which model runs it. The user may
set it; if unset, use the recommended default below.

- **low**    — single pass, minimal deliberation. Mechanical/cheap steps.
- **medium** — standard deliberation: cover the obvious cases and common
  failure modes. The normal working level.
- **high**   — thorough: weigh alternatives, edge cases, re-read before output.
- **max**    — exhaustive: multi-pass, adversarial self-review, no token-budget
  concern. The riskiest, highest-leverage decisions only.

Recommended default effort per step (model column = current assignment):

| Phase / step                     | Model (current)      | Effort |
|----------------------------------|----------------------|--------|
| Phase 0 Triage                   | Haiku                | low    |
| Phase 0.5 Intent Extraction      | Opus (grill-me, opt-in) | high   |
| Phase 0.7 Diagnosis (bugfix-unknown) | Sonnet (Opus if elusive) | medium (high if escalated) |
| Phase 1 Planning + Red Team (+ optional recommendations) | Opus / red-team Opus | **high** (feature-fast / MEDIUM) · **max** (feature-full / HIGH or any risk_flag) |
| Gate Translator (Gates 1/2/3)    | Haiku                | medium |
| Phase 2 Decomposition            | Opus (Sonnet for feature-fast / bugfix-known) | high   |
| Phase 3 Implementation           | per task_contract model_hint (haiku→sonnet→opus) | per task_contract effort_hint (medium→high) |
| Phase 3+4.5 Agent output verification | Haiku          | low    |
| Phase 4 Senior SW Engineer (sec+perf+arch) | Opus       | high (max if any risk_flag) |
| Phase 4 Opus deep-dive (security-auditor; forced if risk_flag/HIGH, else discretionary) | Opus | max |
| Phase 4 Dedicated specialists (very-hard/epic split or bugfix-unknown) | Opus security-auditor/max · Sonnet perf+arch | max / high |
| Phase 4 Synthesis                | Opus                 | high   |
| Phase 1/4 Pricing Reviewer       | Sonnet (tag-gated)   | low    |
| Phase 5 Test Writer              | Sonnet (Opus if auth/PII) | medium (high if auth/PII) |
| Phase 5 Docs Writer              | Haiku                | low    |
| Phase 4.5 Bounded Fix Cycle      | Sonnet (implementor) | high   |
| Phase 6 Fix cycles               | Sonnet (implementor) | high   |
| Phase 7 Final Review             | Opus                 | high   |
| Phase 7 Epic Doc Writer          | Sonnet               | medium |
| Phase 1 QA Planner               | Sonnet (Opus if auth/PII) | medium (high if auth/PII) |
| Phase 5 E2E Test Writer          | Sonnet               | medium |
| Phase 5/6 Blast-Radius Validation | Haiku               | low    |
| Phase 6 Regression Triage        | Haiku                | low    |
| Phase 6 Regression Analyst       | Opus (regression-analyst) | high |
| Phase 6 Automation Gate          | Haiku                | low    |
| Phase 7.4 Retrospective (feature-full+; 3 instances) | Sonnet | medium |
| Phase 7.4 Retrospective Synthesis | Opus                | high   |

How to instruct effort:
- Global: "set effort to high" — becomes the default for every step.
- Per step: "run planning at max effort", "security audit at max".
- The orchestrator records the chosen effort in pipeline/progress.md and passes
  it explicitly in each agent delegation prompt.

Model versions:
- Each agent's `model:` is a tier alias (opus/sonnet/haiku) = always the latest
  of that tier. This is the recommended default — improvements arrive for free.
- To pin for reproducible output (e.g. comparable security audits run-to-run),
  set `model:` to a full dated model ID instead of the alias. Tradeoff: pinned
  versions must be bumped by hand or they rot. The user may also instruct a
  one-off override ("run this phase on the previous Opus version").
- **Default policy:** alias for every step; pin a dated ID for **exactly one**
  — the security-auditor (Phase 4) — so audits are comparable run-to-run.
  Pinning more only adds upkeep (pinned IDs rot) without benefit, unless a
  compliance mandate requires full pipeline reproducibility.

---

## Pipeline Token Log — estimate ranges

Used when appending a row to `pipeline/token-usage.md` (see CLAUDE.md → Pipeline
Token Log for the logging rule itself). Estimated token ranges per model ×
effort tier (input + output combined):

- Haiku + low    : 1k – 4k
- Haiku + medium : 3k – 8k
- Sonnet + medium: 5k – 15k
- Sonnet + high  : 10k – 25k
- Opus + high    : 15k – 40k
- Opus + max     : 30k – 80k

Soft Phase 1 caps by lane (the highest-spend phase) — see CLAUDE.md → Pipeline
Token Log for the notify-and-continue rule:
- express / docs   : n/a (no Phase 1)
- bugfix-known / bugfix-unknown : ~20k tokens
- feature-fast     : ~60k tokens
- feature-full     : ~150k tokens
