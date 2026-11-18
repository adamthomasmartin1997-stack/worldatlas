import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { niceTicks, type Point } from './LineChart';

export interface Series { key: string; label: string; data: Point[] }

const HEIGHT = 260;
const M = { top: 16, right: 16, bottom: 28, left: 56 };

/**
 * Line chart for comparing a few series on one axis. Lines differ by colour and dash so they can be
 * told apart without colour; hover (or focus + arrow keys) reads every series for one year; the full
 * data is available as a table.
 */
export function MultiLineChart({ title, series, format, axisFormat = format, zeroBaseline = true }: {
  title: string;
  series: Series[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  zeroBaseline?: boolean;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = series.filter((s) => s.data.length >= 2);
  const years = useMemo(() => [...new Set(shown.flatMap((s) => s.data.map((d) => d[0])))].sort((a, b) => a - b), [shown]);

  const geo = useMemo(() => {
    if (!years.length) return null;
    const values = shown.flatMap((s) => s.data.map((d) => d[1]));
    const x0 = years[0], x1 = years[years.length - 1];
    const ticksY = niceTicks(zeroBaseline ? 0 : Math.min(...values), Math.max(...values));
    const y0 = ticksY[0], y1 = ticksY[ticksY.length - 1];
    const iw = width - M.left - M.right, ih = HEIGHT - M.top - M.bottom;
    const x = (yr: number) => M.left + ((yr - x0) / (x1 - x0 || 1)) * iw;
    const y = (v: number) => M.top + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
    const stepX = width < 480 ? 20 : 10;
    const ticksX: number[] = [];
    for (let yr = Math.ceil(x0 / 10) * 10; yr <= x1; yr += stepX) ticksX.push(yr);
    const paths = shown.map((s) => s.data.map(([yr, v], i) => `${i ? 'L' : 'M'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`).join(''));
    return { x, y, ticksX, ticksY, paths };
  }, [shown, years, width, zeroBaseline]);

  if (!geo) return null;
  const at = (s: Series, yr: number) => s.data.find((d) => d[0] === yr)?.[1];
  const readYear = hoverYear ?? years[years.length - 1];

  const pick = (clientX: number) => {
    const px = clientX - box.current!.getBoundingClientRect().left;
    let best = years[0];
    for (const yr of years) if (Math.abs(geo.x(yr) - px) < Math.abs(geo.x(best) - px)) best = yr;
    setHoverYear(best);
  };
  const step = (dir: number) => setHoverYear((h) => {
    const i = years.indexOf(h ?? years[years.length - 1]);
    return years[Math.max(0, Math.min(years.length - 1, i + dir))];
  });

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="chart-title">{title}</span>
        <span className="chart-readout" aria-live="polite">
          <span className="multi-readout">
            <span>{readYear}:</span>
            {shown.map((s, i) => {
              const v = at(s, readYear);
              return <span key={s.key} className="multi-readout-item"><span className={`legend-line line-${i}`} aria-hidden="true" />{s.label} <strong>{v == null ? 'no data' : format(v)}</strong></span>;
            })}
          </span>
        </span>
      </figcaption>
      <div ref={box} className="chart-plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title}, ${years[0]} to ${years[years.length - 1]}. Use arrow keys to read values; full data in the table below.`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setHoverYear(null)}
          onBlur={() => setHoverYear(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
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
          {hoverYear != null && <line x1={geo.x(hoverYear)} x2={geo.x(hoverYear)} y1={M.top} y2={HEIGHT - M.bottom} className="chart-crosshair" />}
          {shown.map((s, i) => {
            const last = s.data[s.data.length - 1];
            const v = at(s, readYear);
            return (
              <g key={s.key}>
                <path d={geo.paths[i]} className={`chart-line line-${i}`} />
                {v != null && <circle cx={geo.x(readYear)} cy={geo.y(v)} r={hoverYear != null ? 5 : 4} className={`chart-dot dot-${i}`} />}
                {hoverYear == null && v == null && <circle cx={geo.x(last[0])} cy={geo.y(last[1])} r={4} className={`chart-dot dot-${i}`} />}
              </g>
            );
          })}
        </svg>
      </div>
      <details className="chart-table">
        <summary>Show data table</summary>
        <div className="table-scroll">
          <table className="data-table" aria-describedby={id}>
            <caption id={id} className="sr-only">{title} by year</caption>
            <thead><tr><th scope="col">Year</th>{shown.map((s) => <th key={s.key} scope="col" className="num">{s.label}</th>)}</tr></thead>
            <tbody>{[...years].reverse().map((yr) => (
              <tr key={yr}><th scope="row">{yr}</th>{shown.map((s) => { const v = at(s, yr); return <td key={s.key} className="num">{v == null ? '—' : format(v)}</td>; })}</tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
