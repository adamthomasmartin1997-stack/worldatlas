import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, SkipForward } from 'lucide-react';
import { CountrySearch } from '../../components/CountrySearch';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader, SourceNote } from '../../components/ui';
import { SOVEREIGN, countryPath, fmt, getCountry, type Country } from '../../data/countries';
import { neighbours } from '../../lib/borders';
import { flagUrl, parseDifficulty, pickTargets } from '../../lib/difficulty';
import { fmtPeople } from '../../lib/format';
import { saveBest } from '../../lib/progress';
import { recordAnswer } from '../../lib/review';

const ROUNDS = 5;

function list(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Hide words that would give the answer away (the country's names and demonym). */
function redact(text: string, c: Country) {
  const words = [c.name, c.officialName, c.demonym, ...c.altNames].filter((w): w is string => Boolean(w && w.length > 3));
  return words.sort((a, b) => b.length - a.length).reduce((t, w) => t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '▇▇▇'), text);
}

/** Five clues from hardest to easiest, all built from the site's data. */
function cluesFor(c: Country): string[] {
  const clues: string[] = [];
  if (c.population && c.area) clues.push(`About ${fmtPeople(c.population.value)} people live in my ${fmt.format(c.area.value)} km².`);
  const g = c.government;
  if (g?.headOfState) clues.push(redact(g.headOfState === g.headOfGovernment ? `My leader is the ${g.headOfState}, who is head of state and government.` : `My head of state is the ${g.headOfState}.`, c));
  if (c.languages.length || c.currencies.length) {
    clues.push(redact(`${c.languages.length ? `People here speak ${list(c.languages.slice(0, 3))}` : 'People here'}${c.currencies[0] ? `${c.languages.length ? ', and' : ''} pay with the ${c.currencies[0].name}` : ''}.`, c));
  }
  const ns = neighbours(c).map((n) => getCountry(n)!.name);
  clues.push(ns.length ? `I share land borders with ${ns.length} countr${ns.length > 1 ? 'ies' : 'y'}, including ${list(ns.slice(0, 2))}.` : `I have no land borders. I'm in ${c.subregion ?? c.region}.`);
  if (c.capital[0]) clues.push(`My capital is ${c.capital[0]}.`);
  return clues.slice(0, 5);
}

export function WhoAmI() {
  const [params, setParams] = useSearchParams();
  const level = parseDifficulty(params.get('level'));
  const [game, setGame] = useState(0);
  const targets = useMemo(() => pickTargets(SOVEREIGN.filter((c) => c.capital[0] && c.population), level, ROUNDS), [level, game]);
  const [r, setR] = useState(0);
  const [shown, setShown] = useState(1);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const target = targets[r];
  const clues = useMemo(() => cluesFor(target), [target]);
  const points = clues.length + 1 - shown;

  const restart = (l = level) => { setParams({ level: l }); setGame((g) => g + 1); setR(0); setShown(1); setWrong([]); setSolved(null); setScore(0); setDone(false); };
  const guess = (c: Country) => {
    if (solved !== null) return;
    const review = { kind: 'map' as const, ref: target.cca3, label: target.name };
    if (c.cca3 === target.cca3) { setSolved(true); setScore((s) => s + points); recordAnswer(review, true); return; }
    setWrong((w) => [...w, c.name]);
    // Not found after every clue: it goes on the weak-spots list, to come back as a map question.
    if (shown >= clues.length) { setSolved(false); recordAnswer(review, false); } else setShown(shown + 1);
  };
  const next = () => {
    if (r + 1 >= ROUNDS) { setDone(true); saveBest(`who-am-i-${level}`, Math.round((score / (ROUNDS * 5)) * 100)); return; }
    setR(r + 1); setShown(1); setWrong([]); setSolved(null);
  };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Who am I?' }]} title="Who am I?">
        <p className="muted">Guess the country from as few clues as you can. Each new clue is easier, but worth one point less.</p>
      </PageHeader>
      <div className="container play-body">
        <DifficultyPicker blurbs={{ easy: 'Well-known countries.', medium: 'Any country.', hard: 'Lesser-known countries.' }} value={level} onChange={(d) => restart(d)} />
        <div className="quiz-card who">
          {done ? (
            <div aria-live="polite">
              <p className="eyebrow">Results</p>
              <h2>You scored {score} of {ROUNDS * 5} points</h2>
              <div className="quiz-actions"><button className="btn btn-primary" onClick={() => restart()}><RotateCcw size={18} aria-hidden="true" /> Play again</button><Link className="btn" to="/games">More games</Link></div>
            </div>
          ) : (
            <>
              <div className="quiz-progress"><span>Country {r + 1} of {ROUNDS}</span><span>Score {score}</span></div>
              <ol className="clue-list" aria-live="polite">
                {clues.slice(0, solved === null ? shown : clues.length).map((clue, i) => (
                  <li key={i} className={i >= shown ? 'is-extra' : ''}><span className="clue-points">{clues.length - i} pt{clues.length - i > 1 ? 's' : ''}</span>{clue}</li>
                ))}
              </ol>
              {wrong.length > 0 && <p className="muted">Not: {wrong.join(', ')}</p>}
              {solved === null ? (
                <>
                  <CountrySearch label="Guess the country" placeholder="Who am I? Type a country…" onPick={guess} />
                  <div className="quiz-actions">
                    <button className="btn" onClick={() => (shown < clues.length ? setShown(shown + 1) : setSolved(false))}><SkipForward size={18} aria-hidden="true" /> {shown < clues.length ? 'Another clue' : 'Reveal'}</button>
                  </div>
                </>
              ) : (
                <div className={`quiz-feedback ${solved ? 'correct' : 'incorrect'}`} aria-live="polite">
                  <div className="who-answer">
                    {target.flag && <img className="flag" src={flagUrl(target)} alt="" width={64} height={48} />}
                    <span><strong>{solved ? `Yes, it's ${target.name}! +${points}` : `It was ${target.name}.`}</strong> <Link to={countryPath(target)}>Explore {target.name}</Link></span>
                  </div>
                </div>
              )}
              {solved !== null && <div className="quiz-actions"><button className="btn btn-primary" onClick={next}>{r + 1 < ROUNDS ? 'Next country' : 'See results'}</button></div>}
            </>
          )}
        </div>
        <SourceNote sources={['world-bank', 'wikidata', 'world-countries']}>Clues are built from each country's data. Words that would give the answer away are hidden.</SourceNote>
      </div>
    </div>
  );
}
