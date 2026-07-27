# Output Formats

Referenced from CLAUDE.md. Read the section you need immediately before
producing that report — do not read this whole file up front.

---

## Repository Assessment Report (`/start`, pre–Phase 0)

**Bounded read, not a full-repo dump.** "Read every file in the repository"
does not scale past a small project and burns tokens without adding signal.
Instead:

1. Read manifests and config: `package.json` (or the language equivalent),
   lockfiles' presence (not contents), `.github/workflows/`, linter/formatter
   config, `.env.example` if present.
2. Read the directory tree (one or two levels deep) to see the top-level
   shape — do not recurse into every subdirectory.
3. Read entry points: the files the manifests point to (`main`, `bin`,
   `scripts`), plus any obvious `index`/`app`/`main` file at the root of each
   top-level area.
4. Read `.claude/project/overview.md`, `business.md`, `technical.md` if they
   exist — they already contain curated facts; do not re-derive what they say.
5. From what 1–4 reveal, do a small number of **targeted** reads — the files
   that answer a genuine open question (e.g. "what does the build step do?"),
   not a systematic sweep.
6. Skip generated/dogfooded pipeline artifacts (a root `.claude/` + `CLAUDE.md`
   that mirrors `web-dev/template/` in this repo, or the equivalent in a
   consumer project) — they are the tool, not the product being assessed.

Produce:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPOSITORY ASSESSMENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT THIS PROJECT IS
[Plain English, 2-4 sentences — what it does, who uses it. Draw from
.claude/project/overview.md if present; otherwise infer from manifests/README.]

TECH STACK
[Language/framework, runtime, package manager, build/test/lint commands.]

HOW IT'S ORGANISED
[The handful of top-level areas and what lives in each — not a full file
listing.]

PIPELINE READINESS
.claude/project/ present : YES / NO / PARTIAL — [note any missing file]
Existing tests            : [framework found, or "none found"]
Existing CI                : [workflow found, or "none found"]
Version marker              : [.claude/.pipeline-version contents, or "not initialised"]

WHAT STANDS OUT
[Up to 5 bullets — notable strengths, risks, or gaps a senior engineer would
flag before starting work. This is orientation, not a full audit — save deep
findings for Phase 4.]

SUGGESTED STARTING POINT
[One or two sentences: what /plan or /diagnose would sensibly tackle first, or
"Ready — describe your first task with /plan."]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Wait for user approval before doing anything else (see CLAUDE.md → How to Start).

---

## Plan Report (Human Gate 1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLAN REPORT — Sprint [N] of [N]
Internal Quality Score: [X] / 10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT WE ARE BUILDING
[Plain English. No jargon. 4-6 sentences.]

WHAT COULD GO WRONG
Risk 1: [Name]
  What this means  : [Plain English — imagine explaining to a non-technical person]
  How likely       : High / Medium / Low
  Impact if it hits: [What breaks, what gets exposed, what gets lost]
  What we are doing: [Plain English defence]

[Repeat for every identified risk]

WHAT THE SYSTEM WILL DO
Task T-01: [Plain English]
Task T-02: [Plain English]
[etc.]

DECISIONS YOU NEED TO MAKE
□ [Specific binary or clear choice, e.g. "Should user sessions expire after 30 minutes or 8 hours?"]
□ [Another decision only if genuinely needed]

OPTIONAL RECOMMENDATIONS (AI-suggested — not in your original ask)
[Recommendation round N of 2 — omit this entire block once 2 rounds are used]
R1: [Name]
  What it is     : [Plain English]
  Value it brings: [Plain English]
  Tradeoff / cost: [Plain English — time, complexity, risk]
[Repeat per item; or "None — the plan already covers the high-value scope"]
(Accept any subset and we re-plan once with them folded in. Adding your own
 requirement is always allowed and is never capped.)

WHAT HAPPENS NEXT IF YOU APPROVE
[Exact next steps. No surprises.]

QA CHECKLIST SUMMARY
🔴 Critical    : [N] test cases — all must pass at Automation Gate for Gate 2
🟡 Functional  : [N] test cases — failures → CONDITIONAL PASS at Gate 2
🟢 Non-blocker : [N] test cases — logged only, no gate impact
(Full checklist: pipeline/qa-checklist.md)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## Synthesis Review Report (Human Gate 2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIALIST REVIEW REPORT
Verdict: PASS / CONDITIONAL PASS / FAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECURITY FINDINGS
🔴 Critical: [Finding — plain English explanation — what to do]
🟡 Medium  : [Finding — plain English explanation — what to do]
🟢 Low     : [Finding — plain English explanation — what to do]

PERFORMANCE FINDINGS
[Same format]

ARCHITECTURE FINDINGS
[Same format]

REGRESSION & BLAST-RADIUS (from pipeline/reviews/regression-analysis.md + blast-radius-validation.md)
🔴 Architectural-fault regression : [Finding — the coupling that let one change cascade — what to do]
🟡 Shared-component regression    : [Auto-fixed or surfaced — blast radius — what to do]
🟢 Unlinked / shared-ripple change: [Changed file with no clean task link — confirm intended]

CONFLICTS BETWEEN REVIEWERS
[Any disagreements between security, performance, and architecture — and your recommendation]

VERDICT EXPLANATION
[Why PASS, CONDITIONAL PASS, or FAIL — in plain English]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## Final Summary Report (Human Gate 3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL PIPELINE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPLETED
✅ [Task T-01 — what was done in plain English]
✅ [Task T-02 — what was done in plain English]

SECURITY SIGN-OFF
🔴 Critical findings resolved : [N]
🟡 Medium findings resolved   : [N]
🟢 Low findings resolved      : [N]
⚠️  Accepted risks             : [Any remaining, with explanation of why accepted]

TEST RESULTS
Unit tests        : [X passing / Y total]
Integration tests : [X passing / Y total]
E2E tests         : [X passing / Y total] | 🔴 [N] critical | 🟡 [N] functional | 🟢 [N] non-blocker
Automation Gate   : PASS / CONDITIONAL PASS / FAIL / CI-ONLY
Blast radius      : [N] changed files | [N] valid | [N] unlinked | [N] shared-ripple
Regressions       : [N] COLLATERAL | [N] auto-fixed | [N] SURFACED (architectural / unconfirmed)

TOKEN USAGE (from pipeline/token-usage.md)
Phase 0  Triage                    : haiku  · low    · ~[N]k tokens
Phase 1  Planning (×[N] sprints)   : opus   · max    · ~[N]k tokens
Phase 1  QA Planner                : sonnet · medium · ~[N]k tokens
Phase 2  Decomposition             : opus   · high   · ~[N]k tokens
Phase 3  [T-01: title]             : sonnet · high   · ~[N]k tokens
Phase 3  [T-02: title]             : sonnet · high   · ~[N]k tokens
[repeat one row per task/step from pipeline/token-usage.md]
Phase 4  Senior SW Engineer        : opus   · high   · ~[N]k tokens
Phase 4  Opus deep-dive (if it ran): opus   · max    · ~[N]k tokens
Phase 5  Tests + Docs + E2E        : sonnet · medium · ~[N]k tokens
Phase 6  Fix cycles (×[N])         : sonnet · high   · ~[N]k tokens
Phase 7  Final Review              : opus   · high   · ~[N]k tokens
──────────────────────────────────────────────────────────────
Total estimate : ~[N]k tokens
  Opus         : ~[N]k tokens
  Sonnet       : ~[N]k tokens
  Haiku        : ~[N]k tokens
Est. cost      : ~$[N]   (estimates only — see session /cost for exact billing)

FINAL RECOMMENDATION
[ ] READY TO MERGE
[ ] READY WITH CONDITIONS: [list conditions]
[ ] NOT READY: [list blockers]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## Blast-Radius Validation (pipeline/reviews/blast-radius-validation.md)

Written by the Change-Scope & Blast-Radius Validation step at the Phase 5→6 boundary.

```
BLAST-RADIUS VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base : [base branch / ref the diff is taken against]

| Changed file | Linked task | Classification |
|---|---|---|
| [path] | T-XX | valid |
| [path] | (none) | unlinked |
| [path] | T-XX (+ reaches T-YY, T-ZZ) | shared-ripple |

ESCALATED
- shared-ripple [path] → architecture-reviewer / senior-software-engineer (coupling lens)[ + regression-analyst if regression suspected]
- unlinked [path] → surfaced to user (no declared task)

SUMMARY
Changed files : [N]
valid         : [N]
unlinked      : [N]
shared-ripple : [N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regression Analysis Record (pipeline/reviews/regression-analysis.md)

Written by the regression-analyst — one block per COLLATERAL failure analysed
(appended, never overwritten in a run). Full per-block format is defined in
`.claude/agents/regression-analyst.md`:

```
REGRESSION ANALYSIS — [failing test name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Classification        : COLLATERAL (shared-component regression) | DIRECT (handed back)
Changed component     : [file:line — the common component that changed, and for which task]
Root cause            : [mechanism with file:line evidence — not a guess]
Blast radius          : [every test / flow / module the same change touches]
Is the change correct?: YES | NO | PARTIAL — [reasoning]
Architectural fault?  : YES | NO — [the coupling that let one change cascade, if any]
Action taken          : AUTO-FIXED (re-ran once, now passing) | SURFACED (no auto-fix)
Remediation           : [what was changed inside the common component, OR the
                         decision the user must make if surfaced]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## PR Description (generated at Gate 3 approval)

The PR description is built entirely from pipeline artifacts before they are
deleted. Read each source listed below and assemble the description in this
exact structure:

```
## What Was Built

[1–3 sentence plain-English summary of the feature or fix, derived from pipeline/progress.md and the task titles in pipeline/tasks/T-XX.json]

### Tasks completed
- T-01: [title from T-XX.json — one sentence on what it does]
- T-02: [repeat for every task]

---

## How AI Verified This

### Specialist reviews
- **Security** — [N] critical, [N] medium, [N] low findings. All critical and high resolved. [List any accepted risks verbatim from pipeline/reviews/]
- **Performance** — [summary]
- **Architecture** — [summary]

### Tests
| Suite | Result |
|---|---|
| Unit tests | [X passing / Y total] |
| Integration tests | [X passing / Y total] |
| E2E tests | [X passing / Y total] — 🔴 [N] critical · 🟡 [N] functional · 🟢 [N] non-blocker |
| Automation Gate | PASS / CONDITIONAL PASS / FAIL / CI-ONLY |

---

## How You Can Verify (Manual Test Cases)

[List every 🔴 Critical and 🟡 Functional test case from pipeline/qa-checklist.md as a numbered step-by-step checklist. Include expected outcome for each. Label each with its tier emoji.]

---

## Token Usage

| Phase | Agent | Model | Effort | Est. Tokens |
|---|---|---|---|---|
[One row per line in pipeline/token-usage.md]

**Total estimate:** ~[N]k tokens · Est. cost: ~$[N]
_(Estimates only — see session /cost for exact billing.)_

---

## Known Limitations & Accepted Risks

[List every accepted risk from pipeline/reviews/ verbatim. If none, write "None — all findings were resolved before approval."]
```

Source mapping (read before deleting pipeline/):
- Tasks list → `pipeline/tasks/T-XX.json` (all files)
- Review findings → `pipeline/reviews/senior-review-*.md` (or `security-*.md` / `performance-*.md` / `architecture-*.md` at the dedicated-specialist split)
- Automation Gate results → `pipeline/reviews/automation-gate.md`
- QA checklist → `pipeline/qa-checklist.md` (Critical + Functional tiers only)
- Token log → `pipeline/token-usage.md`
- Progress/summary → `pipeline/progress.md`

---

## PR Delivery Summary (shown in Claude UI after Gate 3 approval)

After the PR is created, display this block in the Claude session. Content is
identical to the PR description, presented as a readable chat summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PR CREATED — DELIVERY SUMMARY
PR: [#number] [title]
URL: [GitHub PR URL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT WAS BUILT
[Same 1–3 sentence summary as PR description]

Tasks:
  ✅ T-01: [title]
  ✅ T-02: [title]
  [repeat]

HOW AI VERIFIED
Security   : [N] critical resolved, [N] medium resolved, [N] accepted risks
Performance: [one-line summary]
Architecture: [one-line summary]
Tests      : unit [X/Y] · integration [X/Y] · E2E [X/Y]
Gate       : PASS / CONDITIONAL PASS / FAIL / CI-ONLY

HOW YOU CAN VERIFY (top manual checks)
[List the 🔴 Critical test cases only — numbered, one per line, concise]
(Full manual test list: see PR description)

TOKEN USAGE
Total  : ~[N]k tokens
  Opus   : ~[N]k
  Sonnet : ~[N]k
  Haiku  : ~[N]k
Est. cost: ~$[N]  (see /cost for exact billing)

KNOWN LIMITATIONS
[One bullet per accepted risk — or "None"]

PIPELINE RETROSPECTIVE (feature-full+ only — omit this block if it did not run)
[One-line synthesis outcome: "No change needed" OR N recommendation(s)]
Full record: docs/pipeline-retros/<date>-<slug>.md

Pipeline working state has been deleted. The permanent record is:
  docs/epics/<slug>.md             (epic delivery doc)
  docs/pipeline-retros/<slug>.md   (pipeline retrospective, if it ran)
  PR #[N]                          (code + description)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
