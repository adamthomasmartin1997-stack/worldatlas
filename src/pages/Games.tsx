import { Link } from 'react-router-dom';
import { Keyboard, MousePointerClick, Building2, Flag, Shapes, Compass, ArrowUpDown, Route, ListOrdered, HelpCircle, Timer, Landmark } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, PageHeader } from '../components/ui';
import { useWeakCounts } from '../components/MistakeReview';
import { RotateCcw } from 'lucide-react';
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
  { id: 'who-am-i', icon: HelpCircle, title: 'Who am I?', text: 'Guess the country from as few clues as you can. Each clue is easier, but worth less.', regions: false, links: [{ to: '/games/who-am-i?level=easy', label: 'Easy' }, { to: '/games/who-am-i', label: 'Medium' }, { to: '/games/who-am-i?level=hard', label: 'Hard' }] },
  { id: 'border-chain', icon: Route, title: 'Border chain', text: 'Travel overland from one country to another, naming each neighbour along the way.', regions: false, links: [{ to: '/games/border-chain?level=easy', label: 'Easy' }, { to: '/games/border-chain', label: 'Medium' }, { to: '/games/border-chain?level=hard', label: 'Hard' }] },
  { id: 'which-came-first', icon: ListOrdered, title: 'Which came first?', text: 'Put four moments from history in order. Hard mode keeps them close together in time and place.', regions: false, links: [{ to: '/games/which-came-first?level=easy', label: 'Easy' }, { to: '/games/which-came-first', label: 'Medium' }, { to: '/games/which-came-first?level=hard', label: 'Hard' }] },
  { id: 'speed-round', icon: Timer, title: 'Speed round', text: '60 seconds of flags or capitals. A wrong answer costs three seconds.', regions: false, links: [{ to: '/games/speed-round?mode=flags', label: 'Flags' }, { to: '/games/speed-round?mode=capitals', label: 'Capitals' }] },
  { id: 'capitals', icon: Building2, title: 'Capitals', text: 'Pick the right capital city from four options. Ten questions, on easy, medium or hard.', regions: true, best: pct('capitals') },
  { id: 'find-on-map', icon: MousePointerClick, title: 'Find it on the map', text: 'We name a country, you click it. Ten rounds.', regions: true, best: pct('find-on-map') },
  { id: 'name-the-capitals', icon: Landmark, title: 'Name the capitals', text: 'Type every capital city you can before the clock runs out.', regions: true, best: (r) => { const b = getBest(`name-the-capitals-${r}`); return b == null ? null : String(b); } },
  { id: 'name-the-countries', icon: Keyboard, title: 'Name the countries', text: 'Type as many countries as you can before the clock runs out. They appear on the map as you go.', regions: true, best: (r) => { const b = getBest(`name-the-countries-${r}`); return b == null ? null : String(b); } },
];

const GROUPS = [
  { title: 'Puzzles', text: 'Think it through: clues, routes and timelines.', ids: ['mystery', 'who-am-i', 'border-chain', 'which-came-first'] },
  { title: 'Quick-fire quizzes', text: 'Four options, one right answer. Pick easy, medium or hard.', ids: ['flags', 'silhouettes', 'capitals', 'higher-lower', 'speed-round'] },
  { title: 'Map and typing games', text: 'Type or click your way around the map against the clock.', ids: ['find-on-map', 'name-the-countries', 'name-the-capitals'] },
];

/** A banner into the weak-spots review, shown once there's something on the list. */
function ReviewBanner() {
  const { total, due } = useWeakCounts();
  if (!total) return null;
  return (
    <Link to="/games/review" className="card review-banner">
      <span className="card-icon"><RotateCcw size={20} aria-hidden="true" /></span>
      <span><strong>{due ? `${due} weak spot${due === 1 ? '' : 's'} ready to review` : 'Your weak spots'}</strong><span className="muted"> · {total} in all. Things you got wrong come back until they stick.</span></span>
    </Link>
  );
}

export function Games() {
  return (
    <div className="dark play-screen">
      <PageHeader dark eyebrow="Games" title="Test yourself">
        <p className="muted">Pick a game and a region. Best scores are saved in this browser.</p>
      </PageHeader>
      <div className="container play-body">
        <ReviewBanner />
        {GROUPS.map((group) => (
          <section key={group.title} className="games-group" aria-labelledby={`g-${group.ids[0]}`}>
            <h2 id={`g-${group.ids[0]}`} className="section-title">{group.title}</h2>
            <p className="muted">{group.text}</p>
            <div className="grid grid-2">
              {group.ids.map((id) => GAMES.find((g) => g.id === id)!).map((g) => (
                <div key={g.id} className="card game-card">
                  <span className="card-icon"><g.icon size={20} aria-hidden="true" /></span>
                  <h3 className="card-title">{g.title}</h3>
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
            </div>
          </section>
        ))}
        <section className="games-group">
          <Card title="Country quizzes">
            <p className="muted">Every country profile has its own quizzes: geography (with easy, medium and hard), plus history, culture and sport where they've been written. Start with <Link to="/countries/fra/quiz/geography">France</Link>.</p>
          </Card>
        </section>
      </div>
    </div>
  );
}
