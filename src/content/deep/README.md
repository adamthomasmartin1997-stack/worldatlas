# Deep-dive pages

One long read per country section: `src/content/deep/<iso>/<section>.json`, where section is one of
geography, people, history, government, economy, culture, sport. The page appears at
`/countries/<iso>/<section>` and the profile tab links to it as soon as the file exists.

Same rules as the profile content (see `../countries/README.md`): write every sentence yourself, keep
`status: "draft"` until a person has checked each fact, and don't repeat numbers the data pipeline supplies.

```json
{
  "status": "draft",
  "intro": "One or two sentences that sum up the page.",
  "chapters": [
    { "id": "revolution", "title": "The French Revolution", "text": ["Paragraph.", "Paragraph."],
      "highlight": { "title": "Why it matters", "text": "…" },
      "facts": [{ "label": "…", "value": "…" }],
      "related": ["BEL"] }
  ],
  "timeline": [{ "year": "1789", "title": "…", "text": "…" }],
  "keyTerms": [{ "term": "Republic", "meaning": "…" }]
}
```
