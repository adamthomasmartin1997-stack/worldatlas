/**
 * World Bank Open Data importer (CC BY 4.0 — attribution required, shown on every chart).
 *
 *   node scripts/importers/worldbank.mjs
 *
 * Saves yearly series for every country to data/sources/worldbank.json.
 * Regional aggregates (e.g. "Arab World") are dropped; only ISO 3166 countries are kept.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getJson } from './http.mjs';

const require = createRequire(import.meta.url);
// Countries, plus the world as a whole (WLD) for comparisons.
const isoCodes = new Set([...require('world-countries').map((c) => c.cca3), 'WLD']);

export const INDICATORS = {
  'SP.POP.TOTL': { key: 'population', label: 'Population', unit: 'people' },
  'NY.GDP.MKTP.CD': { key: 'gdp', label: 'GDP', unit: 'current US$' },
  'NY.GDP.PCAP.CD': { key: 'gdpPerCapita', label: 'GDP per person', unit: 'current US$' },
  'SP.DYN.LE00.IN': { key: 'lifeExpectancy', label: 'Life expectancy at birth', unit: 'years' },
  'NV.AGR.TOTL.ZS': { key: 'agricultureShare', label: 'Farming, forestry and fishing', unit: '% of GDP', since: 2010 },
  'NV.IND.TOTL.ZS': { key: 'industryShare', label: 'Industry (including construction)', unit: '% of GDP', since: 2010 },
  'NV.SRV.TOTL.ZS': { key: 'servicesShare', label: 'Services', unit: '% of GDP', since: 2010 },
  'NE.EXP.GNFS.ZS': { key: 'exportsShare', label: 'Exports of goods and services', unit: '% of GDP', since: 2010 },
  'SE.ADT.LITR.ZS': { key: 'literacy', label: 'Adult literacy rate', unit: '% of people aged 15+', since: 2000 },
  'IT.NET.USER.ZS': { key: 'internet', label: 'People using the internet', unit: '% of population', since: 2000 },
  'SP.URB.TOTL.IN.ZS': { key: 'urban', label: 'People living in towns and cities', unit: '% of population', since: 2000 },
  'EN.GHG.CO2.PC.CE.AR5': { key: 'co2', label: 'CO₂ emissions per person', unit: 'tonnes per person', since: 2000 },
  'AG.LND.FRST.ZS': { key: 'forest', label: 'Forest cover', unit: '% of land area', since: 2000 },
  'AG.SRF.TOTL.K2': { key: 'surfaceArea', label: 'Surface area', unit: 'km²' },
};

const series = {}; // ISO3 -> key -> [[year, value], ...]
// If the API fails for one indicator, keep that indicator's values from the previous run rather than losing it.
const previous = existsSync('data/sources/worldbank.json') ? JSON.parse(readFileSync('data/sources/worldbank.json', 'utf8')).series : {};
// ONLY=key1,key2 refreshes just those indicators and keeps the rest from the previous run.
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
for (const [code, meta] of Object.entries(INDICATORS)) {
  if (only && !only.has(meta.key)) {
    for (const [iso, s] of Object.entries(previous)) if (s[meta.key]) (series[iso] ??= {})[meta.key] = s[meta.key];
    continue;
  }
  // Indicators only shown as "latest value" are fetched from a recent year to keep the response small.
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=${meta.since ?? 1960}:2030&source=2`;
  let info, rows;
  try {
    [info, rows] = await getJson(url, { timeoutMs: 600_000 });
  } catch (e) {
    let kept = 0;
    for (const [iso, s] of Object.entries(previous)) if (s[meta.key]) { (series[iso] ??= {})[meta.key] = s[meta.key]; kept++; }
    console.warn(`${code} (${meta.label}): API failed (${e.message.slice(-60)}); kept previous values for ${kept} countries`);
    continue;
  }
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
