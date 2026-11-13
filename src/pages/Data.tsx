import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Placeholder, SourceNote } from '../components/ui';
import { SOVEREIGN, countryPath, fmt } from '../data/countries';

export function Data() {
  const [n, setN] = useState(10);
  const largest = useMemo(() => [...SOVEREIGN].filter((c) => c.area).sort((a, b) => b.area!.value - a.area!.value).slice(0, n), [n]);
  const max = largest[0]?.area?.value ?? 1;

  return (
    <>
      <PageHeader eyebrow="Data" title="Data & comparisons">
        <p className="muted">Charts built only from sourced, openly licensed data. Every chart names its source.</p>
      </PageHeader>
      <section className="container section" style={{ paddingTop: 0 }} aria-labelledby="area-h">
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
                      <span className="bar" style={{ width: `${(c.area!.value / max) * 100}%` }} aria-hidden="true" />
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
      <section className="container grid grid-2" style={{ paddingBottom: 'var(--space-16)' }}>
        <Placeholder title="Population over time">
          <p>Line charts for any country, 1960 to today, from World Bank Open Data.</p>
        </Placeholder>
        <Placeholder title="Compare two countries">
          <p>Side-by-side key facts and charts, e.g. France vs Germany.</p>
        </Placeholder>
      </section>
    </>
  );
}
