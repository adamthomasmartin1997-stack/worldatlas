import { Link } from 'react-router-dom';
import { Keyboard, MousePointerClick, Building2, Flag, Shapes, Compass, ArrowUpDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, PageHeader } from '../components/ui';
import { getBest } from '../lib/progress';
import { REGION_OPTIONS } from '../lib/regions';

type Game = { id: string; icon: LucideIcon; title: string; text: string; regions: boolean; best?: (region: string) => string | null; links?: { to: string; label: string }[] };

const pct = (id: string) => (r: string) => {
  const b = getBest(`${id}-${r}`) ?? getBest(`${id}-${r}-medium`) ?? getBest(`${id}-name-${r}-medium`);
  return b == null ? null : `${b}%`;
};

const GAMES: Game[] = [
  { id: 'mystery', icon: Compass, title: 'Mystery country', text: 'Guess the hidden country in six tries. Each guess tells you how far away it is and which way to go. A new one every day.', regions: false, links: [{ to: '/games/mystery', label: "Today's mystery" }, { to: '/games/mystery?mode=practice', label: 'Practice' }] },
  { id: 'flags', icon: Flag, title: 'Flags', text: 'Name the country from its flag, or pick the right flag from four. Hard mode uses look-alike flags.', regions: true, best: pct('flags') },
  { id: 'silhouettes', icon: Shapes, title: 'Silhouettes', text: 'Name the country from its outline alone. Hard mode picks neighbours of a similar size.', regions: true, best: pct('silhouettes') },
  { id: 'higher-lower', icon: ArrowUpDown, title: 'Higher or lower', text: 'More people? Bigger? Longer lives? Compare real numbers and keep your streak going.', regions: true, best: (r) => { const b = getBest(`higher-lower-population-${r}-medium`); return b == null ? null : `streak ${b}`; } },
  { id: 'capitals', icon: Building2, title: 'Capitals', text: 'Pick the right capital city from four options. Ten questions, on easy, medium or hard.', regions: true, best: pct('capitals') },
  { id: 'find-on-map', icon: MousePointerClick, title: 'Find it on the map', text: 'We name a country, you click it. Ten rounds.', regions: true, best: pct('find-on-map') },
  { id: 'name-the-countries', icon: Keyboard, title: 'Name the countries', text: 'Type as many countries as you can before the clock runs out. They appear on the map as you go.', regions: true, best: (r) => { const b = getBest(`name-the-countries-${r}`); return b == null ? null : String(b); } },
];

export function Games() {
  return (
    <div className="dark play-screen">
      <PageHeader dark eyebrow="Games" title="Test yourself">
        <p className="muted">Pick a game and a region. Best scores are saved in this browser.</p>
      </PageHeader>
      <div className="container play-body">
        <div className="grid grid-2">
          {GAMES.map((g) => (
            <div key={g.id} className="card game-card">
              <span className="card-icon"><g.icon size={20} aria-hidden="true" /></span>
              <h2 className="card-title">{g.title}</h2>
              <p className="muted">{g.text}</p>
              {g.regions ? (
                <>
                  <p className="eyebrow">Choose a region</p>
                  <ul className="chip-links">
                    {REGION_OPTIONS.map((r) => {
                      const best = g.best?.(r.key);
                      return <li key={r.key}><Link to={`/games/${g.id}?region=${r.key}`}>{r.label}{best && <span className="best"> · best {best}</span>}</Link></li>;
                    })}
                  </ul>
                </>
              ) : (
                <ul className="chip-links">{g.links!.map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}</ul>
              )}
            </div>
          ))}
          <Card title="Country quizzes">
            <p className="muted">Every country profile has its own quizzes: geography (with easy, medium and hard), plus history, culture and sport where they've been written. Start with <Link to="/countries/fra/quiz/geography">France</Link>.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
