// utils/payload.js
// Payload utility functions — extracted verbatim from REFERENCES.md
// Do not modify these functions. They are preserved from V1 exactly.

// ─── Aggregator Blocklist ────────────────────────────────────────────────────

export const AGGREGATORS = new Set([
  'jobgether', 'jobsora', 'indeed', 'glassdoor', 'linkedin', 'ziprecruiter'
]);

// ─── extractFrictionType ─────────────────────────────────────────────────────

export function extractFrictionType(payload) {
  const lead = payload?.Enriched_Lead || payload || {};
  const divers = lead.The_Divers || payload?.The_Divers || {};

  const candidates = [
    lead.Forensic_Friction_Type,
    lead.friction_type,
    divers.friction_notes,
    lead.friction_notes,
  ];

  const forensicTerms = [
    'API Stutter',
    'Scale Friction',
    'Manual Data Debt',
    'Displacement Signal',
  ];

  const serviceIntents = ['GTM', 'Accounting'];

  for (const val of candidates) {
    if (typeof val !== 'string') continue;
    const found = forensicTerms.find(term => val.toLowerCase().includes(term.toLowerCase()));
    if (found) return found;
    if (serviceIntents.some(intent => val.trim().toUpperCase() === intent)) continue;
    if (forensicTerms.includes(val.trim())) return val.trim();
  }

  return null;
}

// ─── extractFundingSignal ────────────────────────────────────────────────────

export function extractFundingSignal(payload) {
  if (payload?.Enriched_Lead?.funding_signal) return payload.Enriched_Lead.funding_signal;
  if (payload?.funding_signal) return payload.funding_signal;
  if (payload?.Nemo_Enrich_Audit?.funding_signal) return payload.Nemo_Enrich_Audit.funding_signal;

  const notes =
    payload?.The_Divers?.health_audit_notes ||
    payload?.Enriched_Lead?.The_Divers?.health_audit_notes ||
    '';

  if (typeof notes === 'string' && notes) {
    const m = notes.match(/\$[\d.,]+\s*[MBK]?(?:\s*million|\s*billion)?|Series\s+[A-E]|Seed\s+(?:round)?|Pre-?[Ss]eed/i);
    if (m) return m[0];
  }
  return null;
}

// ─── normalizeNemoPayload ────────────────────────────────────────────────────

export function normalizeNemoPayload(payload) {
  const email =
    payload?.Contact_Recon?.email ||
    payload?.Contact_Recon?.email_pattern ||
    payload?.Contact_Recon?.email_pattern_guess ||
    payload?.contact_recon?.email ||
    payload?.contact_recon?.email_pattern ||
    payload?.contact_recon?.email_pattern_guess ||
    payload?.Enriched_Lead?.Contact_Recon?.email ||
    payload?.email ||
    null;

  const contactRaw =
    payload?.Contact_Recon ||
    payload?.contact_recon ||
    payload?.Enriched_Lead?.Contact_Recon ||
    null;

  return {
    email,
    contact_recon: contactRaw || null,
    friction_type: extractFrictionType(payload),
  };
}

// ─── sanitizeDirectUrl ───────────────────────────────────────────────────────

export function sanitizeDirectUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('vertexaisearch') || url.includes('grounding-api-redirect')) return null;
  return url;
}

// ─── stripCitations ──────────────────────────────────────────────────────────

export function stripCitations(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim();
}
