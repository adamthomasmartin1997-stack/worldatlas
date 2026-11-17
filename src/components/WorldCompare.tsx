import { WORLD, type Country, type IndicatorKey } from '../data/countries';
import { SourceNote } from './ui';

type Unit = 'pct' | 't' | 'mm';
/**
 * `reference` replaces the world average where the World Bank publishes none (rainfall):
 * the country is compared with a fixed, labelled line instead.
 */
const META: Record<IndicatorKey, { label: string; unit: Unit; note: string; reference?: { value: number; label: string } }> = {
  literacy: { label: 'Adults who can read and write', unit: 'pct', note: 'aged 15 and over' },
  internet: { label: 'People using the internet', unit: 'pct', note: '' },
  urban: { label: 'People living in towns and cities', unit: 'pct', note: '' },
  forest: { label: 'Land covered by forest', unit: 'pct', note: '' },
  farmland: { label: 'Land used for farming', unit: 'pct', note: 'crops and grazing' },
  rainfall: { label: 'Average rainfall', unit: 'mm', note: 'a year', reference: { value: 250, label: 'desert line (less rain than this counts as desert)' } },
  co2: { label: 'CO₂ emissions per person', unit: 't', note: 'tonnes a year' },
};

const show = (v: number, unit: Unit) => (unit === 'pct' ? `${Math.round(v)}%` : unit === 'mm' ? `${Math.round(v).toLocaleString('en-GB')} mm` : `${v.toFixed(1)} t`);

/** Horizontal bars comparing a country with the world average, one row per indicator. */
export function WorldCompare({ c, keys, title }: { c: Country; keys: IndicatorKey[]; title: string }) {
  const rows = keys.filter((k) => c.indicators?.[k] && (WORLD[k] || META[k].reference));
  if (!rows.length) return null;
  return (
    <figure className="chart compare">
      <figcaption className="chart-title">{title}</figcaption>
      <dl className="compare-rows">
        {rows.map((k) => {
          const m = META[k], mine = c.indicators![k]!, world = WORLD[k];
          const other = world ? { value: world.value, label: 'world average', year: world.year } : { value: m.reference!.value, label: m.reference!.label, year: null };
          const max = m.unit === 'pct' ? 100 : Math.max(mine.value, other.value) * 1.15;
          return (
            <div key={k} className="compare-row">
              <dt>{m.label}{m.note && <span className="muted"> ({m.note})</span>}</dt>
              <dd>
                <span className="compare-bar is-country"><span style={{ width: `${(mine.value / max) * 100}%` }} /></span>
                <span className="compare-value"><b>{show(mine.value, m.unit)}</b> {c.name} <span className="muted">({mine.year})</span></span>
                <span className="compare-bar is-world"><span style={{ width: `${(other.value / max) * 100}%` }} /></span>
                <span className="compare-value">{show(other.value, m.unit)} {other.label}{other.year && <span className="muted"> ({other.year})</span>}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <SourceNote sources={['world-bank']}>
        Latest year available for each country.
        {rows.some((k) => !WORLD[k] && META[k].reference) && ' The 250 mm desert line is a common rule of thumb in geography, not a World Bank figure.'}
      </SourceNote>
    </figure>
  );
}
