import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, RotateCcw, X } from 'lucide-react';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader } from '../../components/ui';
import { countryPath, getCountry } from '../../data/countries';
import { datedEvents, type DatedEvent } from '../../content/countries';
import { shuffle } from '../../lib/answers';
import { parseDifficulty, type Difficulty } from '../../lib/difficulty';
import { saveBest } from '../../lib/progress';

const ROUNDS = 5;
const PER_ROUND = 4;

/**
 * Four events per round. Easy: centuries apart. Medium: at least 20 years apart.
 * Hard: from the same part of the world and within about 150 years of each other.
 */
function pickRound(level: Difficulty, EVENTS: DatedEvent[]): DatedEvent[] {
  for (let attempt = 0; attempt < 400; attempt++) {
    const seed = shuffle(EVENTS)[0];
    const region = getCountry(seed.cca3)?.region;
    const pool = level === 'hard'
      ? EVENTS.filter((e) => getCountry(e.cca3)?.region === region && Math.abs(e.year - seed.year) <= 150)
      : EVENTS;
    const picked: DatedEvent[] = [seed];
    const minGap = level === 'easy' ? 100 : level === 'medium' ? 20 : 1;
    for (const e of shuffle(pool)) {
      if (picked.length === PER_ROUND) break;
      if (picked.some((p) => Math.abs(p.year - e.year) < minGap || p.cca3 === e.cca3 && p.title === e.title)) continue;
      picked.push(e);
    }
    if (picked.length === PER_ROUND) return shuffle(picked);
  }
  return shuffle(EVENTS).slice(0, PER_ROUND);
}

/** Loads the dated events from every country's written history (on demand), then starts the game. */
export function WhichCameFirst() {
  const [events, setEvents] = useState<DatedEvent[] | null>(null);
  useEffect(() => { let live = true; datedEvents().then((e) => live && setEvents(e)); return () => { live = false; }; }, []);
  if (!events) {
    return (
      <div className="dark play-screen">
        <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Which came first?' }]} title="Which came first?" />
        <div className="container play-body"><p className="muted" role="status">Loading events…</p></div>
      </div>
    );
  }
  return <Game events={events} />;
}

function Game({ events }: { events: DatedEvent[] }) {
  const [params, setParams] = useSearchParams();
  const level = parseDifficulty(params.get('level'));
  const [game, setGame] = useState(0);
  const rounds = useMemo(() => Array.from({ length: ROUNDS }, () => pickRound(level, events)), [level, game]); // eslint-disable-line react-hooks/exhaustive-deps
  const [r, setR] = useState(0);
  const [order, setOrder] = useState<DatedEvent[]>(() => rounds[0]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState('');

  const restart = (l = level) => { setParams({ level: l }); setGame((g) => g + 1); setR(0); setChecked(false); setScore(0); setDone(false); };
  // When a new set of rounds is drawn, show its first round.
  useEffect(() => { setOrder(rounds[0]); }, [rounds]);

  const correct = [...order].sort((a, b) => a.year - b.year);
  const right = order.map((e, i) => correct[i] === e);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (checked || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setAnnounce(`${next[j].title} moved to position ${j + 1}.`);
  };
  const check = () => { setChecked(true); setScore((s) => s + right.filter(Boolean).length); };
  const next = () => {
    if (r + 1 >= ROUNDS) { setDone(true); saveBest(`which-came-first-${level}`, Math.round(((score) / (ROUNDS * PER_ROUND)) * 100)); return; }
    setR(r + 1); setOrder(rounds[r + 1]); setChecked(false);
  };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Which came first?' }]} title="Which came first?">
        <p className="muted">Put four moments from history in order, oldest at the top. Use the arrows to move them.</p>
      </PageHeader>
      <div className="container play-body">
        <DifficultyPicker blurbs={{ easy: 'Events are at least a century apart.', medium: 'Events are at least 20 years apart.', hard: 'Events from the same part of the world, all within about 150 years.' }} value={level} onChange={(d) => restart(d)} />
        <div className="quiz-card">
          {done ? (
            <div aria-live="polite">
              <p className="eyebrow">Results</p>
              <h2>You placed {score} of {ROUNDS * PER_ROUND} events correctly</h2>
              <div className="quiz-actions"><button className="btn btn-primary" onClick={() => restart()}><RotateCcw size={18} aria-hidden="true" /> Play again</button><Link className="btn" to="/history">Explore history</Link></div>
            </div>
          ) : (
            <>
              <div className="quiz-progress"><span>Round {r + 1} of {ROUNDS}</span><span>Score {score}</span></div>
              <h2 className="quiz-question">Oldest at the top, newest at the bottom</h2>
              <ol className="order-list">
                {order.map((e, i) => {
                  const c = getCountry(e.cca3)!;
                  return (
                    <li key={e.cca3 + e.title} className={`order-item${checked ? (right[i] ? ' correct' : ' incorrect') : ''}`}>
                      <div className="order-text">
                        <b>{e.title}</b>
                        <span className="muted">{e.text}</span>
                        <span className="order-meta">{checked ? <Link to={countryPath(c)}>{c.name}</Link> : c.name}{checked && <> · <strong>{e.label}</strong></>}{checked && !right[i] && <> · should be number {correct.indexOf(e) + 1}</>}</span>
                      </div>
                      {checked ? (right[i] ? <Check size={20} aria-label="In the right place" /> : <X size={20} aria-label={`Should be number ${correct.indexOf(e) + 1}`} />) : (
                        <div className="order-moves">
                          <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${e.title} up`}><ArrowUp size={18} aria-hidden="true" /></button>
                          <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${e.title} down`}><ArrowDown size={18} aria-hidden="true" /></button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
              <p className="sr-only" aria-live="polite">{checked ? `${right.filter(Boolean).length} of ${PER_ROUND} in the right place.` : announce}</p>
              <div className="quiz-actions">
                {!checked
                  ? <button className="btn btn-primary" onClick={check}>Check order</button>
                  : <button className="btn btn-primary" onClick={next}>{r + 1 < ROUNDS ? 'Next round' : 'See results'}</button>}
              </div>
            </>
          )}
        </div>
        <p className="source-note">Events come from the History tabs written for every country profile. Only events with an exact year are used.</p>
      </div>
    </div>
  );
}
