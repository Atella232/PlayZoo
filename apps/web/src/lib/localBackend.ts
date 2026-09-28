import { getMeta } from '@playzoo/games';
import { MAX_INTENTOS, dateKey, hashString, isPlausible, mulberry32, type ScoreSpec } from '@playzoo/shared';
import { gameOfDay } from './games';
import { BackendError, type Backend, type Extra, type Grupo, type Intento, type Perfil, type SubmitInput, type TrainStats } from './types';

const P = 'pz:local:';

function read<T>(k: string, def: T): T {
  try {
    const s = localStorage.getItem(P + k);
    return s ? (JSON.parse(s) as T) : def;
  } catch {
    return def;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(P + k, JSON.stringify(v));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

/** Jugadores simulados del grupo de demostración. */
const BOTS: (Perfil & { skill: number; hour: number })[] = [
  { id: 'bot-lia', nombre: 'Lía', emoji: '🐰', skill: 0.92, hour: 8 },
  { id: 'bot-marco', nombre: 'Marco', emoji: '🐻', skill: 0.82, hour: 12 },
  { id: 'bot-nora', nombre: 'Nora', emoji: '🐼', skill: 0.72, hour: 15 },
  { id: 'bot-iker', nombre: 'Iker', emoji: '🦁', skill: 0.86, hour: 19 },
  { id: 'bot-sofi', nombre: 'Sofi', emoji: '🐸', skill: 0.62, hour: 21 },
];

function botScore(bot: (typeof BOTS)[number], fecha: string, gameId: string, n: number, spec: ScoreSpec, top1: number | null): number {
  const rng = mulberry32(hashString(`${bot.id}|${fecha}|${gameId}|${n}`));
  const q = Math.min(0.99, Math.max(0.3, bot.skill * (0.8 + rng() * 0.3)));
  const ref = top1 ?? 50;
  let s: number;
  if (spec.unidad === '%') s = 100 - (100 - ref) / q;
  else if (spec.mejor === 'mayor') s = ref * q;
  else s = ref > 0 ? ref / q : (1 - q) * 1.6;
  const f = 10 ** spec.decimales;
  s = Math.round(Math.max(0, s) * f) / f;
  if (spec.unidad === '%') s = Math.min(100, Math.max(20, s));
  return s;
}

function botAttempts(fecha: string, now = new Date()): Intento[] {
  const meta = gameOfDay(fecha);
  const today = dateKey(now);
  if (fecha > today) return [];
  const hourNow = now.getHours() + now.getMinutes() / 60;
  const out: Intento[] = [];
  const dayStart = Date.parse(fecha + 'T00:00:00');
  for (const b of BOTS) {
    if (fecha === today && hourNow < b.hour) continue;
    const r = mulberry32(hashString(b.id + fecha));
    const count = r() < 0.6 ? 2 : 1;
    for (let n = 1; n <= count; n++) {
      out.push({ userId: b.id, fecha, gameId: meta.id, n, score: botScore(b, fecha, meta.id, n, meta.marcador, meta.top1), cuando: dayStart + (b.hour + n * 0.1) * 3600000 });
    }
  }
  return out;
}

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + 'T12:00:00Z');
  const end = new Date(to + 'T12:00:00Z');
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const DEMO_CODE = 'DEMO01';

export class LocalBackend implements Backend {
  readonly kind = 'local' as const;

  async getMe() {
    return read<Perfil | null>('me', null);
  }

  async signIn(nombre: string, emoji: string) {
    const me: Perfil = { id: 'local-me', nombre: nombre.trim() || 'Jugador', emoji };
    write('me', me);
    const groups = read<string[]>('groups', []);
    if (!groups.length) write('groups', [DEMO_CODE]);
  }

  async signOut() {
    write('me', null);
  }

  async updateMe(p: Partial<Pick<Perfil, 'nombre' | 'emoji'>>) {
    const me = await this.getMe();
    if (!me) throw new BackendError('Sin sesión');
    const n = { ...me, ...p };
    write('me', n);
    return n;
  }

  private groupFromCode(code: string, me: Perfil): Grupo | null {
    if (code === DEMO_CODE) return { id: 'demo', nombre: 'Grupo de demostración', codigo: DEMO_CODE, miembros: [me, ...BOTS.map(({ id, nombre, emoji }) => ({ id, nombre, emoji }))], demo: true };
    const own = read<{ id: string; nombre: string; codigo: string }[]>('own', []).find((g) => g.codigo === code);
    if (own) return { ...own, miembros: [me] };
    return null;
  }

  async listGroups() {
    const me = await this.getMe();
    if (!me) return [];
    return read<string[]>('groups', []).map((c) => this.groupFromCode(c, me)).filter((g): g is Grupo => !!g);
  }

  async createGroup(nombre: string) {
    const me = await this.getMe();
    if (!me) throw new BackendError('Sin sesión');
    const codigo = Math.random().toString(36).slice(2, 8).toUpperCase();
    const g = { id: 'local-' + codigo, nombre: nombre.trim() || 'Mi grupo', codigo };
    write('own', [...read<typeof g[]>('own', []), g]);
    write('groups', [...read<string[]>('groups', []), codigo]);
    return { ...g, miembros: [me] };
  }

  async joinGroup(codigo: string) {
    const me = await this.getMe();
    if (!me) throw new BackendError('Sin sesión');
    const c = codigo.trim().toUpperCase();
    const g = this.groupFromCode(c, me);
    if (!g) throw new BackendError('No existe ese código. En modo demo solo puedes unirte al grupo DEMO01.');
    const list = read<string[]>('groups', []);
    if (!list.includes(c)) write('groups', [...list, c]);
    return g;
  }

  async leaveGroup(id: string) {
    const me = await this.getMe();
    if (!me) return;
    const groups = await this.listGroups();
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    write('groups', read<string[]>('groups', []).filter((c) => c !== g.codigo));
  }

  private mine(): Intento[] {
    return read<Intento[]>('attempts', []);
  }

  async myAttempts(from: string, to: string) {
    return this.mine().filter((a) => a.fecha >= from && a.fecha <= to);
  }

  async groupAttempts(groupId: string, from: string, to: string) {
    const mine = await this.myAttempts(from, to);
    if (groupId !== 'demo') return mine;
    const bots = datesBetween(from, to).flatMap((d) => botAttempts(d));
    return [...mine, ...bots];
  }

  async allMyExtras() {
    return read<Extra[]>('extras', []);
  }

  async buyExtra(fecha: string, tipo: Extra['tipo']) {
    const extras = read<Extra[]>('extras', []);
    if (tipo === 'anuncio' && extras.filter((e) => e.fecha === fecha && e.tipo === 'anuncio').length >= 1) {
      throw new BackendError('Solo un intento extra por anuncio al día');
    }
    write('extras', [...extras, { fecha, tipo }]);
  }

  async submitAttempt(a: SubmitInput) {
    const me = await this.getMe();
    if (!me) throw new BackendError('Sin sesión');
    const hoy = dateKey();
    if (a.fecha !== hoy) throw new BackendError('Solo se puede jugar el juego de hoy');
    const meta = getMeta(a.gameId);
    if (!meta || gameOfDay(a.fecha).id !== a.gameId) throw new BackendError('Ese no es el juego de hoy');
    if (!isPlausible(a.score, meta.top1, meta.marcador)) throw new BackendError('Marcador no válido');
    const all = this.mine();
    const today = all.filter((x) => x.fecha === a.fecha && x.gameId === a.gameId);
    const extras = read<Extra[]>('extras', []).filter((e) => e.fecha === a.fecha).length;
    if (today.length >= MAX_INTENTOS + extras) throw new BackendError('No te quedan intentos');
    const rec: Intento = { userId: me.id, fecha: a.fecha, gameId: a.gameId, n: today.length + 1, score: a.score, cuando: Date.now() };
    write('attempts', [...all, rec]);
    window.dispatchEvent(new Event('pz:data'));
    return rec;
  }

  subscribe(_groupId: string, cb: () => void) {
    const id = window.setInterval(cb, 15000);
    const on = () => cb();
    window.addEventListener('pz:data', on);
    return () => {
      clearInterval(id);
      window.removeEventListener('pz:data', on);
    };
  }

  async loadTraining() {
    return read<Record<string, TrainStats>>('train', {});
  }

  async saveTraining(gameId: string, s: TrainStats) {
    write('train', { ...read<Record<string, TrainStats>>('train', {}), [gameId]: s });
  }
}
