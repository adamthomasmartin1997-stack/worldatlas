/**
 * Government facts per country from Wikidata (CC0): form of government, the offices of the head of
 * state and head of government, the national anthem and the motto. (Memberships of international organisations
 * come from the curated data/memberships.json instead: Wikidata's lists were incomplete.)
 *
 *   node scripts/importers/wikidata-government.mjs
 *
 * Needs data/sources/wikidata.json first (for each country's Wikidata id).
 * Output: data/sources/wikidata-government.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const qids = Object.entries(countries).map(([iso, c]) => [iso, c.wikidata]).filter(([, q]) => /^Q\d+$/.test(q));
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));

const out = {};
const entry = (qid) => (out[isoByQid.get(qid)] ??= { forms: [] });
const sparql = async (q) => (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries: 4 })).results.bindings;
const qid = (b) => b.value.split('/').pop();
const label = (v) => `?${v} rdfs:label ?${v}L . FILTER(LANG(?${v}L) IN ("en", "mul"))`;

for (let i = 0; i < qids.length; i += 25) {
  const values = qids.slice(i, i + 25).map(([, q]) => 'wd:' + q).join(' ');
  const hint = 'hint:Query hint:optimizer "None" .';

  for (const r of await sparql(`SELECT ?c ?fL WHERE { ${hint} VALUES ?c { ${values} } ?c wdt:P122 ?f . ${label('f')} }`)) {
    const e = entry(qid(r.c));
    if (!e.forms.includes(r.fL.value)) e.forms.push(r.fL.value);
  }
  for (const [prop, key] of [['P1906', 'headOfStateOffice'], ['P1313', 'headOfGovernmentOffice'], ['P85', 'anthem']]) {
    for (const r of await sparql(`SELECT ?c ?xL WHERE { ${hint} VALUES ?c { ${values} } ?c p:${prop} ?st . ?st ps:${prop} ?x ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank) FILTER NOT EXISTS { ?st pq:P582 ?end } ${label('x')} }`)) {
      const e = entry(qid(r.c));
      if (!e[key] && !/^Q\d+$/.test(r.xL.value)) e[key] = r.xL.value;
    }
  }
  for (const r of await sparql(`SELECT ?c ?m WHERE { ${hint} VALUES ?c { ${values} } ?c wdt:P1451 ?m . }`)) {
    const e = entry(qid(r.c));
    const lang = r.m['xml:lang'];
    if (!e.motto || lang === 'en') e.motto = { text: r.m.value, lang };
  }
  console.log(`countries ${Math.min(i + 25, qids.length)}/${qids.length}`);
}

mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-government.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: 'https://query.wikidata.org/sparql', retrieved: new Date().toISOString(), countries: out }, null, 1));
console.log(`Saved government facts for ${Object.keys(out).length} countries`);
