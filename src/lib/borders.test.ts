import { describe, expect, it } from 'vitest';
import { shortestPath } from './borders';

describe('shortestPath', () => {
  it('walks from Portugal to Germany through Spain and France', () => {
    expect(shortestPath('PRT', 'DEU')).toEqual(['PRT', 'ESP', 'FRA', 'DEU']);
  });
  it('returns null for islands', () => {
    expect(shortestPath('ISL', 'FRA')).toBeNull();
  });
});
