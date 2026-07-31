import { tileGlyph, selectedTrainForState } from './engine';
import type { GameState, Point, Tile, Train } from './types';

const RESET = '\x1b[0m'; const DIM = '\x1b[2m'; const RED = '\x1b[91m'; const GREEN = '\x1b[92m'; const YELLOW = '\x1b[93m'; const CYAN = '\x1b[96m';
const MAP_X = 3; const MAP_Y = 5; const CELL_W = 3;
function put(out: string[], x: number, y: number, value: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${value}`); }
function center(out: string[], cols: number, y: number, value: string, color: string): void { put(out, Math.max(1, Math.floor((cols - value.length) / 2) + 1), y, color + value + RESET); }
function trainAt(trains: Record<string, Train>, point: Point): Train | undefined { return Object.values(trains).find(train => train.status !== 'evacuated' && train.position.x === point.x && train.position.y === point.y); }
function tileColor(tile: Tile): string { if (tile.closed) return RED; if (tile.obstruction) return YELLOW; if (tile.safeTerminus) return GREEN; if (tile.station) return CYAN; return ''; }
function bar(value: number, max: number, width: number): string { const filled = Math.round((Math.max(0, value) / Math.max(1, max)) * width); return '■'.repeat(filled) + '·'.repeat(width - filled); }
function eventColor(tone: string | undefined): string { return tone === 'good' ? GREEN : tone === 'warn' ? YELLOW : tone === 'bad' ? RED : ''; }

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, glitchFrame: number): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < 80 || rows < 28) { center(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'TERMINAL TOO SMALL', RED + '\x1b[1m'); center(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED 80x28  HAVE ${cols}x${rows}`, DIM + theme); return out.join(''); }
  const offset = glitchFrame % 60 >= 56 ? (glitchFrame % 3) - 1 : 0;
  put(out, Math.max(1, Math.floor((cols - 39) / 2) + 1 + offset), 1, theme + '\x1b[1m✦ LAST TRAIN HOME ✦' + RESET);
  put(out, 3, 3, `${theme}TURN ${String(state.turn).padStart(2, '0')}/${String(state.maxTurns).padStart(2, '0')}   EVACUATED ${state.evacuatedPeople}/${state.targetPeople}   SUPPLIES ${state.evacuatedSupplies}/${state.targetSupplies}   ACTIONS ${'◆'.repeat(state.actionPoints)}${'◇'.repeat(2 - state.actionPoints)}${RESET}`);
  if (state.phase === 'start') { center(out, cols, 9, 'RUN THE RAILWAY. BRING EVERYONE HOME.', CYAN + '\x1b[1m'); center(out, cols, 12, 'P: CAMPAIGN    T: TUTORIAL    Q: QUIT', DIM + theme); return out.join(''); }
  if (state.phase === 'briefing') { center(out, cols, 7, `${state.scenario.name.toUpperCase()} // BRIEFING`, YELLOW + '\x1b[1m'); state.scenario.briefing.forEach((line, i) => put(out, 8, 11 + i * 2, `${YELLOW}${i + 1}.${RESET} ${line}`)); center(out, cols, 23, 'ENTER: OPEN DISPATCH', CYAN + '\x1b[1m'); return out.join(''); }
  if (state.phase === 'ending' || state.phase === 'gameOver') { const won = state.phase === 'ending'; center(out, cols, 8, won ? '✓ EXTRACTION COMPLETE' : '⚠ LINE LOST', won ? GREEN + '\x1b[1m' : RED + '\x1b[1m'); center(out, cols, 11, `${state.evacuatedPeople} PEOPLE SAFE   ${state.evacuatedSupplies} SUPPLIES DELIVERED`, theme); state.eventLog.slice(0, 3).forEach((entry, i) => center(out, cols, 14 + i, entry.text, eventColor(entry.tone) || theme)); center(out, cols, 22, 'R: RESTART   Q: QUIT   N: NEXT GAME', DIM + theme); return out.join(''); }
  for (let y = 0; y < state.scenario.height; y++) for (let x = 0; x < state.scenario.width; x++) {
    const point = { x, y }; const tile = state.scenario.tiles[y][x]; const selected = state.selected.kind === 'tile' && state.selected.point.x === x && state.selected.point.y === y; const train = trainAt(state.trains, point); let text = tileGlyph(tile); let color = tileColor(tile);
    if (train) { text = ` ${train.id} `; color = train.status === 'blocked' ? RED : train.priority === 1 ? '\x1b[1m' : theme; }
    if (selected) text = `\x1b[7m${text}${RESET}`;
    put(out, MAP_X + x * CELL_W, MAP_Y + y, color + text + RESET);
  }
  const panel = MAP_X + state.scenario.width * CELL_W + 4; const selectedTrain = selectedTrainForState(state);
  put(out, panel, MAP_Y, `${theme}\x1b[1mDISPATCH${RESET}`); put(out, panel, MAP_Y + 2, `${theme}ACTIONS${RESET}`); put(out, panel, MAP_Y + 3, `${state.actionPoints > 0 ? GREEN : DIM}1 SWITCH   2 HOLD${RESET}`); put(out, panel, MAP_Y + 4, `${state.actionPoints > 0 ? GREEN : DIM}3 REPAIR  4 CLEAR${RESET}`); put(out, panel, MAP_Y + 6, `${theme}FORECAST${RESET}`);
  state.forecast.slice(0, 3).forEach((event, i) => put(out, panel, MAP_Y + 7 + i, `${YELLOW}! T${event.turn} ${event.kind.toUpperCase()}${RESET}`));
  if (selectedTrain) { put(out, panel, MAP_Y + 12, `${CYAN}\x1b[1mTRAIN ${selectedTrain.id}${RESET}`); put(out, panel, MAP_Y + 13, `${selectedTrain.name.slice(0, 25)}`); put(out, panel, MAP_Y + 14, `PEOPLE ${selectedTrain.people}  LOAD ${selectedTrain.supplies}`); put(out, panel, MAP_Y + 15, `STATUS ${selectedTrain.status.toUpperCase()}`); }
  put(out, 3, 18, `${theme}EVACUATION ${bar(state.evacuatedPeople, state.targetPeople, 18)}${RESET}`); state.eventLog.slice(0, 3).forEach((entry, i) => put(out, 3, 20 + i, `${eventColor(entry.tone)}${entry.text.slice(0, 48)}${RESET}`));
  if (state.phase === 'turnReport' && state.lastResolution) { center(out, cols, 24, 'TURN RESOLVED — ENTER TO PLAN NEXT TURN', YELLOW + '\x1b[1m'); }
  else put(out, 3, 25, `${DIM}${theme}ARROWS MOVE  TAB TRAINS  1-4 ACTIONS  R ROUTE  SPACE COMMIT  H HELP  ESC PAUSE${RESET}`);
  if (state.helpOpen) { put(out, Math.floor(cols / 2) - 25, 8, `${CYAN}\x1b[1mHELP — TWO ACTIONS, THEN COMMIT${RESET}`); put(out, Math.floor(cols / 2) - 25, 10, 'Select a tile or train, issue orders, then press SPACE.'); put(out, Math.floor(cols / 2) - 25, 11, 'Trains move one segment before hazards resolve.'); put(out, Math.floor(cols / 2) - 25, 12, 'Warnings marked ! can be repaired before their turn.'); }
  return out.join('');
}
