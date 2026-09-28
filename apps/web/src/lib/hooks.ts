import { useCallback, useEffect, useState } from 'react';
import { backend } from './store';
import type { Grupo, Intento } from './types';

/** Intentos del grupo en un rango, con actualización en directo. */
export function useGroupAttempts(group: Grupo | null, from: string, to: string) {
  const [atts, setAtts] = useState<Intento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!group) {
      setAtts([]);
      setLoading(false);
      return;
    }
    try {
      setAtts(await backend.groupAttempts(group.id, from, to));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [group, from, to]);
  useEffect(() => {
    setLoading(true);
    void load();
    if (!group) return;
    return backend.subscribe(group.id, () => void load());
  }, [group, load]);
  return { atts, loading, error, reload: load };
}
