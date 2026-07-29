/**
 * @abhirup/gamr
 *
 * Terminal games for xterm.js and CLI.
 * 18 games: snake, tetris, 2048, pong, asteroids, and more.
 *
 * Library usage (xterm.js):
 *   import { games, setTheme } from '@abhirup/gamr';
 *   setTheme('cyan');
 *   const controller = games[0].run(terminal);
 *
 * CLI usage:
 *   npx @abhirup/gamr
 */

export {
  // Game registry
  games,
  getGame,
  getRandomGame,
  runGame,
  type GameInfo,

  // Theme utilities
  setTheme,
  getTheme,
  getCurrentThemeColor,
  isLightTheme,
  getSubtleBackgroundColor,
  getVerticalAnchor,
  getThemeColorCode,
  type PhosphorMode,

  // Terminal buffer management
  enterAlternateBuffer,
  exitAlternateBuffer,
  isInAlternateBuffer,
  forceExitAlternateBuffer,
  isTerminalValid,

  // Transitions
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

  // Menu system
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
  type MenuItem,
  type MenuState,
  type RenderMenuOptions,
  type SimpleMenuItem,

  // Individual game runners
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

  // Games menu
  showGamesMenu,
  type GamesMenuController,
  type GamesMenuOptions,

  // Effects
  runMatrixEffect,
  startMatrixRain,
  getActiveMatrixController,
  isMatrixWaitingForKey,
  handleMatrixKeypress,
  runHackEffect,
  runRebootEffect,
  type MatrixController,
  type HackController,
  type RebootController,

  // Shared game effects (particles, popups, shake, flash)
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
  type Particle,
  type ScorePopup,
  type ScreenShakeState,
  type FlashState,
} from './games';
