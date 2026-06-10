<!-- Agent: Claude Code -->
# 00-d: Helix Design

Design the FSRS integration, copy-paste flag format (LOCKED here), faculty persona system, and student state options.

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Curriculum archaeology | `../00-a-curriculum-archaeology/output/` | exercise-format-spec, lesson-format-spec | What Helix must parse |
| Agent architecture | `../00-c-agent-setup/output/agent-briefs/lyra-code-brief.md` | Full file | How Helix fits in the agent pattern |
| FSRS reference | `../../phases/19-capstone-projects/17-personal-ai-tutor/docs/en.md` | FSRS definition, BKT section | Algorithm spec — use FSRS-5 |
| Professor Synapse | `../../professor-synapse/` | SKILL.md, teaching protocol | Vendored fork — base for Helix persona |

## Capstone Direction

Helix uses FSRS-5 for quiz card recall scheduling. The Phase 19/20 capstone extends or ports the algorithm: students either tune FSRS parameters for GTM-specific retention curves, or apply the stability/decay model to signal resurfacing in the GTM Starter Kit. Both directions are valid. 00-d's spec locks the base parameters; the capstone layer builds on top.

## Process

1. Evaluate FSRS-5 for this use case: text-based curriculum with CLI exercises. Confirm compatibility with quiz card layer (atomic Q&A cards with Again/Hard/Good/Easy ratings). Note: copy-paste exercises are a separate layer — FSRS does not apply to them.
2. Define FSRS integration spec: card format, scheduling parameters (desired retention rate, stability thresholds, learning/relearning steps), review intervals, correct-response definition
3. Design copy-paste flag format: exact string Helix parses from student CLI output — **LOCKED after this stage**
4. Design faculty persona system: trigger conditions, persona types (GTM vs AI engineering topics), voice rules
5. Evaluate student state options: what data must persist, mechanism candidates, evaluation criteria
6. Run audit checks

## Audit

| Check | Pass Condition |
|-------|---------------|
| Flag format is exact | copy-paste-flag-format.md specifies the exact string, not a description |
| FSRS params are concrete | fsrs-integration-spec.md has actual parameter values, not ranges |
| Stage 07 criteria are decision-ready | student-state-options.md names criteria beyond "persistent, cheap, reliable" |

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| `fsrs-integration-spec.md` | `output/` | Card schema, scheduling params, correct-response definition |
| `copy-paste-flag-format.md` | `output/` | LOCKED — exact string format Helix parses |
| `faculty-persona-spec.md` | `output/` | Persona types, trigger conditions, voice rules |
| `student-state-options.md` | `output/` | Mechanism candidates and evaluation criteria |
