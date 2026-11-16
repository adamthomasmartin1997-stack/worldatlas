// Written country content (see src/content/countries/README.md). Loaded at build time.
export interface Fact { label: string; value: string }
export interface Item { title: string; text: string; related?: string[] }
export interface Section { text?: string; facts?: Fact[]; related?: string[] }
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

const files = import.meta.glob<CountryContent>('./countries/*.json', { eager: true, import: 'default' });
const byCode = new Map(Object.entries(files).map(([path, data]) => [path.match(/(\w+)\.json$/)![1].toUpperCase(), data]));

export function contentFor(cca3: string): CountryContent | undefined {
  return byCode.get(cca3.toUpperCase());
}

export interface DatedEvent { cca3: string; year: number; label: string; title: string; text: string }

/** Parse "1789" or "750 BC" into a number (BC negative). Fuzzy years such as "1500s" return null. */
export function parseYear(y: string): number | null {
  const m = y.trim().match(/^(\d{1,4})( BC)?$/);
  if (!m) return null;
  return m[2] ? -Number(m[1]) : Number(m[1]);
}

/** Every history event with an exact year, across all countries. */
export function datedEvents(): DatedEvent[] {
  return [...byCode.entries()].flatMap(([cca3, c]) =>
    (c.history?.events ?? []).flatMap((e) => {
      const year = parseYear(e.year);
      return year == null ? [] : [{ cca3, year, label: e.year, title: e.title, text: e.text }];
    }));
}
