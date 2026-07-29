/**
 * Hyper Minesweeper
 *
 * Cyberpunk minesweeper - "defuse the malware grid".
 * Navigate the grid, flag malware, reveal safe sectors.
 * Theme-aware with glitchy effects and particle systems.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Minesweeper Game Controller
 */
export interface MinesweeperController {
  stop: () => void;
  isRunning: boolean;
}

// ============================================================================
// TYPES
// ============================================================================

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

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

interface Difficulty {
  name: string;
  width: number;
  height: number;
  mines: number;
  minCols: number;
  minRows: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DIFFICULTIES: Difficulty[] = [
  { name: 'EASY', width: 9, height: 9, mines: 10, minCols: 32, minRows: 16 },
  { name: 'MEDIUM', width: 16, height: 16, mines: 40, minCols: 44, minRows: 20 },
  { name: 'HARD', width: 20, height: 16, mines: 60, minCols: 54, minRows: 20 },
];

// Cell display characters
const CELL_HIDDEN = '[]';
const CELL_FLAG = '<>';
const CELL_MINE = '@@';
const CELL_EMPTY = '  ';

// Number colors (1-8)
const NUMBER_COLORS = [
  '',           // 0 - not used
  '\x1b[96m',   // 1 - cyan
  '\x1b[92m',   // 2 - green
  '\x1b[91m',   // 3 - red
  '\x1b[94m',   // 4 - blue
  '\x1b[95m',   // 5 - magenta
  '\x1b[36m',   // 6 - dark cyan
  '\x1b[97m',   // 7 - white
  '\x1b[90m',   // 8 - gray
];

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runMinesweeperGame(terminal: Terminal): MinesweeperController {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let won = false;
  let firstClick = true;

  // Difficulty
  let difficultyIndex = 0;
  let difficulty = DIFFICULTIES[difficultyIndex];
  let selectingDifficulty = true;
  let difficultySelection = 0;

  // Grid
  let grid: Cell[][] = [];
  let cursorX = 0;
  let cursorY = 0;

  // Stats
  let flagsPlaced = 0;
  let cellsRevealed = 0;
  let startTime = 0;
  let elapsedTime = 0;

  // Visual effects
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let scanLineY = -1;
  let scanLineFrames = 0;

  // Positioning
  let gameLeft = 2;
  let gameTop = 4;

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: MinesweeperController = {
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
    '█▄ ▄█ █ █▄ █ █▀▀ █▀▀ █ █ █ █▀▀ █▀▀ █▀█ █▀▀ █▀█',
    '█ ▀ █ █ █ ▀█ ██▄ ▄▄█ ▀▄▀▄▀ ██▄ ██▄ █▀▀ ██▄ █▀▄',
  ];

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['*', '+', '.', 'o']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.2 + Math.random() * 0.4;
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 10 + Math.floor(Math.random() * 8),
      });
    }
  }

  function spawnExplosion(x: number, y: number) {
    // Big explosion for mine hit
    const colors = ['\x1b[1;91m', '\x1b[1;93m', '\x1b[1;97m'];
    const chars = ['*', '#', '@', '%', '!', 'X'];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 0.3 + Math.random() * 0.5;
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5 - 0.2,
        life: 15 + Math.floor(Math.random() * 10),
      });
    }
  }

  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 20, color });
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  // -------------------------------------------------------------------------
  // GRID GENERATION
  // -------------------------------------------------------------------------

  function createEmptyGrid(): Cell[][] {
    const newGrid: Cell[][] = [];
    for (let y = 0; y < difficulty.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < difficulty.width; x++) {
        row.push({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        });
      }
      newGrid.push(row);
    }
    return newGrid;
  }

  function placeMines(safeX: number, safeY: number) {
    // Place mines avoiding the first clicked cell and its neighbors
    let minesPlaced = 0;
    while (minesPlaced < difficulty.mines) {
      const x = Math.floor(Math.random() * difficulty.width);
      const y = Math.floor(Math.random() * difficulty.height);

      // Skip if already a mine
      if (grid[y][x].isMine) continue;

      // Skip if within safe zone (3x3 around first click)
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;

      grid[y][x].isMine = true;
      minesPlaced++;
    }

    // Calculate adjacent mine counts
    for (let y = 0; y < difficulty.height; y++) {
      for (let x = 0; x < difficulty.width; x++) {
        if (!grid[y][x].isMine) {
          grid[y][x].adjacentMines = countAdjacentMines(x, y);
        }
      }
    }
  }

  function countAdjacentMines(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < difficulty.width && ny >= 0 && ny < difficulty.height) {
          if (grid[ny][nx].isMine) count++;
        }
      }
    }
    return count;
  }

  // -------------------------------------------------------------------------
  // GAME LOGIC
  // -------------------------------------------------------------------------

  function initGame() {
    difficulty = DIFFICULTIES[difficultyIndex];
    grid = createEmptyGrid();
    cursorX = Math.floor(difficulty.width / 2);
    cursorY = Math.floor(difficulty.height / 2);
    flagsPlaced = 0;
    cellsRevealed = 0;
    startTime = 0;
    elapsedTime = 0;
    gameOver = false;
    won = false;
    paused = false;
    firstClick = true;

    // Reset effects
    particles = [];
    scorePopups = [];
    shakeFrames = 0;
    scanLineY = -1;
    scanLineFrames = 0;
  }

  function revealCell(x: number, y: number, isChain = false) {
    if (x < 0 || x >= difficulty.width || y < 0 || y >= difficulty.height) return;
    const cell = grid[y][x];
    if (cell.isRevealed || cell.isFlagged) return;

    // First click - place mines avoiding this cell
    if (firstClick) {
      placeMines(x, y);
      firstClick = false;
      startTime = Date.now();

      // Start scan line effect
      scanLineY = 0;
      scanLineFrames = 40;
    }

    cell.isRevealed = true;
    cellsRevealed++;

    // Hit a mine!
    if (cell.isMine) {
      gameOver = true;
      won = false;
      triggerShake(25, 4);
      spawnExplosion(x * 2 + 1, y);
      addScorePopup(x * 2, y - 1, 'MALWARE!', '\x1b[1;91m');
      revealAllMines();
      return;
    }

    // Spawn reveal particles
    if (!isChain) {
      spawnParticles(x * 2 + 1, y, 4, themeColor, ['.', '*', '+']);
    }

    // If empty cell, flood fill reveal
    if (cell.adjacentMines === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx !== 0 || dy !== 0) {
            // Add small delay for cascade effect
            setTimeout(() => {
              if (running && !gameOver) {
                revealCell(x + dx, y + dy, true);
              }
            }, 20);
          }
        }
      }
    }

    checkWin();
  }

  function toggleFlag(x: number, y: number) {
    const cell = grid[y][x];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
      flagsPlaced++;
      spawnParticles(x * 2 + 1, y, 3, '\x1b[1;93m', ['!', '^', '*']);
    } else {
      flagsPlaced--;
    }
  }

  function revealAllMines() {
    for (let y = 0; y < difficulty.height; y++) {
      for (let x = 0; x < difficulty.width; x++) {
        if (grid[y][x].isMine) {
          grid[y][x].isRevealed = true;
        }
      }
    }
  }

  function checkWin() {
    // Win if all non-mine cells are revealed
    const totalNonMines = difficulty.width * difficulty.height - difficulty.mines;
    if (cellsRevealed >= totalNonMines) {
      gameOver = true;
      won = true;
      triggerShake(10, 2);

      // Victory particles
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * difficulty.width);
        const y = Math.floor(Math.random() * difficulty.height);
        spawnParticles(x * 2 + 1, y, 6, '\x1b[1;92m', ['*', '+', '#']);
      }
      addScorePopup(difficulty.width, difficulty.height / 2, 'GRID SECURE!', '\x1b[1;92m');
    }
  }

  function update() {
    if (!gameStarted || gameOver || paused || selectingDifficulty) return;

    // Update timer
    if (startTime > 0 && !gameOver) {
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const popup = scorePopups[i];
      popup.y -= 0.2;
      popup.frames--;
      if (popup.frames <= 0) scorePopups.splice(i, 1);
    }

    // Update scan line
    if (scanLineFrames > 0) {
      scanLineFrames--;
      scanLineY = Math.floor((40 - scanLineFrames) / 40 * difficulty.height);
      if (scanLineFrames <= 0) {
        scanLineY = -1;
      }
    }
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Effect timers
    if (shakeFrames > 0) shakeFrames--;

    const cols = terminal.cols;
    const rows = terminal.rows;

    const currentDifficulty = DIFFICULTIES[selectingDifficulty ? difficultySelection : difficultyIndex];
    const minCols = currentDifficulty.minCols;
    const minRows = currentDifficulty.minRows;

    // Check minimum terminal size
    if (cols < minCols || rows < minRows) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < minCols;
      const needHeight = rows < minRows;
      let hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider' : 'Make pane taller';
      const msg2 = `Need: ${minCols}x${minRows}  Have: ${cols}x${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Calculate game area dimensions
    const gridWidth = difficulty.width * 2 + 2;
    const gridHeight = difficulty.height + 2;

    // Center game area
    gameLeft = Math.max(2, Math.floor((cols - gridWidth) / 2));
    gameTop = Math.max(4, Math.floor((rows - gridHeight - 6) / 2) + 3);

    // Apply screen shake
    let renderLeft = gameLeft;
    let renderTop = gameTop;
    if (shakeFrames > 0) {
      renderLeft += Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      renderTop += Math.floor((Math.random() - 0.5) * shakeIntensity);
    }

    // Glitch title
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

    // DIFFICULTY SELECTION SCREEN
    if (selectingDifficulty) {
      const selectY = Math.floor(rows / 2) - 3;
      const selectMsg = '[ SELECT DIFFICULTY ]';
      const selectX = Math.floor((cols - selectMsg.length) / 2);
      output += `\x1b[${selectY};${selectX}H${themeColor}\x1b[1m${selectMsg}\x1b[0m`;

      for (let i = 0; i < DIFFICULTIES.length; i++) {
        const d = DIFFICULTIES[i];
        const isSelected = i === difficultySelection;
        const label = `${d.name} (${d.width}x${d.height}, ${d.mines} malware)`;
        const labelX = Math.floor((cols - label.length - 4) / 2);
        const style = isSelected ? '\x1b[1;93m' : `\x1b[2m${themeColor}`;
        const prefix = isSelected ? ' >' : '  ';
        const suffix = isSelected ? '< ' : '  ';
        output += `\x1b[${selectY + 2 + i};${labelX}H${style}${prefix}${label}${suffix}\x1b[0m`;
      }

      const hint = 'Arrow keys to select, ENTER to confirm';
      const hintX = Math.floor((cols - hint.length) / 2);
      output += `\x1b[${selectY + 6};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

      terminal.write(output);
      return;
    }

    // Stats bar
    const minesLeft = difficulty.mines - flagsPlaced;
    const timeStr = formatTime(elapsedTime);
    const stats = `MALWARE: ${minesLeft.toString().padStart(3, ' ')}  TIME: ${timeStr}  [${difficulty.name}]`;
    const statsX = Math.floor((cols - stats.length) / 2);
    output += `\x1b[${renderTop - 1};${statsX}H${themeColor}${stats}\x1b[0m`;

    // Grid border
    const borderColor = gameOver && !won ? '\x1b[1;91m' : themeColor;
    output += `\x1b[${renderTop};${renderLeft}H${borderColor}+${'-'.repeat(difficulty.width * 2)}+\x1b[0m`;
    for (let y = 0; y < difficulty.height; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${borderColor}|\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + difficulty.width * 2 + 1}H${borderColor}|\x1b[0m`;
    }
    output += `\x1b[${renderTop + difficulty.height + 1};${renderLeft}H${borderColor}+${'-'.repeat(difficulty.width * 2)}+\x1b[0m`;

    // PAUSE MENU
    if (paused) {
      const pauseMsg = '== PAUSED ==';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseY = Math.floor(rows / 2) - 3;
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: pauseCenterX,
        startY: pauseY + 2,
        showShortcuts: false,
      });

      const navHint = 'Arrow keys select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    }
    // START SCREEN
    else if (!gameStarted) {
      const startMsg = '[ PRESS ANY KEY TO SCAN ]';
      const startX = Math.floor((cols - startMsg.length) / 2);
      const startY = Math.floor(rows / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = 'ARROWS move  SPACE reveal  F flag  ESC menu';
      const ctrlX = Math.floor((cols - controls.length) / 2);
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

      // Draw empty grid preview
      for (let y = 0; y < difficulty.height; y++) {
        for (let x = 0; x < difficulty.width; x++) {
          const cellX = renderLeft + 1 + x * 2;
          const cellY = renderTop + 1 + y;
          output += `\x1b[${cellY};${cellX}H\x1b[2m${themeColor}${CELL_HIDDEN}\x1b[0m`;
        }
      }
    }
    // GAME OVER
    else if (gameOver) {
      // Draw the final grid state
      output += renderGrid(renderLeft, renderTop, false);

      const overMsg = won ? '== GRID SECURED ==' : '== MALWARE BREACH ==';
      const overX = Math.floor((cols - overMsg.length) / 2);
      const overY = Math.floor(rows / 2) - 1;
      output += `\x1b[${overY};${overX}H${won ? '\x1b[1;92m' : '\x1b[1;91m'}${overMsg}\x1b[0m`;

      const timeMsg = `Time: ${formatTime(elapsedTime)}`;
      const timeX = Math.floor((cols - timeMsg.length) / 2);
      output += `\x1b[${overY + 1};${timeX}H${themeColor}${timeMsg}\x1b[0m`;

      const restart = '[ R ] RESTART  [ D ] DIFFICULTY  [ Q ] QUIT';
      const restartX = Math.floor((cols - restart.length) / 2);
      output += `\x1b[${overY + 3};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    }
    // GAMEPLAY
    else {
      output += renderGrid(renderLeft, renderTop, true);

      // Draw scan line effect
      if (scanLineY >= 0 && scanLineY < difficulty.height) {
        const scanX = renderLeft + 1;
        const scanY = renderTop + 1 + scanLineY;
        output += `\x1b[${scanY};${scanX}H\x1b[7m${themeColor}${' '.repeat(difficulty.width * 2)}\x1b[0m`;
      }

      // Draw particles
      for (const p of particles) {
        const screenX = Math.round(renderLeft + 1 + p.x);
        const screenY = Math.round(renderTop + 1 + p.y);
        if (screenX > renderLeft && screenX < renderLeft + difficulty.width * 2 + 1 &&
            screenY > renderTop && screenY < renderTop + difficulty.height + 1) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const screenX = Math.round(renderLeft + 1 + popup.x);
        const screenY = Math.round(renderTop + 1 + popup.y);
        if (screenY > renderTop && screenY < renderTop + difficulty.height + 1) {
          const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }
    }

    // Bottom hint
    const hint = gameStarted && !gameOver && !paused
      ? `Revealed: ${cellsRevealed}/${difficulty.width * difficulty.height - difficulty.mines}  [ ESC ] MENU`
      : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${renderTop + difficulty.height + 3};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  function renderGrid(renderLeft: number, renderTop: number, showCursor: boolean): string {
    let output = '';

    for (let y = 0; y < difficulty.height; y++) {
      for (let x = 0; x < difficulty.width; x++) {
        const cell = grid[y][x];
        const cellX = renderLeft + 1 + x * 2;
        const cellY = renderTop + 1 + y;
        const isCursor = showCursor && x === cursorX && y === cursorY;

        let cellChar = '';
        let cellColor = '';

        if (cell.isRevealed) {
          if (cell.isMine) {
            cellChar = CELL_MINE;
            cellColor = '\x1b[1;91m';
          } else if (cell.adjacentMines > 0) {
            cellChar = ` ${cell.adjacentMines}`;
            cellColor = NUMBER_COLORS[cell.adjacentMines] || themeColor;
          } else {
            cellChar = CELL_EMPTY;
            cellColor = '\x1b[2m';
          }
        } else if (cell.isFlagged) {
          cellChar = CELL_FLAG;
          cellColor = '\x1b[1;93m';
        } else {
          cellChar = CELL_HIDDEN;
          cellColor = `\x1b[2m${themeColor}`;
        }

        if (isCursor) {
          // Cursor highlight - invert colors
          output += `\x1b[${cellY};${cellX}H\x1b[7m${cellColor}${cellChar}\x1b[0m`;
        } else {
          output += `\x1b[${cellY};${cellX}H${cellColor}${cellChar}\x1b[0m`;
        }
      }
    }

    return output;
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    selectingDifficulty = true;

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

      // ESC toggles pause (not in difficulty select)
      if (key === 'escape' && !selectingDifficulty) {
        paused = !paused;
        if (paused) pauseMenuSelection = 0;
        return;
      }

      // Q to quit from pause/game over/start screen
      if (key === 'q' && (paused || gameOver || !gameStarted)) {
        clearInterval(renderInterval);
        clearInterval(gameInterval);
        controller.stop();
        dispatchGameQuit(terminal);
        return;
      }

      // Difficulty selection
      if (selectingDifficulty) {
        if (domEvent.key === 'ArrowUp') {
          difficultySelection = (difficultySelection - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
        } else if (domEvent.key === 'ArrowDown') {
          difficultySelection = (difficultySelection + 1) % DIFFICULTIES.length;
        } else if (domEvent.key === 'Enter' || domEvent.key === ' ') {
          difficultyIndex = difficultySelection;
          selectingDifficulty = false;
          initGame();
        } else if (key === 'q') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          controller.stop();
          dispatchGameQuit(terminal);
        }
        return;
      }

      // Start screen - any key starts
      if (!gameStarted && !paused) {
        gameStarted = true;
        return;
      }

      // Game over
      if (gameOver) {
        if (key === 'r') {
          initGame();
          gameStarted = true;
        } else if (key === 'd') {
          selectingDifficulty = true;
          difficultySelection = difficultyIndex;
        }
        return;
      }

      // Pause menu navigation
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

        // Legacy shortcuts
        if (key === 'r') { initGame(); gameStarted = true; paused = false; }
        else if (key === 'l') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGamesMenu(terminal); }
        else if (key === 'n') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGameSwitch(terminal); }
        return;
      }

      // GAMEPLAY INPUT
      switch (domEvent.key) {
        case 'ArrowLeft':
        case 'a':
          cursorX = Math.max(0, cursorX - 1);
          break;
        case 'ArrowRight':
        case 'd':
          cursorX = Math.min(difficulty.width - 1, cursorX + 1);
          break;
        case 'ArrowUp':
        case 'w':
          cursorY = Math.max(0, cursorY - 1);
          break;
        case 'ArrowDown':
        case 's':
          cursorY = Math.min(difficulty.height - 1, cursorY + 1);
          break;
        case ' ':
        case 'Enter':
          // Reveal cell
          if (!grid[cursorY][cursorX].isFlagged) {
            revealCell(cursorX, cursorY);
          }
          break;
        case 'f':
        case 'F':
          // Toggle flag
          toggleFlag(cursorX, cursorY);
          break;
      }
    });

    // Clean up on stop
    const originalStop = controller.stop;
    controller.stop = () => {
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      keyListener.dispose();
      originalStop();
    };
  }, 25);

  return controller;
}
