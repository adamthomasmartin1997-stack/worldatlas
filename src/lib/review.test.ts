import { beforeEach, describe, expect, it } from 'vitest';
import { LEARNED_AT, clearWeak, dueItems, recordAnswer, weakItems } from './review';

// A tiny in-memory localStorage for the node test environment.
const store = new Map<string, string>();
globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;

const fr = { kind: 'flag' as const, ref: 'FRA', label: 'France' };
const DAY = 86_400_000;

describe('weak spots', () => {
  beforeEach(() => { store.clear(); clearWeak(); });

  it('keeps misses and ignores right answers for things not on the list', () => {
    recordAnswer({ ...fr, ref: 'DEU', label: 'Germany' }, true, 0);
    expect(weakItems()).toHaveLength(0);
    recordAnswer(fr, false, 0);
    expect(weakItems().map((i) => i.ref)).toEqual(['FRA']);
    expect(dueItems(0)).toHaveLength(1);
  });

  it('spaces reviews out and drops an item once it is learned', () => {
    recordAnswer(fr, false, 0);
    recordAnswer(fr, true, 0);
    expect(dueItems(0)).toHaveLength(0);
    expect(dueItems(DAY)).toHaveLength(1);
    let t = DAY;
    for (let i = 1; i < LEARNED_AT; i++) { recordAnswer(fr, true, t); t += 7 * DAY; }
    expect(weakItems()).toHaveLength(0);
  });

  it('a new miss sends an item back to the start and counts misses', () => {
    recordAnswer(fr, false, 0);
    recordAnswer(fr, true, 0);
    recordAnswer(fr, false, 5);
    const [item] = weakItems();
    expect(item.box).toBe(0);
    expect(item.misses).toBe(2);
    expect(dueItems(5)).toHaveLength(1);
  });

  it('keeps different kinds of the same country apart', () => {
    recordAnswer(fr, false, 0);
    recordAnswer({ ...fr, kind: 'capital' }, false, 0);
    expect(weakItems()).toHaveLength(2);
  });
});
