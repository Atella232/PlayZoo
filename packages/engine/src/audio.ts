export type SfxName = 'ok' | 'bad' | 'tick' | 'win' | 'lose' | 'pop' | 'jump' | 'hit' | 'coin';

export interface Sfx {
  play(name: SfxName, pitch?: number): void;
}

export const nullSfx: Sfx = { play() {} };

const RECIPES: Record<SfxName, { f: number; f2?: number; d: number; type: OscillatorType; v: number }> = {
  ok: { f: 660, f2: 990, d: 0.12, type: 'triangle', v: 0.18 },
  bad: { f: 200, f2: 110, d: 0.22, type: 'sawtooth', v: 0.15 },
  tick: { f: 900, d: 0.03, type: 'square', v: 0.06 },
  win: { f: 520, f2: 1040, d: 0.4, type: 'triangle', v: 0.2 },
  lose: { f: 330, f2: 80, d: 0.5, type: 'sawtooth', v: 0.18 },
  pop: { f: 400, f2: 700, d: 0.08, type: 'sine', v: 0.2 },
  jump: { f: 300, f2: 620, d: 0.14, type: 'square', v: 0.09 },
  hit: { f: 150, f2: 60, d: 0.16, type: 'square', v: 0.16 },
  coin: { f: 1200, f2: 1600, d: 0.1, type: 'square', v: 0.08 },
};

/** Efectos de sonido sintetizados con WebAudio (sin archivos). */
export class WebSfx implements Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;
  vibrate = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Debe llamarse en un gesto del usuario para desbloquear el audio. */
  unlock() {
    this.ensure();
  }

  play(name: SfxName, pitch = 1): void {
    if (this.vibrate && (name === 'bad' || name === 'lose' || name === 'hit') && 'vibrate' in navigator) {
      try {
        navigator.vibrate(name === 'lose' ? 120 : 30);
      } catch {
        /* sin vibración */
      }
    }
    const ctx = this.ensure();
    if (!ctx) return;
    const r = RECIPES[name];
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = r.type;
    o.frequency.setValueAtTime(r.f * pitch, t);
    if (r.f2) o.frequency.exponentialRampToValueAtTime(r.f2 * pitch, t + r.d);
    g.gain.setValueAtTime(r.v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + r.d);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + r.d + 0.02);
  }
}
