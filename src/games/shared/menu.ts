/**
 * Shared Menu System for Easter Egg Games
 *
 * Provides consistent menu navigation (arrow keys + Enter/Space)
 * while maintaining keyboard shortcuts for quick access.
 */

import { getCurrentThemeColor } from '../utils';

export interface MenuItem {
  label: string;
  shortcut?: string; // e.g., 'ESC', 'R', 'Q'
  action: () => void;
}

export interface MenuState {
  selection: number;
  items: MenuItem[];
}

/**
 * Create a new menu state
 */
export function createMenuState(items: MenuItem[]): MenuState {
  return {
    selection: 0,
    items,
  };
}

/**
 * Navigate menu selection up
 */
export function menuUp(state: MenuState): void {
  state.selection = (state.selection - 1 + state.items.length) % state.items.length;
}

/**
 * Navigate menu selection down
 */
export function menuDown(state: MenuState): void {
  state.selection = (state.selection + 1) % state.items.length;
}

/**
 * Reset menu selection to top
 */
export function menuReset(state: MenuState): void {
  state.selection = 0;
}

/**
 * Execute the currently selected menu item
 */
export function menuConfirm(state: MenuState): void {
  const item = state.items[state.selection];
  if (item) {
    item.action();
  }
}

/**
 * Handle keyboard input for menu navigation
 * Returns true if the key was handled, false otherwise
 */
export function handleMenuInput(
  state: MenuState,
  key: string,
  domEvent: KeyboardEvent
): boolean {
  // Arrow navigation
  if (domEvent.key === 'ArrowUp' || key === 'w') {
    menuUp(state);
    return true;
  }
  if (domEvent.key === 'ArrowDown' || key === 's') {
    menuDown(state);
    return true;
  }

  // Confirm selection
  if (domEvent.key === 'Enter' || domEvent.key === ' ') {
    menuConfirm(state);
    return true;
  }

  // Check keyboard shortcuts
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    if (item.shortcut && key === item.shortcut.toLowerCase()) {
      item.action();
      return true;
    }
  }

  return false;
}

export interface RenderMenuOptions {
  title: string;
  x: number; // Center X position
  y: number; // Starting Y position
  width?: number; // Box width (auto-calculated if not provided)
  showShortcuts?: boolean; // Show shortcuts in menu (default: true)
  blinkTitle?: boolean; // Add blink effect to title (default: true)
}

/**
 * Render a menu box with highlighted selection
 * Returns ANSI escape sequence string
 */
export function renderMenu(
  state: MenuState,
  options: RenderMenuOptions
): string {
  const themeColor = getCurrentThemeColor();
  const { title, x, y, showShortcuts = true, blinkTitle = true } = options;

  // Calculate width based on longest item
  let maxWidth = title.length;
  for (const item of state.items) {
    let itemText = item.label;
    if (showShortcuts && item.shortcut) {
      itemText += ` [${item.shortcut}]`;
    }
    // Account for selection indicators ► ◄
    maxWidth = Math.max(maxWidth, itemText.length + 6);
  }
  // width is calculated but not used currently - kept for potential future use
  void (options.width || maxWidth + 4);

  let output = '';

  // Title with optional blink
  const titleX = x - Math.floor(title.length / 2);
  const titleStyle = blinkTitle ? '\x1b[5m' : '';
  output += `\x1b[${y};${titleX}H${titleStyle}${themeColor}${title}\x1b[0m`;

  // Menu items
  let itemY = y + 2;
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    const isSelected = i === state.selection;

    let displayText = item.label;
    if (showShortcuts && item.shortcut) {
      displayText += ` [${item.shortcut}]`;
    }

    // Selection highlighting
    const text = isSelected ? `► ${displayText} ◄` : `  ${displayText}  `;
    const style = isSelected ? '\x1b[1;93m' : `\x1b[2m${themeColor}`;

    const itemX = x - Math.floor(text.length / 2);
    output += `\x1b[${itemY};${itemX}H${style}${text}\x1b[0m`;
    itemY++;
  }

  // Navigation hint
  const hint = '↑↓ Navigate  Enter Select';
  const hintX = x - Math.floor(hint.length / 2);
  output += `\x1b[${itemY + 1};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;

  return output;
}

/**
 * Standard pause menu items used across most games
 */
export function createPauseMenuItems(callbacks: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onListGames?: () => void;
  onNextGame?: () => void;
  onHelp?: () => void;
}): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'RESUME', shortcut: 'ESC', action: callbacks.onResume },
    { label: 'RESTART', shortcut: 'R', action: callbacks.onRestart },
    { label: 'QUIT', shortcut: 'Q', action: callbacks.onQuit },
  ];

  if (callbacks.onHelp) {
    items.push({ label: 'HELP', shortcut: 'H', action: callbacks.onHelp });
  }

  if (callbacks.onListGames) {
    items.push({ label: 'LIST GAMES', shortcut: 'L', action: callbacks.onListGames });
  }

  if (callbacks.onNextGame) {
    items.push({ label: 'NEXT GAME', shortcut: 'N', action: callbacks.onNextGame });
  }

  return items;
}

/**
 * Standard game over menu items
 */
export function createGameOverMenuItems(callbacks: {
  onRestart: () => void;
  onQuit: () => void;
  onNextGame?: () => void;
}): MenuItem[] {
  const items: MenuItem[] = [
    { label: 'RESTART', shortcut: 'R', action: callbacks.onRestart },
    { label: 'QUIT', shortcut: 'Q', action: callbacks.onQuit },
  ];

  if (callbacks.onNextGame) {
    items.push({ label: 'NEXT GAME', shortcut: 'N', action: callbacks.onNextGame });
  }

  return items;
}

/**
 * Mode selection menu (Tutorial/Play) used by games with tutorials
 */
export function createModeSelectMenuItems(callbacks: {
  onTutorial: () => void;
  onPlay: () => void;
}): MenuItem[] {
  return [
    { label: 'TUTORIAL', shortcut: 'T', action: callbacks.onTutorial },
    { label: 'PLAY', shortcut: 'P', action: callbacks.onPlay },
  ];
}

// ============================================================================
// Simple Menu Helpers (for gradual adoption)
// These work with just indices, no callbacks needed
// ============================================================================

export interface SimpleMenuItem {
  label: string;
  shortcut?: string;
}

/**
 * Handle menu navigation without callbacks
 * Returns new selection index
 */
export function navigateMenu(
  currentSelection: number,
  itemCount: number,
  key: string,
  domEvent: KeyboardEvent
): { newSelection: number; confirmed: boolean } {
  let newSelection = currentSelection;
  let confirmed = false;

  if (domEvent.key === 'ArrowUp' || key === 'w') {
    newSelection = (currentSelection - 1 + itemCount) % itemCount;
  } else if (domEvent.key === 'ArrowDown' || key === 's') {
    newSelection = (currentSelection + 1) % itemCount;
  } else if (domEvent.key === 'Enter' || domEvent.key === ' ') {
    confirmed = true;
  }

  return { newSelection, confirmed };
}

/**
 * Check if a shortcut key was pressed
 * Returns the index of the matching item, or -1 if no match
 */
export function checkShortcut(
  items: SimpleMenuItem[],
  key: string
): number {
  for (let i = 0; i < items.length; i++) {
    const shortcut = items[i].shortcut;
    if (shortcut && key === shortcut.toLowerCase()) {
      return i;
    }
  }
  return -1;
}

/**
 * Render a simple menu (index-based, no callbacks)
 * Returns ANSI escape sequence string
 */
export function renderSimpleMenu(
  items: SimpleMenuItem[],
  selection: number,
  options: {
    centerX: number;
    startY: number;
    showShortcuts?: boolean;
  }
): string {
  const themeColor = getCurrentThemeColor();
  const { centerX, startY, showShortcuts = true } = options;

  let output = '';

  items.forEach((item, i) => {
    const isSelected = i === selection;

    let displayText = item.label;
    if (showShortcuts && item.shortcut) {
      displayText += ` [${item.shortcut}]`;
    }

    const text = isSelected ? `► ${displayText} ◄` : `  ${displayText}  `;
    const style = isSelected ? '\x1b[1;93m' : `\x1b[2m${themeColor}`;

    const itemX = centerX - Math.floor(text.length / 2);
    output += `\x1b[${startY + i};${itemX}H${style}${text}\x1b[0m`;
  });

  return output;
}

/**
 * Common pause menu items definition
 */
export const PAUSE_MENU_ITEMS: SimpleMenuItem[] = [
  { label: 'RESUME', shortcut: 'ESC' },
  { label: 'RESTART', shortcut: 'R' },
  { label: 'QUIT', shortcut: 'Q' },
  { label: 'LIST GAMES', shortcut: 'L' },
  { label: 'NEXT GAME', shortcut: 'N' },
];

/**
 * Common mode select items definition
 */
export const MODE_SELECT_ITEMS: SimpleMenuItem[] = [
  { label: 'TUTORIAL', shortcut: 'T' },
  { label: 'PLAY', shortcut: 'P' },
];
