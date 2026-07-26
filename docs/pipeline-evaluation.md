# Pipeline Evaluation & Token Optimization

Evaluation of `claude-web-dev-skills` — correctness findings, token-cost
analysis, and a prioritised change set for reducing token consumption **without
reducing quality**.

Every claim below was verified against the source tree; the evidence column
names the file and line.

---

## 1. Executive summary

Three findings dominate:

1. **The pipeline that ships is not the pipeline that is documented.**
   `README.md`, the root `package.json`, and `docs/workflows/README.md` all
   describe a 15-agent / 12-command pipeline. `init` and `sync` install
   `web-dev/template/`, which has **12 agents and 11 commands** and none of the
   advertised features. The 15/12 pipeline exists in the repo — at
   `web-dev/skills/web-dev/` — but nothing installs it.

2. **The dominant token cost is structural, not behavioural.** `CLAUDE.md` is
   41 KB (~10k tokens). With the three `@import`ed project files the preamble is
   **~12k tokens injected into every agent delegation**. A feature-full run makes
   ~20–25 delegations, so **~240k tokens** go to preamble — and ~95% of it (phase
   machinery, output formats, effort tables, token-log rules) is irrelevant to an
   implementor writing a function or a reviewer reading a diff.

3. **The fork already solved two of the biggest behavioural wastes.**
   `web-dev/skills/web-dev/CLAUDE.md` contains a Shared Context Pack and a
   Consolidated Phase-4 Review. Both are proven there and only need porting.

Estimated saving from the full change set: **~250–350k tokens on a typical
feature-full run**, with no security gate weakened and no Human Gate removed.

---

## 2. Correctness findings

| # | Finding | Evidence |
|---|---|---|
| B1 | Docs advertise 15 agents + 12 commands; the template ships **12 + 11** | `README.md:31,47` vs `ls web-dev/template/.claude/{agents,commands}` |
| B2 | The two `package.json` files disagree on the same fields | root: "15 specialist agents, 12 slash commands"; `web-dev/package.json`: "12 agents, 11 slash commands" |
| B3 | `docs/workflows/README.md` diagrams a pipeline that is never installed | it references `senior-software-engineer`, `Retrospective Reviewer ×3`, `regression-analyst`, Blast-Radius Validation — none exist in `web-dev/template/`. Line 8 even declares the fork "the canonical orchestrator" |
| B4 | **`Repository Assessment Report (format defined below)` is never defined below** | `CLAUDE.md:50` is the *only* occurrence of the phrase in the file. The three Output Format blocks cover Plan / Synthesis / Final only. `/start` has no output contract |
| B5 | The express lane runs `npm run test`, which does not exist here and is assumed in consumers | `CLAUDE.md:170`; `web-dev/package.json` defines only `lint`, `setup`, `skill:import` |
| B6 | Root `package.json` has no `scripts` block — `npm run lint` fails from the repo root | root `package.json` (`scripts` is `undefined`) |
| B7 | `sprint_count` is never derived — hardcoded `3` and consumed literally | set at `CLAUDE.md:110`, consumed at `CLAUDE.md:324`. Every feature-full run pays 3 Opus/max Red Team sprints unconditionally |
| B8 | Zero tests for `lib/sync.js`, and no CI workflow | `lib/sync.js` has real logic — sha256 drift detection, idempotent `init`, sync conflict prompts, non-TTY default-to-NO. No `.github/` directory exists |

### Design observations

- **The single-writer ledger contract is sound.** The orchestrator owns
  `TODO.md`; agents read it but never write it. Preserve this through any
  refactor — it is what makes parallel Phase 3 safe.
- **The security fail-safes are well constructed.** The Phase-0 lane fail-safe
  and "no lane can gate out the security-auditor" are the right shape. Every
  recommendation below is designed not to touch them.
- **`.claude/project/` scope-down is a genuinely good mechanism** and is already
  applied correctly here (`pricing-reviewer` and `e2e-test-writer` marked N/A for
  a CLI with no billing and no UI).
- **Root `.claude/` and `CLAUDE.md` are byte-identical to `web-dev/template/`**
  (verified with `diff -rq`). Correct dogfooding, but it means any repo-wide scan
  pays for the same payload twice.

---

## 3. Token analysis

### Where the tokens go in a feature-full run

| Source | Est. cost | Avoidable? |
|---|---|---|
| `CLAUDE.md` + project files × ~20 delegations | **~240k** | ~175k — yes, structurally |
| Red Team, 3 × Opus/max sprints | **~150k** | ~50–100k — yes, via a convergence gate |
| Phase 4: three reviewers each reading the diff and repo cold | **~60–90k** | 40–60% — yes, consolidate |
| Every Phase 3/5/6 agent re-discovering the repo from cold | **variable, large** | yes — Shared Context Pack |
| `/start`: "read every file in the repository" | 371 KB here (~90k); unbounded in a real web app | yes — bounded assessment |
| `pipeline/token-usage.md` bookkeeping — 18 references in `CLAUDE.md`, a read+write per delegation, to record *hardcoded estimates* | small, but pure waste | yes |

**Caveat, stated plainly:** these are file-size-derived estimates, not measured
token counts, and prompt caching absorbs part of the repeated preamble. The
structural fix is still correct — it reduces tokens that are read and attended
to on every cold subagent start, which caching does not undo.

### Measured `CLAUDE.md` section sizes

Used to guide the split in R1:

```
Phase 0 Triage                    70    Effort Levels & Model Versions   57
Phase 1 Planning                  65    Output: Plan Report              51
Conditional Specialists           58    Output: Final Summary Report     51
Adaptive Lanes                    44    Output: Synthesis Review         28
Phase 4 Specialist Review         36    Pipeline Token Log               26
Phase 2 Decomposition             34    Human Gate Rules                 27
```

---

## 4. Recommendations, in priority order

### R1 — Split `CLAUDE.md` (largest win, zero quality cost)

Thin `CLAUDE.md` to ~120 lines: project `@import`s, Identity, the lane table,
the single-writer ledger contract, General Rules, and a pointer index. Move
everything else into `.claude/pipeline/*.md`, read on demand **by the
orchestrator only**: `phases.md`, `lanes.md`, `specialists.md`,
`output-formats.md`, `models.md`.

Use `.claude/pipeline/`, **not** `docs/pipeline/`. The existing loop at
`lib/sync.js:133` then becomes:

```js
for (const area of ['agents', 'commands', 'pipeline'])
```

and the whole copy + drift path is reused unchanged — no new logic.

**Tradeoff to accept consciously:** those files inherit the agents/commands
contract (overwritten unconditionally, not to be edited locally), and the
`claude_md_sha256` marker then covers a smaller share of the payload. Drift on
the moved sections is still detected by `sync`'s content comparison, but the
local-edit *conflict prompt* only guards `CLAUDE.md`.

**Est. ~175k tokens saved per feature-full run.** Quality is unaffected: the
orchestrator still reads the full spec, once, instead of shipping it to twenty
agents that never use it.

### R2 — Replace the fixed `sprint_count` with a convergence gate

Run Red Team sprint 1. Run a further sprint **only if** that sprint produced
≥1 Critical/High finding **or** the internal score is <8. Cap at 3.

This is strictly safer than the status quo: a weak plan still gets all three
sprints, while a converged plan stops paying for sprints that restate findings
already folded in. Fixes B7. **Est. ~50–100k saved** on typical runs.

### R3 — Port the fork's Consolidated Phase-4 Review and its escalation protocol

One `senior-software-engineer` Opus pass covering security + performance +
architecture, emitting an explicit `OPUS DEEP-DIVE: REQUIRED | NOT REQUIRED`
verdict with rationale.

Keep the fork's escalation rule **verbatim**: when any risk_flag is set (auth,
pii, payment, public-facing API, admin, file upload, user-generated content) or
risk_level is HIGH, a standalone `security-auditor` Opus/max deep-dive **always**
runs — scoped to the senior agent's findings rather than a cold full audit. No
lane and no senior-agent verdict can downgrade it.

Keep the dedicated three-reviewer split for the very-hard/epic case (HIGH + ≥3
tags) and for `bugfix-unknown`, where side-effect risk justifies the cost.

Three cold full-context reads collapse to one. **Est. 40–60% of Phase 4.**

### R4 — Port the fork's Shared Context Pack

Build `pipeline/context-pack.md` once after Gate 1 — changed-file list and diff
against base, the task map, an already-implemented manifest, and the relevant
`.claude/project/` facts — and pass it by reference into every Phase 3/4/5/6
delegation. Agents stop re-discovering the repository from cold. Same
single-writer rule as `TODO.md`; deleted with `pipeline/` at Gate-3 cleanup.

### R5 — Bound `/start`, and define its missing output format

Replace "read every file in the repository" with a bounded assessment:
manifests and config, the directory tree, entry points, `.claude/project/*`,
then targeted reads driven by what those reveal. Explicitly skip generated
artifacts (here: root `.claude/` and `CLAUDE.md`).

Then **write the Repository Assessment Report format** that `CLAUDE.md:50`
promises but never defines. This fixes B4 and gives `/start` a bounded,
predictable output instead of an open-ended repo dump.

### R6 — Retire the token log (minor)

`pipeline/token-usage.md` spends tokens recording hardcoded *estimates* that
`/cost` reports exactly. Either cut it and point the Phase-7 report at `/cost`,
or reduce it to a single blind append with no read-back.

---

## 5. Follow-up change set

Sequenced for a later session:

1. **Promote the fork into `web-dev/template/`** — port
   `senior-software-engineer`, `regression-analyst`, `retrospective-reviewer`,
   `/triage`, the qa-planner State×Display Matrix rule, the Shared Context Pack,
   the Consolidated Review, Phase 4.5 Bounded Fix Cycle, and Phase 7.4
   Retrospective.
2. **Apply R1's split** to the promoted template, plus the R2, R5 and R6 edits.
3. **`lib/sync.js`** — add `pipeline` to the copy-areas loop (`lib/sync.js:133`).
4. **Reconcile the metadata** — one agent/command count, correct in both
   `package.json` files and `README.md`; re-point `docs/workflows/README.md:8` at
   the template; add a root `scripts.lint`.
5. **Re-dogfood** — run `init`/`sync` to regenerate root `.claude/` and
   `CLAUDE.md`.
6. **Close B8** — a `node:test` suite for `lib/sync.js` and a CI workflow running
   `lint`, `test`, and `sync --check`. `node:test` is built in, so the deliberate
   zero-dependency constraint is preserved.

---

## 6. What is deliberately not changed

- The three Human Gates.
- The Phase-0 lane fail-safe (HIGH risk or any risk_flag ⇒ `feature-full`).
- The rule that the security-auditor runs on Opus and can never be gated out by
  a lane.
- The single-writer contract for `TODO.md` and the context pack.
- The zero-runtime-dependency constraint.
