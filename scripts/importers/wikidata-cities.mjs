/**
 * Largest cities per country, from Wikidata (CC0). Used for the city markers on country maps.
 *
 *   node scripts/importers/wikidata-cities.mjs
 *
 * Asks about ~10 countries per query so each one stays fast (one big query times out).
 * Needs data/sources/wikidata.json first (for each country's Wikidata id).
 * Output: data/sources/wikidata-cities.json — up to 10 cities per country, largest first.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const qids = Object.entries(countries).map(([iso, c]) => [iso, c.wikidata]).filter(([, q]) => /^Q\d+$/.test(q));
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));

// Settlement types that cover cities in most countries' Wikidata modelling.
const TYPES = ['Q515', 'Q1549591', 'Q1637706', 'Q5119', 'Q200250', 'Q1093829'];
const MIN_POP = 20000;
const PER_COUNTRY = 10;

const out = {};
const batches = [];
for (let i = 0; i < qids.length; i += 10) batches.push(qids.slice(i, i + 10));

function query(batch) {
  return `SELECT ?country ?city ?name ?pop ?coord ?capital WHERE {
    VALUES ?country { ${batch.map(([, q]) => 'wd:' + q).join(' ')} }
    VALUES ?type { ${TYPES.map((t) => 'wd:' + t).join(' ')} }
    ?city wdt:P31 ?type ; wdt:P17 ?country ; wdt:P1082 ?pop ; wdt:P625 ?coord ; rdfs:label ?name .
    FILTER(LANG(?name) IN ("en", "mul")) FILTER(?pop >= ${MIN_POP})
    FILTER NOT EXISTS { ?city wdt:P576 ?dissolved }
    OPTIONAL { ?country wdt:P36 ?capital . FILTER(?capital = ?city) }
  }`;
}
async function fetchBatch(batch, retries) {
  return (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query(batch))}`, { headers: { Accept: 'application/sparql-results+json' }, retries })).results.bindings;
}
function add(rows) {
  for (const r of rows) {
    const iso = isoByQid.get(r.country.value.split('/').pop());
    const m = r.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (!iso || !m) continue;
    const id = r.city.value.split('/').pop();
    const pop = Number(r.pop.value);
    const list = (out[iso] ??= {});
    if (!list[id] || list[id].population < pop) list[id] = { wikidata: id, name: r.name.value, lat: +Number(m[2]).toFixed(3), lon: +Number(m[1]).toFixed(3), population: pop, capital: Boolean(r.capital) };
  }
}
const failed = [];
for (const [n, batch] of batches.entries()) {
  try {
    add(await fetchBatch(batch, 2));
  } catch {
    // A slow batch: try its countries one by one, and skip any that still fail.
    for (const one of batch) {
      try { add(await fetchBatch([one], 2)); } catch { failed.push(one[0]); }
    }
  }
  console.log(`batch ${n + 1}/${batches.length}${failed.length ? ` (skipped so far: ${failed.join(', ')})` : ''}`);
}

const result = {};
for (const [iso, list] of Object.entries(out)) {
  const all = Object.values(list).sort((a, b) => b.population - a.population);
  const capital = all.find((c) => c.capital);
  const top = all.slice(0, PER_COUNTRY);
  if (capital && !top.includes(capital)) top[top.length - 1] = capital; // always keep the capital
  result[iso] = top;
}
mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-cities.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: 'https://query.wikidata.org/sparql', retrieved: new Date().toISOString(), minPopulation: MIN_POP, countries: result }, null, 1));
console.log(`Saved cities for ${Object.keys(result).length} countries`);
if (failed.length) console.log(`Wikidata timed out for: ${failed.join(', ')}. Re-run later to fill them in.`);
