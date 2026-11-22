import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { WorldMap } from '../components/WorldMap';
import { PageHeader, SourceNote } from '../components/ui';
import { ERAS, SENSITIVE_KINDS, eraBySlug, eventsInEra, fmtRange, fmtYear, pickHeadlines, regionOf, statesDuring, type Era } from '../data/eras';
import { formatSpan, yearOf, type HistoryEvent } from '../data/events';
import { useEvents } from '../data/useEvents';
import { shuffle } from '../lib/answers';
import { EventRow, eventPath } from './EventPage';
import { NotFound } from './NotFound';

export const eraPath = (e: Pick<Era, 'slug'>) => `/history/eras/${e.slug}`;
const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'] as const;

/** All nine eras as a scrollable row of chips, the current one marked. */
export function EraNav({ current }: { current?: string }) {
  const list = useRef<HTMLOListElement>(null);
  // On narrow screens, slide the row (not the page) so the current era is in view.
  useEffect(() => {
    const ol = list.current, on = ol?.querySelector<HTMLElement>('[aria-current]');
    if (ol && on) ol.scrollLeft = on.offsetLeft - ol.offsetLeft - (ol.clientWidth - on.offsetWidth) / 2;
  }, [current]);
  return (
    <nav className="era-nav" aria-label="Eras">
      <ol ref={list}>
        {ERAS.map((e) => (
          <li key={e.slug}>
            <Link to={eraPath(e)} className={`chip${e.slug === current ? ' on' : ''}`} aria-current={e.slug === current ? 'page' : undefined}>
              {e.name.replace(/^The /, '')}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Five "which came first?" questions from the era's events: pairs at least a few years apart,
 * never using events about mass killing.
 */
function makeQuiz(events: HistoryEvent[], span: number): [HistoryEvent, HistoryEvent][] {
  const pool = shuffle(events.filter((e) => !SENSITIVE_KINDS.has(e.k) && e.n >= 15));
  const gap = Math.max(2, Math.round(span / 40));
  const pairs: [HistoryEvent, HistoryEvent][] = [];
  const used = new Set<string>();
  for (const a of pool) {
    if (pairs.length === 5) break;
    if (used.has(a.id)) continue;
    const b = pool.find((x) => !used.has(x.id) && x.id !== a.id && Math.abs(yearOf(x.s) - yearOf(a.s)) >= gap);
    if (!b) continue;
    used.add(a.id); used.add(b.id);
    pairs.push([a, b]);
  }
  return pairs;
}

function EraQuiz({ events, era }: { events: HistoryEvent[]; era: Era }) {
  const [round, setRound] = useState(0);
  const pairs = useMemo(() => makeQuiz(events, era.to - era.from), [events, era, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const i = answers.length;
  if (pairs.length < 3) return null;
  const done = i >= pairs.length;
  const score = answers.filter((a, k) => a === first(pairs[k])).length;
  const restart = () => { setAnswers([]); setRound((r) => r + 1); };

  return (
    <section className="card era-quiz" aria-labelledby="quiz-h">
      <h2 id="quiz-h">Which came first?</h2>
      {!done ? (
        <>
          <p className="muted">Question {i + 1} of {pairs.length}</p>
          <div className="era-quiz-options">
            {pairs[i].map((e) => (
              <button key={e.id} type="button" className="btn era-quiz-option" onClick={() => setAnswers([...answers, e.id])}>{e.t}</button>
            ))}
          </div>
        </>
      ) : (
        <p className="era-quiz-score" role="status"><strong>{score} out of {pairs.length}</strong>{score === pairs.length ? ' Perfect.' : score >= pairs.length - 1 ? ' Very close.' : ''}</p>
      )}
      {answers.length > 0 && (
        <ol className="era-quiz-results">
          {answers.map((a, k) => {
            const right = a === first(pairs[k]);
            const [x, y] = [...pairs[k]].sort((p, q) => yearOf(p.s) - yearOf(q.s));
            return (
              <li key={k} className={right ? 'is-right' : 'is-wrong'}>
                {right ? <Check size={18} aria-label="Right" /> : <X size={18} aria-label="Wrong" />}
                <span><Link to={eventPath(x)}>{x.t}</Link> ({formatSpan(x)}) came before <Link to={eventPath(y)}>{y.t}</Link> ({formatSpan(y)}).</span>
              </li>
            );
          })}
        </ol>
      )}
      {done && <p><button type="button" className="btn btn-primary" onClick={restart}><RotateCcw size={18} aria-hidden="true" /> Play again</button></p>}
    </section>
  );
}
const first = (pair: [HistoryEvent, HistoryEvent]) => (yearOf(pair[0].s) <= yearOf(pair[1].s) ? pair[0].id : pair[1].id);

export function EraPage() {
  const { slug } = useParams();
  const era = eraBySlug(slug);
  return era ? <EraView key={era.slug} era={era} /> : <NotFound />;
}

function EraView({ era }: { era: Era }) {
  const all = useEvents();
  const [region, setRegion] = useState<string>('All');
  const [more, setMore] = useState(15);
  const index = ERAS.indexOf(era);
  const prev = ERAS[index - 1], next = ERAS[index + 1];

  const data = useMemo(() => {
    if (!all) return null;
    const events = eventsInEra(all.list, era);
    const headlines = pickHeadlines(events, 8);
    const states = statesDuring(all.list, era.from, era.to, Math.min(10, (era.to - era.from) / 10)).slice(0, 12);
    return { events, headlines, states };
  }, [all, era]);

  const listed = useMemo(() => {
    if (!data) return [];
    const head = new Set(data.headlines.map((e) => e.id));
    return data.events.filter((e) => !head.has(e.id) && (region === 'All' || regionOf(e) === region)).sort((a, b) => b.n - a.n);
  }, [data, region]);

  let k = 0;
  const numbered = (data?.headlines ?? []).map((e) => ({ e, n: e.ll ? ++k : undefined }));

  return (
    <>
      <PageHeader eyebrow={`Era ${index + 1} of ${ERAS.length}`} crumbs={[{ to: '/history', label: 'History' }, { label: era.name }]} title={era.name}>
        <p className="event-when">{fmtRange(era.from, era.to)}</p>
        <p className="lead era-intro">{era.intro}</p>
      </PageHeader>
      <div className="container event-body">
        <EraNav current={era.slug} />
        {!data ? <p className="muted" role="status">Loading…</p> : (
          <>
            <div className="event-layout">
              <figure className="chart event-map">
                <figcaption className="chart-title">Headline events</figcaption>
                <WorldMap label={`World map of headline events in ${era.name}. The same events are listed beside the map.`} points={numbered.filter((x) => x.n).map((x) => ({ at: x.e.ll!, n: x.n }))} aspect={0.55} />
                <SourceNote sources={['wikidata', 'natural-earth']}>Chosen from the best-known events, taking each part of the world in turn.</SourceNote>
              </figure>
              <section className="card event-section" aria-labelledby="head-h">
                <h2 id="head-h">{data.headlines.length} events to know</h2>
                <ol className="history-list">{numbered.map(({ e, n }) => <EventRow key={e.id} e={e} n={n} />)}</ol>
              </section>
            </div>

            {data.states.length > 0 && (
              <section className="card event-section" aria-labelledby="rulers-h">
                <h2 id="rulers-h">Empires and states of the time</h2>
                <p className="muted">Some of the best-known states that existed during these years. Many lasted far longer than this era.</p>
                <ul className="chip-links">{data.states.map((s) => <li key={s.id}><Link to={eventPath(s)}>{s.t} <span className="chip-years">{fmtYear(yearOf(s.s))}–{fmtYear(yearOf(s.e!))}</span></Link></li>)}</ul>
              </section>
            )}

            <EraQuiz events={data.events} era={era} />

            <section className="card event-section" aria-labelledby="more-h">
              <h2 id="more-h">More from this era</h2>
              <div className="segmented" role="group" aria-label="Part of the world">
                {['All', ...REGIONS].map((r) => (
                  <button key={r} type="button" className={region === r ? 'on' : undefined} aria-pressed={region === r} onClick={() => { setRegion(r); setMore(15); }}>{r}</button>
                ))}
              </div>
              {listed.length ? (
                <>
                  <ul className="history-list">{listed.slice(0, more).map((e) => <EventRow key={e.id} e={e} />)}</ul>
                  {listed.length > more && <button type="button" className="btn" onClick={() => setMore(more + 30)}>Show more ({listed.length - more} left)</button>}
                </>
              ) : (
                <p className="muted">No other events recorded for {region === 'All' ? 'this era' : `${region} in this era`} yet.</p>
              )}
            </section>

            <nav className="era-steps" aria-label="Previous and next era">
              {prev ? <Link className="btn" to={eraPath(prev)}><ArrowLeft size={18} aria-hidden="true" /> {prev.name}</Link> : <span />}
              {era.slug !== 'ancient' && <Link className="btn" to={`/games/timeline?era=${era.slug}`}>Timeline game</Link>}
              <Link className="btn" to={`/history/meanwhile?year=${Math.round((era.from + Math.min(era.to, new Date().getFullYear())) / 2)}`}>Pick a year</Link>
              {next ? <Link className="btn btn-primary" to={eraPath(next)}>{next.name} <ArrowRight size={18} aria-hidden="true" /></Link> : <span />}
            </nav>
            <SourceNote sources={['wikidata']}>Events, dates and places. Era names, dates and introductions are ours; the dates are rounded and historians draw these lines in different places.</SourceNote>
          </>
        )}
      </div>
    </>
  );
}
