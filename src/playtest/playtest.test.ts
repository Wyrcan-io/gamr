import { describe, expect, it } from 'vitest';
import { allGames } from '../games';
import { createPlaytestRegistry, missingPlaytestSpecs } from './specs';
import { PlaytestRunner } from './runner';
import { VirtualScreen } from './screen';
import { VirtualTerminal } from './terminal';
import { installDeterminism } from './determinism';

describe('virtual terminal screen', () => {
  it('interprets clear, cursor movement, and alternate buffer sequences', () => {
    const screen = new VirtualScreen(12, 4);
    screen.write('\x1b[2J\x1b[HHELLO\x1b[2;3HWORLD');
    expect(screen.snapshot().lines.slice(0, 2)).toEqual(['HELLO', '  WORLD']);

    screen.write('\x1b[?1049h\x1b[HALT');
    expect(screen.snapshot().alternateBuffer).toBe(true);
    expect(screen.snapshot().text).toContain('ALT');
    screen.write('\x1b[?1049l');
    expect(screen.snapshot().alternateBuffer).toBe(false);
    expect(screen.snapshot().text).toContain('HELLO');
  });

  it('delivers keyboard input to terminal and window listeners', () => {
    const terminal = new VirtualTerminal();
    const terminalKeys: string[] = [];
    const windowKeys: string[] = [];
    const windowValue = (globalThis as Record<string, unknown>).window as Window;
    const listener = (event: Event) => windowKeys.push((event as KeyboardEvent).key);
    windowValue.addEventListener('keydown', listener);
    terminal.onKey(({ key }) => terminalKeys.push(key));

    terminal.dispatchKey('ArrowRight');
    terminal.dispatchKey('Enter');
    expect(terminalKeys).toEqual(['ArrowRight', 'Enter']);
    expect(windowKeys).toEqual(['ArrowRight', 'Enter']);
    terminal.resize(100, 32);
    expect(terminal.cols).toBe(100);
    expect(terminal.rows).toBe(32);
    windowValue.removeEventListener('keydown', listener);
    terminal.dispose();
  });
});

describe('playtest registry', () => {
  it('covers every current active and archived game', () => {
    const registry = createPlaytestRegistry(allGames);
    expect(missingPlaytestSpecs(allGames, registry)).toEqual([]);
    expect(registry.size).toBe(allGames.length);
  });
});

describe('playtest determinism', () => {
  it('replays the same random sequence for the same seed', () => {
    const firstRestore = installDeterminism(1234);
    const first = [Math.random(), Math.random()];
    firstRestore.restore();
    const secondRestore = installDeterminism(1234);
    const second = [Math.random(), Math.random()];
    secondRestore.restore();
    expect(second).toEqual(first);
  });
});

describe('playtest runner', () => {
  it('can progress through a real game using terminal keys', async () => {
    const report = await new PlaytestRunner({ defaultWaitMs: 70 }).run('dead-letter-department', {
      maxActions: 10,
      maxElapsedMs: 2500,
    });
    expect(report.status).not.toBe('crashed');
    expect(report.milestones['desk-open']).toBe(true);
    expect(report.milestones['audit-reached']).toBe(true);
    expect(report.actions.length).toBeGreaterThan(0);
    expect(report.replay).toContain('dead-letter-department');
  }, 10000);
});
