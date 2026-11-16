// Mirrors data/sources.json for use in the UI (source notes, the Data sources page).
export const SOURCES = {
  'natural-earth': { name: 'Natural Earth', url: 'https://www.naturalearthdata.com/', licence: 'Public domain' },
  'world-countries': { name: 'mledoze/countries', url: 'https://github.com/mledoze/countries', licence: 'ODbL 1.0' },
  wikidata: { name: 'Wikidata', url: 'https://www.wikidata.org/', licence: 'CC0' },
  'world-bank': { name: 'World Bank Open Data', url: 'https://data.worldbank.org/', licence: 'CC BY 4.0' },
  'flag-icons': { name: 'flag-icons', url: 'https://github.com/lipis/flag-icons', licence: 'MIT' },
  'member-lists': { name: 'Official member lists', url: 'https://www.un.org/en/about-us/member-states', licence: 'facts, checked by hand' },
} as const;

export type SourceId = keyof typeof SOURCES;
