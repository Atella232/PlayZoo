import type { Input, Keypad } from '@playzoo/engine';

/** Entradas de teclado numérico de este paso: dígitos, 'back' y 'enter' (táctil o teclado físico). */
export function pollKeypad(input: Input, pad: Keypad): string[] {
  const out: string[] = [];
  for (const e of input.downs()) {
    const v = pad.hit(e.x, e.y);
    if (v) out.push(v);
  }
  for (const k of input.keyDowns()) {
    if (/^\d$/.test(k)) out.push(k);
    else if (k === 'Backspace') out.push('back');
    else if (k === 'Enter') out.push('enter');
  }
  return out;
}
