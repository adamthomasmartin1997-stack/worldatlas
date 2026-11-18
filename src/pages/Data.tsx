import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { MultiLineChart } from '../components/MultiLineChart';
import { PageHeader, SourceNote } from '../components/ui';
import { useSeries } from '../components/useSeries';
import { SOVEREIGN, countryPath, fmt, getCountry, type Country, type Fact } from '../data/countries';
import { fmtCompact, fmtPeople, fmtUsd, fmtUsdAxis, fmtYears, fmtYearsAxis } from '../lib/format';

type Measure = 'population' | 'lifeExpectancy' | 'gdpPerCapita';
const MEASURES: Record<Measure, { label: string; title: (a: string, b: string) => string; format: (v: number) => string; axis: (v: number) => string; zero: boolean; note: string }> = {
  population: { label: 'Population', title: (a, b) => `Population of ${a} and ${b}`, format: fmtPeople, axis: fmtCompact, zero: true, note: 'Total population, mid-year estimates.' },
  lifeExpectancy: { label: 'Life expectancy', title: (a, b) => `Life expectancy at birth in ${a} and ${b}`, format: fmtYears, axis: fmtYearsAxis, zero: false, note: 'Years a newborn baby can expect to live if conditions stay the same.' },
  gdpPerCapita: { label: 'Wealth per person', title: (a, b) => `GDP per person in ${a} and ${b} (US$)`, format: fmtUsd, axis: fmtUsdAxis, zero: true, note: 'GDP per person in current US dollars, not adjusted for inflation or living costs.' },
};

const PAIRS: [string, string][] = [['fra', 'deu'], ['ind', 'chn'], ['usa', 'can'], ['nga', 'bra'], ['jpn', 'kor'], ['gbr', 'irl']];
const CHOICES = SOVEREIGN.filter((c) => c.hasSeries).sort((a, b) => a.name.localeCompare(b.name));

const pct = (f: Fact | null | undefined) => (f ? `${Math.round(f.value)}%` : null);
const density = (c: Country) => (c.population && c.area ? c.population.value / c.area.value : null);

/** One comparison row: each side's value as text, plus the raw numbers when the row can be ranked. */
interface Row { label: string; a: ReactNode; b: ReactNode; va?: number | null; vb?: number | null; note?: string; whole?: boolean }

function compareRows(a: Country, b: Country): Row[] {
  const yr = (f: Fact | null | undefined) => (f?.year ? ` (${f.year})` : '');
  const num = (f: Fact | null | undefined, show: (v: number) => string) => (f ? <>{show(f.value)}<span className="muted">{yr(f)}</span></> : '—');
  const ind = (k: 'urban' | 'internet' | 'literacy' | 'forest' | 'co2') => [a.indicators?.[k], b.indicators?.[k]] as const;
  const rows: Row[] = [
    { label: 'Population', a: num(a.population, fmtPeople), b: num(b.population, fmtPeople), va: a.population?.value, vb: b.population?.value },
    { label: 'Area', a: num(a.area, (v) => `${fmt.format(v)} km²`), b: num(b.area, (v) => `${fmt.format(v)} km²`), va: a.area?.value, vb: b.area?.value },
    { label: 'People per km²', a: density(a) == null ? '—' : fmt.format(Math.round(density(a)!)), b: density(b) == null ? '—' : fmt.format(Math.round(density(b)!)), va: density(a), vb: density(b), note: 'population ÷ area' },
    { label: 'Life expectancy', a: num(a.lifeExpectancy, fmtYears), b: num(b.lifeExpectancy, fmtYears), va: a.lifeExpectancy?.value, vb: b.lifeExpectancy?.value },
    { label: 'GDP per person', a: num(a.gdpPerCapita, fmtUsd), b: num(b.gdpPerCapita, fmtUsd), va: a.gdpPerCapita?.value, vb: b.gdpPerCapita?.value },
    { label: 'Whole economy (GDP)', a: num(a.gdp, fmtUsd), b: num(b.gdp, fmtUsd), va: a.gdp?.value, vb: b.gdp?.value },
  ];
  const [ua, ub] = ind('urban');
  rows.push({ whole: true, label: 'Living in towns and cities', a: pct(ua) ?? '—', b: pct(ub) ?? '—', va: ua?.value, vb: ub?.value });
  const [ia, ib] = ind('internet');
  rows.push({ whole: true, label: 'Using the internet', a: pct(ia) ?? '—', b: pct(ib) ?? '—', va: ia?.value, vb: ib?.value });
  const [fa, fb] = ind('forest');
  rows.push({ whole: true, label: 'Land covered by forest', a: pct(fa) ?? '—', b: pct(fb) ?? '—', va: fa?.value, vb: fb?.value });
  const [ca, cb] = ind('co2');
  rows.push({ label: 'CO₂ per person', a: ca ? `${ca.value.toFixed(1)} t` : '—', b: cb ? `${cb.value.toFixed(1)} t` : '—', va: ca?.value, vb: cb?.value, note: 'tonnes a year' });
  rows.push({ label: 'Capital', a: a.capital.join(', ') || '—', b: b.capital.join(', ') || '—' });
  rows.push({ label: 'Main languages', a: a.languages.slice(0, 3).join(', ') || '—', b: b.languages.slice(0, 3).join(', ') || '—' });
  rows.push({ label: 'Land neighbours', a: a.landlocked ? `${a.borders.length} (landlocked)` : String(a.borders.length), b: b.landlocked ? `${b.borders.length} (landlocked)` : String(b.borders.length), va: a.borders.length, vb: b.borders.length });
  return rows;
}

/** How many times bigger the larger value is, phrased for the takeaway line. */
function times(big: number, small: number) {
  const r = big / small;
  return r >= 1.95 ? `${r >= 10 ? Math.round(r) : r.toFixed(1)} times` : `${Math.round((r - 1) * 100)}%`;
}

function Takeaways({ a, b }: { a: Country; b: Country }) {
  const lines: string[] = [];
  if (a.population && b.population) {
    const [big, small] = a.population.value >= b.population.value ? [a, b] : [b, a];
    lines.push(`${big.name} has ${times(big.population!.value, small.population!.value)} ${big.population!.value / small.population!.value >= 1.95 ? 'as many people as' : 'more people than'} ${small.name}.`);
  }
  if (a.area && b.area) {
    const [big, small] = a.area.value >= b.area.value ? [a, b] : [b, a];
    const r = big.area!.value / small.area!.value;
    lines.push(r >= 1.95 ? `${big.name} is ${times(big.area!.value, small.area!.value)} the size of ${small.name}.` : `${big.name} is ${times(big.area!.value, small.area!.value)} bigger than ${small.name}.`);
  }
  if (a.lifeExpectancy && b.lifeExpectancy) {
    const d = a.lifeExpectancy.value - b.lifeExpectancy.value;
    if (Math.abs(d) >= 1) lines.push(`A baby born in ${d > 0 ? a.name : b.name} can expect to live about ${Math.round(Math.abs(d))} years longer.`);
    else lines.push(`Life expectancy is almost the same in both.`);
  }
  if (!lines.length) return null;
  return <ul className="takeaways">{lines.map((l) => <li key={l}>{l}</li>)}</ul>;
}

export function Data() {
  const [n, setN] = useState(10);
  const largest = useMemo(() => [...SOVEREIGN].filter((c) => c.area).sort((x, y) => y.area!.value - x.area!.value).slice(0, n), [n]);
  const max = largest[0]?.area?.value ?? 1;

  const [params, setParams] = useSearchParams();
  const a = getCountry(params.get('a') ?? 'fra') ?? getCountry('fra')!;
  const b = getCountry(params.get('b') ?? 'deu') ?? getCountry('deu')!;
  const m = (params.get('m') as Measure) in MEASURES ? (params.get('m') as Measure) : 'population';
  const set = (next: Partial<{ a: string; b: string; m: Measure }>) => {
    const p = { a: a.cca3.toLowerCase(), b: b.cca3.toLowerCase(), m, ...next };
    setParams(p, { replace: true, preventScrollReset: true });
  };

  const sa = useSeries(a.cca3, true);
  const sb = useSeries(b.cca3, true);
  const meta = MEASURES[m];
  const series = [
    { key: a.cca3, label: a.name, data: sa.data?.series[m] ?? [] },
    ...(b.cca3 !== a.cca3 ? [{ key: b.cca3, label: b.name, data: sb.data?.series[m] ?? [] }] : []),
  ];
  const loading = (!sa.data && !sa.error) || (!sb.data && !sb.error);
  const missing = series.filter((s) => s.data.length < 2).map((s) => s.label);
  const rows = compareRows(a, b);

  const picker = (which: 'a' | 'b', value: Country) => (
    <label className="field">
      <span>{which === 'a' ? 'First country' : 'Second country'}</span>
      <select className="input" value={value.cca3.toLowerCase()} onChange={(e) => set({ [which]: e.target.value })}>
        {CHOICES.map((c) => <option key={c.cca3} value={c.cca3.toLowerCase()}>{c.name}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <PageHeader eyebrow="Data" title="Data & comparisons">
        <p className="muted">Pick any two countries and compare them: how they've changed since 1960 and how they measure up today. Every number comes from an open source named under the chart.</p>
      </PageHeader>

      <section className="container section" style={{ paddingTop: 0 }} aria-labelledby="cmp-h">
        <div className="card compare-tool">
          <h2 id="cmp-h">Compare two countries</h2>
          <div className="compare-pickers">
            {picker('a', a)}
            <button type="button" className="btn compare-swap" onClick={() => set({ a: b.cca3.toLowerCase(), b: a.cca3.toLowerCase() })} aria-label={`Swap ${a.name} and ${b.name}`}>
              <ArrowLeftRight size={18} aria-hidden="true" /> Swap
            </button>
            {picker('b', b)}
          </div>
          <div className="compare-pairs" role="group" aria-label="Try a pair">
            <span className="muted">Try:</span>
            {PAIRS.map(([x, y]) => {
              const cx = getCountry(x), cy = getCountry(y);
              if (!cx || !cy) return null;
              const on = a.cca3 === cx.cca3 && b.cca3 === cy.cca3;
              return <button key={x + y} type="button" className={`chip chip-btn${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set({ a: x, b: y })}>{cx.name} vs {cy.name}</button>;
            })}
          </div>

          <Takeaways a={a} b={b} />

          <div className="segmented" role="group" aria-label="Measure to chart">
            {(Object.keys(MEASURES) as Measure[]).map((k) => (
              <button key={k} type="button" className={k === m ? 'on' : undefined} aria-pressed={k === m} onClick={() => set({ m: k })}>{MEASURES[k].label}</button>
            ))}
          </div>
          {loading ? (
            <p className="muted" role="status">Loading the numbers…</p>
          ) : missing.length === series.length ? (
            <p className="muted" role="status">There's no {meta.label.toLowerCase()} series for {missing.join(' or ')}.</p>
          ) : (
            <>
              <MultiLineChart title={meta.title(a.name, b.name)} series={series} format={meta.format} axisFormat={meta.axis} zeroBaseline={meta.zero} />
              {missing.length > 0 && <p className="muted">No {meta.label.toLowerCase()} series is published for {missing.join(' or ')}.</p>}
            </>
          )}
          <SourceNote sources={['world-bank']}>{meta.note}</SourceNote>

          <h3 className="compare-sub">Side by side today</h3>
          <div className="table-scroll compare-table-wrap">
            <table className="data-table compare-table">
              <caption className="sr-only">{a.name} and {b.name} compared. The larger number in each row is marked.</caption>
              <thead><tr><th scope="col">Measure</th><th scope="col"><Link to={countryPath(a)}>{a.name}</Link></th><th scope="col"><Link to={countryPath(b)}>{b.name}</Link></th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  // Compare at the precision shown, so two cells that read the same are never marked as different.
                  const shown = (v: number | null | undefined) => (v == null ? null : r.whole ? Math.round(v) : Number(v.toPrecision(3)));
                  const va = shown(r.va), vb = shown(r.vb);
                  const ranked = va != null && vb != null && va !== vb && a.cca3 !== b.cca3;
                  const aWins = ranked && va! > vb!, bWins = ranked && vb! > va!;
                  return (
                    <tr key={r.label}>
                      <th scope="row">{r.label}{r.note && <span className="muted"> ({r.note})</span>}</th>
                      <td className={aWins ? 'is-more' : undefined}>{r.a}{aWins && <span className="sr-only"> (higher)</span>}</td>
                      <td className={bWins ? 'is-more' : undefined}>{r.b}{bWins && <span className="sr-only"> (higher)</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SourceNote sources={['world-bank', 'wikidata', 'world-countries']}>Latest year available for each country, shown in brackets. Higher isn't always better: the highlight just marks the bigger number.</SourceNote>
          <p className="compare-next">
            <Link className="btn btn-primary" to="/games/higher-lower">Play Higher or lower</Link>
            <Link className="btn" to={countryPath(a)}>Open {a.name}</Link>
            <Link className="btn" to={countryPath(b)}>Open {b.name}</Link>
          </p>
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0, paddingBottom: 'var(--space-16)' }} aria-labelledby="area-h">
        <div className="card">
          <div className="list-head">
            <h2 id="area-h">Largest countries by area</h2>
            <label className="field inline">
              <span>Show</span>
              <select className="input" value={n} onChange={(e) => setN(Number(e.target.value))}>
                {[10, 20, 30].map((v) => <option key={v} value={v}>Top {v}</option>)}
              </select>
            </label>
          </div>
          <div className="chart-scroll">
            <table className="bar-chart">
              <caption className="sr-only">Largest sovereign countries by total area in square kilometres</caption>
              <thead className="sr-only"><tr><th>Country</th><th>Area (km²)</th></tr></thead>
              <tbody>
                {largest.map((c) => (
                  <tr key={c.cca3}>
                    <th scope="row"><Link to={countryPath(c)}>{c.name}</Link></th>
                    <td>
                      <span className="bar" style={{ width: `${(c.area!.value / max) * 78}%` }} aria-hidden="true" />
                      <span className="bar-value">{fmt.format(c.area!.value)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SourceNote sources={['wikidata', 'world-countries']}>Total area in km², including inland water and overseas regions.</SourceNote>
        </div>
      </section>
    </>
  );
}
