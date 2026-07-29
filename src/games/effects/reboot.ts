/**
 * Fake Reboot Animation
 *
 * Simulates a system reboot sequence.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, exitAlternateBuffer } from '../utils';

export interface RebootController {
  stop: () => void;
  isRunning: boolean;
}

/**
 * Execute fake reboot animation
 */
export function runRebootEffect(terminal: Terminal): RebootController {
  const themeColor = getCurrentThemeColor();
  let running = true;
  let currentInterval: ReturnType<typeof setInterval> | null = null;

  const bootLines = [
    '\x1b[2J\x1b[H', // Clear screen
    `${themeColor}HYPERSURGE BIOS v2.0.77\x1b[0m`,
    '',
    'Initiating system shutdown...',
    '',
    'Stopping services...',
    '  [OK] Stopped Network Manager',
    '  [OK] Stopped Terminal Services',
    '  [OK] Stopped CRT Display Driver',
    '',
    'Unmounting filesystems...',
    '  [OK] Unmounted /dev/matrix',
    '  [OK] Unmounted /dev/hacker',
    '',
    '\x1b[1;31mSystem halted.\x1b[0m',
    '',
    '...',
    '',
    '\x1b[1;33mPower On Self Test...\x1b[0m',
    '',
    `  Memory: ${Math.floor(Math.random() * 32 + 16)}GB OK`,
    '  CPU: HyperCore X9000 @ 4.2GHz OK',
    '  GPU: CRT-Vision 3000 OK',
    '  MATRIX: Connected',
    '',
    'Loading HYPERSURGE OS...',
    '',
    `${themeColor}╔═══════════════════════════════════════╗`,
    '║                                       ║',
    '║     H Y P E R S U R G E   O S        ║',
    '║                                       ║',
    '║         Welcome back, Neo.           ║',
    '║                                       ║',
    `╚═══════════════════════════════════════╝\x1b[0m`,
    '',
    'System ready.',
    '',
  ];

  let lineIndex = 0;
  currentInterval = setInterval(() => {
    if (!running || lineIndex >= bootLines.length) {
      if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
      }
      if (running) {
        exitAlternateBuffer(terminal, 'reboot-effect-complete');
        running = false;
      }
      return;
    }

    const line = bootLines[lineIndex];
    if (line.startsWith('\x1b[2J')) {
      terminal.write(line);
    } else {
      terminal.write(line + '\r\n');
    }
    lineIndex++;
  }, 150);

  return {
    stop: () => {
      if (!running) return;
      running = false;
      if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
      }
      exitAlternateBuffer(terminal, 'reboot-effect-stopped');
    },
    get isRunning() {
      return running;
    }
  };
}
