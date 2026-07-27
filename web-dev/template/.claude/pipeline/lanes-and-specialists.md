# Adaptive Lanes & Conditional Specialists

Referenced from CLAUDE.md. Read this file when Phase 0 Triage needs to select
a lane, or when Phase 1/4 needs to know which conditional specialists apply.
Do not read it preemptively for phases that don't need it.

---

## Adaptive Lanes (Triage-selected — fail-safe to feature-full)

The lane set in Phase 0 right-sizes the pipeline to the task. Phase
*definitions* never change — the lane only sets how deep each phase runs,
which model, how many Red Team sprints, and which Phase-4 reviewers fire. The
Phase-0 lane fail-safe governs everything here: HIGH risk or any risk_flag ⇒
feature-full, no exceptions.

- **express** — skip Phase 0.5 / 1 / 2; Haiku implements directly; run
  `npm run lint` + `npm run test`; no Phase 4; no Phases 5–7. The three Human
  Gates collapse into ONE lightweight, Translator-passed confirmation (see
  Human Gate Rules in CLAUDE.md). Permitted ONLY when risk_level is LOW and no
  risk_flag.
- **docs** — for changes that are PURELY documentation / prose / template-text
  / doc-comment edits with ZERO executable-code or logic change (e.g. README,
  agent/command markdown, doc comments); if any code/logic is touched, this
  lane does NOT apply. Skip Phase 0.5 / 1 / 2; Haiku applies the edit directly;
  run a lightweight lint check if applicable (e.g. `npm run lint`); no Phase 4
  (no code-logic surface); no Phases 5–7 test generation — mirrors the express
  lane exactly. The three Human Gates collapse into ONE lightweight,
  Translator-passed confirmation. The human still explicitly approves once;
  the gate is merged, never skipped. Permitted ONLY when risk_level is LOW, no
  risk_flag is set, and zero executable code is touched.
- **bugfix-known** — skip Phase 0.5; Phase 1 is a one-paragraph fix plan with
  NO Red Team loop and no score gate; light translated Gate 1; one scoped
  task contract; implement on Haiku (Sonnet if logic is non-trivial); Phase 4
  risk-gated; Phase 5 MUST add a regression test that fails before the fix and
  passes after; Gates 1/2/3 all kept.
- **bugfix-unknown** — Phase 0.7 Diagnosis runs first (see phases.md); then
  Phase 1 targets the *confirmed* root cause (sprint_count may drop to 1–2);
  full Phase 4 (a non-obvious fix can have side effects — always the dedicated
  specialist set, never the consolidated reviewer); mandatory regression test;
  Gates 1/2/3 all kept.
- **feature-fast** — Phase 0.5 grill-me optional; Phase 1 runs exactly ONE
  Red Team sprint (still scored, still Translator-passed); full Gate 1;
  Phase 2 decomposition; Phase 4 risk-gated; Phases 5–7 normal; Gates 1/2/3
  all kept.
- **feature-full** — the full pipeline exactly as documented in phases.md.
  Unchanged. This is the default and the fail-safe target.

**Default lane for MEDIUM / no-flag work:** When risk_level is MEDIUM and no
risk_flag applies, default to **feature-fast** unless `lane_rationale` in
risk_manifest.json states a concrete reason to go heavier. "feature-full is
the default" applies only when the heavier lane is genuinely justified — not
as a silent fallback. If you cannot write a concrete escalation reason, use
feature-fast.

The Phase-1 Optional Recommendations block applies only to feature-fast and
feature-full. It is suppressed for express, docs, and the bugfix lanes (a
targeted fix or a pure-prose edit must not attract scope-expanding
suggestions) unless the user explicitly asks for recommendations.

---

## Conditional Specialists (tag-gated — do not spin up unless the tag is set)

risk_manifest.tags decide which extra specialists participate, and in which
phase. If a tag is absent, its specialist does NOT run — cost scales with
task size, not a fixed roundtable.

| Tag      | Specialist                                              | Phase(s)                              | Mechanism        |
|----------|---------------------------------------------------------|---------------------------------------|------------------|
| pricing  | pricing-reviewer (.claude/agents/pricing-reviewer.md)   | Phase 1 constraints + Phase 4 review  | dedicated agent  |
| frontend | senior-software-engineer / architecture-reviewer, frontend lens emphasised | Phase 4         | instruction only |
| backend  | senior-software-engineer / architecture-reviewer, backend lens emphasised  | Phase 4         | instruction only |
| infra    | senior-software-engineer / architecture-reviewer, infra lens emphasised    | Phase 4         | instruction only |
| product  | product/business lens by the orchestrator via .claude/project/business.md | Phase 1             | no agent         |

auth / pii / data are risk_flags (not tags): they already make the
security-auditor mandatory in Phase 4 — unchanged.

Rules:
- Never add a standing agent for frontend/backend/infra — the consolidated
  reviewer (or, at the very-hard/epic split, the dedicated architecture-reviewer)
  applies the relevant lens. Only pricing has a dedicated agent (Stripe tiers,
  PAYMENT_TEST_FLOW-style checklists are specific enough to need one).
- Conditional specialists run inside the existing phases and BEFORE the
  relevant Human Gate. They never bypass, replace, or pre-empt a gate.
- **Project scope-down is authoritative (no re-deliberation):** if
  `.claude/project/` context explicitly declares one or more optional
  specialists as Not-Applicable for this project (e.g. a "Pipeline Scope" or
  scope-down note), Triage MUST hard-skip those specialists on every run — it
  does NOT re-evaluate whether they might apply this time. This rule exists to
  prevent repeated deliberation over agents that the project owner has already
  reasoned about and ruled out. Safety constraints: (a) scope-down can only
  REMOVE optional/conditional specialists — it can never skip the
  security-auditor when risk_level is HIGH or any risk_flag is set, and the
  Phase-0 lane fail-safe still governs; (b) if the user explicitly requests a
  skipped specialist on a given run, honor that request for that run only (it
  is not a permanent reversal of the scope-down).

**Honour project scope-down guidance:** before Phase 0 finalises tags and
mandatory_agents, read any scope-down / "Pipeline Scope" notes in
`.claude/project/`. If those notes declare specific optional specialists as
Not-Applicable for this project, remove those specialists from the active set
— do not re-deliberate them. This applies to conditional / optional
specialists only; it never removes a mandatory security gate.

### Bounded Phase-1 Constraint Round (opt-in escalation)

For a genuinely large, novel, cross-cutting epic — risk_level HIGH **and**
≥3 tags set (or an explicit user request) — run exactly ONE constraint round
before the Red Team scoring step and before Human Gate 1:

- The orchestrator collects ONE short written constraint memo from each
  *tagged* conditional specialist: pricing-reviewer (pricing);
  the senior-software-engineer agent in Phase-1 constraint-only mode
  (frontend/backend/infra); product/business lens via
  .claude/project/business.md (product).
- No inter-agent messaging — specialists never see or reply to each other.
- The orchestrator (Opus) is the sole synthesiser; it folds the memos into
  the plan, then the normal tri-stance Red Team loop continues.

Hard caps: exactly one round, no debate, single synthesiser, Human Gate 1
unchanged. Cost = (number of tagged specialists) × one memo. If the trigger
is not met, this round does not run.

**very-hard / epic split:** the same trigger (risk_level HIGH and ≥3 tags)
also switches Phase 4 from the consolidated reviewer to the three dedicated
specialists in parallel — see phases.md → Phase 4.
