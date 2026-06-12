# Design System Snapshot
<!-- Derived from: site-new/CLAUDE.md, site-new/css/tokens.css, site-new/*.html -->
<!-- Capture date: 2026-06-12 | Git hash: 56e1283 -->

## Rendering stack

**Static site generator:** None — pure vanilla HTML/CSS/JS. No build step for the app.  
**Build step (data only):** `build.js` in curriculum repo generates `site-new/js/data.js` from lesson metadata. This is the only build artifact.  
**Markdown-to-HTML pipeline:** Client-side at runtime. `site-new/js/lesson.js` fetches lesson markdown from GitHub raw URLs and renders it with an inline Markdown→HTML parser. No server-side rendering.  
**Hosting:** Vercel (serverless functions at `api/` for auth + progress).  
**Framework:** None. `window.AIS` namespace. Vanilla DOM.

## Script load order (mandatory)

Every page loads scripts in this exact order:
```html
<script src="js/data.js"></script>    <!-- generated — NEVER hand-edit -->
<script src="js/store.js"></script>   <!-- persistence + adapter pattern -->
<script src="js/game.js"></script>    <!-- pure rules: XP, levels, badges -->
<script src="js/ui.js"></script>      <!-- DOM helpers: AIS.ui.el(), toast() -->
<script src="js/[screen].js"></script> <!-- one file per page -->
```

Additionally on every page: `css/cmdpalette.css` + `js/cmdpalette.js` (⌘K search).

**`js/data.js` is generated and must never be hand-edited.** Rebuild by re-running `build.js` in the curriculum source repo.

## CSS token system

All values live in `site-new/css/tokens.css`. Nothing is hard-coded downstream.

### Color palette

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#14110f` | Page background (warm black) |
| `--panel` | `#1d1916` | Card / panel surface |
| `--panel-2` | `#241f1b` | Elevated panel |
| `--well` | `#0d0b0a` | Inset / code well |
| `--cream` | `#e9e1d2` | Primary text |
| `--cream-dim` | `#9a9184` | Secondary text / muted |
| `--cream-mute` | `#6c655b` | Placeholder / disabled |
| `--terra` | `#d97757` | Primary accent (terracotta — links, CTAs, selection) |
| `--terra-deep` | `#b45c40` | Pressed/hover state for terra |
| `--terra-tint` | `rgba(217,119,87,0.14)` | Slot backgrounds, hover fills |
| `--gold` | `#d2a85c` | Secondary accent (achievements, streaks) |
| `--green` | `#8fae6b` | Success / complete state |
| `--line` | `rgba(233,225,210,0.14)` | Borders, dividers |
| `--line-soft` | `rgba(233,225,210,0.07)` | Terminal grid overlay on body |

### Typography

| Token | Value | Role |
|-------|-------|------|
| `--pix` | `'VT323', ui-monospace, monospace` | Pixel/retro headings, UI labels |
| `--mono` | `'JetBrains Mono', ui-monospace, monospace` | Body text, code, default |

Body: `font-size: 15px`, `line-height: 1.55`, JetBrains Mono.

### Spacing scale

8px base unit:
```
--s1: 4px   --s2: 8px   --s3: 12px  --s4: 16px
--s5: 24px  --s6: 32px  --s7: 48px  --s8: 64px
```

Max content width: `--maxw: 1120px`

## Component patterns

### Utility classes

| Class | Purpose |
|-------|---------|
| `.pix` | VT323 pixel font, line-height 0.82, +letter-spacing |
| `.eyebrow` | Small allcaps label in terra color (e.g. "Phase 01") |
| `.muted` | Dimmed secondary text (`--cream-dim`) |
| `.wrap` | Centered content container, max-width + horizontal padding |
| `.slot` | **Image placeholder** — striped terra background with dashed border + size label. All pixel art positions are `.slot` elements; no binary assets are checked in. |

### Pixel button pattern

Defined in `tokens.css`, used across all pages. Typically `.btn-pix` — terracotta background, pixel font, `box-shadow: var(--shadow-pix)` for 4px offset 3D effect.

### Terminal grid body

`body` has a `background-image` repeating linear gradient at 24px intervals using `--line-soft` — creates the subtle terminal grid texture visible on all pages.

## Page inventory

| Page | File | Screen JS | Key element IDs |
|------|------|-----------|----------------|
| Home (world map) | `index.html` | `hub.js` | `#map`, `#drawer` |
| Course (accordion + player card) | `course.html` | `course.js` | `#hud`, `#tree` |
| Roadmap (DAG) | `roadmap.html` | `roadmap.js` | `#tree` |
| Catalog (searchable index) | `catalog.html` | `catalog.js` | — |
| Library (reading list) | `library.html` | `library.js` | — |
| Lesson reader | `lesson.html` | `lesson.js` | `#toc`, `#body` |
| Projects (trophies + capstone) | `projects.html` | `projects.js` | `#builds`, `#featured`, `#trophies` |
| Glossary (flip cards) | `glossary.html` | `glossary.js` | — |

## Lesson layout markup (lesson reader)

Lesson pages use `?path=phases/<phase>/<lesson>` or `?p=phaseId:idx` query params.  
`lesson.js` resolves path → fetches markdown from GitHub raw URL → renders via inline parser.

Fetch order: tries `README.md` → `docs/en.md` → `index.md` per lesson directory.

Rendered lesson layout structure:
```html
<div class="lesson-wrap">
  <aside class="lesson-toc" id="toc">  <!-- generated from H2/H3 headings -->
  <article class="lesson-body" id="body">  <!-- rendered markdown -->
    <!-- Mark-complete button inserted by lesson.js -->
    <!-- Prev/next navigation links inserted by lesson.js -->
  </article>
</div>
```

**Stage 06 dependency:** Stage 06 must re-validate this snapshot against the live site at the git hash recorded above before running. If the rendering stack or component markup has changed, update this file before Stage 06 executes.

## Data layer

`js/data.js` exports two globals:
- `PHASES` — array of 20 phase objects, each with lessons (each lesson: `url`, `summary`, `keywords`)
- `GLOSSARY` — term cards array

`js/game.js` exports: `AIS.game.derive(PHASES, progress)` → stats object (XP, level, rank, badges, streaks). Pure function — no side effects.

`js/store.js` exports `AIS.store`:
- `adapter` — swappable (localStorage default, vercelAdapter when logged in)
- `read()`, `write(progress)`, `toggle(lessonKey)`, `exportJSON()`
- Lesson identity key: `phaseId + ':' + lessonIndex` (keep stable)

## Known gaps for Stage 06

1. **Mermaid rendering**: lesson docs contain `\`\`\`mermaid` blocks. Current `lesson.js` inline parser may not render Mermaid diagrams — Stage 06 must audit and add `mermaid.js` initialization if needed.
2. **Excalidraw + GLM-image placeholders**: lesson template requires these at Stage 06. Current site has no Excalidraw or image embed pattern — Stage 06 must define the integration.
3. **No `.slot` images in lesson reader**: `.slot` placeholder pattern is used in site pages (world map, projects), not in lesson content. Stage 06 defines how image placeholders appear inside lesson markdown.
