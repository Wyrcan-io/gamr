/**
 * Hyper Space Invaders
 *
 * Cyberpunk-themed Space Invaders with glitchy effects,
 * neon visuals, and theme-aware colors.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Space Invaders Game Controller
 */
export interface SpaceInvadersController {
  stop: () => void;
  isRunning: boolean;
}

interface Invader {
  x: number;
  y: number;
  alive: boolean;
  type: 0 | 1 | 2; // Different invader types
}

interface Bullet {
  x: number;
  y: number;
  isPlayer: boolean;
}

interface Explosion {
  x: number;
  y: number;
  frame: number;
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
 * Cyberpunk Space Invaders
 */
export function runSpaceInvadersGame(terminal: Terminal): SpaceInvadersController {
  const themeColor = getCurrentThemeColor();

  // Minimum terminal size (reduced for better compatibility)
  const MIN_COLS = 40;
  const MIN_ROWS = 16;

  // Game dimensions - adaptive based on terminal size
  const getGameDimensions = () => {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const width = Math.min(50, Math.max(40, cols - 6));
    const height = Math.min(20, Math.max(14, rows - 6));
    return { width, height };
  };

  let { width: GAME_WIDTH, height: GAME_HEIGHT } = getGameDimensions();
  const INVADER_ROWS = 4;
  const INVADER_COLS = 8;
  const INVADER_SPACING_X = 5;
  const INVADER_SPACING_Y = 2;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let won = false;
  let score = 0;
  let highScore = 0;
  let lives = 3;
  let level = 1;

  // Game area positioning
  let gameLeft = 2;
  let gameTop = 4;

  // Player state
  let playerX = GAME_WIDTH / 2;
  let playerY = GAME_HEIGHT - 1;

  // Invaders
  let invaders: Invader[] = [];
  let invaderDirection = 1; // 1 = right, -1 = left
  let invaderMoveTimer = 0;
  let invaderMoveDelay = 30; // Frames between moves
  let invaderDropAmount = 0;

  // Bullets
  let bullets: Bullet[] = [];
  let playerShootCooldown = 0;
  let invaderShootTimer = 0;

  // Explosions
  let explosions: Explosion[] = [];

  // Shields/barriers
  let shields: boolean[][][] = [];
  const SHIELD_COUNT = 4;
  const SHIELD_WIDTH = 6;
  const SHIELD_HEIGHT = 3;

  // Visual effects
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let hitFlashFrames = 0;
  let killStreakCount = 0;
  let killStreakTimer = 0;
  let gameOverFlashFrames = 0;

  const controller: SpaceInvadersController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   █ █▄ █ █ █ ▄▀█ █▀▄ █▀▀ █▀█ █▀',
    '█▀█  █  █▀▀ ██▄ █▀▄   █ █ ▀█ ▀▄▀ █▀█ █▄▀ ██▄ █▀▄ ▄█',
  ];

  // Invader sprites (different types)
  const invaderSprites = [
    ['<O>', '</\\>'], // Type 0 - bottom rows
    ['/V\\', '\\^/'], // Type 1 - middle rows
    ['|=|', '|#|'],   // Type 2 - top rows
  ];

  // Spawn particles at position
  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['✦', '★', '◆', '●']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.2 + Math.random() * 0.4;
      particles.push({
        x: x,
        y: y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 10 + Math.floor(Math.random() * 8),
      });
    }
  }

  // Add score popup
  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 18, color });
  }

  function initGame() {
    playerX = GAME_WIDTH / 2;
    score = won ? score : 0; // Keep score if advancing levels
    lives = won ? lives : 3;
    gameOver = false;
    won = false;
    paused = false;
    bullets = [];
    explosions = [];
    playerShootCooldown = 0;
    invaderShootTimer = 0;
    invaderDirection = 1;
    invaderMoveTimer = 0;
    invaderDropAmount = 0;
    // Reset effects
    particles = [];
    scorePopups = [];
    shakeFrames = 0;
    shakeIntensity = 0;
    hitFlashFrames = 0;
    killStreakCount = 0;
    killStreakTimer = 0;
    gameOverFlashFrames = 0;

    // Speed increases with level
    invaderMoveDelay = Math.max(10, 30 - (level - 1) * 4);

    // Initialize invaders
    invaders = [];
    const startX = Math.floor((GAME_WIDTH - INVADER_COLS * INVADER_SPACING_X) / 2);
    const startY = 2;

    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        invaders.push({
          x: startX + col * INVADER_SPACING_X,
          y: startY + row * INVADER_SPACING_Y,
          alive: true,
          type: row === 0 ? 2 : row === 1 ? 1 : 0,
        });
      }
    }

    // Initialize shields
    shields = [];
    for (let i = 0; i < SHIELD_COUNT; i++) {
      const shield: boolean[][] = [];
      for (let y = 0; y < SHIELD_HEIGHT; y++) {
        shield[y] = [];
        for (let x = 0; x < SHIELD_WIDTH; x++) {
          // Create arch shape
          if (y === 0 && (x === 0 || x === SHIELD_WIDTH - 1)) {
            shield[y][x] = false;
          } else if (y === SHIELD_HEIGHT - 1 && x >= 2 && x <= 3) {
            shield[y][x] = false; // Gap at bottom
          } else {
            shield[y][x] = true;
          }
        }
      }
      shields.push(shield);
    }
  }

  function getShieldX(shieldIndex: number): number {
    const shieldSpacing = Math.floor(GAME_WIDTH / (SHIELD_COUNT + 1));
    return shieldSpacing * (shieldIndex + 1) - Math.floor(SHIELD_WIDTH / 2);
  }

  function getShieldY(): number {
    return GAME_HEIGHT - 5;
  }

  function shootBullet(x: number, y: number, isPlayer: boolean) {
    bullets.push({ x, y, isPlayer });
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Update effect timers
    if (shakeFrames > 0) shakeFrames--;
    if (hitFlashFrames > 0) hitFlashFrames--;
    if (gameOverFlashFrames > 0) gameOverFlashFrames--;
    if (killStreakTimer > 0) {
      killStreakTimer--;
      if (killStreakTimer === 0) killStreakCount = 0;
    }

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
      popup.y -= 0.25;
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
      playerX = (playerX / GAME_WIDTH) * newDims.width;
      playerY = newDims.height - 1;
      GAME_WIDTH = newDims.width;
      GAME_HEIGHT = newDims.height;
    }

    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
    gameTop = Math.max(3, Math.floor((rows - GAME_HEIGHT - 4) / 2));

    // Apply screen shake
    let renderGameLeft = gameLeft;
    let renderGameTop = gameTop;
    if (shakeFrames > 0) {
      const shakeX = Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      const shakeY = Math.floor((Math.random() - 0.5) * shakeIntensity);
      renderGameLeft = Math.max(1, gameLeft + shakeX);
      renderGameTop = Math.max(3, gameTop + shakeY);
    }

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

    // Stats bar
    const livesDisplay = '\u2665'.repeat(lives);
    const stats = `SCORE: ${score.toString().padStart(5, '0')}  LVL: ${level}  ${livesDisplay}`;
    const statsX = Math.floor((cols - stats.length) / 2);
    output += `\x1b[4;${statsX}H${themeColor}${stats}\x1b[0m`;

    // Game border with flash effect
    const borderColor = hitFlashFrames > 0 && hitFlashFrames % 4 < 2 ? '\x1b[1;91m' : themeColor;
    output += `\x1b[${renderGameTop};${renderGameLeft}H${borderColor}\u2554${'═'.repeat(GAME_WIDTH)}\u2557\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${renderGameTop + 1 + y};${renderGameLeft}H${borderColor}\u2551\x1b[0m`;
      output += `\x1b[${renderGameTop + 1 + y};${renderGameLeft + GAME_WIDTH + 1}H${borderColor}\u2551\x1b[0m`;
    }
    output += `\x1b[${renderGameTop + GAME_HEIGHT + 1};${renderGameLeft}H${borderColor}\u255a${'═'.repeat(GAME_WIDTH)}\u255d\x1b[0m`;

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
      const startMsg = '[ PRESS ANY KEY TO PLAY ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '←→ MOVE  SPC FIRE  ESC MENU';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else if (gameOver) {
      const overMsg = won ? '╔══ LEVEL COMPLETE! ══╗' : '╔══ GAME OVER ══╗';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${overX}H${won ? '\x1b[1;92m' : '\x1b[1;91m'}${overMsg}\x1b[0m`;

      const scoreLine = `SCORE: ${score}  HIGH: ${highScore}`;
      output += `\x1b[${overY + 1};${gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1}H${themeColor}${scoreLine}\x1b[0m`;

      const restart = won ? '╚ [R] NEXT LEVEL  [Q] QUIT ╝' : '╚ [R] RESTART  [Q] QUIT ╝';
      output += `\x1b[${overY + 2};${gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    } else {
      // Draw shields
      const shieldY = getShieldY();
      for (let i = 0; i < SHIELD_COUNT; i++) {
        const shieldX = getShieldX(i);
        for (let y = 0; y < SHIELD_HEIGHT; y++) {
          for (let x = 0; x < SHIELD_WIDTH; x++) {
            if (shields[i][y][x]) {
              const screenX = renderGameLeft + 1 + shieldX + x;
              const screenY = renderGameTop + 1 + shieldY + y;
              output += `\x1b[${screenY};${screenX}H\x1b[92m\u2588\x1b[0m`;
            }
          }
        }
      }

      // Draw invaders
      const animFrame = Math.floor(glitchFrame / 15) % 2;
      for (const invader of invaders) {
        if (!invader.alive) continue;
        const sprite = invaderSprites[invader.type][animFrame];
        const screenX = renderGameLeft + 1 + invader.x;
        const screenY = renderGameTop + 1 + invader.y;

        // Color based on type
        const colors = ['\x1b[92m', '\x1b[93m', '\x1b[95m']; // Green, Yellow, Magenta
        output += `\x1b[${screenY};${screenX}H${colors[invader.type]}${sprite}\x1b[0m`;
      }

      // Draw bullets
      for (const bullet of bullets) {
        const screenX = renderGameLeft + 1 + Math.floor(bullet.x);
        const screenY = renderGameTop + 1 + Math.floor(bullet.y);
        if (bullet.isPlayer) {
          output += `\x1b[${screenY};${screenX}H\x1b[97m\u2502\x1b[0m`;
        } else {
          output += `\x1b[${screenY};${screenX}H\x1b[91m\u25cf\x1b[0m`;
        }
      }

      // Draw explosions
      for (const exp of explosions) {
        const screenX = renderGameLeft + 1 + exp.x;
        const screenY = renderGameTop + 1 + exp.y;
        const expChars = ['*', '+', '\u00d7', '\u00b7'];
        const char = expChars[Math.min(exp.frame, expChars.length - 1)];
        output += `\x1b[${screenY};${screenX}H\x1b[93m${char}\x1b[0m`;
      }

      // Draw particles
      for (const p of particles) {
        const screenX = Math.round(renderGameLeft + 1 + p.x);
        const screenY = Math.round(renderGameTop + 1 + p.y);
        if (screenX > renderGameLeft && screenX < renderGameLeft + GAME_WIDTH + 1 &&
            screenY > renderGameTop && screenY < renderGameTop + GAME_HEIGHT + 1) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const screenX = Math.round(renderGameLeft + 1 + popup.x);
        const screenY = Math.round(renderGameTop + 1 + popup.y);
        if (screenY > renderGameTop && screenY < renderGameTop + GAME_HEIGHT + 1) {
          const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${screenY};${screenX}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }

      // Draw kill streak message
      if (killStreakCount >= 3) {
        const streakMsg = killStreakCount >= 5 ? `★ ${killStreakCount}x KILL STREAK! ★` : `${killStreakCount}x STREAK!`;
        const streakX = renderGameLeft + Math.floor((GAME_WIDTH - streakMsg.length) / 2) + 1;
        const streakColor = glitchFrame % 6 < 3 ? '\x1b[1;91m' : '\x1b[1;93m';
        output += `\x1b[${renderGameTop + 2};${streakX}H${streakColor}${streakMsg}\x1b[0m`;
      }

      // Draw player with hit flash
      const playerScreenX = renderGameLeft + 1 + Math.floor(playerX) - 1;
      const playerScreenY = renderGameTop + 1 + playerY;
      const playerColor = hitFlashFrames > 0 && hitFlashFrames % 4 < 2 ? '\x1b[1;91m' : themeColor;
      output += `\x1b[${playerScreenY};${playerScreenX}H${playerColor}/\u2588\\\x1b[0m`;
    }

    // Hint
    const hint = gameStarted && !gameOver && !paused ? `HIGH: ${highScore}  [ ESC ] MENU` : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

    // Update cooldowns
    if (playerShootCooldown > 0) playerShootCooldown--;
    invaderShootTimer++;

    // Update explosions
    explosions = explosions.filter(exp => {
      exp.frame++;
      return exp.frame < 4;
    });

    // Move invaders
    invaderMoveTimer++;
    if (invaderMoveTimer >= invaderMoveDelay) {
      invaderMoveTimer = 0;

      // Check if any invader hit the edge
      let hitEdge = false;
      for (const invader of invaders) {
        if (!invader.alive) continue;
        const nextX = invader.x + invaderDirection * 2;
        if (nextX <= 0 || nextX >= GAME_WIDTH - 3) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        invaderDirection *= -1;
        invaderDropAmount = 1;
      }

      // Move invaders
      for (const invader of invaders) {
        if (!invader.alive) continue;
        if (invaderDropAmount > 0) {
          invader.y += invaderDropAmount;
        } else {
          invader.x += invaderDirection * 2;
        }

        // Check if invaders reached the player
        if (invader.y >= playerY - 1) {
          gameOver = true;
          if (score > highScore) highScore = score;
          return;
        }
      }
      invaderDropAmount = 0;
    }

    // Invader shooting
    const aliveInvaders = invaders.filter(i => i.alive);
    if (aliveInvaders.length > 0 && invaderShootTimer >= 60) {
      invaderShootTimer = 0;
      // Random invader shoots
      const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
      shootBullet(shooter.x + 1, shooter.y + 1, false);
    }

    // Move bullets
    bullets = bullets.filter(bullet => {
      if (bullet.isPlayer) {
        bullet.y -= 0.8;
      } else {
        bullet.y += 0.5;
      }
      return bullet.y >= 0 && bullet.y < GAME_HEIGHT;
    });

    // Bullet collision with invaders
    for (const bullet of bullets) {
      if (!bullet.isPlayer) continue;

      for (const invader of invaders) {
        if (!invader.alive) continue;
        if (bullet.y >= invader.y && bullet.y <= invader.y + 1 &&
            bullet.x >= invader.x && bullet.x <= invader.x + 2) {
          invader.alive = false;
          bullet.y = -100; // Mark for removal
          explosions.push({ x: invader.x + 1, y: invader.y, frame: 0 });

          // Kill streak tracking
          killStreakCount++;
          killStreakTimer = 30; // Reset streak timer

          // Calculate score with streak bonus
          const baseScore = (invader.type + 1) * 10;
          const streakBonus = killStreakCount >= 3 ? Math.floor(killStreakCount * 5) : 0;
          const totalScore = baseScore + streakBonus;
          score += totalScore;

          // Effects
          shakeFrames = 3 + Math.min(killStreakCount, 5);
          shakeIntensity = 1 + Math.floor(killStreakCount / 3);

          // Particles - color based on invader type
          const invaderColors = ['\x1b[1;92m', '\x1b[1;93m', '\x1b[1;95m'];
          spawnParticles(invader.x + 1, invader.y, 6 + Math.min(killStreakCount, 6), invaderColors[invader.type], ['✦', '★', '◆', '×']);

          // Score popup
          const popupText = killStreakCount >= 3 ? `+${totalScore}!` : `+${totalScore}`;
          const popupColor = killStreakCount >= 3 ? '\x1b[1;91m' : '\x1b[1;93m';
          addScorePopup(invader.x + 1, invader.y - 1, popupText, popupColor);
        }
      }
    }

    // Bullet collision with shields
    const shieldY = getShieldY();
    for (const bullet of bullets) {
      for (let i = 0; i < SHIELD_COUNT; i++) {
        const shieldX = getShieldX(i);
        const relX = Math.floor(bullet.x - shieldX);
        const relY = Math.floor(bullet.y - shieldY);

        if (relX >= 0 && relX < SHIELD_WIDTH && relY >= 0 && relY < SHIELD_HEIGHT) {
          if (shields[i][relY][relX]) {
            shields[i][relY][relX] = false;
            bullet.y = -100; // Mark for removal
          }
        }
      }
    }

    // Bullet collision with player
    for (const bullet of bullets) {
      if (bullet.isPlayer) continue;
      if (bullet.y >= playerY && bullet.y <= playerY + 1 &&
          bullet.x >= playerX - 1 && bullet.x <= playerX + 1) {
        bullet.y = -100;
        explosions.push({ x: Math.floor(playerX), y: playerY, frame: 0 });
        lives--;

        // Player hit effects
        shakeFrames = 12;
        shakeIntensity = 3;
        hitFlashFrames = 15;
        killStreakCount = 0; // Reset kill streak on hit
        spawnParticles(Math.floor(playerX), playerY, 10, '\x1b[1;91m', ['✗', '☠', '×', '▒']);

        if (lives <= 0) {
          gameOver = true;
          gameOverFlashFrames = 30;
          shakeFrames = 20;
          shakeIntensity = 4;
          spawnParticles(Math.floor(playerX), playerY, 15, '\x1b[1;91m', ['✗', '☠', '×', '▓', '░']);
          if (score > highScore) highScore = score;
        }
      }
    }

    // Remove destroyed bullets
    bullets = bullets.filter(b => b.y >= 0);

    // Check win condition
    if (aliveInvaders.length === 0) {
      won = true;
      gameOver = true;
      level++;
      if (score > highScore) highScore = score;
    }
  }

  // Start game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h');
    terminal.write('\x1b[?25l');

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
    }, 25);

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
          if (won) {
            // Continue to next level
            initGame();
          } else {
            // Full restart
            level = 1;
            initGame();
          }
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
              level = 1;
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
          level = 1;
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
        case 'ArrowLeft':
        case 'a':
          if (playerX > 2) playerX -= 2;
          break;
        case 'ArrowRight':
        case 'd':
          if (playerX < GAME_WIDTH - 2) playerX += 2;
          break;
        case ' ':
          if (playerShootCooldown === 0) {
            shootBullet(playerX, playerY - 1, true);
            playerShootCooldown = 10;
          }
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
