import { useEffect, useState, type ReactNode } from 'react';
import { CATEGORIAS, formatScore, progressToTop1 } from '@playzoo/shared';
import type { GameMeta } from '@playzoo/games';
import { registerAdHost } from '../lib/ads';
import { navigate, usePath } from '../lib/router';

/** Marcador "no terminado" (abandono) en juegos donde menos es mejor. */
export const FORFEIT_LOW_IS_BETTER = 999;
export const isForfeit = (meta: Pick<GameMeta, 'marcador'>, s: number | null | undefined) =>
  s !== null && s !== undefined && (meta.marcador.mejor === 'menor' && s >= FORFEIT_LOW_IS_BETTER);
export const fmt = (meta: Pick<GameMeta, 'marcador'>, s: number | null | undefined) => (isForfeit(meta, s) ? '—' : formatScore(s, meta.marcador));
export const catName = (meta: Pick<GameMeta, 'categoria'>) => CATEGORIAS[meta.categoria].nombre;
export const catEmoji = (c: GameMeta['categoria']) => CATEGORIAS[c].emoji;

export function Avatar({ emoji, size = 40 }: { emoji: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {emoji}
    </div>
  );
}

export function Meter({ frac }: { frac: number | null }) {
  if (frac === null) return null;
  return (
    <div className="meter">
      <i style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%` }} />
    </div>
  );
}

export const top1Frac = (meta: Pick<GameMeta, 'marcador' | 'top1'>, s: number | null) => progressToTop1(s, meta.top1, meta.marcador);

export function Sparkline({ values, better }: { values: number[]; better: 'mayor' | 'menor' }) {
  if (values.length < 2) return <div className="note">Juega unas cuantas partidas para ver tu evolución.</div>;
  const w = 300;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const y = better === 'mayor' ? h - 6 - ((v - min) / span) * (h - 12) : 6 + ((v - min) / span) * (h - 12);
    return `${(i / (values.length - 1)) * w},${y}`;
  });
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Evolución de tus últimas partidas">
      <polyline fill="none" stroke="url(#g)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={pts.join(' ')} />
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg ? <div className="toast" role="status">{msg}</div> : null, setMsg];
}

const TABS = [
  { path: '/', ic: '🏠', label: 'Hoy' },
  { path: '/entrenar', ic: '🏋️', label: 'Entrenar' },
  { path: '/ranking', ic: '🏆', label: 'Ranking' },
  { path: '/grupo', ic: '👥', label: 'Grupo' },
  { path: '/perfil', ic: '🙂', label: 'Perfil' },
];

export function TabBar() {
  const p = usePath();
  return (
    <div className="tabbar">
      <nav>
        {TABS.map((t) => {
          const on = t.path === '/' ? p === '/' : p.startsWith(t.path) || (t.path === '/entrenar' && p.startsWith('/juego'));
          return (
            <button key={t.path} className={'tab' + (on ? ' on' : '')} onClick={() => navigate(t.path)} aria-current={on ? 'page' : undefined}>
              <span className="ic">{t.ic}</span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Anuncio recompensado simulado (sustituible por AdMob en la app nativa). */
export function AdHost() {
  const [res, setRes] = useState<((ok: boolean) => void) | null>(null);
  const [left, setLeft] = useState(5);
  useEffect(() => {
    registerAdHost((resolve) => {
      setLeft(5);
      setRes(() => resolve);
    });
    return () => registerAdHost(null);
  }, []);
  useEffect(() => {
    if (!res || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [res, left]);
  if (!res) return null;
  const close = (ok: boolean) => {
    res(ok);
    setRes(null);
  };
  return (
    <div className="overlay" style={{ position: 'fixed', zIndex: 80 }}>
      <div className="sheet ad">
        <div className="sub">Anuncio de prueba (simulado)</div>
        <div className="box">📺 Tu anuncio aparecería aquí</div>
        <button className="btn primary" disabled={left > 0} onClick={() => close(true)}>
          {left > 0 ? `Espera ${left} s…` : 'Recibir intento extra'}
        </button>
        <button className="btn ghost small" onClick={() => close(false)}>Cerrar sin recompensa</button>
      </div>
    </div>
  );
}
