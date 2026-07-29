/**
 * Hyper Wordle
 *
 * Classic 5-letter word guessing game with cyberpunk aesthetics.
 * Crack the cipher in 6 attempts. Green = correct, Yellow = wrong position, Gray = absent.
 * Features on-screen keyboard, statistics tracking, and particle celebrations.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, renderSimpleMenu, navigateMenu } from '../shared/menu';

/**
 * Wordle Game Controller
 */
export interface WordleController {
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

type LetterState = 'correct' | 'present' | 'absent' | 'unused';

interface Statistics {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // index 0 = won in 1, etc.
}

// ============================================================================
// WORD LIST - ~200 common 5-letter words
// ============================================================================

const WORDS = [
  // Common everyday words
  'ABOUT', 'ABOVE', 'AFTER', 'AGAIN', 'ALIEN', 'ALLOW', 'ALONE', 'ALONG',
  'ANGEL', 'ANGRY', 'APPLE', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ASIDE',
  'AVOID', 'AWAKE', 'AWARD', 'BASIC', 'BEACH', 'BEAST', 'BEGIN', 'BEING',
  'BELOW', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLAZE',
  'BLEED', 'BLEND', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOUND',
  'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BRICK', 'BRIDE', 'BRIEF',
  'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BURST', 'BUYER',
  'CABLE', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM',
  'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHESS', 'CHEST', 'CHIEF', 'CHILD',
  'CHILL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLIMB', 'CLOCK', 'CLOSE',
  'CLOUD', 'COACH', 'COAST', 'CORAL', 'COUNT', 'COURT', 'COVER', 'CRAFT',
  'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CRUEL',
  'CRUSH', 'DANCE', 'DEATH', 'DEBUT', 'DECAY', 'DEPTH', 'DIARY', 'DIRTY',
  'DOUBT', 'DOZEN', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM',
  'DRESS', 'DRINK', 'DRIVE', 'DROWN', 'EARLY', 'EARTH', 'EIGHT', 'ELECT',
  'ELITE', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR',
  'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAINT', 'FAITH', 'FALSE',
  'FANCY', 'FATAL', 'FAULT', 'FEAST', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY',
  'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAME', 'FLASH', 'FLESH', 'FLOAT',
  'FLOOD', 'FLOOR', 'FLOUR', 'FLUID', 'FOCUS', 'FORCE', 'FORGE', 'FORTH',
  'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT',
  'FROST', 'FRUIT', 'GHOST', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GLORY',
  'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH', 'GRASP',
  'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GRIND', 'GROUP', 'GROVE', 'GROWN',
  'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILD', 'HABIT', 'HANDS', 'HAPPY',
  'HARSH', 'HASTE', 'HAUNT', 'HEART', 'HEAVY', 'HENCE', 'HONEY', 'HONOR',
  'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER',
  'INPUT', 'IRONY', 'ISSUE', 'IVORY', 'JOINT', 'JONES', 'JUDGE', 'JUICE',
  'KNIFE', 'KNOCK', 'KNOWN', 'LABEL', 'LABOR', 'LARGE', 'LASER', 'LATER',
  'LAUGH', 'LAYER', 'LEARN', 'LEAST', 'LEAVE', 'LEGAL', 'LEVEL', 'LIGHT',
  'LIMIT', 'LINKS', 'LIVER', 'LOCAL', 'LOGIC', 'LOOSE', 'LOVER', 'LOWER',
  'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MATCH',
  'MAYBE', 'MAYOR', 'MEANS', 'MEDAL', 'MEDIA', 'MERCY', 'MERGE', 'METAL',
  'METER', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH',
  'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NAIVE',
  'NAKED', 'NERVE', 'NEVER', 'NEWLY', 'NIGHT', 'NINTH', 'NOBLE', 'NOISE',
  'NORTH', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'OLIVE',
  'ORDER', 'OTHER', 'OUGHT', 'OUTER', 'OWNED', 'OWNER', 'OXIDE', 'OZONE',
];

// ============================================================================
// MAIN GAME FUNCTION
// ============================================================================

export function runWordleGame(terminal: Terminal): WordleController {
  const themeColor = getCurrentThemeColor();

  // -------------------------------------------------------------------------
  // CONSTANTS
  // -------------------------------------------------------------------------
  const MIN_COLS = 36;
  const MIN_ROWS = 20;
  const MAX_GUESSES = 6;
  const WORD_LENGTH = 5;

  // Keyboard layout
  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let won = false;
  let showStats = false;

  // Game state
  let targetWord = '';
  let guesses: string[] = [];
  let currentGuess = '';
  let letterStates: Map<string, LetterState> = new Map();

  // Statistics
  let stats: Statistics = {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
  };

  // Positioning
  let cols = terminal.cols;
  let rows = terminal.rows;

  // Visual effects
  let glitchFrame = 0;
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let revealRow = -1;
  let revealCol = -1;
  let revealFrame = 0;
  let borderFlash = 0;

  // -------------------------------------------------------------------------
  // CONTROLLER
  // -------------------------------------------------------------------------
  const controller: WordleController = {
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
    '█ █ █▄█ █▀█ █▀▀ █▀█   █ █ █ █▀█ █▀█ █▀▄ █   █▀▀',
    '█▀█  █  █▀▀ ██▄ █▀▄   ▀▄▀▄▀ █▄█ █▀▄ █▄▀ █▄▄ ██▄',
  ];

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  function spawnParticles(x: number, y: number, count: number, color: string, chars: string[] = ['*', '+', 'o', '.']) {
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

  function spawnFirework(x: number, y: number) {
    const colors = ['\x1b[1;92m', '\x1b[1;93m', '\x1b[1;96m', '\x1b[1;95m'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const chars = ['*', '+', 'o', '.', '`', "'"];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 0.4 + Math.random() * 0.3;
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 - 0.1,
        life: 20 + Math.floor(Math.random() * 10),
      });
    }
  }

  function addScorePopup(x: number, y: number, text: string, color: string = '\x1b[1;33m') {
    scorePopups.push({ x, y, text, frames: 25, color });
  }

  function triggerShake(frames: number, intensity: number) {
    shakeFrames = frames;
    shakeIntensity = intensity;
  }

  // -------------------------------------------------------------------------
  // GAME LOGIC
  // -------------------------------------------------------------------------

  function initGame() {
    targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    guesses = [];
    currentGuess = '';
    letterStates = new Map();
    gameOver = false;
    won = false;
    paused = false;
    showStats = false;
    revealRow = -1;
    revealCol = -1;
    revealFrame = 0;

    particles = [];
    scorePopups = [];
    shakeFrames = 0;
    borderFlash = 0;
  }

  function checkGuess(guess: string): LetterState[] {
    const result: LetterState[] = new Array(WORD_LENGTH).fill('absent');
    const targetChars = targetWord.split('');
    const guessChars = guess.split('');
    const used = new Array(WORD_LENGTH).fill(false);

    // First pass: exact matches
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }

    // Second pass: present but wrong position
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (result[i] === 'correct') continue;
      const idx = targetChars.findIndex((c, j) => c === guessChars[i] && !used[j]);
      if (idx !== -1) {
        result[i] = 'present';
        used[idx] = true;
      }
    }

    return result;
  }

  function updateLetterStates(guess: string, result: LetterState[]) {
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i];
      const currentState = letterStates.get(letter);
      const newState = result[i];

      // Only upgrade state, never downgrade
      if (!currentState || currentState === 'unused') {
        letterStates.set(letter, newState);
      } else if (currentState === 'absent' && (newState === 'present' || newState === 'correct')) {
        letterStates.set(letter, newState);
      } else if (currentState === 'present' && newState === 'correct') {
        letterStates.set(letter, newState);
      }
    }
  }

  function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
      triggerShake(4, 2);
      addScorePopup(Math.floor(cols / 2), 8, 'NOT ENOUGH LETTERS', '\x1b[1;91m');
      return;
    }

    const result = checkGuess(currentGuess);
    guesses.push(currentGuess);
    updateLetterStates(currentGuess, result);

    // Start reveal animation
    revealRow = guesses.length - 1;
    revealCol = 0;
    revealFrame = 0;

    const allCorrect = result.every(r => r === 'correct');
    const correctCount = result.filter(r => r === 'correct').length;
    const presentCount = result.filter(r => r === 'present').length;

    const centerX = Math.floor(cols / 2);
    const guessY = 6 + guesses.length * 2;

    if (allCorrect) {
      won = true;
      gameOver = true;
      stats.gamesPlayed++;
      stats.gamesWon++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      stats.guessDistribution[guesses.length - 1]++;

      // Celebration effects
      borderFlash = 20;
      triggerShake(10, 3);

      const messages = ['CIPHER BREACHED!', 'CODE CRACKED!', 'DECRYPTED!', 'BRILLIANT!'];
      addScorePopup(centerX, guessY - 2, messages[Math.floor(Math.random() * messages.length)], '\x1b[1;92m');

      // Fireworks
      setTimeout(() => {
        if (running) {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              if (running && won) {
                spawnFirework(
                  10 + Math.random() * (cols - 20),
                  5 + Math.random() * 10
                );
              }
            }, i * 200);
          }
        }
      }, 500);
    } else if (guesses.length >= MAX_GUESSES) {
      gameOver = true;
      stats.gamesPlayed++;
      stats.currentStreak = 0;

      triggerShake(8, 4);
      borderFlash = 15;
      addScorePopup(centerX, guessY - 2, 'DECRYPTION FAILED', '\x1b[1;91m');
      spawnParticles(centerX, guessY, 10, '\x1b[1;91m', ['X', 'x', '.', '*']);
    } else {
      // Feedback for partial matches
      if (correctCount > 0 || presentCount > 0) {
        const hint = correctCount > 0 ? `${correctCount} EXACT` : `${presentCount} CLOSE`;
        addScorePopup(centerX, guessY - 1, hint, correctCount > 0 ? '\x1b[1;92m' : '\x1b[1;93m');
        spawnParticles(centerX, guessY, 3 + correctCount * 2, correctCount > 0 ? '\x1b[1;92m' : '\x1b[1;93m');
      }
    }

    currentGuess = '';
  }

  function update() {
    if (!gameStarted || paused || showStats) return;

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
      popup.y -= 0.15;
      popup.frames--;
      if (popup.frames <= 0) scorePopups.splice(i, 1);
    }

    // Update reveal animation
    if (revealRow >= 0 && revealCol < WORD_LENGTH) {
      revealFrame++;
      if (revealFrame >= 4) {
        revealCol++;
        revealFrame = 0;
      }
    }
  }

  // -------------------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------------------

  function getLetterColor(state: LetterState): string {
    switch (state) {
      case 'correct': return '\x1b[1;42;97m'; // Green bg, white text
      case 'present': return '\x1b[1;43;30m'; // Yellow bg, black text
      case 'absent': return '\x1b[2;100;97m'; // Dark gray bg
      default: return themeColor;
    }
  }

  function getLetterBorderColor(state: LetterState): string {
    switch (state) {
      case 'correct': return '\x1b[1;32m';
      case 'present': return '\x1b[1;33m';
      case 'absent': return '\x1b[2m';
      default: return themeColor;
    }
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Update dimensions
    cols = terminal.cols;
    rows = terminal.rows;

    // Effect timers
    if (shakeFrames > 0) shakeFrames--;
    if (borderFlash > 0) borderFlash--;

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const needWidth = cols < MIN_COLS;
      const needHeight = rows < MIN_ROWS;
      let hint = needWidth && needHeight ? 'Make pane larger'
        : needWidth ? 'Make pane wider' : 'Make pane taller';
      const msg2 = `Need: ${MIN_COLS}x${MIN_ROWS}  Have: ${cols}x${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY - 1};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 1};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      output += `\x1b[${centerY + 3};${Math.max(1, centerX - Math.floor(hint.length / 2))}H\x1b[1m${themeColor}${hint}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Calculate shake offset
    let shakeX = 0, shakeY = 0;
    if (shakeFrames > 0) {
      shakeX = Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      shakeY = Math.floor((Math.random() - 0.5) * shakeIntensity);
    }

    const centerX = Math.floor(cols / 2);

    // Glitch title
    glitchFrame = (glitchFrame + 1) % 60;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset + shakeX;

    let titleColor = themeColor;
    if (borderFlash > 0 && borderFlash % 4 < 2) {
      titleColor = won ? '\x1b[1;92m' : '\x1b[1;91m';
    }

    if (glitchFrame >= 55 && glitchFrame < 58) {
      output += `\x1b[1;${Math.max(1, titleX)}H\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[2;${Math.max(1, titleX + 1)}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `\x1b[1;${Math.max(1, titleX)}H${titleColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[2;${Math.max(1, titleX)}H${titleColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    // PAUSE MENU
    if (paused) {
      const pauseMsg = '== PAUSED ==';
      const pauseY = 8;
      const pauseMsgX = centerX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX,
        startY: pauseY + 2,
        showShortcuts: false,
      });

      const navHint = 'Use arrows, ENTER to select';
      const navHintX = centerX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    }
    // STATS SCREEN
    else if (showStats) {
      const statsY = 5;
      const boxWidth = 32;
      const boxX = centerX - Math.floor(boxWidth / 2);

      output += `\x1b[${statsY};${boxX}H${themeColor}+${'='.repeat(boxWidth - 2)}+\x1b[0m`;
      output += `\x1b[${statsY + 1};${boxX}H${themeColor}|     CIPHER STATISTICS        |\x1b[0m`;
      output += `\x1b[${statsY + 2};${boxX}H${themeColor}+${'='.repeat(boxWidth - 2)}+\x1b[0m`;

      const winPct = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

      output += `\x1b[${statsY + 4};${boxX + 2}H${themeColor}Games Played:  ${stats.gamesPlayed}\x1b[0m`;
      output += `\x1b[${statsY + 5};${boxX + 2}H${themeColor}Win Rate:      ${winPct}%\x1b[0m`;
      output += `\x1b[${statsY + 6};${boxX + 2}H${themeColor}Current Streak: ${stats.currentStreak}\x1b[0m`;
      output += `\x1b[${statsY + 7};${boxX + 2}H${themeColor}Max Streak:    ${stats.maxStreak}\x1b[0m`;

      output += `\x1b[${statsY + 9};${boxX + 2}H${themeColor}GUESS DISTRIBUTION:\x1b[0m`;

      const maxDist = Math.max(...stats.guessDistribution, 1);
      for (let i = 0; i < 6; i++) {
        const count = stats.guessDistribution[i];
        const barLen = Math.round((count / maxDist) * 15);
        const bar = '#'.repeat(Math.max(barLen, count > 0 ? 1 : 0));
        const barColor = i === guesses.length - 1 && won ? '\x1b[1;92m' : themeColor;
        output += `\x1b[${statsY + 10 + i};${boxX + 2}H${themeColor}${i + 1}: ${barColor}${bar}\x1b[0m ${count}`;
      }

      output += `\x1b[${statsY + 17};${boxX}H${themeColor}+${'='.repeat(boxWidth - 2)}+\x1b[0m`;

      const hint = '[ ENTER ] New Game   [ Q ] Quit';
      output += `\x1b[${statsY + 19};${centerX - Math.floor(hint.length / 2)}H\x1b[2m${themeColor}${hint}\x1b[0m`;
    }
    // START SCREEN
    else if (!gameStarted) {
      const startMsg = '[ PRESS ANY KEY TO CRACK THE CIPHER ]';
      const startY = Math.floor(rows / 2) - 2;
      const startX = centerX - Math.floor(startMsg.length / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const rules = [
        'Guess the 5-letter cipher in 6 tries',
        '',
        '\x1b[42;97m G \x1b[0m = Correct position',
        '\x1b[43;30m Y \x1b[0m = Wrong position',
        '\x1b[100;97m X \x1b[0m = Not in word',
      ];

      for (let i = 0; i < rules.length; i++) {
        const ruleX = centerX - 15;
        output += `\x1b[${startY + 3 + i};${ruleX}H${rules[i]}\x1b[0m`;
      }

      const controls = 'A-Z type  ENTER submit  BACKSPACE delete  ESC menu';
      output += `\x1b[${rows - 2};${centerX - Math.floor(controls.length / 2)}H\x1b[2m${themeColor}${controls}\x1b[0m`;
    }
    // MAIN GAMEPLAY
    else {
      const gridY = 4 + shakeY;
      const gridX = centerX - 8 + shakeX;

      // Draw guess grid
      for (let row = 0; row < MAX_GUESSES; row++) {
        const y = gridY + row * 2;

        for (let col = 0; col < WORD_LENGTH; col++) {
          const x = gridX + col * 4;

          let letter = ' ';
          let state: LetterState = 'unused';
          let isRevealing = false;

          if (row < guesses.length) {
            letter = guesses[row][col];
            const result = checkGuess(guesses[row]);

            // Check if this cell is being revealed
            if (row === revealRow && col <= revealCol) {
              state = result[col];
            } else if (row === revealRow) {
              isRevealing = true;
            } else {
              state = result[col];
            }
          } else if (row === guesses.length && col < currentGuess.length) {
            letter = currentGuess[col];
          }

          // Draw cell
          const cellColor = getLetterBorderColor(state);
          const bgColor = getLetterColor(state);

          if (isRevealing) {
            // Flip animation - show back of card
            output += `\x1b[${y};${x}H${themeColor}[?]\x1b[0m`;
          } else if (letter !== ' ') {
            output += `\x1b[${y};${x}H${cellColor}[\x1b[0m${bgColor} ${letter} \x1b[0m${cellColor}]\x1b[0m`;
          } else {
            output += `\x1b[${y};${x}H${themeColor}[ ]\x1b[0m`;
          }
        }
      }

      // Draw on-screen keyboard
      const kbY = gridY + MAX_GUESSES * 2 + 1;

      for (let rowIdx = 0; rowIdx < KEYBOARD_ROWS.length; rowIdx++) {
        const kbRow = KEYBOARD_ROWS[rowIdx];
        const rowOffset = rowIdx === 1 ? 1 : rowIdx === 2 ? 3 : 0;
        const rowX = centerX - Math.floor(kbRow.length * 2 / 2) + rowOffset + shakeX;

        for (let i = 0; i < kbRow.length; i++) {
          const key = kbRow[i];
          const state = letterStates.get(key) || 'unused';
          const keyColor = getLetterColor(state);

          output += `\x1b[${kbY + rowIdx};${rowX + i * 2}H${keyColor}${key}\x1b[0m`;
        }
      }

      // Game over overlay
      if (gameOver) {
        const overY = kbY + 4;

        if (won) {
          const winMsg = 'CIPHER CRACKED!';
          output += `\x1b[${overY};${centerX - Math.floor(winMsg.length / 2)}H\x1b[1;92m${winMsg}\x1b[0m`;
        } else {
          const loseMsg = 'DECRYPTION FAILED';
          output += `\x1b[${overY};${centerX - Math.floor(loseMsg.length / 2)}H\x1b[1;91m${loseMsg}\x1b[0m`;
          const wordMsg = `The cipher was: ${targetWord}`;
          output += `\x1b[${overY + 1};${centerX - Math.floor(wordMsg.length / 2)}H${themeColor}${wordMsg}\x1b[0m`;
        }

        const restartHint = '[ ENTER ] Stats   [ R ] New Game   [ Q ] Quit';
        output += `\x1b[${overY + 3};${centerX - Math.floor(restartHint.length / 2)}H\x1b[2m${themeColor}${restartHint}\x1b[0m`;
      }

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
        const px = Math.round(popup.x - popup.text.length / 2);
        const py = Math.round(popup.y);
        if (py > 0 && py < rows && px > 0) {
          const alpha = popup.frames > 15 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${py};${Math.max(1, px)}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }

      // Bottom hint
      if (!gameOver) {
        const hint = `Attempt ${guesses.length + 1}/${MAX_GUESSES}  |  [ ESC ] Menu`;
        output += `\x1b[${rows - 1};${centerX - Math.floor(hint.length / 2)}H\x1b[2m${themeColor}${hint}\x1b[0m`;
      }
    }

    // Border flash effect
    if (borderFlash > 0) {
      const flashColor = won ? '\x1b[32m' : '\x1b[31m';
      const flashChar = borderFlash % 4 < 2 ? '#' : '=';
      for (let x = 1; x <= cols; x += 4) {
        output += `\x1b[1;${x}H${flashColor}${flashChar}\x1b[0m`;
        output += `\x1b[${rows};${x}H${flashColor}${flashChar}\x1b[0m`;
      }
    }

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

      const key = domEvent.key;
      const keyLower = key.toLowerCase();

      // ESC toggles pause
      if (key === 'Escape') {
        if (showStats) {
          showStats = false;
        } else {
          paused = !paused;
          if (paused) pauseMenuSelection = 0;
        }
        return;
      }

      // Stats screen
      if (showStats) {
        if (key === 'Enter') {
          initGame();
          gameStarted = true;
          showStats = false;
        }
        return;
      }

      // Start screen - any key starts
      if (!gameStarted && !paused) {
        gameStarted = true;
        return;
      }

      // Game over
      if (gameOver && !showStats) {
        if (keyLower === 'r') {
          initGame();
          gameStarted = true;
        } else if (key === 'Enter') {
          showStats = true;
        }
        return;
      }

      // Pause menu navigation
      if (paused) {
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

        // Legacy shortcuts
        if (keyLower === 'r') { initGame(); gameStarted = true; paused = false; }
        else if (keyLower === 'l') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGamesMenu(terminal); }
        else if (keyLower === 'n') { clearInterval(renderInterval); clearInterval(gameInterval); running = false; dispatchGameSwitch(terminal); }
        return;
      }

      // GAMEPLAY INPUT
      if (key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
      } else if (key === 'Enter') {
        submitGuess();
      } else if (key.length === 1 && /[a-zA-Z]/.test(key) && currentGuess.length < WORD_LENGTH) {
        currentGuess += key.toUpperCase();
        // Small typing feedback
        spawnParticles(
          Math.floor(cols / 2) - 8 + currentGuess.length * 4,
          4 + guesses.length * 2,
          2,
          themeColor,
          ['.', '*']
        );
      }
    });

    // Clean up on stop
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
