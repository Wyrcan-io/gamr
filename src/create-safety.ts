import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const GAME_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export function isValidGameId(gameId: string): boolean {
  return gameId.length >= 2 && GAME_ID_PATTERN.test(gameId);
}

export function resolveGameDirectory(gamesDirectory: string, gameId: string): string {
  if (!isValidGameId(gameId)) throw new Error(`Invalid game id: ${gameId}`);
  const root = resolve(gamesDirectory);
  const target = resolve(root, gameId);
  const pathFromRoot = relative(root, target);
  if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error(`Game path escapes the games directory: ${gameId}`);
  }
  return target;
}

export function isPathWithin(rootDirectory: string, candidate: string): boolean {
  const pathFromRoot = relative(resolve(rootDirectory), resolve(candidate));
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot));
}

/** Reject junctions/symlinks whose resolved target leaves the game catalog. */
export function assertSafeExistingGameDirectory(gamesDirectory: string, gameDirectory: string): void {
  if (!existsSync(gameDirectory)) return;
  const physicalRoot = realpathSync(gamesDirectory);
  const physicalTarget = realpathSync(gameDirectory);
  if (physicalRoot === physicalTarget || !isPathWithin(physicalRoot, physicalTarget)) {
    throw new Error(`Refusing to remove a game path outside the physical games directory: ${gameDirectory}`);
  }
}
