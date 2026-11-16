import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, SourceNote } from '../components/ui';
import { COUNTRIES, REGIONS, countryPath, fmt } from '../data/countries';
import { normalize } from '../lib/answers';
import { flagUrl } from '../lib/difficulty';

export function Countries() {
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [all, setAll] = useState(false);

  const list = useMemo(() => {
    const n = normalize(q);
    return COUNTRIES.filter((c) => (all || c.sovereign) && (!region || c.region === region) && (!n || normalize(c.name).includes(n) || c.capital.some((x) => normalize(x).includes(n))));
  }, [q, region, all]);

  return (
    <>
      <PageHeader eyebrow="Countries" title="Every country in the world">
        <p className="muted">{COUNTRIES.filter((c) => c.sovereign).length} sovereign states — the 193 UN members plus the Holy See and Palestine — and {COUNTRIES.filter((c) => !c.sovereign).length} territories.</p>
      </PageHeader>
      <section className="container" style={{ paddingBottom: 'var(--space-16)' }}>
        <div className="filters">
          <label className="field">
            <span>Filter</span>
            <input className="input" type="search" placeholder="Country or capital" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="field">
            <span>Region</span>
            <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">All regions</option>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Include territories and partially recognised states
          </label>
        </div>
        <p className="muted" aria-live="polite">{list.length} shown</p>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th scope="col">Country</th><th scope="col">Capital</th><th scope="col">Region</th><th scope="col" className="num">Area (km²)</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.cca3}>
                  <th scope="row"><Link to={countryPath(c)} className="country-cell">{c.flag && <img className="flag" src={flagUrl(c)} alt="" width={32} height={24} loading="lazy" />}{c.name}</Link></th>
                  <td>{c.capital.join(', ') || '—'}</td>
                  <td>{c.subregion ?? c.region}</td>
                  <td className="num">{c.area ? fmt.format(c.area.value) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceNote sources={['world-countries', 'wikidata']}>Area is total area, including overseas regions.</SourceNote>
      </section>
    </>
  );
}
