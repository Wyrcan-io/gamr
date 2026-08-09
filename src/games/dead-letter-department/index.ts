import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, availablePerks, createState, type Command } from './engine';
import { renderFrame } from './render';

export interface DeadLetterDepartmentController {
  stop: () => void;
  isRunning: boolean;
}

export function runDeadLetterDepartmentGame(terminal: Terminal): DeadLetterDepartmentController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let state = createState(Date.now());
  let keyListener: { dispose: () => void } | undefined;

  const controller: DeadLetterDepartmentController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  function quit(): void {
    controller.stop();
    dispatchGameQuit(terminal);
  }

  function restart(): void {
    const mode = state.mode;
    state = createState(state.seed);
    state.mode = mode;
    state.phase = 'briefing';
    paused = false;
    pauseSelection = 0;
    render();
  }

  function runCommand(command: Command): void {
    const result = applyCommand(state, command);
    state = result.state;
    render();
  }

  function handlePause(key: string, domEvent: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
    pauseSelection = result.newSelection;
    if (!result.confirmed) { render(); return true; }
    switch (pauseSelection) {
      case 0: paused = false; break;
      case 1: restart(); break;
      case 2: quit(); break;
      case 3: controller.stop(); dispatchGamesMenu(terminal); break;
      case 4: controller.stop(); dispatchGameSwitch(terminal); break;
      default: break;
    }
    if (running) render();
    return true;
  }

  function handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key.toLowerCase();
    domEvent.preventDefault();
    domEvent.stopPropagation();
    if (state.helpOpen) {
      if (key === '?' || key === 'h' || key === 'escape') runCommand({ type: 'toggleHelp' });
      render();
      return;
    }
    if (state.ledgerOpen && (key === 'l' || key === 'escape')) {
      runCommand({ type: 'toggleLedger' });
      render();
      return;
    }
    if (key === '?' || key === 'h') {
      runCommand({ type: 'toggleHelp' });
      return;
    }
    if (key === 'escape' && state.phase !== 'start' && state.phase !== 'ending' && state.phase !== 'gameOver') {
      paused = !paused;
      pauseSelection = 0;
      render();
      return;
    }
    if (handlePause(key, domEvent)) return;

    if (state.phase === 'start') {
      if (key === 'q') quit();
      else if (key === 't') runCommand({ type: 'startTutorial' });
      else if (key === 'p' || key === 'enter') runCommand({ type: 'startCampaign', seed: state.seed });
      return;
    }
    if (state.phase === 'briefing') {
      if (key === 'enter' || key === ' ') runCommand({ type: 'dismissBriefing' });
      return;
    }
    if (state.phase === 'working') {
      if (key === '1' || key === 'd') runCommand({ type: 'chooseDestination', destination: 'dispatch' });
      else if (key === '2' || key === 'e') runCommand({ type: 'chooseDestination', destination: 'express' });
      else if (key === '3' || key === 'r') runCommand({ type: 'chooseDestination', destination: 'return' });
      else if (key === '4' || key === 's') runCommand({ type: 'chooseDestination', destination: 'seal' });
      else if (key === 'tab') runCommand({ type: 'cycleInspectionView' });
      else if (key === 'l') runCommand({ type: 'toggleLedger' });
      else if (key === 'v') runCommand({ type: 'useVerification' });
      return;
    }
    if (state.phase === 'audit') {
      if (key === 'enter' || key === ' ') runCommand({ type: 'dismissAudit' });
      else if (key === 'l') runCommand({ type: 'toggleLedger' });
      return;
    }
    if (state.phase === 'report') {
      if (key === 'enter' || key === ' ') runCommand({ type: 'continueReport' });
      return;
    }
    if (state.phase === 'perk') {
      if (key === '1' || key === '2' || key === '3') {
        const perk = availablePerks(state)[Number(key) - 1];
        if (perk) runCommand({ type: 'choosePerk', perkId: perk.id });
      }
      return;
    }
    if (state.phase === 'gameOver') {
      if (key === 'r' || key === 'enter') restart();
      else if (key === 'q') quit();
      return;
    }
    if (state.phase === 'ending') {
      if (key === 'r') restart();
      else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); }
      else if (key === 'q') quit();
    }
  }

  function render(): void {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette());
    if (paused && !state.helpOpen && !state.ledgerOpen && terminal.cols >= 80 && terminal.rows >= 28) {
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    }
    terminal.write(output);
  }

  const originalStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m');
    originalStop();
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    render();
  }, 50);
  return controller;
}
