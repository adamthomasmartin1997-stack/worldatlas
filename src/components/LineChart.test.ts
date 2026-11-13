import { describe, expect, it } from 'vitest';
import { niceTicks } from './LineChart';

describe('niceTicks', () => {
  it('uses round steps and covers the range', () => {
    expect(niceTicks(0, 68_720_337)).toEqual([0, 20_000_000, 40_000_000, 60_000_000, 80_000_000]);
    const t = niceTicks(69.9, 83);
    expect(t[0]).toBeLessThanOrEqual(69.9);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(83);
  });
});
