import { useEffect, useState } from 'react';

const cache = new Map<string, Promise<unknown>>();

/** Loads public/data/<file> once per session and shares it between components; null until loaded or if missing. */
export function useData<T>(file: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    if (!cache.has(file)) cache.set(file, fetch(`${import.meta.env.BASE_URL}data/${file}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    cache.get(file)!.then((d) => live && setData(d as T));
    return () => { live = false; };
  }, [file]);
  return data;
}
