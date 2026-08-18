import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertSafeExistingGameDirectory, isPathWithin, isValidGameId, resolveGameDirectory } from './create-safety';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('developer command path safety', () => {
  it('accepts normalized game ids', () => {
    expect(isValidGameId('space-dodge')).toBe(true);
    expect(isValidGameId('game-2')).toBe(true);
  });

  it('rejects traversal and malformed registry ids', () => {
    for (const value of ['../outside', '..', 'a/b', 'A-game', '-game', 'a']) {
      expect(isValidGameId(value)).toBe(false);
      expect(() => resolveGameDirectory('/repo/src/games', value)).toThrow();
    }
  });

  it('resolves valid games beneath the games directory', () => {
    const target = resolveGameDirectory('/repo/src/games', 'space-dodge');
    expect(isPathWithin('/repo/src/games', target)).toBe(true);
    expect(isPathWithin('/repo/src/games', '/repo/src/other')).toBe(false);
  });

  it('rejects a game link whose physical target is outside the catalog', () => {
    const root = mkdtempSync(join(tmpdir(), 'gamr-create-safety-'));
    temporaryDirectories.push(root);
    const games = join(root, 'games');
    const outside = join(root, 'outside');
    mkdirSync(games);
    mkdirSync(outside);
    const linkedGame = join(games, 'linked-game');
    symlinkSync(outside, linkedGame, process.platform === 'win32' ? 'junction' : 'dir');

    expect(() => assertSafeExistingGameDirectory(games, linkedGame)).toThrow(/outside the physical games directory/u);
  });
});
