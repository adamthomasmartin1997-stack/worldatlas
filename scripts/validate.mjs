/**
 * Cross-checks the sources against each other and writes data/reports/validation.md.
 *
 *   node scripts/validate.mjs
 *
 * It never changes data. Disagreements are for a person to look at: often both values are
 * right but measure different things (mainland vs total area, census year vs estimate).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const base = require('world-countries');
const load = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const wd = load('data/sources/wikidata.json')?.countries ?? {};
const wb = load('data/sources/worldbank.json')?.series ?? {};

const TOLERANCE = 0.05; // flag differences above 5%
const latest = (s) => (s?.length ? s[s.length - 1] : null);
const pct = (a, b) => Math.abs(a - b) / Math.max(a, b);
const fmt = (n) => Math.round(n).toLocaleString('en-GB');

const issues = { area: [], population: [], stale: [], missing: [] };
const sovereign = base.filter((c) => c.unMember || ['VAT', 'PSE'].includes(c.cca3));

for (const c of sovereign) {
  const iso = c.cca3;
  // Area: three sources.
  const areas = [
    ['mledoze/countries', c.area > 0 ? c.area : null],
    ['Wikidata', wd[iso]?.area?.value ?? null],
    ['World Bank', latest(wb[iso]?.surfaceArea)?.[1] ?? null],
  ].filter(([, v]) => v);
  const vals = areas.map(([, v]) => v);
  if (vals.length > 1 && pct(Math.max(...vals), Math.min(...vals)) > TOLERANCE) {
    issues.area.push(`| ${c.name.common} | ${areas.map(([s, v]) => `${s}: ${fmt(v)}`).join('<br>')} | ${Math.round(pct(Math.max(...vals), Math.min(...vals)) * 100)}% |`);
  }
  // Population: compare Wikidata's figure with the World Bank's figure for the SAME year,
  // so a 2021 census isn't measured against a 2025 estimate.
  const p1 = latest(wb[iso]?.population);
  const p2 = wd[iso]?.population;
  const sameYear = p2?.year ? wb[iso]?.population?.find(([y]) => y === p2.year) : null;
  if (sameYear && p2?.value && pct(sameYear[1], p2.value) > TOLERANCE) {
    issues.population.push(`| ${c.name.common} | World Bank ${sameYear[0]}: ${fmt(sameYear[1])}<br>Wikidata ${p2.year}: ${fmt(p2.value)} | ${Math.round(pct(sameYear[1], p2.value) * 100)}% |`);
  }
  if (!p1 && !p2?.value) issues.missing.push(`${c.name.common}: no population from any source`);
  if (p1 && p1[0] < new Date().getFullYear() - 4) issues.stale.push(`${c.name.common}: latest World Bank population is from ${p1[0]}`);
}

const report = `# Data validation report

Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/validate.mjs\`. Covers the ${sovereign.length} sovereign states.
Differences above ${TOLERANCE * 100}% are listed. They are not necessarily errors: sources often measure different things
(e.g. mainland vs total area including overseas regions). Decide which definition the site uses and note it on the page.

## Area (${issues.area.length})

| Country | Values (km²) | Difference |
|---|---|---|
${issues.area.join('\n') || '| — | none | |'}

## Population (${issues.population.length})

| Country | Values | Difference |
|---|---|---|
${issues.population.join('\n') || '| — | none | |'}

## Out of date (${issues.stale.length})

${issues.stale.map((s) => `- ${s}`).join('\n') || 'None.'}

## Missing (${issues.missing.length})

${issues.missing.map((s) => `- ${s}`).join('\n') || 'None.'}
`;
mkdirSync('data/reports', { recursive: true });
writeFileSync('data/reports/validation.md', report);
console.log(`Validation: ${issues.area.length} area, ${issues.population.length} population, ${issues.stale.length} stale, ${issues.missing.length} missing → data/reports/validation.md`);
