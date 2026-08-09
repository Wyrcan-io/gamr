import type { Terminal } from '@xterm/xterm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runLastTrainHomeGame } from './index';

function fakeTerminal() { const t = { cols: 80, rows: 28, writes: [] as string[], handlers: [] as Array<(v: { domEvent: KeyboardEvent }) => void>, disposed: 0, write(v: string) { t.writes.push(v); }, onKey(h: (v: { domEvent: KeyboardEvent }) => void) { t.handlers.push(h); return { dispose: () => { t.disposed++; } }; } }; return t; }
const key = (value: string) => ({ key: value, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as KeyboardEvent);
describe('Last Train Home controller lifecycle', () => { afterEach(() => vi.useRealTimers()); it('keeps help modal input-owned and restores the terminal once', () => { vi.useFakeTimers(); const terminal = fakeTerminal(); const controller = runLastTrainHomeGame(terminal as unknown as Terminal); vi.advanceTimersByTime(60); terminal.handlers[0]!({ domEvent: key('p') }); terminal.handlers[0]!({ domEvent: key('enter') }); terminal.handlers[0]!({ domEvent: key('h') }); vi.advanceTimersByTime(50); expect(terminal.writes.join('')).toContain('DISPATCH CARD'); controller.stop(); controller.stop(); expect(controller.isRunning).toBe(false); expect(terminal.disposed).toBe(1); }); });
