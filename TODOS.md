# TODOS

Deferred scope from autoplan and stage reviews. Items here are not blocking current work.

## Loop Engineering

- [ ] **Evaluate cobusgreyling/loop-engineering npm tooling** — `loop-audit`, `loop-init`, `loop-cost` are the operational layer of the loop-engineering framework. We extracted the docs/mental models but not the tooling. Decide: adopt these packages, replace with gstack equivalents, or skip. Belongs in 00-f (tooling stage). Not blocking 00-a through 00-e.

## Operator Kit First Deployment

- [ ] **Quiz factory — 154 create_quiz rows** — Reserved as the operator kit's first real test run. Lyra (content agent) processes `quiz-factory/manifest.json` rows where `status: pending` and `job_type: create_quiz`. Covers phases 06, 07, 08, 09, 10, 12, 13, 15, 16. Manifest is clean — 128 prior rows already flipped to `done`. Audit script: `scripts/audit_lessons.py`. Batch operator rules: `shared/quiz-factory-docs/CLAUDE.md`. Run after operator kit is wired in Stage 08, as the Stage 10 validation warm-up.

## Phase 0 / Tooling

- [ ] **Write 00-f tooling stage CONTEXT.md** — Stage for gbrain, graphify, context loader, Helix open brain setup. Deferred until operator-kit agents exist (Stage 01+). Now also needs loop engineering standards setup (LOOP.md is written; 00-f should wire it into the build pipeline operationally).
