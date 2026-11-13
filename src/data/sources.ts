// Mirrors data/sources.json for use in the UI (source notes, the Data sources page).
export const SOURCES = {
  'natural-earth': { name: 'Natural Earth', url: 'https://www.naturalearthdata.com/', licence: 'Public domain' },
  'world-countries': { name: 'mledoze/countries', url: 'https://github.com/mledoze/countries', licence: 'ODbL 1.0' },
  wikidata: { name: 'Wikidata', url: 'https://www.wikidata.org/', licence: 'CC0' },
  'world-bank': { name: 'World Bank Open Data', url: 'https://data.worldbank.org/', licence: 'CC BY 4.0' },
} as const;

export type SourceId = keyof typeof SOURCES;
