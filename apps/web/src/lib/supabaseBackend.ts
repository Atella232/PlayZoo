import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { BackendError, type Backend, type Extra, type Grupo, type Intento, type Perfil, type SubmitInput, type TrainStats } from './types';

const PENDING = 'pz:pendingProfile';

interface Row {
  [k: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function fail(e: { message?: string } | null): never {
  throw new BackendError(e?.message ?? 'Error de conexión');
}

/** Backend real sobre Supabase (Auth por correo, Postgres con RLS y Realtime). */
export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }

  private async uid(): Promise<string | null> {
    const { data } = await this.sb.auth.getSession();
    return data.session?.user.id ?? null;
  }

  async getMe(): Promise<Perfil | null> {
    const { data: s } = await this.sb.auth.getSession();
    const user = s.session?.user;
    if (!user) return null;
    const { data, error } = await this.sb.from('perfiles').select('id,nombre,emoji').eq('id', user.id).maybeSingle();
    if (error) fail(error);
    if (data) return data as Perfil;
    // primer acceso tras el enlace del correo: crear perfil con lo elegido antes
    let pending: { nombre?: string; emoji?: string } = {};
    try {
      pending = JSON.parse(localStorage.getItem(PENDING) ?? '{}');
    } catch {
      /* sin datos */
    }
    const meta = user.user_metadata as { nombre?: string; emoji?: string };
    const perfil = { id: user.id, nombre: (pending.nombre ?? meta.nombre ?? 'Jugador').slice(0, 24) || 'Jugador', emoji: pending.emoji ?? meta.emoji ?? '🐧' };
    const ins = await this.sb.from('perfiles').insert(perfil);
    if (ins.error) fail(ins.error);
    localStorage.removeItem(PENDING);
    return perfil;
  }

  async signIn(nombre: string, emoji: string, email?: string) {
    if (!email) throw new BackendError('Escribe tu correo para recibir el enlace de acceso');
    localStorage.setItem(PENDING, JSON.stringify({ nombre, emoji }));
    const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, data: { nombre, emoji } } });
    if (error) fail(error);
    return { revisaCorreo: true };
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async updateMe(p: Partial<Pick<Perfil, 'nombre' | 'emoji'>>) {
    const id = await this.uid();
    if (!id) throw new BackendError('Sin sesión');
    const { data, error } = await this.sb.from('perfiles').update(p).eq('id', id).select('id,nombre,emoji').single();
    if (error) fail(error);
    return data as Perfil;
  }

  async listGroups(): Promise<Grupo[]> {
    const id = await this.uid();
    if (!id) return [];
    const { data: ms, error } = await this.sb.from('miembros').select('grupo_id').eq('user_id', id);
    if (error) fail(error);
    const ids = (ms ?? []).map((m: Row) => m.grupo_id as string);
    if (!ids.length) return [];
    const [{ data: gs, error: e1 }, { data: mm, error: e2 }] = await Promise.all([
      this.sb.from('grupos').select('id,nombre,codigo').in('id', ids),
      this.sb.from('miembros').select('grupo_id,perfiles(id,nombre,emoji)').in('grupo_id', ids),
    ]);
    if (e1) fail(e1);
    if (e2) fail(e2);
    return (gs ?? []).map((g: Row) => ({
      id: g.id,
      nombre: g.nombre,
      codigo: g.codigo,
      miembros: (mm ?? []).filter((m: Row) => m.grupo_id === g.id && m.perfiles).map((m: Row) => m.perfiles as Perfil),
    }));
  }

  async createGroup(nombre: string) {
    const { data, error } = await this.sb.rpc('crear_grupo', { p_nombre: nombre });
    if (error) fail(error);
    const list = await this.listGroups();
    return list.find((g) => g.id === (data as Row).id)!;
  }

  async joinGroup(codigo: string) {
    const { data, error } = await this.sb.rpc('unirse_grupo', { p_codigo: codigo });
    if (error) fail(error);
    const list = await this.listGroups();
    return list.find((g) => g.id === (data as Row).id)!;
  }

  async leaveGroup(id: string) {
    const { error } = await this.sb.rpc('salir_grupo', { p_id: id });
    if (error) fail(error);
  }

  private toIntento(r: Row): Intento {
    return { userId: r.user_id, fecha: r.fecha, gameId: r.game_id, n: r.n, score: r.score, cuando: Date.parse(r.cuando) };
  }

  async groupAttempts(groupId: string, from: string, to: string) {
    const { data: ms, error: e0 } = await this.sb.from('miembros').select('user_id').eq('grupo_id', groupId);
    if (e0) fail(e0);
    const users = (ms ?? []).map((m: Row) => m.user_id as string);
    if (!users.length) return [];
    const { data, error } = await this.sb
      .from('intentos')
      .select('user_id,fecha,game_id,n,score,cuando')
      .in('user_id', users)
      .gte('fecha', from)
      .lte('fecha', to)
      .limit(5000);
    if (error) fail(error);
    return (data ?? []).map((r: Row) => this.toIntento(r));
  }

  async myAttempts(from: string, to: string) {
    const id = await this.uid();
    if (!id) return [];
    const { data, error } = await this.sb.from('intentos').select('user_id,fecha,game_id,n,score,cuando').eq('user_id', id).gte('fecha', from).lte('fecha', to);
    if (error) fail(error);
    return (data ?? []).map((r: Row) => this.toIntento(r));
  }

  async submitAttempt(a: SubmitInput) {
    const { data, error } = await this.sb.rpc('registrar_intento', {
      p_fecha: a.fecha,
      p_game: a.gameId,
      p_score: a.score,
      p_eventos: a.events.length > 6000 ? null : a.events,
    });
    if (error) fail(error);
    return this.toIntento(data as Row);
  }

  async allMyExtras() {
    const id = await this.uid();
    if (!id) return [];
    const { data, error } = await this.sb.from('intentos_extra').select('fecha,tipo').eq('user_id', id);
    if (error) fail(error);
    return (data ?? []) as Extra[];
  }

  async buyExtra(fecha: string, tipo: Extra['tipo']) {
    const { error } = await this.sb.rpc('comprar_extra', { p_fecha: fecha, p_tipo: tipo });
    if (error) fail(error);
  }

  async serverDice() {
    const { data, error } = await this.sb.rpc('mis_dados');
    if (error) fail(error);
    return data as number;
  }

  subscribe(groupId: string, cb: () => void) {
    const ch = this.sb
      .channel('grupo-' + groupId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'intentos' }, () => cb())
      .subscribe();
    const poll = window.setInterval(cb, 30000);
    return () => {
      clearInterval(poll);
      void this.sb.removeChannel(ch);
    };
  }

  async loadTraining() {
    const id = await this.uid();
    if (!id) return {};
    const { data, error } = await this.sb.from('entrenamiento_stats').select('game_id,best,plays,ultimas').eq('user_id', id);
    if (error) fail(error);
    const out: Record<string, TrainStats> = {};
    for (const r of (data ?? []) as Row[]) out[r.game_id] = { best: r.best, plays: r.plays, last: r.ultimas ?? [] };
    return out;
  }

  async saveTraining(gameId: string, s: TrainStats) {
    const id = await this.uid();
    if (!id) return;
    const { error } = await this.sb.from('entrenamiento_stats').upsert({ user_id: id, game_id: gameId, best: s.best, plays: s.plays, ultimas: s.last, actualizado: new Date().toISOString() });
    if (error) fail(error);
  }
}
