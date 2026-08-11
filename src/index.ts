/**
 * @wyrcan/gamr
 *
 * Terminal games for xterm.js and CLI.
 * A curated catalog of 20 original terminal games.
 *
 * Library usage (xterm.js):
 *   import { games, setTheme } from '@wyrcan/gamr';
 *   setTheme('carbon');
 *   const controller = games[0].run(terminal);
 *
 * CLI usage:
 *   npx @wyrcan/gamr
 */

export {
  // Game registry
  games,
  allGames,
  getGame,
  getRandomGame,
  runGame,
  type GameInfo,

  // Theme utilities
  setTheme,
  getTheme,
  getCurrentThemeColor,
  getCurrentThemePalette,
  getThemePalette,
  isLightTheme,
  getSubtleBackgroundColor,
  getVerticalAnchor,
  getThemeColorCode,
  getUiTheme,
  getUiThemeModes,
  type PhosphorMode,
  type TerminalThemePalette,
  type UiTheme,

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
  runPacketPanicGame,
  runDeadLetterDepartmentGame,
  runSignalNoiseGame,
  runLastTrainHomeGame,
  runBlackoutGridGame,
  runRogueLedgerGame,
  runContainmentProtocolGame,
  runFiveMinuteKingdomGame,
  runMarketOfMirrorsGame,
  runGhostShiftGame,
  runStackTraceGame,
  runTheQuietHeistGame,
  runOrbitalPostGame,
  runDiceTribunalGame,
  runTimeCapsuleGame,
  runTinyFleetGame,
  runDungeonCourierGame,
  runNightFrequencyGame,
  runBotanyLabGame,
  runThe13thLiftGame,

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

export {
  displayWidth,
  stripAnsi,
  clipToWidth,
  padToWidth,
  centerText,
  wrapText,
} from './ui/terminal';
