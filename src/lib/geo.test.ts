import { describe, expect, it } from 'vitest';
import { bearing, closeness, compass, distanceKm } from './geo';

describe('geo', () => {
  it('measures London to Paris at about 340 km', () => {
    expect(distanceKm([51.5, -0.12], [48.86, 2.35])).toBeGreaterThan(320);
    expect(distanceKm([51.5, -0.12], [48.86, 2.35])).toBeLessThan(360);
  });
  it('points the right way', () => {
    expect(compass(bearing([0, 0], [10, 0]))).toBe('north');
    expect(compass(bearing([0, 0], [0, 10]))).toBe('east');
    expect(compass(bearing([10, 10], [0, 0]))).toBe('south-west');
  });
  it('scores closeness from 100 down to 0', () => {
    expect(closeness(0)).toBe(100);
    expect(closeness(20015)).toBe(0);
  });
});
