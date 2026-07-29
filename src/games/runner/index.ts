/**
 * Hyper Runner
 *
 * Cyberpunk endless runner game - dodge obstacles,
 * collect power-ups, and survive as long as you can.
 * Subway Surfers-style vertical perspective with cyberpunk aesthetics.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, getVerticalAnchor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Runner Game Controller
 */
export interface RunnerController {
  stop: () => void;
  isRunning: boolean;
}

interface Obstacle {
  y: number; // Distance from player (higher = further away)
  lane: number; // 0, 1, 2
  type: 'car' | 'barrier' | 'drone';
  height: 'low' | 'high';
}

interface Coin {
  y: number;
  lane: number;
}

interface Building {
  y: number;
  side: 'left' | 'right';
  height: number; // 1-3
  style: number; // 0-2
}

interface SpeedStreak {
  y: number;
  x: number;
  life: number;
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
 * Cyberpunk Endless Runner - Vertical perspective
 */
export function runRunnerGame(terminal: Terminal): RunnerController {
  const themeColor = getCurrentThemeColor();

  // Game dimensions
  const LANES = 3;
  const TRACK_HEIGHT = 14;
  const ROAD_WIDTH_BOTTOM = 24; // Road width at bottom (near player)
  const ROAD_WIDTH_TOP = 6; // Road width at top (horizon)
  const SCENERY_WIDTH = 8; // Space for buildings on each side
  const GAME_WIDTH = ROAD_WIDTH_BOTTOM + SCENERY_WIDTH * 2;
  let gameTop = 5;
  let gameLeft = 4;

  // Minimum terminal size
  const MIN_COLS = GAME_WIDTH + 2;
  const MIN_ROWS = TRACK_HEIGHT + 8;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let score = 0;
  let highScore = 0;
  let distance = 0;
  let speed = 1;
  let coins = 0;
  let combo = 0;
  let comboTimer = 0;
  let nearMissFlash = 0;

  // Player state
  let playerLane = 1;
  let isJumping = false;
  let jumpFrame = 0;
  const JUMP_DURATION = 12;
  let isSliding = false;
  let slideFrame = 0;
  const SLIDE_DURATION = 10;

  // Game objects
  let obstacles: Obstacle[] = [];
  let coinItems: Coin[] = [];
  let buildings: Building[] = [];
  let speedStreaks: SpeedStreak[] = [];
  let spawnTimer = 0;
  let buildingTimer = 0;

  // Visual effects
  let glitchFrame = 0;
  let screenShake = 0;
  let trackOffset = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let crashFlashFrames = 0;
  let coinFlashFrames = 0;
  let jumpFlashFrames = 0;
  let landingShakeFrames = 0;

  const controller: RunnerController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   █▀█ █ █ █▄ █ █▄ █ █▀▀ █▀█',
    '█▀█  █  █▀▀ ██▄ █▀▄   █▀▄ █▄█ █ ▀█ █ ▀█ ██▄ █▀▄',
  ];

  function updateLayout(rows: number, cols: number) {
    gameTop = getVerticalAnchor(rows, TRACK_HEIGHT, {
      headerRows: 4,
      footerRows: 2,
      minTop: 5,
    });
    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH) / 2));
  }

  // Calculate road width at a given row (0 = top/far, TRACK_HEIGHT-1 = bottom/near)
  function getRoadWidth(row: number): number {
    const t = row / (TRACK_HEIGHT - 1); // 0 to 1
    // Exponential interpolation for perspective
    const factor = Math.pow(t, 0.6);
    return Math.floor(ROAD_WIDTH_TOP + (ROAD_WIDTH_BOTTOM - ROAD_WIDTH_TOP) * factor);
  }

  // Spawn particles at position
  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['✦', '★', '◆', '●']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.3 + Math.random() * 0.5;
      particles.push({
        x: x,
        y: y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: color,
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

  function initGame() {
    playerLane = 1;
    isJumping = false;
    isSliding = false;
    jumpFrame = 0;
    slideFrame = 0;
    score = 0;
    distance = 0;
    speed = 1;
    coins = 0;
    combo = 0;
    comboTimer = 0;
    nearMissFlash = 0;
    obstacles = [];
    coinItems = [];
    buildings = [];
    speedStreaks = [];
    spawnTimer = 0;
    buildingTimer = 0;
    gameOver = false;
    paused = false;
    trackOffset = 0;
    // Reset effects
    particles = [];
    scorePopups = [];
    crashFlashFrames = 0;
    coinFlashFrames = 0;
    jumpFlashFrames = 0;
    landingShakeFrames = 0;
    screenShake = 0;

    // Spawn initial buildings
    for (let i = 0; i < 8; i++) {
      buildings.push({
        y: i * 2,
        side: i % 2 === 0 ? 'left' : 'right',
        height: Math.floor(Math.random() * 3) + 1,
        style: Math.floor(Math.random() * 3),
      });
    }
  }

  function spawnObstacle() {
    if (obstacles.some(o => o.y > TRACK_HEIGHT - 2)) return;

    const lane = Math.floor(Math.random() * LANES);
    const types: Obstacle['type'][] = ['car', 'barrier', 'drone'];
    const type = types[Math.floor(Math.random() * types.length)];
    const height: Obstacle['height'] = type === 'drone' ? 'high' : (Math.random() > 0.6 ? 'high' : 'low');

    obstacles.push({
      y: TRACK_HEIGHT + 2,
      lane,
      type,
      height,
    });

    // Spawn coin in different lane
    if (Math.random() > 0.4) {
      let coinLane = Math.floor(Math.random() * LANES);
      if (coinLane === lane) coinLane = (coinLane + 1) % LANES;
      coinItems.push({
        y: TRACK_HEIGHT + 3 + Math.random() * 2,
        lane: coinLane,
      });
    }
  }

  function spawnBuilding() {
    const side = Math.random() > 0.5 ? 'left' : 'right';
    buildings.push({
      y: TRACK_HEIGHT + 2,
      side,
      height: Math.floor(Math.random() * 3) + 1,
      style: Math.floor(Math.random() * 3),
    });
  }

  function getJumpHeight(): number {
    if (isJumping) {
      const progress = jumpFrame / JUMP_DURATION;
      return Math.sin(progress * Math.PI) * 2.5;
    }
    return 0;
  }

  function checkCollision(): boolean {
    const playerY = 2;

    for (const obs of obstacles) {
      if (obs.lane !== playerLane) continue;
      const dist = Math.abs(obs.y - playerY);
      if (dist > 1.5) continue;

      // Near miss detection (close but not collision)
      if (dist > 0.8 && dist <= 1.5) {
        // Check if we're actually dodging
        if (obs.height === 'high' && isSliding) continue;
        if (obs.height === 'low' && getJumpHeight() > 0.5) continue;
      }

      if (obs.height === 'high' && isSliding) continue;
      if (obs.height === 'low' && getJumpHeight() > 0.5) continue;

      return true;
    }
    return false;
  }

  function checkNearMiss(): boolean {
    const playerY = 2;
    for (const obs of obstacles) {
      // Check adjacent lanes for near miss
      if (Math.abs(obs.lane - playerLane) === 1 && Math.abs(obs.y - playerY) < 1) {
        return true;
      }
      // Check same lane with jump/slide dodge
      if (obs.lane === playerLane && Math.abs(obs.y - playerY) < 1) {
        if ((obs.height === 'high' && isSliding) || (obs.height === 'low' && getJumpHeight() > 0.5)) {
          return true;
        }
      }
    }
    return false;
  }

  function collectCoins() {
    const playerY = 2;
    const newCoins: Coin[] = [];
    const cols = terminal.cols;
    const centerX = Math.max(2, Math.floor((cols - GAME_WIDTH) / 2)) + Math.floor(GAME_WIDTH / 2);

    for (const coin of coinItems) {
      if (coin.lane === playerLane && Math.abs(coin.y - playerY) < 1.5) {
        coins++;
        const points = Math.floor(50 * (1 + combo * 0.5));
        score += points;

        // Coin collection effects
        coinFlashFrames = 6;
        const roadWidth = getRoadWidth(TRACK_HEIGHT - 1);
        const roadLeft = centerX - Math.floor(roadWidth / 2);
        const coinX = roadLeft + Math.floor(((coin.lane + 0.5) / LANES) * roadWidth);
        const coinY = gameTop + TRACK_HEIGHT - Math.floor(coin.y);

        spawnParticles(coinX - gameLeft, coinY - gameTop, 6, '\x1b[1;93m', ['◆', '★', '●', '♦']);
        addScorePopup(coinX, coinY, `+${points}`, '\x1b[1;93m');
      } else {
        newCoins.push(coin);
      }
    }
    coinItems = newCoins;
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Update effect timers
    if (crashFlashFrames > 0) crashFlashFrames--;
    if (coinFlashFrames > 0) coinFlashFrames--;
    if (jumpFlashFrames > 0) jumpFlashFrames--;
    if (landingShakeFrames > 0) landingShakeFrames--;

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
      popup.y -= 0.3;
      popup.frames--;
      if (popup.frames <= 0) scorePopups.splice(i, 1);
    }

    const cols = terminal.cols;
    const rows = terminal.rows;

    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      let hint = needWidth && needHeight ? 'Make pane larger' : needWidth ? 'Make pane wider →' : 'Make pane taller ↓';
      const msg2 = `Need: ${MIN_COLS}×${MIN_ROWS}  Have: ${cols}×${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    updateLayout(rows, cols);
    const shakeX = screenShake > 0 ? Math.floor(Math.random() * 3) - 1 : 0;
    const actualLeft = gameLeft + shakeX;
    const centerX = actualLeft + Math.floor(GAME_WIDTH / 2);

    // Title with glitch effect
    glitchFrame = (glitchFrame + 1) % 80;
    const glitchOffset = glitchFrame >= 75 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

    const titleTop = Math.max(1, gameTop - 3);
    if (glitchFrame >= 75 && glitchFrame < 78) {
      output += `\x1b[${titleTop};${titleX}H\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[${titleTop + 1};${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `\x1b[${titleTop};${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[${titleTop + 1};${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    // Stats bar with combo indicator
    let stats = `SCORE: ${score.toString().padStart(5, '0')}  COINS: ${coins}  SPEED: ${speed.toFixed(1)}x`;
    if (combo > 0) {
      stats += `  \x1b[93mCOMBO x${combo}\x1b[0m${themeColor}`;
    }
    const statsX = Math.floor((cols - stats.length + (combo > 0 ? 15 : 0)) / 2);
    output += `\x1b[4;${statsX}H${themeColor}${stats}\x1b[0m`;

    // Near miss flash
    if (nearMissFlash > 0) {
      const flashMsg = '★ NEAR MISS! ★';
      const flashX = Math.floor((cols - flashMsg.length) / 2);
      output += `\x1b[3;${flashX}H\x1b[1;93m${flashMsg}\x1b[0m`;
    }

    const trackBottom = gameTop + TRACK_HEIGHT;

    // Draw buildings on the sides (background layer)
    for (const bld of buildings) {
      if (bld.y < 0 || bld.y > TRACK_HEIGHT) continue;
      const row = TRACK_HEIGHT - Math.floor(bld.y);
      if (row < 0 || row >= TRACK_HEIGHT) continue;

      const screenY = gameTop + row;
      const roadWidth = getRoadWidth(row);
      const roadLeft = centerX - Math.floor(roadWidth / 2);
      const roadRight = centerX + Math.floor(roadWidth / 2);

      // Building appearance based on distance and style
      const normalizedDepth = row / TRACK_HEIGHT;
      const dim = normalizedDepth < 0.5 ? '\x1b[2m' : '';

      // Different building styles
      const buildingChars = [
        ['█', '▓', '░'], // Solid building
        ['▐', '│', '░'], // Slim building
        ['◰', '◱', '·'], // Tech building
      ];
      const chars = buildingChars[bld.style];

      if (bld.side === 'left') {
        const bldX = roadLeft - 3 - Math.floor(normalizedDepth * 2);
        for (let h = 0; h < bld.height && screenY - h >= gameTop; h++) {
          const char = chars[Math.min(h, chars.length - 1)];
          output += `\x1b[${screenY - h};${bldX}H${dim}\x1b[35m${char}${char}\x1b[0m`;
        }
      } else {
        const bldX = roadRight + 2 + Math.floor(normalizedDepth * 2);
        for (let h = 0; h < bld.height && screenY - h >= gameTop; h++) {
          const char = chars[Math.min(h, chars.length - 1)];
          output += `\x1b[${screenY - h};${bldX}H${dim}\x1b[35m${char}${char}\x1b[0m`;
        }
      }
    }

    // Draw speed streaks when going fast
    if (speed > 1.5) {
      for (const streak of speedStreaks) {
        if (streak.life <= 0) continue;
        const intensity = streak.life > 2 ? '│' : streak.life > 1 ? '¦' : '·';
        output += `\x1b[${streak.y};${streak.x}H\x1b[2m${themeColor}${intensity}\x1b[0m`;
      }
    }

    // Draw road with proper perspective
    for (let row = 0; row < TRACK_HEIGHT; row++) {
      const screenY = gameTop + row;
      const roadWidth = getRoadWidth(row);
      const roadLeft = centerX - Math.floor(roadWidth / 2);
      const roadRight = centerX + Math.floor(roadWidth / 2);
      const normalizedDepth = row / TRACK_HEIGHT;

      // Road edge style based on distance
      const edgeChar = normalizedDepth < 0.2 ? '·' : normalizedDepth < 0.4 ? '│' : normalizedDepth < 0.7 ? '┃' : '█';
      const edgeDim = normalizedDepth < 0.4 ? '\x1b[2m' : '';

      // Draw road edges (solid white lines)
      output += `\x1b[${screenY};${roadLeft}H${edgeDim}\x1b[97m${edgeChar}\x1b[0m`;
      output += `\x1b[${screenY};${roadRight}H${edgeDim}\x1b[97m${edgeChar}\x1b[0m`;

      // Road surface (dark fill between edges)
      const surfaceChar = normalizedDepth < 0.3 ? ' ' : normalizedDepth < 0.6 ? '░' : '▒';
      if (normalizedDepth >= 0.3) {
        for (let x = roadLeft + 1; x < roadRight; x++) {
          // Skip lane divider positions
          const laneWidth = (roadRight - roadLeft) / LANES;
          const inLaneDivider = Math.abs((x - roadLeft) % laneWidth) < 0.5;
          if (!inLaneDivider) {
            output += `\x1b[${screenY};${x}H\x1b[2m\x1b[90m${surfaceChar}\x1b[0m`;
          }
        }
      }

      // Lane dividers (dashed white lines)
      const dashPhase = (Math.floor(trackOffset * 3) + row) % 4;
      for (let lane = 1; lane < LANES; lane++) {
        const laneX = roadLeft + Math.floor((lane / LANES) * roadWidth);
        const laneDim = normalizedDepth < 0.4 ? '\x1b[2m' : '';

        if (dashPhase < 2) {
          // Dashed line - visible
          const laneChar = normalizedDepth < 0.25 ? '·' : normalizedDepth < 0.5 ? '¦' : '│';
          output += `\x1b[${screenY};${laneX}H${laneDim}\x1b[97m${laneChar}\x1b[0m`;
        } else {
          // Gap in dashed line
          if (normalizedDepth >= 0.3) {
            output += `\x1b[${screenY};${laneX}H\x1b[2m\x1b[90m${surfaceChar}\x1b[0m`;
          }
        }
      }
    }

    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseY = gameTop + Math.floor(TRACK_HEIGHT / 2) - 2;
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
      const startMsg = '[ PRESS ANY KEY TO RUN ]';
      const startX = Math.floor((cols - startMsg.length) / 2);
      const startY = gameTop + Math.floor(TRACK_HEIGHT / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '←→ LANE  ↑/SPC JUMP  ↓ SLIDE  ESC MENU';
      const ctrlX = Math.floor((cols - controls.length) / 2);
      output += `\x1b[${trackBottom + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else if (gameOver) {
      // Flashing crash banner
      const crashColor = crashFlashFrames > 0 && crashFlashFrames % 4 < 2 ? '\x1b[41;97m' : '\x1b[1;91m';
      const overMsg = '╔══ CRASHED! ══╗';
      const overX = Math.floor((cols - overMsg.length) / 2);
      const overY = gameTop + Math.floor(TRACK_HEIGHT / 2) - 1;
      output += `\x1b[${overY};${overX}H${crashColor}${overMsg}\x1b[0m`;

      const scoreLine = `  DISTANCE: ${Math.floor(distance)}m  `;
      const coinsLine = `  COINS: ${coins}  SCORE: ${score}  `;
      output += `\x1b[${overY + 1};${Math.floor((cols - scoreLine.length) / 2)}H${themeColor}${scoreLine}\x1b[0m`;
      output += `\x1b[${overY + 2};${Math.floor((cols - coinsLine.length) / 2)}H${themeColor}${coinsLine}\x1b[0m`;

      const restart = '╚ [R] RESTART  [Q] QUIT ╝';
      output += `\x1b[${overY + 3};${Math.floor((cols - restart.length) / 2)}H\x1b[2m${themeColor}${restart}\x1b[0m`;

      // Draw crash particles even on game over screen
      for (const p of particles) {
        const px = Math.round(actualLeft + p.x);
        const py = Math.round(gameTop + p.y);
        if (px > actualLeft && px < actualLeft + GAME_WIDTH && py >= gameTop && py < trackBottom) {
          const alpha = p.life > 6 ? '' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }
    } else {
      // Draw coins
      for (const coin of coinItems) {
        if (coin.y < 0 || coin.y > TRACK_HEIGHT) continue;
        const row = TRACK_HEIGHT - Math.floor(coin.y);
        if (row < 0 || row >= TRACK_HEIGHT) continue;

        const screenY = gameTop + row;
        const roadWidth = getRoadWidth(row);
        const roadLeft = centerX - Math.floor(roadWidth / 2);
        const coinX = roadLeft + Math.floor(((coin.lane + 0.5) / LANES) * roadWidth);
        const normalizedDepth = row / TRACK_HEIGHT;

        const coinChar = normalizedDepth < 0.3 ? '·' : normalizedDepth < 0.6 ? '●' : '◉';
        const coinDim = normalizedDepth < 0.4 ? '\x1b[2m' : '\x1b[1m';
        output += `\x1b[${screenY};${coinX}H${coinDim}\x1b[93m${coinChar}\x1b[0m`;
      }

      // Draw obstacles
      for (const obs of obstacles) {
        if (obs.y < 0 || obs.y > TRACK_HEIGHT + 1) continue;
        const row = TRACK_HEIGHT - Math.floor(obs.y);
        if (row < 0 || row >= TRACK_HEIGHT) continue;

        const screenY = gameTop + row;
        const roadWidth = getRoadWidth(row);
        const roadLeft = centerX - Math.floor(roadWidth / 2);
        const obsCenter = roadLeft + Math.floor(((obs.lane + 0.5) / LANES) * roadWidth);
        const normalizedDepth = row / TRACK_HEIGHT;

        let obsChar: string;
        let obsColor: string;

        // Scale obstacle size with perspective
        if (normalizedDepth < 0.25) {
          // Far - tiny
          if (obs.type === 'car') { obsChar = '▪'; obsColor = '\x1b[91m'; }
          else if (obs.type === 'drone') { obsChar = '·'; obsColor = '\x1b[95m'; }
          else { obsChar = '▬'; obsColor = '\x1b[93m'; }
        } else if (normalizedDepth < 0.5) {
          // Medium distance
          if (obs.type === 'car') { obsChar = '▐▌'; obsColor = '\x1b[91m'; }
          else if (obs.type === 'drone') { obsChar = '◇'; obsColor = '\x1b[95m'; }
          else { obsChar = '▄▄'; obsColor = '\x1b[93m'; }
        } else if (normalizedDepth < 0.75) {
          // Closer
          if (obs.type === 'car') { obsChar = '▐█▌'; obsColor = '\x1b[91m'; }
          else if (obs.type === 'drone') { obsChar = '◆◇◆'; obsColor = '\x1b[95m'; }
          else { obsChar = '███'; obsColor = '\x1b[93m'; }
        } else {
          // Near - largest
          if (obs.type === 'car') { obsChar = '▐███▌'; obsColor = '\x1b[1;91m'; }
          else if (obs.type === 'drone') { obsChar = '◆◆◆◆'; obsColor = '\x1b[1;95m'; }
          else { obsChar = '█████'; obsColor = '\x1b[1;93m'; }
        }

        const obsX = obsCenter - Math.floor(obsChar.length / 2);
        const obsDim = normalizedDepth < 0.35 ? '\x1b[2m' : '';
        output += `\x1b[${screenY};${obsX}H${obsDim}${obsColor}${obsChar}\x1b[0m`;

        // Draw top row for tall obstacles when close
        if (obs.height === 'high' && normalizedDepth > 0.6 && row > 0) {
          const topChar = obs.type === 'drone' ? '◆◆◆◆' : obs.type === 'car' ? '▐▀▀▀▌' : '█████';
          output += `\x1b[${screenY - 1};${obsX}H${obsColor}${topChar}\x1b[0m`;
        }
      }

      // Draw player
      const playerRow = TRACK_HEIGHT - 1;
      const playerScreenY = gameTop + playerRow;
      const roadWidth = getRoadWidth(playerRow);
      const roadLeft = centerX - Math.floor(roadWidth / 2);
      const playerCenter = roadLeft + Math.floor(((playerLane + 0.5) / LANES) * roadWidth);

      let playerChars: string[];
      let playerColor = themeColor;
      const jumpHeight = getJumpHeight();

      if (isJumping) {
        playerChars = ['╱▲╲', ' ▼ '];
        playerColor = '\x1b[1m' + themeColor;
      } else if (isSliding) {
        playerChars = ['▬▬▬'];
        playerColor = themeColor;
      } else {
        const runFrame = Math.floor(distance * 3) % 4;
        if (runFrame === 0) playerChars = ['◢█◣', '╱ ╲'];
        else if (runFrame === 1) playerChars = ['◢█◣', '│ │'];
        else if (runFrame === 2) playerChars = ['◢█◣', '╲ ╱'];
        else playerChars = ['◢█◣', '│ │'];
      }

      const playerX = playerCenter - Math.floor(playerChars[0].length / 2);
      const playerYOffset = Math.floor(jumpHeight);
      const finalPlayerY = playerScreenY - playerYOffset;

      // Draw player character (multi-row)
      for (let i = 0; i < playerChars.length; i++) {
        if (finalPlayerY - (playerChars.length - 1 - i) >= gameTop) {
          output += `\x1b[${finalPlayerY - (playerChars.length - 1 - i)};${playerX}H${playerColor}${playerChars[i]}\x1b[0m`;
        }
      }

      // Shadow when jumping
      if (jumpHeight > 0.5) {
        const shadowSize = Math.max(1, 3 - Math.floor(jumpHeight));
        const shadow = '░'.repeat(shadowSize);
        output += `\x1b[${playerScreenY};${playerCenter - Math.floor(shadowSize / 2)}H\x1b[2m${themeColor}${shadow}\x1b[0m`;
      }

      // Draw particles
      for (const p of particles) {
        const px = Math.round(actualLeft + p.x);
        const py = Math.round(gameTop + p.y);
        if (px > actualLeft && px < actualLeft + GAME_WIDTH && py >= gameTop && py < trackBottom) {
          const alpha = p.life > 6 ? '' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const px = Math.round(popup.x);
        const py = Math.round(popup.y);
        if (py >= gameTop && py < trackBottom) {
          const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }
    }

    // Bottom hint
    const hint = gameStarted && !gameOver && !paused ? `HIGH: ${highScore}  [ ESC ] MENU` : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${trackBottom + 1};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

    if (screenShake > 0) screenShake--;
    if (nearMissFlash > 0) nearMissFlash--;
    if (comboTimer > 0) {
      comboTimer--;
      if (comboTimer === 0) combo = 0;
    }

    trackOffset += speed * 0.4;

    // Update jump
    if (isJumping) {
      jumpFrame++;
      if (jumpFrame >= JUMP_DURATION) {
        isJumping = false;
        jumpFrame = 0;
      }
    }

    // Update slide
    if (isSliding) {
      slideFrame++;
      if (slideFrame >= SLIDE_DURATION) {
        isSliding = false;
        slideFrame = 0;
      }
    }

    // Move objects
    const moveSpeed = 0.35 * speed;
    obstacles = obstacles.filter(obs => {
      obs.y -= moveSpeed;
      return obs.y > -2;
    });
    coinItems = coinItems.filter(coin => {
      coin.y -= moveSpeed;
      return coin.y > -2;
    });
    buildings = buildings.filter(bld => {
      bld.y -= moveSpeed * 0.7; // Buildings move slower (parallax)
      return bld.y > -3;
    });

    // Update speed streaks
    if (speed > 1.5 && Math.random() > 0.7) {
      speedStreaks.push({
        y: gameTop + Math.floor(Math.random() * TRACK_HEIGHT),
        x: gameLeft + Math.floor(Math.random() * GAME_WIDTH),
        life: 3,
      });
    }
    speedStreaks = speedStreaks.filter(s => {
      s.life--;
      return s.life > 0;
    });

    // Spawn obstacles
    spawnTimer++;
    const spawnRate = Math.max(15, 35 - speed * 6);
    if (spawnTimer >= spawnRate) {
      spawnTimer = 0;
      spawnObstacle();
    }

    // Spawn buildings
    buildingTimer++;
    if (buildingTimer >= 20) {
      buildingTimer = 0;
      spawnBuilding();
    }

    // Near miss detection
    if (checkNearMiss()) {
      combo++;
      comboTimer = 40; // Combo lasts ~2 seconds
      nearMissFlash = 10;
      const nearMissPoints = 25 * combo;
      score += nearMissPoints;

      // Near miss effects - just particles, no popup (combo counter shows progress)
      const cols = terminal.cols;
      const centerX = Math.max(2, Math.floor((cols - GAME_WIDTH) / 2)) + Math.floor(GAME_WIDTH / 2);
      const roadWidth = getRoadWidth(TRACK_HEIGHT - 1);
      const roadLeft = centerX - Math.floor(roadWidth / 2);
      const playerCenter = roadLeft + Math.floor(((playerLane + 0.5) / LANES) * roadWidth);
      spawnParticles(playerCenter - gameLeft, TRACK_HEIGHT - 2, 4, '\x1b[96m', ['✦', '★', '◇']);
    }

    collectCoins();

    if (checkCollision()) {
      gameOver = true;
      screenShake = 15;
      crashFlashFrames = 20;
      if (score > highScore) highScore = score;

      // Crash particles
      const cols = terminal.cols;
      const centerX = Math.max(2, Math.floor((cols - GAME_WIDTH) / 2)) + Math.floor(GAME_WIDTH / 2);
      const roadWidth = getRoadWidth(TRACK_HEIGHT - 1);
      const roadLeft = centerX - Math.floor(roadWidth / 2);
      const playerCenter = roadLeft + Math.floor(((playerLane + 0.5) / LANES) * roadWidth);
      spawnParticles(playerCenter - gameLeft, TRACK_HEIGHT - 1, 15, '\x1b[1;91m', ['✗', '☠', '×', '▓', '░']);
      return;
    }

    distance += 0.18 * speed;
    score += Math.floor(speed * (1 + combo * 0.1));
    speed = Math.min(4, 1 + Math.floor(distance / 60) * 0.3);
  }

  // Start game loop
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
          if (playerLane > 0) playerLane--;
          break;
        case 'ArrowRight':
        case 'd':
          if (playerLane < LANES - 1) playerLane++;
          break;
        case 'ArrowUp':
        case 'w':
        case ' ':
          if (!isJumping && !isSliding) {
            isJumping = true;
            jumpFrame = 0;
          }
          break;
        case 'ArrowDown':
        case 's':
          if (!isJumping && !isSliding) {
            isSliding = true;
            slideFrame = 0;
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
