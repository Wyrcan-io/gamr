/**
 * Matrix Rain Effect
 *
 * Digital rain animation inspired by The Matrix.
 * Shows intro text, then starts the rain on keypress.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';

/**
 * Matrix controller for managing the animation state
 */
export interface MatrixController {
  stop: () => void;
  isRunning: boolean;
}

// Global matrix controller reference
let activeMatrixController: MatrixController | null = null;

/**
 * Get the current matrix controller (if running)
 */
export function getActiveMatrixController(): MatrixController | null {
  return activeMatrixController;
}

/**
 * Execute matrix rain effect - fullscreen, theme-aware, key-to-stop
 */
export function runMatrixEffect(terminal: Terminal): MatrixController {
  const themeColor = getCurrentThemeColor();

  const cols = terminal.cols;
  const rows = terminal.rows;

  let running = true;
  let interval: ReturnType<typeof setInterval> | null = null;

  // Matrix characters
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFabcdef<>{}[]|\\/*+-=_';

  // Create column states
  const columns: { y: number; speed: number; chars: string[]; active: boolean }[] = [];
  for (let x = 0; x < cols; x++) {
    columns.push({
      y: -Math.floor(Math.random() * rows * 2),
      speed: 1 + Math.floor(Math.random() * 2),
      chars: Array(rows).fill(' ').map(() => chars[Math.floor(Math.random() * chars.length)]),
      active: Math.random() < 0.6,
    });
  }

  const controller: MatrixController = {
    stop: () => {
      if (!running) return;
      running = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      activeMatrixController = null;

      terminal.write('\x1b[?1049l'); // Exit alternate screen buffer
      terminal.write('\x1b[?25h');   // Show cursor
      terminal.write(`\x1b[2m${themeColor}stream terminated\x1b[0m\r\n`);
    },
    get isRunning() {
      return running;
    }
  };

  activeMatrixController = controller;

  // Small delay to let shell prompt finish rendering
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h'); // Switch to alternate screen buffer
    terminal.write('\x1b[2J\x1b[H'); // Clear screen
    terminal.write('\x1b[?25l'); // Hide cursor

    const message = 'Follow the white rabbit...';

    terminal.write('\x1b[3;4H');
    terminal.write(`${themeColor}\x1b[1m`);

    let charIndex = 0;
    let introComplete = false;

    const typingInterval = setInterval(() => {
      if (!running) {
        clearInterval(typingInterval);
        return;
      }

      if (charIndex < message.length) {
        terminal.write(message[charIndex]);
        charIndex++;
      } else {
        clearInterval(typingInterval);
        terminal.write('\x1b[0m');
        terminal.write('\x1b[5;4H');
        terminal.write(`\x1b[2m${themeColor}[Press any key to continue...]\x1b[0m`);
        introComplete = true;
      }
    }, 80);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) {
        keyListener.dispose();
        return;
      }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      if (introComplete) {
        keyListener.dispose();
        startMatrixRain(terminal);
      }
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      keyListener.dispose();
      clearInterval(typingInterval);
      originalStop();
    };
  }, 50);

  return controller;
}

/**
 * Start the actual matrix rain (called after intro keypress)
 */
export function startMatrixRain(terminal: Terminal): void {
  if (!activeMatrixController?.isRunning) return;

  const themeColor = getCurrentThemeColor();

  const cols = terminal.cols;
  const rows = terminal.rows;

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFabcdef<>{}[]|\\/*+-=_';

  const columns: { y: number; speed: number; chars: string[]; active: boolean }[] = [];
  for (let x = 0; x < cols; x++) {
    columns.push({
      y: -Math.floor(Math.random() * rows * 2),
      speed: 1 + Math.floor(Math.random() * 2),
      chars: Array(rows).fill(' ').map(() => chars[Math.floor(Math.random() * chars.length)]),
      active: Math.random() < 0.7,
    });
  }

  terminal.write('\x1b[2J\x1b[H');
  terminal.write('\x1b[?25l');

  let frameCount = 0;

  const interval = setInterval(() => {
    if (!activeMatrixController?.isRunning) {
      clearInterval(interval);
      terminal.write('\x1b[?25h');
      return;
    }

    frameCount++;

    let output = '';

    for (let y = 0; y < rows - 1; y++) {
      output += `\x1b[${y + 1};1H`;

      for (let x = 0; x < cols; x++) {
        const col = columns[x];

        if (!col.active) {
          output += ' ';
          continue;
        }

        const dist = y - col.y;

        if (dist === 0) {
          output += '\x1b[97;1m' + col.chars[y % col.chars.length] + '\x1b[0m';
        } else if (dist > 0 && dist < 8) {
          const brightness = dist < 3 ? '' : '\x1b[2m';
          output += brightness + themeColor + col.chars[y % col.chars.length] + '\x1b[0m';
        } else if (dist > 0 && dist < 15) {
          output += '\x1b[2m' + themeColor + col.chars[y % col.chars.length] + '\x1b[0m';
        } else {
          output += ' ';
        }
      }
    }

    terminal.write(output);

    for (const col of columns) {
      if (frameCount % col.speed === 0) {
        col.y++;

        if (col.y > rows + 10) {
          col.y = -Math.floor(Math.random() * rows);
          col.active = Math.random() < 0.7;
        }

        if (Math.random() < 0.05) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = chars[Math.floor(Math.random() * chars.length)];
        }
      }
    }
  }, 50);

  const keyListener = terminal.onKey(({ domEvent }) => {
    domEvent.preventDefault();
    domEvent.stopPropagation();

    if (activeMatrixController?.isRunning) {
      activeMatrixController.stop();
    }
  });

  const originalStop = activeMatrixController.stop;
  activeMatrixController.stop = () => {
    clearInterval(interval);
    keyListener.dispose();
    terminal.write('\x1b[?25h');
    originalStop();
  };
}

/**
 * Check if we're in matrix intro phase
 */
export function isMatrixWaitingForKey(): boolean {
  return activeMatrixController?.isRunning === true;
}

/**
 * Handle keypress during matrix effect
 */
export function handleMatrixKeypress(_terminal: Terminal): boolean {
  if (!activeMatrixController?.isRunning) return false;
  return true;
}
