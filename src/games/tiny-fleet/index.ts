import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import type { Command, GameState, ShipOrder } from './types';

export interface TinyFleetController { stop: () => void; isRunning: boolean; }

export function runTinyFleetGame(terminal: Terminal): TinyFleetController {
  let running = true; let paused = false; let pauseSelection = 0;
  let state: GameState = createState(Date.now());
  let keyListener: { dispose: () => void } | undefined;
  const controller: TinyFleetController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const send = (command: Command): void => { state = applyCommand(state, command); render(); };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = (): void => { send({ type: 'restart' }); paused = false; pauseSelection = 0; };

  function pauseInput(key: string, event: KeyboardEvent): boolean {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection;
    if (!result.confirmed) { render(); return true; }
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restart();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    if (running) render(); return true;
  }

  function selectedOrder(type: ShipOrder['type']): ShipOrder {
    if (type === 'fire' || type === 'smoke') return { type, target: { ...state.cursor } };
    return { type } as ShipOrder;
  }

  function handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (state.helpOpen) { if (key === '?' || key === 'h' || key === 'escape' || key === 'backspace' || key === 'enter') send({ type: 'toggleHelp' }); return; }
    if (key === '?' || key === 'h') { send({ type: 'toggleHelp' }); return; }
    if (pauseInput(key, event)) return;
    if (state.phase === 'orderReview' && (key === 'escape' || key === 'backspace')) { send({ type: 'closeOrderReview' }); return; }
    if (state.phase === 'replay' && (key === 'escape' || key === 'backspace')) { send({ type: 'advanceReplay' }); return; }
    if (key === 'escape' && !['start', 'ending', 'battleReport'].includes(state.phase)) { paused = !paused; pauseSelection = 0; return; }
    if (state.phase === 'start') { if (key === 't') send({ type: 'start', mode: 'skirmish' }); else if (key === 'p' || key === 'enter') send({ type: 'start', mode: 'campaign' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') send({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'orderReview') { if (key === 'enter' || key === ' ') send({ type: 'sealOrders' }); else if (key === 'escape' || key === 'backspace') send({ type: 'closeOrderReview' }); return; }
    if (state.phase === 'roundReport') { if (key === 'enter' || key === ' ') send({ type: 'openReplay' }); return; }
    if (state.phase === 'replay') { if (key === 'enter' || key === ' ' || key === 'arrowright') send({ type: 'advanceReplay' }); return; }
    if (state.phase === 'battleReport' || state.phase === 'ending') { if (key === 'r') restart(); else if (key === 'n' && state.outcome === 'victory') send({ type: 'nextBattle' }); else if (key === 'q') quit(); return; }
    if (key === 'q') { quit(); return; }
    if (key === '1' || key === '2' || key === '3') { const ship = state.ships.filter(item => item.side === 'player' && item.afloat)[Number(key) - 1]; if (ship) send({ type: 'selectShip', shipId: ship.id }); return; }
    if (key === 'tab') { send({ type: 'cyclePanel' }); return; }
    if (event.key === 'ArrowLeft') send({ type: 'moveCursor', delta: { x: -1, y: 0 } });
    else if (event.key === 'ArrowRight') send({ type: 'moveCursor', delta: { x: 1, y: 0 } });
    else if (event.key === 'ArrowUp') send({ type: 'moveCursor', delta: { x: 0, y: -1 } });
    else if (event.key === 'ArrowDown') send({ type: 'moveCursor', delta: { x: 0, y: 1 } });
    else if (key === 'w' || key === 'a' || key === 'd' || key === 's') send({ type: 'queueOrder', shipId: state.selectedShipId, order: selectedOrder(key === 'w' ? 'ahead' : key === 'a' ? 'port' : key === 'd' ? 'starboard' : 'about') });
    else if (key === 'f') send({ type: 'queueOrder', shipId: state.selectedShipId, order: selectedOrder('fire') });
    else if (key === 'g') send({ type: 'queueOrder', shipId: state.selectedShipId, order: selectedOrder('brace') });
    else if (key === 'x') {
      const ship = state.ships.find(item => item.id === state.selectedShipId);
      send({ type: 'queueOrder', shipId: state.selectedShipId, order: ship?.classId === 'scout' ? { type: 'sweep' } : selectedOrder('smoke') });
    }
    else if (key === '.') send({ type: 'queueOrder', shipId: state.selectedShipId, order: selectedOrder('hold') });
    else if (key === 'backspace' || key === 'u') send({ type: 'clearOrder', shipId: state.selectedShipId });
    else if (key === 'enter' || key === ' ') send({ type: 'openOrderReview' });
  }

  function pauseOverlay(): string { return renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false }); }
  function render(): void { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette()); if (paused && !state.helpOpen && terminal.cols >= 80 && terminal.rows >= 24) output += pauseOverlay(); terminal.write(output); }

  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); });
    render();
  }, 50);
  return controller;
}

export { applyCommand, createState, deriveObservation, previewSelectedOrder, validateOrder } from './engine';
export type { GameState, ObservationState, Command, ShipOrder } from './types';
