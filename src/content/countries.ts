// Written country content (see src/content/countries/README.md). Each country's file loads on demand,
// so the 196 files (about 1.6 MB) aren't in the main bundle.
import { useEffect, useState } from 'react';
export interface Fact { label: string; value: string }
export interface Item { title: string; text: string; related?: string[] }
export interface Section { text?: string; facts?: Fact[]; related?: string[]; subsections?: { title: string; text: string }[] }
export interface CountryContent {
  status: 'draft' | 'reviewed';
  sources?: string[];
  overview?: string[];
  geography?: Section;
  people?: Section;
  history?: Section & { events?: (Item & { year: string })[] };
  government?: Section & { memberships?: Item[] };
  economy?: Section;
  culture?: Section & { items?: Item[] };
  sport?: Section & { items?: Item[] };
  /** Two or three surprising, true facts, shown as stickers on the Overview tab. */
  didYouKnow?: string[];
  /** Famous people from the country: name, what they're known for, and a one-line note. */
  keyPeople?: { name: string; role: string; text: string }[];
}

const files = import.meta.glob<CountryContent>('./countries/*.json', { import: 'default' });
const pathFor = (cca3: string) => `./countries/${cca3.toLowerCase()}.json`;
const cache = new Map<string, Promise<CountryContent | undefined>>();

export const hasContent = (cca3: string) => pathFor(cca3) in files;

/** A country's written content, or undefined if none has been written. */
export function loadContent(cca3: string): Promise<CountryContent | undefined> {
  const key = cca3.toUpperCase();
  if (!cache.has(key)) cache.set(key, files[pathFor(key)]?.() ?? Promise.resolve(undefined));
  return cache.get(key)!;
}

/** Loads a country's content; `ready` is true once it has loaded (or there is none). */
export function useCountryContent(cca3: string): { content: CountryContent | undefined; ready: boolean } {
  const [state, setState] = useState<{ cca3: string; content: CountryContent | undefined } | null>(null);
  useEffect(() => {
    let live = true;
    loadContent(cca3).then((content) => live && setState({ cca3, content })).catch(() => live && setState({ cca3, content: undefined }));
    return () => { live = false; };
  }, [cca3]);
  return state?.cca3 === cca3 ? { content: state.content, ready: true } : { content: undefined, ready: false };
}
