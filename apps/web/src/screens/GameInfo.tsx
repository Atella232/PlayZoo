import { getMeta, isImplemented } from '@playzoo/games';
import { useApp } from '../lib/store';
import { back, navigate } from '../lib/router';
import { Meter, Sparkline, catName, fmt, top1Frac } from '../components/common';

export function GameInfo({ id }: { id: string }) {
  const { train } = useApp();
  const meta = getMeta(id);
  if (!meta) return <div className="app"><p className="err">Juego no encontrado.</p></div>;
  const st = train[id];
  const avg = st && st.last.length ? st.last.reduce((a, b) => a + b, 0) / st.last.length : null;
  const ok = isImplemented(id);

  return (
    <div className="app">
      <button className="btn small ghost" onClick={() => back('/entrenar')}>← Volver</button>
      <div className="hero mt">
        <div className="row" style={{ gap: 16 }}>
          <div className="big">{meta.emoji}</div>
          <div className="grow">
            <div className="day">Juego {meta.num} de 71</div>
            <h2>{meta.nombre}</h2>
            <div className="tags">
              <span className="tag">{catName(meta)}</span>
              <span className="tag">Duración ~{meta.duracionSeg}s</span>
            </div>
          </div>
        </div>
        <p className="mt" style={{ lineHeight: 1.45 }}>{meta.instrucciones}</p>
        {meta.fiabilidad !== 'oficial' && (
          <p className="note mt" style={{ color: 'rgba(255,255,255,.7)' }}>
            Reglas deducidas de {meta.fiabilidad === 'video' ? 'vídeo' : meta.fiabilidad === 'sin confirmar' ? 'su nombre' : 'vídeo y análisis'}; pueden diferir del juego original.
          </p>
        )}
        <button className="btn primary block mt" disabled={!ok} onClick={() => navigate(`/jugar/train/${id}`)}>
          {ok ? 'Entrenar' : 'Próximamente'}
        </button>
      </div>

      <div className="card mt">
        <h3>Tus estadísticas</h3>
        <div className="facts">
          <div className="fact"><b>{st?.best !== null && st?.best !== undefined ? fmt(meta, st.best) : '—'}</b><span>Récord</span></div>
          <div className="fact"><b>{avg !== null ? fmt(meta, avg) : '—'}</b><span>Media últimas {st?.last.length ?? 0}</span></div>
          <div className="fact"><b>{st?.plays ?? 0}</b><span>Partidas</span></div>
        </div>
        <div className="mt">
          <Sparkline values={st?.last ?? []} better={meta.marcador.mejor} />
        </div>
      </div>

      <div className="card mt">
        <h3>Frente al Top 1 % del mundo</h3>
        {meta.top1 === null ? (
          <p className="note">Este juego aún no tiene marca de referencia.</p>
        ) : (
          <>
            <div className="row between"><span className="muted">Referencia</span><b>{fmt(meta, meta.top1)}</b></div>
            <div className="mt"><Meter frac={top1Frac(meta, st?.best ?? null)} /></div>
            <p className="note mt">{st?.best !== null && st?.best !== undefined ? `Tu récord está al ${Math.round(Math.min(1, top1Frac(meta, st.best) ?? 0) * 100)} % de esa marca.` : 'Juega para ver cuánto te falta.'}</p>
          </>
        )}
      </div>
    </div>
  );
}
