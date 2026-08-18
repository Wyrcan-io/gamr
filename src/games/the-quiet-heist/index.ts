import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, nextJob } from './engine';
import { renderFrame } from './render';
import type { Command, GameState } from './types';

export interface TheQuietHeistController { stop: () => void; isRunning: boolean; }

export function runTheQuietHeistGame(terminal: Terminal): TheQuietHeistController {
  let running = true; let paused = false; let pauseSelection = 0; let state: GameState = createState(Date.now());
  let listener: { dispose: () => void } | undefined;
  const controller: TheQuietHeistController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = () => { controller.stop(); dispatchGameQuit(terminal); };
  const command = (value: Command): void => { state = applyCommand(state, value); render(); };
  const restart = (): void => { state = applyCommand(state, { type: 'restart' }); paused = false; pauseSelection = 0; render(); };
  function pauseInput(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false; const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection; if (!result.confirmed) { render(); return true; }
    if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) restart(); else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); } if (running) render(); return true;
  }
  function onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation(); if (pauseInput(key, event)) return;
    if (state.helpOpen) { if (key === '?' || key === 'h' || key === 'escape' || key === 'backspace' || key === 'enter') command({ type: 'toggleHelp' }); return; }
    if (key === '?' || key === 'h') { command({ type: 'toggleHelp' }); return; }
    if (key === 'escape' && state.phase !== 'start' && state.phase !== 'ending' && state.phase !== 'gameOver') { paused = !paused; pauseSelection = 0; render(); return; }
    if (state.phase === 'start') { if (key === 't' || key === 'enter') command({ type: 'start', mode: 'tutorial' }); else if (key === 'c') command({ type: 'start', mode: 'campaign' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') command({ type: 'dismissBriefing' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending' || state.phase === 'gameOver') { if (key === 'r') restart(); else if (key === 'n') { state = nextJob(state); render(); } else if (key === 'q') quit(); return; }
    if (state.phase === 'review') { if (key === 'enter' || key === ' ') command({ type: 'commit' }); else if (key === 'escape' || key === 'backspace') command({ type: 'closeReview' }); return; }
    if (state.phase === 'report') { if (key === 'enter' || key === ' ') command({ type: 'dismissReport' }); return; }
    if (key === 'arrowleft' || key === 'left' || key === 'a') command({ type: 'move', direction: 'W' }); else if (key === 'arrowright' || key === 'right' || key === 'd') command({ type: 'move', direction: 'E' }); else if (key === 'arrowup' || key === 'up' || key === 'w') command({ type: 'move', direction: 'N' }); else if (key === 'arrowdown' || key === 'down' || key === 's') command({ type: 'move', direction: 'S' }); else if (key === 'i') command({ type: 'interact' }); else if (key === 'j') command({ type: 'jam' }); else if (key === 'x') command({ type: 'decoy' }); else if (key === 'u' || key === 'backspace') command({ type: 'undo' }); else if (key === 'enter' || key === ' ') command({ type: 'openReview' }); else if (key === 'q') quit();
  }
  function pauseOverlay(): string { return `\x1b[${Math.max(3, Math.floor(terminal.rows / 2) - 4)};1H${renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false })}`; }
  function render(): void { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette()); if (paused && terminal.cols >= 80 && terminal.rows >= 24) output += pauseOverlay(); terminal.write(output); }
  const originalStop = controller.stop; controller.stop = () => { if (!running) return; running = false; listener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); listener = terminal.onKey(({ domEvent }) => { if (running) onKey(domEvent); }); render(); }, 50);
  return controller;
}

export { applyCommand, createState, planningComparison, jobLocations } from './engine';
export type { GameState } from './types';
