import { describe, expect, it } from 'vitest';
import { getCountry } from './countries';
import { EVENT_KINDS, formatDate, formatSpan, yearOf, type EventsFile } from './events';

describe('event dates', () => {
  it('formats each precision', () => {
    expect(formatDate('1815-06-18', 'day')).toBe('18 June 1815');
    expect(formatDate('1815-06', 'month')).toBe('June 1815');
    expect(formatDate('-0490', 'year')).toBe('490 BC');
    expect(formatDate('1850', 'century')).toBe('19th century');
    expect(formatDate('-0450', 'century')).toBe('5th century BC');
    expect(formatDate('1960', 'decade')).toBe('1960s');
    expect(formatDate('1911', 'century')).toBe('20th century');
  });
  it('formats spans', () => {
    expect(formatSpan({ s: '1939-09-01', sp: 'day', e: '1945-09-02', ep: 'day' })).toBe('1939–1945');
    expect(formatSpan({ s: '-0431', sp: 'year', e: '-0404', ep: 'year' })).toBe('431–404 BC');
    expect(formatSpan({ s: '1815-06-18', sp: 'day' })).toBe('18 June 1815');
    expect(formatSpan({ k: 'treaty', s: '1929-02-11', sp: 'day', e: '1985', ep: 'year' })).toBe('11 February 1929');
  });
});

// Built by `npm run data:build`; the checks are skipped until the file exists.
const built = Object.values(import.meta.glob<EventsFile>('../../public/data/events.json', { eager: true, import: 'default' }))[0];
describe.runIf(built)('events.json', () => {
  const file: EventsFile = built ?? { retrieved: '', events: [] };
  const ids = new Set(file.events.map((e) => e.id));

  it('has events with unique ids', () => {
    expect(file.events.length).toBeGreaterThan(500);
    expect(ids.size).toBe(file.events.length);
  });
  it('every event is well formed and every link resolves', () => {
    const now = new Date().getFullYear();
    for (const e of file.events) {
      expect(e.id, e.t).toMatch(/^Q\d+$/);
      expect(EVENT_KINDS, e.t).toContain(e.k);
      expect(e.t.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.s, e.t).toMatch(/^-?\d{4,}(-\d\d(-\d\d)?)?$/);
      expect(yearOf(e.s), e.t).toBeLessThanOrEqual(now);
      if (e.e) expect(yearOf(e.e), `${e.t} ends after it starts`).toBeGreaterThanOrEqual(yearOf(e.s));
      for (const iso of e.c ?? []) expect(getCountry(iso), `${e.t}: ${iso}`).toBeTruthy();
      if (e.ll) expect(Math.abs(e.ll[0]) <= 90 && Math.abs(e.ll[1]) <= 180, `${e.t} coordinates`).toBe(true);
      for (const key of ['of', 'sub', 'ca', 'ef', 'pr', 'nx'] as const) for (const id of e[key] ?? []) expect(ids.has(id), `${e.t} → ${key} ${id}`).toBe(true);
    }
  });
});
