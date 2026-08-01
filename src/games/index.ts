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
import { runDeadLetterDepartmentGame } from './dead-letter-department';
import { runSignalNoiseGame } from './signal-noise';
import { runLastTrainHomeGame } from './last-train-home';
import { runBlackoutGridGame } from './blackout-grid';
import { runRogueLedgerGame } from './rogue-ledger';
import { runContainmentProtocolGame } from './containment-protocol';
import { runFiveMinuteKingdomGame } from './five-minute-kingdom';
import { runGhostShiftGame } from './ghost-shift';
import { runStackTraceGame } from './stack-trace';
import { runTheQuietHeistGame } from './the-quiet-heist';
import { runOrbitalPostGame } from './orbital-post';
import { runDiceTribunalGame } from './dice-tribunal';
import { runTimeCapsuleGame } from './time-capsule';
import { runTinyFleetGame } from './tiny-fleet';
import { archivedGames } from './archived';

/**
 * Game registry with metadata
 */
export interface GameInfo {
  id: string;
  name: string;
  description: string;
  maturity?: 'featured' | 'beta' | 'workshop';
  pace?: 'real-time' | 'turn-based';
  difficulty?: 1 | 2 | 3;
  session?: '5 min' | '10–15 min' | 'campaign';
  run: (terminal: import('@xterm/xterm').Terminal) => { stop: () => void; isRunning: boolean };
}

export const games: GameInfo[] = [
  // Active TUI lineup. The older game files and runner exports remain available
  // for later reactivation, but are intentionally hidden from the game menu.
  { id: 'stack-trace', name: 'Stack Trace', description: 'Repair the blocks. Pass every test.', maturity: 'featured', pace: 'turn-based', difficulty: 2, session: '10–15 min', run: runStackTraceGame },
  { id: 'five-minute-kingdom', name: 'Five-Minute Kingdom', description: 'Draft a tiny kingdom. Make every square count.', maturity: 'featured', pace: 'turn-based', difficulty: 1, session: '5 min', run: runFiveMinuteKingdomGame },
  { id: 'dead-letter-department', name: 'Dead Letter Department', description: 'Inspect the mail. Seal what answers back.', maturity: 'featured', pace: 'turn-based', difficulty: 1, session: '10–15 min', run: runDeadLetterDepartmentGame },
  { id: 'packet-panic', name: 'Packet Panic', description: 'Route packets. Stop the trace.', maturity: 'featured', pace: 'real-time', difficulty: 2, session: '10–15 min', run: runPacketPanicGame },
  { id: 'signal-noise', name: 'Signal//Noise', description: 'Isolate transmissions. Find the source. Choose your reply.', maturity: 'beta', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runSignalNoiseGame },
  { id: 'last-train-home', name: 'Last Train Home', description: 'Dispatch the last evacuation trains through a collapsing rail network.', maturity: 'beta', pace: 'turn-based', difficulty: 3, session: '10–15 min', run: runLastTrainHomeGame },
  { id: 'blackout-grid', name: 'Blackout Grid', description: 'Restore the city. Isolate faults. Hold the load.', maturity: 'workshop', pace: 'real-time', difficulty: 2, session: '10–15 min', run: runBlackoutGridGame },
  { id: 'rogue-ledger', name: 'Rogue Ledger', description: 'Draft rules. Survive bizarre quarters.', maturity: 'workshop', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runRogueLedgerGame },
  { id: 'containment-protocol', name: 'Containment Protocol', description: 'Learn the rules. Hold the rooms.', maturity: 'workshop', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runContainmentProtocolGame },
  { id: 'ghost-shift', name: 'Ghost Shift', description: 'Catch the intruder from cameras, door logs, and dwindling power.', maturity: 'workshop', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runGhostShiftGame },
  { id: 'the-quiet-heist', name: 'The Quiet Heist', description: 'Predict patrols. Steal the object. Find a new way out.', maturity: 'workshop', pace: 'turn-based', difficulty: 2, session: '10–15 min', run: runTheQuietHeistGame },
  { id: 'orbital-post', name: 'Orbital Post', description: 'Schedule the relay. Outrun the solar weather.', maturity: 'workshop', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runOrbitalPostGame },
  { id: 'dice-tribunal', name: 'Dice Tribunal', description: 'Roll the evidence. Risk the reroll. Rewrite precedent.', maturity: 'workshop', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runDiceTribunalGame },
  { id: 'time-capsule', name: 'Time Capsule', description: 'Keep three truths. Rewrite five minutes.', maturity: 'workshop', pace: 'turn-based', difficulty: 2, session: 'campaign', run: runTimeCapsuleGame },
  { id: 'tiny-fleet', name: 'Tiny Fleet', description: 'Seal three orders. Read the fog. Outguess the pirates.', maturity: 'workshop', pace: 'turn-based', difficulty: 3, session: 'campaign', run: runTinyFleetGame },
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
  runDeadLetterDepartmentGame,
  runSignalNoiseGame,
  runLastTrainHomeGame,
  runBlackoutGridGame,
  runRogueLedgerGame,
  runContainmentProtocolGame,
  runFiveMinuteKingdomGame,
  runGhostShiftGame,
  runStackTraceGame,
  runTheQuietHeistGame,
  runOrbitalPostGame,
  runDiceTribunalGame,
  runTimeCapsuleGame,
  runTinyFleetGame,
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
