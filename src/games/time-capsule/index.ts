import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, currentRoom, episode, neighbours, actionsForCurrentRoom, createState } from './engine';
import { renderFrame } from './render';
import type { AnchorKind, Command, GameState } from './types';

export interface TimeCapsuleController {
  stop: () => void;
  isRunning: boolean;
}

const capsuleKinds: AnchorKind[] = ['memory', 'object', 'clue'];

export function runTimeCapsuleGame(terminal: Terminal): TimeCapsuleController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let frame = 0;
  let capsuleKind = 0;
  let capsuleCandidate = 0;
  let state: GameState = createState(Date.now());
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;

  const controller: TimeCapsuleController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  const command = (value: Command): void => {
    state = applyCommand(state, value).state;
  };

  const quit = (): void => {
    controller.stop();
    dispatchGameQuit(terminal);
  };

  const restart = (): void => {
    command({ type: 'restartEpisode' });
    paused = false;
    pauseSelection = 0;
  };

  const pauseInput = (key: string, event: KeyboardEvent): boolean => {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    return true;
  };

  const travelByDirection = (dx: number, dy: number): void => {
    const current = currentRoom(state);
    const choices = neighbours(state).map(id => episode(state).rooms.find(room => room.id === id)).filter(Boolean);
    const choice = choices
      .filter(room => Math.sign(room!.x - current.x) === Math.sign(dx) && Math.sign(room!.y - current.y) === Math.sign(dy))
      .sort((a, b) => Math.abs((a!.x - current.x) * dx + (a!.y - current.y) * dy) - Math.abs((b!.x - current.x) * dx + (b!.y - current.y) * dy))[0];
    if (choice) command({ type: 'travel', roomId: choice.id });
  };

  const capsuleCandidates = (): string[] => {
    const kind = capsuleKinds[capsuleKind]!;
    const current = state.progress.anchors[kind];
    const acquired = episode(state).anchors.filter(anchor => anchor.kind === kind && state.loop.discoveriesThisLoop.includes(anchor.id)).map(anchor => anchor.id);
    return [...new Set([current, ...acquired].filter((id): id is string => Boolean(id)))];
  };

  const handleCapsuleKey = (key: string, event: KeyboardEvent): void => {
    if (key === 'tab') { capsuleKind = (capsuleKind + 1) % capsuleKinds.length; capsuleCandidate = 0; return; }
    if (event.key === 'ArrowUp' || key === 'w') { capsuleCandidate = Math.max(0, capsuleCandidate - 1); return; }
    if (event.key === 'ArrowDown' || key === 's') { capsuleCandidate += 1; return; }
    if (key === 'backspace') { command({ type: 'restoreAnchor', kind: capsuleKinds[capsuleKind]! }); return; }
    if (key === 'c') { command({ type: 'commitAnchors' }); return; }
    if (key === 'r') { restart(); return; }
    if (key === 'enter' || key === ' ') {
      const candidates = capsuleCandidates();
      const selected = candidates[capsuleCandidate % Math.max(1, candidates.length)] ?? null;
      command({ type: 'stageAnchor', kind: capsuleKinds[capsuleKind]!, anchorId: selected });
    }
  };

  const handleKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    event.preventDefault();
    event.stopPropagation();

    if (pauseInput(key, event)) return;
    if (key === 'escape' && state.phase === 'exploring' && state.overlay === 'none') {
      paused = true;
      pauseSelection = 0;
      return;
    }
    if (state.overlay !== 'none') {
      if (key === 'escape' || key === 'enter' || key === 'j' || key === 't' || key === 'h') command({ type: 'closeOverlay' });
      return;
    }
    if (state.phase === 'start') {
      if (key === 'q') quit();
      else if (key === 't') command({ type: 'start', mode: 'tutorial' });
      else if (key === 'c' || key === 'enter' || key === ' ') command({ type: 'start', mode: 'campaign' });
      return;
    }
    if (state.phase === 'briefing') {
      if (key === 'enter' || key === ' ') command({ type: 'dismissBriefing' });
      else if (key === 'q') quit();
      return;
    }
    if (state.phase === 'capsule') { handleCapsuleKey(key, event); return; }
    if (state.phase === 'report') {
      if (key === 'r') restart();
      else if (key === 'enter' || key === ' ') command({ type: 'nextEpisode' });
      else if (key === 'q') quit();
      return;
    }
    if (state.phase === 'ending') { if (key === 'q' || key === 'enter') quit(); else if (key === 'r') restart(); return; }

    if (key === 'q') { quit(); return; }
    if (key === 'j') { command({ type: 'openOverlay', overlay: 'journal' }); return; }
    if (key === 't') { command({ type: 'openOverlay', overlay: 'timeline' }); return; }
    if (key === '?') { command({ type: 'openOverlay', overlay: 'help' }); return; }
    if (key === 'h') { const lead = episode(state).leads.find(item => (state.progress.hintsUsed[item.id] ?? 0) < 3) ?? episode(state).leads[0]; if (lead) command({ type: 'requestHint', leadId: lead.id }); return; }
    if (key === 'c') { command({ type: 'endLoop' }); return; }
    if (key === 'backspace' && state.pendingAction) { command({ type: 'cancelActionPreview' }); return; }
    if (key === ' ') { command({ type: 'wait' }); return; }
    if (key === 'tab') { command({ type: 'setFocus', focus: state.focus === 'actions' ? 'map' : state.focus === 'map' ? 'journal' : 'actions' }); return; }
    if (event.key === 'ArrowLeft' || key === 'a') { travelByDirection(-1, 0); return; }
    if (event.key === 'ArrowRight' || key === 'd') { travelByDirection(1, 0); return; }
    if (event.key === 'ArrowUp' || key === 'w') { if (state.focus === 'actions') command({ type: 'moveSelection', delta: -1 }); else travelByDirection(0, -1); return; }
    if (event.key === 'ArrowDown' || key === 's') { if (state.focus === 'actions') command({ type: 'moveSelection', delta: 1 }); else travelByDirection(0, 1); return; }
    if (key === 'enter') {
      const actions = actionsForCurrentRoom(state);
      const selected = actions[state.selection % Math.max(1, actions.length)];
      if (state.pendingAction) command({ type: 'confirmAction' });
      else if (selected) command({ type: 'previewAction', actionId: selected.action.id });
      return;
    }
    if (/^[1-5]$/.test(key)) {
      const actions = actionsForCurrentRoom(state);
      const selected = actions[Number(key) - 1];
      if (selected) command({ type: 'previewAction', actionId: selected.action.id });
    }
  };

  const render = (): void => {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette().focus, frame++, { capsuleKind, capsuleCandidate, helpOpen: state.overlay === 'help' });
    if (paused && terminal.cols >= 80 && terminal.rows >= 24) {
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    }
    terminal.write(output);
  };

  const baseStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    running = false;
    if (renderInterval) clearInterval(renderInterval);
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m');
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

export { applyCommand, createState } from './engine';
export type { GameState } from './types';
