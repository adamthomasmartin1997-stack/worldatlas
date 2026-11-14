import { describe, expect, it } from 'vitest';
import { SOVEREIGN, getCountry } from '../data/countries';
import { contentFor } from './countries';

describe('country content', () => {
  it('every sovereign country has an overview and a geography paragraph', () => {
    const missing = SOVEREIGN.filter((c) => {
      const content = contentFor(c.cca3);
      return !content?.overview?.[0] || !content.geography?.text;
    });
    expect(missing.map((c) => c.name)).toEqual([]);
  });
  it('content is marked draft until reviewed, and reviewed content lists sources', () => {
    for (const c of SOVEREIGN) {
      const content = contentFor(c.cca3)!;
      expect(['draft', 'reviewed']).toContain(content.status);
      if (content.status === 'reviewed') expect(content.sources?.length).toBeGreaterThan(0);
    }
  });
  it('related country codes all exist', () => {
    for (const c of SOVEREIGN) {
      const content = contentFor(c.cca3)!;
      const codes = [content.culture?.related, content.sport?.related, ...(content.history?.events ?? []).map((e) => e.related)].flat().filter(Boolean) as string[];
      for (const code of codes) expect(getCountry(code), `${c.name} links to ${code}`).toBeTruthy();
    }
  });
});
