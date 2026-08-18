import { displayWidth, padToWidth, clipToWidth } from '../../ui/terminal';
import { getThemePalette, type TerminalThemePalette } from '../utils';
import { projectTurn, tileGlyph } from './engine';
import type { GameState, Point, Tile, Train } from './types';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MIN_COLS = 80;
const MIN_ROWS = 24;
const MAP_X = 3;
const MAP_Y = 6;
const CELL_W = 3;

function put(out: string[], x: number, y: number, value: string): void {
  out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${clipToWidth(value, Math.max(0, 80 - Math.max(1, x)), '')}`);
}
function line(value: string, width: number, color = ''): string { return `${color}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`; }
function centered(out: string[], cols: number, y: number, value: string, color: string): void {
  const text = clipToWidth(value, cols - 2, '');
  put(out, Math.max(1, Math.floor((cols - displayWidth(text)) / 2) + 1), y, `${color}${text}${RESET}`);
}
function trainAt(trains: Record<string, Train>, point: Point): Train | undefined { return Object.values(trains).find(train => train.status !== 'evacuated' && train.position.x === point.x && train.position.y === point.y); }
function tileStyle(tile: Tile, palette: TerminalThemePalette): string { if (tile.closed) return palette.danger; if (tile.obstruction) return palette.warning; if (tile.safeTerminus) return palette.good; if (tile.station) return palette.focus; return palette.ink; }
function forecastIcon(kind: string): string { return kind === 'flood' ? '~' : kind === 'fire' ? '!' : kind === 'landslide' ? '#' : '?'; }

export function renderFrame(state: GameState, cols: number, rows: number, palette = getThemePalette()): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < MIN_COLS || rows < MIN_ROWS) {
    centered(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'DISPATCH NEEDS MORE ROOM', `${palette.danger}${BOLD}`);
    centered(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED ${MIN_COLS}x${MIN_ROWS}  HAVE ${cols}x${rows}`, palette.muted);
    return out.join('');
  }
  put(out, 3, 1, `${palette.focus}${BOLD}g/ LAST TRAIN HOME${RESET}`);
  put(out, 28, 1, line(`${state.scenario.name.toUpperCase()}  SCENARIO ${state.scenarioIndex + 1}/2`, 34, palette.muted));
  put(out, 3, 3, line(`TURN ${String(state.turn).padStart(2, '0')}/${state.maxTurns}  PEOPLE ${state.evacuatedPeople}/${state.targetPeople}  SUPPLIES ${state.evacuatedSupplies}/${state.targetSupplies}  AP ${state.actionPoints}/2`, cols - 6, palette.ink));
  if (state.helpOpen) { helpFrame(out, cols, palette); return out.join(''); }
  if (state.phase === 'start') return startFrame(out, cols, palette);
  if (state.phase === 'briefing') return briefingFrame(out, cols, state, palette);
  if (state.phase === 'ending' || state.phase === 'gameOver') return endingFrame(out, cols, state, palette);
  if (state.phase === 'turnReport') reportFrame(out, cols, state, palette, rows);
  else planningFrame(out, cols, state, palette, rows);
  return out.join('');
}

function startFrame(out: string[], cols: number, palette: TerminalThemePalette): string {
  centered(out, cols, 9, 'MOVE THE RAILWAY ONE DECISION AT A TIME', `${palette.focus}${BOLD}`);
  centered(out, cols, 12, 'Read the forecast. Set the line. Bring people and supplies home.', palette.ink);
  centered(out, cols, 16, '[P] CAMPAIGN    [T] THREE-TURN TUTORIAL    [Q] QUIT', palette.muted);
  return out.join('');
}

function briefingFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string {
  centered(out, cols, 7, `${state.mode === 'tutorial' ? 'DISPATCH INDUCTION' : 'SCENARIO BRIEF'} // ${state.scenario.name.toUpperCase()}`, `${palette.focus}${BOLD}`);
  state.scenario.briefing.slice(0, 5).forEach((text, i) => put(out, 8, 11 + i * 2, `${palette.ink}${i + 1}. ${clipToWidth(text, cols - 16)}${RESET}`));
  centered(out, cols, 23, state.mode === 'tutorial' ? tutorialObjective(state.tutorialStep ?? 0) : 'ENTER  OPEN DISPATCH', `${palette.good}${BOLD}`);
  return out.join('');
}

function tutorialObjective(step: number): string { return ['TUTORIAL 1/3  Select the marked junction, switch it, then commit.', 'TUTORIAL 2/3  TAB to the medical train and hold it for one turn.', 'TUTORIAL 3/3  Select a forecast tile, reinforce it, then commit.', 'INDUCTION COMPLETE  ENTER  continue.'][Math.min(3, step)]!; }

function planningFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette, rows: number): void {
  drawMap(out, state, palette);
  const panel = MAP_X + state.scenario.width * CELL_W + 4;
  put(out, panel, MAP_Y, `${palette.focus}${BOLD}TIMETABLE${RESET}`);
  const activeTrains = Object.values(state.trains).filter(train => train.status !== 'evacuated');
  activeTrains.slice(0, 4).forEach((train, i) => {
    const selected = state.selected.kind === 'train' && state.selected.trainId === train.id;
    put(out, panel, MAP_Y + 2 + i * 3, line(`${selected ? '>' : ' '} ${train.id} ${train.status.toUpperCase()}`, 29, selected ? palette.focus : train.status === 'blocked' ? palette.danger : palette.ink));
    put(out, panel, MAP_Y + 3 + i * 3, line(`  ${train.people} people  ${train.supplies} load`, 29, palette.muted));
  });
  put(out, panel, MAP_Y + 15, `${palette.warning}${BOLD}HAZARD FORECAST${RESET}`);
  state.forecast.slice(0, 4).forEach((event, i) => put(out, panel, MAP_Y + 17 + i, line(`${forecastIcon(event.kind)} T${event.turn} ${event.kind.toUpperCase()} @${event.target.x},${event.target.y}`, 29, palette.warning)));
  const projection = projectTurn(state);
  put(out, 3, 19, `${palette.focus}${BOLD}NEXT COMMIT${RESET}`);
  projection.trains.slice(0, 4).forEach((train, i) => put(out, 3, 20 + i, line(`${train.id} ${train.outcome.toUpperCase()}${train.to ? ` -> ${train.to.x},${train.to.y}` : ''}`, 38, train.outcome === 'block' ? palette.danger : palette.ink)));
  put(out, 44, 19, `${palette.focus}${BOLD}EVENT TAPE${RESET}`);
  state.eventLog.slice(0, 4).forEach((event, i) => put(out, 44, 20 + i, line(`${event.tone === 'bad' ? '[x]' : event.tone === 'warn' ? '[!]' : event.tone === 'good' ? '[+]' : '[ ]'} ${event.text}`, cols - 46, event.tone === 'bad' ? palette.danger : event.tone === 'warn' ? palette.warning : event.tone === 'good' ? palette.good : palette.muted)));
  const footerRow = Math.max(1, rows - 1);
  if (state.mode === 'tutorial' && state.tutorialStep !== null) put(out, 3, footerRow, line(tutorialObjective(state.tutorialStep), cols - 6, palette.focus));
  else put(out, 3, footerRow, line('ARROWS MOVE  TAB TRAINS  1 SWITCH  2 HOLD  3 REPAIR  4 CLEAR  SPACE COMMIT  ? HELP  ESC PAUSE', cols - 6, palette.muted));
}

function drawMap(out: string[], state: GameState, palette: TerminalThemePalette): void {
  for (let y = 0; y < state.scenario.height; y++) for (let x = 0; x < state.scenario.width; x++) {
    const point = { x, y };
    const tile = state.scenario.tiles[y]![x]!;
    const selected = state.selected.kind === 'tile' && state.selected.point.x === x && state.selected.point.y === y;
    const train = trainAt(state.trains, point);
    let text = tileGlyph(tile);
    let color = tileStyle(tile, palette);
    if (train) { text = ` ${train.id} `; color = train.status === 'blocked' ? palette.danger : train.priority === 1 ? palette.focus : palette.ink; }
    if (selected) text = `\x1b[7m${text}${RESET}`;
    put(out, MAP_X + x * CELL_W, MAP_Y + y, `${color}${text}${RESET}`);
  }
}

function reportFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette, rows: number): void {
  put(out, 3, 19, `${palette.warning}${BOLD}TURN ${state.turn - 1} RESOLUTION${RESET}`);
  state.lastResolution?.events.slice(0, 5).forEach((event, i) => put(out, 3, 21 + i, line(`${event.tone === 'bad' ? '[x]' : event.tone === 'warn' ? '[!]' : event.tone === 'good' ? '[+]' : '[ ]'} ${event.text}`, cols - 6, event.tone === 'bad' ? palette.danger : event.tone === 'warn' ? palette.warning : event.tone === 'good' ? palette.good : palette.ink)));
  centered(out, cols, Math.max(1, rows - 1), 'ENTER  RETURN TO DISPATCH', palette.muted);
}

function endingFrame(out: string[], cols: number, state: GameState, palette: TerminalThemePalette): string {
  const won = state.phase === 'ending';
  centered(out, cols, 8, won ? '[+] EXTRACTION COMPLETE' : '[x] LINE LOST', `${won ? palette.good : palette.danger}${BOLD}`);
  centered(out, cols, 11, `${state.evacuatedPeople} PEOPLE SAFE  ${state.evacuatedSupplies} SUPPLIES DELIVERED`, palette.ink);
  centered(out, cols, 15, state.mode === 'tutorial' ? 'TUTORIAL COMPLETE' : won ? `SCENARIO ${state.scenarioIndex + 1}/2 COMPLETE` : (state.eventLog[0]?.text ?? 'LINE LOST'), palette.focus);
  centered(out, cols, 21, `R RESTART   ${won && state.scenarioIndex === 0 ? 'N NEXT SCENARIO   ' : ''}Q QUIT`, palette.muted);
  return out.join('');
}

function helpFrame(out: string[], cols: number, palette: TerminalThemePalette): void {
  const width = Math.min(68, cols - 10);
  const x = Math.floor((cols - width) / 2) + 1;
  put(out, x, 7, `${palette.focus}${BOLD}g/ LAST TRAIN HOME / DISPATCH CARD${RESET}`);
  ['Select a junction before Switch; select a train before Hold.', 'Repair a forecast tile before its turn resolves.', 'NEXT COMMIT shows projected movement and hazard outcomes.', 'A blocked train waits. A train on H arrives home.', 'Escape closes this card or opens the shared pause menu.', 'The forecast is ordered by turn, then map coordinate.'].forEach((text, i) => put(out, x, 10 + i, line(text, width, palette.ink)));
  put(out, x, 18, line('Press ? or H to close.', width, palette.muted));
}
