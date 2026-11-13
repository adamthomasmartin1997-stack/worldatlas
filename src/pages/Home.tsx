import { Link, useNavigate } from 'react-router-dom';
import { Compass, Flag, Landmark, Gamepad2, BarChart3, ArrowRight, Target } from 'lucide-react';
import { WorldMap } from '../components/WorldMap';
import { CountrySearch } from '../components/CountrySearch';
import { ButtonLink, Card, SourceNote } from '../components/ui';
import { SOVEREIGN, countryPath, dailyIndex, getCountry } from '../data/countries';

const SECTIONS = [
  { to: '/explore', icon: Compass, title: 'Explore', text: 'Browse the world map region by region.' },
  { to: '/countries', icon: Flag, title: 'Countries', text: 'A profile for every country and territory.' },
  { to: '/history', icon: Landmark, title: 'History', text: 'Timelines and historical maps.' },
  { to: '/games', icon: Gamepad2, title: 'Games', text: 'Type, click and match your way round the map.' },
  { to: '/data', icon: BarChart3, title: 'Data', text: 'Compare countries with sourced statistics.' },
];

export function Home() {
  const navigate = useNavigate();
  const today = SOVEREIGN.filter((c) => c.hasShape)[dailyIndex(SOVEREIGN.filter((c) => c.hasShape).length)];
  const france = getCountry('FRA')!;

  return (
    <>
      <section className="dark hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Interactive world atlas</p>
            <h1>Explore the world, one country at a time.</h1>
            <p className="hero-lede">Click any country on the map to open its profile — then test what you've learned with quizzes and map games.</p>
            <CountrySearch />
          </div>
          <div className="hero-map">
            <WorldMap label="World map. Select a country to open its profile, or use the search box." onSelect={(code) => navigate(`/countries/${code.toLowerCase()}`)} />
            <div className="map-caption">
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Click a country to open its profile</span>
              <SourceNote sources={['natural-earth']} />
            </div>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="sections-h">
        <h2 id="sections-h">Where do you want to start?</h2>
        <div className="grid grid-5">
          {SECTIONS.map((s) => (
            <Card key={s.to} to={s.to} icon={s.icon} title={s.title}><p className="muted">{s.text}</p></Card>
          ))}
        </div>
      </section>

      <section className="section container challenge-wrap" aria-labelledby="challenge-h">
        <div className="challenge dark">
          <div>
            <p className="eyebrow"><Target size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Today's challenge</p>
            <h2 id="challenge-h">Can you find {today.name} on the map?</h2>
            <p className="muted">Then try to place every other country in {today.region}. A new country every day.</p>
            <div className="quiz-actions">
              <ButtonLink to={`/games/find-on-map?region=${today.region.toLowerCase()}&start=${today.cca3}`} variant="primary">Play today's challenge</ButtonLink>
              <ButtonLink to={countryPath(today)}>Read about {today.name}</ButtonLink>
            </div>
          </div>
          <div className="challenge-map">
            <WorldMap label={`Map of ${today.region}`} focus={SOVEREIGN.filter((c) => c.region === today.region).map((c) => c.cca3)} hideNames />
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="featured-h">
        <p className="eyebrow">Connected content</p>
        <h2 id="featured-h">Follow a thread: {france.name}</h2>
        <p className="muted prose">Every page leads somewhere else. Here's one path through the atlas.</p>
        <ol className="thread">
          <li><Card to={countryPath(france)} eyebrow="Country profile" title={france.name}><p className="muted">Capital {france.capital[0]}, {france.borders.length} land neighbours.</p></Card></li>
          <li><Card to="/countries/fra/quiz/history" eyebrow="Quiz" title="French history"><p className="muted">From the Bastille to D-Day.</p></Card></li>
          <li><Card to="/countries/deu" eyebrow="Neighbour" title="Germany"><p className="muted">Shares a border with France.</p></Card></li>
          <li><Card to="/games/name-the-countries?region=europe" eyebrow="Game" title="Name every country in Europe"><p className="muted">Type them all against the clock.</p></Card></li>
        </ol>
        <p><Link className="text-link" to="/countries">Browse all countries <ArrowRight size={16} aria-hidden="true" /></Link></p>
      </section>
    </>
  );
}
