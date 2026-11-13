/**
 * Fetches population figures from Wikidata (CC0 — no attribution or share-alike
 * obligations) and stores them, with provenance, in data/sources/.
 *
 *   node scripts/fetch-wikidata.mjs && node scripts/build-data.mjs
 *
 * This is the pattern for every future importer:
 *   1. Only pull from sources listed in data/sources.json with a licence that allows reuse.
 *   2. Save the raw-but-trimmed result with source URL, licence and retrieval date.
 *   3. Let build-data.mjs merge it — never hand-edit generated files.
 */
import { writeFileSync } from 'node:fs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
// Latest population statement per country, keyed by ISO 3166-1 alpha-3.
const QUERY = `
SELECT ?iso ?population ?date WHERE {
  ?country wdt:P298 ?iso ; p:P1082 ?st .
  ?st ps:P1082 ?population ; wikibase:rank ?rank .
  OPTIONAL { ?st pq:P585 ?date }
  FILTER(?rank != wikibase:DeprecatedRank)
}`;

const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(QUERY)}`, {
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'WorldAtlasDataBuilder/0.1' },
});
if (!res.ok) throw new Error(`Wikidata responded ${res.status}`);
const json = await res.json();

const countries = {};
for (const row of json.results.bindings) {
  const iso = row.iso.value;
  const year = row.date ? Number(row.date.value.slice(0, 4)) : 0;
  if (!countries[iso] || year > countries[iso].populationYear) {
    countries[iso] = { population: Number(row.population.value), populationYear: year || null };
  }
}

writeFileSync(
  'data/sources/wikidata-countries.json',
  JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: ENDPOINT, retrieved: new Date().toISOString(), countries }, null, 2),
);
console.log(`Saved population for ${Object.keys(countries).length} countries`);
