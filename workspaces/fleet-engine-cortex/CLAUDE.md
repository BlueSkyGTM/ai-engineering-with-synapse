# Fleet Engine: Cortex — Cockpit

Everything you need to run this pipeline. Read this file before touching anything else.

---

## What This Does

Three AI agents run in sequence. Each writes a file to Google Cloud Storage. The next agent reads it.

```
node run.js "campaign message"
        │
        ▼
Ahab  — finds companies → writes ahab_output.json → GCS
Nemo  — enriches each company → writes nemo_output.json + shipwrecked.json → GCS
Neptune — writes an outreach message per lead → writes neptune_output.json → GCS
        │
        ▼
DELIVER=true node run.js  ← pushes neptune_output.json to Google Sheets
```

---

## Environment (already configured)

| Thing | Value |
|---|---|
| GCP Project | `project-8bd530c5-c699-4b50-868` |
| GCS Bucket | `fleet-engine-cortex-project-8bd530c5-c699-4b50-868` |
| ADC Account | `raymondf.gtm@gmail.com` |
| Models | `gemini-2.5-flash` (Ahab), `gemini-2.5-pro` (Nemo + Neptune) |
| Node version | 24+ |

`.env` is at the repo root. Do not commit it.

---

## Auth

ADC is set up. If you ever get `Could not load the default credentials`:

```bash
gcloud auth application-default login
```

A browser tab opens. Sign in as `raymondf.gtm@gmail.com`. Done.

If you get `HTTP 403` from Vertex AI, same fix.

---

## Run the Pipeline

### Step 1 — Run the agents

```bash
SKIP_RAG=true node run.js "YOUR CAMPAIGN MESSAGE HERE"
```

**What a good campaign message looks like:**
```
Target Series A/B B2B SaaS companies hiring for RevOps or GTM Operations.
Tech stack: HubSpot, Salesforce, Clay, n8n, Zapier, Apollo.
Health signals: recent funding (last 18 months), headcount growth.
Source: Greenhouse, Lever, Ashby.
```

Use `SKIP_RAG=true` for the first 4–5 runs. The RAG store starts empty so there is
nothing to query. Remove it once you have several runs in and want compounding memory.

**Why runs produce fewer leads than expected:**
Ahab calls Vertex AI with Google Search grounding. Gemini returns roughly 8–15 companies
per run depending on how specific the campaign message is. Nemo then cuts anything with
funding older than 18 months (CATALYST_STALE). Expect 3–6 active leads per run.

**To hit 50 leads, run 10–15 times with varied targeting.** Split by vertical or role:

```bash
# Run focused on RevOps
SKIP_RAG=true node run.js "Series A/B SaaS hiring RevOps Manager. HubSpot + Salesforce. Source: Greenhouse, Lever."

# Run focused on Marketing Ops
SKIP_RAG=true node run.js "Series B SaaS hiring Marketing Ops or GTM Engineering. Clay, n8n, Zapier signals. Source: Ashby."

# Run focused on a different sector
SKIP_RAG=true node run.js "Series A HealthTech or FinTech SaaS hiring Revenue Operations. HubSpot stack. Source: Lever, Greenhouse."
```

Each varied run finds different companies. Once you remove SKIP_RAG, the store deduplicates
across all runs automatically — Ahab will never resurface a company it has already found.

### Step 2 — Check output

```bash
cat output/neptune_output.json
```

Each lead has: Company, URL, Contact name/title/email, Friction type, Funding signal, Outreach Bite.

### Step 3 — Deliver to Google Sheets

**One-time setup (2 minutes):**
1. Open your Google Sheet
2. Extensions → Apps Script
3. Delete any existing code, paste everything from `SHEETS_WEBHOOK.gs` in this repo
4. Click Deploy → New deployment → Web app
5. Set: Execute as = **Me**, Who has access = **Anyone**
6. Click Deploy → copy the Web App URL
7. Add to `.env`: `SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/...`

Then deliver:

```bash
DELIVER_ONLY=true node run.js
```

Or deliver at the end of a pipeline run:

```bash
DELIVER=true SKIP_RAG=true node run.js "campaign message"
```

Leads append automatically. Headers written on first run. Setup never needs to be repeated.

---

## How the Pipeline Learns (RAG)

The pipeline gets smarter across runs through a vector store in `memory/rag.js`.
The store lives at `gs://{GCS_BUCKET}/rag_store.json` and is never deleted between runs.

**What gets stored after each run:**
- Every company Ahab discovered (`discovery` entries)
- Every lead Nemo enriched (`enrichment` entries)
- Every Outreach Bite Neptune wrote (`bite` entries)

**What each agent queries before it works:**

| Agent | Queries for | Uses it to |
|---|---|---|
| Ahab | Prior `discovery` entries | Inject as "Excluded Companies" — never re-surfaces a lead already in the pipeline |
| Nemo | Prior `enrichment` entries for similar companies | Calibrate friction classification against real examples it has seen |
| Neptune | Prior `bite` entries with the same friction type | Vary the opening structure — avoids sending the same-shaped message twice |

**The compounding effect:**
- Runs 1–4: store is sparse, RAG adds little. Use `SKIP_RAG=true`.
- Runs 5–10: dedup starts working. Ahab stops returning stale companies.
- Runs 10+: Nemo friction classifications tighten. Neptune Bites vary structurally.

**To activate RAG:** remove `SKIP_RAG=true` from your run command. That's it.

---

## Run Flags

| Flag | Effect | When |
|---|---|---|
| `SKIP_RAG=true` | Skip RAG memory calls | Always use for early runs |
| `DELIVER=true` | Push to Google Sheets at end of run | Combine with a campaign run |
| `DELIVER_ONLY=true` | Push existing neptune_output.json to Sheets | After a run, no re-run needed |
| `DRY_RUN=true` | No GCS writes, local only | Testing changes |
| `AHAB_ONLY=true` | Stop after Ahab | Debug discovery |
| `NEMO_ONLY=true` | Stop after Nemo | Debug enrichment |

Flags compose: `DRY_RUN=true SKIP_RAG=true node run.js "campaign"`

---

## Error → Fix

| Error | Fix |
|---|---|
| `Could not load the default credentials` | Run `gcloud auth application-default login` |
| `HTTP 403` from Vertex AI | Run `gcloud auth application-default login` |
| `HTTP 404` from Vertex AI (model not found) | Model name is wrong — check `utils/vertex.js` MODELS object |
| `HTTP 400` — controlled generation not supported with Search | `responseMimeType` was added alongside `grounding:true` — the code already handles this, means you changed vertex.js |
| `GCS_BUCKET not set` | `.env` is missing or not loaded — confirm `.env` exists at repo root |
| `SHEETS_WEBHOOK_URL not set` | Add `SHEETS_WEBHOOK_URL=...` to `.env` — see Step 3 above |
| `Empty Catch array` | Campaign message is too narrow — broaden the target or add more source channels |
| All leads SHIPWRECKED | Funding signals too old — try targeting companies with more recent funding rounds |
| `Could not parse model response as JSON` | Grounded call returned prose — this is auto-handled, but if it persists check Ahab's AHAB_SYSTEM prompt ends with the JSON format instruction |
| `SyntaxError` on startup | Curly quotes in a string literal — find with `grep -n "'\\|'" run.js` and replace with straight quotes |

---

## File Map

```
run.js              — entry point. All pipeline flags are here.
agents/
  ahab.js           — discovery agent (reads campaign, calls Vertex with grounding)
  nemo.js           — enrichment agent (one Pro call per lead)
  neptune.js        — synthesis agent (writes Outreach Bite, responseSchema enforced)
utils/
  vertex.js         — all Vertex AI calls route through here. MODELS object = model names.
  gcs.js            — GCS read/write helpers
  deliver.js        — Google Sheets delivery (DELIVER=true)
  sheets.js         — Google Sheets API wrapper
  payload.js        — string utilities (citation stripping, etc.)
memory/
  rag.js            — RAG corpus (GCS-backed). Non-fatal. Use SKIP_RAG=true early on.
output/             — local mirror of GCS files (gitignored)
STATE.md            — run log. Update after every run.
```

---

## Update STATE.md After Every Run

Copy this and fill it in:

```
Date: YYYY-MM-DD
Campaign: [what you targeted]
Ahab Catch: [N]
Nemo Active: [N]
Nemo Shipwrecked: [N] — reason: [CATALYST_STALE or other]
Neptune Finished: [N]
Issues: [anything that broke]
Notes: [anything worth remembering]
```

Phase 1 gate: 50 leads in neptune_output.json total. At 4/50.

---

## What "Orchestrate Leads" Means

When you are told to **orchestrate leads**, this is what you are doing:

**The business context:**
Raymond is a GTM (go-to-market) consultant. He finds companies that have a broken sales or operations process, reaches out to them, and offers to fix it. To do that, he needs to know:
- Which companies are actively scaling their GTM team right now (hiring signals)
- What specific problem each company has (friction type)
- Who the right person to contact is
- What to say to that person

**The pipeline automates all of that:**
1. **Ahab** reads job postings as signals. A company hiring a "Revenue Operations Manager" is telling you they have a GTM problem. Ahab finds these companies.
2. **Nemo** researches each company. It figures out what type of problem they have (e.g. "their HubSpot and Salesforce aren't syncing"), finds the right contact person, and cuts any company where the hiring signal is too old to act on.
3. **Neptune** writes the first message. It frames the contact's specific problem back to them and offers the exact outcome they already want. Not a template — a message grounded in what that company is actually going through.

**The output is a list of companies with:**
- A named contact and their title
- The specific operational problem they're experiencing
- A ready-to-send first message

That list goes to Google Sheets. Raymond reviews it and sends the outreach.

**So when you are told to "orchestrate leads" or "run the pipeline":**

```bash
SKIP_RAG=true node run.js "YOUR CAMPAIGN MESSAGE"
DELIVER_ONLY=true node run.js
```

That's it. You are generating a list of warm, researched prospects for a consulting business.

---

## Do Not Touch

- `agents/ahab.js` lines 20–44 (AHAB_SYSTEM prompt)
- `agents/nemo.js` lines with NEMO_SYSTEM
- `agents/neptune.js` lines with NEPTUNE_SYSTEM

These are the agent prompts. They survived 1,500 cycles of V1 unchanged. Do not modify.

If output quality drops, check the campaign message — not the system prompts.
