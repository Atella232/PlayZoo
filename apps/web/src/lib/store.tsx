import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EPOCH, dateKey, isBetter, type ScoreSpec } from '@playzoo/shared';
import { LocalBackend } from './localBackend';
import { SupabaseBackend } from './supabaseBackend';
import { computeDice } from './standings';
import { settlePendingForfeit } from './forfeit';
import type { Backend, Extra, Grupo, Intento, Perfil, TrainStats } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const backend: Backend = url && key ? new SupabaseBackend(url, key) : new LocalBackend();

interface State {
  backend: Backend;
  ready: boolean;
  me: Perfil | null;
  groups: Grupo[];
  group: Grupo | null;
  setGroupId(id: string): void;
  hoy: string;
  /** Mis intentos de hoy. */
  misIntentos: Intento[];
  extrasHoy: Extra[];
  dice: number | null;
  train: Record<string, TrainStats>;
  refresh(): Promise<void>;
  signIn(nombre: string, emoji: string, email?: string): Promise<{ revisaCorreo?: boolean } | void>;
  signOut(): Promise<void>;
  updateMe(p: Partial<Pick<Perfil, 'nombre' | 'emoji'>>): Promise<void>;
  createGroup(nombre: string): Promise<void>;
  joinGroup(codigo: string): Promise<void>;
  leaveGroup(id: string): Promise<void>;
  recordTraining(gameId: string, score: number, spec: ScoreSpec): Promise<TrainStats>;
}

const Ctx = createContext<State | null>(null);

export function useApp(): State {
  const s = useContext(Ctx);
  if (!s) throw new Error('AppProvider ausente');
  return s;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Perfil | null>(null);
  const [groups, setGroups] = useState<Grupo[]>([]);
  const [groupId, setGroupIdState] = useState<string | null>(() => localStorage.getItem('pz:group'));
  const [hoy, setHoy] = useState(dateKey());
  const [misIntentos, setMisIntentos] = useState<Intento[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [dice, setDice] = useState<number | null>(null);
  const [train, setTrain] = useState<Record<string, TrainStats>>({});
  const hoyRef = useRef(hoy);
  hoyRef.current = hoy;

  const group = useMemo(() => groups.find((g) => g.id === groupId) ?? groups[0] ?? null, [groups, groupId]);

  const loadDynamic = useCallback(async (meNow: Perfil | null, gs: Grupo[]) => {
    if (!meNow) {
      setMisIntentos([]);
      setExtras([]);
      setDice(null);
      return;
    }
    const day = hoyRef.current;
    const [mine, ex] = await Promise.all([backend.myAttempts(EPOCH, day), backend.allMyExtras()]);
    setMisIntentos(mine.filter((a) => a.fecha === day));
    setExtras(ex);
    try {
      if (backend.serverDice) setDice(await backend.serverDice());
      else {
        const map = new Map<string, Intento[]>();
        for (const g of gs) map.set(g.id, await backend.groupAttempts(g.id, EPOCH, day));
        setDice(computeDice(meNow.id, gs, mine, map, ex, day));
      }
    } catch {
      setDice(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await backend.getMe();
      setMe(m);
      if (m) await settlePendingForfeit();
      const gs = m ? await backend.listGroups() : [];
      setGroups(gs);
      if (m) setTrain(mergeTrain(await backend.loadTraining()));
      await loadDynamic(m, gs);
    } catch (e) {
      console.warn('refresh', e);
    } finally {
      setReady(true);
    }
  }, [loadDynamic]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // cambio de día
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = dateKey();
      if (d !== hoyRef.current) setHoy(d);
    }, 20000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    void loadDynamic(me, groups);
  }, [hoy]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: State = {
    backend,
    ready,
    me,
    groups,
    group,
    setGroupId: (id) => {
      setGroupIdState(id);
      localStorage.setItem('pz:group', id);
    },
    hoy,
    misIntentos,
    extrasHoy: extras.filter((e) => e.fecha === hoy),
    dice,
    train,
    refresh,
    signIn: async (n, e, m) => {
      const r = await backend.signIn(n, e, m);
      await refresh();
      return r;
    },
    signOut: async () => {
      await backend.signOut();
      setMe(null);
      setGroups([]);
      await refresh();
    },
    updateMe: async (p) => {
      setMe(await backend.updateMe(p));
      await refresh();
    },
    createGroup: async (n) => {
      const g = await backend.createGroup(n);
      localStorage.setItem('pz:group', g.id);
      setGroupIdState(g.id);
      await refresh();
    },
    joinGroup: async (c) => {
      const g = await backend.joinGroup(c);
      localStorage.setItem('pz:group', g.id);
      setGroupIdState(g.id);
      await refresh();
    },
    leaveGroup: async (id) => {
      await backend.leaveGroup(id);
      await refresh();
    },
    recordTraining: async (gameId, score, spec) => {
      const prev = train[gameId] ?? { best: null, plays: 0, last: [] };
      const next: TrainStats = {
        best: prev.best === null || isBetter(score, prev.best, spec) ? score : prev.best,
        plays: prev.plays + 1,
        last: [...prev.last, score].slice(-20),
      };
      const all = { ...train, [gameId]: next };
      setTrain(all);
      try {
        localStorage.setItem(LOCAL_TRAIN, JSON.stringify(all));
      } catch {
        /* sin almacenamiento */
      }
      try {
        await backend.saveTraining(gameId, next);
      } catch (e) {
        console.warn('No se pudo sincronizar el entrenamiento', e);
      }
      return next;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** El entrenamiento también se guarda en local para funcionar sin conexión. */
const LOCAL_TRAIN = 'pz:train';
function mergeTrain(remote: Record<string, TrainStats>): Record<string, TrainStats> {
  let local: Record<string, TrainStats> = {};
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_TRAIN) ?? '{}');
  } catch {
    /* vacío */
  }
  const out: Record<string, TrainStats> = { ...local };
  for (const [id, r] of Object.entries(remote)) if (!out[id] || r.plays >= out[id].plays) out[id] = r;
  try {
    localStorage.setItem(LOCAL_TRAIN, JSON.stringify(out));
  } catch {
    /* sin almacenamiento */
  }
  return out;
}
