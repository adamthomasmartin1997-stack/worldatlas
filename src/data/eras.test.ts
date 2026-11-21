import { describe, expect, it } from 'vitest';
import { ERAS, NOW, eraOfYear, fmtRange, happeningIn, pickHeadlines, posOf, regionOf, statesDuring, yearAt } from './eras';
import type { HistoryEvent } from './events';

const ev = (id: string, s: string, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({ id, k: 'battle', t: id, s, sp: 'year', n: 10, ...extra });

describe('eras', () => {
  it('cover the whole timeline without gaps', () => {
    for (let i = 1; i < ERAS.length; i++) expect(ERAS[i].from).toBe(ERAS[i - 1].to);
    expect(ERAS[ERAS.length - 1].to).toBeGreaterThan(NOW);
    expect(new Set(ERAS.map((e) => e.slug)).size).toBe(ERAS.length);
  });
  it('finds the era of a year', () => {
    expect(eraOfYear(1066).slug).toBe('middle-ages');
    expect(eraOfYear(1914).slug).toBe('world-wars');
    expect(eraOfYear(-5000).slug).toBe('ancient');
  });
  it('formats ranges', () => {
    expect(fmtRange(-500, 500)).toBe('500 BC–500');
    expect(fmtRange(-3500, -500)).toBe('3500–500 BC');
    expect(fmtRange(1991, NOW + 1)).toBe('1991–today');
  });
  it('maps slider positions to years and back', () => {
    expect(yearAt(0)).toBe(-3500);
    expect(yearAt(ERAS.length)).toBe(NOW);
    for (const y of [-2000, -44, 800, 1453, 1789, 1914, 1969, 2001]) expect(Math.abs(yearAt(posOf(y)) - y)).toBeLessThanOrEqual(1);
  });
});

describe('picking events', () => {
  it('balances headlines across regions and skips sensitive events', () => {
    const list = [
      ev('a', '1800', { c: ['FRA'], n: 100 }), ev('b', '1801', { c: ['DEU'], n: 90 }), ev('c', '1802', { c: ['ITA'], n: 80 }),
      ev('d', '1803', { c: ['NGA'], n: 20 }), ev('e', '1804', { c: ['JPN'], n: 15 }), ev('f', '1805', { c: ['RWA'], n: 500, k: 'genocide' }),
    ];
    const ids = pickHeadlines(list, 4).map((e) => e.id);
    expect(ids).not.toContain('f');
    expect(ids).toEqual(expect.arrayContaining(['a', 'd', 'e']));
    expect(ids).toHaveLength(4);
  });
  it('caps themes such as sport and space in headlines', () => {
    const list = [
      ev('wc1', '2010', { k: 'sport', c: ['ZAF'], n: 300 }), ev('wc2', '2014', { k: 'sport', c: ['BRA'], n: 290 }), ev('ol', '2016', { k: 'sport', c: ['BRA'], n: 280 }),
      ev('a11', '1969', { k: 'spaceflight', c: ['USA'], n: 200 }), ev('a12', '1969', { k: 'spaceflight', c: ['USA'], n: 150 }), ev('war', '2003', { k: 'war', c: ['IRQ'], n: 50 }),
    ];
    const ids = pickHeadlines(list, 6).map((e) => e.id);
    expect(ids.filter((i) => ['wc1', 'wc2', 'ol'].includes(i))).toHaveLength(1);
    expect(ids.filter((i) => ['a11', 'a12'].includes(i))).toHaveLength(1);
    expect(ids).toContain('war');
  });
  it('does not pick a battle and the war it belongs to', () => {
    const list = [ev('war', '1800', { c: ['FRA'], n: 100, k: 'war', sub: ['bat'] }), ev('bat', '1801', { c: ['FRA'], n: 90, of: ['war'] }), ev('x', '1802', { c: ['FRA'], n: 10 })];
    expect(pickHeadlines(list, 2).map((e) => e.id)).toEqual(['war', 'x']);
  });
  it('lists states that existed during a period', () => {
    const list = [ev('rome', '-0027', { k: 'state', e: '0476' }), ev('later', '0800', { k: 'state', e: '0900' })];
    expect(statesDuring(list, 100, 200).map((e) => e.id)).toEqual(['rome']);
    // Ended at the very start of the period: not counted when a real overlap is required.
    expect(statesDuring(list, 476, 600, 10)).toHaveLength(0);
    // No end date: a city filed as a state, left out.
    expect(statesDuring([ev('milan', '-0400', { k: 'state' })], 100, 200)).toHaveLength(0);
  });
  it('places events in the region most of their countries are in, or the world', () => {
    expect(regionOf(ev('a', '1914', { c: ['JPN', 'FRA', 'DEU', 'USA'] }))).toBe('World');
    expect(regionOf(ev('a2', '1914', { c: ['JPN', 'FRA', 'DEU', 'GBR'] }))).toBe('Europe');
    expect(regionOf(ev('b', '1914', { c: ['EGY', 'ISR', 'SYR'] }))).toBe('Asia');
    expect(regionOf(ev('c', '1914', { p: 'EGY', c: ['ISR', 'SYR'] }))).toBe('Africa');
    expect(regionOf(ev('d', '1917', { k: 'civil war', c: ['AUS'] }))).toBeUndefined();
    expect(regionOf(ev('e', '1066', { c: ['GBR'] }))).toBe('Europe');
  });
  it('counts a treaty only in the year it was signed', () => {
    expect(happeningIn([ev('t', '1929', { k: 'treaty', e: '2025' }), ev('x', '1969')], 1969, 1).events.map((e) => e.id)).toEqual(['x']);
  });
  it('widens the window until several parts of the world appear', () => {
    const list = [ev('a', '1453', { c: ['FRA'] }), ev('b', '1453', { c: ['DEU'] }), ev('c', '1455', { c: ['GBR'] }), ev('d', '1460', { c: ['PER'] }), ev('e', '1463', { c: ['MLI'] })];
    expect(happeningIn(list, 1453, 2).within).toBe(10);
  });
  it('widens the window for a quiet year', () => {
    const list = [ev('a', '1000', { c: ['FRA'] }), ev('b', '1010', { c: ['JPN'] }), ev('x', '1005', { c: ['PER'] })];
    const r = happeningIn(list, 1005, 3);
    expect(r.events).toHaveLength(3);
    expect(r.within).toBe(5);
  });
});
