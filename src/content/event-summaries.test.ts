import { describe, expect, it } from 'vitest';
import file from './event-summaries.json';

// The ids must exist in the built events file (skipped until `npm run data:build` has made it).
const built = Object.values(import.meta.glob<{ events: { id: string; k: string }[] }>('../../public/data/events.json', { eager: true, import: 'default' }))[0];

describe('event summaries', () => {
  const entries = Object.entries(file.events as Record<string, { text: string[]; why: string; asOf?: string; reviewed?: string; sources?: string[] }>);
  it('has summaries, all drafts', () => {
    expect(entries.length).toBeGreaterThan(100);
    expect(file.status).toBe('draft');
  });
  it.each(entries)('%s is well formed', (id, s) => {
    expect(id).toMatch(/^Q\d+$/);
    expect(s.text.length).toBeGreaterThanOrEqual(1);
    for (const p of s.text) { expect(p.length).toBeGreaterThan(40); expect(p.length).toBeLessThan(600); }
    expect(s.why.length).toBeGreaterThan(30);
    if (s.asOf) expect(s.asOf).toMatch(/^\d{4}-\d\d$/);
    // A reviewed summary says when and against what.
    if (s.reviewed) { expect(s.reviewed).toMatch(/^\d{4}-\d\d-\d\d$/); expect(s.sources?.length, `${id} reviewed without sources`).toBeGreaterThan(0); }
  });
  it.runIf(built)('every summary belongs to an event that exists', () => {
    const ids = new Set(built!.events.map((e) => e.id));
    expect(entries.map(([id]) => id).filter((id) => !ids.has(id))).toEqual([]);
  });
});
