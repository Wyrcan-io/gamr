import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import type { ClaimSlot, Command, FinaleClaim, FinaleResponse, FinaleRisk, WorkAction } from './types';

export interface NightFrequencyController { stop: () => void; isRunning: boolean; }

export function runNightFrequencyGame(terminal: Terminal): NightFrequencyController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let frame = 0;
  let choiceSelection: 0 | 1 = 0;
  let state = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;

  const controller: NightFrequencyController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const run = (command: Command): void => { state = applyCommand(state, command).state; };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };

  function restart(): void { run({ type: 'restart' }); paused = false; pauseSelection = 0; }

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

  function toggleOverlay(overlay: 'help' | 'log' | 'dossier'): void { run({ type: 'toggleOverlay', overlay: state.overlay === overlay ? 'none' : overlay }); }
  function chooseBinary(index: 0 | 1): void {
    if (state.phase === 'caller') run({ type: 'chooseCaller', index });
    else if (state.phase === 'response') run({ type: 'chooseResponse', index });
    else if (state.phase === 'music') run({ type: 'chooseTrack', index });
    choiceSelection = 0;
  }
  function cycleClaim(slot: ClaimSlot): void { run({ type: 'cyclePin', slot }); }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    event.preventDefault(); event.stopPropagation();
    if (key === 'escape') {
      if (state.overlay !== 'none') { run({ type: 'toggleOverlay', overlay: 'none' }); return; }
      if (!['start', 'ending', 'report'].includes(state.phase)) { paused = !paused; pauseSelection = 0; }
      return;
    }
    if (handlePause(key, event)) return;
    if (key === 'q') { quit(); return; }
    if (key === 'i') { toggleOverlay('dossier'); return; }
    if (key === 'l') { toggleOverlay('log'); return; }
    if (key === 'h') { toggleOverlay('help'); return; }
    if (state.overlay !== 'none') {
      if (state.overlay === 'dossier') {
        if (key === '1') cycleClaim('operator');
        else if (key === '2') cycleClaim('method');
        else if (key === '3') cycleClaim('origin');
        else if (key === '4') cycleClaim('objective');
        else if (key === 'p') cycleClaim(state.dossier.selectedSlot);
      }
      return;
    }
    if (state.phase === 'start') { if (key === 't') run({ type: 'start', mode: 'tutorial' }); else if (key === 'p' || key === 'enter') run({ type: 'start', mode: 'campaign' }); return; }
    if (state.phase === 'brief') { if (key === 'enter' || key === ' ') run({ type: 'continueBrief' }); return; }
    if (state.phase === 'report') { if (key === 'enter' || key === ' ') run({ type: 'continue' }); return; }
    if (state.phase === 'ending') { if (key === 'r') { state = createState(Date.now()); } else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } return; }
    if (state.phase === 'caller' || state.phase === 'response' || state.phase === 'music') {
      if (key === '1' || key === 'a' || event.key === 'ArrowLeft') choiceSelection = 0;
      else if (key === '2' || key === 'd' || event.key === 'ArrowRight') choiceSelection = 1;
      else if (key === 'enter' || key === ' ') chooseBinary(choiceSelection);
      return;
    }
    if (state.phase === 'workbench') {
      if (key === 'e') { const next = state.dossier.evidence.find(item => item.status === 'unverified' && item.id !== state.selectedEvidenceId) ?? state.dossier.evidence.find(item => item.status === 'unverified'); if (next) run({ type: 'selectEvidence', evidenceId: next.id }); return; }
      const actions: Record<string, WorkAction> = { '1': 'patch', '2': 'scrub', '3': 'verify', '4': 'prepare', '5': 'skip' };
      const action = actions[key]; if (action) run({ type: 'work', action });
      return;
    }
    if (state.phase === 'finaleClaim') {
      const choices: Record<string, FinaleClaim> = { '1': 'full', '2': 'provenOnly', '3': 'uncertain' };
      if (choices[key]) run({ type: 'chooseFinaleClaim', choice: choices[key] });
      return;
    }
    if (state.phase === 'finaleResponse') {
      const choices: Record<string, FinaleResponse> = { '1': 'expose', '2': 'jam', '3': 'mobilize', '4': 'protect' };
      if (choices[key]) run({ type: 'chooseFinaleResponse', choice: choices[key] });
      return;
    }
    if (state.phase === 'finaleRisk') {
      const choices: Record<string, FinaleRisk> = { '1': 'live', '2': 'burst', '3': 'relays' };
      if (choices[key]) run({ type: 'chooseFinaleRisk', choice: choices[key] });
    }
  }

  function render(): void {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette().focus, frame++, choiceSelection);
    if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
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
