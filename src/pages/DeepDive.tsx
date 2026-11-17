import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Play } from 'lucide-react';
import { Breadcrumbs, ButtonLink } from '../components/ui';
import { WorldCompare } from '../components/WorldCompare';
import { Bars, Calendar, CardGroups, CityBars, HeritageMap, JobsBars, PinMap, PopulationPyramid, Steps } from '../components/DeepExtras';
import { COUNTRIES, countryPath, getCountry, type Country } from '../data/countries';
import type { ReactNode } from 'react';
import { DEEP_SECTIONS, SECTION_LABEL, deepTitle, nameInSentence, hasDeepDive, isDeepSection, loadDeepDive, readingMinutes, type DeepDive as Deep, type DeepSection } from '../content/deep';
import { TOPICS, questionCount, type Topic } from '../lib/quiz';
import { flagUrl } from '../lib/difficulty';
import { NotFound } from './NotFound';

/** A long read on one part of a country (History of France, …), opened from the profile's tabs. */
export function DeepDive() {
  const { code, section } = useParams();
  const c = getCountry(code);
  if (!c || !isDeepSection(section) || !hasDeepDive(c.cca3, section)) return <NotFound />;
  return <DeepPage key={`${c.cca3}-${section}`} c={c} section={section} />;
}

function CountryLinks({ codes }: { codes?: string[] }) {
  const cs = (codes ?? []).map((k) => getCountry(k)).filter((x): x is Country => Boolean(x));
  if (!cs.length) return null;
  return <div className="chip-row">{cs.map((n) => <Link key={n.cca3} to={countryPath(n)} className="chip">{n.name}</Link>)}</div>;
}

function DeepPage({ c, section }: { c: Country; section: DeepSection }) {
  const [d, setD] = useState<Deep | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadDeepDive(c.cca3, section)?.then((x) => live && setD(x)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [c, section]);

  const title = deepTitle(section, nameInSentence(c));
  useEffect(() => { document.title = `${title} · Worldwise`; }, [title]);

  const extras = d ? extrasFor(section, c, d) : [];
  const profile = `${countryPath(c)}?tab=${section}`;
  const others = DEEP_SECTIONS.filter((s) => s !== section && hasDeepDive(c.cca3, s));
  const i = DEEP_SECTIONS.indexOf(section);
  const next = DEEP_SECTIONS.slice(i + 1).concat(DEEP_SECTIONS.slice(0, i)).find((s) => hasDeepDive(c.cca3, s));
  const quiz = (section in TOPICS && questionCount(c, section as Topic) > 0) ? section as Topic : null;

  return (
    <>
      <header className="container deep-hero">
        <Breadcrumbs items={[{ to: '/countries', label: 'Countries' }, { to: countryPath(c), label: c.name }, { label: SECTION_LABEL[section] }]} />
        <div className="country-title">
          {c.flag && <img className="flag country-flag" src={flagUrl(c)} alt="" width={96} height={72} />}
          <h1>{title}</h1>
        </div>
        {d && <p className="deep-intro">{d.intro}</p>}
        {d && (
          <p className="deep-meta">
            <span><Clock size={16} aria-hidden="true" /> About {readingMinutes(d)} min read</span>
            <span><BookOpen size={16} aria-hidden="true" /> {d.chapters.length} chapters</span>
          </p>
        )}
      </header>

      {failed && <p className="container">This page didn’t load. <Link to={profile}>Back to {nameInSentence(c)}</Link></p>}
      {!d && !failed && <p className="container muted" role="status">Loading…</p>}

      {d && (
        <div className="container deep-layout">
          <nav className="deep-toc" aria-label="On this page">
            <h2 className="panel-h">On this page</h2>
            <ol>
              {d.chapters.map((ch) => <li key={ch.id}><a href={`#${ch.id}`} onClick={jump(ch.id)}>{ch.title}</a></li>)}
              {extras.map((x) => <li key={x.id}><a href={`#${x.id}`} onClick={jump(x.id)}>{x.title}</a></li>)}
              {d.timeline && <li><a href="#timeline" onClick={jump('timeline')}>Timeline</a></li>}
              {d.keyTerms && <li><a href="#key-words" onClick={jump('key-words')}>Key words</a></li>}
            </ol>
          </nav>

          <article className="deep-body">
            {d.chapters.map((ch) => (
              <section key={ch.id} id={ch.id} className="deep-chapter" aria-labelledby={`${ch.id}-h`}>
                <h2 id={`${ch.id}-h`}>{ch.title}</h2>
                {ch.text.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
                {ch.highlight && (
                  <aside className="deep-highlight">
                    <h3>{ch.highlight.title}</h3>
                    <p>{ch.highlight.text}</p>
                  </aside>
                )}
                {ch.facts && ch.facts.length > 0 && (
                  <dl className="fact-grid deep-facts">
                    {ch.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
                  </dl>
                )}
                <CountryLinks codes={ch.related} />
              </section>
            ))}

            {extras.map((x) => <div key={x.id} className="deep-extra">{x.node}</div>)}

            {d.timeline && (
              <section id="timeline" className="deep-chapter" aria-labelledby="timeline-h">
                <h2 id="timeline-h">Timeline</h2>
                <ol className="deep-timeline">
                  {d.timeline.map((t) => (
                    <li key={t.year + t.title}>
                      <span className="deep-year">{t.year}</span>
                      <div><h3>{t.title}</h3><p>{t.text}</p></div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {d.keyTerms && (
              <section id="key-words" className="deep-chapter" aria-labelledby="key-words-h">
                <h2 id="key-words-h">Key words</h2>
                <dl className="deep-terms">
                  {d.keyTerms.map((k) => <div key={k.term}><dt>{k.term}</dt><dd>{k.meaning}</dd></div>)}
                </dl>
              </section>
            )}

            <p className="source-note">
              {d.status === 'draft' ? 'Written by Worldwise from published facts. Not yet checked against sources.' : `Written by Worldwise. Sources: ${d.sources?.join('; ')}`}
            </p>
          </article>
        </div>
      )}

      {d && (
        <section className="container section deep-next" aria-labelledby="deep-next-h">
          <h2 id="deep-next-h">Keep going</h2>
          <div className="deep-actions">
            {quiz && <ButtonLink to={`${countryPath(c)}/quiz/${quiz}`} variant="primary"><Play size={18} aria-hidden="true" /> Take the {TOPICS[quiz].label.toLowerCase()} quiz</ButtonLink>}
            {next && <ButtonLink to={`${countryPath(c)}/${next}`}>Next: {deepTitle(next, nameInSentence(c))} <ArrowRight size={18} aria-hidden="true" /></ButtonLink>}
            <Link to={profile} className="deep-back"><ArrowLeft size={16} aria-hidden="true" /> Back to the {c.name} profile</Link>
          </div>
          {others.length > 1 && (
            <>
              <h3 className="panel-h">More about {nameInSentence(c)}</h3>
              <div className="chip-row">
                {others.map((s) => <Link key={s} to={`${countryPath(c)}/${s}`} className="chip">{SECTION_LABEL[s]}</Link>)}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** GDP per person compared with land neighbours (or, for islands, countries in the same subregion). */
function NeighbourGdp({ c }: { c: Country }) {
  const peers = (c.borders.length ? c.borders.map((k) => getCountry(k)) : COUNTRIES.filter((x) => x.subregion === c.subregion && x.cca3 !== c.cca3 && x.sovereign).slice(0, 6))
    .filter((x): x is Country => Boolean(x?.gdpPerCapita))
    // Leave out tiny states such as Monaco, whose figures dwarf everyone else's, unless the country is tiny too.
    .filter((x) => (x.population?.value ?? 0) >= 1e6 || (c.population?.value ?? 0) < 1e6);
  if (!c.gdpPerCapita || peers.length < 2) return null;
  const rows = [c, ...peers].map((x) => ({ label: x.name, value: x.gdpPerCapita!.value, highlight: x.cca3 === c.cca3 })).sort((a, b) => b.value - a.value);
  return <Bars title={`Wealth per person: ${c.name} and its neighbours`} rows={rows} unit={(v) => `$${Math.round(v).toLocaleString('en-GB')}`} note="GDP per person in US dollars, latest year available." />;
}

type Extra = { id: string; title: string; node: ReactNode };

/**
 * Extra blocks for each section, in page order: real-data visuals that work for every country,
 * then written extras (pinned places, steps, cards, calendar, big moments) when a page has them.
 */
function extrasFor(section: DeepSection, c: Country, d: Deep): Extra[] {
  const out: Extra[] = [];
  const add = (id: string, title: string, node: ReactNode) => out.push({ id, title, node: (
    <section id={id} className="deep-chapter" aria-labelledby={`${id}-h`}><h2 id={`${id}-h`}>{title}</h2>{node}</section>) });
  const places = d.places && (
    <>{d.places.intro && <p>{d.places.intro}</p>}<PinMap country={c} label={d.places.title} pins={d.places.items} /></>);
  if (d.places && section !== 'sport') add(d.places.id, d.places.title, places);
  if (section === 'geography') add('in-data', 'Nature and environment', <><HeritageMap country={c} kinds={['natural', 'mixed']} title="Natural World Heritage Sites" /><WorldCompare c={c} keys={['forest', 'farmland', 'rainfall', 'co2']} title="Land, rain and environment" /></>);
  if (section === 'people') add('in-data', 'In numbers', <><PopulationPyramid country={c} /><CityBars country={c} /><WorldCompare c={c} keys={['urban', 'internet', 'literacy']} title={`${cap(nameInSentence(c))} compared with the world`} /></>);
  if (section === 'economy') add('in-data', 'In numbers', <><JobsBars country={c} /><NeighbourGdp c={c} /></>);
  if (section === 'culture') add('heritage', 'World Heritage', <HeritageMap country={c} kinds={['cultural', 'mixed']} title={`Cultural World Heritage Sites in ${nameInSentence(c)}`} />);
  if (d.steps) out.push({ id: d.steps.id, title: d.steps.title, node: <Steps {...d.steps} /> });
  for (const g of d.cardGroups ?? []) out.push({ id: g.id, title: g.title, node: <CardGroups groups={[g]} /> });
  if (d.places && section === 'sport') add(d.places.id, d.places.title, places);
  if (d.calendar) out.push({ id: 'calendar', title: d.calendar.title, node: <Calendar {...d.calendar} /> });
  if (d.moments) out.push({ id: 'moments', title: d.moments.title, node: (
    <section id="moments" className="deep-chapter" aria-labelledby="moments-h">
      <h2 id="moments-h">{d.moments.title}</h2>
      <ol className="deep-timeline">{d.moments.items.map((t) => <li key={t.year + t.title}><span className="deep-year">{t.year}</span><div><h3>{t.title}</h3><p>{t.text}</p></div></li>)}</ol>
    </section>) });
  return out;
}

/** In-page links: scroll to the chapter without touching the URL (the hash router owns it). */
function jump(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el.querySelector('h2')?.setAttribute('tabindex', '-1');
    (el.querySelector('h2') as HTMLElement | null)?.focus({ preventScroll: true });
  };
}
