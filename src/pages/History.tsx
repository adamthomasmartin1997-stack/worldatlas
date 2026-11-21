import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHeader, Placeholder, SourceNote } from '../components/ui';
import { getCountry } from '../data/countries';
import { formatSpan } from '../data/events';
import { useEvents } from '../data/useEvents';
import { KIND_LABEL, eventPath } from './EventPage';

/** Starting points from different parts of the world and different kinds of history. */
const START = ['Q83224', 'Q184536', 'Q160077', 'Q28573', 'Q6534', 'Q362'];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function History() {
  const all = useEvents();
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const term = fold(q.trim());
    if (!all || term.length < 2) return [];
    return all.list.filter((e) => fold(e.t).includes(term)).sort((a, b) => Number(fold(b.t).startsWith(term)) - Number(fold(a.t).startsWith(term)) || b.n - a.n).slice(0, 12);
  }, [all, q]);
  const start = START.map((id) => all?.byId.get(id)).filter((e) => e != null);

  return (
    <>
      <PageHeader eyebrow="History" title="History">
        <p className="muted">Wars, empires, treaties and turning points from {all ? all.list.length.toLocaleString('en-GB') : 'thousands of'} events, each linked to the places and countries involved.</p>
      </PageHeader>

      <section className="container section" style={{ paddingTop: 0 }} aria-labelledby="find-h">
        <div className="card event-search">
          <h2 id="find-h">Find an event</h2>
          <div className="search">
            <label htmlFor="event-q" className="sr-only">Search historical events</label>
            <div className="search-input-wrap">
              <Search size={18} aria-hidden="true" />
              <input id="event-q" className="input" type="search" placeholder="Try Waterloo, Mali Empire or Cold War" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            </div>
          </div>
          {q.trim().length >= 2 && (
            <p className="muted" role="status">{!all ? 'Loading events…' : results.length ? `${results.length === 12 ? 'Top 12' : results.length} matches` : `No events match "${q.trim()}".`}</p>
          )}
          {results.length > 0 && (
            <ul className="history-list">
              {results.map((e) => (
                <li key={e.id} className="event-row">
                  <span className="event-row-main">
                    <Link to={eventPath(e)} className="event-row-title">{e.t}</Link>
                    <span className="event-row-meta">{formatSpan(e)} · {KIND_LABEL[e.k]}{getCountry(e.p) ? ` · ${getCountry(e.p)!.name}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {start.length > 0 && (
            <>
              <h3>Start here</h3>
              <ul className="chip-links">{start.map((e) => <li key={e.id}><Link to={eventPath(e)}>{e.t}</Link></li>)}</ul>
            </>
          )}
          <SourceNote sources={['wikidata']}>Notable wars, battles, treaties, empires, revolutions and more.</SourceNote>
        </div>
      </section>

      <section className="container section grid grid-2" style={{ paddingTop: 0 }}>
        <Placeholder title="Eras">
          <p>Step through history era by era, from the ancient world to today, with a map of who ruled where and a quiz for each.</p>
        </Placeholder>
        <Placeholder title="Meanwhile">
          <p>Pick a year and see what was happening all over the world at the same time.</p>
        </Placeholder>
      </section>
      <section className="container" style={{ paddingBottom: 'var(--space-16)' }}>
        <p>Also: <Link to="/countries/fra/quiz/history">French history quiz</Link>.</p>
      </section>
    </>
  );
}
