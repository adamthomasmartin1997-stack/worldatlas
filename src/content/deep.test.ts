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
      for (const p of d.places?.items ?? []) {
        expect(Math.abs(p.lat), `${p.name} latitude`).toBeLessThanOrEqual(90);
        expect(Math.abs(p.lon), `${p.name} longitude`).toBeLessThanOrEqual(180);
        expect(p.text.length).toBeGreaterThan(10);
      }
      for (const e of d.calendar?.items ?? []) expect(e.month >= 1 && e.month <= 12, `${e.name} month`).toBe(true);
      for (const g of d.cardGroups ?? []) {
        expect(g.items.length, `${g.title} has cards`).toBeGreaterThan(0);
        for (const c of g.items) expect(c.text.length, c.title).toBeGreaterThan(10);
      }
      for (const s of d.steps?.items ?? []) expect(s.text.length).toBeGreaterThan(10);
      for (const c of d.chapters) {
        expect(c.text.length).toBeGreaterThan(0);
        for (const r of c.related ?? []) expect(getCountry(r), `related ${r}`).toBeTruthy();
      }
    });
  }
});
