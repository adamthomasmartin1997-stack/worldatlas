import type { GeoProjection } from 'd3-geo';

export interface City { n: string; lat: number; lon: number; p?: number; c?: 1 }
type Box = [number, number, number, number];
export interface Marker extends City { xy: [number, number]; size: number; label: { tx: number; ty: number; anchor: 'start' | 'end' | 'middle' } | null }

/**
 * Projects cities and places their labels: capital first, then by size; each label tries right, left,
 * above and below and takes the first spot that fits without overlapping. A city whose label can't be
 * placed is left off rather than shown as a bare dot (the capital always shows).
 */
export function placeMarkers(cities: City[], projection: GeoProjection, W: number, H: number, max = 9, blocked: Box[] = []): Marker[] {
  const boxes: Box[] = [...blocked];
  return cities
    .map((c) => ({ ...c, xy: projection([c.lon, c.lat]) }))
    .filter((c): c is City & { xy: [number, number] } => Boolean(c.xy) && c.xy![0] > 4 && c.xy![0] < W - 4 && c.xy![1] > 4 && c.xy![1] < H - 4)
    .sort((a, b) => (b.c ?? 0) - (a.c ?? 0) || (b.p ?? 0) - (a.p ?? 0))
    .slice(0, max)
    .map((c) => {
      const size = c.c ? 17 : 14;
      const w = c.n.length * size * 0.56 + 8;
      const [x0, y0] = c.xy;
      const options = [
        { box: [x0 + 12, y0 - size * 0.7, x0 + 12 + w, y0 + size * 0.5] as Box, tx: 12, ty: size * 0.35, anchor: 'start' as const },
        { box: [x0 - 12 - w, y0 - size * 0.7, x0 - 12, y0 + size * 0.5] as Box, tx: -12, ty: size * 0.35, anchor: 'end' as const },
        { box: [x0 - w / 2, y0 - 12 - size, x0 + w / 2, y0 - 10] as Box, tx: 0, ty: -12, anchor: 'middle' as const },
        { box: [x0 - w / 2, y0 + 10, x0 + w / 2, y0 + 12 + size] as Box, tx: 0, ty: 12 + size * 0.8, anchor: 'middle' as const },
      ];
      const fits = (b: Box) => b[0] > 2 && b[2] < W - 2 && b[1] > 2 && b[3] < H - 2 && !boxes.some((o) => !(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3]));
      const pick = options.find((o) => fits(o.box));
      if (pick) boxes.push(pick.box, [x0 - 7, y0 - 7, x0 + 7, y0 + 7]);
      return { ...c, size, label: pick ? { tx: pick.tx, ty: pick.ty, anchor: pick.anchor } : null };
    })
    .filter((m) => m.label || m.c);
}

export function MarkerLayer({ markers }: { markers: Marker[] }) {
  return (
    <>
      {markers.map((m) => (
        <g key={m.n} transform={`translate(${m.xy[0]} ${m.xy[1]})`} className={m.c ? 'city is-capital' : 'city'}>
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
