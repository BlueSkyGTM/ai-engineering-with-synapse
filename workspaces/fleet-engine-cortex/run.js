// run.js
// Single entry point — runs ahab → nemo → neptune in sequence
// Usage: node run.js "campaign message"

import 'dotenv/config';
import { randomUUID } from 'crypto';
import { runAhab }    from './agents/ahab.js';
import { runNemo }    from './agents/nemo.js';
import { runNeptune } from './agents/neptune.js';
import { fileExists } from './utils/gcs.js';
import { deliver }    from './utils/deliver.js';

async function main() {
  // DELIVER_ONLY=true — skip all agents, just push existing neptune_output.json
  if (process.env.DELIVER_ONLY === 'true') {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) { console.error('❌  GCS_BUCKET not set'); process.exit(1); }
    console.log('\n📊 DELIVER_ONLY — pushing existing neptune_output.json to sheet...');
    await deliver(bucket);
    console.log('  Done.\n');
    process.exit(0);
  }

  const campaign = process.argv[2];

  if (!campaign?.trim()) {
    console.error('\n❌  No campaign message provided.');
    console.error('    Usage: node run.js "your campaign message"');
    console.error('    To deliver existing output: DELIVER_ONLY=true node run.js\n');
    process.exit(1);
  }

  const bucket  = process.env.GCS_BUCKET;
  const project = process.env.GCP_PROJECT;

  if (!bucket || !project) {
    console.error('\n❌  Missing environment variables.');
    console.error(`    GCP_PROJECT: ${project  ? '✅' : '❌ not set'}`);
    console.error(`    GCS_BUCKET:  ${bucket   ? '✅' : '❌ not set'}`);
    console.error('\n    Copy .env.example → .env and fill in your values.\n');
    process.exit(1);
  }

  // ── Env flags ─────────────────────────────────────────────────────────────
  // SKIP_RAG=true   — disables all RAG calls (faster, no embedding cost)
  // AHAB_ONLY=true  — stops after Ahab writes ahab_output.json
  // NEMO_ONLY=true  — stops after Nemo writes nemo_output.json + shipwrecked.json
  // DRY_RUN=true    — skips all GCS writes (handled in utils/gcs.js)
  const SKIP_RAG  = process.env.SKIP_RAG  === 'true';
  const AHAB_ONLY = process.env.AHAB_ONLY === 'true';
  const NEMO_ONLY = process.env.NEMO_ONLY === 'true';
  const DRY_RUN   = process.env.DRY_RUN   === 'true';

  if (SKIP_RAG)  console.log('  ⚡ SKIP_RAG=true  — RAG calls disabled');
  if (AHAB_ONLY) console.log('  🪝 AHAB_ONLY=true — pipeline will stop after Ahab');
  if (NEMO_ONLY) console.log('  🔬 NEMO_ONLY=true — pipeline will stop after Nemo');
  if (DRY_RUN)   console.log('  🧪 DRY_RUN=true   — GCS writes suppressed');

  // One run ID ties all three agents together in the RAG store.
  // Entries from this run are excluded from their own queries (no self-reference).
  const runId = randomUUID();

  console.log('\n══════════════════════════════════════');
  console.log('  FLEET ENGINE V2 — pipeline starting');
  console.log(`  Project: ${project}`);
  console.log(`  Bucket:  gs://${bucket}`);
  console.log(`  Run ID:  ${runId}`);
  console.log('══════════════════════════════════════');

  // ── Ahab ─────────────────────────────────────────────────────────────────
  const ahabOutput = await runAhab(campaign, runId, { skipRag: SKIP_RAG });
  if (!DRY_RUN) await gate(bucket, 'ahab_output.json');

  const catchCount = ahabOutput?.Catch?.length ?? 0;
  if (catchCount === 0) {
    console.warn('\n⚠️  Ahab returned an empty Catch. Try a broader campaign message.\n');
    process.exit(0);
  }

  if (AHAB_ONLY) {
    console.log('\n🪝 AHAB_ONLY — stopping after Ahab. Output: output/ahab_output.json\n');
    process.exit(0);
  }

  // ── Nemo ──────────────────────────────────────────────────────────────────
  const { active, shipwrecked } = await runNemo(ahabOutput, runId, { skipRag: SKIP_RAG });
  if (!DRY_RUN) await gate(bucket, 'nemo_output.json');
  if (!DRY_RUN) await gate(bucket, 'shipwrecked.json');

  if (active.length === 0) {
    console.warn('\n⚠️  All leads shipwrecked. Check output/shipwrecked.json for reason codes.\n');
    process.exit(0);
  }

  if (NEMO_ONLY) {
    console.log('\n🔬 NEMO_ONLY — stopping after Nemo. Output: output/nemo_output.json\n');
    process.exit(0);
  }

  // ── Neptune ───────────────────────────────────────────────────────────────
  const finished = await runNeptune(active, runId, { skipRag: SKIP_RAG });
  if (!DRY_RUN) await gate(bucket, 'neptune_output.json');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('  FLEET ENGINE V2 — run complete');
  console.log('══════════════════════════════════════');
  console.log(`  Ahab Catch:       ${catchCount}`);
  console.log(`  Nemo Active:      ${active.length}`);
  console.log(`  Nemo Shipwrecked: ${shipwrecked.length}`);
  console.log(`  Neptune Finished: ${finished.length}`);
  console.log('');
  console.log(`  GCS:   gs://${bucket}/neptune_output.json`);
  console.log(`  Local: output/neptune_output.json`);

  if (finished.length >= 50) {
    console.log('\n  🎯 PHASE 1 GATE MET — 50+ leads with Outreach_Bite');
    console.log('     Run: DELIVER_ONLY=true node run.js  ← push all leads to Google Sheets');
  } else {
    console.log(`\n  📊 Phase 1 progress: ${finished.length}/50 leads`);
  }

  // ── Deliver (Phase 2) ──────────────────────────────────────────────────────
  if (process.env.DELIVER === 'true') {
    await deliver(bucket);
  }

  console.log('\n  Update STATE.md with this run\'s results.\n');
}

// Confirm a file exists in GCS before proceeding to the next stage
async function gate(bucket, filename) {
  const exists = await fileExists(bucket, filename);
  if (!exists) {
    throw new Error(
      `[run] Expected gs://${bucket}/${filename} after stage — file not found. ` +
      `Check for errors above.`
    );
  }
}

main().catch(err => {
  console.error('\n❌  Pipeline error:', err.message);
  process.exit(1);
});
