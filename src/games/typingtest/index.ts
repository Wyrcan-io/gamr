/**
 * Hyper Typing Test
 *
 * Cyberpunk-themed typing speed test with glitchy effects,
 * neon visuals, and theme-aware colors.
 * Tests WPM (words per minute) and accuracy.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, getVerticalAnchor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Typing Test Game Controller
 */
export interface TypingTestController {
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

// Word lists for different difficulty levels
const WORDS_EASY = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
];

const WORDS_CYBER = [
  'hack', 'code', 'data', 'byte', 'node', 'link', 'sync', 'scan', 'port',
  'wire', 'grid', 'core', 'disk', 'chip', 'loop', 'ping', 'host', 'root',
  'shell', 'queue', 'cache', 'stack', 'proxy', 'query', 'parse', 'debug',
  'input', 'output', 'array', 'index', 'string', 'float', 'class', 'yield',
  'async', 'await', 'spawn', 'forge', 'trace', 'patch', 'flush', 'crash',
  'neural', 'matrix', 'cipher', 'vector', 'binary', 'kernel', 'daemon',
  'buffer', 'socket', 'thread', 'signal', 'stream', 'packet', 'router',
  'firewall', 'protocol', 'encrypt', 'decrypt', 'compile', 'runtime',
];

// Sentence templates for harder mode
const SENTENCES = [
  'The quick brown fox jumps over the lazy dog',
  'Pack my box with five dozen liquor jugs',
  'How vexingly quick daft zebras jump',
  'The five boxing wizards jump quickly',
  'Sphinx of black quartz judge my vow',
  'Two driven jocks help fax my big quiz',
  'The system is online and ready for input',
  'Neural network processing data packets',
  'Executing quantum encryption protocol',
  'Compiling source code into binary',
  'Initializing secure connection tunnel',
  'Decrypting incoming transmission stream',
  'Accessing mainframe through backdoor',
  'Uploading virus payload to target system',
  'Bypassing firewall security measures',
  'Tracing network route to server node',
];

/**
 * Cyberpunk Typing Test
 */
export function runTypingTest(terminal: Terminal): TypingTestController {
  const themeColor = getCurrentThemeColor();

  // Game dimensions
  const GAME_WIDTH = 60;

  // Minimum terminal size (reduced for tolerance)
  const MIN_COLS = 40;
  const MIN_ROWS = 18;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;

  // Game settings
  let mode: 'words' | 'sentences' = 'words';
  let duration = 30; // seconds

  // Test state
  let currentText = '';
  let typedText = '';
  let startTime = 0;
  let timeRemaining = duration;
  let correctChars = 0;
  let totalChars = 0;
  let wordsCompleted = 0;
  let words: string[] = [];

  // Stats
  let wpm = 0;
  let accuracy = 100;
  let highWpm = 0;

  // Game area positioning
  let gameTop = 5;

  // Visual effects
  let glitchFrame = 0;
  let cursorBlink = 0;
  let resultAnimation = 0;
  let isNewBest = false;

  // Juicy effects
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let correctStreak = 0;
  let screenShake = 0;
  let borderFlash = 0;
  let errorFlash = 0;

  const controller: TypingTestController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   ▀█▀ █▄█ █▀█ █ █▄ █ █▀▀',
    '█▀█  █  █▀▀ ██▄ █▀▄    █   █  █▀▀ █ █ ▀█ █▄█',
  ];

  function updateLayout(rows: number) {
    // Gameplay body spans stats/progress/text/hints area.
    gameTop = getVerticalAnchor(rows, 10, {
      headerRows: 3,
      footerRows: 2,
      minTop: 5,
    });
  }

  function generateText() {
    if (mode === 'sentences') {
      // Pick random sentences
      const shuffled = [...SENTENCES].sort(() => Math.random() - 0.5);
      currentText = shuffled.slice(0, 3).join(' ');
    } else {
      // Generate word list
      const allWords = [...WORDS_EASY, ...WORDS_CYBER];
      words = [];
      for (let i = 0; i < 50; i++) {
        words.push(allWords[Math.floor(Math.random() * allWords.length)]);
      }
      currentText = words.join(' ');
    }
  }

  function initGame() {
    generateText();
    typedText = '';
    startTime = 0;
    timeRemaining = duration;
    correctChars = 0;
    totalChars = 0;
    wordsCompleted = 0;
    wpm = 0;
    accuracy = 100;
    gameOver = false;
    paused = false;
    resultAnimation = 0;
    isNewBest = false;
    // Reset juicy effects
    particles = [];
    scorePopups = [];
    correctStreak = 0;
    screenShake = 0;
    borderFlash = 0;
    errorFlash = 0;
  }

  // Spawn particles at position
  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['✦', '★', '◆', '●']) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 0.2 + Math.random() * 0.3;
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5 - 0.15,
        life: 10 + Math.floor(Math.random() * 6),
      });
    }
  }

  // Add score popup
  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 18, color });
  }

  function calculateStats() {
    if (startTime === 0) return;

    const elapsed = (Date.now() - startTime) / 1000;
    timeRemaining = Math.max(0, duration - elapsed);

    // Calculate WPM: (characters / 5) / minutes
    // A "word" in typing tests is standardized as 5 characters
    const minutes = elapsed / 60;
    if (minutes > 0) {
      wpm = Math.round((correctChars / 5) / minutes);
    }

    // Calculate accuracy
    if (totalChars > 0) {
      accuracy = Math.round((correctChars / totalChars) * 100);
    }

    if (timeRemaining <= 0) {
      gameOver = true;
      isNewBest = wpm > highWpm;
      if (isNewBest) highWpm = wpm;
      resultAnimation = 40; // Start result animation
    }
  }

  function handleChar(char: string) {
    if (gameOver || paused) return;

    // Start timer on first keypress
    if (startTime === 0) {
      startTime = Date.now();
    }

    const expectedChar = currentText[typedText.length];
    totalChars++;

    // Calculate cursor position for effects
    const cols = terminal.cols;
    const displayWidth = Math.min(60, cols - 4);
    const textStartX = Math.floor((cols - displayWidth) / 2);
    const cursorX = textStartX + Math.min(typedText.length, displayWidth / 2);
    const textY = gameTop + 4;

    if (char === expectedChar) {
      correctChars++;
      typedText += char;
      correctStreak++;

      // Effects based on streak
      if (correctStreak >= 5 && correctStreak % 5 === 0) {
        // Milestone streak effects
        borderFlash = 6;
        spawnParticles(cursorX, textY, 4 + Math.floor(correctStreak / 5), '\x1b[1;92m', ['✦', '★', '◆']);
        addScorePopup(cursorX, textY - 1, `${correctStreak}!`, '\x1b[1;96m');
      } else if (correctStreak >= 10) {
        // High streak - continuous small particles
        if (Math.random() < 0.3) {
          spawnParticles(cursorX, textY, 2, '\x1b[1;92m', ['·', '•', '○']);
        }
      }

      // Count completed words
      if (char === ' ' || typedText.length === currentText.length) {
        wordsCompleted++;
        // Word complete effect
        spawnParticles(cursorX - 2, textY, 3, '\x1b[1;96m', ['✦', '·', '○']);
      }

      // Check if we need more text
      if (typedText.length >= currentText.length - 20) {
        // Extend the text
        if (mode === 'words') {
          const allWords = [...WORDS_EASY, ...WORDS_CYBER];
          for (let i = 0; i < 20; i++) {
            words.push(allWords[Math.floor(Math.random() * allWords.length)]);
          }
          currentText = words.join(' ');
        }
      }
    } else {
      // Wrong character - still add it but it won't count as correct
      typedText += char;
      correctStreak = 0; // Reset streak on error
      errorFlash = 6;
      screenShake = 3;
      // Error particles
      spawnParticles(cursorX, textY, 3, '\x1b[1;91m', ['✗', '×', '·']);
    }
  }

  function handleBackspace() {
    if (typedText.length > 0 && !gameOver && !paused && startTime > 0) {
      // Check if the character we're deleting was correct
      const removedChar = typedText[typedText.length - 1];
      const expectedChar = currentText[typedText.length - 1];
      if (removedChar === expectedChar) {
        correctChars--;
      }
      totalChars--;
      typedText = typedText.slice(0, -1);
    }
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Update effect timers
    if (screenShake > 0) screenShake--;
    if (borderFlash > 0) borderFlash--;
    if (errorFlash > 0) errorFlash--;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.025;
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

    // Glitchy title
    glitchFrame = (glitchFrame + 1) % 60;
    cursorBlink = (cursorBlink + 1) % 20;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

    const titleTop = Math.max(1, gameTop - 3);
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
      const startY = Math.floor(rows / 2) - 2;
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const modeMsg = `MODE: ${mode.toUpperCase()}  DURATION: ${duration}s`;
      const modeX = Math.floor((cols - modeMsg.length) / 2);
      output += `\x1b[${startY + 2};${modeX}H${themeColor}${modeMsg}\x1b[0m`;

      const controls1 = 'M: MODE  1/2/3: TIME (30/60/120s)';
      const ctrlX1 = Math.floor((cols - controls1.length) / 2);
      output += `\x1b[${startY + 4};${ctrlX1}H\x1b[2m${themeColor}${controls1}\x1b[0m`;

      const controls2 = 'ESC: MENU';
      const ctrlX2 = Math.floor((cols - controls2.length) / 2);
      output += `\x1b[${startY + 5};${ctrlX2}H\x1b[2m${themeColor}${controls2}\x1b[0m`;

      // High score
      if (highWpm > 0) {
        const highMsg = `BEST: ${highWpm} WPM`;
        const highX = Math.floor((cols - highMsg.length) / 2);
        output += `\x1b[${startY + 7};${highX}H\x1b[93m${highMsg}\x1b[0m`;
      }
    } else if (gameOver) {
      // Show results with animation
      const overY = gameTop + 2;

      // Animated header based on performance
      const sparkles = ['✦', '✧', '★', '☆', '·'];
      const colors = ['\x1b[92m', '\x1b[96m', '\x1b[93m', '\x1b[95m'];
      const sparkleColor = colors[Math.floor(glitchFrame / 5) % colors.length];

      // Add sparkles for good performance
      if (wpm >= 40 && resultAnimation > 0) {
        for (let i = 0; i < 4; i++) {
          const sx = Math.floor(cols / 2) + Math.floor(Math.cos(glitchFrame * 0.3 + i) * 12);
          const sy = overY + Math.floor(Math.sin(glitchFrame * 0.2 + i) * 2);
          const sparkle = sparkles[Math.floor(Math.random() * sparkles.length)];
          output += `\x1b[${sy};${sx}H${sparkleColor}${sparkle}\x1b[0m`;
        }
      }

      const overMsg = resultAnimation > 20 ? '═══ TIME UP! ═══' : '══ TIME UP! ══';
      const overMsgColor = resultAnimation > 0 && Math.floor(glitchFrame / 3) % 2 === 0 ? '\x1b[1;96m' : `\x1b[1m${themeColor}`;
      const overX = Math.floor((cols - overMsg.length) / 2);
      output += `\x1b[${overY};${overX}H${overMsgColor}${overMsg}\x1b[0m`;

      // Results box with glow effect
      const boxColor = resultAnimation > 0 && Math.floor(glitchFrame / 4) % 2 === 0 ? '\x1b[96m' : themeColor;
      const results = [
        `┌────────────────────────┐`,
        `│   TYPING RESULTS      │`,
        `├────────────────────────┤`,
        `│  WPM:      ${wpm.toString().padStart(5)}      │`,
        `│  ACCURACY: ${accuracy.toString().padStart(4)}%      │`,
        `│  WORDS:    ${wordsCompleted.toString().padStart(5)}      │`,
        `│  CHARS:    ${correctChars.toString().padStart(5)}      │`,
        `└────────────────────────┘`,
      ];

      const resultY = overY + 2;
      for (let i = 0; i < results.length; i++) {
        const lineX = Math.floor((cols - results[i].length) / 2);
        output += `\x1b[${resultY + i};${lineX}H${boxColor}${results[i]}\x1b[0m`;
      }

      // Rating with animation
      let rating = '';
      let ratingColor = '';
      if (wpm >= 80) { rating = '★ ELITE HACKER ★'; ratingColor = '\x1b[1;95m'; }
      else if (wpm >= 60) { rating = '◆ SKILLED CODER ◆'; ratingColor = '\x1b[1;96m'; }
      else if (wpm >= 40) { rating = '▸ KEYBOARD NINJA ◂'; ratingColor = '\x1b[1;92m'; }
      else if (wpm >= 25) { rating = '· TRAINEE ·'; ratingColor = '\x1b[1;93m'; }
      else { rating = 'NEEDS PRACTICE'; ratingColor = '\x1b[1;91m'; }

      // Pulse rating color
      if (resultAnimation > 0 && wpm >= 40) {
        const pulse = Math.floor(glitchFrame / 2) % 2 === 0;
        ratingColor = pulse ? ratingColor : '\x1b[1;97m';
      }

      const ratingX = Math.floor((cols - rating.length) / 2);
      output += `\x1b[${resultY + results.length + 1};${ratingX}H${ratingColor}${rating}\x1b[0m`;

      // Best score celebration
      if (isNewBest && wpm > 0) {
        const celebChars = ['★', '✦', '✧', '◆'];
        const newBest = resultAnimation > 0
          ? `${celebChars[Math.floor(glitchFrame / 4) % celebChars.length]} NEW PERSONAL BEST! ${celebChars[(Math.floor(glitchFrame / 4) + 2) % celebChars.length]}`
          : '★ NEW PERSONAL BEST! ★';
        const newBestColor = resultAnimation > 0 && Math.floor(glitchFrame / 2) % 2 === 0 ? '\x1b[1;93m' : '\x1b[1;97m';
        const newBestX = Math.floor((cols - newBest.length) / 2);
        output += `\x1b[${resultY + results.length + 3};${newBestX}H${newBestColor}${newBest}\x1b[0m`;
      }

      const restart = '[ R ] RETRY  [ ESC ] QUIT';
      const restartX = Math.floor((cols - restart.length) / 2);
      output += `\x1b[${resultY + results.length + 5};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    } else {
      // Apply screen shake offset
      const shakeOffsetX = screenShake > 0 ? Math.floor((Math.random() - 0.5) * 2) : 0;
      const shakeOffsetY = screenShake > 0 ? Math.floor(Math.random() * 2) : 0;

      // Stats bar with effects
      const timeColor = timeRemaining <= 5 ? '\x1b[91m' : (borderFlash > 0 && borderFlash % 4 < 2 ? '\x1b[1;92m' : themeColor);
      const errorColor = errorFlash > 0 && errorFlash % 4 < 2 ? '\x1b[1;91m' : '';
      const stats = `TIME: ${Math.ceil(timeRemaining).toString().padStart(3)}s  WPM: ${wpm.toString().padStart(3)}  ACC: ${accuracy}%`;
      const statsX = Math.floor((cols - stats.length) / 2) + shakeOffsetX;
      output += `\x1b[${gameTop + shakeOffsetY};${statsX}H${errorColor || timeColor}${stats}\x1b[0m`;

      // Progress bar
      const progress = Math.max(0, (duration - timeRemaining) / duration);
      const barWidth = GAME_WIDTH - 4;
      const filled = Math.floor(barWidth * progress);
      const empty = barWidth - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
      const barX = Math.floor((cols - barWidth) / 2) + shakeOffsetX;
      output += `\x1b[${gameTop + 1 + shakeOffsetY};${barX}H${timeColor}${progressBar}\x1b[0m`;

      // Show streak if active
      if (correctStreak >= 10) {
        const streakMsg = correctStreak >= 25 ? `★ ${correctStreak} STREAK! ★` : `${correctStreak} STREAK!`;
        const streakColor = glitchFrame % 6 < 3 ? '\x1b[1;93m' : '\x1b[1;96m';
        const streakX = Math.floor((cols - streakMsg.length) / 2);
        output += `\x1b[${gameTop + 2 + shakeOffsetY};${streakX}H${streakColor}${streakMsg}\x1b[0m`;
      }

      // Text display area
      const textY = gameTop + 4 + shakeOffsetY;
      const displayWidth = Math.min(GAME_WIDTH, cols - 4);
      const textStartX = Math.floor((cols - displayWidth) / 2) + shakeOffsetX;

      // Calculate visible text window
      const typedLen = typedText.length;
      const startIndex = Math.max(0, typedLen - Math.floor(displayWidth / 2));
      const visibleText = currentText.slice(startIndex, startIndex + displayWidth);
      const visibleTyped = typedText.slice(startIndex);

      // Draw text character by character
      output += `\x1b[${textY};${textStartX}H`;
      for (let i = 0; i < visibleText.length; i++) {
        const char = visibleText[i];
        const typedChar = visibleTyped[i];

        if (typedChar === undefined) {
          // Not typed yet - show dimmed
          if (i === visibleTyped.length && cursorBlink < 10) {
            // Cursor position - flash on error
            const cursorColor = errorFlash > 0 ? '\x1b[1;91m' : themeColor;
            output += `\x1b[7m${cursorColor}${char}\x1b[0m`;
          } else {
            output += `\x1b[2m${themeColor}${char}\x1b[0m`;
          }
        } else if (typedChar === char) {
          // Correct - show green (brighter during streak)
          const greenColor = correctStreak >= 10 ? '\x1b[1;92m' : '\x1b[92m';
          output += `${greenColor}${char}\x1b[0m`;
        } else {
          // Wrong - show red with the typed char (flash on error)
          const redColor = errorFlash > 0 && errorFlash % 4 < 2 ? '\x1b[1;97;41m' : '\x1b[91m';
          output += `${redColor}${typedChar}\x1b[0m`;
        }
      }

      // Draw particles
      for (const p of particles) {
        const px = Math.round(p.x);
        const py = Math.round(p.y);
        if (px > 0 && px < cols && py > 0 && py < rows) {
          const alpha = p.life > 4 ? '' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw score popups
      for (const popup of scorePopups) {
        const px = Math.round(popup.x);
        const py = Math.round(popup.y);
        if (py > 0 && py < rows) {
          const alpha = popup.frames > 10 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${py};${px}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }

      // Instructions
      const hint = startTime === 0 ? 'START TYPING TO BEGIN!' : '';
      if (hint) {
        const hintX = Math.floor((cols - hint.length) / 2);
        output += `\x1b[${textY + 3};${hintX}H\x1b[5m${themeColor}${hint}\x1b[0m`;
      }
    }

    // Hint at bottom
    const hint = gameStarted && !gameOver && !paused ? '[ ESC ] MENU' : '';
    const hintX = Math.floor((cols - hint.length) / 2);
    output += `\x1b[${rows - 1};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

    // Update animation counters
    if (resultAnimation > 0) resultAnimation--;

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
      if (gameStarted && !gameOver && !paused) {
        calculateStats();
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

      const key = domEvent.key;
      const keyLower = key.toLowerCase();

      // Handle ESC key - toggle pause (works on start screen too)
      if (key === 'Escape') {
        paused = !paused;
        if (paused) pauseMenuSelection = 0;
        return;
      }

      // Start screen - pre-game controls (ESC handled above)
      // Skip if paused (ESC menu open on start screen)
      if (!gameStarted && !paused) {
        // Mode toggle
        if (keyLower === 'm') {
          mode = mode === 'words' ? 'sentences' : 'words';
          initGame();
          return;
        }
        if (key === '1') { duration = 30; initGame(); return; }
        if (key === '2') { duration = 60; initGame(); return; }
        if (key === '3') { duration = 120; initGame(); return; }

        // Any other key starts the game
        if (key.length === 1 || key === 'Enter' || key === ' ') {
          gameStarted = true;
          initGame();
          // If it's a typeable character, process it
          if (key.length === 1 && /[a-zA-Z0-9 .,!?;:'"-]/.test(key)) {
            handleChar(key);
          }
        }
        return;
      }

      // Game over - R to restart
      if (gameOver) {
        if (keyLower === 'r') {
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
          keyLower,
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
        if (keyLower === 'r') {
          initGame();
          gameStarted = true;
          paused = false;
        } else if (keyLower === 'l') {
          clearInterval(renderInterval);
          running = false;
          dispatchGamesMenu(terminal);
        } else if (keyLower === 'n') {
          clearInterval(renderInterval);
          running = false;
          dispatchGameSwitch(terminal);
        }
        return;
      }

      // Handle typing
      if (key === 'Backspace') {
        handleBackspace();
      } else if (key.length === 1) {
        // Regular character
        handleChar(key);
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
