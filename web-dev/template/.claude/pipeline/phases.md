# Pipeline Phases

Referenced from CLAUDE.md. Read the phase you are about to run — do not read
this whole file up front. Lane-specific depth is in `lanes-and-specialists.md`;
model/effort per step is in `models-and-effort.md`; every report format this
file produces is in `output-formats.md`.

---

## Phase 0 — Triage (Automatic, runs silently after the Repository Assessment)

Classify the risk level of the current task or project.

HIGH RISK if any of these are true:
- Handles user authentication or sessions
- Stores or processes personal or sensitive data
- Involves payment, financial, or billing logic
- Exposes public-facing APIs
- Has admin or privileged access controls
- Involves file uploads or user-generated content

Create the file pipeline/risk_manifest.json with this structure:
```json
{
  "risk_level": "HIGH or MEDIUM or LOW",
  "triggers": ["list of what triggered the risk level"],
  "mandatory_agents": ["senior-software-engineer"],
  "tags": ["zero or more of: pricing, frontend, backend, infra, product"],
  "lane": "express | docs | bugfix-known | bugfix-unknown | feature-fast | feature-full",
  "lane_rationale": "one sentence — why this lane and not a heavier one",
  "sprint_count": 3,
  "human_gates": 3
}
```
`mandatory_agents` expands to `["security-auditor", "performance-reviewer",
"architecture-reviewer"]` at the very-hard/epic split or for bugfix-unknown —
see Phase 4.

In the same rule-based pass, set tags — assign only what genuinely applies:
- pricing  — touches Stripe, tiers, billing, checkout, or PAYMENT_TEST_FLOW
- frontend — material UI / React / Next.js page or component work
- backend  — API routes, scanner modules, server logic, data flow
- infra    — Docker, CI, deploy, queue/Redis, storage, env/config
- product  — user-facing product/UX or go-to-market scope decisions
(auth / pii / data remain risk_flags, not tags — do not duplicate them.)
Tags gate the Conditional Specialists — see lanes-and-specialists.md.

Also set lane (the task class — see lanes-and-specialists.md for full
per-lane behaviour):
- express        — typo, rename, comment, formatting, config / dependency-
                    version bump; no logic change
- docs           — PURELY documentation / prose / template-text / doc-comment
                    edits with ZERO executable-code or logic change; if any
                    code/logic is touched, this lane does NOT apply
- bugfix-known   — clear reproduction, localized, the fix is obvious/known
- bugfix-unknown — a bug whose root cause is not yet known / no clean repro
- feature-fast   — small feature, or one whose high-level design already exists
- feature-full   — novel/cross-cutting, or anything not matching the above
                    (this is the default)

**Default lane for MEDIUM / no-flag work:** default to **feature-fast** unless
`lane_rationale` states a concrete reason to go heavier — see
lanes-and-specialists.md.

**Lane fail-safe (non-negotiable):** if risk_level is HIGH, OR any risk_flag
applies (auth, pii, payment/billing, public-facing API, admin/privileged,
file upload / user-generated content), Triage MUST set lane = feature-full
regardless of how small the surface looks. When uncertain between two lanes,
pick the heavier one. A lane may only *reduce* ceremony for genuinely
low-risk work — it can never strip a security gate.

**docs-lane additional fail-safe:** the docs lane is permitted ONLY when
risk_level is LOW, no risk_flag is set, AND the change touches zero
executable code or logic. If any executable file is modified, Triage MUST
NOT select the docs lane — fall back to express (for trivial code changes)
or the appropriate code lane.

**Honour project scope-down guidance:** before finalising tags and
mandatory_agents, read any scope-down / "Pipeline Scope" notes in
`.claude/project/`. See lanes-and-specialists.md → Conditional Specialists for
the full rule; it never removes a mandatory security gate.

Default to HIGH for any security project. When uncertain, go higher, not lower.

---

## Phase 0.5 — Intent Extraction (optional, /grill-me)

Not a gate and not always run. Use it to extract correct intent **before**
planning when the task is HIGH-risk, large, or ambiguous, or when the user
runs `/grill-me` or says "grill me". Skip it for trivial tasks (scale cost to
task size, like the conditional specialists).

Behaviour (see .claude/commands/grill-me.md):
- Interview the user **one question at a time**, each with a recommended
  answer, walking the decision tree and resolving dependencies one-by-one.
- If a question can be answered by exploring the codebase, explore instead of
  asking.
- Terminate when no open branch would change the plan, or the user says
  proceed.
- Emit a resolved decision record that becomes an input to Phase 1 planning.

This front-loads the questions so Human Gate 1 is a clean yes/no, not a
renegotiation. It never replaces a Human Gate.

---

## Phase 0.7 — Diagnosis (bugfix-unknown lane only)

Runs only when lane == bugfix-unknown, or the user explicitly asks to
"diagnose" something. Read-only and investigative — it makes NO code changes.

Goal: produce a Diagnosis Record at pipeline/diagnosis.md containing:
- Reproduction steps (or, if it cannot be reproduced, exactly what was tried
  and why it could not be)
- The confirmed root cause with concrete evidence (file:line / mechanism —
  not a guess)
- Blast radius — what else the same root cause touches
- Recommended fix direction (handed to Phase 1, not implemented here)

Model: Sonnet; escalate to Opus if the root cause stays elusive after one
pass. Effort medium, high if escalated.

Phase 1 then plans the fix against the *confirmed* cause. If the root cause
cannot be confirmed, STOP and report to the user — never let Phase 1 plan a
speculative fix (General Rule 1 in CLAUDE.md). Phase 0.7 is not a Human Gate
and never replaces one; an alarming root cause is surfaced immediately
(General Rule 4).

---

## Phase 1 — Planning (Deep Thinking Mode)

Model instruction: Use your deepest reasoning for this phase. Think longer than usual. Think adversarially.

Instructions:
1. Read pipeline/risk_manifest.json (and the Phase 0.5 grill-me decision record, if one was produced)
2. Think through the full scope of what needs to be built, changed, or secured
3. Ask yourself: What would an attacker target first in this system?
4. Ask yourself: What would a senior engineer regret not doing upfront?
5. Ask yourself: What does a junior developer typically miss in a system like this?
6. Produce a structured internal plan

Then immediately run the Red Team Loop:
- Hand your plan to the Red Team agent (.claude/agents/red-team.md)
- Red Team attacks the plan under three stances in one pass — Conservative, Optimist, Pessimist (defined in .claude/agents/red-team.md)
- You revise based on valid criticisms only
- Dismiss weak or irrelevant criticisms explicitly and explain why
- After each sprint, score the plan internally (see criteria below) and count newly-accepted criticisms
- **Convergence early-exit:** if a sprint produces **zero newly-accepted criticisms** AND the internal score is **≥8**, stop immediately — do not run remaining scheduled sprints. The score gate already protects quality; over-running past convergence adds cost without benefit.
- Otherwise repeat up to sprint_count times (from risk_manifest)

If risk_manifest.tags require conditional specialists (see
lanes-and-specialists.md), pull their input in here and fold it into the plan
before scoring.

Score the plan internally after each sprint (and at final convergence):
- Completeness: Did we cover every part of the system?
- Security depth: Are real threats addressed with real solutions?
- Feasibility: Can a team actually build this?
- Clarity: Would a non-security person understand what and why?

If final score is below 8 out of 10, run one more sprint.
If score is 8 or above, hand to the Translator agent (.claude/agents/translator.md).

Then seed the root TODO.md with the high-level task list from the plan (orchestrator is the sole writer — see CLAUDE.md → Shared Task Ledger).

### Optional Recommendations (bounded — AI-initiated scope only)

Before presenting at Gate 1, draft up to 5 recommendations that are genuinely
valuable but **outside the user's literal ask** — the things a senior engineer
would regret not raising. Use the existing Phase-1 Opus budget; no new agent.
Stress-test each through the tri-stance Red Team lens already in this phase and
keep only those that survive with a clear net benefit. For each, state what it
is, the value it brings, and the tradeoff/cost; include them in the Plan
Report's OPTIONAL RECOMMENDATIONS block (see output-formats.md).

Bounded re-plan loop:
- Track `recommendation_rounds_used` in pipeline/progress.md (starts at 0).
- If at Gate 1 the user accepts ≥1 AI recommendation: increment the counter,
  run a **bounded delta re-plan** (do NOT run a full new Red Team sprint):
  fold the accepted items into the plan, run one Bounded Phase-1 Constraint
  Round (single synthesiser pass, scoped to the delta — see
  lanes-and-specialists.md), refresh the QA Planner for Critical + Functional
  tiers only, then return to Gate 1.
- Hard cap: **2** AI-initiated rounds. Once `recommendation_rounds_used == 2`,
  stop generating recommendations — omit the block entirely and present the
  Plan Report alone for the remainder of this planning cycle.
- Carve-out: a requirement or change the **user** introduces is NOT an AI
  recommendation — it is always honored, re-planned as normal, and never
  counted against the cap. The cap restrains only AI-volunteered scope.
- This never auto-applies anything and never replaces the gate: "approve
  as-is" and "stop" are always available; the human always decides.

This block applies only to feature-fast and feature-full — see
lanes-and-specialists.md for the suppression rule on other lanes.

Then run the QA Planner agent (.claude/agents/qa-planner.md) to produce pipeline/qa-checklist.md:
- Escalate to Opus at high effort when risk_flags include auth or PII; otherwise Sonnet at medium effort.
- The checklist classifies every test scenario into three tiers: 🔴 Critical (blocks Gate 2 if failing at the Automation Gate), 🟡 Functional (CONDITIONAL PASS condition at Gate 2), 🟢 Non-blocker (informational only).
- **Lane-scaled breadth:** for feature-fast lane or MEDIUM risk_level with no risk_flags, emit **Critical + Functional tiers only** — skip exhaustive Non-blocker enumeration. Full three-tier output only for feature-full or HIGH risk.
- **State×Display Matrix (frontend tag only):** when risk_manifest.tags include `frontend`, the checklist MUST include, for every changed interactive view/component, a matrix over the states {loading, error, empty, partial, success}. Each state maps to ≥1 test case classified into a tier; a view whose state handling has no test is at minimum 🟡 Functional. This is consumed unchanged by the E2E Test Writer (Phase 5) — no new agent.
- The Translator agent does NOT translate the checklist — it is a machine-readable artifact consumed by the E2E Test Writer (Phase 5) and the Automation Gate (Phase 6).
- Append the QA checklist tier summary to the Plan Report before presenting at Gate 1.

HUMAN GATE 1: Stop completely. Present the translated Plan Report (see output-formats.md). Do not proceed until user says YES or gives direction.

---

## Phase 2 — Decomposition

Only runs after Human Gate 1 approval.

**Decomposition model scaling:** run this phase at Opus/high for
feature-full (and the very-hard/epic split). For feature-fast and
bugfix-known — where decomposition is 1–3 simple tasks — run it at
**Sonnet/high**. The lane fail-safe still governs: HIGH risk / any risk_flag
keeps Opus regardless.

Break the plan into atomic task contracts. Each task must be:
- Independent (no shared file writes with other parallel tasks)
- Completable by a single agent
- Bounded with a clear start, finish, and acceptance criteria

**Shared-module identification (do this first, before cutting tasks):** ask
"will ≥2 tasks need the same logic / type / helper?" If yes, make that shared
piece its **own Wave-1 task** that the dependent tasks declare as a
`dependency` — never let two parallel tasks each re-implement it. This
prevents the post-hoc shared-component regression class that otherwise only
surfaces at Phase-6 blast-radius.

**Mechanical-file batching:** cluster several same-pattern,
low-individual-complexity files (e.g. i18n catalogs, display-metadata
entries, near-identical boilerplate modules) into ONE implementor contract
instead of one task per file — they share a template, so one agent doing all
of them avoids N cold starts. **Never** batch logic-bearing, API-contract, or
security-critical files: those stay as separate contracts even if they share a
pattern. Batching must still respect the independence rule (no shared file
writes with another parallel task).

Save each task as pipeline/tasks/T-XX.json:
```json
{
  "task_id": "T-01",
  "title": "Short descriptive title",
  "assigned_to": "implementor",
  "risk_flags": ["list risk flags from risk_manifest that apply"],
  "model_hint": "haiku | sonnet | opus",
  "effort_hint": "low | medium | high",
  "scope": {
    "files_to_create": [],
    "files_to_modify": [],
    "files_forbidden": []
  },
  "acceptance_criteria": [
    "Criterion 1 — specific and testable",
    "Criterion 2 — specific and testable"
  ],
  "dependencies": [],
  "output_format": "code plus plain English explanation of every non-obvious decision"
}
```

**Assigning model_hint + effort_hint (per-task, not per-phase):**
- **mechanical** (pure boilerplate, string catalogs, config, docs, simple rename):
  `model_hint: haiku`, `effort_hint: medium`
- **logic-bearing** (algorithm, data flow, type-shape, API contract, consumer
  interaction, anything a reviewer would look at for correctness):
  `model_hint: sonnet`, `effort_hint: high`
- **security-critical or architecturally cross-cutting** (auth, payment,
  public API surface, cross-module shared type):
  `model_hint: opus`, `effort_hint: high`
The Phase-3 implementor receives these hints as its model/effort instruction.
The lane fail-safe still applies: HIGH risk / any risk_flag → minimum sonnet/high
regardless of the per-task hint.

**Cross-artifact consistency check (very-hard / epic split only — no new agent):**
when the epic trigger fired (risk_level HIGH **and** ≥3 tags — the same
trigger as the Bounded Phase-1 Constraint Round), the orchestrator, in this
same Opus decomposition pass, verifies that every T-XX acceptance criterion
traces to an approved Plan Report item and does not contradict any tagged
specialist's Phase-1 constraint memo (and, where parallel tasks share a
front-end ↔ back-end contract, that the contract is described identically in
both task contracts). Any contradiction is surfaced to the user **before
Phase 3** — never silently reconciled. Skipped for every other lane (the
single-source task contracts make it redundant there).

Regenerate the root TODO.md from these task contracts (read-only-for-agents mirror — see CLAUDE.md → Shared Task Ledger).

Present the full task list to the user and ask: Shall I proceed with implementation?

---

## Shared Context Pack (built once after Gate 1, consumed by every downstream agent)

After Gate 1 approval the orchestrator builds ONE context-pack artifact at
`pipeline/context-pack.md` and passes it (by reference) into every Phase 3/4/
5/6 agent delegation, so agents stop re-discovering the repository from cold:

- changed-file list + unified diff against the base branch (as it grows),
- the task-map (which T-XX owns which files),
- an "already-implemented manifest" — what prior tasks/runs have already
  landed, so a later agent does not re-explore or re-implement it,
- the relevant `.claude/project/` facts for this task's surface.

The orchestrator refreshes it at each phase boundary (it is working state,
deleted with `pipeline/` at Gate-3 cleanup). Agents read it; they never write
it (single-writer rule, same as TODO.md).

---

## Phase 3 — Parallel Implementation

Delegate each task to the Implementor agent (.claude/agents/implementor.md).

Rules:
- Each agent works only within its assigned scope
- Each agent must not touch files_forbidden
- Each agent must output code plus a plain English explanation of every non-obvious decision made
- If an agent is uncertain about any security-sensitive decision, it must stop and ask rather than assume
- Agents read the root TODO.md and pipeline/context-pack.md for context but never write either; they report status to the orchestrator, which updates TODO.md and pipeline/progress.md

---

## Phase 4 — Consolidated Specialist Review

**Primary reviewer: the senior-software-engineer agent**
(.claude/agents/senior-software-engineer.md) covers **security + performance +
architecture in one Opus pass** for every lane up to and including
feature-full. It applies the frontend/backend/infra lens for whichever of
those risk_manifest.tags are set, and saves one combined report to
pipeline/reviews/.

**Reviewer set is gated by lane × risk_level** (the Phase-0 lane fail-safe
still governs):
- up to feature-full → the senior-software-engineer agent (one pass).
- LOW → senior-software-engineer agent, architecture lens emphasised.
- express / docs → no Phase 4 (no code-logic surface).
- **very-hard / epic split** (risk_level HIGH **and** ≥3 tags — the same
  trigger as the Bounded Phase-1 Constraint Round) → do NOT use the
  consolidated agent; run the dedicated specialists in parallel instead:
  security-auditor (Opus/max), performance-reviewer, architecture-reviewer.
- bugfix-unknown always runs the dedicated specialist set (side-effect risk).

**Escalation protocol (the security fail-safe — non-negotiable):**
After its pass the senior-software-engineer agent emits an explicit verdict:
`OPUS DEEP-DIVE: REQUIRED | NOT REQUIRED` with a one-paragraph rationale.
- **Discretionary** when no risk_flag is set and risk_level < HIGH: the agent
  may request the deep-dive if its own findings warrant it.
- **Forced but scoped** when ANY risk_flag (auth / pii / payment /
  public-facing-API / admin / file-upload / user-generated-content) is set OR
  risk_level is HIGH: a standalone security-auditor (.claude/agents/
  security-auditor.md) Opus/max deep-dive **always runs**, but **scoped to the
  senior agent's findings** (a focused brief, not a cold full audit). No lane,
  and no senior-agent verdict, can downgrade this. "Never use a fast model for
  security reasoning" still binds — the senior agent is Opus.

When a deep-dive runs, it is a second report in pipeline/reviews/, synthesised
alongside the consolidated report below.

Also run, only when the matching tag is set (see lanes-and-specialists.md):
- Pricing Reviewer → .claude/agents/pricing-reviewer.md — only if tags include pricing

Each saves a report to pipeline/reviews/

Then synthesise all reports:
- Identify any conflicts between reviewer findings
- Prioritise by severity: Critical first, then High, Medium, Low
- Produce a PASS, CONDITIONAL PASS, or FAIL verdict

Hand the Synthesis Review Report to the Translator agent (.claude/agents/translator.md) for a plain-English pass BEFORE presenting it. Safeguard: the Translator clarifies wording only — it must preserve every severity label, the finding counts, and the PASS / CONDITIONAL PASS / FAIL verdict verbatim (never dilute the security signal).

HUMAN GATE 2: Stop. Present the translated Synthesis Review Report (see output-formats.md). Do not proceed to testing until approved.

---

## Phase 4.5 — Bounded Fix Cycle (CONDITIONAL PASS only)

Runs only when the Gate 2 verdict is CONDITIONAL PASS (one or more High/Medium
conditions must be remediated before Phase 5). Not a Human Gate — it runs under
the existing Gate 2 user approval and reports results before Phase 5 begins.

**Parallelization rule (reuses the Phase 3 independence principle):**
- Decompose each condition into a fix task with an explicit file scope.
- Fix tasks whose `files_to_modify` sets are **disjoint** run in **parallel**
  (same implementor-agent mechanics as Phase 3).
- Fix tasks with a declared dependency or overlapping file sets run
  **sequentially** in dependency order.
- The orchestrator determines disjointness from the condition descriptions
  before delegating — never assume disjointness.

**Bounds:**
- Maximum 2 sequential fix cycles (parallel-within-cycle is fine). If
  conditions are still unresolved after 2 cycles, stop and surface to the user.
- Each fix agent works within its declared scope only; `files_forbidden` from
  the original task contracts apply.
- After each cycle, re-run the full unit/integration suite. If green, proceed
  to Phase 5. If tests regress, apply Regression Triage (DIRECT → Implementor;
  COLLATERAL → regression-analyst) before continuing — see Phase 6.

**Orchestrator verification after each fix batch:**
Run a cheap Haiku/low verification step: confirm only declared files were
modified (grep scope-check) + `npm run test` summary. The orchestrator
adjudicates the pass/fail summary, not raw command output — this avoids
burning Opus on mechanical verification that a fast model can do.

---

## Phase 5 — Test Generation (Parallel)

Run simultaneously:
1. Unit Test Agent using .claude/agents/test-writer.md
2. Integration Test Agent using .claude/agents/test-writer.md with integration flag
3. Docs Agent using .claude/agents/docs-writer.md
4. E2E Test Writer using .claude/agents/e2e-test-writer.md — reads pipeline/qa-checklist.md and writes Playwright tests in e2e/ tagged @critical/@functional/@non-blocker. Bootstraps playwright.config.ts and the test:e2e npm script on first run if they do not exist. Only runs for feature-fast and feature-full lanes (skipped for express, docs, and bugfix lanes unless explicitly requested).

---

## Phase 6 — Test Execution Loop

### Change-Scope & Blast-Radius Validation (runs before the tests)

Model: Haiku at low effort — this step maps changed files to task scopes, not reasoning.

Before running the tests, validate that every change is linked to a declared task:

1. Diff every changed test and source file against the base branch.
2. Map each changed file to a task in `pipeline/tasks/T-XX.json` (its `files_to_create` / `files_to_modify`).
3. Every changed file must link to a task. Classify each: `valid` (cleanly inside one task scope), `unlinked` (not in any task scope), or `shared-ripple` (a shared/common component touched by more than one task or whose change reaches beyond the declaring task).
4. Save the map to `pipeline/reviews/blast-radius-validation.md` (format in output-formats.md).
5. For each `shared-ripple`, escalate to the senior-software-engineer / architecture-reviewer (coupling lens) and, if a regression is suspected, to the regression-analyst (.claude/agents/regression-analyst.md). An `unlinked` change is surfaced to the user — a change with no declared task is out of scope by definition.

This step never blocks on its own; it produces the blast-radius record that Regression Triage and the Synthesis Review consume. A common-component change that rippled into many places must be **validated**, not passed silently.

### Run the tests

If tests fail, classify every failure **before** delegating any fix:

### Regression Triage (Haiku, low effort)

For each failing test, classify it against the Change-Scope map:

- **DIRECT** — the failing test's subject is inside a current task's `files_to_modify` / `files_to_create`. The task's own code broke.
- **COLLATERAL** — the failing test is outside every task scope, and a shared/common component changed this run and broke it. This is a regression, not a fix target.

Save the classification to `pipeline/reviews/regression-triage.md`. Then route:

- **DIRECT** → delegate fixes to the Implementor agent.
  - Maximum 2 automatic retry cycles.
  - If still failing after 2 retries: stop immediately and report to the user exactly what is failing, why it is failing, and what decision is needed from the user.
  - Never silently retry more than twice.
- **COLLATERAL** → delegate to the regression-analyst agent (.claude/agents/regression-analyst.md) at Opus, high effort. It evaluates the shared-component change and the architecture that let it cascade — it does not just patch the failing test.
  - Bounded to **one** auto-fix attempt, applied only inside the changed common component, only when the analyst is confident and the fault is the change (not the architecture).
  - It does **not** consume the DIRECT path's 2-retry budget — that cap applies to DIRECT failures only. COLLATERAL is escalation, not retry; never silently loop it.
  - If the fault is architectural, or the analyst is not confident, it STOPS and surfaces to the user immediately (General Rule 4 in CLAUDE.md) with the full blast radius — do not wait for a gate.
  - Never modify a failing test to make it pass — a regression is fixed at its cause.

### Automation Gate (runs after unit/integration tests pass)

Model: Haiku at low effort — this step classifies command output, not reasoning.

1. Attempt `npm run test:e2e`.
   - If `test:e2e` script does not exist in package.json: mark Automation Gate as **CI-ONLY** and proceed without blocking. Log: "E2E tests not bootstrapped — run Phase 5 E2E Test Writer first, or they will run in CI."
   - If the dev server cannot start (port conflict, missing env vars, config error): mark as **CI-ONLY** and proceed without blocking. Log the exact error so the user can investigate.
2. If the command runs, classify results by tag:
   - Any test tagged `@critical` that fails → **Automation Gate: FAIL**. Block Gate 2. Report exactly which critical tests failed and the failure output.
   - Any test tagged `@functional` that fails → **Automation Gate: CONDITIONAL PASS**. Surface these as named conditions alongside the Gate 2 Synthesis Review Report. Do not block.
   - Any test tagged `@non-blocker` that fails → log in `pipeline/reviews/automation-gate.md`. No gate impact.
3. **Run Regression Triage on every failing E2E test, before deciding the gate verdict.** A failing E2E test that has nothing to do with the current task must not be reported as a plain critical/functional failure until its cause is classified the same way unit/integration failures are:
   - **DIRECT** — the E2E test exercises the feature the current task built. Treat as a genuine gate failure per the tag rules above.
   - **COLLATERAL** — the E2E test is for an unrelated flow and a shared/common component changed this run and broke it. Delegate to the regression-analyst, same bounded path as the unit/integration COLLATERAL route (one auto-fix attempt inside the changed component; architectural fault → surface immediately). A COLLATERAL E2E regression is reported as a regression, not silently as a `@critical` gate FAIL.
   - **EXTERNAL** — the failure is an external factor, not the code: flaky test, dev server / port / env / network, missing browser binary, timeout. Mark the test **EXTERNAL** in `pipeline/reviews/automation-gate.md`, do not count it as a gate FAIL, and surface the exact error so the user can investigate (same spirit as the CI-ONLY fallback). Never let an environmental flake block Gate 2.
   Record each E2E failure's classification (DIRECT / COLLATERAL / EXTERNAL) in `pipeline/reviews/automation-gate.md` alongside the tag verdict.
4. Save all results to `pipeline/reviews/automation-gate.md`. Include the result in the Final Summary Report.
5. The Automation Gate itself runs exactly once per pipeline execution — there is no automatic retry loop. Regression Triage is classification (and, for COLLATERAL, the regression-analyst's single bounded auto-fix), not a retry loop. Fixing a genuine DIRECT critical E2E failure is a code or config change delegated to the Implementor by the user after Gate 2, not an automatic retry.

The standalone `/triage` command runs this Change-Scope & Blast-Radius
Validation + Regression Triage against already-failing tests, without
re-running earlier phases (see .claude/commands/triage.md).

---

## Phase 7.4 — Pipeline Retrospective (feature-full and above only)

A meta-review of **this pipeline run itself** — not the code. It improves the
pipeline over time. Lane-gated to keep it from undermining the efficiency it
exists to find:

- **Runs** for tasks **above medium**: feature-full, and the very-hard/epic
  split (HIGH **and** ≥3 tags). bugfix-unknown runs it only if it escalated to
  Opus diagnosis.
- **Skipped** for express, docs, bugfix-known, feature-fast, and any MEDIUM/LOW run.
- **Executed during the Gate-3 [1] APPROVE sequence**, after the PR is created
  and **before** `pipeline/` is deleted (it must read pipeline artifacts).

Mechanism — three parallel instances of the retrospective-reviewer agent
(.claude/agents/retrospective-reviewer.md), each spawned with a distinct
`bias`:
1. `bias=conservative` — change only what is clearly wasteful; default to keep.
2. `bias=medium` — balanced cost/quality tradeoff.
3. `bias=aggressive` — willing to add/remove agents, re-tier models, restructure
   phases for large gains.

Each reads pipeline/token-usage.md, progress.md, the gate history, and the
regression/blast-radius records, then proposes flow-change recommendations
(add/remove an agent, up/downgrade orchestrator or step model/effort, merge or
split a phase) with quality / time / token impact and per-complexity-tier
effect. "No change needed" is a valid output.

The orchestrator (Opus) synthesises the three biased reports into ONE
recommendation set (or "no change"). Output is **advisory only — it never
auto-edits CLAUDE.md or any agent file**; a human approves any pipeline change
separately. The synthesis is persisted to
`docs/pipeline-retros/<date>-<slug>.md` (outside `pipeline/`, so it survives
the Gate-3 cleanup) and summarised in the PR Delivery Summary.

---

## Phase 7 — Final Review and Submit

Check:
- All tasks completed?
- All Critical and High security findings resolved?
- All tests passing?
- Documentation updated?
- Collated epic document written?

Before the Final Summary Report, delegate to the Epic Doc Writer agent (.claude/agents/epic-doc-writer.md) to produce the collated epic/large-chunk delivery document at docs/epics/<epic-slug>.md — what was done, how it helps, limitations/tradeoffs and why, the tests the AI ran, manual test cases for humans, and security/risk notes. It reads pipeline artifacts read-only and never writes TODO.md or pipeline/progress.md. Trigger it on demand via /epic-doc when a large chunk completes mid-pipeline, not only at the end.

Produce the Final Summary Report, then hand it to the Translator agent (.claude/agents/translator.md) for a plain-English pass before presenting (preserve the resolved-findings counts, accepted risks, and the final recommendation verbatim).

HUMAN GATE 3: Present the translated Final Summary Report (see output-formats.md), then immediately display the approval block below. Do not proceed until the user makes an explicit choice.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE 3 — ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Choose one option:

  [1] APPROVE
      Generates the PR, runs the retrospective (feature-full+),
      cleans up pipeline/, done.

  [2] REQUEST CHANGES
      You will be asked for the reason. Pipeline continues.

  [3] REJECT
      You will be asked for the reason. Pipeline halts.

Reply with 1, 2, or 3.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**On [1] APPROVE — execute in this exact order:**

Step 1 — Generate the PR description from pipeline files (see output-formats.md → PR Description). This is the only time the pipeline files are read for this purpose.

Step 2 — Create the PR via the GitHub MCP tool (mcp__github__create_pull_request) using the generated PR description, if that tool is available in this session; otherwise use `git` directly and tell the user the PR must be opened manually. Base branch: main (or the project's default branch).

Step 3 — Run Phase 7.4 Pipeline Retrospective (only if the lane qualifies — feature-full and above; otherwise skip this step). The 3-bias team + Opus synthesis runs here, while `pipeline/` still exists. Persist the synthesis to `docs/pipeline-retros/<date>-<slug>.md` and commit it.

Step 4 — Clean up all pipeline working state (only after the retrospective has read and persisted what it needs):
  a. Delete the entire `pipeline/` directory (risk_manifest.json, progress.md, token-usage.md, qa-checklist.md, tasks/, reviews/, diagnosis.md, context-pack.md — everything).
  b. Delete `TODO.md` from the repository root.
  c. Commit with message: `chore: clean up pipeline working state after Gate 3`.

Step 5 — Display the PR Delivery Summary in the Claude UI (see output-formats.md → PR Delivery Summary), including the retrospective outcome when it ran. This is what the user sees after approval — the same information that is in the PR description, shown in the session.

**On [2] REQUEST CHANGES:**
Ask: "What needs to change before this is ready?" Wait for the answer. Address the specific feedback, then re-run the affected phases and return to Gate 3.

**On [3] REJECT:**
Ask: "What is the reason for rejection?" Record the reason in a brief halt summary (what was completed, what was rejected, why). Do not delete pipeline/ — leave working state intact so the session can be resumed.

This cleanup is only permitted after explicit Gate 3 [1] APPROVE. Never delete pipeline/ on any other path.
