import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Play } from 'lucide-react';
import { Breadcrumbs, ButtonLink } from '../components/ui';
import { WorldCompare } from '../components/WorldCompare';
import { countryPath, getCountry, type Country } from '../data/countries';
import { DEEP_SECTIONS, SECTION_LABEL, deepTitle, hasDeepDive, isDeepSection, loadDeepDive, readingMinutes, type DeepDive as Deep, type DeepSection } from '../content/deep';
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

  const title = deepTitle(section, c.name);
  useEffect(() => { document.title = `${title} · Worldwise`; }, [title]);

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

      {failed && <p className="container">This page didn’t load. <Link to={profile}>Back to {c.name}</Link></p>}
      {!d && !failed && <p className="container muted" role="status">Loading…</p>}

      {d && (
        <div className="container deep-layout">
          <nav className="deep-toc" aria-label="On this page">
            <h2 className="panel-h">On this page</h2>
            <ol>
              {d.chapters.map((ch) => <li key={ch.id}><a href={`#${ch.id}`} onClick={jump(ch.id)}>{ch.title}</a></li>)}
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

            {section === 'geography' && <WorldCompare c={c} keys={['forest', 'farmland', 'rainfall', 'co2']} title="Land, rain and environment" />}
            {section === 'people' && <WorldCompare c={c} keys={['urban', 'internet', 'literacy']} title={`${c.name} compared with the world`} />}

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
            {next && <ButtonLink to={`${countryPath(c)}/${next}`}>Next: {deepTitle(next, c.name)} <ArrowRight size={18} aria-hidden="true" /></ButtonLink>}
            <Link to={profile} className="deep-back"><ArrowLeft size={16} aria-hidden="true" /> Back to the {c.name} profile</Link>
          </div>
          {others.length > 1 && (
            <>
              <h3 className="panel-h">More about {c.name}</h3>
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
