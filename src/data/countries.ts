import raw from './countries.json';

export interface Country {
  cca3: string;
  cca2: string;
  name: string;
  officialName: string;
  altNames: string[];
  sovereign: boolean;
  status: string;
  region: string;
  subregion: string | null;
  capital: string[];
  languages: string[];
  currencies: { code: string; name: string }[];
  area: number | null;
  latlng: number[];
  landlocked: boolean;
  borders: string[];
  callingCode: string | null;
  tld: string[];
  demonym: string | null;
  hasShape: boolean;
  population: number | null;
  populationYear: number | null;
}

export const DATA_GENERATED = raw.generatedAt;
export const COUNTRIES: Country[] = raw.countries as Country[];
export const SOVEREIGN = COUNTRIES.filter((c) => c.sovereign);

const byCode = new Map(COUNTRIES.map((c) => [c.cca3.toLowerCase(), c]));
export const getCountry = (code: string | undefined) => (code ? byCode.get(code.toLowerCase()) : undefined);

export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'] as const;
export type Region = (typeof REGIONS)[number];

export const countryPath = (c: Pick<Country, 'cca3'>) => `/countries/${c.cca3.toLowerCase()}`;

export function slugRegion(r: string) {
  return r.toLowerCase();
}

/** Deterministic pick for "today" so every visitor sees the same daily challenge. */
export function dailyIndex(length: number, date = new Date()) {
  const key = date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  let h = key;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return Math.abs(h ^ (h >>> 16)) % length;
}

export const fmt = new Intl.NumberFormat('en-GB');
