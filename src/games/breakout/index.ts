/**
 * Hyper Breakout
 *
 * Classic breakout/brick breaker with cyberpunk theme.
 * Paddle at bottom, ball bounces to break bricks at top.
 * Features power-ups, particle explosions, and screen shake.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Breakout Game Controller
 */
export interface BreakoutController {
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

interface Brick {
  x: number;
  y: number;
  width: number;
  alive: boolean;
  type: number;
  hits: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'multiball' | 'wide' | 'laser' | 'slow' | 'extra';
  vy: number;
}

interface Laser {
  x: number;
  y: number;
}

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runBreakoutGame(terminal: Terminal): BreakoutController {
  const themeColor = getCurrentThemeColor();

  const MIN_COLS = 40;
  const MIN_ROWS = 18;
  const GAME_WIDTH = 46;
  const GAME_HEIGHT = 20;
  const PADDLE_WIDTH_NORMAL = 7;
  const PADDLE_WIDTH_WIDE = 11;
  const BRICK_WIDTH = 5;
  const BRICK_HEIGHT = 1;
  const BRICK_ROWS = 5;
  const BRICK_COLS = 8;
  const BALL_SPEED = 0.4;
  const MAX_BALL_SPEED = 0.7;

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

  let gameLeft = 2;
  let gameTop = 4;

  let paddleX = GAME_WIDTH / 2;
  let paddleWidth = PADDLE_WIDTH_NORMAL;
  let paddleWidthTimer = 0;

  let balls: Ball[] = [];
  let bricks: Brick[] = [];
  let powerUps: PowerUp[] = [];
  let lasers: Laser[] = [];
  let laserActive = false;
  let laserTimer = 0;
  let laserCooldown = 0;
  let slowActive = false;
  let slowTimer = 0;

  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let comboCount = 0;
  let comboTimer = 0;
  let borderFlash = 0;
  let ballAttached = true;

  const controller: BreakoutController = {
    stop: () => { if (!running) return; running = false; },
    get isRunning() { return running; }
  };

  const title = [
    '\u2588 \u2588 \u2588\u2584\u2588 \u2588\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580\u2588   \u2588\u2580\u2588 \u2588\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580\u2588 \u2588 \u2580 \u2588\u2580\u2588 \u2588 \u2588 \u2580\u2588\u2580',
    '\u2588\u2580\u2588  \u2588  \u2588\u2580\u2580 \u2588\u2588\u2584 \u2588\u2580\u2584   \u2588\u2580\u2588 \u2588\u2584\u2588 \u2588\u2584\u2584 \u2588\u2584\u2588 \u2588\u2580\u2584 \u2588\u2584\u2588 \u2588\u2584\u2588  \u2588 ',
  ];

  const brickColors = ['\x1b[1;91m', '\x1b[1;93m', '\x1b[1;92m', '\x1b[1;96m', '\x1b[1;95m'];
  const brickPoints = [50, 40, 30, 20, 10];

  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['\u2726', '\u2605', '\u25c6', '\u25cf']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.2 + Math.random() * 0.4;
      particles.push({ x, y, char: chars[Math.floor(Math.random() * chars.length)], color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, life: 10 + Math.floor(Math.random() * 8) });
    }
  }

  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 18, color });
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  function initGame() {
    score = won ? score : 0;
    lives = won ? lives : 3;
    gameOver = false;
    won = false;
    paused = false;
    paddleX = GAME_WIDTH / 2;
    paddleWidth = PADDLE_WIDTH_NORMAL;
    paddleWidthTimer = 0;
    powerUps = [];
    lasers = [];
    laserActive = false;
    laserTimer = 0;
    laserCooldown = 0;
    slowActive = false;
    slowTimer = 0;
    particles = [];
    scorePopups = [];
    shakeFrames = 0;
    comboCount = 0;
    comboTimer = 0;
    borderFlash = 0;
    ballAttached = true;
    balls = [{ x: paddleX, y: GAME_HEIGHT - 3, vx: 0, vy: 0, active: true }];
    initBricks();
  }

  function initBricks() {
    bricks = [];
    const startX = Math.floor((GAME_WIDTH - BRICK_COLS * BRICK_WIDTH) / 2);
    const startY = 2;
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const type = row;
        const hits = level >= 3 && row === 0 ? 2 : 1;
        bricks.push({ x: startX + col * BRICK_WIDTH, y: startY + row * (BRICK_HEIGHT + 1), width: BRICK_WIDTH - 1, alive: true, type, hits });
      }
    }
  }

  function launchBall() {
    if (!ballAttached || balls.length === 0) return;
    ballAttached = false;
    const ball = balls[0];
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
    const speed = BALL_SPEED + (level - 1) * 0.03;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }

  function spawnPowerUp(x: number, y: number) {
    if (Math.random() > 0.2) return;
    const types: PowerUp['type'][] = ['multiball', 'wide', 'laser', 'slow', 'extra'];
    powerUps.push({ x, y, type: types[Math.floor(Math.random() * types.length)], vy: 0.15 });
  }

  function applyPowerUp(type: PowerUp['type']) {
    triggerShake(8, 2);
    borderFlash = 15;
    switch (type) {
      case 'multiball': {
        const activeBalls = balls.filter(b => b.active);
        if (activeBalls.length > 0) {
          const src = activeBalls[0];
          for (let i = 0; i < 2; i++) {
            const angle = (Math.random() - 0.5) * Math.PI;
            const speed = Math.sqrt(src.vx ** 2 + src.vy ** 2);
            balls.push({ x: src.x, y: src.y, vx: Math.cos(angle) * speed, vy: -Math.abs(Math.sin(angle) * speed), active: true });
          }
        }
        addScorePopup(paddleX, GAME_HEIGHT - 5, 'MULTI-BALL!', '\x1b[1;96m');
        break;
      }
      case 'wide': paddleWidth = PADDLE_WIDTH_WIDE; paddleWidthTimer = 600; addScorePopup(paddleX, GAME_HEIGHT - 5, 'WIDE PADDLE!', '\x1b[1;92m'); break;
      case 'laser': laserActive = true; laserTimer = 400; addScorePopup(paddleX, GAME_HEIGHT - 5, 'LASER!', '\x1b[1;91m'); break;
      case 'slow': slowActive = true; slowTimer = 300; for (const b of balls) { b.vx *= 0.6; b.vy *= 0.6; } addScorePopup(paddleX, GAME_HEIGHT - 5, 'SLOW-MO!', '\x1b[1;93m'); break;
      case 'extra': lives++; addScorePopup(paddleX, GAME_HEIGHT - 5, '+1 LIFE!', '\x1b[1;95m'); break;
    }
  }

  function getPowerUpChar(type: PowerUp['type']): string { return type === 'multiball' ? 'M' : type === 'wide' ? 'W' : type === 'laser' ? 'L' : type === 'slow' ? 'S' : '+'; }
  function getPowerUpColor(type: PowerUp['type']): string { return type === 'multiball' ? '\x1b[1;96m' : type === 'wide' ? '\x1b[1;92m' : type === 'laser' ? '\x1b[1;91m' : type === 'slow' ? '\x1b[1;93m' : '\x1b[1;95m'; }

  function update() {
    if (!gameStarted || gameOver || paused) return;
    const speedMult = slowActive ? 0.5 : 1;

    if (paddleWidthTimer > 0) { paddleWidthTimer--; if (paddleWidthTimer === 0) paddleWidth = PADDLE_WIDTH_NORMAL; }
    if (laserTimer > 0) { laserTimer--; if (laserTimer === 0) laserActive = false; }
    if (slowTimer > 0) { slowTimer--; if (slowTimer === 0) { slowActive = false; for (const b of balls) { const s = Math.sqrt(b.vx ** 2 + b.vy ** 2); if (s > 0) { const f = Math.min(BALL_SPEED, s * 1.67) / s; b.vx *= f; b.vy *= f; } } } }
    if (laserCooldown > 0) laserCooldown--;
    if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) comboCount = 0; }

    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life--; if (p.life <= 0) particles.splice(i, 1); }
    for (let i = scorePopups.length - 1; i >= 0; i--) { const p = scorePopups[i]; p.y -= 0.25; p.frames--; if (p.frames <= 0) scorePopups.splice(i, 1); }

    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += pu.vy * speedMult;
      const pL = paddleX - paddleWidth / 2, pR = paddleX + paddleWidth / 2;
      if (pu.y >= GAME_HEIGHT - 2 && pu.y <= GAME_HEIGHT - 1 && pu.x >= pL && pu.x <= pR) { applyPowerUp(pu.type); powerUps.splice(i, 1); continue; }
      if (pu.y >= GAME_HEIGHT) powerUps.splice(i, 1);
    }

    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i];
      laser.y -= 1;
      for (const brick of bricks) {
        if (!brick.alive) continue;
        if (laser.y >= brick.y && laser.y <= brick.y + BRICK_HEIGHT && laser.x >= brick.x && laser.x <= brick.x + brick.width) {
          brick.hits--;
          if (brick.hits <= 0) { brick.alive = false; const pts = brickPoints[brick.type] || 10; score += pts; spawnParticles(brick.x + brick.width / 2, brick.y, 6, brickColors[brick.type]); addScorePopup(brick.x + 1, brick.y - 1, `+${pts}`, brickColors[brick.type]); spawnPowerUp(brick.x + brick.width / 2, brick.y); }
          lasers.splice(i, 1);
          break;
        }
      }
      if (laser.y < 0) lasers.splice(i, 1);
    }

    if (ballAttached && balls.length > 0) { balls[0].x = paddleX; balls[0].y = GAME_HEIGHT - 3; }

    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      if (!ball.active || ballAttached) continue;
      ball.x += ball.vx * speedMult;
      ball.y += ball.vy * speedMult;

      if (ball.x <= 0) { ball.x = 0; ball.vx = Math.abs(ball.vx); spawnParticles(0, ball.y, 3, themeColor, ['\u00b7', '\u2022']); }
      if (ball.x >= GAME_WIDTH - 1) { ball.x = GAME_WIDTH - 1; ball.vx = -Math.abs(ball.vx); spawnParticles(GAME_WIDTH - 1, ball.y, 3, themeColor, ['\u00b7', '\u2022']); }
      if (ball.y <= 0) { ball.y = 0; ball.vy = Math.abs(ball.vy); spawnParticles(ball.x, 0, 3, themeColor, ['\u00b7', '\u2022']); }

      const pL = paddleX - paddleWidth / 2, pR = paddleX + paddleWidth / 2, pY = GAME_HEIGHT - 2;
      if (ball.vy > 0 && ball.y >= pY - 0.5 && ball.y <= pY + 0.5 && ball.x >= pL - 0.5 && ball.x <= pR + 0.5) {
        const hitPos = (ball.x - paddleX) / (paddleWidth / 2);
        const angle = hitPos * Math.PI / 3;
        const curSpeed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        const newSpeed = Math.min(MAX_BALL_SPEED, curSpeed * 1.02);
        ball.vx = Math.sin(angle) * newSpeed;
        ball.vy = -Math.cos(angle) * newSpeed;
        ball.y = pY - 1;
        spawnParticles(ball.x, pY, 4, themeColor, ['\u2726', '\u25cf']);
      }

      for (const brick of bricks) {
        if (!brick.alive) continue;
        const bL = brick.x, bR = brick.x + brick.width, bT = brick.y, bB = brick.y + BRICK_HEIGHT;
        if (ball.x >= bL - 0.5 && ball.x <= bR + 0.5 && ball.y >= bT - 0.5 && ball.y <= bB + 0.5) {
          const fromL = ball.x < bL, fromR = ball.x > bR, fromT = ball.y < bT, fromB = ball.y > bB;
          if (fromL || fromR) ball.vx = -ball.vx;
          if (fromT || fromB) ball.vy = -ball.vy;
          if (!fromL && !fromR && !fromT && !fromB) ball.vy = -ball.vy;
          brick.hits--;
          if (brick.hits <= 0) {
            brick.alive = false;
            comboCount++; comboTimer = 40;
            const basePts = brickPoints[brick.type] || 10;
            const comboBonus = comboCount > 1 ? Math.floor(comboCount * 5) : 0;
            const totalPts = basePts + comboBonus;
            score += totalPts;
            const intensity = Math.min(comboCount, 8);
            triggerShake(3 + intensity, 1 + Math.floor(intensity / 3));
            spawnParticles(brick.x + brick.width / 2, brick.y, 6 + intensity, brickColors[brick.type]);
            addScorePopup(brick.x + 1, brick.y - 1, comboCount > 1 ? `+${totalPts}!` : `+${totalPts}`, brickColors[brick.type]);
            spawnPowerUp(brick.x + brick.width / 2, brick.y);
          } else {
            spawnParticles(ball.x, ball.y, 3, '\x1b[2m' + brickColors[brick.type], ['\u00b7', 'x']);
          }
          break;
        }
      }

      if (ball.y >= GAME_HEIGHT) ball.active = false;
    }

    balls = balls.filter(b => b.active);

    if (balls.length === 0 && !ballAttached) {
      lives--;
      if (lives <= 0) { gameOver = true; if (score > highScore) highScore = score; triggerShake(20, 4); spawnParticles(paddleX, GAME_HEIGHT - 2, 15, '\x1b[1;91m', ['\u2717', '\u2620', '\u00d7', '\u2593']); }
      else { ballAttached = true; balls = [{ x: paddleX, y: GAME_HEIGHT - 3, vx: 0, vy: 0, active: true }]; triggerShake(10, 2); }
    }

    const aliveBricks = bricks.filter(b => b.alive);
    if (aliveBricks.length === 0) {
      won = true; gameOver = true; level++; if (score > highScore) highScore = score; triggerShake(12, 2);
      for (let i = 0; i < 5; i++) setTimeout(() => spawnParticles(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT / 2, 15, brickColors[Math.floor(Math.random() * brickColors.length)], ['\u2605', '\u2726', '\u25c6', '\u25cf', '\u2727']), i * 100);
    }
  }

  function render() {
    let output = '\x1b[2J\x1b[H';
    if (shakeFrames > 0) shakeFrames--;
    if (borderFlash > 0) borderFlash--;

    const cols = terminal.cols, rows = terminal.rows;
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needW = cols < MIN_COLS, needH = rows < MIN_ROWS;
      const hint = needW && needH ? 'Make pane larger' : needW ? 'Make pane wider \u2192' : 'Make pane taller \u2193';
      const msg2 = `Need: ${MIN_COLS}\u00d7${MIN_ROWS}  Have: ${cols}\u00d7${rows}`;
      const cX = Math.floor(cols / 2), cY = Math.floor(rows / 2);
      output += `\x1b[${cY - 1};${Math.max(1, cX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${cY + 1};${Math.max(1, cX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${cY + 3};${Math.max(1, cX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH - 2) / 2));
    gameTop = Math.max(4, Math.floor((rows - GAME_HEIGHT - 6) / 2));

    let rL = gameLeft, rT = gameTop;
    if (shakeFrames > 0) { rL += Math.floor((Math.random() - 0.5) * shakeIntensity * 2); rT += Math.floor((Math.random() - 0.5) * shakeIntensity); }

    glitchFrame = (glitchFrame + 1) % 60;
    const glitchOff = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOff;
    if (glitchFrame >= 55 && glitchFrame < 58) { output += `\x1b[1;${titleX}H\x1b[91m${title[0]}\x1b[0m\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`; }
    else { output += `\x1b[1;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`; }

    const livesDisp = '\u2665'.repeat(Math.max(0, lives));
    const stats = `SCORE: ${score.toString().padStart(5, '0')}  LVL: ${level}  ${livesDisp}`;
    const statsX = Math.floor((cols - stats.length) / 2);
    output += `\x1b[${gameTop - 1};${statsX}H${themeColor}${stats}\x1b[0m`;

    let ind = '';
    if (paddleWidthTimer > 0) ind += ' [W]';
    if (laserActive) ind += ' [L]';
    if (slowActive) ind += ' [S]';
    if (ind) output += `\x1b[${gameTop - 1};${statsX + stats.length + 1}H\x1b[2m${themeColor}${ind}\x1b[0m`;

    const bC = borderFlash > 0 && borderFlash % 4 < 2 ? '\x1b[1;93m' : themeColor;
    output += `\x1b[${rT};${rL}H${bC}\u2554${'═'.repeat(GAME_WIDTH)}\u2557\x1b[0m`;
    for (let y = 0; y < GAME_HEIGHT; y++) { output += `\x1b[${rT + 1 + y};${rL}H${bC}\u2551\x1b[0m\x1b[${rT + 1 + y};${rL + GAME_WIDTH + 1}H${bC}\u2551\x1b[0m`; }
    output += `\x1b[${rT + GAME_HEIGHT + 1};${rL}H${bC}\u255a${'═'.repeat(GAME_WIDTH)}\u255d\x1b[0m`;

    if (paused) {
      const pauseMsg = '\u2550\u2550 PAUSED \u2550\u2550';
      const pCX = Math.floor(cols / 2), pY = gameTop + Math.floor(GAME_HEIGHT / 2) - 3;
      output += `\x1b[${pY};${pCX - Math.floor(pauseMsg.length / 2)}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, { centerX: pCX, startY: pY + 2, showShortcuts: false });
      output += `\x1b[${pY + 8};${pCX - 13}H\x1b[2m${themeColor}\u2191\u2193 select   ENTER confirm\x1b[0m`;
    } else if (!gameStarted) {
      const startMsg = '[ PRESS SPACE TO LAUNCH ]';
      const sX = gameLeft + Math.floor((GAME_WIDTH - startMsg.length) / 2) + 1;
      const sY = gameTop + Math.floor(GAME_HEIGHT / 2) + 2;
      output += `\x1b[${sY};${sX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;
      const controls = '\u2190\u2192 MOVE   SPC FIRE/LAUNCH   ESC MENU';
      output += `\x1b[${sY + 2};${gameLeft + Math.floor((GAME_WIDTH - controls.length) / 2) + 1}H\x1b[2m${themeColor}${controls}\x1b[0m`;
      output = renderGameObjects(output, rL, rT);
    } else if (gameOver) {
      const overMsg = won ? '\u2554\u2550\u2550 LEVEL COMPLETE! \u2550\u2550\u2557' : '\u2554\u2550\u2550 GAME OVER \u2550\u2550\u2557';
      const oX = gameLeft + Math.floor((GAME_WIDTH - overMsg.length) / 2) + 1;
      const oY = gameTop + Math.floor(GAME_HEIGHT / 2) - 1;
      output += `\x1b[${oY};${oX}H${won ? '\x1b[1;92m' : '\x1b[1;91m'}${overMsg}\x1b[0m`;
      const scoreLine = `SCORE: ${score}  HIGH: ${highScore}`;
      output += `\x1b[${oY + 1};${gameLeft + Math.floor((GAME_WIDTH - scoreLine.length) / 2) + 1}H${themeColor}${scoreLine}\x1b[0m`;
      const restart = won ? '\u255a [R] NEXT LEVEL  [Q] QUIT \u255d' : '\u255a [R] RESTART  [Q] QUIT \u255d';
      output += `\x1b[${oY + 2};${gameLeft + Math.floor((GAME_WIDTH - restart.length) / 2) + 1}H\x1b[2m${themeColor}${restart}\x1b[0m`;
      output = drawEffects(output, rL, rT);
    } else {
      output = renderGameObjects(output, rL, rT);
    }

    const hint = gameStarted && !gameOver && !paused ? `HIGH: ${highScore}  [ ESC ] MENU` : '';
    output += `\x1b[${gameTop + GAME_HEIGHT + 3};${Math.floor((cols - hint.length) / 2)}H\x1b[2m${themeColor}${hint}\x1b[0m`;
    terminal.write(output);
  }

  function renderGameObjects(output: string, rL: number, rT: number): string {
    for (const brick of bricks) { if (!brick.alive) continue; const sX = rL + 1 + brick.x, sY = rT + 1 + brick.y; const c = brickColors[brick.type] || themeColor; const ch = brick.hits > 1 ? '\u2593' : '\u2588'; output += `\x1b[${sY};${sX}H${c}${ch.repeat(brick.width)}\x1b[0m`; }
    for (const pu of powerUps) { const sX = Math.round(rL + 1 + pu.x), sY = Math.round(rT + 1 + pu.y); if (sY > rT && sY < rT + GAME_HEIGHT + 1) output += `\x1b[${sY};${sX}H${getPowerUpColor(pu.type)}[${getPowerUpChar(pu.type)}]\x1b[0m`; }
    for (const laser of lasers) { const sX = rL + 1 + Math.floor(laser.x), sY = rT + 1 + Math.floor(laser.y); if (sY > rT && sY < rT + GAME_HEIGHT + 1) output += `\x1b[${sY};${sX}H\x1b[1;91m\u2502\x1b[0m`; }
    const pSX = rL + 1 + Math.floor(paddleX - paddleWidth / 2), pSY = rT + GAME_HEIGHT - 1;
    const pCh = laserActive ? '\u2550' : '\u2588';
    output += `\x1b[${pSY};${pSX}H${themeColor}${pCh.repeat(Math.ceil(paddleWidth))}\x1b[0m`;
    if (laserActive) { output += `\x1b[${pSY};${pSX}H\x1b[1;91m\u2191\x1b[0m\x1b[${pSY};${pSX + Math.ceil(paddleWidth) - 1}H\x1b[1;91m\u2191\x1b[0m`; }
    for (const ball of balls) { if (!ball.active) continue; const sX = Math.round(rL + 1 + ball.x), sY = Math.round(rT + 1 + ball.y); if (sX > rL && sX < rL + GAME_WIDTH + 1 && sY > rT && sY < rT + GAME_HEIGHT + 1) { const spd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2); output += `\x1b[${sY};${sX}H${spd > 0.5 ? '\x1b[1;93m' : '\x1b[1;97m'}\u25cf\x1b[0m`; } }
    if (comboCount >= 3) { const comboMsg = comboCount >= 5 ? `\u2605 ${comboCount}x COMBO! \u2605` : `${comboCount}x COMBO!`; const comboX = rL + Math.floor((GAME_WIDTH - comboMsg.length) / 2) + 1; output += `\x1b[${rT + GAME_HEIGHT - 3};${comboX}H${glitchFrame % 6 < 3 ? '\x1b[1;91m' : '\x1b[1;93m'}${comboMsg}\x1b[0m`; }
    return drawEffects(output, rL, rT);
  }

  function drawEffects(output: string, rL: number, rT: number): string {
    for (const p of particles) { const sX = Math.round(rL + 1 + p.x), sY = Math.round(rT + 1 + p.y); if (sX > rL && sX < rL + GAME_WIDTH + 1 && sY > rT && sY < rT + GAME_HEIGHT + 1) output += `\x1b[${sY};${sX}H${p.life > 5 ? '' : '\x1b[2m'}${p.color}${p.char}\x1b[0m`; }
    for (const popup of scorePopups) { const sX = Math.round(rL + 1 + popup.x), sY = Math.round(rT + 1 + popup.y); if (sY > rT && sY < rT + GAME_HEIGHT + 1) output += `\x1b[${sY};${sX}H${popup.frames > 10 ? '\x1b[1m' : '\x1b[2m'}${popup.color}${popup.text}\x1b[0m`; }
    return output;
  }

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    initGame();
    gameStarted = false;

    const renderInterval = setInterval(() => { if (!running) { clearInterval(renderInterval); return; } render(); }, 25);
    const gameInterval = setInterval(() => { if (!running) { clearInterval(gameInterval); return; } update(); }, 25);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) { keyListener.dispose(); return; }
      domEvent.preventDefault();
      domEvent.stopPropagation();
      const key = domEvent.key.toLowerCase();

      if (key === 'escape') { paused = !paused; if (paused) pauseMenuSelection = 0; return; }
      if (key === 'q' && (paused || gameOver || !gameStarted)) { clearInterval(renderInterval); clearInterval(gameInterval); controller.stop(); dispatchGameQuit(terminal); return; }
      if (!gameStarted && !paused) { if (domEvent.key === ' ') { gameStarted = true; launchBall(); } return; }
      if (gameOver) { if (key === 'r') { if (score > highScore) highScore = score; if (won) initGame(); else { level = 1; initGame(); } gameStarted = true; launchBall(); } return; }

      if (paused) {
        const { newSelection, confirmed } = navigateMenu(pauseMenuSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
        if (newSelection !== pauseMenuSelection) { pauseMenuSelection = newSelection; return; }
        if (confirmed) {
          switch (pauseMenuSelection) {
            case 0: paused = false; break;
            case 1: level = 1; initGame(); gameStarted = true; launchBall(); paused = false; break;
            case 2: clearInterval(renderInterval); clearInterval(gameInterval); controller.stop(); dispatchGameQuit(terminal); break;
            case 3: clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGamesMenu(terminal); break;
            case 4: clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGameSwitch(terminal); break;
          }
          return;
        }
        if (key === 'r') { level = 1; initGame(); gameStarted = true; launchBall(); paused = false; }
        else if (key === 'l') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGamesMenu(terminal); }
        else if (key === 'n') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGameSwitch(terminal); }
        return;
      }

      const moveSpeed = 2.5;
      switch (domEvent.key) {
        case 'ArrowLeft': case 'a': paddleX = Math.max(paddleWidth / 2, paddleX - moveSpeed); break;
        case 'ArrowRight': case 'd': paddleX = Math.min(GAME_WIDTH - paddleWidth / 2, paddleX + moveSpeed); break;
        case ' ': if (ballAttached) launchBall(); else if (laserActive && laserCooldown === 0) { lasers.push({ x: paddleX - paddleWidth / 2 + 0.5, y: GAME_HEIGHT - 3 }); lasers.push({ x: paddleX + paddleWidth / 2 - 0.5, y: GAME_HEIGHT - 3 }); laserCooldown = 8; } break;
      }
    });

    const originalStop = controller.stop;
    controller.stop = () => { clearInterval(renderInterval); clearInterval(gameInterval); keyListener.dispose(); originalStop(); };
  }, 25);

  return controller;
}
