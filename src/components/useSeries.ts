import { useEffect, useState } from 'react';
import type { Point } from './LineChart';

export interface SeriesFile {
  retrieved: string;
  indicators: Record<string, { code: string; label: string; unit: string }>;
  series: Partial<Record<'population' | 'gdp' | 'gdpPerCapita' | 'lifeExpectancy', Point[]>>;
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
    fetch(`${import.meta.env.BASE_URL}data/series/${iso.toLowerCase()}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: SeriesFile) => live && setData(d))
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [iso, enabled]);
  return { data, error };
}
