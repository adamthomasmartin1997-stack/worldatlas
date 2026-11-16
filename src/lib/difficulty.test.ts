import { describe, expect, it } from 'vitest';
import { SOVEREIGN, getCountry } from '../data/countries';
import { fameOf, flagSimilarity, pickDistractors, pickTargets } from './difficulty';

const avgFame = (cs: typeof SOVEREIGN) => cs.reduce((s, c) => s + fameOf(c), 0) / cs.length;

describe('difficulty', () => {
  it('easy asks about better-known countries than hard', () => {
    let easy = 0, hard = 0;
    for (let i = 0; i < 20; i++) { easy += avgFame(pickTargets(SOVEREIGN, 'easy', 10)); hard += avgFame(pickTargets(SOVEREIGN, 'hard', 10)); }
    expect(easy).toBeGreaterThan(hard);
  });

  it('always gives three distinct wrong answers that are not the right one', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      for (const c of SOVEREIGN) {
        const d = pickDistractors(c, SOVEREIGN, level);
        expect(d).toHaveLength(3);
        expect(new Set(d.map((x) => x.cca3)).size).toBe(3);
        expect(d.some((x) => x.cca3 === c.cca3)).toBe(false);
      }
    }
  });

  it('hard picks close neighbours, easy picks far-away countries', () => {
    const fra = getCountry('FRA')!;
    for (let i = 0; i < 10; i++) {
      expect(pickDistractors(fra, SOVEREIGN, 'easy').every((x) => x.subregion !== fra.subregion)).toBe(true);
      expect(pickDistractors(fra, SOVEREIGN, 'hard').filter((x) => x.region === 'Europe').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('flag similarity is higher for look-alike flags', () => {
    expect(flagSimilarity(getCountry('ITA')!, getCountry('IRL')!)).toBeGreaterThan(flagSimilarity(getCountry('ITA')!, getCountry('SWE')!));
  });
});
