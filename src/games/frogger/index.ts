/**
 * Hyper Frogger
 *
 * Guide your frog across dangerous roads and rivers!
 * - Avoid cars and trucks on the road
 * - Hop on logs and turtles to cross the water
 * - Reach all 5 lily pads to advance
 *
 * Features:
 * - Progressive difficulty (starts easy)
 * - Visual frog character with animation
 * - Better themed obstacles
 * - Lower terminal requirements
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

export interface FroggerController {
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

interface Vehicle {
  x: number;
  width: number;
  sprite: string;
  color: string;
}

interface Log {
  x: number;
  width: number;
  sprite: string;
  isTurtle: boolean;
  submergeTimer?: number;
}

interface Lane {
  type: 'road' | 'water' | 'safe' | 'goal';
  speed: number;
  vehicles?: Vehicle[];
  logs?: Log[];
}

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runFroggerGame(terminal: Terminal): FroggerController {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const MIN_COLS = 40;
  const MIN_ROWS = 16;
  const LILY_PAD_COUNT = 5;
  const TIME_LIMIT = 45;
  const MOVE_COOLDOWN = 100;

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
  let level = 1;
  let lives = 3;

  // Computed dimensions
  let GAME_WIDTH = 40;
  let GAME_HEIGHT = 13;
  let gameLeft = 2;
  let gameTop = 4;

  // Lane layout (from bottom to top)
  const SAFE_START = 0;    // Starting safe zone
  const ROAD_START = 1;    // Road lanes start
  const ROAD_END = 4;      // Road lanes end
  const MEDIAN = 5;        // Middle safe zone
  const WATER_START = 6;   // Water lanes start
  const WATER_END = 9;     // Water lanes end
  const GOAL_ROW = 10;     // Lily pad row

  let timeRemaining = TIME_LIMIT;
  let lastTimeUpdate = Date.now();

  let playerX = 0;
  let playerY = 0;
  let playerOnLog = false;
  let lastMoveTime = 0;
  let furthestY = 0;
  let hopFrame = 0;

  let lilyPads: boolean[] = [false, false, false, false, false];
  let lilyPadX: number[] = [];
  let lanes: Lane[] = [];

  let particles: Particle[] = [];
  let shakeFrames = 0;
  let deathFlash = 0;
  let winFlash = 0;

  // Frog sprites (facing up)
  const FROG_IDLE = '◎';
  const FROG_HOP = '^';
  const FROG_ON_LOG = '●';

  // Vehicle sprites
  const CAR_LEFT = '<≡>';
  const CAR_RIGHT = '<≡>';
  const TRUCK = '⊏══⊐';
  const MOTORCYCLE = '○>';

  // Water sprites
  const LOG_CHAR = '═';
  const TURTLE = '◗◖';

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: FroggerController = {
    stop: () => {
      if (!running) return;
      running = false;
    },
    get isRunning() { return running; }
  };

  // -------------------------------------------------------------------------
  // ASCII ART
  // -------------------------------------------------------------------------
  const title = [
    '█▀▀ █▀█ █▀█ █▀▀ █▀▀ █▀▀ █▀█',
    '█▀  █▀▄ █▄█ █▄█ █▄█ ██▄ █▀▄',
  ];

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[]) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.1 + Math.random() * 0.15; // Halved for 2x frame rate
      particles.push({
        x, y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 16 + Math.floor(Math.random() * 12), // Doubled for 2x frame rate
      });
    }
  }

  function spawnSplash(x: number, y: number) {
    spawnParticles(x, y, 8, '\x1b[96m', ['~', '∼', '≈', '○']);
  }

  function spawnCrash(x: number, y: number) {
    spawnParticles(x, y, 10, '\x1b[91m', ['*', 'x', '×', '#']);
  }

  function spawnSuccess(x: number, y: number) {
    spawnParticles(x, y, 12, '\x1b[92m', ['*', '+', '♦', '◇']);
  }

  // -------------------------------------------------------------------------
  // GAME SETUP
  // -------------------------------------------------------------------------

  function calculateLilyPads() {
    lilyPadX = [];
    const padSpacing = Math.floor(GAME_WIDTH / (LILY_PAD_COUNT + 1));
    for (let i = 0; i < LILY_PAD_COUNT; i++) {
      lilyPadX.push(padSpacing * (i + 1) - 1);
    }
  }

  function generateLanes() {
    lanes = [];

    // Difficulty scaling
    const speedMult = 0.6 + level * 0.15;
    const vehicleCountBase = Math.min(level + 1, 4);

    for (let row = 0; row <= GOAL_ROW; row++) {
      if (row === SAFE_START || row === MEDIAN) {
        lanes.push({ type: 'safe', speed: 0 });
      } else if (row >= ROAD_START && row <= ROAD_END) {
        // Road lanes
        const direction = row % 2 === 0 ? 1 : -1;
        const speed = (0.075 + Math.random() * 0.075) * direction * speedMult; // Halved for 2x frame rate
        const lane: Lane = { type: 'road', speed, vehicles: [] };

        const vehicleCount = vehicleCountBase - Math.floor(Math.random() * 2);
        const spacing = GAME_WIDTH / vehicleCount;

        for (let v = 0; v < vehicleCount; v++) {
          const rand = Math.random();
          let sprite: string, width: number, color: string;

          if (rand < 0.2 && level >= 2) {
            // Motorcycle (fast, small)
            sprite = MOTORCYCLE;
            width = 2;
            color = '\x1b[93m';
          } else if (rand < 0.5) {
            // Truck (slow, big)
            sprite = TRUCK;
            width = 5;
            color = '\x1b[33m';
          } else {
            // Car
            sprite = direction > 0 ? CAR_RIGHT : CAR_LEFT;
            width = 3;
            color = '\x1b[91m';
          }

          lane.vehicles!.push({
            x: v * spacing + Math.random() * (spacing / 3),
            width,
            sprite,
            color,
          });
        }
        lanes.push(lane);
      } else if (row >= WATER_START && row <= WATER_END) {
        // Water lanes
        const direction = row % 2 === 0 ? 1 : -1;
        const speed = (0.04 + Math.random() * 0.05) * direction * speedMult; // Halved for 2x frame rate
        const lane: Lane = { type: 'water', speed, logs: [] };

        const logCount = 2 + Math.floor(Math.random() * 2);
        const spacing = GAME_WIDTH / logCount;

        for (let l = 0; l < logCount; l++) {
          const isTurtle = Math.random() < 0.3 && level >= 2;
          const width = isTurtle ? 4 : 4 + Math.floor(Math.random() * 3);

          lane.logs!.push({
            x: l * spacing + Math.random() * (spacing / 3),
            width,
            sprite: isTurtle ? TURTLE.repeat(2) : LOG_CHAR.repeat(width),
            isTurtle,
            submergeTimer: isTurtle ? Math.random() * 200 : undefined,
          });
        }
        lanes.push(lane);
      } else if (row === GOAL_ROW) {
        lanes.push({ type: 'goal', speed: 0 });
      } else {
        lanes.push({ type: 'safe', speed: 0 });
      }
    }
  }

  function initGame() {
    score = 0;
    level = 1;
    lives = 3;
    gameOver = false;
    paused = false;
    lilyPads = [false, false, false, false, false];
    timeRemaining = TIME_LIMIT;
    lastTimeUpdate = Date.now();
    furthestY = GAME_HEIGHT - 1;

    particles = [];
    shakeFrames = 0;
    deathFlash = 0;
    winFlash = 0;

    calculateLilyPads();
    generateLanes();
    resetPlayer();
  }

  function resetPlayer() {
    playerX = Math.floor(GAME_WIDTH / 2);
    playerY = GAME_HEIGHT - 1;
    playerOnLog = false;
    furthestY = GAME_HEIGHT - 1;
    timeRemaining = TIME_LIMIT;
    lastTimeUpdate = Date.now();
    hopFrame = 0;
  }

  function advanceLevel() {
    level++;
    lilyPads = [false, false, false, false, false];
    timeRemaining = TIME_LIMIT;
    lastTimeUpdate = Date.now();

    const bonus = level * 500 + Math.floor(timeRemaining) * 5;
    score += bonus;
    if (score > highScore) highScore = score;

    winFlash = 25;
    for (let i = 0; i < 3; i++) {
      spawnSuccess(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT);
    }

    generateLanes();
    resetPlayer();
  }

  function die() {
    lives--;
    spawnCrash(playerX, playerY);
    shakeFrames = 12;
    deathFlash = 15;

    if (lives <= 0) {
      gameOver = true;
      if (score > highScore) highScore = score;
    } else {
      resetPlayer();
    }
  }

  // -------------------------------------------------------------------------
  // COLLISION
  // -------------------------------------------------------------------------

  function getLaneAt(y: number): Lane | null {
    const row = GAME_HEIGHT - 1 - y;
    if (row < 0 || row >= lanes.length) return null;
    return lanes[row];
  }

  function checkVehicleCollision(): boolean {
    const lane = getLaneAt(playerY);
    if (!lane || lane.type !== 'road' || !lane.vehicles) return false;

    for (const v of lane.vehicles) {
      const vLeft = v.x;
      const vRight = v.x + v.width;
      if (playerX >= vLeft && playerX < vRight) {
        return true;
      }
      // Handle wrap
      if (vLeft < 0 && playerX >= GAME_WIDTH + vLeft) return true;
      if (vRight > GAME_WIDTH && playerX < vRight - GAME_WIDTH) return true;
    }
    return false;
  }

  function checkWaterSafety(): { safe: boolean; speed: number } {
    const lane = getLaneAt(playerY);
    if (!lane || lane.type !== 'water' || !lane.logs) {
      return { safe: false, speed: 0 };
    }

    for (const log of lane.logs) {
      // Skip submerged turtles
      if (log.isTurtle && log.submergeTimer !== undefined && log.submergeTimer < 30) {
        continue;
      }

      const logLeft = log.x;
      const logRight = log.x + log.width;

      if (playerX >= logLeft && playerX < logRight) {
        return { safe: true, speed: lane.speed };
      }
      // Handle wrap
      if (logLeft < 0 && playerX >= GAME_WIDTH + logLeft) {
        return { safe: true, speed: lane.speed };
      }
      if (logRight > GAME_WIDTH && playerX < logRight - GAME_WIDTH) {
        return { safe: true, speed: lane.speed };
      }
    }

    return { safe: false, speed: 0 };
  }

  function checkGoal() {
    const row = GAME_HEIGHT - 1 - playerY;
    if (row !== GOAL_ROW) return;

    for (let i = 0; i < LILY_PAD_COUNT; i++) {
      const padX = lilyPadX[i];
      // Lily pad visual is "(○)" at padX, padX+1, padX+2
      // Center collision on the middle character (padX+1) with ±2 tolerance
      const padCenter = padX + 1;
      if (Math.abs(playerX - padCenter) <= 2) {
        if (!lilyPads[i]) {
          lilyPads[i] = true;
          const bonus = 100 + timeRemaining * 5;
          score += bonus;
          spawnSuccess(padCenter, playerY); // Spawn particles at pad center

          if (lilyPads.every(p => p)) {
            advanceLevel();
            return;
          }
          resetPlayer();
          return;
        } else {
          // Already filled - die
          die();
          return;
        }
      }
    }
    // Missed lily pad - die (fell into water)
    spawnSplash(playerX, playerY);
    die();
  }

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  function update() {
    if (!gameStarted || gameOver || paused) return;

    // Timer
    const now = Date.now();
    if (now - lastTimeUpdate >= 1000) {
      timeRemaining--;
      lastTimeUpdate = now;
      if (timeRemaining <= 0) {
        die();
        return;
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.015;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update flash counters
    if (shakeFrames > 0) shakeFrames--;
    if (deathFlash > 0) deathFlash--;
    if (winFlash > 0) winFlash--;

    // Hop animation
    if (hopFrame > 0) hopFrame--;

    // Move vehicles and logs
    for (const lane of lanes) {
      if (lane.type === 'road' && lane.vehicles) {
        for (const v of lane.vehicles) {
          v.x += lane.speed;
          if (v.x > GAME_WIDTH) v.x = -v.width;
          if (v.x + v.width < 0) v.x = GAME_WIDTH;
        }
      } else if (lane.type === 'water' && lane.logs) {
        for (const log of lane.logs) {
          log.x += lane.speed;
          if (log.x > GAME_WIDTH) log.x = -log.width;
          if (log.x + log.width < 0) log.x = GAME_WIDTH;

          // Turtle submerge cycle
          if (log.isTurtle && log.submergeTimer !== undefined) {
            log.submergeTimer--;
            if (log.submergeTimer <= 0) {
              log.submergeTimer = 150 + Math.random() * 100;
            }
          }
        }
      }
    }

    // Check water safety and move with log
    const lane = getLaneAt(playerY);
    if (lane && lane.type === 'water') {
      const waterCheck = checkWaterSafety();
      if (waterCheck.safe) {
        playerOnLog = true;
        playerX += waterCheck.speed;
        // Boundary check
        if (playerX < 0 || playerX >= GAME_WIDTH) {
          spawnSplash(playerX, playerY);
          die();
          return;
        }
      } else {
        // In water without log
        spawnSplash(playerX, playerY);
        die();
        return;
      }
    } else {
      playerOnLog = false;
    }

    // Check vehicle collision
    if (checkVehicleCollision()) {
      die();
      return;
    }

    // Check goal
    checkGoal();
  }

  // -------------------------------------------------------------------------
  // PLAYER MOVEMENT
  // -------------------------------------------------------------------------

  function movePlayer(dx: number, dy: number) {
    const now = Date.now();
    if (now - lastMoveTime < MOVE_COOLDOWN) return;
    lastMoveTime = now;

    const newX = playerX + dx;
    const newY = playerY + dy;

    if (newX < 0 || newX >= GAME_WIDTH) return;
    if (newY < 0 || newY >= GAME_HEIGHT) return;

    playerX = newX;
    playerY = newY;
    hopFrame = 4;

    // Score for forward progress
    if (dy < 0 && playerY < furthestY) {
      score += 10;
      furthestY = playerY;
    }

    // Immediate collision check
    const lane = getLaneAt(playerY);

    if (lane && lane.type === 'road') {
      if (checkVehicleCollision()) {
        die();
        return;
      }
    }

    if (lane && lane.type === 'water') {
      const waterCheck = checkWaterSafety();
      if (!waterCheck.safe) {
        spawnSplash(playerX, playerY);
        die();
        return;
      }
      playerOnLog = true;
    }

    checkGoal();
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Check minimum size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const msg2 = `Need: ${MIN_COLS}×${MIN_ROWS}  Have: ${cols}×${rows}`;
      const hint = cols < MIN_COLS && rows < MIN_ROWS ? 'Make pane larger'
        : cols < MIN_COLS ? 'Make pane wider →' : 'Make pane taller ↓';
      const cx = Math.floor(cols / 2);
      const cy = Math.floor(rows / 2);
      output += `\x1b[${cy - 1};${Math.max(1, cx - msg1.length / 2)}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${cy + 1};${Math.max(1, cx - msg2.length / 2)}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${cy + 3};${Math.max(1, cx - hint.length / 2)}H${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Adaptive dimensions
    GAME_WIDTH = Math.min(cols - 4, 50);
    GAME_HEIGHT = Math.min(rows - 8, 15);
    gameLeft = Math.floor((cols - GAME_WIDTH - 2) / 2);
    gameTop = Math.floor((rows - GAME_HEIGHT - 6) / 2) + 2;

    // Recalculate lily pads if needed
    if (lilyPadX.length === 0) {
      calculateLilyPads();
    }

    // Apply shake
    let renderLeft = gameLeft;
    let renderTop = gameTop;
    if (shakeFrames > 0) {
      renderLeft += Math.floor((Math.random() - 0.5) * 4);
      renderTop += Math.floor((Math.random() - 0.5) * 2);
    }

    // Title
    const titleX = Math.floor((cols - title[0].length) / 2);
    output += `\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
    output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;

    // Stats
    const hearts = '♥'.repeat(lives);
    const timerColor = timeRemaining <= 10 ? '\x1b[91m' : '\x1b[97m';
    const stats = `SCORE: ${score.toString().padStart(5, '0')}  LVL: ${level}  TIME: ${timerColor}${timeRemaining.toString().padStart(2, '0')}\x1b[0m  \x1b[91m${hearts}\x1b[0m`;
    const statsX = Math.floor((cols - 45) / 2);
    output += `\x1b[${gameTop - 1};${statsX}H${stats}`;

    // Border
    let borderColor = themeColor;
    if (deathFlash > 0 && deathFlash % 4 < 2) borderColor = '\x1b[91m';
    if (winFlash > 0 && winFlash % 4 < 2) borderColor = '\x1b[92m';

    output += `\x1b[${renderTop};${renderLeft}H${borderColor}╔${'═'.repeat(GAME_WIDTH)}╗\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) {
      output += `\x1b[${renderTop + 1 + y};${renderLeft}H${borderColor}║\x1b[0m`;
      output += `\x1b[${renderTop + 1 + y};${renderLeft + GAME_WIDTH + 1}H${borderColor}║\x1b[0m`;
    }
    output += `\x1b[${renderTop + GAME_HEIGHT + 1};${renderLeft}H${borderColor}╚${'═'.repeat(GAME_WIDTH)}╝\x1b[0m`;

    // PAUSE MENU
    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const cx = Math.floor(cols / 2);
      const pauseY = gameTop + Math.floor(GAME_HEIGHT / 2) - 2;
      output += `\x1b[${pauseY};${cx - pauseMsg.length / 2}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: cx,
        startY: pauseY + 2,
        showShortcuts: false,
      });
    }
    // START SCREEN
    else if (!gameStarted) {
      const startMsg = '[ PRESS ANY KEY TO PLAY ]';
      const startX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(GAME_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '← → ↑ ↓  Move   ESC  Menu';
      const ctrlX = gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${controls}\x1b[0m`;

      const desc = 'Cross roads and rivers to reach the lily pads!';
      const descX = gameLeft + Math.floor((GAME_WIDTH - desc.length) / 2) + 1;
      output += `\x1b[${startY + 4};${descX}H\x1b[2m${desc}\x1b[0m`;
    }
    // GAME OVER
    else if (gameOver) {
      const overMsg = '╔══ GAME OVER ══╗';
      const overX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${overX}H\x1b[1;91m${overMsg}\x1b[0m`;

      const scoreLine = `SCORE: ${score}  HIGH: ${highScore}`;
      const scoreX = gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1;
      output += `\x1b[${overY + 1};${scoreX}H${themeColor}${scoreLine}\x1b[0m`;

      const restart = '╚ [R] RETRY  [Q] QUIT ╝';
      const restartX = gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1;
      output += `\x1b[${overY + 2};${restartX}H\x1b[2m${restart}\x1b[0m`;
    }
    // GAMEPLAY
    else {
      // Draw lanes
      for (let y = 0; y < GAME_HEIGHT; y++) {
        const row = GAME_HEIGHT - 1 - y;
        if (row < 0 || row >= lanes.length) continue;

        const lane = lanes[row];
        const screenY = renderTop + 1 + y;

        // Background
        let bgColor = '\x1b[48;5;22m'; // Green grass
        let bgChar = ' ';

        if (lane.type === 'road') {
          bgColor = '\x1b[48;5;236m'; // Dark gray road
          bgChar = ' ';
        } else if (lane.type === 'water') {
          bgColor = '\x1b[48;5;17m'; // Dark blue water
          bgChar = '~';
        } else if (lane.type === 'goal') {
          bgColor = '\x1b[48;5;22m'; // Green
          bgChar = ' ';
        }

        output += `\x1b[${screenY};${renderLeft + 1}H${bgColor}\x1b[34m${bgChar.repeat(GAME_WIDTH)}\x1b[0m`;

        // Draw lily pads in goal row
        if (lane.type === 'goal') {
          for (let i = 0; i < LILY_PAD_COUNT; i++) {
            const padX = lilyPadX[i];
            if (padX >= 0 && padX < GAME_WIDTH - 2) {
              const screenX = renderLeft + 1 + padX;
              if (lilyPads[i]) {
                output += `\x1b[${screenY};${screenX}H\x1b[92m[◎]\x1b[0m`;
              } else {
                output += `\x1b[${screenY};${screenX}H\x1b[32m(○)\x1b[0m`;
              }
            }
          }
        }

        // Draw vehicles
        if (lane.type === 'road' && lane.vehicles) {
          for (const v of lane.vehicles) {
            const vx = Math.floor(v.x);
            if (vx >= 0 && vx + v.width <= GAME_WIDTH) {
              output += `\x1b[${screenY};${renderLeft + 1 + vx}H${v.color}${v.sprite}\x1b[0m`;
            } else if (vx < 0) {
              // Wrap from left
              const visible = v.sprite.slice(-vx);
              if (visible.length > 0) {
                output += `\x1b[${screenY};${renderLeft + 1}H${v.color}${visible}\x1b[0m`;
              }
            } else if (vx < GAME_WIDTH) {
              // Partial from right
              const visible = v.sprite.slice(0, GAME_WIDTH - vx);
              output += `\x1b[${screenY};${renderLeft + 1 + vx}H${v.color}${visible}\x1b[0m`;
            }
          }
        }

        // Draw logs/turtles
        if (lane.type === 'water' && lane.logs) {
          for (const log of lane.logs) {
            // Skip submerged turtles
            const isSubmerged = log.isTurtle && log.submergeTimer !== undefined && log.submergeTimer < 30;

            const lx = Math.floor(log.x);
            const logColor = isSubmerged ? '\x1b[34m' : (log.isTurtle ? '\x1b[92m' : '\x1b[33m');
            const displaySprite = isSubmerged ? '∼'.repeat(log.width) : log.sprite;

            if (lx >= 0 && lx + log.width <= GAME_WIDTH) {
              output += `\x1b[${screenY};${renderLeft + 1 + lx}H${logColor}${displaySprite.slice(0, log.width)}\x1b[0m`;
            } else if (lx < 0) {
              const visible = displaySprite.slice(-lx, log.width);
              if (visible.length > 0) {
                output += `\x1b[${screenY};${renderLeft + 1}H${logColor}${visible}\x1b[0m`;
              }
            } else if (lx < GAME_WIDTH) {
              const visible = displaySprite.slice(0, GAME_WIDTH - lx);
              output += `\x1b[${screenY};${renderLeft + 1 + lx}H${logColor}${visible}\x1b[0m`;
            }
          }
        }
      }

      // Draw frog
      const frogScreenX = renderLeft + 1 + Math.floor(playerX);
      const frogScreenY = renderTop + 1 + playerY;
      let frogChar = FROG_IDLE;
      if (hopFrame > 0) frogChar = FROG_HOP;
      else if (playerOnLog) frogChar = FROG_ON_LOG;

      const frogColor = deathFlash > 0 ? '\x1b[91m' : '\x1b[1;92m';
      output += `\x1b[${frogScreenY};${frogScreenX}H${frogColor}${frogChar}\x1b[0m`;

      // Draw particles
      for (const p of particles) {
        const sx = Math.round(renderLeft + 1 + p.x);
        const sy = Math.round(renderTop + 1 + p.y);
        if (sx > renderLeft && sx < renderLeft + GAME_WIDTH + 1 &&
            sy > renderTop && sy < renderTop + GAME_HEIGHT + 1) {
          output += `\x1b[${sy};${sx}H${p.color}${p.char}\x1b[0m`;
        }
      }
    }

    // Bottom hint
    const hint = gameStarted && !gameOver && !paused ? `HIGH: ${highScore}  [ ESC ] MENU` : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${hintX}H\x1b[2m${hint}\x1b[0m`;

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
        paused = !paused;
        if (paused) pauseMenuSelection = 0;
        return;
      }

      if (key === 'q' && (paused || gameOver || !gameStarted)) {
        clearInterval(renderInterval);
        clearInterval(gameInterval);
        controller.stop();
        dispatchGameQuit(terminal);
        return;
      }

      if (!gameStarted && !paused) {
        gameStarted = true;
        return;
      }

      if (gameOver) {
        if (key === 'r') {
          if (score > highScore) highScore = score;
          initGame();
          gameStarted = true;
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

      // Movement
      switch (domEvent.key) {
        case 'ArrowLeft':
        case 'a':
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          movePlayer(1, 0);
          break;
        case 'ArrowUp':
        case 'w':
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
          movePlayer(0, 1);
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
