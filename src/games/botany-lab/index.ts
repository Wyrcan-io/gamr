import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, matchingContracts, mutationCandidates, operationOptions } from './engine';
import { renderFrame } from './render';
import type { Command, GameState } from './types';

export interface BotanyLabController {
  stop: () => void;
  isRunning: boolean;
}

type OverlayMenu = 'action' | 'mutation' | 'delivery' | null;

function menuOutput(state: GameState, kind: OverlayMenu, cols: number, selection: number): string {
  if (!kind) return '';
  if (kind === 'action') {
    const labels = [...operationOptions(state).map(option => option.label), 'CANCEL'];
    return renderSimpleMenu(labels.map(label => ({ label })), selection, { centerX: Math.floor(cols / 2), startY: 8, showShortcuts: false });
  }
  if (kind === 'mutation') {
    const labels = mutationCandidates(state).map(id => `SPLICE ${id.toUpperCase()}`);
    return renderSimpleMenu(labels.map(label => ({ label })), selection, { centerX: Math.floor(cols / 2), startY: 8, showShortcuts: false });
  }
  const labels = matchingContracts(state, state.selectedChamberId).map(contract => `DELIVER: ${contract.name}`);
  return renderSimpleMenu(labels.map(label => ({ label })), selection, { centerX: Math.floor(cols / 2), startY: 8, showShortcuts: false });
}

export function runBotanyLabGame(terminal: Terminal): BotanyLabController {
  let running = true;
  let state = createState();
  let paused = false;
  let pauseSelection = 0;
  let overlay: OverlayMenu = null;
  let overlaySelection = 0;
  let keyListener: { dispose: () => void } | undefined;
  let resizeListener: { dispose: () => void } | undefined;

  const controller: BotanyLabController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  const restart = (): void => {
    state = applyCommand(state, { type: 'restartSameSeed' }).state;
    paused = false;
    overlay = null;
    overlaySelection = 0;
  };

  const quit = (): void => {
    controller.stop();
    dispatchGameQuit(terminal);
  };

  const nextGame = (): void => {
    controller.stop();
    dispatchGameSwitch(terminal);
  };

  const gamesMenu = (): void => {
    controller.stop();
    dispatchGamesMenu(terminal);
  };

  const command = (value: Command): void => {
    const result = applyCommand(state, value);
    if (result.accepted || result.events.length) state = result.state;
    if (!result.accepted && result.reason) {
      state.lastEvents = [{ kind: 'warning', text: result.reason }];
    }
    render();
  };

  const pauseInput = (key: string, event: KeyboardEvent): boolean => {
    if (!paused) return false;
    if (key === 'q') { quit(); return true; }
    if (key === 'r') { restart(); return true; }
    if (key === 'l') { gamesMenu(); return true; }
    if (key === 'n') { nextGame(); return true; }
    const navigation = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    if (navigation.newSelection !== pauseSelection) {
      pauseSelection = navigation.newSelection;
      render(); return true;
    }
    if (!navigation.confirmed && key !== 'escape') return true;
    if (key === 'escape' || (navigation.confirmed && pauseSelection === 0)) {
      paused = false;
      pauseSelection = 0;
    } else if (navigation.confirmed) {
      if (pauseSelection === 1) restart();
      else if (pauseSelection === 2) quit();
      else if (pauseSelection === 3) gamesMenu();
      else if (pauseSelection === 4) nextGame();
    }
    render();
    return true;
  };

  const selectedActionOptions = () => [...operationOptions(state), { type: 'cancel', label: 'CANCEL' }];

  const handleOverlay = (key: string, event: KeyboardEvent): boolean => {
    if (!overlay) return false;
    const count = overlay === 'action' ? selectedActionOptions().length : overlay === 'mutation' ? Math.max(1, mutationCandidates(state).length) : Math.max(1, matchingContracts(state, state.selectedChamberId).length);
    const navigation = navigateMenu(overlaySelection, count, key, event);
    if (navigation.newSelection !== overlaySelection) {
      overlaySelection = navigation.newSelection;
      render(); return true;
    }
    if (!navigation.confirmed) {
      if (key === 'escape' || key === 'backspace') { overlay = null; overlaySelection = 0; }
      render(); return true;
    }
    if (overlay === 'action') {
      const option = selectedActionOptions()[overlaySelection];
      if (!option || option.type === 'cancel') {
        overlay = null;
      } else if (option.type === 'splice') {
        overlay = 'mutation';
        overlaySelection = 0;
      } else if (option.type === 'deliver') {
        overlay = 'delivery';
        overlaySelection = 0;
      } else if (option.operation) {
        command({ type: 'queueOperation', operation: option.operation });
        overlay = null;
      }
    } else if (overlay === 'mutation') {
      const mutationId = mutationCandidates(state)[overlaySelection];
      if (mutationId) {
        command({ type: 'queueOperation', operation: { type: 'splice', chamberId: state.selectedChamberId, mutationId } });
        overlay = null;
      }
    } else {
      const contract = matchingContracts(state, state.selectedChamberId)[overlaySelection];
      if (contract) {
        command({ type: 'queueOperation', operation: { type: 'deliver', chamberId: state.selectedChamberId, contractId: contract.id } });
        overlay = null;
      }
    }
    overlaySelection = 0;
    return true;
  };

  const handleKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    event.preventDefault();
    event.stopPropagation();
    if (pauseInput(key, event)) return;
    if (key === 'escape' && state.phase === 'running' && !state.helpOpen && !overlay) {
      paused = true;
      pauseSelection = 0;
      render();
      return;
    }
    if (overlay && handleOverlay(key, event)) return;
    if (state.helpOpen) {
      if (key === 'h' || key === 'escape') command({ type: 'toggleHelp' });
      return;
    }
    if (state.phase === 'start') {
      if (key === 'q') quit();
      else if (key === 't') command({ type: 'startTraining' });
      else if (key === 'p' || key === 'enter' || key === ' ') command({ type: 'startStandard' });
      return;
    }
    if (state.phase === 'briefing') {
      if (key === 'enter' || key === ' ') command({ type: 'dismissBriefing' });
      else if (key === 'q') quit();
      return;
    }
    if (state.phase === 'won' || state.phase === 'report' || state.phase === 'gameOver') {
      if (key === 'r') restart();
      else if (key === 'n') nextGame();
      else if (key === 'q') quit();
      return;
    }
    if (key === 'h' || key === '?') { command({ type: 'toggleHelp' }); return; }
    if (key === ' ') { overlay = 'action'; overlaySelection = 0; render(); return; }
    if (key === 'backspace') { command({ type: 'cancelOperation' }); return; }
    if (key === 'enter') { command({ type: 'commitCycle' }); return; }
    if (key === 'c') { command({ type: 'closeShiftEarly' }); return; }
    if (key === 'l') { command({ type: 'cycleLamp' }); return; }
    if (key === 'w') { command({ type: 'cycleWater' }); return; }
    if (event.key === 'ArrowUp') { command({ type: 'moveSelection', dx: 0, dy: -1 }); return; }
    if (event.key === 'ArrowDown') { command({ type: 'moveSelection', dx: 0, dy: 1 }); return; }
    if (event.key === 'ArrowLeft') { command({ type: 'moveSelection', dx: -1, dy: 0 }); return; }
    if (event.key === 'ArrowRight') { command({ type: 'moveSelection', dx: 1, dy: 0 }); }
  };

  const render = (): void => {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor(), 0);
    if (terminal.cols >= 80 && terminal.rows >= 28) {
      if (paused) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: 11, showShortcuts: false });
      if (overlay) output += menuOutput(state, overlay, terminal.cols, overlaySelection);
    }
    terminal.write(output);
  };

  const baseStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    keyListener?.dispose();
    resizeListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m');
    baseStop();
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    resizeListener = terminal.onResize(() => render());
    render();
  }, 50);

  return controller;
}

export { applyCommand, createState, projectCycle } from './engine';
export type { GameState } from './types';
