/**
 * Hyper Tron
 *
 * Light cycles - you vs AI. Don't hit walls or trails.
 * Cyberpunk-themed with glitchy effects and theme-aware colors.
 * Best of 5 rounds, speed increases each round, optional shrinking arena.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Tron Game Controller
 */
export interface TronController {
  stop: () => void;
  isRunning: boolean;
}

// ============================================================================
// TYPES
// ============================================================================

type Direction = 'up' | 'down' | 'left' | 'right';

interface Position {
  x: number;
  y: number;
}

interface LightCycle {
  x: number;
  y: number;
  direction: Direction;
  trail: Position[];
  alive: boolean;
  color: string;
  char: string;
  trailChar: string;
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

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runTronGame(terminal: Terminal): TronController {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const MIN_COLS = 40;
  const MIN_ROWS = 18;
  const GAME_WIDTH = 46;
  const GAME_HEIGHT = 18;
  const ROUNDS_TO_WIN = 3;
  const BASE_SPEED = 100; // ms per move
  const SPEED_DECREASE_PER_ROUND = 12; // Faster each round
  const COUNTDOWN_SECONDS = 3;
  const SHRINK_INTERVAL = 150; // ticks before arena shrinks
  const SHRINK_AMOUNT = 1; // How much to shrink per side

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let matchOver = false;

  // Positioning
  let gameLeft = 2;
  let gameTop = 5;

  // Round state
  let currentRound = 1;
  let playerWins = 0;
  let aiWins = 0;
  let countdown = 0; // Countdown before round starts
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let roundInProgress = false;

  // Arena shrinking
  const shrinkEnabled = true;
  let shrinkTicks = 0;
  let arenaMinX = 0;
  let arenaMaxX = GAME_WIDTH - 1;
  let arenaMinY = 0;
  let arenaMaxY = GAME_HEIGHT - 1;

  // Light cycles
  let player: LightCycle;
  let ai: LightCycle;
  let nextPlayerDirection: Direction = 'right';

  // Visual effects
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let winnerMessage = '';
  let gameSpeed = BASE_SPEED;
  let gameInterval: ReturnType<typeof setInterval> | null = null;

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: TronController = {
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
    '█ █ █▄█ █▀█ █▀▀ █▀█   ▀█▀ █▀█ █▀█ █▄ █',
    '█▀█  █  █▀▀ ██▄ █▀▄    █  █▀▄ █▄█ █ ▀█',
  ];

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['░', '▒', '▓', '█', '◆']) {
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
        life: 12 + Math.floor(Math.random() * 10),
      });
    }
  }

  function spawnExplosion(x: number, y: number, color: string) {
    // Big explosion on crash
    spawnParticles(x, y, 20, color, ['✗', '×', '░', '▒', '▓', '█']);
    triggerShake(12, 3);
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  // -------------------------------------------------------------------------
  // GAME LOGIC
  // -------------------------------------------------------------------------

  function initGame() {
    currentRound = 1;
    playerWins = 0;
    aiWins = 0;
    matchOver = false;
    gameOver = false;
    paused = false;

    // Reset effects
    particles = [];
    shakeFrames = 0;
    winnerMessage = '';

    initRound();
  }

  function initRound() {
    // Reset arena
    arenaMinX = 0;
    arenaMaxX = GAME_WIDTH - 1;
    arenaMinY = 0;
    arenaMaxY = GAME_HEIGHT - 1;
    shrinkTicks = 0;

    // Calculate speed for this round
    gameSpeed = Math.max(40, BASE_SPEED - (currentRound - 1) * SPEED_DECREASE_PER_ROUND);

    // Initialize player (left side, moving right)
    player = {
      x: 5,
      y: Math.floor(GAME_HEIGHT / 2),
      direction: 'right',
      trail: [],
      alive: true,
      color: themeColor,
      char: '█',
      trailChar: '│',
    };

    // Initialize AI (right side, moving left)
    ai = {
      x: GAME_WIDTH - 6,
      y: Math.floor(GAME_HEIGHT / 2),
      direction: 'left',
      trail: [],
      alive: true,
      color: '\x1b[91m', // Red for AI
      char: '█',
      trailChar: '│',
    };

    nextPlayerDirection = 'right';
    roundInProgress = false;
    particles = [];
    winnerMessage = '';

    // Start countdown
    countdown = COUNTDOWN_SECONDS;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        roundInProgress = true;
        startGameLoop();
      }
    }, 1000);
  }

  function startGameLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(() => {
      if (!running) {
        if (gameInterval) clearInterval(gameInterval);
        return;
      }
      update();
    }, gameSpeed);
  }

  function stopGameLoop() {
    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
  }

  function getTrailChar(dir: Direction): string {
    switch (dir) {
      case 'up':
      case 'down':
        return '│';
      case 'left':
      case 'right':
        return '─';
    }
  }

  function moveCycle(cycle: LightCycle) {
    if (!cycle.alive) return;

    // Add current position to trail
    cycle.trail.push({ x: cycle.x, y: cycle.y });
    cycle.trailChar = getTrailChar(cycle.direction);

    // Move
    switch (cycle.direction) {
      case 'up': cycle.y--; break;
      case 'down': cycle.y++; break;
      case 'left': cycle.x--; break;
      case 'right': cycle.x++; break;
    }
  }

  function checkCollision(cycle: LightCycle): boolean {
    // Wall collision (including shrinking arena)
    if (cycle.x <= arenaMinX || cycle.x >= arenaMaxX ||
        cycle.y <= arenaMinY || cycle.y >= arenaMaxY) {
      return true;
    }

    // Self trail collision
    for (const pos of cycle.trail) {
      if (pos.x === cycle.x && pos.y === cycle.y) {
        return true;
      }
    }

    // Other cycle trail collision
    const other = cycle === player ? ai : player;
    for (const pos of other.trail) {
      if (pos.x === cycle.x && pos.y === cycle.y) {
        return true;
      }
    }

    // Head-on collision with other cycle
    if (cycle.x === other.x && cycle.y === other.y) {
      return true;
    }

    return false;
  }

  function updateAI() {
    if (!ai.alive || !player.alive) return;

    // AI pathfinding - avoid walls and trails
    const possibleMoves: Direction[] = [];
    const opposite: Record<Direction, Direction> = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left',
    };

    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const currentOpposite = opposite[ai.direction];

    for (const dir of directions) {
      // Can't reverse
      if (dir === currentOpposite) continue;

      const testX = ai.x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
      const testY = ai.y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);

      // Check if move is safe
      if (isSafePosition(testX, testY)) {
        possibleMoves.push(dir);
      }
    }

    if (possibleMoves.length === 0) {
      // No safe moves, keep going (will crash)
      return;
    }

    // Score each move - prefer moves that lead to more open space
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;

    for (const move of possibleMoves) {
      const testX = ai.x + (move === 'left' ? -1 : move === 'right' ? 1 : 0);
      const testY = ai.y + (move === 'up' ? -1 : move === 'down' ? 1 : 0);
      const score = evaluatePosition(testX, testY, move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // Add some randomness to make AI less predictable
    if (possibleMoves.length > 1 && Math.random() < 0.15) {
      bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    ai.direction = bestMove;
  }

  function isSafePosition(x: number, y: number): boolean {
    // Wall check
    if (x <= arenaMinX || x >= arenaMaxX || y <= arenaMinY || y >= arenaMaxY) {
      return false;
    }

    // Trail check
    for (const pos of player.trail) {
      if (pos.x === x && pos.y === y) return false;
    }
    for (const pos of ai.trail) {
      if (pos.x === x && pos.y === y) return false;
    }

    // Player position check
    if (player.x === x && player.y === y) return false;

    return true;
  }

  function evaluatePosition(x: number, y: number, direction: Direction): number {
    let score = 0;

    // Count open spaces in a cone in front
    const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;

    // Look ahead 5 cells
    for (let i = 1; i <= 5; i++) {
      const checkX = x + dx * i;
      const checkY = y + dy * i;
      if (isSafePosition(checkX, checkY)) {
        score += 5 - i; // Closer cells worth more
      } else {
        break;
      }
    }

    // Prefer staying in center of arena
    const centerX = (arenaMinX + arenaMaxX) / 2;
    const centerY = (arenaMinY + arenaMaxY) / 2;
    const distFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
    score -= distFromCenter * 0.1;

    // Try to cut off player - head toward their direction
    const distToPlayer = Math.abs(x - player.x) + Math.abs(y - player.y);
    if (distToPlayer < 10) {
      score += (10 - distToPlayer) * 0.5;
    }

    return score;
  }

  function updateArena() {
    if (!shrinkEnabled) return;

    shrinkTicks++;
    if (shrinkTicks >= SHRINK_INTERVAL) {
      shrinkTicks = 0;

      // Shrink arena
      const canShrinkX = arenaMaxX - arenaMinX > 20;
      const canShrinkY = arenaMaxY - arenaMinY > 10;

      if (canShrinkX || canShrinkY) {
        if (canShrinkX) {
          arenaMinX += SHRINK_AMOUNT;
          arenaMaxX -= SHRINK_AMOUNT;
        }
        if (canShrinkY) {
          arenaMinY += SHRINK_AMOUNT;
          arenaMaxY -= SHRINK_AMOUNT;
        }

        // Light shake to indicate shrink
        triggerShake(4, 1);
      }
    }
  }

  function update() {
    if (!gameStarted || gameOver || paused || !roundInProgress) return;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update AI
    updateAI();

    // Apply player direction change
    player.direction = nextPlayerDirection;

    // Move cycles
    moveCycle(player);
    moveCycle(ai);

    // Check collisions
    const playerCollided = checkCollision(player);
    const aiCollided = checkCollision(ai);

    if (playerCollided && aiCollided) {
      // Both crashed - tie, no points
      player.alive = false;
      ai.alive = false;
      spawnExplosion(player.x, player.y, player.color);
      spawnExplosion(ai.x, ai.y, ai.color);
      winnerMessage = 'DRAW!';
      endRound();
    } else if (playerCollided) {
      player.alive = false;
      spawnExplosion(player.x, player.y, player.color);
      aiWins++;
      winnerMessage = 'AI WINS ROUND!';
      endRound();
    } else if (aiCollided) {
      ai.alive = false;
      spawnExplosion(ai.x, ai.y, ai.color);
      playerWins++;
      winnerMessage = 'YOU WIN ROUND!';
      endRound();
    }

    // Update arena shrinking
    updateArena();
  }

  function endRound() {
    stopGameLoop();
    roundInProgress = false;

    // Check for match end
    if (playerWins >= ROUNDS_TO_WIN) {
      matchOver = true;
      gameOver = true;
      winnerMessage = 'VICTORY! YOU WIN THE MATCH!';
    } else if (aiWins >= ROUNDS_TO_WIN) {
      matchOver = true;
      gameOver = true;
      winnerMessage = 'DEFEAT! AI WINS THE MATCH!';
    }
  }

  function nextRound() {
    if (!matchOver && !gameOver) {
      currentRound++;
      initRound();
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

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      const hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider \u2192' : 'Make pane taller \u2193';
      const msg2 = `Need: ${MIN_COLS}\u00d7${MIN_ROWS}  Have: ${cols}\u00d7${rows}`;
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
      output += `\x1b[1;${titleX}H\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    // Stats bar
    const roundInfo = `ROUND ${currentRound}`;
    const scoreInfo = `YOU: ${playerWins}  AI: ${aiWins}  (First to ${ROUNDS_TO_WIN})`;
    const statsX = Math.floor((cols - scoreInfo.length) / 2);
    output += `\x1b[${gameTop - 1};${statsX}H${themeColor}${roundInfo}  ${scoreInfo}\x1b[0m`;

    // Game border - draw full arena, then overlay shrink borders
    output += `\x1b[${renderTop};${renderLeft}H${themeColor}\x1b[2m\u2554${'═'.repeat(GAME_WIDTH)}\u2557\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${themeColor}\x1b[2m\u2551\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + GAME_WIDTH + 1}H${themeColor}\x1b[2m\u2551\x1b[0m`;
    }
    output += `\x1b[${renderTop + GAME_HEIGHT + 1};${renderLeft}H${themeColor}\x1b[2m\u255a${'═'.repeat(GAME_WIDTH)}\u255d\x1b[0m`;

    // Draw shrinking arena borders (bright)
    if (shrinkEnabled && (arenaMinX > 0 || arenaMinY > 0)) {
      // Draw active arena boundary
      const shrinkColor = '\x1b[1;93m'; // Bright yellow warning
      for (let x = arenaMinX; x <= arenaMaxX; x++) {
        output += `\x1b[${renderTop + 1 + arenaMinY};${renderLeft + 1 + x}H${shrinkColor}\u2500\x1b[0m`;
        output += `\x1b[${renderTop + 1 + arenaMaxY};${renderLeft + 1 + x}H${shrinkColor}\u2500\x1b[0m`;
      }
      for (let y = arenaMinY; y <= arenaMaxY; y++) {
        output += `\x1b[${renderTop + 1 + y};${renderLeft + 1 + arenaMinX}H${shrinkColor}\u2502\x1b[0m`;
        output += `\x1b[${renderTop + 1 + y};${renderLeft + 1 + arenaMaxX}H${shrinkColor}\u2502\x1b[0m`;
      }
    }

    // PAUSE MENU
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

      const navHint = '\u2191\u2193 select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    }
    // START SCREEN
    else if (!gameStarted) {
      const startMsg = '[ PRESS ANY KEY TO PLAY ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '\u2190\u2191\u2192\u2193 TURN (no reverse)';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

      const info = 'Last cycle alive wins!';
      const infoX = gameLeft + Math.floor((GAME_WIDTH - info.length) / 2) + 1;
      output += `\x1b[${startY + 3};${infoX}H\x1b[2m${themeColor}${info}\x1b[0m`;
    }
    // COUNTDOWN
    else if (countdown > 0) {
      // Draw cycles at starting positions
      output += `\x1b[${renderTop + 1 + player.y};${renderLeft + 1 + player.x}H${player.color}${player.char}\x1b[0m`;
      output += `\x1b[${renderTop + 1 + ai.y};${renderLeft + 1 + ai.x}H${ai.color}${ai.char}\x1b[0m`;

      const countdownStr = countdown.toString();
      const countdownX = gameLeft + Math.floor(GAME_WIDTH / 2);
      const countdownY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${countdownY};${countdownX}H\x1b[1;97m${countdownStr}\x1b[0m`;
    }
    // ROUND END (not match over)
    else if (!roundInProgress && !matchOver && gameStarted) {
      // Draw final state
      output = renderTrailsAndCycles(output, renderLeft, renderTop);

      // Winner message
      const msgX = gameLeft + Math.floor((GAME_WIDTH - winnerMessage.length) / 2) + 1;
      const msgY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      const msgColor = winnerMessage.includes('YOU') ? '\x1b[1;92m' : '\x1b[1;91m';
      output += `\x1b[${msgY};${msgX}H${msgColor}${winnerMessage}\x1b[0m`;

      const nextMsg = 'Press SPACE for next round';
      const nextX = gameLeft + Math.floor((GAME_WIDTH - nextMsg.length) / 2) + 1;
      output += `\x1b[${msgY + 2};${nextX}H\x1b[2m${themeColor}${nextMsg}\x1b[0m`;

      // Draw particles
      output = renderParticles(output, renderLeft, renderTop);
    }
    // MATCH OVER
    else if (gameOver) {
      // Draw final state
      output = renderTrailsAndCycles(output, renderLeft, renderTop);

      const overColor = playerWins >= ROUNDS_TO_WIN ? '\x1b[1;92m' : '\x1b[1;91m';
      const overMsg = playerWins >= ROUNDS_TO_WIN
        ? '\u2554\u2550\u2550 VICTORY! \u2550\u2550\u2557'
        : '\u2554\u2550\u2550 DEFEAT \u2550\u2550\u2557';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${overX}H${overColor}${overMsg}\x1b[0m`;

      const scoreLine = `FINAL: YOU ${playerWins} - ${aiWins} AI`;
      const scoreX = gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1;
      output += `\x1b[${overY + 1};${scoreX}H${themeColor}${scoreLine}\x1b[0m`;

      const restart = '\u255a [R] RESTART  [Q] QUIT \u255d';
      const restartX = gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1;
      output += `\x1b[${overY + 2};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;

      // Draw particles
      output = renderParticles(output, renderLeft, renderTop);
    }
    // GAMEPLAY
    else {
      // Draw trails
      for (const pos of player.trail) {
        if (pos.x > arenaMinX && pos.x < arenaMaxX && pos.y > arenaMinY && pos.y < arenaMaxY) {
          output += `\x1b[${renderTop + 1 + pos.y};${renderLeft + 1 + pos.x}H\x1b[2m${player.color}\u2502\x1b[0m`;
        }
      }
      for (const pos of ai.trail) {
        if (pos.x > arenaMinX && pos.x < arenaMaxX && pos.y > arenaMinY && pos.y < arenaMaxY) {
          output += `\x1b[${renderTop + 1 + pos.y};${renderLeft + 1 + pos.x}H\x1b[2m${ai.color}\u2502\x1b[0m`;
        }
      }

      // Draw cycles
      if (player.alive) {
        output += `\x1b[${renderTop + 1 + player.y};${renderLeft + 1 + player.x}H\x1b[1m${player.color}${player.char}\x1b[0m`;
      }
      if (ai.alive) {
        output += `\x1b[${renderTop + 1 + ai.y};${renderLeft + 1 + ai.x}H\x1b[1m${ai.color}${ai.char}\x1b[0m`;
      }

      // Draw particles
      output = renderParticles(output, renderLeft, renderTop);
    }

    // Bottom hint
    const hint = gameStarted && !gameOver && !paused
      ? `SPEED: ${Math.round((1 - gameSpeed / BASE_SPEED) * 100) + 100}%  [ ESC ] MENU`
      : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  function renderTrailsAndCycles(output: string, renderLeft: number, renderTop: number): string {
    // Draw trails
    for (const pos of player.trail) {
      output += `\x1b[${renderTop + 1 + pos.y};${renderLeft + 1 + pos.x}H\x1b[2m${player.color}\u2502\x1b[0m`;
    }
    for (const pos of ai.trail) {
      output += `\x1b[${renderTop + 1 + pos.y};${renderLeft + 1 + pos.x}H\x1b[2m${ai.color}\u2502\x1b[0m`;
    }

    // Draw cycles (if alive)
    if (player.alive) {
      output += `\x1b[${renderTop + 1 + player.y};${renderLeft + 1 + player.x}H\x1b[1m${player.color}${player.char}\x1b[0m`;
    }
    if (ai.alive) {
      output += `\x1b[${renderTop + 1 + ai.y};${renderLeft + 1 + ai.x}H\x1b[1m${ai.color}${ai.char}\x1b[0m`;
    }

    return output;
  }

  function renderParticles(output: string, renderLeft: number, renderTop: number): string {
    for (const p of particles) {
      const screenX = Math.round(renderLeft + 1 + p.x);
      const screenY = Math.round(renderTop + 1 + p.y);
      if (screenX > renderLeft && screenX < renderLeft + GAME_WIDTH + 1 &&
          screenY > renderTop && screenY < renderTop + GAME_HEIGHT + 1) {
        const alpha = p.life > 5 ? '' : '\x1b[2m';
        output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
      }
    }
    return output;
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

    const particleInterval = setInterval(() => {
      if (!running) { clearInterval(particleInterval); return; }
      // Update particles even when paused for visual continuity
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }, 25);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) { keyListener.dispose(); return; }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key.toLowerCase();

      // ESC toggles pause
      if (key === 'escape') {
        paused = !paused;
        if (paused) {
          pauseMenuSelection = 0;
          stopGameLoop();
        } else if (roundInProgress) {
          startGameLoop();
        }
        return;
      }

      // Q to quit from pause/game over/start screen
      if (key === 'q' && (paused || gameOver || !gameStarted)) {
        if (countdownTimer) clearInterval(countdownTimer);
        stopGameLoop();
        clearInterval(renderInterval);
        clearInterval(particleInterval);
        controller.stop();
        dispatchGameQuit(terminal);
        return;
      }

      // Start screen - any key starts
      if (!gameStarted && !paused) {
        gameStarted = true;
        initRound();
        return;
      }

      // Game over - R to restart
      if (gameOver) {
        if (key === 'r') {
          initGame();
          gameStarted = true;
          initRound();
        }
        return;
      }

      // Round end (not match over) - space for next round
      if (!roundInProgress && !matchOver && gameStarted && !paused) {
        if (key === ' ' || domEvent.key === ' ') {
          nextRound();
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
            case 0: // Resume
              paused = false;
              if (roundInProgress) startGameLoop();
              break;
            case 1: // Restart
              initGame();
              gameStarted = true;
              paused = false;
              break;
            case 2: // Quit
              if (countdownTimer) clearInterval(countdownTimer);
              stopGameLoop();
              clearInterval(renderInterval);
              clearInterval(particleInterval);
              controller.stop();
              dispatchGameQuit(terminal);
              break;
            case 3: // List Games
              if (countdownTimer) clearInterval(countdownTimer);
              stopGameLoop();
              clearInterval(renderInterval);
              clearInterval(particleInterval);
              running = false;
              dispatchGamesMenu(terminal);
              break;
            case 4: // Next Game
              if (countdownTimer) clearInterval(countdownTimer);
              stopGameLoop();
              clearInterval(renderInterval);
              clearInterval(particleInterval);
              running = false;
              dispatchGameSwitch(terminal);
              break;
          }
          return;
        }

        // Legacy shortcuts
        if (key === 'r') {
          initGame();
          gameStarted = true;
          paused = false;
        } else if (key === 'l') {
          if (countdownTimer) clearInterval(countdownTimer);
          stopGameLoop();
          clearInterval(renderInterval);
          clearInterval(particleInterval);
          running = false;
          dispatchGamesMenu(terminal);
        } else if (key === 'n') {
          if (countdownTimer) clearInterval(countdownTimer);
          stopGameLoop();
          clearInterval(renderInterval);
          clearInterval(particleInterval);
          running = false;
          dispatchGameSwitch(terminal);
        }
        return;
      }

      // GAMEPLAY INPUT - arrow keys to turn
      if (roundInProgress && player.alive) {
        const opposite: Record<Direction, Direction> = {
          'up': 'down',
          'down': 'up',
          'left': 'right',
          'right': 'left',
        };

        let newDir: Direction | null = null;

        switch (domEvent.key) {
          case 'ArrowUp':
          case 'w':
            newDir = 'up';
            break;
          case 'ArrowDown':
          case 's':
            newDir = 'down';
            break;
          case 'ArrowLeft':
          case 'a':
            newDir = 'left';
            break;
          case 'ArrowRight':
          case 'd':
            newDir = 'right';
            break;
        }

        // Can't reverse direction
        if (newDir && newDir !== opposite[player.direction]) {
          nextPlayerDirection = newDir;
        }
      }
    });

    // Clean up on stop
    const originalStop = controller.stop;
    controller.stop = () => {
      if (countdownTimer) clearInterval(countdownTimer);
      stopGameLoop();
      clearInterval(renderInterval);
      clearInterval(particleInterval);
      keyListener.dispose();
      originalStop();
    };
  }, 25);

  return controller;
}
