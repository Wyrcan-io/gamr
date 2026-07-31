import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, nextJob } from './engine';
import { renderFrame } from './render';
import type { Command, GameState } from './types';

export interface TheQuietHeistController { stop: () => void; isRunning: boolean; }

export function runTheQuietHeistGame(terminal: Terminal): TheQuietHeistController {
  let running = true; let paused = false; let pauseSelection = 0; let glitchFrame = 0; let state: GameState = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined; let listener: { dispose: () => void } | undefined;
  const controller: TheQuietHeistController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = () => { controller.stop(); dispatchGameQuit(terminal); };
  const command = (value: Command): void => { state = applyCommand(state, value); };
  const restart = (): void => { state = createState(state.seed); paused = false; pauseSelection = 0; };
  function pauseInput(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false; const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection; if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) restart(); else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { running = false; dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { running = false; dispatchGameSwitch(terminal); } return true;
  }
  function help(): void { state = { ...state, notice: 'READ ARROWS, AP, AND AMBER FORECAST. GUARDS MOVE ONLY ON ENTER.' }; }
  function onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation(); if (pauseInput(key, event)) return;
    if (key === 'escape' && state.phase !== 'start' && state.phase !== 'ending' && state.phase !== 'gameOver') { paused = !paused; pauseSelection = 0; return; }
    if (state.phase === 'start') { if (key === 't' || key === 'enter') command({ type: 'start', mode: 'tutorial' }); else if (key === 'c') command({ type: 'start', mode: 'campaign' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') command({ type: 'dismissBriefing' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending' || state.phase === 'gameOver') { if (key === 'r') restart(); else if (key === 'n') { state = nextJob(state); } else if (key === 'q') quit(); return; }
    if (key === '?') { help(); return; }
    if (key === 'left' || key === 'a') command({ type: 'move', direction: 'W' }); else if (key === 'right' || key === 'd') command({ type: 'move', direction: 'E' }); else if (key === 'up' || key === 'w') command({ type: 'move', direction: 'N' }); else if (key === 'down' || key === 's') command({ type: 'move', direction: 'S' }); else if (key === 'i') command({ type: 'interact' }); else if (key === 'j') command({ type: 'jam' }); else if (key === 'x') command({ type: 'decoy' }); else if (key === 'u') command({ type: 'undo' }); else if (key === 'enter' || key === ' ') command({ type: 'commit' }); else if (key === 'q') quit();
  }
  function pauseOverlay(): string { return `\x1b[${Math.max(3, Math.floor(terminal.rows / 2) - 4)};1H${renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false })}`; }
  function render(): void { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor(), glitchFrame++); if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += pauseOverlay(); terminal.write(output); }
  const originalStop = controller.stop; controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); listener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); listener = terminal.onKey(({ domEvent }) => { if (running) onKey(domEvent); }); render(); }, 50);
  return controller;
}

export { applyCommand, createState } from './engine';
export type { GameState } from './types';
