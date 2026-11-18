/**
 * Historical events from Wikidata (CC0): wars, battles, treaties, revolutions, empires and more.
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/importers/wikidata-events.mjs   (the proxy flag only behind a proxy)
 *
 * 1. Finds notable items of each event type (instance of the type or one of its subclasses), keeping
 *    those with Wikipedia articles in at least `min` languages, a rough but neutral measure of notability.
 * 2. Fetches, in batches: English label and description, dates with their precision, coordinates
 *    (the event's own, or its location's), and links to other items: countries, participants, the
 *    larger event it is part of, causes, effects, what came before and after.
 * 3. Works out which modern countries each event concerns: modern countries named as its country or
 *    participants, plus the country its coordinates fall in today (world-50m borders).
 *    Historical states (the Kingdom of France, the Ottoman Empire…) are kept as named links.
 *
 * Wikidata descriptions are short labels ("battle of the Napoleonic Wars"); the site writes its own
 * text and uses these as structured facts. Output: data/sources/wikidata-events.json
 * Needs data/sources/wikidata.json and public/data/world-50m.json.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { getJson } from './http.mjs';

const OUT = 'data/sources/wikidata-events.json';
// Order matters: an item matching several types gets the first, most specific kind.
const TYPES = [
  { kind: 'genocide', qid: 'Q41397', min: 15 },
  { kind: 'massacre', qid: 'Q3199915', min: 20 },
  { kind: 'assassination', qid: 'Q3882219', min: 15 },
  { kind: 'coup', qid: 'Q45382', min: 15 },
  { kind: 'siege', qid: 'Q188055', min: 20 },
  { kind: 'battle', qid: 'Q178561', min: 20 },
  { kind: 'revolution', qid: 'Q10931', min: 15 },
  { kind: 'rebellion', qid: 'Q124734', min: 15 },
  { kind: 'civil war', qid: 'Q8465', min: 15 },
  { kind: 'war', qid: 'Q198', min: 15 },
  { kind: 'treaty', qid: 'Q131569', min: 15 },
  { kind: 'state', qid: 'Q3024240', min: 30 }, // historical countries and empires
  { kind: 'epidemic', qid: 'Q44512', min: 20 },
  { kind: 'earthquake', qid: 'Q7944', min: 25 },
  { kind: 'expedition', qid: 'Q2401485', min: 20 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sparql = async (q) => {
  const res = await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries: 5, timeoutMs: 90_000 });
  await sleep(400); // be gentle with the public endpoint
  return res.results.bindings;
};
const qid = (uri) => uri.split('/').pop();

// Modern countries: Wikidata item -> ISO code.
const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const isoByQid = new Map(Object.entries(countries).filter(([, c]) => /^Q\d+$/.test(c.wikidata ?? '')).map(([iso, c]) => [c.wikidata, iso]));
const world = JSON.parse(readFileSync('public/data/world-50m.json', 'utf8'));
const shapes = feature(world, world.objects.countries).features;
const countryAt = ([lat, lon]) => shapes.find((f) => geoContains(f, [lon, lat]))?.properties.cca3 ?? null;

// 1. Notable items per type.
const kindOf = new Map(); // qid -> kind
for (const t of TYPES) {
  const rows = await sparql(`SELECT DISTINCT ?e WHERE { ?e wdt:P31/wdt:P279* wd:${t.qid} ; wikibase:sitelinks ?n . FILTER(?n >= ${t.min}) }`);
  let added = 0;
  for (const r of rows) { const q = qid(r.e.value); if (!kindOf.has(q)) { kindOf.set(q, t.kind); added++; } }
  console.log(`${t.kind}: ${rows.length} found, ${added} new`);
}

// 2. Details, in batches. Earlier results are reused, so a run cut short can resume.
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).events : [];
const cache = new Map(prev.filter((e) => e.start).map((e) => [e.id, e])); // undated ones are fetched again
const ids = [...kindOf.keys()];
const todo = ids.filter((q) => !cache.has(q));
const PRECISION = { 6: 'millennium', 7: 'century', 8: 'decade', 9: 'year', 10: 'month', 11: 'day' };
/**
 * The query service gives every date in the proleptic Gregorian calendar with astronomical year
 * numbering (year 0 = 1 BC, -489 = 490 BC). Dates entered in the Julian calendar (most dates before
 * 1582) are converted back to Julian, so the Battle of Hastings reads 14 October 1066 as historians
 * write it, and years are stored the historical way: -490 for 490 BC.
 */
const JULIAN = 'http://www.wikidata.org/entity/Q1985786';
const jdnFromGregorian = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
function julianFromJdn(j) {
  const c = j + 32082, d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153);
  return [d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1];
}
export function parseTime(value, precision, calendar) {
  const m = /^([+-]?)(\d+)-(\d\d)-(\d\d)/.exec(value); // the query service drops the "+" on AD dates
  if (!m) return null;
  let [y, mo, d] = [(m[1] === '-' ? -1 : 1) * Number(m[2]), Number(m[3]), Number(m[4])];
  if (calendar === JULIAN && mo && d) [y, mo, d] = julianFromJdn(jdnFromGregorian(y, mo, d));
  const p = Number(precision);
  const year = y <= 0 ? y - 1 : y; // astronomical -> historical
  const ys = year < 0 ? `-${String(-year).padStart(4, '0')}` : String(year).padStart(4, '0');
  const pad = (n) => String(n).padStart(2, '0');
  const date = p >= 11 ? `${ys}-${pad(mo)}-${pad(d)}` : p === 10 ? `${ys}-${pad(mo)}` : ys;
  return { date, year, precision: PRECISION[p] ?? 'year' };
}
const REL = { P17: 'country', P710: 'participants', P361: 'partOf', P828: 'causes', P1542: 'effects', P155: 'follows', P156: 'followedBy', P276: 'location', P1365: 'replaces', P1366: 'replacedBy' };

const BATCH = 100;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const values = batch.map((q) => 'wd:' + q).join(' ');
  const ev = new Map(batch.map((q) => [q, { id: q, kind: kindOf.get(q), label: null, description: null, sitelinks: 0, article: null, start: null, end: null, coords: null, links: {} }]));

  for (const r of await sparql(`SELECT ?e ?label ?desc ?n ?article WHERE { VALUES ?e { ${values} } ?e wikibase:sitelinks ?n .
      OPTIONAL { ?e rdfs:label ?label FILTER(LANG(?label) = "en") } OPTIONAL { ?e schema:description ?desc FILTER(LANG(?desc) = "en") }
      OPTIONAL { ?article schema:about ?e ; schema:isPartOf <https://en.wikipedia.org/> } }`)) {
    const e = ev.get(qid(r.e.value));
    e.label = r.label?.value ?? null; e.description = r.desc?.value ?? null; e.sitelinks = Number(r.n.value); e.article = r.article?.value ?? null;
  }
  // Dates: a point in time, or a start and end; for states, founded and dissolved.
  for (const r of await sparql(`SELECT ?e ?prop ?v ?p ?cal WHERE { VALUES ?e { ${values} } VALUES ?prop { p:P585 p:P580 p:P582 p:P571 p:P576 }
      ?e ?prop ?s . ?s wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
      ?s ?psv ?node . ?propEntity wikibase:claim ?prop ; wikibase:statementValue ?psv . ?node wikibase:timeValue ?v ; wikibase:timePrecision ?p ; wikibase:timeCalendarModel ?cal . }`)) {
    const e = ev.get(qid(r.e.value));
    const t = parseTime(r.v.value, r.p.value, r.cal.value);
    if (!t) continue;
    const prop = qid(r.prop.value);
    if (prop === 'P585' || prop === 'P580' || prop === 'P571') { if (!e.start || t.year < e.start.year) e.start = t; }
    if (prop === 'P582' || prop === 'P576') { if (!e.end || t.year > e.end.year) e.end = t; }
  }
  for (const r of await sparql(`SELECT ?e (SAMPLE(?c) AS ?coord) (SAMPLE(?lc) AS ?locCoord) WHERE { VALUES ?e { ${values} }
      OPTIONAL { ?e wdt:P625 ?c } OPTIONAL { ?e wdt:P276 ?loc . ?loc wdt:P625 ?lc } } GROUP BY ?e`)) {
    const wkt = r.coord?.value ?? r.locCoord?.value;
    const m = wkt && /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(wkt);
    if (m && !/moon|mars/i.test(wkt)) ev.get(qid(r.e.value)).coords = [Number(Number(m[2]).toFixed(3)), Number(Number(m[1]).toFixed(3))];
  }
  for (const r of await sparql(`SELECT ?e ?prop ?o ?oLabel WHERE { VALUES ?e { ${values} }
      VALUES ?prop { ${Object.keys(REL).map((p) => 'wdt:' + p).join(' ')} } ?e ?prop ?o . FILTER(isIRI(?o))
      ?o rdfs:label ?oLabel FILTER(LANG(?oLabel) = "en") }`)) {
    const e = ev.get(qid(r.e.value));
    const key = REL[qid(r.prop.value)];
    const o = { id: qid(r.o.value), label: r.oLabel.value };
    if (!(e.links[key] ??= []).some((x) => x.id === o.id)) e.links[key].push(o);
  }
  for (const e of ev.values()) cache.set(e.id, e);
  console.log(`details ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  if ((i / BATCH) % 5 === 4) save(); // checkpoint every 500 events
}

// 3. Modern countries concerned, then keep only usable, dated events.
function save() {
  const events = ids.map((q) => cache.get(q)).filter(Boolean).map((e) => {
    const named = [...(e.links.country ?? []), ...(e.links.participants ?? [])].map((x) => isoByQid.get(x.id)).filter(Boolean);
    const place = e.coords ? countryAt(e.coords) : null;
    return { ...e, kind: kindOf.get(e.id) ?? e.kind, place, countries: [...new Set([...(place ? [place] : []), ...named])] };
  }).filter((e) => e.label && e.start && !/^Q\d+$/.test(e.label) && e.start.year <= new Date().getFullYear())
    .sort((a, b) => a.start.year - b.start.year || b.sitelinks - a.sitelinks);
  writeFileSync(OUT, JSON.stringify({ source: 'wikidata', licence: 'CC0', retrieved: new Date().toISOString(), events }, null, 0));
  return events;
}

const events = save();
const byKind = events.reduce((m, e) => ((m[e.kind] = (m[e.kind] ?? 0) + 1), m), {});
console.log(`saved ${events.length} dated events (${ids.length - events.length} dropped: no English label or date)`, byKind);
console.log(`with modern countries: ${events.filter((e) => e.countries.length).length}; with coordinates: ${events.filter((e) => e.coords).length}`);
