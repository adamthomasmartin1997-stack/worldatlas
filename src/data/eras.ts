import { getCountry, type Country } from './countries';
import { yearOf, type HistoryEvent } from './events';

/**
 * Nine eras for browsing history. Boundaries are conventional and rounded; each era's first year
 * is included and its last year excluded (the next era starts there).
 */
export interface Era { slug: string; name: string; from: number; to: number; intro: string }

export const NOW = new Date().getFullYear();

export const ERAS: Era[] = [
  { slug: 'ancient', name: 'The ancient world', from: -3500, to: -500, intro: 'The first cities, writing and kingdoms grew up along rivers: the Nile, the Tigris and Euphrates, the Indus and the Yellow River.' },
  { slug: 'classical', name: 'The classical age', from: -500, to: 500, intro: 'Great empires such as Persia, Rome, the Maurya and the Han ruled huge areas, and ideas from Greek philosophers, the Buddha and Confucius spread.' },
  { slug: 'middle-ages', name: 'The Middle Ages', from: 500, to: 1450, intro: 'Islam spread from Arabia, kingdoms rose and fell across Europe and Africa, and the Mongols built the largest land empire the world had seen.' },
  { slug: 'exploration', name: 'The age of exploration', from: 1450, to: 1650, intro: 'Sailors crossed the oceans, linking the continents. Europeans conquered empires in the Americas, and trade, slavery and new crops changed the world.' },
  { slug: 'revolutions', name: 'Kings and revolutions', from: 1650, to: 1815, intro: 'Powerful monarchs ruled much of the world until revolutions in America, France and Haiti argued that power should come from the people.' },
  { slug: 'empires', name: 'Empires and industry', from: 1815, to: 1914, intro: 'Factories, railways and steamships transformed life, while European powers took control of most of Africa and much of Asia.' },
  { slug: 'world-wars', name: 'The world wars', from: 1914, to: 1945, intro: 'Two world wars, a revolution in Russia and a great economic depression killed tens of millions and redrew the map.' },
  { slug: 'cold-war', name: 'The Cold War', from: 1945, to: 1991, intro: 'The United States and the Soviet Union competed for influence worldwide, while dozens of colonies in Africa and Asia won independence.' },
  { slug: 'today', name: 'Our times', from: 1991, to: NOW + 1, intro: 'After the Soviet Union broke up, the internet, global trade and new conflicts shaped the world we live in now.' },
];

export const eraBySlug = (slug: string | undefined) => ERAS.find((e) => e.slug === slug);
export const eraOfYear = (y: number) => ERAS.find((e) => y >= e.from && y < e.to) ?? (y < ERAS[0].from ? ERAS[0] : ERAS[ERAS.length - 1]);

export const fmtYear = (y: number) => (y < 0 ? `${-y} BC` : String(y));
export const fmtRange = (a: number, b: number) => (a < 0 && b <= 0 ? `${-a}–${-b} BC` : `${fmtYear(a)}–${b > NOW ? 'today' : fmtYear(b)}`);

/** Kinds of event that spread over large areas, whose single map point is often unreliable. */
const WIDE_KINDS = new Set(['war', 'civil war', 'state', 'epidemic', 'expedition', 'rebellion', 'revolution', 'genocide']);

/** Events about mass killing: never used as headlines, quiz questions or random picks. */
export const SENSITIVE_KINDS = new Set(['genocide', 'massacre']);

/** Last year of an event; a treaty counts only in the year it was signed, not for as long as it was in force. */
export const endOf = (e: HistoryEvent) => (e.e && e.k !== 'treaty' ? yearOf(e.e) : yearOf(e.s));

/**
 * The part of the world an event belongs to: where it happened, else the region most of its
 * countries are in. Events spread over three or more regions count as 'World'.
 */
export function regionOf(e: HistoryEvent): Country['region'] | 'World' | undefined {
  const at = getCountry(e.p)?.region;
  if (at) return at;
  const regions = (e.c ?? []).map((c) => getCountry(c)?.region).filter((r): r is Country['region'] => Boolean(r));
  if (!regions.length) return undefined;
  const count = new Map<string, number>();
  for (const r of regions) count.set(r, (count.get(r) ?? 0) + 1);
  if (count.size >= 3) return 'World';
  const [top, n] = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  // A war or empire with no real location and a single named country is too thin to place
  // (Wikidata names Australia as the only modern participant in the Russian Civil War).
  if (n < 2 && WIDE_KINDS.has(e.k)) return undefined;
  return top as Country['region'];
}

/** Events that started in the era (states are listed separately, as who ruled). */
export function eventsInEra(list: HistoryEvent[], era: Era) {
  return list.filter((e) => e.k !== 'state' && yearOf(e.s) >= era.from && yearOf(e.s) < era.to);
}

/**
 * States and empires that existed during [from, to) for at least `overlap` years, best known first.
 * Only those with an end date: Wikidata also files some cities (Milan, Verona) as historical states,
 * and those have no end.
 */
export function statesDuring(list: HistoryEvent[], from: number, to: number, overlap = 0) {
  return list
    .filter((e) => e.k === 'state' && e.e && Math.min(to, yearOf(e.e)) - Math.max(from, yearOf(e.s)) >= overlap)
    .sort((a, b) => b.n - a.n);
}

/**
 * Themes that are capped in headline lists, so a list isn't five World Cups or three Apollo
 * missions: they have many well-known entries but are only part of the story.
 */
export const THEME: Partial<Record<HistoryEvent['k'], string>> = {
  sport: 'sport', spaceflight: 'space', invention: 'invention', exhibition: 'fair', earthquake: 'disaster', eruption: 'disaster', epidemic: 'disaster',
};
const THEME_CAP: Record<string, number> = { sport: 1, space: 1, invention: 2, fair: 1, disaster: 1 };

/**
 * Headline events balanced across the world: take the best-known event from each region in turn,
 * so a list isn't all European wars. Leaves out sensitive events, global events tied to many
 * countries, and events that belong to a larger event already picked.
 */
export function pickHeadlines(events: HistoryEvent[], count = 8): HistoryEvent[] {
  const pool = events.filter((e) => !SENSITIVE_KINDS.has(e.k) && (e.c?.length ?? 0) <= 12).sort((a, b) => b.n - a.n);
  const byRegion = new Map<string, HistoryEvent[]>();
  for (const e of pool) {
    const r = regionOf(e) ?? 'World';
    (byRegion.get(r) ?? byRegion.set(r, []).get(r)!).push(e);
  }
  const picked: HistoryEvent[] = [];
  const taken = new Set<string>();
  const perTheme = new Map<string, number>();
  const full = (e: HistoryEvent) => (perTheme.get(THEME[e.k] ?? '') ?? 0) >= (THEME_CAP[THEME[e.k] ?? ''] ?? Infinity);
  // Regions with the best-known events go first in each round.
  const order = [...byRegion.keys()].sort((a, b) => byRegion.get(b)![0].n - byRegion.get(a)![0].n);
  while (picked.length < count && order.some((r) => byRegion.get(r)!.length)) {
    for (const r of order) {
      const list = byRegion.get(r)!;
      while (list.length && (taken.has(list[0].id) || list[0].of?.some((p) => taken.has(p)) || list[0].sub?.some((s) => taken.has(s)) || full(list[0]))) list.shift();
      const e = list.shift();
      if (!e) continue;
      picked.push(e);
      taken.add(e.id);
      if (THEME[e.k]) perTheme.set(THEME[e.k]!, (perTheme.get(THEME[e.k]!) ?? 0) + 1);
      if (picked.length === count) break;
    }
  }
  return picked.sort((a, b) => yearOf(a.s) - yearOf(b.s));
}

/**
 * What was going on in a year: events under way then. The window widens when the year is quiet,
 * or when everything found is from one or two parts of the world (up to 25 years for that), since
 * the point is to see the whole world at once.
 */
export function happeningIn(list: HistoryEvent[], year: number, min = 6): { events: HistoryEvent[]; within: number } {
  for (const within of [0, 2, 5, 10, 25, 50, 100]) {
    const events = list.filter((e) => e.k !== 'state' && yearOf(e.s) <= year + within && endOf(e) >= year - within && endOf(e) - yearOf(e.s) <= 60);
    const regions = new Set(events.map(regionOf).filter((r) => r && r !== 'World'));
    if ((events.length >= min && (regions.size >= 3 || within >= 25)) || within === 100) return { events, within };
  }
  return { events: [], within: 0 };
}

/**
 * The year slider gives each era the same width, so the last two centuries aren't squeezed into
 * a sliver. Position 0…ERAS.length maps piecewise-linearly onto years.
 */
export function yearAt(pos: number): number {
  const i = Math.min(ERAS.length - 1, Math.max(0, Math.floor(pos)));
  const era = ERAS[i], end = Math.min(era.to, NOW);
  const y = Math.round(era.from + (Math.min(pos, ERAS.length) - i) * (end - era.from));
  return y === 0 ? 1 : Math.min(y, NOW); // there is no year 0
}
export function posOf(year: number): number {
  const i = ERAS.indexOf(eraOfYear(year));
  const era = ERAS[i], end = Math.min(era.to, NOW);
  return i + Math.max(0, Math.min(1, (year - era.from) / (end - era.from || 1)));
}
