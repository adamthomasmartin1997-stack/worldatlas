import { Link } from 'react-router-dom';
import { Keyboard, MousePointerClick, Building2 } from 'lucide-react';
import { Card, PageHeader } from '../components/ui';
import { getBest } from '../lib/progress';
import { REGION_OPTIONS } from '../lib/regions';

const GAMES = [
  { id: 'name-the-countries', icon: Keyboard, title: 'Name the countries', text: 'Type as many countries as you can before the clock runs out. They appear on the map as you go.' },
  { id: 'find-on-map', icon: MousePointerClick, title: 'Find it on the map', text: 'We name a country, you click it. Ten rounds.' },
  { id: 'capitals', icon: Building2, title: 'Capitals', text: 'Pick the right capital city from four options. Ten questions.' },
];

export function Games() {
  return (
    <div className="dark play-screen">
      <PageHeader dark eyebrow="Games" title="Test yourself">
        <p className="muted">Pick a game and a region. Best scores are saved in this browser.</p>
      </PageHeader>
      <div className="container play-body">
        <div className="grid grid-3">
          {GAMES.map((g) => (
            <div key={g.id} className="card game-card">
              <span className="card-icon"><g.icon size={20} aria-hidden="true" /></span>
              <h2 className="card-title">{g.title}</h2>
              <p className="muted">{g.text}</p>
              <p className="eyebrow">Choose a region</p>
              <ul className="chip-links">
                {REGION_OPTIONS.map((r) => {
                  const best = getBest(`${g.id}-${r.key}`);
                  return <li key={r.key}><Link to={`/games/${g.id}?region=${r.key}`}>{r.label}{best != null && <span className="best"> · best {best}{g.id === 'name-the-countries' ? '' : '%'}</span>}</Link></li>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-8)' }}>
          <Card title="Country quizzes">
            <p className="muted">Every country profile has its own geography quiz, plus history, culture and sport quizzes where they've been written. Start with <Link to="/countries/fra/quiz/history">France</Link>.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
