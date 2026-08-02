import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { addScorePopup, createShakeState, Particle, spawnParticles, triggerShake, updateParticles, updatePopups, type ScorePopup } from '../shared/effects';
import { applyCommand, createState } from './engine';
import { ADVOCATES, evidenceById, judgeById } from './content';
import { renderFrame } from './render';
import type { Assignment, Command, GameState } from './types';

export interface DiceTribunalController { stop: () => void; isRunning: boolean; }

export function runDiceTribunalGame(terminal: Terminal): DiceTribunalController {
  let running = true; let paused = false; let pauseSelection = 0; let selection = 0; let help = false; let glitchFrame = 0;
  let state: GameState = createState(Date.now()); let renderInterval: ReturnType<typeof setInterval> | undefined; let gameInterval: ReturnType<typeof setInterval> | undefined; let keyListener: { dispose: () => void } | undefined;
  let particles: Particle[] = []; let popups: ScorePopup[] = []; const shake = createShakeState();
  const controller: DiceTribunalController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (): void => { state = createState(Date.now()); paused = false; pauseSelection = 0; selection = 0; help = false; };
  const command = (value: Command): void => { const result = applyCommand(state, value); state = result.state; if (result.events.includes('roll') || result.events.includes('reroll')) spawnParticles(particles, 78, 10, 5, '\x1b[1;96m', ['·', '○', '◆']); if (result.events.includes('win')) { spawnParticles(particles, 55, 13, 14, '\x1b[1;92m', ['✦', '◆', '✓']); triggerShake(shake, 5, 1); addScorePopup(popups, 45, 12, 'VERDICT!', '\x1b[1;92m'); } if (result.events.includes('loss')) { triggerShake(shake, 8, 2); spawnParticles(particles, 50, 14, 10, '\x1b[1;91m', ['×', '!', '·']); } };
  function handlePause(key: string, domEvent: KeyboardEvent): boolean { if (!paused) return false; const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent); pauseSelection = result.newSelection; if (!result.confirmed) return true; if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) restart(); else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); } return true; }
  function moveSelection(delta: number, max: number): void { selection = (selection + delta + max) % max; }
  function selectedDieId(): string | undefined { return state.dice[selection % Math.max(1, state.dice.length)]?.id; }
  function autoAssign(): void {
    const active = state.activeCase; if (!active) return; const assigned = new Set(active.hearing.assignments.map(item => item.dieId)); const occupied = new Set(active.hearing.assignments.map(item => JSON.stringify(item.target)));
    for (const rolled of active.hearing.rolled) { if (assigned.has(rolled.dieId)) continue; const die = state.dice.find(item => item.id === rolled.dieId); const face = die?.faces[rolled.faceIndex]; if (!face || face.symbol === 'gaffe') continue; let target: Assignment['target'] | undefined;
      for (const evidenceId of active.selectedEvidenceIds) { if (active.admittedEvidenceIds.includes(evidenceId)) continue; const evidence = evidenceById(evidenceId); if (!evidence) continue; for (let slotIndex = 0; slotIndex < evidence.slots.length; slotIndex++) { const slot = evidence.slots[slotIndex]!; const candidate = { kind: 'evidence' as const, evidenceId, slotIndex }; if (!occupied.has(JSON.stringify(candidate)) && slot.symbol === face.symbol && slot.minRank <= face.rank) { target = candidate; break; } } if (target) break; }
      if (!target && face.symbol === 'objection' && !occupied.has('object')) target = { kind: 'object' }; if (!target && !occupied.has('clarify')) target = { kind: 'clarify' }; if (target) { command({ type: 'assignDie', assignment: { dieId: rolled.dieId, target } }); assigned.add(rolled.dieId); occupied.add(JSON.stringify(target)); }
    }
  }
  function handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key.toLowerCase(); domEvent.preventDefault(); domEvent.stopPropagation();
    if (key === 'escape' && !['start', 'ending', 'gameOver'].includes(state.phase)) { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, domEvent)) return;
    if (help) { if (key === 'h' || key === 'escape' || key === 'enter') help = false; return; }
    if (key === 'h') { help = true; return; }
    if (state.phase === 'start') { if (key === 'p' || key === 'enter') command({ type: 'startCampaign', seed: state.seed }); else if (key === 't') command({ type: 'startTutorial' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'advocateSelect') { if (key >= '1' && key <= '4') { selection = Number(key) - 1; command({ type: 'chooseAdvocate', advocateId: ADVOCATES[selection]!.id }); } else if (key === 'arrowdown' || key === 's') moveSelection(1, 4); else if (key === 'arrowup' || key === 'w') moveSelection(-1, 4); else if (key === 'enter') command({ type: 'chooseAdvocate', advocateId: ADVOCATES[selection]!.id }); return; }
    if (state.phase === 'docket') { if (key >= '1' && key <= '2') { selection = Number(key) - 1; } else if (key === 'arrowdown' || key === 's') moveSelection(1, Math.max(1, state.docket.length)); else if (key === 'arrowup' || key === 'w') moveSelection(-1, Math.max(1, state.docket.length)); else if (key === 'enter') { const choice = state.docket[selection]; if (choice) command({ type: 'chooseDocket', choiceId: choice.id }); } return; }
    if (state.phase === 'briefing') { if (key === '1' || key === 'enter') command({ type: 'chooseInterpretation', interpretationId: requireDefaultInterpretation(state) }); else if (key === '2') command({ type: 'chooseInterpretation', interpretationId: requireAlternateInterpretation(state) }); return; }
    if (state.phase === 'evidenceSelect') { if (/^[1-8]$/.test(key)) { selection = Number(key) - 1; const id = state.evidencePortfolio[selection]; if (id) command({ type: 'toggleEvidence', evidenceId: id }); } else if (key === 'arrowdown' || key === 's') moveSelection(1, 8); else if (key === 'arrowup' || key === 'w') moveSelection(-1, 8); else if (key === 'enter') command({ type: 'confirmCaseFile' }); return; }
    if (state.phase === 'hearing') { if (/^[1-5]$/.test(key)) { selection = Number(key) - 1; const id = state.dice[selection]?.id; if (id) command({ type: 'toggleRerollMark', dieId: id }); } else if (key === 'r') command({ type: 'rerollMarked' }); else if (key === 'a') autoAssign(); else if (key === 'u') { const id = selectedDieId(); if (id) command({ type: 'unassignDie', dieId: id }); } else if (key === 'enter') command({ type: 'commitHearing' }); return; }
    if (state.phase === 'hearingResult') { if (key === 'enter' || key === ' ') command({ type: 'continueAfterHearing' }); return; }
    if (state.phase === 'caseResult') { if (key === 'enter' || key === ' ') command({ type: 'continueAfterCase' }); else if (key === 'r') restart(); else if (key === 'q') quit(); return; }
    if (state.phase === 'precedentDraft') { if (/^[1-3]$/.test(key)) { const id = state.rewardOptions[Number(key) - 1]; if (id) command({ type: 'choosePrecedent', precedentId: id }); } else if (key === 'd') command({ type: 'distinguishOpinions' }); return; }
    if (state.phase === 'chambers') { if (key >= '1' && key <= '4') command({ type: 'chooseChambersService', serviceId: ({ '1': 'heal', '2': 'polish', '3': 'expunge', '4': 'evidence' } as Record<string, string>)[key]! }); else if (key === 'enter') command({ type: 'leaveChambers' }); return; }
    if (state.phase === 'circuitReport') { if (key === 'enter' || key === ' ') command({ type: 'continueAfterCase' }); return; }
    if (state.phase === 'ending' || state.phase === 'gameOver') { if (key === 'r') restart(); else if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } else if (key === 'q') quit(); }
  }
  function render(): void { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor(), glitchFrame++, selection, help); if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false }); terminal.write(output); }
  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); if (gameInterval) clearInterval(gameInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); gameInterval = setInterval(() => { if (!running) return; updateParticles(particles); updatePopups(popups); }, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}

function requireDefaultInterpretation(state: GameState): string { const judge = state.activeCase ? judgeById(state.activeCase.judgeId) : undefined; return judge?.defaultInterpretation.id ?? ''; }
function requireAlternateInterpretation(state: GameState): string { const judge = state.activeCase ? judgeById(state.activeCase.judgeId) : undefined; return judge?.alternateInterpretation.id ?? ''; }
