import { useMemo } from 'react';
import { geoArea, geoCentroid, geoDistance, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import { MarkerLayer, describeMarkers, placeMarkers } from './mapMarkers';
import type { UsState } from './usStates';

const W = 600, H = 480, PAD = 28;

/** Drop far-flung islets (e.g. the far western Aleutians) so the state fills the frame. */
function mainParts(shape: Feature<Geometry>): Feature<Geometry> {
  if (shape.geometry.type !== 'MultiPolygon') return shape;
  const parts = (shape.geometry as MultiPolygon).coordinates.map((c) => {
    const poly: Polygon = { type: 'Polygon', coordinates: c };
    return { c, area: geoArea(poly), centre: geoCentroid(poly) };
  });
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  return { ...shape, geometry: { type: 'MultiPolygon', coordinates: parts.filter((p) => geoDistance(p.centre, main.centre) < 0.3).map((p) => p.c) } };
}

/** One US state on its own, with its capital and largest cities. */
export function StateMap({ state }: { state: UsState }) {
  const drawn = useMemo(() => {
    const shape = mainParts(state.shape);
    const [lon, lat] = geoCentroid(shape);
    const projection = geoNaturalEarth1().rotate([-lon, -lat]).fitExtent([[PAD, PAD], [W - PAD, H - PAD]], shape);
    const cities = [...(state.capital ? [state.capital] : []), ...state.cities.filter((c) => c.n !== state.capital?.n)];
    return { d: geoPath(projection)(shape) ?? '', markers: placeMarkers(cities, projection, W, H, 7) };
  }, [state]);
  return (
    <div className="map-frame country-map is-landlocked">
      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img" aria-label={describeMarkers(state.name, drawn.markers)}>
        <path d={drawn.d} className="country-shape" />
        <MarkerLayer markers={drawn.markers} />
      </svg>
    </div>
  );
}
