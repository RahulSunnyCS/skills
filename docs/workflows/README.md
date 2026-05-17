# Pipeline Workflows

A single-page map of how `claude-web-dev-skills` runs. The orchestrator
(`CLAUDE.md`) routes every task through **one adaptive lane**. The lane decides
*how deep* each phase runs — phase definitions never change, only their depth,
model, and which gates collapse.

> All diagrams below reflect `web-dev/template/CLAUDE.md` (the canonical
> orchestrator). If you change a phase or lane there, update this file in the
> same commit.

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
    P3 --> P4[Phase 4 · Parallel Specialist Review<br/>security-auditor Opus/max<br/>+ perf + architecture]
    P4 --> G2{{HUMAN GATE 2<br/>translated Synthesis Review}}
    G2 -->|approved| P5[Phase 5 · Test Generation<br/>unit · integration · e2e · docs]
    G2 -->|stop| STOP
    P5 --> P6[Phase 6 · Test Execution Loop<br/>max 2 retries · Automation Gate]
    P6 --> P7[Phase 7 · Final Review<br/>Opus · Epic Doc Writer]
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
    RF -->|no| K1{Pure docs / prose /<br/>template-text only?<br/>zero executable code}
    K1 -->|yes| DOCS[docs lane]
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
| **docs** | – | – | – | – | direct edit | – | – (lint if applicable) | **1 merged** | Haiku |
| **bugfix-known** | – | – | 1-para plan, no Red Team | 1 task | scoped | risk-gated | regression test | 1 / 2 / 3 | Haiku/Sonnet |
| **bugfix-unknown** | – | ✅ Diagnosis | targets root cause, 1–2 sprints | ✅ | scoped | **full** | regression test | 1 / 2 / 3 | Sonnet→ |
| **feature-fast** | opt | – | **1** Red Team sprint | ✅ | ✅ | risk-gated | ✅ | 1 / 2 / 3 | per table |
| **feature-full** | opt | – | `sprint_count` sprints | ✅ | ✅ | **full** | ✅ | 1 / 2 / 3 | per table |

Gate-collapse: **only** the `express` and `docs` lanes merge the three Human
Gates into one lightweight, Translator-passed confirmation — permitted ONLY
when risk_level is LOW, no risk_flag is set, and (for docs) zero executable
code is touched. Every other lane keeps all three gates. The gate is *merged,
never skipped* — the human still explicitly approves once.

---

## 4. Fast lanes — express & docs

```mermaid
flowchart LR
    A[Trivial change] --> T[Triage<br/>LOW risk · no risk_flag]
    T --> D{Executable<br/>code touched?}
    D -->|no · prose only| DO[docs lane]
    D -->|yes · trivial| EX[express lane]
    DO --> E[Haiku applies edit]
    EX --> E2[Haiku applies edit<br/>npm run lint + test]
    E --> G{{Single merged gate<br/>Translator-passed}}
    E2 --> G
    G -->|approved| DONE[Done — no Phase 4/5/6/7]
```

These exist to stop a typo or a README tweak from dragging the full 7-phase /
12-agent machinery (~300–600k tokens) when ~5–20k will do.

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

## 6. Conditional specialists (tag-gated)

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
| `/grill-me` | Phase 0.5 Intent Extraction |
| `/diagnose` | Phase 0.7 Diagnosis (read-only) |
| `/qa-plan` | Phase 1 QA Planner (on demand) |
| `/epic-doc` | Phase 7 Epic Doc Writer (on demand) |
| `/setup-project` | Populate `.claude/project/` |
