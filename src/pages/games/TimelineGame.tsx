import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Check, RotateCcw, X } from 'lucide-react';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { MistakeReview } from '../../components/MistakeReview';
import { PageHeader, SourceNote } from '../../components/ui';
import { getCountry } from '../../data/countries';
import { ERAS, eraBySlug } from '../../data/eras';
import { formatSpan, type HistoryEvent } from '../../data/events';
import { useEvents } from '../../data/useEvents';
import { parseDifficulty } from '../../lib/difficulty';
import { saveBest } from '../../lib/progress';
import { recordAnswer } from '../../lib/review';
import { PER_ROUND, inOrder, marks, pickRound } from '../../lib/timelineGame';
import { KIND_LABEL, eventPath } from '../EventPage';

const ROUNDS = 5;
/** Events this well known (Wikipedia articles in this many languages) are worth adding to weak spots. */
const WORTH_LEARNING = 50;

export function TimelineGame() {
  const [params, setParams] = useSearchParams();
  const level = parseDifficulty(params.get('level'));
  const era = eraBySlug(params.get('era') ?? undefined);
  const all = useEvents();
  const [game, setGame] = useState(0);
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState<HistoryEvent[]>([]);
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<HistoryEvent[]>([]);
  const [done, setDone] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const events = useMemo(() => (all ? pickRound(all.list, level, era) : []), [all, level, era, game, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setOrder(events); setChecked(null); }, [events]);
  useEffect(() => { heading.current?.focus(); }, [round, done]);

  const restart = (next: Partial<{ level: string; era: string }> = {}) => {
    const p: Record<string, string> = { level, ...(era ? { era: era.slug } : {}), ...next };
    if (!p.era) delete p.era;
    setParams(p);
    setGame((g) => g + 1); setRound(0); setScore(0); setMissed([]); setDone(false); setNewBest(false);
  };
  const move = (i: number, by: number) => {
    const j = i + by;
    if (checked || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const check = () => {
    const m = marks(order);
    setChecked(m);
    setScore((s) => s + m.filter(Boolean).length);
    // Only well-known events become weak spots, so one hard game doesn't bury the flags and capitals.
    order.forEach((e, i) => { if (m[i] || e.n >= WORTH_LEARNING) recordAnswer({ kind: 'date', ref: e.id, label: e.t }, m[i]); });
    setMissed((list) => [...list, ...order.filter((_, i) => !m[i])]);
  };
  const next = () => {
    if (round + 1 < ROUNDS) { setRound((r) => r + 1); return; }
    setDone(true);
    setNewBest(saveBest(`timeline-${level}${era ? `-${era.slug}` : ''}`, Math.round((score / (ROUNDS * PER_ROUND)) * 100)));
  };
  const right = checked ? inOrder(order) : [];

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Timeline builder' }]} title="Timeline builder">
        <p className="muted">Put five real events in order, earliest at the top. Use the arrows to move them.</p>
      </PageHeader>
      <div className="container play-body">
        <DifficultyPicker
          value={level}
          onChange={(d) => restart({ level: d })}
          blurbs={{ easy: 'Famous events from all of history, at least a century apart.', medium: 'Events from one era, spread across it.', hard: 'Events close together in time. Know your dates!' }}
        />
        <label className="field inline timeline-era-pick">
          <span>Era</span>
          <select className="input" value={era?.slug ?? ''} onChange={(e) => restart({ era: e.target.value })}>
            <option value="">{level === 'easy' ? 'All of history' : 'A different era each round'}</option>
            {ERAS.slice(1).map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
          </select>
        </label>

        <div className="quiz-card timeline-game">
          {!all ? <p className="muted" role="status">Loading events…</p> : !events.length ? (
            <p role="status">There aren't enough well-known events for this era and level yet. <button type="button" className="btn" onClick={() => restart({ era: '' })}>Play all eras</button></p>
          ) : done ? (
            <>
              <p className="eyebrow">Results</p>
              <h2 ref={heading} tabIndex={-1}>You placed {score} of {ROUNDS * PER_ROUND} events correctly</h2>
              {newBest && <p className="tag">New personal best</p>}
              <MistakeReview mistakes={[...missed].sort((a, b) => b.n - a.n).slice(0, 10).map((e) => ({ prompt: e.t, note: `It happened in ${formatSpan(e)}.`, link: eventPath(e) }))} title={missed.length > 10 ? 'The 10 best-known dates to remember' : 'Dates to remember'} />
              <div className="quiz-actions">
                <button className="btn btn-primary" onClick={() => restart()}><RotateCcw size={18} aria-hidden="true" /> Play again</button>
                <Link className="btn" to={era ? `/history/eras/${era.slug}` : '/history'}>{era ? `Explore ${era.name.replace(/^The /, 'the ')}` : 'Explore history'}</Link>
              </div>
            </>
          ) : (
            <>
              <div className="quiz-progress"><span>Round {round + 1} of {ROUNDS}</span><span>Score {score}</span></div>
              <div className="progress-bar" aria-hidden="true"><span style={{ width: `${(round / ROUNDS) * 100}%` }} /></div>
              <h2 ref={heading} tabIndex={-1} className="quiz-question">{checked ? `${checked.filter(Boolean).length} of ${PER_ROUND} in the right place` : 'Which came first? Put them in order.'}</h2>
              <ol className="timeline-cards">
                {order.map((e, i) => {
                  const place = getCountry(e.p ?? e.c?.[0]);
                  const ok = checked?.[i];
                  return (
                    <li key={e.id} className={checked ? (ok ? 'is-right' : 'is-wrong') : ''}>
                      <span className="timeline-pos" aria-hidden="true">{i + 1}</span>
                      <div className="timeline-card-main">
                        <strong>{e.t}</strong>
                        <span className="muted">{KIND_LABEL[e.k]}{place ? ` · ${place.name}` : ''}</span>
                        {checked && (
                          <span className="timeline-date">
                            {ok ? <Check size={16} aria-label="Right place" /> : <X size={16} aria-label="Wrong place" />} {formatSpan(e)}
                            {!ok && <span className="muted"> · belongs at number {right.findIndex((r) => r.id === e.id) + 1}</span>}
                          </span>
                        )}
                      </div>
                      {!checked && (
                        <span className="timeline-moves">
                          <button type="button" className="btn timeline-move" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${e.t} earlier`}><ArrowUp size={18} aria-hidden="true" /></button>
                          <button type="button" className="btn timeline-move" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${e.t} later`}><ArrowDown size={18} aria-hidden="true" /></button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="sr-only" aria-live="polite">{checked ? `Correct order: ${right.map((e) => `${e.t}, ${formatSpan(e)}`).join('; ')}.` : ''}</p>
              <div className="quiz-actions">
                {!checked ? (
                  <button className="btn btn-primary" onClick={check} disabled={!order.length}><Check size={18} aria-hidden="true" /> Check my order</button>
                ) : (
                  <button className="btn btn-primary" onClick={next}>{round + 1 < ROUNDS ? 'Next round' : 'See results'} <ArrowRight size={18} aria-hidden="true" /></button>
                )}
              </div>
            </>
          )}
        </div>
        <SourceNote sources={['wikidata']}>Events and dates. Events about mass killing are never used in this game.</SourceNote>
      </div>
    </div>
  );
}
