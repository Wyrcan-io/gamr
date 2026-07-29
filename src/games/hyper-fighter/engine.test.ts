import { describe, it, expect } from 'vitest';
import {
  createBoard,
  createPlayerState,
  calculateStepAttack,
  applyAttackModifiers,
  findCrashTargets,
  deliverGarbage,
  decrementCounters,
  resolveCounterAttack,
  checkGameOver,
  spawnPair,
  BOARD_COLS,
  DROP_ALLEY_COL,
} from './engine';
import { CHARACTERS } from './characters';

describe('resolveCounterAttack', () => {
  it('uses 2:1 attack-to-counter cancellation', () => {
    const result = resolveCounterAttack(6, 4);
    expect(result.canceledGems).toBe(3);
    expect(result.remainingAttack).toBe(0);
    expect(result.remainingPending).toBe(1);
    expect(result.pendingStartsAtThree).toBe(true);
  });

  it('keeps leftover attack when attack points are odd', () => {
    const result = resolveCounterAttack(3, 5);
    expect(result.canceledGems).toBe(1);
    expect(result.remainingAttack).toBe(1);
    expect(result.remainingPending).toBe(4);
    expect(result.pendingStartsAtThree).toBe(true);
  });

  it('does not mark timer-3 start when all incoming gems are canceled', () => {
    const result = resolveCounterAttack(10, 2);
    expect(result.remainingPending).toBe(0);
    expect(result.pendingStartsAtThree).toBe(false);
  });
});

describe('findCrashTargets', () => {
  it('shatters adjacent counter gems when crash clears happen', () => {
    const board = createBoard();
    board[11][2] = { color: 'red', type: 'crash' };
    board[11][3] = { color: 'red', type: 'normal' };
    board[10][3] = { color: 'blue', type: 'counter', counterTimer: 5 };

    const targets = findCrashTargets(board, []);
    const keys = new Set(targets.map(t => `${t.row},${t.col}`));

    expect(keys.has('11,2')).toBe(true);
    expect(keys.has('11,3')).toBe(true);
    // Counter gems adjacent to cleared cells now shatter
    expect(keys.has('10,3')).toBe(true);
  });

  it('clears former counters after timer expiry converts them to normal', () => {
    const player = createPlayerState();
    player.board[11][2] = { color: 'red', type: 'crash' };
    player.board[11][3] = { color: 'red', type: 'normal' };
    player.board[10][3] = { color: 'red', type: 'counter', counterTimer: 1 };

    decrementCounters(player);
    const targets = findCrashTargets(player.board, []);
    const keys = new Set(targets.map(t => `${t.row},${t.col}`));
    expect(keys.has('10,3')).toBe(true);
  });

  it('shatters counter gems adjacent to crashed gems', () => {
    const board = createBoard();
    board[11][2] = { color: 'red', type: 'crash' };
    board[11][3] = { color: 'red', type: 'normal' };
    // Counter gem adjacent to a cleared cell — should shatter
    board[10][3] = { color: 'blue', type: 'counter', counterTimer: 5 };

    const targets = findCrashTargets(board, []);
    const keys = new Set(targets.map(t => `${t.row},${t.col}`));

    expect(keys.has('11,2')).toBe(true); // crash gem
    expect(keys.has('11,3')).toBe(true); // normal gem
    expect(keys.has('10,3')).toBe(true); // shattered counter
  });

  it('does not shatter counter gems that are not adjacent to cleared cells', () => {
    const board = createBoard();
    board[11][0] = { color: 'red', type: 'crash' };
    board[11][1] = { color: 'red', type: 'normal' };
    // Counter gem far away — should not shatter
    board[11][5] = { color: 'blue', type: 'counter', counterTimer: 5 };

    const targets = findCrashTargets(board, []);
    const keys = new Set(targets.map(t => `${t.row},${t.col}`));

    expect(keys.has('11,0')).toBe(true);
    expect(keys.has('11,1')).toBe(true);
    expect(keys.has('11,5')).toBe(false);
  });

  it('shattered counters do not propagate further shattering', () => {
    const board = createBoard();
    board[11][0] = { color: 'red', type: 'crash' };
    board[11][1] = { color: 'red', type: 'normal' };
    // Adjacent counter — should shatter
    board[10][1] = { color: 'blue', type: 'counter', counterTimer: 3 };
    // Counter adjacent only to the shattered counter, not to any original clear
    board[9][1] = { color: 'green', type: 'counter', counterTimer: 4 };

    const targets = findCrashTargets(board, []);
    const keys = new Set(targets.map(t => `${t.row},${t.col}`));

    expect(keys.has('10,1')).toBe(true);  // shattered
    expect(keys.has('9,1')).toBe(false);  // not shattered — no propagation
  });
});

describe('counter timers', () => {
  it('supports custom initial timer when delivering garbage', () => {
    const player = createPlayerState();
    deliverGarbage(player, 3, 3);

    const counters = player.board
      .flat()
      .filter(gem => gem?.type === 'counter');

    expect(counters).toHaveLength(3);
    for (const gem of counters) {
      expect(gem?.counterTimer).toBe(3);
    }
  });

  it('converts counters to normal gems when timer reaches zero', () => {
    const player = createPlayerState();
    player.board[11][0] = { color: 'red', type: 'counter', counterTimer: 1 };
    player.board[11][1] = { color: 'blue', type: 'counter', counterTimer: 2 };

    decrementCounters(player);

    expect(player.board[11][0]).toEqual({ color: 'red', type: 'normal' });
    expect(player.board[11][1]).toEqual({ color: 'blue', type: 'counter', counterTimer: 1 });
  });
});

describe('loss condition', () => {
  it('triggers game over when the top of the drop alley is occupied', () => {
    const board = createBoard();
    board[0][DROP_ALLEY_COL] = { color: 'red', type: 'normal' };
    expect(checkGameOver(board)).toBe(true);
  });

  it('does not trigger when only other top cells are occupied', () => {
    const board = createBoard();
    const otherCol = (DROP_ALLEY_COL + 1) % BOARD_COLS;
    board[0][otherCol] = { color: 'red', type: 'normal' };
    expect(checkGameOver(board)).toBe(false);
  });

  it('fails to spawn when drop alley is blocked', () => {
    const player = createPlayerState();
    player.board[0][DROP_ALLEY_COL] = { color: 'blue', type: 'normal' };
    const ok = spawnPair(player);
    expect(ok).toBe(false);
    expect(player.alive).toBe(false);
  });
});

describe('calculateStepAttack', () => {
  it('multiplies gems cleared by chain step', () => {
    // 5 gems at step 1 = 5, 5 gems at step 2 = 10
    expect(calculateStepAttack({ gemsCleared: 5, powerGemSizes: [], chainStep: 1 })).toBe(5);
    expect(calculateStepAttack({ gemsCleared: 5, powerGemSizes: [], chainStep: 2 })).toBe(10);
    expect(calculateStepAttack({ gemsCleared: 5, powerGemSizes: [], chainStep: 3 })).toBe(15);
  });

  it('accumulates across 4 steps of 5 gems like real game', () => {
    // 5×1 + 5×2 + 5×3 + 5×4 = 5 + 10 + 15 + 20 = 50
    let total = 0;
    for (let step = 1; step <= 4; step++) {
      total += calculateStepAttack({ gemsCleared: 5, powerGemSizes: [], chainStep: step });
    }
    expect(total).toBe(50);
  });

  it('adds power gem bonus of floor(area/8)', () => {
    // 4 gems + one 2x2 power gem (area 4): bonus = floor(4/8) = 0
    expect(calculateStepAttack({ gemsCleared: 4, powerGemSizes: [4], chainStep: 1 })).toBe(4);

    // 4 gems + one 4x4 power gem (area 16): bonus = floor(16/8) = 2
    expect(calculateStepAttack({ gemsCleared: 4, powerGemSizes: [16], chainStep: 1 })).toBe(6);

    // With chain multiplier: (4 + 2) * 3 = 18
    expect(calculateStepAttack({ gemsCleared: 4, powerGemSizes: [16], chainStep: 3 })).toBe(18);
  });

  it('sums multiple power gem bonuses', () => {
    // 8 gems + two power gems (area 4 each): bonus = 0 + 0 = 0
    expect(calculateStepAttack({ gemsCleared: 8, powerGemSizes: [4, 4], chainStep: 1 })).toBe(8);

    // 8 gems + two power gems (area 16 and 9): bonus = 2 + 1 = 3
    expect(calculateStepAttack({ gemsCleared: 8, powerGemSizes: [16, 9], chainStep: 1 })).toBe(11);
  });
});

describe('applyAttackModifiers', () => {
  it('applies damage modifier', () => {
    expect(applyAttackModifiers(50, 1.2)).toBe(60);
  });

  it('applies reduced damage modifier', () => {
    expect(applyAttackModifiers(50, 0.7)).toBe(35);
  });

  it('applies diamond clear 50% penalty', () => {
    expect(applyAttackModifiers(50, 1.0, true)).toBe(25);
  });

  it('applies both modifier and diamond penalty', () => {
    // floor(floor(50 * 1.2) * 0.5) = floor(60 * 0.5) = 30
    expect(applyAttackModifiers(50, 1.2, true)).toBe(30);
  });

  it('floors fractional values', () => {
    expect(applyAttackModifiers(7, 0.7)).toBe(4);
  });
});

describe('character drop patterns', () => {
  it('all characters have 4x6 drop patterns', () => {
    for (const char of CHARACTERS) {
      expect(char.dropPattern).toHaveLength(4);
      for (const row of char.dropPattern) {
        expect(row).toHaveLength(BOARD_COLS);
      }
    }
  });

  it('all pattern cells contain valid gem colors', () => {
    const validColors = new Set(['red', 'green', 'blue', 'yellow']);
    for (const char of CHARACTERS) {
      for (const row of char.dropPattern) {
        for (const color of row) {
          expect(validColors.has(color)).toBe(true);
        }
      }
    }
  });

  it('Dan has all-red pattern', () => {
    const dan = CHARACTERS.find(c => c.id === 'dan')!;
    for (const row of dan.dropPattern) {
      for (const color of row) {
        expect(color).toBe('red');
      }
    }
  });

  it('Akuma and Devilotte have 0.7 damage modifier', () => {
    const akuma = CHARACTERS.find(c => c.id === 'akuma')!;
    const devilotte = CHARACTERS.find(c => c.id === 'devilotte')!;
    expect(akuma.damageModifier).toBe(0.7);
    expect(devilotte.damageModifier).toBe(0.7);
  });

  it('Chun-Li has 1.2 damage modifier', () => {
    const chunLi = CHARACTERS.find(c => c.id === 'chunli')!;
    expect(chunLi.damageModifier).toBe(1.2);
  });

  it('all characters have 5 portrait poses with 3 lines each', () => {
    const poses = ['idle', 'attack', 'hit', 'win', 'lose'] as const;
    for (const char of CHARACTERS) {
      for (const pose of poses) {
        expect(char.portraits[pose]).toHaveLength(3);
      }
    }
  });
});
