import { describe, expect, it } from 'vitest';
import { DEEP_SECTIONS, type DeepDive } from './deep';
import { getCountry } from '../data/countries';

const files = import.meta.glob<DeepDive>('./deep/*/*.json', { eager: true, import: 'default' });

describe('deep-dive content', () => {
  it('has at least one page', () => expect(Object.keys(files).length).toBeGreaterThan(0));
  for (const [path, d] of Object.entries(files)) {
    const [, iso, section] = path.match(/deep\/(\w+)\/(\w+)\.json$/)!;
    it(`${iso}/${section} is well formed`, () => {
      expect(getCountry(iso), 'folder is a country code').toBeTruthy();
      expect(DEEP_SECTIONS).toContain(section);
      expect(d.intro.length).toBeGreaterThan(40);
      expect(d.chapters.length).toBeGreaterThanOrEqual(section === 'history' ? 3 : 2);
      const ids = d.chapters.map((c) => c.id);
      expect(new Set(ids).size, 'chapter ids are unique').toBe(ids.length);
      for (const c of d.chapters) {
        expect(c.text.length).toBeGreaterThan(0);
        for (const r of c.related ?? []) expect(getCountry(r), `related ${r}`).toBeTruthy();
      }
    });
  }
});
