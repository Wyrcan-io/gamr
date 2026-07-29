/**
 * Hyper Crack - Terminal Hacking Game
 *
 * Crack passwords to breach security layers before
 * the trace detection catches you. Wordle-style mechanics
 * with cyberpunk hacker aesthetics.
 */

import type { Terminal } from '@xterm/xterm';
import { getCurrentThemeColor } from '../utils';
import { dispatchGameQuit, dispatchGameSwitch, dispatchGamesMenu } from '../gameTransitions';
import { type SimpleMenuItem, renderSimpleMenu, navigateMenu } from '../shared/menu';

// Custom pause menu items with HELP option
const CRACK_PAUSE_MENU_ITEMS: SimpleMenuItem[] = [
  { label: 'Resume', shortcut: 'ESC' },
  { label: 'Restart', shortcut: 'R' },
  { label: 'Quit', shortcut: 'Q' },
  { label: 'Help', shortcut: 'H' },
  { label: 'List Games', shortcut: 'L' },
  { label: 'Next Game', shortcut: 'N' },
];

/**
 * Crack Game Controller
 */
export interface CrackController {
  stop: () => void;
  isRunning: boolean;
}

// Word lists by difficulty (5-letter words for classic feel)
const PASSWORDS = [
  // Easy - common tech words
  'ADMIN', 'LOGIN', 'GUEST', 'PROXY', 'QUERY', 'DEBUG', 'CACHE', 'STACK',
  'PARSE', 'TOKEN', 'ROUTE', 'PATCH', 'BUILD', 'MERGE', 'CLONE', 'FETCH',
  // Medium - more obscure
  'CRYPT', 'VAULT', 'NEXUS', 'HELIX', 'CYBER', 'GHOST', 'ROGUE', 'VENOM',
  'CHAOS', 'RAZOR', 'BLAZE', 'STORM', 'FROST', 'SPARK', 'SURGE', 'PULSE',
  // Hard - hacker/cyber themed
  'BREACH', 'BYPASS', 'CIPHER', 'DAEMON', 'INJECT', 'KERNEL', 'MALLOC',
  'PHISH', 'ROOTKIT', 'SHELL', 'SPOOF', 'TROJAN', 'VECTOR', 'ZOMBIE',
].filter(w => w.length === 5); // Ensure all 5 letters

// Fake system names for immersion
const SYSTEM_NAMES = [
  'NEXUS-CORP MAINFRAME',
  'DARKNET NODE #7749',
  'PENTAGON SUBNET',
  'SWISS BANK VAULT',
  'CRYPTO EXCHANGE',
  'SATELLITE UPLINK',
  'NEURAL NETWORK HUB',
  'QUANTUM CLUSTER',
];

const FAKE_IPS = [
  '192.168.13.37', '10.0.66.6', '172.16.42.0', '203.0.113.99',
  '198.51.100.23', '185.199.108.1', '140.82.114.4', '151.101.1.69',
];

// Hacker log messages
const LOG_MESSAGES = {
  attempt: [
    'Attempting password injection...',
    'Running dictionary attack...',
    'Brute forcing hash...',
    'Decrypting auth token...',
    'Bypassing security layer...',
  ],
  partial: [
    'Partial match detected!',
    'Hash collision found...',
    'Encryption weakening...',
    'Security gap identified!',
    'Pattern recognized...',
  ],
  wrong: [
    'Access denied.',
    'Invalid credentials.',
    'Authentication failed.',
    'Security block triggered.',
    'Firewall rejected attempt.',
  ],
  success: [
    'ACCESS GRANTED!',
    'SECURITY BYPASSED!',
    'LAYER BREACHED!',
    'ENCRYPTION CRACKED!',
    'FIREWALL DOWN!',
  ],
  detection: [
    'INTRUSION DETECTED',
    'TRACE COMPLETE',
    'LOCATION COMPROMISED',
    'SECURITY ALERTED',
  ],
};

// Particle interface for visual effects
interface Particle {
  x: number;
  y: number;
  char: string;
  color: string;
  vx: number;
  vy: number;
  life: number;
}

// Score popup interface for floating text
interface ScorePopup {
  x: number;
  y: number;
  text: string;
  frames: number;
  color: string;
}

/**
 * Cyberpunk Terminal Hacking Game
 */
export function runCrackGame(terminal: Terminal): CrackController {
  const themeColor = getCurrentThemeColor();

  // Minimum terminal size
  const MIN_COLS = 40;
  const MIN_ROWS = 16;

  let cols = terminal.cols;
  let rows = terminal.rows;

  const updateDimensions = () => {
    cols = terminal.cols;
    rows = terminal.rows;
  };

  let running = true;
  let gameStarted = false;
  let gameOver = false;
  let won = false;
  let paused = false;
  let pauseMenuSelection = 0;
  let showHelp = false;

  // Game state
  let currentLayer = 1;
  const totalLayers = 3;
  let targetPassword = '';
  let guesses: string[] = [];
  let currentGuess = '';
  let maxGuesses = 6;
  let timeLeft = 90; // seconds
  let lastTick = Date.now();

  // Visual state
  let glitchFrame = 0;
  let logMessages: string[] = [];
  let systemName = '';
  let systemIP = '';
  let scanlineY = 0;
  let gameOverFrame = 0;
  let fakeCoords = { lat: 0, lng: 0 };

  // Juicy effect state
  let particles: Particle[] = [];
  let scorePopups: ScorePopup[] = [];
  let screenShake = 0;
  let shakeIntensity = 0;
  let borderFlash = 0;
  let correctFlash = 0;
  let wrongFlash = 0;
  let layerBreachFlash = 0;

  // Generate fake coordinates
  function generateFakeCoords(): void {
    fakeCoords = {
      lat: (Math.random() * 180 - 90).toFixed(6) as unknown as number,
      lng: (Math.random() * 360 - 180).toFixed(6) as unknown as number,
    };
  }

  // Spawn particles for juicy effects
  function spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    chars: string[] = ['█', '▓', '▒', '░', '●', '◆', '✦']
  ): void {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        char: chars[Math.floor(Math.random() * chars.length)],
        color,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.8) * 1.5,
        life: 15 + Math.floor(Math.random() * 15),
      });
    }
  }

  // Add score popup for floating text feedback
  function addScorePopup(x: number, y: number, text: string, color: string): void {
    scorePopups.push({ x, y, text, frames: 30, color });
  }

  const controller: CrackController = {
    stop: () => {
      if (!running) return;
      running = false;
      // Note: Buffer exit is handled by TerminalPool via dispatchGameQuit
    },
    get isRunning() { return running; }
  };

  const title = [
    '█ █ █▄█ █▀█ █▀▀ █▀█   █▀▀ █▀█ ▄▀█ █▀▀ █▄▀',
    '█▀█  █  █▀▀ ██▄ █▀▄   █▄▄ █▀▄ █▀█ █▄▄ █ █',
  ];

  function pickPassword(): string {
    return PASSWORDS[Math.floor(Math.random() * PASSWORDS.length)];
  }

  function pickSystem(): void {
    systemName = SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)];
    systemIP = FAKE_IPS[Math.floor(Math.random() * FAKE_IPS.length)];
  }

  function addLog(category: keyof typeof LOG_MESSAGES): void {
    const messages = LOG_MESSAGES[category];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    const timestamp = new Date().toISOString().substr(11, 8);
    logMessages.unshift(`[${timestamp}] ${msg}`);
    if (logMessages.length > 5) logMessages.pop();
  }

  function initGame(): void {
    currentLayer = 1;
    targetPassword = pickPassword();
    guesses = [];
    currentGuess = '';
    timeLeft = 90;
    lastTick = Date.now();
    gameOver = false;
    won = false;
    paused = false;
    logMessages = [];
    pickSystem();
    addLog('attempt');
  }

  function initLayer(): void {
    targetPassword = pickPassword();
    guesses = [];
    currentGuess = '';
    addLog('attempt');
  }

  // Check guess against target - returns array of states: 'correct', 'present', 'absent'
  function checkGuess(guess: string): ('correct' | 'present' | 'absent')[] {
    const result: ('correct' | 'present' | 'absent')[] = [];
    const targetChars = targetPassword.split('');
    const guessChars = guess.split('');
    const used = new Array(5).fill(false);

    // First pass: find exact matches
    for (let i = 0; i < 5; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }

    // Second pass: find present but wrong position
    for (let i = 0; i < 5; i++) {
      if (result[i]) continue;
      const idx = targetChars.findIndex((c, j) => c === guessChars[i] && !used[j]);
      if (idx !== -1) {
        result[i] = 'present';
        used[idx] = true;
      } else {
        result[i] = 'absent';
      }
    }

    return result;
  }

  function submitGuess(): void {
    if (currentGuess.length !== 5) return;

    const result = checkGuess(currentGuess);
    guesses.push(currentGuess);

    const allCorrect = result.every(r => r === 'correct');
    const correctCount = result.filter(r => r === 'correct').length;
    const presentCount = result.filter(r => r === 'present').length;
    const hasPartial = correctCount > 0 || presentCount > 0;

    // Calculate effect center position
    const effectX = Math.floor(cols / 2);
    const effectY = 12 + guesses.length;

    if (allCorrect) {
      addLog('success');
      // Big celebration for cracking the password!
      correctFlash = 12;
      borderFlash = 15;
      layerBreachFlash = 20;
      screenShake = 8;
      shakeIntensity = 3;

      // Massive particle explosion
      spawnParticles(effectX, effectY, 25, '\x1b[1;32m', ['█', '▓', '✦', '★', '◆', '●']);
      spawnParticles(effectX - 5, effectY, 15, '\x1b[1;92m', ['░', '▒', '▓']);
      spawnParticles(effectX + 5, effectY, 15, '\x1b[1;92m', ['░', '▒', '▓']);

      if (currentLayer >= totalLayers) {
        won = true;
        gameOver = true;
        addScorePopup(effectX, effectY - 2, '◆ SYSTEM COMPROMISED ◆', '\x1b[1;32m');
        // Victory explosion
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (running) {
              spawnParticles(
                Math.floor(cols / 4) + Math.random() * cols / 2,
                5 + Math.random() * 10,
                10,
                '\x1b[1;32m',
                ['█', '★', '◆', '●']
              );
            }
          }, i * 100);
        }
      } else {
        addScorePopup(effectX, effectY - 2, `LAYER ${currentLayer} BREACHED!`, '\x1b[1;32m');
        currentLayer++;
        setTimeout(() => {
          if (running && !gameOver) initLayer();
        }, 1000);
      }
    } else if (guesses.length >= maxGuesses) {
      addLog('detection');
      // Dramatic failure effects
      wrongFlash = 15;
      borderFlash = 20;
      screenShake = 12;
      shakeIntensity = 4;
      gameOver = true;
      gameOverFrame = 0;
      generateFakeCoords();

      // Red explosion for detection
      spawnParticles(effectX, effectY, 20, '\x1b[1;31m', ['█', '▓', '▒', '!', '@', '#']);
      addScorePopup(effectX, effectY - 2, '◆ TRACED ◆', '\x1b[1;31m');
    } else if (hasPartial) {
      addLog('partial');
      // Encouraging feedback for partial matches
      correctFlash = 4 + correctCount * 2;
      screenShake = Math.min(correctCount + 1, 4);
      shakeIntensity = 1;

      // Green particles for correct, yellow for present
      if (correctCount > 0) {
        spawnParticles(effectX, effectY, 3 + correctCount * 2, '\x1b[1;32m', ['█', '●', '◆']);
        addScorePopup(effectX, effectY - 1, `${correctCount} EXACT!`, '\x1b[1;32m');
      }
      if (presentCount > 0) {
        spawnParticles(effectX + 3, effectY, 2 + presentCount, '\x1b[1;33m', ['░', '▒', '●']);
        if (correctCount === 0) {
          addScorePopup(effectX, effectY - 1, `${presentCount} CLOSE`, '\x1b[1;33m');
        }
      }
    } else {
      addLog('wrong');
      // Miss feedback - shake and red flash
      wrongFlash = 6;
      screenShake = 3;
      shakeIntensity = 2;

      // Small red particles
      spawnParticles(effectX, effectY, 5, '\x1b[31m', ['░', '▒', '×', '·']);
      addScorePopup(effectX, effectY - 1, 'DENIED', '\x1b[2;31m');
    }

    currentGuess = '';
  }

  function render(): void {
    let output = '';
    output += '\x1b[2J\x1b[H';

    // Check minimum terminal size
    if (cols < MIN_COLS || rows < MIN_ROWS) {
      const msg1 = 'Terminal too small!';
      const msg2 = `Need: ${MIN_COLS}x${MIN_ROWS}  Have: ${cols}x${rows}`;
      const centerX = Math.floor(cols / 2);
      const centerY = Math.floor(rows / 2);
      output += `\x1b[${centerY};${Math.max(1, centerX - Math.floor(msg1.length / 2))}H${themeColor}${msg1}\x1b[0m`;
      output += `\x1b[${centerY + 2};${Math.max(1, centerX - Math.floor(msg2.length / 2))}H\x1b[2m${msg2}\x1b[0m`;
      terminal.write(output);
      return;
    }

    // Calculate screen shake offset
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (screenShake > 0) {
      shakeOffsetX = Math.floor((Math.random() - 0.5) * shakeIntensity * 2);
      shakeOffsetY = Math.floor((Math.random() - 0.5) * shakeIntensity);
      screenShake--;
    }

    // Decrement effect timers
    if (borderFlash > 0) borderFlash--;
    if (correctFlash > 0) correctFlash--;
    if (wrongFlash > 0) wrongFlash--;
    if (layerBreachFlash > 0) layerBreachFlash--;

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03; // gravity
      p.life--;
      return p.life > 0;
    });

    // Update score popups
    scorePopups = scorePopups.filter(sp => {
      sp.y -= 0.15; // float upward
      sp.frames--;
      return sp.frames > 0;
    });

    glitchFrame = (glitchFrame + 1) % 60;
    scanlineY = (scanlineY + 1) % rows;

    // Title (with shake offset)
    const titleX = Math.floor((cols - title[0].length) / 2) + shakeOffsetX;
    const titleY = 1 + shakeOffsetY;
    const glitchOffset = glitchFrame >= 55 ? Math.floor(Math.random() * 3) - 1 : 0;

    // Title color based on effects
    let titleColor = themeColor;
    if (layerBreachFlash > 0 && layerBreachFlash % 4 < 2) {
      titleColor = '\x1b[1;32m'; // Green flash on layer breach
    } else if (wrongFlash > 0 && wrongFlash % 4 < 2) {
      titleColor = '\x1b[1;31m'; // Red flash on wrong
    } else if (correctFlash > 0 && correctFlash % 3 < 2) {
      titleColor = '\x1b[1;92m'; // Bright green on correct
    }

    if (glitchFrame >= 55 && glitchFrame < 58) {
      output += `\x1b[${Math.max(1, titleY)};${Math.max(1, titleX + glitchOffset)}H\x1b[91m${title[0]}\x1b[0m`;
      output += `\x1b[${Math.max(1, titleY + 1)};${Math.max(1, titleX + glitchOffset + 1)}H\x1b[96m${title[1]}\x1b[0m`;
    } else {
      output += `\x1b[${Math.max(1, titleY)};${Math.max(1, titleX)}H${titleColor}\x1b[1m${title[0]}\x1b[0m`;
      output += `\x1b[${Math.max(1, titleY + 1)};${Math.max(1, titleX)}H${titleColor}\x1b[1m${title[1]}\x1b[0m`;
    }

    if (paused) {
      // Pause menu
      const pauseY = 8;
      const pauseMsg = '══ PAUSED ══';
      const pauseCenterX = Math.floor(cols / 2);
      const pauseMsgX = pauseCenterX - Math.floor(pauseMsg.length / 2);
      output += `\x1b[${pauseY};${pauseMsgX}H\x1b[5m${themeColor}${pauseMsg}\x1b[0m`;

      output += renderSimpleMenu(CRACK_PAUSE_MENU_ITEMS, pauseMenuSelection, {
        centerX: pauseCenterX,
        startY: pauseY + 2,
        showShortcuts: false,
      });

      const navHint = '↑↓ select   ENTER confirm';
      const navHintX = pauseCenterX - Math.floor(navHint.length / 2);
      output += `\x1b[${pauseY + 10};${navHintX}H\x1b[2m${themeColor}${navHint}\x1b[0m`;
    } else if (!gameStarted) {
      // Start screen
      const startY = 5;

      // Fake target system info
      output += `\x1b[${startY};3H${themeColor}TARGET SYSTEM:\x1b[0m`;
      output += `\x1b[${startY + 1};3H\x1b[2m${themeColor}├─ ${systemName || 'CLASSIFIED'}\x1b[0m`;
      output += `\x1b[${startY + 2};3H\x1b[2m${themeColor}└─ IP: ${systemIP || '???.???.???.???'}\x1b[0m`;

      // Mission briefing
      const missionY = startY + 5;
      output += `\x1b[${missionY};3H${themeColor}MISSION:\x1b[0m`;
      output += `\x1b[${missionY + 1};3H\x1b[2m${themeColor}Crack ${totalLayers} security layers before trace detection.\x1b[0m`;
      output += `\x1b[${missionY + 2};3H\x1b[2m${themeColor}Each password is 5 characters.\x1b[0m`;
      output += `\x1b[${missionY + 3};3H\x1b[2m${themeColor}You have ${maxGuesses} attempts per layer.\x1b[0m`;

      // Color legend
      const legendY = missionY + 6;
      output += `\x1b[${legendY};3H${themeColor}FEEDBACK:\x1b[0m`;
      output += `\x1b[${legendY + 1};3H\x1b[1;32m█\x1b[0m\x1b[2m = Correct position\x1b[0m`;
      output += `\x1b[${legendY + 2};3H\x1b[1;33m█\x1b[0m\x1b[2m = Wrong position\x1b[0m`;
      output += `\x1b[${legendY + 3};3H\x1b[2m█ = Not in password\x1b[0m`;

      // Start prompt
      const startMsg = '[ PRESS ENTER TO BEGIN BREACH ]';
      const startX = Math.floor((cols - startMsg.length) / 2);
      output += `\x1b[${rows - 4};${startX}H\x1b[5m${themeColor}${startMsg}\x1b[0m`;

      const controls = 'ESC: Menu';
      output += `\x1b[${rows - 2};3H\x1b[2m${themeColor}${controls}\x1b[0m`;
    } else if (gameOver) {
      // Game over screen - more dramatic!
      const overY = 4;

      if (won) {
        // SUCCESS - Hacker victory screen
        const accessGranted = '╔═══════════════════════════════════╗';
        const accessMsg =     '║      ██ ACCESS GRANTED ██         ║';
        const accessBottom =  '╚═══════════════════════════════════╝';
        const boxX = Math.floor((cols - accessGranted.length) / 2);

        output += `\x1b[${overY};${boxX}H\x1b[1;32m${accessGranted}\x1b[0m`;
        output += `\x1b[${overY + 1};${boxX}H\x1b[1;32m${accessMsg}\x1b[0m`;
        output += `\x1b[${overY + 2};${boxX}H\x1b[1;32m${accessBottom}\x1b[0m`;

        output += `\x1b[${overY + 4};${boxX}H${themeColor}Target: ${systemName}\x1b[0m`;
        output += `\x1b[${overY + 5};${boxX}H${themeColor}Status: \x1b[32mFULLY COMPROMISED\x1b[0m`;
        output += `\x1b[${overY + 6};${boxX}H${themeColor}Time remaining: \x1b[33m${timeLeft}s\x1b[0m`;
        output += `\x1b[${overY + 7};${boxX}H${themeColor}Layers breached: \x1b[32m${totalLayers}/${totalLayers}\x1b[0m`;

        // Download animation
        const dlProgress = Math.min(gameOverFrame * 5, 100);
        const dlBar = '█'.repeat(Math.floor(dlProgress / 5)) + '░'.repeat(20 - Math.floor(dlProgress / 5));
        output += `\x1b[${overY + 9};${boxX}H\x1b[32mDownloading data... [${dlBar}] ${dlProgress}%\x1b[0m`;

        if (dlProgress >= 100) {
          output += `\x1b[${overY + 11};${boxX}H\x1b[1;32m✓ 847 FILES EXTRACTED\x1b[0m`;
          output += `\x1b[${overY + 12};${boxX}H\x1b[1;32m✓ LOGS WIPED\x1b[0m`;
          output += `\x1b[${overY + 13};${boxX}H\x1b[1;32m✓ BACKDOOR INSTALLED\x1b[0m`;
        }
      } else {
        // FAILURE - Dramatic busted screen
        const warningGlitch = gameOverFrame % 8 < 4;
        const glitchChar = warningGlitch ? '▓' : '░';

        // Flashing warning banner
        const warningColor = gameOverFrame % 6 < 3 ? '\x1b[1;31m' : '\x1b[41;97m';
        const warningBanner = `${glitchChar}${glitchChar} INTRUSION DETECTED ${glitchChar}${glitchChar}`;
        output += `\x1b[${overY};${Math.floor((cols - warningBanner.length) / 2)}H${warningColor}${warningBanner}\x1b[0m`;

        // Connection terminated box
        const termBox = [
          '┌─────────────────────────────────────┐',
          '│   ▄▀▀▀▄  CONNECTION TERMINATED  ▄▀▀▀▄│',
          '├─────────────────────────────────────┤',
        ];
        const boxX = Math.floor((cols - termBox[0].length) / 2);

        for (let i = 0; i < termBox.length; i++) {
          output += `\x1b[${overY + 2 + i};${boxX}H\x1b[31m${termBox[i]}\x1b[0m`;
        }

        // Trace info with fake coordinates
        output += `\x1b[${overY + 5};${boxX}H\x1b[31m│\x1b[0m TRACE STATUS: \x1b[1;31mCOMPLETE\x1b[0m`;
        output += `\x1b[${overY + 6};${boxX}H\x1b[31m│\x1b[0m YOUR COORDS: \x1b[33m${fakeCoords.lat}, ${fakeCoords.lng}\x1b[0m`;
        output += `\x1b[${overY + 7};${boxX}H\x1b[31m│\x1b[0m ISP: \x1b[33mIDENTIFIED\x1b[0m`;
        output += `\x1b[${overY + 8};${boxX}H\x1b[31m│\x1b[0m AUTHORITIES: \x1b[5;31mDISPATCHED\x1b[0m`;
        output += `\x1b[${overY + 9};${boxX}H\x1b[31m└─────────────────────────────────────┘\x1b[0m`;

        // Stats
        output += `\x1b[${overY + 11};${boxX}H\x1b[2m${themeColor}Layers cracked: ${currentLayer - 1}/${totalLayers}\x1b[0m`;
        output += `\x1b[${overY + 12};${boxX}H\x1b[2m${themeColor}Password was: \x1b[33m${targetPassword}\x1b[0m`;

        // Glitch effect - random characters at edges
        if (gameOverFrame % 4 === 0) {
          const glitchChars = '!@#$%^&*░▒▓█';
          for (let i = 0; i < 3; i++) {
            const gx = Math.floor(Math.random() * cols);
            const gy = Math.floor(Math.random() * rows);
            const gc = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            output += `\x1b[${gy};${gx}H\x1b[31m${gc}\x1b[0m`;
          }
        }
      }

      const restartMsg = '[ R ] RESTART    [ Q ] QUIT    [ N ] NEXT GAME';
      output += `\x1b[${rows - 3};${Math.floor((cols - restartMsg.length) / 2)}H\x1b[2m${themeColor}${restartMsg}\x1b[0m`;
    } else if (showHelp) {
      // Help overlay
      const helpY = 5;
      const helpBox = [
        '╔══════════════════════════════════════╗',
        '║          HYPER CRACK HELP            ║',
        '╠══════════════════════════════════════╣',
        '║  Crack passwords before trace timer  ║',
        '║  runs out. Breach all 3 layers!      ║',
        '╠══════════════════════════════════════╣',
        '║  ■ GREEN  = Correct position         ║',
        '║  ■ YELLOW = Wrong position           ║',
        '║  ■ DIM    = Not in password          ║',
        '╠══════════════════════════════════════╣',
        '║  CONTROLS:                           ║',
        '║  A-Z     = Type letters              ║',
        '║  ENTER   = Submit guess              ║',
        '║  BKSP    = Delete letter             ║',
        '║  ESC     = Pause menu                ║',
        '╚══════════════════════════════════════╝',
      ];
      const helpX = Math.floor((cols - helpBox[0].length) / 2);
      for (let i = 0; i < helpBox.length; i++) {
        output += `\x1b[${helpY + i};${helpX}H${themeColor}${helpBox[i]}\x1b[0m`;
      }
      output += `\x1b[${helpY + helpBox.length + 1};${helpX + 8}H\x1b[2m[ Press ESC to close ]\x1b[0m`;
    } else {
      // Main game screen
      const gameY = 4;

      // System info header
      output += `\x1b[${gameY};2H${themeColor}┌─ TARGET: ${systemName} ─┐\x1b[0m`;
      output += `\x1b[${gameY + 1};2H${themeColor}│\x1b[0m IP: ${systemIP}`;
      output += `\x1b[${gameY + 2};2H${themeColor}│\x1b[0m LAYER: \x1b[1m${currentLayer}/${totalLayers}\x1b[0m`;

      // Trace timer - more urgent as time decreases
      const timerColor = timeLeft <= 10 ? '\x1b[1;31m' : timeLeft <= 30 ? '\x1b[33m' : themeColor;
      const timerBlink = timeLeft <= 10 ? '\x1b[5m' : '';
      output += `\x1b[${gameY + 3};2H${themeColor}│\x1b[0m TRACE: ${timerBlink}${timerColor}${timeLeft}s\x1b[0m`;
      output += `\x1b[${gameY + 4};2H${themeColor}└${'─'.repeat(30)}┘\x1b[0m`;

      // Password display area
      const pwdY = gameY + 6;
      output += `\x1b[${pwdY};2H${themeColor}PASSWORD CRACK:\x1b[0m`;

      // Previous guesses
      for (let i = 0; i < guesses.length; i++) {
        const guess = guesses[i];
        const result = checkGuess(guess);
        let guessDisplay = '';
        for (let j = 0; j < 5; j++) {
          const char = guess[j];
          if (result[j] === 'correct') {
            guessDisplay += `\x1b[1;32m${char}\x1b[0m `;
          } else if (result[j] === 'present') {
            guessDisplay += `\x1b[1;33m${char}\x1b[0m `;
          } else {
            guessDisplay += `\x1b[2m${char}\x1b[0m `;
          }
        }
        output += `\x1b[${pwdY + 1 + i};4H${guessDisplay}`;
      }

      // Current guess input
      const inputY = pwdY + 1 + guesses.length;
      let inputDisplay = '';
      for (let i = 0; i < 5; i++) {
        if (i < currentGuess.length) {
          inputDisplay += `${themeColor}\x1b[1m${currentGuess[i]}\x1b[0m `;
        } else if (i === currentGuess.length) {
          // Blinking cursor
          const cursorChar = glitchFrame % 20 < 10 ? '█' : '_';
          inputDisplay += `${themeColor}${cursorChar}\x1b[0m `;
        } else {
          inputDisplay += `\x1b[2m_\x1b[0m `;
        }
      }
      output += `\x1b[${inputY};4H${inputDisplay}`;

      // Remaining attempts
      const attemptsLeft = maxGuesses - guesses.length;
      output += `\x1b[${inputY + 2};4H\x1b[2mAttempts: ${attemptsLeft}/${maxGuesses}\x1b[0m`;

      // System log area (right side)
      const logX = 40;
      const logY = gameY;
      output += `\x1b[${logY};${logX}H${themeColor}┌─ SYSTEM LOG ─┐\x1b[0m`;
      for (let i = 0; i < 5; i++) {
        const logMsg = logMessages[i] || '';
        const truncated = logMsg.substring(0, cols - logX - 4);
        output += `\x1b[${logY + 1 + i};${logX}H${themeColor}│\x1b[0m\x1b[2m ${truncated}\x1b[0m`;
      }
      output += `\x1b[${logY + 6};${logX}H${themeColor}└${'─'.repeat(16)}┘\x1b[0m`;

      // Help
      output += `\x1b[${rows - 2};2H\x1b[2m${themeColor}Type 5 letters, ENTER to submit | ESC: Menu\x1b[0m`;
    }

    // Render particles
    for (const p of particles) {
      const px = Math.round(p.x) + shakeOffsetX;
      const py = Math.round(p.y) + shakeOffsetY;
      if (px >= 1 && px < cols && py >= 1 && py < rows) {
        const fade = p.life > 10 ? '' : '\x1b[2m';
        output += `\x1b[${py};${px}H${p.color}${fade}${p.char}\x1b[0m`;
      }
    }

    // Render score popups
    for (const sp of scorePopups) {
      const px = Math.round(sp.x - sp.text.length / 2) + shakeOffsetX;
      const py = Math.round(sp.y) + shakeOffsetY;
      if (py >= 1 && py < rows && px >= 1) {
        const fade = sp.frames > 15 ? '' : sp.frames > 8 ? '\x1b[2m' : '\x1b[2m';
        output += `\x1b[${py};${Math.max(1, px)}H${sp.color}${fade}${sp.text}\x1b[0m`;
      }
    }

    // Border flash effect
    if (borderFlash > 0) {
      const flashColor = wrongFlash > 0 ? '\x1b[31m' : '\x1b[32m';
      const flashChar = borderFlash % 4 < 2 ? '█' : '▓';
      // Top and bottom borders
      for (let x = 1; x <= cols; x += 3) {
        if (Math.random() > 0.5) {
          output += `\x1b[1;${x}H${flashColor}${flashChar}\x1b[0m`;
          output += `\x1b[${rows};${x}H${flashColor}${flashChar}\x1b[0m`;
        }
      }
      // Left and right borders
      for (let y = 1; y <= rows; y += 2) {
        if (Math.random() > 0.5) {
          output += `\x1b[${y};1H${flashColor}${flashChar}\x1b[0m`;
          output += `\x1b[${y};${cols}H${flashColor}${flashChar}\x1b[0m`;
        }
      }
    }

    terminal.write(output);
  }

  function update(): void {
    if (!gameStarted || gameOver || paused) return;

    // Update timer
    const now = Date.now();
    if (now - lastTick >= 1000) {
      timeLeft--;
      lastTick = now;

      // Low time warning effects
      if (timeLeft <= 10 && timeLeft > 0) {
        screenShake = 2;
        shakeIntensity = 1;
        borderFlash = 3;
        wrongFlash = 3;
        // Spawn warning particles around edges
        if (timeLeft % 2 === 0) {
          spawnParticles(Math.random() * cols, 2, 3, '\x1b[1;31m', ['!', '▓', '░']);
        }
      }

      if (timeLeft <= 0) {
        addLog('detection');
        gameOver = true;
        gameOverFrame = 0;
        generateFakeCoords();
        // Big explosion for trace complete
        screenShake = 15;
        shakeIntensity = 5;
        wrongFlash = 20;
        borderFlash = 25;
        const centerX = Math.floor(cols / 2);
        const centerY = Math.floor(rows / 2);
        spawnParticles(centerX, centerY, 30, '\x1b[1;31m', ['█', '▓', '▒', '!', '@', '#', '×']);
        addScorePopup(centerX, centerY - 3, '◆◆ TRACE COMPLETE ◆◆', '\x1b[1;31m');
      }
    }

    // Increment game over animation frame
    if (gameOver) {
      gameOverFrame++;
    }
  }

  // Start game loop
  setTimeout(() => {
    if (!running) return;

    terminal.write('\x1b[?1049h');
    terminal.write('\x1b[?25l');

    pickSystem();
    initGame();
    gameStarted = false; // Show start screen first

    const renderInterval = setInterval(() => {
      if (!running) {
        clearInterval(renderInterval);
        return;
      }
      render();
    }, 25);

    const gameInterval = setInterval(() => {
      if (!running) {
        clearInterval(gameInterval);
        return;
      }
      update();
    }, 100);

    const keyListener = terminal.onKey(({ domEvent }) => {
      if (!running) {
        keyListener.dispose();
        return;
      }

      domEvent.preventDefault();
      domEvent.stopPropagation();

      const key = domEvent.key;
      const keyLower = key.toLowerCase();

      // ESC - toggle pause or close help
      if (key === 'Escape') {
        if (showHelp) {
          showHelp = false;
        } else {
          paused = !paused;
          if (paused) pauseMenuSelection = 0;
        }
        return;
      }

      // Start screen
      if (!gameStarted && !paused) {
        if (key === 'Enter') {
          gameStarted = true;
          initGame();
        }
        return;
      }

      // Game over
      if (gameOver) {
        if (keyLower === 'r') {
          initGame();
          gameStarted = true;
        } else if (keyLower === 'q') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          controller.stop();
          dispatchGameQuit(terminal);
        } else if (keyLower === 'n') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          running = false;
          dispatchGameSwitch(terminal);
        }
        return;
      }

      // Pause menu
      if (paused) {
        // Use shared menu navigation
        const { newSelection, confirmed } = navigateMenu(
          pauseMenuSelection,
          CRACK_PAUSE_MENU_ITEMS.length,
          keyLower,
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
              initGame();
              gameStarted = true;
              paused = false;
              break;
            case 2: // Quit
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              controller.stop();
              dispatchGameQuit(terminal);
              break;
            case 3: // Help
              showHelp = true;
              paused = false;
              break;
            case 4: // List Games
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              running = false;
              dispatchGamesMenu(terminal);
              break;
            case 5: // Next Game
              clearInterval(renderInterval);
              clearInterval(gameInterval);
              running = false;
              dispatchGameSwitch(terminal);
              break;
          }
          return;
        }

        // Legacy shortcut keys still work
        if (keyLower === 'r') {
          initGame();
          gameStarted = true;
          paused = false;
        } else if (keyLower === 'l') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          running = false;
          dispatchGamesMenu(terminal);
        } else if (keyLower === 'n') {
          clearInterval(renderInterval);
          clearInterval(gameInterval);
          running = false;
          dispatchGameSwitch(terminal);
        } else if (keyLower === 'h') {
          showHelp = true;
          paused = false;
        }
        return;
      }

      // Help screen - ESC closes it (handled above)
      if (showHelp) {
        return;
      }

      // Gameplay input
      if (key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
      } else if (key === 'Enter') {
        submitGuess();
      } else if (key.length === 1 && /[a-zA-Z]/.test(key) && currentGuess.length < 5) {
        currentGuess += key.toUpperCase();
        // Subtle typing feedback
        const inputX = 4 + currentGuess.length * 2;
        const inputY = 12 + guesses.length;
        spawnParticles(inputX, inputY, 1, themeColor, ['·', '●']);
        // Tiny shake on last letter
        if (currentGuess.length === 5) {
          screenShake = 2;
          shakeIntensity = 1;
          borderFlash = 2;
        }
      }
    });

    const resizeListener = terminal.onResize(() => {
      updateDimensions();
    });

    const originalStop = controller.stop;
    controller.stop = () => {
      clearInterval(renderInterval);
      clearInterval(gameInterval);
      keyListener.dispose();
      resizeListener.dispose();
      originalStop();
    };
  }, 25);

  return controller;
}
