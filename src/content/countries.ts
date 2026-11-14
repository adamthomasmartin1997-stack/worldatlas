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
}

const files = import.meta.glob<CountryContent>('./countries/*.json', { eager: true, import: 'default' });
const byCode = new Map(Object.entries(files).map(([path, data]) => [path.match(/(\w+)\.json$/)![1].toUpperCase(), data]));

export function contentFor(cca3: string): CountryContent | undefined {
  return byCode.get(cca3.toUpperCase());
}
