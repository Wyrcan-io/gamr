import { VirtualScreen } from './screen';

interface KeyEventLike {
  key: string;
  domEvent: KeyboardEvent;
}

type KeyListener = (event: KeyEventLike) => void;
type DataListener = (data: string) => void;
type ResizeListener = (size: { cols: number; rows: number }) => void;

const KEY_CODES: Record<string, number> = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  Enter: 13, Escape: 27, ' ': 32, Backspace: 8, Tab: 9,
};

for (const letter of 'abcdefghijklmnopqrstuvwxyz') KEY_CODES[letter] = letter.toUpperCase().charCodeAt(0);
for (let digit = 0; digit <= 9; digit++) KEY_CODES[String(digit)] = 48 + digit;

interface WindowShim {
  addEventListener: (type: string, handler: (event: Event) => void) => void;
  removeEventListener: (type: string, handler: (event: Event) => void) => void;
  dispatchEvent: (event: Event) => boolean;
  clearListeners?: () => void;
}

function ensureWindow(): WindowShim {
  const existing = (globalThis as Record<string, unknown>).window as WindowShim | undefined;
  if (existing) return existing;
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const shim: WindowShim = {
    addEventListener(type, handler) {
      const values = listeners.get(type) ?? new Set<(event: Event) => void>();
      values.add(handler);
      listeners.set(type, values);
    },
    removeEventListener(type, handler) { listeners.get(type)?.delete(handler); },
    dispatchEvent(event) {
      for (const handler of [...(listeners.get(event.type) ?? [])]) handler(event);
      return true;
    },
    clearListeners() { listeners.clear(); },
  };
  (globalThis as Record<string, unknown>).window = shim;
  return shim;
}

export function resetPlaytestWindowListeners(): void {
  const existing = (globalThis as Record<string, unknown>).window as WindowShim | undefined;
  existing?.clearListeners?.();
}

function rawForKey(key: string): string {
  if (key === 'ArrowUp') return '\x1b[A';
  if (key === 'ArrowDown') return '\x1b[B';
  if (key === 'ArrowLeft') return '\x1b[D';
  if (key === 'ArrowRight') return '\x1b[C';
  if (key === 'Enter') return '\r';
  if (key === 'Escape') return '\x1b';
  if (key === 'Tab') return '\t';
  if (key === 'Backspace') return '\x7f';
  return key === ' ' ? ' ' : key;
}

export interface VirtualTerminalOptions {
  cols?: number;
  rows?: number;
  now?: () => number;
}

/** xterm-compatible terminal double that records the exact human-facing path. */
export class VirtualTerminal {
  readonly element = {};
  readonly writes: string[] = [];
  readonly screen: VirtualScreen;
  private readonly keyListeners = new Set<KeyListener>();
  private readonly dataListeners = new Set<DataListener>();
  private readonly resizeListeners = new Set<ResizeListener>();
  private readonly window: WindowShim;
  private disposed = false;
  private _cols: number;
  private _rows: number;

  constructor(options: VirtualTerminalOptions = {}) {
    this._cols = options.cols ?? 80;
    this._rows = options.rows ?? 28;
    this.screen = new VirtualScreen(this._cols, this._rows);
    this.window = ensureWindow();
  }

  get cols(): number { return this._cols; }
  get rows(): number { return this._rows; }

  write(data: string): void {
    if (this.disposed) return;
    this.writes.push(data);
    this.screen.write(data);
  }

  onKey(listener: KeyListener): { dispose: () => void } {
    this.keyListeners.add(listener);
    return { dispose: () => this.keyListeners.delete(listener) };
  }

  onData(listener: DataListener): { dispose: () => void } {
    this.dataListeners.add(listener);
    return { dispose: () => this.dataListeners.delete(listener) };
  }

  onResize(listener: ResizeListener): { dispose: () => void } {
    this.resizeListeners.add(listener);
    return { dispose: () => this.resizeListeners.delete(listener) };
  }

  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    this.screen.resize(cols, rows);
    for (const listener of [...this.resizeListeners]) listener({ cols, rows });
  }

  dispatchKey(key: string, options: { shiftKey?: boolean; ctrlKey?: boolean } = {}): void {
    const keyCode = KEY_CODES[key] ?? KEY_CODES[key.toLowerCase()] ?? 0;
    const domEvent = {
      key,
      code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
      keyCode,
      which: keyCode,
      shiftKey: options.shiftKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      altKey: false,
      metaKey: false,
      repeat: false,
      type: 'keydown',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    } as unknown as KeyboardEvent;
    this.window.dispatchEvent(domEvent as unknown as Event);
    for (const listener of [...this.keyListeners]) listener({ key, domEvent });
    for (const listener of [...this.dataListeners]) listener(rawForKey(key));
  }

  async press(key: string, holdMs = 0): Promise<void> {
    this.dispatchKey(key);
    if (holdMs > 0) await new Promise<void>(resolve => setTimeout(resolve, holdMs));
    const keyCode = KEY_CODES[key] ?? 0;
    const keyup = { key, keyCode, which: keyCode, type: 'keyup' } as unknown as Event;
    this.window.dispatchEvent(keyup);
  }

  dispose(): void {
    this.disposed = true;
    this.keyListeners.clear();
    this.dataListeners.clear();
    this.resizeListeners.clear();
  }
}
