import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuizRunner } from '../../components/QuizRunner';
import { RegionPicker } from '../../components/RegionPicker';
import { PageHeader, ButtonLink } from '../../components/ui';
import { countryPath } from '../../data/countries';
import { shuffle } from '../../lib/answers';
import { shuffleOptions, type Question } from '../../lib/quiz';
import { parseRegion, sovereignIn } from '../../lib/regions';

function build(key: Parameters<typeof sovereignIn>[0]): Question[] {
  const pool = sovereignIn(key).filter((c) => c.capital[0]);
  return shuffle(pool).slice(0, 10).map((c) => {
    const others = shuffle(pool.filter((x) => x !== c)).slice(0, 3).map((x) => x.capital[0]);
    return shuffleOptions({ q: `What is the capital of ${c.name}?`, options: [c.capital[0], ...others], answer: 0, link: countryPath(c) });
  });
}

export function Capitals() {
  const [params, setParams] = useSearchParams();
  const region = parseRegion(params.get('region'));
  const [round, setRound] = useState(0);
  const questions = useMemo(() => build(region.key), [region.key, round]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dark play-screen">
      <PageHeader dark crumbs={[{ to: '/games', label: 'Games' }, { label: 'Capitals' }]} title={`Capitals: ${region.label}`} />
      <div className="container play-body">
        <RegionPicker value={region.key} onChange={(k) => { setParams({ region: k }); setRound((r) => r + 1); }} />
        <QuizRunner key={`${region.key}-${round}`} questions={questions} gameId={`capitals-${region.key}`} onRestart={() => setRound((r) => r + 1)} resultsExtra={<ButtonLink to="/games">More games</ButtonLink>} />
      </div>
    </div>
  );
}
