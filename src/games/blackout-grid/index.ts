import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { advance, applyCommand, createState, upgradeChoices } from './engine';
import { renderFrame } from './render';
import type { Command, GameState } from './types';

export interface BlackoutGridController {
  stop: () => void;
  isRunning: boolean;
}

const HELP_LINES = [
  'BLACKOUT GRID // TWO THINGS MATTER:',
  'POWER FLOWS THROUGH CLOSED, RADIAL EDGES.',
  'RESTORED DISTRICTS DRAW COLD-PICKUP LOAD FOR A FEW BEATS.',
  'OPEN LOW-PRIORITY LOAD, REPAIR FAULTS, THEN RECLOSE SAFELY.',
  '1 SWITCH  2 REPAIR/BUILD  3 SHED/RESTORE  4 GENERATOR  SPACE FOCUS',
];

export function runBlackoutGridGame(terminal: Terminal): BlackoutGridController {
  let running = true;
  let paused = false;
  let helpOpen = false;
  let pauseSelection = 0;
  let message = '';
  let state: GameState = createState(Date.now());
  let simulationInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;
  let resizeListener: { dispose: () => void } | undefined;

  const controller: BlackoutGridController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const runCommand = (command: Command): void => {
    const result = applyCommand(state, command);
    state = result.state;
    message = result.accepted ? '' : (result.reason ?? 'ACTION UNAVAILABLE');
    render();
  };

  function handlePause(key: string, domEvent: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
    pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) { state = createState(state.seed, state.mode); state.phase = 'briefing'; paused = false; pauseSelection = 0; }
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  }

  function handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key.toLowerCase();
    domEvent.preventDefault(); domEvent.stopPropagation();
    if (key === 'escape' && !['start', 'won', 'gameOver'].includes(state.phase)) { paused = !paused; pauseSelection = 0; render(); return; }
    if (handlePause(key, domEvent)) return;
    if (state.phase === 'start') {
      if (key === 'q') quit(); else if (key === 't') runCommand({ type: 'startTutorial' }); else if (key === 'p' || key === 'enter') runCommand({ type: 'startStandard' });
      return;
    }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') runCommand({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'upgrade') {
      if (key === '1' || key === '2' || key === '3') { const choice = upgradeChoices(state)[Number(key) - 1]; if (choice) runCommand({ type: 'chooseUpgrade', upgradeId: choice.id }); }
      return;
    }
    if (state.phase === 'won' || state.phase === 'gameOver') { if (key === 'r') runCommand({ type: 'restartSameSeed' }); else if (key === 'q') quit(); else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } return; }
    if (key === 'h' || key === '?') { helpOpen = !helpOpen; render(); return; }
    if (key === 'tab') { runCommand({ type: 'cycleSelection', direction: domEvent.shiftKey ? -1 : 1 }); return; }
    if (key === 'arrowleft' || key === 'a') runCommand({ type: 'moveSelection', dx: -1, dy: 0 });
    else if (key === 'arrowright' || key === 'd') runCommand({ type: 'moveSelection', dx: 1, dy: 0 });
    else if (key === 'arrowup' || key === 'w') runCommand({ type: 'moveSelection', dx: 0, dy: -1 });
    else if (key === 'arrowdown' || key === 's') runCommand({ type: 'moveSelection', dx: 0, dy: 1 });
    else if (key === '1' || key === 'enter') runCommand({ type: 'toggleBreaker' });
    else if (key === '2' || key === 'r') runCommand({ type: 'startCrewJob' });
    else if (key === '3' || key === 'l') runCommand({ type: 'toggleDistrict' });
    else if (key === '4' || key === 'g') runCommand({ type: 'toggleGenerator' });
    else if (key === ' ') runCommand({ type: 'activateFocus' });
  }

  function simulationBeat(): void {
    if (!running || paused || helpOpen || state.phase !== 'running') return;
    const result = advance(state);
    if (result.events.length) message = result.events[result.events.length - 1].text;
    render();
  }

  function render(): void {
    if (!running) return;
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor(), 0, upgradeChoices(state).map(choice => choice.name), message);
    if (helpOpen && terminal.cols >= 80 && terminal.rows >= 28) {
      const x = Math.max(3, Math.floor(terminal.cols / 2) - 30);
      output += `\x1b[8;${x}H\x1b[7m  HELP — OPERATE A RADIAL CITY GRID  \x1b[0m`;
      HELP_LINES.forEach((line, index) => { output += `\x1b[${10 + index};${x}H\x1b[96m${line.slice(0, 58)}\x1b[0m`; });
      output += `\x1b[17;${x}H\x1b[2mPRESS H TO CLOSE HELP\x1b[0m`;
    }
    if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  }

  const originalStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    if (simulationInterval) clearInterval(simulationInterval);
    keyListener?.dispose();
    resizeListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m');
    originalStop();
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    simulationInterval = setInterval(simulationBeat, 500);
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    resizeListener = terminal.onResize(() => render());
    render();
  }, 50);
  return controller;
}
