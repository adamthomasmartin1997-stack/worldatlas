/**
 * Fetches the cities listed under "add" in data/city-corrections.json from Wikidata (CC0):
 * name, location and population, so hand-picked additions are still sourced data.
 *
 *   node scripts/importers/wikidata-city-additions.mjs   ->  data/sources/wikidata-city-additions.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const { add } = JSON.parse(readFileSync('data/city-corrections.json', 'utf8'));
const ids = Object.values(add).flat();
const rows = (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(`SELECT ?item ?name (MAX(?p) AS ?pop) (SAMPLE(?c) AS ?coord) WHERE {
  VALUES ?item { ${ids.map((q) => 'wd:' + q).join(' ')} }
  ?item wdt:P625 ?c ; rdfs:label ?name . FILTER(LANG(?name) IN ("en", "mul")) OPTIONAL { ?item wdt:P1082 ?p }
} GROUP BY ?item ?name`)}`, { headers: { Accept: 'application/sparql-results+json' } })).results.bindings;
const byId = new Map();
for (const r of rows) {
  const id = r.item.value.split('/').pop();
  const m = r.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (!m || byId.has(id)) continue;
  byId.set(id, { wikidata: id, name: r.name.value, lat: +Number(m[2]).toFixed(3), lon: +Number(m[1]).toFixed(3), population: r.pop ? Number(r.pop.value) : 0, capital: false });
}
const countries = Object.fromEntries(Object.entries(add).map(([iso, list]) => [iso, list.map((q) => byId.get(q)).filter(Boolean)]));
mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-city-additions.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', retrieved: new Date().toISOString(), countries }, null, 1));
console.log(`Fetched ${byId.size} of ${ids.length} added cities`);
