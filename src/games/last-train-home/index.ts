import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import type { Command, GameState } from './types';

export interface LastTrainHomeController { stop: () => void; isRunning: boolean; }

export function runLastTrainHomeGame(terminal: Terminal): LastTrainHomeController {
  let running = true; let paused = false; let pauseSelection = 0; let state: GameState = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined; let keyListener: { dispose: () => void } | undefined;
  const controller: LastTrainHomeController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const command = (value: Command): void => { const result = applyCommand(state, value); state = result.state; };
  const restart = (): void => { state = createState(Date.now(), state.scenarioIndex); state.phase = 'briefing'; paused = false; pauseSelection = 0; };
  function handlePause(key: string, domEvent: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent); pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) restart(); else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  }
  function handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key.toLowerCase(); domEvent.preventDefault(); domEvent.stopPropagation();
    if ((key === '?' || key === 'h') && state.phase !== 'start') { command({ type: 'toggleHelp' }); return; }
    if (state.helpOpen) { if (key === 'escape' || key === 'backspace' || key === '?' || key === 'h') command({ type: 'toggleHelp' }); return; }
    if (key === 'escape' && !['start', 'ending', 'gameOver'].includes(state.phase)) { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, domEvent)) return;
    if (state.phase === 'start') { if (key === 'q') quit(); else if (key === 't') command({ type: 'startTutorial' }); else if (key === 'p' || key === 'enter') command({ type: 'startCampaign' }); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') command({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'turnReport') { if (key === 'enter' || key === ' ') command({ type: 'dismissReport' }); return; }
    if (state.phase === 'ending' || state.phase === 'gameOver') { if (key === 'r') restart(); else if (key === 'q') quit(); else if (key === 'n') { if (state.phase === 'ending' && state.scenarioIndex === 0) { state = createState(Date.now(), 1); state.phase = 'briefing'; } else { controller.stop(); dispatchGameSwitch(terminal); } } return; }
    if (key === 'tab') { command({ type: 'selectNextTrain', direction: domEvent.shiftKey ? -1 : 1 }); return; }
    if (key === 'arrowleft' || key === 'a') command({ type: 'moveSelection', dx: -1, dy: 0 }); else if (key === 'arrowright' || key === 'd') command({ type: 'moveSelection', dx: 1, dy: 0 }); else if (key === 'arrowup' || key === 'w') command({ type: 'moveSelection', dx: 0, dy: -1 }); else if (key === 'arrowdown' || key === 's') command({ type: 'moveSelection', dx: 0, dy: 1 });
    else if (key === '1') command({ type: 'switchJunction' }); else if (key === '2') command({ type: 'holdTrain' }); else if (key === '3') command({ type: 'repair' }); else if (key === '4') command({ type: 'clear' }); else if (key === ' ' || key === 'enter') command({ type: 'commitTurn' });
  }
  function render(): void { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette()); if (paused && !state.helpOpen && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false }); terminal.write(output); }
  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
