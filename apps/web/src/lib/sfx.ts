import { WebSfx } from '@playzoo/engine';

export const sfx = new WebSfx();

const KEY = 'pz:settings';

export interface Settings {
  sonido: boolean;
  vibracion: boolean;
}

export function loadSettings(): Settings {
  try {
    return { sonido: true, vibracion: true, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) };
  } catch {
    return { sonido: true, vibracion: true };
  }
}

export function applySettings(s: Settings) {
  sfx.enabled = s.sonido;
  sfx.vibrate = s.vibracion;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento */
  }
}

applySettings(loadSettings());
