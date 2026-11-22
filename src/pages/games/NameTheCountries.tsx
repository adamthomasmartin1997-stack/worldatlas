import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, Flag } from 'lucide-react';
import { WorldMap } from '../../components/WorldMap';
import { RegionPicker } from '../../components/RegionPicker';
import { PageHeader, SourceNote } from '../../components/ui';
import { countryPath, getCountry, type Country } from '../../data/countries';
import { buildAnswerIndex, formatTime, normalize } from '../../lib/answers';
import { parseRegion, sovereignIn } from '../../lib/regions';
import { getBest, saveBest } from '../../lib/progress';
import { recordAnswer } from '../../lib/review';
import { byFame, whereHint } from '../../lib/countryHints';
import { MistakeReview } from '../../components/MistakeReview';

type Status = 'ready' | 'playing' | 'over';

export function NameTheCountries() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const pool = useMemo(() => sovereignIn(region.key), [region.key]);
  const index = useMemo(() => buildAnswerIndex(pool), [pool]);
  const limit = region.key === 'world' ? 15 * 60 : Math.max(3, Math.ceil(pool.length / 10)) * 60;
  const gameId = `name-the-countries-${region.key}`;

  const [status, setStatus] = useState<Status>('ready');
  const [found, setFound] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [left, setLeft] = useState(limit);
  const [lastFound, setLastFound] = useState('');
  const [newBest, setNewBest] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Reset when the region changes.
  useEffect(() => { setStatus('ready'); setFound([]); setLeft(limit); setText(''); }, [region.key, limit]);

  useEffect(() => {
    if (status !== 'playing') return;
    const started = Date.now() - (limit - left) * 1000;
    const t = setInterval(() => {
      const remaining = limit - (Date.now() - started) / 1000;
      if (remaining <= 0) finish(); else setLeft(remaining);
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const [toLearn, setToLearn] = useState<Country[]>([]);
  const foundSet = useMemo(() => new Set(found), [found]);

  function start() {
    setFound([]); setLeft(limit); setText(''); setNewBest(false); setStatus('playing');
    setTimeout(() => input.current?.focus(), 0);
  }
  function finish(final = found) {
    setStatus('over');
    // Weak spots: the best-known countries missed (at most 10, so a big region doesn't swamp the list),
    // and a right answer for anything found that was already on the list.
    const got = new Set(final);
    for (const c of pool) if (got.has(c.cca3)) recordAnswer({ kind: 'map', ref: c.cca3, label: c.name }, true);
    setToLearn(pool.filter((c) => !got.has(c.cca3)).sort(byFame).slice(0, 10));
    for (const c of pool.filter((c) => !got.has(c.cca3)).sort(byFame).slice(0, 10)) recordAnswer({ kind: 'map', ref: c.cca3, label: c.name }, false);
    setNewBest(saveBest(gameId, final.length));
  }
  function onType(v: string) {
    setText(v);
    const code = index.get(normalize(v));
    if (code && !foundSet.has(code)) {
      const next = [...found, code];
      setFound(next);
      setText('');
      setLastFound(getCountry(code)!.name);
      if (next.length === pool.length) finish(next);
    }
  }

  const groups = useMemo(() => {
    const m = new Map<string, typeof pool>();
    for (const c of pool) {
      const k = region.key === 'world' ? c.region : (c.subregion ?? c.region);
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [pool, region.key]);

  const focus = useMemo(() => (region.key === 'world' ? undefined : pool.map((c) => c.cca3)), [pool, region.key]);
  const classFor = (c: string | null) => (c && foundSet.has(c) ? 'found' : status === 'over' && c && pool.some((p) => p.cca3 === c) ? 'wrong' : focus && !pool.some((p) => p.cca3 === c) ? 'dim' : undefined);
  const best = getBest(gameId);

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Name the countries' }]} title={`Name every country${region.key === 'world' ? ' in the world' : ` in ${region.label}`}`}>
        <p className="muted">Type a country and it's accepted automatically — no need to press Enter. Common alternative names count.</p>
      </PageHeader>
      <div className="container play-body">
        <RegionPicker value={region.key} onChange={(k) => setParams({ region: k })} disabled={status === 'playing'} />

        <div className="game-bar">
          <div className="stat"><span className="stat-label">Found</span><span className="stat-value">{found.length}<small> / {pool.length}</small></span></div>
          <div className="stat"><span className="stat-label">Time left</span><span className="stat-value" role="timer">{formatTime(left)}</span></div>
          <div className="game-input">
            {status === 'playing' ? (
              <>
                <label htmlFor="answer" className="sr-only">Type a country name</label>
                <input id="answer" ref={input} className="input" value={text} onChange={(e) => onType(e.target.value)} placeholder="Type a country…" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                <button className="btn btn-secondary" onClick={() => finish()}><Flag size={18} aria-hidden="true" /> Give up</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={start}><Play size={18} aria-hidden="true" /> {status === 'over' ? 'Play again' : 'Start'}</button>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{lastFound && `${lastFound} found. ${found.length} of ${pool.length}.`}</p>
        <div className="progress-bar" aria-hidden="true"><span style={{ width: `${(found.length / pool.length) * 100}%` }} /></div>

        {status === 'over' && (
          <div className="quiz-card results" role="status">
            <h2>You named {found.length} of {pool.length}</h2>
            <p className="muted">{newBest ? 'That’s a new personal best.' : best != null ? `Your best is ${best}.` : ''} Missed countries are shown in red — click any to read its profile.</p>
            <MistakeReview title="Countries worth learning" mistakes={toLearn.map((c) => ({ prompt: c.name, note: whereHint(c), link: countryPath(c) }))} />
          </div>
        )}

        <WorldMap label={`Map of ${region.label}. Found countries are highlighted; the full list is below.`} focus={focus} onlyFocusRegion classFor={classFor} hideNames={status !== 'over'} />
        <SourceNote sources={['natural-earth', 'world-countries']} />

        <div className="answer-groups">
          {groups.map(([g, list]) => (
            <div key={g}>
              <h3>{g} <span className="muted">{list.filter((c) => foundSet.has(c.cca3)).length}/{list.length}</span></h3>
              <ul>
                {[...list].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                  <li key={c.cca3} className={foundSet.has(c.cca3) ? 'is-found' : status === 'over' ? 'is-missed' : ''}>
                    {foundSet.has(c.cca3) || status === 'over' ? <Link to={countryPath(c)}>{c.name}</Link> : <span aria-label="Not found yet">&nbsp;</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
