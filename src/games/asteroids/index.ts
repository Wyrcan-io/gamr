/**
 * Hyper Asteroids
 *
 * Classic asteroids with ship rotation, thrust physics, and shooting.
 * Simplified visuals for terminal - single-character asteroids and ship.
 * Features screen wrapping, asteroid splitting, particle effects.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

export interface AsteroidsController {
  stop: () => void;
  isRunning: boolean;
}

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  thrusting: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: 'large' | 'medium' | 'small';
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

export function runAsteroidsGame(terminal: Terminal): AsteroidsController {
  const themeColor = getCurrentThemeColor();

  // Lower minimum requirements
  const MIN_COLS = 35;
  const MIN_ROWS = 16;

  // Adaptive game dimensions
  let GAME_WIDTH = 30;
  let GAME_HEIGHT = 12;

  // Ship physics
  const SHIP_TURN_SPEED = 0.2;
  const SHIP_THRUST = 0.06;
  const SHIP_FRICTION = 0.98;
  const SHIP_MAX_SPEED = 0.8;
  const BULLET_SPEED = 1.2;
  const BULLET_LIFE = 30;
  const SHOOT_COOLDOWN = 10;

  // Asteroid speeds
  const ASTEROID_SPEEDS = { large: 0.12, medium: 0.2, small: 0.35 };
  const ASTEROID_SCORES = { large: 20, medium: 50, small: 100 };
  const ASTEROID_RADIUS = { large: 2, medium: 1.5, small: 1 };

  // State
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let score = 0;
  let highScore = 0;
  let lives = 3;
  let wave = 1;
  let invincibilityFrames = 0;
  let shootCooldown = 0;
  let glitchFrame = 0;
  let shakeFrames = 0;
  let shakeIntensity = 0;

  let gameLeft = 2;
  let gameTop = 4;

  let ship: Ship = { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false };
  let keysDown: Set<string> = new Set();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];

  const controller: AsteroidsController = {
    stop: () => { if (running) running = false; },
    get isRunning() { return running; }
  };

  // Ship directions (8 directions)
  const SHIP_CHARS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  // Asteroid characters by size
  const ASTEROID_CHARS = { large: '◉', medium: '●', small: '•' };

  const title = ['▄▀█ █▀ ▀█▀ █▀▀ █▀█ █▀█ █ █▀▄ █▀',
                 '█▀█ ▄█  █  ██▄ █▀▄ █▄█ █ █▄▀ ▄█'];

  function initGame() {
    const cols = terminal.cols;
    const rows = terminal.rows;
    GAME_WIDTH = Math.min(50, Math.max(28, cols - 6));
    GAME_HEIGHT = Math.min(18, Math.max(10, rows - 8));

    score = 0;
    lives = 3;
    wave = 1;
    gameOver = false;
    paused = false;

    ship = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      thrusting: false,
    };

    keysDown.clear();
    bullets = [];
    asteroids = [];
    particles = [];
    invincibilityFrames = 60;
    shootCooldown = 0;

    spawnWave();
  }

  function spawnWave() {
    const count = 3 + wave;
    for (let i = 0; i < count; i++) {
      let x, y;
      // Spawn away from ship
      do {
        x = Math.random() * GAME_WIDTH;
        y = Math.random() * GAME_HEIGHT;
      } while (Math.abs(x - ship.x) < 8 && Math.abs(y - ship.y) < 4);

      const angle = Math.random() * Math.PI * 2;
      const speed = ASTEROID_SPEEDS.large * (0.8 + Math.random() * 0.4);
      asteroids.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        size: 'large',
      });
    }
  }

  function wrap(value: number, max: number): number {
    if (value < 0) return max + value;
    if (value >= max) return value - max;
    return value;
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  function spawnParticles(x: number, y: number, count: number, color: string) {
    const chars = ['*', '+', '.', '·'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.2 + Math.random() * 0.4;
      particles.push({
        x, y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 10 + Math.floor(Math.random() * 10),
      });
    }
  }

  function shoot() {
    if (shootCooldown > 0) return;
    shootCooldown = SHOOT_COOLDOWN;

    const bulletX = ship.x + Math.cos(ship.angle) * 1.5;
    const bulletY = ship.y + Math.sin(ship.angle) * 0.75;

    bullets.push({
      x: bulletX,
      y: bulletY,
      vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.5,
      vy: Math.sin(ship.angle) * BULLET_SPEED * 0.5 + ship.vy * 0.5,
      life: BULLET_LIFE,
    });
  }

  function hitShip() {
    if (invincibilityFrames > 0) return;

    lives--;
    spawnParticles(ship.x, ship.y, 15, '\x1b[91m');
    triggerShake(10, 3);

    if (lives <= 0) {
      gameOver = true;
      if (score > highScore) highScore = score;
    } else {
      // Reset ship position
      ship.x = GAME_WIDTH / 2;
      ship.y = GAME_HEIGHT / 2;
      ship.vx = 0;
      ship.vy = 0;
      invincibilityFrames = 90;
    }
  }

  function splitAsteroid(asteroid: Asteroid) {
    spawnParticles(asteroid.x, asteroid.y, 8, '\x1b[93m');
    score += ASTEROID_SCORES[asteroid.size];

    if (asteroid.size === 'large') {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        asteroids.push({
          x: asteroid.x,
          y: asteroid.y,
          vx: Math.cos(angle) * ASTEROID_SPEEDS.medium,
          vy: Math.sin(angle) * ASTEROID_SPEEDS.medium * 0.5,
          size: 'medium',
        });
      }
    } else if (asteroid.size === 'medium') {
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        asteroids.push({
          x: asteroid.x,
          y: asteroid.y,
          vx: Math.cos(angle) * ASTEROID_SPEEDS.small,
          vy: Math.sin(angle) * ASTEROID_SPEEDS.small * 0.5,
          size: 'small',
        });
      }
    }
  }

  function update() {
    if (paused || !gameStarted || gameOver) return;

    glitchFrame = (glitchFrame + 1) % 60;
    if (invincibilityFrames > 0) invincibilityFrames--;
    if (shootCooldown > 0) shootCooldown--;

    // Ship input
    if (keysDown.has('ArrowLeft') || keysDown.has('a')) ship.angle -= SHIP_TURN_SPEED;
    if (keysDown.has('ArrowRight') || keysDown.has('d')) ship.angle += SHIP_TURN_SPEED;

    ship.thrusting = keysDown.has('ArrowUp') || keysDown.has('w');
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * SHIP_THRUST;
      ship.vy += Math.sin(ship.angle) * SHIP_THRUST * 0.5;
    }

    if (keysDown.has(' ')) shoot();

    // Physics
    ship.vx *= SHIP_FRICTION;
    ship.vy *= SHIP_FRICTION;

    const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
    if (speed > SHIP_MAX_SPEED) {
      ship.vx = (ship.vx / speed) * SHIP_MAX_SPEED;
      ship.vy = (ship.vy / speed) * SHIP_MAX_SPEED;
    }

    ship.x = wrap(ship.x + ship.vx, GAME_WIDTH);
    ship.y = wrap(ship.y + ship.vy, GAME_HEIGHT);

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.x = wrap(bullet.x + bullet.vx, GAME_WIDTH);
      bullet.y = wrap(bullet.y + bullet.vy, GAME_HEIGHT);
      bullet.life--;
      if (bullet.life <= 0) bullets.splice(i, 1);
    }

    // Asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const ast = asteroids[i];
      ast.x = wrap(ast.x + ast.vx, GAME_WIDTH);
      ast.y = wrap(ast.y + ast.vy, GAME_HEIGHT);

      // Bullet collision
      const radius = ASTEROID_RADIUS[ast.size];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        const dx = bullet.x - ast.x;
        const dy = (bullet.y - ast.y) * 2; // Account for terminal aspect
        if (dx * dx + dy * dy < radius * radius) {
          bullets.splice(j, 1);
          splitAsteroid(ast);
          asteroids.splice(i, 1);
          triggerShake(4, 1);
          break;
        }
      }

      // Ship collision
      if (invincibilityFrames <= 0) {
        const dx = ship.x - ast.x;
        const dy = (ship.y - ast.y) * 2;
        if (dx * dx + dy * dy < (radius + 0.5) * (radius + 0.5)) {
          hitShip();
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Next wave
    if (asteroids.length === 0) {
      wave++;
      spawnWave();
    }
  }

  function render() {
    let output = '\x1b[2J\x1b[H';
    if (shakeFrames > 0) shakeFrames--;

    const cols = terminal.cols;
    const rows = terminal.rows;

    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg = 'Terminal too small!';
      const need = `Need: ${MIN_COLS}×${MIN_ROWS}  Have: ${cols}×${rows}`;
      output += `\x1b[${Math.floor(rows/2)};${Math.max(1, Math.floor((cols-msg.length)/2))}H${themeColor}${msg}\x1b[0m`;
      output += `\x1b[${Math.floor(rows/2)+2};${Math.max(1, Math.floor((cols-need.length)/2))}H\x1b[2m${need}\x1b[0m`;
      terminal.write(output);
      return;
    }

    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
    gameTop = Math.max(4, Math.floor((rows - GAME_HEIGHT - 6) / 2));

    let renderLeft = gameLeft;
    let renderTop = gameTop;
    if (shakeFrames > 0) {
      renderLeft += Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      renderTop += Math.floor((Math.random() - 0.5) * shakeIntensity);
    }

    // Title
    const titleX = Math.floor((cols - title[0].length) / 2);
    output += `\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
    output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;

    // Stats
    const stats = `SCORE: ${score.toString().padStart(5, '0')}  WAVE: ${wave}  ${'♥'.repeat(lives)}`;
    output += `\x1b[${gameTop - 1};${Math.floor((cols - stats.length) / 2)}H${themeColor}${stats}\x1b[0m`;

    // Border
    output += `\x1b[${renderTop};${renderLeft}H${themeColor}╔${'═'.repeat(GAME_WIDTH)}╗\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${themeColor}║\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + GAME_WIDTH + 1}H${themeColor}║\x1b[0m`;
    }
    output += `\x1b[${renderTop + GAME_HEIGHT + 1};${renderLeft}H${themeColor}╚${'═'.repeat(GAME_WIDTH)}╝\x1b[0m`;

    // Pause menu
    if (paused) {
      const pauseY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
      output += `\x1b[${pauseY};${Math.floor(cols/2) - 5}H\x1b[5m${themeColor}══ PAUSED ══\x1b[0m`;
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: Math.floor(cols / 2),
        startY: pauseY + 2,
        showShortcuts: false,
      });
    }
    // Start screen
    else if (!gameStarted) {
      const msg = '[ PRESS SPACE TO START ]';
      output += `\x1b[${gameTop + Math.floor(GAME_HEIGHT/2)};${gameLeft + Math.floor((GAME_WIDTH - msg.length) / 2) + 1}H\x1b[5m${themeColor}${msg}\x1b[0m`;
      const ctrl = '← → rotate  ↑ thrust  SPACE shoot';
      output += `\x1b[${gameTop + Math.floor(GAME_HEIGHT/2) + 2};${gameLeft + Math.floor((GAME_WIDTH - ctrl.length) / 2) + 1}H\x1b[2m${themeColor}${ctrl}\x1b[0m`;
    }
    // Game over
    else if (gameOver) {
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${gameLeft + Math.floor((GAME_WIDTH - 11) / 2) + 1}H\x1b[1;91m╔ GAME OVER ╗\x1b[0m`;
      output += `\x1b[${overY + 1};${gameLeft + Math.floor((GAME_WIDTH - 18) / 2) + 1}H${themeColor}SCORE: ${score}  HIGH: ${highScore}\x1b[0m`;
      output += `\x1b[${overY + 3};${gameLeft + Math.floor((GAME_WIDTH - 20) / 2) + 1}H\x1b[2m${themeColor}[R] RESTART  [Q] QUIT\x1b[0m`;
    }
    // Gameplay
    else {
      // Draw asteroids
      for (const ast of asteroids) {
        const sx = renderLeft + 1 + Math.floor(ast.x);
        const sy = renderTop + 1 + Math.floor(ast.y);
        if (sx > renderLeft && sx < renderLeft + GAME_WIDTH + 1 && sy > renderTop && sy < renderTop + GAME_HEIGHT + 1) {
          const color = ast.size === 'large' ? '\x1b[93m' : ast.size === 'medium' ? '\x1b[33m' : '\x1b[2;33m';
          output += `\x1b[${sy};${sx}H${color}${ASTEROID_CHARS[ast.size]}\x1b[0m`;
        }
      }

      // Draw bullets
      for (const b of bullets) {
        const sx = renderLeft + 1 + Math.floor(b.x);
        const sy = renderTop + 1 + Math.floor(b.y);
        if (sx > renderLeft && sx < renderLeft + GAME_WIDTH + 1 && sy > renderTop && sy < renderTop + GAME_HEIGHT + 1) {
          output += `\x1b[${sy};${sx}H\x1b[1;97m•\x1b[0m`;
        }
      }

      // Draw particles
      for (const p of particles) {
        const sx = renderLeft + 1 + Math.floor(p.x);
        const sy = renderTop + 1 + Math.floor(p.y);
        if (sx > renderLeft && sx < renderLeft + GAME_WIDTH + 1 && sy > renderTop && sy < renderTop + GAME_HEIGHT + 1) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${sy};${sx}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw ship
      const showShip = invincibilityFrames <= 0 || Math.floor(glitchFrame / 3) % 2 === 0;
      if (showShip) {
        const sx = renderLeft + 1 + Math.floor(ship.x);
        const sy = renderTop + 1 + Math.floor(ship.y);
        if (sx > renderLeft && sx < renderLeft + GAME_WIDTH + 1 && sy > renderTop && sy < renderTop + GAME_HEIGHT + 1) {
          // 8 directions - ensure positive index with double modulo
          const dir = ((Math.round(ship.angle / (Math.PI / 4)) % 8) + 8) % 8;
          const shipChar = SHIP_CHARS[dir];
          const shipColor = ship.thrusting ? '\x1b[1;93m' : themeColor;
          output += `\x1b[${sy};${sx}H${shipColor}${shipChar}\x1b[0m`;

          // Thrust trail
          if (ship.thrusting) {
            const trailX = sx - Math.round(Math.cos(ship.angle) * 1.5);
            const trailY = sy - Math.round(Math.sin(ship.angle) * 0.75);
            if (trailX > renderLeft && trailX < renderLeft + GAME_WIDTH + 1 && trailY > renderTop && trailY < renderTop + GAME_HEIGHT + 1) {
              output += `\x1b[${trailY};${trailX}H\x1b[91m${Math.random() > 0.5 ? '~' : '*'}\x1b[0m`;
            }
          }
        }
      }
    }

    // Bottom hint
    const hint = `HIGH: ${highScore}  [ ESC ] MENU`;
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${Math.floor((cols - hint.length) / 2)}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  // Game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h\x1b[?25l');
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

    // Use terminal.onKey for menu/game control, track keydown for continuous input
    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) { keyListener.dispose(); return; }
      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key;
      const keyLower = key.toLowerCase();

      // Track continuous input
      keysDown.add(key);
      setTimeout(() => keysDown.delete(key), 100);

      if (paused) {
        const { newSelection, confirmed } = navigateMenu(pauseMenuSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
        if (newSelection !== pauseMenuSelection) { pauseMenuSelection = newSelection; return; }
        if (confirmed) {
          switch (pauseMenuSelection) {
            case 0: paused = false; break;
            case 1: initGame(); gameStarted = true; paused = false; break;
            case 2: controller.stop(); dispatchGameQuit(terminal); break;
            case 3: controller.stop(); dispatchGamesMenu(terminal); break;
            case 4: controller.stop(); dispatchGameSwitch(terminal); break;
          }
          return;
        }
        return;
      }

      if (gameOver) {
        if (keyLower === 'r') { initGame(); gameStarted = true; return; }
        if (keyLower === 'q' || key === 'Escape') { controller.stop(); dispatchGameQuit(terminal); return; }
        return;
      }

      if (key === 'Escape') { paused = true; pauseMenuSelection = 0; return; }

      if (!gameStarted && key === ' ') { gameStarted = true; return; }
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      keyListener.dispose();
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      terminal.write('\x1b[?25h\x1b[?1049l');
      originalStop();
    };
  }, 25);

  return controller;
}
