/**
 * Games Menu
 *
 * Interactive game selection menu accessible via ::games command
 * or by pressing L in any game's pause menu.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, isLightTheme, enterAlternateBuffer, exitAlternateBuffer, forceExitAlternateBuffer, isTerminalValid } from './utils';
import { games } from './index';
import { playSelectTransition } from './gameTransitions';

export interface GamesMenuController {
  stop: () => void;
  isRunning: boolean;
}

export interface GamesMenuOptions {
  onGameSelect?: (gameId: string) => void;
  onActionSelect?: (actionId: string) => void;
  onQuit?: () => void;
  extraActions?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

/**
 * Show interactive games menu
 */
export function showGamesMenu(terminal: Terminal, optionsOrCallback?: GamesMenuOptions | ((gameId: string) => void)): GamesMenuController {
  // Support both options object and simple callback for backwards compatibility
  const options: GamesMenuOptions = typeof optionsOrCallback === 'function'
    ? { onGameSelect: optionsOrCallback }
    : optionsOrCallback || {};
  const { onGameSelect, onActionSelect, onQuit, extraActions = [] } = options;
  const themeColor = getCurrentThemeColor();
  const lightTheme = isLightTheme();
  const menuEntries = [
    ...games.map(game => ({ ...game, kind: 'game' as const })),
    ...extraActions.map(action => ({ ...action, kind: 'action' as const })),
  ];

  let running = true;
  let selectedIndex = 0;
  let scrollOffset = 0;

  const controller: GamesMenuController = {
    stop: () => {
      if (!running) return;
      running = false;
    },
    get isRunning() { return running; }
  };

  const title = [
    '\u2588 \u2588 \u2588\u2584\u2588 \u2588\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580\u2588   \u2588\u2580\u2580 \u2584\u2580\u2588 \u2588\u2580\u2584\u2580\u2588 \u2588\u2580\u2580 \u2588\u2580',
    '\u2588\u2580\u2588  \u2588  \u2588\u2580  \u2588\u2588\u2584 \u2588\u2580\u2584   \u2588\u2584\u2588 \u2588\u2580\u2588 \u2588 \u2580 \u2588 \u2588\u2588\u2584 \u2584\u2588',
  ];

  function render(): void {
    let output = '';
    output += '\x1b[2J\x1b[H';

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Title
    const titleX = Math.floor((cols - title[0].length) / 2);
    output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[0]}\x1b[0m`;
    output += `\x1b[3;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;

    // Subtitle with game count
    const subtitle = `Select a game to play (${games.length} games)`;
    output += `\x1b[5;${Math.floor((cols - subtitle.length) / 2)}H\x1b[2m${subtitle}\x1b[0m`;

    // Determine if we should use 2 columns
    const boxWidth = 38;
    const columnGap = 2;
    const twoColumnWidth = boxWidth * 2 + columnGap;
    const useTwoColumns = cols >= twoColumnWidth + 8; // 8 for margins

    const listStartY = 6;
    const availableRows = rows - listStartY - 4;
    const maxVisibleGames = Math.max(1, Math.floor(availableRows / 2));

    if (useTwoColumns) {
      renderTwoColumns(output, cols, rows, boxWidth, columnGap, listStartY, maxVisibleGames);
    } else {
      renderSingleColumn(output, cols, rows, boxWidth, listStartY, maxVisibleGames);
    }
  }

  function renderSingleColumn(
    baseOutput: string,
    cols: number,
    rows: number,
    boxWidth: number,
    listStartY: number,
    maxVisibleGames: number
  ): void {
    let output = baseOutput;
    const boxX = Math.floor((cols - boxWidth) / 2);
    const visibleEntries = Math.min(maxVisibleGames, menuEntries.length);

    // Adjust scroll offset to keep selected item visible
    if (selectedIndex < scrollOffset) {
      scrollOffset = selectedIndex;
    } else if (selectedIndex >= scrollOffset + visibleEntries) {
      scrollOffset = selectedIndex - visibleEntries + 1;
    }
    scrollOffset = Math.max(0, Math.min(scrollOffset, menuEntries.length - visibleEntries));

    const hasScrollUp = scrollOffset > 0;
    const hasScrollDown = scrollOffset + visibleEntries < menuEntries.length;

    // Top border
    const topScrollIndicator = hasScrollUp ? ' \u25b2 more ' : '\u2550'.repeat(8);
    const topBorderWidth = boxWidth - 2 - topScrollIndicator.length;
    const topLeftPad = Math.floor(topBorderWidth / 2);
    const topRightPad = topBorderWidth - topLeftPad;
    output += `\x1b[${listStartY};${boxX}H${themeColor}\u2554${'\u2550'.repeat(topLeftPad)}${hasScrollUp ? '\x1b[33m' : ''}${topScrollIndicator}${hasScrollUp ? themeColor : ''}${'\u2550'.repeat(topRightPad)}\u2557\x1b[0m`;

    // Render visible games
    for (let vi = 0; vi < visibleEntries; vi++) {
      const i = scrollOffset + vi;
      const entry = menuEntries[i];
      const y = listStartY + 1 + vi * 2;
      const isSelected = i === selectedIndex;

      output += renderEntry(entry, i, isSelected, y, boxX, boxWidth);
    }

    // Bottom border
    const bottomY = listStartY + 1 + visibleEntries * 2;
    const bottomScrollIndicator = hasScrollDown ? ' \u25bc more ' : '\u2550'.repeat(8);
    const bottomBorderWidth = boxWidth - 2 - bottomScrollIndicator.length;
    const bottomLeftPad = Math.floor(bottomBorderWidth / 2);
    const bottomRightPad = bottomBorderWidth - bottomLeftPad;
    output += `\x1b[${bottomY};${boxX}H${themeColor}\u255a${'\u2550'.repeat(bottomLeftPad)}${hasScrollDown ? '\x1b[33m' : ''}${bottomScrollIndicator}${hasScrollDown ? themeColor : ''}${'\u2550'.repeat(bottomRightPad)}\u255d\x1b[0m`;

    // Controls
    if (onActionSelect) {
      const actionHint = 'Press V to Vibe Code Your Own Game';
      const hintX = Math.floor((cols - actionHint.length) / 2);
      const ctaStyle = lightTheme ? '\x1b[1;30;106m' : '\x1b[1;30;103m';
      output += `\x1b[${rows};${hintX}H${ctaStyle}${actionHint}\x1b[0m`;
    }
    const controls = `\u2191\u2193 Navigate | ENTER Select | 1-9 Quick | Q Quit`;
    output += `\x1b[${rows - 1};${Math.floor((cols - controls.length) / 2)}H\x1b[2m${controls}\x1b[0m`;

    terminal.write(output);
  }

  function renderTwoColumns(
    baseOutput: string,
    cols: number,
    rows: number,
    boxWidth: number,
    columnGap: number,
    listStartY: number,
    maxVisibleGames: number
  ): void {
    let output = baseOutput;

    // With 2 columns, we can show 2x as many games
    const entriesPerColumn = Math.min(maxVisibleGames, Math.ceil(menuEntries.length / 2));

    // Calculate scroll based on rows of 2 games
    const selectedRow = Math.floor(selectedIndex / 2);
    if (selectedRow < scrollOffset) {
      scrollOffset = selectedRow;
    } else if (selectedRow >= scrollOffset + entriesPerColumn) {
      scrollOffset = selectedRow - entriesPerColumn + 1;
    }
    const maxScroll = Math.max(0, Math.ceil(menuEntries.length / 2) - entriesPerColumn);
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));

    const hasScrollUp = scrollOffset > 0;
    const hasScrollDown = (scrollOffset + entriesPerColumn) * 2 < menuEntries.length;

    // Calculate positions for two columns
    const totalWidth = boxWidth * 2 + columnGap;
    const startX = Math.floor((cols - totalWidth) / 2);
    const leftBoxX = startX;
    const rightBoxX = startX + boxWidth + columnGap;

    // Top borders
    const topScrollIndicator = hasScrollUp ? ' \u25b2 ' : '\u2550\u2550\u2550';
    const topBorderContent = boxWidth - 2 - topScrollIndicator.length;
    const topLeft = Math.floor(topBorderContent / 2);
    const topRight = topBorderContent - topLeft;

    output += `\x1b[${listStartY};${leftBoxX}H${themeColor}\u2554${'\u2550'.repeat(topLeft)}${hasScrollUp ? '\x1b[33m' : ''}${topScrollIndicator}${hasScrollUp ? themeColor : ''}${'\u2550'.repeat(topRight)}\u2557\x1b[0m`;
    output += `\x1b[${listStartY};${rightBoxX}H${themeColor}\u2554${'\u2550'.repeat(topLeft)}${hasScrollUp ? '\x1b[33m' : ''}${topScrollIndicator}${hasScrollUp ? themeColor : ''}${'\u2550'.repeat(topRight)}\u2557\x1b[0m`;

    // Render games in two columns
    for (let row = 0; row < entriesPerColumn; row++) {
      const leftIdx = (scrollOffset + row) * 2;
      const rightIdx = leftIdx + 1;
      const y = listStartY + 1 + row * 2;

      // Left column
      if (leftIdx < menuEntries.length) {
        output += renderEntry(menuEntries[leftIdx], leftIdx, leftIdx === selectedIndex, y, leftBoxX, boxWidth);
      } else {
        // Empty slot
        output += `\x1b[${y};${leftBoxX}H${themeColor}\u2551${' '.repeat(boxWidth - 2)}\u2551\x1b[0m`;
        output += `\x1b[${y + 1};${leftBoxX}H${themeColor}\u2551${' '.repeat(boxWidth - 2)}\u2551\x1b[0m`;
      }

      // Right column
      if (rightIdx < menuEntries.length) {
        output += renderEntry(menuEntries[rightIdx], rightIdx, rightIdx === selectedIndex, y, rightBoxX, boxWidth);
      } else {
        // Empty slot
        output += `\x1b[${y};${rightBoxX}H${themeColor}\u2551${' '.repeat(boxWidth - 2)}\u2551\x1b[0m`;
        output += `\x1b[${y + 1};${rightBoxX}H${themeColor}\u2551${' '.repeat(boxWidth - 2)}\u2551\x1b[0m`;
      }
    }

    // Bottom borders
    const bottomY = listStartY + 1 + entriesPerColumn * 2;
    const bottomScrollIndicator = hasScrollDown ? ' \u25bc ' : '\u2550\u2550\u2550';
    const bottomBorderContent = boxWidth - 2 - bottomScrollIndicator.length;
    const bottomLeft = Math.floor(bottomBorderContent / 2);
    const bottomRight = bottomBorderContent - bottomLeft;

    output += `\x1b[${bottomY};${leftBoxX}H${themeColor}\u255a${'\u2550'.repeat(bottomLeft)}${hasScrollDown ? '\x1b[33m' : ''}${bottomScrollIndicator}${hasScrollDown ? themeColor : ''}${'\u2550'.repeat(bottomRight)}\u255d\x1b[0m`;
    output += `\x1b[${bottomY};${rightBoxX}H${themeColor}\u255a${'\u2550'.repeat(bottomLeft)}${hasScrollDown ? '\x1b[33m' : ''}${bottomScrollIndicator}${hasScrollDown ? themeColor : ''}${'\u2550'.repeat(bottomRight)}\u255d\x1b[0m`;

    // Controls
    if (onActionSelect) {
      const actionHint = 'Press V to Vibe Code Your Own Game';
      const hintX = Math.floor((cols - actionHint.length) / 2);
      const ctaStyle = lightTheme ? '\x1b[1;30;106m' : '\x1b[1;30;103m';
      output += `\x1b[${rows};${hintX}H${ctaStyle}${actionHint}\x1b[0m`;
    }
    const controls = `\u2191\u2193\u2190\u2192 Navigate | ENTER Select | 1-9 Quick | Q Quit`;
    output += `\x1b[${rows - 1};${Math.floor((cols - controls.length) / 2)}H\x1b[2m${controls}\x1b[0m`;

    terminal.write(output);
  }

  function renderEntry(
    entry: typeof menuEntries[number],
    index: number,
    isSelected: boolean,
    y: number,
    boxX: number,
    boxWidth: number
  ): string {
    let output = '';
    const contentWidth = boxWidth - 2; // Account for box borders on each side

    const prefix = isSelected ? '\u25b6' : ' ';
    const highlight = isSelected ? (lightTheme ? '\x1b[1;7;97m' : '\x1b[1;7m') : '';
    const keyColor = isSelected ? '' : '\x1b[33m';
    const keyNum = index + 1;
    const keyDisplay = keyNum <= 9 ? `${keyNum}` : ' ';

    // Build the line content
    const lineContent = `${prefix} [${keyDisplay}] ${entry.name}`;
    const padding = Math.max(0, contentWidth - lineContent.length);

    output += `\x1b[${y};${boxX}H${themeColor}\u2551\x1b[0m${highlight}${keyColor}${lineContent}${' '.repeat(padding)}\x1b[0m${themeColor}\u2551\x1b[0m`;

    // Description line
    const descContent = `    ${entry.description}`;
    const descPadding = Math.max(0, contentWidth - descContent.length);
    const descColor = isSelected ? (lightTheme ? '\x1b[2;7;97m' : '\x1b[2;7m') : '\x1b[2m';

    output += `\x1b[${y + 1};${boxX}H${themeColor}\u2551\x1b[0m${descColor}${descContent}${' '.repeat(descPadding)}\x1b[0m${themeColor}\u2551\x1b[0m`;

    return output;
  }

  // Start menu
  setTimeout(() => {
    if (!running) return;

    // Verify terminal is still valid before proceeding
    if (!isTerminalValid(terminal)) {
      console.warn('[GamesMenu] Terminal became invalid before menu could start');
      running = false;
      return;
    }

    let keyListener: ReturnType<typeof terminal.onKey> | null = null;

    try {
      // Enter alternate buffer
      enterAlternateBuffer(terminal, 'games-menu');

      render();

      // Redraw on terminal resize
      const resizeListener = terminal.onResize(() => {
        if (running) render();
      });

      keyListener = terminal.onKey(({ domEvent }) => {
        if (!running) {
          keyListener?.dispose();
          return;
        }

        try {
          domEvent.preventDefault();
          domEvent.stopPropagation();

          const key = domEvent.key;
          const keyLower = key.toLowerCase();
          const cols = terminal.cols;
          const boxWidth = 38;
          const columnGap = 2;
          const twoColumnWidth = boxWidth * 2 + columnGap;
          const useTwoColumns = cols >= twoColumnWidth + 8;

          // Quit
          if (key === 'Escape' || keyLower === 'q') {
            keyListener?.dispose();
            controller.stop();
            exitAlternateBuffer(terminal, 'games-menu-quit');
            if (onQuit) {
              onQuit();
            }
            return;
          }

          // Navigate
          if (key === 'ArrowUp') {
            if (useTwoColumns) {
              selectedIndex = Math.max(0, selectedIndex - 2);
            } else {
              selectedIndex = (selectedIndex - 1 + menuEntries.length) % menuEntries.length;
            }
            render();
            return;
          }
          if (key === 'ArrowDown') {
            if (useTwoColumns) {
              selectedIndex = Math.min(menuEntries.length - 1, selectedIndex + 2);
            } else {
              selectedIndex = (selectedIndex + 1) % menuEntries.length;
            }
            render();
            return;
          }
          if (key === 'ArrowLeft' && useTwoColumns) {
            if (selectedIndex % 2 === 1) {
              selectedIndex--;
            }
            render();
            return;
          }
          if (key === 'ArrowRight' && useTwoColumns) {
            if (selectedIndex % 2 === 0 && selectedIndex + 1 < menuEntries.length) {
              selectedIndex++;
            }
            render();
            return;
          }

          // Global action shortcut(s)
          if (keyLower === 'v' && onActionSelect) {
            keyListener?.dispose();
            running = false;
            exitAlternateBuffer(terminal, 'games-menu-vibe');
            onActionSelect('vibe');
            return;
          }

          // Helper to launch entry
          const launchEntry = async (entry: typeof menuEntries[number]) => {
            keyListener?.dispose();
            running = false;
            // Exit alternate buffer BEFORE transition so menu stops drawing
            exitAlternateBuffer(terminal, 'games-menu-launch');

            try {
              if (entry.kind === 'game') {
                await playSelectTransition(terminal, entry.name);
                if (onGameSelect) {
                  onGameSelect(entry.id);
                }
              } else if (onActionSelect) {
                onActionSelect(entry.id);
              }
            } catch (err) {
              console.error('[GamesMenu] Failed to launch menu entry:', err);
              // Ensure terminal is in usable state on error
              forceExitAlternateBuffer(terminal, 'games-menu-launch-error');
              terminal.write(`\x1b[91mError launching menu entry: ${err}\x1b[0m\r\n`);
            }
          };

          // Select
          if (key === 'Enter') {
            launchEntry(menuEntries[selectedIndex]).catch(err => {
              console.error('[GamesMenu] Unhandled menu launch error:', err);
            });
            return;
          }

          // Quick select by number (1-9)
          const numKey = parseInt(key);
          if (numKey >= 1 && numKey <= menuEntries.length && numKey <= 9) {
            launchEntry(menuEntries[numKey - 1]).catch(err => {
              console.error('[GamesMenu] Unhandled menu launch error:', err);
            });
            return;
          }
        } catch (err) {
          console.error('[GamesMenu] Key handler error:', err);
          controller.stop();
        }
      });

      const originalStop = controller.stop;
      controller.stop = () => {
        keyListener?.dispose();
        resizeListener.dispose();
        exitAlternateBuffer(terminal, 'games-menu-stop');
        originalStop();
      };
    } catch (err) {
      console.error('[GamesMenu] Failed to initialize menu:', err);
      forceExitAlternateBuffer(terminal, 'games-menu-init-error');
      running = false;
    }
  }, 50);

  return controller;
}
