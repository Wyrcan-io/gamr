/**
 * {GAME_NAME}
 *
 * {GAME_DESCRIPTION}
 * Theme-aware with glitchy effects and visual polish.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';
import {
  type Particle,
  type ScorePopup,
  spawnParticles,
  updateParticles,
  addScorePopup,
  updatePopups,
  createShakeState,
  triggerShake,
  applyShake,
} from '../shared/effects';

/**
 * {GAME_NAME} Game Controller
 */
export interface {GameName}Controller {
  stop: () => void;
  isRunning: boolean;
}

// ============================================================================
// TYPES - Define your game-specific types here
// ============================================================================

// Add game-specific types here:
// interface Player { x: number; y: number; }
// interface Enemy { x: number; y: number; alive: boolean; }

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function run{GameName}Game(terminal: Terminal): {GameName}Controller {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const MIN_COLS = 40;
  const MIN_ROWS = 20;
  const GAME_WIDTH = 40;
  const GAME_HEIGHT = 16;

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let won = false;
  let score = 0;
  let highScore = 0;

  // Positioning
  let gameLeft = 2;
  let gameTop = 4;

  // Visual effects (using shared module)
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  const shake = createShakeState();

  // Add game-specific state here:
  // let playerX = GAME_WIDTH / 2;
  // let playerY = GAME_HEIGHT - 2;

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: {GameName}Controller = {
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
    '{TITLE_LINE_1}',
    '{TITLE_LINE_2}',
  ];

  // -------------------------------------------------------------------------
  // GAME LOGIC
  // -------------------------------------------------------------------------

  function initGame() {
    score = 0;
    gameOver = false;
    won = false;
    paused = false;

    // Reset effects
    particles = [];
    scorePopups = [];

    // Initialize game-specific state here
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

    // Update shared effects
    updateParticles(particles);
    updatePopups(scorePopups);

    // Add game-specific update logic here:
    // - Move player
    // - Move enemies
    // - Check collisions
    // - Update score
    // - Check win/lose conditions

    // Example: scoring event
    // score += 10;
    // spawnParticles(particles, itemX, itemY, 6, '\x1b[1;93m');
    // addScorePopup(scorePopups, itemX, itemY - 1, '+10');
    // triggerShake(shake, 3, 1);
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';  // Clear screen

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      let hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider ->' : 'Make pane taller';
      const msg2 = `Need: ${MIN_COLS}x${MIN_ROWS}  Have: ${cols}x${rows}`;
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
    gameTop = Math.max(3, Math.floor((rows - GAME_HEIGHT - 6) / 2));

    // Apply screen shake
    const { offsetX, offsetY } = applyShake(shake);
    const renderLeft = gameLeft + offsetX;
    const renderTop = gameTop + offsetY;

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
    const stats = `SCORE: ${score.toString().padStart(5, '0')}`;
    const statsX = Math.floor((cols - stats.length) / 2);
    output += `\x1b[${gameTop - 1};${statsX}H${themeColor}${stats}\x1b[0m`;

    // Game border
    output += `\x1b[${renderTop};${renderLeft}H${themeColor}╔${'═'.repeat(GAME_WIDTH)}╗\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${themeColor}║\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + GAME_WIDTH + 1}H${themeColor}║\x1b[0m`;
    }
    output += `\x1b[${renderTop + GAME_HEIGHT + 1};${renderLeft}H${themeColor}╚${'═'.repeat(GAME_WIDTH)}╝\x1b[0m`;

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
      const startMsg = '[ PRESS ANY KEY TO PLAY ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '{CONTROLS_HINT}';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    }
    // GAME OVER
    else if (gameOver) {
      const overMsg = won ? '╔══ YOU WIN! ══╗' : '╔══ GAME OVER ══╗';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${overX}H${won ? '\x1b[1;92m' : '\x1b[1;91m'}${overMsg}\x1b[0m`;

      const scoreLine = `SCORE: ${score}  HIGH: ${highScore}`;
      const scoreX = gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1;
      output += `\x1b[${overY + 1};${scoreX}H${themeColor}${scoreLine}\x1b[0m`;

      const restart = '╚ [R] RESTART  [Q] QUIT ╝';
      const restartX = gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1;
      output += `\x1b[${overY + 2};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    }
    // GAMEPLAY
    else {
      // Draw game objects here:
      // - Player
      // - Enemies
      // - Collectibles
      // - etc.

      // Draw particles (shared effect)
      for (const p of particles) {
        const screenX = Math.round(renderLeft + 1 + p.x);
        const screenY = Math.round(renderTop + 1 + p.y);
        if (screenX > renderLeft && screenX < renderLeft + GAME_WIDTH + 1 &&
            screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups (shared effect)
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

    terminal.write('\x1b[?1049h');  // Alternate buffer
    terminal.write('\x1b[?25l');    // Hide cursor

    initGame();
    gameStarted = false;

    const renderInterval = setInterval(() => {
      if (!running) { clearInterval(renderInterval); return; }
      render();
    }, 50);

    const gameInterval = setInterval(() => {
      if (!running) { clearInterval(gameInterval); return; }
      update();
    }, 50);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) { keyListener.dispose(); return; }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key.toLowerCase();

      // ESC toggles pause
      if (key === 'escape') {
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

      // Start screen - any key starts
      if (!gameStarted && !paused) {
        gameStarted = true;
        return;
      }

      // Game over - R to restart
      if (gameOver) {
        if (key === 'r') {
          if (score > highScore) highScore = score;
          initGame();
          gameStarted = true;
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

      // GAMEPLAY INPUT - add your controls here
      switch (domEvent.key) {
        case 'ArrowLeft':
        case 'a':
          // Move left
          break;
        case 'ArrowRight':
        case 'd':
          // Move right
          break;
        case 'ArrowUp':
        case 'w':
          // Move up or jump
          break;
        case 'ArrowDown':
        case 's':
          // Move down or slide
          break;
        case ' ':
          // Action (shoot, etc.)
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
  }, 50);

  return controller;
}
