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
  // Ordered for first-time discovery enjoyment (most accessible first).
  { id: 'tetris', name: 'Tetris', description: 'Stack the blocks', run: runTetrisGame },
  { id: 'snake', name: 'Snake', description: 'Eat and grow', run: runSnakeGame },
  { id: '2048', name: '2048', description: 'Slide and combine tiles', run: run2048Game },
  { id: 'runner', name: 'Runner', description: 'Jump and duck', run: runRunnerGame },
  { id: 'pong', name: 'Pong', description: 'Classic paddle game', run: runPongGame },
  { id: 'wordle', name: 'Wordle', description: 'Guess the word', run: runWordleGame },
  { id: 'minesweeper', name: 'Minesweeper', description: 'Clear the mines', run: runMinesweeperGame },
  { id: 'hangman', name: 'Hangman', description: 'Guess the word', run: runHangmanGame },
  { id: 'spaceinvaders', name: 'Space Invaders', description: 'Defend Earth', run: runSpaceInvadersGame },
  { id: 'tower', name: 'Tower', description: 'Build a tower', run: runTowerGame },
  { id: 'simon', name: 'Simon', description: 'Memory game', run: runSimonGame },
  { id: 'frogger', name: 'Frogger', description: 'Cross the road', run: runFroggerGame },
  { id: 'breakout', name: 'Breakout', description: 'Break all the bricks', run: runBreakoutGame },
  { id: 'asteroids', name: 'Asteroids', description: 'Shoot the rocks', run: runAsteroidsGame },
  { id: 'typingtest', name: 'Typing Test', description: 'Test your speed', run: runTypingTest },
  { id: 'tron', name: 'Tron', description: 'Light cycle battle', run: runTronGame },
  { id: 'crack', name: 'Crack', description: 'Hack the system', run: runCrackGame },
  { id: 'chopper', name: 'Chopper', description: 'Deliver passengers', run: runCourierGame },
  { id: 'hyper-fighter', name: 'Hyper Fighter', description: 'Gem battle vs AI', run: runHyperFighterGame },
];

/**
 * Get a game by ID
 */
export function getGame(id: string): GameInfo | undefined {
  return games.find(g => g.id === id);
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
