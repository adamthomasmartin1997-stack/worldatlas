/**
 * Extra geography facts per country from Wikidata (CC0): seas/oceans it borders, and its lowest point.
 *
 *   node scripts/importers/wikidata-geography.mjs
 *
 * Needs data/sources/wikidata.json first (for each country's Wikidata id). Output: data/sources/wikidata-geography.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const qids = Object.entries(countries).map(([iso, c]) => [iso, c.wikidata]).filter(([, q]) => /^Q\d+$/.test(q));
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));
const WATER_TYPES = ['Q9430', 'Q165', 'Q204894', 'Q1322134', 'Q39594', 'Q37901', 'Q1973404'];
const out = {};
const entry = (qid) => (out[isoByQid.get(qid)] ??= { seas: [] });
const sparql = async (q) => (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries: 3 })).results.bindings;

for (let i = 0; i < qids.length; i += 50) {
  const values = qids.slice(i, i + 50).map(([, q]) => 'wd:' + q).join(' ');
  // Seas and oceans (P206 "located in or next to body of water"), only real seas/oceans/gulfs/bays/straits.
  for (const r of await sparql(`SELECT ?country ?name WHERE {
      VALUES ?country { ${values} } VALUES ?t { ${WATER_TYPES.map((t) => 'wd:' + t).join(' ')} }
      ?country wdt:P206 ?w . ?w wdt:P31 ?t ; rdfs:label ?name . FILTER(LANG(?name) IN ("en", "mul")) }`)) {
    const e = entry(r.country.value.split('/').pop());
    if (!e.seas.includes(r.name.value)) e.seas.push(r.name.value);
  }
  // Lowest point (P1589), with its elevation in metres when recorded.
  for (const r of await sparql(`SELECT ?country ?name ?elev WHERE {
      VALUES ?country { ${values} }
      ?country wdt:P1589 ?p . ?p rdfs:label ?name . FILTER(LANG(?name) IN ("en", "mul"))
      OPTIONAL { ?p p:P2044/psv:P2044 [ wikibase:quantityAmount ?elev ; wikibase:quantityUnit wd:Q11573 ] } }`)) {
    const e = entry(r.country.value.split('/').pop());
    if (/^Q\d+$/.test(r.name.value)) continue;
    if (!e.lowestPoint || (e.lowestPoint.elevation == null && r.elev)) e.lowestPoint = { name: r.name.value, elevation: r.elev ? Math.round(Number(r.elev.value)) : null };
  }
  console.log(`countries ${Math.min(i + 50, qids.length)}/${qids.length}`);
}
for (const e of Object.values(out)) e.seas.sort();
mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-geography.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: 'https://query.wikidata.org/sparql', retrieved: new Date().toISOString(), countries: out }, null, 1));
console.log(`Saved geography for ${Object.keys(out).length} countries`);
