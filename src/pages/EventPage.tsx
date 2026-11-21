import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Info } from 'lucide-react';
import { WorldMap } from '../components/WorldMap';
import { PageHeader, SourceNote } from '../components/ui';
import { countryPath, getCountry } from '../data/countries';
import { formatSpan, yearOf, type EventKind, type HistoryEvent } from '../data/events';
import { useEvents, type Events } from '../data/useEvents';
import { THEME } from '../data/eras';

export const KIND_LABEL: Record<EventKind, string> = {
  genocide: 'Genocide', massacre: 'Massacre', assassination: 'Assassination', coup: 'Coup', siege: 'Siege', battle: 'Battle',
  revolution: 'Revolution', rebellion: 'Uprising', 'civil war': 'Civil war', war: 'War', treaty: 'Treaty', state: 'Empire or state',
  epidemic: 'Epidemic', earthquake: 'Earthquake', expedition: 'Expedition',
  invention: 'Invention or discovery', spaceflight: 'Space', sport: 'Sport', eruption: 'Volcanic eruption', exhibition: "World's fair",
};
/** What the "where" fact means for each kind of event. */
const WHERE_LABEL: Partial<Record<EventKind, string>> = { invention: 'Comes from', spaceflight: 'Country', sport: 'Host country', exhibition: 'Host country' };
/** Events about mass killing: shown with a short note, and never used in games or random picks. */
export const SENSITIVE = new Set<EventKind>(['genocide', 'massacre']);

interface Summary { text: string[]; why: string; asOf?: string }
let summaries: Promise<Record<string, Summary>> | null = null;
/** Our own summary of an event, if it has one (src/content/event-summaries.json, loaded on first use). */
function useSummary(id: string): Summary | null {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => {
    let live = true;
    summaries ??= import('../content/event-summaries.json').then((m) => m.default.events as Record<string, Summary>);
    summaries.then((all) => live && setS(all[id] ?? null)).catch(() => undefined);
    return () => { live = false; };
  }, [id]);
  return s;
}
const monthYear = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const eventPath = (e: Pick<HistoryEvent, 'id'>) => `/history/events/${e.id}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const regionOf = (e: HistoryEvent) => getCountry(e.p ?? e.c?.[0])?.region;

/** "6 years", "about 4 months", "3 days"; null when the dates are too vague to say. */
function duration(e: HistoryEvent): string | null {
  if (!e.e) return null;
  const years = yearOf(e.e) - yearOf(e.s);
  if (years >= 2) return `${years} years`;
  const exact = (p?: string) => p === 'day' || p === 'month';
  if (!exact(e.sp) || !exact(e.ep) || yearOf(e.s) < 1) return years === 1 ? 'About a year' : null;
  const pad = (d: string) => (d.length === 7 ? `${d}-01` : d);
  const days = Math.round((Date.parse(pad(e.e)) - Date.parse(pad(e.s))) / 86_400_000) + 1;
  if (!Number.isFinite(days) || days <= 0) return null;
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.round(days / 30.4);
  return months >= 12 ? `About ${Math.round(months / 12)} year${months >= 18 ? 's' : ''}` : `About ${months} months`;
}

/**
 * Up to four well-known events from other parts of the world at the same time. For long-lived
 * events (empires, long wars) "the same time" means around when it began.
 */
function meanwhile(ev: HistoryEvent, all: Events): { around: string; items: HistoryEvent[] } {
  const a = yearOf(ev.s), b = ev.e ? yearOf(ev.e) : a;
  const long = b - a > 30;
  const lo = a - (long ? 10 : 3), hi = (long ? a : b) + (long ? 10 : 3);
  const related = new Set([ev.id, ...(ev.of ?? []), ...(ev.sub ?? []), ...(ev.ca ?? []), ...(ev.ef ?? []), ...(ev.pr ?? []), ...(ev.nx ?? [])]);
  const mine = new Set(ev.c ?? []);
  const home = regionOf(ev);
  const best = new Map<string, HistoryEvent>();
  for (const x of all.list) {
    if (related.has(x.id) || SENSITIVE.has(x.k) || x.k === 'epidemic' || x.k === 'state' || (x.c?.length ?? 0) > 6) continue;
    const xa = yearOf(x.s), xb = x.e ? yearOf(x.e) : xa;
    if (xa > hi || xb < lo || xb - xa > 30) continue;
    if (x.c?.some((c) => mine.has(c))) continue;
    const region = regionOf(x);
    if (!region || region === home) continue;
    if (THEME[x.k] && THEME[x.k] === THEME[ev.k]) continue; // a World Cup page shouldn't list three Olympics
    if (!best.has(region) || best.get(region)!.n < x.n) best.set(region, x);
  }
  // At most one sport, space mission, disaster… in the four picked.
  const seen = new Set<string>();
  const items = [...best.values()].sort((x, y) => y.n - x.n).filter((x) => !THEME[x.k] || (!seen.has(THEME[x.k]!) && Boolean(seen.add(THEME[x.k]!))));
  const fmt = (y: number) => (y < 0 ? `${-y} BC` : String(y));
  return { around: long ? `around ${fmt(a)}` : a === b ? `around ${fmt(a)}` : `${fmt(a)}–${fmt(b)}`, items: items.slice(0, 4) };
}

export function EventRow({ e, n }: { e: HistoryEvent; n?: number }) {
  return (
    <li className="event-row">
      {n != null && <span className="pin-badge" aria-hidden="true">{n}</span>}
      <span className="event-row-main">
        <Link to={eventPath(e)} className="event-row-title">{e.t}</Link>
        <span className="event-row-meta">{formatSpan(e)} · {KIND_LABEL[e.k]}{e.p && getCountry(e.p) ? ` · ${getCountry(e.p)!.name}` : ''}</span>
      </span>
    </li>
  );
}

function LinkGroup({ title, ids, all }: { title: string; ids?: string[]; all: Events }) {
  const list = (ids ?? []).map((id) => all.byId.get(id)).filter((x): x is HistoryEvent => Boolean(x)).sort((a, b) => yearOf(a.s) - yearOf(b.s));
  if (!list.length) return null;
  return (
    <div className="event-links-group">
      <h3>{title}</h3>
      <ul className="history-list">{list.map((e) => <EventRow key={e.id} e={e} />)}</ul>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="card event-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/** Keyed by id, so moving from one event to another starts fresh (collapsed lists, scroll). */
export function EventPage() {
  const { id = '' } = useParams();
  return <EventView key={id} id={id} />;
}

function EventView({ id }: { id: string }) {
  const all = useEvents();
  const ev = all?.byId.get(id.toUpperCase());
  const subs = useMemo(() => (ev?.sub ?? []).map((s) => all!.byId.get(s)).filter((x): x is HistoryEvent => Boolean(x)).sort((a, b) => yearOf(a.s) - yearOf(b.s) || a.s.localeCompare(b.s)), [ev, all]);
  const near = useMemo(() => (ev && all ? meanwhile(ev, all) : null), [ev, all]);
  const [allSubs, setAllSubs] = useState(false);
  const summary = useSummary(id.toUpperCase());

  if (!all) return <div className="container section"><p className="muted" role="status">Loading…</p></div>;
  if (!ev) {
    return (
      <>
        <PageHeader crumbs={[{ to: '/history', label: 'History' }, { label: 'Event not found' }]} title="Event not found">
          <p className="muted">There's no event with that link. Try searching on the <Link to="/history">History</Link> page.</p>
        </PageHeader>
      </>
    );
  }

  const place = getCountry(ev.p);
  const countries = (ev.c ?? []).map((c) => getCountry(c)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const parents = (ev.of ?? []).map((p) => all.byId.get(p)).filter((x): x is HistoryEvent => Boolean(x));
  // Number the sub-events that have a place, so the map and the list match.
  let k = 0;
  const numbered = subs.map((s) => ({ e: s, n: s.ll ? ++k : undefined }));
  const points = numbered.slice(0, 60).filter((s) => s.n && s.e.ll).map((s) => ({ at: s.e.ll!, n: s.n }));
  const mapPoints = points.length ? points : ev.ll ? [{ at: ev.ll }] : [];
  const focus = countries.length && countries.length <= 25 ? countries.map((c) => c.cca3) : place ? [place.cca3] : undefined;
  const inFocus = new Set(countries.map((c) => c.cca3));
  const long = duration(ev);
  const sensitive = SENSITIVE.has(ev.k);

  return (
    <>
      <PageHeader crumbs={[{ to: '/history', label: 'History' }, ...(parents[0] ? [{ to: eventPath(parents[0]), label: parents[0].t }] : []), { label: ev.t }]} title={ev.t}>
        <p className="event-kicker"><span className="tag tag-sun">{KIND_LABEL[ev.k]}</span> <span className="event-when">{formatSpan(ev)}</span></p>
        {ev.d && !summary && <p className="lead">{cap(ev.d)}.</p>}
      </PageHeader>

      <div className="container event-body">
        {sensitive && (
          <p className="event-note" role="note"><Info size={18} aria-hidden="true" /> This page is about the deliberate killing of many people. It's here because remembering what happened, and why, matters.</p>
        )}

        {summary && (
          <section className="card event-summary" aria-labelledby="what-h">
            <h2 id="what-h">What happened</h2>
            {summary.text.map((p) => <p key={p.slice(0, 30)}>{p}</p>)}
            <aside className="deep-highlight"><h3>Why it matters</h3><p>{summary.why}</p></aside>
            <p className="source-note">Written by Worldwise from widely published facts. Draft: not yet checked against sources.{summary.asOf && ` Still unfolding: last checked ${monthYear(summary.asOf)}.`}</p>
          </section>
        )}

        <dl className="facts event-facts">
          <div><dt>When</dt><dd>{formatSpan(ev)}</dd></div>
          {long && <div><dt>How long</dt><dd>{long}</dd></div>}
          <div><dt>{WHERE_LABEL[ev.k] ?? 'Where it happened'}</dt><dd>{place ? <Link to={countryPath(place)}>{place.name}</Link> : countries.length === 1 ? <Link to={countryPath(countries[0])}>{countries[0].name}</Link> : countries.length ? 'Several countries' : 'Not recorded'}</dd></div>
          {parents[0] ? <div><dt>Part of</dt><dd><Link to={eventPath(parents[0])}>{parents[0].t}</Link></dd></div> : <div><dt>Type</dt><dd>{KIND_LABEL[ev.k]}</dd></div>}
        </dl>

        <div className="event-layout">
          <figure className="chart event-map">
            <figcaption className="chart-title">{points.length ? (points.length > 1 ? 'Where the events within it happened' : 'Where the event within it happened') : 'Where it happened'}</figcaption>
            <WorldMap
              label={`Map of ${ev.t}. ${countries.length ? `Countries involved, by today's borders: ${countries.map((c) => c.name).join(', ')}.` : ''} The same information is listed on this page.`}
              focus={focus}
              points={mapPoints}
              classFor={(code) => (code && code === place?.cca3 ? 'active' : code && inFocus.has(code) ? 'found' : 'dim')}
              aspect={0.6}
            />
            {countries.length > 0 && (
              <p className="map-key">
                {place && <><span className="legend-swatch swatch-active" aria-hidden="true" /> Where it happened </>}
                {countries.some((c) => c.cca3 !== place?.cca3) && <><span className="legend-swatch swatch-found" aria-hidden="true" /> {place ? 'Also involved' : 'Countries involved'}</>}
              </p>
            )}
            <SourceNote sources={['wikidata', 'natural-earth']}>Places and countries involved, shown by today's borders.</SourceNote>
          </figure>

          <div className="event-side">
            {(countries.length > 0 || ev.h?.length) && (
              <Section id="who" title="Who was involved">
                {ev.h?.length ? (
                  <>
                    <h3>At the time</h3>
                    <ul className="chip-row">{ev.h.map((h) => <li key={h}><span className="chip chip-static">{cap(h)}</span></li>)}</ul>
                  </>
                ) : null}
                {countries.length > 0 && (
                  <>
                    <h3>Countries linked to it today</h3>
                    <ul className="chip-links">{countries.map((c) => <li key={c.cca3}><Link to={countryPath(c)}>{c.name}</Link></li>)}</ul>
                  </>
                )}
              </Section>
            )}
            {(ev.ca || ev.ef || ev.pr || ev.nx || parents.length > 0) && (
              <Section id="links" title="Before and after">
                <div className="event-links">
                  <LinkGroup title="Part of" ids={ev.of} all={all} />
                  <LinkGroup title="What caused it" ids={ev.ca} all={all} />
                  <LinkGroup title="What came before" ids={ev.pr} all={all} />
                  <LinkGroup title="What it led to" ids={ev.ef} all={all} />
                  <LinkGroup title="What came after" ids={ev.nx} all={all} />
                </div>
              </Section>
            )}
          </div>
        </div>

        {subs.length > 0 && (
          <Section id="within" title={ev.k === 'state' ? 'Events in its history' : 'Events within it'}>
            <p className="muted">{subs.length} {subs.length === 1 ? 'event' : 'events'}, in order.{points.length ? ' Numbers match the map.' : ''}</p>
            <ol className="history-list">{(allSubs ? numbered : numbered.slice(0, 12)).map(({ e, n }) => <EventRow key={e.id} e={e} n={n} />)}</ol>
            {!allSubs && subs.length > 12 && <button type="button" className="btn" onClick={() => setAllSubs(true)}>Show all {subs.length}</button>}
          </Section>
        )}

        {near && near.items.length > 0 && (
          <Section id="meanwhile" title="Meanwhile, elsewhere">
            <p className="muted">What was happening in other parts of the world {near.around}.</p>
            <ul className="history-list">{near.items.map((e) => <EventRow key={e.id} e={e} />)}</ul>
          </Section>
        )}

        <section className="event-next" aria-label="Keep exploring">
          {!sensitive && <Link className="btn btn-primary" to="/games/which-came-first">Play Which came first?</Link>}
          {place && <Link className="btn" to={countryPath(place)}>Explore {place.name}</Link>}
          {ev.w && (
            <a className="btn" href={`https://en.wikipedia.org/wiki/${encodeURIComponent(ev.w)}`} target="_blank" rel="noreferrer">
              Read more on Wikipedia <ExternalLink size={16} aria-hidden="true" />
            </a>
          )}
        </section>
        <SourceNote sources={['wikidata']}>Dates, places, the countries involved and the links between events. The one-line summary is Wikidata's own. Retrieved {all.retrieved}.</SourceNote>
      </div>
    </>
  );
}
