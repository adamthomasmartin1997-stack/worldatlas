import { useMemo } from 'react';
import { geoCentroid, geoNaturalEarth1, geoPath } from 'd3-geo';
import { useWorld } from './useWorld';
import { homeland } from './CountryMap';

const W = 320, H = 240, PAD = 16;

/** A country's outline on its own, with no names, labels or neighbours. Far-off islands are left out. */
export function Silhouette({ cca3, label = 'The outline of a country. Which one is it?' }: { cca3: string; label?: string }) {
  const { features, error } = useWorld();
  const d = useMemo(() => {
    const f = features?.find((x) => x.properties.cca3 === cca3);
    if (!f) return null;
    const { shape } = homeland(f);
    const [lon, lat] = geoCentroid(shape);
    const projection = geoNaturalEarth1().rotate([-lon, -lat / 2]).fitExtent([[PAD, PAD], [W - PAD, H - PAD]], shape);
    return geoPath(projection)(shape) ?? '';
  }, [features, cca3]);
  if (error) return <p className="muted">The outline couldn't load. Try reloading the page.</p>;
  return (
    <div className="silhouette">
      {d ? <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}><path d={d} /></svg> : <span className="muted">Loading outline…</span>}
    </div>
  );
}
