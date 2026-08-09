import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, type Command } from './engine';
import { renderFrame } from './render';
import type { AudioMode, LampMode, RoomId } from './types';

export interface ContainmentProtocolController { stop: () => void; isRunning: boolean; }

export function runContainmentProtocolGame(terminal: Terminal): ContainmentProtocolController {
  let running = true; let paused = false; let pauseSelection = 0; let glitchFrame = 0; let state = createState(Date.now()); let renderInterval: ReturnType<typeof setInterval> | undefined; let listener: { dispose: () => void } | undefined;
  const controller: ContainmentProtocolController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = () => { controller.stop(); dispatchGameQuit(terminal); };
  const restart = () => { state = createState(Date.now(), state.mode); paused = false; pauseSelection = 0; };
  const command = (value: Command) => { state = applyCommand(state, value); };
  const roomIndex = (room: RoomId, delta: number): RoomId => { const rooms: RoomId[] = ['A', 'B', 'C', 'D']; return rooms[(rooms.indexOf(room) + delta + rooms.length) % rooms.length]!; };
  function handlePause(key: string, event: KeyboardEvent): boolean { if (!paused) return false; const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection; if (!result.confirmed) return true; if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) restart(); else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); } return true; }
  function onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation(); if (key === 'escape' && state.phase !== 'start' && state.phase !== 'ending') { paused = !paused; pauseSelection = 0; return; } if (handlePause(key, event)) return;
    if (state.phase === 'start') { if (key === 't') command({ type: 'startRun', mode: 'tutorial' }); else if (key === 'c' || key === 'enter') command({ type: 'startRun', mode: 'campaign' }); else if (key === 'n') command({ type: 'startRun', mode: 'nightWatch' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') command({ type: 'dismissBriefing' }); else if (key === 'r') command({ type: 'showRules' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'cycleReport') { if (key === 'enter' || key === ' ') command({ type: 'dismissCycleReport' }); return; }
    if (state.phase === 'shiftReport') { if (key === '1' || key === '2' || key === '3') command({ type: 'chooseUpgrade', upgradeId: state.upgradeOffers[Number(key) - 1]?.id ?? '' }); return; }
    if (state.phase === 'gameOver') { if (key === 'r' || key === 'enter') command({ type: 'restartShift' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending') { if (key === 'n') { controller.stop(); dispatchGameSwitch(terminal); } else if (key === 'q') quit(); return; }
    if (state.phase !== 'working') return;
    if (key === 'arrowleft' || key === 'arrowright') { command({ type: 'selectRoom', roomId: roomIndex(state.selectedRoom, key === 'arrowleft' ? -1 : 1) }); return; }
    if (key === 'left' || key === 'a') command({ type: 'selectRoom', roomId: roomIndex(state.selectedRoom, -1) }); else if (key === 'right' || key === 'f') command({ type: 'selectRoom', roomId: roomIndex(state.selectedRoom, 1) }); else if (key === '1' || key === '2' || key === '3') { const lamps: LampMode[] = ['dark', 'dim', 'bright']; command({ type: 'setLamp', roomId: state.selectedRoom, lamp: lamps[Number(key) - 1]! }); } else if (key === 's' || key === 'u' || key === 'w' || key === 't') { const audio: Record<string, AudioMode> = { s: 'silent', u: 'hush', w: 'white', t: 'tone' }; command({ type: 'setAudio', roomId: state.selectedRoom, audio: audio[key]! }); } else if (key === 'd') command({ type: 'setDoor', roomId: state.selectedRoom, door: state.rooms[state.selectedRoom].door === 'open' ? 'sealed' : 'open' }); else if (key === 'm') command({ type: 'moveTechnician', to: state.selectedRoom }); else if (key === 'p') command({ type: 'useProbe', roomId: state.selectedRoom }); else if (key === 'r') command({ type: 'showRules' }); else if (key === 'l') command({ type: 'showLog' }); else if (key === 'h') command({ type: 'showHelp' }); else if (key === 'enter' || key === ' ') command({ type: 'commitCycle' }); else if (key === 'q') quit();
  }
  function render(): void { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor(), glitchFrame++); if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += linePause(terminal.cols, terminal.rows, pauseSelection); terminal.write(output); }
  function linePause(cols: number, rows: number, selection: number): string { return `\x1b[${Math.floor(rows / 2) - 3};1H${renderSimpleMenu(PAUSE_MENU_ITEMS, selection, { centerX: Math.floor(cols / 2), startY: Math.floor(rows / 2) - 2, showShortcuts: false })}`; }
  const originalStop = controller.stop; controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); listener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); listener = terminal.onKey(({ domEvent }) => { if (running) onKey(domEvent); }); render(); }, 50);
  return controller;
}

export { createState, applyCommand } from './engine';
export type { GameState, RoomId } from './types';
