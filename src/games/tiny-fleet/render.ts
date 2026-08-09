import { clipToWidth, padToWidth, centerText } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';
import { deriveObservation, hullPips, orderLabel } from './engine';
import { pointKey } from './grid';
import type { GameState, Point, ShipState } from './types';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
export const TINY_FLEET_MIN_COLS = 80;
export const TINY_FLEET_MIN_ROWS = 28;
function row(value: string, width: number, style = ''): string { return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`; }
function center(value: string, width: number): string { return centerText(value, width); }
function arrow(facing: ShipState['facing']): string { return ({ N: '^', E: '>', S: 'v', W: '<' }[facing]); }
function shipGlyph(ship: ShipState): string { return ship.side === 'player' ? ship.classId === 'scout' ? 'S' : ship.classId === 'escort' ? 'E' : 'F' : ship.side === 'neutral' ? 'C' : 'P'; }
function cell(point: Point): string { return `${String.fromCharCode(65 + point.x)}${point.y + 1}`; }

function resize(cols: number, rows: number, palette: TerminalThemePalette): string { return ['\x1b[2J\x1b[H', row('g/ TINY FLEET', cols, `${palette.focus}${BOLD}`), '', center('THE PLOTTING TABLE NEEDS MORE ROOM.', cols), center(`NEED 80x28  HAVE ${cols}x${rows}`, cols), center('Resize before sealing the fleet.', cols)].join('\r\n'); }

function mapRows(state: GameState, palette: TerminalThemePalette): string[] {
  const view = deriveObservation(state, 'player');
  const own = new Map(view.ownShips.map(ship => [ship.id, ship]));
  const visible = new Map(view.visibleShips.map(ship => [ship.id, ship]));
  const tracks = new Set(view.tracks.flatMap(track => track.possible.map(pointKey)));
  const rows = [row('PLOTTING TABLE  [exact] [estimated] [unknown stays unknown]', 44, `${palette.focus}${BOLD}`)];
  for (let y = 0; y < 9; y += 1) {
    let line = `${palette.muted}${String(y + 1).padStart(2, ' ')} ${RESET}`;
    for (let x = 0; x < 9; x += 1) {
      const point = { x, y }; const key = pointKey(point);
      let glyph = state.scenario.terrain[y]?.[x] === 'island' ? '#' : state.scenario.terrain[y]?.[x] === 'fog' ? '~' : '.';
      let style = palette.line;
      if (state.wrecks.some(wreck => wreck.x === x && wreck.y === y)) { glyph = 'x'; style = palette.muted; }
      if (state.smoke.some(smoke => smoke.pos.x === x && smoke.pos.y === y)) { glyph = 's'; style = palette.warning; }
      if (tracks.has(key)) { glyph = ':'; style = palette.warning; }
      for (const ship of [...own.values(), ...visible.values()]) if (ship.pos.x === x && ship.pos.y === y) { glyph = shipGlyph(ship); style = ship.side === 'player' ? palette.focus : palette.danger; }
      if (state.cursor.x === x && state.cursor.y === y && state.phase === 'planning') glyph = `[${glyph}]`;
      line += `${style}${glyph.padEnd(2, ' ')}${RESET}`;
    }
    rows.push(line);
  }
  rows.push(row('    A B C D E F G H I', 44, palette.muted));
  return rows;
}

function contactRows(state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const view = deriveObservation(state, 'player');
  const rows = [row('CONTACT LEDGER', width, `${palette.focus}${BOLD}`)];
  for (const ship of view.visibleShips.filter(item => item.side === 'enemy')) rows.push(row(`${ship.id} EXACT ${cell(ship.pos)} ${arrow(ship.facing)} ${hullPips(ship)}`, width, palette.danger));
  for (const track of view.tracks.filter(item => !item.exact)) rows.push(row(`${track.contactId} ESTIMATE ${cell(track.lastExact)} AGE ${track.age} / ${track.possible.length} CELLS / ${track.source}`, width, palette.warning));
  if (rows.length === 1) rows.push(row('No public contacts. Last known marks remain the evidence.', width, palette.muted));
  return rows;
}

function orderRows(state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const own = state.ships.filter(ship => ship.side === 'player');
  const rows = [row(state.phase === 'orderReview' ? 'SEALED ORDER DOCKET' : 'ORDER CHITS', width, `${palette.focus}${BOLD}`)];
  own.forEach((ship, index) => rows.push(row(`${index + 1} ${shipGlyph(ship)}${arrow(ship.facing)} ${ship.id} ${ship.afloat ? hullPips(ship) : 'SUNK'}  ${orderLabel(state.orders.player[ship.id])}`, width, ship.afloat ? palette.ink : palette.muted)));
  const assigned = Object.keys(state.orders.player).length;
  rows.push(row(`${assigned}/${own.filter(ship => ship.afloat).length} ASSIGNED`, width, assigned === own.filter(ship => ship.afloat).length ? palette.good : palette.warning));
  if (state.phase === 'orderReview') rows.push(row('ENTER seal and resolve  BACKSPACE/ESC edit', width, palette.focus));
  else rows.push(row('ENTER review docket  TAB cycle panel', width, palette.muted));
  return rows;
}

function reportRows(state: GameState, width: number, palette: TerminalThemePalette): string[] {
  const rows = [row(state.outcome ? 'AFTER-ACTION REPORT' : 'ROUND RESOLUTION', width, `${palette.focus}${BOLD}`)];
  state.reports.slice(-7).forEach(event => rows.push(row(`${event.kind === 'warning' ? '[!]' : event.kind === 'success' ? '[+]' : '[.]'} ${event.text}`, width, event.kind === 'warning' ? palette.warning : event.kind === 'success' ? palette.good : palette.ink)));
  rows.push(row(state.outcome ? 'ENTER continue to battle report' : 'ENTER next planning round', width, palette.focus));
  return rows;
}

function playing(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const leftWidth = 46; const rightWidth = Math.max(30, cols - leftWidth - 5);
  const left = mapRows(state, palette);
  const right = state.phase === 'roundReport' || state.phase === 'battleReport' || state.phase === 'ending' ? reportRows(state, rightWidth, palette) : [...orderRows(state, rightWidth, palette), '', ...contactRows(state, rightWidth, palette), '', row(`MISSION ${state.objective.text}`, rightWidth, palette.ink), row(`ROUND ${state.round}/${state.roundLimit}  FLAGS ${state.flags}/3`, rightWidth, palette.muted)];
  const lines = ['\x1b[2J\x1b[H', row('g/ TINY FLEET', cols, `${palette.focus}${BOLD}`), row(`ROUND ${String(state.round).padStart(2, '0')}/${state.roundLimit}  ${state.objective.text}  ${state.notice}`, cols, palette.muted), ''];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) lines.push(`${padToWidth(left[i] ?? '', leftWidth)}  ${padToWidth(right[i] ?? '', rightWidth)}`);
  lines.push('', row('1-3 ship  arrows aim  WASD helm  F fire  X special  G brace  . hold  ENTER review/seal  ? help  ESC pause', cols, palette.muted));
  return lines.slice(0, 28).join('\r\n');
}

export function renderFrame(state: GameState, cols: number, rows: number, palette: TerminalThemePalette = getCurrentThemePalette()): string {
  if (cols < TINY_FLEET_MIN_COLS || rows < TINY_FLEET_MIN_ROWS) return resize(cols, rows, palette);
  if (state.phase === 'start') return ['\x1b[2J\x1b[H', row('g/ TINY FLEET', cols, `${palette.focus}${BOLD}`), '', center('THREE SHIPS. ONE SEALED TURN.', cols), '', row('[T] training   [P/ENTER] campaign   [Q] quit', cols, palette.focus), row('Plot from evidence. Seal the docket. Read the public replay.', cols, palette.ink)].join('\r\n');
  if (state.phase === 'briefing') return ['\x1b[2J\x1b[H', row(`g/ TINY FLEET  ${state.scenario.title}`, cols, `${palette.focus}${BOLD}`), '', ...state.scenario.briefing.map(text => row(text, cols - 4, palette.ink)), '', row('ENTER begin battle  ESC pause', cols, palette.focus)].join('\r\n');
  return playing(state, cols, palette);
}
