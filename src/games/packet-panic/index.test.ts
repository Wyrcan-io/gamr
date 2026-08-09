import type { Terminal } from '@xterm/xterm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runPacketPanicGame } from './index';

interface FakeTerminal {
  cols: number;
  rows: number;
  writes: string[];
  handlers: Array<(value: { domEvent: KeyboardEvent }) => void>;
  disposed: number;
  write: (value: string) => void;
  onKey: (handler: (value: { domEvent: KeyboardEvent }) => void) => { dispose: () => void };
}

function fakeTerminal(): FakeTerminal {
  const terminal: FakeTerminal = {
    cols: 80,
    rows: 28,
    writes: [],
    handlers: [],
    disposed: 0,
    write(value) { terminal.writes.push(value); },
    onKey(handler) {
      terminal.handlers.push(handler);
      return { dispose: () => { terminal.disposed += 1; } };
    },
  };
  return terminal;
}

function key(key: string): KeyboardEvent {
  return { key, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as KeyboardEvent;
}

describe('Packet Panic controller lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('renders the start desk and restores the terminal exactly once', () => {
    vi.useFakeTimers();
    const terminal = fakeTerminal();
    const controller = runPacketPanicGame(terminal as unknown as Terminal);
    vi.advanceTimersByTime(60);

    expect(terminal.writes.join('')).toContain('NETWORK OPERATOR DESK');
    controller.stop();
    controller.stop();
    expect(controller.isRunning).toBe(false);
    expect(terminal.disposed).toBe(1);
    expect(terminal.writes.join('')).toContain('\x1b[?25h\x1b[?1049l');
  });

  it('starts the tutorial and exposes help without advancing simulation', () => {
    vi.useFakeTimers();
    const terminal = fakeTerminal();
    const controller = runPacketPanicGame(terminal as unknown as Terminal);
    vi.advanceTimersByTime(60);
    terminal.handlers[0]!({ domEvent: key('t') });
    vi.advanceTimersByTime(50);
    expect(terminal.writes.join('')).toContain('TUTORIAL 1/6');
    terminal.handlers[0]!({ domEvent: key('?') });
    vi.advanceTimersByTime(50);
    expect(terminal.writes.join('')).toContain('g/ PACKET PANIC / HELP');
    controller.stop();
  });

  it('starts a standard shift with an injectable clock', () => {
    vi.useFakeTimers();
    const terminal = fakeTerminal();
    let clock = 10_000;
    const controller = runPacketPanicGame(terminal as unknown as Terminal, { now: () => clock, reducedMotion: true });
    vi.advanceTimersByTime(60);
    terminal.handlers[0]!({ domEvent: key('p') });
    clock += 250;
    vi.advanceTimersByTime(60);
    const output = terminal.writes.join('');
    expect(output).toContain('STANDARD');
    expect(output).not.toContain('TUTORIAL 1/6');
    controller.stop();
  });
});
