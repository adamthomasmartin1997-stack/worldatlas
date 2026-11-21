import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WorldMap } from '../components/WorldMap';
import { PageHeader, SourceNote } from '../components/ui';
import { ERAS, NOW, SENSITIVE_KINDS, eraOfYear, fmtYear, happeningIn, pickHeadlines, posOf, regionOf, statesDuring, yearAt } from '../data/eras';
import { yearOf } from '../data/events';
import { useEvents } from '../data/useEvents';
import { EraNav, eraPath } from './EraPage';
import { EventRow, eventPath } from './EventPage';

const FAMOUS = [-44, 1066, 1453, 1492, 1789, 1914, 1969, 1989];
const GROUPS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'World'] as const;
const STEPS = 1000; // slider resolution per era

/** "1453", "44 BC", "-44", "44bc" → year; null if it can't be read or is out of range. */
export function readYear(text: string): number | null {
  const m = text.trim().match(/^(-?\d{1,4})\s*(bc|bce|ad|ce)?$/i);
  if (!m) return null;
  let y = Number(m[1]);
  if (m[2] && /^bc/i.test(m[2])) y = -Math.abs(y);
  if (y === 0 || y < ERAS[0].from || y > NOW) return null;
  return y;
}

export function Meanwhile() {
  const [params, setParams] = useSearchParams();
  const year = readYear(params.get('year') ?? '') ?? 1453;
  const [typed, setTyped] = useState(fmtYear(year));
  const [typedError, setTypedError] = useState('');
  const setYear = (y: number) => {
    const v = Math.max(ERAS[0].from, Math.min(NOW, y === 0 ? (y < year ? -1 : 1) : y));
    setParams({ year: String(v) }, { replace: true, preventScrollReset: true });
    setTyped(fmtYear(v));
    setTypedError('');
  };

  const all = useEvents();
  const data = useMemo(() => {
    if (!all) return null;
    const { events, within } = happeningIn(all.list.filter((e) => !SENSITIVE_KINDS.has(e.k)), year);
    const headlines = pickHeadlines(events, 10);
    const groups = new Map<string, typeof events>();
    for (const e of [...events].sort((a, b) => b.n - a.n)) {
      const r = regionOf(e) ?? 'World';
      (groups.get(r) ?? groups.set(r, []).get(r)!).push(e);
    }
    const states = statesDuring(all.list, year, year + 1, 1).slice(0, 14);
    return { events, within, headlines, groups, states };
  }, [all, year]);

  let k = 0;
  const numbered = (data?.headlines ?? []).map((e) => ({ e, n: e.ll ? ++k : undefined }));
  const era = eraOfYear(year);
  const pos = Math.round(posOf(year) * STEPS);

  return (
    <>
      <PageHeader crumbs={[{ to: '/history', label: 'History' }, { label: 'Meanwhile' }]} title="Meanwhile…">
        <p className="lead">Pick a year and see what was happening all over the world at the same time.</p>
      </PageHeader>
      <div className="container event-body">
        <section className="card year-picker" aria-label="Choose a year">
          <p className="year-now" aria-live="polite"><span className="year-big">{fmtYear(year)}</span> <Link to={eraPath(era)} className="tag tag-sun">{era.name}</Link></p>
          <label htmlFor="year-slider" className="sr-only">Year</label>
          <input
            id="year-slider" className="year-slider" type="range" min={0} max={ERAS.length * STEPS} step={1} value={pos}
            aria-valuetext={fmtYear(year)}
            onChange={(e) => setYear(yearAt(Number(e.target.value) / STEPS))}
          />
          <div className="year-scale" aria-hidden="true">
            {ERAS.map((e) => <span key={e.slug}>{fmtYear(e.from)}</span>)}
          </div>
          <div className="year-controls">
            <div className="year-steps" role="group" aria-label="Step through years">
              <button type="button" className="btn" onClick={() => setYear(year - 10)} aria-label="10 years earlier">−10</button>
              <button type="button" className="btn" onClick={() => setYear(year - 1)} aria-label="1 year earlier">−1</button>
              <button type="button" className="btn" onClick={() => setYear(year + 1)} aria-label="1 year later">+1</button>
              <button type="button" className="btn" onClick={() => setYear(year + 10)} aria-label="10 years later">+10</button>
            </div>
            <form className="year-type" onSubmit={(e) => { e.preventDefault(); const y = readYear(typed); if (y == null) setTypedError(`Type a year between ${fmtYear(ERAS[0].from)} and ${NOW}, like 1492 or 44 BC.`); else setYear(y); }}>
              <label htmlFor="year-text">Go to a year</label>
              <input id="year-text" className="input" inputMode="text" value={typed} onChange={(e) => { setTyped(e.target.value); setTypedError(''); }} aria-describedby="year-hint" aria-invalid={Boolean(typedError)} />
              <button type="submit" className="btn btn-primary">Go</button>
              <p id="year-hint" className={typedError ? 'field-error' : 'muted'}>{typedError || 'For BC, type 44 BC or -44.'}</p>
            </form>
          </div>
          <ul className="chip-row year-famous" aria-label="Famous years">
            {FAMOUS.map((y) => <li key={y}><button type="button" className={`chip chip-btn${y === year ? ' on' : ''}`} aria-pressed={y === year} onClick={() => setYear(y)}>{fmtYear(y)}</button></li>)}
          </ul>
        </section>

        {!data ? <p className="muted" role="status">Loading…</p> : !data.events.length ? (
          <p className="muted">No events are recorded near {fmtYear(year)} yet. Try a later year.</p>
        ) : (
          <>
            <p className="meanwhile-window" role="status">
              {data.within === 0 ? `${data.events.length} events under way in ${fmtYear(year)}.` : `Not much is recorded for exactly ${fmtYear(year)}, so here is what was happening within ${data.within} years of it.`}
            </p>
            <div className="event-layout">
              <figure className="chart event-map">
                <figcaption className="chart-title">Around the world in {fmtYear(year)}</figcaption>
                <WorldMap label={`World map of events around ${fmtYear(year)}. The same events are listed on this page.`} points={numbered.filter((x) => x.n).map((x) => ({ at: x.e.ll!, n: x.n }))} aspect={0.55} />
                <SourceNote sources={['wikidata', 'natural-earth']}>The best-known event in each part of the world first.</SourceNote>
              </figure>
              <section className="card event-section" aria-labelledby="pick-h">
                <h2 id="pick-h">Around the world</h2>
                <ol className="history-list">{numbered.map(({ e, n }) => <EventRow key={e.id} e={e} n={n} />)}</ol>
              </section>
            </div>

            {data.states.length > 0 && (
              <section className="card event-section" aria-labelledby="who-h">
                <h2 id="who-h">Who ruled in {fmtYear(year)}</h2>
                <p className="muted">Some of the best-known states and empires that existed that year.</p>
                <ul className="chip-links">{data.states.map((s) => <li key={s.id}><Link to={eventPath(s)}>{s.t}</Link></li>)}</ul>
              </section>
            )}

            <section className="card event-section" aria-labelledby="all-h">
              <h2 id="all-h">Everything recorded, by part of the world</h2>
              <div className="meanwhile-groups">
                {GROUPS.filter((g) => data.groups.get(g)?.length).map((g) => (
                  <div key={g} className="meanwhile-group">
                    <h3>{g === 'World' ? 'Across several regions' : g}</h3>
                    <ul className="history-list">{data.groups.get(g)!.slice(0, 8).map((e) => <EventRow key={e.id} e={e} />)}</ul>
                    {data.groups.get(g)!.length > 8 && <p className="muted">And {data.groups.get(g)!.length - 8} more.</p>}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        <EraNav current={era.slug} />
        <SourceNote sources={['wikidata']}>An event counts if it was under way that year. Treaties count in the year they were signed; events that lasted more than 60 years are left out here. Years before {fmtYear(yearOf('-0500'))} have few recorded events.</SourceNote>
      </div>
    </>
  );
}
