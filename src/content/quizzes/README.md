# Country quiz content

One JSON file per country, named by lowercase ISO alpha-3 code (`fra.json`).
Write every question yourself — don't copy question lists from other quiz sites.

```json
{
  "history": [
    { "q": "Question text", "options": ["Correct answer", "Wrong", "Wrong", "Wrong"], "answer": 0, "explain": "One-line explanation", "link": "/countries/deu" }
  ]
}
```

Topics: `history`, `culture`, `sport`. Geography questions are generated automatically from the data (see `src/lib/quiz.ts`).
Options are shuffled at play time, so put them in any order. `link` is optional and is shown after answering ("connected content").
