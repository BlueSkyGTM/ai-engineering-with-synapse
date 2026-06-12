# /write-exercise

Generate exercises for the `## Exercises` section of a lesson doc (`docs/en.md`).
Uses GLM-5.1 (reasoning). Active from Stage 03.

Exercises live INSIDE the lesson doc — not a separate file. This skill appends or
replaces the `## Exercises` section in the target lesson doc.

## When to invoke
- Stage 03 exercise design is running
- A lesson draft exists and needs hands-on practice tasks
- User says "write exercises for [lesson]", "build exercises for [topic]"

## Chain

### Step 0 — Pre-flight
```bash
python3 -c "import openai" 2>/dev/null || { echo "ERROR: pip install openai"; exit 1; }
[ -n "$ZHIPUAI_API_KEY" ] || { echo "ERROR: ZHIPUAI_API_KEY not set — check .env"; exit 1; }
[ -f "stages/00-a-curriculum-archaeology/output/exercise-format-spec.md" ] || { echo "ERROR: exercise-format-spec.md missing — run Stage 00-a first"; exit 1; }
```

### Step 1 — Read context (governed maze: extract only what GLM needs)
```bash
LESSON_DOC="${1:-}"
[ -f "$LESSON_DOC" ] || { echo "ERROR: lesson file not found: $LESSON_DOC"; exit 1; }
TOPIC=$(head -5 "$LESSON_DOC" 2>/dev/null | grep "^#" | head -1 | sed 's/^#*//' | xargs)

# Extract exercise spec rules only — not the full file
EXERCISE_SPEC=$(python3 -c "
import re
text = open('stages/00-a-curriculum-archaeology/output/exercise-format-spec.md').read()
sections = ['## Difficulty tiers', '## Rules', '## Exercise verification']
out = []
for s in sections:
    m = re.search(re.escape(s) + r'(.*?)(?=\n## |\Z)', text, re.DOTALL)
    if m:
        out.append(s + m.group(1).rstrip())
print('\n\n'.join(out))
" 2>/dev/null | head -80)  # cap at ~280 tokens

# Extract lesson objectives + exercises section only (not full lesson)
LESSON_CONTEXT=$(python3 -c "
import re
text = open('$LESSON_DOC').read()
sections = ['## Learning Objectives', '## The Problem', '## Exercises']
out = []
for s in sections:
    m = re.search(re.escape(s) + r'(.*?)(?=\n## |\Z)', text, re.DOTALL)
    if m:
        out.append(s + m.group(1).rstrip())
print('\n\n'.join(out))
" 2>/dev/null | head -100)

echo "$EXERCISE_SPEC" > /tmp/zai_exercise_spec.txt
echo "$LESSON_CONTEXT" > /tmp/zai_lesson_context.txt
```

### Step 2 — Call GLM-5.1 + write output
```bash
OUTPUT_FILE="$LESSON_DOC"  # exercises go INTO the lesson doc

python3 - "$TOPIC" /tmp/zai_exercise_spec.txt /tmp/zai_lesson_context.txt <<'PYEOF'
import os, sys, re

sys.stdout.reconfigure(encoding='utf-8')
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["ZHIPUAI_API_KEY"],
    base_url=os.environ.get("ZAI_BASE_URL", "https://api.z.ai/api/coding/paas/v4"),
)

topic       = sys.argv[1] if len(sys.argv) > 1 else ""
spec        = open(sys.argv[2]).read() if len(sys.argv) > 2 else ""
lesson_ctx  = open(sys.argv[3]).read() if len(sys.argv) > 3 else ""

SYSTEM = """You are Lyra, a GTM engineering curriculum author. Rules:
- Exercises live in the lesson doc under ## Exercises — numbered list only
- No scaffolded code — every exercise is fully open-ended
- Every exercise must be terminal-executable and produce observable output
- Minimum 3 exercises, maximum 6 — aim for 4-5
- Difficulty sequence: easy (1-2) → medium (3-4) → hard (5-6)
- Every learning objective must have ≥1 exercise covering it
- Hard exercises may reference prior zones: "Using the technique from Zone 03..."
- Each exercise specifies the artifact it produces (file path in student repo)"""

USER = f"""Write exercises for the ## Exercises section of this lesson: {topic}

Format rules and difficulty tiers:
{spec}

Lesson objectives and problem statement (exercises must cover all objectives):
{lesson_ctx}

Output ONLY the numbered list — no section heading, no preamble:
1. [Easy exercise — 1 sentence + artifact location]
2. [Easy/medium exercise]
3. [Medium exercise]
4. [Medium/hard exercise]
5. [Hard exercise — may reference prior zone]
(4-5 exercises is the target; add 6th only if an objective would otherwise be uncovered)"""

response = client.chat.completions.create(
    model="GLM-5.1",
    messages=[
        {"role": "system", "content": SYSTEM},
        {"role": "user",   "content": USER},
    ],
    max_tokens=1500,
    stream=True,
)
for chunk in response:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
print()
PYEOF
```

After GLM returns, inject output into the lesson doc's `## Exercises` section:
```bash
EXERCISES_TEXT=$(cat /tmp/zai_exercise_output.txt 2>/dev/null || true)
# GLM output is the numbered list — inject it between ## Exercises and ## Key Terms
python3 - "$LESSON_DOC" /tmp/zai_exercise_output.txt <<'PYEOF'
import re, sys
lesson = open(sys.argv[1]).read()
exercises = open(sys.argv[2]).read().strip()
# Replace content between ## Exercises and ## Key Terms (or EOF)
new_lesson = re.sub(
    r'(## Exercises\n).*?(\n## Key Terms|\Z)',
    r'\1\n' + exercises + r'\n\2',
    lesson,
    flags=re.DOTALL
)
open(sys.argv[1], 'w').write(new_lesson)
print(f"Injected exercises into {sys.argv[1]}")
PYEOF
```

### Step 3 — Validate + report
```bash
EXERCISE_COUNT=$(grep -c "^[0-9]\+\." "$LESSON_DOC" 2>/dev/null || echo 0)
echo "Exercises in $LESSON_DOC: $EXERCISE_COUNT"
[ "$EXERCISE_COUNT" -lt 3 ] && echo "WARN: expected 3-6 exercises, found $EXERCISE_COUNT — check output"
[ "$EXERCISE_COUNT" -gt 6 ] && echo "WARN: more than 6 exercises ($EXERCISE_COUNT) — trim to max 6"
rm -f /tmp/zai_exercise_spec.txt /tmp/zai_lesson_context.txt /tmp/zai_exercise_output.txt
```

## Notes
- Exercises are NOT a separate file — they are injected into `docs/en.md` under `## Exercises`
- GLM receives only the spec rules + lesson objectives (~560 tokens), not the full lesson
- The `correct` output is the numbered list only — the Python injection step handles placement
- Governed maze: exercise-format-spec.md rules are extracted at runtime; GLM gets the task-specific extract
