/**
 * US states and DC from Wikidata (CC0): capital, population, area and largest cities per state.
 * State outlines come from the us-atlas package (US Census Bureau boundaries).
 *
 *   node scripts/importers/wikidata-us-states.mjs
 *
 * Output: data/sources/wikidata-us-states.json, keyed by 2-digit FIPS code (matches us-atlas ids).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getJson } from './http.mjs';

const require = createRequire(import.meta.url);
const atlas = [...require('us-atlas/states-10m.json').objects.states.geometries];
const sparql = async (q, retries = 2) => (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries })).results.bindings;
const point = (s) => { const m = s?.match(/Point\(([-\d.]+) ([-\d.]+)\)/); return m ? { lat: +Number(m[2]).toFixed(3), lon: +Number(m[1]).toFixed(3) } : null; };
const NOT_A_CITY = /township|metropolitan|micropolitan|urban area|metroplex|greater |bay area|inland empire|capital district|metro east|statistical|combined|region|county|area$/i;

// States, DC and territories: matched to us-atlas by FIPS code, or by name when Wikidata lacks the code.
const rows = await sparql(`SELECT ?state ?name ?fips ?abbr ?cap ?capName ?capCoord ?pop ?area WHERE {
  ?state wdt:P31 ?t . VALUES ?t { wd:Q35657 wd:Q1352230 wd:Q475050 } ?state rdfs:label ?name . FILTER(LANG(?name) IN ("en", "mul"))
  OPTIONAL { ?state wdt:P5087 ?fips } OPTIONAL { ?state wdt:P5086 ?abbr }
  OPTIONAL { ?state wdt:P36 ?cap . ?cap rdfs:label ?capName ; wdt:P625 ?capCoord . FILTER(LANG(?capName) IN ("en", "mul")) }
  OPTIONAL { ?state p:P1082 [ ps:P1082 ?pop ; wikibase:rank wikibase:PreferredRank ] }
  OPTIONAL { ?state wdt:P2046 ?area } }`);
const states = {};
for (let i = 0; i < atlas.length; i++) {
  const g = atlas[i];
  const r = rows.find((x) => x.fips?.value === g.id) ?? rows.find((x) => x.name.value === g.properties.name);
  if (!r) {
    // Fallback: find the state by name via its ISO 3166-2 code (US-XX), which every state has.
    const [f] = await sparql(`SELECT ?state ?iso WHERE { ?state rdfs:label "${g.properties.name}"@en ; wdt:P300 ?iso . FILTER(STRSTARTS(?iso, "US-")) } LIMIT 1`);
    if (!f) { console.log('no Wikidata match for', g.properties.name); continue; }
    rows.push({ state: f.state, name: { value: g.properties.name }, abbr: { value: f.iso.value.slice(3) } });
    atlas.push(g); // revisit below with the new row
    continue;
  }
  const prev = states[g.id];
  const pop = r.pop ? Number(r.pop.value) : prev?.population ?? null;
  states[g.id] = {
    name: g.properties.name, wikidata: r.state.value.split('/').pop(), abbr: r.abbr?.value ?? prev?.abbr ?? null,
    capital: r.capName ? { name: r.capName.value, wikidata: r.cap.value.split('/').pop(), ...point(r.capCoord.value) } : prev?.capital ?? null,
    population: pop && (!prev?.population || pop > prev.population) ? pop : prev?.population ?? null,
    area: r.area ? Math.round(Number(r.area.value)) : prev?.area ?? null,
    cities: [],
  };
}

// Fill any missing capital, population or area with a direct lookup on the state item.
for (const s of Object.values(states)) {
  if (s.capital && s.population && s.area) continue;
  const [r] = await sparql(`SELECT ?cap ?capName ?capCoord ?pop ?area WHERE {
    OPTIONAL { wd:${s.wikidata} wdt:P36 ?cap . ?cap wdt:P625 ?capCoord ; rdfs:label ?capName . FILTER(LANG(?capName) IN ("en", "mul")) }
    OPTIONAL { wd:${s.wikidata} wdt:P1082 ?pop } OPTIONAL { wd:${s.wikidata} wdt:P2046 ?area } } ORDER BY DESC(?pop) LIMIT 1`);
  if (!r) continue;
  if (!s.capital && r.capName) s.capital = { name: r.capName.value, wikidata: r.cap.value.split('/').pop(), ...point(r.capCoord.value) };
  if (!s.population && r.pop) s.population = Number(r.pop.value);
  if (!s.area && r.area) s.area = Math.round(Number(r.area.value));
}

// Largest cities per state (three states at a time). Places directly in the state, or one level down (counties).
const queue = Object.entries(states);
let done = 0;
await Promise.all([0, 1, 2].map(async () => {
  for (let item; (item = queue.shift()); ) {
    const [fips, s] = item;
    try {
      const found = await sparql(`SELECT ?city ?name (MAX(?p) AS ?pop) (SAMPLE(?c) AS ?coord) WHERE {
        hint:Query hint:optimizer "None" .
        { ?city wdt:P131 wd:${s.wikidata} } UNION { ?mid wdt:P131 wd:${s.wikidata} . ?city wdt:P131 ?mid }
        ?city wdt:P1082 ?p . ?city wdt:P625 ?c . ?city wdt:P31/wdt:P279* wd:Q486972 .
        ?city rdfs:label ?name . FILTER(LANG(?name) IN ("en", "mul"))
      } GROUP BY ?city ?name ORDER BY DESC(?pop) LIMIT 40`);
      s.cities = found
        .map((r) => ({ wikidata: r.city.value.split('/').pop(), name: r.name.value, ...point(r.coord.value), population: Number(r.pop.value) }))
        .filter((c) => c.lat != null && !NOT_A_CITY.test(c.name));
    } catch (e) { console.log('cities failed for', s.name, e.message.slice(-40)); }
    if (++done % 10 === 0) console.log(`states ${done}/${Object.keys(states).length}`);
  }
}));

mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-us-states.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: 'https://query.wikidata.org/sparql', retrieved: new Date().toISOString(), states }, null, 1));
console.log(`Saved ${Object.keys(states).length} states and territories`);
