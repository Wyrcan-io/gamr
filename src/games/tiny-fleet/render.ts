import { getCurrentThemeColor } from '../utils';
import { pointKey } from './grid';
import { deriveObservation, hullPips, orderLabel } from './engine';
import type { GameState, Point, ShipState } from './types';

const RESET = '\x1b[0m'; const DIM = '\x1b[2m'; const BRIGHT = '\x1b[1m';
const at = (lines: string[], x: number, y: number, value: string): void => { lines.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${value}`); };
const box = (lines: string[], x: number, y: number, width: number, height: number, title: string, color: string): void => {
  const inner = Math.max(0, width - title.length - 5);
  at(lines, x, y, `${color}┌─ ${title} ${'─'.repeat(inner)}┐${RESET}`);
  for (let row = 1; row < height - 1; row++) at(lines, x, y + row, `${color}│${' '.repeat(Math.max(0, width - 2))}│${RESET}`);
  at(lines, x, y + height - 1, `${color}└${'─'.repeat(Math.max(0, width - 2))}┘${RESET}`);
};
const arrow = (facing: ShipState['facing']): string => ({ N: '↑', E: '→', S: '↓', W: '←' }[facing]);
const shipGlyph = (ship: ShipState): string => ship.side === 'player' ? ship.classId === 'scout' ? 'S' : ship.classId === 'escort' ? 'E' : 'F' : ship.side === 'neutral' ? 'C' : 'P';
const cellText = (point: Point): string => `${String.fromCharCode(65 + point.x)}${point.y + 1}`;

function mapPanel(lines: string[], state: GameState, color: string): void {
  const view = deriveObservation(state, 'player'); const x0 = 4; const y0 = 7;
  box(lines, 2, 5, 25, 14, 'SEA CHART', color);
  at(lines, x0, y0 - 1, `${color}A B C D E F G H I${RESET}`);
  const visible = new Map(view.visibleShips.map(ship => [ship.id, ship]));
  const own = new Map(view.ownShips.map(ship => [ship.id, ship]));
  const possible = new Set(view.tracks.flatMap(track => track.possible.map(pointKey)));
  for (let y = 0; y < 9; y++) {
    at(lines, x0 - 2, y0 + y, `${color}${y + 1}${RESET}`);
    let row = '';
    for (let x = 0; x < 9; x++) {
      const point = { x, y }; const key = pointKey(point); let glyph = state.scenario.terrain[y]?.[x] === 'island' ? '#' : state.scenario.terrain[y]?.[x] === 'fog' ? '~' : '.';
      let style = color;
      if (state.smoke.some(smoke => smoke.pos.x === x && smoke.pos.y === y)) { glyph = 's'; style = '\x1b[1;96m'; }
      if (state.wrecks.some(wreck => wreck.x === x && wreck.y === y)) { glyph = 'x'; style = '\x1b[1;90m'; }
      if (view.objective.controlPoints.some(control => control.x === x && control.y === y)) { glyph = 'o'; style = '\x1b[1;93m'; }
      if (view.objective.point && view.objective.point.x === x && view.objective.point.y === y) { glyph = 'O'; style = '\x1b[1;93m'; }
      if (possible.has(key)) { glyph = ':'; style = '\x1b[1;33m'; }
      for (const ship of [...own.values(), ...visible.values()]) if (ship.pos.x === x && ship.pos.y === y) { glyph = shipGlyph(ship); style = ship.side === 'player' ? '\x1b[1;97m' : ship.side === 'neutral' ? '\x1b[1;92m' : '\x1b[1;91m'; }
      if (state.cursor.x === x && state.cursor.y === y && state.phase === 'planning') { row += `\x1b[7m${glyph} \x1b[0m`; }
      else row += `${style}${glyph}${RESET} `;
    }
    at(lines, x0, y0 + y, row);
  }
}

function fleetPanel(lines: string[], state: GameState, color: string): void {
  box(lines, 28, 5, 49, 8, 'FLEET ORDERS', color);
  const own = state.ships.filter(ship => ship.side === 'player');
  own.forEach((ship, index) => {
    const order = state.orders.player[ship.id];
    const status = ship.afloat ? `${hullPips(ship)} ${ship.reload ? 'RELOAD' : 'READY'}` : 'SUNK';
    at(lines, 30, 7 + index, `${index + 1} ${shipGlyph(ship)}${arrow(ship.facing)} ${ship.id} ${status} ${orderLabel(order).slice(0, 20)}`);
  });
  at(lines, 30, 11, `${color}${Object.keys(state.orders.player).length}/${own.filter(ship => ship.afloat).length} ORDERS SEALED? ${state.phase === 'planning' ? 'NO — EDITING' : 'YES'}${RESET}`);
}

function contactsPanel(lines: string[], state: GameState, color: string): void {
  const view = deriveObservation(state, 'player'); box(lines, 28, 14, 49, 7, 'CONTACTS', color);
  let row = 16;
  for (const ship of view.visibleShips.filter(item => item.side === 'enemy')) {
    at(lines, 30, row++, `${ship.id} EXACT ${cellText(ship.pos)} ${arrow(ship.facing)} ${hullPips(ship)}${ship.reload ? ' RLD' : ''}`.slice(0, 45));
  }
  for (const track of view.tracks.filter(item => !item.exact)) {
    at(lines, 30, row++, `${track.contactId} TRACK ${cellText(track.lastExact)} AGE ${track.age} · ${track.possible.length} CELLS`.slice(0, 45));
  }
  if (row === 16) at(lines, 30, row, `${DIM}${color}NO CONTACTS. WATCH THE LAST KNOWN MARKERS.${RESET}`);
}

function lowerPanel(lines: string[], state: GameState, color: string): void {
  box(lines, 28, 22, 49, 5, state.panel.toUpperCase(), color);
  if (state.panel === 'mission') { at(lines, 30, 24, `${state.objective.text.slice(0, 44)}`); at(lines, 30, 25, `ROUND ${state.round}/${state.roundLimit} · ${state.scenario.mastery.slice(0, 30)}`); return; }
  const items = state.panel === 'log' ? state.log.slice(-2) : state.reports.slice(-2).map(event => event.text);
  items.forEach((text, index) => at(lines, 30, 24 + index, `${text.slice(0, 44)}`));
}

function reportOverlay(lines: string[], state: GameState, color: string): void {
  const title = state.outcome ? (state.outcome === 'victory' ? 'MISSION COMPLETE' : state.outcome === 'draw' ? 'TACTICAL DRAW' : 'MISSION FAILED') : 'ROUND RESOLVED';
  box(lines, 12, 8, 57, 12, title, state.outcome === 'victory' ? '\x1b[1;92m' : state.outcome ? '\x1b[1;91m' : color);
  const report = state.reports.slice(-6);
  report.forEach((event, index) => at(lines, 15, 10 + index, `${event.kind === 'warning' ? '!' : event.kind === 'success' ? '✓' : '·'} ${event.text.slice(0, 50)}`));
  at(lines, 15, 18, state.outcome ? 'ENTER: AFTER-ACTION REPORT' : 'ENTER: NEXT PLANNING ROUND');
}

export function renderFrame(state: GameState, cols: number, rows: number, themeColor = getCurrentThemeColor(), glitchFrame = 0): string {
  const lines: string[] = ['\x1b[2J\x1b[H'];
  if (cols < 80 || rows < 28) { at(lines, Math.max(1, Math.floor(cols / 2) - 10), Math.max(2, Math.floor(rows / 2)), '\x1b[1;91mTERMINAL TOO SMALL' + RESET); at(lines, Math.max(1, Math.floor(cols / 2) - 15), Math.max(3, Math.floor(rows / 2) + 2), `Need 80x28  Have ${cols}x${rows}`); return lines.join(''); }
  const title = '✦ T I N Y  F L E E T ✦'; const offset = glitchFrame % 60 >= 56 ? (glitchFrame % 3) - 1 : 0;
  at(lines, Math.floor((cols - title.length) / 2) + offset, 1, `${themeColor}${BRIGHT}${title}${RESET}`);
  if (state.phase === 'start') { at(lines, 28, 8, `${themeColor}${BRIGHT}THREE SHIPS. ONE SEALED TURN.${RESET}`); at(lines, 30, 11, 'T  TRAINING     P  CAMPAIGN'); at(lines, 30, 13, 'Read the tracks. Predict the fire.'); at(lines, 30, 16, 'Q  QUIT'); return lines.join(''); }
  if (state.phase === 'briefing') { box(lines, 14, 6, 62, 16, state.scenario.title, themeColor); state.scenario.briefing.forEach((text, index) => at(lines, 18, 10 + index * 2, text.slice(0, 54))); at(lines, 18, 17, `OBJECTIVE: ${state.objective.text.slice(0, 44)}`); at(lines, 18, 20, 'ENTER  BEGIN BATTLE     ESC  PAUSE'); return lines.join(''); }
  at(lines, 3, 3, `${themeColor}ROUND ${String(state.round).padStart(2, '0')}/${state.roundLimit}   FLAGS ${'◆'.repeat(state.flags)}${'◇'.repeat(Math.max(0, 3 - state.flags))}   ${state.objective.text.slice(0, 44)}${RESET}`);
  mapPanel(lines, state, themeColor); fleetPanel(lines, state, themeColor); contactsPanel(lines, state, themeColor); lowerPanel(lines, state, themeColor);
  at(lines, 3, 21, `${themeColor}${state.notice.slice(0, 72)}${RESET}`);
  at(lines, 3, 27, `${DIM}${themeColor}[1-3/Tab] ship  arrows aim  WASD helm  F fire  X special  G brace  . hold  Enter seal  I panel  ? help  Esc pause${RESET}`);
  if (state.phase === 'roundReport') reportOverlay(lines, state, themeColor);
  if (state.phase === 'battleReport' || state.phase === 'ending') {
    box(lines, 18, 8, 45, 12, state.campaignComplete ? 'CAMPAIGN COMPLETE' : 'AFTER-ACTION REPORT', state.outcome === 'victory' ? '\x1b[1;92m' : themeColor);
    at(lines, 22, 11, state.campaignComplete ? 'THE LANTERN COAST HOLDS.' : `${state.outcome?.toUpperCase() ?? 'REPORT'} · FLAGS ${state.flags}/3`);
    at(lines, 22, 13, `BATTLE ${state.scenarioIndex} · ${state.scenario.title.slice(11)}`.slice(0, 39));
    at(lines, 22, 15, state.campaignComplete ? 'R RESTART   Q QUIT' : state.outcome === 'victory' ? 'N NEXT BATTLE   R RETRY   Q QUIT' : 'R RETRY   Q QUIT');
  }
  return lines.join('');
}
