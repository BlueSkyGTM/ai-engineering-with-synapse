# /setup — Provision Context Files

Provisions all six context files from a single domain name.
Run once at the start of Phase 01. Re-run when your ICP shifts.

## What it does

1. Researches the domain with SerperDev (requires `SERPER_API_KEY` in `.env`)
2. Infers ICP firmographics, signals, and tech stack from public data
3. Writes first-draft versions of all six context files
4. Prompts the student to review and edit each file before moving on

## Usage

```
/setup yourdomain.com
```

Or without a domain — will ask for one:
```
/setup
```

## Output

Writes to:
- `context/icp.md`
- `context/company.md`
- `context/market.md`
- `context/signal-library.md`
- `context/sequence-library.md`
- `context/tech-stack.md`

## After setup

Verify each file, then run `/icp-scoring` to test your ICP definition against a sample list.

## Prerequisites

- `SERPER_API_KEY` in `.env`
- Phase 01 lesson completed (ICP & TAM)
