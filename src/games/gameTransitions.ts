/**
 * Game Transitions - Centralized hacker-style transition effects
 *
 * Provides cinematic transitions for game entry, exit, and switching.
 * Games don't need to know about these - they just dispatch events.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from './utils';

// Transition timing constants
const BOOT_DURATION = 800;  // ms for boot sequence
const EXIT_DURATION = 400;  // ms for exit sequence
const SWITCH_DURATION = 600; // ms for game switch

// Boot messages - randomized hacker-style text
const BOOT_MESSAGES = [
  'INITIALIZING NEURAL INTERFACE...',
  'LOADING HYPER PROTOCOLS...',
  'BYPASSING SECURITY LAYER...',
  'ESTABLISHING UPLINK...',
  'DECRYPTING GAME MODULE...',
  'INJECTING PAYLOAD...',
  'COMPILING RUNTIME...',
  'SYNCHRONIZING CORES...',
];

const EXIT_MESSAGES = [
  'CONNECTION TERMINATED',
  'SIGNAL LOST',
  'LINK SEVERED',
  'SESSION CLOSED',
  'UPLINK DISCONNECTED',
];

const SWITCH_MESSAGES = [
  'REROUTING SIGNAL...',
  'SWITCHING CHANNELS...',
  'REALLOCATING RESOURCES...',
  'LOADING NEW PROTOCOL...',
];

// ASCII art for transitions
const LOADING_FRAMES = [
  '[    ]',
  '[=   ]',
  '[==  ]',
  '[=== ]',
  '[====]',
  '[ ===]',
  '[  ==]',
  '[   =]',
];

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`░▒▓█▀▄';

/**
 * Generate a random glitch string
 */
function glitchText(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
  }
  return result;
}

/**
 * Get random message from array
 */
function randomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Boot transition - plays before game starts
 */
export async function playBootTransition(terminal: Terminal): Promise<void> {
  const themeColor = getCurrentThemeColor();
  const cols = terminal.cols;

  // Enter alternate buffer for clean transition
  terminal.write('\x1b[?1049h');
  terminal.write('\x1b[?25l'); // Hide cursor
  terminal.write('\x1b[2J\x1b[H'); // Clear screen

  const centerX = Math.floor(cols / 2);

  // Quick glitch burst
  for (let i = 0; i < 3; i++) {
    const glitchLine = glitchText(cols);
    const glitchY = Math.floor(Math.random() * 10) + 5;
    terminal.write(`\x1b[${glitchY};1H\x1b[91m${glitchLine}\x1b[0m`);
    await sleep(30);
    terminal.write(`\x1b[${glitchY};1H${' '.repeat(cols)}`);
  }

  // Boot message
  const bootMsg = randomMessage(BOOT_MESSAGES);
  const msgX = Math.max(1, centerX - Math.floor(bootMsg.length / 2));
  terminal.write(`\x1b[8;${msgX}H${themeColor}${bootMsg}\x1b[0m`);

  // Loading bar animation
  const barY = 10;
  const loadingLabel = 'LOADING: ';
  const barX = Math.max(1, centerX - Math.floor((loadingLabel.length + 8) / 2));

  for (let i = 0; i < LOADING_FRAMES.length; i++) {
    const frame = LOADING_FRAMES[i];
    terminal.write(`\x1b[${barY};${barX}H\x1b[2m${themeColor}${loadingLabel}${frame}\x1b[0m`);
    await sleep(BOOT_DURATION / LOADING_FRAMES.length);
  }

  // Final flash
  terminal.write(`\x1b[${barY};${barX}H${themeColor}\x1b[1m${loadingLabel}[DONE]\x1b[0m`);
  await sleep(100);

  // Clear for game
  terminal.write('\x1b[2J\x1b[H');

  // Exit alternate buffer - game will re-enter
  terminal.write('\x1b[?1049l');
  terminal.write('\x1b[?25h');
}

/**
 * Exit transition - plays when game quits back to shell
 */
export async function playExitTransition(terminal: Terminal): Promise<void> {
  const themeColor = getCurrentThemeColor();
  const cols = terminal.cols;
  const rows = terminal.rows;

  // We're already in alternate buffer from the game
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);

  // Glitch effect - corrupt the screen
  for (let i = 0; i < 5; i++) {
    const glitchY = Math.floor(Math.random() * rows) + 1;
    const glitchLine = GLITCH_CHARS.repeat(Math.floor(cols / GLITCH_CHARS.length) + 1).slice(0, cols);
    terminal.write(`\x1b[${glitchY};1H\x1b[91m${glitchLine}\x1b[0m`);
    await sleep(30);
  }

  // Exit message
  const exitMsg = randomMessage(EXIT_MESSAGES);
  const msgX = Math.max(1, centerX - Math.floor(exitMsg.length / 2));

  // Flash the message
  for (let i = 0; i < 3; i++) {
    terminal.write(`\x1b[${centerY};${msgX}H\x1b[1;91m${exitMsg}\x1b[0m`);
    await sleep(60);
    terminal.write(`\x1b[${centerY};${msgX}H${' '.repeat(exitMsg.length)}`);
    await sleep(40);
  }
  terminal.write(`\x1b[${centerY};${msgX}H\x1b[2m${themeColor}${exitMsg}\x1b[0m`);
  await sleep(150);

  // Screen wipe down effect
  for (let y = 1; y <= rows; y += 2) {
    terminal.write(`\x1b[${y};1H${' '.repeat(cols)}`);
    if (y + 1 <= rows) {
      terminal.write(`\x1b[${y + 1};1H${' '.repeat(cols)}`);
    }
    await sleep(EXIT_DURATION / (rows / 2));
  }
}

/**
 * Switch transition - plays when switching to a new game
 */
export async function playSwitchTransition(terminal: Terminal): Promise<void> {
  const themeColor = getCurrentThemeColor();
  const cols = terminal.cols;
  const rows = terminal.rows;

  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);

  // Quick screen corruption
  for (let i = 0; i < 4; i++) {
    const y1 = Math.floor(Math.random() * rows) + 1;
    const y2 = Math.floor(Math.random() * rows) + 1;
    terminal.write(`\x1b[${y1};1H\x1b[96m${glitchText(cols)}\x1b[0m`);
    terminal.write(`\x1b[${y2};1H\x1b[95m${glitchText(cols)}\x1b[0m`);
    await sleep(40);
  }

  // Clear center for message
  for (let y = centerY - 1; y <= centerY + 1; y++) {
    terminal.write(`\x1b[${y};1H${' '.repeat(cols)}`);
  }

  // Switch message with spinner
  const switchMsg = randomMessage(SWITCH_MESSAGES);
  const msgX = Math.max(1, centerX - Math.floor(switchMsg.length / 2));
  const spinnerChars = ['|', '/', '-', '\\'];

  for (let i = 0; i < 8; i++) {
    const spinner = spinnerChars[i % spinnerChars.length];
    terminal.write(`\x1b[${centerY};${msgX - 2}H${themeColor}${spinner}\x1b[0m`);
    terminal.write(`\x1b[${centerY};${msgX}H\x1b[1m${themeColor}${switchMsg}\x1b[0m`);
    await sleep(SWITCH_DURATION / 8);
  }

  // Quick fade out
  terminal.write('\x1b[2J\x1b[H');
  await sleep(50);
}

/**
 * Quick boot - shorter version for game switching (game-to-game)
 */
export async function playQuickBoot(terminal: Terminal): Promise<void> {
  const themeColor = getCurrentThemeColor();
  const cols = terminal.cols;

  terminal.write('\x1b[?1049h');
  terminal.write('\x1b[?25l');
  terminal.write('\x1b[2J\x1b[H');

  const centerX = Math.floor(cols / 2);

  // Just a quick loading indicator
  const msg = 'LOADING...';
  const msgX = Math.max(1, centerX - Math.floor(msg.length / 2));

  terminal.write(`\x1b[8;${msgX}H${themeColor}${msg}\x1b[0m`);

  // Quick bar
  for (let i = 0; i < 5; i++) {
    const bar = '='.repeat(i + 1).padEnd(5, ' ');
    terminal.write(`\x1b[10;${msgX}H${themeColor}[${bar}]\x1b[0m`);
    await sleep(60);
  }

  await sleep(50);
  terminal.write('\x1b[2J\x1b[H');
  terminal.write('\x1b[?1049l');
  terminal.write('\x1b[?25h');
}

/**
 * Select transition - plays when selecting a game from the menu
 * Shows the game name with a cool reveal effect
 */
export async function playSelectTransition(terminal: Terminal, gameName: string): Promise<void> {
  const themeColor = getCurrentThemeColor();
  const cols = terminal.cols;
  const rows = terminal.rows;
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);

  // Clear screen with a quick flash
  terminal.write('\x1b[2J\x1b[H');
  terminal.write(`\x1b[48;5;255m${' '.repeat(cols * rows)}\x1b[0m`);
  await sleep(30);
  terminal.write('\x1b[2J\x1b[H');
  await sleep(50);

  // Draw scan lines converging to center
  for (let i = 0; i < 6; i++) {
    const offset = 6 - i;
    // Top and bottom lines moving to center
    if (centerY - offset > 0) {
      terminal.write(`\x1b[${centerY - offset};1H${themeColor}${'─'.repeat(cols)}\x1b[0m`);
    }
    if (centerY + offset <= rows) {
      terminal.write(`\x1b[${centerY + offset};1H${themeColor}${'─'.repeat(cols)}\x1b[0m`);
    }
    await sleep(30);
    // Clear previous lines
    if (i > 0) {
      const prevOffset = 7 - i;
      if (centerY - prevOffset > 0) {
        terminal.write(`\x1b[${centerY - prevOffset};1H${' '.repeat(cols)}`);
      }
      if (centerY + prevOffset <= rows) {
        terminal.write(`\x1b[${centerY + prevOffset};1H${' '.repeat(cols)}`);
      }
    }
  }

  // Clear for game name reveal
  terminal.write('\x1b[2J\x1b[H');

  // Glitch reveal of game name
  const displayName = `▶ ${gameName} ◀`;
  const nameX = Math.max(1, centerX - Math.floor(displayName.length / 2));

  // Glitch through random characters then reveal
  for (let frame = 0; frame < 8; frame++) {
    let revealed = '';
    for (let i = 0; i < displayName.length; i++) {
      if (frame >= 6 || Math.random() < frame / 8) {
        revealed += displayName[i];
      } else {
        revealed += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
    }
    terminal.write(`\x1b[${centerY};${nameX}H\x1b[1m${themeColor}${revealed}\x1b[0m`);
    await sleep(50);
  }

  // Final clean display with glow effect (bright)
  terminal.write(`\x1b[${centerY};${nameX}H\x1b[1;7m${themeColor}${displayName}\x1b[0m`);
  await sleep(150);

  // Subtitle
  const loadingMsg = 'INITIALIZING...';
  const loadingX = Math.max(1, centerX - Math.floor(loadingMsg.length / 2));
  terminal.write(`\x1b[${centerY + 2};${loadingX}H\x1b[2m${themeColor}${loadingMsg}\x1b[0m`);

  // Quick loading bar
  const barWidth = 20;
  const barX = Math.max(1, centerX - Math.floor(barWidth / 2) - 1);
  for (let i = 0; i <= barWidth; i++) {
    const filled = '█'.repeat(i);
    const empty = '░'.repeat(barWidth - i);
    terminal.write(`\x1b[${centerY + 4};${barX}H${themeColor}[${filled}${empty}]\x1b[0m`);
    await sleep(20);
  }

  await sleep(100);

  // Wipe out effect
  for (let i = 0; i < 3; i++) {
    terminal.write('\x1b[2J\x1b[H');
    await sleep(30);
    terminal.write(`\x1b[${centerY};${nameX}H\x1b[1m${themeColor}${displayName}\x1b[0m`);
    await sleep(30);
  }

  terminal.write('\x1b[2J\x1b[H');
  await sleep(50);
}

// Export event types for games to dispatch
export const GAME_EVENTS = {
  // Game wants to quit back to shell
  QUIT: 'hypersurge:game-quit',
  // Game wants to switch to another random game
  SWITCH: 'hypersurge:random-game',
  // Game wants to show the games menu
  GAMES_MENU: 'hypersurge:games-menu',
  // Launch a specific game by id
  LAUNCH_GAME: 'hypersurge:launch-game',
} as const;

/**
 * Helper for games to dispatch quit event
 * This triggers the exit transition before returning to shell
 */
export function dispatchGameQuit(terminal: Terminal): void {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.QUIT, {
    detail: { terminal }
  }));
}

/**
 * Helper for games to dispatch switch event
 * This triggers the switch transition before loading new game
 */
export function dispatchGameSwitch(terminal: Terminal): void {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.SWITCH, {
    detail: { terminal }
  }));
}

/**
 * Helper for games to dispatch games menu event
 * This triggers the games menu to let user select a game
 */
export function dispatchGamesMenu(terminal: Terminal): void {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.GAMES_MENU, {
    detail: { terminal }
  }));
}

/**
 * Helper to dispatch launch game event
 * This triggers TerminalPool to launch a specific game with proper tracking
 */
export function dispatchLaunchGame(terminal: Terminal, gameId: string): void {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.LAUNCH_GAME, {
    detail: { terminal, gameId }
  }));
}
