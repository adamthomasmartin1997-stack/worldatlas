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
import { dirname } from 'node:path';

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
const geo = load('data/sources/wikidata-geography.json')?.countries ?? {};
const gov = load('data/sources/wikidata-government.json')?.countries ?? {};
const fame = load('data/sources/wikidata-fame.json')?.countries ?? {};

/** Flags (flag-icons, MIT): copied per country, plus the colour families each flag uses, for similar-flag quiz options. */
const FLAG_DIR = dirname(require.resolve('flag-icons/package.json')) + '/flags/4x3';
function colourFamily(hex) {
  let h = hex.replace('#', '').toLowerCase();
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 0.12) return l > 0.75 ? 'white' : l < 0.25 ? 'black' : 'grey';
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 15 || hue >= 330) return 'red';
  if (hue < 40) return 'orange';
  if (hue < 70) return 'yellow';
  if (hue < 170) return 'green';
  if (hue < 260) return 'blue';
  return 'purple';
}
function flagColours(cca2) {
  const file = `${FLAG_DIR}/${cca2.toLowerCase()}.svg`;
  if (!existsSync(file)) return null;
  const svg = readFileSync(file, 'utf8');
  const counts = {};
  for (const m of svg.matchAll(/fill(?:=|:)\s*"?(#[0-9a-fA-F]{3,6})\b/g)) counts[colourFamily(m[1])] = (counts[colourFamily(m[1])] ?? 0) + 1;
  if (/<path(?![^>]*fill)[^>]*>/.test(svg) && !svg.includes('fill="none"')) counts.black = (counts.black ?? 0) + 1; // default fill is black
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k) => k !== 'grey').slice(0, 4);
}
const orgs = load('data/memberships.json').organisations;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Government facts: offices, anthem and motto from Wikidata; memberships from the curated list. */
function government(c) {
  const g = gov[c.cca3] ?? {};
  const memberships = Object.entries(orgs)
    // The UN list is world-countries' unMember flag; Vatican City and Palestine are observer states, not members.
    .filter(([, o]) => (o.members === 'un-members' ? c.unMember && !['VAT', 'PSE'].includes(c.cca3) : o.members.includes(c.cca3)))
    .map(([key]) => key);
  const out = {
    headOfState: cap(g.headOfStateOffice) ?? null,
    headOfGovernment: cap(g.headOfGovernmentOffice) ?? null,
    anthem: cap(g.anthem) ?? null,
    motto: g.motto ?? null,
    memberships,
  };
  return out.headOfState || memberships.length ? out : null;
}

/** What the economy is made of: the latest year that has all three sector shares (World Bank). */
function economyMix(iso) {
  const s = wb[iso];
  if (!s?.servicesShare || !s.industryShare || !s.agricultureShare) return null;
  const years = new Map(s.servicesShare.map(([y, v]) => [y, { services: v }]));
  for (const [y, v] of s.industryShare) if (years.has(y)) years.get(y).industry = v;
  for (const [y, v] of s.agricultureShare) if (years.has(y)) years.get(y).agriculture = v;
  const full = [...years].filter(([, v]) => v.industry != null && v.agriculture != null).sort((a, b) => b[0] - a[0])[0];
  if (!full) return null;
  const r1 = (x) => Math.round(x * 10) / 10;
  const exp = latest(s.exportsShare);
  return { year: full[0], services: r1(full[1].services), industry: r1(full[1].industry), agriculture: r1(full[1].agriculture), exports: exp ? { value: r1(exp[1]), year: exp[0] } : null, source: 'world-bank' };
}

/** Lowest point: a coastal country's lowest point can't be above sea level, so such elevations are dropped as source errors. */
function lowestPoint(c) {
  const lp = geo[c.cca3]?.lowestPoint;
  if (!lp) return null;
  const bad = !c.landlocked && lp.elevation != null && lp.elevation > 0;
  return { name: lp.name, elevation: bad ? null : lp.elevation };
}
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
    lowestPoint: lowestPoint(c),
    seas: geo[c.cca3]?.seas ?? [],
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
    government: government(c),
    economyMix: economyMix(c.cca3),
    flag: flagColours(c.cca2) ? { colours: flagColours(c.cca2) } : null,
    fame: fame[c.cca3] ?? null,
    hasSeries: Boolean(wb[c.cca3]),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync('public/data/world-50m.json', JSON.stringify(topo));
rmSync('public/data/flags', { recursive: true, force: true });
mkdirSync('public/data/flags', { recursive: true });
for (const c of out) if (c.flag) writeFileSync(`public/data/flags/${c.cca3.toLowerCase()}.svg`, readFileSync(`${FLAG_DIR}/${c.cca2.toLowerCase()}.svg`));
writeFileSync('src/data/organisations.json', JSON.stringify(Object.fromEntries(Object.entries(orgs).map(([k, o]) => [k, { name: o.name, text: o.text, url: o.url, the: Boolean(o.the) }])), null, 1));
writeFileSync(
  'src/data/countries.json',
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), sources: ['natural-earth', 'world-countries', ...(wikidata ? ['wikidata'] : []), ...(worldbank ? ['world-bank'] : []), 'member-lists'], countries: out }, null, 0),
);
// Per-country time series for charts, loaded on demand by the country page.
if (worldbank) {
  rmSync('public/data/series', { recursive: true, force: true });
  mkdirSync('public/data/series', { recursive: true });
  for (const [iso, series] of Object.entries(wb)) {
    // Area and the economy shares aren't charted over time.
    const { surfaceArea, agricultureShare, industryShare, servicesShare, exportsShare, ...charted } = series;
    writeFileSync(`public/data/series/${iso.toLowerCase()}.json`, JSON.stringify({ retrieved: worldbank.retrieved.slice(0, 10), indicators: worldbank.indicators, series: charted }));
  }
}

// City markers for country maps, loaded on demand (one small file for all countries).
// Three Wikidata sources are merged: capitals (always kept), type-based cities, and per-country settlements.
const settlementSource = load('data/sources/wikidata-settlements.json');
const additions = load('data/sources/wikidata-city-additions.json')?.countries ?? {};
const cityExclusions = load('data/city-corrections.json')?.exclude ?? {};
// Wikidata sometimes labels a city 'City of Valencia' or 'Seville city'.
const cleanName = (n) => n.replace(/^City of /, '').replace(/ city$/, '');
if (citySource || settlementSource) {
  const notCity = /metropol|métropole|greater |region|prefecture|county|province|district|municipality|agglomeration|randstad|urban area|conurbation|statistical/i;
  const near = (a, b) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)) < 0.12;
  const tidy = (list) => {
    const kept = [];
    for (const c of [...list].sort((a, b) => Number(b.capital) - Number(a.capital) || b.population - a.population)) {
      if (!c.capital && notCity.test(c.name)) continue;
      if (kept.some((k) => k.wikidata === c.wikidata || k.name === c.name || near(k, c))) continue;
      kept.push(c);
    }
    return kept.slice(0, 8);
  };
  const isos = new Set([...Object.keys(additions), ...Object.keys(citySource?.countries ?? {}), ...Object.keys(settlementSource?.settlements ?? {}), ...Object.keys(settlementSource?.capitals ?? {})]);
  const cities = {};
  for (const iso of isos) {
    const capital = settlementSource?.capitals?.[iso];
    const merged = [
      ...(capital ? [{ ...capital, capital: true }] : []),
      ...(citySource?.countries?.[iso] ?? []).map((c) => ({ ...c, capital: capital ? false : c.capital })),
      ...(additions[iso] ?? []),
      ...(settlementSource?.settlements?.[iso] ?? []),
    ].filter((c) => !(cityExclusions[iso] ?? []).includes(c.name)).map((c) => ({ ...c, name: cleanName(c.name) }));
    const list = tidy(merged);
    if (list.length) cities[iso] = list.map((c) => ({ n: c.name, lat: c.lat, lon: c.lon, p: c.population, ...(c.capital ? { c: 1 } : {}) }));
  }
  writeFileSync('public/data/cities.json', JSON.stringify(cities));
  console.log(`Wrote cities for ${Object.keys(cities).length} countries`);
}

// US states: outlines (us-atlas, US Census Bureau) + facts and cities (Wikidata). 50 states and DC.
const usStates = load('data/sources/wikidata-us-states.json')?.states;
if (usStates) {
  writeFileSync('public/data/us-states-10m.json', readFileSync(require.resolve('us-atlas/states-10m.json')));
  const near = (a, b, d) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)) < d;
  const states = {};
  for (const [fips, st] of Object.entries(usStates)) {
    if (Number(fips) > 56) continue; // territories (Puerto Rico, Guam, …) come later
    const cities = [];
    const stateExclusions = load('data/city-corrections.json')?.usStatesExclude?.[fips] ?? [];
    // Metro areas named after two cities use an en dash ('El Paso–Juárez'); real hyphenated cities use a hyphen.
    for (const c of [...st.cities].filter((x) => !x.name.includes('–') && !stateExclusions.includes(x.name)).sort((a, b) => b.population - a.population)) {
      if (cities.some((k) => k.n === c.name || near(k, c, 0.2))) continue; // duplicates, boroughs, neighbourhoods
      cities.push({ n: c.name, lat: c.lat, lon: c.lon, p: c.population });
    }
    states[fips] = {
      name: st.name, abbr: st.abbr, wikidata: st.wikidata, population: st.population, area: st.area,
      capital: st.capital ? { n: st.capital.name, lat: st.capital.lat, lon: st.capital.lon } : null,
      cities: cities.slice(0, 8),
    };
  }
  // The handful of cities shown on the national map.
  const HIGHLIGHTS = [['11', 'Washington, D.C.'], ['36', 'New York City'], ['06', 'Los Angeles'], ['17', 'Chicago'], ['12', 'Miami'], ['53', 'Seattle'], ['32', 'Las Vegas'], ['48', 'Houston']];
  const highlights = HIGHLIGHTS.map(([fips, name]) => {
    const c = states[fips]?.cities.find((x) => x.n === name) ?? (states[fips]?.capital?.n === name ? states[fips].capital : null);
    return c ? { n: name, lat: c.lat, lon: c.lon, ...(fips === '11' ? { c: 1 } : {}) } : null;
  }).filter(Boolean);
  writeFileSync('public/data/us-states.json', JSON.stringify({ retrieved: load('data/sources/wikidata-us-states.json').retrieved.slice(0, 10), states, highlights }));
  console.log(`Wrote ${Object.keys(states).length} US states; national-map cities: ${highlights.map((h) => h.n).join(', ')}`);
}

console.log(`Wrote ${out.length} countries (${out.filter((c) => c.sovereign).length} sovereign), ${withShape.size} with map shapes`);
