import { bg, emoji, fillRR, formatNumber, rectRect, text, W, H, type G2, type GameCtx } from '../kits/prelude';
import { Game } from '../kits/base';

const LANES = 4;
const LW = 80;
const RX = (W - LANES * LW) / 2;
const laneX = (l: number) => RX + l * LW + LW / 2;
const CAR_EMOJI = ['🚗', '🚕', '🚙', '🚌', '🚓'];

interface Car {
  lane: number;
  y: number;
  e: string;
}

class Liebre extends Game {
  lane = 1;
  laneX = laneX(1);
  cars: Car[] = [];
  private sr;
  private spawnIn = 0.4;
  dist = 0;
  private scroll = 0;

  constructor(ctx: GameCtx) {
    super(ctx);
    this.sr = ctx.rng.fork('trafico');
  }

  private get v() {
    return Math.min(560, 240 + this.t * 6);
  }

  protected step(dt: number) {
    if (this.t >= 60) return this.finish(this.score);
    for (const e of this.input.downs()) {
      this.lane = Math.max(0, Math.min(LANES - 1, this.lane + (e.x < W / 2 ? -1 : 1)));
      this.sfx.play('tick');
    }
    for (const k of this.input.keyDowns()) {
      if (k === 'ArrowLeft') this.lane = Math.max(0, this.lane - 1);
      if (k === 'ArrowRight') this.lane = Math.min(LANES - 1, this.lane + 1);
    }
    this.laneX += (laneX(this.lane) - this.laneX) * Math.min(1, 16 * dt);
    const v = this.v;
    this.dist += v * dt;
    this.scroll += v * dt;
    this.score = Math.floor(this.dist / 18);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const lane = this.sr.int(0, LANES - 1);
      // asegurar un carril libre alrededor
      const blocked = new Set<number>([lane]);
      for (const c of this.cars) if (c.y < 240) blocked.add(c.lane);
      if (blocked.size <= 2) this.cars.push({ lane, y: -60, e: this.sr.pick(CAR_EMOJI) });
      this.spawnIn = this.sr.range(0.3, 0.75) * (330 / v) * 1.5;
    }
    for (const c of this.cars) c.y += v * 0.62 * dt + 0; // los coches también avanzan más lento que la liebre
    this.cars = this.cars.filter((c) => c.y < H + 60);
    for (const c of this.cars) {
      if (rectRect(this.laneX - 13, 520 - 22, 26, 44, laneX(c.lane) - 20, c.y - 32, 40, 64)) {
        this.sfx.play('hit');
        this.shake(10, 0.3);
        return this.finish(this.score);
      }
    }
  }

  protected draw(g: G2) {
    bg(g, '#166534');
    fillRR(g, { x: RX - 8, y: 0, w: LANES * LW + 16, h: H }, 0, '#374151');
    g.strokeStyle = '#fbbf24';
    g.lineWidth = 3;
    g.setLineDash([26, 26]);
    for (let l = 1; l < LANES; l++) {
      g.beginPath();
      g.lineDashOffset = -(this.scroll % 52);
      g.moveTo(RX + l * LW, 0);
      g.lineTo(RX + l * LW, H);
      g.stroke();
    }
    g.setLineDash([]);
    g.lineDashOffset = 0;
    for (const c of this.cars) emoji(g, c.e, laneX(c.lane), c.y, 56, Math.PI);
    emoji(g, '🐇', this.laneX, 520, 46);
    text(g, formatNumber(this.score, 0) + ' m', W / 2, 40, { size: 32, stroke: 'rgba(0,0,0,.5)' });
    text(g, 'Toca izquierda o derecha', W / 2, 620, { size: 14, weight: 700, alpha: this.t < 4 ? 1 : 0.2, stroke: 'rgba(0,0,0,.5)' });
  }
}

export const create = (ctx: GameCtx) => new Liebre(ctx);
