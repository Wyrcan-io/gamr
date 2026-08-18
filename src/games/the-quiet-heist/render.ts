import { clipToWidth, padToWidth, centerText } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';
import { briefing, jobLocations, jobTitle, objectiveLabel, planningComparison } from './engine';
import type { GameState, Point } from './types';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
export const QUIET_HEIST_MIN_COLS = 80;
export const QUIET_HEIST_MIN_ROWS = 24;

function row(value: string, width: number, style = ''): string { return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`; }
function center(value: string, width: number): string { return centerText(value, width); }
function mark(point: Point): string { return `${String.fromCharCode(65 + point.x)}${point.y + 1}`; }
function same(a: Point, b: Point): boolean { return a.x === b.x && a.y === b.y; }
function glyphFor(cell: string): string { return cell === '#' ? '#' : cell === 'E' ? '<' : cell === 'S' ? '>' : '.'; }

function resize(cols: number, rows: number, palette: TerminalThemePalette): string {
  return ['\x1b[2J\x1b[H', row('g/ THE QUIET HEIST', cols, `${palette.focus}${BOLD}`), '', center('THE ARCHITECT\'S PLAN NEEDS MORE ROOM.', cols), center(`NEED 80x24  HAVE ${cols}x${rows}`, cols), center('Resize the terminal to keep NOW and AFTER COMMIT legible.', cols)].join('\r\n');
}

function start(cols: number, palette: TerminalThemePalette): string {
  return ['\x1b[2J\x1b[H', row('g/ THE QUIET HEIST', cols, `${palette.focus}${BOLD}`), row('A museum floor plan where the building answers after you commit.', cols, palette.muted), '', row('[T] tutorial   [C] campaign   [Q] quit', cols, palette.focus), row('Plan two actions. Read NOW, PLAN, and AFTER COMMIT as different layers.', cols, palette.ink)].join('\r\n');
}

function briefingFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const lines = [row(`g/ THE QUIET HEIST   ${jobTitle(state)}`, cols, `${palette.focus}${BOLD}`), '', row('BRIEFING / READ THE CONTRACT', cols, palette.warning), ...briefing(state).map(text => row(text, cols - 4, palette.ink)), '', row('ENTER  BEGIN PLANNING     ESC  PAUSE     Q  QUIT', cols, palette.focus)];
  return ['\x1b[2J\x1b[H', ...lines].join('\r\n');
}

function mapRows(state: GameState, compare: ReturnType<typeof planningComparison>, palette: TerminalThemePalette): string[] {
  const locations = jobLocations(state);
  const rows: string[] = [row('ARCHITECT\'S PLAN  [solid NOW] [numbered PLAN] [~ forecast]', 34, `${palette.focus}${BOLD}`)];
  for (let y = 0; y < 8; y += 1) {
    let line = `${palette.muted}${String(y + 1).padStart(2, ' ')} ${RESET}`;
    for (let x = 0; x < 12; x += 1) {
      const point = { x, y };
      const cell = state.grid[y]?.[x] ?? '#';
      const key = `${x},${y}`;
      let glyph = glyphFor(cell);
      let style = palette.ink;
      if (same(point, compare.planned.player)) { glyph = compare.current.player.x === x && compare.current.player.y === y ? '@' : '@2'; style = palette.focus; }
      else if (state.guards.some(guard => same(guard.pos, point))) { glyph = 'G'; style = palette.danger; }
      else if (same(point, state.camera.pos)) { glyph = state.camera.jammed > 0 ? 'c' : 'C'; style = state.camera.jammed > 0 ? palette.muted : palette.warning; }
      else if (!state.keyTaken && same(point, locations.key)) { glyph = 'K'; style = palette.good; }
      else if (!state.asset && same(point, locations.display)) { glyph = 'D'; style = palette.good; }
      else if (state.noise.some(noise => same(noise.pos, point))) { glyph = '~'; style = palette.warning; }
      else if (compare.plannedSight.has(key) && !compare.currentSight.has(key)) { glyph = '+'; style = palette.warning; }
      else if (compare.currentSight.has(key)) { glyph = 'v'; style = palette.danger; }
      else if (compare.forecastSight.has(key)) { glyph = '?'; style = palette.muted; }
      line += `${style}${glyph.padEnd(2, ' ')}${RESET}`;
    }
    rows.push(line);
  }
  rows.push(row('    A B C D E F G H I J K L', 34, palette.muted));
  return rows;
}

function ledgerRows(state: GameState, compare: ReturnType<typeof planningComparison>, width: number, palette: TerminalThemePalette): string[] {
  const rows: string[] = [row('SECURITY LEDGER', width, `${palette.focus}${BOLD}`), row(`NOW      ${mark(compare.current.player)}  sight ${compare.currentSight.size} cells`, width, palette.ink), row(`PLAN     ${mark(compare.planned.player)}  ${state.pending.length ? state.pending.map(action => action.label).join(' / ') : 'no actions queued'}`, width, palette.ink), row(`FORECAST ${state.forecast.map(intent => `${intent.guardId}->${mark(intent.to)} ${intent.reason}`).join(' | ') || 'none'}`, width, palette.muted), row(`AFTER    sight ${compare.plannedSight.size} cells  ${compare.risk}`, width, compare.risk.includes('EXPOSED') ? palette.warning : palette.good), row(`CAMERA   ${state.camera.jammed > 0 ? 'OFFLINE' : `ACTIVE ${state.camera.direction}`}`, width, palette.warning), ''];
  rows.push(row(`OBJECTIVE  ${objectiveLabel(state)}`, width, `${palette.focus}${BOLD}`));
  rows.push(row(`TURN ${state.turn}  AP ${state.ap}/2  ALARM ${state.alarm}/3  DECOYS ${state.decoys}  JAMMERS ${state.jammers}`, width, palette.ink));
  rows.push(row(`NOTICE    ${state.notice}`, width, palette.muted));
  rows.push(row('RESULTS   commit advances guards; planning does not.', width, palette.muted));
  return rows;
}

function helpFrame(cols: number, palette: TerminalThemePalette): string {
  return ['\x1b[2J\x1b[H', row('g/ THE QUIET HEIST / FIELD CARD', cols, `${palette.focus}${BOLD}`), '', row('NOW is the authoritative floor before this turn.', cols - 4, palette.ink), row('PLAN is your queued movement or tool use.', cols - 4, palette.ink), row('AFTER is the guard/camera sight after ENTER resolves.', cols - 4, palette.ink), row('ARROWS/WASD move   I interact   X decoy   J jam', cols - 4, palette.muted), row('U/BACKSPACE undo   ENTER review/commit   ESC close', cols - 4, palette.muted)].join('\r\n');
}

function playing(state: GameState, cols: number, rows: number, palette: TerminalThemePalette): string {
  const compare = planningComparison(state);
  const leftWidth = 35;
  const rightWidth = Math.max(36, cols - leftWidth - 5);
  const left = mapRows(state, compare, palette);
  const right = ledgerRows(state, compare, rightWidth, palette);
  const lines: string[] = ['\x1b[2J\x1b[H', row(`g/ THE QUIET HEIST   ${jobTitle(state)}`, cols, `${palette.focus}${BOLD}`), row(`TURN ${String(state.turn).padStart(2, '0')}  AP ${state.ap}/2  ALARM ${state.alarm}/3  ${objectiveLabel(state)}`, cols, palette.muted), ''];
  const count = Math.max(left.length, right.length);
  for (let i = 0; i < count; i += 1) lines.push(`${padToWidth(left[i] ?? '', leftWidth)}  ${padToWidth(right[i] ?? '', rightWidth)}`);
  lines.push('', row('ARROWS/WASD move  I interact  X decoy  J jam  U/BACKSPACE undo  ENTER commit  ? help  ESC pause', cols, palette.muted));
  if (state.phase === 'review') lines.push(row('[TURN REVIEW] Enter commits the queued actions. Backspace returns to planning.', cols, palette.warning));
  if (state.phase === 'report') lines.push(row('[TURN RESOLVED] Read the changed ledger, then press ENTER to plan.', cols, palette.warning));
  if (state.phase === 'ending' || state.phase === 'gameOver') lines.push(row(state.phase === 'ending' ? '[+] HEIST COMPLETE' : '[!] SECURITY REPORT', cols, state.phase === 'ending' ? palette.good : palette.danger));
  return lines.slice(0, Math.max(1, rows)).join('\r\n');
}

export function renderFrame(state: GameState, cols: number, rows: number, palette: TerminalThemePalette = getCurrentThemePalette()): string {
  if (cols < QUIET_HEIST_MIN_COLS || rows < QUIET_HEIST_MIN_ROWS) return resize(cols, rows, palette);
  if (state.helpOpen) return helpFrame(cols, palette);
  if (state.phase === 'start') return start(cols, palette);
  if (state.phase === 'briefing') return briefingFrame(state, cols, palette);
  return playing(state, cols, rows, palette);
}
