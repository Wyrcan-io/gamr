import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, FACTIONS, GOODS, type Action, type FactionId, type GameState, type GoodId, type MethodId } from './engine';
import { renderFrame, renderTitle, type MarketFocus, type MarketRenderModel } from './render';

export interface MarketOfMirrorsController { stop: () => void; isRunning: boolean; }

export function runMarketOfMirrorsGame(terminal: Terminal): MarketOfMirrorsController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let title = true;
  let helpOpen = false;
  let selectedGood = 0;
  let secondGood = 1;
  let selectedArtifact = 0;
  let selectedFaction = 0;
  let selectedFrameIndex = 0;
  let selectedIntensity = 0;
  let focus: MarketFocus = 'tape';
  let runSeed = Date.now();
  let state: GameState = createState(runSeed);
  let keyListener: { dispose: () => void } | undefined;
  const controller: MarketOfMirrorsController = { stop: () => { running = false; }, get isRunning() { return running; } };

  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (sameSeed = true): void => { state = applyCommand(state, { type: 'restart', sameSeed }); runSeed = state.seed; title = false; paused = false; pauseSelection = 0; helpOpen = false; render(); };
  const run = (command: Parameters<typeof applyCommand>[1]): void => { state = applyCommand(state, command); render(); };
  const selectedGoodId = (): GoodId => GOODS[selectedGood]?.id ?? 'echo';
  const selectedSecondId = (): GoodId => GOODS[secondGood]?.id ?? 'shadow';
  const selectedArtifactId = (): string | undefined => state.artifacts[selectedArtifact]?.id;

  function handlePause(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection;
    if (!result.confirmed) { render(); return true; }
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart(true);
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    if (running) render();
    return true;
  }

  function actionForKey(key: string): void {
    const good = selectedGoodId();
    if (key === 'b') run({ type: 'previewAction', action: { type: 'buy', goodId: good } });
    else if (key === 's') run({ type: 'previewAction', action: { type: 'sell', goodId: good } });
    else if (key === 'c') run({ type: 'previewAction', action: { type: 'combine', goodId: good, secondGoodId: selectedSecondId() } });
    else if (key === 'o' && selectedArtifactId()) run({ type: 'previewAction', action: { type: 'offer', artifactId: selectedArtifactId(), factionId: (Object.keys(FACTIONS) as FactionId[])[selectedFaction] } });
    else if (key === 'p') run({ type: 'previewAction', action: { type: 'publish', goodId: good, frame: ['coveted', 'vanishing', 'counterfeit', 'cursed'][selectedFrameIndex] as Action['frame'], intensity: ['whisper', 'broadside', 'proclamation'][selectedIntensity] as Action['intensity'] } });
    else if (key === 'e') run({ type: 'endDay' });
  }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (title) { if (key === 't') { runSeed = Date.now(); state = createState(runSeed, 'tutorial'); title = false; render(); } else if (key === 'enter' || key === 'p') { runSeed = Date.now(); state = createState(runSeed, 'standard'); title = false; render(); } else if (key === 'q') quit(); return; }
    if (helpOpen) { if (key === 'escape' || key === 'backspace' || key === 'enter' || key === '?' || key === 'h') helpOpen = false; render(); return; }
    if (key === '?' || key === 'h') { helpOpen = true; render(); return; }
    if (key === 'escape' && state.phase === 'preview') { run({ type: 'cancelPreview' }); return; }
    if (key === 'escape' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; render(); return; }
    if (handlePause(key, event)) return;
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'market') {
      if (key === 'tab') { focus = focus === 'tape' ? 'shelf' : focus === 'shelf' ? 'broadsheet' : 'tape'; render(); return; }
      if (key === 'arrowup' || key === 'w') { if (focus === 'tape') selectedGood = (selectedGood + GOODS.length - 1) % GOODS.length; else if (focus === 'shelf') selectedArtifact = Math.max(0, selectedArtifact - 1); render(); return; }
      if (key === 'arrowdown') { if (focus === 'tape') selectedGood = (selectedGood + 1) % GOODS.length; else if (focus === 'shelf') selectedArtifact = Math.min(Math.max(0, state.artifacts.length - 1), selectedArtifact + 1); render(); return; }
      if (key >= '1' && key <= '8') { selectedGood = Number(key) - 1; focus = 'tape'; render(); return; }
      if (key === 'a') { secondGood = (secondGood + 1) % GOODS.length; render(); return; }
      if (key === 'z') { secondGood = (secondGood + GOODS.length - 1) % GOODS.length; render(); return; }
      if (key === 'f') { selectedFrameIndex = (selectedFrameIndex + 1) % 4; render(); return; }
      if (key === 'g') { selectedIntensity = (selectedIntensity + 1) % 3; render(); return; }
      if (key === 'v') { selectedFaction = (selectedFaction + 1) % 4; render(); return; }
      if (key === 'j') { selectedArtifact = Math.min(Math.max(0, state.artifacts.length - 1), selectedArtifact + 1); focus = 'shelf'; render(); return; }
      if (key === 'k') { selectedArtifact = Math.max(0, selectedArtifact - 1); focus = 'shelf'; render(); return; }
      if (key === 'enter') { if (focus === 'tape') actionForKey('b'); else if (focus === 'shelf') actionForKey('o'); return; }
      actionForKey(key); return;
    }
    if (state.phase === 'preview') { if (key === 'enter' || key === ' ') run({ type: 'confirmAction' }); else if (key === 'backspace' || key === 'escape') run({ type: 'cancelPreview' }); return; }
    if (state.phase === 'bellReport') { if (key === 'enter' || key === ' ') run({ type: 'dismissBellReport' }); return; }
    if (state.phase === 'draft') { const index = Number(key) - 1; if (index >= 0 && index < state.offers.length) run({ type: 'chooseMethod', methodId: state.offers[index]!.id as MethodId }); return; }
    if (state.phase === 'ending') { if (key === 'r') restart(true); else if (key === 'n') restart(false); else if (key === 'q') quit(); }
  }

  function render(): void {
    const model: MarketRenderModel = { selectedGood, secondGood, selectedArtifact, selectedFaction, frame: selectedFrameIndex, intensity: selectedIntensity, focus, helpOpen, paused };
    let output = title ? renderTitle(terminal.cols, terminal.rows, getCurrentThemePalette()) : renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette(), model);
    if (paused && !helpOpen && terminal.cols >= 80 && terminal.rows >= 24) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  }
  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
