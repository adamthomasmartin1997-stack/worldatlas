/**
 * Fills gaps in the city data from Wikidata (CC0):
 *   1. every country's official capital (P36), so the capital is always on the map;
 *   2. per country, its most populous settlements of ANY settlement type (anything that is a kind of
 *      "human settlement"), which catches places the type-based city import misses (e.g. Dutch and
 *      Iranian cities) and gives tiny countries their largest settlement.
 *
 *   node scripts/importers/wikidata-settlements.mjs
 *
 * Needs data/sources/wikidata.json. Output: data/sources/wikidata-settlements.json
 * Large countries can time out on (2); they keep the results of wikidata-cities.mjs instead.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const wd = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const qids = Object.entries(wd).map(([iso, c]) => [iso, c.wikidata, c.population?.value ?? 0]).filter(([, q]) => /^Q\d+$/.test(q));
const sparql = async (q, retries = 1) => (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries })).results.bindings;
const point = (s) => { const m = s.match(/Point\(([-\d.]+) ([-\d.]+)\)/); return m ? { lat: +Number(m[2]).toFixed(3), lon: +Number(m[1]).toFixed(3) } : null; };

// 1. Capitals, 50 countries per query.
const capitals = {};
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));
for (let i = 0; i < qids.length; i += 50) {
  const rows = await sparql(`SELECT ?country ?cap ?name ?pop ?coord WHERE {
    VALUES ?country { ${qids.slice(i, i + 50).map(([, q]) => 'wd:' + q).join(' ')} }
    ?country wdt:P36 ?cap . ?cap rdfs:label ?name ; wdt:P625 ?coord . FILTER(LANG(?name) IN ("en", "mul"))
    OPTIONAL { ?cap wdt:P1082 ?pop } }`, 3);
  for (const r of rows) {
    const iso = isoByQid.get(r.country.value.split('/').pop());
    const p = point(r.coord.value);
    if (!iso || !p || capitals[iso]) continue;
    capitals[iso] = { wikidata: r.cap.value.split('/').pop(), name: r.name.value, ...p, population: r.pop ? Number(r.pop.value) : 0, capital: true };
  }
}
console.log(`capitals: ${Object.keys(capitals).length}`);

// 2. Largest settlements per country, three countries at a time.
const settlements = {};
const failed = [];
async function one([iso, qid, pop]) {
  const min = pop > 20_000_000 ? 100000 : pop > 2_000_000 ? 20000 : 0;
  try {
    const rows = await sparql(`SELECT ?s ?name (MAX(?p) AS ?pop) (SAMPLE(?c) AS ?coord) WHERE {
      hint:Query hint:optimizer "None" .
      ?s wdt:P17 wd:${qid} . ?s wdt:P1082 ?p . FILTER(?p >= ${min}) ?s wdt:P625 ?c .
      ?s wdt:P31 ?t . ?t wdt:P279* wd:Q486972 .
      ?s rdfs:label ?name . FILTER(LANG(?name) IN ("en", "mul"))
      FILTER NOT EXISTS { ?s wdt:P576 ?dissolved }
    } GROUP BY ?s ?name ORDER BY DESC(?pop) LIMIT 25`);
    settlements[iso] = rows.map((r) => ({ wikidata: r.s.value.split('/').pop(), name: r.name.value, ...point(r.coord.value), population: Number(r.pop.value), capital: false })).filter((x) => x.lat != null);
  } catch { failed.push(iso); }
}
const queue = [...qids];
let done = 0;
await Promise.all([0, 1, 2].map(async () => { for (let c; (c = queue.shift()); ) { await one(c); if (++done % 20 === 0) console.log(`settlements ${done}/${qids.length}`); } }));

mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-settlements.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: 'https://query.wikidata.org/sparql', retrieved: new Date().toISOString(), capitals, settlements }, null, 1));
console.log(`Saved capitals for ${Object.keys(capitals).length} countries and settlements for ${Object.keys(settlements).length}.${failed.length ? ` Timed out (kept type-based cities): ${failed.join(', ')}` : ''}`);
