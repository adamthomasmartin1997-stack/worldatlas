import { SOVEREIGN, type Country } from '../data/countries';
import { shuffle } from './answers';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: { key: Difficulty; label: string; blurb: string }[] = [
  { key: 'easy', label: 'Easy', blurb: 'Well-known countries. Wrong answers come from other parts of the world.' },
  { key: 'medium', label: 'Medium', blurb: 'Any country. Wrong answers come from the same region.' },
  { key: 'hard', label: 'Hard', blurb: 'Lesser-known countries. Wrong answers are close neighbours that are just as obscure, or look alike.' },
];

export function parseDifficulty(v: string | null): Difficulty {
  return v === 'easy' || v === 'hard' ? v : 'medium';
}

/**
 * How well known a country is, from 0 (least) to 1 (most), ranked by the number of Wikipedia
 * language editions with an article about it (Wikidata sitelinks).
 */
const ranked = [...SOVEREIGN].sort((a, b) => (a.fame ?? 0) - (b.fame ?? 0));
const famePct = new Map(ranked.map((c, i) => [c.cca3, ranked.length > 1 ? i / (ranked.length - 1) : 1]));
export const fameOf = (c: Country) => famePct.get(c.cca3) ?? 0.5;

/** Which countries to ask about: easy = the better-known half, hard = the lesser-known 60%, medium = anything. */
export function pickTargets(pool: Country[], d: Difficulty, n: number): Country[] {
  const byFame = [...pool].sort((a, b) => fameOf(b) - fameOf(a));
  const keep = Math.max(n, Math.ceil(pool.length * (d === 'easy' ? 0.5 : 0.6)));
  const base = d === 'easy' ? byFame.slice(0, keep) : d === 'hard' ? byFame.slice(-keep) : pool;
  return shuffle(base).slice(0, n);
}

/**
 * Wrong answers for a question about `target`.
 * - easy: well-known countries from other parts of the world, so the right answer stands out
 * - medium: random countries from the same region
 * - hard: the most similar countries: same subregion, similar fame and (if given) similar in some
 *   other way, e.g. flags that share colours
 */
export function pickDistractors(target: Country, candidates: Country[], d: Difficulty, n = 3, similarity?: (a: Country, b: Country) => number): Country[] {
  const others = candidates.filter((c) => c.cca3 !== target.cca3);
  const fallback = (picked: Country[]) => {
    const rest = shuffle(others.filter((c) => !picked.includes(c)));
    return [...picked, ...rest].slice(0, n);
  };
  if (d === 'easy') {
    const far = others.filter((c) => c.subregion !== target.subregion && fameOf(c) >= 0.4);
    return fallback(shuffle(far).slice(0, n));
  }
  if (d === 'medium') {
    return fallback(shuffle(others.filter((c) => c.region === target.region)).slice(0, n));
  }
  const score = (c: Country) =>
    (c.subregion === target.subregion ? 3 : c.region === target.region ? 1 : 0) +
    (1 - Math.abs(fameOf(c) - fameOf(target))) * 2 +
    (similarity ? similarity(target, c) * 3 : 0) +
    Math.random() * 0.8; // a little variety between rounds
  const best = [...others].sort((a, b) => score(b) - score(a)).slice(0, n + 3);
  return fallback(shuffle(best).slice(0, n));
}

/** Share of flag colour families two flags have in common, 0–1. */
export function flagSimilarity(a: Country, b: Country): number {
  const ca = a.flag?.colours ?? [], cb = b.flag?.colours ?? [];
  if (!ca.length || !cb.length) return 0;
  const shared = ca.filter((x) => cb.includes(x)).length;
  return shared / Math.max(ca.length, cb.length);
}

export const flagUrl = (c: Pick<Country, 'cca3'>) => `${import.meta.env.BASE_URL}data/flags/${c.cca3.toLowerCase()}.svg`;

/** How close two countries are in size, 0–1 (1 = same area). Used to pick look-alike outlines. */
export function sizeSimilarity(a: Country, b: Country): number {
  const x = a.area?.value, y = b.area?.value;
  if (!x || !y) return 0;
  return Math.max(0, 1 - Math.abs(Math.log10(x / y)) / 1.5);
}
