import { useEffect, useMemo, useState } from 'react';
import { geoArea, geoCentroid, geoDistance, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { MultiPolygon, Polygon } from 'geojson';
import { useWorld, type CountryFeature } from './useWorld';
import { WorldMap } from './WorldMap';
import type { Country } from '../data/countries';

export interface City { n: string; lat: number; lon: number; p: number; c?: 1 }
let citiesCache: Promise<Record<string, City[]>> | null = null;
const loadCities = () =>
  (citiesCache ??= fetch(`${import.meta.env.BASE_URL}data/cities.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))) as Promise<Record<string, City[]>>;

const W = 600, H = 520, PAD = 28;

/** Keep the main landmass and nearby islands (e.g. Corsica), drop far-off parts (e.g. French Guiana). */
function homeland(f: CountryFeature): { shape: CountryFeature; trimmed: boolean } {
  if (f.geometry.type !== 'MultiPolygon') return { shape: f, trimmed: false };
  const parts = (f.geometry as MultiPolygon).coordinates.map((c) => {
    const poly: Polygon = { type: 'Polygon', coordinates: c };
    return { c, area: geoArea(poly), centre: geoCentroid(poly) };
  });
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const keep = parts.filter((p) => geoDistance(p.centre, main.centre) < 0.26); // ~15° of arc
  return { shape: { ...f, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.c) } }, trimmed: keep.length < parts.length };
}

/** One country on its own, with its largest cities marked. Small states without a shape fall back to a pinned world map. */
export function CountryMap({ country }: { country: Country }) {
  const { features } = useWorld();
  const [cities, setCities] = useState<City[] | null>(null);
  useEffect(() => { let live = true; loadCities().then((all) => live && setCities(all[country.cca3] ?? [])); return () => { live = false; }; }, [country.cca3]);

  const drawn = useMemo(() => {
    const f = features?.find((x) => x.properties.cca3 === country.cca3);
    if (!f) return null;
    const { shape, trimmed } = homeland(f);
    const [lon] = geoCentroid(shape);
    const projection = geoNaturalEarth1().rotate([-lon, 0]).fitExtent([[PAD, PAD], [W - PAD, H - PAD]], shape);
    const path = geoPath(projection);
    // Cities inside the drawn area, capital first, then by size; labels that would overlap are skipped.
    const boxes: [number, number, number, number][] = [];
    const markers = (cities ?? [])
      .map((c) => ({ ...c, xy: projection([c.lon, c.lat]) }))
      .filter((c): c is City & { xy: [number, number] } => Boolean(c.xy) && c.xy![0] > 4 && c.xy![0] < W - 4 && c.xy![1] > 4 && c.xy![1] < H - 4)
      .sort((a, b) => (b.c ?? 0) - (a.c ?? 0) || b.p - a.p)
      .slice(0, 9)
      .map((c) => {
        const size = c.c ? 17 : 14;
        const w = c.n.length * size * 0.56 + 8;
        const [x0, y0] = c.xy;
        // Try right, left, above, below; keep the first label position that fits and doesn't overlap.
        const options: { box: [number, number, number, number]; tx: number; ty: number; anchor: 'start' | 'end' | 'middle' }[] = [
          { box: [x0 + 12, y0 - size * 0.7, x0 + 12 + w, y0 + size * 0.5], tx: 12, ty: size * 0.35, anchor: 'start' },
          { box: [x0 - 12 - w, y0 - size * 0.7, x0 - 12, y0 + size * 0.5], tx: -12, ty: size * 0.35, anchor: 'end' },
          { box: [x0 - w / 2, y0 - 12 - size, x0 + w / 2, y0 - 10], tx: 0, ty: -12, anchor: 'middle' },
          { box: [x0 - w / 2, y0 + 10, x0 + w / 2, y0 + 12 + size], tx: 0, ty: 12 + size * 0.8, anchor: 'middle' },
        ];
        const fits = (b: [number, number, number, number]) => b[0] > 2 && b[2] < W - 2 && b[1] > 2 && b[3] < H - 2 && !boxes.some((o) => !(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3]));
        const pick = options.find((o) => fits(o.box));
        if (pick) boxes.push(pick.box, [x0 - 7, y0 - 7, x0 + 7, y0 + 7]);
        return { ...c, size, label: pick ?? null };
      })
      // A city whose name can't be placed is left off rather than shown as a bare dot (the capital always shows).
      .filter((m) => m.label || m.c);
    return { d: path(shape) ?? '', markers, trimmed };
  }, [features, country.cca3, cities]);

  if (!country.hasShape) {
    return <WorldMap label={`World map with ${country.name} marked`} pin={country.cca3} classFor={(c) => (c === country.cca3 ? 'active' : undefined)} />;
  }
  if (!drawn) return <div className="map-frame map-loading">Loading map…</div>;

  const capital = drawn.markers.find((m) => m.c);
  return (
    <>
    <div className={`map-frame country-map${country.landlocked ? ' is-landlocked' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img"
        aria-label={`Map of ${country.name}${drawn.markers.length ? ` showing ${capital ? `the capital, ${capital.n}, and ` : ''}its largest cities: ${drawn.markers.filter((m) => !m.c).map((m) => m.n).join(', ')}` : ''}.`}>
        <path d={drawn.d} className="country-shape" />
        {drawn.markers.map((m) => (
          <g key={m.n} transform={`translate(${m.xy[0]} ${m.xy[1]})`} className={m.c ? 'city is-capital' : 'city'}>
            <circle r={m.c ? 8 : 5.5} />
            {m.label && <text x={m.label.tx} y={m.label.ty} textAnchor={m.label.anchor} fontSize={m.size}>{m.n}</text>}
          </g>
        ))}
      </svg>
    </div>
    {drawn.trimmed && <p className="source-note">Far-off islands and overseas regions aren't shown.</p>}
    </>
  );
}
