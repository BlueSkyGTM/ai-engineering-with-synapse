# GTM Mission Command

Your personal GTM operating environment — built alongside the BlueSkyGTM curriculum.

Fork this repo at Phase 01. Fill in the context files as you progress through the
course. By Phase 20 it reflects 20 phases of real GTM practice.

This is not the curriculum. It is the tool the curriculum teaches you to build.

---

## Setup (Phase 01)

```bash
git clone <your-fork-url>
cd gtm-mission-command
cp context/icp.example.md context/icp.md
# Fill in context files, then:
claude
/setup
```

---

## The Five Skills

| Skill | Command | Phase |
|-------|---------|-------|
| Setup | `/setup` | 01 |
| ICP Scoring | `/icp-scoring` | 02 |
| Account Research | `/account-research` | 03 |
| Signal to Sequence | `/signal-to-sequence` | 05 |
| Weekly Update | `/weekly-update` | 17 |

---

## Context Files

Fill these in once. Keep them current with `/weekly-update`.

| File | What it holds |
|------|--------------|
| `context/icp.md` | Ideal customer profile — firmographics, signals, exclusions |
| `context/company.md` | Your company, product, value prop, positioning |
| `context/market.md` | TAM, ICP segments, competitive landscape |
| `context/signal-library.md` | Known buying signals and their sources |
| `context/sequence-library.md` | Proven outbound sequences |
| `context/tech-stack.md` | Tools, APIs, and credentials in use |

---

## Output Structure

Exercises write to these paths. Helix reads them to verify completion.

```
signals/examples/    — signal detection scripts
handlers/            — enrichment and routing handlers
outputs/             — skill outputs and reports
```

---

## Updating

Each course phase extends one context file or one skill file. See the phase's
exercise spec for what to update.
