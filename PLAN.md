# Plan: Phase 0 — Build the Ecosystem Before Releasing the Finish

## Decision

Run Phase 0 entirely with Claude Code. GLM agents (Lyra, Newton, Hypatia, Echo) activate at Stage 01.

**Why:**
- 00-a and 00-b were labeled Echo/Newton in the contracts, but agent setup (00-c) comes after them — you can't use an agent before it's configured.
- Phase 0 outputs are one-shot cold reads and design decisions, not token-burn volume work. No GLM offload needed.
- 00-c tailoring briefs require 00-a format specs and 00-b topic map as inputs. Order must hold.

## Revised Phase 0 Sequence

```
00-a  Claude Code   Read live site + repo → format specs, auth audit, design snapshot
  ↓
00-b  Claude Code   Map GTM topics to phases → gtm-topic-map, source-citations
  ↓
00-e-seed  Claude Code   Bootstrap vault → variable-registry, course-identity-doc, student-archetype
  ↓
00-c  Claude Code   Write agent briefs → agent-briefs/, project-keywords.json, model-config.md
  ↓
00-d  Claude Code   Design Helix → LOCKED: copy-paste-flag-format, fsrs-integration-spec
  ↓
00-e-full  Claude Code   Complete vault → helix-voice, updated variable-registry, student-promise
```

GLM agents go live at Stage 01 (first place Lyra writes 498 lesson outlines).

## What Each Stage Produces

### 00-a — Curriculum Archaeology
Inputs: live site (https://learn.blueskygtm.engineer), GitHub repo (phases/, site-new/, scripts/)
Outputs (to stages/00-a-curriculum-archaeology/output/):
- lesson-format-spec.md — exact six-beat structure with concrete examples
- exercise-format-spec.md — CLI exercise pattern with copy-paste flag placeholder
- quiz-format-spec.md — card schema and tag conventions
- auth-audit.md — current auth mechanism, named failure mode
- design-system-snapshot.md — colors, typography, component patterns

### 00-b — GTM Content Mapping
Inputs: lesson-format-spec.md, shared/gtm-handbook-extract.md (10 topic clusters)
Outputs (to stages/00-b-gtm-content-mapping/output/):
- gtm-topic-map.md — each cluster mapped to phase slots, max 3 concepts per phase
- source-citations.md — ≥2 cited examples per cluster

### 00-e-seed — Vault Bootstrap
Inputs: setup/questionnaire.md (resolved variable values), gtm-topic-map.md
Outputs (written directly to vault/):
- variable-registry.md — all {{VARIABLES}} resolved
- course-identity-doc.md — Full-Stack GTM positioning, NO student promise yet
- student-archetype.md — STUDENT_WHO, PRIOR_KNOWLEDGE, NEED, END_GOAL

### 00-c — Agent Setup
Inputs: all 00-a format specs, gtm-topic-map.md, runtime-guide.md agent routing section
Outputs (to stages/00-c-agent-setup/output/):
- agent-briefs/echo-brief.md
- agent-briefs/newton-brief.md
- agent-briefs/lyra-content-brief.md
- agent-briefs/lyra-code-brief.md
- agent-briefs/hypatia-brief.md
- project-keywords.json — context loader keyword map
- model-config.md — GLM 5.1 for all agents

### 00-d — Helix Design
Inputs: exercise/lesson format specs, lyra-code-brief, fsrs-algorithm reference, professor-synapse/
Outputs (LOCKED — to stages/00-d-helix-design/output/):
- fsrs-integration-spec.md — concrete parameter values, not ranges
- copy-paste-flag-format.md — EXACT string, locked permanently
- faculty-persona-spec.md — Helix identity, voice constraints
- student-state-options.md — mechanism evaluation, decision-ready

### 00-e-full — Vault Complete
Inputs: all Phase 0 outputs, existing vault/ files
Outputs (written directly to vault/):
- helix-voice.md — hard constraints, sentence rules, tone spectrum, per-persona variation
- variable-registry.md — updated with vars from 00-b through 00-d
- course-identity-doc.md — updated with student promise

## Contracts to Patch

The CONTEXT.md files for 00-a and 00-b currently declare GLM agents:
- 00-a/CONTEXT.md: `<!-- Agent: Echo -->` → remove, run as Claude Code
- 00-b/CONTEXT.md: `<!-- Agent: Newton -->` → remove, run as Claude Code

The runtime-guide.md Echo/Newton entries remain valid — they describe agent behavior for
when those agents ARE configured (Stage 01+). The Phase 0 stages just won't use them.

## Out of Scope
- Running any build pipeline stage (01-10) before Phase 0 completes
- Filling agent brief content (00-c writes the briefs from 00-a/00-b outputs)
- Any lesson content editing

## Success Criteria
Phase 0 is done when:
1. All 5 output folders have files (not just .gitkeep)
2. vault/ and all stage CONTEXT.md files have no unfilled {{VARIABLE}} placeholders — includes {{REPO_URL}}, {{SYNAPSE_REPO_URL}}, {{SITE_URL}}
3. copy-paste-flag-format.md exists and contains the exact flag string
4. project-keywords.json covers all 10 build pipeline stages
5. Stage 01 CONTEXT.md can be opened and run without missing context
