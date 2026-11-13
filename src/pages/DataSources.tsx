import { PageHeader } from '../components/ui';
import { SOURCES } from '../data/sources';
import { DATA_GENERATED } from '../data/countries';

export function DataSources() {
  return (
    <>
      <PageHeader crumbs={[{ to: '/data', label: 'Data' }, { label: 'Sources & licences' }]} title="Data sources & licences">
        <p className="muted">Everything on this site comes from openly licensed data or is written by us. Data last built {DATA_GENERATED}.</p>
      </PageHeader>
      <section className="container prose" style={{ paddingBottom: 'var(--space-16)' }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th scope="col">Source</th><th scope="col">Licence</th></tr></thead>
            <tbody>
              {Object.entries(SOURCES).map(([id, s]) => (
                <tr key={id}><th scope="row"><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></th><td>{s.licence}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 style={{ marginTop: 'var(--space-8)' }}>Attribution</h2>
        <p>Country names, codes, capitals, regions, areas, borders, languages and currencies are derived from <a href="https://github.com/mledoze/countries">mledoze/countries</a>, made available under the Open Database License (ODbL 1.0). Map shapes are from Natural Earth (public domain).</p>
        <p>Quiz questions and editorial text are original to this site.</p>
      </section>
    </>
  );
}
