/**
 * Summarises the imported historical events for a person to review: data/reports/events.md
 *
 *   node scripts/report-events.mjs
 *
 * Shows how many events each kind and country has, the best-known events for a sample of countries,
 * and the gaps (countries with few events, events with no modern country or no place).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const { retrieved, events } = JSON.parse(readFileSync('public/data/events.json', 'utf8'));
const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf8')).countries.filter((c) => c.sovereign);
const name = new Map(countries.map((c) => [c.cca3, c.name]));
const year = (d) => { const y = Number(d.match(/^-?\d+/)[0]); return y < 0 ? `${-y} BC` : String(y); };

const byKind = {};
for (const e of events) byKind[e.k] = (byKind[e.k] ?? 0) + 1;
const byCountry = new Map(countries.map((c) => [c.cca3, []]));
for (const e of events) for (const iso of e.c ?? []) byCountry.get(iso)?.push(e);
const counts = [...byCountry.entries()].map(([iso, list]) => [iso, list.length]).sort((a, b) => b[1] - a[1]);
const few = counts.filter(([, n]) => n < 5);
const SAMPLE = ['FRA', 'GBR', 'USA', 'CHN', 'IND', 'NGA', 'BRA', 'EGY', 'JPN', 'MEX', 'KEN', 'AUS'];
const line = (e) => `- ${year(e.s)}${e.e ? `–${year(e.e)}` : ''} · **${e.t}** (${e.k})${e.d ? ` — ${e.d}` : ''}`;

const report = `# Historical events: import report

Retrieved from Wikidata (CC0) on ${retrieved}. ${events.length} dated events.

## By kind

${Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${k}: ${n}`).join('\n')}

## Coverage

- Linked to at least one modern country: ${events.filter((e) => e.c?.length).length}
- With a place on the map: ${events.filter((e) => e.ll).length}
- Part of a larger event (for example a battle within a war): ${events.filter((e) => e.of?.length).length}
- With causes or effects: ${events.filter((e) => e.ca?.length || e.ef?.length).length}
- Before 1500: ${events.filter((e) => Number(e.s.match(/^-?\d+/)[0]) < 1500).length}

Most events: ${counts.slice(0, 15).map(([iso, n]) => `${name.get(iso)} ${n}`).join(', ')}.

Countries with fewer than 5 events (${few.length}): ${few.map(([iso, n]) => `${name.get(iso)} (${n})`).join(', ')}.

## Best-known events, sample countries

${SAMPLE.map((iso) => `### ${name.get(iso)} (${byCountry.get(iso).length})\n\n${[...byCountry.get(iso)].sort((a, b) => b.n - a.n).slice(0, 12).sort((a, b) => Number(a.s.match(/^-?\d+/)[0]) - Number(b.s.match(/^-?\d+/)[0])).map(line).join('\n')}`).join('\n\n')}

## No modern country (${events.filter((e) => !e.c?.length).length}), best known first

${events.filter((e) => !e.c?.length).sort((a, b) => b.n - a.n).slice(0, 40).map(line).join('\n')}
`;
mkdirSync('data/reports', { recursive: true });
writeFileSync('data/reports/events.md', report);
console.log(`events report: ${events.length} events, ${few.length} countries with fewer than 5 → data/reports/events.md`);
