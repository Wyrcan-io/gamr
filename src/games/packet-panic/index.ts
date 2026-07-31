import type { Terminal } from '@xterm/xterm';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type GameState,
  type Protocol,
  type RouterKind,
  type TickResult,
  type Tile,
  advance,
  canPlaceRouter,
  chooseUpgrade,
  createState,
  getPorts,
  moveCursor,
  placeRouter,
  purge,
  rotateRouter,
  salvageRouter,
  upgradeChoices,
} from './engine';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, navigateMenu, renderSimpleMenu } from '../shared/menu';
import {
  addScorePopup,
  applyShake,
  createShakeState,
  spawnParticles,
  triggerShake,
  updateParticles,
  updatePopups,
  type Particle,
  type ScorePopup,
} from '../shared/effects';

export interface PacketPanicController {
  stop: () => void;
  isRunning: boolean;
}

const MIN_COLS = 80;
const MIN_ROWS = 28;
const MAP_LEFT = 3;
const MAP_TOP = 6;
const CELL_WIDTH = 3;
const SIMULATION_MS = 250;

const PROTOCOL_COLORS: Record<Protocol, string> = {
  C: '\x1b[96m',
  P: '\x1b[95m',
  A: '\x1b[93m',
  G: '\x1b[92m',
};

const ROUTER_LABELS: Record<RouterKind, string> = {
  link: 'LINK',
  bend: 'BEND',
  split: 'SPLIT',
  firewall: 'FIREWALL',
};

function centerX(cols: number, text: string): number {
  return Math.max(1, Math.floor((cols - text.length) / 2) + 1);
}

function padCell(text: string): string {
  if (text.length >= CELL_WIDTH) return text.slice(0, CELL_WIDTH);
  const left = Math.floor((CELL_WIDTH - text.length) / 2);
  return ' '.repeat(left) + text + ' '.repeat(CELL_WIDTH - text.length - left);
}

function bar(value: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.floor((value / max) * width)));
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

function inventoryLine(state: GameState, kind: RouterKind): string {
  const key = kind === 'link' ? '━' : kind === 'bend' ? '╰' : kind === 'split' ? '┳' : '▣';
  return key + 'x' + String(state.inventory[kind]).padStart(2, ' ');
}

function writeAt(output: string[], x: number, y: number, value: string): void {
  output.push('\x1b[' + y + ';' + x + 'H' + value);
}

export function runPacketPanicGame(terminal: Terminal): PacketPanicController {
  let running = true;
  let gameStarted = false;
  let paused = false;
  let pauseSelection = 0;
  let selectedTool: RouterKind = 'link';
  let previewRotation: 0 | 1 | 2 | 3 = 0;
  let state = createState(Date.now());
  let choices = upgradeChoices(state);
  let particles: Particle[] = [];
  let popups: ScorePopup[] = [];
  const shake = createShakeState();
  let accumulator = 0;
  let lastUpdateAt = Date.now();

  const controller: PacketPanicController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  function reset(startImmediately = false) {
    state = createState(Date.now());
    choices = upgradeChoices(state);
    gameStarted = startImmediately;
    paused = false;
    pauseSelection = 0;
    selectedTool = 'link';
    previewRotation = 0;
    particles = [];
    popups = [];
    accumulator = 0;
    lastUpdateAt = Date.now();
  }

  function quit() {
    controller.stop();
    dispatchGameQuit(terminal);
  }

  function placeSelected() {
    if (placeRouter(state, state.cursor, selectedTool, previewRotation)) {
      spawnParticles(particles, state.cursor.x, state.cursor.y, 4, getCurrentThemeColor());
    }
  }

  function applyTickResult(result: TickResult) {
    if (result.delivered.length) {
      const packet = result.delivered[result.delivered.length - 1];
      addScorePopup(popups, state.cursor.x, state.cursor.y, '+' + (packet.priority ? '250' : '100'), '\x1b[1;93m');
      spawnParticles(particles, state.cursor.x, state.cursor.y, 6, PROTOCOL_COLORS[packet.protocol]);
    }
    if (result.dropped) {
      triggerShake(shake, 6, 2);
      addScorePopup(popups, MAP_LEFT, MAP_TOP, 'TRACE!', '\x1b[1;91m');
    }
    if (result.infected) {
      triggerShake(shake, 8, 2);
      addScorePopup(popups, MAP_LEFT + result.infected.x * CELL_WIDTH, MAP_TOP + result.infected.y, 'MALWARE', '\x1b[1;91m');
    }
  }

  function update(now: number) {
    if (!gameStarted || paused || state.phase !== 'playing') {
      lastUpdateAt = now;
      return;
    }
    const elapsed = Math.min(250, Math.max(0, now - lastUpdateAt));
    lastUpdateAt = now;
    accumulator += elapsed;
    const tickMs = state.focusUntilTick > state.tick ? 750 : SIMULATION_MS;
    while (accumulator >= tickMs) {
      accumulator -= tickMs;
      applyTickResult(advance(state));
    }
  }

  function handlePause(key: string, domEvent: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
    if (result.newSelection !== pauseSelection) {
      pauseSelection = result.newSelection;
      return true;
    }
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) reset(true);
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) {
      running = false;
      dispatchGamesMenu(terminal);
    } else if (pauseSelection === 4) {
      running = false;
      dispatchGameSwitch(terminal);
    }
    return true;
  }

  function handleKey(domEvent: KeyboardEvent) {
    const key = domEvent.key.toLowerCase();
    domEvent.preventDefault();
    domEvent.stopPropagation();

    if (key === 'escape' && gameStarted && state.phase === 'playing') {
      paused = !paused;
      pauseSelection = 0;
      return;
    }
    if (handlePause(key, domEvent)) return;

    if (!gameStarted) {
      if (key === 'q') { quit(); return; }
      if (key === 'p') state = createState(Date.now(), 1);
      gameStarted = true;
      return;
    }

    if (state.phase === 'upgrade') {
      if (key === '1' || key === '2' || key === '3') {
        const choice = choices[Number(key) - 1];
        if (choice) {
          state = chooseUpgrade(state, choice);
          choices = upgradeChoices(state);
        }
      }
      return;
    }

    if (state.phase === 'gameOver' || state.phase === 'won') {
      if (key === 'r') reset(true);
      else if (key === 'q') quit();
      else if (key === 'n') {
        running = false;
        dispatchGameSwitch(terminal);
      }
      return;
    }

    if (key === 'q') return;
    if (domEvent.key === 'ArrowLeft' || key === 'a') moveCursor(state, -1, 0);
    else if (domEvent.key === 'ArrowRight' || key === 'd') moveCursor(state, 1, 0);
    else if (domEvent.key === 'ArrowUp' || key === 'w') moveCursor(state, 0, -1);
    else if (domEvent.key === 'ArrowDown' || key === 's') moveCursor(state, 0, 1);
    else if (key === '1') selectedTool = 'link';
    else if (key === '2') selectedTool = 'bend';
    else if (key === '3') selectedTool = 'split';
    else if (key === '4') selectedTool = 'firewall';
    else if (key === 'enter') placeSelected();
    else if (key === 'r') {
      if (!rotateRouter(state, state.cursor)) previewRotation = ((previewRotation + 1) % 4) as 0 | 1 | 2 | 3;
    } else if (key === 'x') salvageRouter(state, state.cursor);
    else if (key === 'f') purge(state, state.cursor);
    else if (key === ' ') {
      if (canPlaceRouter(state, state.cursor, selectedTool)) placeSelected();
      else if (state.focusCharges > 0) {
        state.focusCharges--;
        state.focusUntilTick = state.tick + 16;
        state.lastEvent = 'FOCUS MODE';
        state.eventTicks = 18;
      }
    }
  }

  function render() {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const output: string[] = ['\x1b[2J\x1b[H'];
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      writeAt(output, centerX(cols, 'TERMINAL TOO SMALL'), Math.max(2, Math.floor(rows / 2)), '\x1b[1;91mTERMINAL TOO SMALL\x1b[0m');
      writeAt(output, centerX(cols, 'Need 80x28'), Math.max(3, Math.floor(rows / 2) + 2), 'Need 80x28  Have ' + cols + 'x' + rows);
      terminal.write(output.join(''));
      return;
    }

    const theme = getCurrentThemeColor();
    const title = gameStarted ? '✦ PACKET PANIC' : '✦ PACKET PANIC // NETWORK OPERATOR';
    writeAt(output, centerX(cols, title), 1, theme + '\x1b[1m' + title + '\x1b[0m');
    const status = 'SCORE ' + String(state.score).padStart(6, '0') + '   ◈ SECTOR ' + state.sector + '/8   ◈ TRACE ' + bar(state.trace, 100, 18);
    writeAt(output, 3, 3, theme + status + '\x1b[0m');

    if (!gameStarted) {
      writeAt(output, centerX(cols, '◌ ROUTE PACKETS. STOP THE TRACE. ◌'), 9, '\x1b[1;96m◌ ROUTE PACKETS. STOP THE TRACE. ◌\x1b[0m');
      writeAt(output, centerX(cols, '▶ P: STANDARD SHIFT   T: TUTORIAL   Q: QUIT'), 13, '\x1b[2m' + theme + '▶ P: STANDARD SHIFT   T: TUTORIAL   Q: QUIT\x1b[0m');
      terminal.write(output.join(''));
      return;
    }

    if (state.phase === 'upgrade') {
      writeAt(output, centerX(cols, '✦ SECTOR CLEAR ✦'), 9, '\x1b[1;93m✦ SECTOR CLEAR ✦\x1b[0m');
      writeAt(output, centerX(cols, 'CHOOSE YOUR UPGRADE'), 11, theme + 'CHOOSE YOUR UPGRADE\x1b[0m');
      choices.forEach((choice, index) => {
        writeAt(output, centerX(cols, (index + 1) + ': ' + choice.name), 14 + index * 2,
          '\x1b[1;93m' + (index + 1) + ': ' + choice.name + '\x1b[0m  ' + choice.description);
      });
      terminal.write(output.join(''));
      return;
    }

    if (state.phase === 'gameOver' || state.phase === 'won') {
      const heading = state.phase === 'won' ? '✓ SHIFT COMPLETE' : '☠ NETWORK BREACHED';
      const color = state.phase === 'won' ? '\x1b[1;92m' : '\x1b[1;91m';
      writeAt(output, centerX(cols, heading), 9, color + heading + '\x1b[0m');
      writeAt(output, centerX(cols, 'SCORE ' + state.score + '   MAX TRACE ' + state.maxTrace), 12, theme + 'SCORE ' + state.score + '   MAX TRACE ' + state.maxTrace + '\x1b[0m');
      writeAt(output, centerX(cols, 'R: RESTART   N: NEXT GAME   Q: QUIT'), 16, '\x1b[2m' + theme + 'R: RESTART   N: NEXT GAME   Q: QUIT\x1b[0m');
      terminal.write(output.join(''));
      return;
    }

    const { offsetX, offsetY } = applyShake(shake);
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const tile = state.board[y][x];
        const selected = state.cursor.x === x && state.cursor.y === y;
        const text = selected ? '[' + tileText(tile, state).slice(1, 2) + ']' : tileText(tile, state);
        const color = tileColor(tile, state);
        const selection = selected ? '\x1b[7m' : '';
        writeAt(output, MAP_LEFT + x * CELL_WIDTH + offsetX, MAP_TOP + y + offsetY, selection + color + padCell(text) + '\x1b[0m');
      }
    }

    for (const particle of particles) {
      const px = MAP_LEFT + Math.round(particle.x) * CELL_WIDTH + 1 + offsetX;
      const py = MAP_TOP + Math.round(particle.y) + offsetY;
      if (px >= MAP_LEFT && px < MAP_LEFT + BOARD_WIDTH * CELL_WIDTH && py >= MAP_TOP && py < MAP_TOP + BOARD_HEIGHT) {
        writeAt(output, px, py, particle.color + particle.char + '\x1b[0m');
      }
    }
    for (const popup of popups) {
      const px = MAP_LEFT + Math.round(popup.x) * CELL_WIDTH + 1 + offsetX;
      const py = MAP_TOP + Math.round(popup.y) + offsetY;
      if (px >= MAP_LEFT && py >= MAP_TOP && py < MAP_TOP + BOARD_HEIGHT) {
        writeAt(output, px, py, popup.color + popup.text + '\x1b[0m');
      }
    }

    const panelX = MAP_LEFT + BOARD_WIDTH * CELL_WIDTH + 5;
    writeAt(output, panelX, MAP_TOP, theme + '\x1b[1m◈ NETWORK STATUS\x1b[0m');
    writeAt(output, panelX, MAP_TOP + 2, 'TOOL: ' + ROUTER_LABELS[selectedTool] + ' R' + previewRotation);
    writeAt(output, panelX, MAP_TOP + 3, 'INV: ' + inventoryLine(state, 'link') + ' ' + inventoryLine(state, 'bend'));
    writeAt(output, panelX, MAP_TOP + 4, '     ' + inventoryLine(state, 'split') + ' ' + inventoryLine(state, 'firewall'));
    writeAt(output, panelX, MAP_TOP + 6, 'FOCUS: ' + '◆'.repeat(state.focusCharges) + '  PURGE: ✦' + state.purgeCharges);
    writeAt(output, panelX, MAP_TOP + 8, 'QUOTA: ' + state.deliveredThisSector + ' / ' + state.quota);
    writeAt(output, panelX, MAP_TOP + 9, 'STREAK: ' + state.streak);
    if (state.lastEvent && state.eventTicks > 0) writeAt(output, panelX, MAP_TOP + 11, '\x1b[1;93m' + state.lastEvent + '\x1b[0m');
    writeAt(output, 3, MAP_TOP + BOARD_HEIGHT + 2, '\x1b[2m' + theme + '←↑↓→ MOVE  1-4 TOOL  ⏎ PLACE  R ROTATE  X SALVAGE  F PURGE  SPACE FOCUS  ESC PAUSE\x1b[0m');

    if (state.tutorialStep < 2) writeAt(output, panelX, MAP_TOP + 13, '\x1b[1;96mPLACE ROUTERS TO CONNECT\x1b[0m');
    if (paused) {
      writeAt(output, centerX(cols, 'PAUSED'), Math.floor(rows / 2) - 5, '\x1b[1;93mPAUSED\x1b[0m');
      output.push(renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(cols / 2), startY: Math.floor(rows / 2) - 2, showShortcuts: false }));
    }
    terminal.write(output.join(''));
  }

  const originalStop = controller.stop;
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let updateInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;
  controller.stop = () => {
    if (!running) return;
    running = false;
    if (renderInterval) clearInterval(renderInterval);
    if (updateInterval) clearInterval(updateInterval);
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m');
    originalStop();
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    renderInterval = setInterval(render, 50);
    updateInterval = setInterval(() => {
      update(Date.now());
      updateParticles(particles);
      updatePopups(popups);
    }, 50);
    keyListener = terminal.onKey(({ domEvent }) => {
      if (running) handleKey(domEvent);
    });
    render();
  }, 50);

  return controller;
}

function tileText(tile: Tile, state: GameState): string {
  if (tile.kind === 'blocked') return '▓▓▓';
  if (tile.kind === 'source') return '◉' + state.sources[tile.id].protocol + ' ';
  if (tile.kind === 'destination') return '◎' + state.destinations[tile.id].protocol + ' ';
  if (tile.kind === 'empty') return ' · ';
  if (tile.router.state === 'infected') return '☠  ';
  if (tile.router.state === 'jammed') return '✖  ';
  if (tile.router.packetId) return '◈' + (state.packets[tile.router.packetId]?.protocol || '·') + ' ';
  if (tile.router.kind === 'firewall') return '▣  ';
  const ports = getPorts(tile);
  if (tile.router.kind === 'link') return ports.includes('E') ? '───' : ' │ ';
  if (tile.router.kind === 'bend') return ['└─ ', '┌─ ', '─┐ ', '─┘ '][tile.router.rotation];
  return ['┬─ ', '├─ ', '┴─ ', '─┤ '][tile.router.rotation];
}

function tileColor(tile: Tile, state: GameState): string {
  if (tile.kind === 'source') return PROTOCOL_COLORS[state.sources[tile.id].protocol];
  if (tile.kind === 'destination') return PROTOCOL_COLORS[state.destinations[tile.id].protocol];
  if (tile.kind === 'router' && tile.router.state === 'infected') return '\x1b[1;91m';
  if (tile.kind === 'router' && tile.router.state === 'jammed') return '\x1b[1;93m';
  if (tile.kind === 'router' && tile.router.packetId) {
    const packet = state.packets[tile.router.packetId];
    return packet ? PROTOCOL_COLORS[packet.protocol] : '';
  }
  if (tile.kind === 'router' && tile.router.kind === 'firewall') return '\x1b[95m';
  return '';
}
