import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuizRunner } from '../../components/QuizRunner';
import { RegionPicker } from '../../components/RegionPicker';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader, ButtonLink } from '../../components/ui';
import { countryPath } from '../../data/countries';
import { parseDifficulty, pickDistractors, pickTargets, type Difficulty } from '../../lib/difficulty';
import { shuffleOptions, type Question } from '../../lib/quiz';
import { parseRegion, sovereignIn, type RegionKey } from '../../lib/regions';

function build(key: RegionKey, level: Difficulty): Question[] {
  const pool = sovereignIn(key).filter((c) => c.capital[0]);
  return pickTargets(pool, level, 10).map((c) => {
    // Distractors come from the whole world on easy, so a region game doesn't run out of far-away options.
    const candidates = level === 'easy' ? sovereignIn('world').filter((x) => x.capital[0]) : pool;
    const others = pickDistractors(c, candidates, level).map((x) => x.capital[0]).filter((cap) => cap !== c.capital[0]);
    return shuffleOptions({ q: `What is the capital of ${c.name}?`, options: [c.capital[0], ...new Set(others)], answer: 0, link: countryPath(c), explain: `${c.capital[0]} is the capital of ${c.name}.` });
  });
}

export function Capitals() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const level = parseDifficulty(params.get('level'));
  const [round, setRound] = useState(0);
  const questions = useMemo(() => build(region.key, level), [region.key, level, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (next: Partial<{ region: string; level: string }>) => { setParams({ region: region.key, level, ...next }); setRound((r) => r + 1); };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Capitals' }]} title={`Capitals: ${region.label}`} />
      <div className="container play-body">
        <RegionPicker value={region.key} onChange={(k) => set({ region: k })} />
        <DifficultyPicker value={level} onChange={(d) => set({ level: d })} />
        <QuizRunner key={`${region.key}-${level}-${round}`} questions={questions} gameId={`capitals-${region.key}-${level}`} onRestart={() => setRound((r) => r + 1)} resultsExtra={<ButtonLink to="/games">More games</ButtonLink>} />
      </div>
    </div>
  );
}
