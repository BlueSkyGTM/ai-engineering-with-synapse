#!/usr/bin/env python3
"""
Repair 5q files (pre,pre,post,post,post) to canonical 6q (pre,check,check,check,post,post).

Strategy for pre,pre,post,post,post:
  - Q0 (pre) → keep as pre
  - Q1 (pre) → relabel as check (it asks factual material questions)
  - Q2 (post) → relabel as check (post questions test knowledge = good check)
  - Q_new → generated check from en.md learning objectives
  - Q3 (post) → keep as post
  - Q4 (post) → keep as post

Result: pre, check(Q1), check(Q2), check(Q_new), post(Q3), post(Q4)

Also repairs all-post (post,post,post,post,post) and pre,pre,check,check,check,check
files in a similar way.

For all-post:
  - Q0 → pre (relabel)
  - Q1 → check (relabel)
  - Q2 → check (relabel)
  - Q_new → generated check
  - Q3 → post (relabel)
  - Q4 → post (relabel)

For pre,pre,check,check,check,check (extra check, no post):
  - Q0 → pre (keep)
  - Q1 → check (relabel from pre)
  - Q2 → check (keep)
  - Q3 → check (keep)
  - Q4 → post (relabel from check)
  - Q5 → post (relabel from check)
  [no new question needed]
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHASES_DIR = ROOT / "phases"
CANONICAL = ["pre", "check", "check", "check", "post", "post"]

FIVEQ = ["pre", "pre", "post", "post", "post"]
ALL_POST = ["post", "post", "post", "post", "post"]
EXTRA_CHECK = ["pre", "pre", "check", "check", "check", "check"]


# ─── Learning-objective extraction ─────────────────────────────────────────

def extract_objectives(en_md: Path) -> list[str]:
    """Return learning-objective bullet points from en.md."""
    if not en_md.exists():
        return []
    text = en_md.read_text(encoding="utf-8", errors="replace")
    # Find the Learning Objectives section
    m = re.search(r"##\s+Learning Objectives\s*\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
    if not m:
        return []
    block = m.group(1)
    objectives = []
    for line in block.splitlines():
        line = line.strip()
        if line.startswith("- ") or line.startswith("* "):
            objectives.append(line[2:].strip())
    return objectives


def extract_summary_sentence(en_md: Path) -> str:
    """Pull the blockquote summary or first sentence of The Problem."""
    if not en_md.exists():
        return ""
    text = en_md.read_text(encoding="utf-8", errors="replace")
    # Look for blockquote (> Your tools ...)
    m = re.search(r"^>\s+(.+)", text, re.MULTILINE)
    if m:
        return m.group(1).strip()
    # Or first sentence of first paragraph after metadata
    m = re.search(r"\n\n([A-Z][^.]{20,}\.)", text)
    if m:
        return m.group(1).strip()
    return ""


# ─── Question generation ───────────────────────────────────────────────────

# Transforms an objective string to a quiz question + 4 options
def _objective_to_q(obj: str, others: list[str], idx: int) -> dict:
    """
    Turn a learning objective sentence into a check question.
    obj: the main objective (correct answer source)
    others: other objectives (distractor sources)
    idx: question index (for correct-slot cycling)
    """
    targets = [1, 2, 0, 3]
    correct_slot = targets[idx % len(targets)]

    # Extract the core concept — trim verb phrase
    concept = obj
    # "Explain the difference between A and B" → shorter phrase
    concept = re.sub(r"^(Explain|Implement|Distinguish|Understand|Evaluate|"
                     r"Describe|Build|Write|Apply|Identify|Use|Define|"
                     r"Analyze|Compare|Create|Recognize|Calculate|Show)\s+",
                     "", concept, flags=re.I).strip()
    # Trim to ~70 chars
    if len(concept) > 70:
        concept = concept[:67].rsplit(" ", 1)[0] + "..."

    question = f"Which of the following best describes: {concept}?"

    # Correct option: paraphrase the objective
    correct_text = obj[:90] if len(obj) <= 90 else obj[:87].rsplit(" ", 1)[0] + "..."

    # Distractors: grab key noun phrases from other objectives, mutate them
    distractors = []
    for other in others[:6]:
        other_concept = re.sub(
            r"^(Explain|Implement|Distinguish|Understand|Evaluate|Describe|"
            r"Build|Write|Apply|Identify|Use|Define|Analyze|Compare|Create|"
            r"Recognize|Calculate|Show)\s+",
            "", other, flags=re.I
        ).strip()
        if other_concept and other_concept[:40] not in correct_text[:40]:
            distractors.append(other_concept[:80])
        if len(distractors) >= 3:
            break

    # Pad distractors if needed with generic wrong answers
    generic = [
        "Skip validation and trust the input data",
        "Use the default settings without customization",
        "Delegate this step to a downstream process",
        "Replace the entire component with a simpler alternative",
    ]
    for g in generic:
        if len(distractors) >= 3:
            break
        distractors.append(g)

    # Build options with correct at the right slot
    options_wrong = distractors[:3]
    options = list(options_wrong)
    options.insert(correct_slot, correct_text)

    explanation = f"{obj[:140]}" if len(obj) <= 140 else obj[:137].rsplit(" ", 1)[0] + "..."

    return {
        "stage": "check",
        "question": question,
        "options": options,
        "correct": correct_slot,
        "explanation": explanation,
    }


def generate_check_question(lesson_dir: Path, existing_q1: dict, existing_q2: dict) -> dict:
    """Generate a new check question from en.md that doesn't duplicate Q1/Q2."""
    en_md = lesson_dir / "docs" / "en.md"
    objectives = extract_objectives(en_md)

    # Collect "covered" concepts from existing Q1, Q2 questions
    covered_text = (
        existing_q1.get("question", "") + " " + existing_q1.get("explanation", "") +
        existing_q2.get("question", "") + " " + existing_q2.get("explanation", "")
    ).lower()

    # Find an objective that adds new coverage
    chosen = None
    chosen_idx = 0
    for i, obj in enumerate(objectives):
        # Prefer an objective whose key nouns aren't already in covered Q text
        key_words = [w for w in obj.lower().split() if len(w) > 5]
        overlap = sum(1 for w in key_words if w in covered_text)
        if overlap < max(1, len(key_words) // 2):
            chosen = obj
            chosen_idx = i
            break

    if chosen is None:
        if objectives:
            # Just pick the 2nd objective (or last)
            chosen = objectives[min(1, len(objectives) - 1)]
            chosen_idx = 1
        else:
            # Fallback: use the lesson slug
            slug = lesson_dir.name
            topic = slug.replace("-", " ").title()
            summary = extract_summary_sentence(en_md)
            chosen = f"the purpose and application of {topic}"
            if summary:
                chosen = summary[:80]
            chosen_idx = 0

    others = [o for o in objectives if o != chosen]
    return _objective_to_q(chosen, others, chosen_idx)


# ─── Core repair ───────────────────────────────────────────────────────────

def repair_5q(quiz_path: Path) -> tuple[dict | list | None, str]:
    """Fix pre,pre,post,post,post → pre,check,check,check,post,post."""
    raw = json.loads(quiz_path.read_text(encoding="utf-8"))
    is_dict = isinstance(raw, dict)
    qs = raw.get("questions", []) if is_dict else raw
    stages = [q.get("stage") for q in qs]

    if stages == CANONICAL:
        return None, "already_canonical"

    lesson_dir = quiz_path.parent
    qs = [dict(q) for q in qs]  # copy

    if stages == FIVEQ:
        # Q0=pre, Q1=pre→check, Q2=post→check, Q_new=check, Q3=post, Q4=post
        qs[1]["stage"] = "check"
        qs[2]["stage"] = "check"
        q_new = generate_check_question(lesson_dir, qs[1], qs[2])
        result = [qs[0], qs[1], qs[2], q_new, qs[3], qs[4]]
        strategy = "5q-to-6q"

    elif stages == ALL_POST:
        # Q0->pre, Q1->check, Q2->check, Q_new=check, Q3->post, Q4->post
        qs[0]["stage"] = "pre"
        qs[1]["stage"] = "check"
        qs[2]["stage"] = "check"
        q_new = generate_check_question(lesson_dir, qs[1], qs[2])
        qs[3]["stage"] = "post"
        qs[4]["stage"] = "post"
        result = [qs[0], qs[1], qs[2], q_new, qs[3], qs[4]]
        strategy = "allpost-to-6q"

    elif stages == EXTRA_CHECK:
        # Q0=pre, Q1=pre->check, Q2=check, Q3=check, Q4=check->post, Q5=check->post
        qs[1]["stage"] = "check"
        qs[4]["stage"] = "post"
        qs[5]["stage"] = "post"
        result = qs
        strategy = "extrachk-to-6q"

    else:
        return None, f"unknown:{','.join(stages)}"

    # Verify result
    result_stages = [q.get("stage") for q in result]
    if result_stages != CANONICAL:
        return None, f"repair_failed:{','.join(result_stages)}"

    # Vary answer key if constant
    corrects = [q.get("correct", 0) for q in result]
    if len(set(corrects)) == 1:
        targets = [1, 2, 0, 3, 1, 2]
        for idx, q in enumerate(result):
            cur = q.get("correct", 0)
            tgt = targets[idx % len(targets)]
            opts = q.get("options", [])
            if len(opts) >= 2 and cur != tgt:
                correct_val = opts[cur]
                new_opts = [o for i, o in enumerate(opts) if i != cur]
                new_opts.insert(tgt, correct_val)
                q["options"] = new_opts
                q["correct"] = tgt

    if is_dict:
        raw["questions"] = result
        return raw, strategy
    return result, strategy


def commit_lesson(lesson_dir: Path, strategy: str) -> None:
    quiz_rel = (lesson_dir / "quiz.json").relative_to(ROOT)
    phase = lesson_dir.parent.name
    slug = lesson_dir.name
    subprocess.run(["git", "add", str(quiz_rel)], cwd=ROOT, check=True)
    msg = f"fix(quiz): repair 5q schema to canonical 6q — {phase}/{slug} [{strategy}]"
    subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=True)


def main():
    dry_run = "--dry-run" in sys.argv

    stats = {"fixed": 0, "skipped": 0, "errors": 0}
    TARGET_STAGES = {tuple(FIVEQ), tuple(ALL_POST), tuple(EXTRA_CHECK)}

    for phase_dir in sorted(PHASES_DIR.iterdir()):
        if not phase_dir.is_dir():
            continue
        for lesson_dir in sorted(l for l in phase_dir.iterdir() if l.is_dir()):
            quiz_path = lesson_dir / "quiz.json"
            if not quiz_path.exists():
                continue

            raw = json.loads(quiz_path.read_text(encoding="utf-8"))
            qs = raw.get("questions", []) if isinstance(raw, dict) else raw
            stages = tuple(q.get("stage") for q in qs)

            if stages not in TARGET_STAGES:
                continue

            try:
                new_data, strategy = repair_5q(quiz_path)
            except Exception as e:
                print(f"ERROR {lesson_dir.relative_to(ROOT)}: {e}")
                stats["errors"] += 1
                continue

            if new_data is None:
                print(f"SKIP {lesson_dir.relative_to(ROOT)}: {strategy}")
                stats["skipped"] += 1
                continue

            rel = lesson_dir.relative_to(ROOT)
            if dry_run:
                print(f"WOULD FIX {rel} [{strategy}]")
                stats["fixed"] += 1
                continue

            quiz_path.write_text(
                json.dumps(new_data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            commit_lesson(lesson_dir, strategy)
            print(f"FIXED {rel} [{strategy}]")
            stats["fixed"] += 1

    print()
    print("=" * 60)
    print(f"Fixed  : {stats['fixed']}")
    print(f"Skipped: {stats['skipped']}")
    print(f"Errors : {stats['errors']}")
    if dry_run:
        print("(DRY RUN — no files written)")


if __name__ == "__main__":
    main()
