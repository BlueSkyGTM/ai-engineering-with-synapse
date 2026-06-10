---
name: leads
description: Orchestrates Fleet Engine Cortex pipeline to generate GTM consulting leads. Runs Ahab (discovery) → Nemo (enrichment) → Neptune (synthesis) and auto-delivers to Google Sheets. Generates researched, personalized outreach for companies actively scaling their GTM operations.
---

# Leads Orchestration

This skill runs the Fleet Engine Cortex pipeline to generate warm, researched prospects for a GTM consulting business. Each lead includes a named contact, their specific operational friction, funding signals, and a ready-to-send outreach message.

## When to Use This Skill

- User says "orchestrate leads"
- User says "run the pipeline" or "find leads"
- User says "/leads" or invokes the skill directly
- User requests new GTM prospects or research-based leads
- User wants to accelerate lead generation for GTM consulting

## What This Skill Does

1. **Discovers Companies** (Ahab): Finds Series A/B SaaS companies actively hiring for RevOps/GTM roles with GTM tech stack signals
2. **Enriches Research** (Nemo): Validates funding signals (must be <18 months), identifies friction type, finds the right contact person
3. **Synthesizes Outreach** (Neptune): Writes personalized first messages grounded in the company's specific challenges
4. **Auto-Delivers**: Pushes leads to Google Sheets via webhook in one seamless command

## Prerequisites

### Pre-Flight Checks (Required before every run)

```bash
# 1. Navigate to Fleet Engine Cortex workspace
cd workspaces/fleet-engine-cortex

# 2. Verify .env exists
dir .env
# Should show: .env file

# 3. Verify node_modules installed
powershell -NoProfile -Command "if (Test-Path node_modules) { Write-Host 'node_modules exists' } else { Write-Host 'Missing: run npm install' }"

# 4. Verify ADC authenticated
gcloud storage ls gs://fleet-engine-cortex-project-8bd530c5-c699-4b50-868
# Should list ahab_output.json, nemo_output.json, neptune_output.json, shipwrecked.json
```

If any check fails, resolve before proceeding:
- `.env` missing → Copy from `.env.example` and fill in values
- `node_modules` missing → Run `npm install`
- ADC fails → Run `gcloud auth application-default login`

## How to Use

### Seamless Orchestration (Recommended)

Use the PowerShell wrapper for one-command execution:

```powershell
cd workspaces/fleet-engine-cortex
.\scripts\orchestrate.ps1 "Series A/B SaaS hiring RevOps Manager. HubSpot + Salesforce. Source: Greenhouse, Lever."
```

This runs:
- Ahab → Nemo → Neptune with `SKIP_RAG=true`
- Auto-delivers to Sheets with `DELIVER=true`
- Displays clean success/failure summary

### Manual Orchestration (Alternative)

If PowerShell wrapper fails, use cmd.exe:

```bash
set SKIP_RAG=true
set DELIVER=true
node run.js "Series A HealthTech or FinTech SaaS hiring Revenue Operations. HubSpot stack. Source: Lever, Greenhouse."
```

## Campaign Message Format

Effective campaign messages include:

```
Target Series A/B B2B SaaS companies hiring for RevOps or GTM Operations roles.
Tech stack signals: HubSpot, Salesforce, Clay, n8n, Zapier, Apollo.
Health signals: recent funding (last 18 months), headcount growth.
Source: Greenhouse, Lever, Ashby.
```

**Example campaigns by vertical:**

```
# RevOps focus
"Series A/B SaaS hiring RevOps Manager. HubSpot + Salesforce. Source: Greenhouse, Lever."

# Marketing Ops focus
"Series B SaaS hiring Marketing Ops or GTM Engineering. Clay, n8n, Zapier signals. Source: Ashby."

# HealthTech/FinTech focus
"Series A HealthTech or FinTech SaaS hiring Revenue Operations. HubSpot stack. Source: Lever, Greenhouse."
```

## Instructions

When a user requests lead orchestration:

1. **Verify Pre-Flight Checks**
   
   Confirm all three checks pass (`.env`, `node_modules`, ADC). If not, guide user to fix.

2. **Ask for Campaign Target**
   
   Default to the HealthTech/FinTech seed campaign if user doesn't specify:
   ```
   "Series A HealthTech or FinTech SaaS hiring Revenue Operations. HubSpot stack. Source: Lever, Greenhouse."
   ```
   
   Or ask: "What target profile should I use? (RevOps, Marketing Ops, HealthTech/FinTech, or custom?)"

3. **Run the Pipeline**
   
   Execute the seamless command:
   ```powershell
   .\scripts\orchestrate.ps1 "<campaign message>"
   ```

4. **Monitor for Errors**
   
   **If pipeline fails with:**
   
   - `Could not load the default credentials`:
     - User action: Run `gcloud auth application-default login`
     - Browser will open → Sign in as `raymondf.gtm@gmail.com`
     - Retry orchestration
   
   - `HTTP 403` from Vertex AI:
     - Same fix as above (ADC expired)
   
   - `Empty Catch array`:
     - Campaign message too narrow → broaden targeting or add more source channels
     - Suggest: "Try adding more tech stack signals or job boards"
   
   - All leads SHIPWRECKED:
     - Funding signals too old (>18 months) → target more recent rounds
     - Suggest: "Target companies with funding in last 12-18 months"

5. **Inspect and Report Results**
   
   After successful run, read `output/neptune_output.json`:
   ```bash
   cat output/neptune_output.json
   ```
   
   Tally and report:
   - Ahab Catch: N companies discovered
   - Nemo Active: N qualified leads
   - Nemo Shipwrecked: N (reason codes: CATALYST_STALE, etc.)
   - Neptune Finished: N leads with outreach messages
   
   Example summary:
   ```
   Run Complete ✓
   - Ahab discovered: 8 companies
   - Nemo qualified: 5 active leads
   - Shipwrecked: 3 (CATALYST_STALE: funding >18 months)
   - Neptune generated: 5 personalized outreach messages
   - Delivered to Google Sheets: ✓
   ```

6. **Update STATE.md**
   
   Add a new run entry at the top of `workspaces/fleet-engine-cortex/STATE.md`:
   
   ```markdown
   ### Run 02 — 2026-06-05
   ```
   Campaign: [campaign message used]
   Ahab Catch: [N]
   Nemo Active: [N]
   Nemo Shipwrecked: [N] — reason: [CATALYST_STALE or other]
   Neptune Finished: [N]
   Issues: [any failures or unexpected behavior]
   Notes: [anything worth documenting]
   ```

7. **Confirm Sheets Delivery**
   
   Verify leads appeared in Google Sheet. If webhook failed, retry with:
   ```bash
   DELIVER_ONLY=true node run.js
   ```

## Failure Modes and Recovery

| Error | Root Cause | Recovery Action |
|---|---|---|
| `Could not load the default credentials` | ADC expired or not set | User runs `gcloud auth application-default login`, retry |
| `HTTP 403` from Vertex AI | ADC permissions issue | Same as above |
| `HTTP 404` from Vertex AI | Model name incorrect | Check `utils/vertex.js` MODELS object (should be `gemini-2.5-flash` and `gemini-2.5-pro`) |
| `Empty Catch array` | Campaign too narrow | Broaden targeting, add more sources |
| All leads SHIPWRECKED | Funding signals too old | Target companies with recent funding |
| `GCS_BUCKET not set` | `.env` missing or incorrect | Verify `.env` exists at repo root with correct bucket name |
| `SHEETS_WEBHOOK_URL not set` | Webhook URL missing from `.env` | Add `SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/...` to `.env` |
| PowerShell wrapper fails | Execution policy or path issue | Fallback to manual cmd.exe commands |

## Expected Output

Per run:
- **3–6 active leads** (Ahab returns ~8–15 companies, Nemo cuts stale funding)
- **Each lead contains:**
  - Company name and URL
  - Contact person (name, title, email if available)
  - Friction type (e.g., "API Stutter", "Scale Friction", "Manual Data Debt")
  - Funding signal with date and amount
  - Personalized outreach message (first-person, peer-suggestion based)

## Post-Run Best Practices

1. **Avoid Duplicate Runs**
   - Use varied targeting per run (vertical, role, sector)
   - Once SKIP_RAG is removed (after 4–5 runs), RAG auto-dedupes

2. **Activate RAG for Compounding Intelligence**
   - **Runs 1–4**: Keep `SKIP_RAG=true` — store is sparse, RAG adds little
   - **Runs 5+**: Remove `SKIP_RAG=true` from the command — each agent queries the store:
     - Ahab excludes already-seen companies (no duplicates)
     - Nemo calibrates friction classification against real examples
     - Neptune varies message structure (no template-y repeats)
   - The more runs you do, the smarter the pipeline gets

3. **Track Toward Phase 1 Gate**
   - Target: 50 leads in neptune_output.json
   - Run 10–15 campaigns with varied targeting to hit gate
   - Update `STATE.md` progress after each run

4. **Review Leads Before Sending**
   - Verify contact names are current
   - Check that friction type matches hiring signal
   - Ensure outreach messages sound authentic (not template-y)

## Batch Orchestration

For faster progress toward the 50-lead gate, run multiple campaigns in a single session.

### Batch Prompt Template

**User message format:**
```
Orchestrate leads with these 5 campaigns in sequence:
1. "Series A SaaS hiring RevOps. HubSpot + Salesforce. Source: Greenhouse, Lever."
2. "Series B SaaS hiring Marketing Ops or GTM Engineering. Clay, n8n, Zapier. Source: Ashby."
3. "Series A DevTools hiring GTM Engineering. API-first companies."
4. "Series A FinTech hiring Revenue Operations. HubSpot or Salesforce."
5. "Series B HealthTech hiring Sales Operations. HubSpot + Clay."

Run them sequentially, update STATE.md after each run, and deliver all to Sheets.
```

**Agent execution pattern:**
1. Run Campaign 1 via `.\scripts\orchestrate.ps1`
2. Read `output/neptune_output.json` and tally results
3. Update `STATE.md` with new run entry
4. Repeat for Campaign 2, 3, 4, 5
5. Report batch summary: total leads, total shipwrecked, total time

### Campaign Variety Matrix

Use this to ensure each run targets fresh ground and covers different verticals:

| # | Target Vertical | Stage | Role | Tech Stack Signals | Source |
|---|---|---|---|---|---|
| 1 | General SaaS | Series A | RevOps Manager | HubSpot, Salesforce | Greenhouse, Lever |
| 2 | General SaaS | Series B | Marketing Ops | Clay, n8n, Zapier | Ashby |
| 3 | DevTools | Series A | GTM Engineering | API-first, GitHub, Slack | Lever, LinkedIn |
| 4 | FinTech | Series A | Revenue Operations | HubSpot, Salesforce | Greenhouse |
| 5 | HealthTech | Series B | Sales Operations | HubSpot, Clay | Ashby |
| 6 | PLG Companies | Series A | Growth Ops | Heap, Amplitude, Mixpanel | Lever, Greenhouse |
| 7 | E-commerce | Series B | E-commerce Ops | Shopify, Klaviyo, Klaviyo | Greenhouse |
| 8 | Cybersecurity | Series A | SecOps / GTM | Salesforce, Outreach | LinkedIn, Lever |
| 9 | Data Infrastructure | Series B | Revenue Ops | Snowflake, dbt, Fivetran | Ashby |
| 10 | Collaboration | Series A | GTM Operations | HubSpot, Slack, Zoom | Greenhouse |

### Context Budget Guidance

| Runs | Context usage | Recommendation |
|---|---|---|
| 1–2 | Low (~10K tokens) | Safe, full inspection |
| 3–5 | Medium (~30K tokens) | **Optimal** — batch summary per run |
| 6–8 | High (~50K tokens) | Tight, minimal inspection |
| 9+ | Risk of overflow | Stop, start fresh session |

**Best practice:** Batch 3–5 runs per session to balance throughput and context safety.

### When to Batch

- **Early runs (1–4):** Batch freely — SKIP_RAG=true, no RAG overhead
- **RAG activation runs (5+):** Batch 3 at most — RAG queries add context per run
- **After context fills:** Start fresh session, don't force it

### Batch Summary Template

After completing a batch, report:
```
Batch Complete ✓
Runs: 5
Total leads: 18 (3.6 avg per run)
Total shipwrecked: 7 (CATALYST_STALE: 6, CONTACT_UNAVAILABLE: 1)
Total time: 8 minutes
Cumulative leads: 25/50 (50% to Phase 1 gate)

Next actions:
- Run 10 more batches to hit 50 leads
- At Run 05, remove SKIP_RAG to activate RAG
```

## File Map

```
workspaces/fleet-engine-cortex/
├── run.js                          # Pipeline entry point
├── .env                            # Environment variables
├── STATE.md                        # Run log (update after each run)
├── scripts/orchestrate.ps1         # Seamless wrapper
├── output/
│   ├── ahab_output.json           # Discovered companies
│   ├── nemo_output.json           # Enriched leads
│   ├── neptune_output.json        # Final leads with outreach
│   └── shipwrecked.json           # Disqualified leads
└── CLAUDE.md                      # Full documentation
```

## Examples

### Example 1: RevOps Focus Campaign

**User**: "Orchestrate leads for Series A/B SaaS companies hiring RevOps."

**Action**:
```powershell
.\scripts\orchestrate.ps1 "Series A/B SaaS hiring RevOps Manager. HubSpot + Salesforce. Source: Greenhouse, Lever."
```

**Result**:
```
Run Complete ✓
- Ahab discovered: 8 companies
- Nemo qualified: 4 active leads
- Shipwrecked: 4 (CATALYST_STALE: funding >18 months)
- Neptune generated: 4 personalized outreach messages
- Delivered to Google Sheets: ✓
```

**Leads delivered**:
- Company A (CEO) - Scale Friction - Series B $24M
- Company B (VP Sales) - API Stutter - Series A $17M
- Company C (COO) - Manual Data Debt - Series B $40M
- Company D (Founder) - Scale Friction - Series A $12M

### Example 2: HealthTech/FinTech Campaign

**User**: "Find leads in HealthTech or FinTech hiring RevOps."

**Action**:
```powershell
.\scripts\orchestrate.ps1 "Series A HealthTech or FinTech SaaS hiring Revenue Operations. HubSpot stack. Source: Lever, Greenhouse."
```

**Result**:
```
Run Complete ✓
- Ahab discovered: 6 companies
- Nemo qualified: 3 active leads
- Shipwrecked: 3 (CATALYST_STALE)
- Neptune generated: 3 personalized outreach messages
- Delivered to Google Sheets: ✓
```

### Example 3: Recovery from ADC Error

**User**: "Orchestrate leads."

**Action**:
```powershell
.\scripts\orchestrate.ps1 "Series A SaaS hiring RevOps. HubStack."
```

**Error**:
```
❌ Could not load the default credentials
```

**Response**:
```
ADC authentication expired. Please run:

gcloud auth application-default login

A browser will open. Sign in as raymondf.gtm@gmail.com.
Then I'll retry the orchestration.
```

**User**: Runs gcloud command, confirms ready.

**Action**: Retry orchestration → Succeeds.

## Related Use Cases

- Batch orchestration for 50+ leads (run varied campaigns sequentially)
- Integrating with downstream CRM tools (Phase 2: MCP delivery)
- Custom campaign targeting based on specific vertical signals
- Regular weekly lead generation cadence

## Do Not Modify

- `agents/ahab.js` lines 20–44 (AHAB_SYSTEM prompt)
- `agents/nemo.js` lines with NEMO_SYSTEM
- `agents/neptune.js` lines with NEPTUNE_SYSTEM

These prompts survived 1,500 cycles of V1 unchanged. If output quality drops, adjust the campaign message—not the system prompts.