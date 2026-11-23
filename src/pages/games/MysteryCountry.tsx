import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUp, Check, RotateCcw } from 'lucide-react';
import { CountrySearch } from '../../components/CountrySearch';
import { Silhouette } from '../../components/Silhouette';
import { PageHeader, SourceNote } from '../../components/ui';
import { SOVEREIGN, countryPath, dailyIndex, fmt, getCountry, type Country } from '../../data/countries';
import { shuffle } from '../../lib/answers';
import { bearing, closeness, compass, distanceKm } from '../../lib/geo';
import { saveBest } from '../../lib/progress';
import { recordAnswer } from '../../lib/review';

const MAX_GUESSES = 6;
// Countries with an outline, so the silhouette hint always works.
const POOL = SOVEREIGN.filter((c) => c.hasShape && (c.area?.value ?? 0) > 1000);
// Offset so the daily mystery is never the homepage's "Today's country", which is shown openly.
const dailyTarget = (date = new Date()) => POOL[(dailyIndex(POOL.length, date) + 71) % POOL.length];
const dayKey = (date = new Date()) => `atlas.mystery.${date.toISOString().slice(0, 10)}`;

function loadDaily(): string[] {
  try { return JSON.parse(localStorage.getItem(dayKey()) ?? '[]'); } catch { return []; }
}
function saveDaily(codes: string[]) {
  try { localStorage.setItem(dayKey(), JSON.stringify(codes)); } catch { /* storage unavailable: today's game just won't be remembered */ }
}

export function MysteryCountry() {
  const [params, setParams] = useSearchParams();
  const daily = params.get('mode') !== 'practice';
  const [practiceTarget, setPracticeTarget] = useState<Country>(() => shuffle(POOL)[0]);
  const target = daily ? dailyTarget() : practiceTarget;
  const [guesses, setGuesses] = useState<string[]>(() => (daily ? loadDaily() : []));
  const [message, setMessage] = useState('');

  useEffect(() => { setGuesses(daily ? loadDaily() : []); setMessage(''); }, [daily]);

  const rows = useMemo(() => guesses.map((code) => {
    const c = getCountry(code)!;
    const km = distanceKm(c.latlng, target.latlng);
    return { c, km, deg: bearing(c.latlng, target.latlng), score: closeness(km), correct: code === target.cca3 };
  }), [guesses, target]);

  const won = rows.some((r) => r.correct);
  const over = won || guesses.length >= MAX_GUESSES;
  const wrong = rows.filter((r) => !r.correct).length;

  const guess = (c: Country) => {
    if (over) return;
    if (guesses.includes(c.cca3)) { setMessage(`You've already guessed ${c.name}.`); return; }
    const next = [...guesses, c.cca3];
    setGuesses(next);
    setMessage(c.cca3 === target.cca3 ? `Yes! It's ${target.name}.` : `Not ${c.name}.`);
    if (daily) saveDaily(next);
    if (c.cca3 === target.cca3 || next.length >= MAX_GUESSES) {
      saveBest(`mystery-${daily ? 'daily' : 'practice'}`, c.cca3 === target.cca3 ? MAX_GUESSES + 1 - next.length : 0);
      recordAnswer({ kind: 'map', ref: target.cca3, label: target.name }, c.cca3 === target.cca3);
    }
  };
  const newPractice = () => { setPracticeTarget(shuffle(POOL.filter((c) => c !== practiceTarget))[0]); setGuesses([]); setMessage(''); };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Mystery country' }]} title="Mystery country">
        <p className="muted">Guess the hidden country in {MAX_GUESSES} tries. After each guess you'll see how far away the answer is and which way to go.</p>
      </PageHeader>
      <div className="container play-body">
        <div className="segmented" role="group" aria-label="Game mode">
          <button className={daily ? 'on' : ''} aria-pressed={daily} onClick={() => setParams({})}>Today's mystery</button>
          <button className={!daily ? 'on' : ''} aria-pressed={!daily} onClick={() => setParams({ mode: 'practice' })}>Practice</button>
        </div>

        <div className="quiz-card mystery">
          <div className="quiz-progress">
            <span>Guess {Math.min(guesses.length + (over ? 0 : 1), MAX_GUESSES)} of {MAX_GUESSES}</span>
            {daily && <span>A new mystery every day</span>}
          </div>

          {!over && (
            <>
              <CountrySearch label="Guess a country" placeholder="Type a country…" onPick={guess} />
              <div className="mystery-hints">
                {wrong >= 2 && <span className="sticker sticker-sun">Hint: it's in {target.region === 'Americas' ? 'the Americas' : target.region}</span>}
                {wrong < 2 && <span className="muted">Hint after 2 wrong guesses: the continent. After 4: the outline.</span>}
              </div>
              {wrong >= 4 && <Silhouette cca3={target.cca3} label="Hint: the outline of the mystery country" />}
            </>
          )}
          <p aria-live="polite" className="sr-only">{message}</p>

          {rows.length > 0 && (
            <div className="table-scroll"><table className="mystery-table">
              <caption className="sr-only">Your guesses</caption>
              <thead><tr><th scope="col">Guess</th><th scope="col" className="num">Distance</th><th scope="col">Direction</th><th scope="col" className="num col-close">Closeness</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.c.cca3} className={r.correct ? 'is-correct' : ''}>
                    <th scope="row">{r.c.name}</th>
                    <td className="num">{r.correct ? '—' : `${fmt.format(Math.round(r.km / 10) * 10)} km`}</td>
                    <td>{r.correct
                      ? <span className="dir"><Check size={18} aria-hidden="true" /> Found</span>
                      : <span className="dir"><ArrowUp size={18} aria-hidden="true" style={{ transform: `rotate(${Math.round(r.deg)}deg)` }} /> {compass(r.deg)}</span>}</td>
                    <td className="num col-close"><span className="closeness"><span style={{ width: `${r.score}%` }} /></span> {r.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}

          {over && (
            <div className="mystery-result" aria-live="polite">
              <h2>{won ? `You found it in ${guesses.length} guess${guesses.length > 1 ? 'es' : ''}!` : `It was ${target.name}.`}</h2>
              <Silhouette cca3={target.cca3} label={`The outline of ${target.name}`} />
              <div className="quiz-actions">
                <Link className="btn btn-primary" to={countryPath(target)}>Explore {target.name}</Link>
                {daily
                  ? <Link className="btn" to="/games/mystery?mode=practice">Practise with another</Link>
                  : <button className="btn" onClick={newPractice}><RotateCcw size={18} aria-hidden="true" /> Play again</button>}
              </div>
              {daily && <p className="muted">Come back tomorrow for a new mystery country.</p>}
            </div>
          )}
        </div>
        <SourceNote sources={['world-countries']}>Distances are measured between the approximate centre of each country, so neighbours can show a few hundred kilometres.</SourceNote>
      </div>
    </div>
  );
}
