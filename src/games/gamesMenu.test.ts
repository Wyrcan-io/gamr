import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import { showGamesMenu } from './gamesMenu';
import { stripAnsi } from '../ui/terminal';

function fakeTerminal() {
  const writes: string[] = [];
  let keyHandler: ((event: { key: string; domEvent: KeyboardEvent }) => void) | undefined;
  const terminal = {
    cols: 80,
    rows: 24,
    element: {},
    write: (value: string) => writes.push(value),
    onKey: (handler: (event: { key: string; domEvent: KeyboardEvent }) => void) => {
      keyHandler = handler;
      return { dispose: () => { keyHandler = undefined; } };
    },
    onResize: () => ({ dispose: () => {} }),
  } as unknown as Terminal;
  return {
    terminal,
    writes,
    press: (key: string) => keyHandler?.({
      key,
      domEvent: { key, preventDefault: () => {}, stopPropagation: () => {} } as KeyboardEvent,
    }),
  };
}

describe('Small Machines Index', () => {
  afterEach(() => vi.useRealTimers());

  it('renders a curated Featured view instead of the old game grid', () => {
    vi.useFakeTimers();
    const { terminal, writes } = fakeTerminal();
    const controller = showGamesMenu(terminal);
    vi.advanceTimersByTime(60);

    const output = stripAnsi(writes.join(''));
    expect(output).toContain('g/ index');
    expect(output).toContain('FEATURED');
    expect(output).toContain('Stack Trace');
    expect(output).toContain('Arcade Archive');
    expect(output).not.toContain('Vibe Code Your Own Game');
    controller.stop();
  });

  it('opens the archive route and launches an archived game', () => {
    vi.useFakeTimers();
    const { terminal, press } = fakeTerminal();
    const onGameSelect = vi.fn();
    showGamesMenu(terminal, { onGameSelect });
    vi.advanceTimersByTime(60);

    press('x');
    press('Enter');
    expect(onGameSelect).toHaveBeenCalledWith('tetris');
  });
});
