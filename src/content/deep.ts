// Deep-dive pages: one long, chaptered read per country section (src/content/deep/<iso>/<section>.json).
// Loaded on demand, so the long text never lands in the main bundle.
import type { Fact } from './countries';

export const DEEP_SECTIONS = ['geography', 'people', 'history', 'government', 'economy', 'culture', 'sport'] as const;
export type DeepSection = (typeof DEEP_SECTIONS)[number];

export interface DeepChapter {
  /** Short anchor id, unique within the page ("revolution"). */
  id: string;
  title: string;
  /** Paragraphs. */
  text: string[];
  facts?: Fact[];
  /** A boxed aside: a striking detail or "why it matters". */
  highlight?: { title: string; text: string };
  /** ISO alpha-3 codes of countries this chapter mentions, shown as links. */
  related?: string[];
}

export interface DeepDive {
  status: 'draft' | 'reviewed';
  sources?: string[];
  /** One or two sentences that sum up the whole page. */
  intro: string;
  chapters: DeepChapter[];
  /** History pages: a fuller timeline than the profile tab's. */
  timeline?: { year: string; title: string; text: string }[];
  /** Words a reader may not know, explained in plain English. */
  keyTerms?: { term: string; meaning: string }[];
}

const files = import.meta.glob<DeepDive>('./deep/*/*.json', { import: 'default' });
const key = (cca3: string, section: string) => `./deep/${cca3.toLowerCase()}/${section}.json`;

export const isDeepSection = (s: string | undefined): s is DeepSection => DEEP_SECTIONS.includes(s as DeepSection);

/** Whether a deep dive has been written (known without loading it). */
export function hasDeepDive(cca3: string, section: string): boolean {
  return key(cca3, section) in files;
}

export function loadDeepDive(cca3: string, section: DeepSection): Promise<DeepDive> | null {
  const load = files[key(cca3, section)];
  return load ? load() : null;
}

/** Countries whose English name takes "the": "the United Kingdom", "the Netherlands". */
const WITH_THE = new Set(['ALA', 'BHS', 'VGB', 'CYM', 'CAF', 'CCK', 'COM', 'COK', 'DOM', 'FLK', 'FRO', 'GMB', 'MDV', 'MHL', 'NLD', 'MNP', 'PHL', 'PCN', 'COG', 'SYC', 'SLB', 'TCA', 'ARE', 'GBR', 'USA', 'UMI', 'VIR', 'BES', 'ATF']);

/** A country's name as it reads mid-sentence: "the United Kingdom", "France". */
export function nameInSentence(c: { cca3: string; name: string }): string {
  return WITH_THE.has(c.cca3) ? `the ${c.name}` : c.name;
}

/** Page titles, e.g. "History of France". */
export function deepTitle(section: DeepSection, name: string): string {
  return {
    geography: `Geography of ${name}`,
    people: `People of ${name}`,
    history: `History of ${name}`,
    government: `How ${name} is governed`,
    economy: `The economy of ${name}`,
    culture: `Culture of ${name}`,
    sport: `Sport in ${name}`,
  }[section];
}

export const SECTION_LABEL: Record<DeepSection, string> = {
  geography: 'Geography', people: 'People', history: 'History', government: 'Government', economy: 'Economy', culture: 'Culture', sport: 'Sport',
};

/** Rough reading time at 200 words a minute. */
export function readingMinutes(d: DeepDive): number {
  const words = d.chapters.flatMap((c) => c.text).join(' ').split(/\s+/).length + (d.timeline ?? []).map((t) => t.text).join(' ').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
