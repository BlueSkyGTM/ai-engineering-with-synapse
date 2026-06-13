<!-- Agent: Lyra -->
# Stage 03: Exercise Design

Write CLI exercise specs per lesson. Exercises are artifact-based — students produce
persistent files the site can verify. Copy-paste flag format is DEPRECATED (2026-06-12).

## Inputs

| Source | File/Location | Section/Scope | Why |
|--------|--------------|---------------|-----|
| Hybrid lessons | `../02-lesson-injection/output/hybrid-lessons/` | All lessons | Lessons to write exercises for |
| Exercise format spec | `../00-a-curriculum-archaeology/output/exercise-format-spec.md` | Full file | Structure and output shape |
| GTM Starter Kit | `../../shared/gtm-starter-kit-guide.md` | Skills table + Quick Start | Phases 01, 02, 03, 05, 17: exercise instructs the student to run the matching GTM Starter Kit skill against their own domain |

> **Deprecated input removed:** `copy-paste-flag-format.md` — do not reference or implement.
> Artifact-based verification replaced it. See exercise-format-spec.md for current standard.

## Process

1. For each hybrid lesson in Stage 02 `output/hybrid-lessons/`, write the exercise spec
2. Exercises must be terminal-executable and produce a persistent artifact the student can commit
3. Artifact paths: `signals/examples/<name>.py`, `handlers/<name>.py`, or `outputs/skill-<name>.md`
4. For Phases 01, 02, 03, 05, 17 — at least one exercise must reference the matching GTM Starter Kit skill
5. No scaffolded code. All exercises are open-ended tasks
6. Difficulty: Easy (1–2), Medium (3–4), Hard (5–6). Most lessons ship 5 exercises

## Artifact Verification (replaces copy-paste flag)

Helix reads the student's filesystem for the artifact path specified in the exercise.
The exercise spec must state exactly which file to produce and where it lands.

Example:
> Hard exercise: Implement a Clay waterfall enrichment router in `handlers/clay-waterfall.py`.
> The file must accept a list of domains and return a dict of enriched records.

## Audit

| Check | Pass Condition |
|-------|---------------|
| Artifact path specified | Every hard exercise names a file path |
| Terminal-completable | No exercise requires a browser or external tool |
| Format match | Structure matches exercise-format-spec |
| GTM Starter Kit wired | Phases 01/02/03/05/17 reference the correct skill |
| No copy-paste flag | Zero occurrences of the deprecated flag string |

## Dispatcher

```powershell
.\run.ps1 stage03 --sample 5   # human gate first
.\run.ps1 stage03              # full pass after approval
.\run.ps1 stage03 --retry-failed
```

## Outputs

| Artifact | Location | Format |
|----------|----------|--------|
| `exercise-specs/` | `output/` | One `exercises.md` per lesson — artifact-based, no copy-paste flag |
| `manifest.json` | `output/` | Auto-generated from Stage 02 done rows |
| `status.json` | `output/` | Live dispatch progress (written every 10 completions) |
