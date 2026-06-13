# GTM Mission Command — Claude Instructions

This repo is the student's live GTM operating environment.
Skills are invoked with slash commands. Context files are the source of truth.

## Context Loading

Before any skill runs, load the relevant context files:
- Always load: `context/icp.md`, `context/company.md`
- For outbound work: also load `context/signal-library.md`, `context/sequence-library.md`
- For enrichment work: also load `context/tech-stack.md`

## Skill Routing

| Request | Skill |
|---------|-------|
| Provision context files from a domain | `/setup` |
| Score an account list | `/icp-scoring` |
| Research an account before outreach | `/account-research` |
| Turn a signal into a live campaign | `/signal-to-sequence` |
| Keep context files current | `/weekly-update` |

## Output Paths

Skills write to these paths — do not change them (Helix reads here for exercise verification):
- Signal scripts: `signals/examples/<name>.py`
- Handlers: `handlers/<name>.py`
- Reports and skill outputs: `outputs/skill-<name>.md`

## Rules

- Never invent data. If a context file is empty, say which file to fill in first.
- Never expose API keys in output. Keys live in `.env` only.
- Mechanism before tool. Explain what the skill does before running it.
