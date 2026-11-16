/**
 * One landmark photo per country, from Wikidata + Wikimedia Commons.
 *
 *   node scripts/importers/wikidata-landmarks.mjs
 *
 * For each country, picks its best-known UNESCO World Heritage Site that has a photo (Wikidata P18),
 * falling back to a photo of the capital. Only photos under licences that allow reuse with credit are
 * kept (CC0, public domain, CC BY, CC BY-SA); the author and licence are recorded for the credit line.
 * A 640px-wide copy is saved to data/photos/<cca3>.jpg (copied to public/ by build-data).
 *
 * Needs data/sources/wikidata.json first. Output: data/sources/landmarks.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { USER_AGENT, getJson } from './http.mjs';

const countries = JSON.parse(readFileSync('data/sources/wikidata.json', 'utf8')).countries;
const QID_OVERRIDE = { NLD: 'Q55' };
const qids = Object.entries(countries).map(([iso, c]) => [iso, QID_OVERRIDE[iso] ?? c.wikidata]).filter(([, q]) => /^Q\d+$/.test(q));
const isoByQid = new Map(qids.map(([iso, q]) => [q, iso]));
const sparql = async (q) => (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { Accept: 'application/sparql-results+json' }, retries: 4 })).results.bindings;
const fileName = (url) => decodeURIComponent(url.split('/').pop()).replace(/_/g, ' ');
const OK_LICENCE = /^(cc0|public domain|pd|cc by(-sa)? \d)/i;

// 1. Candidates: World Heritage Sites with a photo, best known first; then the capital's photo.
const candidates = {}; // iso -> [{ title, file }]
for (let i = 0; i < qids.length; i += 40) {
  const values = qids.slice(i, i + 40).map(([, q]) => 'wd:' + q).join(' ');
  for (const r of await sparql(`SELECT ?c ?siteLabel ?img ?n WHERE {
      VALUES ?c { ${values} } ?site wdt:P1435 wd:Q9259 ; wdt:P17 ?c ; wdt:P18 ?img ; wikibase:sitelinks ?n .
      ?site rdfs:label ?siteLabel . FILTER(LANG(?siteLabel) = "en") } ORDER BY DESC(?n)`)) {
    const iso = isoByQid.get(r.c.value.split('/').pop());
    (candidates[iso] ??= []).push({ title: r.siteLabel.value, file: fileName(r.img.value), kind: 'World Heritage Site' });
  }
  for (const r of await sparql(`SELECT ?c ?capLabel ?img WHERE {
      VALUES ?c { ${values} } ?c wdt:P36 ?cap . ?cap wdt:P18 ?img ; rdfs:label ?capLabel . FILTER(LANG(?capLabel) = "en") }`)) {
    const iso = isoByQid.get(r.c.value.split('/').pop());
    (candidates[iso] ??= []).push({ title: r.capLabel.value, file: fileName(r.img.value), kind: 'Capital city' });
  }
  console.log(`candidates ${Math.min(i + 40, qids.length)}/${qids.length}`);
}

// 2. For each country, the first candidate with a reusable licence; download a small copy.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
mkdirSync('data/photos', { recursive: true });
const out = {};
for (const [iso, list] of Object.entries(candidates)) {
  for (const cand of list.slice(0, 6)) {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=640&titles=${encodeURIComponent('File:' + cand.file)}`;
    await sleep(1000); // Commons asks bots to go slowly
    let info;
    try { info = Object.values((await getJson(api, { retries: 5 })).query.pages)[0].imageinfo?.[0]; } catch (e) { console.warn(`  ${iso}: ${e.message.slice(-60)}`); continue; }
    if (!info?.thumburl) continue;
    const m = info.extmetadata ?? {};
    const licence = strip(m.LicenseShortName?.value);
    if (!OK_LICENCE.test(licence)) continue;
    const res = await fetch(info.thumburl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (!res?.ok) continue;
    writeFileSync(`data/photos/${iso.toLowerCase()}.jpg`, Buffer.from(await res.arrayBuffer()));
    out[iso] = {
      title: cand.title,
      kind: cand.kind,
      author: strip(m.Artist?.value).slice(0, 120) || 'Unknown author',
      licence,
      licenceUrl: m.LicenseUrl?.value ?? null,
      sourceUrl: info.descriptionurl,
    };
    break;
  }
  if (!out[iso]) console.warn(`  no reusable photo for ${iso}`);
}
writeFileSync('data/sources/landmarks.json', JSON.stringify({ source: 'wikimedia-commons', retrieved: new Date().toISOString(), countries: out }, null, 1));
console.log(`Saved photos for ${Object.keys(out).length} countries`);
if (!existsSync('data/photos')) process.exit(1);
