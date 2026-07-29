/**
 * Hyper Tower
 *
 * Stack falling blocks perfectly to build the tallest tower.
 * Blocks swing left/right - press space to drop.
 * Overhanging parts fall off, making subsequent blocks narrower.
 * Perfect alignments give bonus points and combo multipliers.
 * Cyberpunk-themed with glitchy effects and theme-aware colors.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Tower Game Controller
 */
export interface TowerController {
  stop: () => void;
  isRunning: boolean;
}

// ============================================================================
// TYPES
// ============================================================================

interface Block {
  x: number;       // Left edge position
  width: number;   // Block width
  color: string;   // ANSI color code
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  color: string;
  vy: number;
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

// Block colors - cyberpunk neon palette
const BLOCK_COLORS = [
  '\x1b[96m',  // Cyan
  '\x1b[95m',  // Magenta
  '\x1b[93m',  // Yellow
  '\x1b[92m',  // Green
  '\x1b[91m',  // Red
  '\x1b[94m',  // Blue
  '\x1b[97m',  // White
];

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runTowerGame(terminal: Terminal): TowerController {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS - Lowered minimums for better compatibility
  // -------------------------------------------------------------------------
  const MIN_COLS = 30;
  const MIN_ROWS = 16;
  const INITIAL_BLOCK_WIDTH = 8;
  const MIN_BLOCK_WIDTH = 2;
  const PERFECT_THRESHOLD = 0.5;

  // Game dimensions - adaptive
  let GAME_WIDTH = 24;
  let GAME_HEIGHT = 12;

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let score = 0;
  let highScore = 0;
  let height = 0;

  // Positioning
  let gameLeft = 2;
  let gameTop = 4;

  // Swinging block state
  let swingX = 0;
  let swingDirection = 1;
  let swingSpeed = 0.2; // Halved for 2x frame rate
  let currentBlockWidth = INITIAL_BLOCK_WIDTH;
  let currentBlockColor = BLOCK_COLORS[0];

  // Tower state - blocks stack upward, index 0 = bottom
  let tower: Block[] = [];

  // Combo system
  let perfectCombo = 0;
  let maxCombo = 0;

  // Visual effects
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let fallingPieces: FallingPiece[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let flashFrames = 0;

  // Dropping animation
  let isDropping = false;
  let dropY = 0;
  let dropX = 0;
  let dropWidth = 0;
  let dropColor = '';

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: TowerController = {
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
    '▀█▀ █▀█ █ █ █ █▀▀ █▀█',
    ' █  █▄█ ▀▄▀▄▀ ██▄ █▀▄',
  ];

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  function spawnParticles(x: number, y: number, count: number, color: string) {
    const chars = ['✦', '★', '◆', '●'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.15 + Math.random() * 0.25; // Halved for 2x frame rate
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5 - 0.1, // Halved for 2x frame rate
        life: 24 + Math.floor(Math.random() * 16), // Doubled for 2x frame rate
      });
    }
  }

  function spawnFallingPiece(x: number, y: number, width: number, color: string) {
    fallingPieces.push({
      x,
      y,
      width,
      color,
      vy: 0.1,
    });
  }

  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 24, color });
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  // -------------------------------------------------------------------------
  // GAME LOGIC
  // -------------------------------------------------------------------------

  function initGame() {
    // Adaptive sizing
    const cols = terminal.cols;
    const rows = terminal.rows;
    GAME_WIDTH = Math.min(32, Math.max(20, cols - 8));
    GAME_HEIGHT = Math.min(16, Math.max(8, rows - 10));

    score = 0;
    height = 0;
    gameOver = false;
    paused = false;
    perfectCombo = 0;
    maxCombo = 0;

    // Reset swinging block
    currentBlockWidth = Math.min(INITIAL_BLOCK_WIDTH, Math.floor(GAME_WIDTH / 3));
    swingX = Math.floor((GAME_WIDTH - currentBlockWidth) / 2);
    swingDirection = 1;
    swingSpeed = 0.2; // Halved for 2x frame rate
    currentBlockColor = BLOCK_COLORS[0];

    // Reset tower with initial platform
    tower = [];
    const platformWidth = currentBlockWidth;
    const platformX = Math.floor((GAME_WIDTH - platformWidth) / 2);
    tower.push({
      x: platformX,
      width: platformWidth,
      color: '\x1b[2m\x1b[90m',
    });

    // Reset effects
    particles = [];
    scorePopups = [];
    fallingPieces = [];
    shakeFrames = 0;
    flashFrames = 0;
    isDropping = false;
  }

  function getTopBlock(): Block {
    return tower[tower.length - 1];
  }

  function dropBlock() {
    if (isDropping || gameOver) return;

    isDropping = true;
    dropX = swingX;
    dropY = 0; // Start at top
    dropWidth = currentBlockWidth;
    dropColor = currentBlockColor;
  }

  function landBlock() {
    const topBlock = getTopBlock();

    // Calculate overlap
    const dropLeft = dropX;
    const dropRight = dropX + dropWidth;
    const topLeft = topBlock.x;
    const topRight = topBlock.x + topBlock.width;

    const overlapLeft = Math.max(dropLeft, topLeft);
    const overlapRight = Math.min(dropRight, topRight);
    const overlapWidth = overlapRight - overlapLeft;

    // Landing Y position (in game coordinates, 0 = top of visible area)
    const landY = GAME_HEIGHT - tower.length - 1;

    if (overlapWidth < MIN_BLOCK_WIDTH) {
      // Block missed - game over
      gameOver = true;
      if (score > highScore) highScore = score;
      if (perfectCombo > maxCombo) maxCombo = perfectCombo;

      spawnParticles(dropX + dropWidth / 2, landY, 15, '\x1b[91m');
      triggerShake(10, 3);
      return;
    }

    // Check for perfect alignment
    const isPerfect = Math.abs(dropLeft - topLeft) < PERFECT_THRESHOLD &&
                      Math.abs(dropRight - topRight) < PERFECT_THRESHOLD;

    let points = 10;

    if (isPerfect) {
      perfectCombo++;
      const comboBonus = Math.min(perfectCombo * 5, 50);
      points += 10 + comboBonus;

      flashFrames = 6;
      spawnParticles(dropX + dropWidth / 2, landY, 12, '\x1b[93m');

      const popupText = perfectCombo > 1 ? `PERFECT! x${perfectCombo}` : 'PERFECT!';
      addScorePopup(
        Math.floor(GAME_WIDTH / 2) - Math.floor(popupText.length / 2),
        Math.floor(GAME_HEIGHT / 2),
        popupText,
        perfectCombo > 3 ? '\x1b[1;91m' : '\x1b[1;93m'
      );

      triggerShake(4, 1);
    } else {
      if (perfectCombo > maxCombo) maxCombo = perfectCombo;
      perfectCombo = 0;

      // Spawn falling pieces for overhanging parts
      if (dropLeft < topLeft) {
        const overhangWidth = topLeft - dropLeft;
        spawnFallingPiece(dropLeft, landY, overhangWidth, dropColor);
        spawnParticles(dropLeft + overhangWidth / 2, landY, 5, dropColor);
      }
      if (dropRight > topRight) {
        const overhangWidth = dropRight - topRight;
        spawnFallingPiece(topRight, landY, overhangWidth, dropColor);
        spawnParticles(topRight + overhangWidth / 2, landY, 5, dropColor);
      }

      triggerShake(3, 1);
    }

    score += points;
    height++;

    if (points > 10) {
      addScorePopup(overlapLeft + overlapWidth / 2, landY - 1, `+${points}`, '\x1b[92m');
    }

    // Add the landed block to tower
    tower.push({
      x: overlapLeft,
      width: overlapWidth,
      color: dropColor,
    });

    // Update next block
    currentBlockWidth = overlapWidth;
    currentBlockColor = BLOCK_COLORS[tower.length % BLOCK_COLORS.length];

    // Reset swing position
    swingX = Math.floor((GAME_WIDTH - currentBlockWidth) / 2);
    swingDirection = Math.random() > 0.5 ? 1 : -1;

    // Increase speed slightly (halved for 2x frame rate)
    swingSpeed = Math.min(0.5, swingSpeed + 0.01);

    // Reset drop state
    isDropping = false;
  }

  function update() {
    if (paused || !gameStarted || gameOver) return;

    // Update swinging block
    if (!isDropping) {
      swingX += swingDirection * swingSpeed;
      if (swingX <= 0) {
        swingX = 0;
        swingDirection = 1;
      } else if (swingX + currentBlockWidth >= GAME_WIDTH) {
        swingX = GAME_WIDTH - currentBlockWidth;
        swingDirection = -1;
      }
    }

    // Update dropping animation (dropY is 0-1 progress)
    if (isDropping) {
      dropY += 0.08; // Progress speed (0.08 = ~12 frames to land)

      if (dropY >= 1) {
        dropY = 1;
        landBlock();
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.015; // Halved for 2x frame rate
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update falling pieces
    for (let i = fallingPieces.length - 1; i >= 0; i--) {
      const piece = fallingPieces[i];
      piece.y += piece.vy;
      piece.vy += 0.1;
      if (piece.y > GAME_HEIGHT + 5) {
        fallingPieces.splice(i, 1);
      }
    }

    // Update score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const popup = scorePopups[i];
      popup.y -= 0.15;
      popup.frames--;
      if (popup.frames <= 0) scorePopups.splice(i, 1);
    }

    if (flashFrames > 0) flashFrames--;
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    if (shakeFrames > 0) shakeFrames--;

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      const hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider →' : 'Make pane taller ↓';
      const msg2 = `Need: ${MIN_COLS}×${MIN_ROWS}  Have: ${cols}×${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Center game area
    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
    gameTop = Math.max(4, Math.floor((rows - GAME_HEIGHT - 6) / 2));

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

    // Stats bar
    const stats = `HEIGHT: ${height}  SCORE: ${score.toString().padStart(5, '0')}  COMBO: ${perfectCombo}`;
    const statsX = Math.floor((cols - stats.length) / 2);
    output += `\x1b[${gameTop - 1};${statsX}H${themeColor}${stats}\x1b[0m`;

    // Game border with flash effect
    const borderColor = flashFrames > 0 ? '\x1b[1;93m' : themeColor;
    output += `\x1b[${renderTop};${renderLeft}H${borderColor}╔${'═'.repeat(GAME_WIDTH)}╗\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${borderColor}║\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + GAME_WIDTH + 1}H${borderColor}║\x1b[0m`;
    }
    output += `\x1b[${renderTop + GAME_HEIGHT + 1};${renderLeft}H${borderColor}╚${'═'.repeat(GAME_WIDTH)}╝\x1b[0m`;

    // PAUSE MENU
    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
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
    }
    // START SCREEN
    else if (!gameStarted) {
      const startMsg = '[ PRESS SPACE TO START ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = 'SPACE to drop block';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

      const hint1 = 'Stack blocks perfectly!';
      const hint1X = gameLeft + Math.floor((GAME_WIDTH - hint1.length) / 2) + 1;
      output += `\x1b[${startY + 4};${hint1X}H\x1b[2m${themeColor}${hint1}\x1b[0m`;
    }
    // GAME OVER
    else if (gameOver) {
      const overMsg = '╔══ GAME OVER ══╗';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
      output += `\x1b[${overY};${overX}H\x1b[1;91m${overMsg}\x1b[0m`;

      const scoreLine = `HEIGHT: ${height}  SCORE: ${score}`;
      const scoreX = gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1;
      output += `\x1b[${overY + 1};${scoreX}H${themeColor}${scoreLine}\x1b[0m`;

      const highLine = `HIGH: ${highScore}  BEST COMBO: ${maxCombo}`;
      const highX = gameLeft + Math.floor((GAME_WIDTH - highLine.length) / 2) + 1;
      output += `\x1b[${overY + 2};${highX}H\x1b[2m${themeColor}${highLine}\x1b[0m`;

      const restart = '╚ [R] RESTART  [Q] QUIT ╝';
      const restartX = gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1;
      output += `\x1b[${overY + 4};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    }
    // GAMEPLAY
    else {
      // Fixed swing position at upper portion of screen
      const SWING_ROW = 3; // Fixed row for swinging block (near top)

      // SIMPLIFIED: No camera scrolling for now - just render all blocks
      // Block 0 at bottom (row GAME_HEIGHT), each subsequent block one row up
      for (let i = 0; i < tower.length; i++) {
        const block = tower[i];
        // i=0 at bottom (highest screenY), i=N-1 at top (lowest screenY)
        const screenY = renderTop + GAME_HEIGHT - i;

        if (screenY > renderTop && screenY <= renderTop + GAME_HEIGHT) {
          const blockStr = '█'.repeat(Math.max(1, Math.round(block.width)));
          const blockX = renderLeft + 1 + Math.round(block.x);
          output += `\x1b[${screenY};${blockX}H${block.color}${blockStr}\x1b[0m`;
        }
      }

      // Swinging block at fixed position
      const swingScreenY = renderTop + SWING_ROW;

      // Landing position: one row above the current top of tower
      // Top block is at i = tower.length - 1, which is at screenY = renderTop + GAME_HEIGHT - (tower.length - 1)
      // New block lands one row above = screenY - 1 = renderTop + GAME_HEIGHT - tower.length
      const landingScreenY = renderTop + GAME_HEIGHT - tower.length;
      const dropDistance = landingScreenY - swingScreenY; // How far to drop

      // Draw dropping block (animates from swing down to landing)
      if (isDropping) {
        const dropProgress = dropY; // 0 to 1
        const dropScreenY = Math.round(swingScreenY + dropProgress * dropDistance);
        if (dropScreenY > renderTop && dropScreenY <= renderTop + GAME_HEIGHT) {
          const blockStr = '█'.repeat(Math.round(dropWidth));
          output += `\x1b[${dropScreenY};${renderLeft + 1 + Math.round(dropX)}H${dropColor}${blockStr}\x1b[0m`;
        }
      }

      // Draw swinging block at fixed position
      if (!isDropping) {
        const blockStr = '█'.repeat(Math.round(currentBlockWidth));
        output += `\x1b[${swingScreenY};${renderLeft + 1 + Math.round(swingX)}H${currentBlockColor}${blockStr}\x1b[0m`;

        // Draw guide line at landing position
        if (landingScreenY > swingScreenY && landingScreenY <= renderTop + GAME_HEIGHT) {
          const guideStr = '░'.repeat(Math.round(currentBlockWidth));
          output += `\x1b[${landingScreenY};${renderLeft + 1 + Math.round(swingX)}H\x1b[2m${currentBlockColor}${guideStr}\x1b[0m`;
        }
      }

      // Draw falling pieces
      for (const piece of fallingPieces) {
        const screenY = Math.round(renderTop + 1 + piece.y);
        if (screenY > renderTop && screenY <= renderTop + GAME_HEIGHT + 2) {
          const pieceStr = '▓'.repeat(Math.round(piece.width));
          output += `\x1b[${screenY};${renderLeft + 1 + Math.round(piece.x)}H\x1b[2m${piece.color}${pieceStr}\x1b[0m`;
        }
      }

      // Draw particles
      for (const p of particles) {
        const screenX = Math.round(renderLeft + 1 + p.x);
        const screenY = Math.round(renderTop + 1 + p.y);
        if (screenX > renderLeft && screenX < renderLeft + GAME_WIDTH + 1 &&
            screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const screenX = Math.round(renderLeft + 1 + popup.x);
        const screenY = Math.round(renderTop + 1 + popup.y);
        if (screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
          const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }
    }

    // Bottom hint
    const hint = gameStarted && !gameOver && !paused ? `HIGH: ${highScore}  [ ESC ] MENU` : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

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

      const key = domEvent.key;
      const keyLower = key.toLowerCase();

      // Pause menu handling
      if (paused) {
        const { newSelection, confirmed } = navigateMenu(pauseMenuSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
        if (newSelection !== pauseMenuSelection) {
          pauseMenuSelection = newSelection;
          return;
        }
        if (confirmed) {
          switch (pauseMenuSelection) {
            case 0: paused = false; break; // Resume
            case 1: initGame(); gameStarted = true; paused = false; break; // Restart
            case 2: controller.stop(); dispatchGameQuit(terminal); break; // Quit
            case 3: controller.stop(); dispatchGamesMenu(terminal); break; // List Games
            case 4: controller.stop(); dispatchGameSwitch(terminal); break; // Next Game
          }
          return;
        }
        return;
      }

      // Game over controls
      if (gameOver) {
        if (keyLower === 'r') {
          initGame();
          gameStarted = true;
          return;
        }
        if (keyLower === 'q' || key === 'Escape') {
          controller.stop();
          dispatchGameQuit(terminal);
          return;
        }
        return;
      }

      // In-game controls
      if (key === 'Escape') {
        paused = true;
        pauseMenuSelection = 0;
        return;
      }

      if (!gameStarted) {
        if (key === ' ') {
          gameStarted = true;
        }
        return;
      }

      // Drop block
      if (key === ' ') {
        dropBlock();
      }
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      keyListener.dispose();
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      terminal.write('\x1b[?25h');
      terminal.write('\x1b[?1049l');
      originalStop();
    };
  }, 50);

  return controller;
}
