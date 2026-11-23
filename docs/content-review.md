# Content review checklist

Everything Worldwise has written so far is a **draft**: it was written from widely published facts but nobody has checked it against sources yet. This is the checklist for doing that, in priority order. Each page says on the site whether it is a draft or checked, so progress is visible to readers too.

## What there is to review

| Content | Where | How many | Shown on |
|---|---|---|---|
| Event summaries ("What happened", "Why it matters") | `src/content/event-summaries.json` | 159 | Event pages |
| Country profiles (overview, did you know, key people, tabs) | `src/content/countries/<iso>.json` | 195 | Country pages |
| Deep dives (7 sections per country) | `src/content/deep/<iso>/<section>.json` | 1,379 | Country section pages |
| Era introductions | `src/data/eras.ts` | 9 | Era pages |
| Hand-written quiz (France) | `src/content/quizzes/fra.json` | 1 file | France quizzes |

Quizzes for other countries are generated from the deep dives, so they become correct when the deep dives are. Wikidata data (dates, places, countries involved) is corrected in `data/event-corrections.json`, not by hand in the built files.

## Priority order

**1. Sensitive and still unfolding (do first)**
- Event summaries: The Holocaust (Q2763), Gaza War (Q122962941), Full-scale Russo-Ukrainian war (Q110999040), 1948 Palestine war (Q49097), Six-Day War (Q49077), Cultural Revolution (Q8690), Iraq War (Q545449), Iranian Revolution (Q126065), Vietnam War (Q8740), Mau Mau rebellion (Q476855), Algerian War (Q200790).
- History and government deep dives for: Israel, Palestine, Ukraine, Russia, Myanmar, Rwanda, Cambodia, Armenia, Türkiye, Germany, China, Taiwan, Kosovo, Sudan, South Sudan, Afghanistan, Iran, Syria, Yemen, Haiti.
- The 17 countries updated in the November 2026 fact check (recent elections and changes of leader): Bangladesh, Colombia, Costa Rica, Peru, Iran, Nepal, Thailand, Iraq, Myanmar, Benin, Uganda, Somalia, Guinea, Guinea-Bissau, Madagascar, Haiti, Denmark.

**2. Most visited** — the 30 best-known countries (profile, history and government first): United States, China, India, Russia, United Kingdom, France, Germany, Japan, Brazil, Italy, Spain, Canada, Australia, Mexico, Egypt, Nigeria, South Africa, Türkiye, Iran, Saudi Arabia, Indonesia, Pakistan, Argentina, South Korea, Kenya, Ethiopia, Poland, Ukraine, Israel, Greece. Then the other event summaries and the nine era introductions.

**3. Everything else**, a region at a time.

## For each page

- [ ] **Facts and dates** match at least two reliable sources (encyclopaedias, official or academic sources, major news organisations for recent events). Wikipedia is fine for finding sources, not as the source.
- [ ] **Numbers** say when they're from, and ranges are used where historians disagree (deaths in wars, ancient populations).
- [ ] **Names** are spelled as the country itself spells them in English, with accents.
- [ ] **Disputed matters** (borders, recognition, conflicts) say who claims or says what, rather than taking a side. Kosovo, Taiwan, Palestine, Western Sahara, Crimea, Kashmir and Cyprus need particular care.
- [ ] **Sensitive topics** (genocide, war, slavery, colonial violence) are factual and respectful, without graphic detail, and never used as quiz trivia.
- [ ] **Recent events** carry an "as of" month (`asOf` in event summaries) and are rechecked at least every three months.
- [ ] **Reading level** suits 13–16-year-olds: short sentences, terms explained or in Key words.
- [ ] **Written by us**: no sentences copied from Wikipedia or elsewhere (see `data/sources.json` → `doNotUse`).
- [ ] **Links** to other countries and events go where they should.

## Marking a page as checked

- **Deep dives and country profiles**: set `"status": "reviewed"` and add `"sources": ["…", "…"]` (titles or URLs). The page then says "Written by Worldwise. Sources: …" instead of "Draft". Tests require sources on every reviewed page.
- **Event summaries**: add `"reviewed": "YYYY-MM-DD"` and `"sources": ["…"]` to the entry. The event page then says when it was checked and against what. Tests require both together.
- **Wrong Wikidata facts** (a date, a place, something that isn't an event): add an entry with a `why` to `data/event-corrections.json`, run `npm run data:build`, and if you can, fix the item on Wikidata too so the next import is right.

After any change: `npm run lint`, `npm run typecheck`, `npm test`.

## Keeping it fresh

- **Monthly**: recheck the "still unfolding" pages and current heads of state and government (Government tabs).
- **Every three months**: `npm run data:refresh` (Wikidata, World Bank), then read `data/reports/validation.md` and `data/reports/events.md` for new problems.
- **When news breaks** (a coup, an election, a new war): update the country's government and history pages and any related event summary, with an `asOf` month.
