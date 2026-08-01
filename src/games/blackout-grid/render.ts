import { DISTRICT_CONTENT } from './content';
import { closePreview, districtContent, selectedAsset, serviceRatioForState } from './engine';
import type { GameState, GridEdge, GridNode, Point } from './types';
import { GRID_HEIGHT, GRID_WIDTH } from './types';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[91m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const CYAN = '\x1b[96m';
const MAGENTA = '\x1b[95m';
const MAP_X = 3;
const MAP_Y = 6;
const CELL_W = 3;

function put(out: string[], x: number, y: number, text: string): void { out.push(`\x1b[${Math.max(1, y)};${Math.max(1, x)}H${text}`); }
function center(out: string[], cols: number, y: number, text: string, color = ''): void { put(out, Math.max(1, Math.floor((cols - text.length) / 2) + 1), y, color + text + RESET); }
function meter(value: number, max: number, width: number): string { const filled = Math.round(clamp(value / Math.max(1, max), 0, 1) * width); return '■'.repeat(filled) + '·'.repeat(width - filled); }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function nodeAt(state: GameState, point: Point): GridNode | undefined { return Object.values(state.nodes).find(node => node.position.x === point.x && node.position.y === point.y); }
function edgeAt(state: GameState, point: Point): GridEdge | undefined { return Object.values(state.edges).find(edge => edge.route.some(item => item.x === point.x && item.y === point.y)); }
function selected(state: GameState, kind: 'node' | 'edge', id: string): boolean { return state.selected.kind === kind && state.selected.id === id; }

function routeGlyph(edge: GridEdge, index: number): string {
  if (edge.condition === 'faulted') return ' x ';
  if (edge.condition === 'repairing') return ' + ';
  const point = edge.route[index];
  const previous = edge.route[index - 1]; const next = edge.route[index + 1];
  const dirs: string[] = [];
  for (const other of [previous, next]) {
    if (!other) continue;
    if (other.x < point.x) dirs.push('W'); else if (other.x > point.x) dirs.push('E'); else if (other.y < point.y) dirs.push('N'); else if (other.y > point.y) dirs.push('S');
  }
  const key = dirs.sort().join('');
  const glyphs: Record<string, string> = { E: '───', W: '───', EW: '───', NS: ' │ ', EN: '└─ ', ES: '┌─ ', NW: ' ┘ ', SW: ' ┐ ', ENS: '┴─ ', ENW: '┴─ ', ESW: '┬─ ', NSW: '┤  ', ENSW: '┼─ ' };
  const base = glyphs[key] ?? ' · ';
  if (edge.breaker === 'tripped') return RED + ' x ' + RESET;
  if (edge.breaker === 'open') return DIM + base + RESET;
  if (edge.heat >= 70) return YELLOW + base + RESET;
  return edge.energized ? CYAN + base + RESET : DIM + base + RESET;
}

function nodeGlyph(node: GridNode): string {
  if (node.kind === 'bulk-source') return node.sourceOnline ? '◆' : '×';
  if (node.kind === 'substation') return node.heat >= 70 ? '!' : '◇';
  if (node.kind === 'microgrid') return node.generator?.online ? '▣' : '□';
  if (node.district) return DISTRICT_CONTENT[node.district.kind].short;
  return '○';
}

function nodeColor(node: GridNode): string {
  if (node.kind === 'bulk-source' && !node.sourceOnline) return RED;
  if (node.kind === 'substation' && node.heat >= 70) return YELLOW;
  if (node.district?.powered) return GREEN + BOLD;
  if (node.district && node.district.serviceBreaker === 'closed') return YELLOW;
  if (node.kind === 'microgrid' && node.generator?.online) return MAGENTA + BOLD;
  return DIM;
}

function lineForCell(state: GameState, point: Point): string {
  const node = nodeAt(state, point);
  if (node) {
    const glyph = nodeGlyph(node);
    const text = ` ${glyph} `;
    return selected(state, 'node', node.id) ? `\x1b[7m${text}${RESET}` : nodeColor(node) + text + RESET;
  }
  const edge = edgeAt(state, point);
  if (!edge) return '   ';
  const index = edge.route.findIndex(item => item.x === point.x && item.y === point.y);
  let text = routeGlyph(edge, index);
  if (index === Math.floor(edge.route.length / 2)) text = edge.breaker === 'closed' ? (edge.energized ? `${CYAN}●${RESET}` : ' ● ') : `${DIM}○${RESET}`;
  if (selected(state, 'edge', edge.id)) text = `\x1b[7m${text}${RESET}`;
  return text;
}

function selectedDetails(state: GameState, out: string[], x: number, y: number, theme: string): void {
  const item = selectedAsset(state);
  if (item.edge) {
    const edge = item.edge;
    const preview = edge.breaker !== 'closed' && edge.condition === 'intact' ? closePreview(state, edge.id) : undefined;
    put(out, x, y, `${theme}${BOLD}${edge.label.slice(0, 26)}${RESET}`);
    put(out, x, y + 1, `STATE ${edge.condition.toUpperCase()} / ${edge.breaker.toUpperCase()}`);
    put(out, x, y + 2, `LOAD  ${Math.round(edge.flowMW)} / ${Math.round(edge.capacityMW)} MW`);
    put(out, x, y + 3, `HEAT  [${meter(edge.heat, 100, 12)}] ${Math.round(edge.heat)}%`);
    put(out, x, y + 4, `FROM  ${state.nodes[edge.from]?.label.slice(0, 20) ?? edge.from}`);
    put(out, x, y + 5, `TO    ${state.nodes[edge.to]?.label.slice(0, 20) ?? edge.to}`);
    if (preview?.ok) put(out, x, y + 6, `CLOSE PREVIEW: ${Math.round(preview.worstUtilization * 100)}% PEAK`);
    else if (preview?.reason) put(out, x, y + 6, `${YELLOW}${preview.reason.slice(0, 28)}${RESET}`);
    return;
  }
  if (item.node) {
    const node = item.node;
    put(out, x, y, `${theme}${BOLD}${node.label.slice(0, 26)}${RESET}`);
    put(out, x, y + 1, `TYPE  ${node.kind.toUpperCase()}`);
    if (node.district) {
      const content = districtContent(node.district.kind);
      put(out, x, y + 2, `LOAD  ${Math.round(node.district.requestedMW)} MW / ${content.baseDemandMW} MW`);
      put(out, x, y + 3, `STATE ${node.district.serviceBreaker.toUpperCase()} / ${node.district.powered ? 'POWERED' : 'DARK'}`);
      put(out, x, y + 4, node.district.pickupBeatsRemaining > 0 ? `PICKUP ${node.district.pickupBeatsRemaining} BEATS` : 'PICKUP SETTLED');
      put(out, x, y + 5, `STRAIN ${node.district.strainPerDarkBeat.toFixed(2)} / BEAT`);
    } else {
      put(out, x, y + 2, `FLOW  ${Math.round(node.flowMW)} / ${Math.round(node.capacityMW)} MW`);
      put(out, x, y + 3, `HEAT  [${meter(node.heat, 100, 12)}] ${Math.round(node.heat)}%`);
      if (node.generator) put(out, x, y + 4, `FUEL  ${Math.round(node.generator.fuel)}  ${node.generator.online ? 'ONLINE' : 'OFFLINE'}`);
    }
    return;
  }
  put(out, x, y, `${theme}CELL ${state.selected.kind === 'cell' ? `${state.selected.point.x},${state.selected.point.y}` : '—'}${RESET}`);
  put(out, x, y + 1, 'TAB TO CYCLE ASSETS');
}

function renderStart(out: string[], cols: number, theme: string): void {
  center(out, cols, 8, 'RESTORE THE CITY. HOLD THE LOAD.', CYAN + BOLD);
  center(out, cols, 11, 'A STORM HAS SPLIT LUMEN INTO DARK ISLANDS.', theme);
  center(out, cols, 13, 'REPAIR FEEDERS  ·  OPEN/CLOSE BREAKERS  ·  SHED LOAD', theme);
  center(out, cols, 17, 'P: STANDARD RESTORATION    T: TUTORIAL    Q: QUIT', DIM + theme);
}

function renderBriefing(state: GameState, out: string[], cols: number, theme: string): void {
  void theme;
  const stage = state.stages[state.stageIndex];
  center(out, cols, 7, `${stage.name} // DISPATCH BRIEFING`, YELLOW + BOLD);
  stage.briefing.forEach((line, index) => put(out, 8, 11 + index * 2, `${YELLOW}${index + 1}.${RESET} ${line}`));
  center(out, cols, 23, 'ENTER: OPEN GRID', CYAN + BOLD);
}

function renderEnd(state: GameState, out: string[], cols: number, theme: string): void {
  const won = state.phase === 'won';
  center(out, cols, 8, won ? '✓ SHIFT COMPLETE — CITY STABLE' : '⚠ CIVIC STRAIN 100 — CITY DARK', won ? GREEN + BOLD : RED + BOLD);
  center(out, cols, 11, `SCORE ${state.score}   MAX STRAIN ${Math.round(state.maximumStrain)}   MAX HEAT ${Math.round(state.maxHeat)}`, theme);
  center(out, cols, 13, `FEEDER TRIPS ${state.feederTrips}   SOURCE TRIPS ${state.sourceTrips}`, theme);
  state.eventLog.slice(0, 3).forEach((entry, index) => center(out, cols, 16 + index, entry.text.slice(0, 72), entry.tone === 'bad' ? RED : entry.tone === 'good' ? GREEN : theme));
  center(out, cols, 23, 'R: RESTART SAME SEED    Q: QUIT    N: NEXT GAME', DIM + theme);
}

function renderUpgrade(state: GameState, out: string[], cols: number, theme: string, upgrades: string[]): void {
  center(out, cols, 8, 'STAGE CLEAR — CHOOSE ONE UPGRADE', YELLOW + BOLD);
  state.stages[state.stageIndex + 1]?.briefing.slice(0, 1).forEach(line => center(out, cols, 10, line, theme));
  const start = Math.max(0, Math.floor(cols / 2) - 31);
  upgrades.slice(0, 3).forEach((choice, index) => put(out, start, 13 + index * 3, `${YELLOW}${index + 1}.${RESET} ${choice.slice(0, 54)}`));
  put(out, start, 22, `${DIM}Choose an upgrade with 1, 2, or 3.${RESET}`);
}

export function renderFrame(state: GameState, cols: number, rows: number, theme: string, glitchFrame: number, upgrades: string[] = [], message = ''): string {
  const out: string[] = ['\x1b[2J\x1b[H'];
  if (cols < 80 || rows < 28) { center(out, cols, Math.max(2, Math.floor(rows / 2) - 1), 'TERMINAL TOO SMALL', RED + BOLD); center(out, cols, Math.max(3, Math.floor(rows / 2) + 1), `NEED 80x28  HAVE ${cols}x${rows}`, DIM + theme); return out.join(''); }
  const titleOffset = glitchFrame % 60 >= 56 ? (glitchFrame % 3) - 1 : 0;
  put(out, Math.max(1, Math.floor((cols - 23) / 2) + 1 + titleOffset), 1, `${theme}${BOLD}◆ BLACKOUT GRID ◆${RESET}`);
  const stage = state.stages[state.stageIndex];
  put(out, 3, 3, `${theme}STAGE ${String(state.stageIndex + 1).padStart(2, '0')}/05  STRAIN [${meter(state.civicStrain, 100, 14)}] ${Math.round(state.civicStrain)}  STABLE ${state.stabilityBeats}/${stage.holdBeats}  FOCUS ${'◆'.repeat(state.focusCharges)}${RESET}`);
  if (state.phase === 'start') { renderStart(out, cols, theme); return out.join(''); }
  if (state.phase === 'briefing') { renderBriefing(state, out, cols, theme); return out.join(''); }
  if (state.phase === 'upgrade') { renderUpgrade(state, out, cols, theme, upgrades); return out.join(''); }
  if (state.phase === 'won' || state.phase === 'gameOver') { renderEnd(state, out, cols, theme); return out.join(''); }
  else {
    for (let y = 0; y < GRID_HEIGHT; y++) for (let x = 0; x < GRID_WIDTH; x++) put(out, MAP_X + x * CELL_W, MAP_Y + y, lineForCell(state, { x, y }));
    const panel = MAP_X + GRID_WIDTH * CELL_W + 4;
    put(out, panel, MAP_Y, `${theme}${BOLD}OPERATIONS${RESET}`);
    put(out, panel, MAP_Y + 2, `${theme}1 SWITCH  2 REPAIR${RESET}`);
    put(out, panel, MAP_Y + 3, `${theme}3 LOAD    4 GENERATOR${RESET}`);
    put(out, panel, MAP_Y + 5, `${theme}${BOLD}SELECTED${RESET}`);
    selectedDetails(state, out, panel, MAP_Y + 6, theme);
    put(out, panel, MAP_Y + 14, `${theme}${BOLD}FORECAST${RESET}`);
    state.forecast.slice(0, 2).forEach((item, index) => put(out, panel, MAP_Y + 15 + index, `${YELLOW}! T+${String(item.impactTick).padStart(2, '0')} ${item.kind.toUpperCase().slice(0, 18)}${RESET}`));
    put(out, panel, MAP_Y + 18, `${theme}${BOLD}RESOURCES${RESET}`);
    put(out, panel, MAP_Y + 19, `CREW ${state.jobs.length}/${state.crewSlots}  KITS ${state.lineKits}`);
    put(out, panel, MAP_Y + 20, `GEN FUEL ${Math.round(state.generatorFuel)}`);
  }
  const statusY = MAP_Y + GRID_HEIGHT + 1;
  put(out, 3, statusY, `${theme}CRITICAL${RESET}`);
  let criticalX = 13;
  for (const id of stage.requiredDistrictIds) {
    const node = state.nodes[id]; if (!node?.district) continue;
    const mark = node.district.powered ? '✓' : '×'; const color = node.district.powered ? GREEN : RED;
    put(out, criticalX, statusY, `${color}${DISTRICT_CONTENT[node.district.kind].short}${mark}${RESET}`); criticalX += 5;
  }
  put(out, 3, statusY + 2, `${theme}SERVICE ${meter(serviceRatioForState(state), 1, 18)} ${Math.round(serviceRatioForState(state) * 100)}%${RESET}`);
  state.jobs.slice(0, 2).forEach((job, index) => put(out, 3, statusY + 3 + index, `${CYAN}◈ ${state.edges[job.edgeId]?.label.slice(0, 22)} [${meter(job.totalBeats - job.remainingBeats, job.totalBeats, 8)}]${RESET}`));
  state.eventLog.slice(0, 3).forEach((entry, index) => put(out, 3, 23 + index, `${entry.tone === 'bad' ? RED : entry.tone === 'good' ? GREEN : entry.tone === 'warn' ? YELLOW : theme}> ${entry.text.slice(0, 48)}${RESET}`));
  if (message) put(out, 52, 24, `${YELLOW}${message.slice(0, 27)}${RESET}`);
  put(out, 3, 27, `${DIM}${theme}ARROWS/WASD MOVE  TAB ASSETS  1 SWITCH  2 REPAIR  3 LOAD  4 GEN  SPACE FOCUS  ESC PAUSE${RESET}`);
  return out.join('');
}
