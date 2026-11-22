import { getCountry, type Country } from '../data/countries';

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** A short memory hook for where a country is: "Chad is in Middle Africa and borders Libya, Sudan and Niger." */
export function whereHint(c: Country): string {
  const area = c.subregion ?? c.region;
  const near = c.borders.map((b) => getCountry(b)?.name).filter((n): n is string => Boolean(n)).slice(0, 4);
  if (near.length) return `${c.name} is in ${area} and borders ${list(near)}${c.borders.length > 4 ? ' and more' : ''}.`;
  return `${c.name} is an island country in ${area}, with no land borders.`;
}

/** The best-known countries first (by Wikipedia coverage), so review lists start with the ones most worth knowing. */
export const byFame = (a: Country, b: Country) => (b.fame ?? 0) - (a.fame ?? 0);
