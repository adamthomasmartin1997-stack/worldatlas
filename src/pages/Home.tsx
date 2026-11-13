import { Link, useNavigate } from 'react-router-dom';
import { Compass, Flag, Landmark, Gamepad2, BarChart3, ArrowRight, Target, Play } from 'lucide-react';
import { WorldMap } from '../components/WorldMap';
import { CountrySearch } from '../components/CountrySearch';
import { ButtonLink, Card, SourceNote } from '../components/ui';
import { COUNTRIES, countryPath, getCountry, todaysCountry, type Country } from '../data/countries';
import { questionCount } from '../lib/quiz';
import { sovereignIn } from '../lib/regions';
import { fmtPeople } from '../lib/format';

const SECTIONS = [
  { to: '/explore', icon: Compass, title: 'Explore', text: 'Browse the world map region by region.' },
  { to: '/countries', icon: Flag, title: 'Countries', text: 'A profile for every country and territory.' },
  { to: '/history', icon: Landmark, title: 'History', text: 'Timelines and historical maps.' },
  { to: '/games', icon: Gamepad2, title: 'Games', text: 'Typing, map and quiz games.' },
  { to: '/data', icon: BarChart3, title: 'Data', text: 'Compare countries with sourced numbers.' },
];

/** A neighbour to follow from today's country: a land neighbour if it has one, otherwise a country in the same subregion. */
function nextDoor(c: Country): Country | undefined {
  const byName = (a: Country, b: Country) => a.name.localeCompare(b.name);
  const neighbours = c.borders.map((b) => getCountry(b)!).filter((n) => n.sovereign).sort(byName);
  return neighbours[0] ?? COUNTRIES.filter((x) => x.sovereign && x.subregion === c.subregion && x.cca3 !== c.cca3).sort(byName)[0];
}

export function Home() {
  const navigate = useNavigate();
  const today = todaysCountry();
  const region = today.region.toLowerCase();
  const neighbour = nextDoor(today);
  const regionCount = sovereignIn(region as Parameters<typeof sovereignIn>[0]).length;
  const geoQuestions = questionCount(today, 'geography');
  const europe = sovereignIn('europe').length;

  return (
    <>
      <section className="hero container" aria-labelledby="hero-h">
        <div className="hero-grid">
          <div className="hero-copy">
            <Link to={`/games/find-on-map?region=${region}&start=${today.cca3}`} className="sticker sticker-coral hero-sticker">
              <Target size={16} strokeWidth={2.5} aria-hidden="true" /> Today: can you find {today.name}?
            </Link>
            <h1 id="hero-h">Know the world better than your friends.</h1>
            <p className="hero-lede">Open any country, learn the good stuff, then prove it in quizzes and map games.</p>
            <CountrySearch placeholder="Search any country…" />
            <div className="hero-actions">
              <ButtonLink to={`/games/find-on-map?region=${region}&start=${today.cca3}`} variant="primary">
                <Play size={18} strokeWidth={2.5} aria-hidden="true" /> Play today's challenge
              </ButtonLink>
              <ButtonLink to="/explore">Explore the map</ButtonLink>
            </div>
          </div>

          <div className="hero-map">
            <div className="hero-map-stage">
            <WorldMap
              label={`World map with today's country, ${today.name}, highlighted. Select any country to open its profile, or use the search box.`}
              onSelect={(code) => navigate(`/countries/${code.toLowerCase()}`)}
              classFor={(code) => (code === today.cca3 ? 'active' : undefined)}
              pin={today.cca3}
            />
            <Link to={countryPath(today)} className="sticker hero-map-label">Today's country: {today.name}</Link>
            <div className="hero-map-facts">
              {today.capital[0] && <span className="sticker sticker-flat">Capital · {today.capital[0]}</span>}
              {today.population && <span className="sticker sticker-flat sticker-sun">{fmtPeople(today.population.value)} people</span>}
            </div>
            </div>
            <div className="map-caption">
              <span className="muted">Tap any country to open its profile</span>
              <SourceNote sources={today.population ? ['natural-earth', today.population.source] : ['natural-earth']} />
            </div>
          </div>
        </div>
      </section>

      <section className="container section home-games" aria-labelledby="games-h">
        <h2 id="games-h">Play now</h2>
        <div className="grid grid-3">
          <Link to="/games/name-the-countries?region=europe" className="card card-link game-tile">
            <span className="tag tag-sun">Typing game</span>
            <span className="card-title">Name every country in Europe</span>
            <span className="muted">{europe} countries · 5 minutes on the clock</span>
          </Link>
          <Link to={`/games/find-on-map?region=${region}`} className="card card-link game-tile">
            <span className="tag tag-green">Map game</span>
            <span className="card-title">Find it on the map: {today.region}</span>
            <span className="muted">We name it, you tap it · 10 rounds</span>
          </Link>
          <Link to="/games/capitals" className="card card-link game-tile">
            <span className="tag tag-ocean">Quiz</span>
            <span className="card-title">Capital cities</span>
            <span className="muted">Pick the right capital · 10 questions</span>
          </Link>
        </div>
      </section>

      <section className="container section home-sections" aria-labelledby="sections-h">
        <h2 id="sections-h">Where do you want to start?</h2>
        <div className="grid grid-5">
          {SECTIONS.map((s) => (
            <Card key={s.to} to={s.to} icon={s.icon} title={s.title}><p className="muted">{s.text}</p></Card>
          ))}
        </div>
      </section>

      <section className="container section" aria-labelledby="thread-h">
        <p className="eyebrow">Connected content</p>
        <h2 id="thread-h">Follow the thread from {today.name}</h2>
        <p className="muted prose">Every page leads somewhere else. Here's one path through the atlas, starting with today's country.</p>
        <ol className="thread">
          <li>
            <Card to={countryPath(today)} eyebrow="1 · Country profile" title={today.name}>
              <p className="muted">{today.capital[0] ? `Capital ${today.capital[0]}` : today.subregion ?? today.region}{today.borders.length ? ` · ${today.borders.length} land neighbour${today.borders.length > 1 ? 's' : ''}` : ''}</p>
            </Card>
          </li>
          {neighbour && (
            <li>
              <Card to={countryPath(neighbour)} eyebrow={today.borders.includes(neighbour.cca3) ? '2 · Next door' : '2 · Same region'} title={neighbour.name}>
                <p className="muted">{today.borders.includes(neighbour.cca3) ? `Shares a border with ${today.name}.` : `Also in ${today.subregion}.`}</p>
              </Card>
            </li>
          )}
          <li>
            <Card to={`${countryPath(today)}/quiz/geography`} eyebrow="3 · Quiz" title={`${today.name}: geography`}>
              <p className="muted">{geoQuestions} questions, built from real data.</p>
            </Card>
          </li>
          <li>
            <Card to={`/games/name-the-countries?region=${region}`} eyebrow="4 · Game" title={`Name every country in ${today.region}`}>
              <p className="muted">{regionCount} countries against the clock.</p>
            </Card>
          </li>
        </ol>
        <p><Link className="text-link" to="/countries">Browse all countries <ArrowRight size={16} aria-hidden="true" /></Link></p>
      </section>
    </>
  );
}
