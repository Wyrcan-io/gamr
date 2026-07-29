/**
 * Hyper Pong
 *
 * Cyberpunk-themed Pong game with glitchy effects,
 * neon visuals, and theme-aware colors.
 * Single player vs AI.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Pong Game Controller
 */
export interface PongController {
  stop: () => void;
  isRunning: boolean;
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

/**
 * Cyberpunk Pong Game
 */
export function runPongGame(terminal: Terminal): PongController {
  const themeColor = getCurrentThemeColor();

  // Minimum terminal size (reduced for better compatibility)
  const MIN_COLS = 40;
  const MIN_ROWS = 16;

  // Game dimensions - adaptive based on terminal size
  // Width: 40-60, Height: 14-20
  const getGameDimensions = () => {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const width = Math.min(60, Math.max(40, cols - 6));
    const height = Math.min(20, Math.max(14, rows - 6));
    return { width, height };
  };

  let { width: GAME_WIDTH, height: GAME_HEIGHT } = getGameDimensions();
  const PADDLE_HEIGHT = Math.max(3, Math.min(4, Math.floor(GAME_HEIGHT / 5)));
  const PADDLE_OFFSET = 2;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;

  // Game area positioning
  let gameLeft = 2;
  let gameTop = 4;

  // Scores
  let playerScore = 0;
  let aiScore = 0;
  const WIN_SCORE = 7;

  // Paddle positions (y coordinate of top of paddle)
  let playerY = Math.floor((GAME_HEIGHT - PADDLE_HEIGHT) / 2);
  let aiY = Math.floor((GAME_HEIGHT - PADDLE_HEIGHT) / 2);

  // Ball state
  let ballX = GAME_WIDTH / 2;
  let ballY = GAME_HEIGHT / 2;
  let ballVX = 0.4;
  let ballVY = 0.3;
  const BALL_SPEED = 0.5;
  const MAX_BALL_SPEED = 0.9;

  // AI difficulty (reaction delay)
  let aiReactionTimer = 0;
  const AI_REACTION_DELAY = 3;
  const AI_SPEED = 0.4;

  // Visual effects
  let glitchFrame = 0;
  let scoreFlash = 0;
  let ballTrail: { x: number; y: number; speed: number }[] = [];

  // Score celebration effects
  let scoreFreeze = 0; // Pause frames after scoring
  let lastScorer: 'player' | 'ai' | null = null;
  let screenShake = 0;
  let goalExplosion: { x: number; y: number; char: string; color: string }[] = [];
  let goalFlashSide: 'left' | 'right' | null = null;

  // Juicy effects
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let paddleHitFlash = 0;
  let rallyCount = 0;
  let wallHitFlash = 0;

  const controller: PongController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   █▀█ █▀█ █▄ █ █▀▀',
    '█▀█  █  █▀▀ ██▄ █▀▄   █▀▀ █▄█ █ ▀█ █▄█',
  ];

  function initGame() {
    playerY = Math.floor((GAME_HEIGHT - PADDLE_HEIGHT) / 2);
    aiY = Math.floor((GAME_HEIGHT - PADDLE_HEIGHT) / 2);
    resetBall(true);
    gameOver = false;
    paused = false;
    scoreFlash = 0;
    ballTrail = [];
    scoreFreeze = 0;
    lastScorer = null;
    screenShake = 0;
    goalExplosion = [];
    goalFlashSide = null;
    // Reset juicy effects
    particles = [];
    scorePopups = [];
    paddleHitFlash = 0;
    rallyCount = 0;
    wallHitFlash = 0;
  }

  // Spawn particles at position
  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['✦', '★', '◆', '●']) {
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
        life: 12 + Math.floor(Math.random() * 8),
      });
    }
  }

  // Add score popup
  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 20, color });
  }

  function createGoalExplosion(side: 'left' | 'right') {
    const x = side === 'left' ? 1 : GAME_WIDTH - 2;
    const chars = ['*', '+', '\u00d7', '\u25cf', '\u2022', '\u2605'];
    const colors = ['\x1b[93m', '\x1b[91m', '\x1b[95m', '\x1b[96m', '\x1b[97m'];

    goalExplosion = [];
    for (let i = 0; i < 12; i++) {
      goalExplosion.push({
        x: x + (Math.random() - 0.5) * 6,
        y: Math.floor(GAME_HEIGHT / 2) + (Math.random() - 0.5) * GAME_HEIGHT * 0.8,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function resetBall(towardsPlayer: boolean) {
    ballX = GAME_WIDTH / 2;
    ballY = GAME_HEIGHT / 2;

    // Random angle between -45 and 45 degrees
    const angle = (Math.random() - 0.5) * Math.PI / 2;
    const direction = towardsPlayer ? -1 : 1;

    ballVX = Math.cos(angle) * BALL_SPEED * direction;
    ballVY = Math.sin(angle) * BALL_SPEED;
    ballTrail = [];
    rallyCount = 0;
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Update effect timers
    if (paddleHitFlash > 0) paddleHitFlash--;
    if (wallHitFlash > 0) wallHitFlash--;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
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
        hint = 'Make pane wider \u2192';
      } else {
        hint = 'Make pane taller \u2193';
      }
      const msg2 = `Need: ${MIN_COLS}\u00d7${MIN_ROWS}  Have: ${cols}\u00d7${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Update game dimensions on resize
    const newDims = getGameDimensions();
    if (newDims.width !== GAME_WIDTH || newDims.height !== GAME_HEIGHT) {
      // Scale positions to new dimensions
      ballX = (ballX / GAME_WIDTH) * newDims.width;
      ballY = (ballY / GAME_HEIGHT) * newDims.height;
      playerY = Math.min(playerY, newDims.height - PADDLE_HEIGHT);
      aiY = Math.min(aiY, newDims.height - PADDLE_HEIGHT);
      GAME_WIDTH = newDims.width;
      GAME_HEIGHT = newDims.height;
    }

    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
    gameTop = Math.max(3, Math.floor((rows - GAME_HEIGHT - 4) / 2));

    // Apply screen shake
    const shakeOffsetX = screenShake > 0 ? Math.floor(Math.random() * 3) - 1 : 0;
    const shakeOffsetY = screenShake > 0 ? Math.floor(Math.random() * 2) : 0;
    const displayLeft = gameLeft + shakeOffsetX;
    const displayTop = gameTop + shakeOffsetY;

    // Glitchy title
    glitchFrame = (glitchFrame + 1) % 60;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

    output += `\x1b[1;${titleX}H`;
    if (glitchFrame >= 55 && glitchFrame < 58) {
      output += `\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `${themeColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    // Score display with flash effect
    const scoreColor = scoreFlash > 0 ? '\x1b[1;93m' : themeColor;
    if (scoreFlash > 0) scoreFlash--;
    const scoreDisplay = `YOU  [ ${playerScore} ]  -  [ ${aiScore} ]  CPU`;
    const scoreX = Math.floor((cols - scoreDisplay.length) / 2);
    output += `\x1b[4;${scoreX}H${scoreColor}${scoreDisplay}\x1b[0m`;

    // Goal flash colors
    const leftBorderColor = goalFlashSide === 'left' ? '\x1b[1;91m' : themeColor;
    const rightBorderColor = goalFlashSide === 'right' ? '\x1b[1;92m' : themeColor;

    // Wall hit flash for top/bottom borders
    const topBottomBorderColor = wallHitFlash > 0 && wallHitFlash % 4 < 2 ? '\x1b[1;93m' : themeColor;

    // Paddle hit flash for all borders
    const borderFlash = paddleHitFlash > 0 && paddleHitFlash % 4 < 2;
    const mainBorderColor = borderFlash ? '\x1b[1;96m' : topBottomBorderColor;

    // Game border
    output += `\x1b[${displayTop};${displayLeft}H${mainBorderColor}\u2554${'═'.repeat(GAME_WIDTH)}\u2557\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${displayTop + 1 + y};${displayLeft}H${borderFlash ? '\x1b[1;96m' : leftBorderColor}\u2551\x1b[0m`;
      output += `\x1b[${displayTop + 1 + y};${displayLeft + GAME_WIDTH + 1}H${borderFlash ? '\x1b[1;96m' : rightBorderColor}\u2551\x1b[0m`;
    }
    output += `\x1b[${displayTop + GAME_HEIGHT + 1};${displayLeft}H${mainBorderColor}\u255a${'═'.repeat(GAME_WIDTH)}\u255d\x1b[0m`;

    // Center line (dashed)
    const centerX = displayLeft + 1 + Math.floor(GAME_WIDTH / 2);
    for (let y = 0; y < GAME_HEIGHT; y++) {
      if (y % 2 === 0) {
        output += `\x1b[${displayTop + 1 + y};${centerX}H\x1b[2m${themeColor}\u2502\x1b[0m`;
      }
    }

    if (paused) {
      const pauseMsg = '\u2550\u2550 PAUSED \u2550\u2550';
      const pauseCenterX = gameLeft + Math.floor(GAME_WIDTH / 2) + 1;
      const pauseY = gameTop + Math.floor(GAME_HEIGHT / 2) - 3;
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
      const startMsg = '[ PRESS ANY KEY TO START ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '\u2191\u2193 MOVE  ESC MENU  FIRST TO 7 WINS';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else if (gameOver) {
      const won = playerScore >= WIN_SCORE;
      const overMsg = won ? '\u2550\u2550 YOU WIN! \u2550\u2550' : '\u2550\u2550 CPU WINS \u2550\u2550';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${overX}H${won ? '\x1b[1;92m' : '\x1b[1;91m'}${overMsg}\x1b[0m`;

      const finalScore = `FINAL: ${playerScore} - ${aiScore}`;
      const scoreX2 = gameLeft + Math.floor((GAME_WIDTH - finalScore.length) / 2) + 1;
      output += `\x1b[${overY + 2};${scoreX2}H${themeColor}${finalScore}\x1b[0m`;

      const restart = '[ R ] REMATCH  [ Q ] QUIT';
      const restartX = gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1;
      output += `\x1b[${overY + 4};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    } else {
      // Draw goal explosion particles
      for (const particle of goalExplosion) {
        const px = displayLeft + 1 + Math.floor(particle.x);
        const py = displayTop + 1 + Math.floor(particle.y);
        if (particle.y >= 0 && particle.y < GAME_HEIGHT) {
          output += `\x1b[${py};${px}H${particle.color}${particle.char}\x1b[0m`;
        }
      }

      // Draw ball trail (only if not in score freeze)
      if (scoreFreeze === 0) {
        for (let i = 0; i < ballTrail.length; i++) {
          const trail = ballTrail[i];
          const trailX = displayLeft + 1 + Math.floor(trail.x);
          const trailY = displayTop + 1 + Math.floor(trail.y);
          const brightness = i < ballTrail.length / 2 ? '\x1b[2m' : '';
          // Color based on speed
          const trailColor = trail.speed > 0.7 ? '\x1b[91m' : trail.speed > 0.5 ? '\x1b[93m' : themeColor;
          output += `\x1b[${trailY};${trailX}H${brightness}${trailColor}\u00b7\x1b[0m`;
        }

        // Draw ball with color based on speed
        const ballScreenX = displayLeft + 1 + Math.floor(ballX);
        const ballScreenY = displayTop + 1 + Math.floor(ballY);
        const currentSpeed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
        const ballColor = currentSpeed > 0.7 ? '\x1b[1;91m' : currentSpeed > 0.5 ? '\x1b[1;93m' : '\x1b[1;97m';
        output += `\x1b[${ballScreenY};${ballScreenX}H${ballColor}\u25cf\x1b[0m`;
      }

      // Draw particles
      for (const p of particles) {
        const px = Math.round(displayLeft + 1 + p.x);
        const py = Math.round(displayTop + 1 + p.y);
        if (p.x >= 0 && p.x < GAME_WIDTH && p.y >= 0 && p.y < GAME_HEIGHT) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const px = Math.round(displayLeft + 1 + popup.x);
        const py = Math.round(displayTop + 1 + popup.y);
        if (popup.y >= 0 && popup.y < GAME_HEIGHT) {
          const alpha = popup.frames > 12 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }

      // Draw rally counter
      if (rallyCount >= 3) {
        const rallyMsg = rallyCount >= 10 ? `★ ${rallyCount} RALLY! ★` : `${rallyCount} RALLY!`;
        const rallyX = displayLeft + Math.floor((GAME_WIDTH - rallyMsg.length) / 2) + 1;
        const rallyColor = glitchFrame % 6 < 3 ? '\x1b[1;93m' : '\x1b[1;96m';
        output += `\x1b[${displayTop + 2};${rallyX}H${rallyColor}${rallyMsg}\x1b[0m`;
      }

      // Draw player paddle (left side) with hit flash
      const playerPaddleX = displayLeft + 1 + PADDLE_OFFSET;
      const playerPaddleColor = paddleHitFlash > 0 && paddleHitFlash % 4 < 2 ? '\x1b[1;97m' : themeColor;
      for (let i = 0; i < PADDLE_HEIGHT; i++) {
        const py = Math.floor(playerY) + i;
        if (py >= 0 && py < GAME_HEIGHT) {
          output += `\x1b[${displayTop + 1 + py};${playerPaddleX}H${playerPaddleColor}\u2588\x1b[0m`;
        }
      }

      // Draw AI paddle (right side) with hit flash
      const aiPaddleX = displayLeft + GAME_WIDTH - PADDLE_OFFSET;
      const aiPaddleColor = paddleHitFlash > 0 && paddleHitFlash % 4 < 2 ? '\x1b[1;97m' : '\x1b[91m';
      for (let i = 0; i < PADDLE_HEIGHT; i++) {
        const ay = Math.floor(aiY) + i;
        if (ay >= 0 && ay < GAME_HEIGHT) {
          output += `\x1b[${displayTop + 1 + ay};${aiPaddleX}H${aiPaddleColor}\u2588\x1b[0m`;
        }
      }

      // Draw score message during freeze
      if (scoreFreeze > 0 && lastScorer) {
        const scoreMsg = lastScorer === 'player' ? '\u2605 GOAL! \u2605' : '\u2716 MISS! \u2716';
        const msgColor = lastScorer === 'player' ? '\x1b[1;92m' : '\x1b[1;91m';
        const msgX = displayLeft + Math.floor((GAME_WIDTH - scoreMsg.length) / 2) + 1;
        const msgY = displayTop + Math.floor(GAME_HEIGHT / 2);
        output += `\x1b[${msgY};${msgX}H${msgColor}${scoreMsg}\x1b[0m`;
      }
    }

    // Hint
    const hint = gameStarted && !gameOver && !paused ? '[ ESC ] MENU' : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

    // Handle score freeze (pause after scoring)
    if (scoreFreeze > 0) {
      scoreFreeze--;
      if (screenShake > 0) screenShake--;

      // Animate explosion particles outward
      for (const particle of goalExplosion) {
        const dx = particle.x < GAME_WIDTH / 2 ? -0.5 : 0.5;
        particle.x += dx + (Math.random() - 0.5) * 0.3;
        particle.y += (Math.random() - 0.5) * 0.5;
      }

      // Clear effects when freeze ends
      if (scoreFreeze === 0) {
        goalExplosion = [];
        goalFlashSide = null;
        lastScorer = null;
      }
      return;
    }

    // Update ball trail with speed
    const currentSpeed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    ballTrail.push({ x: ballX, y: ballY, speed: currentSpeed });
    if (ballTrail.length > 6) {
      ballTrail.shift();
    }

    // Move ball
    ballX += ballVX;
    ballY += ballVY;

    // Ball collision with top/bottom walls
    if (ballY <= 0 || ballY >= GAME_HEIGHT - 1) {
      ballVY = -ballVY;
      ballY = Math.max(0, Math.min(GAME_HEIGHT - 1, ballY));
      // Wall hit effects (subtle - no screen shake)
      wallHitFlash = 6;
      spawnParticles(ballX, ballY <= 0 ? 1 : GAME_HEIGHT - 2, 4, '\x1b[1;93m', ['·', '•', '○']);
    }

    // Ball collision with player paddle
    if (ballX <= PADDLE_OFFSET + 1 && ballX >= PADDLE_OFFSET) {
      if (ballY >= playerY && ballY <= playerY + PADDLE_HEIGHT) {
        // Bounce off paddle
        ballVX = Math.abs(ballVX);

        // Adjust angle based on where ball hit paddle
        const hitPos = (ballY - playerY) / PADDLE_HEIGHT; // 0 to 1
        const angle = (hitPos - 0.5) * Math.PI / 3; // -30 to +30 degrees
        const speed = Math.min(MAX_BALL_SPEED, Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.05);

        ballVX = Math.cos(angle) * speed;
        ballVY = Math.sin(angle) * speed;

        ballX = PADDLE_OFFSET + 2;

        // Rally and effects
        rallyCount++;
        const effectIntensity = Math.min(rallyCount, 10);
        paddleHitFlash = 8;
        // Only shake on high rallies (5+)
        if (rallyCount >= 5) screenShake = Math.floor(effectIntensity / 4);
        spawnParticles(PADDLE_OFFSET + 2, ballY, 4 + Math.floor(effectIntensity / 2), themeColor, ['✦', '★', '◆', '●']);

        // Rally popup
        if (rallyCount >= 3 && rallyCount % 3 === 0) {
          addScorePopup(PADDLE_OFFSET + 4, ballY - 1, `${rallyCount}!`, '\x1b[1;96m');
        }
      }
    }

    // Ball collision with AI paddle
    if (ballX >= GAME_WIDTH - PADDLE_OFFSET - 2 && ballX <= GAME_WIDTH - PADDLE_OFFSET - 1) {
      if (ballY >= aiY && ballY <= aiY + PADDLE_HEIGHT) {
        ballVX = -Math.abs(ballVX);

        const hitPos = (ballY - aiY) / PADDLE_HEIGHT;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        const speed = Math.min(MAX_BALL_SPEED, Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.05);

        ballVX = -Math.abs(Math.cos(angle) * speed);
        ballVY = Math.sin(angle) * speed;

        ballX = GAME_WIDTH - PADDLE_OFFSET - 3;

        // Rally and effects (AI hit)
        rallyCount++;
        const effectIntensity = Math.min(rallyCount, 10);
        paddleHitFlash = 8;
        // Only shake on high rallies (5+)
        if (rallyCount >= 5) screenShake = Math.floor(effectIntensity / 4);
        spawnParticles(GAME_WIDTH - PADDLE_OFFSET - 2, ballY, 4 + Math.floor(effectIntensity / 2), '\x1b[1;91m', ['✦', '★', '◆', '●']);

        // Rally popup
        if (rallyCount >= 3 && rallyCount % 3 === 0) {
          addScorePopup(GAME_WIDTH - PADDLE_OFFSET - 6, ballY - 1, `${rallyCount}!`, '\x1b[1;91m');
        }
      }
    }

    // Scoring
    if (ballX < 0) {
      // AI scores
      aiScore++;
      scoreFlash = 15;
      scoreFreeze = 30; // Pause for celebration
      lastScorer = 'ai';
      screenShake = 8;
      goalFlashSide = 'left';
      createGoalExplosion('left');
      // Score popup
      addScorePopup(GAME_WIDTH / 2 - 3, GAME_HEIGHT / 2 - 2, 'CPU +1', '\x1b[1;91m');
      // More particles on goal
      spawnParticles(2, ballY, 10, '\x1b[1;91m', ['✗', '×', '▒', '░']);
      if (aiScore >= WIN_SCORE) {
        gameOver = true;
        scoreFreeze = 0; // Skip freeze on game end
        screenShake = 15;
        spawnParticles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20, '\x1b[1;91m', ['✗', '☠', '×', '▓']);
      } else {
        resetBall(true);
      }
    } else if (ballX > GAME_WIDTH - 1) {
      // Player scores
      playerScore++;
      scoreFlash = 15;
      scoreFreeze = 30; // Pause for celebration
      lastScorer = 'player';
      screenShake = 8;
      goalFlashSide = 'right';
      createGoalExplosion('right');
      // Score popup with rally bonus display
      const rallyBonus = rallyCount >= 5 ? ` (${rallyCount} rally!)` : '';
      addScorePopup(GAME_WIDTH / 2 - 2, GAME_HEIGHT / 2 - 2, `+1${rallyBonus}`, '\x1b[1;92m');
      // More particles on goal
      spawnParticles(GAME_WIDTH - 3, ballY, 10, '\x1b[1;92m', ['✦', '★', '◆', '●']);
      if (playerScore >= WIN_SCORE) {
        gameOver = true;
        scoreFreeze = 0; // Skip freeze on game end
        screenShake = 15;
        spawnParticles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20, '\x1b[1;93m', ['★', '✦', '♦', '◆']);
      } else {
        resetBall(false);
      }
    }

    // AI movement
    aiReactionTimer++;
    if (aiReactionTimer >= AI_REACTION_DELAY) {
      aiReactionTimer = 0;

      // AI tracks the ball with some prediction
      const targetY = ballY + ballVY * 5; // Predict where ball will be
      const aiCenter = aiY + PADDLE_HEIGHT / 2;

      if (targetY < aiCenter - 1) {
        aiY = Math.max(0, aiY - AI_SPEED);
      } else if (targetY > aiCenter + 1) {
        aiY = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, aiY + AI_SPEED);
      }
    }
  }

  // Start game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h');
    terminal.write('\x1b[?25l');

    playerScore = 0;
    aiScore = 0;
    initGame();
    gameStarted = false;

    const renderInterval = setInterval(() => {
      if (!running) {
        clearInterval(renderInterval);
        return;
      }
      render();
    }, 25);

    const gameInterval = setInterval(() => {
      if (!running) {
        clearInterval(gameInterval);
        return;
      }
      update();
    }, 30); // Faster update for smoother ball movement

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) {
        keyListener.dispose();
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
          controller.stop();
          dispatchGameQuit(terminal);
          return;
        }
      }

      // Start screen - any key (except ESC/Q handled above) starts the game
      // Skip if paused (ESC menu open on start screen)
      if (!gameStarted && !paused) {
        gameStarted = true;
        return;
      }

      if (gameOver) {
        if (key === 'r') {
          playerScore = 0;
          aiScore = 0;
          initGame();
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
              playerScore = 0;
              aiScore = 0;
              initGame();
              gameStarted = true;
              paused = false;
              break;
            case 2: // Quit
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              controller.stop();
              dispatchGameQuit(terminal);
              break;
            case 3: // List Games
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              running = false;
              dispatchGamesMenu(terminal);
              break;
            case 4: // Next Game
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              running = false;
              dispatchGameSwitch(terminal);
              break;
          }
          return;
        }

        // Legacy shortcut keys still work
        if (key === 'r') {
          playerScore = 0;
          aiScore = 0;
          initGame();
          gameStarted = true;
          paused = false;
        } else if (key === 'l') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          running = false;
          dispatchGamesMenu(terminal);
        } else if (key === 'n') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          running = false;
          dispatchGameSwitch(terminal);
        }
        return;
      }

      switch (domEvent.key) {
        case 'ArrowUp':
        case 'w':
          if (playerY > 0) playerY -= 1.5;
          break;
        case 'ArrowDown':
        case 's':
          if (playerY < GAME_HEIGHT - PADDLE_HEIGHT) playerY += 1.5;
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
  }, 25);

  return controller;
}
