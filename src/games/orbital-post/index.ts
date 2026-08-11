import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS, renderSimpleMenu } from '../shared/menu';
import { applyCommand, createState, getQueueJobs } from './engine';
import { renderFrame } from './render';
import type { Command, GameState, Job } from './types';

export interface OrbitalPostController { stop: () => void; isRunning: boolean; }

export function runOrbitalPostGame(terminal: Terminal): OrbitalPostController {
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let state: GameState = createState(Date.now());
  let keyListener: { dispose: () => void } | undefined;
  let resizeListener: { dispose: () => void } | undefined;
  const controller: OrbitalPostController = { stop: () => { running = false; }, get isRunning() { return running; } };
  const quit = (): void => { controller.stop(); dispatchGameQuit(terminal); };
  const run = (command: Command): void => { state = applyCommand(state, command).state; render(); };
  const restartShift = (): void => { run({ type: 'restartShift' }); paused = false; pauseSelection = 0; render(); };
  const handlePause = (key: string, event: KeyboardEvent): boolean => {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, event);
    pauseSelection = result.newSelection;
    if (!result.confirmed) { if (key === 'escape') paused = false; render(); return true; }
    if (pauseSelection === 0) paused = false;
    else if (pauseSelection === 1) restartShift();
    else if (pauseSelection === 2) quit();
    else if (pauseSelection === 3) { controller.stop(); dispatchGamesMenu(terminal); }
    else if (pauseSelection === 4) { controller.stop(); dispatchGameSwitch(terminal); }
    render(); return true;
  };
  const selectQueue = (delta: number): void => {
    const jobs = getQueueJobs(state);
    if (!jobs.length) return;
    const current = Math.max(0, jobs.findIndex(job => job.id === state.selectedJobId));
    const next = jobs[(current + delta + jobs.length) % jobs.length] as Job;
    run({ type: 'selectJob', jobId: next.id });
  };
  const handleKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase(); event.preventDefault(); event.stopPropagation();
    if (key === 'escape' && !['start', 'ending', 'gameOver', 'shiftReport', 'windowReport', 'upgrade', 'cancelConfirm'].includes(state.phase)) { paused = !paused; pauseSelection = 0; render(); return; }
    if (handlePause(key, event)) return;
    if (state.phase === 'start') { if (key === 'q') quit(); else if (key === 'c' || key === 'enter') run({ type: 'startRun', mode: 'campaign' }); else if (key === 'o') run({ type: 'startRun', mode: 'openOrbit' }); return; }
    if (state.phase === 'briefing') { if (key === 'enter' || key === ' ') run({ type: 'dismissBriefing' }); else if (key === 'h') run({ type: 'toggleHelp' }); return; }
    if (state.phase === 'windowReport') { if (key === 'enter' || key === ' ') run({ type: 'dismissWindowReport' }); return; }
    if (state.phase === 'shiftReport') { if (key === 'enter' || key === ' ') run({ type: 'dismissWindowReport' }); else if (key === 'r') restartShift(); return; }
    if (state.phase === 'upgrade') { if (key === '1' || key === '2' || key === '3') { const offer = state.upgradeOffers[Number(key) - 1]; if (offer) run({ type: 'chooseUpgrade', upgradeId: offer.id }); } return; }
    if (state.phase === 'cancelConfirm') { if (key === 'y' || key === 'enter') run({ type: 'confirmCancel', accepted: true }); else if (key === 'n' || key === 'escape') run({ type: 'confirmCancel', accepted: false }); return; }
    if (state.phase === 'gameOver' || state.phase === 'ending') { if (key === 'r') restartShift(); else if (key === 'q' || key === 'enter') quit(); return; }
    if (key === 'q') { quit(); return; }
    if (event.key === 'ArrowUp' || key === 'w' || key === 'k') selectQueue(-1);
    else if (event.key === 'ArrowDown' || key === 's' || key === 'j') { if (key === 's' && state.selectedJobId) run({ type: 'scheduleJob' }); else selectQueue(1); }
    else if (event.key === 'ArrowLeft' || key === 'a') run({ type: 'selectStart', delta: -1 });
    else if (event.key === 'ArrowRight' || key === 'd') run({ type: 'selectStart', delta: 1 });
    else if (key === ' ') run({ type: 'armAdvance' });
    else if (key === 'enter') run({ type: state.armedAdvance ? 'advanceWindow' : 'scheduleJob' });
    else if (key === 'x') run({ type: 'unscheduleJob' });
    else if (key === 'c') run({ type: 'requestCancel' });
    else if (key === 'l') run({ type: 'toggleLog' });
    else if (key === 'h' || key === '?') run({ type: 'toggleHelp' });
  };
  const render = (): void => {
    let output = renderFrame(state, terminal.cols, terminal.rows, getCurrentThemeColor());
    if (paused && terminal.cols >= 80 && terminal.rows >= 28) output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseSelection, { centerX: Math.floor(terminal.cols / 2), startY: Math.floor(terminal.rows / 2) - 3, showShortcuts: false });
    terminal.write(output);
  };
  const originalStop = controller.stop;
  controller.stop = () => { if (!running) return; running = false; keyListener?.dispose(); resizeListener?.dispose(); terminal.write('\x1b[?25h\x1b[?1049l\x1b[0m'); originalStop(); };
  setTimeout(() => { if (!running) return; terminal.write('\x1b[?1049h\x1b[?25l'); keyListener = terminal.onKey(({ domEvent }) => { if (running) handleKey(domEvent); }); resizeListener = terminal.onResize(() => render()); render(); }, 50);
  return controller;
}
