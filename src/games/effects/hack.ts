/**
 * Fake Hacking Animation
 *
 * Displays a fake "hacking" sequence for fun.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, exitAlternateBuffer } from '../utils';

export interface HackController {
  stop: () => void;
  isRunning: boolean;
}

/**
 * Execute fake hacking animation
 */
export function runHackEffect(terminal: Terminal): HackController {
  const themeColor = getCurrentThemeColor();
  let running = true;
  let currentInterval: ReturnType<typeof setInterval> | null = null;

  const hackLines = [
    'INITIALIZING HACK SEQUENCE...',
    '> Scanning network interfaces...',
    '> Found 147 active nodes',
    '> Bypassing firewall [████████░░] 80%',
    '> Bypassing firewall [██████████] 100%',
    '> Injecting payload...',
    '> Establishing backdoor connection...',
    '> ACCESS GRANTED',
    '> Downloading mainframe.db [████░░░░░░] 40%',
    '> Downloading mainframe.db [███████░░░] 70%',
    '> Downloading mainframe.db [██████████] 100%',
    '> Covering tracks...',
    '> Erasing logs...',
    '',
    '████ HACK COMPLETE ████',
    '',
    'Just kidding! This is just a fun animation :)',
  ];

  terminal.write('\x1b[2J\x1b[H'); // Clear screen
  terminal.write(themeColor);

  let lineIndex = 0;
  currentInterval = setInterval(() => {
    if (!running || lineIndex >= hackLines.length) {
      if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
      }
      if (running) {
        terminal.write('\x1b[0m\r\n');
        exitAlternateBuffer(terminal, 'hack-effect-complete');
        running = false;
      }
      return;
    }

    const line = hackLines[lineIndex];

    if (line.includes('ACCESS GRANTED') || line.includes('HACK COMPLETE')) {
      terminal.write('\x1b[1;31m' + line + '\x1b[0m' + themeColor + '\r\n');
    } else {
      terminal.write(line + '\r\n');
    }

    lineIndex++;
  }, 200);

  return {
    stop: () => {
      if (!running) return;
      running = false;
      if (currentInterval) {
        clearInterval(currentInterval);
        currentInterval = null;
      }
      terminal.write('\x1b[0m\r\n');
      exitAlternateBuffer(terminal, 'hack-effect-stopped');
    },
    get isRunning() {
      return running;
    }
  };
}
