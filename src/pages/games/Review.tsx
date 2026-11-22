import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';
import { QuizRunner } from '../../components/QuizRunner';
import { useWeakCounts } from '../../components/MistakeReview';
import { PageHeader } from '../../components/ui';
import { countryPath, getCountry, type Country } from '../../data/countries';
import { eventsInEra, eraOfYear, fmtYear } from '../../data/eras';
import { yearOf, type HistoryEvent } from '../../data/events';
import { useEvents, type Events } from '../../data/useEvents';
import { shuffle } from '../../lib/answers';
import { flagUrl, pickDistractors } from '../../lib/difficulty';
import { shuffleOptions, type Question } from '../../lib/quiz';
import { sovereignIn } from '../../lib/regions';
import { KIND_LABEL, LEARNED_AT, clearWeak, dueItems, weakItems, type ReviewKind, type WeakItem } from '../../lib/review';
import { eventPath } from '../EventPage';

const ORDER: ReviewKind[] = ['map', 'capital', 'flag', 'shape', 'date'];

/** Four years for "When did … happen?": the right one and three from other events of the same era. */
function yearOptions(e: HistoryEvent, events: Events): string[] {
  const y = yearOf(e.s);
  const era = eraOfYear(y);
  const gap = Math.max(5, Math.round((Math.min(era.to, new Date().getFullYear()) - era.from) / 20));
  const others: number[] = [];
  for (const x of shuffle(eventsInEra(events.list, era))) {
    const xy = yearOf(x.s);
    if (others.length < 3 && Math.abs(xy - y) >= gap && others.every((o) => Math.abs(o - xy) >= gap)) others.push(xy);
  }
  return [y, ...others].map(fmtYear);
}

/** One question for each weak spot, of the same kind as the game it was missed in. */
export function questionFor(item: WeakItem, events: Events | null): Question | null {
  const world = sovereignIn('world');
  const names = (c: Country) => [c, ...pickDistractors(c, world, 'medium')].map((x) => x.name);
  const review = { kind: item.kind, ref: item.ref, label: item.label };
  if (item.kind === 'date') {
    const e = events?.byId.get(item.ref);
    if (!e || !events) return null;
    return shuffleOptions({ q: `When did this happen: ${e.t}?`, options: yearOptions(e, events), answer: 0, link: eventPath(e), review, explain: `${e.t}: ${fmtYear(yearOf(e.s))}.` });
  }
  const c = getCountry(item.ref);
  if (!c) return null;
  const link = countryPath(c);
  switch (item.kind) {
    case 'flag': return shuffleOptions({ q: 'Which country does this flag belong to?', image: { src: flagUrl(c), alt: 'A national flag. Which country is it?' }, options: names(c), answer: 0, link, review });
    case 'capital': {
      const others = pickDistractors(c, world.filter((x) => x.capital[0]), 'medium').map((x) => x.capital[0]);
      return shuffleOptions({ q: `What is the capital of ${c.name}?`, options: [c.capital[0], ...others], answer: 0, link, review });
    }
    case 'shape': return shuffleOptions({ q: 'Which country has this shape?', shape: c.cca3, options: names(c), answer: 0, link, review });
    case 'map': return shuffleOptions({ q: 'Which country is highlighted?', mapHighlight: c.cca3, options: names(c), answer: 0, link, review });
  }
}

const when = (due: number) => {
  const days = Math.ceil((due - Date.now()) / 86_400_000);
  return days <= 0 ? 'Ready now' : days === 1 ? 'Tomorrow' : `In ${days} days`;
};

export function Review() {
  const events = useEvents();
  const { total } = useWeakCounts();
  const [round, setRound] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const items = useMemo(() => weakItems(), [total, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = useMemo(() => dueItems(), [total, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = useMemo(() => {
    if (round == null) return [];
    return shuffle(due).map((i) => questionFor(i, events)).filter((q): q is Question => Boolean(q)).slice(0, 10);
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const needsEvents = due.some((i) => i.kind === 'date') && !events;

  const link = (i: WeakItem) => (i.kind === 'date' ? `/history/events/${i.ref}` : countryPath({ cca3: i.ref }));

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Review' }]} title="Your weak spots">
        <p className="muted">Anything you get wrong in a game comes back here. Get it right three times, a few days apart, and it's learned.</p>
      </PageHeader>
      <div className="container play-body">
        {round != null && questions.length > 0 ? (
          <QuizRunner key={round} questions={questions} gameId="review" onRestart={() => setRound(null)} resultsExtra={<button className="btn" onClick={() => setRound(null)}>Back to my list</button>} />
        ) : (
          <div className="quiz-card review-start">
            {items.length === 0 ? (
              <>
                <h2>Nothing to review yet</h2>
                <p>Play any game. Flags, capitals, countries and dates you miss will be saved here on this device.</p>
                <p><Link className="btn btn-primary" to="/games">Pick a game</Link></p>
              </>
            ) : (
              <>
                <h2>{due.length ? `${due.length} ready to review` : 'All caught up for now'}</h2>
                <p className="muted">{items.length} weak spot{items.length === 1 ? '' : 's'} in all.{due.length < items.length ? ' The rest come back over the next few days.' : ''}</p>
                <p>
                  <button className="btn btn-primary" disabled={!due.length || needsEvents} onClick={() => setRound((r) => (r ?? 0) + 1)}>
                    <Play size={18} aria-hidden="true" /> {needsEvents ? 'Loading…' : `Start review${due.length > 10 ? ' (10 at a time)' : ''}`}
                  </button>
                </p>
              </>
            )}
          </div>
        )}

        {round == null && items.length > 0 && (
          <>
            <div className="review-groups">
              {ORDER.filter((k) => items.some((i) => i.kind === k)).map((k) => (
                <section key={k} className="review-group" aria-labelledby={`rg-${k}`}>
                  <h2 id={`rg-${k}`}>{KIND_LABEL[k]}</h2>
                  <ul>
                    {items.filter((i) => i.kind === k).map((i) => (
                      <li key={i.ref}>
                        <Link to={link(i)}>{i.label}</Link>
                        <span className="review-meta">
                          <span className="review-boxes" aria-label={`${i.box} of ${LEARNED_AT} right`}>{Array.from({ length: LEARNED_AT }, (_, n) => <span key={n} className={n < i.box ? 'on' : ''} />)}</span>
                          <span>{when(i.due)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="review-clear">
              {confirming ? (
                <>
                  <span>Clear all {items.length} weak spots? This can't be undone.</span>
                  <button className="btn" onClick={() => { clearWeak(); setConfirming(false); }}>Yes, clear them</button>
                  <button className="btn" onClick={() => setConfirming(false)}>Keep them</button>
                </>
              ) : (
                <button className="btn" onClick={() => setConfirming(true)}><Trash2 size={18} aria-hidden="true" /> Clear my list</button>
              )}
            </div>
          </>
        )}
        <p className="muted review-note">Your list is saved only in this browser, so it won't follow you to another device.</p>
      </div>
    </div>
  );
}
