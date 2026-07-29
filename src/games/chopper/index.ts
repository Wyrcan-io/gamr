/**
 * Hyper Chopper
 *
 * UGH!-inspired 2D physics delivery game.
 * Fly a prehistoric helicopter, pick up passengers,
 * deliver them to platforms. Don't fall in the water!
 *
 * FIXED SCREEN - no scrolling, like Pac-Man
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor, getSubtleBackgroundColor, getVerticalAnchor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { LEVELS, TUTORIAL_LEVELS, type Platform } from './levels';
import {
  type Particle,
  type Popup,
  spawnParticles,
  spawnFirework,
  addPopup,
  updateParticles,
  updatePopups,
  spawnSparkleTrail,
  spawnSplash,
  getRandomDeliveryMessage,
} from './effects';
import {
  PAUSE_MENU_ITEMS,
  MODE_SELECT_ITEMS,
  renderSimpleMenu,
  navigateMenu,
} from '../shared/menu';

/**
 * Courier Game Controller
 */
export interface CourierController {
  stop: () => void;
  isRunning: boolean;
}

// Physics constants - FLAPPY STYLE but playable! (adjusted for 40fps)
const GRAVITY = 0.04; // Halved for 2x frame rate
const FLAP_POWER = 0.35; // Halved for 2x frame rate
const THRUST_POWER = 0.09; // Halved for 2x frame rate
const MAX_VELOCITY_X = 0.35; // Halved for 2x frame rate
const MAX_VELOCITY_Y = 0.45; // Halved for 2x frame rate
const AIR_DRAG_X = 0.97; // Adjusted for 2x frame rate (sqrt of 0.94)
const AIR_DRAG_Y = 0.98; // Adjusted for 2x frame rate (sqrt of 0.96)

// Rope mechanics - retractable! (adjusted for 40fps)
const ROPE_MIN_LENGTH = 1.5; // Retracted (default)
const ROPE_MAX_LENGTH = 5;   // Extended (when SPACE held)
const ROPE_EXTEND_SPEED = 0.2; // Halved for 2x frame rate
const ROPE_RETRACT_SPEED = 0.15; // Halved for 2x frame rate
const ROPE_FAST_RETRACT_SPEED = 0.3; // Halved for 2x frame rate


/**
 * Hyper Chopper Game
 */
export function runCourierGame(terminal: Terminal): CourierController {
  const themeColor = getCurrentThemeColor();

  // Minimum terminal size
  const MIN_COLS = 40;
  const MIN_ROWS = 16;

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let crashAnimation = 0; // Frames of crash animation before showing game over
  let paused = false;
  let levelComplete = false;

  // Menu state
  let showingModeSelect = true; // Show tutorial/play selection
  let menuSelection = 0; // 0 = Tutorial, 1 = Play
  let pauseMenuSelection = 0; // 0 = Resume, 1 = Restart, 2 = Quit, 3 = List Games, 4 = Next Game

  // Tutorial state
  let tutorialMode = false;
  let tutorialLevelIndex = 0; // Which tutorial level (0=flying, 1=delivery, 2=rope)
  let tutorialStep = 0; // Step within current tutorial level
  let tutorialPromptTimer = 0; // For flashing prompts

  // FIXED SCREEN - game world is the viewport!
  let screenWidth = 48;
  let screenHeight = 16;

  // Rig state
  let rigX = 10;
  let rigY = 4;
  let rigVX = 0;
  let rigVY = 0;
  let rigAngle = 0;

  // Passenger/payload state
  let passengerX = 0;
  let passengerY = 0;
  let passengerVX = 0;
  let passengerVY = 0;
  let hasPassenger = false;

  // Level state
  let currentLevel = 0;
  let timeRemaining = 60;
  let score = 0;
  let deliveriesComplete = 0;
  let totalDeliveries = 3; // Deliveries per level

  // Dynamic pickup/dropoff - randomly assigned each delivery
  let pickupPlatformIndex = -1;
  let dropoffPlatformIndex = -1;
  let doorAnimation = 0; // For door open/close animation
  let newPackageDelay = 0; // Delay before new package spawns (all doors inactive)
  let levelCompleteAnimation = 0; // Fun animation when level complete
  let deliveringAnimation = 0; // Animation when dropping package (before delivery completes)

  // Passenger pickup grace period (prevents instant water death)
  let passengerGraceFrames = 0;

  // Visual effects
  let particles: Particle[] = [];
  let popups: Popup[] = [];
  let screenShake = 0;
  let glitchFrame = 0;

  // Tutorial/grace period
  let tutorialCountdown = 0;
  let invincibleFrames = 0;

  // Flap state - CRITICAL FOR GAMEPLAY
  let flapCooldown = 0; // Frames until next flap (KEEP SHORT!)
  let flapAnimation = 0;
  let rotorFrame = 0;

  // Input state
  let inputLeft = false;
  let inputRight = false;
  let inputExtendRope = false; // SPACE held = extend rope
  let inputContractRope = false; // SHIFT held = fast retract rope

  // Rope state
  let currentRopeLength = ROPE_MIN_LENGTH;

  // Timeout tracking for cleanup
  const pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

  // Levels imported from ./levels.ts
  const levels = LEVELS;

  // Interval references (set later in game loop)
  let renderInterval: ReturnType<typeof setInterval> | null = null;
  let gameInterval: ReturnType<typeof setInterval> | null = null;
  let keyListener: { dispose: () => void } | null = null;

  // Track if cleanup has been performed
  let cleanedUp = false;
  // Track if window listeners were added (for reliable cleanup)
  let windowListenersAdded = false;

  /**
   * Schedule a timeout and track it for cleanup
   */
  function scheduleTimeout(callback: () => void, delay: number): void {
    const id = setTimeout(() => {
      // Remove from tracking
      const idx = pendingTimeouts.indexOf(id);
      if (idx !== -1) pendingTimeouts.splice(idx, 1);
      // Only execute if still running
      if (running) callback();
    }, delay);
    pendingTimeouts.push(id);
  }

  /**
   * Clean up all game resources
   */
  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;

    // Clear all pending timeouts
    pendingTimeouts.forEach(id => clearTimeout(id));
    pendingTimeouts.length = 0;

    // Clear intervals
    if (renderInterval) clearInterval(renderInterval);
    if (gameInterval) clearInterval(gameInterval);

    // Dispose terminal key listener
    if (keyListener) keyListener.dispose();

    // Remove window event listeners (only if they were added)
    if (windowListenersAdded && keyDownHandler && keyUpHandler) {
      window.removeEventListener('keydown', keyDownHandler);
      window.removeEventListener('keyup', keyUpHandler);
      windowListenersAdded = false;
    }

    running = false;
  }

  // Event handlers (defined here so cleanup can reference them)
  let keyDownHandler: (e: KeyboardEvent) => void;
  let keyUpHandler: (e: KeyboardEvent) => void;

  const controller: CourierController = {
    stop: () => {
      cleanup();
    },
    get isRunning() { return running; }
  };

  // ASCII art title
  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   █▀▀ █ █ █▀█ █▀█ █▀█ █▀▀ █▀█',
    '█▀█  █  █▀▀ ██▄ █▀▄   █▄▄ █▀█ █▄█ █▀▀ █▀▀ ██▄ █▀▄',
  ];

  const subtitle = '~ STONE AGE TAXI SERVICE ~';

  /**
   * Select new random pickup and dropoff platforms for the next delivery
   */
  function selectNewRoute(): boolean {
    // Validate level index
    if (currentLevel < 0 || currentLevel >= levels.length) {
      console.error(`[Chopper] Invalid level index: ${currentLevel}`);
      return false;
    }

    const level = levels[currentLevel];
    const numPlatforms = level.platforms.length;

    // Need at least 2 platforms for pickup and dropoff
    if (numPlatforms < 2) {
      console.error(`[Chopper] Level ${currentLevel} needs at least 2 platforms`);
      return false;
    }

    // Pick random pickup platform
    pickupPlatformIndex = Math.floor(Math.random() * numPlatforms);

    // Pick random dropoff platform (different from pickup)
    do {
      dropoffPlatformIndex = Math.floor(Math.random() * numPlatforms);
    } while (dropoffPlatformIndex === pickupPlatformIndex);

    // Door animation - passenger appears
    doorAnimation = 30;

    // Spawn effect at pickup location
    const pickup = level.platforms[pickupPlatformIndex];
    spawnParticles(
      particles,
      pickup.x + Math.floor(pickup.width / 2),
      pickup.y - 1,
      5,
      '\x1b[92m',
      ['◇', '✦', '○']
    );

    return true;
  }

  function initGame() {
    gameOver = false;
    paused = false;
    levelComplete = false;
    score = 0;
    deliveriesComplete = 0;
    currentLevel = 0;
    tutorialMode = false;
    tutorialStep = 0;
    initLevel();
  }

  function initTutorial() {
    gameOver = false;
    paused = false;
    levelComplete = false;
    score = 0;
    deliveriesComplete = 0;
    tutorialMode = true;
    tutorialLevelIndex = 0; // Start at first tutorial level
    tutorialStep = 0;
    tutorialPromptTimer = 0;
    initTutorialLevel();
  }

  function initTutorialLevel(): boolean {
    const level = TUTORIAL_LEVELS[tutorialLevelIndex];
    if (!level) {
      console.error(`[Chopper] Invalid tutorial level: ${tutorialLevelIndex}`);
      return false;
    }

    // Reset tutorial step for this level
    tutorialStep = 0;
    tutorialPromptTimer = 0;

    // Start on left platform
    const startPlatform = level.platforms[0];
    rigX = startPlatform.x + Math.floor(startPlatform.width / 2);
    rigY = startPlatform.y - 4;
    rigVX = 0;
    rigVY = 0;
    rigAngle = 0;

    // No tutorial countdown in tutorial mode - we have our own prompts
    tutorialCountdown = 0;
    invincibleFrames = 200; // Extra invincibility for tutorial

    // Configure based on tutorial level
    if (tutorialLevelIndex === 0) {
      // FLIGHT SCHOOL - no passengers, just learn to fly
      pickupPlatformIndex = -1;  // No pickup
      dropoffPlatformIndex = -1; // No dropoff
      hasPassenger = false;
      totalDeliveries = 0; // No deliveries
    } else if (tutorialLevelIndex === 1) {
      // FIRST DELIVERY - basic pickup and delivery
      pickupPlatformIndex = 0;  // Left platform
      dropoffPlatformIndex = 1; // Right platform
      hasPassenger = false;
      totalDeliveries = 1;
    } else if (tutorialLevelIndex === 2) {
      // ROPE MASTER - start with passenger attached, different heights
      pickupPlatformIndex = -1;  // Already have passenger
      dropoffPlatformIndex = 1;  // High platform on right
      hasPassenger = true;       // Start with passenger!
      totalDeliveries = 1;
    }

    // Reset passenger position
    passengerX = rigX;
    passengerY = rigY + ROPE_MIN_LENGTH;
    passengerVX = 0;
    passengerVY = 0;
    passengerGraceFrames = 0;
    currentRopeLength = ROPE_MIN_LENGTH;
    doorAnimation = 30;

    // Reset effects
    particles = [];
    popups = [];
    screenShake = 0;
    deliveringAnimation = 0;

    // Reset time
    timeRemaining = level.timeLimit;
    deliveriesComplete = 0;

    levelComplete = false;

    return true;
  }

  function initLevel(): boolean {
    // Validate level index
    if (currentLevel < 0 || currentLevel >= levels.length) {
      console.error(`[Chopper] Invalid level index: ${currentLevel}`);
      gameOver = true;
      return false;
    }

    const level = levels[currentLevel];

    // Need at least 2 platforms for pickup and dropoff
    if (level.platforms.length < 2) {
      console.error(`[Chopper] Level ${currentLevel} needs at least 2 platforms`);
      gameOver = true;
      return false;
    }

    // Select first random route (pickup and dropoff)
    // Do this first so we can avoid starting on pickup platform
    pickupPlatformIndex = Math.floor(Math.random() * level.platforms.length);
    do {
      dropoffPlatformIndex = Math.floor(Math.random() * level.platforms.length);
    } while (dropoffPlatformIndex === pickupPlatformIndex);

    // Find a start platform (not the pickup or dropoff)
    let startIndex = 0;
    for (let i = 0; i < level.platforms.length; i++) {
      if (i !== pickupPlatformIndex && i !== dropoffPlatformIndex) {
        startIndex = i;
        break;
      }
    }
    const startPlatform = level.platforms[startIndex];

    // Reset rig position - start ON the neutral platform
    rigX = startPlatform.x + Math.floor(startPlatform.width / 2);
    rigY = startPlatform.y - 4; // Just above platform
    rigVX = 0;
    rigVY = 0;
    rigAngle = 0;

    // Tutorial and safety
    tutorialCountdown = 80; // ~4 seconds (longer to read controls)
    invincibleFrames = 100; // ~5 seconds

    // Reset passenger and rope
    hasPassenger = false;
    passengerX = rigX;
    passengerY = rigY + ROPE_MIN_LENGTH;
    passengerVX = 0;
    passengerVY = 0;
    passengerGraceFrames = 0;
    currentRopeLength = ROPE_MIN_LENGTH;
    doorAnimation = 30; // Initial door animation

    // Reset effects
    particles = [];
    popups = [];
    screenShake = 0;
    deliveringAnimation = 0;

    // Reset time
    timeRemaining = level.timeLimit;
    deliveriesComplete = 0;

    levelComplete = false;

    return true;
  }

  // FLAP! - The core mechanic. Must be RESPONSIVE!
  function doFlap() {
    if (flapCooldown > 0) return;

    rigVY = -FLAP_POWER; // Instant upward velocity
    flapCooldown = 3; // VERY short cooldown! (~0.15s at 50ms updates)
    flapAnimation = 4;

    // Flap effects - subtle particles, no screen shake
    spawnParticles(particles, rigX, rigY + 2, 2, '\x1b[93m', ['·', '∘']);
  }

  // Helper wrappers for effect functions (pass arrays)
  const spawn = (x: number, y: number, count: number, color: string, chars?: string[]) =>
    spawnParticles(particles, x, y, count, color, chars);
  const firework = (x: number, y: number, intensity?: number) =>
    spawnFirework(particles, x, y, intensity);
  const popup = (x: number, y: number, text: string, color?: string) =>
    addPopup(popups, x, y, text, color);
  const sparkleTrail = (x: number, y: number, count?: number, color?: string) =>
    spawnSparkleTrail(particles, x, y, count, color);
  const splash = (x: number, waterY: number, intensity?: number) =>
    spawnSplash(particles, x, waterY, intensity);

  function checkPlatformCollision(x: number, y: number): { platform: Platform; index: number } | null {
    const level = levels[currentLevel];
    for (let i = 0; i < level.platforms.length; i++) {
      const plat = level.platforms[i];
      // Check if position is on top of platform
      if (x >= plat.x && x < plat.x + plat.width &&
          y >= plat.y - 1 && y <= plat.y) {
        return { platform: plat, index: i };
      }
    }
    return null;
  }

  function checkWaterCollision(y: number): boolean {
    const level = levels[currentLevel];
    return y >= level.waterLevel;
  }

  function handleDelivery() {
    deliveriesComplete++;
    const timeBonus = Math.floor(timeRemaining * 2);
    const basePoints = 100;
    const points = basePoints + timeBonus;
    score += points;

    hasPassenger = false;

    // === EPIC DELIVERY CELEBRATION ===

    // Screen shake for impact!
    screenShake = 8;

    // Main firework at delivery location
    firework(passengerX, passengerY, 1.5);

    // Secondary bursts nearby (using tracked timeouts)
    const px = passengerX;
    const py = passengerY;
    scheduleTimeout(() => firework(px - 4, py - 2, 0.8), 50);
    scheduleTimeout(() => firework(px + 4, py - 2, 0.8), 100);

    // Points popup with style
    popup(passengerX - 2, passengerY - 3, `+${points}`, '\x1b[1;93m');

    // Random encouraging message
    const msg = getRandomDeliveryMessage();
    popup(passengerX - Math.floor(msg.length / 2), passengerY - 5, msg, '\x1b[1;92m');

    // Advance tutorial step after delivery
    if (tutorialMode) {
      if (tutorialLevelIndex === 1 && tutorialStep === 2) {
        // FIRST DELIVERY complete -> advance to level complete
        tutorialStep = 3;
        tutorialPromptTimer = 0;
      } else if (tutorialLevelIndex === 2 && tutorialStep === 3) {
        // ROPE MASTER delivery -> full tutorial complete
        tutorialStep = 4;
        tutorialPromptTimer = 0;
      }
    }

    // Streak indicator
    if (deliveriesComplete > 1) {
      const streakMsg = `${deliveriesComplete}x COMBO!`;
      popup(passengerX - Math.floor(streakMsg.length / 2), passengerY - 7, streakMsg, '\x1b[1;95m');
    }

    // Rising sparkle trail
    sparkleTrail(passengerX, passengerY);

    // Check if level complete
    if (deliveriesComplete >= totalDeliveries) {
      levelComplete = true;
      levelCompleteAnimation = 80; // ~4 seconds of celebration
      screenShake = 12; // Bigger shake for level complete

      // MASSIVE celebration - fireworks everywhere!
      for (let i = 0; i < 8; i++) {
        const delay = i * 80;
        scheduleTimeout(() => {
          if (levelComplete) {
            const fx = 8 + Math.random() * (screenWidth - 16);
            const fy = 3 + Math.random() * (screenHeight * 0.4);
            firework(fx, fy, 1.2);
          }
        }, delay);
      }

      popup(screenWidth / 2 - 8, screenHeight / 2 - 2, '★ LEVEL CLEAR! ★', '\x1b[1;92m');
    } else {
      // All doors go inactive, then new package appears
      pickupPlatformIndex = -1;
      dropoffPlatformIndex = -1;
      newPackageDelay = 40; // Slightly longer to enjoy the effects

      // Big "DELIVERED" with flair
      popup(screenWidth / 2 - 5, screenHeight / 2, '◆ DELIVERED ◆', '\x1b[1;92m');
    }
  }

  function update() {
    if (!gameStarted || gameOver || paused) return;

    // Handle level complete celebration animation
    if (levelComplete) {
      // Continue updating particles during celebration
      updateParticles(particles);
      updatePopups(popups);
      // Spawn periodic celebration particles
      if (levelCompleteAnimation > 0) {
        levelCompleteAnimation--;
        if (levelCompleteAnimation % 8 === 0) {
          // Firework bursts at random positions
          const burstX = 5 + Math.random() * (screenWidth - 10);
          const burstY = 2 + Math.random() * (screenHeight * 0.4);
          spawn(
            burstX,
            burstY,
            5,
            ['\x1b[93m', '\x1b[92m', '\x1b[96m', '\x1b[95m', '\x1b[91m'][Math.floor(Math.random() * 5)],
            ['★', '✦', '◆', '●', '✶', '✴']
          );
        }
      }
      return;
    }

    const level = tutorialMode ? TUTORIAL_LEVELS[tutorialLevelIndex] : levels[currentLevel];

    // Tutorial step progression - different steps for each tutorial level
    if (tutorialMode) {
      if (tutorialLevelIndex === 0) {
        // FLIGHT SCHOOL - just learn to fly and steer
        switch (tutorialStep) {
          case 0: // Wait for player to flap and go airborne
            if (rigY < level.platforms[0].y - 6 && rigVY < 0) {
              tutorialStep = 1;
              popup(rigX, rigY - 2, 'NICE!', '\x1b[1;93m');
            }
            break;
          case 1: // Wait for player to steer
            if (Math.abs(rigVX) > 0.3) {
              tutorialStep = 2;
              popup(rigX, rigY - 2, 'GOOD!', '\x1b[1;93m');
            }
            break;
          case 2: // Wait for player to reach the right platform area
            if (rigX > level.platforms[1].x && rigX < level.platforms[1].x + level.platforms[1].width) {
              tutorialStep = 3;
              popup(rigX, rigY - 2, 'PERFECT!', '\x1b[1;92m');
            }
            break;
          case 3: // Level complete - auto-advance after celebration
            tutorialPromptTimer++;
            if (tutorialPromptTimer > 80) {
              levelComplete = true;
              levelCompleteAnimation = 50;
              screenShake = 6;
              firework(screenWidth / 2, screenHeight / 2, 1.2);
            }
            break;
        }
      } else if (tutorialLevelIndex === 1) {
        // FIRST DELIVERY - learn pickup and delivery
        switch (tutorialStep) {
          case 0: // Wait for player to fly up
            if (rigY < level.platforms[0].y - 4) {
              tutorialStep = 1;
              popup(rigX, rigY - 2, 'GO!', '\x1b[1;93m');
            }
            break;
          case 1: // Wait for pickup
            if (hasPassenger) {
              tutorialStep = 2;
              popup(rigX, rigY - 2, 'GOT IT!', '\x1b[1;93m');
            }
            break;
          case 2: // Wait for delivery (handled in handleDelivery)
            break;
          case 3: // Level complete
            if (!levelComplete) {
              levelComplete = true;
              levelCompleteAnimation = 50;
              screenShake = 6;
              firework(screenWidth / 2, screenHeight / 2, 1.2);
            }
            break;
        }
      } else if (tutorialLevelIndex === 2) {
        // ROPE MASTER - learn rope controls with height difference
        switch (tutorialStep) {
          case 0: // Show initial info about rope (auto-advance)
            tutorialPromptTimer++;
            if (tutorialPromptTimer > 80) {
              tutorialStep = 1;
              tutorialPromptTimer = 0;
            }
            break;
          case 1: // Wait for player to use SPACE (extend rope)
            if (inputExtendRope || currentRopeLength > ROPE_MIN_LENGTH + 1) {
              tutorialStep = 2;
              popup(rigX, rigY - 2, 'GOOD!', '\x1b[1;93m');
            }
            break;
          case 2: // Wait for player to use SHIFT (contract rope)
            if (inputContractRope) {
              tutorialStep = 3;
              popup(rigX, rigY - 2, 'NICE!', '\x1b[1;93m');
            }
            break;
          case 3: // Wait for delivery (handled in handleDelivery)
            break;
          case 4: // Full tutorial complete!
            if (!levelComplete) {
              levelComplete = true;
              levelCompleteAnimation = 80;
              screenShake = 10;
              // Big celebration!
              firework(screenWidth / 2, screenHeight / 2, 2);
              firework(screenWidth / 3, screenHeight / 3, 1.5);
              firework(screenWidth * 2 / 3, screenHeight / 3, 1.5);
            }
            break;
        }
      }
    }

    // Handle crash animation countdown
    if (crashAnimation > 0) {
      crashAnimation--;
      // Keep updating particles during crash (heavier gravity for dramatic fall)
      updateParticles(particles, 1.5);
      updatePopups(popups);
      if (screenShake > 0) screenShake--;
      // When crash animation ends, show game over
      if (crashAnimation === 0) {
        gameOver = true;
      }
      return;
    }

    // Update timers
    if (tutorialCountdown > 0) tutorialCountdown--;
    if (invincibleFrames > 0) invincibleFrames--;

    // Handle delivering animation - package is on dropoff, building anticipation!
    if (deliveringAnimation > 0) {
      deliveringAnimation--;

      // Keep the passenger still on the platform during animation
      if (hasPassenger) {
        passengerVX *= 0.5;
        passengerVY = 0;
      }

      // Building anticipation effects - get more intense as we approach completion
      const progress = 1 - (deliveringAnimation / 40); // 0 to 1

      // Sparkle particles - more frequent as we progress
      const spawnRate = deliveringAnimation > 30 ? 10 : deliveringAnimation > 15 ? 6 : 3;
      if (deliveringAnimation % spawnRate === 0 && hasPassenger) {
        // Spiral upward effect
        const angle = (40 - deliveringAnimation) * 0.5;
        const radius = 1 + progress * 2;
        particles.push({
          x: passengerX + Math.cos(angle) * radius,
          y: passengerY - 1,
          char: ['✦', '✧', '★', '◇'][Math.floor(Math.random() * 4)],
          color: progress > 0.7 ? '\x1b[1;92m' : '\x1b[1;93m',
          vx: Math.cos(angle) * 0.1,
          vy: -0.2 - progress * 0.2,
          life: 12 + Math.floor(Math.random() * 8),
        });
      }

      // Charging glow effect at key moments
      if (deliveringAnimation === 30 && hasPassenger) {
        popup(passengerX - 4, passengerY - 3, 'CHARGING...', '\x1b[2;93m');
      }
      if (deliveringAnimation === 15 && hasPassenger) {
        popup(passengerX - 3, passengerY - 4, 'ALMOST...', '\x1b[1;93m');
        // Pre-burst sparkles
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI * 2 * i) / 4;
          particles.push({
            x: passengerX + Math.cos(a) * 2,
            y: passengerY + Math.sin(a) * 1.5,
            char: '✧',
            color: '\x1b[1;97m',
            vx: -Math.cos(a) * 0.15,
            vy: -Math.sin(a) * 0.15,
            life: 15,
          });
        }
      }

      // When animation ends, actually complete the delivery with big celebration!
      if (deliveringAnimation === 0 && hasPassenger) {
        handleDelivery();
      }
    }

    // New package spawn animation
    if (newPackageDelay > 0) {
      newPackageDelay--;
      if (newPackageDelay === 0) {
        // Now spawn the new package with animation
        selectNewRoute();
        popup(screenWidth / 2 - 5, screenHeight / 2, 'NEW PACKAGE!', '\x1b[1;93m');
      }
    }

    // Update time (don't count during tutorial)
    if (tutorialCountdown === 0) {
      timeRemaining -= 1 / 20;
      if (timeRemaining <= 0) {
        gameOver = true;
        popup(rigX, rigY - 2, 'TIME UP!', '\x1b[91m');
        return;
      }
    }

    // Update flap cooldown and animation
    if (flapCooldown > 0) flapCooldown--;
    if (flapAnimation > 0) flapAnimation--;
    rotorFrame = (rotorFrame + 1) % 6;

    // Update rope length - SPACE extends, SHIFT fast retracts, auto-retracts otherwise
    if (inputExtendRope && !inputContractRope) {
      currentRopeLength = Math.min(ROPE_MAX_LENGTH, currentRopeLength + ROPE_EXTEND_SPEED);
    } else if (inputContractRope) {
      currentRopeLength = Math.max(ROPE_MIN_LENGTH, currentRopeLength - ROPE_FAST_RETRACT_SPEED);
    } else {
      currentRopeLength = Math.max(ROPE_MIN_LENGTH, currentRopeLength - ROPE_RETRACT_SPEED);
    }

    // Apply horizontal input
    if (inputLeft) {
      rigVX -= THRUST_POWER;
      rigAngle = Math.max(-15, rigAngle - 2);
    }
    if (inputRight) {
      rigVX += THRUST_POWER;
      rigAngle = Math.min(15, rigAngle + 2);
    }

    // Return angle to neutral
    if (!inputLeft && !inputRight) {
      rigAngle *= 0.9;
    }

    // Apply gravity - always pulling down!
    rigVY += GRAVITY;

    // Apply drag
    rigVX *= AIR_DRAG_X;
    rigVY *= AIR_DRAG_Y;

    // Clamp velocity
    rigVX = Math.max(-MAX_VELOCITY_X, Math.min(MAX_VELOCITY_X, rigVX));
    rigVY = Math.max(-MAX_VELOCITY_Y, Math.min(MAX_VELOCITY_Y, rigVY));

    // Move rig
    rigX += rigVX;
    rigY += rigVY;

    // Screen bounds - clamp to edges, no wrapping
    rigX = Math.max(2, Math.min(screenWidth - 4, rigX));
    rigY = Math.max(1, rigY); // Can't go above screen

    // Check platform collision for rig
    const rigPlatformResult = checkPlatformCollision(rigX, rigY + 2);
    if (rigPlatformResult && rigVY > 0) {
      const { platform: rigPlatform, index: rigPlatformIndex } = rigPlatformResult;
      const impactVelocity = rigVY;
      rigY = rigPlatform.y - 3;
      rigVY = -rigVY * 0.3; // Bounce

      // Only shake/particles on significant impacts
      if (impactVelocity > 0.3) {
        screenShake = Math.min(5, Math.floor(impactVelocity * 4));
        spawn(rigX, rigY + 2, Math.floor(impactVelocity * 5), '\x1b[93m', ['·', '•']);
      }

      // AUTO-PICKUP: If we land on current pickup platform and don't have passenger
      // Don't pickup during tutorial - give player time to lift off first!
      if (rigPlatformIndex === pickupPlatformIndex && !hasPassenger && tutorialCountdown === 0) {
        hasPassenger = true;
        passengerX = rigX;
        passengerY = rigY + 2; // Start right at rig bottom
        passengerVX = rigVX * 0.5;
        passengerVY = rigVY * 0.5; // Inherit some rig momentum
        passengerGraceFrames = 20; // Grace period before water kills
        spawn(rigX, rigY + 2, 6, themeColor, ['◇', '✦']);
        popup(rigX - 3, rigY - 1, 'GOT IT!', '\x1b[1;93m');

        // Show dropoff location with popup and animation
        doorAnimation = 30;
        const dropoffPlat = level.platforms[dropoffPlatformIndex];
        const dropX = dropoffPlat.x + Math.floor(dropoffPlat.width / 2);
        const dropY = dropoffPlat.y - 5; // Above the hut
        popup(dropX - 4, dropY, 'DROP HERE!', '\x1b[1;93m');
        spawn(dropX, dropY + 2, 4, '\x1b[93m', ['▽', '◇', '✦']);
      }
    }

    // Check water collision for rig
    if (checkWaterCollision(rigY + 2)) {
      if (invincibleFrames > 0) {
        // Bounce off water during invincibility
        rigY = level.waterLevel - 4;
        rigVY = -0.4;
        screenShake = 3;
        popup(rigX, rigY, 'SPLASH!', '\x1b[96m');
      } else {
        // CRASH - fell in water! Epic crash effect
        crashAnimation = 35; // ~1.75 seconds of crash animation
        screenShake = 15;
        // Big splash
        splash(rigX, level.waterLevel, 1.25);
        // Explosion particles
        spawn(rigX, rigY, 12, '\x1b[91m', ['✗', '×', '▓', '░', '!', '*']);
        popup(rigX - 4, rigY - 4, '💀 SPLASH! 💀', '\x1b[1;91m');
        return;
      }
    }

    // Passenger physics
    if (hasPassenger) {
      // Decrement grace period
      if (passengerGraceFrames > 0) passengerGraceFrames--;

      // Apply gravity to passenger
      passengerVY += GRAVITY * 1.2;

      // Rope constraint - uses current (dynamic) rope length
      const dx = passengerX - rigX;
      const dy = passengerY - (rigY + 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only apply rope constraint if distance is valid (avoid division by zero)
      if (dist > 0.01 && dist > currentRopeLength) {
        const nx = dx / dist;
        const ny = dy / dist;
        const stretch = dist - currentRopeLength;

        // Pull passenger toward rig
        passengerVX -= nx * stretch * 0.1;
        passengerVY -= ny * stretch * 0.1;

        // Also affect rig (lighter effect)
        rigVX += nx * stretch * 0.03;
        rigVY += ny * stretch * 0.03;
      }

      // Damping
      passengerVX *= 0.95;
      passengerVY *= 0.95;

      // Clamp velocities to prevent runaway values
      passengerVX = Math.max(-2, Math.min(2, passengerVX));
      passengerVY = Math.max(-2, Math.min(2, passengerVY));

      // Move passenger
      passengerX += passengerVX;
      passengerY += passengerVY;

      // Screen bounds for passenger - clamp to edges
      passengerX = Math.max(1, Math.min(screenWidth - 2, passengerX));

      // Platform collision for passenger
      const passPlatformResult = checkPlatformCollision(passengerX, passengerY);
      if (passPlatformResult && passengerVY > 0) {
        const { platform: passPlatform, index: passPlatformIndex } = passPlatformResult;
        passengerY = passPlatform.y - 1;
        passengerVY = -passengerVY * 0.2;
        passengerVX *= 0.8;

        // Check if this is the current dropoff platform - start delivery animation!
        if (passPlatformIndex === dropoffPlatformIndex && Math.abs(passengerVY) < 0.3 && deliveringAnimation === 0) {
          // Start delivering animation - player sees the package land
          deliveringAnimation = 40; // ~2 seconds to watch the delivery
          spawn(passengerX, passengerY - 1, 8, '\x1b[1;93m', ['★', '✦', '◆']);
          popup(passengerX - 4, passengerY - 3, 'DROPPING!', '\x1b[1;93m');
        }
      }

      // Water collision for passenger (skip during grace period)
      if (checkWaterCollision(passengerY) && passengerGraceFrames === 0) {
        hasPassenger = false;
        crashAnimation = 35; // ~1.75 seconds of crash animation
        screenShake = 12;
        // Dramatic splash for package
        splash(passengerX, level.waterLevel, 1);
        popup(passengerX - 5, passengerY - 3, '💀 PACKAGE LOST! 💀', '\x1b[1;91m');
        return;
      }
    }

    // Update particles and popups
    updateParticles(particles);
    updatePopups(popups);

    // Update effects
    if (screenShake > 0) screenShake--;
  }

  function render() {
    let output = '';
    output += '\x1b[2J\x1b[H';

    const cols = terminal.cols;
    const rows = terminal.rows;

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg = `Need ${MIN_COLS}×${MIN_ROWS}, have ${cols}×${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY};${Math.max(1, centerX - msg.length / 2)}H${themeColor}${msg}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Adapt viewport to terminal size - wider map!
    screenWidth = Math.min(cols - 4, 70);
    screenHeight = Math.min(rows - 8, 18);

    const gameLeft = Math.max(2, Math.floor((cols - screenWidth - 2) / 2));
    const gameTop = getVerticalAnchor(rows, screenHeight + 2, {
      headerRows: 4,
      footerRows: 2,
      minTop: 4,
    });

    // Apply screen shake
    const shakeX = screenShake > 0 ? Math.floor(Math.random() * 3) - 1 : 0;
    const shakeY = screenShake > 0 ? Math.floor(Math.random() * 2) : 0;
    const displayLeft = gameLeft + shakeX;
    const displayTop = gameTop + shakeY;

    // Title area - show tutorial during countdown, otherwise show title
    glitchFrame = (glitchFrame + 1) % 60;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;
    const titleX = Math.floor((cols - title[0].length) / 2) + glitchOffset;

    if (gameStarted && tutorialCountdown > 0 && !paused && !gameOver && !levelComplete) {
      // Show controls in title area during tutorial
      const controls1 = '↑/W = FLAP    ←/→ = STEER    SPACE/SHIFT = ROPE';
      const controls2 = 'Pickup the yellow package, deliver to the ▼ marker!';
      const ctrl1X = Math.floor((cols - controls1.length) / 2);
      const ctrl2X = Math.floor((cols - controls2.length) / 2);
      const fade = tutorialCountdown < 20 ? '\x1b[2m' : '\x1b[1m';
      output += `\x1b[1;${ctrl1X}H${fade}${themeColor}${controls1}\x1b[0m`;
      output += `\x1b[2;${ctrl2X}H${fade}${themeColor}${controls2}\x1b[0m`;
      const countdownBar = '▓'.repeat(Math.ceil(tutorialCountdown / 10)) + '░'.repeat(8 - Math.ceil(tutorialCountdown / 10));
      const barX = Math.floor((cols - countdownBar.length) / 2);
      output += `\x1b[3;${barX}H\x1b[2m${themeColor}${countdownBar}\x1b[0m`;
    } else {
      // Normal title display
      output += `\x1b[1;${titleX}H`;
      if (glitchFrame >= 55 && glitchFrame < 58) {
        output += `\x1b[91m${title[0]}\x1b[0m`;
        output += `\x1b[2;${titleX + 1}H\x1b[96m${title[1]}\x1b[0m`;
      } else {
        output += `${themeColor}\x1b[1m${title[0]}\x1b[0m`;
        output += `\x1b[2;${titleX}H${themeColor}\x1b[1m${title[1]}\x1b[0m`;
      }

      const subtitleX = Math.floor((cols - subtitle.length) / 2);
      output += `\x1b[3;${subtitleX}H\x1b[2m${themeColor}${subtitle}\x1b[0m`;
    }

    // Game border
    output += `\x1b[${displayTop};${displayLeft}H${themeColor}╔${'═'.repeat(screenWidth)}╗\x1b[0m`;
    for (let y = 0; y < screenHeight; y++) {
      output += `\x1b[${displayTop + 1 + y};${displayLeft}H${themeColor}║\x1b[0m`;
      output += `\x1b[${displayTop + 1 + y};${displayLeft + screenWidth + 1}H${themeColor}║\x1b[0m`;
    }
    output += `\x1b[${displayTop + screenHeight + 1};${displayLeft}H${themeColor}╚${'═'.repeat(screenWidth)}╝\x1b[0m`;

    if (paused) {
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = gameLeft + Math.floor(screenWidth / 2) + 1;
      const pauseY = gameTop + Math.floor(screenHeight / 2) - 4;
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[1m${themeColor}${pauseMsg}\x1b[0m`;

      // Use shared menu rendering
      output += renderSimpleMenu(PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: pauseCenterX,
        startY: pauseY + 2,
        showShortcuts: false,
      });

      const navHint = '↑↓ select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 8};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    } else if (!gameStarted && showingModeSelect) {
      // Mode selection screen with arrow key navigation
      const modeCenterX = gameLeft + Math.floor(screenWidth / 2) + 1;
      const modeStartY = gameTop + Math.floor(screenHeight / 2) - 2;

      const selectMsg = 'SELECT MODE';
      const selectX = modeCenterX - Math.floor(selectMsg.length / 2);
      output += `\x1b[${modeStartY};${selectX}H\x1b[1m${themeColor}${selectMsg}\x1b[0m`;

      // Use shared menu rendering
      output += renderSimpleMenu(MODE_SELECT_ITEMS, menuSelection, {
        centerX: modeCenterX,
        startY: modeStartY + 2,
        showShortcuts: false,
      });

      const navHint = '↑↓ to select   ENTER to confirm';
      const navHintX = modeCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${modeStartY + 5};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;

      const hint = 'New players: Try the tutorial first!';
      const hintX = Math.floor((cols - hint.length) / 2);
      output += `\x1b[${modeStartY + 7};${hintX}H\x1b[2;3m${themeColor}${hint}\x1b[0m`;
    } else if (!gameStarted) {
      // Legacy start screen (shouldn't be reached now)
      const startMsg = '[ PRESS ANY KEY TO START ]';
      const startX = gameLeft + Math.floor((screenWidth - startMsg.length) / 2) + 1;
      const startY = gameTop + Math.floor(screenHeight / 2);
      output += `\x1b[${startY};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = '↑/W = FLAP    ←/→ = STEER    SPACE/SHIFT = ROPE';
      const ctrlX = Math.floor((cols - controls.length) / 2);
      output += `\x1b[${startY + 2};${ctrlX}H\x1b[2m${themeColor}${controls}\x1b[0m`;

      const hook = 'Pickup yellow packages, deliver to markers. Avoid the water!';
      const hookX = Math.floor((cols - hook.length) / 2);
      output += `\x1b[${startY + 4};${hookX}H\x1b[2;3m${themeColor}${hook}\x1b[0m`;
    } else if (levelComplete) {
      const msgY = gameTop + Math.floor(screenHeight / 2) - 3;

      if (tutorialMode) {
        const tutLevel = TUTORIAL_LEVELS[tutorialLevelIndex];
        const isLastLesson = tutorialLevelIndex >= TUTORIAL_LEVELS.length - 1;

        if (isLastLesson) {
          // Final tutorial complete screen
          const completeMsg = '★ TUTORIAL COMPLETE! ★';
          const msgX = gameLeft + Math.floor((screenWidth - completeMsg.length) / 2) + 1;
          output += `\x1b[${msgY};${msgX}H\x1b[1;92m${completeMsg}\x1b[0m`;

          const congratsMsg = 'You mastered the controls!';
          const congratsX = gameLeft + Math.floor((screenWidth - congratsMsg.length) / 2) + 1;
          output += `\x1b[${msgY + 2};${congratsX}H${themeColor}${congratsMsg}\x1b[0m`;

          const controlsMsg = '↑/W=FLAP  ←/→=STEER  SPACE/SHIFT=ROPE';
          const controlsX = gameLeft + Math.floor((screenWidth - controlsMsg.length) / 2) + 1;
          output += `\x1b[${msgY + 4};${controlsX}H\x1b[2m${themeColor}${controlsMsg}\x1b[0m`;

          const nextHint = '[ SPACE ] START GAME   [ Q ] QUIT';
          const nextX = gameLeft + Math.floor((screenWidth - nextHint.length) / 2) + 1;
          output += `\x1b[${msgY + 6};${nextX}H${themeColor}${nextHint}\x1b[0m`;
        } else {
          // Lesson complete - more lessons to go
          const completeMsg = `★ ${tutLevel.name} COMPLETE! ★`;
          const msgX = gameLeft + Math.floor((screenWidth - completeMsg.length) / 2) + 1;
          output += `\x1b[${msgY};${msgX}H\x1b[1;92m${completeMsg}\x1b[0m`;

          const nextLevelName = TUTORIAL_LEVELS[tutorialLevelIndex + 1]?.name || 'NEXT';
          const nextLessonMsg = `Next: ${nextLevelName}`;
          const nextLessonX = gameLeft + Math.floor((screenWidth - nextLessonMsg.length) / 2) + 1;
          output += `\x1b[${msgY + 2};${nextLessonX}H${themeColor}${nextLessonMsg}\x1b[0m`;

          const progressMsg = `Lesson ${tutorialLevelIndex + 1} of ${TUTORIAL_LEVELS.length}`;
          const progressX = gameLeft + Math.floor((screenWidth - progressMsg.length) / 2) + 1;
          output += `\x1b[${msgY + 4};${progressX}H\x1b[2m${themeColor}${progressMsg}\x1b[0m`;

          const nextHint = '[ SPACE ] NEXT LESSON   [ Q ] QUIT';
          const nextX = gameLeft + Math.floor((screenWidth - nextHint.length) / 2) + 1;
          output += `\x1b[${msgY + 6};${nextX}H${themeColor}${nextHint}\x1b[0m`;
        }
      } else {
        // Normal level complete screen
        const level = levels[currentLevel];
        const timeBonus = timeRemaining / level.timeLimit;
        const stars = timeRemaining >= level.parTime ? 3 : timeBonus > 0.3 ? 2 : 1;

        const completeMsg = '★ LEVEL COMPLETE! ★';
        const msgX = gameLeft + Math.floor((screenWidth - completeMsg.length) / 2) + 1;
        output += `\x1b[${msgY};${msgX}H\x1b[1;92m${completeMsg}\x1b[0m`;

        const scoreMsg = `SCORE: ${score}`;
        const scoreX = gameLeft + Math.floor((screenWidth - scoreMsg.length) / 2) + 1;
        output += `\x1b[${msgY + 2};${scoreX}H${themeColor}${scoreMsg}\x1b[0m`;

        const starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const starX = gameLeft + Math.floor((screenWidth - starDisplay.length) / 2) + 1;
        output += `\x1b[${msgY + 3};${starX}H\x1b[1;93m${starDisplay}\x1b[0m`;

        const nextHint = currentLevel < levels.length - 1 ? '[ SPACE ] NEXT   [ Q ] QUIT' : '[ R ] REPLAY   [ Q ] QUIT';
        const nextX = gameLeft + Math.floor((screenWidth - nextHint.length) / 2) + 1;
        output += `\x1b[${msgY + 5};${nextX}H\x1b[2m${themeColor}${nextHint}\x1b[0m`;
      }
    } else if (gameOver) {
      const overMsg = '══ GAME OVER ══';
      const overX = gameLeft + Math.floor((screenWidth - overMsg.length) / 2) + 1;
      const overY = gameTop + Math.floor(screenHeight / 2) - 1;
      output += `\x1b[${overY};${overX}H\x1b[1;91m${overMsg}\x1b[0m`;

      const scoreMsg = `SCORE: ${score}`;
      const scoreX = gameLeft + Math.floor((screenWidth - scoreMsg.length) / 2) + 1;
      output += `\x1b[${overY + 2};${scoreX}H${themeColor}${scoreMsg}\x1b[0m`;

      const restart = '[ R ] RETRY   [ Q ] QUIT';
      const restartX = gameLeft + Math.floor((screenWidth - restart.length) / 2) + 1;
      output += `\x1b[${overY + 4};${restartX}H\x1b[2m${themeColor}${restart}\x1b[0m`;
    } else {
      const level = levels[currentLevel];

      // Draw water - fill from waterLevel to bottom of screen
      for (let x = 0; x < screenWidth; x++) {
        // First water line - wavy surface
        const waterChar1 = (x + glitchFrame) % 4 === 0 ? '≈' : '~';
        output += `\x1b[${displayTop + 1 + level.waterLevel};${displayLeft + 1 + x}H\x1b[96m${waterChar1}\x1b[0m`;
        // Fill remaining rows with darker water
        for (let wy = level.waterLevel + 1; wy < screenHeight; wy++) {
          const waterChar = (x + wy + glitchFrame) % 3 === 0 ? '≈' : '~';
          const waterColor = wy === level.waterLevel + 1 ? '\x1b[36m' : '\x1b[34m'; // Gets darker
          output += `\x1b[${displayTop + 1 + wy};${displayLeft + 1 + x}H${waterColor}${waterChar}\x1b[0m`;
        }
      }

      // Draw platforms with doors
      for (let platIndex = 0; platIndex < level.platforms.length; platIndex++) {
        const plat = level.platforms[platIndex];
        const isCurrentPickup = platIndex === pickupPlatformIndex;
        const isCurrentDropoff = platIndex === dropoffPlatformIndex;

        // Platform is always neutral brown/earth color
        const platColor = '\x1b[38;5;94m'; // Brown/earth tone

        // Draw platform surface
        for (let px = 0; px < plat.width; px++) {
          const screenX = plat.x + px;
          const screenY = plat.y;
          if (screenX >= 0 && screenX < screenWidth && screenY >= 0 && screenY < screenHeight) {
            output += `\x1b[${displayTop + 1 + screenY};${displayLeft + 1 + screenX}H${platColor}▀\x1b[0m`;
            // Thick platform - add bottom
            if (screenY + 1 < screenHeight && screenY + 1 < level.waterLevel) {
              output += `\x1b[${displayTop + 2 + screenY};${displayLeft + 1 + screenX}H${platColor}█\x1b[0m`;
            }
          }
        }

        // Draw door/hut on each platform (5 wide, 3 tall solid block)
        const doorWidth = 5;
        const doorX = plat.x + Math.floor(plat.width / 2) - Math.floor(doorWidth / 2);
        const doorY1 = plat.y - 3; // Top row
        const doorY2 = plat.y - 2; // Middle row
        const doorY3 = plat.y - 1; // Bottom row (connects to platform)

        // All doors are always dim monochrome - adapts to terminal theme
        const doorColor = getSubtleBackgroundColor();

        // Draw 5x3 hut block (solid, always same color)
        const hutChars = '█████';
        if (doorX >= 0 && doorX + doorWidth - 1 < screenWidth && doorY1 >= 0 && doorY1 < screenHeight) {
          output += `\x1b[${displayTop + 1 + doorY1};${displayLeft + 1 + doorX}H${doorColor}${hutChars}\x1b[0m`;
        }
        if (doorX >= 0 && doorX + doorWidth - 1 < screenWidth && doorY2 >= 0 && doorY2 < screenHeight) {
          output += `\x1b[${displayTop + 1 + doorY2};${displayLeft + 1 + doorX}H${doorColor}${hutChars}\x1b[0m`;
        }
        if (doorX >= 0 && doorX + doorWidth - 1 < screenWidth && doorY3 >= 0 && doorY3 < screenHeight) {
          output += `\x1b[${displayTop + 1 + doorY3};${displayLeft + 1 + doorX}H${doorColor}${hutChars}\x1b[0m`;
        }

        // Draw yellow package on floor at pickup (the indicator!)
        if (isCurrentPickup && !hasPassenger) {
          const packageX = doorX + Math.floor(doorWidth / 2);
          const packageY = plat.y - 1; // On the platform, in front of door
          if (packageX >= 0 && packageX < screenWidth && packageY >= 0 && packageY < screenHeight) {
            const pkgChar = doorAnimation > 0 && doorAnimation % 6 < 3 ? '▪' : '█';
            output += `\x1b[${displayTop + 1 + packageY};${displayLeft + 1 + packageX}H\x1b[1;93m${pkgChar}\x1b[0m`;
          }
        }

        // Dropoff indicator - arrow above the door pointing down
        if (isCurrentDropoff && hasPassenger) {
          const markerX = doorX + Math.floor(doorWidth / 2);
          const markerY = doorY1 - 1; // Above the door
          if (markerX >= 0 && markerX < screenWidth && markerY >= 0 && markerY < screenHeight) {
            const marker = doorAnimation > 0 && doorAnimation % 8 < 4 ? '▼' : '▽';
            output += `\x1b[${displayTop + 1 + markerY};${displayLeft + 1 + markerX}H\x1b[1;93m${marker}\x1b[0m`;
          }
        }
      }

      // Update door animation
      if (doorAnimation > 0) doorAnimation--;

      // Draw rope if carrying passenger
      if (hasPassenger) {
        const dx = passengerX - rigX;
        const dy = passengerY - (rigY + 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(2, Math.floor(dist));

        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const rx = Math.floor(rigX + dx * t);
          const ry = Math.floor((rigY + 2) + dy * t);
          if (rx >= 0 && rx < screenWidth && ry >= 0 && ry < screenHeight) {
            output += `\x1b[${displayTop + 1 + ry};${displayLeft + 1 + rx}H\x1b[2m${themeColor}│\x1b[0m`;
          }
        }

        // Draw package (yellow box)
        const pScreenX = Math.floor(passengerX);
        const pScreenY = Math.floor(passengerY);
        if (pScreenX >= 0 && pScreenX < screenWidth && pScreenY >= 0 && pScreenY < screenHeight) {
          output += `\x1b[${displayTop + 1 + pScreenY};${displayLeft + 1 + pScreenX}H\x1b[1;93m█\x1b[0m`;
        }
      }

      // Draw rig - SIMPLE BOXY HELICOPTER like UGH!
      const rigScreenX = Math.floor(rigX);
      const rigScreenY = Math.floor(rigY);
      if (rigScreenX >= 1 && rigScreenX < screenWidth - 3 && rigScreenY >= 1 && rigScreenY < screenHeight - 3) {
        // Blink if invincible
        const isBlinking = invincibleFrames > 0 && Math.floor(invincibleFrames / 4) % 2 === 0;
        const bodyColor = isBlinking ? '\x1b[2m' + themeColor : '\x1b[1m' + themeColor;

        // ROTOR - simple spinning blade, 3 chars
        const rotorFrames = ['─O─', '\\O/', '│O│', '/O\\'];
        const rotor = rotorFrames[Math.floor(rotorFrame / 1.5) % rotorFrames.length];
        output += `\x1b[${displayTop + 1 + rigScreenY};${displayLeft + rigScreenX}H${bodyColor}${rotor}\x1b[0m`;

        // BODY - simple box, 3 chars wide
        let body: string;
        if (flapAnimation > 0) {
          body = '[^]'; // Boost!
        } else if (rigAngle < -5) {
          body = '/o]'; // Tilting left
        } else if (rigAngle > 5) {
          body = '[o\\'; // Tilting right
        } else {
          body = '[o]'; // Centered caveman
        }
        output += `\x1b[${displayTop + 2 + rigScreenY};${displayLeft + rigScreenX}H${bodyColor}${body}\x1b[0m`;

        // SKIDS - landing gear
        output += `\x1b[${displayTop + 3 + rigScreenY};${displayLeft + rigScreenX}H${bodyColor}└─┘\x1b[0m`;
      }

      // Draw particles
      for (const p of particles) {
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);
        if (px >= 0 && px < screenWidth && py >= 0 && py < screenHeight) {
          const alpha = p.life > 5 ? '' : '\x1b[2m';
          output += `\x1b[${displayTop + 1 + py};${displayLeft + 1 + px}H${alpha}${p.color}${p.char}\x1b[0m`;
        }
      }

      // Draw popups
      for (const popup of popups) {
        const px = Math.floor(popup.x);
        const py = Math.floor(popup.y);
        if (px >= 0 && px < screenWidth - popup.text.length && py >= 0 && py < screenHeight) {
          const alpha = popup.frames > 15 ? '\x1b[1m' : '\x1b[2m';
          output += `\x1b[${displayTop + 1 + py};${displayLeft + 1 + px}H${alpha}${popup.color}${popup.text}\x1b[0m`;
        }
      }

      // In-game tutorial prompt overlay at TOP of game area
      if (tutorialMode && !levelComplete) {
        const promptBright = Math.floor(Date.now() / 300) % 2 === 0 ? '\x1b[1m' : '';
        let inGamePrompt = '';

        if (tutorialLevelIndex === 0) {
          switch (tutorialStep) {
            case 0: inGamePrompt = '▲ PRESS UP TO FLY ▲'; break;
            case 1: inGamePrompt = '◄ ► STEER LEFT/RIGHT'; break;
            case 2: inGamePrompt = '► FLY TO RIGHT PLATFORM ►'; break;
          }
        } else if (tutorialLevelIndex === 1) {
          switch (tutorialStep) {
            case 0: inGamePrompt = '▲ TAKE OFF! ▲'; break;
            case 1: inGamePrompt = '▼ LAND ON HUT TO PICKUP ▼'; break;
            case 2: inGamePrompt = '► DELIVER TO RIGHT HUT ►'; break;
          }
        } else if (tutorialLevelIndex === 2) {
          switch (tutorialStep) {
            case 0: inGamePrompt = '~ ROPE CONTROLS ~'; break;
            case 1: inGamePrompt = '[ SPACE ] = LOWER ROPE'; break;
            case 2: inGamePrompt = '[ SHIFT ] = RAISE ROPE'; break;
            case 3: inGamePrompt = '▲ DELIVER TO HIGH PLATFORM ▲'; break;
          }
        }

        if (inGamePrompt) {
          const promptX = displayLeft + Math.floor((screenWidth - inGamePrompt.length) / 2) + 1;
          const promptY = displayTop + 2; // Near top of game area
          // Draw a subtle background bar
          const bgBar = '─'.repeat(inGamePrompt.length + 4);
          output += `\x1b[${promptY - 1};${promptX - 2}H\x1b[2m${themeColor}${bgBar}\x1b[0m`;
          output += `\x1b[${promptY};${promptX}H${promptBright}\x1b[1;93m${inGamePrompt}\x1b[0m`;
          output += `\x1b[${promptY + 1};${promptX - 2}H\x1b[2m${themeColor}${bgBar}\x1b[0m`;
        }
      }
    }

    // HUD
    if (gameStarted && !levelComplete && !gameOver && !paused) {
      const level = tutorialMode ? TUTORIAL_LEVELS[tutorialLevelIndex] : levels[currentLevel];
      const hudY = displayTop + screenHeight + 2;

      if (tutorialMode) {
        // Tutorial HUD - show level name and step-based prompts
        const tutorialTitle = `═══ ${level.name} (${tutorialLevelIndex + 1}/3) ═══`;
        const titleX = gameLeft + Math.floor((screenWidth - tutorialTitle.length) / 2) + 1;
        output += `\x1b[${hudY};${titleX}H\x1b[1;93m${tutorialTitle}\x1b[0m`;

        // Tutorial step prompts with flashing effect - different for each level
        const promptBright = Math.floor(Date.now() / 300) % 2 === 0 ? '\x1b[1m' : '\x1b[2m';

        let tutorialHint = '';
        if (tutorialLevelIndex === 0) {
          // FLIGHT SCHOOL prompts
          switch (tutorialStep) {
            case 0:
              tutorialHint = '↑ Press UP or W to FLAP and fly!';
              break;
            case 1:
              tutorialHint = '← → Use arrow keys to STEER left/right';
              break;
            case 2:
              tutorialHint = '▶ Fly to the RIGHT platform!';
              break;
            case 3:
              tutorialHint = '★ GREAT! You can fly! ★';
              break;
          }
        } else if (tutorialLevelIndex === 1) {
          // FIRST DELIVERY prompts
          switch (tutorialStep) {
            case 0:
              tutorialHint = '↑ Take off and fly!';
              break;
            case 1:
              tutorialHint = '▼ Land on the LEFT hut to PICKUP package';
              break;
            case 2:
              tutorialHint = '▶ Deliver to the RIGHT hut!';
              break;
            case 3:
              tutorialHint = '★ Delivery complete! ★';
              break;
          }
        } else if (tutorialLevelIndex === 2) {
          // ROPE MASTER prompts
          switch (tutorialStep) {
            case 0:
              tutorialHint = 'You have a passenger! Learn rope controls...';
              break;
            case 1:
              tutorialHint = 'SPACE = Lower rope (hold to extend)';
              break;
            case 2:
              tutorialHint = 'SHIFT = Raise rope (hold to retract)';
              break;
            case 3:
              tutorialHint = '▶ Deliver to the HIGH platform on right!';
              break;
            case 4:
              tutorialHint = '★ TUTORIAL COMPLETE! ★';
              break;
          }
        }
        const hintX = gameLeft + Math.floor((screenWidth - tutorialHint.length) / 2) + 1;
        output += `\x1b[${hudY + 1};${hintX}H${promptBright}${themeColor}${tutorialHint}\x1b[0m`;

        // Progress indicator within level
        const maxSteps = tutorialLevelIndex === 2 ? 5 : 4;
        const progress = `Step ${Math.min(tutorialStep + 1, maxSteps)}/${maxSteps}`;
        const progressX = gameLeft + Math.floor((screenWidth - progress.length) / 2) + 1;
        output += `\x1b[${hudY + 2};${progressX}H\x1b[2m${themeColor}${progress}\x1b[0m`;
      } else {
        // Normal game HUD
        // Line 1: Level name on left, Time on right
        const levelName = `LVL ${currentLevel + 1}: ${level.name}`;
        output += `\x1b[${hudY};${gameLeft + 1}H${themeColor}${levelName}\x1b[0m`;

        const timeColor = timeRemaining < 15 ? '\x1b[91m' : timeRemaining < 30 ? '\x1b[93m' : themeColor;
        const timeDisplay = `TIME: ${Math.ceil(timeRemaining)}s`;
        output += `\x1b[${hudY};${gameLeft + screenWidth - timeDisplay.length + 1}H${timeColor}${timeDisplay}\x1b[0m`;

        // Line 2: Deliveries centered
        const deliveryStatus = `DELIVERIES: ${deliveriesComplete}/${totalDeliveries}  |  SCORE: ${score}`;
        const deliveryX = gameLeft + Math.floor((screenWidth - deliveryStatus.length) / 2) + 1;
        output += `\x1b[${hudY + 1};${deliveryX}H${themeColor}${deliveryStatus}\x1b[0m`;

        // Line 3: Hint
        let hint = '';
        if (!hasPassenger) {
          hint = '▶ Land where you see the yellow package';
        } else {
          hint = '▶ Deliver to the marker (▼)';
        }
        const hintX = gameLeft + Math.floor((screenWidth - hint.length) / 2) + 1;
        output += `\x1b[${hudY + 2};${hintX}H\x1b[2m${themeColor}${hint}\x1b[0m`;
      }
    }

    // Bottom hint (only when not showing game HUD)
    if (!gameStarted || paused || gameOver || levelComplete) {
      const menuHint = '[ ESC ] MENU';
      const menuX = Math.floor((cols - menuHint.length) / 2);
      output += `\x1b[${rows - 1};${menuX}H\x1b[2m${themeColor}${menuHint}\x1b[0m`;
    }

    terminal.write(output);
  }

  // Start game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h');
    terminal.write('\x1b[?25l');

    initGame();
    gameStarted = false;

    renderInterval = setInterval(() => {
      if (!running) {
        clearInterval(renderInterval!);
        return;
      }
      render();
    }, 25);

    gameInterval = setInterval(() => {
      if (!running) {
        clearInterval(gameInterval!);
        return;
      }
      update();
    }, 25);

    keyDownHandler = (e: KeyboardEvent) => {
      if (!running || !gameStarted || paused || gameOver || levelComplete) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          inputLeft = true;
          break;
        case 'ArrowRight':
        case 'd':
          inputRight = true;
          break;
        case 'ArrowUp':
        case 'w':
          doFlap();
          break;
        case ' ':
          inputExtendRope = true;
          break;
        case 'Shift':
          inputContractRope = true;
          break;
      }
    };

    keyUpHandler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          inputLeft = false;
          break;
        case 'ArrowRight':
        case 'd':
          inputRight = false;
          break;
        case ' ':
          inputExtendRope = false;
          break;
        case 'Shift':
          inputContractRope = false;
          break;
      }
    };

    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);
    windowListenersAdded = true;

    keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) {
        keyListener?.dispose();
        return;
      }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key.toLowerCase();

      // ESC - toggle pause
      if (key === 'escape') {
        paused = !paused;
        if (paused) pauseMenuSelection = 0; // Reset selection when opening
        return;
      }

      // Q to quit
      if (key === 'q') {
        if (paused || gameOver || !gameStarted || levelComplete) {
          cleanup();
          dispatchGameQuit(terminal);
          return;
        }
      }

      // Mode selection screen - arrow key navigation
      if (!gameStarted && showingModeSelect && !paused) {
        // Use shared menu navigation
        const { newSelection, confirmed } = navigateMenu(
          menuSelection,
          MODE_SELECT_ITEMS.length,
          key,
          domEvent
        );

        if (newSelection !== menuSelection) {
          menuSelection = newSelection;
          return;
        }

        if (confirmed) {
          showingModeSelect = false;
          if (menuSelection === 0) {
            initTutorial();
          } else {
            initGame();
          }
          gameStarted = true;
          return;
        }

        // Legacy shortcut keys still work
        if (key === 't') {
          showingModeSelect = false;
          initTutorial();
          gameStarted = true;
          return;
        }
        if (key === 'p') {
          showingModeSelect = false;
          initGame();
          gameStarted = true;
          return;
        }
        return;
      }

      // Legacy start screen (shouldn't be reached)
      if (!gameStarted && !paused) {
        showingModeSelect = false;
        initGame();
        gameStarted = true;
        return;
      }

      // Level complete
      if (levelComplete) {
        if (domEvent.key === ' ') {
          if (tutorialMode) {
            // Check if there are more tutorial levels
            if (tutorialLevelIndex < TUTORIAL_LEVELS.length - 1) {
              // Advance to next tutorial level
              tutorialLevelIndex++;
              initTutorialLevel();
              levelComplete = false;
            } else {
              // All tutorial levels complete - start normal game
              tutorialMode = false;
              initGame();
              levelComplete = false;
            }
          } else if (currentLevel < levels.length - 1) {
            currentLevel++;
            initLevel();
            levelComplete = false;
          }
        } else if (key === 'r') {
          if (tutorialMode) {
            initTutorial();
          } else {
            initGame();
          }
          gameStarted = true;
        }
        return;
      }

      // Game over
      if (gameOver) {
        if (key === 'r') {
          initLevel();
          gameStarted = true;
          gameOver = false;
        }
        return;
      }

      // Pause menu - arrow navigation + shortcuts
      if (paused) {
        // Use shared menu navigation
        const { newSelection, confirmed } = navigateMenu(
          pauseMenuSelection,
          PAUSE_MENU_ITEMS.length,
          key,
          domEvent
        );

        if (newSelection !== pauseMenuSelection) {
          pauseMenuSelection = newSelection;
          return;
        }

        if (confirmed) {
          switch (pauseMenuSelection) {
            case 0: // Resume
              paused = false;
              break;
            case 1: // Restart
              initLevel();
              gameStarted = true;
              paused = false;
              break;
            case 2: // Quit
              cleanup();
              dispatchGameQuit(terminal);
              break;
            case 3: // List Games
              cleanup();
              dispatchGamesMenu(terminal);
              break;
            case 4: // Next Game
              cleanup();
              dispatchGameSwitch(terminal);
              break;
          }
          return;
        }

        // Legacy shortcut keys still work
        if (key === 'r') {
          initLevel();
          gameStarted = true;
          paused = false;
        } else if (key === 'l') {
          cleanup();
          dispatchGamesMenu(terminal);
        } else if (key === 'n') {
          cleanup();
          dispatchGameSwitch(terminal);
        }
        return;
      }

      // Gameplay controls - MUST handle here since terminal captures keys!
      if (domEvent.key === 'ArrowUp' || key === 'w') {
        doFlap();
      }
      // Handle left/right - apply thrust directly since onKey fires repeatedly when held
      if (domEvent.key === 'ArrowLeft' || key === 'a') {
        rigVX -= THRUST_POWER;
        rigAngle = Math.max(-15, rigAngle - 3);
      }
      if (domEvent.key === 'ArrowRight' || key === 'd') {
        rigVX += THRUST_POWER;
        rigAngle = Math.min(15, rigAngle + 3);
      }
      // SPACE extends rope - set flag (keyup handler will unset)
      if (domEvent.key === ' ') {
        inputExtendRope = true;
      }
    });
  }, 50);

  return controller;
}
