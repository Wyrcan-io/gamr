/**
 * Hyper Hangman
 *
 * Cyberpunk-themed word guessing game with glitchy effects,
 * neon visuals, and theme-aware colors.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, getVerticalAnchor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Hangman Game Controller
 */
export interface HangmanController {
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

// Word list - cyberpunk/tech themed
const WORDS = [
  'TERMINAL', 'HACKER', 'MATRIX', 'CYBER', 'NEURAL', 'QUANTUM',
  'BINARY', 'PROTOCOL', 'NETWORK', 'ENCRYPT', 'DECRYPT', 'SYSTEM',
  'CIRCUIT', 'DAEMON', 'KERNEL', 'BUFFER', 'MEMORY', 'PROCESS',
  'SCRIPT', 'MODULE', 'VECTOR', 'SYNTAX', 'COMPILE', 'RUNTIME',
  'CURSOR', 'PROMPT', 'SHELL', 'STREAM', 'SIGNAL', 'THREAD',
  'SOCKET', 'SERVER', 'CLIENT', 'PACKET', 'ROUTER', 'FIREWALL',
  'PROXY', 'TOKEN', 'CIPHER', 'BREACH', 'SPLICE', 'INJECT',
  'PATCH', 'DEBUG', 'TRACE', 'STACK', 'HEAP', 'CACHE',
  'NEXUS', 'PULSE', 'GHOST', 'SHADOW', 'BLADE', 'CHROME',
  'NEON', 'SYNTH', 'GRID', 'SURGE', 'FLUX', 'STORM',
];

// ASCII art hangman stages
const HANGMAN_STAGES = [
  // 0 mistakes
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │         ',
    '  │         ',
    '  │         ',
    '  │         ',
    '══╧════════ ',
  ],
  // 1 mistake - head
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │      ◯  ',
    '  │         ',
    '  │         ',
    '  │         ',
    '══╧════════ ',
  ],
  // 2 mistakes - body
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │      ◯  ',
    '  │      │  ',
    '  │         ',
    '  │         ',
    '══╧════════ ',
  ],
  // 3 mistakes - left arm
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │      ◯  ',
    '  │     ╱│  ',
    '  │         ',
    '  │         ',
    '══╧════════ ',
  ],
  // 4 mistakes - right arm
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │      ◯  ',
    '  │     ╱│╲ ',
    '  │         ',
    '  │         ',
    '══╧════════ ',
  ],
  // 5 mistakes - left leg
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │      ◯  ',
    '  │     ╱│╲ ',
    '  │     ╱   ',
    '  │         ',
    '══╧════════ ',
  ],
  // 6 mistakes - dead
  [
    '  ┌───────┐ ',
    '  │       │ ',
    '  │      ◯  ',
    '  │     ╱│╲ ',
    '  │     ╱ ╲ ',
    '  │         ',
    '══╧════════ ',
  ],
];

/**
 * Cyberpunk Hangman Game
 */
export function runHangmanGame(terminal: Terminal): HangmanController {
  const themeColor = getCurrentThemeColor();

  // Game dimensions
  const GAME_WIDTH = 40;

  // Minimum terminal size (compact - just needs to fit the content)
  const MIN_COLS = 32;
  const MIN_ROWS = 16;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let won = false;
  let score = 0;
  let streak = 0;
  let highStreak = 0;

  // Game state
  let currentWord = '';
  let guessedLetters: Set<string> = new Set();
  let wrongGuesses = 0;
  const MAX_WRONG = 6;

  // Game area positioning
  let gameLeft = 2;
  let gameTop = 4;

  // Visual effects
  let glitchFrame = 0;
  let flashWrong = 0;
  let flashRight = 0;
  let winAnimation = 0;
  let loseAnimation = 0;
  let screenShake = 0;

  // Juicy effects
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let correctStreak = 0;
  let borderFlash = 0;

  const controller: HangmanController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const title = [
    '█ █ ▄▀█ █▄ █ █▀▀ █▄ ▄█ ▄▀█ █▄ █',
    '█▀█ █▀█ █ ▀█ █▄█ █ ▀ █ █▀█ █ ▀█',
  ];

  function updateLayout(rows: number) {
    // Core content: gallows, word, wrong letters, and status rows.
    gameTop = getVerticalAnchor(rows, 16, {
      headerRows: 3,
      footerRows: 2,
      minTop: 4,
    });
  }

  function initGame() {
    // Pick a random word
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    guessedLetters = new Set();
    wrongGuesses = 0;
    gameOver = false;
    won = false;
    paused = false;
    flashWrong = 0;
    flashRight = 0;
    // Reset juicy effects
    particles = [];
    scorePopups = [];
    correctStreak = 0;
    borderFlash = 0;
    screenShake = 0;
    winAnimation = 0;
    loseAnimation = 0;
  }

  // Spawn particles at position
  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['✦', '★', '◆', '●']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.3 + Math.random() * 0.5;
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5 - 0.2,
        life: 15 + Math.floor(Math.random() * 10),
      });
    }
  }

  // Add score popup
  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 22, color });
  }

  function getDisplayWord(): string {
    return currentWord
      .split('')
      .map(letter => guessedLetters.has(letter) ? letter : '_')
      .join(' ');
  }

  function getUsedLetters(): string {
    const wrong = [...guessedLetters].filter(l => !currentWord.includes(l)).sort().join(' ');
    return wrong || '-';
  }

  function checkWin(): boolean {
    return currentWord.split('').every(letter => guessedLetters.has(letter));
  }

  function guessLetter(letter: string) {
    if (gameOver || paused || guessedLetters.has(letter)) return;

    guessedLetters.add(letter);

    if (currentWord.includes(letter)) {
      // Correct guess
      flashRight = 8;
      borderFlash = 8;
      correctStreak++;
      const letterCount = currentWord.split(letter).length - 1;
      const points = 10 * letterCount;
      score += points;

      // Effects based on streak and letter count
      const effectIntensity = Math.min(correctStreak + letterCount, 8);
      screenShake = 2 + Math.floor(effectIntensity / 2);

      // Spawn particles at word display area (we'll use center screen)
      const centerX = Math.floor(terminal.cols / 2);
      const wordY = gameTop + 9;
      spawnParticles(centerX, wordY, 4 + effectIntensity, '\x1b[1;92m', ['✦', '★', '◆', '●']);

      // Score popup
      const popupText = letterCount > 1 ? `+${points}!` : `+${points}`;
      const popupColor = correctStreak >= 3 ? '\x1b[1;93m' : '\x1b[1;92m';
      addScorePopup(centerX - 2, wordY - 2, popupText, popupColor);

      // Streak message
      if (correctStreak >= 3) {
        addScorePopup(centerX - 4, wordY - 4, `${correctStreak}x STREAK!`, '\x1b[1;96m');
      }

      if (checkWin()) {
        won = true;
        gameOver = true;
        streak++;
        if (streak > highStreak) highStreak = streak;
        const bonus = Math.max(0, (MAX_WRONG - wrongGuesses)) * 20;
        score += bonus;
        winAnimation = 30;
        screenShake = 8;
        // Big win explosion
        spawnParticles(centerX, wordY, 15, '\x1b[1;93m', ['★', '✦', '♦', '◆', '●']);
        if (bonus > 0) {
          addScorePopup(centerX - 3, wordY + 2, `+${bonus} BONUS!`, '\x1b[1;93m');
        }
      }
    } else {
      // Wrong guess
      flashWrong = 8;
      wrongGuesses++;
      correctStreak = 0; // Reset correct streak on wrong

      // Shake and particles
      screenShake = 4 + wrongGuesses;

      // Spawn red particles at hangman
      const hangmanX = gameLeft + 6;
      const hangmanY = gameTop + 4;
      spawnParticles(hangmanX, hangmanY, 5, '\x1b[1;91m', ['✗', '×', '·', '○']);

      if (wrongGuesses >= MAX_WRONG) {
        gameOver = true;
        streak = 0;
        loseAnimation = 40;
        screenShake = 20;
        // Death explosion
        spawnParticles(hangmanX, hangmanY, 12, '\x1b[1;91m', ['✗', '☠', '×', '▒', '░']);
        addScorePopup(hangmanX - 3, hangmanY - 2, 'FAILED!', '\x1b[1;91m');
      }
    }
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Update effect timers
    if (borderFlash > 0) borderFlash--;

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
      popup.y -= 0.15;
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

    updateLayout(rows);

    gameLeft = Math.max(2, Math.floor((cols - GAME_WIDTH) / 2));

    // Glitchy title
    glitchFrame = (glitchFrame + 1) % 60;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

    const titleTop = Math.max(1, gameTop - 2);
    output += `\x1b[${titleTop};${titleX}H`;
    if (glitchFrame >= 55 && glitchFrame < 58) {
      output += `\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[${titleTop + 1};${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `${themeColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[${titleTop + 1};${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseY = Math.floor(rows / 2) - 3;
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
      // Show start screen
      const startMsg = '[ PRESS ANY KEY TO START ]';
      const startX = Math.floor((cols - startMsg.length) / 2);
      const startY = Math.floor(rows / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = 'A-Z GUESS  ESC MENU';
      const ctrlX = Math.floor((cols - controls.length) / 2);
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else {
      // Apply screen shake offset
      const shakeOffsetX = screenShake > 0 ? Math.floor((Math.random() - 0.5) * Math.min(screenShake, 3)) : 0;
      const shakeOffsetY = screenShake > 0 ? Math.floor((Math.random() - 0.5) * Math.min(screenShake / 2, 1)) : 0;
      const renderLeft = gameLeft + shakeOffsetX;
      const renderTop = gameTop + shakeOffsetY;

      // Stats bar
      const statsColor = borderFlash > 0 && borderFlash % 4 < 2 ? '\x1b[1;92m' : themeColor;
      const stats = `SCORE: ${score.toString().padStart(4, '0')}  STREAK: ${streak}  BEST: ${highStreak}`;
      const statsX = Math.floor((cols - stats.length) / 2) + shakeOffsetX;
      output += `\x1b[${gameTop - 1};${statsX}H${statsColor}${stats}\x1b[0m`;

      // Draw hangman with shake
      const hangmanStage = HANGMAN_STAGES[Math.min(wrongGuesses, MAX_WRONG)];
      const hangmanColor = flashWrong > 0 && flashWrong % 4 < 2 ? '\x1b[1;91m' : themeColor;
      for (let i = 0; i < hangmanStage.length; i++) {
        output += `\x1b[${renderTop + 1 + i};${renderLeft}H${hangmanColor}${hangmanStage[i]}\x1b[0m`;
      }

      // Draw word display with shake
      const displayWord = getDisplayWord();
      const wordX = Math.floor((cols - displayWord.length) / 2) + shakeOffsetX;
      const wordY = renderTop + 9;
      const wordColor = flashRight > 0 && flashRight % 4 < 2 ? '\x1b[1;92m' : themeColor;
      output += `\x1b[${wordY};${wordX}H${wordColor}\x1b[1m${displayWord}\x1b[0m`;

      // Draw wrong letters
      const wrongLabel = 'WRONG: ';
      const wrongLetters = getUsedLetters();
      const wrongX = Math.floor((cols - (wrongLabel.length + wrongLetters.length)) / 2) + shakeOffsetX;
      const wrongY = wordY + 2;
      output += `\x1b[${wrongY};${wrongX}H\x1b[2m${themeColor}${wrongLabel}\x1b[91m${wrongLetters}\x1b[0m`;

      // Draw remaining guesses
      const remaining = `GUESSES LEFT: ${MAX_WRONG - wrongGuesses}`;
      const remainingX = Math.floor((cols - remaining.length) / 2) + shakeOffsetX;
      output += `\x1b[${wrongY + 2};${remainingX}H\x1b[2m${themeColor}${remaining}\x1b[0m`;

      // Draw particles
      for (const p of particles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        if (px > 0 && px < cols && py > 0 && py < rows) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const px = Math.round(popup.x);
        const py = Math.round(popup.y);
        if (py > 0 && py < rows) {
          const alpha = popup.frames > 14 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }

      // Draw correct streak message
      if (correctStreak >= 3 && !gameOver) {
        const streakMsg = correctStreak >= 5 ? `★ ${correctStreak}x STREAK! ★` : `${correctStreak}x STREAK!`;
        const streakX = Math.floor((cols - streakMsg.length) / 2);
        const streakColor = glitchFrame % 6 < 3 ? '\x1b[1;93m' : '\x1b[1;96m';
        output += `\x1b[${gameTop};${streakX}H${streakColor}${streakMsg}\x1b[0m`;
      }

      if (gameOver) {
        const overY = gameTop + 15;

        if (won) {
          // Win animation - sparkles and color cycling
          const sparkles = ['✦', '✧', '★', '☆', '·'];
          const colors = ['\x1b[92m', '\x1b[96m', '\x1b[93m', '\x1b[95m'];
          const sparkleColor = colors[Math.floor(glitchFrame / 5) % colors.length];

          // Add sparkles around the message
          if (winAnimation > 0) {
            for (let i = 0; i < 6; i++) {
              const sx = Math.floor(cols / 2) + Math.floor(Math.cos(glitchFrame * 0.3 + i) * 15);
              const sy = overY - 2 + Math.floor(Math.sin(glitchFrame * 0.2 + i) * 2);
              const sparkle = sparkles[Math.floor(Math.random() * sparkles.length)];
              output += `\x1b[${sy};${sx}H${sparkleColor}${sparkle}\x1b[0m`;
            }
          }

          const overMsg = winAnimation > 20 ? '★ DECODED! ★' : '✦ DECODED! ✦';
          const msgColor = winAnimation > 0 && Math.floor(glitchFrame / 3) % 2 === 0 ? '\x1b[1;93m' : '\x1b[1;92m';
          const overX = Math.floor((cols - overMsg.length) / 2);
          output += `\x1b[${overY};${overX}H${msgColor}${overMsg}\x1b[0m`;
        } else {
          // Lose animation - glitch and shake
          const shakeX = screenShake > 0 ? Math.floor(Math.random() * 3) - 1 : 0;

          // Glitchy "TERMINATED" with random corruption
          let overMsg = '══ TERMINATED ══';
          if (loseAnimation > 20) {
            // Corrupt some characters
            const glitchChars = ['█', '▓', '░', '╳', '┼', '╬'];
            overMsg = overMsg.split('').map(c =>
              Math.random() < 0.2 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : c
            ).join('');
          }

          const loseColor = loseAnimation > 0 && Math.floor(glitchFrame / 2) % 2 === 0 ? '\x1b[91m' : '\x1b[1;31m';
          const overX = Math.floor((cols - overMsg.length) / 2) + shakeX;
          output += `\x1b[${overY};${overX}H${loseColor}${overMsg}\x1b[0m`;

          const wordReveal = `WORD: ${currentWord}`;
          const revealX = Math.floor((cols - wordReveal.length) / 2) + shakeX;
          output += `\x1b[${overY + 1};${revealX}H${themeColor}${wordReveal}\x1b[0m`;
        }

        const restart = '[ R ] NEW WORD  [ ESC ] QUIT';
        const restartX = Math.floor((cols - restart.length) / 2);
        output += `\x1b[${overY + 3};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
      }
    }

    // Hint at bottom
    const hint = gameStarted && !gameOver && !paused ? '[ ESC ] MENU' : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${rows - 1};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    // Update flash effects
    if (flashWrong > 0) flashWrong--;
    if (flashRight > 0) flashRight--;
    if (winAnimation > 0) winAnimation--;
    if (loseAnimation > 0) loseAnimation--;
    if (screenShake > 0) screenShake--;

    terminal.write(output);
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

      // Start screen - any key (except ESC handled above) starts the game
      // Skip if paused (ESC menu open on start screen)
      if (!gameStarted && !paused) {
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
              controller.stop();
              dispatchGameQuit(terminal);
              break;
            case 3: // List Games
              clearInterval(renderInterval);
              running = false;
              dispatchGamesMenu(terminal);
              break;
            case 4: // Next Game
              clearInterval(renderInterval);
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
          running = false;
          dispatchGamesMenu(terminal);
        } else if (key === 'n') {
          clearInterval(renderInterval);
          running = false;
          dispatchGameSwitch(terminal);
        }
        return;
      }

      // Handle letter guesses (only A-Z)
      if (/^[a-z]$/.test(key)) {
        guessLetter(key.toUpperCase());
      }
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      clearInterval(renderInterval);
      keyListener.dispose();
      originalStop();
    };
  }, 50);

  return controller;
}
