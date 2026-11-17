import { useEffect, useMemo, useState } from 'react';
import { geoArea, geoCentroid, geoDistance, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { MultiPolygon, Polygon } from 'geojson';
import { useWorld, type CountryFeature } from './useWorld';
import { WorldMap } from './WorldMap';
import { UsMap } from './UsMap';
import { MarkerLayer, describeMarkers, placeMarkers, type City } from './mapMarkers';
import type { Country } from '../data/countries';
let citiesCache: Promise<Record<string, City[]>> | null = null;
const loadCities = () =>
  (citiesCache ??= fetch(`${import.meta.env.BASE_URL}data/cities.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))) as Promise<Record<string, City[]>>;

const W = 600, H = 520, PAD = 28;

/** Keep the main landmass and nearby islands (e.g. Corsica), drop far-off parts (e.g. French Guiana). */
export function homeland(f: CountryFeature, maxArc = 0.26): { shape: CountryFeature; trimmed: boolean } {
  if (f.geometry.type !== 'MultiPolygon') return { shape: f, trimmed: false };
  const parts = (f.geometry as MultiPolygon).coordinates.map((c) => {
    const poly: Polygon = { type: 'Polygon', coordinates: c };
    return { c, area: geoArea(poly), centre: geoCentroid(poly) };
  });
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const keep = parts.filter((p) => geoDistance(p.centre, main.centre) < maxArc); // 0.26 rad is about 15° of arc
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
    const markers = placeMarkers(cities ?? [], projection, W, H);
    return { d: path(shape) ?? '', markers, trimmed };
  }, [features, country.cca3, cities]);

  if (country.cca3 === 'USA') return <UsMap />;
  if (!country.hasShape) {
    return <WorldMap label={`World map with ${country.name} marked`} pin={country.cca3} classFor={(c) => (c === country.cca3 ? 'active' : undefined)} />;
  }
  if (!drawn) return <div className="map-frame map-loading">Loading map…</div>;

  return (
    <>
    <div className={`map-frame country-map${country.landlocked ? ' is-landlocked' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img"
        aria-label={describeMarkers(country.name, drawn.markers)}>
        <path d={drawn.d} className="country-shape" />
        <MarkerLayer markers={drawn.markers} />
      </svg>
    </div>
    {drawn.trimmed && <p className="source-note">Far-off islands and overseas regions aren't shown.</p>}
    </>
  );
}
