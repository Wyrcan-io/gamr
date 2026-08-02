/**
 * CLI entry point for @abhirup/gamr
 *
 * Provides a Node.js terminal adapter that maps stdin/stdout
 * to an xterm.js-compatible Terminal interface, allowing all
 * games to run directly in any terminal emulator.
 */

// ---------------------------------------------------------------------------
// Window polyfill — MUST run before any game code is imported.
// Games use window.addEventListener('keydown'/'keyup'), window.dispatchEvent,
// and new CustomEvent.
// ---------------------------------------------------------------------------

type EventHandler = (event: Event) => void;
const eventListeners = new Map<string, Set<EventHandler>>();

const windowPolyfill = {
  addEventListener(type: string, handler: EventHandler) {
    if (!eventListeners.has(type)) eventListeners.set(type, new Set());
    eventListeners.get(type)!.add(handler);
  },
  removeEventListener(type: string, handler: EventHandler) {
    eventListeners.get(type)?.delete(handler);
  },
  dispatchEvent(event: Event): boolean {
    const handlers = eventListeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    return true;
  },
};

if (typeof globalThis.window === 'undefined') {
  (globalThis as Record<string, unknown>).window = windowPolyfill;
}

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
// Now safe to import game code
import { games, allGames, setTheme, showGamesMenu, type GameInfo, GAME_EVENTS } from './games';
import type { PhosphorMode } from './themes';

// ---------------------------------------------------------------------------
// Node Terminal Adapter
// ---------------------------------------------------------------------------

interface KeyEvent {
  key: string;
  domEvent: {
    key: string;
    code: string;
    keyCode: number;
    preventDefault: () => void;
    stopPropagation: () => void;
  };
}

interface Disposable {
  dispose: () => void;
}

interface NodeTerminal {
  write: (data: string) => void;
  cols: number;
  rows: number;
  element: object;
  onKey: (callback: (event: KeyEvent) => void) => Disposable;
  onData: (callback: (data: string) => void) => Disposable;
  onResize: (callback: (size: { cols: number; rows: number }) => void) => Disposable;
}

/**
 * Map of key names to approximate keyCodes (for games that check keyCode)
 */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  Enter: 13, Escape: 27, ' ': 32, Backspace: 8, Tab: 9,
  a: 65, b: 66, c: 67, d: 68, e: 69, f: 70, g: 71, h: 72,
  i: 73, j: 74, k: 75, l: 76, m: 77, n: 78, o: 79, p: 80,
  q: 81, r: 82, s: 83, t: 84, u: 85, v: 86, w: 87, x: 88,
  y: 89, z: 90, '1': 49, '2': 50, '3': 51, '4': 52, '5': 53,
  '6': 54, '7': 55, '8': 56, '9': 57, '0': 48,
};

/**
 * Parse raw stdin escape sequences into key names
 * compatible with DOM KeyboardEvent.key values
 */
function parseKey(data: string): string {
  if (data === '\x1b[A' || data === '\x1bOA') return 'ArrowUp';
  if (data === '\x1b[B' || data === '\x1bOB') return 'ArrowDown';
  if (data === '\x1b[C' || data === '\x1bOC') return 'ArrowRight';
  if (data === '\x1b[D' || data === '\x1bOD') return 'ArrowLeft';
  if (data === '\r' || data === '\n') return 'Enter';
  if (data === '\x1b') return 'Escape';
  if (data === ' ') return ' ';
  if (data === '\x7f' || data === '\b') return 'Backspace';
  if (data === '\t') return 'Tab';
  if (data === '\x03') return 'c';
  if (data.length === 1) return data;
  return data;
}

function createDomEvent(key: string) {
  const keyCode = KEY_CODES[key] || KEY_CODES[key.toLowerCase()] || 0;
  return {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    keyCode,
    which: keyCode,
    preventDefault: () => {},
    stopPropagation: () => {},
    stopImmediatePropagation: () => {},
    // Properties games might check
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    type: 'keydown',
  };
}

// Track held keys for keyup simulation
const heldKeys = new Map<string, ReturnType<typeof setTimeout>>();

function createNodeTerminal(): NodeTerminal {
  const keyListeners: ((event: KeyEvent) => void)[] = [];
  const dataListeners: ((data: string) => void)[] = [];
  const resizeListeners: ((size: { cols: number; rows: number }) => void)[] = [];

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (data: string) => {
    if (data === '\x03') {
      cleanup();
      process.exit(0);
    }

    const key = parseKey(data);
    const domEvent = createDomEvent(key);

    // Dispatch keydown on window (Tetris/Chopper use this)
    // Can't Object.assign onto Event (type is read-only getter), so use a plain object
    const keydownEvent = { ...domEvent, type: 'keydown' } as unknown as Event;
    windowPolyfill.dispatchEvent(keydownEvent);

    // Simulate keyup after a short delay (no key-release in raw stdin)
    if (heldKeys.has(key)) {
      clearTimeout(heldKeys.get(key)!);
    }
    heldKeys.set(key, setTimeout(() => {
      const keyupEvent = { ...domEvent, type: 'keyup' } as unknown as Event;
      windowPolyfill.dispatchEvent(keyupEvent);
      heldKeys.delete(key);
    }, 80));

    // Fire terminal.onKey listeners
    for (const listener of [...keyListeners]) {
      listener({ key, domEvent });
    }

    for (const listener of [...dataListeners]) {
      listener(data);
    }
  });

  process.stdout.on('resize', () => {
    const size = { cols: process.stdout.columns || 80, rows: process.stdout.rows || 24 };
    for (const listener of [...resizeListeners]) {
      listener(size);
    }
  });

  function cleanup() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[?25h');
    process.stdout.write('\x1b[0m');
  }

  // Synchronized output: wrap writes with DEC sync sequences so the
  // terminal batches clear + redraw into a single atomic paint.
  // Supported by Warp, iTerm2, kitty, foot, WezTerm, etc.
  const SYNC_START = '\x1b[?2026h';
  const SYNC_END = '\x1b[?2026l';

  const terminal: NodeTerminal = {
    write: (data: string) => {
      process.stdout.write(SYNC_START + data + SYNC_END);
    },
    get cols() { return process.stdout.columns || 80; },
    get rows() { return process.stdout.rows || 24; },
    element: {}, // Truthy for isTerminalValid check
    onKey: (callback: (event: KeyEvent) => void): Disposable => {
      keyListeners.push(callback);
      return {
        dispose: () => {
          const idx = keyListeners.indexOf(callback);
          if (idx !== -1) keyListeners.splice(idx, 1);
        }
      };
    },
    onData: (callback: (data: string) => void): Disposable => {
      dataListeners.push(callback);
      return {
        dispose: () => {
          const idx = dataListeners.indexOf(callback);
          if (idx !== -1) dataListeners.splice(idx, 1);
        }
      };
    },
    onResize: (callback: (size: { cols: number; rows: number }) => void): Disposable => {
      resizeListeners.push(callback);
      return {
        dispose: () => {
          const idx = resizeListeners.indexOf(callback);
          if (idx !== -1) resizeListeners.splice(idx, 1);
        }
      };
    },
  };

  process.on('exit', () => {
    activeController?.stop();
    activeController = null;
    cleanup();
  });
  process.on('SIGINT', () => { activeController?.stop(); cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { activeController?.stop(); cleanup(); process.exit(0); });

  return terminal;
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

let activeController: { stop: () => void; isRunning: boolean } | null = null;

function stopActiveGame() {
  activeController?.stop();
  activeController = null;
}

function setupGameEvents(terminal: NodeTerminal) {
  // Listen for game quit/switch/menu events dispatched via window
  windowPolyfill.addEventListener(GAME_EVENTS.QUIT, () => {
    stopActiveGame();
    setTimeout(() => openMenu(terminal), 100);
  });
  windowPolyfill.addEventListener(GAME_EVENTS.SWITCH, () => {
    stopActiveGame();
    // Launch a random game
    const randomGame = games[Math.floor(Math.random() * games.length)];
    setTimeout(() => launchGame(terminal, randomGame), 100);
  });
  windowPolyfill.addEventListener(GAME_EVENTS.GAMES_MENU, () => {
    stopActiveGame();
    setTimeout(() => openMenu(terminal), 100);
  });
  windowPolyfill.addEventListener(GAME_EVENTS.LAUNCH_GAME, ((event: CustomEvent) => {
    const gameId = event.detail?.gameId;
    const game = games.find(g => g.id === gameId);
    if (game) {
      setTimeout(() => launchGame(terminal, game), 100);
    }
  }) as EventHandler);
}

function openMenu(terminal: NodeTerminal) {
  stopActiveGame();
  // Use the exact same games menu from the library
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showGamesMenu(terminal as any, {
    onGameSelect: (gameId: string) => {
      const game = games.find(g => g.id === gameId);
      if (game) launchGame(terminal, game);
    },
    onActionSelect: (actionId: string) => {
      if (actionId !== 'vibe') return;
      launchVibeFromMenu();
    },
    onQuit: () => {
      process.exit(0);
    },
  });
}

function launchVibeFromMenu() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[0m');

  const cliPath = fileURLToPath(import.meta.url);
  const child = spawn(process.execPath, [cliPath, 'vibe'], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
  child.on('error', () => {
    console.error('Failed to launch vibe command');
    process.exit(1);
  });
}

function launchGame(terminal: NodeTerminal, game: GameInfo) {
  stopActiveGame();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeController = game.run(terminal as any);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
  @abhirup/gamr — Terminal games

  Usage:
    gamr                    Interactive game menu
    gamr <game>             Launch a game directly
    gamr vibe               Developer hub (create, vibe code, play, remove, PR)
    gamr vibe <name>        Vibe code a game (creates it if new)
    gamr remove <name>      Remove a game
    gamr --theme <theme>    Set color theme
    gamr --list             List all games
    gamr --help             Show this help

  Games:
    ${games.map(g => `${g.id.padEnd(16)} ${g.description}`).join('\n    ')}

  Themes:
    cyan (default), amber, green, white, hotpink, blood, ice,
    bladerunner, tron, kawaii, oled, solarized, nord, highcontrast,
    banana, cream — plus Light variants (e.g. cyanLight)

  Controls:
    Arrow keys / WASD    Move / navigate
    Enter                Confirm / select
    ESC                  Pause menu
    Q                    Quit

  Examples:
    gamr snake
    gamr tetris --theme green
    gamr --theme amber
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    for (const game of games) {
      console.log(`  ${game.id.padEnd(16)} ${game.description}`);
    }
    process.exit(0);
  }

  let theme: PhosphorMode = 'cyan';
  const themeIdx = args.indexOf('--theme');
  if (themeIdx !== -1 && args[themeIdx + 1]) {
    theme = args[themeIdx + 1] as PhosphorMode;
    args.splice(themeIdx, 2);
  }
  setTheme(theme);

  const terminal = createNodeTerminal();
  setupGameEvents(terminal);

  // Direct game launch: gamr snake
  const gameName = args[0];
  if (gameName) {
    const game = allGames.find(g => g.id === gameName || g.name.toLowerCase() === gameName.toLowerCase());
    if (!game) {
      console.error(`Unknown game: ${gameName}`);
      console.error(`Available active games: ${games.map(g => g.id).join(', ')}`);
      process.exit(1);
      return;
    }
    launchGame(terminal, game);
    return;
  }

  openMenu(terminal);
}

// ---------------------------------------------------------------------------
// Entry — branch between developer commands and game runtime
// ---------------------------------------------------------------------------
const cliArgs = process.argv.slice(2);
if (cliArgs[0] === 'vibe' || cliArgs[0] === 'create') {
  import('./create').then(m => m.vibeCommand(cliArgs.slice(1)));
} else if (cliArgs[0] === 'remove') {
  import('./create').then(m => m.removeCommand(cliArgs.slice(1)));
} else {
  // Passive update check — print notice if outdated, then launch game
  import('./update-check').then(m => m.checkForUpdatePassive()).then(notice => {
    if (notice) process.stdout.write(notice);
    main();
  }).catch(() => main());
}
