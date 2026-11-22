/**
 * Weak spots: things a player got wrong, brought back for review until they're learned.
 * Stored only in this browser (like best scores); replace with an account store later.
 *
 * A simple spaced-repetition scheme: a miss puts an item in box 0, ready to review now.
 * Each right answer in review moves it up a box and waits longer (1 day, 3 days, 7 days);
 * after three right answers in a row it counts as learned and leaves the list.
 */
export type ReviewKind = 'flag' | 'capital' | 'map' | 'shape' | 'date';

export interface ReviewRef {
  kind: ReviewKind;
  /** A country code (cca3) or, for dates, a Wikidata event id. */
  ref: string;
  /** What to call it in lists: "France", "Battle of Hastings". */
  label: string;
}

export interface WeakItem extends ReviewRef {
  box: number;
  due: number;
  misses: number;
  lastSeen: number;
}

const KEY = 'atlas.weak.v1';
const DAY = 86_400_000;
const WAIT = [0, DAY, 3 * DAY, 7 * DAY];
export const LEARNED_AT = 3;
export const KIND_LABEL: Record<ReviewKind, string> = { flag: 'Flags', capital: 'Capitals', map: 'On the map', shape: 'Country shapes', date: 'Dates in history' };

const itemKey = (r: Pick<ReviewRef, 'kind' | 'ref'>) => `${r.kind}:${r.ref}`;

function read(): Record<string, WeakItem> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function write(all: Record<string, WeakItem>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage unavailable: weak spots just aren't kept */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('atlas-weak-change'));
}

/** Record an answer. Misses are always kept; right answers only matter for items already on the list. */
export function recordAnswer(r: ReviewRef, correct: boolean, now = Date.now()): void {
  const all = read();
  const k = itemKey(r);
  const had = all[k];
  if (!correct) {
    all[k] = { ...r, box: 0, due: now, misses: (had?.misses ?? 0) + 1, lastSeen: now };
  } else if (had) {
    const box = had.box + 1;
    if (box >= LEARNED_AT) delete all[k];
    else all[k] = { ...had, label: r.label, box, due: now + WAIT[box], lastSeen: now };
  } else {
    return;
  }
  write(all);
}

/** Everything on the list, most-missed first. */
export function weakItems(): WeakItem[] {
  return Object.values(read()).sort((a, b) => b.misses - a.misses || a.due - b.due);
}

/** Items ready for review now, soonest due first. */
export function dueItems(now = Date.now()): WeakItem[] {
  return Object.values(read()).filter((i) => i.due <= now).sort((a, b) => a.due - b.due);
}

export function clearWeak(): void { write({}); }
