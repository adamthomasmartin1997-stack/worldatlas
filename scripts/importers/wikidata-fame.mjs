/**
 * How well known each country is, from Wikidata (CC0): the number of Wikipedia language editions with
 * an article about it ("sitelinks"). Used only to set quiz difficulty, never shown as a fact.
 *
 *   node scripts/importers/wikidata-fame.mjs
 *
 * Needs data/sources/wikidata.json first. Output: data/sources/wikidata-fame.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getJson } from './http.mjs';

const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
// Where the country's main Wikidata item is a wider entity, use the item people actually link to.
const QID_OVERRIDE = { NLD: 'Q55' }; // Q29999 is the Kingdom of the Netherlands, including the Caribbean countries
const qids = Object.entries(countries).map(([iso, c]) => [iso, QID_OVERRIDE[iso] ?? c.wikidata]).filter(([, q]) => /^Q\d+$/.test(q));
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));
const out = {};
for (let i = 0; i < qids.length; i += 100) {
  const values = qids.slice(i, i + 100).map(([, q]) => 'wd:' + q).join(' ');
  const q = `SELECT ?c ?n WHERE { VALUES ?c { ${values} } ?c wikibase:sitelinks ?n . }`;
  const r = await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries: 4 });
  for (const b of r.results.bindings) out[isoByQid.get(b.c.value.split('/').pop())] = Number(b.n.value);
}
mkdirSync('data/sources', { recursive: true });
writeFileSync('data/sources/wikidata-fame.json', JSON.stringify({ source: 'wikidata', licence: 'CC0-1.0', url: 'https://query.wikidata.org/sparql', retrieved: new Date().toISOString(), countries: out }, null, 1));
console.log(`Saved sitelink counts for ${Object.keys(out).length} countries`);
