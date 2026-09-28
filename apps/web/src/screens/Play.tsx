import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Runner, type GameDef, type RunResult } from '@playzoo/engine';
import { loadGame } from '@playzoo/games';
import { EPOCH, MAX_INTENTOS, dailySeed, isBetter } from '@playzoo/shared';
import { gameOfDay } from '../lib/games';
import { useApp } from '../lib/store';
import { back, navigate } from '../lib/router';
import { sfx } from '../lib/sfx';
import { dayBoard } from '../lib/standings';
import { useGroupAttempts } from '../lib/hooks';
import { clearRankedStarted, forfeitScore, markRankedStarted, submitForfeit } from '../lib/forfeit';
import { Meter, catName, fmt, top1Frac } from '../components/common';
import type { Intento, TrainStats } from '../lib/types';

export type PlayMode = 'ranked' | 'try' | 'train';

type Phase = 'loading' | 'ficha' | 'count' | 'run' | 'saving' | 'result';

interface Outcome {
  score: number;
  saved?: Intento;
  stats?: TrainStats;
  prevBest?: number | null;
  newBest?: boolean;
  error?: string;
}

const LABEL: Record<PlayMode, string> = { ranked: 'Partida del día', try: 'Probar juego · no cuenta', train: 'Entrenamiento' };

export function Play({ mode, id }: { mode: PlayMode; id: string }) {
  const app = useApp();
  const { hoy, misIntentos, extrasHoy, train, group, me } = app;
  const [def, setDef] = useState<GameDef | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [count, setCount] = useState(3);
  const [out, setOut] = useState<Outcome | null>(null);
  const [round, setRound] = useState(0);
  const [loadErr, setLoadErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const runner = useRef<Runner | null>(null);
  const startedFecha = useRef(hoy);
  const lastEvents = useRef<RunResult | null>(null);

  const dayMeta = gameOfDay(hoy);
  const isToday = id === dayMeta.id;
  const used = misIntentos.filter((a) => a.gameId === id).length;
  const allowed = MAX_INTENTOS + extrasHoy.length;
  const left = Math.max(0, allowed - used);
  const rankedBlocked = mode === 'ranked' && (!isToday || left <= 0);

  const { atts, reload } = useGroupAttempts(mode === 'ranked' ? group : null, EPOCH, hoy);

  useEffect(() => {
    let cancelled = false;
    loadGame(id)
      .then((d) => {
        if (cancelled) return;
        setDef(d);
        setPhase('ficha');
      })
      .catch((e) => setLoadErr((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => () => runner.current?.stop(), []);

  // Ajuste del lienzo 9:16 al espacio disponible
  useLayoutEffect(() => {
    const b = box.current;
    const c = canvas.current;
    if (!b || !c) return;
    const fit = () => {
      const w = Math.min(b.clientWidth, (b.clientHeight * 9) / 16);
      c.style.width = `${Math.floor(w)}px`;
      c.style.height = `${Math.floor((w * 16) / 9)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [phase === 'loading']);

  const seed = useMemo(
    () => (mode === 'ranked' ? dailySeed(hoy, id) : `${mode}:${id}:${Date.now()}:${round}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, id, round],
  );

  const finish = useCallback(
    async (r: RunResult) => {
      if (!def) return;
      lastEvents.current = r;
      runner.current = null;
      setPhase('saving');
      const o: Outcome = { score: r.score };
      if (mode === 'ranked') {
        try {
          o.saved = await app.backend.submitAttempt({ fecha: startedFecha.current, gameId: def.id, score: r.score, events: r.events });
          clearRankedStarted();
          await app.refresh();
          await reload();
        } catch (e) {
          o.error = (e as Error).message;
        }
      } else if (mode === 'train') {
        o.prevBest = train[def.id]?.best ?? null;
        o.newBest = o.prevBest === null || isBetter(r.score, o.prevBest, def.marcador);
        o.stats = await app.recordTraining(def.id, r.score, def.marcador);
      }
      setOut(o);
      setPhase('result');
      sfx.play(o.newBest ? 'win' : 'ok');
    },
    [def, mode, app, train, reload],
  );

  const begin = () => {
    if (!def || !canvas.current || rankedBlocked) return;
    sfx.unlock();
    setOut(null);
    startedFecha.current = hoy;
    const turbo = import.meta.env.DEV ? Number(localStorage.getItem('pz:turbo') ?? 0) || undefined : undefined;
    const r = new Runner(canvas.current, def, { seed, mode: mode === 'ranked' ? 'ranked' : 'entrenamiento', sfx, turbo, onEnd: (res) => void finish(res) });
    runner.current = r;
    r.preview();
    setPhase('count');
    setCount(3);
    let n = 3;
    const tick = () => {
      n--;
      if (n <= 0) {
        if (mode === 'ranked') markRankedStarted(hoy, def.id);
        setPhase('run');
        r.start();
      } else {
        setCount(n);
        sfx.play('tick');
        timer = window.setTimeout(tick, 800);
      }
    };
    sfx.play('tick');
    let timer = window.setTimeout(tick, 800);
    cleanupCount.current = () => clearTimeout(timer);
  };
  const cleanupCount = useRef<() => void>(() => {});

  const exit = async () => {
    if (phase === 'run' && mode === 'ranked') {
      if (!window.confirm('Si sales ahora, este intento cuenta como perdido. ¿Salir?')) return;
      runner.current?.stop();
      runner.current = null;
      try {
        await submitForfeit(startedFecha.current, id);
        clearRankedStarted();
        await app.refresh();
      } catch {
        /* sin intentos */
      }
    } else if (phase === 'count' || phase === 'run') {
      cleanupCount.current();
      runner.current?.stop();
      runner.current = null;
    }
    back(mode === 'ranked' ? '/' : `/juego/${id}`);
  };

  const again = () => {
    cleanupCount.current();
    runner.current?.stop();
    setRound((n) => n + 1);
    setOut(null);
    setPhase('ficha');
  };

  const retrySave = async () => {
    if (!def || !lastEvents.current) return;
    setPhase('saving');
    const r = lastEvents.current;
    const o: Outcome = { score: r.score };
    try {
      o.saved = await app.backend.submitAttempt({ fecha: startedFecha.current, gameId: def.id, score: r.score, events: r.events });
      clearRankedStarted();
      await app.refresh();
      await reload();
    } catch (e) {
      o.error = (e as Error).message;
    }
    setOut(o);
    setPhase('result');
  };

  if (loadErr)
    return (
      <div className="app center">
        <p className="err">{loadErr}</p>
        <button className="btn mt" onClick={() => navigate('/')}>Volver</button>
      </div>
    );

  const board = mode === 'ranked' && group && def ? dayBoard(group, hoy, atts) : [];
  const trainBest = def ? train[def.id]?.best ?? null : null;
  const idle = phase === 'ficha' || phase === 'loading';
  const provisional = out?.saved && group ? board.find((b) => b.userId === me?.id)?.rank : null;

  return (
    <div className="play">
      <div className="strip">
        <button className="exit" onClick={exit} aria-label="Salir">✕</button>
        {mode === 'ranked' && def ? (
          <div className="chipbar" aria-live="polite">
            {board.length === 0 && <span className="schip">Sin grupo</span>}
            {board.map((b) => {
              const p = group?.miembros.find((m) => m.id === b.userId);
              if (!p) return null;
              return (
                <span key={b.userId} className={'schip' + (p.id === me?.id ? ' me' : '')}>
                  <span className="a">{p.emoji}</span>
                  {b.mejor === null ? '—' : fmt(def, b.mejor)}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="chipbar">
            <span className="schip"><span className="a">{mode === 'train' ? '🏋️' : '🧪'}</span>{LABEL[mode]}</span>
            {def && mode === 'train' && <span className="schip"><span className="r">Récord</span>{fmt(def, trainBest)}</span>}
          </div>
        )}
      </div>

      <div className="stagebox" ref={box}>
        <canvas ref={canvas} aria-label={def ? `Juego ${def.nombre}` : 'Juego'} />

        {phase === 'count' && (
          <div className="overlay" style={{ background: 'rgba(5,8,19,.35)', backdropFilter: 'none', pointerEvents: 'none' }}>
            <div className="count" key={count}>{count}</div>
          </div>
        )}

        {idle && def && (
          <div className="overlay">
            <div className="sheet">
              <div className="big">{def.emoji}</div>
              <div>
                <h2>{def.nombre}</h2>
                <div className="sub">{catName(def)}</div>
              </div>
              <p className="rules">{def.instrucciones}</p>
              <div className="facts">
                <div className="fact"><b>~{def.duracionSeg} s</b><span>Duración</span></div>
                <div className="fact"><b>{def.marcador.etiqueta}</b><span>{def.marcador.mejor === 'mayor' ? 'Más es mejor' : 'Menos es mejor'}</span></div>
                <div className="fact"><b>{def.top1 === null ? '—' : fmt(def, def.top1)}</b><span>Top 1 %</span></div>
              </div>
              {def.fiabilidad !== 'oficial' && (
                <div className="note">Reglas deducidas de {def.fiabilidad === 'video' ? 'vídeo' : def.fiabilidad === 'sin confirmar' ? 'su nombre' : 'vídeo y análisis'}: pueden diferir del original.</div>
              )}
              <div className="badge tag">{LABEL[mode]}{mode === 'ranked' ? ` · intento ${used + 1} de ${allowed}` : ''}</div>
              {rankedBlocked ? (
                <>
                  <p className="err">{!isToday ? 'Ese no es el juego de hoy.' : 'No te quedan intentos hoy.'}</p>
                  <button className="btn" onClick={() => navigate('/')}>Volver</button>
                </>
              ) : (
                <button className="btn primary" onClick={begin}>¡A jugar!</button>
              )}
              <button className="btn ghost small" onClick={exit}>Cancelar</button>
            </div>
          </div>
        )}

        {phase === 'saving' && (
          <div className="overlay"><div className="sheet"><div className="big">⏳</div><p>Guardando…</p></div></div>
        )}

        {phase === 'result' && def && out && (
          <div className="overlay">
            <div className="sheet">
              <div className="big">{def.emoji}</div>
              <div className="sub">{def.nombre}</div>
              <div className="resultscore">{fmt(def, out.score)}</div>
              {mode === 'ranked' && out.saved && (
                <>
                  <div className="good" style={{ fontWeight: 800 }}>Guardado ✓{provisional ? ` · Vas #${provisional} del grupo` : ''}</div>
                  <div className="note">{left > 0 ? `Te queda${left > 1 ? 'n' : ''} ${left} intento${left > 1 ? 's' : ''}.` : 'Ya no te quedan intentos hoy. Si quieres otro, usa "¡Uno más!" en Inicio.'}</div>
                </>
              )}
              {mode === 'ranked' && out.error && (
                <>
                  <p className="err">No se pudo guardar: {out.error}</p>
                  <button className="btn primary" onClick={retrySave}>Reintentar</button>
                </>
              )}
              {mode === 'train' && out.stats && (
                <>
                  {out.newBest && <div className="newrec">¡Nuevo récord!</div>}
                  <div className="note">Tu récord: {fmt(def, out.stats.best)} · Partidas: {out.stats.plays}</div>
                </>
              )}
              {def.top1 !== null && (
                <div>
                  <Meter frac={top1Frac(def, out.score)} />
                  <div className="note" style={{ marginTop: 6 }}>Top 1 % del mundo: {fmt(def, def.top1)}</div>
                </div>
              )}
              <div className="btnrow">
                {mode !== 'ranked' && <button className="btn primary" onClick={again}>Otra vez</button>}
                {mode === 'ranked' && left > 0 && !out.error && <button className="btn primary" onClick={again}>Siguiente intento</button>}
                <button className="btn" onClick={() => (mode === 'ranked' ? navigate('/') : navigate(`/juego/${id}`))}>Salir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
