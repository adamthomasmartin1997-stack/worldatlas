import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Flag, Landmark, Gamepad2, BarChart3, ArrowRight, Target, Play, RotateCcw, CalendarDays } from 'lucide-react';
import { useWeakCounts } from '../components/MistakeReview';
import { useData } from '../components/useData';
import { ERAS, fmtRange, shortEraName } from '../data/eras';
import { WorldMap } from '../components/WorldMap';
import { CountrySearch } from '../components/CountrySearch';
import { ButtonLink, Card, SourceNote } from '../components/ui';
import { COUNTRIES, countryPath, getCountry, todaysCountry, type Country } from '../data/countries';
import { sovereignIn } from '../lib/regions';
import { fmtPeople } from '../lib/format';

const SECTIONS = [
  { to: '/explore', icon: Compass, title: 'Explore', text: 'Browse the world map region by region.' },
  { to: '/countries', icon: Flag, title: 'Countries', text: 'A profile for every country and territory.' },
  { to: '/history', icon: Landmark, title: 'History', text: 'Nine eras, thousands of events, and what happened at the same time.' },
  { to: '/games', icon: Gamepad2, title: 'Games', text: 'Map, typing, quiz and timeline games, plus your weak spots.' },
  { to: '/data', icon: BarChart3, title: 'Data', text: 'Compare countries with sourced numbers.' },
];

/** A neighbour to follow from today's country: a land neighbour if it has one, otherwise a country in the same subregion. */
function nextDoor(c: Country): Country | undefined {
  const byName = (a: Country, b: Country) => a.name.localeCompare(b.name);
  const neighbours = c.borders.map((b) => getCountry(b)!).filter((n) => n.sovereign).sort(byName);
  return neighbours[0] ?? COUNTRIES.filter((x) => x.sovereign && x.subregion === c.subregion && x.cca3 !== c.cca3).sort(byName)[0];
}

interface DayEvent { id: string; k: string; t: string; y: number; p?: string }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayKey = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * "On this day": the best-known events on today's date (public/data/on-this-day.json, a small file
 * built from the events). On a quiet day it takes in the days around it and says so.
 */
function OnThisDay() {
  const data = useData<{ days: Record<string, DayEvent[]> }>('on-this-day.json');
  const today = new Date();
  const picks = useMemo(() => {
    if (!data) return null;
    const exact = data.days[dayKey(today)] ?? [];
    if (exact.length >= 2) return { week: false, items: exact.map((e) => ({ ...e, date: today })) };
    const around = [0, -1, 1, -2, 2, -3, 3].flatMap((d) => {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
      return (data.days[dayKey(day)] ?? []).map((e) => ({ ...e, date: day }));
    });
    return { week: true, items: around.slice(0, 3) };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!picks || !picks.items.length) return null;
  const label = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return (
    <section className="card on-this-day" aria-labelledby="otd-h">
      <p className="eyebrow"><CalendarDays size={16} aria-hidden="true" /> {picks.week ? 'This week in history' : 'On this day'}</p>
      <h2 id="otd-h">{label(today)}</h2>
      <ul className="otd-list">
        {picks.items.map((e) => (
          <li key={e.id}>
            <span className="otd-year">{e.y}</span>
            <span><Link to={`/history/events/${e.id}`}>{e.t}</Link>{picks.week && <span className="muted"> · {label(e.date)}</span>}</span>
          </li>
        ))}
      </ul>
      <p className="otd-more"><Link className="text-link" to={`/history/meanwhile?year=${picks.items[0].y}`}>What else was happening in {picks.items[0].y}? <ArrowRight size={16} aria-hidden="true" /></Link></p>
    </section>
  );
}

/** A nudge back to the weak-spots review, once there is something to review. */
function WeakSpotsChip() {
  const { due } = useWeakCounts();
  if (!due) return null;
  return <Link to="/games/review" className="weak-chip"><RotateCcw size={16} aria-hidden="true" /> {due} weak spot{due === 1 ? '' : 's'} ready to review</Link>;
}

export function Home() {
  const navigate = useNavigate();
  const today = todaysCountry();
  const region = today.region.toLowerCase();
  const neighbour = nextDoor(today);
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
            <WeakSpotsChip />
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
          <Link to="/games/timeline?level=easy" className="card card-link game-tile">
            <span className="tag tag-coral">History game · new</span>
            <span className="card-title">Timeline builder</span>
            <span className="muted">Put five real events in order, from the pyramids to the World Cup</span>
          </Link>
          <Link to={`/games/find-on-map?region=${region}`} className="card card-link game-tile">
            <span className="tag tag-green">Map game</span>
            <span className="card-title">Find it on the map: {today.region}</span>
            <span className="muted">We name it, you tap it · 10 rounds</span>
          </Link>
          <Link to="/games/name-the-countries?region=europe" className="card card-link game-tile">
            <span className="tag tag-sun">Typing game</span>
            <span className="card-title">Name every country in Europe</span>
            <span className="muted">{europe} countries · 5 minutes on the clock</span>
          </Link>
        </div>
      </section>

      <section className="container section home-history" aria-labelledby="time-h">
        <div className="home-history-grid">
          <OnThisDay />
          <div className="card time-travel">
            <p className="eyebrow">History</p>
            <h2 id="time-h">Travel through time</h2>
            <p className="muted">Nine eras, from the first cities to today. Pick one to see what happened and who ruled.</p>
            <ol className="era-chips">
              {ERAS.map((e) => <li key={e.slug}><Link className="chip" to={`/history/eras/${e.slug}`}>{shortEraName(e)} <span className="chip-years">{fmtRange(e.from, e.to)}</span></Link></li>)}
            </ol>
            <p><Link className="text-link" to="/history/meanwhile?year=1453">Or pick any year and see the whole world at once <ArrowRight size={16} aria-hidden="true" /></Link></p>
          </div>
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
            <Card to={`${countryPath(today)}/history?at=timeline`} eyebrow="3 · History" title={`${today.name} through time`}>
              <p className="muted">Its story era by era, linked to the events that shaped it.</p>
            </Card>
          </li>
          <li>
            <Card to={`${countryPath(today)}/quiz/history`} eyebrow="4 · Quiz" title={`Test yourself on ${today.name}`}>
              <p className="muted">Geography, history, culture and sport quizzes.</p>
            </Card>
          </li>
        </ol>
        <p><Link className="text-link" to="/countries">Browse all countries <ArrowRight size={16} aria-hidden="true" /></Link></p>
      </section>
    </>
  );
}
