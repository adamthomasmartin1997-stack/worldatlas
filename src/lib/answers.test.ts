import { describe, expect, it } from 'vitest';
import { buildAnswerIndex, normalize, formatTime } from './answers';
import { SOVEREIGN, COUNTRIES, dailyIndex } from '../data/countries';

describe('normalize', () => {
  it('strips accents, case and punctuation', () => {
    expect(normalize('  Côte d’Ivoire ')).toBe('cote d ivoire');
    expect(normalize('The Gambia')).toBe('gambia');
    expect(normalize('São Tomé & Príncipe')).toBe('sao tome and principe');
  });
});

describe('answer index', () => {
  const index = buildAnswerIndex(SOVEREIGN);
  it.each([
    ['france', 'FRA'],
    ['UK', 'GBR'],
    ['usa', 'USA'],
    ['Ivory Coast', 'CIV'],
    ['DRC', 'COD'],
    ['congo', 'COG'],
    ['Burma', 'MMR'],
    ['st lucia', 'LCA'],
  ])('%s → %s', (input, code) => {
    expect(index.get(normalize(input))).toBe(code);
  });

  it('covers every sovereign country by its primary name', () => {
    for (const c of SOVEREIGN) expect(index.get(normalize(c.name))).toBe(c.cca3);
  });
});

describe('data', () => {
  it('has 195 sovereign states', () => expect(SOVEREIGN).toHaveLength(195));
  it('every border code resolves', () => {
    const codes = new Set(COUNTRIES.map((c) => c.cca3));
    for (const c of COUNTRIES) for (const b of c.borders) expect(codes.has(b)).toBe(true);
  });
  it('daily index is stable and in range', () => {
    const d = new Date('2026-11-13T10:00:00Z');
    expect(dailyIndex(195, d)).toBe(dailyIndex(195, d));
    expect(dailyIndex(195, d)).toBeLessThan(195);
  });
  it('formats time', () => expect(formatTime(75)).toBe('1:15'));
});

describe('merged data', () => {
  it('every fact names a known source', async () => {
    const { SOURCES } = await import('../data/sources');
    for (const c of COUNTRIES) for (const f of [c.area, c.population, c.gdpPerCapita, c.lifeExpectancy]) if (f) expect(SOURCES).toHaveProperty(f.source);
  });
  it('areas are plausible (guards against bad source values)', () => {
    const bih = COUNTRIES.find((c) => c.cca3 === 'BIH')!;
    expect(bih.area!.value).toBeGreaterThan(50_000);
  });
});
