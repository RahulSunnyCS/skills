# Pipeline Workflows

A single-page map of how `claude-web-dev-skills` runs. The orchestrator
(`CLAUDE.md`) routes every task through **one adaptive lane**. The lane decides
*how deep* each phase runs — phase definitions never change, only their depth,
model, and which gates collapse.

> All diagrams below reflect `web-dev/template/CLAUDE.md` plus the phase
> detail split into `web-dev/template/.claude/pipeline/*.md` (the canonical
> orchestrator — this is what `init`/`sync` actually install). If you change a
> phase or lane there, update this file in the same commit.

---

## 1. The full pipeline (feature-full — the default & fail-safe)

```mermaid
flowchart TD
    A[Task arrives] --> P0[Phase 0 · Triage<br/>Haiku · risk + lane + tags]
    P0 --> P05{Phase 0.5<br/>Intent Extraction?<br/>optional · /grill-me}
    P05 -->|HIGH / ambiguous| P05a[Interview one Q at a time]
    P05 -->|trivial| P1
    P05a --> P1
    P0 -.bugfix-unknown only.-> P07[Phase 0.7 · Diagnosis<br/>Sonnet · read-only · root cause]
    P07 --> P1
    P1[Phase 1 · Planning<br/>Opus/max · Red Team loop xN<br/>+ QA Planner] --> G1{{HUMAN GATE 1<br/>translated Plan Report}}
    G1 -->|approved| P2[Phase 2 · Decomposition<br/>Opus · atomic task contracts]
    G1 -->|stop| STOP[Halt + summarise]
    P2 --> P3[Phase 3 · Parallel Implementation<br/>Implementor agents · scoped]
    P3 --> P4[Phase 4 · Consolidated Review<br/>senior-software-engineer Opus<br/>escalates to security-auditor if needed]
    P4 --> G2{{HUMAN GATE 2<br/>translated Synthesis Review}}
    G2 -->|approved| P5[Phase 5 · Test Generation<br/>unit · integration · e2e · docs<br/>+ Blast-Radius Validation]
    G2 -->|stop| STOP
    P5 --> P6[Phase 6 · Test Execution Loop<br/>Regression Triage · max 2 retries<br/>Automation Gate · regression-analyst]
    P6 --> P7[Phase 7 · Final Review<br/>Opus · Epic Doc Writer<br/>+ Retrospective Reviewer ×3]
    P7 --> G3{{HUMAN GATE 3<br/>translated Final Summary}}
    G3 -->|approved| CLEAN[Delete pipeline/ + TODO.md<br/>keep docs/epics/&lt;slug&gt;.md]
    G3 -->|stop| STOP
```

The three **Human Gates** are hard stops. The orchestrator never pre-generates
the next phase or proceeds without an explicit yes.

---

## 2. Triage → which lane?

Phase 0 picks the lane against a fixed rubric. The **lane fail-safe** is
non-negotiable: HIGH risk *or* any `risk_flag` (auth, pii, payment,
public-facing API, admin, file upload / user content) ⇒ `feature-full`,
regardless of how small the change looks.

```mermaid
flowchart TD
    T[Phase 0 Triage] --> RF{HIGH risk OR<br/>any risk_flag?}
    RF -->|yes| FF[feature-full<br/>full pipeline · all gates · security-auditor Opus/max]
    RF -->|no| K1{Zero executable code touched?<br/>pure prose / doc-comment}
    K1 -->|yes| DOC[docs lane]
    K1 -->|no| K2{Trivial code:<br/>typo / rename / config bump?<br/>no logic change}
    K2 -->|yes| EXP[express lane]
    K2 -->|no| K3{Is it a bug?}
    K3 -->|"yes · known cause"| BK[bugfix-known]
    K3 -->|"yes · unknown cause"| BU[bugfix-unknown<br/>runs Phase 0.7 Diagnosis first]
    K3 -->|"no · small / design exists"| FFA[feature-fast<br/>exactly 1 Red Team sprint]
    K3 -->|"no · novel / cross-cutting"| FF
```

**Rule of thumb:** when uncertain between two lanes, pick the heavier one. A
lane may only *reduce* ceremony for genuinely low-risk work — it can never
strip a security gate.

---

## 3. What each lane actually runs

| Lane | 0.5 | 0.7 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5–7 | Human Gates | Model |
|---|---|---|---|---|---|---|---|---|---|
| **express** | – | – | – | – | direct edit | – | – (lint+test only) | **1 merged** | Haiku |
| **docs** | – | – | – | – | direct edit | – | – (lint only) | **1 merged** | Haiku |
| **bugfix-known** | – | – | 1-para plan, no Red Team | 1 task | scoped | risk-gated | regression test | 1 / 2 / 3 | Haiku/Sonnet |
| **bugfix-unknown** | – | ✅ Diagnosis | targets root cause, 1–2 sprints | ✅ | scoped | **full** | regression test | 1 / 2 / 3 | Sonnet→ |
| **feature-fast** | opt | – | **1** Red Team sprint | ✅ | ✅ | risk-gated | ✅ | 1 / 2 / 3 | per table |
| **feature-full** | opt | – | `sprint_count` sprints | ✅ | ✅ | **full** | ✅ | 1 / 2 / 3 | per table |

`docs` is for PURELY documentation/prose/doc-comment edits with zero
executable-code change — it mirrors `express` exactly, just without the test
run. Gate-collapse: **only** the `express` and `docs` lanes merge the three
Human Gates into one lightweight, Translator-passed confirmation — permitted
ONLY when risk_level is LOW and no risk_flag is set (and, for `docs`, zero
executable code is touched). Every other lane keeps all three gates. The gate
is *merged, never skipped* — the human still explicitly approves once.

---

## 4. Fast lane — express

```mermaid
flowchart LR
    A[Trivial change] --> T[Triage<br/>LOW risk · no risk_flag]
    T --> EX[express lane]
    EX --> E[Haiku applies edit<br/>npm run lint + test]
    E --> G{{Single merged gate<br/>Translator-passed}}
    G -->|approved| DONE[Done — no Phase 4/5/6/7]
```

The express lane stops a typo or config bump from dragging the full 7-phase /
15-agent machinery (~300–600k tokens) when ~5–20k will do.

---

## 5. Bug lanes — known vs unknown

```mermaid
flowchart TD
    B[Bug reported] --> Q{Root cause<br/>known? clean repro?}
    Q -->|yes| BK[bugfix-known]
    Q -->|no| BU[bugfix-unknown]
    BK --> BK1[Phase 1: one-paragraph fix plan<br/>no Red Team loop]
    BK1 --> BK2[Gate 1 light · 1 task · implement]
    BK2 --> BK3[Phase 5: regression test<br/>fails before fix, passes after]
    BK3 --> BKG[Gates 2 / 3]
    BU --> BU0[Phase 0.7 Diagnosis<br/>read-only · confirmed root cause + blast radius]
    BU0 --> BUq{Root cause<br/>confirmed?}
    BUq -->|no| BUSTOP[STOP — report to user<br/>never plan a speculative fix]
    BUq -->|yes| BU1[Phase 1 targets confirmed cause]
    BU1 --> BU2[Full Phase 4 · side-effect risk]
    BU2 --> BU3[Mandatory regression test]
    BU3 --> BUG[Gates 1 / 2 / 3]
```

---

## 6. Phase 4 — Consolidated review

Phase 4 now runs a single **senior-software-engineer** (Opus) covering security,
performance, and architecture in one pass. It emits an explicit escalation
verdict at the end of its report:

- **OPUS DEEP-DIVE: REQUIRED** — when `risk_level` is HIGH or any `risk_flag`
  is set (auth, pii, payment, public API, admin, file upload). The
  `security-auditor` then runs a focused deep-dive using the senior reviewer's
  brief. This path is non-negotiable — the fail-safe cannot be skipped.
- **OPUS DEEP-DIVE: NOT REQUIRED** — discretionary, only when no `risk_flag`
  is set and risk is below HIGH. The consolidated report stands as the full
  Phase 4 output.

This replaces the three separate parallel specialist agents for all lanes up
to and including feature-full.

---

## 7. Conditional specialists (tag-gated)

Extra reviewers only join when Triage sets the matching tag — cost scales with
task size, not a fixed roundtable. `auth` / `pii` / `payment` are
**risk_flags** (not tags): they already make the `security-auditor` mandatory
in Phase 4.

```mermaid
flowchart LR
    TG[risk_manifest.tags] --> PR{pricing?}
    TG --> FE{frontend?}
    TG --> BE{backend?}
    TG --> IN{infra?}
    TG --> PD{product?}
    PR -->|set| PRa[pricing-reviewer<br/>Phase 1 + Phase 4]
    FE -->|set| AR1[architecture-reviewer<br/>frontend lens]
    BE -->|set| AR2[architecture-reviewer<br/>backend lens]
    IN -->|set| AR3[architecture-reviewer<br/>infra lens]
    PD -->|set| OB[business lens via<br/>.claude/project/business.md]
```

`.claude/project/` scope-down notes are **authoritative**: if a project
declares an optional specialist Not-Applicable, Triage hard-skips it every run
without re-deliberating — but it can never skip a mandatory security gate.

---

## Slash-command entry points

| Command | Enters at |
|---|---|
| `/start` | Repository Assessment (pre–Phase 0) |
| `/plan` | Phase 0 Triage + Phase 1 → Gate 1 |
| `/implement` | Phase 2 + Phase 3 |
| `/review` | Phase 4 → Gate 2 |
| `/test` | Phase 5 + Phase 6 |
| `/fix` | Phase 6 only (drive failing tests green) |
| `/triage` | Phase 6 Regression Triage + Blast-Radius Validation (standalone) |
| `/grill-me` | Phase 0.5 Intent Extraction |
| `/diagnose` | Phase 0.7 Diagnosis (read-only) |
| `/qa-plan` | Phase 1 QA Planner (on demand) |
| `/epic-doc` | Phase 7 Epic Doc Writer (on demand) |
| `/setup-project` | Populate `.claude/project/` |
