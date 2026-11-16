import { SOVEREIGN, getCountry, type Country } from '../data/countries';

const sovereign = new Set(SOVEREIGN.map((c) => c.cca3));
/** Land neighbours that are sovereign countries (territories are skipped). */
export const neighbours = (c: Country) => c.borders.filter((b) => sovereign.has(b));

/** Shortest chain of land borders from a to b (both included), or null if you can't walk there. */
export function shortestPath(a: string, b: string): string[] | null {
  const prev = new Map<string, string | null>([[a, null]]);
  const queue = [a];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === b) {
      const path: string[] = [];
      for (let x: string | null = b; x; x = prev.get(x) ?? null) path.unshift(x);
      return path;
    }
    for (const n of neighbours(getCountry(cur)!)) if (!prev.has(n)) { prev.set(n, cur); queue.push(n); }
  }
  return null;
}
