// utils/deliver.js
// Phase 2 — Neptune → Google Sheets delivery
//
// Reads neptune_output.json from GCS and appends all leads to a Google Sheet.
// Uses Application Default Credentials (same ADC as Vertex + GCS).
//
// Required env var (add to .env):
//   GOOGLE_SHEET_ID=<spreadsheet ID from the URL: /spreadsheets/d/<ID>/edit>
//
// Share the sheet with your ADC account (raymondf.gtm@gmail.com) as Editor.

import 'dotenv/config';
import { readJSON }    from './gcs.js';
import { appendLeads } from './sheets.js';

/**
 * deliver(bucket)
 *
 * @param {string} bucket — GCS bucket name
 * @returns {Promise<{ ok: number, failed: number, errors: object[] }>}
 */
export async function deliver(bucket) {
  const leads = await readJSON(bucket, 'neptune_output.json');
  if (!leads?.length) throw new Error('[deliver] neptune_output.json is empty — nothing to deliver');

  console.log(`\n📊 DELIVER — appending ${leads.length} leads to Google Sheet...`);
  const updated = await appendLeads(leads);
  console.log(`\n✅ Deliver — ${updated} rows written`);
  return { ok: updated, failed: 0 };
}
