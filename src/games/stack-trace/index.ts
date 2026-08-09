import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { activePuzzle, applyCommand, createState } from './engine';
import { renderFrame } from './render';
import type { Command, Focus, StackTraceState } from './types';

export interface StackTraceController { stop: () => void; isRunning: boolean; }

export function runStackTraceGame(terminal: Terminal): StackTraceController {
  let running = true;
  let paused = false;
  let helpOpen = false;
  let pauseSelection = 0;
  let state: StackTraceState = createState();
  let keyListener: { dispose: () => void } | undefined;

  const controller: StackTraceController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const command = (value: Command): void => { state = applyCommand(state, value).state; render(); };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const focusCycle = (): void => { const next: Focus = state.focus === 'tape' ? 'tray' : state.focus === 'tray' ? 'tests' : 'tape'; command({ type: 'focus', focus: next }); };

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) { render(); return true; }
    switch (pauseSelection) {
      case 0: paused = false; break;
      case 1: command({ type: 'restart' }); paused = false; pauseSelection = 0; break;
      case 2: quit(); break;
      case 3: controller.stop(); dispatchGamesMenu(terminal); break;
      case 4: controller.stop(); dispatchGameSwitch(terminal); break;
      default: break;
    }
    if (running) render();
    return true;
  }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (helpOpen) { if (key === '?' || key === 'escape') helpOpen = false; render(); return; }
    if (state.phase === 'start') { if (key === 't') command({ type: 'start', mode: 'tutorial' }); else if (key === 'd') command({ type: 'start', mode: 'daily' }); else if (key === 'p' || key === 'enter' || key === ' ') command({ type: 'start', mode: 'campaign' }); else if (key === '?') { helpOpen = true; render(); } else if (key === 'q') quit(); return; }
    if (key === 'escape') { paused = !paused; pauseSelection = 0; render(); return; }
    if (handlePause(key, event)) return;
    if (state.phase === 'ending') { if (key === 'r') command({ type: 'restart' }); else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } else if (key === 'q') quit(); return; }
    if (state.phase === 'complete') { if (key === 'n' || key === 'enter') command({ type: 'next' }); else if (key === 'r') command({ type: 'restart' }); else if (key === 'q') quit(); return; }
    if (key === '?') { helpOpen = true; render(); return; }
    if (key === 'tab') { focusCycle(); return; }
    if (key === '1') { command({ type: 'focus', focus: 'tape' }); return; }
    if (key === '2') { command({ type: 'focus', focus: 'tray' }); return; }
    if (key === '3') { command({ type: 'focus', focus: 'tests' }); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || key === 'a' || key === 'w') { command({ type: 'move', delta: -1 }); return; }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || key === 'd' || (key === 's' && state.focus !== 'tests')) { command({ type: 'move', delta: 1 }); return; }
    if (state.focus === 'tray' && (key === 'enter' || key === ' ')) { const id = state.tray[state.selectedTrayIndex]; if (id) command({ type: 'insert', blockId: id, at: state.selectedTapeSlot }); return; }
    if (state.focus === 'tape' && key === ' ') { command({ type: 'lift', at: state.selectedTapeSlot }); return; }
    if (state.focus === 'tape' && key === 'enter' && state.liftedBlockId) { command({ type: 'drop', at: state.selectedTapeSlot }); return; }
    if (state.focus === 'tape' && (key === 'x' || key === 'backspace')) { command({ type: 'return', at: state.selectedTapeSlot }); return; }
    if (key === 'm') { const id = state.focus === 'tape' ? state.tape[state.selectedTapeSlot] : state.focus === 'tray' ? state.tray[state.selectedTrayIndex] : undefined; if (id) command({ type: 'mutate', blockId: id, direction: event.shiftKey ? -1 : 1 }); return; }
    if (key === 'z') { command({ type: 'undo' }); return; }
    if (key === 'y') { command({ type: 'redo' }); return; }
    if (key === 'r') { command({ type: 'run' }); return; }
    if (key === 'f') { const index = state.results.findIndex(result => result.status !== 'pass' && result.status !== 'unrun'); if (index >= 0) { command({ type: 'focus', focus: 'tests' }); state.selectedTestIndex = index; render(); } return; }
    if (key === 'h') { command({ type: 'hint', tier: Math.min(3, state.hintsUsed + 1) as 1 | 2 | 3 }); return; }
    if (state.focus === 'tests' && (key === 's' || key === 'enter' || key === ' ')) { command({ type: 'trace', delta: 1 }); return; }
  }

  function render(): void {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette(), { helpOpen });
    if (paused && !helpOpen && terminal.cols >= 80 && terminal.rows >= 24) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
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

export { activePuzzle };
