import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { RegionPicker } from '../../components/RegionPicker';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader, SourceNote } from '../../components/ui';
import { countryPath, fmt, type Country, type Fact } from '../../data/countries';
import type { SourceId } from '../../data/sources';
import { shuffle } from '../../lib/answers';
import { flagUrl, parseDifficulty, type Difficulty } from '../../lib/difficulty';
import { fmtPeople, fmtUsd, fmtYears } from '../../lib/format';
import { getBest, saveBest } from '../../lib/progress';
import { parseRegion, sovereignIn } from '../../lib/regions';

type MetricKey = 'population' | 'area' | 'lifeExpectancy' | 'gdpPerCapita' | 'internet' | 'forest' | 'co2';
const METRICS: Record<MetricKey, { label: string; question: string; get: (c: Country) => Fact | null; format: (v: number) => string; sources: SourceId[]; additive: boolean }> = {
  population: { label: 'Population', question: 'more people', get: (c) => c.population, format: (v) => `${fmtPeople(v)} people`, sources: ['world-bank'], additive: false },
  area: { label: 'Area', question: 'a bigger area', get: (c) => c.area, format: (v) => `${fmt.format(v)} km²`, sources: ['wikidata', 'world-countries'], additive: false },
  lifeExpectancy: { label: 'Life expectancy', question: 'a higher life expectancy', get: (c) => c.lifeExpectancy, format: fmtYears, sources: ['world-bank'], additive: true },
  gdpPerCapita: { label: 'Income per person', question: 'a higher GDP per person', get: (c) => c.gdpPerCapita, format: fmtUsd, sources: ['world-bank'], additive: false },
  internet: { label: 'Internet use', question: 'a bigger share of people online', get: (c) => c.indicators?.internet ?? null, format: (v) => `${Math.round(v)}% online`, sources: ['world-bank'], additive: true },
  forest: { label: 'Forest cover', question: 'more of its land covered by forest', get: (c) => c.indicators?.forest ?? null, format: (v) => `${Math.round(v)}% forest`, sources: ['world-bank'], additive: true },
  co2: { label: 'CO₂ per person', question: 'higher CO₂ emissions per person', get: (c) => c.indicators?.co2 ?? null, format: (v) => `${v.toFixed(1)} t CO₂`, sources: ['world-bank'], additive: false },
};

/**
 * How far apart the two values should be: easy pairs are very different, hard pairs are close.
 * Life expectancy is compared in years; the rest by ratio.
 */
function gapOk(a: number, b: number, level: Difficulty, additive: boolean) {
  if (a === b) return false;
  const gap = additive ? Math.abs(a - b) : Math.max(a, b) / Math.min(a, b);
  const [lo, hi] = additive
    ? ({ easy: [12, Infinity], medium: [4, 12], hard: [0.3, 4] } as const)[level]
    : ({ easy: [3, Infinity], medium: [1.3, 3], hard: [1.02, 1.3] } as const)[level];
  return gap >= lo && gap < hi;
}

function nextChallenger(current: Country, pool: Country[], metric: MetricKey, level: Difficulty, used: Set<string>) {
  const m = METRICS[metric];
  const a = m.get(current)!.value;
  const fresh = pool.filter((c) => c !== current && !used.has(c.cca3));
  const fitting = fresh.filter((c) => gapOk(a, m.get(c)!.value, level, m.additive));
  return shuffle(fitting.length ? fitting : fresh.filter((c) => m.get(c)!.value !== a))[0];
}

export function HigherLower() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const level = parseDifficulty(params.get('level'));
  const metric = (params.get('metric') as MetricKey) in METRICS ? (params.get('metric') as MetricKey) : 'population';
  const m = METRICS[metric];
  const pool = useMemo(() => sovereignIn(region.key).filter((c) => m.get(c)), [region.key, m]);
  const gameId = `higher-lower-${metric}-${region.key}-${level}`;

  const used = useRef(new Set<string>());
  const [pair, setPair] = useState<[Country, Country] | null>(null);
  const [answer, setAnswer] = useState<'right' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);

  const start = () => {
    used.current = new Set();
    const a = shuffle(pool)[0];
    used.current.add(a.cca3);
    const b = nextChallenger(a, pool, metric, level, used.current);
    used.current.add(b.cca3);
    setPair([a, b]); setAnswer(null); setStreak(0); setBest(getBest(gameId));
  };
  useEffect(start, [pool, metric, level]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (answer) nextBtn.current?.focus(); }, [answer]);

  if (!pair) return null;
  const [a, b] = pair;
  const va = m.get(a)!, vb = m.get(b)!;

  const guess = (higher: boolean) => {
    if (answer) return;
    const right = higher ? vb.value > va.value : vb.value < va.value;
    setAnswer(right ? 'right' : 'wrong');
    if (right) setStreak((s) => s + 1);
    else if (saveBest(gameId, streak)) setBest(streak);
  };
  const next = () => {
    const c = nextChallenger(b, pool, metric, level, used.current);
    if (!c) { start(); return; }
    used.current.add(c.cca3);
    setPair([b, c]); setAnswer(null);
  };
  const set = (next: Partial<{ region: string; level: string; metric: string }>) => setParams({ region: region.key, level, metric, ...next });
  const year = (f: Fact) => (f.year ? ` (${f.year})` : '');

  const Card = ({ c, f, hidden }: { c: Country; f: Fact; hidden: boolean }) => (
    <div className="hl-card">
      {c.flag && <img className="flag" src={flagUrl(c)} alt="" width={96} height={72} />}
      <h3 className="card-title">{c.name}</h3>
      <p className="hl-value">{hidden ? '?' : m.format(f.value)}</p>
      {!hidden && <p className="muted hl-year">{m.label}{year(f)}</p>}
    </div>
  );

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Higher or lower' }]} title={`Higher or lower: ${m.label}`}>
        <p className="muted">Does the second country have {m.question}? Keep going until you get one wrong.</p>
      </PageHeader>
      <div className="container play-body">
        <div className="segmented" role="group" aria-label="Compare by">
          {(Object.keys(METRICS) as MetricKey[]).map((k) => <button key={k} className={k === metric ? 'on' : ''} aria-pressed={k === metric} onClick={() => set({ metric: k })}>{METRICS[k].label}</button>)}
        </div>
        <RegionPicker value={region.key} onChange={(k) => set({ region: k })} />
        <DifficultyPicker blurbs={{ easy: 'The two numbers are far apart.', medium: 'The numbers are fairly close.', hard: 'The numbers are very close together.' }} value={level} onChange={(d) => set({ level: d })} />

        <div className="quiz-card">
          <div className="quiz-progress"><span>Streak {streak}</span>{best != null && <span>Best {best}</span>}</div>
          <div className="hl-pair">
            <Card c={a} f={va} hidden={false} />
            <Card c={b} f={vb} hidden={!answer} />
          </div>
          {!answer ? (
            <>
              <h2 className="quiz-question">Does {b.name} have {m.question} than {a.name}?</h2>
              <div className="quiz-actions">
                <button className="btn btn-primary" onClick={() => guess(true)}><ArrowUp size={18} aria-hidden="true" /> Higher</button>
                <button className="btn" onClick={() => guess(false)}><ArrowDown size={18} aria-hidden="true" /> Lower</button>
              </div>
            </>
          ) : (
            <div aria-live="polite">
              <div className={`quiz-feedback ${answer === 'right' ? 'correct' : 'incorrect'}`}>
                <strong>{answer === 'right' ? 'Correct.' : 'Not this time.'}</strong> {b.name}: {m.format(vb.value)}. {a.name}: {m.format(va.value)}.
              </div>
              {answer === 'right' ? (
                <div className="quiz-actions"><button ref={nextBtn} className="btn btn-primary" onClick={next}>Next country</button></div>
              ) : (
                <>
                  <h2 className="quiz-question">Your streak: {streak}</h2>
                  <div className="quiz-actions">
                    <button ref={nextBtn} className="btn btn-primary" onClick={start}><RotateCcw size={18} aria-hidden="true" /> Play again</button>
                    <Link className="btn" to={countryPath(b)}>Explore {b.name}</Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <SourceNote sources={m.sources}>Latest available year for each country, so years can differ slightly.</SourceNote>
      </div>
    </div>
  );
}
