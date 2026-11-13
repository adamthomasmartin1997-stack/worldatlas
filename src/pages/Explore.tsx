import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { WorldMap } from '../components/WorldMap';
import { CountrySearch } from '../components/CountrySearch';
import { PageHeader, SourceNote } from '../components/ui';
import { COUNTRIES, REGIONS, countryPath } from '../data/countries';

export function Explore() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const region = REGIONS.find((r) => r.toLowerCase() === params.get('region')) ?? null;
  const inRegion = useMemo(() => COUNTRIES.filter((c) => !region || c.region === region), [region]);
  const focus = useMemo(() => (region ? inRegion.filter((c) => c.sovereign).map((c) => c.cca3) : undefined), [region, inRegion]);
  const bySub = useMemo(() => {
    const m = new Map<string, typeof COUNTRIES>();
    for (const c of inRegion) m.set(c.subregion ?? c.region, [...(m.get(c.subregion ?? c.region) ?? []), c]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inRegion]);

  return (
    <>
      <div className="dark">
        <PageHeader eyebrow="Explore" title={region ?? 'The world'} dark>
          <p className="muted">Pick a region to zoom in, then select a country.</p>
        </PageHeader>
        <div className="container" style={{ paddingBottom: 'var(--space-8)' }}>
          <div className="segmented" role="group" aria-label="Region">
            <button className={!region ? 'on' : ''} aria-pressed={!region} onClick={() => setParams({})}>World</button>
            {REGIONS.map((r) => (
              <button key={r} className={region === r ? 'on' : ''} aria-pressed={region === r} onClick={() => setParams({ region: r.toLowerCase() })}>{r}</button>
            ))}
          </div>
          <WorldMap label={`Map of ${region ?? 'the world'}. Countries are also listed below.`} focus={focus} onSelect={(c) => navigate(`/countries/${c.toLowerCase()}`)} classFor={(c) => (region && !inRegion.some((x) => x.cca3 === c) ? 'dim' : undefined)} />
          <SourceNote sources={['natural-earth']}>Some disputed areas are shown without a profile.</SourceNote>
        </div>
      </div>
      <section className="section container" aria-labelledby="list-h">
        <div className="list-head">
          <h2 id="list-h">{inRegion.length} countries and territories</h2>
          <CountrySearch label="Search all countries" />
        </div>
        {bySub.map(([sub, list]) => (
          <div key={sub} className="sub-group">
            <h3>{sub}</h3>
            <ul className="country-list">
              {list.map((c) => <li key={c.cca3}><Link to={countryPath(c)}>{c.name}</Link>{!c.sovereign && <span className="muted"> · {c.status.toLowerCase()}</span>}</li>)}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
