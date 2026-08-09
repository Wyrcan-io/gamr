import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, currentTransaction, type GameState, type Treatment } from './engine';
import { renderFrame, type RogueRenderModel } from './render';

export interface RogueLedgerController { stop: () => void; isRunning: boolean; }

export function runRogueLedgerGame(terminal: Terminal): RogueLedgerController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let title = true;
  let helpOpen = false;
  let selectedTreatment = 0;
  let state: GameState = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;
  const controller: RogueLedgerController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const run = (command: Parameters<typeof applyCommand>[1]): void => { state = applyCommand(state, command); };
  const restart = (): void => { state = applyCommand(state, { type: 'restartRun' }); title = false; paused = false; pauseSelection = 0; helpOpen = false; selectedTreatment = 0; };

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  }

  function chosenTreatment(): Treatment | undefined { return currentTransaction(state)?.allowedTreatments[selectedTreatment]; }
  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (title) { if (key === 't') { state = createState(Date.now(), 'tutorial'); title = false; } else if (key === 'p' || key === 'enter') { state = createState(Date.now(), 'standard'); title = false; } else if (key === 'q') quit(); return; }
    if (key === '?' || key === 'h') { helpOpen = !helpOpen; return; }
    if (helpOpen) { if (key === 'escape' || key === 'backspace' || key === 'enter') helpOpen = false; return; }
    if (key === 'escape' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'working') {
      const legal = currentTransaction(state)?.allowedTreatments ?? [];
      if (key === 'arrowup' || key === 'w') selectedTreatment = (selectedTreatment + legal.length - 1) % Math.max(1, legal.length);
      else if (key === 'arrowdown' || key === 's') selectedTreatment = (selectedTreatment + 1) % Math.max(1, legal.length);
      else if (key === 'enter' && chosenTreatment()) run({ type: 'selectTreatment', treatment: chosenTreatment()! });
      else { const aliases: Record<string, Treatment> = { b: 'book', c: 'capitalize', d: 'defer', r: 'reserve', x: 'decline' }; const treatment = aliases[key]; if (treatment) run({ type: 'selectTreatment', treatment }); }
      return;
    }
    if (state.phase === 'preview') { if (key === 'enter' || key === ' ') run({ type: 'confirmEntry' }); else if (key === 'backspace' || key === 'escape') run({ type: 'cancelPreview' }); return; }
    if (state.phase === 'result') { if (key === 'enter' || key === ' ') run({ type: 'dismissResult' }); return; }
    if (state.phase === 'draft') { const index = Number(key) - 1; if (index >= 0 && index < state.offers.length) run({ type: 'chooseOffer', offerId: state.offers[index]!.id }); return; }
    if (state.phase === 'report') { if (key === 'enter' || key === ' ') run({ type: 'continueReport' }); return; }
    if (state.phase === 'gameOver') { if (key === 'r') run({ type: 'restartQuarter' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending') { if (key === 'r') restart(); else if (key === 'q') quit(); }
  }

  function render(): void {
    const model: RogueRenderModel = { selectedTreatment, helpOpen, paused };
    let output = title ? '\x1b[2J\x1b[H\x1b[3;30Hg/ ROGUE LEDGER\x1b[5;22HIMPROBABLE FINANCE\x1b[10;26HENTER STANDARD   T INDUCTION\x1b[12;34HQ QUIT' : renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette(), model);
    if (paused && !helpOpen && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  }
  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
