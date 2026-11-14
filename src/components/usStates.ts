import { useEffect, useState } from 'react';
import { feature, neighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import type { City } from './mapMarkers';

export interface UsState {
  fips: string;
  name: string;
  abbr: string;
  slug: string; // lowercase postal code, used in URLs: /countries/usa/states/ca
  wikidata: string;
  population: number | null;
  area: number | null;
  capital: City | null;
  cities: City[];
  shape: Feature<Geometry, { name: string }>;
  neighbours: string[]; // fips codes of states sharing a border
}
export interface UsData { retrieved: string; states: UsState[]; highlights: City[] }

let cache: Promise<UsData> | null = null;
function load(): Promise<UsData> {
  const base = import.meta.env.BASE_URL;
  cache ??= Promise.all([
    fetch(`${base}data/us-states-10m.json`).then((r) => r.json() as Promise<Topology<{ states: GeometryCollection<{ name: string }> }>>),
    fetch(`${base}data/us-states.json`).then((r) => r.json()),
  ]).then(([topo, data]) => {
    const geoms = topo.objects.states.geometries;
    const shapes = (feature(topo, topo.objects.states) as unknown as { features: Feature<Geometry, { name: string }>[] }).features;
    const touching = neighbors(geoms as never);
    const states: UsState[] = [];
    geoms.forEach((g, i) => {
      const info = data.states[String(g.id)];
      if (!info) return; // territories are not shown yet
      states.push({
        fips: String(g.id), name: info.name, abbr: info.abbr, slug: String(info.abbr).toLowerCase(), wikidata: info.wikidata,
        population: info.population, area: info.area,
        capital: info.capital ? { ...info.capital, c: 1 } : null, cities: info.cities, shape: shapes[i],
        neighbours: touching[i].map((j: number) => String(geoms[j].id)).filter((f: string) => data.states[f]),
      });
    });
    states.sort((a, b) => a.name.localeCompare(b.name));
    return { retrieved: data.retrieved, states, highlights: data.highlights };
  }).catch((e) => { cache = null; throw e; });
  return cache;
}

export function useUsStates() {
  const [data, setData] = useState<UsData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let live = true; load().then((d) => live && setData(d)).catch(() => live && setError(true)); return () => { live = false; }; }, []);
  return { data, error };
}

export const statePath = (s: Pick<UsState, 'slug'>) => `/countries/usa/states/${s.slug}`;
