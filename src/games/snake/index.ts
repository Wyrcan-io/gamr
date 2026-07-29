/**
 * Hyper Snake Game
 *
 * Cyberpunk-themed snake game with glitchy title,
 * neon borders, and theme-aware colors.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, getVerticalAnchor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Snake Game Controller
 */
export interface SnakeController {
  stop: () => void;
  isRunning: boolean;
}

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Cyberpunk Snake Game
 */
export function runSnakeGame(terminal: Terminal): SnakeController {
  const themeColor = getCurrentThemeColor();

  // Minimum terminal size for playable game
  const MIN_COLS = 36;
  const MIN_ROWS = 16;

  // Game area (dynamically updated on resize)
  let cols = terminal.cols;
  let rows = terminal.rows;
  let gameTop = 6;
  let gameWidth = Math.min(cols - 4, 60);
  let gameHeight = Math.min(rows - 10, 20);
  let gameLeft = Math.max(2, Math.floor((cols - gameWidth - 2) / 2));

  // Update game dimensions when terminal resizes
  const updateDimensions = () => {
    cols = terminal.cols;
    rows = terminal.rows;
    gameWidth = Math.min(cols - 4, 60);
    gameHeight = Math.min(rows - 10, 20);
    gameTop = getVerticalAnchor(rows, gameHeight + 2, {
      headerRows: 4,
      footerRows: 3,
      minTop: 5,
    });
    gameLeft = Math.max(2, Math.floor((cols - gameWidth - 2) / 2));
  };

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let score = 0;
  let highScore = 0;

  // Snake state
  let snake: { x: number; y: number }[] = [];
  let direction: Direction = 'right';
  let nextDirection: Direction = 'right';
  let food: { x: number; y: number } = { x: 0, y: 0 };

  // Glitch effect state
  let glitchFrame = 0;

  // Juicy effects
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let flashFrames = 0;
  let eatFlashFrames = 0;
  let deathFlashFrames = 0;
  let scorePopup: { x: number; y: number; text: string; frames: number } | null = null;
  let particles: { x: number; y: number; char: string; color: string; vx: number; vy: number; life: number }[] = [];
  let comboCount = 0; // Track rapid eating
  let lastEatTime = 0;

  const controller: SnakeController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const titleFrames = [
    [
      '█ █ █▄█ █▀█ █▀▀ █▀█   █▀▀ █▄ █ ▄▀█ █▄▀ █▀▀',
      '█▀█  █  █▀▀ ██▄ █▀▄   ▄▄█ █ ▀█ █▀█ █ █ ██▄',
    ],
  ];

  // Initialize game
  function initGame() {
    snake = [
      { x: Math.floor(gameWidth / 2), y: Math.floor(gameHeight / 2) },
      { x: Math.floor(gameWidth / 2) - 1, y: Math.floor(gameHeight / 2) },
      { x: Math.floor(gameWidth / 2) - 2, y: Math.floor(gameHeight / 2) },
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    gameOver = false;
    paused = false;
    // Reset effects
    shakeFrames = 0;
    shakeIntensity = 0;
    flashFrames = 0;
    eatFlashFrames = 0;
    deathFlashFrames = 0;
    scorePopup = null;
    particles = [];
    comboCount = 0;
    lastEatTime = 0;
    spawnFood();
  }

  // Spawn food at random position
  function spawnFood() {
    let attempts = 0;
    do {
      food = {
        x: Math.floor(Math.random() * (gameWidth - 2)) + 1,
        y: Math.floor(Math.random() * (gameHeight - 2)) + 1,
      };
      attempts++;
    } while (snake.some(s => s.x === food.x && s.y === food.y) && attempts < 100);
  }

  // Spawn particles at a position
  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['✦', '★', '◆', '●']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.3 + Math.random() * 0.4;
      particles.push({
        x: x,
        y: y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color: color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5, // Less vertical movement due to terminal aspect ratio
        life: 15 + Math.floor(Math.random() * 10),
      });
    }
  }

  // Update particles
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // Gravity
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // Draw the game
  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';
    updateDimensions();

    // Update effect timers
    if (shakeFrames > 0) shakeFrames--;
    if (flashFrames > 0) flashFrames--;
    if (eatFlashFrames > 0) eatFlashFrames--;
    if (deathFlashFrames > 0) deathFlashFrames--;
    if (scorePopup && scorePopup.frames > 0) {
      scorePopup.frames--;
      scorePopup.y -= 0.3; // Float upward
      if (scorePopup.frames <= 0) scorePopup = null;
    }
    updateParticles();

    // Apply screen shake
    let renderGameLeft = gameLeft;
    let renderGameTop = gameTop;
    if (shakeFrames > 0) {
      const shakeX = Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      const shakeY = Math.floor((Math.random() - 0.5) * shakeIntensity);
      renderGameLeft = Math.max(1, gameLeft + shakeX);
      renderGameTop = Math.max(3, gameTop + shakeY);
    }

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      let hint = '';
      if (needWidth && needHeight) {
        hint = 'Make pane larger';
      } else if (needWidth) {
        hint = 'Make pane wider →';
      } else {
        hint = 'Make pane taller ↓';
      }
      const msg2 = `Need: ${MIN_COLS}×${MIN_ROWS}  Have: ${cols}×${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Glitchy title
    glitchFrame = (glitchFrame + 1) % 60;
    const titleIndex = glitchFrame < 55 ? 0 : Math.floor(Math.random() * titleFrames.length);
    const title = titleFrames[titleIndex];

    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;
    const titleTop = Math.max(1, gameTop - 4);

    output += `\x1b[${titleTop};${titleX}H`;
    if (glitchFrame >= 55 && glitchFrame < 58) {
      output += `\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[${titleTop + 1};${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `${themeColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[${titleTop + 1};${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    // Score display with eat flash effect
    const scoreText = `SCORE: ${score.toString().padStart(4, '0')}`;
    const highText = `HIGH: ${highScore.toString().padStart(4, '0')}`;
    const scoreColor = eatFlashFrames > 0 ? '\x1b[1;33m' : themeColor;
    const scoreY = Math.max(3, gameTop - 2);
    output += `\x1b[${scoreY};${renderGameLeft}H${scoreColor}${scoreText}  ${highText}\x1b[0m`;

    // Game border with death flash effect
    const borderColor = deathFlashFrames > 0 && deathFlashFrames % 4 < 2 ? '\x1b[1;31m' : themeColor;
    output += `\x1b[${renderGameTop};${renderGameLeft}H${borderColor}╔${'═'.repeat(gameWidth)}╗\x1b[0m`;
    for (let y = 1; y <= gameHeight; y++) {
      output += `\x1b[${renderGameTop + y};${renderGameLeft}H${borderColor}║\x1b[0m`;
      output += `\x1b[${renderGameTop + y};${renderGameLeft + gameWidth + 1}H${borderColor}║\x1b[0m`;
    }
    output += `\x1b[${renderGameTop + gameHeight + 1};${renderGameLeft}H${borderColor}╚${'═'.repeat(gameWidth)}╝\x1b[0m`;

    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = renderGameLeft + Math.floor(gameWidth / 2) + 1;
      const pauseY = renderGameTop + Math.floor(gameHeight / 2) - 2;
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      // Use shared menu rendering
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
      const startX = renderGameLeft + Math.floor((gameWidth - startMsg.length) / 2) + 1;
      const startY = renderGameTop + Math.floor(gameHeight / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '↑↓←→ MOVE  ESC MENU';
      const ctrlX = renderGameLeft + Math.floor((gameWidth - controls.length) / 2) + 1;
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else if (gameOver) {
      const overMsg = '══ GAME OVER ══';
      const overX = renderGameLeft + Math.floor((gameWidth - overMsg.length) / 2) + 1;
      const overY = renderGameTop + Math.floor(gameHeight / 2) - 1;
      output += `\x1b[${overY};${overX}H\x1b[1;31m${overMsg}\x1b[0m`;

      const finalScore = `FINAL SCORE: ${score}`;
      const scoreX = renderGameLeft + Math.floor((gameWidth - finalScore.length) / 2) + 1;
      output += `\x1b[${overY + 2};${scoreX}H${themeColor}${finalScore}\x1b[0m`;

      const restart = '[ R ] RESTART  [ Q ] QUIT';
      const restartX = renderGameLeft + Math.floor((gameWidth - restart.length) / 2) + 1;
      output += `\x1b[${overY + 4};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    } else {
      // Draw food (pulsing effect with enhanced glow)
      const foodChar = glitchFrame % 10 < 5 ? '◆' : '◇';
      const foodGlow = eatFlashFrames > 0 ? '\x1b[1;97m' : '\x1b[1;33m';
      output += `\x1b[${renderGameTop + food.y};${renderGameLeft + food.x + 1}H${foodGlow}${foodChar}\x1b[0m`;

      // Draw snake with eat flash effect
      const snakeColor = eatFlashFrames > 0 ? '\x1b[1;33m' : themeColor;
      for (let i = 0; i < snake.length; i++) {
        const seg = snake[i];
        const char = i === 0 ? '█' : '▓';
        const brightness = i === 0 ? '\x1b[1m' : (i < 3 ? '' : '\x1b[2m');
        output += `\x1b[${renderGameTop + seg.y};${renderGameLeft + seg.x + 1}H${brightness}${snakeColor}${char}\x1b[0m`;
      }

      // Draw particles
      for (const p of particles) {
        const px = Math.round(renderGameLeft + p.x + 1);
        const py = Math.round(renderGameTop + p.y);
        if (px > renderGameLeft && px < renderGameLeft + gameWidth + 1 &&
            py > renderGameTop && py < renderGameTop + gameHeight + 1) {
          const alpha = p.life > 10 ? '' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popup
      if (scorePopup) {
        const popX = Math.round(renderGameLeft + scorePopup.x + 1);
        const popY = Math.round(renderGameTop + scorePopup.y);
        if (popY > renderGameTop && popY < renderGameTop + gameHeight + 1) {
          const popAlpha = scorePopup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${popY};${popX}H${popAlpha}\x1b[33m${scorePopup.text}\x1b[0m`;
        }
      }

      // Draw combo message
      if (comboCount >= 3) {
        const comboMsg = comboCount >= 5 ? `★ ${comboCount}x COMBO! ★` : `${comboCount}x COMBO!`;
        const comboX = renderGameLeft + Math.floor((gameWidth - comboMsg.length) / 2) + 1;
        const comboColor = glitchFrame % 6 < 3 ? '\x1b[1;33m' : '\x1b[1;35m';
        output += `\x1b[${renderGameTop + 2};${comboX}H${comboColor}${comboMsg}\x1b[0m`;
      }
    }

    const hint = gameStarted && !gameOver && !paused ? '[ ESC ] MENU' : '';
    output += `\x1b[${renderGameTop + gameHeight + 3};${renderGameLeft}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    terminal.write(output);
  }

  // Update game state
  function update() {
    if (!gameStarted || gameOver || paused) return;

    direction = nextDirection;

    const head = { ...snake[0] };
    switch (direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }

    // Check wall collision
    if (head.x <= 0 || head.x >= gameWidth || head.y <= 0 || head.y >= gameHeight) {
      gameOver = true;
      if (score > highScore) highScore = score;
      // Death effects
      shakeFrames = 20;
      shakeIntensity = 3;
      deathFlashFrames = 30;
      // Death particles
      spawnParticles(snake[0].x, snake[0].y, 12, '\x1b[1;31m', ['✗', '☠', '×', '▒']);
      comboCount = 0;
      return;
    }

    // Check self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver = true;
      if (score > highScore) highScore = score;
      // Death effects
      shakeFrames = 20;
      shakeIntensity = 3;
      deathFlashFrames = 30;
      // Death particles
      spawnParticles(snake[0].x, snake[0].y, 12, '\x1b[1;31m', ['✗', '☠', '×', '▒']);
      comboCount = 0;
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      const now = Date.now();

      // Track combo (eating within 2 seconds)
      if (now - lastEatTime < 2000) {
        comboCount++;
      } else {
        comboCount = 1;
      }
      lastEatTime = now;

      // Calculate points with combo bonus
      const basePoints = 10;
      const comboBonus = comboCount >= 3 ? Math.floor(comboCount * 2) : 0;
      const totalPoints = basePoints + comboBonus;
      score += totalPoints;

      // Eat effects - intensity scales with combo
      shakeFrames = 4 + Math.min(comboCount, 5);
      shakeIntensity = 1 + Math.floor(comboCount / 3);
      eatFlashFrames = 8;

      // Score popup
      const popupText = comboCount >= 3 ? `+${totalPoints}!` : `+${totalPoints}`;
      scorePopup = {
        x: food.x,
        y: food.y,
        text: popupText,
        frames: 20,
      };

      // Particles - more for higher combos
      const particleCount = 4 + Math.min(comboCount * 2, 10);
      spawnParticles(food.x, food.y, particleCount, '\x1b[1;33m', ['✦', '★', '◆', '♦']);

      spawnFood();
    } else {
      snake.pop();
    }
  }

  // Start the game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h');
    terminal.write('\x1b[?25l');

    initGame();

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
    }, 120);

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
        case 'ArrowUp':
        case 'w':
          if (direction !== 'down') nextDirection = 'up';
          break;
        case 'ArrowDown':
        case 's':
          if (direction !== 'up') nextDirection = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
          if (direction !== 'right') nextDirection = 'left';
          break;
        case 'ArrowRight':
        case 'd':
          if (direction !== 'left') nextDirection = 'right';
          break;
      }
    });

    // Listen for terminal resize to update game dimensions
    const resizeListener = terminal.onResize(() => {
      updateDimensions();
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      keyListener.dispose();
      resizeListener.dispose();
      originalStop();
    };
  }, 25);

  return controller;
}
