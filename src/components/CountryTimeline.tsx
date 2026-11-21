import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Country } from '../data/countries';
import { buildCountryTimeline, type Written } from '../data/countryTimeline';
import { fmtRange, fmtYear } from '../data/eras';
import { yearOf, type HistoryEvent } from '../data/events';
import { useEvents } from '../data/useEvents';
import { eraPath } from '../pages/EraPage';
import { KIND_LABEL, eventPath } from '../pages/EventPage';
import { SourceNote } from './ui';

const yearsOf = (e: HistoryEvent) => {
  const a = yearOf(e.s), b = e.e ? yearOf(e.e) : a;
  return b !== a ? (a < 0 && b < 0 ? `${-a}–${-b} BC` : `${fmtYear(a)}–${fmtYear(b)}`) : fmtYear(a);
};

/**
 * A country's history in one list: our written timeline merged with events from Wikidata, grouped
 * by era. Events the country shared with many others (World War II, COVID-19) are kept to a short
 * strip at the end, so they don't swamp its own story.
 */
export function CountryTimeline({ country, name, written }: { country: Country; name: string; written: Written[] }) {
  const all = useEvents();
  const [everything, setEverything] = useState(false);
  const t = useMemo(() => (all ? buildCountryTimeline(country.cca3, written, all.list, { all: everything }) : null), [all, country.cca3, written, everything]);
  const shown = t ? t.eras.reduce((n, g) => n + g.items.length, 0) : written.length;

  return (
    <section id="timeline" className="deep-chapter country-timeline" aria-labelledby="timeline-h">
      <h2 id="timeline-h">Timeline</h2>
      {!t ? (
        <p className="muted" role="status">Loading the timeline…</p>
      ) : (
        <>
          <div className="timeline-head">
            <p className="muted">{t.total > shown ? `${shown} of ${t.total} moments in ${name}'s history.` : `${t.total} moments in ${name}'s history.`} Highlighted dates are from our own timeline; the rest link to event pages.</p>
            {t.total > written.length && (
              <div className="segmented" role="group" aria-label="How much to show">
                <button type="button" className={everything ? undefined : 'on'} aria-pressed={!everything} onClick={() => setEverything(false)}>Highlights</button>
                <button type="button" className={everything ? 'on' : undefined} aria-pressed={everything} onClick={() => setEverything(true)}>Everything</button>
              </div>
            )}
          </div>
          {t.eras.map(({ era, items, hidden }) => (
            <div key={era.slug} className="timeline-era">
              <h3 className="timeline-era-h"><Link to={eraPath(era)}>{era.name}</Link> <span className="muted">{fmtRange(era.from, era.to)}</span></h3>
              <ol className="deep-timeline">
                {items.map((i) => i.type === 'written' ? (
                  <li key={`w${i.label}${i.title}`} className="timeline-written">
                    <span className="deep-year">{i.label}</span>
                    <div>
                      <h4>{i.event ? <Link to={eventPath(i.event)}>{i.title}</Link> : i.title}</h4>
                      <p>{i.text}</p>
                    </div>
                  </li>
                ) : (
                  <li key={i.event.id} className="timeline-event">
                    <span className="deep-year timeline-year-plain">{yearsOf(i.event)}</span>
                    <div>
                      <h4><Link to={eventPath(i.event)}>{i.event.t}</Link></h4>
                      <p className="muted">{KIND_LABEL[i.event.k]}{i.event.d ? ` · ${i.event.d.charAt(0).toUpperCase()}${i.event.d.slice(1)}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {hidden > 0 && <button type="button" className="btn timeline-more" onClick={() => setEverything(true)}>Show {hidden} more from {era.name.replace(/^The /, 'the ')}</button>}
            </div>
          ))}
          {t.world.length > 0 && (
            <div className="timeline-world">
              <h3>Shared with the world</h3>
              <p className="muted">Big events {name} was part of along with many other countries.</p>
              <ul className="chip-links">{t.world.map((e) => <li key={e.id}><Link to={eventPath(e)}>{e.t}</Link></li>)}</ul>
            </div>
          )}
          <SourceNote sources={['wikidata']}>Event names, dates and descriptions. The highlighted entries are written by Worldwise.</SourceNote>
        </>
      )}
    </section>
  );
}
