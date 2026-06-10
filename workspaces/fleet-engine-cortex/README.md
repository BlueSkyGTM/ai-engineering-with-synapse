# Fleet Engine: Cortex

**The agents worked. The infrastructure didn't.**

Claude Code as the Admiral. CLI-native orchestration layer built on Google ADK — a full rebuild of [Fleet Engine: Fathom](https://github.com/BlueSkyGTM/fleet-engine-fathom) using Agent Engine in place of the self-hosted stack that kept failing.

---

## What Failed in V1

The original pipeline stress-tested three specialized agents — Ahab, Nemo, Neptune — to 1,500 enrichment cycles. It produced 500+ actionable leads and resolved 18 documented failure modes across scraping, routing, parsing, and output QA.

The agents were sound. The execution environment wasn't.

Self-hosted Postgres, n8n, and Docker created three independent layers of state, each with its own interpretation of requests and its own failure surface. Docker env var conflicts between restarts. n8n payload interpretation errors. Postgres connection pool exhaustion under concurrent load. The pipeline couldn't sustain production runs because the infrastructure, not the logic, was the failure domain.

V2 eliminates every layer of that environment.

---

## What Cortex Does Differently

| Fleet Engine: Fathom (V1) | Fleet Engine: Cortex (V2) |
|---|---|
| n8n workflows as orchestrator | Claude Code as Admiral + `run.js` / Python ADK |
| Postgres as state store | Google Cloud Storage as handoff layer |
| Docker + GCP VM | No containers, no self-hosted infra |
| n8n HTTP server + Express serializer | Direct agent invocation |
| DB polling between agents | GCS file read/write |
| Manual credential management | Application Default Credentials |
| No RAG memory | Vertex AI RAG corpora (us-central1 Serverless) |

The three agent system prompts — AHAB_SYSTEM, NEMO_SYSTEM, NEPTUNE_SYSTEM — are preserved exactly from Fathom. Nothing about the agents changed. Everything underneath them did.

### Two execution paths

| Path | Entry point | Where agents run | RAG |
|---|---|---|---|
| **Node.js** (local iteration) | `node run.js "campaign"` | Vertex AI via SDK | GCS `rag_store.json` |
| **Python ADK** (deployed) | `adk run Pipeline_Orchestrator` | Agent Engine (Agent Runtime) | Vertex AI RAG corpora |

---

## Three-Layer Architecture

```
Campaign message (CLI input)
        │
        ▼
┌──────────────┐
│     AHAB     │  gemini-2.5-flash + Vertex AI Grounding
│   Discovery  │  5+ search queries, aggregator filtering,
└──────────────┘  raw company signal extraction
        │
        │  ahab_output.json ──► GCS
        │
        ▼
┌──────────────┐
│     NEMO     │  gemini-2.5-pro + Vertex AI Grounding
│  Enrichment  │  Single-lead diagnostic enrichment,
└──────────────┘  friction typing, CATALYST_STALE check
        │
        │  nemo_output.json ──► GCS
        │  shipwrecked.json ──► GCS
        │
        ▼
┌──────────────────────────────┐
│        AUG MEMORY            │  Phase 3
│  Cross-lead pattern context  │  Neptune reads pattern notes
│  Friction signal summary     │  before each Bite
└──────────────────────────────┘
        │
        ▼
┌──────────────┐
│   NEPTUNE    │  gemini-2.5-pro + responseSchema
│  Synthesis   │  Schwartz-style Outreach Bite synthesis,
└──────────────┘  contact frame routing, funding signal handling
        │
        │  neptune_output.json ──► GCS
        │
        ▼
┌──────────────┐
│  MCP SERVER  │  Phase 2
│   Delivery   │  Appends Neptune output to Google Sheets.
└──────────────┘  Google Sheets, or any downstream tool
        │
        ▼
   Downstream tools (no manual file handling)
```

**Layer 1 — GCS Handoff:** Cloud Storage is the shared space between agents. No polling, no middleware, no status fields. One agent writes a file. The next reads it.

**Layer 2 — MCP Delivery:** The MCP server reads `neptune_output.json` and exposes it to downstream tools via the Model Context Protocol. Built in Phase 2.

**Layer 3 — AUG Shared Memory:** Neptune gets cross-lead pattern context within a run — friction type distribution, funding signals seen, contact title patterns. Built in Phase 3.

---

## Build Phases

### Phase 1 — GCS Pipeline ← current
Replace the hostile V1 infrastructure with GCS file handoff. Agents run sequentially from the CLI.

**Gate:** 50 leads in `neptune_output.json` with `Outreach_Bite` populated.

### Phase 2 — MCP Delivery Layer
`utils/mcp.js` — exposes Neptune output to downstream tools. Tools: `get_leads`, `get_lead_by_company`, `push_to_sheet`, `push_to_clay`.

**Gate:** At least one downstream tool receiving Neptune output without manual file handling. Blocked on Phase 1.

### Phase 3 — AUG Shared Memory
`memory/aug.js` — Neptune reads cross-lead pattern context before each Bite synthesis.

**Gate:** Neptune Bites referencing patterns across leads in the same run without being explicitly prompted. Blocked on Phase 2.

---

## Setup

### Prerequisites
- Node.js 18+
- Google Cloud SDK (`gcloud`)
- GCP project with Vertex AI API enabled
- GCS bucket for agent handoff files

### 1. Authenticate
```bash
gcloud auth application-default login
```

### 2. Create GCS bucket
```bash
gsutil mb -p YOUR_PROJECT_ID gs://fleet-engine-cortex-YOUR_PROJECT_ID
```

### 3. Install
```bash
npm install
```

### 4. Configure
```bash
cp .env.example .env
# Set GCP_PROJECT and GCS_BUCKET in .env
```

### 5. Run (Node.js path — local iteration)
```bash
node run.js "Target Series A/B B2B SaaS companies hiring for RevOps or GTM roles. Tech stack signals: HubSpot, Salesforce, Clay, n8n, Zapier. Health signals: recent funding, headcount growth. Source: Greenhouse, LinkedIn, Lever."
```

### 6. Run (ADK path — deployed execution)
```bash
pip install google-cloud-agent-development-kit
adk deploy Pipeline_Orchestrator --project project-8bd530c5-c699-4b50-868 --location global
adk run Pipeline_Orchestrator --input "campaign message"
```

### RAG corpora (already live — no setup needed)

| Agent | Corpus ID | Region | Mode |
|---|---|---|---|
| Ahab | `6536218395128365056` | us-central1 | Serverless |
| Nemo | `5352756855548411904` | us-central1 | Serverless |
| Neptune | `3877687240096219136` | us-central1 | Serverless |

---

## Output Files

| File | Contents |
|---|---|
| `ahab_output.json` | Raw Catch array — all companies Ahab found |
| `nemo_output.json` | ACTIVE enriched leads |
| `shipwrecked.json` | SHIPWRECKED leads with reason codes (e.g. CATALYST_STALE) |
| `neptune_output.json` | Final leads with `Outreach_Bite` populated |

All files live in GCS and are mirrored to `output/` locally for review.

---

## Repository Structure

```
fleet-engine-cortex/
├── CLAUDE.md          ← primary instruction file for Claude Code
├── CONTEXT.md         ← why V1 failed, what V2 changes
├── ARCHITECTURE.md    ← system design, data flow, phase map
├── REFERENCES.md      ← agent prompts, payload contracts (source of truth)
├── STATE.md           ← current phase, run log, known issues
├── .env.example       ← required environment variables
├── package.json
├── run.js             ← single entry point
├── agents/
│   ├── ahab.js        ← discovery (gemini-2.5-flash + grounding)
│   ├── nemo.js        ← enrichment (gemini-2.5-pro + grounding)
│   └── neptune.js     ← synthesis (gemini-2.5-pro + responseSchema)
├── utils/
│   ├── vertex.js      ← Vertex AI REST wrapper (google-auth-library)
│   ├── gcs.js         ← GCS read/write helpers
│   ├── payload.js     ← payload utilities, verbatim from V1
│   └── mcp.js         ← MCP server (Phase 2 placeholder)
├── memory/
│   └── aug.js         ← AUG shared memory (Phase 3 placeholder)
└── output/            ← local mirror of GCS output (gitignored)
```

---

## V1 Reference

The original pipeline: [Fleet Engine: Fathom](https://github.com/BlueSkyGTM/fleet-engine-fathom)

Failure log, 18 documented failure modes, and the architecture decisions that led to V2 are in [CONTEXT.md](CONTEXT.md).
