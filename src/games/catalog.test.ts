import { describe, expect, it } from 'vitest';
import { allGames, games } from './index';

describe('game catalog', () => {
  it('keeps all active IDs unique and callable', () => {
    const ids = allGames.map((game) => game.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(games).toHaveLength(20);
    expect(allGames).toHaveLength(20);
    expect(games.every((game) => typeof game.run === 'function')).toBe(true);
  });
});
