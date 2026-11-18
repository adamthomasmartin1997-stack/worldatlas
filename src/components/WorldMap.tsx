import { memo, useMemo, useRef, useState } from 'react';
import { geoArea, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { useWorld, type CountryFeature } from './useWorld';
import { getCountry } from '../data/countries';
import { ZoomableSvg, useZoomScale } from './ZoomableSvg';

/** A pin that stays the same size on screen however far the map is zoomed. */
function MapPin({ at }: { at: [number, number] }) {
  const k = useZoomScale();
  return (
    <g className="map-pin" transform={`translate(${at[0]} ${at[1]}) scale(${1 / k})`} aria-hidden="true">
      <circle r="16" className="map-pin-ring" />
      <circle r="6" className="map-pin-dot" />
    </g>
  );
}

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
  /** Draw only the focused countries' region (e.g. Europe without North Africa). */
  onlyFocusRegion?: boolean;
  /** Drop a pin on this country (cca3), so small countries are visible on a world map. */
  pin?: string;
  aspect?: number;
}

function WorldMapInner({ label, onSelect, classFor, focus, hideNames, onlyFocusRegion, pin, aspect = 0.5 }: WorldMapProps) {
  const { features, error } = useWorld();
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const height = Math.round(WIDTH * aspect);

  const { paths, pinAt } = useMemo(() => {
    if (!features) return { paths: [], pinAt: null };
    const focusSet = new Set(focus ?? []);
    const regions = new Set([...focusSet].map((c) => getCountry(c)?.region));
    const visible = features.filter((f) => {
      if (onlyFocusRegion && focusSet.size) return regions.has(getCountry(f.properties.cca3 ?? undefined)?.region);
      return f.properties.name !== 'Antarctica' || !focus?.length;
    });
    let target = focusSet.size ? visible.filter((f) => f.properties.cca3 && focusSet.has(f.properties.cca3)) : visible;
    if (focusSet.size > 3) target = target.filter((f) => !FIT_EXCLUDE.has(f.properties.cca3 ?? ''));
    if (focusSet.size) target = target.map(mainland);
    const fc: FeatureCollection<Geometry> = { type: 'FeatureCollection', features: target.length ? target : visible };
    const pad = focusSet.size ? 24 : 4;
    const projection = geoNaturalEarth1().fitExtent([[pad, pad], [WIDTH - pad, height - pad]], fc);
    const path = geoPath(projection);
    const pinCountry = getCountry(pin);
    const pinAt = pinCountry ? projection([pinCountry.latlng[1], pinCountry.latlng[0]]) : null;
    return { paths: visible.map((f: CountryFeature) => ({ f, d: path(f) ?? '' })), pinAt };
  }, [features, focus, height, onlyFocusRegion, pin]);

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
      <ZoomableSvg width={WIDTH} height={height} label={label}>
        {paths.map(({ f, d }) => {
          const code = f.properties.cca3;
          const country = getCountry(code ?? undefined);
          const known = Boolean(country);
          const interactive = Boolean(onSelect && known);
          return (
            <path
              key={f.properties.name + (code ?? '')}
              d={d}
              className={['map-country', country && `land-${country.region.toLowerCase()}`, interactive && 'interactive', !known && 'no-data', classFor?.(code)].filter(Boolean).join(' ')}
              onClick={interactive ? () => onSelect!(code!) : undefined}
              onPointerMove={(e) => showTip(e, f)}
            />
          );
        })}
        {pinAt && <MapPin at={pinAt as [number, number]} />}
      </ZoomableSvg>
      {tip && <div className="map-tooltip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">{tip.text}</div>}
    </div>
  );
}

export const WorldMap = memo(WorldMapInner);
