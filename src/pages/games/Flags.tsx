import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuizRunner } from '../../components/QuizRunner';
import { RegionPicker } from '../../components/RegionPicker';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader, ButtonLink, SourceNote } from '../../components/ui';
import { countryPath } from '../../data/countries';
import { flagSimilarity, flagUrl, parseDifficulty, pickDistractors, pickTargets, type Difficulty } from '../../lib/difficulty';
import { shuffleOptions, type Question } from '../../lib/quiz';
import { parseRegion, sovereignIn, type RegionKey } from '../../lib/regions';

export type FlagMode = 'name' | 'pick';
const MODES: { key: FlagMode; label: string }[] = [
  { key: 'name', label: 'Name the flag' },
  { key: 'pick', label: 'Pick the flag' },
];

function build(key: RegionKey, level: Difficulty, mode: FlagMode): Question[] {
  const pool = sovereignIn(key).filter((c) => c.flag);
  const candidates = level === 'easy' ? sovereignIn('world').filter((c) => c.flag) : pool;
  return pickTargets(pool, level, 10).map((c) => {
    // On hard, wrong answers are flags that share colours with the right one.
    const others = pickDistractors(c, candidates, level, 3, level === 'hard' ? flagSimilarity : undefined);
    const all = [c, ...others];
    const base = { link: countryPath(c), answer: 0, options: all.map((x) => x.name) };
    return shuffleOptions(mode === 'name'
      ? { ...base, q: 'Which country does this flag belong to?', image: { src: flagUrl(c), alt: 'A national flag. Which country is it?' } }
      : { ...base, q: `Which is the flag of ${c.name}?`, optionImages: all.map(flagUrl) });
  });
}

export function Flags() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const level = parseDifficulty(params.get('level'));
  const mode: FlagMode = params.get('mode') === 'pick' ? 'pick' : 'name';
  const [round, setRound] = useState(0);
  const questions = useMemo(() => build(region.key, level, mode), [region.key, level, mode, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (next: Partial<{ region: string; level: string; mode: string }>) => { setParams({ region: region.key, level, mode, ...next }); setRound((r) => r + 1); };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Flags' }]} title={`Flags: ${region.label}`} />
      <div className="container play-body">
        <div className="segmented" role="group" aria-label="Game mode">
          {MODES.map((m) => <button key={m.key} className={mode === m.key ? 'on' : ''} aria-pressed={mode === m.key} onClick={() => set({ mode: m.key })}>{m.label}</button>)}
        </div>
        <RegionPicker value={region.key} onChange={(k) => set({ region: k })} />
        <DifficultyPicker value={level} onChange={(d) => set({ level: d })} />
        <QuizRunner key={`${region.key}-${level}-${mode}-${round}`} questions={questions} gameId={`flags-${mode}-${region.key}-${level}`} onRestart={() => setRound((r) => r + 1)} resultsExtra={<ButtonLink to="/games">More games</ButtonLink>} />
        <SourceNote sources={['flag-icons']}>Flags are shown at the same 4:3 shape, so a few (such as Nepal, Switzerland and Vatican City) look different from their real proportions.</SourceNote>
      </div>
    </div>
  );
}
