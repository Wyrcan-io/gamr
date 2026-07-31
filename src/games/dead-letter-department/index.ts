import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, type Command } from './engine';
import { renderFrame } from './render';

export interface DeadLetterDepartmentController {
  stop: () => void;
  isRunning: boolean;
}

export function runDeadLetterDepartmentGame(terminal: Terminal): DeadLetterDepartmentController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let glitchFrame = 0;
  let state = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
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
    state = createState(Date.now());
    state.phase = 'briefing';
    paused = false;
    pauseSelection = 0;
  }

  function runCommand(command: Command): void {
    const result = applyCommand(state, command);
    state = result.state;
  }

  function handlePause(key: string, domEvent: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
    pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    switch (pauseSelection) {
      case 0: paused = false; break;
      case 1: restart(); break;
      case 2: quit(); break;
      case 3: running = false; dispatchGamesMenu(terminal); break;
      case 4: running = false; dispatchGameSwitch(terminal); break;
      default: break;
    }
    return true;
  }

  function handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key.toLowerCase();
    domEvent.preventDefault();
    domEvent.stopPropagation();
    if (key === 'escape' && state.phase !== 'start' && state.phase !== 'ending' && state.phase !== 'gameOver') {
      paused = !paused;
      pauseSelection = 0;
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
      else if (key === 'h') runCommand({ type: 'toggleHelp' });
      else if (key === 'q') quit();
      return;
    }
    if (state.phase === 'audit') {
      if (key === 'enter' || key === ' ') runCommand({ type: 'dismissAudit' });
      else if (key === 'h') runCommand({ type: 'toggleHelp' });
      return;
    }
    if (state.phase === 'report') {
      if (key === 'enter' || key === ' ') runCommand({ type: 'continueReport' });
      return;
    }
    if (state.phase === 'perk') {
      if (key === '1' || key === '2' || key === '3') {
        const perks = [
          'carbon-copy', 'registry-tabs', 'quiet-gloves', 'priority-tray', 'wax-reference', 'audit-memory', 'night-overtime', 'postmasters-key',
        ] as const;
        const start = (state.seed + state.shift * 17) % perks.length;
        runCommand({ type: 'choosePerk', perkId: perks[(start + Number(key) - 1) % perks.length] });
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
      else if (key === 'n') { running = false; dispatchGameSwitch(terminal); }
      else if (key === 'q') quit();
    }
  }

  function render(): void {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor(), glitchFrame++);
    if (paused && terminal.cols >= 80 && terminal.rows >= 28) {
      output += `\x1b[${Math.floor(terminal.rows / 2) - 5};1H`;
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    }
    terminal.write(output);
  }

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
