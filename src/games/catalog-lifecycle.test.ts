import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import { allGames } from './index';
import {
  playtestWindowListenerCount,
  resetPlaytestWindowListeners,
  VirtualTerminal,
} from '../playtest/terminal';

describe('catalog controller lifecycle', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    resetPlaytestWindowListeners();
  });

  it('starts, resizes, and stops every game repeatedly without leaked resources', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T00:00:00Z'));
    const layoutFailures = new Set<string>();

    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const game of allGames) {
        resetPlaytestWindowListeners();
        const terminal = new VirtualTerminal({ cols: 80, rows: 24 });
        const controller = game.run(terminal as unknown as Terminal);
        vi.advanceTimersByTime(100);
        if (terminal.screen.snapshot().wrappedLines > 0) layoutFailures.add(`${game.id}:80x24`);
        terminal.resize(100, 30);
        vi.advanceTimersByTime(100);
        if (terminal.screen.snapshot().wrappedLines > 0) layoutFailures.add(`${game.id}:100x30`);
        controller.stop();
        controller.stop();

        expect(controller.isRunning, `${game.id} remained active`).toBe(false);
        expect(terminal.listenerCounts, `${game.id} leaked terminal listeners`).toEqual({
          key: 0,
          data: 0,
          resize: 0,
        });
        expect(playtestWindowListenerCount(), `${game.id} leaked window listeners`).toBe(0);
        expect(vi.getTimerCount(), `${game.id} leaked timers`).toBe(0);
        terminal.dispose();
      }
    }
    expect([...layoutFailures]).toEqual([]);
  }, 30000);
});
