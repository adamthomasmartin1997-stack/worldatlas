import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StateMap } from '../components/StateMap';
import { UsMap } from '../components/UsMap';
import { useUsStates, statePath, type UsState } from '../components/usStates';
import { Breadcrumbs, SourceNote } from '../components/ui';
import { fmt } from '../data/countries';
import { fmtPeople } from '../lib/format';
import { NotFound } from './NotFound';

function summary(s: UsState, byFips: Map<string, UsState>) {
  const isDC = s.fips === '11';
  const parts = [isDC ? `${s.name} is the capital district of the United States, not part of any state.` : `${s.name} is one of the 50 states of the United States.`];
  const largest = s.cities[0];
  if (!isDC && s.capital) parts.push(`Its capital is ${s.capital.n}${largest && largest.n !== s.capital.n ? `, and its largest city is ${largest.n}` : ''}.`);
  const n = s.neighbours.map((f) => byFips.get(f)?.name).filter(Boolean) as string[];
  if (s.fips === '02') parts.push('It is separated from the rest of the country by Canada.');
  else if (s.fips === '15') parts.push('It is a chain of islands in the middle of the Pacific Ocean.');
  else if (n.length) parts.push(`It borders ${n.length === 1 ? n[0] : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`}.`);
  return parts.join(' ');
}

export function StateProfile() {
  const { code, state: slug } = useParams();
  const { data, error } = useUsStates();
  if (code?.toLowerCase() !== 'usa') return <NotFound />;
  if (error) return <div className="container section"><p role="alert">The state data couldn't be loaded. Refresh the page to try again.</p></div>;
  if (!data) return <div className="container section"><p className="muted">Loading…</p></div>;
  const s = data.states.find((x) => x.slug === slug);
  if (!s) return <NotFound />;
  const byFips = new Map(data.states.map((x) => [x.fips, x]));
  const neighbours = s.neighbours.map((f) => byFips.get(f)!).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <section className="container country-hero" aria-labelledby="state-h">
        <div className="country-hero-copy">
          <Breadcrumbs items={[{ to: '/countries', label: 'Countries' }, { to: '/countries/usa', label: 'United States' }, { label: s.name }]} />
          <span className="sticker sticker-green">{s.fips === '11' ? 'Federal district' : `US state · ${s.abbr}`}</span>
          <h1 id="state-h">{s.name}</h1>
          <p className="country-summary">{summary(s, byFips)}</p>
          <div className="chip-row">
            {s.population && <span className="chip chip-static">{fmtPeople(s.population)} people</span>}
            {s.area && <span className="chip chip-static">{fmt.format(s.area)} km²</span>}
            {s.capital && s.fips !== '11' && <span className="chip chip-static">Capital: {s.capital.n}</span>}
          </div>
        </div>
        <figure className="country-hero-map">
          <StateMap state={s} />
          <figcaption className="source-note">Outline: US Census Bureau, via us-atlas. Cities: Wikidata (CC0).</figcaption>
        </figure>
      </section>

      <section className="container section" aria-labelledby="facts-h">
        <h2 id="facts-h">{s.name} at a glance</h2>
        <div className="folder-panel tab-green state-facts">
          <dl className="fact-grid">
            {s.capital && <div><dt>{s.fips === '11' ? 'Seat of' : 'Capital'}</dt><dd>{s.fips === '11' ? 'The US government' : s.capital.n}</dd></div>}
            {s.population && <div><dt>Population</dt><dd>{fmtPeople(s.population)}</dd></div>}
            {s.area && <div><dt>Area</dt><dd>{fmt.format(s.area)} km²</dd></div>}
            {s.cities[0] && <div><dt>Largest city</dt><dd>{s.cities[0].n}</dd></div>}
            <div><dt>Postal code</dt><dd>{s.abbr}</dd></div>
          </dl>
          {s.cities.length > 1 && (
            <div>
              <h3 className="panel-h">Largest cities</h3>
              <ol className="city-list">{s.cities.slice(0, 6).map((c) => <li key={c.n}><span>{c.n}</span>{c.p ? <span className="fact-note">{fmtPeople(c.p)}</span> : null}</li>)}</ol>
            </div>
          )}
          <SourceNote sources={['wikidata']}>Most recent official figures recorded in Wikidata, retrieved {data.retrieved}.</SourceNote>
        </div>
      </section>

      {neighbours.length > 0 && (
        <section className="container section" aria-labelledby="nb-h">
          <h2 id="nb-h">Next door to {s.name}</h2>
          <div className="chip-row">{neighbours.map((n) => <Link key={n.fips} to={statePath(n)} className="chip">{n.name}</Link>)}</div>
        </section>
      )}

      <section className="container section" aria-labelledby="us-h">
        <h2 id="us-h">Where {s.name} is</h2>
        <UsMap highlight={s.fips} />
        <p><Link className="text-link" to="/countries/usa">Back to the United States <ArrowRight size={16} aria-hidden="true" /></Link></p>
      </section>
    </>
  );
}
