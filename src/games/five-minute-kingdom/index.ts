import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { PAUSE_MENU_ITEMS, navigateMenu, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, type GameState } from './engine';
import { renderFrame } from './render';

export interface FiveMinuteKingdomController { stop: () => void; isRunning: boolean }

const MIN_COLS = 80;
const MIN_ROWS = 24;

export function runFiveMinuteKingdomGame(terminal: Terminal): FiveMinuteKingdomController {
  let running = true;
  let paused = false;
  let showLedger = false;
  let helpOpen = false;
  let pauseSelection = 0;
  let state: GameState = createState(Date.now());
  let keyListener: { dispose: () => void } | undefined;

  const controller: FiveMinuteKingdomController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (): void => {
    state = createState(state.seed);
    paused = false;
    showLedger = false;
    helpOpen = false;
    pauseSelection = 0;
    render();
  };

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) { render(); return true; }
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    if (running) render();
    return true;
  }

  function run(command: Parameters<typeof applyCommand>[1]): void {
    state = applyCommand(state, command);
    render();
  }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    event.preventDefault();
    event.stopPropagation();

    if (helpOpen) {
      if (key === '?' || key === 'escape') helpOpen = false;
      render();
      return;
    }
    if (showLedger && (key === 'l' || key === 'escape')) {
      showLedger = false;
      render();
      return;
    }
    if (key === '?') { helpOpen = true; render(); return; }
    if (key === 'escape' && state.phase === 'preview') { run({ type: 'cancelPreview' }); return; }
    if (key === 'escape' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; render(); return; }
    if (handlePause(key, event)) return;
    if (key === 'q') { quit(); return; }
    if (key === 'l' && state.phase !== 'briefing' && state.phase !== 'ending') { showLedger = !showLedger; render(); return; }

    if (state.phase === 'briefing') {
      if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' });
      return;
    }
    if (state.phase === 'chooseOffer') {
      if (['1', '2', '3'].includes(key)) run({ type: 'selectOffer', index: Number(key) - 1 });
      return;
    }
    if (state.phase === 'chooseTarget' || state.phase === 'preview') {
      if (event.key === 'ArrowLeft' || key === 'a') run({ type: 'moveTarget', dx: -1, dy: 0 });
      else if (event.key === 'ArrowRight' || key === 'd') run({ type: 'moveTarget', dx: 1, dy: 0 });
      else if (event.key === 'ArrowUp' || key === 'w') run({ type: 'moveTarget', dx: 0, dy: -1 });
      else if (event.key === 'ArrowDown' || key === 's') run({ type: 'moveTarget', dx: 0, dy: 1 });
      else if (key === 'enter' && state.phase === 'chooseTarget') run({ type: 'preview' });
      else if (key === 'enter' && state.phase === 'preview') run({ type: 'confirm' });
      return;
    }
    if (state.phase === 'result') {
      if (key === 'enter' || key === ' ') run({ type: 'dismissResult' });
      return;
    }
    if (state.phase === 'season') {
      if (key === 'enter' || key === ' ') run({ type: 'dismissSeason' });
      return;
    }
    if (state.phase === 'finalChronicle') {
      if (key === 'enter' || key === ' ') { state = { ...state, phase: 'ending' }; render(); }
      return;
    }
    if (state.phase === 'ending' && key === 'r') restart();
  }

  function render(): void {
    const cols = terminal.cols;
    const rows = terminal.rows;
    let output = renderFrame(state, cols, rows, getCurrentThemePalette(), { ledgerOpen: showLedger, helpOpen });
    if (paused && !showLedger && !helpOpen && cols >= MIN_COLS && rows >= MIN_ROWS) {
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, {
        centerX: Math.floor(cols / 2),
        startY: Math.floor(rows / 2) - 3,
        showShortcuts: false,
      });
    }
    terminal.write(output);
  }

  const baseStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m');
    baseStop();
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    render();
  }, 50);

  return controller;
}
