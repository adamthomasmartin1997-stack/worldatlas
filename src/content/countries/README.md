# Country profile content

One JSON file per country, named by lowercase ISO alpha-3 code (`fra.json`). This holds the *written* parts of a
country page: paragraphs and facts that don't come from an imported dataset. Numbers (population, area, GDP,
life expectancy, highest point, neighbours) come from the data pipeline and must NOT be repeated here.

Rules:
- Write every sentence yourself from facts you can source. Never copy text from Wikipedia, Britannica or any other site.
- `status` is `"draft"` until a person has checked every fact against a source; then set `"reviewed"` and fill `sources`.
- Every tab is optional. A tab with no content and no data is hidden on the page.
- `related` lists ISO alpha-3 codes of countries the tab mentions; they're shown as links ("connected content").

Shape (all keys optional except `status`):

```json
{
  "status": "draft",
  "sources": [],
  "overview": ["Paragraph one.", "Paragraph two."],
  "geography": { "text": "…", "facts": [{ "label": "Longest river", "value": "Loire, about 1,000 km" }] },
  "people":    { "text": "…", "facts": [] },
  "history":   { "text": "…", "events": [{ "year": "1789", "title": "…", "text": "…", "related": ["BEL"] }] },
  "government":{ "text": "…", "facts": [], "memberships": [{ "title": "…", "text": "…" }] },
  "economy":   { "text": "…", "facts": [] },
  "culture":   { "text": "…", "items": [{ "title": "…", "text": "…" }], "related": ["ITA"] },
  "sport":     { "text": "…", "items": [{ "title": "…", "text": "…" }], "related": ["HRV"] }
}
```
