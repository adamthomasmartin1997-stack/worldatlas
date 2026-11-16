import raw from './countries.json';

import type { SourceId } from './sources';

/** A value with its provenance, so every number on the site can name its source. */
export interface Fact {
  value: number;
  year?: number | null;
  source: SourceId;
}

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
  area: Fact | null;
  highestPoint: { name: string; elevation: number | null } | null;
  lowestPoint: { name: string; elevation: number | null } | null;
  /** Seas and oceans the country borders (Wikidata), empty when unknown. */
  seas: string[];
  wikidata: string | null;
  latlng: number[];
  landlocked: boolean;
  borders: string[];
  callingCode: string | null;
  tld: string[];
  demonym: string | null;
  hasShape: boolean;
  population: Fact | null;
  gdp: Fact | null;
  gdpPerCapita: Fact | null;
  lifeExpectancy: Fact | null;
  /** Offices and anthem from Wikidata; memberships (keys of ORGANISATIONS) from the curated member lists. */
  government: {
    headOfState: string | null;
    headOfGovernment: string | null;
    anthem: string | null;
    motto: { text: string; lang: string } | null;
    memberships: string[];
  } | null;
  /** Share of GDP by sector, latest year with all three (World Bank). */
  economyMix: {
    year: number;
    services: number;
    industry: number;
    agriculture: number;
    exports: { value: number; year: number } | null;
    source: SourceId;
  } | null;
  /** Flag image is at /data/flags/<cca3>.svg (flag-icons, MIT); colours are its main colour families. */
  flag: { colours: string[] } | null;
  /** Wikipedia editions with an article about the country (Wikidata sitelinks). Only used for quiz difficulty. */
  fame: number | null;
  hasSeries: boolean;
}

import orgs from './organisations.json';
export const ORGANISATIONS: Record<string, { name: string; text: string; url: string; the: boolean }> = orgs;

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

/**
 * Today's challenge country: the same for every visitor on a given (UTC) day.
 * Drawn from countries big enough to find on the map, so the "Find it on the map" challenge works.
 */
export function todaysCountry(date = new Date()): Country {
  const pool = SOVEREIGN.filter((c) => c.hasShape && (c.area?.value ?? 0) > 1000);
  return pool[dailyIndex(pool.length, date)];
}
