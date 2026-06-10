// utils/gcs.js
// GCS read/write helpers — the shared handoff layer between agents
// Ahab writes → Nemo reads → Neptune reads. No polling. No middleware.

import { Storage }         from '@google-cloud/storage';
import { writeFile, mkdir } from 'fs/promises';
import { join }             from 'path';

const storage    = new Storage();
const OUTPUT_DIR = './output';

/**
 * writeJSON(bucket, filename, data)
 * Serializes data to JSON and uploads to GCS.
 * Also mirrors to ./output/ for local review.
 */
export async function writeJSON(bucket, filename, data) {
  const serialized = JSON.stringify(data, null, 2);

  if (process.env.DRY_RUN === 'true') {
    console.log(`[gcs] 🧪 DRY_RUN — skipped write: ${filename}`);
    await _mirror(filename, serialized);
    return;
  }

  await storage.bucket(bucket).file(filename).save(serialized, {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-cache' },
  });

  console.log(`[gcs] ✓ wrote gs://${bucket}/${filename}`);
  await _mirror(filename, serialized);
}

/**
 * readJSON(bucket, filename)
 * Downloads and parses a JSON file from GCS.
 */
export async function readJSON(bucket, filename) {
  let contents;
  try {
    [contents] = await storage.bucket(bucket).file(filename).download();
  } catch (err) {
    throw new Error(`[gcs] Could not download gs://${bucket}/${filename}: ${err.message}`);
  }

  try {
    return JSON.parse(contents.toString('utf-8'));
  } catch (err) {
    throw new Error(`[gcs] gs://${bucket}/${filename} is not valid JSON: ${err.message}`);
  }
}

/**
 * fileExists(bucket, filename)
 * Returns true if the file exists in the bucket.
 * Used by run.js to gate stage transitions.
 */
export async function fileExists(bucket, filename) {
  const [exists] = await storage.bucket(bucket).file(filename).exists();
  return exists;
}

// Internal: mirror a file to ./output/ for human review
async function _mirror(filename, serialized) {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(join(OUTPUT_DIR, filename), serialized, 'utf-8');
    console.log(`[gcs] ✓ mirrored to output/${filename}`);
  } catch (err) {
    console.warn(`[gcs] local mirror failed for ${filename}: ${err.message}`);
  }
}
