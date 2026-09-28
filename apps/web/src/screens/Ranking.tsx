import { useState } from 'react';
import { EPOCH, addDays, seasonInfo } from '@playzoo/shared';
import { gameOfDay } from '../lib/games';
import { useApp } from '../lib/store';
import { dayBoard, seasonBoard, seasonDates } from '../lib/standings';
import { useGroupAttempts } from '../lib/hooks';
import { Avatar, fmt } from '../components/common';

type Tab = 'hoy' | 'temporada' | 'historial';

export function Ranking() {
  const { group, hoy, me } = useApp();
  const [tab, setTab] = useState<Tab>('temporada');
  const [dia, setDia] = useState(hoy);
  const info = seasonInfo(hoy);
  const { atts, loading, error } = useGroupAttempts(group, EPOCH, hoy);

  if (!group)
    return (
      <div className="app">
        <h1 className="page-title">Ranking</h1>
        <p className="note mt">Necesitas un grupo para ver la clasificación.</p>
      </div>
    );

  const player = (id: string) => group.miembros.find((m) => m.id === id);
  const dates = seasonDates(info.temporada, hoy);

  return (
    <div className="app">
      <h1 className="page-title">Ranking</h1>
      <p className="sub">{group.nombre} · Temporada {info.temporada} · día {info.dia}/{info.total}</p>
      <div className="tabs2 mt">
        {(['hoy', 'temporada', 'historial'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'hoy' ? 'Hoy' : t === 'temporada' ? 'Temporada' : 'Días'}</button>
        ))}
      </div>
      {error && <p className="err mt">{error}</p>}
      {loading && <p className="note mt">Cargando…</p>}

      {tab === 'hoy' && <DayCard fecha={hoy} />}

      {tab === 'temporada' && (
        <div className="card mt">
          <table className="tbl">
            <thead>
              <tr><th>Jugador</th><th>Pts</th><th>🥇</th><th>Días</th><th style={{ textAlign: 'right' }}>Evolución</th></tr>
            </thead>
            <tbody>
              {seasonBoard(group, info.temporada, hoy, atts).map((r, i) => {
                const p = player(r.userId);
                if (!p) return null;
                const maxP = 10;
                return (
                  <tr key={r.userId} className={p.id === me?.id ? 'me' : ''}>
                    <td><div className="row"><span className={`rank r${i + 1}`}>{i + 1}</span><Avatar emoji={p.emoji} size={28} /><span style={{ fontWeight: 800 }}>{p.nombre}</span></div></td>
                    <td className="score">{r.puntos}</td>
                    <td>{r.victorias}</td>
                    <td>{r.dias}/{dates.length}</td>
                    <td><div className="daybars" style={{ justifyContent: 'flex-end' }}>{r.porDia.map((v, k) => <i key={k} style={{ height: `${Math.max(8, (v / maxP) * 100)}%` }} />)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="note mt">Puntos por día: 1.º 10 · 2.º 7 · 3.º 5 · 4.º 4 · 5.º 3 · 6.º 2 · resto 1. Se acumulan durante 21 días.</p>
        </div>
      )}

      {tab === 'historial' && (
        <>
          <div className="chips mt">
            {dates.slice().reverse().map((d) => (
              <button key={d} className={'chip' + (dia === d ? ' on' : '')} onClick={() => setDia(d)}>
                {gameOfDay(d).emoji} {d.slice(8)}/{d.slice(5, 7)}
              </button>
            ))}
          </div>
          <DayCard fecha={dia} />
        </>
      )}
    </div>
  );

  function DayCard({ fecha }: { fecha: string }) {
    const meta = gameOfDay(fecha);
    const rows = dayBoard(group!, fecha, atts);
    return (
      <div className="card mt">
        <div className="row between">
          <h3>{meta.emoji} {meta.nombre}</h3>
          <span className="tag">{fecha.split('-').reverse().join('/')}</span>
        </div>
        <div className="list">
          {rows.map((r) => {
            const p = player(r.userId);
            if (!p) return null;
            return (
              <div key={r.userId} className={'li' + (p.id === me?.id ? ' me' : '')}>
                <div className={'rank' + (r.rank ? ` r${r.rank}` : '')}>{r.rank ?? '–'}</div>
                <Avatar emoji={p.emoji} size={34} />
                <div className="grow" style={{ fontWeight: 800 }}>{p.nombre}</div>
                <div className="score">{r.mejor === null ? '—' : fmt(meta, r.mejor)}</div>
                <div className="muted" style={{ width: 44, textAlign: 'right' }}>{r.rank ? `+${r.puntos}` : ''}</div>
              </div>
            );
          })}
        </div>
        {fecha < addDays(hoy, 0) && rows.every((r) => r.mejor === null) && <p className="note">Nadie jugó ese día.</p>}
      </div>
    );
  }
}
