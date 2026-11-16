import { WORLD, type Country, type IndicatorKey } from '../data/countries';
import { SourceNote } from './ui';

const META: Record<IndicatorKey, { label: string; unit: 'pct' | 't'; note: string }> = {
  literacy: { label: 'Adults who can read and write', unit: 'pct', note: 'aged 15 and over' },
  internet: { label: 'People using the internet', unit: 'pct', note: '' },
  urban: { label: 'People living in towns and cities', unit: 'pct', note: '' },
  forest: { label: 'Land covered by forest', unit: 'pct', note: '' },
  co2: { label: 'CO₂ emissions per person', unit: 't', note: 'tonnes a year' },
};

const show = (v: number, unit: 'pct' | 't') => (unit === 'pct' ? `${Math.round(v)}%` : `${v.toFixed(1)} t`);

/** Horizontal bars comparing a country with the world average, one row per indicator. */
export function WorldCompare({ c, keys, title }: { c: Country; keys: IndicatorKey[]; title: string }) {
  const rows = keys.filter((k) => c.indicators?.[k] && WORLD[k]);
  if (!rows.length) return null;
  return (
    <figure className="chart compare">
      <figcaption className="chart-title">{title}</figcaption>
      <dl className="compare-rows">
        {rows.map((k) => {
          const m = META[k], mine = c.indicators![k]!, world = WORLD[k]!;
          const max = m.unit === 'pct' ? 100 : Math.max(mine.value, world.value) * 1.15;
          return (
            <div key={k} className="compare-row">
              <dt>{m.label}{m.note && <span className="muted"> ({m.note})</span>}</dt>
              <dd>
                <span className="compare-bar is-country"><span style={{ width: `${(mine.value / max) * 100}%` }} /></span>
                <span className="compare-value"><b>{show(mine.value, m.unit)}</b> {c.name} <span className="muted">({mine.year})</span></span>
                <span className="compare-bar is-world"><span style={{ width: `${(world.value / max) * 100}%` }} /></span>
                <span className="compare-value">{show(world.value, m.unit)} world average <span className="muted">({world.year})</span></span>
              </dd>
            </div>
          );
        })}
      </dl>
      <SourceNote sources={['world-bank']}>Latest year available for each country.</SourceNote>
    </figure>
  );
}
