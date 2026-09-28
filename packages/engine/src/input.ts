export interface InputEvent {
  /** Milisegundos desde el inicio de la partida. */
  t: number;
  type: 'down' | 'move' | 'up' | 'key';
  x: number;
  y: number;
  id: number;
  key?: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inRect = (r: Rect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/**
 * Estado de entrada visto por el juego en cada paso de simulación.
 * `events` son los eventos que ocurrieron durante este paso.
 */
export class Input {
  events: InputEvent[] = [];
  /** Punteros pulsados ahora mismo. */
  pointers = new Map<number, { x: number; y: number }>();
  keys = new Set<string>();
  /** Último puntero conocido (aunque no esté pulsado). */
  x = 180;
  y = 320;

  /** @internal */
  begin(events: InputEvent[]) {
    this.events = events;
    for (const e of events) {
      if (e.type === 'down') {
        this.pointers.set(e.id, { x: e.x, y: e.y });
        this.x = e.x;
        this.y = e.y;
      } else if (e.type === 'move') {
        if (this.pointers.has(e.id)) this.pointers.set(e.id, { x: e.x, y: e.y });
        this.x = e.x;
        this.y = e.y;
      } else if (e.type === 'up') {
        this.pointers.delete(e.id);
        this.x = e.x;
        this.y = e.y;
      } else if (e.type === 'key' && e.key) {
        if (e.key.startsWith('+')) this.keys.add(e.key.slice(1));
        else if (e.key.startsWith('-')) this.keys.delete(e.key.slice(1));
      }
    }
  }

  get down(): boolean {
    return this.pointers.size > 0;
  }

  /** Pulsaciones nuevas en este paso. */
  downs(): InputEvent[] {
    return this.events.filter((e) => e.type === 'down');
  }
  ups(): InputEvent[] {
    return this.events.filter((e) => e.type === 'up');
  }
  moves(): InputEvent[] {
    return this.events.filter((e) => e.type === 'move');
  }
  /** Teclas pulsadas (transición) en este paso: 'ArrowLeft', 'ArrowUp', ' ', ... */
  keyDowns(): string[] {
    return this.events.filter((e) => e.type === 'key' && e.key?.startsWith('+')).map((e) => e.key!.slice(1));
  }
  tapped(): boolean {
    return this.events.some((e) => e.type === 'down');
  }
  isDownIn(r: Rect): boolean {
    for (const p of this.pointers.values()) if (inRect(r, p.x, p.y)) return true;
    return false;
  }
  /** Primer puntero pulsado (o null). */
  primary(): { x: number; y: number } | null {
    const it = this.pointers.values().next();
    return it.done ? null : it.value;
  }
}
