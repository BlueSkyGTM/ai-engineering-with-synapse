# /weekly-update — Keep Context Files Current

The MLOps retraining loop for your GTM motion. Run weekly to keep
context files reflecting what's actually working.

## Usage

```
/weekly-update
```

## What it does

1. Loads all six context files
2. Pulls recent campaign performance data (if `sync/` scripts configured)
3. Asks 5 calibration questions about what changed this week
4. Proposes updates to each affected context file
5. You approve or edit each proposed change before it writes

## The 5 calibration questions

1. What signals converted to meetings this week?
2. What sequences had the highest reply rate?
3. Did any accounts surprise you (won/lost unexpectedly)?
4. Did your ICP definition hold? Any misfits in the pipeline?
5. Any new tools, API keys, or enrichment sources to add?

## Context files updated

Based on answers:
- `context/signal-library.md` — new or upgraded signals
- `context/sequence-library.md` — winning sequences, deprecated ones
- `context/icp.md` — refined criteria or exclusions
- `context/tech-stack.md` — new tools added

## Output

`outputs/skill-weekly-update.md` — change log of what was updated and why.

## Prerequisites

- All context files initialized (run `/setup` first)
- Phase 17 lesson completed (MLOps for GTM)
