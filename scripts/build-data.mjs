/**
 * Builds the app's data files from open-licensed sources installed via npm.
 *
 *   node scripts/build-data.mjs
 *
 * Inputs (see data/sources.json for licences):
 *   - world-atlas      Natural Earth 1:50m country shapes (public domain)
 *   - world-countries  names, codes, capitals, regions, area, borders (ODbL 1.0)
 *
 * Outputs:
 *   - public/data/world-50m.json   TopoJSON, each geometry tagged with properties.cca3
 *   - src/data/countries.json      one compact record per country / territory
 *
 * Optional sources (written by scripts/importers/*, merged when present):
 *   - data/sources/wikidata.json    population, total area, highest point (CC0)
 *   - data/sources/worldbank.json   yearly population, GDP, life expectancy (CC BY 4.0)
 *   - data/sources/wikidata-cities.json  largest cities per country (CC0) -> public/data/cities.json
 *     -> also writes public/data/series/<iso>.json for charts
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const topo = structuredClone(require('world-atlas/countries-50m.json'));
const countries = require('world-countries');

// Natural Earth shapes without an ISO numeric code that we can still map.
const NAME_FALLBACK = { Kosovo: 'UNK' };

const byNumeric = new Map(countries.map((c) => [c.ccn3, c]));
for (const g of topo.objects.countries.geometries) {
  const match = byNumeric.get(g.id) ?? countries.find((c) => c.cca3 === NAME_FALLBACK[g.properties.name]);
  g.properties = { name: g.properties.name, cca3: match?.cca3 ?? null };
}
const withShape = new Set(topo.objects.countries.geometries.map((g) => g.properties.cca3).filter(Boolean));

// The 193 UN members plus the two UN observer states.
const SOVEREIGN_EXTRA = new Set(['VAT', 'PSE']);
// Not in the 195 above, but not dependent territories either.
const STATUS_OVERRIDE = { UNK: 'Partially recognised state', TWN: 'Partially recognised state', ESH: 'Disputed territory' };

const load = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const wikidata = load('data/sources/wikidata.json');
const worldbank = load('data/sources/worldbank.json');
const wd = wikidata?.countries ?? {};
const wb = worldbank?.series ?? {};
const latest = (s) => (s?.length ? s[s.length - 1] : null);
const citySource = load('data/sources/wikidata-cities.json');
if (wikidata) console.log(`Merging Wikidata (retrieved ${wikidata.retrieved.slice(0, 10)})`);
if (worldbank) console.log(`Merging World Bank (retrieved ${worldbank.retrieved.slice(0, 10)})`);

/**
 * Precedence rules — one place to decide which source wins for each field.
 *   population: World Bank (consistent yearly method) → Wikidata
 *   area:       Wikidata (total incl. overseas regions, traceable to an item) → mledoze/countries
 */
function population(iso) {
  const w = latest(wb[iso]?.population);
  if (w) return { value: w[1], year: w[0], source: 'world-bank' };
  const d = wd[iso]?.population;
  if (d?.value) return { value: d.value, year: d.year, source: 'wikidata' };
  return null;
}
function area(iso, fallback) {
  const w = wd[iso]?.area?.value;
  // Sanity guard: a value less than half or more than double the other source is treated as an
  // error in the source (e.g. Wikidata once listed Bosnia and Herzegovina as 10 km²), not a definition difference.
  const plausible = w && (!(fallback > 0) || (w / fallback > 0.5 && w / fallback < 2));
  if (plausible) return { value: Math.round(w), source: 'wikidata' };
  if (w) console.warn(`  area: ignoring Wikidata value ${w} km² for ${iso} (other source: ${fallback})`);
  if (fallback > 0) return { value: fallback, source: 'world-countries' };
  return null;
}

const out = countries
  .map((c) => ({
    cca3: c.cca3,
    cca2: c.cca2,
    name: c.name.common,
    officialName: c.name.official,
    altNames: [...new Set([...c.altSpellings, c.name.official].filter((n) => n.length > 3))],
    sovereign: Boolean(c.unMember || SOVEREIGN_EXTRA.has(c.cca3)),
    status: c.unMember || SOVEREIGN_EXTRA.has(c.cca3) ? 'Sovereign state' : (STATUS_OVERRIDE[c.cca3] ?? 'Territory'),
    region: c.region,
    subregion: c.subregion || null,
    capital: c.capital ?? [],
    languages: Object.values(c.languages ?? {}),
    currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({ code, name: v.name })),
    area: area(c.cca3, c.area),
    highestPoint: wd[c.cca3]?.highestPoint ?? null,
    wikidata: wd[c.cca3]?.wikidata ?? null,
    latlng: c.latlng,
    landlocked: c.landlocked,
    borders: c.borders,
    callingCode: c.idd?.root ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '') : null,
    tld: c.tld ?? [],
    demonym: c.demonyms?.eng?.m ?? null,
    hasShape: withShape.has(c.cca3),
    population: population(c.cca3),
    gdp: latest(wb[c.cca3]?.gdp) ? { value: Math.round(latest(wb[c.cca3].gdp)[1]), year: latest(wb[c.cca3].gdp)[0], source: 'world-bank' } : null,
    gdpPerCapita: latest(wb[c.cca3]?.gdpPerCapita) ? { value: Math.round(latest(wb[c.cca3].gdpPerCapita)[1]), year: latest(wb[c.cca3].gdpPerCapita)[0], source: 'world-bank' } : null,
    lifeExpectancy: latest(wb[c.cca3]?.lifeExpectancy) ? { value: Math.round(latest(wb[c.cca3].lifeExpectancy)[1] * 10) / 10, year: latest(wb[c.cca3].lifeExpectancy)[0], source: 'world-bank' } : null,
    hasSeries: Boolean(wb[c.cca3]),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync('public/data/world-50m.json', JSON.stringify(topo));
writeFileSync(
  'src/data/countries.json',
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), sources: ['natural-earth', 'world-countries', ...(wikidata ? ['wikidata'] : []), ...(worldbank ? ['world-bank'] : [])], countries: out }, null, 0),
);
// Per-country time series for charts, loaded on demand by the country page.
if (worldbank) {
  rmSync('public/data/series', { recursive: true, force: true });
  mkdirSync('public/data/series', { recursive: true });
  for (const [iso, series] of Object.entries(wb)) {
    const { surfaceArea, ...charted } = series; // area isn't charted over time
    writeFileSync(`public/data/series/${iso.toLowerCase()}.json`, JSON.stringify({ retrieved: worldbank.retrieved.slice(0, 10), indicators: worldbank.indicators, series: charted }));
  }
}

// City markers for country maps, loaded on demand (one small file for all countries).
if (citySource) {
  const cities = Object.fromEntries(Object.entries(citySource.countries).map(([iso, list]) => [iso, list.map((c) => ({ n: c.name, lat: c.lat, lon: c.lon, p: c.population, ...(c.capital ? { c: 1 } : {}) }))]));
  writeFileSync('public/data/cities.json', JSON.stringify(cities));
  console.log(`Wrote cities for ${Object.keys(cities).length} countries`);
}

console.log(`Wrote ${out.length} countries (${out.filter((c) => c.sovereign).length} sovereign), ${withShape.size} with map shapes`);
