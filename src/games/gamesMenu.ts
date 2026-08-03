/**
 * Small Machines Index
 *
 * The launcher is deliberately quieter than the games it opens. It is an
 * editorial index: a short list, a useful preview, and explicit routes for
 * Workshop experiments and the compatibility archive.
 */

import type { Terminal } from '@xterm/xterm';
import {
  enterAlternateBuffer,
  exitAlternateBuffer,
  forceExitAlternateBuffer,
  getCurrentThemeColor,
  getTheme,
  isTerminalValid,
  setTheme,
} from './utils';
import { games } from './index';
import type { GameInfo } from './index';
import { archivedGames } from './archived';
import { getUiTheme, getUiThemeModes } from '../themes';
import { clipToWidth, padToWidth, wrapText } from '../ui/terminal';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const MIN_COLS = 60;
const MIN_ROWS = 20;

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

type Section = 'home' | 'all' | 'workshop' | 'archive' | 'appearance';

type MenuEntry =
  | { kind: 'game'; game: GameInfo; archive: boolean }
  | { kind: 'action'; id: string; name: string; description: string }
  | { kind: 'theme'; id: ReturnType<typeof getUiThemeModes>[number]; name: string; description: string };

function sectionTitle(section: Section): string {
  switch (section) {
    case 'all': return 'ALL GAMES';
    case 'workshop': return 'WORKSHOP';
    case 'archive': return 'ARCADE ARCHIVE';
    case 'appearance': return 'APPEARANCE';
    default: return 'FEATURED';
  }
}

function statusLabel(entry: MenuEntry): string {
  if (entry.kind === 'theme') return 'EDITION';
  if (entry.kind === 'action') return 'OPEN';
  return entry.archive ? 'ARCHIVE' : (entry.game.maturity ?? 'ACTIVE').toUpperCase();
}

function entryName(entry: MenuEntry): string {
  if (entry.kind === 'game') return entry.game.name;
  return entry.name;
}

function entryDescription(entry: MenuEntry): string {
  if (entry.kind === 'game') return entry.game.description;
  return entry.description;
}

function difficultyLabel(value: GameInfo['difficulty']): string {
  if (!value) return 'unrated';
  return `${'*'.repeat(value)}${'.'.repeat(3 - value)}`;
}

function makeThemeDescription(id: ReturnType<typeof getUiThemeModes>[number]): string {
  const theme = getUiTheme(id);
  const descriptions: Record<typeof id, string> = {
    carbon: 'Warm dark paper, bone ink, and a restrained rust focus.',
    paper: 'Light paper, near-black ink, and vermilion annotations.',
    indigo: 'Cool dark stock with chalk text and apricot attention marks.',
    lichen: 'Soft charcoal-green surfaces with mineral text and amber focus.',
    contrast: 'Shape-first black and white for maximum legibility.',
  };
  return `${theme.name}. ${descriptions[id]}`;
}

export function showGamesMenu(
  terminal: Terminal,
  optionsOrCallback?: GamesMenuOptions | ((gameId: string) => void),
): GamesMenuController {
  const options: GamesMenuOptions = typeof optionsOrCallback === 'function'
    ? { onGameSelect: optionsOrCallback }
    : optionsOrCallback || {};
  const { onGameSelect, onActionSelect, onQuit, extraActions = [] } = options;

  let running = true;
  let section: Section = 'home';
  let selectedIndex = 0;
  let scrollOffset = 0;
  let helpVisible = false;
  let keyListener: { dispose: () => void } | null = null;
  let resizeListener: { dispose: () => void } | null = null;

  const controller: GamesMenuController = {
    stop: () => {
      if (!running) return;
      running = false;
      keyListener?.dispose();
      resizeListener?.dispose();
      if (isTerminalValid(terminal)) exitAlternateBuffer(terminal, 'index-stop');
    },
    get isRunning() { return running; },
  };

  function getEntries(): MenuEntry[] {
    if (section === 'appearance') {
      return getUiThemeModes().map((id) => ({
        kind: 'theme' as const,
        id,
        name: getUiTheme(id).name,
        description: makeThemeDescription(id),
      }));
    }

    const active = games.map((game) => ({ kind: 'game' as const, game, archive: false }));
    const archive = archivedGames.map((game) => ({ kind: 'game' as const, game, archive: true }));

    if (section === 'all') return active;
    if (section === 'workshop') return active.filter((entry) => entry.game.maturity === 'workshop');
    if (section === 'archive') return archive;

    const featured = active.filter((entry) => entry.game.maturity === 'featured');
    return [
      ...featured,
      { kind: 'action' as const, id: 'all', name: 'All games', description: 'Browse the twenty active games.' },
      { kind: 'action' as const, id: 'workshop', name: 'Workshop', description: 'Play experiments that are still finding their shape.' },
      { kind: 'action' as const, id: 'archive', name: 'Arcade Archive', description: 'Nineteen classic games kept for compatibility.' },
      { kind: 'action' as const, id: 'appearance', name: 'Appearance', description: 'Choose an accessible material edition.' },
      ...extraActions.map((action) => ({ kind: 'action' as const, ...action })),
    ];
  }

  function currentEntries(): MenuEntry[] {
    const entries = getEntries();
    if (selectedIndex >= entries.length) selectedIndex = Math.max(0, entries.length - 1);
    return entries;
  }

  function writeLine(lines: string[], value: string, width: number, style = ''): void {
    lines.push(`${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`);
  }

  function detailLines(entry: MenuEntry, width: number): string[] {
    const lines: string[] = [];
    const accent = getCurrentThemeColor();
    writeLine(lines, entryName(entry), width, `${accent}${BOLD}`);
    lines.push('');
    for (const paragraph of wrapText(entryDescription(entry), width)) writeLine(lines, paragraph, width, DIM);

    if (entry.kind === 'game') {
      lines.push('');
      writeLine(lines, `status   ${statusLabel(entry)}`, width, DIM);
      writeLine(lines, `pace     ${entry.game.pace ?? 'not listed'}`, width, DIM);
      writeLine(lines, `level    ${difficultyLabel(entry.game.difficulty)}`, width, DIM);
      writeLine(lines, `session  ${entry.game.session ?? 'not listed'}`, width, DIM);
      if (entry.archive) {
        lines.push('');
        for (const paragraph of wrapText('Compatibility collection. The active design standard does not apply here.', width)) {
          writeLine(lines, paragraph, width, `${accent}${DIM}`);
        }
      }
    } else if (entry.kind === 'theme') {
      lines.push('');
      writeLine(lines, `selected ${getTheme() === entry.id ? 'yes' : 'no'}`, width, DIM);
      writeLine(lines, `mode     ${getUiTheme(entry.id).appearance}`, width, DIM);
    }

    return lines;
  }

  function renderHelp(lines: string[], cols: number, rows: number): void {
    const width = Math.min(cols - 8, 64);
    const left = Math.max(1, Math.floor((cols - width) / 2));
    const content = [
      'INDEX HELP',
      '',
      '↑/↓ or j/k   move',
      'ENTER        open selected item',
      'A            all active games',
      'W            workshop',
      'X            arcade archive',
      'T            appearance',
      '?            close this help',
      'Q            quit',
    ];
    const top = Math.max(2, Math.floor((rows - content.length - 2) / 2));
    const border = ` ${'─'.repeat(Math.max(0, width - 2))} `;
    lines[top - 1] = `${' '.repeat(left)}${getCurrentThemeColor()}${border}${RESET}`;
    content.forEach((value, index) => {
      lines[top + index] = `${' '.repeat(left)}${getCurrentThemeColor()}│${RESET}${padToWidth(` ${value}`, width - 2)}${getCurrentThemeColor()}│${RESET}`;
    });
    lines[top + content.length] = `${' '.repeat(left)}${getCurrentThemeColor()}└${'─'.repeat(Math.max(0, width - 2))}┘${RESET}`;
  }

  function render(): void {
    if (!running || !isTerminalValid(terminal)) return;
    const cols = terminal.cols;
    const rows = terminal.rows;
    const lines: string[] = [];
    const accent = getCurrentThemeColor();

    if (cols < MIN_COLS || rows < MIN_ROWS) {
      lines.push('\x1b[2J\x1b[H');
      writeLine(lines, 'g/ index', cols, `${accent}${BOLD}`);
      lines.push('');
      writeLine(lines, 'This index needs a little more room.', cols, `${accent}${BOLD}`);
      writeLine(lines, `Need ${MIN_COLS}×${MIN_ROWS}  Have ${cols}×${rows}`, cols, DIM);
      writeLine(lines, 'Resize the terminal, then return here.', cols, DIM);
      terminal.write(lines.join('\r\n'));
      return;
    }

    const entries = currentEntries();
    const entry = entries[selectedIndex];
    const title = sectionTitle(section);
    const compact = cols < 76;
    const listWidth = compact ? cols - 2 : Math.max(30, Math.floor((cols - 3) * 0.43));
    const detailWidth = compact ? cols - 2 : cols - listWidth - 3;
    const bodyRows = Math.max(3, rows - 9);
    const visible = Math.max(1, compact ? Math.min(entries.length, Math.floor(bodyRows / 2)) : Math.min(entries.length, bodyRows));

    if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
    if (selectedIndex >= scrollOffset + visible) scrollOffset = selectedIndex - visible + 1;
    scrollOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, entries.length - visible)));

    lines.push('\x1b[2J\x1b[H');
    writeLine(lines, `g/ index                                      ${getUiTheme(getTheme()).name}`, cols, `${accent}${BOLD}`);
    writeLine(lines, '─'.repeat(cols), cols, accent);
    writeLine(lines, `${title}  ·  ${entries.length} ${section === 'archive' ? 'classics' : 'entries'}`, cols, `${accent}${BOLD}`);
    writeLine(lines, section === 'archive'
      ? 'Compatibility collection. The active catalog is supported separately.'
      : 'Choose a machine by the kind of attention it asks from you.', cols, DIM);
    lines.push('');

    const listLines: string[] = [];
    for (let index = scrollOffset; index < Math.min(entries.length, scrollOffset + visible); index += 1) {
      const item = entries[index];
      const selected = index === selectedIndex;
      const marker = selected ? '>' : ' ';
      const label = `${marker} ${entryName(item)}`;
      const status = statusLabel(item);
      const row = `${padToWidth(clipToWidth(label, Math.max(1, listWidth - status.length - 2), ''), Math.max(1, listWidth - status.length - 2))} ${status}`;
      writeLine(listLines, row, listWidth, selected ? `${accent}${BOLD}` : '');
    }
    while (listLines.length < visible) writeLine(listLines, '', listWidth);

    if (compact) {
      listLines.forEach((line) => lines.push(line));
      lines.push('');
      writeLine(lines, 'DETAIL', cols - 2, `${accent}${BOLD}`);
      if (entry) detailLines(entry, detailWidth).slice(0, Math.max(1, rows - lines.length - 3)).forEach((line) => {
        lines.push(`${padToWidth(line, detailWidth)}  `);
      });
    } else {
      const details = entry ? detailLines(entry, detailWidth) : [];
      const detailRows = Math.max(listLines.length, details.length);
      for (let row = 0; row < detailRows; row += 1) {
        const left = listLines[row] ?? padToWidth('', listWidth);
        const right = details[row] ?? padToWidth('', detailWidth);
        lines.push(`${left}  ${right}`);
      }
    }

    lines.push('');
    for (const footerLine of wrapText('[↑↓] move  [ENTER] open  [A] all  [W] workshop  [X] archive  [T] themes  [?] help  [Q] quit', cols)) {
      writeLine(lines, footerLine, cols, DIM);
    }
    while (lines.length < rows) lines.push('');
    if (helpVisible) renderHelp(lines, cols, rows);
    terminal.write(lines.slice(0, rows).join('\r\n'));
  }

  function selectEntry(entry: MenuEntry): void {
    if (entry.kind === 'theme') {
      setTheme(entry.id);
      render();
      return;
    }
    if (entry.kind === 'action' && (entry.id === 'all' || entry.id === 'workshop' || entry.id === 'archive' || entry.id === 'appearance')) {
      setSection(entry.id);
      return;
    }
    controller.stop();
    if (entry.kind === 'game') onGameSelect?.(entry.game.id);
    else onActionSelect?.(entry.id);
  }

  function setSection(next: Section): void {
    section = next;
    selectedIndex = 0;
    scrollOffset = 0;
    helpVisible = false;
    render();
  }

  function handleKey(key: string, domEvent: KeyboardEvent): void {
    if (!running) return;
    domEvent.preventDefault();
    domEvent.stopPropagation();
    const lower = key.toLowerCase();
    const entries = currentEntries();

    if (helpVisible) {
      if (key === '?' || key === 'Escape') {
        helpVisible = false;
        render();
      }
      return;
    }

    if (key === '?' ) {
      helpVisible = true;
      render();
      return;
    }
    if (key === 'Escape') {
      if (section !== 'home') setSection('home');
      else { controller.stop(); onQuit?.(); }
      return;
    }
    if (lower === 'q') { controller.stop(); onQuit?.(); return; }
    if (lower === 'a') { setSection('all'); return; }
    if (lower === 'w') { setSection('workshop'); return; }
    if (lower === 'x') { setSection('archive'); return; }
    if (lower === 't') { setSection('appearance'); return; }
    if (lower === 'h') { setSection('home'); return; }

    if (key === 'ArrowUp' || lower === 'k') {
      selectedIndex = (selectedIndex - 1 + entries.length) % Math.max(1, entries.length);
      render();
      return;
    }
    if (key === 'ArrowDown' || lower === 'j') {
      selectedIndex = (selectedIndex + 1) % Math.max(1, entries.length);
      render();
      return;
    }
    if (key === 'Home') { selectedIndex = 0; render(); return; }
    if (key === 'End') { selectedIndex = Math.max(0, entries.length - 1); render(); return; }
    if (key === 'Enter' || key === ' ') {
      const selected = entries[selectedIndex];
      if (selected) selectEntry(selected);
      return;
    }

    const number = Number.parseInt(key, 10);
    if (number >= 1 && number <= 9 && number <= entries.length) {
      selectedIndex = number - 1;
      render();
    }
  }

  setTimeout(() => {
    if (!running) return;
    try {
      if (!enterAlternateBuffer(terminal, 'index')) {
        running = false;
        return;
      }
      render();
      resizeListener = terminal.onResize(() => render());
      keyListener = terminal.onKey(({ key, domEvent }) => handleKey(key, domEvent));
    } catch (error) {
      running = false;
      forceExitAlternateBuffer(terminal, `index-init-error:${String(error)}`);
    }
  }, 50);

  return controller;
}
