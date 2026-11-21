import { describe, expect, it } from 'vitest';
import { buildCountryTimeline, parseWrittenYear, relation } from './countryTimeline';
import { NOW } from './eras';
import type { HistoryEvent } from './events';

const ev = (id: string, t: string, s: string, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({ id, k: 'battle', t, s, sp: 'year', n: 10, ...extra });

describe('reading written years', () => {
  it.each([
    ['1066', 1066], ['c. 2500 BC', -2500], ['AD 70', 70], ['1930s', 1930], ['1914–1918', 1914], ['c. 10,000 BC', -10000], ['9', 9],
  ])('%s', (label, year) => expect(parseWrittenYear(label)).toBe(year));
  it('reads "years ago"', () => {
    expect(parseWrittenYear('65,000 years ago')).toBe(NOW - 65000);
    expect(parseWrittenYear('3.2 million years ago')).toBe(NOW - 3_200_000);
  });
  it('returns null without a number', () => expect(parseWrittenYear('Long ago')).toBeNull());
});

describe('country timelines', () => {
  it('separates local events from world events', () => {
    expect(relation(ev('a', 'x', '1066', { p: 'GBR', c: ['GBR', 'FRA'] }), 'GBR')).toBe('local');
    expect(relation(ev('b', 'x', '1940', { c: ['GBR', 'FRA', 'DEU', 'USA'] }), 'GBR')).toBe('world');
    expect(relation(ev('c', 'x', '1940', { p: 'GBR', c: ['GBR', 'FRA', 'DEU', 'USA'] }), 'GBR')).toBe('local');
    expect(relation(ev('d', 'x', '1940', { c: ['FRA'] }), 'GBR')).toBeNull();
  });
  it('links a written entry to the matching event instead of listing it twice', () => {
    const t = buildCountryTimeline('FRA', [{ year: '1789', title: 'Revolution', text: 'The monarchy falls.' }], [
      ev('rev', 'French Revolution', '1789', { k: 'revolution', p: 'FRA', c: ['FRA'], n: 200 }),
      ev('bast', 'Storming of the Bastille', '1789', { p: 'FRA', c: ['FRA'], n: 100 }),
    ]);
    const items = t.eras.flatMap((g) => g.items);
    expect(items).toHaveLength(2);
    const w = items.find((i) => i.type === 'written');
    expect(w?.type === 'written' && w.event?.id).toBe('rev');
    expect(items.some((i) => i.type === 'event' && i.event.id === 'bast')).toBe(true);
  });
  it('matches an empire by name or by its founding, but not by generic words', () => {
    const t = buildCountryTimeline('NGA', [{ year: '1180', title: 'Benin Empire', text: 'x' }, { year: '1310', title: 'Oyo', text: 'y' }, { year: '1526', title: 'Mughal Empire', text: 'z' }], [
      ev('benin', 'Benin Empire', '1169', { k: 'state', e: '1897', p: 'NGA' }),
      ev('oyo', 'Oyo Empire', '1300', { k: 'state', e: '1896', p: 'NGA' }),
      ev('vij', 'Vijayanagara Empire', '1336', { k: 'state', e: '1646', p: 'NGA' }),
    ]);
    const written = t.eras.flatMap((g) => g.items).filter((i) => i.type === 'written');
    expect(written.map((i) => i.type === 'written' && i.event?.id)).toEqual(['benin', 'oyo', undefined]);
  });
  it('links by exact name even to a world event, and rejects partial state names', () => {
    const t = buildCountryTimeline('IRN', [{ year: '1980', title: 'Iran–Iraq War', text: 'x' }, { year: '1975', title: 'Khmer Rouge', text: 'y' }], [
      ev('war', 'Iran–Iraq War', '1980', { k: 'war', c: ['IRN', 'IRQ', 'USA', 'FRA'] }),
      ev('baath', "Ba'athist Iraq", '1968', { k: 'state', e: '2003', c: ['IRN'] }),
      ev('kr', 'Khmer Republic', '1970', { k: 'state', e: '1975', p: 'IRN' }),
    ]);
    const written = t.eras.flatMap((g) => g.items).filter((i) => i.type === 'written');
    expect(written.map((i) => i.type === 'written' && i.event?.id)).toEqual([undefined, 'war']);
  });
  it('groups by era, in order, and limits imported events per era unless asked for all', () => {
    const events = Array.from({ length: 10 }, (_, i) => ev(`e${i}`, `Event ${i}`, String(1100 + i), { p: 'FRA', n: i }));
    const few = buildCountryTimeline('FRA', [{ year: '1050', title: 'Something', text: 'x' }], events, { perEra: 3 });
    expect(few.eras).toHaveLength(1);
    expect(few.eras[0].era.slug).toBe('middle-ages');
    expect(few.eras[0].items).toHaveLength(4);
    expect(few.eras[0].hidden).toBe(7);
    expect(few.eras[0].items.map((i) => i.year)).toEqual([...few.eras[0].items.map((i) => i.year)].sort((a, b) => a - b));
    expect(buildCountryTimeline('FRA', [], events, { all: true }).eras[0].items).toHaveLength(10);
  });
});
