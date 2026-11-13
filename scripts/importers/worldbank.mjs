/**
 * World Bank Open Data importer (CC BY 4.0 — attribution required, shown on every chart).
 *
 *   node scripts/importers/worldbank.mjs
 *
 * Saves yearly series for every country to data/sources/worldbank.json.
 * Regional aggregates (e.g. "Arab World") are dropped; only ISO 3166 countries are kept.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getJson } from './http.mjs';

const require = createRequire(import.meta.url);
const isoCodes = new Set(require('world-countries').map((c) => c.cca3));

export const INDICATORS = {
  'SP.POP.TOTL': { key: 'population', label: 'Population', unit: 'people' },
  'NY.GDP.MKTP.CD': { key: 'gdp', label: 'GDP', unit: 'current US$' },
  'NY.GDP.PCAP.CD': { key: 'gdpPerCapita', label: 'GDP per person', unit: 'current US$' },
  'SP.DYN.LE00.IN': { key: 'lifeExpectancy', label: 'Life expectancy at birth', unit: 'years' },
  'AG.SRF.TOTL.K2': { key: 'surfaceArea', label: 'Surface area', unit: 'km²' },
};

const series = {}; // ISO3 -> key -> [[year, value], ...]
for (const [code, meta] of Object.entries(INDICATORS)) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=1960:2030&source=2`;
  const [info, rows] = await getJson(url);
  if (info.pages > 1) throw new Error(`${code}: more than one page of results; raise per_page`);
  let kept = 0;
  for (const r of rows ?? []) {
    if (r.value == null || !isoCodes.has(r.countryiso3code)) continue;
    const c = (series[r.countryiso3code] ??= {});
    (c[meta.key] ??= []).push([Number(r.date), r.value]);
    kept++;
  }
  console.log(`${code} (${meta.label}): ${kept} values`);
}
for (const c of Object.values(series)) for (const s of Object.values(c)) s.sort((a, b) => a[0] - b[0]);

mkdirSync('data/sources', { recursive: true });
writeFileSync(
  'data/sources/worldbank.json',
  JSON.stringify({
    source: 'world-bank',
    licence: 'CC BY 4.0',
    url: 'https://data.worldbank.org/',
    retrieved: new Date().toISOString(),
    indicators: Object.fromEntries(Object.entries(INDICATORS).map(([code, m]) => [m.key, { code, label: m.label, unit: m.unit }])),
    series,
  }),
);
console.log(`Saved series for ${Object.keys(series).length} countries`);
