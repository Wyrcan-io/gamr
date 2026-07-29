/**
 * Puzzle Fighter Engine — Pure Game Logic
 *
 * Board, gems, movement, rotation, gravity, power gems,
 * crash detection, resolution loop, attacks, counter gems.
 */

// ============================================================================
// Types
// ============================================================================

export type GemColor = 'red' | 'green' | 'blue' | 'yellow';
export type GemType = 'normal' | 'crash' | 'counter' | 'diamond';

export interface Gem {
  color: GemColor;
  type: GemType;
  counterTimer?: number;
  powerGemId?: number;
}

export type Board = (Gem | null)[][];

export interface GemPair {
  primary: Gem;
  secondary: Gem;
  col: number;
  row: number;
  orientation: number; // 0=up, 1=right, 2=down, 3=left
}

export interface PowerGem {
  id: number;
  color: GemColor;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerState {
  board: Board;
  currentPair: GemPair | null;
  nextPair: GemPair;
  powerGems: PowerGem[];
  score: number;
  pendingGarbage: number;
  pendingCounteredGarbage: number;
  alive: boolean;
  totalDrops: number;
}

export interface StepClearInfo {
  gemsCleared: number;
  powerGemSizes: number[];
  chainStep: number;
}

export interface CounterAttackResult {
  remainingAttack: number;
  remainingPending: number;
  canceledGems: number;
  pendingStartsAtThree: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const BOARD_ROWS = 12;
export const BOARD_COLS = 6;
export const COLORS: GemColor[] = ['red', 'green', 'blue', 'yellow'];
const CRASH_GEM_CHANCE = 0.25;
export const DROP_ALLEY_COL = 3; // 4th column from the left
const COUNTER_GEM_TIMER = 5; // Counter gems count down 1 per drop, convert at 0
const DIAMOND_INTERVAL = 25; // Diamond gem appears every 25 drops

let nextPowerGemId = 1;

// ============================================================================
// Board Creation
// ============================================================================

export function createBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    board.push(new Array(BOARD_COLS).fill(null));
  }
  return board;
}

// ============================================================================
// Gem Pair Generation
// ============================================================================

function randomColor(): GemColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomGem(): Gem {
  const isCrash = Math.random() < CRASH_GEM_CHANCE;
  return {
    color: randomColor(),
    type: isCrash ? 'crash' : 'normal',
  };
}

export function generatePair(): GemPair {
  return {
    primary: randomGem(),
    secondary: randomGem(),
    col: DROP_ALLEY_COL,
    row: 0,
    orientation: 0,
  };
}

// ============================================================================
// Pair Positioning
// ============================================================================

export function getSecondaryPos(pair: GemPair): { row: number; col: number } {
  switch (pair.orientation) {
    case 0: return { row: pair.row - 1, col: pair.col };     // up
    case 1: return { row: pair.row, col: pair.col + 1 };     // right
    case 2: return { row: pair.row + 1, col: pair.col };     // down
    case 3: return { row: pair.row, col: pair.col - 1 };     // left
    default: return { row: pair.row - 1, col: pair.col };
  }
}

export function isValidPosition(pair: GemPair, board: Board): boolean {
  const sec = getSecondaryPos(pair);
  // Primary must be in bounds (allow row < 0 for spawn)
  if (pair.col < 0 || pair.col >= BOARD_COLS) return false;
  if (pair.row >= BOARD_ROWS) return false;
  // Secondary must be in bounds
  if (sec.col < 0 || sec.col >= BOARD_COLS) return false;
  if (sec.row >= BOARD_ROWS) return false;
  // Check collision with placed gems
  if (pair.row >= 0 && board[pair.row][pair.col] !== null) return false;
  if (sec.row >= 0 && board[sec.row][sec.col] !== null) return false;
  return true;
}

// ============================================================================
// Movement
// ============================================================================

export function movePair(pair: GemPair, board: Board, dx: number): boolean {
  const test: GemPair = { ...pair, col: pair.col + dx };
  if (isValidPosition(test, board)) {
    pair.col += dx;
    return true;
  }
  return false;
}

export function rotatePair(pair: GemPair, board: Board, clockwise: boolean): boolean {
  const newOrientation = clockwise
    ? (pair.orientation + 1) % 4
    : (pair.orientation + 3) % 4;

  const test: GemPair = { ...pair, orientation: newOrientation };

  // Try direct rotation
  if (isValidPosition(test, board)) {
    pair.orientation = newOrientation;
    return true;
  }

  // Wall kicks: try shifting ±1, ±2
  for (const kick of [1, -1, 2, -2]) {
    const kicked: GemPair = { ...test, col: test.col + kick };
    if (isValidPosition(kicked, board)) {
      pair.orientation = newOrientation;
      pair.col += kick;
      return true;
    }
  }

  // Try shifting up for floor kicks
  const upKick: GemPair = { ...test, row: test.row - 1 };
  if (isValidPosition(upKick, board)) {
    pair.orientation = newOrientation;
    pair.row -= 1;
    return true;
  }

  return false;
}

export function dropPair(pair: GemPair, board: Board): boolean {
  const test: GemPair = { ...pair, row: pair.row + 1 };
  if (isValidPosition(test, board)) {
    pair.row += 1;
    return true;
  }
  return false;
}

export function hardDrop(pair: GemPair, board: Board): number {
  let dropped = 0;
  while (dropPair(pair, board)) {
    dropped++;
  }
  return dropped;
}

// ============================================================================
// Lock & Gravity
// ============================================================================

export function lockPair(pair: GemPair, board: Board): void {
  if (pair.row >= 0 && pair.row < BOARD_ROWS) {
    board[pair.row][pair.col] = { ...pair.primary };
  }
  const sec = getSecondaryPos(pair);
  if (sec.row >= 0 && sec.row < BOARD_ROWS) {
    board[sec.row][sec.col] = { ...pair.secondary };
  }
}

export function applyGravity(board: Board): boolean {
  let moved = false;
  // Process bottom-up so gems fall correctly
  for (let col = 0; col < BOARD_COLS; col++) {
    let writeRow = BOARD_ROWS - 1;
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      const gem = board[row][col];
      if (gem !== null) {
        // Skip gems that are part of power gems (they don't fall individually)
        if (gem.powerGemId !== undefined) {
          // Power gems handled separately
          continue;
        }
        if (row !== writeRow) {
          board[writeRow][col] = gem;
          board[row][col] = null;
          moved = true;
        }
        writeRow--;
      }
    }
  }
  return moved;
}

// Gravity that handles power gems as units
export function applyGravityFull(board: Board, powerGems: PowerGem[]): boolean {
  void powerGems;
  // First, clear power gem markers from board gems
  stripPowerGemIds(board);

  // Drop individual (non-power-gem) gems
  let moved = false;
  for (let col = 0; col < BOARD_COLS; col++) {
    let writeRow = BOARD_ROWS - 1;
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      if (board[row][col] !== null) {
        if (row !== writeRow) {
          board[writeRow][col] = board[row][col];
          board[row][col] = null;
          moved = true;
        }
        writeRow--;
      }
    }
  }
  return moved;
}

function stripPowerGemIds(board: Board): void {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = board[r][c];
      if (gem && gem.powerGemId !== undefined) {
        delete gem.powerGemId;
      }
    }
  }
}

// ============================================================================
// Power Gem Detection
// ============================================================================

export function detectPowerGems(board: Board): PowerGem[] {
  const found: PowerGem[] = [];
  const used = new Set<string>();

  // Scan for largest rectangles of same-color normal gems
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = board[r][c];
      if (!gem || gem.type !== 'normal') continue;

      // Try all rectangle sizes starting from 2x2
      for (let h = 2; h <= BOARD_ROWS - r; h++) {
        for (let w = 2; w <= BOARD_COLS - c; w++) {
          if (isUniformRect(board, r, c, w, h, gem.color)) {
            const key = `${r},${c},${w},${h}`;
            if (!used.has(key)) {
              found.push({
                id: nextPowerGemId++,
                color: gem.color,
                x: c,
                y: r,
                width: w,
                height: h,
              });
            }
          }
        }
      }
    }
  }

  // Keep only largest non-overlapping power gems
  found.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const result: PowerGem[] = [];
  const claimed = new Set<string>();

  for (const pg of found) {
    let overlap = false;
    for (let r = pg.y; r < pg.y + pg.height; r++) {
      for (let c = pg.x; c < pg.x + pg.width; c++) {
        if (claimed.has(`${r},${c}`)) { overlap = true; break; }
      }
      if (overlap) break;
    }
    if (!overlap) {
      result.push(pg);
      for (let r = pg.y; r < pg.y + pg.height; r++) {
        for (let c = pg.x; c < pg.x + pg.width; c++) {
          claimed.add(`${r},${c}`);
          const gem = board[r][c];
          if (gem) gem.powerGemId = pg.id;
        }
      }
    }
  }

  return result;
}

function isUniformRect(board: Board, startRow: number, startCol: number, width: number, height: number, color: GemColor): boolean {
  for (let r = startRow; r < startRow + height; r++) {
    for (let c = startCol; c < startCol + width; c++) {
      const gem = board[r][c];
      if (!gem || gem.type !== 'normal' || gem.color !== color) return false;
    }
  }
  return true;
}

// ============================================================================
// Crash Detection & Clearing
// ============================================================================

export function findCrashTargets(board: Board, _powerGems: PowerGem[]): { row: number; col: number; color: GemColor }[] {
  void _powerGems;
  const targets = findCrashTargetsCore(board);
  return targets;
}

/**
 * Like findCrashTargets but also returns the sizes (area) of any power gems
 * that were part of the cleared set. Read powerGemId from cells BEFORE clearing.
 */
export function findCrashTargetsWithPowerInfo(
  board: Board,
  powerGems: PowerGem[],
): { targets: { row: number; col: number; color: GemColor }[]; destroyedPowerGemSizes: number[] } {
  const targets = findCrashTargetsCore(board);

  // Collect unique power gem IDs from targets
  const destroyedPgIds = new Set<number>();
  for (const t of targets) {
    const gem = board[t.row][t.col];
    if (gem && gem.powerGemId !== undefined) {
      destroyedPgIds.add(gem.powerGemId);
    }
  }

  const destroyedPowerGemSizes: number[] = [];
  for (const pg of powerGems) {
    if (destroyedPgIds.has(pg.id)) {
      destroyedPowerGemSizes.push(pg.width * pg.height);
    }
  }

  return { targets, destroyedPowerGemSizes };
}

function findCrashTargetsCore(board: Board): { row: number; col: number; color: GemColor }[] {
  const targetsByCell = new Map<string, { row: number; col: number; color: GemColor }>();
  const visited = new Set<string>();

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = board[r][c];
      if (!gem || gem.type !== 'crash') continue;

      // Check if crash gem is adjacent to same-color normal/power gem
      const neighbors = getNeighbors(r, c);
      let hasTarget = false;
      for (const [nr, nc] of neighbors) {
        const ng = board[nr][nc];
        if (ng && ng.color === gem.color && ng.type === 'normal') {
          hasTarget = true;
          break;
        }
      }

      if (hasTarget) {
        // Clear connected same-color normal/crash gems only.
        // Counter gems are immune until their timers expire and they convert to normal.
        const connected = floodFillCrashGroup(board, r, c, gem.color, visited);
        for (const cell of connected) {
          targetsByCell.set(`${cell.row},${cell.col}`, { ...cell, color: gem.color });
        }
      }
    }
  }

  // Shatter pass: counter gems adjacent to any cleared cell are also destroyed
  const targetSet = new Set(Array.from(targetsByCell.keys()));
  for (const key of Array.from(targetSet)) {
    const [rStr, cStr] = key.split(',');
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);
    for (const [nr, nc] of getNeighbors(r, c)) {
      const nKey = `${nr},${nc}`;
      if (targetSet.has(nKey)) continue;
      const ng = board[nr][nc];
      if (ng && ng.type === 'counter') {
        targetsByCell.set(nKey, { row: nr, col: nc, color: ng.color });
        targetSet.add(nKey);
      }
    }
  }

  return Array.from(targetsByCell.values());
}

function getNeighbors(row: number, col: number): [number, number][] {
  const n: [number, number][] = [];
  if (row > 0) n.push([row - 1, col]);
  if (row < BOARD_ROWS - 1) n.push([row + 1, col]);
  if (col > 0) n.push([row, col - 1]);
  if (col < BOARD_COLS - 1) n.push([row, col + 1]);
  return n;
}

function floodFillCrashGroup(board: Board, startRow: number, startCol: number, color: GemColor, globalVisited: Set<string>): { row: number; col: number }[] {
  const result: { row: number; col: number }[] = [];
  const stack: [number, number][] = [[startRow, startCol]];
  const localVisited = new Set<string>();

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (localVisited.has(key) || globalVisited.has(key)) continue;

    const gem = board[r][c];
    if (!gem) continue;
    if (gem.color !== color) continue;
    if (gem.type !== 'normal' && gem.type !== 'crash') continue;

    localVisited.add(key);
    globalVisited.add(key);
    result.push({ row: r, col: c });

    for (const [nr, nc] of getNeighbors(r, c)) {
      stack.push([nr, nc]);
    }
  }

  return result;
}

export function clearGems(board: Board, targets: { row: number; col: number }[]): void {
  for (const t of targets) {
    board[t.row][t.col] = null;
  }
}

// ============================================================================
// Diamond Gem — Destroys all gems of whichever color it lands on
// ============================================================================

export function resolveDiamond(board: Board): { row: number; col: number; color: GemColor }[] {
  const cleared: { row: number; col: number; color: GemColor }[] = [];

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = board[r][c];
      if (!gem || gem.type !== 'diamond') continue;

      // Find the color below the diamond (or adjacent)
      let targetColor: GemColor | null = null;

      // Check below first
      if (r + 1 < BOARD_ROWS && board[r + 1][c]) {
        targetColor = board[r + 1][c]!.color;
      }
      // Then check adjacent
      if (!targetColor) {
        for (const [nr, nc] of getNeighbors(r, c)) {
          if (board[nr][nc] && board[nr][nc]!.type !== 'diamond') {
            targetColor = board[nr][nc]!.color;
            break;
          }
        }
      }

      // Remove the diamond itself
      board[r][c] = null;
      cleared.push({ row: r, col: c, color: targetColor || 'red' });

      if (!targetColor) continue;

      // Destroy ALL gems of that color on the board
      for (let dr = 0; dr < BOARD_ROWS; dr++) {
        for (let dc = 0; dc < BOARD_COLS; dc++) {
          const g = board[dr][dc];
          if (g && g.color === targetColor) {
            cleared.push({ row: dr, col: dc, color: targetColor });
            board[dr][dc] = null;
          }
        }
      }
    }
  }

  return cleared;
}

export function shouldSpawnDiamond(totalDrops: number): boolean {
  return totalDrops > 0 && totalDrops % DIAMOND_INTERVAL === 0;
}

export function generateDiamondPair(): GemPair {
  return {
    primary: { color: 'red', type: 'diamond' },
    secondary: randomGem(),
    col: DROP_ALLEY_COL,
    row: 0,
    orientation: 0,
  };
}

// ============================================================================
// Attack Calculation
// ============================================================================

/**
 * Per-step attack: chain step N multiplies by N (matching real Super Puzzle Fighter).
 * Power gems get a bonus of floor(area / 8) per power gem destroyed.
 */
export function calculateStepAttack(info: StepClearInfo): number {
  let pgBonus = 0;
  for (const area of info.powerGemSizes) {
    pgBonus += Math.floor(area / 8);
  }
  return Math.floor((info.gemsCleared + pgBonus) * info.chainStep);
}

/**
 * Final modifiers applied once after all chain steps resolve.
 */
export function applyAttackModifiers(
  total: number,
  damageModifier: number = 1.0,
  isDiamondClear: boolean = false,
): number {
  let attack = Math.floor(total * damageModifier);
  if (isDiamondClear) attack = Math.floor(attack * 0.5);
  return attack;
}

export function resolveCounterAttack(attack: number, pendingGarbage: number, ratio: number = 2): CounterAttackResult {
  if (attack <= 0 || pendingGarbage <= 0) {
    return {
      remainingAttack: attack,
      remainingPending: pendingGarbage,
      canceledGems: 0,
      pendingStartsAtThree: false,
    };
  }

  const cancelable = Math.floor(attack / ratio);
  const canceledGems = Math.min(cancelable, pendingGarbage);
  const remainingPending = pendingGarbage - canceledGems;
  const remainingAttack = attack - canceledGems * ratio;

  return {
    remainingAttack,
    remainingPending,
    canceledGems,
    pendingStartsAtThree: canceledGems > 0 && remainingPending > 0,
  };
}

// ============================================================================
// Counter Gems (Garbage)
// ============================================================================

export function deliverGarbage(player: PlayerState, count: number, counterTimer: number = COUNTER_GEM_TIMER): void {
  if (count <= 0) return;

  // Place counter gems from top, filling columns left-to-right then wrapping
  // This creates a more structured pattern like the real game
  for (let i = 0; i < count; i++) {
    const col = i % BOARD_COLS;
    // Find topmost empty row in this column (from top down)
    let placed = false;
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (player.board[r][col] === null) {
        player.board[r][col] = {
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          type: 'counter',
          counterTimer,
        };
        placed = true;
        break;
      }
    }
    // If column is full, try random fallback
    if (!placed) {
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          if (player.board[r][c] === null) {
            player.board[r][c] = {
              color: COLORS[Math.floor(Math.random() * COLORS.length)],
              type: 'counter',
              counterTimer,
            };
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
  }
}

export function decrementCounters(player: PlayerState): void {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const gem = player.board[r][c];
      if (gem && gem.type === 'counter' && gem.counterTimer !== undefined) {
        gem.counterTimer--;
        if (gem.counterTimer <= 0) {
          gem.type = 'normal';
          delete gem.counterTimer;
        }
      }
    }
  }
}

// ============================================================================
// Game Over Check
// ============================================================================

export function checkGameOver(board: Board): boolean {
  // Game over when the top of the drop alley is blocked.
  return board[0][DROP_ALLEY_COL] !== null;
}

// ============================================================================
// Ghost Position
// ============================================================================

export function getGhostPosition(pair: GemPair, board: Board): { primaryRow: number; primaryCol: number; secondaryRow: number; secondaryCol: number } {
  const ghost: GemPair = { ...pair };
  while (true) {
    const test: GemPair = { ...ghost, row: ghost.row + 1 };
    if (!isValidPosition(test, board)) break;
    ghost.row++;
  }
  const sec = getSecondaryPos(ghost);
  return {
    primaryRow: ghost.row,
    primaryCol: ghost.col,
    secondaryRow: sec.row,
    secondaryCol: sec.col,
  };
}

// ============================================================================
// Player State Factory
// ============================================================================

export function createPlayerState(): PlayerState {
  return {
    board: createBoard(),
    currentPair: null,
    nextPair: generatePair(),
    powerGems: [],
    score: 0,
    pendingGarbage: 0,
    pendingCounteredGarbage: 0,
    alive: true,
    totalDrops: 0,
  };
}

export function spawnPair(player: PlayerState): boolean {
  player.currentPair = player.nextPair;
  player.currentPair.col = DROP_ALLEY_COL;
  player.currentPair.row = 0;
  player.currentPair.orientation = 0;
  player.totalDrops++;

  // Next pair: diamond every 25 drops, otherwise random
  if (shouldSpawnDiamond(player.totalDrops + 1)) {
    player.nextPair = generateDiamondPair();
  } else {
    player.nextPair = generatePair();
  }

  if (!isValidPosition(player.currentPair, player.board)) {
    player.alive = false;
    return false;
  }
  return true;
}
