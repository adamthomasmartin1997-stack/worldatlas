/**
 * Historical events from Wikidata (CC0), built into public/data/events.json by `npm run data:build`
 * from data/sources/wikidata-events.json. Loaded on demand by the History section.
 * Keys are short because the file holds thousands of events.
 */
export const EVENT_KINDS = ['genocide', 'massacre', 'assassination', 'coup', 'siege', 'battle', 'revolution', 'rebellion', 'civil war', 'war', 'treaty', 'state', 'epidemic', 'earthquake', 'expedition', 'invention', 'spaceflight', 'sport', 'eruption', 'exhibition'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type Precision = 'millennium' | 'century' | 'decade' | 'year' | 'month' | 'day';

export interface HistoryEvent {
  id: string; // Wikidata item, e.g. "Q48314" (Battle of Waterloo)
  k: EventKind;
  t: string; // English name
  d?: string; // Wikidata's short description
  s: string; // start (or only) date: "1815-06-18", "1815-06", "1815" or "-0490" for 490 BC
  sp: Precision;
  e?: string; // end date, same format
  ep?: Precision;
  n: number; // Wikipedia language editions with an article: how widely known, used for ranking only
  c?: string[]; // modern countries concerned (ISO 3166-1 alpha-3)
  p?: string; // modern country where it happened, from its coordinates
  ll?: [number, number]; // [lat, lon]
  w?: string; // English Wikipedia article title, for a "read more" link
  of?: string[]; // larger events it was part of (a battle's war)
  sub?: string[]; // smaller events within it
  ca?: string[]; // causes
  ef?: string[]; // effects
  pr?: string[]; // what came before (an earlier state, a previous treaty)
  nx?: string[]; // what came after
  h?: string[]; // historical states and groups involved that aren't modern countries
}

export interface EventsFile { retrieved: string; events: HistoryEvent[] }

/** Year of a date string; negative for BC. */
export const yearOf = (date: string) => Number(date.match(/^-?\d+/)![0]);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "18 June 1815", "June 1815", "1815", "490 BC", "1800s", "5th century BC". */
export function formatDate(date: string, precision: Precision): string {
  const y = yearOf(date);
  const yearText = (v: number) => (v < 0 ? `${-v} BC` : String(v));
  if (precision === 'millennium') return `${Math.ceil(Math.abs(y) / 1000)}${ordinal(Math.ceil(Math.abs(y) / 1000))} millennium${y < 0 ? ' BC' : ''}`;
  if (precision === 'century') { const c = Math.ceil(Math.abs(y) / 100); return `${c}${ordinal(c)} century${y < 0 ? ' BC' : ''}`; }
  if (precision === 'decade') return y < 0 ? `${-y}s BC` : `${Math.floor(y / 10) * 10}s`;
  const [, m, d] = date.replace(/^-/, '').split('-');
  if (precision === 'day' && d) return `${Number(d)} ${MONTHS[Number(m) - 1]} ${yearText(y)}`;
  if ((precision === 'day' || precision === 'month') && m) return `${MONTHS[Number(m) - 1]} ${yearText(y)}`;
  return yearText(y);
}

function ordinal(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

/** "1803–1815", "18 June 1815", "1939–1945". */
export function formatSpan(e: Pick<HistoryEvent, 's' | 'sp' | 'e' | 'ep'>): string {
  if (!e.e) return formatDate(e.s, e.sp);
  const a = yearOf(e.s), b = yearOf(e.e);
  if (a === b) return formatDate(e.s, e.sp === 'day' ? 'month' : e.sp);
  if (a < 0 && b < 0) return `${-a}–${-b} BC`;
  return `${formatDate(e.s, e.sp === 'day' || e.sp === 'month' ? 'year' : e.sp)}–${formatDate(e.e, e.ep === 'day' || e.ep === 'month' ? 'year' : e.ep ?? 'year')}`;
}
