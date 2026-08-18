import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  getPorts,
  type GameState,
  type Protocol,
  type RouterKind,
  type Tile,
  type Upgrade,
} from './engine';
import type { Particle, ScorePopup, ScreenShakeState } from '../shared/effects';
import { applyShake } from '../shared/effects';
import { centerText, clipToWidth, padToWidth } from '../../ui/terminal';
import { getCurrentThemePalette, type TerminalThemePalette } from '../utils';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;

export const PACKET_MIN_COLS = 80;
export const PACKET_MIN_ROWS = 24;

export interface PacketRenderModel {
  gameStarted: boolean;
  selectedTool: RouterKind;
  previewRotation: 0 | 1 | 2 | 3;
  choices: Upgrade[];
  particles: Particle[];
  popups: ScorePopup[];
  shake: ScreenShakeState;
  helpOpen?: boolean;
  reducedMotion?: boolean;
}

const ROUTER_LABELS: Record<RouterKind, string> = {
  link: 'LINK',
  bend: 'BEND',
  split: 'SPLIT',
  firewall: 'FIREWALL',
};

function line(value: string, width: number, style = ''): string {
  return `${style}${padToWidth(clipToWidth(value, width, ''), width)}${RESET}`;
}

function center(value: string, width: number): string {
  return centerText(value, width);
}

function protocolColor(protocol: Protocol, palette: TerminalThemePalette): string {
  return palette.data[{ C: 0, P: 1, A: 2, G: 3 }[protocol]] ?? palette.ink;
}

function bar(value: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.floor((value / max) * width)));
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}] ${value}%`;
}

function resizeFrame(cols: number, rows: number, palette: TerminalThemePalette): string {
  return `${ESC}2J${ESC}H${[
    `${palette.focus}${BOLD}${center('g/ PACKET PANIC', cols)}${RESET}`,
    '',
    center('The network board needs a wider pane.', cols),
    center(`Need 80x24  Have ${cols}x${rows}`, cols),
    center('Resize before the next packet tick.', cols),
  ].join('\r\n')}`;
}

function header(state: GameState, cols: number, palette: TerminalThemePalette): string[] {
  return [
    line('g/ PACKET PANIC', cols, `${palette.focus}${BOLD}`),
    line('A live topology desk: connect sources, protect Trace, deliver the quota.', cols, palette.muted),
    line(`SCORE ${String(state.score).padStart(6, '0')}  |  ${state.mode.toUpperCase()}  |  SECTOR ${state.sector}/8  |  TRACE ${bar(state.trace, 100, 18)}  |  MAX ${state.maxTrace}`, cols, palette.ink),
    line('-'.repeat(cols), cols, palette.line),
  ];
}

function helpFrame(cols: number, palette: TerminalThemePalette): string {
  const lines = [
    line('g/ PACKET PANIC / HELP', cols, `${palette.focus}${BOLD}`),
    '',
    line('Arrows or W/A/S/D move the cursor.', cols, palette.ink),
    line('1 Link  2 Bend  3 Split  4 Firewall selects a router.', cols, palette.ink),
    line('Enter places the selected router; R rotates it.', cols, palette.ink),
    line('X salvages a router; F purges an infected tile.', cols, palette.ink),
    line('Space places when legal, or spends Focus when it is not.', cols, palette.ink),
    line('Sources use >C/P/A/G; destinations use <C/P/A/G.', cols, palette.muted),
    line('The letter and route shape remain visible without colour.', cols, palette.muted),
    '',
    line('[?] close help   [Esc] pause   [Q] quit from pause', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function startFrame(cols: number, palette: TerminalThemePalette): string {
  const lines = [
    line('g/ PACKET PANIC', cols, `${palette.focus}${BOLD}`),
    line('NETWORK OPERATOR DESK', cols, palette.muted),
    '',
    line('Route packets through a small topology before Trace fills.', cols, palette.ink),
    line('The tutorial introduces Link, Bend, delivery, and repair in that order.', cols, palette.ink),
    '',
    line('[P] standard shift   [T] tutorial   [?] help   [Q] quit', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function upgradeFrame(state: GameState, choices: Upgrade[], cols: number, palette: TerminalThemePalette): string {
  const lines = [
    ...header(state, cols, palette),
    line('SECTOR CLEAR / UPGRADE', cols, `${palette.focus}${BOLD}`),
    line('Choose one tool improvement before the next traffic pattern.', cols, palette.muted),
    '',
  ];
  choices.forEach((choice, index) => {
    lines.push(line(`[${index + 1}] ${choice.name}`, cols, palette.focus));
    lines.push(line(`    ${choice.description}`, cols, palette.ink));
    lines.push('');
  });
  lines.push(line('[1-3] choose upgrade   [?] help   [Esc] pause', cols, palette.focus));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function endFrame(state: GameState, cols: number, palette: TerminalThemePalette): string {
  const won = state.phase === 'won';
  const lines = [
    ...header(state, cols, palette),
    line(won ? state.mode === 'tutorial' ? '[+] TUTORIAL COMPLETE' : '[+] SHIFT COMPLETE' : '[!] NETWORK BREACHED', cols, `${won ? palette.good : palette.danger}${BOLD}`),
    '',
    line(`FINAL SCORE  ${state.score}`, cols, palette.ink),
    line(`MAX TRACE    ${state.maxTrace}`, cols, palette.ink),
    line(`DELIVERED    ${state.deliveredThisSector} / ${state.quota}`, cols, palette.ink),
    line(state.lastEvent, cols, palette.muted),
    '',
    line('[R] restart   [N] next game   [Q] quit', cols, palette.focus),
  ];
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

function inventory(state: GameState): string {
  return `L${state.inventory.link}  B${state.inventory.bend}  S${state.inventory.split}  F${state.inventory.firewall}`;
}

function tileText(tile: Tile, state: GameState): string {
  if (tile.kind === 'blocked') return '###';
  if (tile.kind === 'source') return `>${state.sources[tile.id].protocol} `;
  if (tile.kind === 'destination') return `<${state.destinations[tile.id].protocol} `;
  if (tile.kind === 'empty') return ' . ';
  if (tile.router.state === 'infected') return '!X ';
  if (tile.router.state === 'jammed') return '?X ';
  if (tile.router.packetId) return `*${state.packets[tile.router.packetId]?.protocol ?? '?'} `;
  if (tile.router.kind === 'firewall') return '[#]';
  const ports = getPorts(tile);
  if (tile.router.kind === 'link') return ports.includes('E') ? '---' : ' | ';
  if (tile.router.kind === 'bend') return ['L- ', 'L| ', ' -L', ' |L'][tile.router.rotation] ?? 'L- ';
  return ['T- ', 'T| ', ' -T', ' |T'][tile.router.rotation] ?? 'T- ';
}

function tileStyle(tile: Tile, state: GameState, palette: TerminalThemePalette): string {
  if (tile.kind === 'source') return protocolColor(state.sources[tile.id].protocol, palette);
  if (tile.kind === 'destination') return protocolColor(state.destinations[tile.id].protocol, palette);
  if (tile.kind === 'router' && tile.router.state === 'infected') return palette.danger;
  if (tile.kind === 'router' && tile.router.state === 'jammed') return palette.warning;
  if (tile.kind === 'router' && tile.router.packetId) {
    const packet = state.packets[tile.router.packetId];
    return packet ? protocolColor(packet.protocol, palette) : palette.ink;
  }
  if (tile.kind === 'router' && tile.router.kind === 'firewall') return palette.focus;
  return palette.ink;
}

function topologyRows(state: GameState, palette: TerminalThemePalette, offsetX: number, offsetY: number): string[] {
  const rows: string[] = [line('     A   B   C   D   E   F   G   H   I   J   K   L   M', 42, palette.muted)];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    const cells = Array.from({ length: BOARD_WIDTH }, (_, x) => {
      const tile = state.board[y][x];
      const selected = state.cursor.x === x && state.cursor.y === y;
      const value = tileText(tile, state);
      const style = selected ? `${palette.focus}${BOLD}` : tileStyle(tile, state, palette);
      return `${style}${selected ? `[${value.slice(1, 2)}]` : value}${RESET}`;
    }).join(' ');
    rows.push(`${padToWidth(`${String(y + 1).padStart(2, ' ')} ${cells}`, 42)}`);
  }
  if (offsetX || offsetY) rows.push(line(`Signal shift  ${offsetX},${offsetY}`, 42, palette.muted));
  return rows;
}

function playingFrame(state: GameState, model: PacketRenderModel, cols: number, palette: TerminalThemePalette): string {
  const leftWidth = 42;
  const rightWidth = cols - leftWidth - 3;
  const shake = model.reducedMotion ? { offsetX: 0, offsetY: 0 } : applyShake(model.shake);
  const map = topologyRows(state, palette, shake.offsetX, shake.offsetY);
  const panel: string[] = [
    line('OPERATOR PANEL', rightWidth, `${palette.focus}${BOLD}`),
    line(`TOOL  ${ROUTER_LABELS[model.selectedTool]}  ROT ${model.previewRotation}`, rightWidth, palette.ink),
    line(`INV   ${inventory(state)}`, rightWidth, palette.ink),
    line(`FOCUS ${'*'.repeat(state.focusCharges)}  PURGE ${state.purgeCharges}`, rightWidth, palette.ink),
    line(`QUOTA ${state.deliveredThisSector}/${state.quota}`, rightWidth, palette.ink),
    line(`STREAK ${state.streak}`, rightWidth, palette.ink),
    '',
    line(`CURSOR ${String.fromCharCode(65 + state.cursor.x)}${state.cursor.y + 1}`, rightWidth, palette.focus),
    line(model.selectedTool === 'link' ? 'Link: connect two straight ports.' : model.selectedTool === 'bend' ? 'Bend: turn traffic around a corner.' : `${ROUTER_LABELS[model.selectedTool]}: advanced tool; inspect ports.`, rightWidth, palette.muted),
    '',
    line(state.lastEvent && state.eventTicks > 0 ? `[!] ${state.lastEvent}` : 'No new event.', rightWidth, state.eventTicks > 0 ? palette.warning : palette.muted),
    line(model.particles.length ? `Signal burst ${model.particles.length}` : '', rightWidth, palette.muted),
  ];
  if (state.mode === 'tutorial' && state.tutorialStep < 6) panel.push(line(`TUTORIAL ${state.tutorialStep + 1}/6`, rightWidth, `${palette.focus}${BOLD}`));
  const lines = [
    ...header(state, cols, palette),
    `${padToWidth(line('TOPOLOGY', leftWidth, `${palette.focus}${BOLD}`), leftWidth)}   ${line('OPERATOR PANEL', rightWidth, `${palette.focus}${BOLD}`)}`,
  ];
  const rowCount = Math.max(map.length, panel.length);
  for (let i = 0; i < rowCount; i += 1) lines.push(`${padToWidth(map[i] ?? '', leftWidth)}   ${padToWidth(panel[i] ?? '', rightWidth)}`);
  lines.push('');
  lines.push(line('Arrows move | 1-4 tool | Enter place | R rotate | X salvage | F purge | Space focus | ? help | Esc pause', cols, palette.muted));
  return `${ESC}2J${ESC}H${lines.join('\r\n')}`;
}

export function renderFrame(
  state: GameState,
  cols: number,
  rows: number,
  model: PacketRenderModel,
  palette: TerminalThemePalette = getCurrentThemePalette(),
): string {
  if (cols < PACKET_MIN_COLS || rows < PACKET_MIN_ROWS) return resizeFrame(cols, rows, palette);
  if (model.helpOpen) return helpFrame(cols, palette);
  if (!model.gameStarted) return startFrame(cols, palette);
  if (state.phase === 'upgrade') return upgradeFrame(state, model.choices, cols, palette);
  if (state.phase === 'gameOver' || state.phase === 'won') return endFrame(state, cols, palette);
  return playingFrame(state, model, cols, palette);
}
