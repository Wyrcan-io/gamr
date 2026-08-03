import type { Terminal } from '@xterm/xterm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runDeadLetterDepartmentGame } from './index';

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

describe('Dead Letter Department controller lifecycle', () => {
  afterEach(() => vi.useRealTimers());

  it('renders the desk and restores the terminal exactly once', () => {
    vi.useFakeTimers();
    const terminal = fakeTerminal();
    const controller = runDeadLetterDepartmentGame(terminal as unknown as Terminal);
    vi.advanceTimersByTime(60);

    expect(terminal.writes.join('')).toContain('Inspect the mail. Seal what answers back.');
    controller.stop();
    controller.stop();
    expect(controller.isRunning).toBe(false);
    expect(terminal.disposed).toBe(1);
    expect(terminal.writes.join('')).toContain('\x1b[?25h\x1b[?1049l');
  });

  it('opens help through the question-mark shortcut', () => {
    vi.useFakeTimers();
    const terminal = fakeTerminal();
    const controller = runDeadLetterDepartmentGame(terminal as unknown as Terminal);
    vi.advanceTimersByTime(60);
    terminal.handlers[0]!({ domEvent: key('?') });
    vi.advanceTimersByTime(50);
    expect(terminal.writes.join('')).toContain('g/ DESK HELP');
    controller.stop();
  });
});

