/**
 * Hyper 2048
 *
 * Slide and merge DATA PACKETS to reach TERABYTE (2048).
 * Cyberpunk-themed with glitchy effects and theme-aware colors.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';
import { slide as slideLogic, canMakeMove, hasReachedTarget } from './slideLogic';

/**
 * 2048 Game Controller
 */
export interface Game2048Controller {
  stop: () => void;
  isRunning: boolean;
}

// ============================================================================
// TYPES
// ============================================================================

interface Particle {
  x: number;
  y: number;
  char: string;
  color: string;
  vx: number;
  vy: number;
  life: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  frames: number;
  color: string;
}

interface UndoState {
  grid: number[][];
  score: number;
}

// ============================================================================
// TILE COLORS AND NAMES (Cyberpunk Data Theme)
// ============================================================================

const TILE_COLORS: Record<number, string> = {
  2: '\x1b[38;5;252m',      // Light gray - BIT
  4: '\x1b[38;5;159m',      // Light cyan - BYTE
  8: '\x1b[38;5;51m',       // Cyan - WORD
  16: '\x1b[38;5;45m',      // Blue-cyan - BLOCK
  32: '\x1b[38;5;39m',      // Blue - SECTOR
  64: '\x1b[38;5;33m',      // Deep blue - CLUSTER
  128: '\x1b[38;5;171m',    // Purple - SEGMENT
  256: '\x1b[38;5;207m',    // Magenta - PACKET
  512: '\x1b[38;5;213m',    // Pink - FRAME
  1024: '\x1b[38;5;220m',   // Gold - GIGABYTE
  2048: '\x1b[38;5;226m',   // Bright gold - TERABYTE
  4096: '\x1b[38;5;196m',   // Red - PETABYTE
  8192: '\x1b[38;5;201m',   // Hot pink - EXABYTE
};

const TILE_NAMES: Record<number, string> = {
  2: 'BIT',
  4: 'BYTE',
  8: 'WORD',
  16: 'BLOCK',
  32: 'SECTOR',
  64: 'CLUSTER',
  128: 'SEGMENT',
  256: 'PACKET',
  512: 'FRAME',
  1024: 'GIGA',
  2048: 'TERA',
  4096: 'PETA',
  8192: 'EXA',
};

const TILE_BG_COLORS: Record<number, string> = {
  2: '\x1b[48;5;236m',
  4: '\x1b[48;5;23m',
  8: '\x1b[48;5;24m',
  16: '\x1b[48;5;25m',
  32: '\x1b[48;5;26m',
  64: '\x1b[48;5;27m',
  128: '\x1b[48;5;53m',
  256: '\x1b[48;5;90m',
  512: '\x1b[48;5;127m',
  1024: '\x1b[48;5;136m',
  2048: '\x1b[48;5;178m',
  4096: '\x1b[48;5;160m',
  8192: '\x1b[48;5;198m',
};

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function run2048Game(terminal: Terminal): Game2048Controller {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const MIN_COLS = 36;
  const MIN_ROWS = 16;
  const GRID_SIZE = 4;
  const TILE_WIDTH = 8;
  const TILE_HEIGHT = 3;
  const GAME_WIDTH = GRID_SIZE * TILE_WIDTH + 2;
  const GAME_HEIGHT = GRID_SIZE * TILE_HEIGHT + 2;
  const MAX_UNDOS = 3;

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let won = false;
  let continuedAfterWin = false;
  let score = 0;
  let highScore = 0;

  let grid: number[][] = [];
  let undoStack: UndoState[] = [];
  let undosRemaining = MAX_UNDOS;

  let gameLeft = 2;
  let gameTop = 4;

  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: Game2048Controller = {
    stop: () => {
      if (!running) return;
      running = false;
    },
    get isRunning() { return running; }
  };

  // -------------------------------------------------------------------------
  // ASCII ART TITLE
  // -------------------------------------------------------------------------
  const title = [
    '\u2588 \u2588 \u2588\u2584\u2588 \u2588\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580\u2588   \u2582\u2580\u2580\u2588 \u2580\u2580\u2588 \u2584 \u2588\u2580\u2580 \u2580\u2588\u2580',
    '\u2588\u2580\u2588  \u2588  \u2588\u2580\u2580 \u2588\u2588\u2584 \u2588\u2580\u2584   \u2584\u2580\u2580\u2584 \u2580\u2580\u2584 \u2588\u2580\u2584 \u2588\u2588\u2584  \u2588 ',
  ];

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['\u2726', '\u2605', '\u25C6', '\u25CF']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.3 + Math.random() * 0.5;
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 12 + Math.floor(Math.random() * 8),
      });
    }
  }

  function spawnMergeParticles(gridX: number, gridY: number, value: number) {
    const screenX = gridX * TILE_WIDTH + TILE_WIDTH / 2;
    const screenY = gridY * TILE_HEIGHT + TILE_HEIGHT / 2;
    const color = TILE_COLORS[value] || '\x1b[97m';
    const dataChars = ['\u2588', '\u2593', '\u2592', '\u2591', '\u25A0', '\u25A1'];
    spawnParticles(screenX, screenY, 8, color, dataChars);
  }

  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 20, color });
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  // -------------------------------------------------------------------------
  // GRID HELPERS
  // -------------------------------------------------------------------------

  function createEmptyGrid(): number[][] {
    return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  }

  function copyGrid(g: number[][]): number[][] {
    return g.map(row => [...row]);
  }

  function getEmptyCells(): [number, number][] {
    const empty: [number, number][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 0) {
          empty.push([x, y]);
        }
      }
    }
    return empty;
  }

  function spawnTile() {
    const empty = getEmptyCells();
    if (empty.length === 0) return;
    const [x, y] = empty[Math.floor(Math.random() * empty.length)];
    grid[y][x] = Math.random() < 0.9 ? 2 : 4;
  }

  // Use imported canMakeMove
  function canMove(): boolean {
    return canMakeMove(grid);
  }

  // Use imported hasReachedTarget
  function has2048(): boolean {
    return hasReachedTarget(grid, 2048);
  }

  // -------------------------------------------------------------------------
  // MOVE LOGIC
  // -------------------------------------------------------------------------

  function saveState() {
    if (undoStack.length >= MAX_UNDOS) {
      undoStack.shift();
    }
    undoStack.push({
      grid: copyGrid(grid),
      score: score,
    });
  }

  function undo() {
    if (undoStack.length === 0 || undosRemaining <= 0) return false;
    const state = undoStack.pop()!;
    grid = state.grid;
    score = state.score;
    undosRemaining--;
    gameOver = false;
    won = false;
    return true;
  }

  // Use imported slideLogic with GRID_SIZE
  function slide(row: number[]) {
    return slideLogic(row, GRID_SIZE);
  }

  function move(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    let totalMergeScore = 0;
    let anyMoved = false;

    if (direction === 'left') {
      for (let y = 0; y < GRID_SIZE; y++) {
        const { result, merged, moved, mergeScore } = slide(grid[y]);
        if (moved) anyMoved = true;
        totalMergeScore += mergeScore;
        for (let x = 0; x < GRID_SIZE; x++) {
          if (merged[x] && result[x] > 0) {
            spawnMergeParticles(x, y, result[x]);
            addScorePopup(x * TILE_WIDTH + TILE_WIDTH / 2, y * TILE_HEIGHT + 1, `+${result[x]}`, TILE_COLORS[result[x]]);
          }
        }
        grid[y] = result;
      }
    } else if (direction === 'right') {
      for (let y = 0; y < GRID_SIZE; y++) {
        const reversed = [...grid[y]].reverse();
        const { result, merged, moved, mergeScore } = slide(reversed);
        if (moved) anyMoved = true;
        totalMergeScore += mergeScore;
        const finalRow = result.reverse();
        const finalMerged = merged.reverse();
        for (let x = 0; x < GRID_SIZE; x++) {
          if (finalMerged[x] && finalRow[x] > 0) {
            spawnMergeParticles(x, y, finalRow[x]);
            addScorePopup(x * TILE_WIDTH + TILE_WIDTH / 2, y * TILE_HEIGHT + 1, `+${finalRow[x]}`, TILE_COLORS[finalRow[x]]);
          }
        }
        grid[y] = finalRow;
      }
    } else if (direction === 'up') {
      for (let x = 0; x < GRID_SIZE; x++) {
        const col = [];
        for (let y = 0; y < GRID_SIZE; y++) col.push(grid[y][x]);
        const { result, merged, moved, mergeScore } = slide(col);
        if (moved) anyMoved = true;
        totalMergeScore += mergeScore;
        for (let y = 0; y < GRID_SIZE; y++) {
          if (merged[y] && result[y] > 0) {
            spawnMergeParticles(x, y, result[y]);
            addScorePopup(x * TILE_WIDTH + TILE_WIDTH / 2, y * TILE_HEIGHT + 1, `+${result[y]}`, TILE_COLORS[result[y]]);
          }
          grid[y][x] = result[y];
        }
      }
    } else if (direction === 'down') {
      for (let x = 0; x < GRID_SIZE; x++) {
        const col = [];
        for (let y = 0; y < GRID_SIZE; y++) col.push(grid[y][x]);
        const reversed = col.reverse();
        const { result, merged, moved, mergeScore } = slide(reversed);
        if (moved) anyMoved = true;
        totalMergeScore += mergeScore;
        const finalCol = result.reverse();
        const finalMerged = merged.reverse();
        for (let y = 0; y < GRID_SIZE; y++) {
          if (finalMerged[y] && finalCol[y] > 0) {
            spawnMergeParticles(x, y, finalCol[y]);
            addScorePopup(x * TILE_WIDTH + TILE_WIDTH / 2, y * TILE_HEIGHT + 1, `+${finalCol[y]}`, TILE_COLORS[finalCol[y]]);
          }
          grid[y][x] = finalCol[y];
        }
      }
    }

    if (anyMoved) {
      score += totalMergeScore;
      if (totalMergeScore > 0) {
        triggerShake(4, 1);
      }
      spawnTile();

      if (!won && !continuedAfterWin && has2048()) {
        won = true;
        if (score > highScore) highScore = score;
        triggerShake(8, 2);
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === 2048) {
              spawnMergeParticles(x, y, 2048);
              spawnMergeParticles(x, y, 2048);
            }
          }
        }
      }

      if (!canMove()) {
        gameOver = true;
        if (score > highScore) highScore = score;
      }

      return true;
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // GAME LOGIC
  // -------------------------------------------------------------------------

  function initGame() {
    grid = createEmptyGrid();
    score = 0;
    gameOver = false;
    won = false;
    continuedAfterWin = false;
    paused = false;
    undoStack = [];
    undosRemaining = MAX_UNDOS;

    particles = [];
    scorePopups = [];
    shakeFrames = 0;

    spawnTile();
    spawnTile();
  }

  function update() {
    if (!gameStarted || (gameOver && !won) || paused) return;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const popup = scorePopups[i];
      popup.y -= 0.2;
      popup.frames--;
      if (popup.frames <= 0) scorePopups.splice(i, 1);
    }
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function renderTile(value: number, screenX: number, screenY: number): string {
    if (value === 0) {
      let output = '';
      const emptyChar = '\u2591';
      for (let row = 0; row < TILE_HEIGHT; row++) {
        output += `\x1b[${screenY + row};${screenX}H\x1b[38;5;238m`;
        for (let col = 0; col < TILE_WIDTH; col++) {
          output += emptyChar;
        }
        output += '\x1b[0m';
      }
      return output;
    }

    const color = TILE_COLORS[value] || '\x1b[97m';
    const bgColor = TILE_BG_COLORS[value] || '\x1b[48;5;240m';
    const name = TILE_NAMES[value] || value.toString();

    let output = '';

    output += `\x1b[${screenY};${screenX}H${bgColor}${color}`;
    output += '\u2584'.repeat(TILE_WIDTH);
    output += '\x1b[0m';

    output += `\x1b[${screenY + 1};${screenX}H${bgColor}${color}\x1b[1m`;
    const displayText = name.length <= TILE_WIDTH - 2 ? name : value.toString();
    const padding = Math.floor((TILE_WIDTH - displayText.length) / 2);
    output += ' '.repeat(padding) + displayText + ' '.repeat(TILE_WIDTH - padding - displayText.length);
    output += '\x1b[0m';

    output += `\x1b[${screenY + 2};${screenX}H${bgColor}${color}`;
    output += '\u2580'.repeat(TILE_WIDTH);
    output += '\x1b[0m';

    return output;
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    if (shakeFrames > 0) shakeFrames--;

    const cols = terminal.cols;
    const rows = terminal.rows;

    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      let hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider ->' : 'Make pane taller v';
      const msg2 = `Need: ${MIN_COLS}x${MIN_ROWS}  Have: ${cols}x${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH) / 2));
    gameTop = Math.max(4, Math.floor((rows - GAME_HEIGHT - 6) / 2));

    let renderLeft = gameLeft;
    let renderTop = gameTop;
    if (shakeFrames > 0) {
      renderLeft += Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      renderTop += Math.floor((Math.random() - 0.5) * shakeIntensity);
    }

    glitchFrame = (glitchFrame + 1) % 60;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

    if (glitchFrame >= 55 && glitchFrame < 58) {
      output += `\x1b[1;${titleX}H\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    const stats = `SCORE: ${score.toString().padStart(6, '0')}  HIGH: ${highScore.toString().padStart(6, '0')}  UNDO: ${undosRemaining}/${MAX_UNDOS}`;
    const statsX = Math.floor((cols - stats.length) / 2);
    output += `\x1b[${gameTop - 1};${statsX}H${themeColor}${stats}\x1b[0m`;

    const borderWidth = GAME_WIDTH;
    output += `\x1b[${renderTop};${renderLeft}H${themeColor}\u2554${'\u2550'.repeat(borderWidth)}\u2557\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT - 2; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${themeColor}\u2551\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + borderWidth + 1}H${themeColor}\u2551\x1b[0m`;
    }
    output += `\x1b[${renderTop + GAME_HEIGHT - 1};${renderLeft}H${themeColor}\u255A${'\u2550'.repeat(borderWidth)}\u255D\x1b[0m`;

    if (paused) {
      const pauseMsg = '\u2550\u2550 PAUSED \u2550\u2550';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseY = gameTop + Math.floor(GAME_HEIGHT / 2) - 3;
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: pauseCenterX,
        startY: pauseY + 2,
        showShortcuts: false,
      });

      const navHint = 'Up/Down select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    }
    else if (!gameStarted) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const tileX = renderLeft + 1 + gx * TILE_WIDTH;
          const tileY = renderTop + 1 + gy * TILE_HEIGHT;
          output += renderTile(0, tileX, tileY);
        }
      }

      const startMsg = '[ PRESS ANY KEY TO PLAY ]';
      const startX = Math.floor((cols - startMsg.length) / 2);
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = 'Arrow Keys: SLIDE  U: UNDO  ESC: MENU';
      const ctrlX = Math.floor((cols - controls.length) / 2);
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

      const goal = 'MERGE DATA PACKETS TO REACH TERABYTE (2048)';
      const goalX = Math.floor((cols - goal.length) / 2);
      output += `\x1b[${startY + 4};${goalX}H\x1b[2m${themeColor}${goal}\x1b[0m`;
    }
    else if (won && !continuedAfterWin) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const tileX = renderLeft + 1 + gx * TILE_WIDTH;
          const tileY = renderTop + 1 + gy * TILE_HEIGHT;
          output += renderTile(grid[gy][gx], tileX, tileY);
        }
      }

      const winBox = [
        '\u2554\u2550\u2550 TERABYTE ACHIEVED! \u2550\u2550\u2557',
        '\u2551                       \u2551',
        '\u2551  [C] CONTINUE PLAYING \u2551',
        '\u2551  [R] NEW GAME         \u2551',
        '\u2551  [Q] QUIT             \u2551',
        '\u2551                       \u2551',
        '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D',
      ];
      const boxWidth = winBox[0].length;
      const boxX = Math.floor((cols - boxWidth) / 2);
      const boxY = gameTop + Math.floor(GAME_HEIGHT / 2) - 3;

      for (let i = 0; i < winBox.length; i++) {
        const lineColor = i === 0 ? '\x1b[1;92m' : themeColor;
        output += `\x1b[${boxY + i};${boxX}H${lineColor}${winBox[i]}\x1b[0m`;
      }
    }
    else if (gameOver) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const tileX = renderLeft + 1 + gx * TILE_WIDTH;
          const tileY = renderTop + 1 + gy * TILE_HEIGHT;
          output += renderTile(grid[gy][gx], tileX, tileY);
        }
      }

      const overMsg = '\u2554\u2550\u2550 SYSTEM CRASH \u2550\u2550\u2557';
      const overX = Math.floor((cols - overMsg.length) / 2);
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
      output += `\x1b[${overY};${overX}H\x1b[1;91m${overMsg}\x1b[0m`;

      const scoreLine = `SCORE: ${score}  HIGH: ${highScore}`;
      const scoreX = Math.floor((cols - scoreLine.length) / 2);
      output += `\x1b[${overY + 2};${scoreX}H${themeColor}${scoreLine}\x1b[0m`;

      const undoHint = undosRemaining > 0 ? '  [U] UNDO' : '';
      const restart = `\u255A [R] RESTART  [Q] QUIT${undoHint} \u255D`;
      const restartX = Math.floor((cols - restart.length) / 2);
      output += `\x1b[${overY + 4};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    }
    else {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          const tileX = renderLeft + 1 + gx * TILE_WIDTH;
          const tileY = renderTop + 1 + gy * TILE_HEIGHT;
          output += renderTile(grid[gy][gx], tileX, tileY);
        }
      }

      for (const p of particles) {
        const screenX = Math.round(renderLeft + 1 + p.x);
        const screenY = Math.round(renderTop + 1 + p.y);
        if (screenX > renderLeft && screenX < renderLeft + GAME_WIDTH &&
            screenY > renderTop && screenY < renderTop + GAME_HEIGHT) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      for (const popup of scorePopups) {
        const screenX = Math.round(renderLeft + 1 + popup.x);
        const screenY = Math.round(renderTop + 1 + popup.y);
        if (screenY > renderTop && screenY < renderTop + GAME_HEIGHT) {
          const alpha = popup.frames > 12 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }
    }

    const hint = gameStarted && !gameOver && !paused && !won
      ? `Arrows: SLIDE  U: UNDO(${undosRemaining})  ESC: MENU`
      : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${gameTop + GAME_HEIGHT + 1};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  // -------------------------------------------------------------------------
  // GAME LOOP
  // -------------------------------------------------------------------------

  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h');
    terminal.write('\x1b[?25l');

    initGame();
    gameStarted = false;

    const renderInterval = setInterval(() => {
      if (!running) { clearInterval(renderInterval); return; }
      render();
    }, 25);

    const gameInterval = setInterval(() => {
      if (!running) { clearInterval(gameInterval); return; }
      update();
    }, 25);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) { keyListener.dispose(); return; }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key.toLowerCase();

      if (key === 'escape') {
        if (won && !continuedAfterWin) return;
        paused = !paused;
        if (paused) pauseMenuSelection = 0;
        return;
      }

      if (key === 'q' && (paused || gameOver || !gameStarted || (won && !continuedAfterWin))) {
        clearInterval(renderInterval);
        clearInterval(gameInterval);
        controller.stop();
        dispatchGameQuit(terminal);
        return;
      }

      if (!gameStarted && !paused) {
        saveState();
        gameStarted = true;
        return;
      }

      if (won && !continuedAfterWin) {
        if (key === 'c') {
          continuedAfterWin = true;
          won = false;
          return;
        }
        if (key === 'r') {
          if (score > highScore) highScore = score;
          initGame();
          gameStarted = true;
          return;
        }
        return;
      }

      if (gameOver) {
        if (key === 'r') {
          if (score > highScore) highScore = score;
          initGame();
          gameStarted = true;
        } else if (key === 'u') {
          undo();
        }
        return;
      }

      if (paused) {
        const { newSelection, confirmed } = navigateMenu(
          pauseMenuSelection,
          PAUSE_MENU_ITEMS.length,
          key,
          domEvent
        );

        if (newSelection !== pauseMenuSelection) {
          pauseMenuSelection = newSelection;
          return;
        }

        if (confirmed) {
          switch (pauseMenuSelection) {
            case 0: paused = false; break;
            case 1: initGame(); gameStarted = true; paused = false; break;
            case 2:
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              controller.stop();
              dispatchGameQuit(terminal);
              break;
            case 3:
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              running = false;
              dispatchGamesMenu(terminal);
              break;
            case 4:
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              running = false;
              dispatchGameSwitch(terminal);
              break;
          }
          return;
        }

        if (key === 'r') { initGame(); gameStarted = true; paused = false; }
        else if (key === 'l') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGamesMenu(terminal); }
        else if (key === 'n') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGameSwitch(terminal); }
        return;
      }

      switch (domEvent.key) {
        case 'ArrowLeft':
        case 'a':
          saveState();
          move('left');
          break;
        case 'ArrowRight':
        case 'd':
          saveState();
          move('right');
          break;
        case 'ArrowUp':
        case 'w':
          saveState();
          move('up');
          break;
        case 'ArrowDown':
        case 's':
          saveState();
          move('down');
          break;
        case 'u':
        case 'U':
          undo();
          break;
      }
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      keyListener.dispose();
      originalStop();
    };
  }, 50);

  return controller;
}
