// utils/vertex.js
// Vertex AI call wrapper — all model calls route through here
// Uses google-auth-library for ADC auth + node-fetch for REST calls to Vertex AI

import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const PROJECT  = process.env.GCP_PROJECT;
const LOCATION = 'us-central1';

export const MODELS = {
  FLASH: 'gemini-2.5-flash',
  PRO:   'gemini-2.5-pro',
};

/**
 * callVertex(model, systemPrompt, userPrompt, options)
 *
 * @param {string} model         — use MODELS.FLASH or MODELS.PRO
 * @param {string} systemPrompt  — agent system prompt, verbatim from REFERENCES.md
 * @param {string} userPrompt    — per-call user content
 * @param {object} [opts]
 * @param {boolean} [opts.grounding=false]  — enable Vertex AI Google Search grounding
 * @param {object}  [opts.schema=null]      — responseSchema for structured output (Neptune)
 * @returns {Promise<object>} parsed JSON response from the model
 */
export async function callVertex(model, systemPrompt, userPrompt, opts = {}) {
  if (!PROJECT) throw new Error('[vertex] GCP_PROJECT is not set in .env');

  const { grounding = false, schema = null } = opts;

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`;

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      temperature: 0,
      // responseMimeType cannot be used with grounding (Vertex API constraint)
      ...(!grounding ? { responseMimeType: 'application/json' } : {}),
      ...(schema ? { responseSchema: schema } : {}),
    },
    ...(grounding ? { tools: [{ googleSearch: {} }] } : {}),
  };

  const client      = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  const token       = tokenResult.token || tokenResult;

  const res = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[vertex] HTTP ${res.status} from Vertex AI: ${errText.slice(0, 400)}`);
  }

  const json    = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(`[vertex] Empty response from model: ${model}\nFull response: ${JSON.stringify(json).slice(0, 400)}`);
  }

  // Strip markdown fences
  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // When grounding is on the model may prefix with prose — extract the JSON object
  if (grounding && !cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `[vertex] Could not parse model response as JSON.\nModel: ${model}\nRaw (500 chars): ${rawText.slice(0, 500)}\nParse error: ${err.message}`
    );
  }
}
