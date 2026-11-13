import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, Check, X } from 'lucide-react';
import { WorldMap } from '../../components/WorldMap';
import { RegionPicker } from '../../components/RegionPicker';
import { PageHeader, SourceNote } from '../../components/ui';
import { countryPath, getCountry, type Country } from '../../data/countries';
import { formatTime, shuffle } from '../../lib/answers';
import { parseRegion, sovereignIn } from '../../lib/regions';
import { saveBest } from '../../lib/progress';

const ROUNDS = 10;
type Result = { target: Country; clicked: string; correct: boolean };

export function FindOnMap() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const startWith = params.get('start');
  const pool = useMemo(() => sovereignIn(region.key).filter((c) => c.hasShape && (c.area?.value ?? 0) > 1000), [region.key]);
  const focus = useMemo(() => (region.key === 'world' ? undefined : pool.map((c) => c.cca3)), [pool, region.key]);

  const [queue, setQueue] = useState<Country[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [feedback, setFeedback] = useState<Result | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready');
  const startedAt = useRef(0);

  useEffect(() => { setStatus('ready'); setResults([]); setFeedback(null); }, [region.key]);
  useEffect(() => {
    if (status !== 'playing') return;
    const t = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 500);
    return () => clearInterval(t);
  }, [status]);

  function start() {
    const first = startWith ? pool.find((c) => c.cca3 === startWith) : undefined;
    const rest = shuffle(pool.filter((c) => c !== first));
    setQueue([...(first ? [first] : []), ...rest].slice(0, Math.min(ROUNDS, pool.length)));
    setResults([]); setFeedback(null); setElapsed(0);
    startedAt.current = Date.now();
    setStatus('playing');
  }

  const round = results.length;
  const target = queue[round];

  function click(code: string) {
    if (status !== 'playing' || feedback || !target) return;
    const r = { target, clicked: code, correct: code === target.cca3 };
    setFeedback(r);
    setTimeout(() => {
      const next = [...results, r];
      setResults(next);
      setFeedback(null);
      if (next.length >= queue.length) {
        setStatus('over');
        saveBest(`find-on-map-${region.key}`, Math.round((next.filter((x) => x.correct).length / next.length) * 100));
      }
    }, r.correct ? 700 : 1600);
  }

  const score = results.filter((r) => r.correct).length;
  const classFor = (c: string | null) => {
    if (feedback) {
      if (c === feedback.target.cca3) return feedback.correct ? 'found' : 'active';
      if (c === feedback.clicked) return 'wrong';
    }
    if (focus && !pool.some((p) => p.cca3 === c)) return 'dim';
    return undefined;
  };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Find it on the map' }]} title={`Find it on the map: ${region.label}`}>
        <p className="muted">We name a country — click it on the map. Country names are hidden on hover.</p>
      </PageHeader>
      <div className="container play-body">
        <RegionPicker value={region.key} onChange={(k) => setParams({ region: k })} disabled={status === 'playing'} />
        <div className="game-bar">
          <div className="stat"><span className="stat-label">Round</span><span className="stat-value">{Math.min(round + 1, queue.length || ROUNDS)}<small> / {queue.length || ROUNDS}</small></span></div>
          <div className="stat"><span className="stat-label">Score</span><span className="stat-value">{score}</span></div>
          <div className="stat"><span className="stat-label">Time</span><span className="stat-value" role="timer">{formatTime(elapsed)}</span></div>
          <div className="game-input">
            {status === 'playing' && target ? (
              <p className="prompt" aria-live="assertive">
                {feedback ? (feedback.correct ? <><Check aria-hidden="true" /> Correct — {target.name}</> : <><X aria-hidden="true" /> That was {getCountry(feedback.clicked)?.name ?? 'somewhere else'}. {target.name} is in yellow.</>) : <>Click on <strong>{target.name}</strong></>}
              </p>
            ) : (
              <button className="btn btn-primary" onClick={start}><Play size={18} aria-hidden="true" /> {status === 'over' ? 'Play again' : 'Start'}</button>
            )}
          </div>
        </div>
        <div className="progress-bar" aria-hidden="true"><span style={{ width: `${(round / (queue.length || ROUNDS)) * 100}%` }} /></div>

        {status === 'over' && (
          <div className="quiz-card results" role="status">
            <h2>{score} out of {results.length} in {formatTime(elapsed)}</h2>
            <ul className="result-list">
              {results.map((r) => (
                <li key={r.target.cca3} className={r.correct ? 'ok' : 'bad'}>
                  {r.correct ? <Check size={16} aria-label="Correct" /> : <X size={16} aria-label="Missed" />} <Link to={countryPath(r.target)}>{r.target.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <WorldMap label="Interactive map for the find-the-country game. This game needs a pointer; the Capitals and Name the countries games work fully with a keyboard." focus={focus} onlyFocusRegion onSelect={click} classFor={classFor} hideNames />
        <SourceNote sources={['natural-earth']} />
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Very small states (under 1,000 km²) are left out of this game because they're too small to click. Using a keyboard? Try <Link to={`/games/name-the-countries?region=${region.key}`}>Name the countries</Link> or <Link to={`/games/capitals?region=${region.key}`}>Capitals</Link>.</p>
      </div>
    </div>
  );
}
