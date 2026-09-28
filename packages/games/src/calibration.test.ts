import { describe, expect, it } from 'vitest';
import { runHeadless, type Bot } from '@playzoo/engine';
import { formatScore, isBetter } from '@playzoo/shared';
import { loadGame, getMeta } from './index';
import { ORACLES } from './bots';
import { ORACLES2 } from './bots2';

const ALL = { ...ORACLES, ...ORACLES2 };

/** Informe: qué marca consigue el bot experto frente al Top 1 % (no falla, solo informa). */
describe('calibración con bots expertos', () => {
  const ids = Object.keys(ALL).sort((a, b) => getMeta(a)!.num - getMeta(b)!.num);
  it('el informe se genera', async () => {
    const rows: string[] = [];
    for (const id of ids) {
      const meta = getMeta(id)!;
      const def = await loadGame(id);
      const res = [] as number[];
      for (const seed of ['cal-1', 'cal-2', 'cal-3']) {
        const bot: Bot = ALL[id]();
        const r = runHeadless(def, { seed, bot, maxTicks: 60 * 160 });
        res.push(r.over ? r.score : NaN);
      }
      const ok = res.filter((x) => !Number.isNaN(x));
      const mean = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN;
      const best = ok.length ? ok.reduce((a, b) => (isBetter(a, b, meta.marcador) ? a : b)) : NaN;
      rows.push(`${String(meta.num).padStart(2, '0')} ${id.padEnd(26)} media ${formatScore(mean, meta.marcador).padStart(10)}  mejor ${formatScore(best, meta.marcador).padStart(10)}  top1 ${meta.top1 === null ? '—' : formatScore(meta.top1, meta.marcador)}  (${ok.length}/3 terminan)`);
    }
    console.log('\n' + rows.join('\n'));
    expect(rows.length).toBe(ids.length);
  });
});
