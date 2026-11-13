import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Mountain, Landmark, Users, LineChart, HelpCircle, ArrowRight } from 'lucide-react';
import { WorldMap } from '../components/WorldMap';
import { Card, PageHeader, Placeholder, PlaceholderTag, SourceNote } from '../components/ui';
import { COUNTRIES, countryPath, fmt, getCountry, type Country } from '../data/countries';
import { TOPICS, questionCount, type Topic } from '../lib/quiz';
import { NotFound } from './NotFound';

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'geography', label: 'Geography', icon: Mountain },
  { id: 'history', label: 'History', icon: Landmark },
  { id: 'people', label: 'People & culture', icon: Users },
  { id: 'data', label: 'Population & economy', icon: LineChart },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
];

function list(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** A factual opening paragraph generated from data, until an editor writes the real one. */
function summary(c: Country) {
  const parts = [`${c.name} is ${c.sovereign ? 'a country' : `a ${c.status.toLowerCase()}`} in ${c.subregion ?? c.region}.`];
  if (c.capital[0]) parts.push(`Its capital is ${c.capital[0]}.`);
  if (c.borders.length) parts.push(`It shares land borders with ${list(c.borders.map((b) => getCountry(b)!.name))}.`);
  else parts.push(c.landlocked ? 'It is landlocked.' : 'It has no land borders with other countries.');
  if (c.languages.length) parts.push(`${c.languages.length > 1 ? 'Official languages include' : 'The official language is'} ${list(c.languages.slice(0, 3))}.`);
  return parts.join(' ');
}

export function CountryProfile() {
  const { code } = useParams();
  const c = getCountry(code);
  const neighbours = useMemo(() => (c ? c.borders.map((b) => getCountry(b)!).sort((a, b) => a.name.localeCompare(b.name)) : []), [c]);
  const nearby = useMemo(() => (c ? COUNTRIES.filter((x) => x.subregion === c.subregion && x.cca3 !== c.cca3 && !c.borders.includes(x.cca3) && x.sovereign).slice(0, 6) : []), [c]);
  const focus = useMemo(() => (c ? [c.cca3, ...c.borders] : []), [c]);
  if (!c) return <NotFound />;

  const facts: [string, string][] = [
    ['Capital', c.capital.join(', ') || '—'],
    ['Region', c.subregion ?? c.region],
    ['Area', c.area ? `${fmt.format(c.area)} km²` : '—'],
    ['Population', c.population ? `${fmt.format(c.population)}${c.populationYear ? ` (${c.populationYear})` : ''}` : 'Awaiting data import'],
    ['Languages', c.languages.join(', ') || '—'],
    ['Currency', c.currencies.map((x) => `${x.name} (${x.code})`).join(', ') || '—'],
  ];

  return (
    <>
      <div className="dark">
        <div className="container profile-hero">
          <PageHeader crumbs={[{ to: '/countries', label: 'Countries' }, { to: `/explore?region=${c.region.toLowerCase()}`, label: c.region }, { label: c.name }]} eyebrow={c.subregion ?? c.region} title={c.name} dark>
            {c.officialName !== c.name && <p className="muted">{c.officialName}</p>}
            {!c.sovereign && <p className="tag">{c.status}</p>}
          </PageHeader>
          <div className="profile-map">
            {c.hasShape ? (
              <WorldMap label={`Map showing ${c.name} and its neighbours`} focus={focus} classFor={(x) => (x === c.cca3 ? 'active' : undefined)} aspect={0.62} />
            ) : (
              <div className="map-frame map-loading">No map shape available for {c.name} at this scale</div>
            )}
            <SourceNote sources={['natural-earth']} />
          </div>
        </div>
      </div>

      <section className="facts-strip" aria-label="Key facts">
        <div className="container">
          <dl className="facts">
            {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          <SourceNote sources={c.population ? ['world-countries', 'wikidata'] : ['world-countries']} />
        </div>
      </section>

      <div className="container profile-body">
        <aside className="profile-toc" aria-label="On this page">
          <p className="eyebrow">On this page</p>
          <ul>{SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}><s.icon size={16} aria-hidden="true" /> {s.label}</a></li>)}</ul>
        </aside>

        <article className="profile-article">
          <section id="overview">
            <h2>Overview</h2>
            <p className="lead prose">{summary(c)}</p>
            <Placeholder title="Editorial introduction">
              <p>A written introduction to {c.name} goes here: what makes it distinctive, in three or four short paragraphs. Add it in <code>src/content/countries/{c.cca3.toLowerCase()}.md</code> (not yet wired up).</p>
            </Placeholder>
          </section>

          <section id="geography">
            <h2>Geography</h2>
            <dl className="detail-list">
              <div><dt>Coastline</dt><dd>{c.landlocked ? 'Landlocked' : 'Has a coastline'}</dd></div>
              <div><dt>Coordinates (approx. centre)</dt><dd>{c.latlng[0]}°, {c.latlng[1]}°</dd></div>
              <div><dt>Land borders</dt><dd>{neighbours.length ? neighbours.map((n, i) => <span key={n.cca3}>{i > 0 && ', '}<Link to={countryPath(n)}>{n.name}</Link></span>) : 'None'}</dd></div>
              <div><dt>Internet domain · Calling code</dt><dd>{c.tld.join(', ') || '—'} · {c.callingCode ?? '—'}</dd></div>
            </dl>
            <SourceNote sources={['world-countries']} />
            <Placeholder title="Physical geography">
              <p>Landscapes, rivers, mountains and climate, with a relief map. Needs written content and an elevation dataset.</p>
            </Placeholder>
          </section>

          <section id="history">
            <h2>History</h2>
            <Placeholder title="Historical timeline">
              <p>A scrollable timeline of key events, each linking to a History page and a historical map. Events will be stored as structured data (date, title, summary, related countries) so they can appear on every country involved.</p>
            </Placeholder>
          </section>

          <section id="people">
            <h2>People &amp; culture</h2>
            {c.demonym && <p>People from {c.name} are called <strong>{c.demonym}</strong>.</p>}
            <Placeholder title="Culture, food, sport and notable people">
              <p>Short sections with images under open licences (e.g. Wikimedia Commons, credited individually).</p>
            </Placeholder>
          </section>

          <section id="data">
            <h2>Population &amp; economy</h2>
            <Placeholder title="Charts appear once real data is imported">
              <p>Population and GDP over time from World Bank Open Data (CC BY 4.0). No chart is shown until the data is real. Run <code>npm run data:fetch</code> to start with Wikidata population figures.</p>
            </Placeholder>
          </section>

          <section id="quizzes">
            <h2>Test yourself on {c.name}</h2>
            <div className="grid grid-2">
              {(Object.keys(TOPICS) as Topic[]).map((t) => {
                const n = questionCount(c, t);
                return n ? (
                  <Card key={t} to={`${countryPath(c)}/quiz/${t}`} eyebrow={`${n} questions`} title={`${c.name}: ${TOPICS[t].label}`}><p className="muted">{TOPICS[t].blurb}</p></Card>
                ) : (
                  <div key={t} className="card card-disabled">
                    <p className="eyebrow">No questions yet</p>
                    <h3 className="card-title">{TOPICS[t].label}</h3>
                    <p className="muted">{TOPICS[t].label} questions for {c.name} haven't been written yet.</p>
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: 'var(--space-6)' }}>
              <Link className="text-link" to={`/games/name-the-countries?region=${c.region.toLowerCase()}`}>Can you name every country in {c.region}? <ArrowRight size={16} aria-hidden="true" /></Link>
            </p>
          </section>

          {nearby.length > 0 && (
            <section>
              <h2>Also in {c.subregion}</h2>
              <div className="grid grid-3">
                {nearby.map((n) => <Card key={n.cca3} to={countryPath(n)} title={n.name}><p className="muted">Capital: {n.capital[0] ?? '—'}</p></Card>)}
              </div>
            </section>
          )}
          <p className="muted" style={{ marginTop: 'var(--space-8)' }}><PlaceholderTag /> Dashed boxes mark sections still to be written.</p>
        </article>
      </div>
    </>
  );
}
