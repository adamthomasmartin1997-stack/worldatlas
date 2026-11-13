# CLAUDE.md — World Atlas (geography & history knowledge site)

This file briefs Claude Code on the project. Read it at the start of every session and follow it unless I say otherwise in the chat.

## What we're building

An interactive knowledge atlas: part modern world atlas, part learning app. People come to **explore** (countries, maps, history), **understand** (clear facts, charts, timelines) and **test themselves** (quizzes and map games).

Long term it will cover:
- Country and place profiles
- Geography maps and historical maps
- Historical timelines
- Charts, statistics and country comparisons
- Interactive quizzes and games
- Later on: economics, politics, culture and science
- Possibly free and paid subscription tiers. Don't build any paywall logic until I ask for it.

**What makes it different: connected content.** Every page should lead somewhere else. For example: France → population chart → a historical event → the territories involved on a map → a quiz on European history. When you build a page, always ask what it should link to.

## Main navigation

`Explore` · `Countries` · `History` · `Games` · `Data`

Keep these five as the top-level sections. New subjects get added inside them, not as new top-level items, unless I agree otherwise.

## Design direction

The look is a **premium interactive atlas** for discovery pages, combined with a **clean learning platform** for games and progress. It should feel curious, intelligent, authoritative and enjoyable.

### Design tokens (define once and reuse everywhere; never hard-code values in components)

| Token | Value | Use |
|---|---|---|
| `--navy-900` | `#0F1B2D` | Header, map stages, hero areas |
| `--navy-700` | `#1E3352` | Map surfaces, dark cards |
| `--blue-400` | `#6E8FB5` | Muted secondary accents, map land on dark backgrounds |
| `--paper` | `#F6F2EA` | Background for reading-heavy pages |
| `--ink` | `#1A1F29` | Body text on light backgrounds |
| `--ink-muted` | `#5B6472` | Secondary text, captions, source notes |
| `--line` | `#E2DCD0` | Borders and dividers on light backgrounds |
| `--gold` | `#C9A45C` | The one accent: primary buttons, highlights, active states |
| `--success` / `--error` | `#3C8C6E` / `#B8504A` | Quiz feedback only |

- **Light/dark balance:** don't make everything dark. Navy is for the header, maps and play screens. Country articles and history explanations sit on `--paper`.
- **Typography:** a clean sans-serif (e.g. Inter) for UI, navigation and data. A serif (e.g. Source Serif or Fraunces) only for editorial headlines and article titles. Body text at least 16px, line length about 65–75 characters.
- **Spacing:** 4px base scale (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Corners:** restrained. 6px on buttons and inputs, 10px on cards. No pill-shaped cards.
- **Cards:** 1px `--line` border, a soft shadow only on hover, consistent internal padding.
- **Buttons:** one prominent primary action (gold) per section. Everything else is secondary (outline) or a text link.
- **Icons:** one consistent line-icon set (e.g. Lucide). **No emoji as icons.**
- **Motion:** small hover and transition effects (150–250ms). Animate only where it explains something, such as a map zoom or a timeline scrub.

### Maps and charts
- Large and readable, with clear legends, labels and **a source note on every chart**.
- Use real data only. A chart that doesn't show real data shouldn't exist.
- On mobile, charts must stay legible. Simplify them or let them scroll horizontally inside their own container; never let the page overflow.

### Avoid
- Generic AI/SaaS dashboard styling
- Heavy gradients, glassmorphism, stacked shadows, over-rounded cards
- Dense walls of text (break into sections, facts, visuals)
- Decorative charts with no real data
- Fake statistics, fake user activity, placeholder testimonials, buttons that don't work
- Rebuilding the app when an incremental change will do

## Responsive and accessibility requirements
- Breakpoints: mobile < 640px, tablet 640–1024px, desktop > 1024px. Design for mobile from the start, because an app-like experience is the goal.
- Mobile uses single-column layouts and touch targets of at least 44px.
- WCAG AA contrast. Check gold text on paper especially: use gold for fills and accents, not small body text on light backgrounds.
- Full keyboard navigation, with visible focus states on every interactive element.
- Interactive maps need a non-map alternative (a list or search) for keyboard and screen-reader users.

## How to work

### Rules
- **Inspect before you rebuild.** Understand the existing framework, routes, components and data before changing anything.
- Keep all existing data, routes, functionality and database connections working.
- Don't replace real content with hard-coded demo content.
- Don't change the database schema or authentication just to improve styling.
- Work in **small, testable increments**. Finish one screen properly before starting the next.
- Fix the shared components (nav, buttons, cards, page layout) first, then reuse them rather than restyling each page separately.

### First session: audit only
1. Inspect the codebase, framework, routes, components and current pages.
2. Run the app and assess how it currently looks.
3. List the **five most important interface improvements, ranked by impact**.
4. Propose how to implement the design tokens above in this codebase (CSS variables, Tailwind theme, etc.).
5. Say which existing components can be reused and which need work.
6. **Stop and wait for my go-ahead** before implementing.

### Build order (one at a time, with me reviewing in the browser in between)
1. **Shared foundations:** tokens, typography, the nav, buttons, cards and the page layout.
2. **Homepage:** makes the purpose clear straight away. Includes a hero with search and a map, entry points into Explore / Countries / History / Games / Data, a today's-challenge block, and featured connected content.
3. **Country profile template, built on France:** an overview, key-facts strip, map, geography, a history timeline, population and economy charts, related places, and links to relevant quizzes.
4. **Quiz screen:** one map quiz (e.g. "Name every country in Europe") with progress, a timer, clear right and wrong feedback, and a results screen that links back into country pages.
5. Then mobile polish across all three screens.

**Polish these three screens (homepage, country page, quiz) before building new features.**

### Before finishing any task
- Run linting, type checks and tests, and fix anything that fails.
- Check the desktop and mobile layouts.
- Check for broken navigation, inaccessible controls and horizontal overflow.
- Summarise: the files changed, the design decisions you made, and any remaining issues or follow-ups.

## Reference
- Visual mockups of the homepage, France profile and quiz screen are in the project's design canvas. Match their direction, not pixel-perfect.
- Inspiration: newworldatlas.com (an atlas plus thematic information) and Gapminder (data storytelling).
