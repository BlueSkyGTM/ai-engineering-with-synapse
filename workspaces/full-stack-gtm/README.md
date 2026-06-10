# AI Engineering From Scratch

498 lessons across 20 chapters. Every algorithm built from raw math before a framework is touched.

Taught by **Professor Synapse** — an AI reasoning teacher that reads your progress, loads your phase specialist, and meets you exactly where you are.

---

## Dashboard

Six-page web app. No framework. No build step. Opens in a browser.

| Page | |
|------|-|
| **Course** | 20-chapter accordion with per-lesson completion tracking and a live progress card |
| **Catalog** | All 498 lessons indexed and filterable by chapter, type, language, and completion status |
| **Lesson reader** | Renders lesson markdown from GitHub with chapter sidebar, completion state, and prev/next navigation |
| **Projects** | 17 capstone builds from Phase 19, locked until prerequisites are complete |
| **Library** | 110+ curated free resources — books, papers, videos, courses — with topic and type filtering |
| **Glossary** | 83 terms. What people say vs what it actually means |

Each lesson has a `$ copy path` button that puts a ready-to-paste Claude Code prompt on your clipboard.

Progress persists to WordPress REST or localStorage, depending on whether a nonce is present.

---

## Curriculum chapters

| Chapter | What you implement |
|---------|-------------------|
| 00 Setup & Tooling | Dev environment, GPU setup, APIs, Python toolchain |
| 01 Math Foundations | Linear algebra, calculus, probability, PCA, variance decomposition |
| 02 ML Fundamentals | Regression, classification, loss surfaces, gradient descent from scratch |
| 03 Deep Learning Core | Backprop by hand, activations, regularisation |
| 04 Computer Vision | CNNs, object detection, full vision pipeline |
| 05 NLP | Tokenisation, embeddings, sequence models |
| 06 Speech & Audio | Spectrograms, ASR, audio feature extraction |
| 07 Transformers Deep Dive | Attention, multi-head, positional encoding — transformer from scratch |
| 08 Generative AI | GANs, diffusion, CLIP |
| 09 Reinforcement Learning | Policy gradients, Q-learning, environment loops |
| 10 LLMs from Scratch | Pre-training, tokenisation, scaling laws |
| 11 LLM Engineering | Fine-tuning, RLHF, evaluation, inference optimisation |
| 12 Multimodal AI | Vision-language models, multimodal agent |
| 13 Tools & Protocols | MCP, tool use, function calling |
| 14 Agent Engineering | ReAct, planning, memory, agent workbench |
| 15 Autonomous Systems | Long-horizon agents, evaluation frameworks |
| 16 Multi-Agent & Swarms | Coordination, parallelism, swarm patterns |
| 17 Infrastructure & Production | Serving, monitoring, deployment pipelines |
| 18 Ethics, Safety & Alignment | Red-teaming, constitutional AI, safety evals |
| 19 Capstone Projects | 17 final builds combining concepts across all phases |

**Languages:** Python · TypeScript · Rust · Julia

---

## Run it

```bash
cd site-new
python3 -m http.server 8080
# open http://localhost:8080
```

---

## Credits

| | |
|--|--|
| [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch) | Original curriculum content — lessons, phases, six-beat lesson format |
| [ProfSynapse/Synapse_CoR](https://github.com/ProfSynapse/Synapse_CoR) | Professor Synapse — the teaching methodology and AI reasoning framework |
| [EbookFoundation/free-programming-books](https://github.com/EbookFoundation/free-programming-books) | Library curation source |
| [garrytan/gstack](https://github.com/garrytan/gstack) | ICM workspace methodology and toolchain used throughout development |
