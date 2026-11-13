/** Best scores, stored only in this browser. Replace with a user account store later. */
const KEY = 'atlas.best.v1';

function read(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

export function getBest(game: string): number | null {
  return read()[game] ?? null;
}

/** Saves if higher; returns true when it's a new best. */
export function saveBest(game: string, score: number): boolean {
  const all = read();
  if (all[game] != null && all[game] >= score) return false;
  all[game] = score;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
  return true;
}
