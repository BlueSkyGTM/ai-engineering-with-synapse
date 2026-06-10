// memory/rag.js
// RAG shared memory — the intelligence layer shared across all three agents
//
// HOW IT WORKS:
//   Ahab  → queries for previously discovered companies (dedup supplement)
//           writes  each Catch entry as a 'discovery' record
//   Nemo  → queries for similar enrichment profiles before each lead
//           writes  each ACTIVE enrichment as an 'enrichment' record
//   Neptune → queries for similar Bites before each synthesis
//             writes  each finished Bite as a 'bite' record
//
// WHY IT IMPROVES OVER TIME:
//   The store accumulates embeddings across sessions. By run 5 you have a real
//   corpus. Neptune actively avoids repeating itself. Nemo calibrates friction
//   typing against patterns it has seen. Ahab stops re-harvesting dead ends.
//
// STORE LOCATION: gs://{GCS_BUCKET}/rag_store.json
// EMBEDDING MODEL: text-embedding-004 (Vertex AI, 768 dimensions, unit-normalized)

import fetch  from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';
import { Storage }    from '@google-cloud/storage';
import { writeFile, mkdir } from 'fs/promises';
import { join }             from 'path';
import { randomUUID }       from 'crypto';

const auth    = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const storage = new Storage();

const LOCATION   = 'us-central1';
const EMBED_MODEL = 'text-embedding-004';
const STORE_FILE  = 'rag_store.json';
const OUTPUT_DIR  = './output';

// ── Embedding ─────────────────────────────────────────────────────────────────

/**
 * embed(text, taskType?)
 * Calls Vertex AI text-embedding-004 and returns a float[] embedding vector.
 *
 * @param {string} text
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {Promise<number[]>}
 */
export async function embed(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const project  = process.env.GCP_PROJECT;
  if (!project) throw new Error('[rag] GCP_PROJECT not set');

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${project}/locations/${LOCATION}/publishers/google/models/${EMBED_MODEL}:predict`;

  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ content: text, task_type: taskType }] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[rag] Embedding API HTTP ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  const values = json?.predictions?.[0]?.embeddings?.values;
  if (!values?.length) throw new Error('[rag] Embedding API returned empty values');
  return values;
}

/**
 * embedBatch(texts, taskType?)
 * Embeds multiple texts in a single API call. Returns array of float[] in same order.
 *
 * @param {string[]} texts
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  const project = process.env.GCP_PROJECT;
  if (!project) throw new Error('[rag] GCP_PROJECT not set');

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${project}/locations/${LOCATION}/publishers/google/models/${EMBED_MODEL}:predict`;

  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: texts.map(t => ({ content: t, task_type: taskType })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[rag] Batch embedding API HTTP ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return (json?.predictions ?? []).map(p => p?.embeddings?.values ?? []);
}

// ── Store I/O ─────────────────────────────────────────────────────────────────

/**
 * loadStore(bucket) → Entry[]
 * Reads rag_store.json from GCS. Returns [] on first run (file does not exist yet).
 */
export async function loadStore(bucket) {
  try {
    const [contents] = await storage.bucket(bucket).file(STORE_FILE).download();
    return JSON.parse(contents.toString('utf-8'));
  } catch (err) {
    if (err.code === 404 || err.message?.includes('No such object')) {
      return []; // first run — store does not exist yet
    }
    throw new Error(`[rag] loadStore failed: ${err.message}`);
  }
}

/**
 * saveStore(bucket, store) → void
 * Writes the full store array to GCS and mirrors to output/.
 */
export async function saveStore(bucket, store) {
  const serialized = JSON.stringify(store, null, 2);
  await storage.bucket(bucket).file(STORE_FILE).save(serialized, {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-cache' },
  });
  console.log(`[rag] ✓ store saved — ${store.length} entries in gs://${bucket}/${STORE_FILE}`);
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(join(OUTPUT_DIR, STORE_FILE), serialized, 'utf-8');
  } catch { /* mirror failure is non-fatal */ }
}

// ── Write API ─────────────────────────────────────────────────────────────────

/**
 * upsert(bucket, entry) → void
 * Adds a single entry to the store. Embeds entry.text automatically.
 * Use for Nemo and Neptune (one lead at a time).
 *
 * Entry shape (before calling upsert — no id/embedding/timestamp needed):
 * {
 *   type:     'discovery' | 'enrichment' | 'bite'
 *   run_id:   string
 *   text:     string   ← what to embed
 *   metadata: object   ← type-specific fields (see helpers below)
 * }
 */
export async function upsert(bucket, entry) {
  const embedding = await embed(entry.text, 'RETRIEVAL_DOCUMENT');
  const full = {
    id:        randomUUID(),
    timestamp: new Date().toISOString(),
    embedding,
    ...entry,
  };

  const store = await loadStore(bucket);
  store.push(full);
  await saveStore(bucket, store);
}

/**
 * bulkUpsert(bucket, entries) → void
 * Adds many entries in a single GCS read/write cycle.
 * Use for Ahab (batching the full Catch array after a run).
 */
export async function bulkUpsert(bucket, entries) {
  if (!entries.length) return;

  // Embed all texts in one API call
  const texts      = entries.map(e => e.text);
  const embeddings = await embedBatch(texts, 'RETRIEVAL_DOCUMENT');

  const timestamp = new Date().toISOString();
  const full = entries.map((e, i) => ({
    id:        randomUUID(),
    timestamp,
    embedding: embeddings[i],
    ...e,
  }));

  const store = await loadStore(bucket);
  store.push(...full);
  await saveStore(bucket, store);
  console.log(`[rag] ✓ bulk upserted ${full.length} entries`);
}

// ── Query API ─────────────────────────────────────────────────────────────────

/**
 * query(bucket, queryText, opts?) → Entry[]
 * Embeds queryText, computes cosine similarity against the store,
 * returns the top-K most relevant entries.
 *
 * @param {string}   bucket
 * @param {string}   queryText
 * @param {object}   [opts]
 * @param {string[]} [opts.types]          — filter to specific entry types
 * @param {number}   [opts.topK=3]         — number of results to return
 * @param {string}   [opts.excludeRunId]   — exclude entries from this run (avoid self-reference)
 * @returns {Promise<object[]>}
 */
export async function query(bucket, queryText, opts = {}) {
  const { types = null, topK = 3, excludeRunId = null } = opts;

  const store = await loadStore(bucket);
  if (!store.length) return [];

  // Filter by type and exclude current run
  let candidates = store.filter(e => {
    if (types && !types.includes(e.type)) return false;
    if (excludeRunId && e.run_id === excludeRunId) return false;
    return true;
  });

  if (!candidates.length) return [];

  const queryVec = await embed(queryText, 'RETRIEVAL_QUERY');

  // Score and sort by cosine similarity
  const scored = candidates.map(e => ({
    entry: e,
    score: cosineSimilarity(queryVec, e.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.entry);
}

// ── Helpers: build entry text strings ────────────────────────────────────────
// These helpers format the text that gets embedded for each entry type.
// Consistent format = better recall. Do not modify without updating all three agents.

/**
 * discoveryText(lead) — for Ahab Catch entries
 */
export function discoveryText(lead) {
  const primary = (lead.Raw_Primary_Signals ?? []).join(', ') || 'none';
  const health  = (lead.Raw_Health_Signals  ?? []).join(', ') || 'none';
  return `Company: ${lead.Company_Name}. Location: ${lead.Location_Status ?? 'unknown'}. Tech signals: ${primary}. Growth signals: ${health}.`;
}

/**
 * enrichmentText(enrichedLead) — for Nemo ACTIVE outputs
 */
export function enrichmentText(lead) {
  const divers = lead?.The_Divers ?? {};
  return `Company: ${lead.Company_Name}. Friction: ${lead.Forensic_Friction_Type}. Service intent: ${lead.Target_Service_Intent}. ${divers.friction_notes ?? ''}`.trim();
}

/**
 * biteText(finishedLead) — for Neptune finished outputs
 */
export function biteText(lead) {
  return `Friction: ${lead.Forensic_Friction_Type}. Role: ${lead.Job_Title ?? 'unknown'}. Service: ${lead.Target_Service_Intent}. Bite: ${lead.Outreach_Bite}`;
}

// ── Context formatters ────────────────────────────────────────────────────────
// Each agent calls one of these to format retrieved entries into injected context.

/**
 * formatDiscoveryContext(entries) — injected into Ahab's campaign message
 * Produces a deduplification supplement listing previously found companies.
 */
export function formatDiscoveryContext(entries) {
  if (!entries.length) return '';
  const lines = entries.map(e => `- ${e.metadata.company_name} (signals: ${(e.metadata.signals ?? []).slice(0, 3).join(', ')})`);
  return `\n\nPreviously discovered companies — do not re-harvest these:\n${lines.join('\n')}`;
}

/**
 * formatEnrichmentContext(entries) — injected into Nemo's lead prompt
 * Shows similar friction patterns seen in prior runs.
 */
export function formatEnrichmentContext(entries) {
  if (!entries.length) return '';
  const lines = entries.map((e, i) =>
    `${i + 1}. ${e.metadata.company_name} — Friction: ${e.metadata.friction_type} — "${e.metadata.friction_notes ?? ''}"`
  );
  return `\n\nSimilar enrichment patterns from prior pipeline runs (use for calibration only — do not copy):\n${lines.join('\n')}`;
}

/**
 * formatBiteContext(entries) — injected into Neptune's synthesis prompt
 * Shows prior Bites with similar profiles so Neptune actively varies its output.
 */
export function formatBiteContext(entries) {
  if (!entries.length) return '';
  const lines = entries.map((e, i) =>
    `${i + 1}. [${e.metadata.friction_type} / ${e.metadata.contact_title ?? 'unknown role'}] "${e.metadata.outreach_bite}"`
  );
  return `\n\nReference Bites from similar profiles in prior runs (vary from these — no repeated openings, no repeated villain naming, no repeated CTAs):\n${lines.join('\n')}`;
}

// ── Math ──────────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
