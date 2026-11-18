import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flag, RotateCcw, Undo2 } from 'lucide-react';
import { CountrySearch } from '../../components/CountrySearch';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { WorldMap } from '../../components/WorldMap';
import { PageHeader, SourceNote } from '../../components/ui';
import { SOVEREIGN, countryPath, getCountry, type Country } from '../../data/countries';
import { shuffle } from '../../lib/answers';
import { neighbours, shortestPath } from '../../lib/borders';
import { fameOf, parseDifficulty, type Difficulty } from '../../lib/difficulty';
import { saveBest } from '../../lib/progress';

// How many border crossings the shortest route should take.
const STEPS: Record<Difficulty, [number, number]> = { easy: [2, 3], medium: [4, 5], hard: [6, 9] };

function newPuzzle(level: Difficulty): { from: Country; to: Country; best: string[] } {
  const [lo, hi] = STEPS[level];
  // Start from well-known countries on easy, anywhere otherwise.
  const starts = shuffle(SOVEREIGN.filter((c) => neighbours(c).length && (level !== 'easy' || fameOf(c) > 0.5)));
  for (const from of starts) {
    for (const to of shuffle(SOVEREIGN)) {
      if (to === from || (level === 'easy' && fameOf(to) < 0.5)) continue;
      const best = shortestPath(from.cca3, to.cca3);
      if (best && best.length - 1 >= lo && best.length - 1 <= hi) return { from, to, best };
    }
  }
  const best = shortestPath('FRA', 'POL')!;
  return { from: getCountry('FRA')!, to: getCountry('POL')!, best };
}

export function BorderChain() {
  const [params, setParams] = useSearchParams();
  const level = parseDifficulty(params.get('level'));
  const [round, setRound] = useState(0);
  const puzzle = useMemo(() => newPuzzle(level), [level, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [chain, setChain] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [gaveUp, setGaveUp] = useState(false);

  const path = [puzzle.from.cca3, ...chain];
  const current = getCountry(path[path.length - 1])!;
  const won = current.cca3 === puzzle.to.cca3;
  const over = won || gaveUp;
  const par = puzzle.best.length - 1;

  const reset = (nextRound = true) => { setChain([]); setMessage(''); setGaveUp(false); if (nextRound) setRound((r) => r + 1); };
  const pick = (c: Country) => {
    if (over) return;
    if (path.includes(c.cca3)) { setMessage(`${c.name} is already in your chain.`); return; }
    if (!neighbours(current).includes(c.cca3)) { setMessage(`${c.name} doesn't share a land border with ${current.name}. Try again.`); return; }
    const next = [...chain, c.cca3];
    setChain(next);
    if (c.cca3 === puzzle.to.cca3) {
      setMessage(`You reached ${c.name} in ${next.length} crossings. The shortest route takes ${par}.`);
      saveBest(`border-chain-${level}`, Math.max(0, 100 - (next.length - par) * 20));
    } else setMessage(`${c.name} added. Now cross a border from ${c.name}.`);
  };

  const shown = new Set(path);
  // Once the round is over, show a fastest route. If the player's own route was already
  // a fastest one, it is the one shown; otherwise the precomputed shortest path.
  const matchedPar = won && chain.length === par;
  const fastest = matchedPar ? path : puzzle.best;
  const bestSet = new Set(over ? fastest : []);
  const classFor = (code: string | null) => {
    if (!code) return undefined;
    if (code === puzzle.from.cca3 || code === puzzle.to.cca3) return 'active';
    if (shown.has(code)) return 'found';
    if (bestSet.has(code)) return 'route';
    return over ? 'dim' : undefined;
  };
  const focus = useMemo(() => [...new Set([...puzzle.best, ...path])], [puzzle, chain]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Border chain' }]} title="Border chain">
        <p className="muted">Travel overland from one country to another. Each country you name must share a land border with the last one.</p>
      </PageHeader>
      <div className="container play-body">
        <DifficultyPicker blurbs={{ easy: 'Well-known countries, two or three borders apart.', medium: 'Any countries, four or five borders apart.', hard: 'Long routes of six or more border crossings.' }} value={level} onChange={(d) => { setParams({ level: d }); reset(); }} />
        <div className="quiz-card chain">
          <h2 className="quiz-question">From {puzzle.from.name} to {puzzle.to.name}</h2>
          <p className="muted">The shortest route crosses {par} border{par > 1 ? 's' : ''}.</p>
          <ol className="chain-list" aria-label="Your route so far">
            {path.map((code) => <li key={code}><span className="chip chip-static">{getCountry(code)!.name}</span></li>)}
            {!over && <li><span className="chip chip-static chip-next">?</span></li>}
            {!won && <li><span className="chip chip-static chip-goal">{puzzle.to.name}</span></li>}
          </ol>
          {!over && (
            <>
              <CountrySearch label={`Name a country that borders ${current.name}`} placeholder={`A neighbour of ${current.name}…`} onPick={pick} />
              <div className="quiz-actions">
                <button className="btn" onClick={() => { setChain(chain.slice(0, -1)); setMessage(''); }} disabled={!chain.length}><Undo2 size={18} aria-hidden="true" /> Undo</button>
                <button className="btn" onClick={() => setGaveUp(true)}><Flag size={18} aria-hidden="true" /> Show a shortest route</button>
              </div>
            </>
          )}
          <p className="chain-message" aria-live="polite">{message}</p>
          {over && (
            <section className="chain-fastest" aria-labelledby="chain-fastest-title">
              <h3 id="chain-fastest-title" className="chain-fastest-title">
                {matchedPar ? 'You found a fastest route!' : `Fastest route: ${par} crossing${par > 1 ? 's' : ''}`}
              </h3>
              {!matchedPar && won && <p className="muted">Yours took {chain.length}, {chain.length - par} more than needed.</p>}
              <ol className="chain-list" aria-label="A fastest route">
                {fastest.map((code) => {
                  const c = getCountry(code)!;
                  const extra = !shown.has(code) && code !== puzzle.to.cca3;
                  return <li key={code}><Link className={`chip${extra ? ' chip-route' : ''}`} to={countryPath(c)}>{c.name}</Link></li>;
                })}
              </ol>
              {fastest.some((c) => !shown.has(c)) && <p className="muted chain-legend"><span className="legend-swatch swatch-found" aria-hidden="true" /> In your route <span className="legend-swatch swatch-route" aria-hidden="true" /> On the fastest route only</p>}
            </section>
          )}
          {over && (
            <div className="quiz-actions">
              <button className="btn btn-primary" onClick={() => reset()}><RotateCcw size={18} aria-hidden="true" /> New route</button>
              <Link className="btn" to={countryPath(puzzle.to)}>Explore {puzzle.to.name}</Link>
            </div>
          )}
        </div>
        <WorldMap label={`Map from ${puzzle.from.name} to ${puzzle.to.name}, with your route highlighted. Your route is also listed above.`} focus={focus} classFor={classFor} />
        <SourceNote sources={['world-countries', 'natural-earth']}>Only land borders between sovereign countries count.</SourceNote>
      </div>
    </div>
  );
}
