import { ERAS, NOW, eraOfYear, type Era } from './eras';
import { yearOf, type HistoryEvent } from './events';

/** An entry from the country's own written timeline (src/content/deep/<iso>/history.json). */
export interface Written { year: string; title: string; text: string }

export type TimelineItem =
  | { type: 'written'; year: number; label: string; title: string; text: string; event?: HistoryEvent }
  | { type: 'event'; year: number; event: HistoryEvent };

/**
 * Year of a written timeline label, negative for BC: "1066", "c. 2500 BC", "AD 70", "1930s",
 * "1914–1918" (first year), "65,000 years ago". Null when there's no number to read.
 */
export function parseWrittenYear(label: string): number | null {
  const s = label.replace(/,/g, '').trim();
  const ago = s.match(/([\d.]+)\s*(million\s+)?years?\s+ago/i);
  if (ago) return Math.round(NOW - Number(ago[1]) * (ago[2] ? 1e6 : 1));
  const m = s.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return /\bBC(E)?\b/i.test(s) ? -n : n;
}

// Words too common to show that two titles are about the same thing ("First Republic" isn't the Republic of Genoa).
const STOP = new Set([
  'the', 'and', 'for', 'its', 'his', 'her', 'new', 'old', 'age', 'era', 'end', 'ends', 'begins', 'with', 'from', 'that', 'this', 'into', 'their',
  'war', 'wars', 'battle', 'siege', 'treaty', 'first', 'second', 'third', 'fourth', 'fifth', 'great', 'two', 'civil', 'invasion', 'rule', 'occupation',
  'republic', 'empire', 'kingdom', 'dynasty', 'state', 'states', 'union', 'people', 'peoples', 'democratic', 'socialist', 'soviet', 'power', 'height',
]);
const words = (t: string) =>
  new Set(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w)));

/**
 * How an event relates to a country: 'local' when it happened there or involved only a few
 * countries including it; 'world' when it involved it among many (World War II, COVID-19).
 */
export function relation(e: HistoryEvent, iso: string): 'local' | 'world' | null {
  if (e.p === iso) return 'local';
  if (!e.c?.includes(iso)) return null;
  return e.c.length <= 3 ? 'local' : 'world';
}

export interface CountryTimeline {
  eras: { era: Era; items: TimelineItem[]; hidden: number }[];
  world: HistoryEvent[];
  total: number;
}

/**
 * The country's written timeline merged with imported events, grouped by era. A written entry
 * that matches an imported event (within a year, sharing a distinctive word) links to it instead
 * of appearing twice. Without `all`, each era shows every written entry plus its best-known
 * `perEra` imported events.
 */
export function buildCountryTimeline(iso: string, written: Written[], events: HistoryEvent[], { all = false, perEra = 6 } = {}): CountryTimeline {
  const local: HistoryEvent[] = [];
  const world: HistoryEvent[] = [];
  for (const e of events) {
    const r = relation(e, iso);
    if (r === 'local') local.push(e);
    else if (r === 'world') world.push(e);
  }
  const used = new Set<string>();
  const items: TimelineItem[] = [];
  for (const w of written) {
    const year = parseWrittenYear(w.year);
    if (year == null) continue;
    const ww = words(w.title);
    const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    // 1. The same name, even for a world event ("Iran–Iraq War").
    // 2. Otherwise a nearby event sharing distinctive words: for a state, every word of the written
    //    title must be in its name ("Khmer Rouge" is not the Khmer Republic); for anything else, at
    //    least half of them.
    const exact = [...local, ...world].find((e) => !used.has(e.id) && norm(e.t) === norm(w.title));
    const score = (e: HistoryEvent) => {
      if (Math.abs(yearOf(e.s) - year) > (e.k === 'state' ? 25 : 1) || !ww.size) return 0;
      const ew = words(e.t);
      const shared = [...ww].filter((x) => ew.has(x)).length;
      if (e.k === 'state') return shared === ww.size ? shared : 0;
      return shared / ww.size >= 0.5 ? shared : 0;
    };
    const match = exact ?? local.filter((e) => !used.has(e.id) && score(e) > 0).sort((a, b) => score(b) - score(a) || b.n - a.n)[0];
    if (match) used.add(match.id);
    items.push({ type: 'written', year, label: w.year, title: w.title, text: w.text, event: match });
  }
  const imported = local.filter((e) => !used.has(e.id));
  const eras = ERAS.map((era) => {
    const inEra = (y: number) => eraOfYear(y) === era;
    const own = items.filter((i) => inEra(i.year));
    const ev = imported.filter((e) => inEra(yearOf(e.s))).sort((a, b) => b.n - a.n);
    const shown = all ? ev : ev.slice(0, perEra);
    const list: TimelineItem[] = [...own, ...shown.map((e) => ({ type: 'event' as const, year: yearOf(e.s), event: e }))];
    list.sort((a, b) => a.year - b.year || (a.type === 'written' ? -1 : 1));
    return { era, items: list, hidden: ev.length - shown.length };
  }).filter((g) => g.items.length);
  return { eras, world: world.sort((a, b) => b.n - a.n).slice(0, 8), total: items.length + imported.length };
}
