"""
upload_to_rag.py — Post-run corpus write-back for Fleet Engine V2 ADK pipeline.

Uploads campaign output files to Vertex AI RAG corpora after each pipeline run.
The ADK RagTool is read-only during agent execution; this script handles the writes.

Usage:
  # Always dry-run first to verify format
  python scripts/upload_to_rag.py \
    --corpus 4611686018427387904 \
    --file output/ahab_output.json \
    --type discovery \
    --dry-run

  # When output looks correct, write to corpus
  python scripts/upload_to_rag.py \
    --corpus 4611686018427387904 \
    --file output/ahab_output.json \
    --type discovery

  # Upload Nemo enrichments (ACTIVE leads only)
  python scripts/upload_to_rag.py \
    --corpus NEMO_CORPUS_ID \
    --file output/nemo_output.json \
    --type enrichment \
    --dry-run

  # Upload Neptune Bites
  python scripts/upload_to_rag.py \
    --corpus NEPTUNE_CORPUS_ID \
    --file output/neptune_output.json \
    --type bite \
    --dry-run

Corpus IDs:
  Ahab:    6536218395128365056
  Nemo:    5352756855548411904
  Neptune: 3877687240096219136

Project: project-8bd530c5-c699-4b50-868
Region:  us-central1

Authentication: gcloud auth application-default login
"""

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path


def load_output(path: str) -> list | dict:
    with open(path) as f:
        return json.load(f)


def discovery_text(lead: dict) -> str:
    signals = (lead.get('Raw_Primary_Signals') or []) + (lead.get('Raw_Health_Signals') or [])
    return (
        f"Company: {lead.get('Company_Name', '')}. "
        f"Job URL: {lead.get('Job_URL', '')}. "
        f"Location: {lead.get('Location_Status', '')}. "
        f"Signals: {', '.join(signals)}."
    )


def enrichment_text(lead: dict) -> str:
    el = lead.get('Enriched_Lead', lead)
    divers = el.get('The_Divers', {})
    return (
        f"Company: {el.get('Company_Name', '')}. "
        f"Friction: {el.get('Forensic_Friction_Type', '')}. "
        f"Intent: {el.get('Target_Service_Intent', '')}. "
        f"Funding: {el.get('funding_signal') or 'none'}. "
        f"Notes: {divers.get('friction_notes', '')} {divers.get('health_audit_notes', '')}."
    )


def bite_text(lead: dict) -> str:
    return (
        f"Company: {lead.get('Company_Name', '')}. "
        f"Friction: {lead.get('Forensic_Friction_Type', '')}. "
        f"Intent: {lead.get('Target_Service_Intent', '')}. "
        f"Title: {lead.get('Job_Title', '')}. "
        f"Bite: {lead.get('Outreach_Bite', '')}."
    )


def build_chunks(data, entry_type: str) -> list[dict]:
    """Convert pipeline output JSON to upload-ready text chunks."""
    chunks = []

    if entry_type == 'discovery':
        leads = data.get('Catch', []) if isinstance(data, dict) else data
        for lead in leads:
            name = lead.get('Company_Name', 'unknown')
            chunks.append({
                'id': f"discovery-{name.lower().replace(' ', '-')}",
                'text': discovery_text(lead),
                'metadata': {
                    'type': 'discovery',
                    'company': name,
                    'job_url': lead.get('Job_URL', ''),
                },
            })

    elif entry_type == 'enrichment':
        # nemo_output.json is an array of ACTIVE enrichments (SHIPWRECKED are separate)
        leads = data if isinstance(data, list) else [data]
        for item in leads:
            el = item.get('Enriched_Lead', item)
            name = el.get('Company_Name', 'unknown')
            # Skip SHIPWRECKED entries if they slipped in
            audit = item.get('Nemo_Enrich_Audit', {})
            if audit.get('status') == 'SHIPWRECKED':
                continue
            chunks.append({
                'id': f"enrichment-{name.lower().replace(' ', '-')}",
                'text': enrichment_text(item),
                'metadata': {
                    'type': 'enrichment',
                    'company': name,
                    'friction_type': el.get('Forensic_Friction_Type', ''),
                    'service_intent': el.get('Target_Service_Intent', ''),
                },
            })

    elif entry_type == 'bite':
        leads = data if isinstance(data, list) else [data]
        for lead in leads:
            name = lead.get('Company_Name', 'unknown')
            if not lead.get('Outreach_Bite'):
                continue
            chunks.append({
                'id': f"bite-{name.lower().replace(' ', '-')}",
                'text': bite_text(lead),
                'metadata': {
                    'type': 'bite',
                    'company': name,
                    'friction_type': lead.get('Forensic_Friction_Type', ''),
                    'service_intent': lead.get('Target_Service_Intent', ''),
                },
            })

    return chunks


def upload_chunks(chunks: list[dict], corpus_id: str, project: str, location: str, dry_run: bool):
    """Upload text chunks to the Vertex AI RAG corpus."""
    if dry_run:
        print(f"\n[DRY RUN] Would upload {len(chunks)} chunks to corpus {corpus_id}")
        print(f"[DRY RUN] Project: {project} | Location: {location}\n")
        for i, chunk in enumerate(chunks, 1):
            print(f"  [{i}/{len(chunks)}] {chunk['id']}")
            print(f"    text: {chunk['text'][:120]}...")
            print(f"    metadata: {chunk['metadata']}")
        print(f"\n[DRY RUN] Remove --dry-run to write to corpus.")
        return

    # Write each chunk to a temp file and upload via gcloud CLI
    # The gcloud alpha ai rag-corpora data-files upload command is the
    # supported path for uploading text content to a Vertex AI RAG corpus.
    corpus_name = f"projects/{project}/locations/{location}/ragCorpora/{corpus_id}"
    success = 0
    failed = 0

    for chunk in chunks:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write(chunk['text'])
            tmp_path = tmp.name

        cmd = (
            f"gcloud alpha ai rag-corpora data-files upload "
            f"--corpus={corpus_name} "
            f"--source-file={tmp_path} "
            f"--location={location} "
            f"--display-name={chunk['id']}"
        )

        print(f"  Uploading {chunk['id']}...")
        ret = os.system(cmd)
        os.unlink(tmp_path)

        if ret == 0:
            success += 1
        else:
            print(f"  ERROR: upload failed for {chunk['id']} (exit {ret})")
            failed += 1

    print(f"\nUpload complete: {success} succeeded, {failed} failed")
    if failed:
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Upload Fleet Engine pipeline output to Vertex AI RAG corpus.'
    )
    parser.add_argument('--corpus', required=True,
                        help='Numeric corpus ID (e.g. 4611686018427387904)')
    parser.add_argument('--file', required=True,
                        help='Path to pipeline output JSON file')
    parser.add_argument('--type', required=True,
                        choices=['discovery', 'enrichment', 'bite'],
                        help='Entry type matching the output file')
    parser.add_argument('--project', default='project-8bd530c5-c699-4b50-868',
                        help='GCP project ID')
    parser.add_argument('--location', default='us-central1',
                        help='Region where the corpus lives')
    parser.add_argument('--dry-run', action='store_true',
                        help='Print what would be uploaded without writing to corpus')
    args = parser.parse_args()

    if not Path(args.file).exists():
        print(f"ERROR: file not found: {args.file}")
        sys.exit(1)

    data = load_output(args.file)
    chunks = build_chunks(data, args.type)

    if not chunks:
        print(f"No uploadable entries found in {args.file} for type={args.type}")
        sys.exit(0)

    print(f"Found {len(chunks)} {args.type} entries in {args.file}")
    upload_chunks(chunks, args.corpus, args.project, args.location, args.dry_run)


if __name__ == '__main__':
    main()
