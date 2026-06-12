# /write-quiz

Generate a `quiz.json` for a lesson. Questions grounded in lesson content only.
Uses GLM-5.1 (reasoning). Active from Stage 04.

Quiz schema: 6 questions total — 1 pre + 3 check + 2 post. Correct answer is a
zero-indexed integer. FSRS block is empty at creation; Helix populates it on first answer.

## When to invoke
- Stage 04 quiz/recall design is running
- A lesson doc exists and needs quiz questions
- User says "write quiz for [lesson]", "generate questions for [topic]"
- Never run before the lesson's `docs/en.md` objectives are confirmed

## Chain

### Step 0 — Pre-flight
```bash
python3 -c "import openai" 2>/dev/null || { echo "ERROR: pip install openai"; exit 1; }
[ -n "$ZHIPUAI_API_KEY" ] || { echo "ERROR: ZHIPUAI_API_KEY not set — check .env"; exit 1; }
[ -f "stages/00-a-curriculum-archaeology/output/quiz-format-spec.md" ] || { echo "ERROR: quiz-format-spec.md missing — run Stage 00-a first"; exit 1; }
```

### Step 1 — Read context (governed maze: extract only what GLM needs)
```bash
LESSON_DOC="${1:-}"
[ -f "$LESSON_DOC" ] || { echo "ERROR: lesson file not found: $LESSON_DOC"; exit 1; }

# Extract quiz spec rules — not the full file
QUIZ_SPEC=$(python3 -c "
import re
text = open('stages/00-a-curriculum-archaeology/output/quiz-format-spec.md').read()
sections = ['## JSON Schema', '## Question quality rules', '## Scoring model']
out = []
for s in sections:
    m = re.search(re.escape(s) + r'(.*?)(?=\n## |\Z)', text, re.DOTALL)
    if m:
        out.append(s + m.group(1).rstrip())
print('\n\n'.join(out))
" 2>/dev/null | head -100)  # cap at ~360 tokens

# Extract lesson objectives only — not the full lesson (quiz must be grounded in these)
LESSON_OBJECTIVES=$(python3 -c "
import re
text = open('$LESSON_DOC').read()
sections = ['## Learning Objectives', '## The Concept', '## Key Terms']
out = []
for s in sections:
    m = re.search(re.escape(s) + r'(.*?)(?=\n## |\Z)', text, re.DOTALL)
    if m:
        out.append(s + m.group(1).rstrip())
print('\n\n'.join(out))
" 2>/dev/null | head -80)

echo "$QUIZ_SPEC" > /tmp/zai_quiz_spec.txt
echo "$LESSON_OBJECTIVES" > /tmp/zai_quiz_objectives.txt
```

### Step 2 — Call GLM-5.1 + write output
```bash
# Derive output path: same directory as lesson doc, as quiz.json
LESSON_DIR=$(dirname "$LESSON_DOC")
OUTPUT_FILE="$LESSON_DIR/quiz.json"

python3 - "$LESSON_DOC" /tmp/zai_quiz_spec.txt /tmp/zai_quiz_objectives.txt <<'PYEOF' > "$OUTPUT_FILE"
import os, sys

sys.stdout.reconfigure(encoding='utf-8')
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["ZHIPUAI_API_KEY"],
    base_url=os.environ.get("ZAI_BASE_URL", "https://api.z.ai/api/coding/paas/v4"),
)

lesson_path  = sys.argv[1] if len(sys.argv) > 1 else ""
spec         = open(sys.argv[2]).read() if len(sys.argv) > 2 else ""
objectives   = open(sys.argv[3]).read() if len(sys.argv) > 3 else ""

SYSTEM = """You write quiz questions for a GTM engineering curriculum.
Rules:
- Every question must be answerable from the lesson content — no outside knowledge
- Questions test understanding and application, not memorization of wording
- Exactly 4 options per question — always 4, never 3 or 5
- correct is a ZERO-INDEXED integer (0 = first option)
- Distractors must be plausible — things a smart person might believe
- explanation is mandatory — minimum 2 sentences explaining why correct + why it matters
- Distribution: 1 pre (prior knowledge/misconception) + 3 check (one per sub-concept) + 2 post (application)
- Output ONLY a valid JSON object — no markdown fences, no preamble, no trailing text"""

USER = f"""Write 6 quiz questions for this lesson (1 pre + 3 check + 2 post).

Schema and quality rules (follow exactly):
{spec}

Lesson objectives and concepts to test:
{objectives}

Output JSON object only:
{{
  "questions": [
    {{
      "id": "q1",
      "stage": "pre",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "...",
      "fsrs": {{"due": null, "stability": 0, "difficulty": 5, "elapsed_days": 0, "scheduled_days": 0, "reps": 0, "lapses": 0, "state": 0, "last_review": null}}
    }}
  ]
}}"""

response = client.chat.completions.create(
    model="GLM-5.1",
    messages=[
        {"role": "system", "content": SYSTEM},
        {"role": "user",   "content": USER},
    ],
    max_tokens=3000,
    stream=True,
)
for chunk in response:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
print()
PYEOF
```

### Step 3 — Validate JSON + report
```bash
BYTES=$(wc -c < "$OUTPUT_FILE" 2>/dev/null || echo 0)
if [ "$BYTES" -lt 100 ]; then
  echo "ERROR: output too small ($BYTES bytes) — likely API failure. Check $OUTPUT_FILE"
  rm -f /tmp/zai_quiz_spec.txt /tmp/zai_quiz_objectives.txt
  exit 1
fi

python3 -c "
import json, sys
try:
    data = json.load(open('$OUTPUT_FILE'))
    qs = data.get('questions', [])
    stages = [q.get('stage') for q in qs]
    pre = stages.count('pre')
    check = stages.count('check')
    post = stages.count('post')
    print(f'Valid JSON: {len(qs)} questions (pre={pre}, check={check}, post={post}) → $OUTPUT_FILE')
    if pre != 1 or check != 3 or post != 2:
        print(f'WARN: expected 1+3+2, got {pre}+{check}+{post} — review before Stage 05')
    for i, q in enumerate(qs):
        if 'correct' in q and not isinstance(q['correct'], int):
            print(f'WARN: q{i+1} correct is not an integer — Helix requires zero-indexed int')
        if not q.get('explanation'):
            print(f'WARN: q{i+1} missing explanation — mandatory for Helix')
except json.JSONDecodeError as e:
    print(f'WARN: JSON malformed — {e}')
    print('Raw output saved to $OUTPUT_FILE for manual repair')
    sys.exit(0)
"

# Run audit if available
python3 scripts/audit_lessons.py 2>/dev/null && echo "Audit passed" || true
rm -f /tmp/zai_quiz_spec.txt /tmp/zai_quiz_objectives.txt
```

## Notes
- Output path is `<lesson-dir>/quiz.json` — one quiz.json per lesson, same directory as docs/en.md
- Schema: `options` array (not `choices` object), `correct` is zero-indexed integer
- FSRS block is included at creation but empty — Helix populates on first student answer
- Governed maze: quiz-format-spec.md rules extracted at runtime (~360 tokens), not the full file
- Never write quiz questions you can't ground in the lesson's docs/en.md — mark as [CITATION NEEDED] instead
