import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, currentTransaction, type GameState, type Treatment } from './engine';
import { renderFrame, renderTitle, type RogueRenderModel } from './render';

export interface RogueLedgerController { stop: () => void; isRunning: boolean; }

export function runRogueLedgerGame(terminal: Terminal): RogueLedgerController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let title = true;
  let helpOpen = false;
  let selectedTreatment = 0;
  let runSeed = Date.now();
  let state: GameState = createState(runSeed);
  let keyListener: { dispose: () => void } | undefined;
  const controller: RogueLedgerController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const run = (command: Parameters<typeof applyCommand>[1]): void => { state = applyCommand(state, command); render(); };
  const restart = (): void => { state = applyCommand(state, { type: 'restartRun', seed: runSeed }); runSeed = state.seed; title = false; paused = false; pauseSelection = 0; helpOpen = false; selectedTreatment = 0; render(); };

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection;
    if (!result.confirmed) { render(); return true; }
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    if (running) render();
    return true;
  }

  function chosenTreatment(): Treatment | undefined { return currentTransaction(state)?.allowedTreatments[selectedTreatment]; }
  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (title) { if (key === 't') { runSeed = Date.now(); state = createState(runSeed, 'tutorial'); title = false; render(); } else if (key === 'p' || key === 'enter') { runSeed = Date.now(); state = createState(runSeed, 'standard'); title = false; render(); } else if (key === 'q') quit(); return; }
    if (helpOpen) { if (key === 'escape' || key === 'backspace' || key === 'enter' || key === '?' || key === 'h') helpOpen = false; render(); return; }
    if (key === '?' || key === 'h') { helpOpen = true; render(); return; }
    if (key === 'escape' && state.phase === 'preview') { run({ type: 'cancelPreview' }); return; }
    if (key === 'escape' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; render(); return; }
    if (handlePause(key, event)) return;
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'working') {
      const legal = currentTransaction(state)?.allowedTreatments ?? [];
      if (key === 'arrowup' || key === 'w') { selectedTreatment = (selectedTreatment + legal.length - 1) % Math.max(1, legal.length); render(); }
      else if (key === 'arrowdown' || key === 's') { selectedTreatment = (selectedTreatment + 1) % Math.max(1, legal.length); render(); }
      else if (key === 'enter' && chosenTreatment()) run({ type: 'selectTreatment', treatment: chosenTreatment()! });
      else { const aliases: Record<string, Treatment> = { b: 'book', c: 'capitalize', d: 'defer', r: 'reserve', x: 'decline' }; const treatment = aliases[key]; if (treatment) run({ type: 'selectTreatment', treatment }); }
      return;
    }
    if (state.phase === 'preview') { if (key === 'enter' || key === ' ') run({ type: 'confirmEntry' }); else if (key === 'backspace' || key === 'escape') run({ type: 'cancelPreview' }); return; }
    if (state.phase === 'result') { if (key === 'enter' || key === ' ') run({ type: 'dismissResult' }); return; }
    if (state.phase === 'draft') { const index = Number(key) - 1; if (index >= 0 && index < state.offers.length) run({ type: 'chooseOffer', offerId: state.offers[index]!.id }); return; }
    if (state.phase === 'report') { if (key === 'enter' || key === ' ') run({ type: 'continueReport' }); return; }
    if (state.phase === 'gameOver') { if (key === 'r') run({ type: 'restartQuarter' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending') { if (key === 'r') restart(); else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } else if (key === 'q') quit(); }
  }

  function render(): void {
    const model: RogueRenderModel = { selectedTreatment, helpOpen, paused };
    let output = title ? renderTitle(terminal.cols, terminal.rows, getCurrentThemePalette()) : renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette(), model);
    if (paused && !helpOpen && terminal.cols >= 80 && terminal.rows >= 24) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  }
  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
