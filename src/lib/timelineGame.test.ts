import { describe, expect, it } from 'vitest';
import { ERAS } from '../data/eras';
import { yearOf, type EventsFile, type HistoryEvent } from '../data/events';
import { PER_ROUND, inOrder, marks, pickRound, playable } from './timelineGame';

const ev = (id: string, s: string, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({ id, k: 'battle', t: id, s, sp: 'year', n: 100, ...extra });

describe('timeline game rules', () => {
  it('leaves out sensitive, long-lasting and little-known events', () => {
    const list = [ev('a', '1800'), ev('g', '1900', { k: 'genocide' }), ev('long', '1500', { e: '1700' }), ev('state', '1600', { k: 'state', e: '1610' }), ev('obscure', '1700', { n: 3 })];
    expect(playable(list, 25).map((e) => e.id)).toEqual(['a']);
  });
  it('marks positions right or wrong, treating same-year events as interchangeable', () => {
    const a = ev('a', '1066'), b = ev('b', '1453'), c = ev('c', '1492'), d = ev('d', '1492-10');
    expect(marks([a, c, b])).toEqual([true, false, false]);
    expect(marks([a, b, d, c])).toEqual([true, true, true, true]);
    expect(inOrder([c, a, b]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

const built = Object.values(import.meta.glob<EventsFile>('../../public/data/events.json', { eager: true, import: 'default' }))[0];
describe.runIf(built)('rounds from the real events', () => {
  const list = built!.events;
  it.each(['easy', 'medium', 'hard'] as const)('%s rounds have five distinct, well-spaced events', (level) => {
    for (let i = 0; i < 20; i++) {
      const r = pickRound(list, level);
      expect(r).toHaveLength(PER_ROUND);
      expect(new Set(r.map((e) => e.id)).size).toBe(PER_ROUND);
      const years = inOrder(r).map((e) => yearOf(e.s));
      for (let k = 1; k < years.length; k++) expect(years[k] - years[k - 1]).toBeGreaterThanOrEqual(level === 'hard' ? 2 : 3);
    }
  });
  it('can play every era except the ancient world on medium', () => {
    for (const era of ERAS.slice(1)) expect(pickRound(list, 'medium', era)).toHaveLength(PER_ROUND);
  });
});
