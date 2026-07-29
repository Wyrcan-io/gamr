/**
 * Shared Visual Effects
 *
 * Reusable particle systems, score popups, screen shake, and flash effects.
 * Import these in new games instead of re-implementing effect logic.
 *
 * Based on patterns from chopper/effects.ts and used across 16+ games.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Particle {
  x: number;
  y: number;
  char: string;
  color: string;
  vx: number;
  vy: number;
  life: number;
}

export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  frames: number;
  color: string;
}

export interface ScreenShakeState {
  frames: number;
  intensity: number;
}

export interface FlashState {
  frames: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum particles to prevent performance issues */
export const MAX_PARTICLES = 100;

/** Common particle character sets */
export const PARTICLE_CHARS = {
  explosion: ['✗', '×', '·', '○', '▒', '░'],
  success: ['✦', '★', '◆', '●', '♦'],
  fire: ['▓', '▒', '░', '●', '◆'],
  death: ['✗', '☠', '×', '▓', '░'],
  sparkle: ['✦', '✧', '★'],
  firework: ['★', '✦', '◆', '●', '✶', '✴', '◇', '♦', '•', '○'],
} as const;

/** Bright ANSI colors for fireworks and celebrations */
export const FIREWORK_COLORS = [
  '\x1b[1;93m', '\x1b[1;92m', '\x1b[1;96m',
  '\x1b[1;95m', '\x1b[1;91m', '\x1b[1;97m',
];

// ============================================================================
// PARTICLES
// ============================================================================

/**
 * Spawn particles in a radial burst pattern.
 * Respects MAX_PARTICLES to prevent performance issues.
 */
export function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  count: number,
  color: string,
  chars: string[] = ['✦', '★', '◆', '●'],
): void {
  if (particles.length >= MAX_PARTICLES) return;

  const actualCount = Math.min(count, MAX_PARTICLES - particles.length);
  for (let i = 0; i < actualCount; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 0.2 + Math.random() * 0.3;
    particles.push({
      x,
      y,
      char: chars[Math.floor(Math.random() * chars.length)],
      color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.5,
      life: 10 + Math.floor(Math.random() * 8),
    });
  }
}

/**
 * Spawn a colorful firework explosion with central burst and sparkle ring.
 */
export function spawnFirework(
  particles: Particle[],
  x: number,
  y: number,
  intensity: number = 1,
): void {
  const chars = PARTICLE_CHARS.firework;

  // Central burst
  for (let i = 0; i < 12 * intensity; i++) {
    const angle = (Math.PI * 2 * i) / (12 * intensity);
    const speed = 0.4 + Math.random() * 0.4;
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const char = chars[Math.floor(Math.random() * chars.length)];
    particles.push({
      x, y, char, color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.2,
      life: 20 + Math.floor(Math.random() * 15),
    });
  }

  // Sparkle ring
  for (let i = 0; i < 8 * intensity; i++) {
    const angle = (Math.PI * 2 * i) / (8 * intensity) + Math.random() * 0.3;
    const dist = 1.5 + Math.random();
    particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      char: '✧',
      color: '\x1b[1;97m',
      vx: Math.cos(angle) * 0.15,
      vy: Math.sin(angle) * 0.15 - 0.1,
      life: 15 + Math.floor(Math.random() * 10),
    });
  }
}

/**
 * Spawn rising sparkle trail effect from a single point.
 */
export function spawnSparkleTrail(
  particles: Particle[],
  x: number,
  y: number,
  count: number = 6,
  color: string = '\x1b[1;93m',
): void {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y,
      char: PARTICLE_CHARS.sparkle[Math.floor(Math.random() * PARTICLE_CHARS.sparkle.length)],
      color,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.3 - Math.random() * 0.3,
      life: 25 + Math.floor(Math.random() * 15),
    });
  }
}

/**
 * Update all particles: apply velocity, gravity, and remove dead ones.
 */
export function updateParticles(particles: Particle[], gravityMult: number = 1): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02 * gravityMult;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ============================================================================
// SCORE POPUPS
// ============================================================================

/**
 * Add a floating text popup that rises and fades.
 */
export function addScorePopup(
  popups: ScorePopup[],
  x: number,
  y: number,
  text: string,
  color: string = '\x1b[1;33m',
): void {
  popups.push({ x, y, text, frames: 18, color });
}

/**
 * Update all popups: float upward and remove expired ones.
 */
export function updatePopups(popups: ScorePopup[]): void {
  for (let i = popups.length - 1; i >= 0; i--) {
    const popup = popups[i];
    popup.y -= 0.25;
    popup.frames--;
    if (popup.frames <= 0) popups.splice(i, 1);
  }
}

// ============================================================================
// SCREEN SHAKE
// ============================================================================

/**
 * Create initial screen shake state.
 */
export function createShakeState(): ScreenShakeState {
  return { frames: 0, intensity: 0 };
}

/**
 * Trigger screen shake with duration and intensity.
 *
 * Intensity guide:
 * - 1: Light hit
 * - 2: Medium impact
 * - 3-4: Big explosion
 */
export function triggerShake(state: ScreenShakeState, frames: number, intensity: number): void {
  state.frames = frames;
  state.intensity = intensity;
}

/**
 * Apply screen shake offset to render position.
 * Call in render() to get adjusted x/y coordinates.
 * Returns { offsetX, offsetY } to add to your render position.
 */
export function applyShake(state: ScreenShakeState): { offsetX: number; offsetY: number } {
  if (state.frames > 0) {
    state.frames--;
    return {
      offsetX: Math.floor((Math.random() - 0.5) * state.intensity * 2),
      offsetY: Math.floor((Math.random() - 0.5) * state.intensity),
    };
  }
  return { offsetX: 0, offsetY: 0 };
}

// ============================================================================
// FLASH EFFECTS
// ============================================================================

/**
 * Create initial flash state.
 */
export function createFlashState(): FlashState {
  return { frames: 0 };
}

/**
 * Trigger a flash effect for N frames.
 */
export function triggerFlash(state: FlashState, frames: number): void {
  state.frames = frames;
}

/**
 * Update flash state (decrement). Call once per frame.
 * Returns true if flash is currently active.
 */
export function updateFlash(state: FlashState): boolean {
  if (state.frames > 0) {
    state.frames--;
    return true;
  }
  return false;
}

/**
 * Check if flash should show on this frame (alternating visibility for strobe).
 * Use with border or hit flash to create a blinking effect.
 */
export function isFlashVisible(state: FlashState): boolean {
  return state.frames > 0 && state.frames % 4 < 2;
}
