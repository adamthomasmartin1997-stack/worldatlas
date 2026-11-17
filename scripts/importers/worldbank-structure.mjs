/**
 * World Bank Open Data (CC BY 4.0): how each country's people are spread across ages, and its jobs across sectors.
 *
 *   node scripts/importers/worldbank-structure.mjs
 *
 * Latest value since 2018 for: population by five-year age group and sex (% of all males / all females),
 * and employment in farming, industry and services (% of all jobs, ILO modelled estimates).
 * Output: data/sources/worldbank-structure.json, saved after every indicator. Re-runs skip indicators already
 * fetched (set REFRESH=1 to fetch everything again) and keep earlier values for any the API fails on.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getJson } from './http.mjs';

const require = createRequire(import.meta.url);
const isoCodes = new Set([...require('world-countries').map((c) => c.cca3), 'WLD']);
const OUT = 'data/sources/worldbank-structure.json';

const AGES = ['0004', '0509', '1014', '1519', '2024', '2529', '3034', '3539', '4044', '4549', '5054', '5559', '6064', '6569', '7074', '7579', '80UP'];
const INDICATORS = {};
for (const a of AGES) for (const s of ['MA', 'FE']) INDICATORS[`SP.POP.${a}.${s}.5Y`] = `age:${s}:${a}`;
Object.assign(INDICATORS, { 'SL.AGR.EMPL.ZS': 'jobs:farming', 'SL.IND.EMPL.ZS': 'jobs:industry', 'SL.SRV.EMPL.ZS': 'jobs:services' });

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).values : {};
const values = { ...previous }; // key -> iso -> [year, value]
const save = () => writeFileSync(OUT, JSON.stringify({ source: 'world-bank', retrieved: new Date().toISOString().slice(0, 10), values }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The API is slow per request but accepts several indicators at once, so ask for them in batches.
const todo = Object.keys(INDICATORS).filter((code) => process.env.REFRESH || Object.keys(values[INDICATORS[code]] ?? {}).length <= 100);
for (let i = 0; i < todo.length; i += 10) {
  const batch = todo.slice(i, i + 10);
  try {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${batch.join(';')}?format=json&per_page=20000&date=2020:2025&source=2`;
    const [info, rows] = await getJson(url, { retries: 5, timeoutMs: 300_000 });
    if (info.pages > 1) throw new Error('more than one page of results');
    const latest = Object.fromEntries(batch.map((code) => [code, {}]));
    for (const r of rows ?? []) {
      if (r.value == null || !isoCodes.has(r.countryiso3code) || !latest[r.indicator.id]) continue;
      const y = Number(r.date), seen = latest[r.indicator.id][r.countryiso3code];
      if (!seen || seen[0] < y) latest[r.indicator.id][r.countryiso3code] = [y, Math.round(r.value * 100) / 100];
    }
    for (const code of batch) values[INDICATORS[code]] = latest[code];
    console.log(`${batch.length} indicators: ${batch.map((c) => Object.keys(latest[c]).length).join(', ')} countries`);
    save();
  } catch (e) {
    console.warn(`batch ${batch[0]}…: failed (${e.message.slice(-50)}); kept previous values`);
  }
  await sleep(300);
}
save();
