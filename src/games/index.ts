/**
 * @abhirup/gamr
 *
 * Terminal games for xterm.js and CLI
 *
 * Usage:
 * 1. Set the theme: setTheme('cyan')
 * 2. Run a game: games.snake.run(terminal)
 * 3. Handle game events: listen for GAME_EVENTS on window
 */

// Re-export utilities
export {
  setTheme,
  getTheme,
  getCurrentThemeColor,
  isLightTheme,
  getSubtleBackgroundColor,
  getVerticalAnchor,
  getThemeColorCode,
  enterAlternateBuffer,
  exitAlternateBuffer,
  isInAlternateBuffer,
  forceExitAlternateBuffer,
  isTerminalValid,
} from './utils';

export type { PhosphorMode } from './utils';

// Re-export transitions
export {
  GAME_EVENTS,
  playBootTransition,
  playExitTransition,
  playSwitchTransition,
  playQuickBoot,
  playSelectTransition,
  dispatchGameQuit,
  dispatchGameSwitch,
  dispatchGamesMenu,
  dispatchLaunchGame,
} from './gameTransitions';

// Re-export menu utilities
export {
  createMenuState,
  menuUp,
  menuDown,
  menuReset,
  menuConfirm,
  handleMenuInput,
  renderMenu,
  createPauseMenuItems,
  createGameOverMenuItems,
  createModeSelectMenuItems,
  navigateMenu,
  checkShortcut,
  renderSimpleMenu,
  PAUSE_MENU_ITEMS,
  MODE_SELECT_ITEMS,
} from './shared/menu';

export type {
  MenuItem,
  MenuState,
  RenderMenuOptions,
  SimpleMenuItem,
} from './shared/menu';

// Import game modules
import { run2048Game } from './2048';
import { runAsteroidsGame } from './asteroids';
import { runBreakoutGame } from './breakout';
import { runCourierGame } from './chopper';
import { runCrackGame } from './crack';
import { runFroggerGame } from './frogger';
import { runHangmanGame } from './hangman';
import { runMinesweeperGame } from './minesweeper';
import { runPongGame } from './pong';
import { runRunnerGame } from './runner';
import { runSimonGame } from './simon';
import { runSnakeGame } from './snake';
import { runSpaceInvadersGame } from './spaceinvaders';
import { runTetrisGame } from './tetris';
import { runTowerGame } from './tower';
import { runTronGame } from './tron';
import { runTypingTest } from './typingtest';
import { runWordleGame } from './wordle';
import { runHyperFighterGame } from './hyper-fighter';
import { runPacketPanicGame } from './packet-panic';
import { archivedGames } from './archived';

/**
 * Game registry with metadata
 */
export interface GameInfo {
  id: string;
  name: string;
  description: string;
  run: (terminal: import('@xterm/xterm').Terminal) => { stop: () => void; isRunning: boolean };
}

export const games: GameInfo[] = [
  // Active TUI lineup. The older game files and runner exports remain available
  // for later reactivation, but are intentionally hidden from the game menu.
  { id: 'packet-panic', name: 'Packet Panic', description: 'Route packets. Stop the trace.', run: runPacketPanicGame },
];

export const allGames: GameInfo[] = [...games, ...archivedGames];

/**
 * Get a game by ID
 */
export function getGame(id: string): GameInfo | undefined {
  return allGames.find(g => g.id === id);
}

/**
 * Get a random game
 */
export function getRandomGame(): GameInfo {
  return games[Math.floor(Math.random() * games.length)];
}

/**
 * Run a game by ID
 */
export function runGame(
  id: string,
  terminal: import('@xterm/xterm').Terminal
): { stop: () => void; isRunning: boolean } | undefined {
  const game = getGame(id);
  return game?.run(terminal);
}

// Also export individual game runners for direct imports
export {
  run2048Game,
  runAsteroidsGame,
  runBreakoutGame,
  runCourierGame,
  runCrackGame,
  runFroggerGame,
  runHangmanGame,
  runMinesweeperGame,
  runPongGame,
  runRunnerGame,
  runSimonGame,
  runSnakeGame,
  runSpaceInvadersGame,
  runTetrisGame,
  runTowerGame,
  runTronGame,
  runTypingTest,
  runWordleGame,
  runHyperFighterGame,
  runPacketPanicGame,
};

// Re-export games menu
export { showGamesMenu } from './gamesMenu';
export type { GamesMenuController, GamesMenuOptions } from './gamesMenu';

// Re-export effects
export {
  runMatrixEffect,
  startMatrixRain,
  getActiveMatrixController,
  isMatrixWaitingForKey,
  handleMatrixKeypress,
  runHackEffect,
  runRebootEffect,
} from './effects';
export type { MatrixController, HackController, RebootController } from './effects';

// Re-export shared game effects (particles, popups, shake, flash)
export {
  spawnParticles,
  spawnFirework,
  spawnSparkleTrail,
  updateParticles,
  addScorePopup,
  updatePopups,
  createShakeState,
  triggerShake,
  applyShake,
  createFlashState,
  triggerFlash,
  updateFlash,
  isFlashVisible,
  MAX_PARTICLES,
  PARTICLE_CHARS,
  FIREWORK_COLORS,
} from './shared/effects';
export type {
  Particle,
  ScorePopup,
  ScreenShakeState,
  FlashState,
} from './shared/effects';
