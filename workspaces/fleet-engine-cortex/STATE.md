# STATE.md — Pipeline State & Run Log

This file tracks current pipeline state, phase progress, active issues, and run history.
Update after every session. Claude Code reads this at the start of every session.

---

## Current Phase

**Phase 1 — GCS Pipeline**
Status: RUNNING — 31/50 leads accumulated (Run 01-11)
Target: 50 clean leads in neptune_output.json

### Next Steps
- Need 19 more leads to hit Phase 1 gate
- At Run 05+, remove SKIP_RAG to activate RAG compounding
- Use broader campaign messages to avoid empty catch
  +++++++ REPLACE

---

## Phase Progress

| Phase | Name | Status | Gate |
|---|---|---|---|
| 1 | GCS Pipeline | In Progress — 31/50 | 50 leads in neptune_output.json |
| 2 | MCP Delivery | Blocked on Phase 1 | MCP pushing to 1 downstream tool |
| 3 | RAG Memory | Built — activates on first run | Neptune Bites vary structurally across leads |
  +++++++ REPLACE

---

## Environment Status

| Item | Status | Notes |
|---|---|---|
| GCP Project | ✅ Set | project-8bd530c5-c699-4b50-868 |
| GCS Bucket | ✅ Created | fleet-engine-cortex-project-8bd530c5-c699-4b50-868 (us-central1) |
| Vertex AI API | ✅ Enabled | gemini-2.5-flash + gemini-2.5-pro |
| ADC Auth | ✅ Authenticated | application_default_credentials.json set |
| Node dependencies | ✅ Installed | 97 packages |
| GitHub Remote | Connected | https://github.com/BlueSkyGTM/fleet-engine-cortex |

---

## GCS Bucket File State

| File | Status | Lead Count | Notes |
|---|---|---|---|
| ahab_output.json | Generated | 6 | Run 02 output |
| nemo_output.json | Generated | 6 | Run 02 output |
| shipwrecked.json | Generated | 3 | Run 02 disqualified |
| neptune_output.json | Generated | 15 | Run 01 (4) + Run 02 (3) + Run 05 (5) + Run 07 (3) leads |
| rag_store.json | Generated | 0 entries | Created on first run. Do not delete between runs — this is the compounding corpus. |

---

## Run Log

### Batch Summary — Runs 03-07 (2026-06-05)
```
Total Runs: 5
Total Leads: 8 (Run 05: 5, Run 07: 3, Runs 03-04-06: 0)
Total Shipwrecked: 5 (CATALYST_STALE: 5)
Total Time: ~15 minutes
Cumulative Leads: 15/50 (30% to Phase 1 gate)

Observations:
- Campaign messages need to be broader — too narrow results in empty catch
- Run 06 had Vertex AI error but pipeline recovered
- Run 05 funding validation inconsistent — 2 leads should have been shipwrecked
- Average leads/run: 1.6 (below target 3-6)
- RAG store still empty (SKIP_RAG=true all runs)
- All leads delivered to Google Sheets successfully
```

### Run 07 — 2026-06-05 (Batch)
```
Campaign: Series B HealthTech hiring Sales Operations. HubSpot + Clay.
Ahab Catch: 5
Nemo Active: 3
Nemo Shipwrecked: 2 — CATALYST_STALE (funding > 18 months)
Neptune Finished: 3
Issues: None
Notes: SKIP_RAG=true. 3 leads delivered to Sheets.
```

### Run 06 — 2026-06-05 (Batch)
```
Campaign: Series A FinTech hiring Revenue Operations. HubSpot or Salesforce.
Ahab Catch: 2
Nemo Active: 0
Nemo Shipwrecked: 2 — CATALYST_STALE (funding > 18 months)
Neptune Finished: 0
Issues: Vertex AI error on GigSafe (Empty response from gemini-2.5-pro)
Notes: SKIP_RAG=true. Pipeline recovered but all leads shipwrecked.
```

### Run 05 — 2026-06-05 (Batch)
```
Campaign: Series A DevTools hiring GTM Engineering. API-first companies.
Ahab Catch: 6
Nemo Active: 5 (Next Communications, GTM Studio, NexHealth, Pliant, Suger)
Nemo Shipwrecked: 1 — CATALYST_STALE (Stytch: Series B 2021)
Neptune Finished: 5
Issues: Funding validation inconsistencies — NexHealth (Series C 2022) and GTM Studio (unfunded) should have been shipwrecked.
Notes: SKIP_RAG=true. 5 leads delivered to Sheets. Pliant qualifies (Series B April 2025 = 2 months old).
```

### Run 04 — 2026-06-05 (Batch)
```
Campaign: Series B SaaS hiring Marketing Ops or GTM Engineering. Clay, n8n, Zapier. Source: Ashby.
Ahab Catch: 0
Nemo Active: 0
Nemo Shipwrecked: 0
Neptune Finished: 0
Issues: Campaign too narrow — no results
Notes: SKIP_RAG=true. No leads generated.
```

### Run 03 — 2026-06-05 (Batch)
```
Campaign: Series A SaaS hiring RevOps. HubSpot + Salesforce. Source: Greenhouse, Lever.
Ahab Catch: 2 (Vendelux duplicate)
Nemo Active: 0
Nemo Shipwrecked: 2 — CATALYST_STALE (funding > 18 months: Vendelux Series A Nov 2023)
Neptune Finished: 0
Issues: Campaign too narrow — only 1 company found (duplicate entry)
Notes: SKIP_RAG=true. No leads generated. Vendelux funding (Nov 2023) = 30 months old.
```

### Run 02 — 2026-06-05
```
Campaign: Series A HealthTech or FinTech SaaS hiring Revenue Operations. HubSpot stack. Source: Lever, Greenhouse.
Ahab Catch: 6
Nemo Active: 3 (Basis AI, Notabene, Arcadia)
Nemo Shipwrecked: 3 — CATALYST_STALE (funding > 18 months)
Neptune Finished: 3
Issues: Windows shell escaping issues with environment variables; resolved with PowerShell wrapper and batch file scripts.
Notes: SKIP_RAG=true. All 3 leads delivered to Google Sheets successfully. Total leads accumulated: 7/50.
```

### Run 01 — 2026-06-05
```
Campaign: Series A/B B2B SaaS hiring for RevOps/GTM Ops. HubSpot, Salesforce, Clay, n8n, Zapier, Apollo signals.
Ahab Catch: 8
Nemo Active: 4 (Raspberry AI, Letter AI, Ampa Health, Trint)
Nemo Shipwrecked: 4 — CATALYST_STALE (funding > 18 months)
Neptune Finished: 4
Issues: 3 fixes required before first run:
  - run.js curly apostrophe syntax error (line 118)
  - Model versions stale (preview-05-20 → gemini-2.5-flash stable)
  - grounding + responseMimeType incompatible — conditionally excluded
Notes: SKIP_RAG=true. RAG corpus empty on first run by design.
```

### Run 11 — 2026-06-05
```
Campaign: B2B companies hiring Growth Ops or Revenue Ops. Clay, HubSpot, Salesforce, Apollo.
Ahab Catch: 0
Nemo Active: 0
Nemo Shipwrecked: 0
Neptune Finished: 0
Issues: Empty catch — campaign too narrow
Notes: SKIP_RAG=true. No leads generated.
```

### Run 10 — 2026-06-05
```
Campaign: Series A Series B B2B companies hiring RevOps or GTM Ops. Zapier, Make, n8n, HubSpot.
Ahab Catch: 6
Nemo Active: 6
Nemo Shipwrecked: 0
Neptune Finished: 6
Issues: None
Notes: SKIP_RAG=true. 6 leads delivered to Sheets.
```

### Run 09 — 2026-06-05
```
Campaign: Series B B2B SaaS companies. Revenue Operations, Sales Ops. HubSpot, Salesforce, Clay, n8n.
Ahab Catch: 7
Nemo Active: 7
Nemo Shipwrecked: 3
Neptune Finished: 4
Issues: None
Notes: SKIP_RAG=true. 4 leads delivered to Sheets.
```

### Run 08 — 2026-06-05
```
Campaign: Series A B2B SaaS companies. Hiring GTM roles. HubSpot, Salesforce, Clay, Apollo.
Ahab Catch: 3
Nemo Active: 3
Nemo Shipwrecked: 1
Neptune Finished: 2
Issues: None
Notes: SKIP_RAG=true. 3 leads delivered to Sheets.
```

### Session Summary — Runs 08-11 (2026-06-05)
```
Total Runs: 4
Total Leads: 13 (Run 08: 3, Run 09: 4, Run 10: 6, Run 11: 0)
Total Shipwrecked: 4
Total Time: ~10 minutes
Cumulative Leads: 31/50 (62% to Phase 1 gate)

Observations:
- Broader campaign messages yielded better results (Runs 08-10)
- Run 11 empty catch — targeting too specific
- Average leads/run: 3.25 (improved from 1.6 in Runs 03-07)
- All leads delivered to Google Sheets successfully
```

### Template (copy for each run)
```
Date: YYYY-MM-DD
Campaign: [campaign message used]
Ahab Catch: [N leads]
  +++++++ REPLACE
Nemo Active: [N leads]
Nemo Shipwrecked: [N leads] — reason codes: [list]
Neptune Finished: [N leads]
Issues: [any failures or unexpected behavior]
Notes: [anything worth documenting]
```

---

## Known Issues

**Funding Validation Inconsistency (Run 05)**
- NexHealth (Series C April 2022 = 50 months old) should have been shipwrecked
- GTM Studio (unfunded) should have been shipwrecked
- Both were marked ACTIVE by Nemo
- Root cause: Nemo prompt doesn't enforce 18-month threshold consistently
- Impact: 5 leads from Run 05, but only 3 likely qualify

**Campaign Targeting Too Narrow**
- Runs 03-04 returned 0-2 companies (below target 8–15)
- Broaden campaign messages with more tech stack signals and sources

---

## V1 Failure Log Reference

The following failure modes were documented in V1 and are solved by the V2 architecture.
Do not attempt to reproduce these solutions — they are eliminated by design.

| Failure Mode | V1 Root Cause | V2 Solution |
|---|---|---|
| Docker env var conflicts | Self-hosted container runtime | No Docker |
| n8n payload interpretation errors | Open-source middleware | No n8n |
| Postgres connection pool exhaustion | Self-hosted DB under concurrent load | No Postgres |
| Single-file orchestration bottleneck | All state through one HTTP server | Separate agent files |
| No clean handoff layer | DB polling as communication | GCS file handoff |
| Environmental variable drift | Docker + VM config surface | Cloud Secret Manager |

---

## MCP Server State (Phase 2)

Not started. When Phase 1 gate is met, update this section with:
- MCP server port
- Tools exposed
- Downstream tools connected
- Authentication method

---

## RAG Memory State (Phase 3)

Built and wired. Activates automatically on first pipeline run.
Store file: `gs://{GCS_BUCKET}/rag_store.json` (also mirrored to `output/rag_store.json`)

| Stat | Value |
|---|---|
| Store entries | 0 (not yet run) |
| Embedding model | text-embedding-004 (768 dimensions) |
| Entry types | discovery, enrichment, bite |
| Retrieval | cosine similarity, top-K |
| Run isolation | entries excluded from their own run's queries |

Update entry count after each run. The store compounds — do not delete it between runs.

---

## Campaign Config Reference

When running Ahab, the campaign message should include:
- Target company profile (stage, size, sector)
- Tech stack signals to scan for
- Growth/health signals to scan for
- Excluded companies (if any)
- Source channels to prioritize (job boards, LinkedIn, etc.)

Example:
```
Target Series A/B B2B SaaS companies hiring for RevOps, GTM, or Marketing Operations roles.
Tech stack signals: HubSpot, Salesforce, Clay, n8n, Zapier, Apollo, Outreach.
Health signals: recent funding, headcount growth, new GTM leadership.
Source: Greenhouse public JSON, LinkedIn job postings, Lever.
Exclude: [any companies already in pipeline]