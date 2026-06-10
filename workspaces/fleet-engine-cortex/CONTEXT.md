# CONTEXT.md — Fleet Engine V2

## What This Is

A cloud-native GTM enrichment pipeline. Three sequential AI agents — Ahab, Nemo, Neptune —
running over Google Cloud Storage handoffs and Vertex AI model calls.

The build is complete. This file exists so Claude Code understands the system
before touching anything.

---

## The Three Agents

**Ahab** — Discovery. Runs Vertex AI Grounding (Gemini 2.5 Flash) with 5+ search queries.
Produces a `Catch` array of raw company leads. Writes `ahab_output.json` to GCS.

**Nemo** — Enrichment. Reads Ahab's output. Runs one Pro call per lead (Gemini 2.5 Pro + Grounding).
Classifies friction type, verifies the direct URL, identifies a contact, applies CATALYST_STALE
logic. Splits output into `nemo_output.json` (active) and `shipwrecked.json` (failed).

**Neptune** — Synthesis. Reads Nemo's active leads. Runs one Pro call per lead (Gemini 2.5 Pro,
responseSchema enforced). Produces a Schwartz-style `Outreach_Bite` for each lead.
Writes `neptune_output.json` to GCS.

---

## How Agents Hand Off

GCS is the shared space. There is no polling, no middleware, no status fields.

```
Ahab  → writes ahab_output.json  → GCS
Nemo  → reads  ahab_output.json  ← GCS
Nemo  → writes nemo_output.json  → GCS
Neptune → reads nemo_output.json ← GCS
Neptune → writes neptune_output.json → GCS
```

`run.js` orchestrates the sequence. After each stage it calls `gate()` to confirm
the expected file landed in GCS before proceeding. If it didn't, the pipeline throws.

---

## What MCP Is For

MCP is **not** used for inter-agent handoffs. GCS handles that.

MCP is the **downstream delivery layer** (Phase 2). After Neptune writes its output,
the MCP server reads `neptune_output.json` and exposes tools for pushing leads to
Google Sheets without manual file handling.

`utils/mcp.js` is a stub. Do not implement it until 50 leads clear the full pipeline.

---

## What RAG Is For

A shared vector store (`rag_store.json` on GCS) that compounds across runs.

- Ahab queries it before discovery to exclude companies already in the pipeline
- Nemo queries it before enrichment to calibrate friction classification
- Neptune queries it before synthesis to vary Outreach Bite structure

All RAG calls are wrapped in try/catch and non-fatal. For Phase 1 runs, use `SKIP_RAG=true`.
The store starts empty — it only becomes useful after 5+ runs.

---

## Why V1 Failed

V1 ran on Postgres + n8n + Docker on a GCP VM. Every failure was environmental:
Docker variable conflicts, n8n payload interpretation errors, Postgres connection exhaustion.
The agents worked across 1,500 cycles. The infrastructure didn't.

V2 eliminates the execution environment as a failure domain. GCS is the only shared state.
Claude Code is the only orchestrator. Vertex AI is the only model layer.

---

## Source of Truth Hierarchy

1. `run.js` — what actually runs
2. `agents/` — what the agents do
3. `utils/` — how infrastructure calls are made
4. `STATE.md` — current pipeline state and run history
5. This file — context only, not authoritative on behavior

---

## GCS Bucket Naming Convention

Use `fleet-engine-cortex-[project-id]` as the bucket name (globally unique, us-central1).
Example: if project is `my-project-123`, bucket is `fleet-engine-cortex-my-project-123`.
