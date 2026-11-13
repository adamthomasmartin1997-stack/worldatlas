import { memo, useMemo, useRef, useState } from 'react';
import { geoArea, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { useWorld, type CountryFeature } from './useWorld';
import { getCountry } from '../data/countries';

const WIDTH = 960;

/** Transcontinental countries left out when framing a region, so Europe isn't stretched to the Pacific. */
const FIT_EXCLUDE = new Set(['RUS']);

/** Drop far-flung islands and overseas parts (e.g. French Guiana) when framing a country. */
function mainland(f: CountryFeature): CountryFeature {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const parts = f.geometry.coordinates.map((c) => ({ c, a: geoArea({ type: 'Polygon', coordinates: c }) }));
  const max = Math.max(...parts.map((p) => p.a));
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: parts.filter((p) => p.a >= max * 0.2).map((p) => p.c) } };
}

export interface WorldMapProps {
  /** Accessible description of what the map shows. Maps are a visual aid; every map page also offers a list or search. */
  label: string;
  /** Called with a cca3 code when a country is clicked. Omit for a static map. */
  onSelect?: (cca3: string) => void;
  /** Extra class per country, e.g. 'active', 'found', 'wrong', 'dim'. */
  classFor?: (cca3: string | null) => string | undefined;
  /** Zoom the map to fit these countries. */
  focus?: string[];
  /** Hide country names in the hover tooltip (for quizzes). */
  hideNames?: boolean;
  aspect?: number;
}

function WorldMapInner({ label, onSelect, classFor, focus, hideNames, aspect = 0.5 }: WorldMapProps) {
  const { features, error } = useWorld();
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const height = Math.round(WIDTH * aspect);

  const paths = useMemo(() => {
    if (!features) return [];
    const visible = features.filter((f) => f.properties.name !== 'Antarctica' || !focus?.length);
    const focusSet = new Set(focus ?? []);
    let target = focusSet.size ? visible.filter((f) => f.properties.cca3 && focusSet.has(f.properties.cca3)) : visible;
    if (focusSet.size > 3) target = target.filter((f) => !FIT_EXCLUDE.has(f.properties.cca3 ?? ''));
    if (focusSet.size) target = target.map(mainland);
    const fc: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: target.length ? target : visible };
    const pad = focusSet.size ? 24 : 4;
    const projection = geoNaturalEarth1().fitExtent([[pad, pad], [WIDTH - pad, height - pad]], fc);
    const path = geoPath(projection);
    return visible.map((f: CountryFeature) => ({ f, d: path(f) ?? '' }));
  }, [features, focus, height]);

  if (error) return <div className="map-frame map-loading" role="alert">{error}</div>;
  if (!features) return <div className="map-frame map-loading">Loading map…</div>;

  const showTip = (e: React.PointerEvent, f: CountryFeature) => {
    if (e.pointerType !== 'mouse' || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const c = getCountry(f.properties.cca3 ?? undefined);
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text: hideNames ? '?' : (c?.name ?? f.properties.name) });
  };

  return (
    <div className="map-frame" ref={frame} onPointerLeave={() => setTip(null)}>
      <svg className="map-svg" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={label}>
        {paths.map(({ f, d }) => {
          const code = f.properties.cca3;
          const known = Boolean(code && getCountry(code));
          const interactive = Boolean(onSelect && known);
          return (
            <path
              key={f.properties.name + (code ?? '')}
              d={d}
              className={['map-country', interactive && 'interactive', !known && 'no-data', classFor?.(code)].filter(Boolean).join(' ')}
              onClick={interactive ? () => onSelect!(code!) : undefined}
              onPointerMove={(e) => showTip(e, f)}
            />
          );
        })}
      </svg>
      {tip && <div className="map-tooltip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">{tip.text}</div>}
    </div>
  );
}

export const WorldMap = memo(WorldMapInner);
