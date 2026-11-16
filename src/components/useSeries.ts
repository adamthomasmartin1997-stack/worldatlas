import { useEffect, useState } from 'react';
import type { Point } from './LineChart';

export interface SeriesFile {
  retrieved: string;
  indicators: Record<string, { code: string; label: string; unit: string }>;
  series: Partial<Record<'population' | 'gdp' | 'gdpPerCapita' | 'lifeExpectancy', Point[]>>;
}

/**
 * The artifact preview can hold only ~500 files, so its build packs every country's series into one
 * data/series.json (see scripts/build-artifact.mjs); the normal site loads one small file per country.
 */
let combined: Promise<Record<string, SeriesFile>> | null = null;
function loadSeries(iso: string): Promise<SeriesFile> {
  const base = import.meta.env.BASE_URL;
  if (import.meta.env.VITE_COMBINED_SERIES) {
    combined ??= fetch(`${base}data/series.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
    return combined.then((all) => all[iso.toLowerCase()] ?? Promise.reject(new Error('no series')));
  }
  return fetch(`${base}data/series/${iso.toLowerCase()}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
}

/** Loads a country's World Bank time series (public/data/series/<iso>.json) on demand. */
export function useSeries(iso: string, enabled: boolean) {
  const [data, setData] = useState<SeriesFile | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setData(null);
    setError(false);
    loadSeries(iso)
      .then((d) => live && setData(d))
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [iso, enabled]);
  return { data, error };
}
