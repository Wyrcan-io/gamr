import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemePalette } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { renderFrame } from './render';
import type { CameraId, Command, DoorId, PanelId, PersonId, RoomId } from './types';

export interface GhostShiftController { stop: () => void; isRunning: boolean; }
const rooms: RoomId[] = ['R', 'L', 'M', 'P', 'H', 'A', 'K', 'S', 'E'];
const panels: PanelId[] = ['feed', 'evidence', 'log', 'files'];

export function runGhostShiftGame(terminal: Terminal): GhostShiftController {
  let running = true; let paused = false; let pauseSelection = 0; let frame = 0; let help = false; let suspectIndex = 0;
  let state = createState(Date.now()); let renderInterval: ReturnType<typeof setInterval> | undefined; let keyListener: { dispose: () => void } | undefined;
  const controller: GhostShiftController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const run = (command: Command): void => { state = applyCommand(state, command).state; };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const selectedRoom = (): RoomId => state.selected.kind === 'room' ? state.selected.id : 'H';
  const cameraAtRoom = (): CameraId | undefined => Object.values(state.cameras).find(c => c.room === selectedRoom())?.id;
  const doorAtRoom = (): DoorId | undefined => Object.values(state.doors).find(d => d.a === selectedRoom() || d.b === selectedRoom())?.id;
  const handlePause = (key: string, event: KeyboardEvent): boolean => {
    if (!paused) return false; const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event); pauseSelection = result.newSelection; if (!result.confirmed) return true;
    if (pauseSelection === 0) paused = false; else if (pauseSelection === 1) { run({ type: 'restart' }); paused = false; } else if (pauseSelection === 2) quit(); else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); } else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); } return true;
  };
  const moveSelection = (dx: number, dy: number): void => { const current = rooms.indexOf(selectedRoom()); const next = Math.max(0, Math.min(rooms.length - 1, current + (dx !== 0 ? dx : dy * 3))); run({ type: 'select', selection: { kind: 'room', id: rooms[next] } }); };
  const handleKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (help) { if (key === 'h' || key === '?' || key === 'escape' || key === 'enter') help = false; return; }
    if (key === 'escape' && !['start', 'report', 'gameOver', 'ending'].includes(state.phase)) { paused = !paused; pauseSelection = 0; return; }
    if (handlePause(key, event)) return;
    if (key === 'h' || key === '?') { help = true; return; }
    if (state.phase === 'start') { if (key === 'q') quit(); else if (key === 't') run({ type: 'start', mode: 'tutorial' }); else if (key === 'c' || key === 'enter') run({ type: 'start', mode: 'campaign' }); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); return; }
    if (state.phase === 'report') { if (key === 'r') run({ type: 'restart' }); else if (key === 'enter' || key === ' ') run({ type: 'nextCase' }); return; }
    if (state.phase === 'gameOver') { if (key === 'r') run({ type: 'restart' }); else if (key === 'q') quit(); return; }
    if (state.phase === 'ending') { if (key === 'r') run({ type: 'start', mode: state.mode, seed: Date.now() }); else if (key === 'q' || key === 'enter') quit(); return; }
    if (key === 'q') { quit(); return; }
    if (key === '[' || key === ']') { const people: PersonId[] = ['NORA', 'SAM', 'PRIYA', 'LEON', 'MICA']; suspectIndex = (suspectIndex + (key === ']' ? 1 : people.length - 1)) % people.length; run({ type: 'select', selection: { kind: 'person', id: people[suspectIndex]! } }); }
    else if (event.key === 'ArrowLeft' || key === 'a') moveSelection(-1, 0); else if (event.key === 'ArrowRight') moveSelection(1, 0); else if (event.key === 'ArrowUp' || key === 'w') moveSelection(0, -1); else if (event.key === 'ArrowDown' || key === 's') moveSelection(0, 1);
    else if (key === 'tab') { const index = panels.indexOf(state.panel); run({ type: 'togglePanel', panel: panels[(index + 1) % panels.length] }); }
    else if (key === 'c') { const id = cameraAtRoom(); if (id) run({ type: 'wakeCamera', id }); }
    else if (key === 'b') { const room = selectedRoom(); const event = state.doorLog.find(item => { const door = state.doors[item.doorId]; return door.a === room || door.b === room; }) ?? state.doorLog[0]; if (event) run({ type: 'queryBadge', eventId: event.id }); }
    else if (key === 'd') { const id = doorAtRoom(); if (id) run({ type: 'toggleDoor', id }); }
    else if (key === 'p') run({ type: 'probe', room: selectedRoom() });
    else if (key === 'e') run({ type: 'togglePanel', panel: 'evidence' });
    else if (key === 'f') run({ type: 'togglePanel', panel: 'files' });
    else if (key === 'enter') { const candidate = state.selected.kind === 'person' ? state.selected.id : state.candidates.find(c => c.status === 'possible')?.id; if (candidate) run({ type: 'detain', suspect: candidate }); }
  };
  const render = (): void => { let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemePalette(), { frame: frame++, helpOpen: help }); if (paused && terminal.cols >= 80 && terminal.rows >= 24) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false }); terminal.write(output); };
  const baseStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; if (renderInterval) clearInterval(renderInterval); keyListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); baseStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); renderInterval = setInterval(() => { if (running) render(); }, 50); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); render(); }, 50);
  return controller;
}
