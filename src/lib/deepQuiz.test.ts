import { describe, expect, it } from 'vitest';
import { SOVEREIGN, getCountry } from '../data/countries';
import type { DeepDive } from '../content/deep';
import { TOO_THIN } from './quiz';
import { MIN_QUESTIONS, cultureQuestions, historyQuestions, nearbyYears, sportQuestions } from './deepQuiz';

const files = import.meta.glob<DeepDive>('../content/deep/*/*.json', { eager: true, import: 'default' });
const deep = (iso: string, topic: string) => files[`../content/deep/${iso.toLowerCase()}/${topic}.json`];
const BUILD = { history: historyQuestions, culture: cultureQuestions, sport: sportQuestions } as const;

// A fixed random source, so a failure can be reproduced.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('quizzes generated from deep dives', () => {
  for (const topic of ['history', 'culture', 'sport'] as const) {
    it(`${topic}: every country gets a full quiz with sound questions`, () => {
      const short: string[] = [];
      const none: string[] = [];
      for (const c of SOVEREIGN) {
        const own = deep(c.cca3, topic);
        if (!own) continue;
        const others = SOVEREIGN.filter((x) => x.region === c.region && x.cca3 !== c.cca3).slice(0, 6).map((x) => deep(x.cca3, topic)).filter(Boolean);
        const qs = BUILD[topic](c, own, others, seeded(c.cca3.charCodeAt(0) * 31 + c.cca3.charCodeAt(2)));
        if (qs.length < 5) short.push(`${c.cca3}:${qs.length}`);
        if (qs.length < MIN_QUESTIONS) none.push(c.cca3);
        for (const q of qs) {
          expect(q.options.length, `${c.cca3} ${q.q}`).toBe(4);
          expect(new Set(q.options.map((o) => o.toLowerCase())).size, `${c.cca3} ${q.q} options distinct`).toBe(4);
          expect(q.options[q.answer], `${c.cca3} ${q.q}`).toBeTruthy();
          for (const o of q.options) expect(o.trim().length, `${c.cca3} ${q.q}`).toBeGreaterThan(0);
        }
      }
      // Some small countries have short sport pages and get a shorter quiz; everyone else gets five or more.
      expect(short.length, short.join(' ')).toBeLessThanOrEqual(topic === 'sport' ? 32 : topic === 'culture' ? 14 : 5);
      // Pages too thin for any quiz don't offer one; that list (TOO_THIN) must match the pages exactly.
      expect(none.sort(), `update TOO_THIN.${topic} in src/lib/quiz.ts`).toEqual([...(TOO_THIN[topic] ?? [])].sort());
    });
  }

  it('makes believable wrong years, never in the future', () => {
    const ys = nearbyYears('2022');
    expect(ys.length).toBeGreaterThanOrEqual(3);
    for (const y of ys) expect(Number(y)).toBeLessThanOrEqual(new Date().getFullYear());
    expect(nearbyYears('c. 1500 BC')).toEqual([]);
  });
  it('asks about the right thing (France)', () => {
    const fra = getCountry('FRA')!;
    const qs = cultureQuestions(fra, deep('FRA', 'culture'), ['DEU', 'ITA', 'ESP'].map((i) => deep(i, 'culture')), seeded(7));
    const book = qs.find((q) => q.q.startsWith('Who wrote'));
    if (book) expect(['Alexandre Dumas', 'Victor Hugo', 'Albert Camus', 'Antoine de Saint-Exupéry', 'Marcel Proust', 'Simone de Beauvoir', 'Jules Verne']).toContain(book.options[book.answer]);
    const month = qs.find((q) => q.q.includes('Galette des Rois'));
    if (month) expect(month.options[month.answer]).toBe('January');
  });
});

describe('sport and music options', () => {
  it('treats athletics events as athletics and offers only real sports', () => {
    const nga = getCountry('NGA')!;
    for (let seed = 1; seed < 30; seed++) {
      for (const q of sportQuestions(nga, deep('NGA', 'sport'), ['GHA', 'KEN', 'CMR'].map((i) => deep(i, 'sport')), seeded(seed))) {
        if (!q.q.startsWith('Which sport') && !q.q.includes('which sport')) continue;
        expect(q.options, q.q).not.toContain('Hurdles');
        expect(q.options.filter((o) => o === 'Athletics').length, q.q).toBeLessThanOrEqual(1);
        for (const o of q.options) expect(o, q.q).not.toMatch(/multi-sport|ikale|super eagles/i);
      }
    }
  });
});
