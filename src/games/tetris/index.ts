/**
 * Hyper Tetris
 *
 * Cyberpunk-themed Tetris with glitchy effects,
 * neon borders, and theme-aware colors.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, getVerticalAnchor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Tetris Game Controller
 */
export interface TetrisController {
  stop: () => void;
  isRunning: boolean;
}

// Tetromino shapes (rotations included)
const TETROMINOES = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
  ],
  O: [
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]],
  ],
};

const PIECE_COLORS: Record<string, string> = {
  I: '\x1b[96m', // Cyan
  O: '\x1b[93m', // Yellow
  T: '\x1b[95m', // Magenta
  S: '\x1b[92m', // Green
  Z: '\x1b[91m', // Red
  J: '\x1b[94m', // Blue
  L: '\x1b[33m', // Orange (dark yellow)
};

type PieceType = keyof typeof TETROMINOES;
type GameMode = 'marathon' | 'sprint';

/**
 * Cyberpunk Tetris Game
 */
export function runTetrisGame(terminal: Terminal): TetrisController {
  const themeColor = getCurrentThemeColor();

  // Game dimensions
  const BOARD_WIDTH = 12; // Wider board for better text fit
  const BOARD_HEIGHT = 20;
  const SIDE_PANEL_WIDTH = 14;
  const BOARD_ONLY_WIDTH = BOARD_WIDTH * 2 + 2; // Just board + borders
  const TOTAL_WIDTH = BOARD_WIDTH * 2 + SIDE_PANEL_WIDTH + 4; // Board + panel + gaps
  const TICK_MS = 25;
  const SPRINT_TARGET_LINES = 40;

  // Minimum terminal size (compact mode - just the board)
  const MIN_COLS = BOARD_ONLY_WIDTH + 2;
  const MIN_ROWS = BOARD_HEIGHT + 3; // Board + controls (title hides automatically on short panes)
  const MIN_ROWS_WITH_TITLE = BOARD_HEIGHT + 4;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let won = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let score = 0;
  let level = 1;
  let lines = 0;
  let highScore = 0;
  let selectedMode: GameMode = 'marathon';
  let mode: GameMode = 'marathon';

  // Game board (0 = empty, string = color code)
  let board: (string | 0)[][] = [];

  // Current piece state
  let currentPiece: PieceType = 'T';
  let currentRotation = 0;
  let pieceX = 0;
  let pieceY = 0;
  let nextPiece: PieceType = 'T';

  // Glitch effect
  let glitchFrame = 0;

  // Drop timing
  let dropCounter = 0;
  let dropInterval = 1000;

  // Hard drop animation
  let hardDropping = false;
  let hardDropConsumed = false; // Prevents holding space from dropping multiple pieces

  // Line clear effects
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let flashRows: number[] = [];
  let flashFrames = 0;
  let comboMessage = '';
  let comboFrames = 0;
  let comboChain = 0;
  let backToBackTetris = false;
  let particles: { x: number; y: number; char: string; color: string; vx: number; vy: number; life: number }[] = [];

  const controller: TetrisController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   ▀█▀ █▀▀ ▀█▀ █▀█ █ █▀',
    '█▀█  █  █▀▀ ██▄ █▀▄    █  ██▄  █  █▀▄ █ ▄█',
  ];

  function initGame(newMode: GameMode) {
    mode = newMode;
    board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    dropCounter = 0;
    gameOver = false;
    won = false;
    paused = false;
    comboChain = 0;
    backToBackTetris = false;
    hardDropping = false;
    hardDropConsumed = false;
    shakeFrames = 0;
    shakeIntensity = 0;
    flashRows = [];
    flashFrames = 0;
    comboMessage = '';
    comboFrames = 0;
    particles = [];
    spawnPiece();
    nextPiece = randomPiece();
  }

  function randomPiece(): PieceType {
    const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return pieces[Math.floor(Math.random() * pieces.length)];
  }

  function spawnPiece() {
    currentPiece = nextPiece || randomPiece();
    nextPiece = randomPiece();
    currentRotation = 0;
    const shape = TETROMINOES[currentPiece][0];
    pieceX = Math.floor((BOARD_WIDTH - shape[0].length) / 2);
    pieceY = 0;

    if (!isValidPosition(pieceX, pieceY, currentRotation)) {
      gameOver = true;
      if (score > highScore) highScore = score;
    }
  }

  function getShape(rotation: number = currentRotation): number[][] {
    const rotations = TETROMINOES[currentPiece];
    return rotations[rotation % rotations.length];
  }

  function isValidPosition(x: number, y: number, rotation: number): boolean {
    const shape = TETROMINOES[currentPiece][rotation % TETROMINOES[currentPiece].length];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }
          if (newY >= 0 && board[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function lockPiece() {
    const shape = getShape();
    const color = PIECE_COLORS[currentPiece];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const boardY = pieceY + row;
          const boardX = pieceX + col;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            board[boardY][boardX] = color;
          }
        }
      }
    }
    clearLines();
    if (!gameOver) {
      spawnPiece();
    }
  }

  function clearLines() {
    // First, find rows to clear and trigger flash effect
    const rowsToClear: number[] = [];
    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (board[row].every(cell => cell !== 0)) {
        rowsToClear.push(row);
      }
    }

    const clearedLines = rowsToClear.length;
    if (clearedLines > 0) {
      // Trigger flash effect on these rows
      flashRows = [...rowsToClear];
      flashFrames = 8; // Flash for 8 frames

      // Spawn particles from cleared rows
      const particleChars = ['█', '▓', '▒', '░', '✦', '✧', '◆', '◇'];
      const particleColors = ['\x1b[91m', '\x1b[93m', '\x1b[92m', '\x1b[96m', '\x1b[95m', '\x1b[97m'];
      for (const row of rowsToClear) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          if (Math.random() < 0.4) { // 40% chance for each cell
            particles.push({
              x: x * 2,
              y: row,
              char: particleChars[Math.floor(Math.random() * particleChars.length)],
              color: particleColors[Math.floor(Math.random() * particleColors.length)],
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.8) * 3,
              life: 15 + Math.floor(Math.random() * 10),
            });
          }
        }
      }

      // Combo & back-to-back scoring
      comboChain++;
      const isTetris = clearedLines === 4;
      const b2bBonus = isTetris && backToBackTetris ? 400 * level : 0;
      const comboBonus = comboChain > 1 ? (comboChain - 1) * 50 * level : 0;
      backToBackTetris = isTetris;

      // Screen shake based on clear strength and combo
      shakeIntensity = clearedLines + Math.min(2, comboChain - 1);
      shakeFrames = clearedLines * 5 + (comboChain > 1 ? 6 : 4);

      // Combo message
      if (isTetris && b2bBonus > 0) {
        comboMessage = '⚡ B2B TETRIS! ⚡';
        comboFrames = 45;
      } else if (isTetris) {
        comboMessage = '★ TETRIS! ★';
        comboFrames = 40;
      } else if (clearedLines === 3) {
        comboMessage = 'TRIPLE!';
        comboFrames = 25;
      } else if (clearedLines === 2) {
        comboMessage = 'DOUBLE!';
        comboFrames = 20;
      } else {
        comboMessage = 'SINGLE!';
        comboFrames = 16;
      }

      if (comboChain > 1) {
        comboMessage += `  COMBO x${comboChain}`;
        comboFrames = Math.max(comboFrames, 24);
      }

      // Rebuild board to avoid index-shift bugs when clearing multiple rows.
      const remainingRows = board.filter(row => !row.every(cell => cell !== 0));
      board = [
        ...Array(clearedLines).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
        ...remainingRows,
      ];

      // Update flash indices to match the newly-inserted empty rows at the top.
      flashRows = Array.from({ length: clearedLines }, (_, i) => i);

      const pointsTable = [0, 100, 300, 500, 800];
      const points = (pointsTable[Math.min(clearedLines, pointsTable.length - 1)] ?? 0) * level + comboBonus + b2bBonus;
      score += points;
      lines += clearedLines;

      // Level up every 10 lines
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
      }

      if (mode === 'sprint' && lines >= SPRINT_TARGET_LINES) {
        won = true;
        gameOver = true;
        if (score > highScore) highScore = score;
      }
    } else {
      comboChain = 0;
    }
  }

  function moveLeft() {
    if (isValidPosition(pieceX - 1, pieceY, currentRotation)) {
      pieceX--;
    }
  }

  function moveRight() {
    if (isValidPosition(pieceX + 1, pieceY, currentRotation)) {
      pieceX++;
    }
  }

  function moveDown(): boolean {
    if (isValidPosition(pieceX, pieceY + 1, currentRotation)) {
      pieceY++;
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (hardDropping) return; // Already dropping
    if (hardDropConsumed) return; // Must release space before dropping again
    hardDropping = true;
    hardDropConsumed = true; // Mark as consumed until space is released
  }

  function rotate() {
    const newRotation = (currentRotation + 1) % TETROMINOES[currentPiece].length;
    // Try normal rotation
    if (isValidPosition(pieceX, pieceY, newRotation)) {
      currentRotation = newRotation;
      return;
    }
    // Wall kicks
    const kicks = [-1, 1, -2, 2];
    for (const kick of kicks) {
      if (isValidPosition(pieceX + kick, pieceY, newRotation)) {
        pieceX += kick;
        currentRotation = newRotation;
        return;
      }
    }
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      let hint = '';
      if (needWidth && needHeight) {
        hint = 'Make pane larger';
      } else if (needWidth) {
        hint = 'Make pane wider →';
      } else {
        hint = 'Make pane taller ↓';
      }
      const msg2 = `Need: ${MIN_COLS}×${MIN_ROWS}  Have: ${cols}×${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Determine layout mode based on available space
    const showSidePanel = cols >= TOTAL_WIDTH + 4;
    const showTitle = rows >= MIN_ROWS_WITH_TITLE;
    const compactTitle = showTitle && rows < 30; // Use compact title if limited height
    const displayWidth = showSidePanel ? TOTAL_WIDTH : BOARD_ONLY_WIDTH;
    let gameLeft = Math.max(2, Math.floor((cols - displayWidth) / 2));
    const titleRows = showTitle ? (compactTitle ? 1 : 2) : 0;
    const gapAfterTitle = showTitle ? 1 : 0;
    const boardRows = BOARD_HEIGHT + 2;
    const footerRows = 2;
    const layoutRows = titleRows + gapAfterTitle + boardRows + footerRows;
    const titleTop = getVerticalAnchor(rows, layoutRows, {
      minTop: 1,
      footerRows: 1,
    });
    let gameTop = titleTop + titleRows + gapAfterTitle;

    // Apply screen shake
    if (shakeFrames > 0) {
      const shakeX = Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      const shakeY = Math.floor((Math.random() - 0.5) * shakeIntensity);
      gameLeft = Math.max(1, gameLeft + shakeX);
      gameTop = Math.max(2, gameTop + shakeY);
    }

    // Glitchy title (hidden first when height is constrained)
    if (showTitle) {
      glitchFrame = (glitchFrame + 1) % 60;
      const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;

      if (compactTitle) {
        const shortTitle = 'HYPER TETRIS';
        const titleX = Math.floor((cols - shortTitle.length) / 2) + glitchOffset;
        if (glitchFrame >= 55 && glitchFrame < 58) {
          output += `\x1b[${titleTop};${titleX}H\x1b[91m${shortTitle}\x1b[0m`;
        } else {
          output += `\x1b[${titleTop};${titleX}H${themeColor}\x1b[1m${shortTitle}\x1b[0m`;
        }
      } else {
        const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;
        output += `\x1b[${titleTop};${titleX}H`;
        if (glitchFrame >= 55 && glitchFrame < 58) {
          output += `\x1b[91m${title[0]}\x1b[0m`;
          output += `\x1b[${titleTop + 1};${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
        } else {
          output += `${themeColor}\x1b[1m${title[0]}\x1b[0m`;
          output += `\x1b[${titleTop + 1};${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
        }
      }
    }

    // Game border (double-width cells)
    output += `\x1b[${gameTop};${gameLeft}H${themeColor}╔${'══'.repeat(BOARD_WIDTH)}╗\x1b[0m`;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      output += `\x1b[${gameTop + 1 + y};${gameLeft}H${themeColor}║\x1b[0m`;
      output += `\x1b[${gameTop + 1 + y};${gameLeft + 1 + BOARD_WIDTH * 2}H${themeColor}║\x1b[0m`;
    }
    output += `\x1b[${gameTop + BOARD_HEIGHT + 1};${gameLeft}H${themeColor}╚${'══'.repeat(BOARD_WIDTH)}╝\x1b[0m`;

    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = gameLeft + Math.floor(BOARD_WIDTH * 2 / 2) + 1;
      const pauseY = gameTop + Math.floor(BOARD_HEIGHT / 2) - 3;
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: pauseCenterX,
        startY: pauseY + 2,
        showShortcuts: false,
      });

      const navHint = '↑↓ select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    } else if (!gameStarted) {
      const startMsg = '[ PRESS ANY KEY ]';
      const startX = gameLeft + Math.floor((BOARD_WIDTH * 2 - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(BOARD_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const modeY = startY + 2;
      const marathonLabel = selectedMode === 'marathon' ? '[1] MARATHON' : ' 1  MARATHON';
      const sprintLabel = selectedMode === 'sprint' ? '[2] SPRINT 40L' : ' 2  SPRINT 40L';
      const modePrompt = `MODE: ${marathonLabel}  ${sprintLabel}`;
      const modeX = Math.floor((cols - modePrompt.length) / 2);
      output += `\x1b[${modeY};${modeX}H\x1b[1m${themeColor}${modePrompt}\x1b[0m`;

      const controls = '←→ MODE  ↓ MOVE  ↑ ROT  SPC DROP  ESC MENU';
      const ctrlX = Math.floor((cols - controls.length) / 2);
      output += `\x1b[${gameTop + BOARD_HEIGHT + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else if (gameOver) {
      const overMsg = won ? '══ YOU WIN ══' : '══ GAME OVER ══';
      const overX = gameLeft + Math.floor((BOARD_WIDTH * 2 - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(BOARD_HEIGHT / 2) - 1;
      const overColor = won ? '\x1b[1;92m' : '\x1b[1;31m';
      output += `\x1b[${overY};${overX}H${overColor}${overMsg}\x1b[0m`;

      const finalScore = `SCORE: ${score}`;
      const scoreX = gameLeft + Math.floor((BOARD_WIDTH * 2 - finalScore.length) / 2) + 1;
      output += `\x1b[${overY + 2};${scoreX}H${themeColor}${finalScore}\x1b[0m`;

      const finalLines = `LINES: ${lines}  MODE: ${mode === 'sprint' ? 'SPRINT' : 'MARATHON'}`;
      const linesX = gameLeft + Math.floor((BOARD_WIDTH * 2 - finalLines.length) / 2) + 1;
      output += `\x1b[${overY + 3};${linesX}H${themeColor}${finalLines}\x1b[0m`;

      const restart = '[ R ] RESTART  [ Q ] QUIT';
      const restartX = gameLeft + Math.floor((BOARD_WIDTH * 2 - restart.length) / 2) + 1;
      output += `\x1b[${overY + 5};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    } else {
      // Draw board with flash effect
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        const isFlashing = flashFrames > 0 && flashRows.includes(y);
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const cell = board[y][x];
          if (cell) {
            if (isFlashing) {
              // Flash effect - alternate between white and original color
              const flashColor = flashFrames % 2 === 0 ? '\x1b[97m\x1b[47m' : cell;
              output += `\x1b[${gameTop + 1 + y};${gameLeft + 1 + x * 2}H${flashColor}██\x1b[0m`;
            } else {
              output += `\x1b[${gameTop + 1 + y};${gameLeft + 1 + x * 2}H${cell}██\x1b[0m`;
            }
          } else if (isFlashing) {
            // Flash empty cells too for full row flash
            const flashColor = flashFrames % 2 === 0 ? '\x1b[97m\x1b[47m' : '\x1b[100m';
            output += `\x1b[${gameTop + 1 + y};${gameLeft + 1 + x * 2}H${flashColor}██\x1b[0m`;
          }
        }
      }

      // Draw current piece
      const shape = getShape();
      const pieceColor = PIECE_COLORS[currentPiece];
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col]) {
            const screenY = gameTop + 1 + pieceY + row;
            const screenX = gameLeft + 1 + (pieceX + col) * 2;
            if (pieceY + row >= 0) {
              output += `\x1b[${screenY};${screenX}H${pieceColor}██\x1b[0m`;
            }
          }
        }
      }

      // Ghost piece (preview where piece will land)
      let ghostY = pieceY;
      while (isValidPosition(pieceX, ghostY + 1, currentRotation)) {
        ghostY++;
      }
      if (ghostY !== pieceY) {
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
              const screenY = gameTop + 1 + ghostY + row;
              const screenX = gameLeft + 1 + (pieceX + col) * 2;
              if (ghostY + row >= 0) {
                output += `\x1b[${screenY};${screenX}H\x1b[2m${pieceColor}░░\x1b[0m`;
              }
            }
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        if (p.life > 0) {
          const px = Math.round(gameLeft + 1 + p.x);
          const py = Math.round(gameTop + 1 + p.y);
          if (px > 0 && px < cols && py > 0 && py < rows) {
            output += `\x1b[${py};${px}H${p.color}${p.char}\x1b[0m`;
          }
        }
      }

      // Draw combo message
      if (comboFrames > 0 && comboMessage) {
        const msgX = gameLeft + Math.floor((BOARD_WIDTH * 2 - comboMessage.length) / 2) + 1;
        const msgY = gameTop + Math.floor(BOARD_HEIGHT / 2);
        // Pulsing effect
        const pulse = comboFrames % 4 < 2;
        const msgColor = comboMessage.includes('TETRIS') ? (pulse ? '\x1b[1;93m' : '\x1b[1;91m') : (pulse ? '\x1b[1;97m' : '\x1b[1;96m');
        output += `\x1b[${msgY};${msgX}H${msgColor}${comboMessage}\x1b[0m`;
      }
    }

    // Stats display - either side panel or compact bar
    if (showSidePanel) {
      // Side panel
      const panelX = gameLeft + BOARD_WIDTH * 2 + 4;

      // Score
      output += `\x1b[${gameTop};${panelX}H${themeColor}┌──────────┐\x1b[0m`;
      output += `\x1b[${gameTop + 1};${panelX}H${themeColor}│ SCORE    │\x1b[0m`;
      output += `\x1b[${gameTop + 2};${panelX}H${themeColor}│ ${score.toString().padStart(8, ' ')} │\x1b[0m`;
      output += `\x1b[${gameTop + 3};${panelX}H${themeColor}├──────────┤\x1b[0m`;
      output += `\x1b[${gameTop + 4};${panelX}H${themeColor}│ LEVEL    │\x1b[0m`;
      output += `\x1b[${gameTop + 5};${panelX}H${themeColor}│ ${level.toString().padStart(8, ' ')} │\x1b[0m`;
      output += `\x1b[${gameTop + 6};${panelX}H${themeColor}├──────────┤\x1b[0m`;
      output += `\x1b[${gameTop + 7};${panelX}H${themeColor}│ LINES    │\x1b[0m`;
      output += `\x1b[${gameTop + 8};${panelX}H${themeColor}│ ${lines.toString().padStart(8, ' ')} │\x1b[0m`;
      output += `\x1b[${gameTop + 9};${panelX}H${themeColor}├──────────┤\x1b[0m`;
      output += `\x1b[${gameTop + 10};${panelX}H${themeColor}│ HIGH     │\x1b[0m`;
      output += `\x1b[${gameTop + 11};${panelX}H${themeColor}│ ${highScore.toString().padStart(8, ' ')} │\x1b[0m`;
      output += `\x1b[${gameTop + 12};${panelX}H${themeColor}└──────────┘\x1b[0m`;

      // Next piece preview
      output += `\x1b[${gameTop + 14};${panelX}H${themeColor}┌──────────┐\x1b[0m`;
      output += `\x1b[${gameTop + 15};${panelX}H${themeColor}│  NEXT    │\x1b[0m`;
      output += `\x1b[${gameTop + 16};${panelX}H${themeColor}│          │\x1b[0m`;
      output += `\x1b[${gameTop + 17};${panelX}H${themeColor}│          │\x1b[0m`;
      output += `\x1b[${gameTop + 18};${panelX}H${themeColor}│          │\x1b[0m`;
      output += `\x1b[${gameTop + 19};${panelX}H${themeColor}└──────────┘\x1b[0m`;

      if (gameStarted && !gameOver) {
        const nextShape = TETROMINOES[nextPiece][0];
        const nextColor = PIECE_COLORS[nextPiece];
        const offsetX = Math.floor((4 - nextShape[0].length) / 2);
        const offsetY = Math.floor((2 - nextShape.length) / 2);
        for (let row = 0; row < nextShape.length; row++) {
          for (let col = 0; col < nextShape[row].length; col++) {
            if (nextShape[row][col]) {
              output += `\x1b[${gameTop + 16 + offsetY + row};${panelX + 2 + (offsetX + col) * 2}H${nextColor}██\x1b[0m`;
            }
          }
        }
      }

      const modeLabel = mode === 'sprint'
        ? `M:S ${Math.max(0, SPRINT_TARGET_LINES - lines).toString().padStart(3, ' ')}`
        : 'M:MARATHON';
      const modeLabelX = panelX + Math.max(0, Math.floor((12 - modeLabel.length) / 2));
      output += `\x1b[${gameTop + 20};${modeLabelX}H\x1b[2m${themeColor}${modeLabel}\x1b[0m`;
    } else {
      // Compact mode - stats bar above board
      const sprintTail = mode === 'sprint' ? ` TGT:${Math.max(0, SPRINT_TARGET_LINES - lines).toString().padStart(2, '0')}` : '';
      const statsBar = `SCR:${score.toString().padStart(5)} LVL:${level} LNS:${lines.toString().padStart(3)}${sprintTail}`;
      const statsX = gameLeft + Math.floor((BOARD_WIDTH * 2 - statsBar.length) / 2) + 1;
      const statsY = gameTop - 1;
      if (statsY >= 1) {
        output += `\x1b[${statsY};${statsX}H${themeColor}${statsBar}\x1b[0m`;
      }
    }

    terminal.write(output);
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

    // Handle animated hard drop
    if (hardDropping) {
      // Move down 2 rows per frame for fast animation
      let moved = false;
      for (let i = 0; i < 2; i++) {
        if (moveDown()) {
          score += 2;
          moved = true;
        } else {
          break;
        }
      }
      if (!moved) {
        // Can't move down anymore, lock the piece
        hardDropping = false;
        lockPiece();
      }
      return; // Skip normal drop during hard drop animation
    }

    dropCounter++;
    if (dropCounter * TICK_MS >= dropInterval) {
      dropCounter = 0;
      if (!moveDown()) {
        lockPiece();
      }
    }

    // Update effect timers
    if (shakeFrames > 0) shakeFrames--;
    if (flashFrames > 0) flashFrames--;
    if (comboFrames > 0) comboFrames--;

    // Update particles
    for (const p of particles) {
      if (p.life > 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life--;
      }
    }
    // Remove dead particles
    particles = particles.filter(p => p.life > 0);
  }

  // Start game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h'); // Enter alternate buffer
    terminal.write('\x1b[?25l');   // Hide cursor

    initGame(mode);
    gameStarted = false;

    const renderInterval = setInterval(() => {
      if (!running) {
        clearInterval(renderInterval);
        return;
      }
      render();
    }, TICK_MS);

    const gameInterval = setInterval(() => {
      if (!running) {
        clearInterval(gameInterval);
        return;
      }
      update();
    }, TICK_MS);

    // Track space key release to allow next hard drop
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        hardDropConsumed = false;
      }
    };
    window.addEventListener('keyup', handleKeyUp);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) {
        keyListener.dispose();
        window.removeEventListener('keyup', handleKeyUp);
        return;
      }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key.toLowerCase();

      // Handle ESC key - toggle pause (works on start screen too)
      if (key === 'escape') {
        paused = !paused;
        if (paused) pauseMenuSelection = 0;
        return;
      }

      // Q to quit (from start screen, pause, or game over)
      if (key === 'q') {
        if (paused || gameOver || !gameStarted) {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          window.removeEventListener('keyup', handleKeyUp);
          controller.stop();
          dispatchGameQuit(terminal);
          return;
        }
      }

      // Start screen - any key (except ESC/Q handled above) starts the game
      // Skip if paused (ESC menu open on start screen)
      if (!gameStarted && !paused) {
        if (key === 'arrowleft' || key === 'a' || key === '1') {
          selectedMode = 'marathon';
          return;
        }
        if (key === 'arrowright' || key === 'd' || key === '2') {
          selectedMode = 'sprint';
          return;
        }
        if (key === 'tab' || key === 'm') {
          selectedMode = selectedMode === 'marathon' ? 'sprint' : 'marathon';
          return;
        }
        initGame(selectedMode);
        gameStarted = true;
        return;
      }

      // Game over - only R to restart
      if (gameOver) {
        if (key === 'r') {
          initGame(mode);
          gameStarted = true;
        }
        return;
      }

      // Pause menu actions
      if (paused) {
        // Use shared menu navigation
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
            case 0: // Resume
              paused = false;
              break;
            case 1: // Restart
              initGame(mode);
              gameStarted = true;
              paused = false;
              break;
            case 2: // Quit
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              window.removeEventListener('keyup', handleKeyUp);
              controller.stop();
              dispatchGameQuit(terminal);
              break;
            case 3: // List Games
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              window.removeEventListener('keyup', handleKeyUp);
              running = false;
              dispatchGamesMenu(terminal);
              break;
            case 4: // Next Game
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              window.removeEventListener('keyup', handleKeyUp);
              running = false;
              dispatchGameSwitch(terminal);
              break;
          }
          return;
        }

        // Legacy shortcut keys still work
        if (key === 'r') {
          initGame(mode);
          gameStarted = true;
          paused = false;
        } else if (key === 'l') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          window.removeEventListener('keyup', handleKeyUp);
          running = false;
          dispatchGamesMenu(terminal);
        } else if (key === 'n') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          window.removeEventListener('keyup', handleKeyUp);
          running = false;
          dispatchGameSwitch(terminal);
        }
        return;
      }

      // Gameplay controls
      switch (domEvent.key) {
        case 'ArrowLeft':
        case 'a':
          moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
          moveRight();
          break;
        case 'ArrowDown':
        case 's':
          if (moveDown()) score += 1;
          break;
        case 'ArrowUp':
        case 'w':
          rotate();
          break;
        case ' ':
          hardDrop();
          break;
      }
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      keyListener.dispose();
      window.removeEventListener('keyup', handleKeyUp);
      originalStop();
    };
  }, 25);

  return controller;
}
