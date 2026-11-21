import { useMemo } from 'react';
import { useData } from '../components/useData';
import type { EventsFile, HistoryEvent } from './events';

export interface Events { list: HistoryEvent[]; byId: Map<string, HistoryEvent>; retrieved: string }

/** All historical events (public/data/events.json, about 1 MB), loaded on first use. */
export function useEvents(): Events | null {
  const file = useData<EventsFile>('events.json');
  return useMemo(() => (file ? { list: file.events, byId: new Map(file.events.map((e) => [e.id, e])), retrieved: file.retrieved } : null), [file]);
}
