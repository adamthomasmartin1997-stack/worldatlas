import { REGIONS, SOVEREIGN, type Region } from '../data/countries';

export type RegionKey = 'world' | Lowercase<Region>;
export const REGION_OPTIONS: { key: RegionKey; label: string }[] = [
  { key: 'world', label: 'World' },
  ...REGIONS.map((r) => ({ key: r.toLowerCase() as RegionKey, label: r })),
];

export function parseRegion(v: string | null): { key: RegionKey; label: string } {
  return REGION_OPTIONS.find((r) => r.key === v) ?? REGION_OPTIONS[0];
}

export function sovereignIn(key: RegionKey) {
  return SOVEREIGN.filter((c) => key === 'world' || c.region.toLowerCase() === key);
}
