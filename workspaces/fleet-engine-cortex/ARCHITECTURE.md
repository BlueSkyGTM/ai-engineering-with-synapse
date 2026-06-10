# ARCHITECTURE.md — System Design

## Data Flow

```
Campaign Message (CLI input)
        │
        ▼
   ┌─────────┐  ◄── RAG query: prior discoveries → dedup supplement
   │  AHAB   │  gemini-2.5-flash + Vertex AI Grounding
   │ Hunter  │  Executes 5+ search queries, filters aggregators,
   └─────────┘  extracts raw company signals
        │   └──► RAG write: bulk-upserts Catch as 'discovery' entries
        │
        │  ahab_output.json → GCS bucket
        ▼
   ┌─────────┐  ◄── RAG query: similar enrichments → friction calibration
   │  NEMO   │  gemini-2.5-pro + Vertex AI Grounding
   │ Analyst │  Single-lead diagnostic enrichment, friction typing,
   └─────────┘  contact recon, CATALYST_STALE shipwreck logic
        │   └──► RAG write: upserts each ACTIVE enrichment as 'enrichment' entry
        │
        │  nemo_output.json → GCS bucket
        │  shipwrecked.json → GCS bucket
        ▼
   ┌──────────────────────────────────────┐
   │  RAG STORE  (rag_store.json on GCS)  │  Live across all runs
   │  Embedding model: text-embedding-004 │  Grows smarter every session
   │  Retrieval: cosine similarity top-K  │  All three agents read + write
   └──────────────────────────────────────┘
        │
        ▼
   ┌─────────┐  ◄── RAG query: similar Bites → Neptune varies output
   │ NEPTUNE │  gemini-2.5-pro, responseSchema enforced
   │ Engine  │  Schwartz-style Outreach Bite synthesis,
   └─────────┘  contact frame routing, funding signal handling
        │   └──► RAG write: upserts each finished Bite as 'bite' entry
        │
        │  neptune_output.json → GCS bucket
        ▼
   ┌─────────┐
   │   MCP   │  Phase 2
   │ Server  │  Delivers Neptune output to Clay, HubSpot,
   └─────────┘  Google Sheets, or any downstream tool
```

---

## Phase Map

### Phase 1 — GCS Pipeline (current)
Replace hostile infrastructure with Cloud Storage handoff.
Agents run sequentially via Claude Code. Output is human-readable JSON.

Files produced:
- `ahab_output.json` — raw Catch array from Ahab
- `nemo_output.json` — enriched active leads
- `shipwrecked.json` — leads that failed CATALYST_STALE or enrichment
- `neptune_output.json` — final leads with Outreach_Bite

Success gate: 50 leads in neptune_output.json with Outreach_Bite populated.

### Phase 2 — MCP Delivery Layer
MCP server reads neptune_output.json and exposes tools for downstream consumption.

Tools to expose:
- `get_leads` — returns all finished leads
- `get_lead_by_company` — returns single lead by company name
- `push_to_sheet` — writes Neptune output to a Google Sheet
- `push_to_sheet — appends leads to Google Sheets (Apps Script webhook)

Success gate: At least one downstream tool receiving Neptune output without manual file handling.

### Phase 3 — RAG Shared Memory
All three agents are RAG agents. They query a shared vector store before running
and write their results back after. The store lives in GCS as `rag_store.json`
and persists across sessions — it compounds with every pipeline run.

Entry types:
- `discovery`  — written by Ahab after each Catch. Read by Ahab to avoid re-harvesting.
- `enrichment` — written by Nemo after each ACTIVE lead. Read by Nemo for friction calibration.
- `bite`       — written by Neptune after each Bite. Read by Neptune to vary output.

Each entry:
```json
{
  "id":        "uuid",
  "type":      "discovery | enrichment | bite",
  "run_id":    "string",
  "timestamp": "ISO string",
  "text":      "string — the text that was embedded",
  "embedding": [768 floats — text-embedding-004],
  "metadata":  { "...type-specific fields..." }
}
```

Retrieval: cosine similarity against query embedding, top-K returned.
Entries from the current run are excluded from their own queries (no self-reference).

**Why it compounds:**
- Run 1: Store has ~30–60 entries. Agents have thin context.
- Run 5: Store has 150–300 entries. Neptune actively varies Bites. Nemo calibrates consistently.
- Run 10+: Store is a real corpus. Every Bite is novel. Every friction type is pattern-matched against
  hundreds of prior observations.

Success gate: Neptune Bites differ structurally across leads in the same run without
being explicitly prompted to do so.

---

## Google Cloud Services Used

| Service | Purpose | Phase |
|---|---|---|
| Vertex AI (Grounding) | Ahab search, Nemo enrichment | 1 |
| Vertex AI (Pro) | Nemo enrichment, Neptune synthesis | 1 |
| Cloud Storage | Agent handoff layer | 1 |
| Secret Manager | Environment variables | 1 |
| Cloud Run (optional) | MCP server hosting | 2 |
| Vertex AI text-embedding-004 | RAG store embeddings | 3 |

---

## Environment Variables

```
GCP_PROJECT=        # Google Cloud project ID
GCS_BUCKET=         # Cloud Storage bucket name
GOOGLE_APPLICATION_CREDENTIALS=  # Path to service account key (if not using ADC)
PORT=               # MCP server port (Phase 2, default 3001)
```

Authentication: Application Default Credentials via `gcloud auth application-default login`.
No API keys. No hardcoded credentials.

---

## Agent Model Selection Rationale

**Ahab → gemini-2.5-flash**
Speed over depth. Ahab's job is volume — fill the Catch array as fast as possible.
Flash handles the search iteration and filtering at lower cost and latency.

**Nemo → gemini-2.5-pro**
Depth over speed. Single-lead enrichment requires reasoning across multiple signals,
contact verification, and friction classification. Pro handles the diagnostic load.

**Neptune → gemini-2.5-pro with responseSchema**
Structured output enforcement. Neptune must return a valid Outreach_Bite string
and a Neptune_Log object. The responseSchema constraint ensures parseable output
without a secondary cleanup pass.
