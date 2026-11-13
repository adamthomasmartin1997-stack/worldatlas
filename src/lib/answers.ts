import type { Country } from '../data/countries';

/** Lowercase, strip accents/punctuation, drop leading "the". */
export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

/** Extra accepted answers that aren't in the dataset's alt spellings. */
const EXTRA_ALIASES: Record<string, string[]> = {
  USA: ['america', 'us', 'usa', 'united states of america'],
  GBR: ['uk', 'britain', 'great britain', 'england'],
  CZE: ['czech republic'],
  CIV: ['ivory coast', 'cote d ivoire'],
  COD: ['drc', 'dr congo', 'congo kinshasa', 'democratic republic of congo'],
  COG: ['congo', 'republic of congo', 'congo brazzaville'],
  MMR: ['burma'],
  SWZ: ['swaziland'],
  TLS: ['east timor'],
  CPV: ['cape verde'],
  MKD: ['macedonia'],
  TUR: ['turkey', 'turkiye'],
  VAT: ['vatican', 'holy see'],
  PSE: ['palestine'],
  KOR: ['south korea'],
  PRK: ['north korea'],
  FSM: ['micronesia'],
};

/** Build a lookup from every accepted (normalized) answer to a country code. */
export function buildAnswerIndex(countries: Country[]) {
  const index = new Map<string, string>();
  for (const c of countries) {
    const names = [c.name, c.officialName, ...c.altNames, ...(EXTRA_ALIASES[c.cca3] ?? [])];
    for (const n of names) {
      const key = normalize(n);
      // Don't let an alias overwrite another country's primary name.
      if (key.length > 1 && !index.has(key)) index.set(key, c.cca3);
    }
  }
  // Primary names always win.
  for (const c of countries) index.set(normalize(c.name), c.cca3);
  return index;
}

export function shuffle<T>(items: T[], rand = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
