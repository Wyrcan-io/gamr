import { actionsForCurrentRoom, currentRoom, episode, formatClock, neighbours } from './engine';
import type { AnchorKind, GameState } from './types';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BRIGHT = '\x1b[1m';
const RED = '\x1b[91m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const CYAN = '\x1b[96m';
const MAGENTA = '\x1b[95m';

const ICONS = {
  loop: '↺', time: '◷', memory: '◉', object: '◆', clue: '◇', anchor: '▣',
  fresh: '✦', actor: '●', room: '□', locked: '×', success: '✓',
};

const esc = '\x1b[';
const pos = (row: number, col: number, text: string): string => `${esc}${row};${Math.max(1, col)}H${text}`;
const repeat = (char: string, count: number): string => char.repeat(Math.max(0, count));
const boxTop = (x: number, y: number, width: number, title: string, color: string): string => pos(y, x, `${color}┌─ ${title} ${repeat('─', width - title.length - 5)}┐${RESET}`);
const boxBottom = (x: number, y: number, width: number, color: string): string => pos(y, x, `${color}└${repeat('─', width - 2)}┘${RESET}`);
const boxSides = (x: number, y: number, width: number, height: number, color: string): string => {
  let out = '';
  for (let row = 1; row < height - 1; row += 1) out += pos(y + row, x, `${color}│${RESET}`) + pos(y + row, x + width - 1, `${color}│${RESET}`);
  return out;
};

function anchorText(state: GameState, kind: AnchorKind): string {
  const id = state.progress.anchors[kind];
  const definition = id ? episode(state).anchors.find(anchor => anchor.id === id) : undefined;
  const icon = kind === 'memory' ? ICONS.memory : kind === 'object' ? ICONS.object : ICONS.clue;
  return `${icon} ${definition?.shortName ?? 'EMPTY'}`;
}

function draftText(state: GameState, kind: AnchorKind): string {
  const id = state.capsuleDraft?.[kind] ?? null;
  const definition = id ? episode(state).anchors.find(anchor => anchor.id === id) : undefined;
  return definition?.shortName ?? 'EMPTY';
}

function clockMeter(state: GameState): string {
  const used = Math.min(10, state.loop.tick);
  return `${ICONS.time} ${formatClock(state.loop.tick)}  ${'●'.repeat(used)}${'·'.repeat(10 - used)}`;
}

function renderStart(cols: number, rows: number, theme: string): string {
  const title = 'T I M E   C A P S U L E';
  const x = Math.max(1, Math.floor((cols - title.length) / 2));
  return `${esc}2J${esc}H${pos(4, x, `${theme}${BRIGHT}${title}${RESET}`)}${pos(7, x + 2, 'The day ends at noon. Three things may cross.')}${pos(9, x + 2, `${CYAN}[T]${RESET} tutorial    ${CYAN}[C]${RESET} campaign    ${CYAN}[Q]${RESET} quit`)}${pos(12, x + 2, `${DIM}A deterministic narrative puzzle about what survives.${RESET}`)}${pos(rows - 2, 3, `${theme}Arrows select   ENTER choose   ESC pause${RESET}`)}`;
}

function renderBriefing(state: GameState, cols: number, rows: number, theme: string): string {
  const out: string[] = [`${esc}2J${esc}H`, pos(2, 3, `${theme}${BRIGHT}THE LAST BELL${RESET}`), pos(3, 3, `${DIM}MERIDIAN CIVIC ARCHIVE // 11:55${RESET}`)];
  const lines = episode(state).synopsis;
  lines.forEach((line, index) => out.push(pos(7 + index, Math.max(3, Math.floor((cols - line.length) / 2)), line)));
  out.push(pos(13, Math.max(3, Math.floor((cols - 42) / 2)), `${CYAN}◉ MEMORY${RESET}  ${YELLOW}◆ OBJECT${RESET}  ${MAGENTA}◇ CLUE${RESET}`));
  out.push(pos(16, Math.max(3, Math.floor((cols - 44) / 2)), `${BRIGHT}[ENTER] BEGIN THE FIVE-MINUTE DAY${RESET}`));
  out.push(pos(rows - 2, 3, `${theme}The clock advances only when you act.${RESET}`));
  return out.join('');
}

function renderMap(state: GameState): string {
  const out: string[] = [];
  const room = currentRoom(state).id;
  const mark = (id: string, text: string): string => id === room ? `${BRIGHT}${YELLOW}[${text}]${RESET}` : `[${text}]`;
  out.push(pos(6, 6, `       ${mark('roof', 'ROOF')}`));
  out.push(pos(7, 6, '          │'));
  out.push(pos(8, 6, `${mark('records', 'REC')}──${mark('atrium', 'ATRIUM')}──${mark('gallery', 'GALLERY')}`));
  out.push(pos(9, 6, '          │'));
  out.push(pos(10, 6, `       ${mark('workshop', 'WORKSHOP')}`));
  out.push(pos(11, 6, '          │'));
  out.push(pos(12, 6, `         ${mark('vault', 'VAULT')}`));
  out.push(pos(14, 5, `${DIM}HERE: ${currentRoom(state).label}${RESET}`));
  out.push(pos(15, 5, `${DIM}EXITS: ${neighbours(state).map(id => episode(state).rooms.find(value => value.id === id)?.label).join(' / ') || 'NONE'}${RESET}`));
  return out.join('');
}

function renderActions(state: GameState, theme: string): string {
  const rows: string[] = [];
  const actions = actionsForCurrentRoom(state);
  if (!actions.length) rows.push(pos(7, 43, `${DIM}No authored action here.${RESET}`));
  actions.slice(0, 5).forEach((entry, index) => {
    const selected = state.focus === 'actions' && state.selection === index;
    const prefix = selected ? `${theme}›${RESET}` : ' ';
    const stateText = entry.available ? `${GREEN}[${entry.action.cost === 0 ? 'free' : `${entry.action.cost * 30}s`}]${RESET}` : `${RED}${ICONS.locked}${RESET}`;
    rows.push(pos(6 + index, 43, `${prefix} ${String(index + 1)}. ${entry.action.label.slice(0, 24).padEnd(24)} ${stateText}`));
    if (!entry.available && selected) rows.push(pos(12, 43, `${RED}${entry.reason.slice(0, 34)}${RESET}`));
  });
  return rows.join('');
}

function renderMain(state: GameState, cols: number, rows: number, theme: string, frame: number): string {
  const out: string[] = [`${esc}2J${esc}H`];
  const glitch = frame % 60 >= 55;
  const title = glitch ? `${RED}T I M E   C A P S U L E${RESET}` : `${theme}${BRIGHT}T I M E   C A P S U L E${RESET}`;
  out.push(pos(1, 3, title));
  out.push(pos(1, Math.max(42, cols - 37), `${theme}LOOP ${String(state.loop.number).padStart(2, '0')}  ${clockMeter(state)}${RESET}`));
  out.push(boxTop(3, 3, 37, 'ARCHIVE MAP', theme), boxSides(3, 3, 37, 14, theme), boxBottom(3, 16, 37, theme));
  out.push(boxTop(41, 3, 37, currentRoom(state).label, theme), boxSides(41, 3, 37, 14, theme), boxBottom(41, 16, 37, theme));
  out.push(renderMap(state), renderActions(state, theme));
  out.push(boxTop(3, 18, 75, 'CAPSULE ANCHORS', theme), boxSides(3, 18, 75, 4, theme), boxBottom(3, 21, 75, theme));
  out.push(pos(20, 6, `${CYAN}${anchorText(state, 'memory')}${RESET}`));
  out.push(pos(20, 31, `${YELLOW}${anchorText(state, 'object')}${RESET}`));
  out.push(pos(20, 56, `${MAGENTA}${anchorText(state, 'clue')}${RESET}`));
  out.push(boxTop(3, 22, 75, 'LAST INCIDENTS', theme), boxSides(3, 22, 75, 5, theme), boxBottom(3, 26, 75, theme));
  state.loop.eventLog.slice(0, 3).forEach((event, index) => out.push(pos(23 + index, 5, `${DIM}T${String(event.tick).padStart(2, '0')}${RESET} ${event.text.slice(0, 67)}`)));
  const hint = state.focus === 'actions' ? 'Arrows select  Enter act  1-5 action  Space wait  J journal  H hint  C end loop  Esc menu' : 'Tab changes focus  Arrows select  Enter confirm  J journal  T timeline  Esc menu';
  out.push(pos(rows - 2, 3, `${theme}${hint.slice(0, cols - 6)}${RESET}`));
  if (state.overlay !== 'none') out.push(renderOverlay(state, cols, rows, theme));
  return out.join('');
}

function renderCapsule(state: GameState, rows: number, theme: string): string {
  const out: string[] = [`${esc}2J${esc}H`, pos(2, 3, `${theme}${BRIGHT}${ICONS.loop} THE DAY IS GONE. THREE THINGS MAY CROSS.${RESET}`), pos(4, 3, `${DIM}Choose a staged replacement, then press C to commit the next loop.${RESET}`)];
  const columns: Array<{ kind: AnchorKind; x: number; color: string }> = [{ kind: 'memory', x: 4, color: CYAN }, { kind: 'object', x: 29, color: YELLOW }, { kind: 'clue', x: 54, color: MAGENTA }];
  columns.forEach(({ kind, x, color }) => {
    out.push(boxTop(x, 7, 22, kind.toUpperCase(), color), boxSides(x, 7, 22, 9, color), boxBottom(x, 15, 22, color));
    out.push(pos(9, x + 2, `${color}${ICONS.anchor} ${draftText(state, kind)}${RESET}`));
    const candidates = episode(state).anchors.filter(anchor => anchor.kind === kind && (state.loop.discoveriesThisLoop.includes(anchor.id) || state.progress.anchors[kind] === anchor.id));
    candidates.slice(0, 3).forEach((candidate, index) => out.push(pos(11 + index, x + 2, `${index + 1}. ${candidate.shortName.slice(0, 17)}`)));
  });
  out.push(pos(18, 4, `${DIM}Current anchors are kept by default. Backspace restores a slot. Empty is allowed.${RESET}`));
  out.push(pos(20, 4, `${CYAN}Tab${RESET} category   ${CYAN}↑↓${RESET} candidate   ${CYAN}C${RESET} commit   ${CYAN}R${RESET} restart episode`));
  out.push(pos(rows - 2, 3, `${theme}The next loop will begin with [${state.progress.anchors.memory ? 'M' : '-'}${state.progress.anchors.object ? 'O' : '-'}${state.progress.anchors.clue ? 'C' : '-'}].${RESET}`));
  return out.join('');
}

function renderReport(state: GameState, cols: number, rows: number, theme: string): string {
  const ending = state.endingId ? episode(state).endings.find(value => value.id === state.endingId) : undefined;
  const out: string[] = [`${esc}2J${esc}H`, pos(3, Math.max(3, Math.floor((cols - 30) / 2)), `${GREEN}${BRIGHT}${ICONS.success} ${ending?.title ?? 'THE LOOP CONTINUES'}${RESET}`)];
  (ending?.summary ?? ['The capsule waits for another choice.']).forEach((line, index) => out.push(pos(7 + index, Math.max(3, Math.floor((cols - line.length) / 2)), line)));
  out.push(pos(14, Math.max(3, Math.floor((cols - 40) / 2)), `${DIM}Loops completed: ${state.progress.loopsCompleted}   Endings: ${state.progress.unlockedEndings.length}${RESET}`));
  out.push(pos(18, Math.max(3, Math.floor((cols - 41) / 2)), `${CYAN}[ENTER]${RESET} continue   ${CYAN}[R]${RESET} restart   ${CYAN}[Q]${RESET} quit`));
  out.push(pos(rows - 2, 3, `${theme}The archive remembers what you chose to carry.${RESET}`));
  return out.join('');
}

function renderOverlay(state: GameState, cols: number, rows: number, theme: string): string {
  const width = Math.min(68, cols - 6);
  const x = Math.max(3, Math.floor((cols - width) / 2));
  const y = 4;
  const out = [pos(y, x, `${theme}┌${repeat('─', width - 2)}┐${RESET}`)];
  for (let row = 1; row < Math.min(rows - y - 2, 18); row += 1) out.push(pos(y + row, x, `${theme}│${RESET}`), pos(y + row, x + width - 1, `${theme}│${RESET}`));
  out.push(pos(y + 18, x, `${theme}└${repeat('─', width - 2)}┘${RESET}`));
  const title = state.overlay === 'journal' ? 'JOURNAL / FADED ECHOES' : state.overlay === 'timeline' ? 'OBSERVED TIMELINE' : 'HELP';
  out.push(pos(y + 1, x + 3, `${theme}${BRIGHT}${title}${RESET}`));
  if (state.overlay === 'journal') {
    const entries = episode(state).anchors.filter(anchor => state.progress.discovered.includes(anchor.id) || state.progress.anchors[anchor.kind] === anchor.id);
    entries.slice(0, 12).forEach((entry, index) => {
      const active = state.progress.anchors[entry.kind] === entry.id;
      out.push(pos(y + 3 + index, x + 3, `${active ? ICONS.anchor : ICONS.fresh} ${entry.shortName.padEnd(20)} ${active ? entry.journal : `${entry.lead} [FADED]`}`.slice(0, width - 6)));
    });
  } else if (state.overlay === 'timeline') {
    episode(state).scheduledEvents.slice(0, 12).forEach((event, index) => out.push(pos(y + 3 + index, x + 3, `T${String(event.tick).padStart(2, '0')}  ${event.text}`.slice(0, width - 6))));
  } else {
    ['The clock advances only on actions.', 'Memory changes who trusts you.', 'Object changes what you can carry.', 'Clue changes what you can prove.', 'Esc closes this panel.'].forEach((line, index) => out.push(pos(y + 4 + index, x + 3, line)));
  }
  return out.join('');
}

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, frame = 0): string {
  if (cols < 80 || rows < 28) return `${esc}2J${esc}H${pos(Math.max(2, Math.floor(rows / 2)), 3, `${YELLOW}Terminal too small. Need 80x28; have ${cols}x${rows}.${RESET}`)}`;
  if (state.phase === 'start') return renderStart(cols, rows, theme);
  if (state.phase === 'briefing') return renderBriefing(state, cols, rows, theme);
  if (state.phase === 'capsule') return renderCapsule(state, rows, theme);
  if (state.phase === 'report' || state.phase === 'ending') return renderReport(state, cols, rows, theme);
  return renderMain(state, cols, rows, theme, frame);
}

export { ICONS };
