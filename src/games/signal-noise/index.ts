import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import type { BroadcastAction, Command } from './types';

export interface SignalNoiseController { stop: () => void; isRunning: boolean; }

export function runSignalNoiseGame(terminal: Terminal): SignalNoiseController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let helpOpen = false;
  let state = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;

  const controller: SignalNoiseController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const run = (command: Command): void => { state = applyCommand(state, command).state; };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (): void => { run({ type: 'restart' }); paused = false; pauseSelection = 0; };

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    switch (pauseSelection) {
      case 0: paused = false; break;
      case 1: restart(); break;
      case 2: quit(); break;
      case 3: controller.stop(); dispatchGamesMenu(terminal); break;
      case 4: controller.stop(); dispatchGameSwitch(terminal); break;
      default: break;
    }
    return true;
  }

  function broadcast(key: string): BroadcastAction | undefined {
    return ({ '1': 'ack-hold', '2': 'ack-relay', '3': 'silence', '4': 'jam-mark' } as Record<string, BroadcastAction | undefined>)[key];
  }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    event.preventDefault(); event.stopPropagation();
    if (key === '?' || key === 'h') { helpOpen = !helpOpen; return; }
    if (helpOpen) { if (key === 'escape' || key === 'backspace' || key === 'enter') helpOpen = false; return; }
    if (key === 'escape' && !['start', 'ending', 'gameOver'].includes(state.caseState.phase)) { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    const phase = state.caseState.phase;
    if (phase === 'start') { if (key === 'q') quit(); else if (key === 't') run({ type: 'start', mode: 'tutorial' }); else if (key === 'p' || key === 'enter') run({ type: 'start', mode: 'campaign' }); return; }
    if (phase === 'brief') { if (key === 'enter' || key === ' ') run({ type: 'continueBrief' }); return; }
    if (phase === 'debrief') { if (key === 'enter' || key === ' ') run({ type: 'continueDebrief' }); return; }
    if (phase === 'ending') { if (key === 'r') { state = createState(Date.now()); } else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } else if (key === 'q') quit(); return; }
    if (event.key === 'ArrowLeft' || key === 'a') run({ type: 'changeCentre', delta: -1 });
    else if (event.key === 'ArrowRight' || key === 'd') run({ type: 'changeCentre', delta: 1 });
    else if (event.key === 'ArrowUp' || key === 'w') run({ type: 'changeBandwidth', delta: 1 });
    else if (event.key === 'ArrowDown') run({ type: 'changeBandwidth', delta: -1 });
    else if (key === 'm') run({ type: 'cycleModulation' });
    else if (key === 'g') run({ type: 'changeGain', delta: 1 });
    else if (key === 'tab') run({ type: 'changeStation', delta: 1 });
    else if (key === 's') run({ type: 'sweep' });
    else if (key === 'n') run({ type: 'notch' });
    else if (key === 'p') run({ type: 'phaseLock' });
    else if (key === 'enter') {
      if (phase === 'broadcast') run({ type: 'confirmBroadcast' });
      else run({ type: 'capture' });
    }
    else {
      const action = broadcast(key);
      if (action) run({ type: 'selectBroadcast', action });
      else if (key === ' ' || key === 'c') run({ type: 'capture' });
    }
  }

  function render(): void {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette(), { helpOpen, paused });
    if (paused && !helpOpen && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  }

  const baseStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    if (renderInterval) clearInterval(renderInterval);
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l');
    baseStop();
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
