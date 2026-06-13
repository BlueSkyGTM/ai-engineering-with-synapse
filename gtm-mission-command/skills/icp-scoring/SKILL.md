# /icp-scoring — Score Account Lists Against ICP

Scores a list of domains or company names against your ICP definition
in `context/icp.md`. Returns a ranked list with fit scores and reasoning.

## Usage

```
/icp-scoring accounts.csv
/icp-scoring "Acme Corp, Globex, Initech"
```

## What it does

1. Loads `context/icp.md` and `context/market.md`
2. For each account: fetches firmographic signals, scores against ICP criteria
3. Returns a ranked list: score (0-100), fit tier (A/B/C/D), reasoning
4. Writes output to `outputs/skill-icp-scoring.md`

## Scoring dimensions

- Firmographic fit (company size, industry, geography)
- Technology signals (stack match from `context/tech-stack.md`)
- Buying signal recency (from `context/signal-library.md`)
- Exclusion check (negative signals from ICP definition)

## Output

`outputs/skill-icp-scoring.md` — ranked account list with scores and reasoning.

## Prerequisites

- `context/icp.md` filled in (run `/setup` first)
- Phase 02 lesson completed (Lead Scoring)
