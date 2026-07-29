/**
 * Shared utilities for games
 *
 * This module provides theme-aware utilities for games.
 * The theme must be configured by the consuming application via setTheme().
 */

import type { Terminal } from '@xterm/xterm';
import {
  type PhosphorMode,
  getAnsiColor,
  isLightTheme as checkLightTheme,
  getSubtleColor,
} from '../themes';

// ============================================================================
// Theme Configuration
// ============================================================================

/**
 * Current theme mode - configured by the consuming application
 */
let currentTheme: PhosphorMode = 'cyan';

/**
 * Set the current theme mode
 * Call this from your app when the theme changes
 */
export function setTheme(mode: PhosphorMode): void {
  currentTheme = mode;
}

/**
 * Get the current theme mode
 */
export function getTheme(): PhosphorMode {
  return currentTheme;
}

// ============================================================================
// Alternate Buffer Management
// ============================================================================

/**
 * Track which terminals are currently in alternate buffer.
 * This prevents double-entry/exit issues and provides debugging info.
 */
const alternateBufferState = new WeakMap<Terminal, { reason: string; enteredAt: number }>();

/**
 * Check if a terminal is valid and can accept writes
 */
export function isTerminalValid(terminal: Terminal | null | undefined): terminal is Terminal {
  if (!terminal) return false;
  // Check if terminal has been disposed (element becomes null)
  try {
    return terminal.element !== null;
  } catch {
    return false;
  }
}

/**
 * Enter alternate screen buffer with state tracking.
 * Safe to call multiple times - will log warning but not double-enter.
 *
 * @param terminal - The xterm terminal instance
 * @param reason - Description of why we're entering (for debugging)
 * @returns true if buffer was entered, false if already in buffer or terminal invalid
 */
export function enterAlternateBuffer(terminal: Terminal, reason: string): boolean {
  if (!isTerminalValid(terminal)) {
    console.warn(`[AlternateBuffer] Cannot enter: terminal invalid (reason: ${reason})`);
    return false;
  }

  if (alternateBufferState.has(terminal)) {
    const existing = alternateBufferState.get(terminal)!;
    console.warn(`[AlternateBuffer] Already in buffer (entered by: ${existing.reason}), requested by: ${reason}`);
    return false;
  }

  terminal.write('\x1b[?1049h'); // Enter alternate screen buffer
  terminal.write('\x1b[?25l');   // Hide cursor
  terminal.write('\x1b[2J\x1b[H'); // Clear screen

  alternateBufferState.set(terminal, { reason, enteredAt: Date.now() });
  return true;
}

/**
 * Exit alternate screen buffer with state tracking.
 * Safe to call multiple times - will log warning but not double-exit.
 *
 * @param terminal - The xterm terminal instance
 * @param reason - Description of why we're exiting (for debugging)
 * @returns true if buffer was exited, false if not in buffer or terminal invalid
 */
export function exitAlternateBuffer(terminal: Terminal, reason: string): boolean {
  if (!isTerminalValid(terminal)) {
    console.warn(`[AlternateBuffer] Cannot exit: terminal invalid (reason: ${reason})`);
    return false;
  }

  if (!alternateBufferState.has(terminal)) {
    console.warn(`[AlternateBuffer] Not in alternate buffer, exit requested by: ${reason}`);
    return false;
  }

  terminal.write('\x1b[?1049l'); // Exit alternate screen buffer
  terminal.write('\x1b[?25h');   // Show cursor

  alternateBufferState.delete(terminal);
  return true;
}

/**
 * Check if terminal is currently in alternate buffer
 */
export function isInAlternateBuffer(terminal: Terminal): boolean {
  return alternateBufferState.has(terminal);
}

/**
 * Force exit alternate buffer without state check (for error recovery)
 * Use sparingly - prefer exitAlternateBuffer for normal operations
 */
export function forceExitAlternateBuffer(terminal: Terminal, reason: string): void {
  if (!isTerminalValid(terminal)) {
    console.warn(`[AlternateBuffer] Cannot force exit: terminal invalid (reason: ${reason})`);
    return;
  }

  terminal.write('\x1b[?1049l');
  terminal.write('\x1b[?25h');
  alternateBufferState.delete(terminal);
  console.warn(`[AlternateBuffer] Force exited (reason: ${reason})`);
}

// ============================================================================
// Theme Color Utilities
// ============================================================================

/**
 * Get theme-appropriate ANSI color escape code
 */
export function getThemeColorCode(mode: PhosphorMode): string {
  return getAnsiColor(mode);
}

/**
 * Get current theme color code
 */
export function getCurrentThemeColor(): string {
  return getAnsiColor(currentTheme);
}

/**
 * Check if current theme is a light theme (needs dark text)
 */
export function isLightTheme(): boolean {
  return checkLightTheme(currentTheme);
}

/**
 * Get a subtle/muted color that blends with the terminal background
 * Useful for background elements like doors, walls, etc.
 */
export function getSubtleBackgroundColor(): string {
  return getSubtleColor(currentTheme);
}

// ============================================================================
// Layout Utilities
// ============================================================================

interface VerticalAnchorOptions {
  headerRows?: number;
  footerRows?: number;
  minTop?: number;
}

/**
 * Compute a vertically-centered top row for content while reserving header/footer space.
 */
export function getVerticalAnchor(
  terminalRows: number,
  contentRows: number,
  options: VerticalAnchorOptions = {}
): number {
  const headerRows = options.headerRows ?? 0;
  const footerRows = options.footerRows ?? 0;
  const minTop = Math.max(1, options.minTop ?? 1);

  const availableRows = terminalRows - headerRows - footerRows;
  const centeredTop = headerRows + Math.floor((availableRows - contentRows) / 2) + 1;

  return Math.max(minTop, centeredTop);
}

// Re-export PhosphorMode type for convenience
export type { PhosphorMode } from '../themes';
