import type { Terminal } from '@xterm/xterm';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { getCurrentThemeColor, getSubtleBackgroundColor, isLightTheme } from '../utils';
import { navigateMenu, PAUSE_MENU_ITEMS } from '../shared/menu';
import { applyCommand, createState } from './engine';
import { renderGame } from './render';
import type { Command, GameState } from './types';

export interface The13thLiftController {
  stop: () => void;
  isRunning: boolean;
}

function theme() {
  return {
    accent: getCurrentThemeColor(),
    muted: getSubtleBackgroundColor(),
    warning: isLightTheme() ? '\x1b[33m' : '\x1b[93m',
    good: isLightTheme() ? '\x1b[32m' : '\x1b[92m',
    danger: isLightTheme() ? '\x1b[31m' : '\x1b[91m',
  };
}

export function runThe13thLiftGame(terminal: Terminal): The13thLiftController {
  const colors = theme();
  let running = true;
  let paused = false;
  let pauseSelection = 0;
  let state: GameState = createState();
  let transitStartedAt = 0;
  let renderInterval: ReturnType<typeof setInterval> | undefined;
  let gameInterval: ReturnType<typeof setInterval> | undefined;
  let keyListener: { dispose: () => void } | undefined;

  const controller: The13thLiftController = {
    stop: () => { running = false; },
    get isRunning() { return running; },
  };

  const dispatch = (command: Command): void => {
    if (!running) return;
    const result = applyCommand(state, command);
    state = result.state;
    if (command.type === 'commitRoute' && state.phase === 'transit') transitStartedAt = Date.now();
  };

  const quit = (): void => {
    controller.stop();
    dispatchGameQuit(terminal);
  };

  const showGames = (): void => {
    controller.stop();
    dispatchGamesMenu(terminal);
  };

  const nextGame = (): void => {
    controller.stop();
    dispatchGameSwitch(terminal);
  };

  const render = (): void => {
    if (!running) return;
    terminal.write(renderGame(state, terminal.cols, terminal.rows, colors));
  };

  const handlePause = (key: string, domEvent: KeyboardEvent): boolean => {
    if (!paused) return false;
    const result = navigateMenu(pauseSelection, PAUSE_MENU_ITEMS.length, key, domEvent);
    if (result.newSelection !== pauseSelection) {
      pauseSelection = result.newSelection;
      return true;
    }
    if (result.confirmed) {
      switch (pauseSelection) {
        case 0: paused = false; break;
        case 1: dispatch({ type: 'restart' }); paused = false; break;
        case 2: quit(); break;
        case 3: showGames(); break;
        case 4: nextGame(); break;
        default: break;
      }
      return true;
    }
    if (key === 'r') { dispatch({ type: 'restart' }); paused = false; return true; }
    if (key === 'l') { showGames(); return true; }
    if (key === 'n') { nextGame(); return true; }
    return true;
  };

  const handleKey = (domEvent: KeyboardEvent): void => {
    if (!running) return;
    domEvent.preventDefault();
    domEvent.stopPropagation();
    const key = domEvent.key.toLowerCase();
    if (key === 'escape') {
      if (state.activeOverlay !== 'none') { dispatch({ type: 'toggleOverlay', overlay: 'none' }); return; }
      paused = !paused;
      pauseSelection = 0;
      return;
    }
    if (handlePause(key, domEvent)) return;

    if (state.phase === 'start') {
      if (key === 'q') { quit(); return; }
      if (key === 't') { dispatch({ type: 'startTutorial' }); return; }
      if (key === 'a') { dispatch({ type: 'startAfterHours' }); return; }
      if (domEvent.key === 'Enter' || domEvent.key === ' ') { dispatch({ type: 'startCampaign' }); return; }
      return;
    }
    if (state.phase === 'gameOver' || state.phase === 'ending') {
      if (key === 'r') dispatch({ type: 'restart' });
      else if (key === 'q') quit();
      return;
    }
    if (state.activeOverlay === 'hint-confirm') {
      if (key === 'y') dispatch({ type: 'confirmHint' });
      else if (key === 'n') dispatch({ type: 'toggleOverlay', overlay: 'none' });
      return;
    }
    if (key === '?') {
      dispatch({ type: 'toggleOverlay', overlay: state.activeOverlay === 'help' ? 'none' : 'help' });
      return;
    }
    if (state.activeOverlay !== 'none') {
      if (key === 'd' || key === 'r' || key === 'l') dispatch({ type: 'toggleOverlay', overlay: 'none' });
      return;
    }
    if (state.phase === 'finale') {
      if (key === '1') dispatch({ type: 'chooseFinale', choiceId: 'seal' });
      else if (key === '2') dispatch({ type: 'chooseFinale', choiceId: 'open' });
      else if (key === '3') dispatch({ type: 'chooseFinale', choiceId: 'operator' });
      return;
    }
    if (domEvent.key === 'Enter') {
      if (state.phase === 'briefing') dispatch({ type: 'dismissBriefing' });
      else if (state.phase === 'planning') dispatch({ type: 'openRouteReview' });
      else if (state.phase === 'routeReview') dispatch({ type: 'confirmRoute' });
      else if (state.phase === 'transit') dispatch({ type: 'finishTransit' });
      else if (state.phase === 'audit') dispatch({ type: 'dismissAudit' });
      else if (state.phase === 'interlude') dispatch({ type: 'dismissInterlude' });
      return;
    }
    if (state.phase === 'routeReview' && (domEvent.key === 'Backspace' || key === 'escape')) { dispatch({ type: 'toggleStop' }); return; }
    if (domEvent.key === 'ArrowLeft' || key === 'a' || domEvent.key === 'ArrowUp' || key === 'w') dispatch({ type: 'moveButtonCursor', delta: -1 });
    else if (domEvent.key === 'ArrowRight' || key === 'f' || domEvent.key === 'ArrowDown' || key === 's') dispatch({ type: 'moveButtonCursor', delta: 1 });
    else if (domEvent.key === ' ') dispatch({ type: 'toggleStop' });
    else if (domEvent.key === 'Backspace' || domEvent.key === 'Delete') dispatch({ type: 'undoStop' });
    else if (domEvent.key === 'Tab') dispatch({ type: 'cyclePassenger', delta: domEvent.shiftKey ? -1 : 1 });
    else if (key === 'd') dispatch({ type: 'toggleOverlay', overlay: 'directory' });
    else if (key === 'r') dispatch({ type: 'toggleOverlay', overlay: 'rules' });
    else if (key === 'l') dispatch({ type: 'toggleOverlay', overlay: 'log' });
    else if (key === 'i') dispatch({ type: 'requestHint' });
  };

  setTimeout(() => {
    if (!running) return;
    terminal.write('\x1b[?1049h\x1b[?25l');
    renderInterval = setInterval(render, 75);
    gameInterval = setInterval(() => {
      if (!running) return;
      if (state.phase === 'transit' && transitStartedAt > 0 && Date.now() - transitStartedAt >= 350) {
        transitStartedAt = 0;
        dispatch({ type: 'finishTransit' });
      }
      render();
    }, 50);
    keyListener = terminal.onKey(({ domEvent }) => handleKey(domEvent));
    render();
  }, 50);

  const originalStop = controller.stop;
  controller.stop = () => {
    if (!running) return;
    if (renderInterval) clearInterval(renderInterval);
    if (gameInterval) clearInterval(gameInterval);
    keyListener?.dispose();
    terminal.write('\x1b[?25h\x1b[0m\x1b[?1049l');
    originalStop();
  };
  return controller;
}
