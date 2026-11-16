import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuizRunner } from '../../components/QuizRunner';
import { RegionPicker } from '../../components/RegionPicker';
import { DifficultyPicker } from '../../components/DifficultyPicker';
import { PageHeader, ButtonLink, SourceNote } from '../../components/ui';
import { countryPath } from '../../data/countries';
import { parseDifficulty, pickDistractors, pickTargets, sizeSimilarity, type Difficulty } from '../../lib/difficulty';
import { shuffleOptions, type Question } from '../../lib/quiz';
import { parseRegion, sovereignIn, type RegionKey } from '../../lib/regions';

// Tiny countries are just dots at any scale, so they're left out of this game.
const playable = (key: RegionKey) => sovereignIn(key).filter((c) => c.hasShape && (c.area?.value ?? 0) > 1000);

function build(key: RegionKey, level: Difficulty): Question[] {
  const pool = playable(key);
  const candidates = level === 'easy' ? playable('world') : pool;
  return pickTargets(pool, level, 10).map((c) => {
    const others = pickDistractors(c, candidates, level, 3, level === 'hard' ? sizeSimilarity : undefined);
    return shuffleOptions({ q: 'Which country has this shape?', shape: c.cca3, options: [c, ...others].map((x) => x.name), answer: 0, link: countryPath(c) });
  });
}

export function Silhouettes() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const level = parseDifficulty(params.get('level'));
  const [round, setRound] = useState(0);
  const questions = useMemo(() => build(region.key, level), [region.key, level, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (next: Partial<{ region: string; level: string }>) => { setParams({ region: region.key, level, ...next }); setRound((r) => r + 1); };

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Silhouettes' }]} title={`Silhouettes: ${region.label}`}>
        <p className="muted">Name the country from its outline alone. Far-off islands and overseas regions are left out.</p>
      </PageHeader>
      <div className="container play-body">
        <RegionPicker value={region.key} onChange={(k) => set({ region: k })} />
        <DifficultyPicker value={level} onChange={(d) => set({ level: d })} />
        <QuizRunner key={`${region.key}-${level}-${round}`} questions={questions} gameId={`silhouettes-${region.key}-${level}`} onRestart={() => setRound((r) => r + 1)} resultsExtra={<ButtonLink to="/games">More games</ButtonLink>} />
        <SourceNote sources={['natural-earth']}>Outlines are not to scale with each other.</SourceNote>
      </div>
    </div>
  );
}
