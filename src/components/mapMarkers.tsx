import { useZoomScale } from './ZoomableSvg';
import type { GeoProjection } from 'd3-geo';

export interface City { n: string; lat: number; lon: number; p?: number; c?: 1 }
type Box = [number, number, number, number];
export interface Marker extends City { xy: [number, number]; size: number; label: { tx: number; ty: number; anchor: 'start' | 'end' | 'middle' } | null }

let measureCtx: CanvasRenderingContext2D | null | undefined;
/** Width of a label in SVG units, measured with the real font where possible (falls back to a generous estimate). */
function textWidth(text: string, size: number, capital: boolean) {
  if (measureCtx === undefined) measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (measureCtx) {
    measureCtx.font = capital ? `800 ${size}px "Bricolage Grotesque", sans-serif` : `700 ${size}px "DM Sans", sans-serif`;
    // The web font may not have loaded yet, so never trust a measurement narrower than a generous estimate.
    return Math.max(measureCtx.measureText(text).width, text.length * size * 0.6) + 10; // + the white halo
  }
  return text.length * size * 0.62 + 10;
}
const overlaps = (a: Box, b: Box) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);

/**
 * Projects cities and places their labels so that no label overlaps another label or any city dot.
 * Every dot is reserved first; then, capital first and biggest next, each label tries right, left, above
 * and below. A city whose label can't be placed is dropped together with its dot (the capital's dot always stays).
 */
export function placeMarkers(cities: City[], projection: GeoProjection, W: number, H: number, max = 9, blocked: Box[] = []): Marker[] {
  const candidates = cities
    .map((c) => ({ ...c, xy: projection([c.lon, c.lat]) }))
    .filter((c): c is City & { xy: [number, number] } => Boolean(c.xy) && c.xy![0] > 4 && c.xy![0] < W - 4 && c.xy![1] > 4 && c.xy![1] < H - 4)
    .sort((a, b) => (b.c ?? 0) - (a.c ?? 0) || (b.p ?? 0) - (a.p ?? 0))
    .slice(0, max);
  const dots: (Box | null)[] = candidates.map((c) => [c.xy[0] - 10, c.xy[1] - 10, c.xy[0] + 10, c.xy[1] + 10]);
  const labels: Box[] = [...blocked];
  const placed: Marker[] = [];
  candidates.forEach((c, i) => {
    const size = c.c ? 17 : 14;
    const w = textWidth(c.n, size, Boolean(c.c));
    const [x0, y0] = c.xy;
    // Boxes cover the real text: ascenders above the baseline, descenders below, plus the white halo.
    const asc = size * 0.8 + 3, desc = size * 0.3 + 3;
    const options = [
      { box: [x0 + 10, y0 + size * 0.35 - asc, x0 + 12 + w, y0 + size * 0.35 + desc] as Box, tx: 12, ty: size * 0.35, anchor: 'start' as const },
      { box: [x0 - 12 - w, y0 + size * 0.35 - asc, x0 - 10, y0 + size * 0.35 + desc] as Box, tx: -12, ty: size * 0.35, anchor: 'end' as const },
      { box: [x0 - w / 2, y0 - 12 - asc, x0 + w / 2, y0 - 12 + desc] as Box, tx: 0, ty: -12, anchor: 'middle' as const },
      { box: [x0 - w / 2, y0 + 12 + size * 0.8 - asc, x0 + w / 2, y0 + 12 + size * 0.8 + desc] as Box, tx: 0, ty: 12 + size * 0.8, anchor: 'middle' as const },
    ];
    const fits = (b: Box) =>
      b[0] > 2 && b[2] < W - 2 && b[1] > 2 && b[3] < H - 2 &&
      !labels.some((o) => overlaps(b, o)) &&
      !dots.some((d, j) => d && j !== i && overlaps(b, d));
    const pick = options.find((o) => fits(o.box));
    if (pick) {
      labels.push(pick.box);
      placed.push({ ...c, size, label: { tx: pick.tx, ty: pick.ty, anchor: pick.anchor } });
    } else if (c.c) {
      placed.push({ ...c, size, label: null });
    } else {
      dots[i] = null; // drop this city: its dot no longer blocks anyone else
    }
  });
  // A dot whose city was dropped after an earlier label avoided it is fine; a label must never sit on a kept dot.
  return placed;
}

export function MarkerLayer({ markers }: { markers: Marker[] }) {
  const k = useZoomScale();
  return (
    <>
      {markers.map((m) => (
        <g key={m.n} transform={`translate(${m.xy[0]} ${m.xy[1]}) scale(${1 / k})`} className={m.c ? 'city is-capital' : 'city'}>
          <circle r={m.c ? 8 : 5.5} />
          {m.label && <text x={m.label.tx} y={m.label.ty} textAnchor={m.label.anchor} fontSize={m.size}>{m.n}</text>}
        </g>
      ))}
    </>
  );
}

export const describeMarkers = (place: string, markers: Marker[]) => {
  const capital = markers.find((m) => m.c);
  const others = markers.filter((m) => !m.c).map((m) => m.n);
  if (!markers.length) return `Map of ${place}.`;
  return `Map of ${place} showing ${capital ? `the capital, ${capital.n}${others.length ? ', and ' : ''}` : ''}${others.length ? `cities: ${others.join(', ')}` : ''}.`;
};
