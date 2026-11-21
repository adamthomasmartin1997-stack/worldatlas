import { describe, expect, it } from 'vitest';
import { readYear } from './Meanwhile';

describe('reading a typed year', () => {
  it('reads AD and BC years', () => {
    expect(readYear('1453')).toBe(1453);
    expect(readYear('44 BC')).toBe(-44);
    expect(readYear('44bc')).toBe(-44);
    expect(readYear('-44')).toBe(-44);
    expect(readYear('800 AD')).toBe(800);
  });
  it('rejects years that are not on the timeline', () => {
    expect(readYear('0')).toBeNull();
    expect(readYear('3000')).toBeNull();
    expect(readYear('-9000')).toBeNull();
    expect(readYear('soon')).toBeNull();
  });
});
