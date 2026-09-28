import { useMemo, useState } from 'react';
import { CATALOG, isImplemented } from '@playzoo/games';
import { CATEGORIAS, type Categoria } from '@playzoo/shared';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { Meter, fmt, top1Frac } from '../components/common';

export function Training() {
  const { train } = useApp();
  const [cat, setCat] = useState<Categoria | 'todos' | 'jugados'>('todos');
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = useMemo(
    () =>
      CATALOG.filter((g) => (cat === 'todos' ? true : cat === 'jugados' ? (train[g.id]?.plays ?? 0) > 0 : g.categoria === cat)).filter((g) => !q || norm(g.nombre).includes(norm(q))),
    [cat, q, train],
  );
  const played = CATALOG.filter((g) => (train[g.id]?.plays ?? 0) > 0).length;

  return (
    <div className="app">
      <h1 className="page-title">Entrenamiento</h1>
      <p className="sub">Juega cada minijuego todas las veces que quieras. No cuenta para el grupo. {played}/{CATALOG.length} probados.</p>
      <input className="search mt" placeholder="Buscar juego…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar juego" />
      <div className="chips mt">
        <button className={'chip' + (cat === 'todos' ? ' on' : '')} onClick={() => setCat('todos')}>Todos · {CATALOG.length}</button>
        <button className={'chip' + (cat === 'jugados' ? ' on' : '')} onClick={() => setCat('jugados')}>Jugados · {played}</button>
        {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
            {CATEGORIAS[c].emoji} {CATEGORIAS[c].nombre} · {CATALOG.filter((g) => g.categoria === c).length}
          </button>
        ))}
      </div>
      <div className="gamegrid mt">
        {list.map((g) => {
          const st = train[g.id];
          const ok = isImplemented(g.id);
          return (
            <button key={g.id} className={'gcard' + (ok ? '' : ' soon')} disabled={!ok} onClick={() => navigate(`/juego/${g.id}`)}>
              <div className="e">{g.emoji}</div>
              <div className="n">{g.nombre}</div>
              <div className="m">{ok ? (st?.best !== null && st?.best !== undefined ? `Récord ${fmt(g, st.best)}` : 'Sin jugar') : 'Próximamente'}</div>
              <Meter frac={st?.best !== null && st?.best !== undefined ? top1Frac(g, st.best) : null} />
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="note mt">Ningún juego coincide.</p>}
    </div>
  );
}
