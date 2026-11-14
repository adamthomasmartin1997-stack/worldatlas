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
        const left = c.xy[0] + w + 14 > W;
        const x = left ? c.xy[0] - 12 - w : c.xy[0] + 12;
        const box: [number, number, number, number] = [x, c.xy[1] - size * 0.7, x + w, c.xy[1] + size * 0.5];
        const clash = boxes.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]));
        if (!clash) boxes.push(box);
        return { ...c, size, left, showLabel: !clash };
      });
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
            {m.showLabel && <text x={m.left ? -12 : 12} y={m.size * 0.35} textAnchor={m.left ? 'end' : 'start'} fontSize={m.size}>{m.n}</text>}
          </g>
        ))}
      </svg>
    </div>
    {drawn.trimmed && <p className="source-note">Far-off islands and overseas regions aren't shown.</p>}
    </>
  );
}
