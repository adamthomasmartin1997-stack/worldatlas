# World Atlas — template

An interactive world atlas: click a country on the map to open its profile, take quizzes on it, and play map games.
This is a **template**: the structure, navigation, games and data pipeline are real; editorial text is marked as placeholder (dashed boxes).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (answer matching, data integrity)
npm run build      # type-check + production build
```

## What's here

| Route | What it does |
|---|---|
| `/` | Hero search + clickable world map, section entry points, daily challenge, a "connected content" thread |
| `/explore` | Region-by-region map, plus a full list (the non-map alternative) |
| `/countries` | Filterable table of all 195 sovereign states (+ territories) |
| `/countries/:code` | Country profile: locator map, key facts, geography, placeholders for history/culture/charts, quizzes, related countries |
| `/countries/:code/quiz/:topic` | Geography (auto-generated for every country), history / culture / sport (hand-written, France so far) |
| `/games` | Name the countries (typing), Find it on the map (clicking), Capitals (multiple choice) — each by region |
| `/history`, `/data` | Section landing pages; Data has one real chart (largest countries by area) |
| `/data/sources` | Licences and attribution |

## Where the data lives (and how to stay on the right side of IP)

```
data/sources.json          registry of every allowed source + its licence (add here FIRST)
data/sources/*.json        fetched data with provenance (source, licence, retrieval date)
scripts/build-data.mjs     merges sources -> src/data/countries.json + public/data/world-50m.json
scripts/fetch-wikidata.mjs example importer (population, CC0)
src/content/quizzes/*.json quiz questions you write yourself
```

Rules:
- **Facts aren't copyrightable, but text, question lists, game designs and databases can be.** Only import from sources with an explicit open licence (Natural Earth, Wikidata CC0, World Bank CC BY 4.0, mledoze/countries ODbL). Never scrape quiz sites, encyclopedias or Wikipedia prose.
- Write quiz questions and article text yourselves.
- Generated files are never hand-edited — re-run `npm run data:build`.
- No API keys in the repo (`.env` is git-ignored).

When the content grows, move `data/sources/*.json` and `src/content/` into a database (e.g. Postgres) with the same fields: value, source id, licence, retrieved date.

## Design tokens

All colours, type, spacing and radii are CSS variables in `src/styles/tokens.css` (from CLAUDE.md). Shared components: `src/components/` (Layout/nav, `ui.tsx` buttons/cards/placeholders/source notes, `WorldMap`, `CountrySearch`, `QuizRunner`).
