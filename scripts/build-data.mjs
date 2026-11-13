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
 * Optional overlays (written by scripts/fetch-wikidata.mjs, merged when present):
 *   - data/sources/wikidata-countries.json   population etc. (CC0)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

let overlay = {};
const overlayPath = 'data/sources/wikidata-countries.json';
if (existsSync(overlayPath)) {
  overlay = JSON.parse(readFileSync(overlayPath, 'utf8')).countries ?? {};
  console.log(`Merging Wikidata overlay for ${Object.keys(overlay).length} countries`);
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
    area: c.area > 0 ? c.area : null,
    latlng: c.latlng,
    landlocked: c.landlocked,
    borders: c.borders,
    callingCode: c.idd?.root ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '') : null,
    tld: c.tld ?? [],
    demonym: c.demonyms?.eng?.m ?? null,
    hasShape: withShape.has(c.cca3),
    population: overlay[c.cca3]?.population ?? null,
    populationYear: overlay[c.cca3]?.populationYear ?? null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync('public/data/world-50m.json', JSON.stringify(topo));
writeFileSync(
  'src/data/countries.json',
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), sources: ['natural-earth', 'world-countries', ...(Object.keys(overlay).length ? ['wikidata'] : [])], countries: out }, null, 0),
);
console.log(`Wrote ${out.length} countries (${out.filter((c) => c.sovereign).length} sovereign), ${withShape.size} with map shapes`);
