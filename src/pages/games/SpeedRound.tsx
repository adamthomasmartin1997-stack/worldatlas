import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, RotateCcw } from 'lucide-react';
import { RegionPicker } from '../../components/RegionPicker';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader, SourceNote } from '../../components/ui';
import { countryPath, type Country } from '../../data/countries';
import { formatTime, shuffle } from '../../lib/answers';
import { flagSimilarity, flagUrl, parseDifficulty, pickDistractors, pickTargets, type Difficulty } from '../../lib/difficulty';
import { getBest, saveBest } from '../../lib/progress';
import { parseRegion, sovereignIn, type RegionKey } from '../../lib/regions';

const SECONDS = 60;
const PENALTY = 3; // seconds lost for a wrong answer
type Mode = 'flags' | 'capitals';
type Q = { target: Country; options: { label: string; correct: boolean }[] };

function makeQuestion(target: Country, mode: Mode, region: RegionKey, level: Difficulty): Q {
  const has = (c: Country) => (mode === 'flags' ? Boolean(c.flag) : Boolean(c.capital[0]));
  const candidates = (level === 'easy' ? sovereignIn('world') : sovereignIn(region)).filter(has);
  const others = pickDistractors(target, candidates, level, 3, mode === 'flags' && level === 'hard' ? flagSimilarity : undefined);
  const label = (c: Country) => (mode === 'flags' ? c.name : c.capital[0]);
  const seen = new Set<string>();
  const options = [target, ...others].map((c) => ({ label: label(c), correct: c === target })).filter((o) => !seen.has(o.label) && seen.add(o.label));
  return { target, options: shuffle(options) };
}

export function SpeedRound() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const level = parseDifficulty(params.get('level'));
  const mode: Mode = params.get('mode') === 'capitals' ? 'capitals' : 'flags';
  const gameId = `speed-${mode}-${region.key}-${level}`;

  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready');
  const [left, setLeft] = useState(SECONDS);
  const [right, setRight] = useState(0);
  const [wrongs, setWrongs] = useState<Country[]>([]);
  const [q, setQ] = useState<Q | null>(null);
  const [flash, setFlash] = useState<'correct' | 'incorrect' | null>(null);
  const [newBest, setNewBest] = useState(false);
  const queue = useRef<Country[]>([]);
  const endAt = useRef(0);
  const firstBtn = useRef<HTMLButtonElement>(null);

  const draw = () => {
    if (!queue.current.length) {
      const pool = sovereignIn(region.key).filter((c) => (mode === 'flags' ? c.flag : c.capital[0]));
      queue.current = pickTargets(pool, level, pool.length);
    }
    setQ(makeQuestion(queue.current.shift()!, mode, region.key, level));
  };
  const start = () => {
    queue.current = []; setRight(0); setWrongs([]); setNewBest(false); setFlash(null);
    endAt.current = Date.now() + SECONDS * 1000; setLeft(SECONDS); draw(); setStatus('playing');
  };
  useEffect(() => { setStatus('ready'); }, [region.key, level, mode]);
  useEffect(() => {
    if (status !== 'playing') return;
    const t = setInterval(() => {
      const remaining = (endAt.current - Date.now()) / 1000;
      if (remaining <= 0) { setLeft(0); setStatus('over'); } else setLeft(remaining);
    }, 200);
    return () => clearInterval(t);
  }, [status]);
  useEffect(() => { if (status === 'over') setNewBest(saveBest(gameId, right)); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (status === 'playing') firstBtn.current?.focus(); }, [q, status]);

  const answer = (correct: boolean) => {
    if (status !== 'playing' || flash) return;
    setFlash(correct ? 'correct' : 'incorrect');
    if (correct) setRight((n) => n + 1);
    else { setWrongs((w) => [...w, q!.target]); endAt.current -= PENALTY * 1000; }
    setTimeout(() => { setFlash(null); draw(); }, correct ? 250 : 700);
  };
  const set = (next: Partial<{ region: string; level: string; mode: string }>) => setParams({ region: region.key, level, mode, ...next });
  const best = getBest(gameId);

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Speed round' }]} title={`Speed round: ${mode === 'flags' ? 'flags' : 'capitals'}`}>
        <p className="muted">{SECONDS} seconds. Answer as many as you can. A wrong answer costs {PENALTY} seconds.</p>
      </PageHeader>
      <div className="container play-body">
        <div className="segmented" role="group" aria-label="Game mode">
          {(['flags', 'capitals'] as Mode[]).map((m) => <button key={m} className={mode === m ? 'on' : ''} aria-pressed={mode === m} disabled={status === 'playing'} onClick={() => set({ mode: m })}>{m === 'flags' ? 'Flags' : 'Capitals'}</button>)}
        </div>
        <RegionPicker value={region.key} onChange={(k) => set({ region: k })} disabled={status === 'playing'} />
        {status !== 'playing' && <DifficultyPicker value={level} onChange={(d) => set({ level: d })} />}

        <div className="game-bar">
          <div className="stat"><span className="stat-label">Correct</span><span className="stat-value">{right}</span></div>
          <div className="stat"><span className="stat-label">Time left</span><span className="stat-value" role="timer">{formatTime(left)}</span></div>
          {best != null && <div className="stat"><span className="stat-label">Best</span><span className="stat-value">{best}</span></div>}
        </div>
        <div className="progress-bar" aria-hidden="true"><span style={{ width: `${(left / SECONDS) * 100}%` }} /></div>

        <div className="quiz-card">
          {status === 'ready' && <button className="btn btn-primary" onClick={start}><Play size={18} aria-hidden="true" /> Start</button>}
          {status === 'playing' && q && (
            <>
              {mode === 'flags'
                ? <><h2 className="quiz-question">Whose flag is this?</h2><img className="quiz-flag" src={flagUrl(q.target)} alt="A national flag. Which country is it?" width={240} height={180} /></>
                : <h2 className="quiz-question">What is the capital of {q.target.name}?</h2>}
              <div className="quiz-options" role="group" aria-label="Answers">
                {q.options.map((o, i) => (
                  <button key={o.label} ref={i === 0 ? firstBtn : undefined} className={`quiz-option ${flash ? (o.correct ? 'correct' : flash === 'incorrect' ? 'faded' : '') : ''}`} onClick={() => answer(o.correct)}>
                    <span>{o.label}</span>
                  </button>
                ))}
              </div>
              <p className="sr-only" aria-live="polite">{flash === 'correct' ? 'Correct' : flash === 'incorrect' ? 'Wrong' : ''}</p>
            </>
          )}
          {status === 'over' && (
            <div aria-live="polite">
              <p className="eyebrow">Time's up</p>
              <h2>{right} correct{newBest ? '. New personal best!' : ''}</h2>
              {wrongs.length > 0 && <p className="muted">Ones to revisit: {wrongs.map((c, i) => <span key={c.cca3}>{i > 0 && ', '}<Link to={countryPath(c)}>{c.name}</Link></span>)}</p>}
              <div className="quiz-actions"><button className="btn btn-primary" onClick={start}><RotateCcw size={18} aria-hidden="true" /> Play again</button><Link className="btn" to="/games">More games</Link></div>
            </div>
          )}
        </div>
        <SourceNote sources={mode === 'flags' ? ['flag-icons'] : ['world-countries']} />
      </div>
    </div>
  );
}
