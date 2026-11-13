import { useEffect, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

export type CountryFeature = Feature<Geometry, { name: string; cca3: string | null }>;

let cache: Promise<CountryFeature[]> | null = null;

function loadWorld() {
  cache ??= fetch('/data/world-50m.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Map data failed to load (${r.status})`);
      return r.json() as Promise<Topology<{ countries: GeometryCollection<{ name: string; cca3: string | null }> }>>;
    })
    .then((topo) => (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string; cca3: string | null }>).features)
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

/** Loads and caches the world map once per session. */
export function useWorld() {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadWorld().then((f) => live && setFeatures(f)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, []);
  return { features, error };
}
