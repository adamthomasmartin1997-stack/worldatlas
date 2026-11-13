import { Link } from 'react-router-dom';
import { PageHeader, Placeholder } from '../components/ui';

export function History() {
  return (
    <>
      <PageHeader eyebrow="History" title="History">
        <p className="muted">Timelines, historical maps and the events that shaped today's borders.</p>
      </PageHeader>
      <section className="container section grid grid-2" style={{ paddingTop: 0 }}>
        <Placeholder title="World timeline">
          <p>A zoomable timeline from ancient civilisations to the present. Each event links to the countries involved and to a historical map.</p>
        </Placeholder>
        <Placeholder title="Historical maps">
          <p>Borders through time — empires, colonisation and independence. Needs an openly licensed historical boundaries dataset; candidates are listed on the <Link to="/data/sources">Data sources</Link> page.</p>
        </Placeholder>
        <Placeholder title="Featured stories">
          <p>Short illustrated explainers, e.g. "How Africa's borders were drawn" or "The break-up of Yugoslavia", each ending in a quiz.</p>
        </Placeholder>
        <Placeholder title="Event content model">
          <p>Events will be stored as data — date, title, summary, related countries, sources — so the same event appears on the timeline, on every related country page and in quizzes.</p>
        </Placeholder>
      </section>
      <section className="container" style={{ paddingBottom: 'var(--space-16)' }}>
        <p>Available now: <Link to="/countries/fra/quiz/history">French history quiz</Link>.</p>
      </section>
    </>
  );
}
