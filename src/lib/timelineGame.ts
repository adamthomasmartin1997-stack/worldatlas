import { ERAS, SENSITIVE_KINDS, endOf, eventsInEra, type Era } from '../data/eras';
import { yearOf, type HistoryEvent } from '../data/events';
import type { Difficulty } from './difficulty';
import { shuffle } from './answers';

export const PER_ROUND = 5;

/**
 * Events fit for an ordering game: well known, not about mass killing, and short enough that
 * "when" has one clear answer (no empires lasting centuries).
 */
export function playable(list: HistoryEvent[], minFame: number): HistoryEvent[] {
  return list.filter((e) => !SENSITIVE_KINDS.has(e.k) && e.k !== 'state' && e.n >= minFame && endOf(e) - yearOf(e.s) <= 30);
}

const FAME: Record<Difficulty, number> = { easy: 60, medium: 35, hard: 25 };

/**
 * Five events to put in order.
 * Easy: famous events from across all of history, at least a century apart.
 * Medium: from one era, spread through it.
 * Hard: from one era and close together in time (within about a sixth of the era), a few years apart.
 */
export function pickRound(list: HistoryEvent[], level: Difficulty, era?: Era, rand = Math.random): HistoryEvent[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const e = era ?? (level === 'easy' ? undefined : shuffle(ERAS.slice(1), rand)[0]); // the ancient era has too few events
    const pool = playable(e ? eventsInEra(list, e) : list, FAME[level]);
    if (pool.length < PER_ROUND) continue;
    const span = e ? Math.min(e.to, new Date().getFullYear()) - e.from : 5000;
    const gap = level === 'easy' ? (e ? Math.max(5, span / 8) : 100) : level === 'medium' ? Math.max(3, span / 20) : 2;
    const seed = shuffle(pool, rand)[0];
    const near = level === 'hard' ? pool.filter((x) => Math.abs(yearOf(x.s) - yearOf(seed.s)) <= Math.max(15, span / 6)) : pool;
    const picked: HistoryEvent[] = [seed];
    for (const x of shuffle(near, rand)) {
      if (picked.length === PER_ROUND) break;
      if (picked.every((p) => Math.abs(yearOf(p.s) - yearOf(x.s)) >= gap && !p.of?.includes(x.id) && !x.of?.includes(p.id))) picked.push(x);
    }
    if (picked.length === PER_ROUND) return shuffle(picked, rand);
  }
  return [];
}

/** The correct order (by start date, then by full date string within a year). */
export const inOrder = (events: HistoryEvent[]) => [...events].sort((a, b) => yearOf(a.s) - yearOf(b.s) || a.s.localeCompare(b.s));

/** Which positions the player got right. */
export function marks(answer: HistoryEvent[]): boolean[] {
  const right = inOrder(answer);
  return answer.map((e, i) => right[i].id === e.id || yearOf(right[i].s) === yearOf(e.s));
}
