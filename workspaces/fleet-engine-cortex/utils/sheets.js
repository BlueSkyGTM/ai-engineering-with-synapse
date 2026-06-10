// utils/sheets.js
// Google Sheets delivery via Apps Script webhook.
// No Google API auth needed — just a POST to a URL.
//
// Setup (one time):
//   1. Open your Google Sheet
//   2. Extensions → Apps Script
//   3. Paste the code from SHEETS_WEBHOOK.gs (in this repo)
//   4. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone
//   5. Copy the web app URL → add to .env as SHEETS_WEBHOOK_URL

import fetch from 'node-fetch';

const HEADERS = [
  'Company', 'URL', 'Contact Name', 'Contact Title', 'Email',
  'Friction Type', 'Funding Signal', 'Service Intent',
  'Outreach Bite', 'Run Date',
];

function leadToRow(lead) {
  return {
    company:       lead.Company_Name            ?? '',
    url:           lead.Direct_URL              ?? '',
    contact_name:  lead.Contact_Recon?.name     ?? '',
    contact_title: lead.Contact_Recon?.title    ?? '',
    email:         lead.Contact_Recon?.email    ?? '',
    friction:      lead.Forensic_Friction_Type  ?? '',
    funding:       lead.funding_signal          ?? '',
    intent:        lead.Target_Service_Intent   ?? '',
    bite:          lead.Outreach_Bite           ?? '',
    date:          new Date().toISOString().slice(0, 10),
  };
}

export async function appendLeads(leads) {
  const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
  if (!webhookUrl) throw new Error(
    '[sheets] SHEETS_WEBHOOK_URL not set in .env\n' +
    '         See SHEETS_WEBHOOK.gs in this repo for setup instructions.'
  );

  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ headers: HEADERS, rows: leads.map(leadToRow) }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[sheets] Webhook returned ${res.status}: ${text.slice(0, 200)}`);
  }

  console.log(`[sheets] ✓ ${leads.length} leads sent to sheet`);
  return leads.length;
}
