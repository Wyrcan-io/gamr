/**
 * Hyper Fighter — Gem Battle vs AI
 *
 * Competitive gem-matching puzzle game with power gems, crash gems,
 * chain reactions, and aggressive fighting-game-style effects.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, enterAlternateBuffer, exitAlternateBuffer } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu, checkShortcut } from '../shared/menu';
import {
  type Gem,
  type GemColor,
  type PlayerState,
  type StepClearInfo,
  BOARD_ROWS,
  BOARD_COLS,
  createPlayerState,
  spawnPair,
  getSecondaryPos,
  movePair,
  rotatePair,
  dropPair,
  hardDrop,
  lockPair,
  applyGravityFull,
  calculateStepAttack,
  applyAttackModifiers,
  resolveCounterAttack,
  decrementCounters,
  checkGameOver,
  getGhostPosition,
  detectPowerGems,
  resolveDiamond,
  findCrashTargetsWithPowerInfo,
} from './engine';
import {
  type AIState,
  type DifficultyConfig,
  DIFFICULTIES,
  createAIState,
  aiTick,
  getAIMoveDirection,
} from './ai';
import {
  type Particle,
  type FloatingText,
  type Projectile,
  type ShakeState,
  type FlashState,
  type Pose,
  spawnClearParticles,
  spawnFirework,
  spawnCollapse,
  updateParticles,
  renderParticles,
  spawnComboText,
  spawnChainCounter,
  updateFloatingTexts,
  renderFloatingTexts,
  spawnProjectile,
  updateProjectiles,
  renderProjectiles,
  renderPortrait,
  triggerShake,
  updateShake,
  triggerFlash,
  updateFlash,
  renderEnergyBar,
} from './effects';
import {
  type Character,
  CHARACTERS,
  CHAR_GRID,
  getRandomCharacter,
} from './characters';

// ============================================================================
// Controller Interface
// ============================================================================

export interface HyperFighterController {
  stop: () => void;
  isRunning: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TICK_MS = 50; // 20 FPS
const MIN_COLS = 60;
const MIN_ROWS = 30;
const VS_COL_WIDTH = 12;
const SIDE_PANEL_WIDTH = 14;
const HEADER_HEIGHT = 2;
const FOOTER_HEIGHT = 2;
const MIN_CELL_WIDTH = 3;
const MAX_CELL_WIDTH = 6;
const MIN_CELL_HEIGHT = 2;
const MAX_CELL_HEIGHT = 4;

// Gem color ANSI codes
const GEM_COLORS: Record<GemColor, string> = {
  red: '\x1b[1;38;5;196m',
  green: '\x1b[1;38;5;46m',
  blue: '\x1b[1;38;5;27m',
  yellow: '\x1b[1;38;5;226m',
};

// Counter gem background colors (ANSI-256 background codes matching gem colors)
const COUNTER_BG_COLORS: Record<GemColor, string> = {
  red: '\x1b[48;5;196m',
  green: '\x1b[48;5;34m',
  blue: '\x1b[48;5;27m',
  yellow: '\x1b[48;5;178m',
};

// Drop speed (frames between auto-drops)
const BASE_DROP_SPEED = 16;
const MIN_DROP_SPEED = 3;
const SPEED_RAMP_DROPS = 8; // Speed up every N drops

// Resolution animation phases
const PHASE_NONE = 0;
const PHASE_FLASH = 1;
const PHASE_DISSOLVE = 2;
const PHASE_GRAVITY = 3;
const PHASE_CHECK = 4;
const PHASE_GARBAGE = 5;

const FLASH_FRAMES = 6;
const DISSOLVE_FRAMES = 4;
const GRAVITY_FRAMES = 1;
const COUNTER_TIMER_NORMAL = 5;
const COUNTER_TIMER_DEFENDED = 3;
const GARBAGE_DROP_STEP_FRAMES = 2;
// Garbage drop patterns are now character-specific (see characters.ts)

// ============================================================================
// Game State
// ============================================================================

type GameState = 'difficulty' | 'characterSelect' | 'running' | 'gameOver' | 'paused';

interface GameRenderOptions {
  showEffects: boolean;
  showHud: boolean;
  showControls: boolean;
  showVs: boolean;
}

interface GarbageDropGem {
  col: number;
  targetRow: number;
  currentRow: number;
  timer: number;
  color: GemColor;
  delayFrames: number;
}

interface GarbageDropState {
  gems: GarbageDropGem[];
  frameTick: number;
}

// ============================================================================
// Main Game Function
// ============================================================================

export function runHyperFighterGame(terminal: Terminal): HyperFighterController {
  const themeColor = getCurrentThemeColor();

  let running = true;
  let gameState: GameState = 'difficulty';
  let difficultySelection = 1; // Default to NORMAL
  let pauseMenuSelection = 0;

  // Players
  let p1: PlayerState;
  let p2: PlayerState;
  let aiState: AIState;
  let selectedDifficulty: DifficultyConfig = DIFFICULTIES.normal;

  // Characters
  let p1Character: Character = CHARACTERS[0];
  let p2Character: Character = getRandomCharacter();
  let charGridRow = 0;
  let charGridCol = 0;

  // Drop timers
  let p1DropTimer = 0;
  let p2DropTimer = 0;
  let p1DropSpeed = BASE_DROP_SPEED;
  let p2DropSpeed = BASE_DROP_SPEED;

  // Resolution animation state (per player)
  let p1Phase = PHASE_NONE;
  let p2Phase = PHASE_NONE;
  let p1PhaseTimer = 0;
  let p2PhaseTimer = 0;
  let p1ClearedCells: { row: number; col: number; color: GemColor }[] = [];
  let p2ClearedCells: { row: number; col: number; color: GemColor }[] = [];
  let p1ChainCount = 0;
  let p2ChainCount = 0;
  let p1TotalCleared = 0;
  let p2TotalCleared = 0;
  let p1GarbageDrop: GarbageDropState | null = null;
  let p2GarbageDrop: GarbageDropState | null = null;
  let p1GarbagePatternCursor = 0;
  let p2GarbagePatternCursor = 0;
  let p1IsDiamondClear = false;
  let p2IsDiamondClear = false;
  let p1AttackAccum = 0;
  let p2AttackAccum = 0;

  // Effects
  let particles: Particle[] = [];
  let floatingTexts: FloatingText[] = [];
  let projectiles: Projectile[] = [];
  let p1Shake: ShakeState = { intensity: 0, frames: 0 };
  let p2Shake: ShakeState = { intensity: 0, frames: 0 };
  let p1Flash: FlashState = { color: '', frames: 0 };
  let p2Flash: FlashState = { color: '', frames: 0 };
  let p1Pose: Pose = 'idle';
  let p2Pose: Pose = 'idle';
  let p1PoseTimer = 0;
  let p2PoseTimer = 0;
  let winner: 1 | 2 | 0 = 0;
  let gameOverTimer = 0;

  // Glitch title effect
  let glitchFrame = 0;

  // Layout — dynamic sizing
  let cellWidth = 3;
  let cellHeight = 2;
  let boardDisplayWidth = BOARD_COLS * cellWidth + 2;
  let boardDisplayHeight = BOARD_ROWS * cellHeight + 2;
  let cellEmpty = ' '.repeat(cellWidth);
  let cellSolid = '█'.repeat(cellWidth);
  let cellPower = '▓'.repeat(cellWidth);
  let cellGhost = '░'.repeat(cellWidth);
  let cellCrash = '◆'.repeat(cellWidth);
  let cellDiamond = '◇'.repeat(cellWidth);
  let cellEmptyDot = ' '.repeat(Math.floor((cellWidth - 1) / 2)) + '\x1b[38;5;238m·\x1b[0m' + ' '.repeat(cellWidth - Math.floor((cellWidth - 1) / 2) - 1);
  let showSidePanels = false;
  let sidePanel1X = 0;
  let sidePanel2X = 0;
  let boardLeft1 = 2;
  let boardLeft2 = 28;
  let vsColX = 16;
  let boardTop = 3;

  function recalcCellStrings(): void {
    boardDisplayWidth = BOARD_COLS * cellWidth + 2;
    boardDisplayHeight = BOARD_ROWS * cellHeight + 2;
    cellEmpty = ' '.repeat(cellWidth);
    cellSolid = '█'.repeat(cellWidth);
    cellPower = '▓'.repeat(cellWidth);
    cellGhost = '░'.repeat(cellWidth);
    cellCrash = '◆'.repeat(cellWidth);
    cellDiamond = '◇'.repeat(cellWidth);
    const padLeft = Math.floor((cellWidth - 1) / 2);
    cellEmptyDot = ' '.repeat(padLeft) + '·' + ' '.repeat(cellWidth - padLeft - 1);
  }

  const controller: HyperFighterController = {
    stop: () => {
      if (!running) return;
      running = false;
    },
    get isRunning() { return running; },
  };

  // ASCII art title
  const title = [
    '█ █ █ █ █▀█ █▀▀ █▀█',
    '█▀█ ▀▄▀ █▀▀ ██▄ █▀▄',
    '█▀▀ █ █▀▀ █ █ ▀█▀ █▀▀ █▀█',
    '█▀  █ █ █ █▀█  █  ██▄ █▀▄',
  ];

  const GLITCH_CHARS = '!@#$%^&*░▒▓█▀▄';

  // ============================================================================
  // Init
  // ============================================================================

  function initGame(): void {
    p1 = createPlayerState();
    p2 = createPlayerState();
    aiState = createAIState(selectedDifficulty);

    p1DropTimer = 0;
    p2DropTimer = 0;
    p1DropSpeed = BASE_DROP_SPEED;
    p2DropSpeed = BASE_DROP_SPEED;

    p1Phase = PHASE_NONE;
    p2Phase = PHASE_NONE;
    p1PhaseTimer = 0;
    p2PhaseTimer = 0;
    p1ClearedCells = [];
    p2ClearedCells = [];
    p1ChainCount = 0;
    p2ChainCount = 0;
    p1TotalCleared = 0;
    p2TotalCleared = 0;
    p1GarbageDrop = null;
    p2GarbageDrop = null;
    p1GarbagePatternCursor = 0;
    p2GarbagePatternCursor = 0;
    p1IsDiamondClear = false;
    p2IsDiamondClear = false;
    p1AttackAccum = 0;
    p2AttackAccum = 0;

    particles = [];
    floatingTexts = [];
    projectiles = [];
    p1Shake = { intensity: 0, frames: 0 };
    p2Shake = { intensity: 0, frames: 0 };
    p1Flash = { color: '', frames: 0 };
    p2Flash = { color: '', frames: 0 };
    p1Pose = 'idle';
    p2Pose = 'idle';
    p1PoseTimer = 0;
    p2PoseTimer = 0;
    winner = 0;
    gameOverTimer = 0;
    pauseMenuSelection = 0;

    spawnPair(p1);
    spawnPair(p2);
  }

  function calculateLayout(): void {
    const cols = terminal.cols;
    const rows = terminal.rows;

    // Dynamic cell height: fill vertical space between header/footer
    cellHeight = Math.max(MIN_CELL_HEIGHT, Math.min(MAX_CELL_HEIGHT,
      Math.floor((rows - HEADER_HEIGHT - FOOTER_HEIGHT - 2 - 2) / BOARD_ROWS)));

    // Dynamic cell width: fill horizontal space for two boards + vs column
    // Check if side panels can fit
    const availWidthWithPanels = cols - 2 * SIDE_PANEL_WIDTH - VS_COL_WIDTH - 4;
    const availWidthWithout = cols - VS_COL_WIDTH - 4;
    const cwWithPanels = Math.floor(availWidthWithPanels / (2 * BOARD_COLS));
    const cwWithout = Math.floor(availWidthWithout / (2 * BOARD_COLS));

    if (cwWithPanels >= MIN_CELL_WIDTH) {
      showSidePanels = true;
      cellWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, cwWithPanels));
    } else {
      showSidePanels = false;
      cellWidth = Math.max(MIN_CELL_WIDTH, Math.min(MAX_CELL_WIDTH, cwWithout));
    }

    // Aspect-cap: cellWidth shouldn't exceed ~1.5x cellHeight
    const maxAspectWidth = Math.floor(cellHeight * 1.5);
    if (cellWidth > maxAspectWidth && maxAspectWidth >= MIN_CELL_WIDTH) {
      cellWidth = maxAspectWidth;
    }

    recalcCellStrings();

    // Position math
    if (showSidePanels) {
      const totalWidth = SIDE_PANEL_WIDTH + boardDisplayWidth + VS_COL_WIDTH + boardDisplayWidth + SIDE_PANEL_WIDTH;
      const startX = Math.max(1, Math.floor((cols - totalWidth) / 2) + 1);
      sidePanel1X = startX;
      boardLeft1 = startX + SIDE_PANEL_WIDTH;
      vsColX = boardLeft1 + boardDisplayWidth + 1;
      boardLeft2 = boardLeft1 + boardDisplayWidth + VS_COL_WIDTH;
      sidePanel2X = boardLeft2 + boardDisplayWidth;
    } else {
      const totalWidth = boardDisplayWidth * 2 + VS_COL_WIDTH;
      boardLeft1 = Math.max(1, Math.floor((cols - totalWidth) / 2) + 1);
      boardLeft2 = boardLeft1 + boardDisplayWidth + VS_COL_WIDTH;
      vsColX = boardLeft1 + boardDisplayWidth + 1;
      sidePanel1X = 0;
      sidePanel2X = 0;
    }

    // Vertical centering between header and footer
    const availHeight = rows - HEADER_HEIGHT - FOOTER_HEIGHT;
    boardTop = HEADER_HEIGHT + Math.max(1, Math.floor((availHeight - boardDisplayHeight) / 2));
  }

  // ============================================================================
  // Drop Speed
  // ============================================================================

  function getDropSpeed(player: PlayerState): number {
    const ramp = Math.floor(player.totalDrops / SPEED_RAMP_DROPS);
    return Math.max(MIN_DROP_SPEED, BASE_DROP_SPEED - ramp);
  }

  // ============================================================================
  // Resolution Animation — State Machine per Player
  // ============================================================================

  function startResolution(
    player: PlayerState,
    isP1: boolean,
  ): void {
    // Reset per-step attack accumulator
    if (isP1) p1AttackAccum = 0;
    else p2AttackAccum = 0;

    // Resolve diamond gems first (destroy all of one color)
    const diamondCleared = resolveDiamond(player.board);
    if (diamondCleared.length > 0) {
      applyGravityFull(player.board, player.powerGems);
      if (isP1) p1IsDiamondClear = true;
      else p2IsDiamondClear = true;
    } else {
      if (isP1) p1IsDiamondClear = false;
      else p2IsDiamondClear = false;
    }

    // Detect power gems first
    player.powerGems = detectPowerGems(player.board);

    // Find crash targets with power gem info
    const { cleared, clearedCells: crashCells, powerGemSizes } = resolveOneStep(player);
    const clearedCells = [...diamondCleared, ...crashCells];
    const totalStepCleared = cleared + diamondCleared.length;

    if (clearedCells.length === 0) {
      // No crashes found — spawn next pair
      finishResolution(player, isP1);
      return;
    }

    if (isP1) {
      p1ClearedCells = clearedCells;
      p1ChainCount++;
      p1TotalCleared += totalStepCleared;
      p1Phase = PHASE_FLASH;
      p1PhaseTimer = FLASH_FRAMES;
      // Accumulate per-step attack
      const stepInfo: StepClearInfo = { gemsCleared: totalStepCleared, powerGemSizes, chainStep: p1ChainCount };
      p1AttackAccum += calculateStepAttack(stepInfo);
    } else {
      p2ClearedCells = clearedCells;
      p2ChainCount++;
      p2TotalCleared += totalStepCleared;
      p2Phase = PHASE_FLASH;
      p2PhaseTimer = FLASH_FRAMES;
      const stepInfo: StepClearInfo = { gemsCleared: totalStepCleared, powerGemSizes, chainStep: p2ChainCount };
      p2AttackAccum += calculateStepAttack(stepInfo);
    }

    // Spawn effects
    const bLeft = isP1 ? boardLeft1 : boardLeft2;
    const chainCount = isP1 ? p1ChainCount : p2ChainCount;

    if (chainCount >= 1) {
      spawnComboText(chainCount, bLeft + boardDisplayWidth / 2, boardTop + 2, floatingTexts);
      if (chainCount >= 2) {
        spawnChainCounter(chainCount, bLeft + boardDisplayWidth / 2, boardTop + 3, floatingTexts);
      }
    }

    // Particles for cleared cells
    for (const cell of clearedCells) {
      const px = bLeft + 1 + cell.col * cellWidth + Math.floor(cellWidth / 2);
      const py = boardTop + 1 + cell.row * cellHeight + Math.floor(cellHeight / 2);
      spawnClearParticles(px, py, cell.color, 3, particles);
    }

    // Shake
    const shakeAmount = Math.min(3, Math.ceil(clearedCells.length / 4));
    if (isP1) {
      triggerShake(p1Shake, shakeAmount, 6);
      triggerFlash(p1Flash, '\x1b[97m', 4);
      p1Pose = 'attack';
      p1PoseTimer = 12;
    } else {
      triggerShake(p2Shake, shakeAmount, 6);
      triggerFlash(p2Flash, '\x1b[97m', 4);
      p2Pose = 'attack';
      p2PoseTimer = 12;
    }
  }

  function resolveOneStep(player: PlayerState): { cleared: number; chains: number; clearedCells: { row: number; col: number; color: GemColor }[]; powerGemSizes: number[] } {
    player.powerGems = detectPowerGems(player.board);
    const { targets, destroyedPowerGemSizes } = findCrashTargetsWithPowerInfo(player.board, player.powerGems);

    if (targets.length === 0) return { cleared: 0, chains: 0, clearedCells: [], powerGemSizes: [] };

    // Clear
    for (const t of targets) {
      player.board[t.row][t.col] = null;
    }

    // Gravity
    applyGravityFull(player.board, player.powerGems);
    player.powerGems = [];

    return { cleared: targets.length, chains: 1, clearedCells: targets, powerGemSizes: destroyedPowerGemSizes };
  }

  function buildGarbageDropState(
    player: PlayerState,
    defendedCount: number,
    normalCount: number,
    startCursor: number,
    dropPattern: GemColor[][],
  ): { dropState: GarbageDropState | null; nextCursor: number } {
    const occupied = player.board.map(row => row.map(cell => cell !== null));
    const timers: number[] = [];
    for (let i = 0; i < defendedCount; i++) timers.push(COUNTER_TIMER_DEFENDED);
    for (let i = 0; i < normalCount; i++) timers.push(COUNTER_TIMER_NORMAL);

    const gems: GarbageDropGem[] = [];
    const patternRows = dropPattern.length;
    const patternCols = dropPattern[0].length;
    const patternLen = patternRows * patternCols; // 24 for 4x6
    let placedCount = 0;

    function findLandingRow(col: number): number {
      for (let r = BOARD_ROWS - 1; r >= 0; r--) {
        if (!occupied[r][col]) return r;
      }
      return -1;
    }

    for (let i = 0; i < timers.length; i++) {
      const patternIdx = (startCursor + i) % patternLen;
      const pRow = Math.floor(patternIdx / patternCols);
      const pCol = patternIdx % patternCols;
      const color = dropPattern[pRow][pCol];
      let placeCol = -1;
      let placeRow = -1;

      // Try the pattern's target column first
      const landing = findLandingRow(pCol);
      if (landing >= 0) {
        placeCol = pCol;
        placeRow = landing;
      } else {
        // Fallback: scan adjacent columns, keeping the pattern's intended color
        for (let offset = 1; offset < BOARD_COLS; offset++) {
          for (const dir of [1, -1]) {
            const adjCol = pCol + offset * dir;
            if (adjCol >= 0 && adjCol < BOARD_COLS) {
              const adjLanding = findLandingRow(adjCol);
              if (adjLanding >= 0) {
                placeCol = adjCol;
                placeRow = adjLanding;
                break;
              }
            }
          }
          if (placeRow >= 0) break;
        }
      }

      if (placeRow < 0 || placeCol < 0) continue;
      occupied[placeRow][placeCol] = true;
      gems.push({
        col: placeCol,
        targetRow: placeRow,
        currentRow: 0,
        timer: timers[i],
        color,
        delayFrames: i,
      });
      placedCount++;
    }

    if (gems.length === 0) {
      return { dropState: null, nextCursor: startCursor };
    }

    const nextCursor = (startCursor + placedCount) % patternLen;
    return { dropState: { gems, frameTick: 0 }, nextCursor };
  }

  function triggerLoss(isP1: boolean): void {
    const loser = isP1 ? p1 : p2;
    loser.alive = false;
    gameState = 'gameOver';
    winner = isP1 ? 2 : 1;
    gameOverTimer = 0;
    pauseMenuSelection = 0;

    if (isP1) {
      p1Pose = 'lose';
      p2Pose = 'win';
    } else {
      p2Pose = 'lose';
      p1Pose = 'win';
    }

    const loserLeft = isP1 ? boardLeft1 : boardLeft2;
    const winnerLeft = isP1 ? boardLeft2 : boardLeft1;
    spawnCollapse(loserLeft, boardTop, boardDisplayWidth, BOARD_ROWS * cellHeight, particles);
    spawnFirework(winnerLeft + boardDisplayWidth / 2, boardTop + 3, particles);
  }

  function finalizePostResolution(player: PlayerState, isP1: boolean): void {
    if (checkGameOver(player.board)) {
      triggerLoss(isP1);
      return;
    }

    player.powerGems = detectPowerGems(player.board);
    if (!spawnPair(player)) {
      triggerLoss(isP1);
    }
  }

  function tickGarbageDrop(player: PlayerState, isP1: boolean): void {
    const dropState = isP1 ? p1GarbageDrop : p2GarbageDrop;
    if (!dropState) {
      if (isP1) p1Phase = PHASE_NONE;
      else p2Phase = PHASE_NONE;
      finalizePostResolution(player, isP1);
      return;
    }

    dropState.frameTick++;
    if (dropState.frameTick < GARBAGE_DROP_STEP_FRAMES) return;
    dropState.frameTick = 0;

    let stillDropping = false;
    for (const gem of dropState.gems) {
      if (gem.delayFrames > 0) {
        gem.delayFrames--;
        stillDropping = true;
        continue;
      }
      if (gem.currentRow < gem.targetRow) {
        gem.currentRow++;
        stillDropping = true;
      }
    }

    if (stillDropping) return;

    for (const gem of dropState.gems) {
      if (player.board[gem.targetRow][gem.col] !== null) continue;
      player.board[gem.targetRow][gem.col] = {
        color: gem.color,
        type: 'counter',
        counterTimer: gem.timer,
      };
    }

    if (isP1) {
      p1GarbageDrop = null;
      p1Phase = PHASE_NONE;
    } else {
      p2GarbageDrop = null;
      p2Phase = PHASE_NONE;
    }
    finalizePostResolution(player, isP1);
  }

  function tickResolution(isP1: boolean): void {
    const phase = isP1 ? p1Phase : p2Phase;
    const timer = isP1 ? p1PhaseTimer : p2PhaseTimer;
    const player = isP1 ? p1 : p2;

    if (phase === PHASE_NONE) return;

    if (timer > 0) {
      if (isP1) p1PhaseTimer--;
      else p2PhaseTimer--;
      return;
    }

    // Advance phase
    switch (phase) {
      case PHASE_FLASH:
        if (isP1) { p1Phase = PHASE_DISSOLVE; p1PhaseTimer = DISSOLVE_FRAMES; }
        else { p2Phase = PHASE_DISSOLVE; p2PhaseTimer = DISSOLVE_FRAMES; }
        break;

      case PHASE_DISSOLVE:
        // Actually clear the cells from board (already cleared in resolveOneStep)
        if (isP1) { p1Phase = PHASE_GRAVITY; p1PhaseTimer = GRAVITY_FRAMES; }
        else { p2Phase = PHASE_GRAVITY; p2PhaseTimer = GRAVITY_FRAMES; }
        break;

      case PHASE_GRAVITY:
        if (isP1) { p1Phase = PHASE_CHECK; p1PhaseTimer = 0; }
        else { p2Phase = PHASE_CHECK; p2PhaseTimer = 0; }
        break;

      case PHASE_GARBAGE:
        tickGarbageDrop(player, isP1);
        break;

      case PHASE_CHECK: {
        // Check for more crashes
        player.powerGems = detectPowerGems(player.board);
        const { targets: more, destroyedPowerGemSizes: pgSizes } = findCrashTargetsWithPowerInfo(player.board, player.powerGems);

        if (more.length > 0) {
          // Chain continues
          for (const t of more) {
            player.board[t.row][t.col] = null;
          }
          applyGravityFull(player.board, player.powerGems);
          player.powerGems = [];

          if (isP1) {
            p1ClearedCells = more;
            p1ChainCount++;
            p1TotalCleared += more.length;
            p1Phase = PHASE_FLASH;
            p1PhaseTimer = FLASH_FRAMES;
            // Accumulate per-step attack
            const stepInfo: StepClearInfo = { gemsCleared: more.length, powerGemSizes: pgSizes, chainStep: p1ChainCount };
            p1AttackAccum += calculateStepAttack(stepInfo);
          } else {
            p2ClearedCells = more;
            p2ChainCount++;
            p2TotalCleared += more.length;
            p2Phase = PHASE_FLASH;
            p2PhaseTimer = FLASH_FRAMES;
            const stepInfo: StepClearInfo = { gemsCleared: more.length, powerGemSizes: pgSizes, chainStep: p2ChainCount };
            p2AttackAccum += calculateStepAttack(stepInfo);
          }

          // More effects for chains
          const chainCount = isP1 ? p1ChainCount : p2ChainCount;
          const bLeft = isP1 ? boardLeft1 : boardLeft2;

          spawnComboText(chainCount, bLeft + boardDisplayWidth / 2, boardTop + 2, floatingTexts);
          for (const cell of more) {
            const px = bLeft + 1 + cell.col * cellWidth + Math.floor(cellWidth / 2);
            const py = boardTop + 1 + cell.row * cellHeight + Math.floor(cellHeight / 2);
            spawnClearParticles(px, py, cell.color, 4 + chainCount, particles);
          }
          triggerShake(isP1 ? p1Shake : p2Shake, Math.min(4, chainCount), 8);
        } else {
          // Resolution complete — send attack using per-step accumulator
          const totalCleared = isP1 ? p1TotalCleared : p2TotalCleared;
          const chainCount = isP1 ? p1ChainCount : p2ChainCount;
          const dmgMod = isP1 ? p1Character.damageModifier : p2Character.damageModifier;
          const isDiamond = isP1 ? p1IsDiamondClear : p2IsDiamondClear;
          const rawAttack = isP1 ? p1AttackAccum : p2AttackAccum;
          let attack = applyAttackModifiers(rawAttack, dmgMod, isDiamond);

          if (attack > 0 && player.pendingGarbage > 0) {
            const defense = resolveCounterAttack(attack, player.pendingGarbage);
            attack = defense.remainingAttack;
            player.pendingGarbage = defense.remainingPending;
            player.pendingCounteredGarbage = defense.pendingStartsAtThree ? defense.remainingPending : 0;

            if (defense.canceledGems > 0) {
              const left = isP1 ? boardLeft1 : boardLeft2;
              floatingTexts.push({
                text: `DEFENSE -${defense.canceledGems}`,
                x: left + 2,
                y: Math.max(1, boardTop - 1),
                color: '\x1b[96m',
                frames: 18,
                maxFrames: 18,
              });
            }
          }

          if (attack > 0) {
            const opponent = isP1 ? p2 : p1;
            opponent.pendingGarbage += attack;

            // Projectile
            const fromBLeft = isP1 ? boardLeft1 : boardLeft2;
            const toBLeft = isP1 ? boardLeft2 : boardLeft1;
            spawnProjectile(
              fromBLeft + boardDisplayWidth / 2,
              toBLeft + boardDisplayWidth / 2,
              boardTop + Math.floor(boardDisplayHeight / 2),
              attack,
              projectiles,
            );

            // Hit pose on opponent
            if (isP1) { p2Pose = 'hit'; p2PoseTimer = 10; }
            else { p1Pose = 'hit'; p1PoseTimer = 10; }

            // Opponent flash red
            triggerFlash(isP1 ? p2Flash : p1Flash, '\x1b[91m', 6);
            triggerShake(isP1 ? p2Shake : p1Shake, Math.min(3, Math.ceil(attack / 2)), 6);
          }

          player.score += totalCleared * 10 + (chainCount > 1 ? chainCount * 50 : 0);
          finishResolution(player, isP1);
        }
        break;
      }
    }
  }

  function finishResolution(player: PlayerState, isP1: boolean): void {
    if (isP1) {
      p1Phase = PHASE_NONE;
      p1PhaseTimer = 0;
      p1ChainCount = 0;
      p1TotalCleared = 0;
      p1ClearedCells = [];
      p1AttackAccum = 0;
    } else {
      p2Phase = PHASE_NONE;
      p2PhaseTimer = 0;
      p2ChainCount = 0;
      p2TotalCleared = 0;
      p2ClearedCells = [];
      p2AttackAccum = 0;
    }

    // Existing counters tick down each round.
    decrementCounters(player);

    // Converted counters may now be adjacent to crash gems — check for new crashes
    player.powerGems = detectPowerGems(player.board);
    const { targets: postCounterTargets } = findCrashTargetsWithPowerInfo(player.board, player.powerGems);
    if (postCounterTargets.length > 0) {
      // Restart resolution to handle the new crashes
      startResolution(player, isP1);
      return;
    }

    // Queue incoming garbage for a visible fall animation instead of instant pop-in.
    if (player.pendingGarbage > 0) {
      const incomingCount = player.pendingGarbage;
      const defendedCount = Math.min(player.pendingCounteredGarbage, player.pendingGarbage);
      const normalCount = player.pendingGarbage - defendedCount;

      const cursor = isP1 ? p1GarbagePatternCursor : p2GarbagePatternCursor;
      // Attacker's character pattern determines garbage placement
      const attackerPattern = isP1 ? p2Character.dropPattern : p1Character.dropPattern;
      const { dropState, nextCursor } = buildGarbageDropState(player, defendedCount, normalCount, cursor, attackerPattern);
      if (isP1) p1GarbagePatternCursor = nextCursor;
      else p2GarbagePatternCursor = nextCursor;
      player.pendingGarbage = 0;
      player.pendingCounteredGarbage = 0;

      const left = isP1 ? boardLeft1 : boardLeft2;
      floatingTexts.push({
        text: `DROP +${incomingCount}`,
        x: left + 2,
        y: Math.max(1, boardTop - 1),
        color: '\x1b[1;91m',
        frames: 20,
        maxFrames: 20,
      });

      if (dropState) {
        if (isP1) {
          p1GarbageDrop = dropState;
          p1Phase = PHASE_GARBAGE;
          p1PhaseTimer = 0;
        } else {
          p2GarbageDrop = dropState;
          p2Phase = PHASE_GARBAGE;
          p2PhaseTimer = 0;
        }
        return;
      }
    }

    finalizePostResolution(player, isP1);
  }

  // ============================================================================
  // Update
  // ============================================================================

  function update(): void {
    if (gameState !== 'running') return;

    glitchFrame++;

    // Update effects
    updateParticles(particles);
    updateFloatingTexts(floatingTexts);
    updateProjectiles(projectiles);

    // Update pose timers
    if (p1PoseTimer > 0) {
      p1PoseTimer--;
      if (p1PoseTimer <= 0) p1Pose = 'idle';
    }
    if (p2PoseTimer > 0) {
      p2PoseTimer--;
      if (p2PoseTimer <= 0) p2Pose = 'idle';
    }

    // Resolution animations
    if (p1Phase !== PHASE_NONE) {
      tickResolution(true);
    }
    if (p2Phase !== PHASE_NONE) {
      tickResolution(false);
    }

    // Player 1 drop
    if (p1Phase === PHASE_NONE && p1.currentPair && p1.alive) {
      p1DropSpeed = getDropSpeed(p1);
      p1DropTimer++;
      if (p1DropTimer >= p1DropSpeed) {
        p1DropTimer = 0;
        if (!dropPair(p1.currentPair, p1.board)) {
          lockAndResolve(p1, true);
        }
      }
    }

    // Player 2 (AI) logic
    if (p2Phase === PHASE_NONE && p2.currentPair && p2.alive) {
      p2DropSpeed = Math.max(MIN_DROP_SPEED, Math.floor(getDropSpeed(p2) / aiState.difficulty.dropSpeedBoost));

      // AI decision making
      const action = aiTick(p2, aiState);

      switch (action) {
        case 'rotate_cw':
          rotatePair(p2.currentPair, p2.board, true);
          break;
        case 'rotate_ccw':
          rotatePair(p2.currentPair, p2.board, false);
          break;
        case 'move': {
          const dir = getAIMoveDirection(p2, aiState);
          if (dir !== 0) movePair(p2.currentPair, p2.board, dir);
          break;
        }
        case 'drop':
          if (!dropPair(p2.currentPair, p2.board)) {
            lockAndResolve(p2, false);
          }
          break;
      }

      // Auto drop for AI
      p2DropTimer++;
      if (p2DropTimer >= p2DropSpeed) {
        p2DropTimer = 0;
        if (p2.currentPair && !dropPair(p2.currentPair, p2.board)) {
          lockAndResolve(p2, false);
        }
      }
    }
  }

  function lockAndResolve(player: PlayerState, isP1: boolean): void {
    if (!player.currentPair) return;
    lockPair(player.currentPair, player.board);
    player.currentPair = null;
    applyGravityFull(player.board, player.powerGems);

    // Reset AI state for next piece
    if (!isP1) {
      aiState.decided = false;
      aiState.thinkTimer = 0;
      aiState.moveTimer = 0;
    }

    // Start resolution
    startResolution(player, isP1);
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  function render(): void {
    if (!running) return;

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Size check
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      let output = '\x1b[2J\x1b[H';
      output += `\x1b[${Math.floor(rows / 2)};${Math.max(1, Math.floor(cols / 2) - 10)}H`;
      output += `${themeColor}Need ${MIN_COLS}×${MIN_ROWS} (have ${cols}×${rows})\x1b[0m`;
      terminal.write(output);
      return;
    }

    calculateLayout();

    let output = '\x1b[2J\x1b[H';

    switch (gameState) {
      case 'difficulty':
        output += renderDifficultyScreen();
        break;
      case 'characterSelect':
        output += renderCharacterSelectScreen();
        break;
      case 'running':
        output += renderGame();
        break;
      case 'paused':
        output += renderGame();
        output += renderPauseOverlay();
        break;
      case 'gameOver':
        output += renderGame({
          showEffects: false,
          showHud: false,
          showControls: false,
          showVs: false,
        });
        output += renderGameOverOverlay();
        break;
    }

    terminal.write(output);
  }

  // ============================================================================
  // Difficulty Selection Screen
  // ============================================================================

  function renderDifficultyScreen(): string {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const centerX = Math.floor(cols / 2);
    let output = '';

    // Title with glitch
    const titleY = Math.max(2, Math.floor(rows / 2) - 8);
    for (let i = 0; i < title.length; i++) {
      let line = title[i];
      // Glitch effect: randomly corrupt a character
      if (Math.random() < 0.15) {
        const pos = Math.floor(Math.random() * line.length);
        const glitchChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        line = line.substring(0, pos) + glitchChar + line.substring(pos + 1);
      }
      const x = Math.max(1, centerX - Math.floor(line.length / 2));
      const color = i < 2 ? themeColor : '\x1b[93m';
      output += `\x1b[${titleY + i};${x}H${color}\x1b[1m${line}\x1b[0m`;
    }

    // Subtitle
    const subtitle = '╔══ GEM BATTLE VS AI ══╗';
    const subX = Math.max(1, centerX - Math.floor(subtitle.length / 2));
    output += `\x1b[${titleY + title.length + 1};${subX}H${themeColor}${subtitle}\x1b[0m`;

    // Difficulty options
    const diffY = titleY + title.length + 4;
    const diffs = ['easy', 'normal', 'hard'];
    const diffLabels = ['EASY', 'NORMAL', 'HARD'];
    const diffDescs = ['Relaxed pace, AI makes mistakes', 'Balanced challenge', 'Fast & ruthless AI'];

    for (let i = 0; i < diffs.length; i++) {
      const isSelected = i === difficultySelection;
      const label = `[${i + 1}] ${diffLabels[i]}`;
      const text = isSelected ? `► ${label} ◄` : `  ${label}  `;
      const style = isSelected ? '\x1b[1;93m' : `\x1b[2m${themeColor}`;
      const x = Math.max(1, centerX - Math.floor(text.length / 2));
      output += `\x1b[${diffY + i * 2};${x}H${style}${text}\x1b[0m`;
      if (isSelected) {
        const descX = Math.max(1, centerX - Math.floor(diffDescs[i].length / 2));
        output += `\x1b[${diffY + i * 2 + 1};${descX}H\x1b[2m${themeColor}${diffDescs[i]}\x1b[0m`;
      }
    }

    // Controls hint
    const controlsY = diffY + 8;
    const controls = '↑↓ Select  Enter Confirm  Q Quit';
    const cX = Math.max(1, centerX - Math.floor(controls.length / 2));
    output += `\x1b[${controlsY};${cX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

    // Controls reference
    const refY = controlsY + 2;
    const refLines = [
      '←→/AD Move  ↑/W Rotate  Z Counter-rotate',
      '↓/S Soft drop  Space Hard drop  ESC Pause',
    ];
    for (let i = 0; i < refLines.length; i++) {
      const rx = Math.max(1, centerX - Math.floor(refLines[i].length / 2));
      output += `\x1b[${refY + i};${rx}H\x1b[2m\x1b[90m${refLines[i]}\x1b[0m`;
    }

    return output;
  }

  // ============================================================================
  // Character Select Screen
  // ============================================================================

  const PATTERN_PREVIEW_COLORS: Record<GemColor, string> = {
    red: '\x1b[1;38;5;196m',
    green: '\x1b[1;38;5;46m',
    blue: '\x1b[1;38;5;27m',
    yellow: '\x1b[1;38;5;226m',
  };

  function renderCharacterSelectScreen(): string {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const centerX = Math.floor(cols / 2);
    let output = '';

    // Title
    const titleY = Math.max(2, Math.floor(rows / 2) - 14);
    const selectTitle = '╔══ SELECT YOUR FIGHTER ══╗';
    const stX = Math.max(1, centerX - Math.floor(selectTitle.length / 2));
    output += `\x1b[${titleY};${stX}H${themeColor}\x1b[1m${selectTitle}\x1b[0m`;

    // Difficulty badge
    const badge = `[${selectedDifficulty.name}]`;
    const bX = Math.max(1, centerX - Math.floor(badge.length / 2));
    output += `\x1b[${titleY + 1};${bX}H\x1b[2m${themeColor}${badge}\x1b[0m`;

    // Character grid: 4-4-3
    const gridY = titleY + 3;
    const cellW = 11; // width per character cell
    const selectedIdx = CHAR_GRID[charGridRow][charGridCol];

    for (let row = 0; row < CHAR_GRID.length; row++) {
      const rowChars = CHAR_GRID[row];
      const rowWidth = rowChars.length * cellW;
      const rowStartX = Math.max(1, centerX - Math.floor(rowWidth / 2));

      for (let col = 0; col < rowChars.length; col++) {
        const charIdx = rowChars[col];
        const char = CHARACTERS[charIdx];
        const isSelected = charIdx === selectedIdx;
        const x = rowStartX + col * cellW;
        const y = gridY + row * 3;

        // Name
        const name = char.name.slice(0, cellW - 2).padEnd(cellW - 2);
        if (isSelected) {
          output += `\x1b[${y};${x}H\x1b[1;93m►${name}◄\x1b[0m`;
        } else {
          output += `\x1b[${y};${x}H${themeColor} ${name} \x1b[0m`;
        }

        // Damage badge
        const dmgStr = char.damageModifier !== 1.0
          ? `${Math.round(char.damageModifier * 100)}%`
          : '   ';
        const dmgColor = char.damageModifier > 1.0 ? '\x1b[92m' : char.damageModifier < 1.0 ? '\x1b[96m' : '\x1b[90m';
        output += `\x1b[${y + 1};${x + 1}H${dmgColor}${dmgStr}\x1b[0m`;
      }
    }

    // Selected character details panel
    const char = CHARACTERS[selectedIdx];
    const detailY = gridY + CHAR_GRID.length * 3 + 1;

    // Character name and description
    const charTitle = `${char.name} — ${char.description}`;
    const ctX = Math.max(1, centerX - Math.floor(charTitle.length / 2));
    output += `\x1b[${detailY};${ctX}H\x1b[1;97m${charTitle}\x1b[0m`;

    // Damage modifier line
    const dmgLabel = char.damageModifier === 1.0
      ? 'Damage: 100% (standard)'
      : char.damageModifier > 1.0
        ? `Damage: ${Math.round(char.damageModifier * 100)}% (bonus)`
        : `Damage: ${Math.round(char.damageModifier * 100)}% (reduced)`;
    const dmgLabelColor = char.damageModifier > 1.0 ? '\x1b[92m' : char.damageModifier < 1.0 ? '\x1b[96m' : '\x1b[90m';
    const dlX = Math.max(1, centerX - Math.floor(dmgLabel.length / 2));
    output += `\x1b[${detailY + 1};${dlX}H${dmgLabelColor}${dmgLabel}\x1b[0m`;

    // Drop pattern preview (4x6 mini-grid, 2 chars per cell)
    const previewWidth = 6 * 2; // 12 chars
    const previewX = Math.max(1, centerX - Math.floor(previewWidth / 2));
    const previewY = detailY + 3;

    output += `\x1b[${previewY - 1};${previewX}H\x1b[2m${themeColor}Drop Pattern:\x1b[0m`;

    for (let pr = 0; pr < char.dropPattern.length; pr++) {
      let rowStr = '';
      for (let pc = 0; pc < char.dropPattern[pr].length; pc++) {
        const color = char.dropPattern[pr][pc];
        rowStr += `${PATTERN_PREVIEW_COLORS[color]}██\x1b[0m`;
      }
      output += `\x1b[${previewY + pr};${previewX}H${rowStr}`;
    }

    // Portrait preview
    const portraitX = previewX + previewWidth + 3;
    const portraitLines = char.portraits.idle;
    output += renderPortrait(portraitLines, portraitX, previewY, themeColor);

    // Controls hint
    const controlsY = previewY + char.dropPattern.length + 2;
    const controls = '←→↑↓ Select  Enter Confirm  Esc Back';
    const cX = Math.max(1, centerX - Math.floor(controls.length / 2));
    output += `\x1b[${controlsY};${cX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

    return output;
  }

  // ============================================================================
  // Game Rendering
  // ============================================================================

  function renderGame(options?: Partial<GameRenderOptions>): string {
    const config: GameRenderOptions = {
      showEffects: options?.showEffects ?? true,
      showHud: options?.showHud ?? true,
      showControls: options?.showControls ?? true,
      showVs: options?.showVs ?? true,
    };

    let output = '';

    // Header bar
    output += renderHeaderBar();

    // Compute shake offsets
    const s1 = updateShake(p1Shake);
    const s2 = updateShake(p2Shake);

    // Board 1 (Player)
    output += renderBoard(p1, boardLeft1 + s1.dx, boardTop + s1.dy, true, true, p1Phase, p1PhaseTimer, p1ClearedCells, p1Flash);

    // Board 2 (AI)
    output += renderBoard(p2, boardLeft2 + s2.dx, boardTop + s2.dy, false, false, p2Phase, p2PhaseTimer, p2ClearedCells, p2Flash);

    // VS Column
    if (config.showVs) {
      output += renderVSColumn();
    }

    // Side panels
    if (showSidePanels && config.showHud) {
      output += renderSidePanel(true);
      output += renderSidePanel(false);
    }

    // Fallback: inline labels & score when no side panels
    if (!showSidePanels) {
      output += `\x1b[${boardTop - 1};${boardLeft1 + 2}H${themeColor}${p1Character.name}\x1b[0m`;
      output += `\x1b[${boardTop - 1};${boardLeft2 + 2}H\x1b[91m${p2Character.name}\x1b[0m`;
      output += renderNextStrip(p1, boardLeft1, Math.max(1, boardTop - 2), themeColor);
      output += renderNextStrip(p2, boardLeft2, Math.max(1, boardTop - 2), '\x1b[91m');

      if (config.showHud) {
        const panelY = boardTop + boardDisplayHeight + 1;
        output += renderScorePanel(
          boardLeft1, panelY, p1.score, p1.pendingGarbage, themeColor,
          `S${Math.round((BASE_DROP_SPEED / Math.max(1, p1DropSpeed)) * 100)}%`
        );
        output += renderScorePanel(
          boardLeft2, panelY, p2.score, p2.pendingGarbage,
          '\x1b[1;38;5;203m', 'AI'
        );
      }
    }

    // Effects
    if (config.showEffects) {
      output += renderParticles(particles, 1, 1, terminal.cols, terminal.rows);
      output += renderFloatingTexts(floatingTexts);
      output += renderProjectiles(projectiles);
    }

    // Footer bar (replaces old inline controls)
    if (config.showControls) {
      output += renderFooterBar();
    }

    return output;
  }

  function renderNextStrip(player: PlayerState, left: number, y: number, accent: string): string {
    if (!player.nextPair) return '';
    let output = '';
    output += `\x1b[${y};${left}H${accent}\x1b[1mNEXT\x1b[0m `;
    output += renderGemCell(player.nextPair.primary, false, false);
    output += renderGemCell(player.nextPair.secondary, false, false);
    output += ` \x1b[2m${accent}●●●\x1b[0m`;
    return output;
  }

  function renderScorePanel(
    left: number,
    y: number,
    score: number,
    pending: number,
    accent: string,
    tag: string,
  ): string {
    const { levelLabel, levelColor } = getIncomingThreatLevel(pending);
    const meterWidth = 5;
    const filled = Math.min(meterWidth, pending);
    const meter = `${'■'.repeat(filled)}${'·'.repeat(meterWidth - filled)}`;
    const scoreLine = `SCORE ${score.toString().padStart(6, '0')} ${tag}`
      .slice(0, boardDisplayWidth)
      .padEnd(boardDisplayWidth, ' ');
    const statusLine = `IN${pending.toString().padStart(2, '0')} ${meter} ${levelLabel}`
      .slice(0, boardDisplayWidth)
      .padEnd(boardDisplayWidth, ' ');

    let output = '';
    output += `\x1b[${y};${left}H${accent}\x1b[48;5;237m${scoreLine}\x1b[0m`;
    output += `\x1b[${y + 1};${left}H${levelColor}\x1b[48;5;235m${statusLine}\x1b[0m`;
    return output;
  }

  function getIncomingThreatLevel(pending: number): { levelLabel: string; levelColor: string } {
    if (pending <= 0) return { levelLabel: 'CLEAR', levelColor: '\x1b[92m' };
    if (pending <= 2) return { levelLabel: 'LOW', levelColor: '\x1b[93m' };
    if (pending <= 5) return { levelLabel: 'HIGH', levelColor: '\x1b[91m' };
    return { levelLabel: 'DANGER', levelColor: '\x1b[1;91m' };
  }

  function renderBoard(
    player: PlayerState,
    left: number,
    top: number,
    isP1Board: boolean,
    showGhost: boolean,
    phase: number,
    phaseTimer: number,
    clearedCells: { row: number; col: number; color: GemColor }[],
    flash: FlashState,
  ): string {
    let output = '';
    const board = player.board;
    const pair = player.currentPair;

    // Border color
    const flashColor = updateFlash(flash);
    const borderColor = flashColor || themeColor;

    // Top border
    output += `\x1b[${top};${left}H${borderColor}╔${'═'.repeat(BOARD_COLS * cellWidth)}╗\x1b[0m`;

    // Cleared cells set for flash effect
    const clearedSet = new Set(clearedCells.map(c => `${c.row},${c.col}`));

    // Ghost position
    let ghost: { primaryRow: number; primaryCol: number; secondaryRow: number; secondaryCol: number } | null = null;
    if (showGhost && pair) {
      ghost = getGhostPosition(pair, board);
    }

    // Board rows — build two content strings per row:
    // rowContent0 (h=0): shows dots for empty cells
    // rowContentN (h>0): blank for empty cells
    for (let r = 0; r < BOARD_ROWS; r++) {
      let rowContent0 = '';
      let rowContentN = '';

      for (let c = 0; c < BOARD_COLS; c++) {
        const gem = board[r][c];
        const isCleared = clearedSet.has(`${r},${c}`);

        // Check if current pair occupies this cell
        let pairGem: Gem | null = null;
        if (pair) {
          if (pair.row === r && pair.col === c) pairGem = pair.primary;
          const sec = getSecondaryPos(pair);
          if (sec.row === r && sec.col === c) pairGem = pair.secondary;
        }

        if (pairGem) {
          const cell = renderGemCell(pairGem, false, false);
          rowContent0 += cell;
          rowContentN += cell;
        } else if (isCleared && phase === PHASE_FLASH) {
          const cell = clearedCells.find(cc => cc.row === r && cc.col === c);
          let s: string;
          if (cell && phaseTimer % 2 === 0) {
            s = `\x1b[1;97m${cellSolid}\x1b[0m`;
          } else {
            s = `${GEM_COLORS[cell?.color || 'red']}${cellSolid}\x1b[0m`;
          }
          rowContent0 += s;
          rowContentN += s;
        } else if (isCleared && phase === PHASE_DISSOLVE) {
          const stage = DISSOLVE_FRAMES - phaseTimer;
          let s: string;
          if (stage === 0) s = `\x1b[2m${cellPower}\x1b[0m`;
          else if (stage === 1) s = `\x1b[2m${cellGhost}\x1b[0m`;
          else s = cellEmpty;
          rowContent0 += s;
          rowContentN += s;
        } else if (gem) {
          const inPowerGem = gem.powerGemId !== undefined;
          const cell = renderGemCell(gem, inPowerGem, false);
          rowContent0 += cell;
          rowContentN += cell;
        } else {
          // Ghost or empty
          let isGhost = false;
          if (ghost) {
            if ((ghost.primaryRow === r && ghost.primaryCol === c) ||
                (ghost.secondaryRow === r && ghost.secondaryCol === c)) {
              isGhost = true;
            }
          }
          if (isGhost) {
            const g = `\x1b[2;90m${cellGhost}\x1b[0m`;
            rowContent0 += g;
            rowContentN += g;
          } else {
            // h=0 row shows dot, h>0 rows are blank
            rowContent0 += `\x1b[38;5;238m${cellEmptyDot}\x1b[0m`;
            rowContentN += cellEmpty;
          }
        }
      }

      for (let h = 0; h < cellHeight; h++) {
        const rowY = top + 1 + r * cellHeight + h;
        output += `\x1b[${rowY};${left}H${borderColor}║\x1b[0m`;
        output += h === 0 ? rowContent0 : rowContentN;
        output += `${borderColor}║\x1b[0m`;
      }
    }

    // Bottom border
    output += `\x1b[${top + boardDisplayHeight - 1};${left}H${borderColor}╚${'═'.repeat(BOARD_COLS * cellWidth)}╝\x1b[0m`;

    // Animate incoming counter gems falling in.
    const garbageDrop = isP1Board ? p1GarbageDrop : p2GarbageDrop;
    if (garbageDrop) {
      for (const g of garbageDrop.gems) {
        if (g.delayFrames > 0) continue;
        const row = Math.max(0, Math.min(BOARD_ROWS - 1, g.currentRow));
        const cellStr = renderGemCell({ color: g.color, type: 'counter', counterTimer: g.timer }, false, false);
        for (let h = 0; h < cellHeight; h++) {
          const y = top + 1 + row * cellHeight + h;
          const x = left + 1 + g.col * cellWidth;
          output += `\x1b[${y};${x}H${cellStr}`;
        }
      }
    }

    return output;
  }

  function renderGemCell(gem: Gem, isPowerGem: boolean, _dimmed: boolean): string {
    const color = GEM_COLORS[gem.color];

    switch (gem.type) {
      case 'normal':
        if (isPowerGem) {
          return `${color}${cellPower}\x1b[0m`;
        }
        return `${color}${cellSolid}\x1b[0m`;
      case 'crash':
        return `\x1b[1m${color}${cellCrash}\x1b[0m`;
      case 'counter': {
        const bg = COUNTER_BG_COLORS[gem.color];
        if (gem.counterTimer !== undefined) {
          const timerStr = gem.counterTimer.toString().padStart(2, ' ');
          return `\x1b[1;97m${bg}${timerStr.padEnd(cellWidth, ' ')}\x1b[0m`;
        }
        return `\x1b[1;97m${bg}${' ?'.padEnd(cellWidth, ' ')}\x1b[0m`;
      }
      case 'diamond':
        return `\x1b[1;97m${cellDiamond}\x1b[0m`;
      default:
        return `${color}${cellSolid}\x1b[0m`;
    }
  }

  function renderVSColumn(): string {
    let output = '';
    const x = vsColX;
    const y = boardTop + Math.max(2, Math.floor(boardDisplayHeight / 2) - 5);

    // Mini title marks in the center lane (arcade vibe)
    output += `\x1b[${Math.max(1, y - 2)};${x + 1}H\x1b[1;96mHYPER\x1b[0m`;
    output += `\x1b[${Math.max(1, y - 1)};${x + 1}H\x1b[1;95mFIGHT\x1b[0m`;

    // VS title
    output += `\x1b[${y};${x + 2}H\x1b[1;93mVS\x1b[0m`;

    // Player 1 portrait (character-specific)
    const p1Lines = p1Character.portraits[p1Pose];
    output += renderPortrait(p1Lines, x, y + 2, themeColor);

    // Player 2 portrait (character-specific)
    const p2Lines = p2Character.portraits[p2Pose];
    output += renderPortrait(p2Lines, x, y + 6, '\x1b[91m');

    // Energy bar (attack charge based on current chain)
    const maxEnergy = 10;
    const p1Energy = p1ChainCount * 3 + p1TotalCleared;
    output += renderEnergyBar(x + 8, y + 2, p1Energy, maxEnergy);

    return output;
  }

  // ============================================================================
  // Header / Footer / Side Panels
  // ============================================================================

  function renderHeaderBar(): string {
    const cols = terminal.cols;
    let output = '';
    // Row 1: dark background bar
    const leftText = ' HYPER FIGHTER';
    const rightText = `${p1Character.name} vs ${p2Character.name} [${selectedDifficulty.name}] `;
    const padLen = Math.max(0, cols - leftText.length - rightText.length);
    const row1 = leftText + ' '.repeat(padLen) + rightText;
    output += `\x1b[1;1H\x1b[1;97m\x1b[48;5;236m${row1.slice(0, cols).padEnd(cols, ' ')}\x1b[0m`;
    // Row 2: separator
    output += `\x1b[2;1H\x1b[38;5;240m${'─'.repeat(cols)}\x1b[0m`;
    return output;
  }

  function renderFooterBar(): string {
    const cols = terminal.cols;
    const rows = terminal.rows;
    let output = '';
    // Separator line
    output += `\x1b[${rows - 1};1H\x1b[38;5;240m${'─'.repeat(cols)}\x1b[0m`;
    // Controls text centered
    const controls = '←→ Move  ↑/W Rotate  Z CCW  ↓/S Soft  Space Drop  ESC Pause';
    const cx = Math.max(1, Math.floor((cols - controls.length) / 2) + 1);
    output += `\x1b[${rows};${cx}H\x1b[2m\x1b[90m${controls}\x1b[0m`;
    return output;
  }

  function renderMiniBar(value: number, max: number, width: number, fillColor: string): string {
    const filled = Math.min(width, Math.round((value / Math.max(1, max)) * width));
    const empty = width - filled;
    return `${fillColor}${'■'.repeat(filled)}\x1b[38;5;238m${'·'.repeat(empty)}\x1b[0m`;
  }

  function renderSidePanel(isLeft: boolean): string {
    const player = isLeft ? p1 : p2;
    const x = isLeft ? sidePanel1X : sidePanel2X;
    const accent = isLeft ? themeColor : '\x1b[1;38;5;203m';
    const dropSpeed = isLeft ? p1DropSpeed : p2DropSpeed;
    const chainCount = isLeft ? p1ChainCount : p2ChainCount;
    let output = '';
    let y = boardTop + 1;

    // NEXT label + two gem cells
    output += `\x1b[${y};${x}H${accent}\x1b[1mNEXT\x1b[0m`;
    y++;
    if (player.nextPair) {
      output += `\x1b[${y};${x}H`;
      output += renderGemCell(player.nextPair.primary, false, false);
      output += renderGemCell(player.nextPair.secondary, false, false);
    }
    y += 2;

    // SCORE
    output += `\x1b[${y};${x}H\x1b[38;5;245mSCORE\x1b[0m`;
    y++;
    output += `\x1b[${y};${x}H${accent}${player.score.toString().padStart(7, '0')}\x1b[0m`;
    y += 2;

    // SPEED
    output += `\x1b[${y};${x}H\x1b[38;5;245mSPEED\x1b[0m`;
    y++;
    const speedPct = Math.round((BASE_DROP_SPEED / Math.max(1, dropSpeed)) * 100);
    output += `\x1b[${y};${x}H${speedPct >= 200 ? '\x1b[91m' : speedPct >= 150 ? '\x1b[93m' : '\x1b[92m'}${speedPct}%\x1b[0m `;
    output += renderMiniBar(speedPct, 300, 6, speedPct >= 200 ? '\x1b[91m' : '\x1b[92m');
    y += 2;

    // CHAIN (only during active chains)
    if (chainCount > 0) {
      output += `\x1b[${y};${x}H\x1b[38;5;245mCHAIN\x1b[0m`;
      y++;
      output += `\x1b[${y};${x}H\x1b[1;93m${chainCount}\x1b[0m`;
      y += 2;
    } else {
      y += 3;
    }

    // INCOMING
    const { levelLabel, levelColor } = getIncomingThreatLevel(player.pendingGarbage);
    output += `\x1b[${y};${x}H\x1b[38;5;245mINCOMING\x1b[0m`;
    y++;
    output += `\x1b[${y};${x}H${levelColor}${player.pendingGarbage.toString().padStart(2, '0')}\x1b[0m `;
    output += renderMiniBar(player.pendingGarbage, 10, 6, levelColor);
    y++;
    output += `\x1b[${y};${x}H${levelColor}${levelLabel}\x1b[0m`;

    return output;
  }

  // ============================================================================
  // Overlays
  // ============================================================================

  function renderPauseOverlay(): string {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);

    let output = '';

    // Dim background with "PAUSED" title
    output += `\x1b[${centerY - 3};${centerX - 4}H\x1b[1;5m${themeColor}⏸ PAUSED\x1b[0m`;

    // Menu
    output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
      centerX,
      startY: centerY - 1,
      showShortcuts: true,
    });

    return output;
  }

  function renderGameOverOverlay(): string {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);

    let output = '';

    gameOverTimer++;

    // Modal panel background to keep text readable over board/effects.
    const panelWidth = Math.min(44, Math.max(34, cols - 8));
    const panelHeight = 12;
    const panelLeft = Math.max(2, centerX - Math.floor(panelWidth / 2));
    const panelTop = Math.max(2, centerY - Math.floor(panelHeight / 2));

    for (let y = 0; y < panelHeight; y++) {
      output += `\x1b[${panelTop + y};${panelLeft}H\x1b[40m${' '.repeat(panelWidth)}\x1b[0m`;
    }
    output += `\x1b[${panelTop};${panelLeft}H${themeColor}╔${'═'.repeat(panelWidth - 2)}╗\x1b[0m`;
    for (let y = 1; y < panelHeight - 1; y++) {
      output += `\x1b[${panelTop + y};${panelLeft}H${themeColor}║\x1b[0m`;
      output += `\x1b[${panelTop + y};${panelLeft + panelWidth - 1}H${themeColor}║\x1b[0m`;
    }
    output += `\x1b[${panelTop + panelHeight - 1};${panelLeft}H${themeColor}╚${'═'.repeat(panelWidth - 2)}╝\x1b[0m`;

    // Winner announcement
    const winnerChar = winner === 1 ? p1Character : p2Character;
    const winText = winner === 1 ? `${winnerChar.name} WINS!` : `${winnerChar.name} WINS!`;
    const winColor = winner === 1 ? '\x1b[1;92m' : '\x1b[1;91m';
    const winX = Math.max(1, centerX - Math.floor(winText.length / 2));
    output += `\x1b[${panelTop + 2};${winX}H${winColor}${winText}\x1b[0m`;

    // Scores
    const scoreLine = `${p1Character.name}: ${p1.score}  |  ${p2Character.name}: ${p2.score}`;
    const sX = Math.max(1, centerX - Math.floor(scoreLine.length / 2));
    output += `\x1b[${panelTop + 4};${sX}H${themeColor}${scoreLine}\x1b[0m`;

    // Menu options
    const menuItems = [
      { label: 'RESTART', shortcut: 'R' },
      { label: 'QUIT', shortcut: 'Q' },
      { label: 'LIST GAMES', shortcut: 'L' },
      { label: 'NEXT GAME', shortcut: 'N' },
    ];

    output += renderSimpleMenu(menuItems, pauseMenuSelection, {
      centerX,
      startY: panelTop + 6,
      showShortcuts: true,
    });

    return output;
  }

  // ============================================================================
  // Input Handling
  // ============================================================================

  const keyListener = terminal.onKey(({ domEvent }: { domEvent: KeyboardEvent }) => {
    if (!running) return;
    domEvent.preventDefault();
    domEvent.stopPropagation();

    const key = domEvent.key.toLowerCase();

    switch (gameState) {
      case 'difficulty':
        handleDifficultyInput(key, domEvent);
        break;
      case 'characterSelect':
        handleCharacterSelectInput(key, domEvent);
        break;
      case 'running':
        handleGameInput(key, domEvent);
        break;
      case 'paused':
        handlePauseInput(key, domEvent);
        break;
      case 'gameOver':
        handleGameOverInput(key, domEvent);
        break;
    }
  });

  function handleDifficultyInput(key: string, domEvent: KeyboardEvent): void {
    if (domEvent.key === 'ArrowUp' || key === 'w') {
      difficultySelection = (difficultySelection - 1 + 3) % 3;
    } else if (domEvent.key === 'ArrowDown' || key === 's') {
      difficultySelection = (difficultySelection + 1) % 3;
    } else if (domEvent.key === 'Enter' || domEvent.key === ' ') {
      const diffs = ['easy', 'normal', 'hard'];
      selectedDifficulty = DIFFICULTIES[diffs[difficultySelection]];
      enterCharacterSelect();
    } else if (key === '1') {
      selectedDifficulty = DIFFICULTIES.easy;
      difficultySelection = 0;
      enterCharacterSelect();
    } else if (key === '2') {
      selectedDifficulty = DIFFICULTIES.normal;
      difficultySelection = 1;
      enterCharacterSelect();
    } else if (key === '3') {
      selectedDifficulty = DIFFICULTIES.hard;
      difficultySelection = 2;
      enterCharacterSelect();
    } else if (key === 'q') {
      cleanup();
      dispatchGameQuit(terminal);
    }
  }

  function enterCharacterSelect(): void {
    gameState = 'characterSelect';
    charGridRow = 0;
    charGridCol = 0;
  }

  function handleCharacterSelectInput(key: string, domEvent: KeyboardEvent): void {
    if (key === 'q' || key === 'escape') {
      gameState = 'difficulty';
      return;
    }

    if (domEvent.key === 'ArrowLeft' || key === 'a') {
      const row = CHAR_GRID[charGridRow];
      charGridCol = (charGridCol - 1 + row.length) % row.length;
    } else if (domEvent.key === 'ArrowRight' || key === 'd') {
      const row = CHAR_GRID[charGridRow];
      charGridCol = (charGridCol + 1) % row.length;
    } else if (domEvent.key === 'ArrowUp' || key === 'w') {
      charGridRow = (charGridRow - 1 + CHAR_GRID.length) % CHAR_GRID.length;
      charGridCol = Math.min(charGridCol, CHAR_GRID[charGridRow].length - 1);
    } else if (domEvent.key === 'ArrowDown' || key === 's') {
      charGridRow = (charGridRow + 1) % CHAR_GRID.length;
      charGridCol = Math.min(charGridCol, CHAR_GRID[charGridRow].length - 1);
    } else if (domEvent.key === 'Enter' || domEvent.key === ' ') {
      const idx = CHAR_GRID[charGridRow][charGridCol];
      p1Character = CHARACTERS[idx];
      p2Character = getRandomCharacter();
      gameState = 'running';
      initGame();
    }
  }

  function handleGameInput(key: string, domEvent: KeyboardEvent): void {
    if (key === 'escape') {
      gameState = 'paused';
      pauseMenuSelection = 0;
      return;
    }

    if (!p1.currentPair || p1Phase !== PHASE_NONE) return;

    switch (domEvent.key) {
      case 'ArrowLeft':
      case 'a':
        movePair(p1.currentPair, p1.board, -1);
        break;
      case 'ArrowRight':
      case 'd':
        movePair(p1.currentPair, p1.board, 1);
        break;
      case 'ArrowUp':
      case 'w':
        rotatePair(p1.currentPair, p1.board, true);
        break;
      case 'z':
        rotatePair(p1.currentPair, p1.board, false);
        break;
      case 'ArrowDown':
      case 's':
        if (dropPair(p1.currentPair, p1.board)) {
          p1DropTimer = 0;
        } else {
          lockAndResolve(p1, true);
        }
        break;
      case ' ':
        hardDrop(p1.currentPair, p1.board);
        lockAndResolve(p1, true);
        break;
    }
  }

  function handlePauseInput(key: string, domEvent: KeyboardEvent): void {
    if (key === 'escape') {
      gameState = 'running';
      return;
    }

    const { newSelection, confirmed } = navigateMenu(
      pauseMenuSelection,
      PAUSE_MENU_ITEMS.length,
      key,
      domEvent,
    );

    if (newSelection !== pauseMenuSelection) {
      pauseMenuSelection = newSelection;
    }

    // Check shortcuts
    const shortcutIdx = checkShortcut(PAUSE_MENU_ITEMS, key);

    if (confirmed || shortcutIdx >= 0) {
      const idx = shortcutIdx >= 0 ? shortcutIdx : pauseMenuSelection;
      const item = PAUSE_MENU_ITEMS[idx];

      switch (item.label) {
        case 'RESUME':
          gameState = 'running';
          break;
        case 'RESTART':
          gameState = 'running';
          initGame();
          break;
        case 'QUIT':
          cleanup();
          dispatchGameQuit(terminal);
          break;
        case 'LIST GAMES':
          cleanup();
          dispatchGamesMenu(terminal);
          break;
        case 'NEXT GAME':
          cleanup();
          dispatchGameSwitch(terminal);
          break;
      }
    }
  }

  function handleGameOverInput(key: string, domEvent: KeyboardEvent): void {
    const menuItems = [
      { label: 'RESTART', shortcut: 'R' },
      { label: 'QUIT', shortcut: 'Q' },
      { label: 'LIST GAMES', shortcut: 'L' },
      { label: 'NEXT GAME', shortcut: 'N' },
    ];

    const { newSelection, confirmed } = navigateMenu(
      pauseMenuSelection,
      menuItems.length,
      key,
      domEvent,
    );

    if (newSelection !== pauseMenuSelection) {
      pauseMenuSelection = newSelection;
    }

    const shortcutIdx = checkShortcut(menuItems, key);

    if (confirmed || shortcutIdx >= 0) {
      const idx = shortcutIdx >= 0 ? shortcutIdx : pauseMenuSelection;

      switch (menuItems[idx].label) {
        case 'RESTART':
          gameState = 'difficulty';
          pauseMenuSelection = 0;
          break;
        case 'QUIT':
          cleanup();
          dispatchGameQuit(terminal);
          break;
        case 'LIST GAMES':
          cleanup();
          dispatchGamesMenu(terminal);
          break;
        case 'NEXT GAME':
          cleanup();
          dispatchGameSwitch(terminal);
          break;
      }
    }
  }

  // ============================================================================
  // Resize
  // ============================================================================

  const resizeListener = terminal.onResize(() => {
    calculateLayout();
  });

  // ============================================================================
  // Lifecycle
  // ============================================================================

  function cleanup(): void {
    running = false;
    clearInterval(gameLoop);
    keyListener.dispose();
    resizeListener.dispose();
  }

  // Enter alternate buffer
  enterAlternateBuffer(terminal, 'hyper-fighter');

  // Start game loop
  const gameLoop = setInterval(() => {
    if (!running) {
      clearInterval(gameLoop);
      return;
    }
    update();
    render();
  }, TICK_MS);

  // Override stop to include cleanup
  const originalStop = controller.stop;
  controller.stop = () => {
    cleanup();
    exitAlternateBuffer(terminal, 'hyper-fighter');
    originalStop();
  };

  return controller;
}
