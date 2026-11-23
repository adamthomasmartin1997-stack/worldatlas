import { COUNTRIES, SOVEREIGN, getCountry, type Country } from '../data/countries';
import { shuffle } from './answers';
import type { ReviewRef } from './review';
import { hasDeepDive } from '../content/deep';
import { flagSimilarity, flagUrl, pickDistractors, type Difficulty } from './difficulty';

export interface Question {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
  link?: string;
  /** A picture to show with the question, e.g. a flag. */
  image?: { src: string; alt: string };
  /** A country (cca3) whose outline is drawn with the question. */
  shape?: string;
  /** Pictures to show instead of the option text (e.g. four flags); names are revealed after answering. */
  optionImages?: string[];
  /** A country (cca3) highlighted on a map with the question ("Which country is highlighted?"). */
  mapHighlight?: string;
  /** What this question tests, so a wrong answer is added to the player's weak spots. */
  review?: ReviewRef;
}

export const TOPICS = {
  geography: { label: 'Geography', blurb: 'Capitals, neighbours, languages and currency — built from the data.' },
  history: { label: 'History', blurb: 'Key events and people.' },
  culture: { label: 'Culture', blurb: 'Art, food, language and landmarks.' },
  sport: { label: 'Sport', blurb: 'Teams, tournaments and records.' },
} as const;
export type Topic = keyof typeof TOPICS;

type QuizFile = Partial<Record<Exclude<Topic, 'geography'>, Question[]>>;
const files = import.meta.glob<QuizFile>('../content/quizzes/*.json', { eager: true, import: 'default' });
const written = new Map(Object.entries(files).map(([path, data]) => [path.match(/(\w+)\.json$/)![1], data]));

/** Shuffle options while keeping track of the right answer. */
export function shuffleOptions(question: Question, rand = Math.random): Question {
  const tagged = question.options.map((text, i) => ({ text, correct: i === question.answer }));
  const tagged2 = tagged.map((o, i) => ({ ...o, image: question.optionImages?.[i] }));
  const s = shuffle(tagged2, rand);
  return { ...question, options: s.map((o) => o.text), answer: s.findIndex((o) => o.correct), ...(question.optionImages ? { optionImages: s.map((o) => o.image!) } : {}) };
}

function distractors(pool: string[], correct: string, n = 3) {
  return shuffle([...new Set(pool.filter((p) => p && p !== correct))]).slice(0, n);
}

/** Geography questions generated from real data, so every country has a playable quiz. */
export function geographyQuestions(c: Country, level: Difficulty = 'medium'): Question[] {
  const qs: Question[] = [];
  const sameRegion = SOVEREIGN.filter((x) => x.region === c.region && x.cca3 !== c.cca3);
  if (c.capital[0]) {
    const others = pickDistractors(c, SOVEREIGN.filter((x) => x.capital[0]), level).map((x) => x.capital[0]).filter((x) => x !== c.capital[0]);
    qs.push({ q: `What is the capital of ${c.name}?`, options: [c.capital[0], ...new Set(others)], answer: 0 });
  }
  if (c.flag) {
    const others = pickDistractors(c, SOVEREIGN.filter((x) => x.flag), level, 3, level === 'hard' ? flagSimilarity : undefined);
    qs.push({ q: `Which is the flag of ${c.name}?`, options: [c, ...others].map((x) => x.name), optionImages: [c, ...others].map(flagUrl), answer: 0 });
  }
  if (c.subregion) {
    const subs = [...new Set(COUNTRIES.map((x) => x.subregion).filter((s): s is string => Boolean(s)))];
    qs.push({ q: `Which part of the world is ${c.name} in?`, options: [c.subregion, ...distractors(subs, c.subregion)], answer: 0 });
  }
  if (c.borders.length) {
    const neighbour = getCountry(shuffle(c.borders)[0])!;
    const notNeighbours = sameRegion.filter((x) => !c.borders.includes(x.cca3)).map((x) => x.name);
    if (notNeighbours.length >= 3) {
      qs.push({ q: `Which of these countries shares a land border with ${c.name}?`, options: [neighbour.name, ...distractors(notNeighbours, neighbour.name)], answer: 0, link: `/countries/${neighbour.cca3.toLowerCase()}`, explain: `${c.name} has ${c.borders.length} land neighbour${c.borders.length > 1 ? 's' : ''}.` });
    }
  } else {
    qs.push({ q: `How many countries share a land border with ${c.name}?`, options: ['None', 'One', 'Two', 'Three or more'], answer: 0 });
  }
  if (c.currencies[0]) {
    const pool = SOVEREIGN.flatMap((x) => x.currencies.map((cur) => cur.name));
    qs.push({ q: `Which currency is used in ${c.name}?`, options: [c.currencies[0].name, ...distractors(pool, c.currencies[0].name)], answer: 0 });
  }
  if (c.languages[0]) {
    const pool = sameRegion.flatMap((x) => x.languages).filter((l) => !c.languages.includes(l));
    const all = SOVEREIGN.flatMap((x) => x.languages).filter((l) => !c.languages.includes(l));
    const opts = distractors(pool.length >= 3 ? pool : all, c.languages[0]);
    qs.push({ q: `Which of these is an official language of ${c.name}?`, options: [c.languages[0], ...opts], answer: 0 });
  }
  qs.push({ q: `Is ${c.name} landlocked?`, options: [c.landlocked ? 'Yes' : 'No', c.landlocked ? 'No' : 'Yes'], answer: 0 });
  return qs.filter((q) => q.options.length >= 2);
}

export function questionsFor(c: Country, topic: Topic, level: Difficulty = 'medium'): Question[] {
  const qs = topic === 'geography' ? geographyQuestions(c, level) : (written.get(c.cca3.toLowerCase())?.[topic] ?? []);
  return qs.map((q) => shuffleOptions(q));
}

/**
 * Whether a country has a quiz on this topic: geography is generated from data, history, culture and
 * sport are hand-written (France) or generated from the deep-dive pages (src/lib/deepQuiz.ts).
 */
export function hasQuiz(c: Country, topic: Topic): boolean {
  if (topic === 'geography' || questionCount(c, topic) > 0) return true;
  return hasDeepDive(c.cca3, topic) && !TOO_THIN[topic]?.includes(c.cca3);
}

/**
 * Countries whose deep-dive page is too short for a generated quiz on that topic, so the quiz tab
 * isn't offered. Kept in step with the pages by src/lib/deepQuiz.test.ts, which recomputes it.
 */
export const TOO_THIN: Partial<Record<Topic, string[]>> = { sport: ['FSM', 'MHL', 'PLW', 'VCT'] };

/** Hand-written or data-generated questions available without loading anything (0 for generated deep-dive quizzes). */
export function questionCount(c: Country, topic: Topic) {
  return topic === 'geography' ? geographyQuestions(c).length : (written.get(c.cca3.toLowerCase())?.[topic]?.length ?? 0);
}
