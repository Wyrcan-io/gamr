import type { TerminalSnapshot } from './types';

const ESC = '\x1b';

function blankGrid(cols: number, rows: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ' '));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Small ANSI terminal model used by the playtester. It intentionally models
 * cursor movement and erasing rather than trying to understand game-specific
 * rendering. That makes observations behave like a human's screen.
 */
export class VirtualScreen {
  private grid: string[][];
  private alternateGrid: string[][];
  private cursorX = 0;
  private cursorY = 0;
  private savedCursor = { x: 0, y: 0 };
  private alternateCursor = { x: 0, y: 0 };
  private usingAlternate = false;
  private frame = 0;
  private lastText = '';
  private lastAt = Date.now();

  private _cols: number;
  private _rows: number;

  constructor(cols = 80, rows = 28) {
    this._cols = cols;
    this._rows = rows;
    this.grid = blankGrid(cols, rows);
    this.alternateGrid = blankGrid(cols, rows);
  }

  get cols(): number { return this._cols; }
  get rows(): number { return this._rows; }

  resize(cols: number, rows: number): void {
    this._cols = cols;
    this._rows = rows;
    this.grid = blankGrid(cols, rows);
    this.alternateGrid = blankGrid(cols, rows);
    this.cursorX = 0;
    this.cursorY = 0;
    this.alternateCursor = { x: 0, y: 0 };
  }

  write(data: string): TerminalSnapshot {
    let index = 0;
    while (index < data.length) {
      const char = data[index]!;
      if (char === ESC) {
        const consumed = this.consumeEscape(data.slice(index));
        index += consumed;
        continue;
      }
      if (char === '\r') {
        this.cursorX = 0;
      } else if (char === '\n') {
        this.cursorY = clamp(this.cursorY + 1, 0, this.rows - 1);
      } else if (char === '\b') {
        this.cursorX = clamp(this.cursorX - 1, 0, this.cols - 1);
      } else if (char === '\t') {
        this.cursorX = clamp(this.cursorX + (8 - (this.cursorX % 8)), 0, this.cols - 1);
      } else if (char >= ' ') {
        this.currentGrid()[this.cursorY]![this.cursorX] = char;
        this.cursorX++;
        if (this.cursorX >= this.cols) {
          this.cursorX = 0;
          this.cursorY = clamp(this.cursorY + 1, 0, this.rows - 1);
        }
      }
      index++;
    }
    return this.snapshot();
  }

  snapshot(): TerminalSnapshot {
    const lines = this.currentGrid().map(row => row.join('').replace(/\s+$/u, ''));
    const text = lines.join('\n').replace(/\n+$/u, '');
    const snapshot: TerminalSnapshot = {
      frame: ++this.frame,
      at: Date.now(),
      cols: this.cols,
      rows: this.rows,
      text,
      lines,
      changed: text !== this.lastText,
      alternateBuffer: this.usingAlternate,
    };
    this.lastText = text;
    this.lastAt = snapshot.at;
    return snapshot;
  }

  get lastWriteAt(): number {
    return this.lastAt;
  }

  private currentGrid(): string[][] {
    return this.usingAlternate ? this.alternateGrid : this.grid;
  }

  private consumeEscape(value: string): number {
    if (value.length === 1) return 1;
    if (value[1] !== '[') return 2;
    const match = value.match(/^\x1b\[([0-9;?]*)([ -~])/u);
    if (!match) return 1;
    const params = match[1] ?? '';
    const command = match[2]!;
    const privateMode = params.startsWith('?');
    const numbers = params.replace(/^\?/u, '').split(';').filter(Boolean).map(Number);
    const first = numbers[0] || 1;
    switch (command) {
      case 'A': this.cursorY = clamp(this.cursorY - first, 0, this.rows - 1); break;
      case 'B': this.cursorY = clamp(this.cursorY + first, 0, this.rows - 1); break;
      case 'C': this.cursorX = clamp(this.cursorX + first, 0, this.cols - 1); break;
      case 'D': this.cursorX = clamp(this.cursorX - first, 0, this.cols - 1); break;
      case 'G': this.cursorX = clamp(first - 1, 0, this.cols - 1); break;
      case 'd': this.cursorY = clamp(first - 1, 0, this.rows - 1); break;
      case 'H':
      case 'f': {
        const row = numbers[0] || 1;
        const column = numbers[1] || 1;
        this.cursorY = clamp(row - 1, 0, this.rows - 1);
        this.cursorX = clamp(column - 1, 0, this.cols - 1);
        break;
      }
      case 'J': this.eraseDisplay(first); break;
      case 'K': this.eraseLine(first); break;
      case 's': this.savedCursor = { x: this.cursorX, y: this.cursorY }; break;
      case 'u': this.cursorX = this.savedCursor.x; this.cursorY = this.savedCursor.y; break;
      case 'h':
        if (privateMode && numbers.includes(1049)) {
          this.usingAlternate = true;
          this.alternateGrid = blankGrid(this.cols, this.rows);
          this.alternateCursor = { x: 0, y: 0 };
          this.cursorX = 0;
          this.cursorY = 0;
        }
        break;
      case 'l':
        if (privateMode && numbers.includes(1049)) {
          this.usingAlternate = false;
          this.cursorX = this.alternateCursor.x;
          this.cursorY = this.alternateCursor.y;
        }
        break;
      default: break;
    }
    return match[0].length;
  }

  private eraseDisplay(mode: number): void {
    const grid = this.currentGrid();
    if (mode === 2 || mode === 3) {
      grid.forEach(row => row.fill(' '));
      this.cursorX = 0;
      this.cursorY = 0;
      return;
    }
    if (mode === 0) {
      for (let row = this.cursorY; row < this.rows; row++) {
        const start = row === this.cursorY ? this.cursorX : 0;
        grid[row]!.fill(' ', start);
      }
    } else if (mode === 1) {
      for (let row = 0; row <= this.cursorY; row++) {
        const end = row === this.cursorY ? this.cursorX + 1 : this.cols;
        grid[row]!.fill(' ', 0, end);
      }
    }
  }

  private eraseLine(mode: number): void {
    const row = this.currentGrid()[this.cursorY]!;
    if (mode === 2) row.fill(' ');
    else if (mode === 1) row.fill(' ', 0, this.cursorX + 1);
    else row.fill(' ', this.cursorX);
  }
}

export function normalizeTerminalText(value: string): string {
  return value
    .replace(/\x1b\[[0-9;?]*[ -~]/gu, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+$/gmu, '')
    .trim();
}
