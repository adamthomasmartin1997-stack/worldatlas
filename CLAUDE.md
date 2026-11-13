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

**Audience: teenagers.** The look is a **sticker atlas**: bright, chunky and playful, like a well-made game or sticker book, while staying trustworthy (real data, a source on every number). It should feel like a challenge to take on, not a textbook and not a generic AI/SaaS site. The chosen direction is **"Green 1 · Atlas Green"** in the design canvas.

### Design tokens (define once and reuse everywhere; never hard-code values in components)

| Token | Value | Use |
|---|---|---|
| `--page` | `#EEF5EC` | Page background (pale green) |
| `--surface` | `#FFFFFF` | Cards, inputs, stickers |
| `--ink` | `#10261C` | Text, the 2px outlines and the hard shadows |
| `--ink-muted` | `#3F5248` | Secondary text, captions, source notes |
| `--ocean` | `#4DA8DA` | Map sea / map panels |
| `--land-1` … `--land-5` | `#4FAE73` `#5DBB6E` `#6CC58C` `#8ED081` `#A6D96A` | Map land, one shade per continent; also tag fills |
| `--sun` | `#FFD23F` | The main accent: primary buttons, active nav item, the highlighted country |
| `--coral` | `#FF6B4A` | Second accent: "today" stickers, wrong answers |
| `--green` | `#2FA36B` | Correct answers, found countries, small labels |

- **Text on colour:** always `--ink` on `--sun`, `--coral`, `--green` and the land greens (white text on them fails contrast).
- **Whole site is light.** Maps sit in `--ocean` panels. No dark page backgrounds.
- **Typography:** **Bricolage Grotesque** (800) for headlines and card titles; **DM Sans** for UI, body and data. No serif. Body text at least 16px, line length about 65–75 characters.
- **Outlines and shadows:** interactive and card elements get a `2px solid var(--ink)` border and ONE hard offset shadow with no blur (`3px 3px 0`, `4px 4px 0` for buttons and inputs, `5px` for cards, `8px` for the hero map). Never blurred, never stacked. On hover/press the shadow shrinks and the element moves towards it (feels like pressing a sticker).
- **Corners:** 10px nav pills and tags, 14px buttons and inputs, 18–22px cards and map panels. Round pills only for small stickers and chips.
- **Stickers:** small labels (facts on the map, "today" badges) may be rotated by 2–4°. At most 3–4 rotated items per screen; body content and buttons are never rotated.
- **Spacing:** 4px base scale (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Buttons:** one primary action (`--sun` fill) per section. Secondary is white with an ink outline and no shadow, or a text link.
- **Icons:** one consistent line-icon set (Lucide), 2–2.5px stroke. **No emoji as icons.**
- **Motion:** small hover and press effects (150–250ms). Animate only where it explains something, such as a map zoom or a country turning green when found.

### Maps and charts
- Large and readable, with clear legends, labels and **a source note on every chart**.
- Use real data only. A chart that doesn't show real data shouldn't exist.
- On mobile, charts must stay legible. Simplify them or let them scroll horizontally inside their own container; never let the page overflow.

### Avoid
- Generic AI/SaaS dashboard styling
- Gradients, glassmorphism, blurred or stacked shadows (the one hard sticker shadow is the only shadow)
- Dense walls of text (break into sections, facts, visuals)
- Decorative charts with no real data
- Fake statistics, fake user activity, placeholder testimonials, buttons that don't work
- Rebuilding the app when an incremental change will do

## Responsive and accessibility requirements
- Breakpoints: mobile < 640px, tablet 640–1024px, desktop > 1024px. Design for mobile from the start, because an app-like experience is the goal.
- Mobile uses single-column layouts and touch targets of at least 44px.
- WCAG AA contrast. Use `--sun`, `--coral`, `--green` and the land greens as fills with `--ink` text, never as text colours on light backgrounds.
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
- Visual mockups are in the design canvas (https://claude.ai/artifact/Xa6pwUKooFR7TjaivgKExi). The chosen style is **"Green 1 · Atlas Green"**; the homepage headline is "Know the world better than your friends." Match the direction, not pixel-perfect.
- Inspiration: newworldatlas.com (an atlas plus thematic information) and Gapminder (data storytelling).
