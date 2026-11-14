import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type Point = [year: number, value: number];

const HEIGHT = 220;
const M = { top: 16, right: 24, bottom: 28, left: 52 };

/** Round step sizes (1, 2, 2.5, 5 × 10ⁿ) so axis labels read cleanly. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  let v = start;
  do {
    ticks.push(Math.round(v * 1e6) / 1e6);
    v += step;
  } while (ticks[ticks.length - 1] < max); // the top tick must cover the maximum, or the line runs off the chart
  return ticks;
}

/**
 * Single-series line chart: one measure, one axis. Hover (or focus + arrow keys) reads out a year;
 * the latest value is labelled directly; the full data is available as a table.
 */
export function LineChart({ title, data, format, axisFormat = format, zeroBaseline = true }: {
  title: string;
  data: Point[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  zeroBaseline?: boolean;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const years = data.map((d) => d[0]);
    const values = data.map((d) => d[1]);
    const x0 = years[0], x1 = years[years.length - 1];
    const ticksY = niceTicks(zeroBaseline ? 0 : Math.min(...values), Math.max(...values));
    const y0 = ticksY[0], y1 = ticksY[ticksY.length - 1];
    const iw = width - M.left - M.right, ih = HEIGHT - M.top - M.bottom;
    const x = (yr: number) => M.left + ((yr - x0) / (x1 - x0 || 1)) * iw;
    const y = (v: number) => M.top + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
    const decade = Math.ceil(x0 / 10) * 10;
    const stepX = width < 480 ? 20 : 10;
    const ticksX: number[] = [];
    for (let yr = decade; yr <= x1; yr += stepX) ticksX.push(yr);
    const path = data.map(([yr, v], i) => `${i ? 'L' : 'M'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`).join('');
    return { x, y, ticksX, ticksY, path, iw };
  }, [data, width, zeroBaseline]);

  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const active = hover != null ? data[hover] : null;

  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const px = clientX - r.left;
    let best = 0;
    data.forEach(([yr], i) => { if (Math.abs(geo.x(yr) - px) < Math.abs(geo.x(data[best][0]) - px)) best = i; });
    setHover(best);
  };

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="chart-title">{title}</span>
        <span className="chart-readout" aria-live="polite">
          {active ? <><strong>{format(active[1])}</strong> in {active[0]}</> : <><strong>{format(last[1])}</strong> in {last[0]}</>}
        </span>
      </figcaption>
      <div ref={box} className="chart-plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title}, ${data[0][0]} to ${last[0]}. Latest: ${format(last[1])} in ${last[0]}. Use arrow keys to read values; full data in the table below.`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => Math.max(0, (h ?? data.length - 1) - 1)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => Math.min(data.length - 1, (h ?? data.length - 1) + 1)); }
          }}
        >
          {geo.ticksY.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={geo.y(t)} y2={geo.y(t)} className="chart-grid" />
              <text x={M.left - 8} y={geo.y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{axisFormat(t)}</text>
            </g>
          ))}
          {geo.ticksX.map((t) => (
            <text key={t} x={geo.x(t)} y={HEIGHT - 8} className="chart-axis" textAnchor={geo.x(t) > width - M.right - 14 ? 'end' : 'middle'}>{t}</text>
          ))}
          <path d={geo.path} className="chart-line" />
          <circle cx={geo.x(last[0])} cy={geo.y(last[1])} r={4} className="chart-dot" />
          {active && (
            <>
              <line x1={geo.x(active[0])} x2={geo.x(active[0])} y1={M.top} y2={HEIGHT - M.bottom} className="chart-crosshair" />
              <circle cx={geo.x(active[0])} cy={geo.y(active[1])} r={5} className="chart-dot active" />
            </>
          )}
        </svg>
      </div>
      <details className="chart-table">
        <summary>Show data table</summary>
        <div className="table-scroll">
          <table className="data-table" aria-describedby={id}>
            <caption id={id} className="sr-only">{title} by year</caption>
            <thead><tr><th scope="col">Year</th><th scope="col" className="num">{title}</th></tr></thead>
            <tbody>{[...data].reverse().map(([yr, v]) => <tr key={yr}><th scope="row">{yr}</th><td className="num">{format(v)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
