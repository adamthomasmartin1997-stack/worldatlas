import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { CountryMap } from '../components/CountryMap';
import { FolderTabs, type FolderTab } from '../components/FolderTabs';
import { LineChart } from '../components/LineChart';
import { useSeries } from '../components/useSeries';
import { useUsStates, statePath } from '../components/usStates';
import { Breadcrumbs, ButtonLink, Card, SourceNote } from '../components/ui';
import { COUNTRIES, countryPath, fmt, getCountry, type Country } from '../data/countries';
import type { SourceId } from '../data/sources';
import { contentFor, type CountryContent, type Fact as WrittenFact } from '../content/countries';
import { TOPICS, questionCount, questionsFor, type Topic } from '../lib/quiz';
import { fmtCompact, fmtPeople, fmtUsd, fmtUsdAxis, fmtYears } from '../lib/format';
import { NotFound } from './NotFound';

type Row = { label: string; value: ReactNode };

function list(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
const names = (codes: string[]) => codes.map((b) => getCountry(b)).filter((x): x is Country => Boolean(x));
const year = (y?: number | null) => (y ? ` (${y})` : '');

/** "In numbers" overview for countries without a written one, so it doesn't repeat the hero summary. */
function numbersSummary(c: Country) {
  const parts: string[] = [];
  if (c.population && c.area) parts.push(`${c.name} is home to about ${fmtPeople(c.population.value)} people${c.population.year ? ` (${c.population.year})` : ''} and covers ${fmt.format(c.area.value)} km².`);
  else if (c.area) parts.push(`${c.name} covers ${fmt.format(c.area.value)} km².`);
  if (c.highestPoint) parts.push(`Its highest point is ${c.highestPoint.name}${c.highestPoint.elevation ? `, at ${fmt.format(c.highestPoint.elevation)} m` : ''}.`);
  if (c.lifeExpectancy) parts.push(`A baby born there today can expect to live to about ${Math.round(c.lifeExpectancy.value)}.`);
  if (c.gdpPerCapita) parts.push(`Its economy produces about ${fmtUsd(c.gdpPerCapita.value)} per person each year.`);
  return parts.join(' ') || undefined;
}

/** A short factual summary built only from data. */
function summary(c: Country) {
  const parts = [`${c.name} is ${c.sovereign ? 'a country' : `a ${c.status.toLowerCase()}`} in ${c.subregion ?? c.region}.`];
  if (c.capital[0]) parts.push(`Its capital is ${c.capital[0]}.`);
  if (c.borders.length) parts.push(`It shares land borders with ${list(names(c.borders).map((n) => n.name))}.`);
  else parts.push(c.landlocked ? 'It is landlocked.' : 'It has no land borders with other countries.');
  if (c.languages.length) parts.push(`${c.languages.length > 1 ? 'Official languages include' : 'The official language is'} ${list(c.languages.slice(0, 3))}.`);
  return parts.join(' ');
}

function Facts({ rows }: { rows: Row[] }) {
  return (
    <dl className="fact-grid">
      {rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
    </dl>
  );
}

function CountryChips({ codes }: { codes: string[] }) {
  const cs = names(codes);
  if (!cs.length) return null;
  return <div className="chip-row">{cs.map((n) => <Link key={n.cca3} to={countryPath(n)} className="chip">{n.name}</Link>)}</div>;
}

/** Paragraph + body for one folder tab, with an honest note on where the words came from. */
function Panel({ text, generated, content, children, sources, note }: { text?: string; generated?: string; content?: CountryContent; children?: ReactNode; sources?: SourceId[]; note?: string }) {
  return (
    <div className="panel-body">
      {(text || generated) && <p className="panel-text">{text ?? generated}</p>}
      {children}
      <div className="panel-sources">
        {sources && sources.length > 0 && <SourceNote sources={sources}>{note}</SourceNote>}
        {text && content && <p className="source-note">{content.status === 'draft' ? 'Written by Worldwise from published facts. Not yet checked against sources.' : `Written by Worldwise. Sources: ${content.sources?.join('; ')}`}</p>}
      </div>
    </div>
  );
}

const written = (facts?: WrittenFact[]): Row[] => (facts ?? []).map((f) => ({ label: f.label, value: f.value }));

export function CountryProfile() {
  const { code } = useParams();
  const c = getCountry(code);
  if (!c) return <NotFound />;
  return <Profile key={c.cca3} c={c} />;
}

function Profile({ c }: { c: Country }) {
  const content = contentFor(c.cca3);
  const { data: series } = useSeries(c.cca3, c.hasSeries);
  const neighbours = useMemo(() => names(c.borders).sort((a, b) => a.name.localeCompare(b.name)), [c]);
  const nearby = useMemo(() => COUNTRIES.filter((x) => x.subregion === c.subregion && x.cca3 !== c.cca3 && !c.borders.includes(x.cca3) && x.sovereign).slice(0, 6), [c]);

  const profileTabs: FolderTab[] = [
    { id: 'overview', label: 'Overview', color: 'white' },
    { id: 'geography', label: 'Geography', color: 'green' },
    { id: 'people', label: 'People', color: 'lime' },
    ...(content?.history ? [{ id: 'history', label: 'History', color: 'sun' } as FolderTab] : []),
    ...(content?.government ? [{ id: 'government', label: 'Government', color: 'sky' } as FolderTab] : []),
    { id: 'economy', label: 'Economy', color: 'leaf' },
    ...(content?.culture ? [{ id: 'culture', label: 'Culture', color: 'coral' } as FolderTab] : []),
    ...(content?.sport ? [{ id: 'sport', label: 'Sport', color: 'ocean' } as FolderTab] : []),
  ];
  const topics = (Object.keys(TOPICS) as Topic[]).filter((t) => questionCount(c, t) > 0);
  const topicColor: Record<Topic, FolderTab['color']> = { geography: 'green', history: 'sun', culture: 'coral', sport: 'ocean' };
  const gameTabs: FolderTab[] = [...topics.map((t) => ({ id: t, label: `${TOPICS[t].label} quiz`, color: topicColor[t] })), { id: 'map', label: 'Map games', color: 'white' }];

  const [tab, setTab] = useState('overview');
  const [game, setGame] = useState(gameTabs[0].id);
  const region = c.region.toLowerCase();
  const lifeStart = series?.series.lifeExpectancy?.[0];
  const popStart = series?.series.population?.[0];

  const panels: Record<string, ReactNode> = {
    overview: (
      <div className="panel-split">
        <Panel text={content?.overview?.join('\n\n')} generated={numbersSummary(c)} content={content} sources={content?.overview ? undefined : (['world-bank', 'wikidata'] as SourceId[])} />
        <Facts rows={[
          { label: 'Capital', value: c.capital.join(', ') || '—' },
          { label: `Population${year(c.population?.year)}`, value: c.population ? fmtPeople(c.population.value) : '—' },
          { label: 'Area', value: c.area ? `${fmt.format(c.area.value)} km²` : '—' },
          { label: 'Currency', value: c.currencies.map((x) => `${x.name} (${x.code})`).join(', ') || '—' },
          { label: c.languages.length > 1 ? 'Languages' : 'Language', value: c.languages.join(', ') || '—' },
          { label: 'Calling code', value: c.callingCode ?? '—' },
        ]} />
      </div>
    ),
    geography: (
      <Panel
        text={content?.geography?.text}
        generated={`${c.name} covers ${c.area ? `${fmt.format(c.area.value)} km²` : 'an unknown area'}${c.landlocked ? ' and has no coastline' : ''}.${c.highestPoint ? ` Its highest point is ${c.highestPoint.name}${c.highestPoint.elevation ? ` at ${fmt.format(c.highestPoint.elevation)} m` : ''}.` : ''} ${c.borders.length ? `It has ${c.borders.length} land neighbour${c.borders.length > 1 ? 's' : ''}.` : 'It has no land neighbours.'}`}
        content={content}
        sources={['world-countries', ...(c.area?.source === 'wikidata' || c.highestPoint ? (['wikidata'] as SourceId[]) : [])]}
        note={c.area?.source === 'wikidata' ? 'Area includes any overseas regions.' : undefined}
      >
        <div className="panel-split">
          <Facts rows={[
            { label: 'Area', value: c.area ? `${fmt.format(c.area.value)} km²` : '—' },
            ...(c.highestPoint ? [{ label: 'Highest point', value: `${c.highestPoint.name}${c.highestPoint.elevation ? `, ${fmt.format(c.highestPoint.elevation)} m` : ''}` }] : []),
            ...(c.lowestPoint ? [{ label: 'Lowest point', value: `${c.lowestPoint.name}${c.lowestPoint.elevation != null ? `, ${fmt.format(c.lowestPoint.elevation)} m` : ''}` }] : []),
            { label: c.landlocked ? 'Coastline' : c.seas.length > 1 ? 'Coasts' : 'Coast', value: c.landlocked ? 'None (landlocked)' : c.seas.length ? c.seas.join(', ') : 'Yes' },
            ...written(content?.geography?.facts),
            { label: 'Approx. centre', value: `${Math.abs(c.latlng[0])}°${c.latlng[0] >= 0 ? 'N' : 'S'}, ${Math.abs(c.latlng[1])}°${c.latlng[1] >= 0 ? 'E' : 'W'}` },
          ]} />
          <div>
            <h3 className="panel-h">{neighbours.length ? `${neighbours.length} land neighbour${neighbours.length > 1 ? 's' : ''}` : 'No land neighbours'}</h3>
            <CountryChips codes={neighbours.map((n) => n.cca3)} />
          </div>
        </div>
      </Panel>
    ),
    people: (
      <Panel
        text={content?.people?.text}
        generated={c.population ? `About ${fmtPeople(c.population.value)} people lived in ${c.name} in ${c.population.year ?? 'the latest count'}.${c.lifeExpectancy ? ` Life expectancy at birth was ${fmtYears(c.lifeExpectancy.value)} in ${c.lifeExpectancy.year}.` : ''}` : undefined}
        content={content}
        sources={c.population ? [c.population.source] : ['world-countries']}
      >
        <div className="panel-split panel-split-chart">
          <Facts rows={[
            ...(c.population ? [{ label: `Population${year(c.population.year)}`, value: fmtPeople(c.population.value) }] : []),
            ...(c.lifeExpectancy ? [{ label: `Life expectancy${year(c.lifeExpectancy.year)}`, value: <>{fmtYears(c.lifeExpectancy.value)}{lifeStart && <span className="fact-note"> ({lifeStart[1].toFixed(1)} in {lifeStart[0]})</span>}</> }] : []),
            ...(c.demonym ? [{ label: 'People are called', value: c.demonym }] : []),
            ...written(content?.people?.facts),
          ]} />
          {series?.series.population && (
            <LineChart title={popStart ? `Population since ${popStart[0]}` : 'Population'} data={series.series.population} format={fmtPeople} axisFormat={fmtCompact} />
          )}
        </div>
      </Panel>
    ),
    history: content?.history && (
      <Panel text={content.history.text} content={content}>
        <ol className="event-list">
          {content.history.events?.map((e) => (
            <li key={e.year + e.title} className="event">
              <span className="event-year">{e.year}</span>
              <span className="event-title">{e.title}</span>
              <span className="muted">{e.text}</span>
              {e.related && <CountryChips codes={e.related} />}
            </li>
          ))}
        </ol>
        <p className="muted">A full timeline is on the way. Each event will link to every country involved.</p>
      </Panel>
    ),
    government: content?.government && (
      <Panel text={content.government.text} content={content}>
        <div className="panel-split">
          <Facts rows={written(content.government.facts)} />
          {content.government.memberships && (
            <div>
              <h3 className="panel-h">Member of</h3>
              <div className="item-stack">{content.government.memberships.map((m) => <div key={m.title} className="item-card"><span className="item-title">{m.title}</span><span className="muted">{m.text}</span></div>)}</div>
            </div>
          )}
        </div>
      </Panel>
    ),
    economy: (
      <Panel
        text={content?.economy?.text}
        generated={c.gdp ? `${c.name}'s economy (GDP) was worth ${fmtUsd(c.gdp.value)} in ${c.gdp.year}${c.gdpPerCapita ? `, about ${fmtUsd(c.gdpPerCapita.value)} per person` : ''}.${c.currencies[0] ? ` It uses the ${c.currencies[0].name}.` : ''}` : c.currencies[0] ? `${c.name} uses the ${c.currencies[0].name}.` : undefined}
        content={content}
        sources={c.gdp ? ['world-bank'] : ['world-countries']}
        note={c.gdp ? 'Current US dollars, not adjusted for inflation.' : undefined}
      >
        <div className="panel-split panel-split-chart">
          <Facts rows={[
            ...(c.gdp ? [{ label: `GDP${year(c.gdp.year)}`, value: fmtUsd(c.gdp.value) }] : []),
            ...(c.gdpPerCapita ? [{ label: `GDP per person${year(c.gdpPerCapita.year)}`, value: fmtUsd(c.gdpPerCapita.value) }] : []),
            { label: 'Currency', value: c.currencies.map((x) => `${x.name} (${x.code})`).join(', ') || '—' },
            ...written(content?.economy?.facts),
          ]} />
          {series?.series.gdpPerCapita && (
            <LineChart title="GDP per person (current US$)" data={series.series.gdpPerCapita} format={fmtUsd} axisFormat={fmtUsdAxis} />
          )}
        </div>
      </Panel>
    ),
    culture: content?.culture && (
      <Panel text={content.culture.text} content={content}>
        <div className="item-grid">{content.culture.items?.map((i) => <div key={i.title} className="item-card"><span className="item-title">{i.title}</span><span className="muted">{i.text}</span></div>)}</div>
        {content.culture.related && <div><h3 className="panel-h">Connected countries</h3><CountryChips codes={content.culture.related} /></div>}
      </Panel>
    ),
    sport: content?.sport && (
      <Panel text={content.sport.text} content={content}>
        <div className="item-grid">{content.sport.items?.map((i) => <div key={i.title} className="item-card"><span className="item-title">{i.title}</span><span className="muted">{i.text}</span></div>)}</div>
        {content.sport.related && <div><h3 className="panel-h">Connected countries</h3><CountryChips codes={content.sport.related} /></div>}
      </Panel>
    ),
  };

  const gamePanel = () => {
    if (game === 'map') {
      return (
        <div className="grid grid-2">
          <Link to={`/games/find-on-map?region=${region}&start=${c.cca3}`} className="card card-link game-tile">
            <span className="tag tag-green">Map game · 10 rounds</span>
            <span className="card-title">Find it on the map: {c.region}</span>
            <span className="muted">Can you place {c.name} and its neighbours?</span>
          </Link>
          <Link to={`/games/name-the-countries?region=${region}`} className="card card-link game-tile">
            <span className="tag tag-sun">Typing game</span>
            <span className="card-title">Name every country in {c.region}</span>
            <span className="muted">How many can you name before the clock runs out?</span>
          </Link>
        </div>
      );
    }
    const t = game as Topic;
    const sample = questionsFor(c, t)[0];
    return (
      <div className="quiz-teaser">
        <div className="quiz-teaser-copy">
          <span className="tag">{questionCount(c, t)} questions</span>
          <span className="quiz-teaser-title">{c.name}: {TOPICS[t].label}</span>
          <span className="muted">{TOPICS[t].blurb}</span>
          <ButtonLink to={`${countryPath(c)}/quiz/${t}`} variant="primary"><Play size={18} strokeWidth={2.5} aria-hidden="true" /> Start quiz</ButtonLink>
        </div>
        {sample && (
          <div className="item-card sample-q">
            <span className="fact-note">A question from this quiz</span>
            <span className="sample-q-text">{sample.q}</span>
            <ul className="sample-q-options">{sample.options.map((o) => <li key={o}>{o}</li>)}</ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <section className="container country-hero" aria-labelledby="country-h">
        <div className="country-hero-copy">
          <Breadcrumbs items={[{ to: '/countries', label: 'Countries' }, { to: `/explore?region=${region}`, label: c.region }, { label: c.name }]} />
          <span className="sticker sticker-green">{c.subregion ?? c.region}</span>
          <h1 id="country-h">{c.name}</h1>
          {c.officialName !== c.name && <p className="country-official">{c.officialName}</p>}
          {!c.sovereign && <span className="tag">{c.status}</span>}
          <p className="country-summary">{summary(c)}</p>
          <div className="chip-row">
            {c.population && <span className="chip chip-static">{fmtPeople(c.population.value)} people<span className="fact-note">{year(c.population.year)}</span></span>}
            {c.area && <span className="chip chip-static">{fmt.format(c.area.value)} km²</span>}
            {c.currencies[0] && <span className="chip chip-static">{c.currencies[0].name}</span>}
          </div>
        </div>
        <figure className="country-hero-map">
          <CountryMap country={c} />
          <figcaption className="source-note">
            Map: Natural Earth (public domain). Cities: Wikidata (CC0).
          </figcaption>
        </figure>
      </section>

      {c.cca3 === 'USA' && <UsStateList />}

      <section className="container section" aria-labelledby="glance-h">
        <h2 id="glance-h">{c.name} at a glance</h2>
        <FolderTabs label={`${c.name} profile`} tabs={profileTabs} value={tab} onChange={setTab}>
          {panels[tab]}
        </FolderTabs>
      </section>

      <section className="container section" aria-labelledby="games-h">
        <h2 id="games-h">Think you know {c.name}?</h2>
        <FolderTabs label={`${c.name} games`} tabs={gameTabs} value={game} onChange={setGame}>
          {gamePanel()}
        </FolderTabs>
      </section>

      {nearby.length > 0 && (
        <section className="container section" aria-labelledby="nearby-h">
          <h2 id="nearby-h">Also in {c.subregion}</h2>
          <div className="grid grid-3">
            {nearby.map((n) => <Card key={n.cca3} to={countryPath(n)} title={n.name}><p className="muted">Capital: {n.capital[0] ?? '—'}</p></Card>)}
          </div>
          <p><Link className="text-link" to={`/explore?region=${region}`}>See all of {c.region} on the map <ArrowRight size={16} aria-hidden="true" /></Link></p>
        </section>
      )}
    </>
  );
}

/** Every US state as a link: the keyboard / screen-reader way into the state map. */
function UsStateList() {
  const { data } = useUsStates();
  if (!data) return null;
  return (
    <section className="container section" aria-labelledby="states-h">
      <h2 id="states-h">The 50 states and Washington, D.C.</h2>
      <p className="muted">Tap a state on the map, or pick one here.</p>
      <div className="state-list">{data.states.map((s) => <Link key={s.fips} to={statePath(s)} className="chip">{s.name}</Link>)}</div>
    </section>
  );
}
