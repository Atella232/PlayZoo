import { useState } from 'react';
import { MAX_INTENTOS, DICE, isBetter, seasonInfo } from '@playzoo/shared';
import { gameOfDay } from '../lib/games';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { adProvider } from '../lib/ads';
import { dayBoard, seasonBoard } from '../lib/standings';
import { useGroupAttempts } from '../lib/hooks';
import { Avatar, catName, fmt, useToast } from '../components/common';
import { EPOCH } from '@playzoo/shared';

export function Home() {
  const { me, group, groups, setGroupId, hoy, misIntentos, extrasHoy, dice, backend, refresh } = useApp();
  const meta = gameOfDay(hoy);
  const season = seasonInfo(hoy);
  const [uno, setUno] = useState(false);
  const [toast, say] = useToast();
  const { atts } = useGroupAttempts(group, EPOCH, hoy);

  const used = misIntentos.filter((a) => a.gameId === meta.id).length;
  const allowed = MAX_INTENTOS + extrasHoy.length;
  const left = Math.max(0, allowed - used);
  const best = misIntentos.filter((a) => a.gameId === meta.id).reduce<number | null>((m, a) => (m === null || isBetter(a.score, m, meta.marcador) ? a.score : m), null);
  const board = group ? dayBoard(group, hoy, atts) : [];
  const seasonRows = group ? seasonBoard(group, season.temporada, hoy, atts) : [];
  const nombre = (id: string) => group?.miembros.find((m) => m.id === id);

  const buy = async (tipo: 'dados' | 'anuncio') => {
    try {
      if (tipo === 'anuncio') {
        const ok = await adProvider.showRewarded();
        if (!ok) return say('Necesitas ver el anuncio completo');
      }
      await backend.buyExtra(hoy, tipo);
      await refresh();
      setUno(false);
      say('¡Intento extra conseguido!');
    } catch (e) {
      say((e as Error).message);
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">PlayZoo</div>
        <div className="row">
          {groups.length > 1 && (
            <select className="pill" value={group?.id} onChange={(e) => setGroupId(e.target.value)} aria-label="Grupo">
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          )}
          <span className="pill" title="Dados">🎲 {dice ?? '–'}</span>
        </div>
      </div>

      <div className="hero">
        <div className="row between">
          <div className="day">Hoy · #{season.dia}/{season.total} · Temporada {season.temporada}</div>
          <div className="pips" aria-label={`Intentos usados ${used} de ${allowed}`}>
            {Array.from({ length: allowed }).map((_, i) => <span key={i} className={'pip' + (i < used ? ' on' : '')} />)}
          </div>
        </div>
        <div className="row mt" style={{ gap: 16 }}>
          <div className="big">{meta.emoji}</div>
          <div className="grow">
            <h2>{meta.nombre}</h2>
            <div className="tags">
              <span className="tag">{catName(meta)}</span>
              <span className="tag">Duración ~{meta.duracionSeg}s</span>
            </div>
          </div>
        </div>
        <p className="mt" style={{ fontSize: 14.5, lineHeight: 1.4, color: 'rgba(255,255,255,.88)' }}>{meta.instrucciones}</p>
        <div className="row between mt">
          <div className="sub" style={{ color: 'rgba(255,255,255,.75)' }}>{meta.marcador.etiqueta} · {meta.marcador.mejor === 'mayor' ? 'más es mejor' : 'menos es mejor'}</div>
          <div className="score" style={{ fontSize: 17, whiteSpace: "nowrap" }}>{best === null ? "Sin marca" : `Tu mejor: ${fmt(meta, best)}`}</div>
        </div>
        <div className="btnrow mt">
          {left > 0 ? (
            <button className="btn primary" onClick={() => navigate(`/jugar/ranked/${meta.id}`)}>Jugar · intento {used + 1} de {allowed}</button>
          ) : (
            <button className="btn primary" onClick={() => setUno(true)}>¡Uno más!</button>
          )}
          <button className="btn" onClick={() => navigate(`/jugar/try/${meta.id}`)}>Probar juego</button>
        </div>
      </div>

      <div className="card mt">
        <div className="row between">
          <h3>En directo · {group?.nombre ?? 'Sin grupo'}</h3>
          {group?.demo && <span className="tag">Simulado</span>}
        </div>
        {!group && <p className="note">Crea un grupo o únete con un código en la pestaña Grupo.</p>}
        <div className="list">
          {board.map((r) => {
            const p = nombre(r.userId);
            if (!p) return null;
            return (
              <div key={r.userId} className={'li' + (p.id === me?.id ? ' me' : '')}>
                <div className={'rank' + (r.rank ? ` r${r.rank}` : '')}>{r.rank ?? '–'}</div>
                <Avatar emoji={p.emoji} size={36} />
                <div className="grow">
                  <div style={{ fontWeight: 800 }}>{p.nombre}{p.id === me?.id ? ' (tú)' : ''}</div>
                  <div className="note">{r.intentos.length ? `${r.intentos.length} intento${r.intentos.length > 1 ? 's' : ''}` : 'Aún no ha jugado'}</div>
                </div>
                <div className="score">{r.mejor === null ? '—' : fmt(meta, r.mejor)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {group && (
        <div className="card mt">
          <div className="row between">
            <h3>Temporada {season.temporada}</h3>
            <button className="btn small ghost" onClick={() => navigate('/ranking')}>Ver todo</button>
          </div>
          <div className="list">
            {seasonRows.slice(0, 3).map((r, i) => {
              const p = nombre(r.userId);
              return p ? (
                <div className="li" key={r.userId}>
                  <div className={`rank r${i + 1}`}>{i + 1}</div>
                  <Avatar emoji={p.emoji} size={32} />
                  <div className="grow" style={{ fontWeight: 800 }}>{p.nombre}</div>
                  <div className="score">{r.puntos} pts</div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {uno && (
        <div className="overlay" style={{ position: 'fixed', zIndex: 70 }} onClick={() => setUno(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="big">🍀</div>
            <h2>¡Uno más!</h2>
            <p className="sub">Se te han acabado los intentos de hoy. Consigue uno extra:</p>
            <button className="btn primary" disabled={extrasHoy.some((e) => e.tipo === 'anuncio')} onClick={() => buy('anuncio')}>
              📺 Ver un anuncio {extrasHoy.some((e) => e.tipo === 'anuncio') ? '(ya usado hoy)' : ''}
            </button>
            <button className="btn" disabled={(dice ?? 0) < DICE.costeUnoMas} onClick={() => buy('dados')}>
              🎲 Gastar {DICE.costeUnoMas} dados (tienes {dice ?? 0})
            </button>
            <button className="btn ghost small" onClick={() => setUno(false)}>Ahora no</button>
          </div>
        </div>
      )}
      {toast}
    </div>
  );
}
