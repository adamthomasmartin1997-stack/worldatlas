import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { useUsStates, statePath } from './usStates';
import { MarkerLayer, placeMarkers } from './mapMarkers';
import { ZoomableSvg } from './ZoomableSvg';

const W = 960, H = 600;
const INSETS = ['02', '15']; // Alaska and Hawaii are drawn in boxes (geoAlbersUsa moves them there)

/**
 * The United States as state outlines. Alaska and Hawaii sit in inset boxes; a few headline cities are
 * marked. Clicking a state opens its profile. (Every state is also listed as links on the page.)
 */
export function UsMap({ highlight }: { highlight?: string }) {
  const { data, error } = useUsStates();
  const navigate = useNavigate();
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const drawn = useMemo(() => {
    if (!data) return null;
    const projection = geoAlbersUsa().fitExtent([[16, 16], [W - 16, H - 16]], { type: 'FeatureCollection', features: data.states.map((s) => s.shape) });
    const path = geoPath(projection);
    const boxes = INSETS.map((f) => {
      const s = data.states.find((x) => x.fips === f);
      if (!s) return null;
      const [[x0, y0], [x1, y1]] = path.bounds(s.shape);
      return { name: s.name, x: x0 - 10, y: y0 - 10, w: x1 - x0 + 20, h: y1 - y0 + 20 };
    }).filter((b): b is NonNullable<typeof b> => Boolean(b));
    return {
      states: data.states.map((s) => ({ s, d: path(s.shape) ?? '' })),
      boxes,
      markers: placeMarkers(data.highlights, projection, W, H, 10),
    };
  }, [data]);

  if (error) return <div className="map-frame map-loading" role="alert">The map of the states couldn't be loaded.</div>;
  if (!drawn) return <div className="map-frame map-loading">Loading map…</div>;

  return (
    <div className="map-frame us-map" ref={frame} onPointerLeave={() => setTip(null)}>
      <ZoomableSvg width={W} height={H}
        label={`Map of the United States showing its ${drawn.states.length - 1} states and Washington, D.C. Alaska and Hawaii are shown in boxes. Marked cities: ${drawn.markers.map((m) => m.n).join(', ')}. Every state is also listed as a link below the map.`}>
        {drawn.boxes.map((b) => (
          <g key={b.name} className="inset-box" aria-hidden="true">
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} />
          </g>
        ))}
        {drawn.states.map(({ s, d }) => (
          <path
            key={s.fips}
            d={d}
            className={`state-shape interactive${s.fips === highlight ? ' active' : ''}`}
            onClick={() => navigate(statePath(s))}
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse' || !frame.current) return;
              const r = frame.current.getBoundingClientRect();
              setTip({ x: e.clientX - r.left, y: e.clientY - r.top, text: s.name });
            }}
          />
        ))}
        <MarkerLayer markers={drawn.markers} />
      </ZoomableSvg>
      {tip && <div className="map-tooltip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">{tip.text}</div>}
    </div>
  );
}
