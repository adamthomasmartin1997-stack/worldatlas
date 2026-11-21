// Building blocks for deep-dive pages: a numbered-pin map, a population pyramid, comparison bars,
import { useData } from './useData';
import { ZoomableSvg, useZoomScale } from './ZoomableSvg';
// card groups, a festival calendar and step lists. All are plain, accessible HTML/SVG.
import { useMemo } from 'react';
import { geoCentroid, geoContains, geoNaturalEarth1, geoPath } from 'd3-geo';
import { useWorld } from './useWorld';
import { homeland } from './CountryMap';
import { SourceNote } from './ui';
import type { Country } from '../data/countries';

export interface Pin { name: string; lat: number; lon: number; kind?: string; text?: string; shared?: boolean }

const W = 600, H = 520, PAD = 28;

/**
 * The country's outline with numbered pins, plus a numbered list underneath (the list is the accessible
 * alternative to the map). Pins outside the main landmass (e.g. overseas islands) are listed without a number.
 */
/** Numbered pins that keep their size on screen when the map is zoomed. */
function PinLayer({ points, pins, numbers }: { points: ({ at: number[]; real: number[] } | null)[]; pins: Pin[]; numbers: (number | null)[] }) {
  const k = useZoomScale();
  return (
    <>
      {points.map((pt, i) => pt && (
        <g key={pins[i].name} className={`pin pin-${pins[i].kind ?? 'place'}`}>
          {(pt.at[0] !== pt.real[0] || pt.at[1] !== pt.real[1]) && <><line x1={pt.real[0]} y1={pt.real[1]} x2={pt.at[0]} y2={pt.at[1]} className="pin-leader" /><circle cx={pt.real[0]} cy={pt.real[1]} r={3 / k} className="pin-dot" /></>}
          <g transform={`translate(${pt.at[0]},${pt.at[1]}) scale(${1 / k})`}>
            <circle r={13} />
            <text textAnchor="middle" dy="0.35em">{numbers[i]}</text>
          </g>
        </g>
      ))}
    </>
  );
}

export function PinMap({ country, pins: given, label, insideOnly }: { country: Country; pins: Pin[]; label: string; insideOnly?: boolean }) {
  const { features } = useWorld();
  // For shared (transnational) sites, drop points that fall outside this country's borders.
  const pins = useMemo(() => {
    const f = features?.find((x) => x.properties.cca3 === country.cca3);
    return insideOnly && f ? given.filter((p) => !p.shared || geoContains(f, [p.lon, p.lat])) : given;
  }, [features, country.cca3, given, insideOnly]);
  const drawn = useMemo(() => {
    const f = features?.find((x) => x.properties.cca3 === country.cca3);
    if (!f || !country.hasShape) return null;
    const { shape } = homeland(f, 0.45); // ~26°: keeps outlying parts such as Papua, still drops far-off territories
    const [lon] = geoCentroid(shape);
    const projection = geoNaturalEarth1().rotate([-lon, 0]).fitExtent([[PAD, PAD], [W - PAD, H - PAD]], shape);
    const d = geoPath(projection)(shape) ?? '';
    const real = pins.map((p) => {
      const xy = projection([p.lon, p.lat]);
      return xy && xy[0] > 6 && xy[0] < W - 6 && xy[1] > 6 && xy[1] < H - 6 ? xy : null;
    });
    // Nudge pins that would overlap an earlier one, keeping a thin line back to the true spot.
    const placed: [number, number][] = [];
    const points = real.map((xy) => {
      if (!xy) return null;
      let [x, y] = xy, tries = 0;
      while (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 27) && tries < 12) {
        const a = (tries * Math.PI) / 3; x = xy[0] + Math.cos(a) * 28 * (1 + Math.floor(tries / 6)); y = xy[1] + Math.sin(a) * 28 * (1 + Math.floor(tries / 6)); tries++;
      }
      placed.push([x, y]);
      return { at: [x, y] as [number, number], real: xy };
    });
    return { d, points };
  }, [features, country, pins]);

  let n = 0;
  const numbers = pins.map((_, i) => (drawn?.points[i] ? ++n : null));

  return (
    <div className="pin-map">
      {drawn && (
        <div className="map-frame country-map">
          <ZoomableSvg width={W} height={H} label={`${label}: map of ${country.name} with ${n} numbered places, listed below`}>
            <path d={drawn.d} className="country-shape" />
            <PinLayer points={drawn.points} pins={pins} numbers={numbers} />
          </ZoomableSvg>
        </div>
      )}
      <ol className="pin-list">
        {pins.map((p, i) => (
          <li key={p.name} className={numbers[i] ? '' : 'pin-unnumbered'}>
            <span className={`pin-badge pin-${p.kind ?? 'place'}`} aria-hidden="true">{numbers[i] ?? '•'}</span>
            <span><strong>{p.name}</strong>{p.kind && <span className="muted"> · {p.kind}</span>}{p.text && <span className="pin-text">{p.text}</span>}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- Data loaded on demand -------------------------------------------------------------------

type Ages = { year: number; male: Record<string, number>; female: Record<string, number> };
type Jobs = { year: number; farming?: number; industry?: number; services?: number };
interface Structure { retrieved: string; countries: Record<string, { ages?: Ages; jobs?: Jobs }> }
interface Heritage { retrieved: string; countries: Record<string, { n: string; lat: number; lon: number; kind: string; shared?: 1 }[]> }

/** The country's best-known World Heritage Sites of one kind, as a pin map (Wikidata). */
export function HeritageMap({ country, kinds, title }: { country: Country; kinds: string[]; title: string }) {
  const data = useData<Heritage>('heritage.json');
  const sites = (data?.countries[country.cca3] ?? []).filter((s) => kinds.includes(s.kind)).slice(0, 10);
  if (!sites.length) return null;
  return (
    <figure className="chart deep-figure">
      <figcaption className="chart-title">{title}</figcaption>
      <PinMap country={country} label={title} insideOnly pins={sites.map((s) => ({ name: s.n[0].toUpperCase() + s.n.slice(1), lat: s.lat, lon: s.lon, kind: s.kind === 'cultural' ? undefined : s.kind, shared: Boolean(s.shared) }))} />
      <SourceNote sources={['wikidata']}>UNESCO World Heritage Sites, best known first.</SourceNote>
    </figure>
  );
}

const AGE_ORDER = ['80UP', '7579', '7074', '6569', '6064', '5559', '5054', '4549', '4044', '3539', '3034', '2529', '2024', '1519', '1014', '0509', '0004'];
const ageLabel = (k: string) => (k === '80UP' ? '80+' : `${Number(k.slice(0, 2))}–${Number(k.slice(2))}`);

/** Population pyramid: share of males (left) and females (right) in each five-year age group (World Bank). */
export function PopulationPyramid({ country }: { country: Country }) {
  const data = useData<Structure>('structure.json');
  const ages = data?.countries[country.cca3]?.ages;
  if (!ages) return null;
  const max = Math.max(...AGE_ORDER.flatMap((k) => [ages.male[k] ?? 0, ages.female[k] ?? 0]), 1);
  return (
    <figure className="chart deep-figure">
      <figcaption className="chart-title">Ages of the people of {country.name} ({ages.year})</figcaption>
      <p className="muted pyramid-key"><span className="key key-male" /> Males <span className="key key-female" /> Females · each bar is the share of all males or all females in that age group</p>
      <table className="pyramid">
        <thead><tr><th scope="col">Males</th><th scope="col">Age</th><th scope="col">Females</th></tr></thead>
        <tbody>
          {AGE_ORDER.map((k) => (
            <tr key={k}>
              <td className="pyr-left"><span className="pyr-bar pyr-male" style={{ width: `${((ages.male[k] ?? 0) / max) * 100}%` }} /><span className="sr-only">{ages.male[k]}%</span></td>
              <th scope="row">{ageLabel(k)}</th>
              <td className="pyr-right"><span className="pyr-bar pyr-female" style={{ width: `${((ages.female[k] ?? 0) / max) * 100}%` }} /><span className="sr-only">{ages.female[k]}%</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <SourceNote sources={['world-bank']}>A wide base means many children; a wide top means many older people.</SourceNote>
    </figure>
  );
}

/** Simple labelled horizontal bars. */
export function Bars({ title, rows, unit, note, sources = ['world-bank'] }: { title: string; rows: { label: string; value: number; highlight?: boolean }[]; unit: (v: number) => string; note?: string; sources?: ('world-bank' | 'wikidata')[] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure className="chart deep-figure">
      <figcaption className="chart-title">{title}</figcaption>
      <dl className="bars">
        {rows.map((r) => (
          <div key={r.label} className={r.highlight ? 'bar-row is-highlight' : 'bar-row'}>
            <dt>{r.label}</dt>
            <dd><span className="bar-track"><span className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></span><b>{unit(r.value)}</b></dd>
          </div>
        ))}
      </dl>
      <SourceNote sources={sources}>{note}</SourceNote>
    </figure>
  );
}

/** Jobs by sector, from the World Bank (ILO modelled estimates). */
export function JobsBars({ country }: { country: Country }) {
  const data = useData<Structure>('structure.json');
  const jobs = data?.countries[country.cca3]?.jobs;
  if (!jobs || jobs.services == null) return null;
  return (
    <Bars title={`What people in ${country.name} do for work (${jobs.year})`} unit={(v) => `${Math.round(v)}%`} note="Share of all jobs; International Labour Organization estimates."
      rows={[{ label: 'Services', value: jobs.services ?? 0 }, { label: 'Industry', value: jobs.industry ?? 0 }, { label: 'Farming, forestry and fishing', value: jobs.farming ?? 0 }]} />
  );
}

export interface CardGroup { id: string; title: string; intro?: string; items: { title: string; subtitle?: string; text: string; tag?: string }[] }

export function CardGroups({ groups }: { groups: CardGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.id} id={g.id} className="deep-chapter" aria-labelledby={`${g.id}-h`}>
          <h2 id={`${g.id}-h`}>{g.title}</h2>
          {g.intro && <p>{g.intro}</p>}
          <ul className="deep-cards">
            {g.items.map((c) => (
              <li key={c.title} className="deep-card">
                {c.tag && <span className="tag">{c.tag}</span>}
                <h3>{c.title}</h3>
                {c.subtitle && <p className="deep-card-sub">{c.subtitle}</p>}
                <p>{c.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A year of festivals, month by month. */
export function Calendar({ title, items }: { title: string; items: { month: number; name: string; text: string }[] }) {
  return (
    <section id="calendar" className="deep-chapter" aria-labelledby="calendar-h">
      <h2 id="calendar-h">{title}</h2>
      <ol className="deep-calendar">
        {MONTHS.map((m, i) => {
          const here = items.filter((x) => x.month === i + 1);
          return (
            <li key={m} className={here.length ? 'has-events' : ''}>
              <span className="cal-month">{m.slice(0, 3)}<span className="sr-only">{m.slice(3)}</span></span>
              {here.length ? here.map((x) => <div key={x.name}><strong>{x.name}</strong><p>{x.text}</p></div>) : <span className="muted">—</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The country's biggest cities by population (Wikidata). */
export function CityBars({ country }: { country: Country }) {
  const data = useData<Record<string, { n: string; p?: number; c?: 1 }[]>>('cities.json');
  const cities = (data?.[country.cca3] ?? []).filter((x) => x.p).sort((a, b) => (b.p ?? 0) - (a.p ?? 0)).slice(0, 8);
  if (cities.length < 3) return null;
  return (
    <Bars title={`Biggest cities in ${country.name}`} sources={['wikidata']} note="City population within city limits, as recorded on Wikidata; years vary."
      unit={(v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('en-GB', { maximumFractionDigits: 1 })} million` : Math.round(v).toLocaleString('en-GB'))}
      rows={cities.map((x) => ({ label: x.c ? `${x.n} (capital)` : x.n, value: x.p!, highlight: Boolean(x.c) }))} />
  );
}

/** Numbered steps, e.g. how a law is made. */
export function Steps({ id, title, intro, items }: { id: string; title: string; intro?: string; items: { title: string; text: string }[] }) {
  return (
    <section id={id} className="deep-chapter" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {intro && <p>{intro}</p>}
      <ol className="deep-steps">
        {items.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}
      </ol>
    </section>
  );
}
