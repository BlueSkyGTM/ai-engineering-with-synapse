# /account-research — Deep Research Brief Before Outreach

Produces a structured research brief for one account — enough context
to write a highly personalized first touch without manual research.

## Usage

```
/account-research acme.com
/account-research "Acme Corp"
```

## What it does

1. Loads `context/icp.md`, `context/company.md`, `context/signal-library.md`
2. Researches the account: recent news, job postings, tech stack, LinkedIn signals
3. Maps findings to your value prop and known buying signals
4. Writes a structured brief to `outputs/skill-account-research.md`

## Brief structure

- Company snapshot (size, stage, product, market)
- Relevant signals detected (with source and recency)
- ICP fit assessment (which criteria match, which don't)
- Recommended angle for first touch
- Suggested personalization hooks (specific to this account)

## Output

`outputs/skill-account-research.md` — research brief, ready to pass to `/signal-to-sequence`.

## Prerequisites

- `context/icp.md` and `context/signal-library.md` filled in
- Phase 03 lesson completed (Signal Detection)
- `SERPER_API_KEY` in `.env`
