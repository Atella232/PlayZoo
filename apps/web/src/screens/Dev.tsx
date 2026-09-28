import { useEffect, useRef, useState } from 'react';
import { Runner, chaosBot, idleBot, randomDragBot, randomTapBot, runHeadless, W, type Bot, type GameDef } from '@playzoo/engine';
import { CATALOG, isImplemented, loadGame } from '@playzoo/games';
import { sfx } from '../lib/sfx';
import { fmt } from '../components/common';

/** Galería interna: cualquier juego, semilla editable y marcador en vivo. */
export function Dev() {
  const [id, setId] = useState(new URLSearchParams(location.hash.split('?')[1] ?? '').get('game') ?? CATALOG.find((g) => isImplemented(g.id))?.id ?? CATALOG[0].id);
  const [seed, setSeed] = useState('dev-1');
  const [def, setDef] = useState<GameDef | null>(null);
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState<number | null>(null);
  const [n, setN] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [botName, setBotName] = useState('tap');
  const [secs, setSecs] = useState(8);
  const [live, setLive] = useState(true);
  const auto = useRef(new URLSearchParams(location.hash.split('?')[1] ?? ''));

  useEffect(() => {
    let r: Runner | null = null;
    let dead = false;
    if (!live) return;
    setEnded(null);
    setDef(null);
    loadGame(id)
      .then((d) => {
        if (dead || !canvas.current) return;
        setDef(d);
        r = new Runner(canvas.current, d, { seed, mode: 'entrenamiento', sfx, onEnd: (res) => setEnded(res.score), onScore: setScore });
        r.start();
      })
      .catch(() => setDef(null));
    return () => {
      dead = true;
      r?.stop();
    };
  }, [id, seed, n, live]);

  const BOTS: Record<string, () => Bot> = { idle: () => idleBot, tap: () => randomTapBot(25), chaos: () => chaosBot(), drag: () => randomDragBot() };
  useEffect(() => {
    const a = auto.current;
    if (a.get('bot')) {
      setBotName(a.get('bot')!);
      setSecs(+(a.get('secs') ?? 8));
      setLive(false);
      setTimeout(() => void simulate(a.get('bot')!, +(a.get('secs') ?? 8)), 400);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const simulate = async (bn = botName, sc = secs) => {
    const d = await loadGame(id);
    const c = canvas.current;
    if (!c) return;
    setLive(false);
    setDef(d);
    const res = runHeadless(d, { seed, bot: BOTS[bn](), maxTicks: Math.round(sc * 60) });
    setScore(res.score);
    setEnded(res.over ? res.score : null);
    c.width = 720;
    c.height = 1280;
    const g = c.getContext('2d')!;
    g.setTransform(720 / W, 0, 0, 720 / W, 0, 0);
    res.inst.render(g);
  };

  return (
    <div className="app" style={{ maxWidth: 900 }}>
      <h1 className="page-title">Galería de juegos (dev)</h1>
      <div className="row mt" style={{ flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 320 }} value={id} onChange={(e) => setId(e.target.value)}>
          {CATALOG.map((g) => (
            <option key={g.id} value={g.id} disabled={!isImplemented(g.id)}>{String(g.num).padStart(2, '0')} · {g.emoji} {g.nombre}{isImplemented(g.id) ? '' : ' (pendiente)'}</option>
          ))}
        </select>
        <input className="input" style={{ maxWidth: 200 }} value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Semilla" />
        <button className="btn" onClick={() => { setLive(true); setN((x) => x + 1); }}>Jugar en vivo</button>
        <select className="input" style={{ maxWidth: 110 }} value={botName} onChange={(e) => setBotName(e.target.value)} aria-label="Bot">
          {Object.keys(BOTS).map((b) => <option key={b}>{b}</option>)}
        </select>
        <input className="input" type="number" style={{ maxWidth: 80 }} value={secs} min={1} max={120} onChange={(e) => setSecs(+e.target.value)} aria-label="Segundos" />
        <button className="btn" onClick={() => void simulate(botName, secs)}>Simular bot y dibujar</button>
      </div>
      <div className="row mt" style={{ alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <canvas ref={canvas} style={{ width: 360, height: 640, background: '#000', touchAction: 'none', borderRadius: 12 }} />
        <div className="card grow" style={{ minWidth: 220 }}>
          {def && (
            <>
              <h3>{def.emoji} {def.nombre}</h3>
              <p className="note">{def.instrucciones}</p>
              <p className="mt">Marcador: <b className="score">{fmt(def, score)}</b></p>
              <p className="note">Top 1 %: {def.top1 === null ? '—' : fmt(def, def.top1)} · {def.fiabilidad}</p>
              {ended !== null && <p className="ok">Terminado: {fmt(def, ended)}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
