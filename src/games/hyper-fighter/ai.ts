/**
 * Puzzle Fighter AI — Board evaluation and move selection
 *
 * Brute-force evaluates all 24 placements (6 cols × 4 orientations),
 * picks best. Moves incrementally for natural feel.
 */

import {
  type Board,
  type GemPair,
  type PlayerState,
  BOARD_ROWS,
  BOARD_COLS,
  DROP_ALLEY_COL,
  isValidPosition,
  lockPair,
  applyGravityFull,
  detectPowerGems,
  findCrashTargets,
  clearGems,
} from './engine';

// ============================================================================
// Difficulty Configuration
// ============================================================================

export interface DifficultyConfig {
  name: string;
  thinkFrames: number;    // Frames between AI decisions
  mistakeRate: number;     // Chance of making a random move
  dropSpeedBoost: number;  // AI drop speed divisor (2 = twice as fast)
  simulateDepth: number;   // Chain simulation depth (0=none, 1=one crash step)
}

export const DIFFICULTIES: Record<string, DifficultyConfig> = {
  easy: { name: 'EASY', thinkFrames: 14, mistakeRate: 0.3, dropSpeedBoost: 1, simulateDepth: 0 },
  normal: { name: 'NORMAL', thinkFrames: 8, mistakeRate: 0.1, dropSpeedBoost: 1.5, simulateDepth: 0 },
  hard: { name: 'HARD', thinkFrames: 4, mistakeRate: 0.02, dropSpeedBoost: 2, simulateDepth: 1 },
};

// ============================================================================
// AI State
// ============================================================================

export interface AIState {
  targetCol: number;
  targetOrientation: number;
  thinkTimer: number;
  moveTimer: number;
  decided: boolean;
  difficulty: DifficultyConfig;
}

export function createAIState(difficulty: DifficultyConfig): AIState {
  return {
    targetCol: 2,
    targetOrientation: 0,
    thinkTimer: 0,
    moveTimer: 0,
    decided: false,
    difficulty,
  };
}

// ============================================================================
// Board Evaluation
// ============================================================================

function getColumnHeight(board: Board, col: number): number {
  for (let r = 0; r < BOARD_ROWS; r++) {
    if (board[r][col] !== null) return BOARD_ROWS - r;
  }
  return 0;
}

function evaluateBoard(board: Board): number {
  let score = 0;

  // Height penalty (quadratic)
  for (let c = 0; c < BOARD_COLS; c++) {
    const h = getColumnHeight(board, c);
    score -= h * h * 2;
  }

  // Flatness bonus (low height variance)
  const heights: number[] = [];
  for (let c = 0; c < BOARD_COLS; c++) {
    heights.push(getColumnHeight(board, c));
  }
  for (let c = 0; c < BOARD_COLS - 1; c++) {
    const diff = Math.abs(heights[c] - heights[c + 1]);
    score -= diff * 3;
  }

  // Color clustering bonus
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = board[r][c];
      if (!gem || gem.type === 'counter') continue;

      // Check right and down neighbors for same color
      if (c + 1 < BOARD_COLS) {
        const right = board[r][c + 1];
        if (right && right.color === gem.color && right.type !== 'counter') {
          score += 4;
        }
      }
      if (r + 1 < BOARD_ROWS) {
        const below = board[r + 1][c];
        if (below && below.color === gem.color && below.type !== 'counter') {
          score += 4;
        }
      }
    }
  }

  // Crash gem adjacency bonus
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = board[r][c];
      if (!gem || gem.type !== 'crash') continue;

      const neighbors = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
          const ng = board[nr][nc];
          if (ng && ng.color === gem.color && ng.type === 'normal') {
            score += 15; // Big bonus for crash gems touching same-color normals
          }
        }
      }
    }
  }

  // Power gem bonus
  const powerGems = detectPowerGems(board);
  for (const pg of powerGems) {
    score += pg.width * pg.height * 8;
  }

  // Crash potential: check if placing would trigger clears
  const targets = findCrashTargets(board, powerGems);
  score += targets.length * 10;

  // Game-over proximity penalty
  const maxHeight = Math.max(...heights);
  if (maxHeight >= BOARD_ROWS - 2) score -= 200;
  if (maxHeight >= BOARD_ROWS - 1) score -= 500;

  // Drop-alley height penalty (this is where new pairs spawn)
  const deathHeight = heights[DROP_ALLEY_COL];
  if (deathHeight >= BOARD_ROWS - 3) score -= 100;

  return score;
}

// ============================================================================
// Move Selection
// ============================================================================

interface PlacementOption {
  col: number;
  orientation: number;
  score: number;
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(gem => gem ? { ...gem } : null));
}

function evaluatePlacement(pair: GemPair, board: Board, simulateDepth: number = 0): number {
  const testBoard = cloneBoard(board);
  const testPair: GemPair = {
    primary: { ...pair.primary },
    secondary: { ...pair.secondary },
    col: pair.col,
    row: pair.row,
    orientation: pair.orientation,
  };

  // Drop to bottom
  while (true) {
    const next: GemPair = { ...testPair, row: testPair.row + 1 };
    if (!isValidPosition(next, testBoard)) break;
    testPair.row++;
  }

  // Lock
  lockPair(testPair, testBoard);
  applyGravityFull(testBoard, []);

  // Simulate one crash step for Hard AI
  if (simulateDepth > 0) {
    const pg = detectPowerGems(testBoard);
    const targets = findCrashTargets(testBoard, pg);
    if (targets.length > 0) {
      clearGems(testBoard, targets);
      applyGravityFull(testBoard, []);
    }
  }

  return evaluateBoard(testBoard);
}

export function selectMove(player: PlayerState, ai: AIState): void {
  const pair = player.currentPair;
  if (!pair) return;

  // Mistake: sometimes pick random
  if (Math.random() < ai.difficulty.mistakeRate) {
    ai.targetCol = Math.floor(Math.random() * BOARD_COLS);
    ai.targetOrientation = Math.floor(Math.random() * 4);
    ai.decided = true;
    return;
  }

  const options: PlacementOption[] = [];

  for (let orient = 0; orient < 4; orient++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const testPair: GemPair = {
        primary: { ...pair.primary },
        secondary: { ...pair.secondary },
        col,
        row: 0,
        orientation: orient,
      };

      if (!isValidPosition(testPair, player.board)) continue;

      const score = evaluatePlacement(testPair, player.board, ai.difficulty.simulateDepth);
      options.push({ col, orientation: orient, score });
    }
  }

  if (options.length === 0) {
    ai.targetCol = pair.col;
    ai.targetOrientation = pair.orientation;
    ai.decided = true;
    return;
  }

  // Pick best
  options.sort((a, b) => b.score - a.score);
  const best = options[0];
  ai.targetCol = best.col;
  ai.targetOrientation = best.orientation;
  ai.decided = true;
}

// ============================================================================
// AI Tick — Incremental Movement
// ============================================================================

export function aiTick(player: PlayerState, ai: AIState): 'rotate_cw' | 'rotate_ccw' | 'move' | 'drop' | 'none' {
  if (!player.currentPair) return 'none';

  ai.thinkTimer++;

  if (!ai.decided) {
    if (ai.thinkTimer >= ai.difficulty.thinkFrames) {
      selectMove(player, ai);
      ai.thinkTimer = 0;
    }
    return 'none';
  }

  ai.moveTimer++;
  const moveInterval = Math.max(2, Math.floor(ai.difficulty.thinkFrames / 3));

  if (ai.moveTimer < moveInterval) return 'none';
  ai.moveTimer = 0;

  const pair = player.currentPair;

  // First fix orientation — pick shorter rotation direction
  if (pair.orientation !== ai.targetOrientation) {
    const cwDist = (ai.targetOrientation - pair.orientation + 4) % 4;
    const ccwDist = (pair.orientation - ai.targetOrientation + 4) % 4;
    return cwDist <= ccwDist ? 'rotate_cw' : 'rotate_ccw';
  }

  // Then fix column
  if (pair.col < ai.targetCol) {
    return 'move'; // right
  } else if (pair.col > ai.targetCol) {
    return 'move'; // left (handled by caller based on direction)
  }

  return 'drop';
}

export function getAIMoveDirection(player: PlayerState, ai: AIState): number {
  if (!player.currentPair) return 0;
  if (player.currentPair.col < ai.targetCol) return 1;
  if (player.currentPair.col > ai.targetCol) return -1;
  return 0;
}
