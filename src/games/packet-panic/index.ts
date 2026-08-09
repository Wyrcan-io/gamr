import type { Terminal } from '@xterm/xterm';
import {
  type RouterKind,
  type TickResult,
  advance,
  canPlaceRouter,
  chooseUpgrade,
  createState,
  moveCursor,
  placeRouter,
  purge,
  rotateRouter,
  salvageRouter,
  upgradeChoices,
} from './engine';
import { getCurrentThemePalette } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { PAUSE_MENU_ITEMS, navigateMenu, renderSimpleMenu } from '../shared/menu';
import {
  addScorePopup,
  createShakeState,
  spawnParticles,
  triggerShake,
  updateParticles,
  updatePopups,
  type Particle,
  type ScorePopup,
} from '../shared/effects';
import { PACKET_MIN_COLS, PACKET_MIN_ROWS, renderFrame } from './render';

export interface PacketPanicController {
  stop: () => void;
  isRunning: boolean;
}

export interface PacketPanicOptions {
  /** Injectable clock for deterministic playtests and replay tooling. */
  now?: () => number;
  /** Suppress screen shake while retaining the underlying event feedback. */
  reducedMotion?: boolean;
}

const MAP_LEFT = 3;
const MAP_TOP = 6;
const CELL_WIDTH = 3;
const SIMULATION_MS = 250;

export function runPacketPanicGame(terminal: Terminal, options: PacketPanicOptions = {}): PacketPanicController {
  const now = options.now ?? (() => Date.now());
  const reducedMotion = options.reducedMotion ?? false;
  let running = true;
  let gameStarted = false;
  let paused = false;
  let helpOpen = false;
  let pauseSelection = 0;
  let selectedTool: RouterKind = 'link';
  let previewRotation: 0 | 1 | 2 | 3 = 0;
  let runSeed = now();
  let runMode: 'tutorial' | 'standard' = 'tutorial';
  let state = createState(runSeed, 1, [], runMode);
  let choices = upgradeChoices(state);
  let particles: Particle[] = [];
  let popups: ScorePopup[] = [];
  const shake = createShakeState();
  let accumulator = 0;
  let lastUpdateAt = now();

  const controller: PacketPanicController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  function reset(startImmediately = false, mode: 'tutorial' | 'standard' = runMode, seed = runSeed): void {
    runMode = mode;
    runSeed = seed;
    state = createState(runSeed, 1, [], runMode);
    choices = upgradeChoices(state);
    gameStarted = startImmediately;
    paused = false;
    helpOpen = false;
    pauseSelection = 0;
    selectedTool = 'link';
    previewRotation = 0;
    particles = [];
    popups = [];
    accumulator = 0;
    lastUpdateAt = now();
  }

  function quit(): void {
    controller.stop();
    dispatchGameQuit(terminal);
  }

  function placeSelected(): void {
    if (placeRouter(state, state.cursor, selectedTool, previewRotation)) {
      spawnParticles(particles, state.cursor.x, state.cursor.y, 4, getCurrentThemePalette().focus, ['+', '*', '.']);
    }
  }

  function applyTickResult(result: TickResult): void {
    const palette = getCurrentThemePalette();
    if (result.delivered.length) {
      const packet = result.delivered[result.delivered.length - 1];
      addScorePopup(popups, state.cursor.x, state.cursor.y, '+' + (packet.priority ? '250' : '100'), palette.good);
      spawnParticles(particles, state.cursor.x, state.cursor.y, 6, palette.data[{ C: 0, P: 1, A: 2, G: 3 }[packet.protocol]], ['+', '*', '.']);
    }
    if (result.dropped) {
      triggerShake(shake, 6, 2);
      addScorePopup(popups, MAP_LEFT, MAP_TOP, 'TRACE!', palette.danger);
    }
    if (result.infected) {
      triggerShake(shake, 8, 2);
      addScorePopup(popups, MAP_LEFT + result.infected.x * CELL_WIDTH, MAP_TOP + result.infected.y, 'MALWARE', palette.danger);
    }
  }

  function update(now: number): void {
    if (terminal.cols < PACKET_MIN_COLS || terminal.rows < PACKET_MIN_ROWS) {
      lastUpdateAt = now;
      return;
    }
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
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  }

  function handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key.toLowerCase();
    domEvent.preventDefault();
    domEvent.stopPropagation();

    if (helpOpen) {
      if (key === '?' || key === 'escape') helpOpen = false;
      return;
    }
    if (key === '?') { helpOpen = true; return; }
    if (key === 'escape' && gameStarted && (state.phase === 'playing' || state.phase === 'tutorial')) {
      paused = !paused;
      pauseSelection = 0;
      return;
    }
    if (handlePause(key, domEvent)) return;

    if (!gameStarted) {
      if (key === 'q') { quit(); return; }
      if (key === 'p' || key === 't' || key === 'enter' || key === ' ') {
        runSeed = now();
        runMode = key === 't' ? 'tutorial' : 'standard';
        state = createState(runSeed, 1, [], runMode);
        state.lastEvent = runMode === 'tutorial' ? 'TUTORIAL: PLACE A LINK, THEN A BEND' : 'STANDARD SHIFT: BUILD THE FIRST ROUTE';
        gameStarted = true;
      }
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
      if (key === 'r') reset(true, runMode, runSeed);
      else if (key === 'q') quit();
      else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); }
      return;
    }

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

  function render(): void {
    const output = renderFrame(state, terminal.cols, terminal.rows, {
      gameStarted,
      selectedTool,
      previewRotation,
      choices,
      particles,
      popups,
      shake,
      helpOpen,
      reducedMotion,
    }, getCurrentThemePalette());
    let finalOutput = output;
    if (paused && !helpOpen && terminal.cols >= PACKET_MIN_COLS && terminal.rows >= PACKET_MIN_ROWS) {
      finalOutput += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 2, showShortcuts: false });
    }
    terminal.write(finalOutput);
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
      update(now());
      updateParticles(particles);
      updatePopups(popups);
    }, 50);
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    render();
  }, 50);

  return controller;
}
