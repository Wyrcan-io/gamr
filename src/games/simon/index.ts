/**
 * Hyper Simon
 *
 * Cyberpunk memory sequence game - "hack the mainframe" by repeating patterns.
 * Features 4 quadrants (1/2/3/4 or arrow keys), visual flash effects,
 * speed increases, and particle bursts on success.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Simon Game Controller
 */
export interface SimonController {
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

type Quadrant = 0 | 1 | 2 | 3; // 0=top, 1=right, 2=bottom, 3=left

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runSimonGame(terminal: Terminal): SimonController {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const MIN_COLS = 40;
  const MIN_ROWS = 18;
  const GAME_WIDTH = 40;
  const GAME_HEIGHT = 18;

  // Quadrant colors
  const QUADRANT_COLORS = [
    '\x1b[1;91m',  // 0 - Top (Red)
    '\x1b[1;92m',  // 1 - Right (Green)
    '\x1b[1;94m',  // 2 - Bottom (Blue)
    '\x1b[1;93m',  // 3 - Left (Yellow)
  ];

  const QUADRANT_DIM_COLORS = [
    '\x1b[2;31m',  // 0 - Top (Dim Red)
    '\x1b[2;32m',  // 1 - Right (Dim Green)
    '\x1b[2;34m',  // 2 - Bottom (Dim Blue)
    '\x1b[2;33m',  // 3 - Left (Dim Yellow)
  ];

  const QUADRANT_CHARS = ['1', '2', '3', '4'];
  const QUADRANT_NAMES = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

  // Timing
  const BASE_FLASH_DURATION = 12; // frames
  const BASE_PAUSE_DURATION = 6;  // frames between flashes
  const SPEED_MULTIPLIER = 0.92; // Speed up each round

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
  let gameTop = 5;

  // Visual effects
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;

  // Simon-specific state
  let sequence: Quadrant[] = [];
  let playerIndex = 0;
  let currentRound = 1;
  let flashSpeed = 1.0;

  // Animation states
  type GamePhase = 'waiting' | 'showing' | 'player_turn' | 'success' | 'failure';
  let phase: GamePhase = 'waiting';
  let showingIndex = 0;
  let flashTimer = 0;
  let pauseTimer = 0;
  let successTimer = 0;
  let failureTimer = 0;

  // Which quadrant is currently lit
  let litQuadrant: Quadrant | null = null;
  let playerLitQuadrant: Quadrant | null = null;
  let playerLitTimer = 0;

  // Message display
  let statusMessage = '';
  let statusColor = themeColor;
  let statusBlink = false;

  // Suppress unused variable warnings
  void won;
  void failureTimer;

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: SimonController = {
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
    '\u2588 \u2588 \u2588\u2584\u2588 \u2588\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580\u2588   \u2588\u2580\u2580 \u2588 \u2588\u2580\u2580\u2588 \u2580\u2588\u2580\u2588 \u2588\u2580\u2588 \u2588\u2580\u2588',
    '\u2588\u2580\u2588  \u2588  \u2588\u2580\u2580 \u2588\u2588\u2584 \u2588\u2580\u2584   \u2584\u2584\u2588 \u2588 \u2588\u2588\u2584 \u2588 \u2588 \u2588 \u2588\u2580\u2584 \u2588 \u2588',
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

  function spawnBurstParticles(quadrant: Quadrant) {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const offset = 5;

    let x = centerX;
    let y = centerY;

    switch (quadrant) {
      case 0: y = centerY - offset; break;
      case 1: x = centerX + offset * 2; break;
      case 2: y = centerY + offset; break;
      case 3: x = centerX - offset * 2; break;
    }

    spawnParticles(x, y, 8, QUADRANT_COLORS[quadrant], ['\u2726', '\u2605', '\u25C6', '\u25CF']);
  }

  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 20, color });
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

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
    shakeFrames = 0;

    // Reset Simon state
    sequence = [];
    playerIndex = 0;
    currentRound = 1;
    flashSpeed = 1.0;
    phase = 'waiting';
    showingIndex = 0;
    flashTimer = 0;
    pauseTimer = 0;
    successTimer = 0;
    failureTimer = 0;
    litQuadrant = null;
    playerLitQuadrant = null;
    playerLitTimer = 0;

    statusMessage = 'INITIATING SEQUENCE...';
    statusColor = themeColor;
    statusBlink = true;

    // Start first round after brief delay
    setTimeout(() => {
      if (running && gameStarted && !paused && !gameOver) {
        startNewRound();
      }
    }, 1000);
  }

  function startNewRound() {
    // Add a new random quadrant to the sequence
    sequence.push(Math.floor(Math.random() * 4) as Quadrant);

    // Start showing the sequence
    phase = 'showing';
    showingIndex = 0;
    flashTimer = 0;
    pauseTimer = Math.floor(BASE_PAUSE_DURATION * 2); // Initial pause before showing

    statusMessage = `LEVEL ${currentRound}: DECRYPTING...`;
    statusColor = '\x1b[1;96m';
    statusBlink = false;
  }

  function handlePlayerInput(quadrant: Quadrant) {
    if (phase !== 'player_turn' || paused || gameOver) return;

    // Light up the quadrant player pressed
    playerLitQuadrant = quadrant;
    playerLitTimer = 8;

    // Check if correct
    if (quadrant === sequence[playerIndex]) {
      // Correct!
      playerIndex++;
      spawnBurstParticles(quadrant);

      if (playerIndex >= sequence.length) {
        // Completed the sequence!
        phase = 'success';
        successTimer = 30;
        score += currentRound * 10;

        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        addScorePopup(centerX - 2, centerY - 2, `+${currentRound * 10}`, '\x1b[1;92m');

        // Big particle burst
        spawnParticles(centerX, centerY, 20, '\x1b[1;92m', ['\u2726', '\u2605', '\u2606', '\u25C8']);

        statusMessage = 'PATTERN ACCEPTED';
        statusColor = '\x1b[1;92m';
        statusBlink = true;

        triggerShake(6, 1);
      }
    } else {
      // Wrong!
      phase = 'failure';
      failureTimer = 40;
      gameOver = true;

      if (score > highScore) {
        highScore = score;
      }

      statusMessage = 'ACCESS DENIED';
      statusColor = '\x1b[1;91m';
      statusBlink = true;

      triggerShake(15, 3);

      // Error particles
      const centerX = GAME_WIDTH / 2;
      const centerY = GAME_HEIGHT / 2;
      spawnParticles(centerX, centerY, 15, '\x1b[1;91m', ['\u2717', '\u2716', '\u00D7', '\u2573']);
    }
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

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

    // Update player lit timer
    if (playerLitTimer > 0) {
      playerLitTimer--;
      if (playerLitTimer <= 0) {
        playerLitQuadrant = null;
      }
    }

    // Phase-specific updates
    switch (phase) {
      case 'showing':
        updateShowingPhase();
        break;
      case 'success':
        updateSuccessPhase();
        break;
    }
  }

  function updateShowingPhase() {
    const flashDuration = Math.floor(BASE_FLASH_DURATION * flashSpeed);
    const pauseDuration = Math.floor(BASE_PAUSE_DURATION * flashSpeed);

    if (pauseTimer > 0) {
      // Waiting between flashes
      pauseTimer--;
      litQuadrant = null;
      return;
    }

    if (flashTimer > 0) {
      // Currently showing a quadrant
      flashTimer--;
      if (flashTimer <= 0) {
        litQuadrant = null;
        showingIndex++;

        if (showingIndex >= sequence.length) {
          // Done showing, player's turn
          phase = 'player_turn';
          playerIndex = 0;
          statusMessage = 'YOUR TURN: REPEAT PATTERN';
          statusColor = '\x1b[1;93m';
          statusBlink = true;
        } else {
          pauseTimer = pauseDuration;
        }
      }
      return;
    }

    // Start showing next quadrant
    if (showingIndex < sequence.length) {
      litQuadrant = sequence[showingIndex];
      flashTimer = flashDuration;
    }
  }

  function updateSuccessPhase() {
    successTimer--;
    if (successTimer <= 0) {
      // Start next round
      currentRound++;
      playerIndex = 0;
      flashSpeed *= SPEED_MULTIPLIER;
      startNewRound();
    }
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function renderQuadrant(output: string[], quadrant: Quadrant, isLit: boolean, renderLeft: number, renderTop: number): void {
    const centerX = Math.floor(GAME_WIDTH / 2);
    const centerY = Math.floor(GAME_HEIGHT / 2);
    const color = isLit ? QUADRANT_COLORS[quadrant] : QUADRANT_DIM_COLORS[quadrant];

    // Quadrant dimensions
    const qWidth = 12;
    const qHeight = 4;

    let startX = renderLeft + 1;
    let startY = renderTop + 1;

    // Position based on quadrant
    switch (quadrant) {
      case 0: // Top
        startX = renderLeft + centerX - Math.floor(qWidth / 2);
        startY = renderTop + 2;
        break;
      case 1: // Right
        startX = renderLeft + centerX + 3;
        startY = renderTop + centerY - Math.floor(qHeight / 2);
        break;
      case 2: // Bottom
        startX = renderLeft + centerX - Math.floor(qWidth / 2);
        startY = renderTop + GAME_HEIGHT - qHeight - 1;
        break;
      case 3: // Left
        startX = renderLeft + centerX - qWidth - 2;
        startY = renderTop + centerY - Math.floor(qHeight / 2);
        break;
    }

    // Draw quadrant box
    const fillChar = isLit ? '\u2588' : '\u2591';
    const topBorder = '\u250C' + '\u2500'.repeat(qWidth) + '\u2510';
    const bottomBorder = '\u2514' + '\u2500'.repeat(qWidth) + '\u2518';

    output.push(`\x1b[${startY};${startX}H${color}${topBorder}\x1b[0m`);

    for (let row = 0; row < qHeight; row++) {
      const y = startY + 1 + row;
      // Draw filled or empty content
      if (row === Math.floor(qHeight / 2)) {
        // Center row with label
        const label = `${QUADRANT_NAMES[quadrant]} [${QUADRANT_CHARS[quadrant]}]`;
        const padding = Math.floor((qWidth - label.length) / 2);
        const leftPad = fillChar.repeat(Math.max(0, padding));
        const rightPad = fillChar.repeat(Math.max(0, qWidth - padding - label.length));
        output.push(`\x1b[${y};${startX}H${color}\u2502${leftPad}${isLit ? '\x1b[1;97m' : '\x1b[2m'}${label}${color}${rightPad}\u2502\x1b[0m`);
      } else {
        output.push(`\x1b[${y};${startX}H${color}\u2502${fillChar.repeat(qWidth)}\u2502\x1b[0m`);
      }
    }

    output.push(`\x1b[${startY + qHeight + 1};${startX}H${color}${bottomBorder}\x1b[0m`);
  }

  function render() {
    const outputParts: string[] = [];
    outputParts.push('\x1b[2J\x1b[H');

    // Effect timers
    if (shakeFrames > 0) shakeFrames--;

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      const hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider \u2192' : 'Make pane taller \u2193';
      const msg2 = `Need: ${MIN_COLS}\u00D7${MIN_ROWS}  Have: ${cols}\u00D7${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      outputParts.push(`\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`);
      outputParts.push(`\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`);
      outputParts.push(`\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`);
      terminal.write(outputParts.join(''));
      return;
    }

    // Center game area
    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
    gameTop = Math.max(4, Math.floor((rows - GAME_HEIGHT - 8) / 2));

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
      outputParts.push(`\x1b[1;${titleX}H\x1b[91m${title[0]}\x1b[0m`);
      outputParts.push(`\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`);
    } else {
      outputParts.push(`\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`);
      outputParts.push(`\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`);
    }

    // Stats bar
    const stats = `LEVEL: ${currentRound}  SCORE: ${score.toString().padStart(5, '0')}  HIGH: ${highScore.toString().padStart(5, '0')}`;
    const statsX = Math.floor((cols - stats.length) / 2);
    outputParts.push(`\x1b[${gameTop - 1};${statsX}H${themeColor}${stats}\x1b[0m`);

    // Game border
    outputParts.push(`\x1b[${renderTop};${renderLeft}H${themeColor}\u2554${'\u2550'.repeat(GAME_WIDTH)}\u2557\x1b[0m`);
    for (let y = 0; y < GAME_HEIGHT; y++) {
      outputParts.push(`\x1b[${renderTop + 1 + y};${renderLeft}H${themeColor}\u2551\x1b[0m`);
      outputParts.push(`\x1b[${renderTop + 1 + y};${renderLeft + GAME_WIDTH + 1}H${themeColor}\u2551\x1b[0m`);
    }
    outputParts.push(`\x1b[${renderTop + GAME_HEIGHT + 1};${renderLeft}H${themeColor}\u255A${'\u2550'.repeat(GAME_WIDTH)}\u255D\x1b[0m`);

    // PAUSE MENU
    if (paused) {
      const pauseMsg = '\u2550\u2550 PAUSED \u2550\u2550';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      outputParts.push(`\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`);

      outputParts.push(renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: pauseCenterX,
        startY: pauseY + 2,
        showShortcuts: false,
      }));

      const navHint = '\u2191\u2193 select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      outputParts.push(`\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`);
    }
    // START SCREEN
    else if (!gameStarted) {
      const startMsg = '[ PRESS ANY KEY TO HACK ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      outputParts.push(`\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`);

      const controls = '\u2191\u2193\u2190\u2192 or 1234 to match pattern';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      outputParts.push(`\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`);

      const desc = 'Watch. Remember. Repeat.';
      const descX = gameLeft + Math.floor((GAME_WIDTH - desc.length) / 2) + 1;
      outputParts.push(`\x1b[${startY + 4};${descX}H\x1b[2m${themeColor}${desc}\x1b[0m`);
    }
    // GAME OVER
    else if (gameOver) {
      // Draw quadrants dimmed
      for (let q = 0; q < 4; q++) {
        renderQuadrant(outputParts, q as Quadrant, false, renderLeft, renderTop);
      }

      const overMsg = '\u2554\u2550\u2550 SECURITY LOCKOUT \u2550\u2550\u2557';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
      outputParts.push(`\x1b[${overY};${overX}H\x1b[1;91m${overMsg}\x1b[0m`);

      const scoreLine = `LEVELS CLEARED: ${currentRound - 1}  SCORE: ${score}`;
      const scoreX = gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1;
      outputParts.push(`\x1b[${overY + 1};${scoreX}H${themeColor}${scoreLine}\x1b[0m`);

      const highLine = score >= highScore ? '\u2606 NEW HIGH SCORE! \u2606' : `HIGH SCORE: ${highScore}`;
      const highX = gameLeft + Math.floor((GAME_WIDTH - highLine.length) / 2) + 1;
      const highColor = score >= highScore ? '\x1b[1;93m' : themeColor;
      outputParts.push(`\x1b[${overY + 2};${highX}H${highColor}${highLine}\x1b[0m`);

      const restart = '\u255A [R] RESTART  [Q] QUIT \u255D';
      const restartX = gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1;
      outputParts.push(`\x1b[${overY + 4};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`);
    }
    // GAMEPLAY
    else {
      // Determine which quadrant is lit
      const activeLit = playerLitQuadrant !== null ? playerLitQuadrant : litQuadrant;

      // Draw all quadrants
      for (let q = 0; q < 4; q++) {
        renderQuadrant(outputParts, q as Quadrant, activeLit === q, renderLeft, renderTop);
      }

      // Status message in center
      const blinkStyle = statusBlink && glitchFrame % 20 < 10 ? '\x1b[5m' : '';
      const msgX = gameLeft + Math.floor((GAME_WIDTH - statusMessage.length) / 2) + 1;
      const msgY = gameTop + Math.floor(GAME_HEIGHT / 2);
      outputParts.push(`\x1b[${msgY};${msgX}H${blinkStyle}${statusColor}${statusMessage}\x1b[0m`);

      // Progress indicator during player turn
      if (phase === 'player_turn') {
        const progress = `[${playerIndex + 1}/${sequence.length}]`;
        const progX = gameLeft + Math.floor((GAME_WIDTH - progress.length) / 2) + 1;
        outputParts.push(`\x1b[${msgY + 1};${progX}H\x1b[2m${themeColor}${progress}\x1b[0m`);
      }

      // Draw particles
      for (const p of particles) {
        const screenX = Math.round(renderLeft + 1 + p.x);
        const screenY = Math.round(renderTop + 1 + p.y);
        if (screenX > renderLeft && screenX < renderLeft + GAME_WIDTH + 1 &&
            screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          outputParts.push(`\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`);
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const screenX = Math.round(renderLeft + 1 + popup.x);
        const screenY = Math.round(renderTop + 1 + popup.y);
        if (screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
          const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          outputParts.push(`\x1b[${screenY};${screenX}H${alpha}${popup.color}${popup.text}\x1b[0m`);
        }
      }
    }

    // Bottom hint
    const hint = gameStarted && !gameOver && !paused ? `SEQUENCE LENGTH: ${sequence.length}  [ ESC ] MENU` : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    outputParts.push(`\x1b[${gameTop + GAME_HEIGHT + 3};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`);

    terminal.write(outputParts.join(''));
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
        initGame();
        gameStarted = true;
        return;
      }

      // Game over - R to restart
      if (gameOver) {
        if (key === 'r') {
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

      // GAMEPLAY INPUT - Simon quadrant selection
      if (phase === 'player_turn') {
        switch (domEvent.key) {
          case 'ArrowUp':
          case '1':
            handlePlayerInput(0);
            break;
          case 'ArrowRight':
          case '2':
            handlePlayerInput(1);
            break;
          case 'ArrowDown':
          case '3':
            handlePlayerInput(2);
            break;
          case 'ArrowLeft':
          case '4':
            handlePlayerInput(3);
            break;
        }
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
