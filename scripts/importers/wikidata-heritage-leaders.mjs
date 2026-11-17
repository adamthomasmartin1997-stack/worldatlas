/**
 * Wikidata (CC0): World Heritage Sites with map coordinates, and heads of state and government since 1945.
 *
 *   node scripts/importers/wikidata-heritage-leaders.mjs
 *
 * Output: data/sources/wikidata-heritage.json and data/sources/wikidata-leaders.json.
 * Heritage kind comes from the UNESCO selection criteria (i-vi cultural, vii-x natural).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const QID_OVERRIDE = { NLD: 'Q55' };
const qids = Object.entries(countries).map(([iso, c]) => [iso, QID_OVERRIDE[iso] ?? c.wikidata]).filter(([, q]) => /^Q\d+$/.test(q));
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));
const sparql = async (q) => (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries: 5, timeoutMs: 120_000 })).results.bindings;
const qid = (uri) => uri.split('/').pop();

// 1. World Heritage Sites (one point each; transnational sites appear under every country listed).
const heritage = {};
for (const r of await sparql(`SELECT ?site ?siteLabel ?c ?coord (GROUP_CONCAT(DISTINCT ?critLabel; separator="|") AS ?crit) (SAMPLE(?n) AS ?links) WHERE {
    ?site wdt:P1435 wd:Q9259 ; wdt:P17 ?c ; wdt:P625 ?coord ; wikibase:sitelinks ?n .
    OPTIONAL { ?site wdt:P2614 ?critItem . ?critItem rdfs:label ?critLabel . FILTER(LANG(?critLabel) = "en") }
    ?site rdfs:label ?siteLabel . FILTER(LANG(?siteLabel) = "en")
  } GROUP BY ?site ?siteLabel ?c ?coord`)) {
  const iso = isoByQid.get(qid(r.c.value));
  if (!iso) continue;
  const m = r.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (!m) continue;
  const crit = r.crit?.value ?? '';
  const natural = /\((vii|viii|ix|x)\)/i.test(crit), cultural = /\((i|ii|iii|iv|v|vi)\)/i.test(crit);
  const kind = natural && cultural ? 'mixed' : natural ? 'natural' : 'cultural';
  const list = (heritage[iso] ??= []);
  if (list.some((s) => s.n === r.siteLabel.value)) continue;
  list.push({ n: r.siteLabel.value, lat: Math.round(Number(m[2]) * 1000) / 1000, lon: Math.round(Number(m[1]) * 1000) / 1000, kind, links: Number(r.links.value) });
}
for (const list of Object.values(heritage)) list.sort((a, b) => b.links - a.links);
writeFileSync('data/sources/wikidata-heritage.json', JSON.stringify({ source: 'wikidata', retrieved: new Date().toISOString().slice(0, 10), countries: heritage }));
console.log(`Heritage sites for ${Object.keys(heritage).length} countries`);

// 2. Heads of state (P35) and government (P6) with start/end dates, from 1945 on.
const leaders = {};
for (let i = 0; i < qids.length; i += 25) {
  const values = qids.slice(i, i + 25).map(([, q]) => 'wd:' + q).join(' ');
  for (const [prop, role] of [['P35', 'state'], ['P6', 'government']]) {
    for (const r of await sparql(`SELECT ?c ?p ?pLabel ?start ?end WHERE {
        VALUES ?c { ${values} } ?c p:${prop} ?st . ?st ps:${prop} ?p ; pq:P580 ?start . OPTIONAL { ?st pq:P582 ?end }
        FILTER(YEAR(?start) >= 1945 || !BOUND(?end) || YEAR(?end) >= 1945)
        ?p rdfs:label ?pLabel . FILTER(LANG(?pLabel) = "en") }`)) {
      const iso = isoByQid.get(qid(r.c.value));
      const from = r.start.value.slice(0, 10), to = r.end?.value.slice(0, 10) ?? null;
      const list = (leaders[iso] ??= []);
      if (!list.some((l) => l.role === role && l.n === r.pLabel.value && l.from === from)) list.push({ role, n: r.pLabel.value, from, to });
    }
  }
  console.log(`leaders ${Math.min(i + 25, qids.length)}/${qids.length}`);
}
for (const list of Object.values(leaders)) list.sort((a, b) => a.from.localeCompare(b.from));
writeFileSync('data/sources/wikidata-leaders.json', JSON.stringify({ source: 'wikidata', retrieved: new Date().toISOString().slice(0, 10), countries: leaders }));
console.log(`Leaders for ${Object.keys(leaders).length} countries`);
