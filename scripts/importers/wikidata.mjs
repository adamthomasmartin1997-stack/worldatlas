/**
 * Wikidata importer (CC0 — free to reuse, no attribution required; we credit it anyway).
 *
 *   node scripts/importers/wikidata.mjs
 *
 * Saves, per ISO alpha-3 code: latest population (with year), area, and highest point,
 * plus the Wikidata item id so every value can be traced back. Output: data/sources/wikidata.json
 *
 * Pattern for every future importer:
 *   1. Only pull from sources listed in data/sources.json with a licence that allows reuse.
 *   2. Save trimmed results with source URL, licence and retrieval date.
 *   3. Let build-data.mjs merge them — never hand-edit generated files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const RANK = 'FILTER(?rank != wikibase:DeprecatedRank)';

async function sparql(query) {
  const json = await getJson(`${ENDPOINT}?query=${encodeURIComponent(query)}`, { headers: { Accept: 'application/sparql-results+json' } });
  return json.results.bindings;
}

// Only current sovereign states and territories that carry an ISO 3166-1 alpha-3 code.
const COUNTRY = `?item wdt:P298 ?iso . FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }`;

const out = {};
const entry = (iso, item) => (out[iso] ??= { wikidata: item.replace('http://www.wikidata.org/entity/', '') });
const rankScore = (r) => (r.endsWith('PreferredRank') ? 1 : 0);

// Population: preferred statement first, otherwise the most recent dated one.
for (const r of await sparql(`SELECT ?item ?iso ?value ?date ?rank WHERE { ${COUNTRY}
  ?item p:P1082 ?st . ?st ps:P1082 ?value ; wikibase:rank ?rank . OPTIONAL { ?st pq:P585 ?date } ${RANK} }`)) {
  const e = entry(r.iso.value, r.item.value);
  const year = r.date ? Number(r.date.value.slice(0, 4)) : null;
  const cand = { value: Number(r.value.value), year, score: rankScore(r.rank.value) * 10000 + (year ?? 0) };
  if (!e.population || cand.score > e.population.score) e.population = cand;
}

// Area in km² (statements in other units are skipped rather than converted).
for (const r of await sparql(`SELECT ?item ?iso ?value ?rank WHERE { ${COUNTRY}
  ?item p:P2046 ?st . ?st psv:P2046 [ wikibase:quantityAmount ?value ; wikibase:quantityUnit wd:Q712226 ] ; wikibase:rank ?rank . ${RANK} }`)) {
  const e = entry(r.iso.value, r.item.value);
  const cand = { value: Number(r.value.value), score: rankScore(r.rank.value) };
  if (!e.area || cand.score > e.area.score) e.area = cand;
}

// Highest point, with its elevation in metres when recorded.
for (const r of await sparql(`SELECT ?item ?iso ?pointLabel ?elev WHERE { ${COUNTRY}
  ?item wdt:P610 ?point . OPTIONAL { ?point p:P2044/psv:P2044 [ wikibase:quantityAmount ?elev ; wikibase:quantityUnit wd:Q11573 ] }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`)) {
  const e = entry(r.iso.value, r.item.value);
  if (/^Q\d+$/.test(r.pointLabel.value)) continue; // no English label
  if (!e.highestPoint || (!e.highestPoint.elevation && r.elev)) e.highestPoint = { name: r.pointLabel.value, elevation: r.elev ? Math.round(Number(r.elev.value)) : null };
}

for (const e of Object.values(out)) {
  if (e.population) delete e.population.score;
  if (e.area) delete e.area.score;
}
mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: ENDPOINT, retrieved: new Date().toISOString(), countries: out }, null, 1));
console.log(`Saved ${Object.keys(out).length} countries: population ${Object.values(out).filter((e) => e.population).length}, area ${Object.values(out).filter((e) => e.area).length}, highest point ${Object.values(out).filter((e) => e.highestPoint).length}`);
