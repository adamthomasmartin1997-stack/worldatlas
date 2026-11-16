/**
 * One landmark photo per country, from Wikidata + Wikimedia Commons.
 *
 *   node scripts/importers/wikidata-landmarks.mjs
 *
 * For each country, picks its best-known UNESCO World Heritage Site that has a photo (Wikidata P18),
 * falling back to a photo of the capital. Only photos under licences that allow reuse with credit are
 * kept (CC0, public domain, CC BY, CC BY-SA); the author and licence are recorded for the credit line.
 * A 960px-wide copy (a standard Commons thumbnail size) is fetched and shrunk to 640px
 * with ImageMagick (`convert`), then saved to data/photos/<cca3>.jpg (copied to public/ by build-data).
 *
 * Needs data/sources/wikidata.json first. Output: data/sources/landmarks.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

// 2. Licence check, 50 files per Commons API call (Commons asks bots to batch and go slowly).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
mkdirSync('data/photos', { recursive: true });
// Resume: keep earlier results whose photo is already on disk.
const prev = existsSync('data/sources/landmarks.json') ? JSON.parse(readFileSync('data/sources/landmarks.json', 'utf8')).countries : {};
const out = Object.fromEntries(Object.entries(prev).filter(([iso]) => existsSync(`data/photos/${iso.toLowerCase()}.jpg`)));
const todo = Object.entries(candidates).filter(([iso]) => !out[iso]);
const files = [...new Set(todo.flatMap(([, list]) => list.slice(0, 6).map((c) => c.file)))];
const infoByFile = new Map();
for (let i = 0; i < files.length; i += 50) {
  const titles = files.slice(i, i + 50).map((f) => 'File:' + f).join('|');
  await sleep(2000);
  const body = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=960&titles=${encodeURIComponent(titles)}`, { retries: 6 });
  const norm = new Map((body.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const page of Object.values(body.query.pages)) {
    const asked = (norm.get(page.title) ?? page.title).replace(/^File:/, '');
    if (page.imageinfo?.[0]) { infoByFile.set(asked, page.imageinfo[0]); infoByFile.set(page.title.replace(/^File:/, ''), page.imageinfo[0]); }
  }
  console.log(`licences ${Math.min(i + 50, files.length)}/${files.length}`);
}

// 3. Download the first reusable candidate per country, one at a time, backing off on 429.
async function download(url) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (res?.ok) return Buffer.from(await res.arrayBuffer());
    if (res && res.status !== 429 && res.status < 500) return null;
    const wait = Number(res?.headers.get('retry-after')) || 15 * attempt;
    console.warn(`    ${res?.status ?? 'network error'}, waiting ${wait}s`);
    await sleep(wait * 1000);
  }
  return null;
}
for (const [iso, list] of todo) {
  for (const cand of list.slice(0, 6)) {
    const info = infoByFile.get(cand.file);
    if (!info?.thumburl) continue;
    const m = info.extmetadata ?? {};
    const licence = strip(m.LicenseShortName?.value);
    if (!OK_LICENCE.test(licence)) continue;
    await sleep(1500);
    const buf = await download(info.thumburl);
    if (!buf) continue;
    const dest = `data/photos/${iso.toLowerCase()}.jpg`;
    writeFileSync(dest, buf);
    execFileSync('convert', [dest, '-resize', '640x>', '-strip', '-quality', '78', dest]);
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
