import { describe, expect, it } from 'vitest';
import { makeRng } from '@playzoo/engine';
import { generateLevel, solve } from './kits/sokoban';

describe('generador de niveles tipo Sokoban', () => {
  it('siempre genera niveles resolubles y no triviales', () => {
    for (let i = 0; i < 40; i++) {
      const rng = makeRng('nivel-' + i);
      const nb = 1 + (i % 3);
      const l = generateLevel(rng, 4 + (i % 3), 4 + (i % 2), nb, 16 + (i % 8) * 6, i % 4);
      const moves = solve(l);
      expect(moves, `nivel ${i}`).toBeGreaterThan(0);
    }
  });
});
