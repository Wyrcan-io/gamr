import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { directionForKey, renderFrame } from './render';
import type { Command, GameState } from './types';

export interface DungeonCourierController { stop: () => void; isRunning: boolean; }

export function runDungeonCourierGame(terminal: Terminal): DungeonCourierController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let state: GameState = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;
  const controller: DungeonCourierController = { stop: () => { running = false; }, get isRunning() { return running; } };

  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const run = (command: Command): void => { state = applyCommand(state, command).state; };
  const restart = (): void => { state = applyCommand(state, { type: 'restart', seed: state.seed }).state; paused = false; pauseSelection = 0; };

  const handlePause = (key: string, event: KeyboardEvent): boolean => {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  };

  const handleKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    event.preventDefault(); event.stopPropagation();
    if (key === 'escape' && state.helpOpen) { run({ type: 'toggleHelp' }); return; }
    if (key === 'escape' && !['start', 'ending', 'gameOver'].includes(state.phase)) { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    if (state.helpOpen) { if (key === 'h' || key === 'escape') run({ type: 'toggleHelp' }); return; }
    if (state.phase === 'start') { if (key === 'q') quit(); else if (key === 't') run({ type: 'startTutorial' }); else if (key === 'p' || key === 'enter') run({ type: 'startRun' }); return; }
    if (state.phase === 'contract') { if (key === '1' || key === '2' || key === '3') run({ type: 'chooseOffer', index: Number(key) - 1 }); else if (key === 'enter') run({ type: 'chooseOffer', index: state.selectedOffer }); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'report') { if (key === 'enter' || key === ' ') run({ type: 'continueReport' }); return; }
    if (state.phase === 'upgrade') { if (key === '1' || key === '2' || key === '3') run({ type: 'chooseUpgrade', index: Number(key) - 1 }); return; }
    if (state.phase === 'ending' || state.phase === 'gameOver') { if (key === 'r') restart(); else if (key === 'q' || key === 'enter') quit(); return; }
    if (state.phase === 'inventory') {
      if (key === 'i' || key === 'escape') run({ type: 'toggleInventory' });
      else if (key === 'arrowup' || key === 'w') run({ type: 'selectInventory', delta: -1 });
      else if (key === 'arrowdown' || key === 's') run({ type: 'selectInventory', delta: 1 });
      else if (key === 'x') run({ type: 'dropItem', slot: state.courier.selectedSlot });
      return;
    }
    if (state.phase !== 'traversal') return;
    if (key === 'q') { quit(); return; }
    const direction = directionForKey(key);
    if (direction) { run({ type: 'previewMove', direction, hurried: event.shiftKey }); return; }
    if (key === 'b') run({ type: 'brace' });
    else if (key === 'enter' || key === ' ') run({ type: 'commitMove' });
    else if (key === '.') run({ type: 'wait' });
    else if (key === 'e' || key === 'enter') run({ type: 'interact' });
    else if (key === 'i') run({ type: 'toggleInventory' });
    else if (key === 'tab') run({ type: 'cycleSurvey' });
    else if (key === 'h') run({ type: 'toggleHelp' });
    else if (key >= '1' && key <= '4') run({ type: 'useItem', slot: Number(key) - 1 });
  };

  const render = (): void => {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette().focus, 0);
    if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  };

  const originalStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    if (renderInterval) clearInterval(renderInterval);
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l');
    originalStop();
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    renderInterval = setInterval(() => { if (running) render(); }, 50);
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    render();
  }, 50);
  return controller;
}

export { applyCommand, createState } from './engine';
export type { GameState, Command } from './types';
